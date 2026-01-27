import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Tables to backup
const TABLES_TO_BACKUP = [
  'members',
  'aliyot',
  'payments',
  'receipts',
  'expenses',
  'expense_categories',
  'expense_attachments',
  'budget_transactions',
  'budget_categories',
  'equipment',
  'equipment_loans',
  'memorial_names',
  'announcements',
  'prayer_times',
  'app_settings',
  'profiles',
  'user_roles',
  'notifications',
  'audit_logs',
];

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Use service role key for full access
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Generate backup timestamp
    const now = new Date();
    const timestamp = now.toISOString().split('T')[0]; // YYYY-MM-DD format
    const fullTimestamp = now.toISOString().replace(/[:.]/g, '-');

    console.log(`Starting backup for ${timestamp}...`);

    const backupResults: Record<string, { success: boolean; count?: number; error?: string }> = {};
    const backupData: Record<string, unknown[]> = {};

    // Export each table
    for (const tableName of TABLES_TO_BACKUP) {
      try {
        const { data, error } = await supabase
          .from(tableName)
          .select('*');

        if (error) {
          backupResults[tableName] = { success: false, error: error.message };
          console.error(`Error backing up ${tableName}:`, error.message);
        } else {
          backupData[tableName] = data || [];
          backupResults[tableName] = { success: true, count: data?.length || 0 };
          console.log(`Backed up ${tableName}: ${data?.length || 0} records`);
        }
      } catch (err) {
        backupResults[tableName] = { success: false, error: String(err) };
        console.error(`Exception backing up ${tableName}:`, err);
      }
    }

    // Create combined backup JSON
    const backupContent = JSON.stringify({
      timestamp: now.toISOString(),
      tables: backupData,
      summary: backupResults,
    }, null, 2);

    // Upload to storage bucket
    const fileName = `backup-${fullTimestamp}.json`;
    const { error: uploadError } = await supabase.storage
      .from('backups')
      .upload(fileName, new Blob([backupContent], { type: 'application/json' }), {
        contentType: 'application/json',
        upsert: false,
      });

    if (uploadError) {
      console.error('Error uploading backup:', uploadError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: uploadError.message,
          results: backupResults 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Clean up old backups (keep last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: existingFiles } = await supabase.storage
      .from('backups')
      .list();

    if (existingFiles) {
      const filesToDelete = existingFiles
        .filter(file => {
          const fileDate = file.created_at ? new Date(file.created_at) : null;
          return fileDate && fileDate < thirtyDaysAgo;
        })
        .map(file => file.name);

      if (filesToDelete.length > 0) {
        await supabase.storage
          .from('backups')
          .remove(filesToDelete);
        console.log(`Deleted ${filesToDelete.length} old backup files`);
      }
    }

    const totalRecords = Object.values(backupResults)
      .filter(r => r.success)
      .reduce((sum, r) => sum + (r.count || 0), 0);

    console.log(`Backup completed: ${fileName}, ${totalRecords} total records`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        fileName,
        timestamp: now.toISOString(),
        totalRecords,
        results: backupResults,
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Backup error:', error);
    return new Response(
      JSON.stringify({ success: false, error: String(error) }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
