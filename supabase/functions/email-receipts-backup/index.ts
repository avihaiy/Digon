import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface EmailBackupRequest {
  email: string;
  startDate?: string;
  endDate?: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    if (!resendApiKey) {
      throw new Error('RESEND_API_KEY is not configured');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { startDate, endDate }: EmailBackupRequest = await req.json();

    // Force emails to test account until domain is verified in Resend
    const email = 'britakko12@gmail.com';

    // Fetch receipts with related data
    let query = supabase
      .from('receipts')
      .select(`
        id,
        receipt_number,
        total_amount,
        description,
        created_at,
        member_id,
        payment_id
      `)
      .order('created_at', { ascending: false });

    // Apply date filters if provided
    if (startDate) {
      query = query.gte('created_at', startDate);
    }
    if (endDate) {
      query = query.lte('created_at', endDate + 'T23:59:59.999Z');
    }

    const { data: receipts, error } = await query;

    if (error) {
      throw new Error(`Failed to fetch receipts: ${error.message}`);
    }

    // Fetch members and payments separately
    const memberIds = [...new Set(receipts?.map(r => r.member_id).filter(Boolean))];
    const paymentIds = [...new Set(receipts?.map(r => r.payment_id).filter(Boolean))];
    
    const [membersResult, paymentsResult] = await Promise.all([
      memberIds.length > 0 
        ? supabase.from('members').select('id, full_name, phone').in('id', memberIds)
        : { data: [] },
      paymentIds.length > 0 
        ? supabase.from('payments').select('id, method, reference').in('id', paymentIds)
        : { data: [] }
    ]);

    const membersMap = new Map((membersResult.data || []).map(m => [m.id, m]));
    const paymentsMap = new Map((paymentsResult.data || []).map(p => [p.id, p]));

    const now = new Date();
    const timestamp = now.toISOString().split('T')[0];
    
    // Create CSV content
    const csvHeaders = ['מספר קבלה', 'תאריך', 'שם משלם', 'טלפון', 'סכום', 'תיאור', 'אמצעי תשלום'];
    const csvRows = receipts?.map(r => {
      const member = r.member_id ? membersMap.get(r.member_id) : null;
      const payment = r.payment_id ? paymentsMap.get(r.payment_id) : null;
      return [
        r.receipt_number || '',
        r.created_at ? new Date(r.created_at).toLocaleDateString('he-IL') : '',
        member?.full_name || '',
        member?.phone || '',
        r.total_amount?.toString() || '0',
        r.description || '',
        payment?.method === 'cash' ? 'מזומן' : payment?.method === 'bit' ? 'ביט' : ''
      ];
    }) || [];

    const csvContent = [
      csvHeaders.join(','),
      ...csvRows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    // Add BOM for Hebrew support in Excel
    const csvWithBom = '\uFEFF' + csvContent;
    const csvBase64 = btoa(unescape(encodeURIComponent(csvWithBom)));

    // Create summary
    const totalAmount = receipts?.reduce((sum, r) => sum + (r.total_amount || 0), 0) || 0;
    const dateRange = startDate && endDate 
      ? `מתאריך ${new Date(startDate).toLocaleDateString('he-IL')} עד ${new Date(endDate).toLocaleDateString('he-IL')}`
      : startDate 
        ? `מתאריך ${new Date(startDate).toLocaleDateString('he-IL')}`
        : endDate
          ? `עד תאריך ${new Date(endDate).toLocaleDateString('he-IL')}`
          : 'כל הקבלות';

    // Send email using Resend API directly
    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'בית הכנסת ברית שלום <onboarding@resend.dev>',
        to: [email],
        subject: `גיבוי קבלות - בית הכנסת ברית שלום - ${timestamp}`,
        html: `
          <div dir="rtl" style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
              <h1 style="color: white; margin: 0;">בס"ד</h1>
              <h2 style="color: white; margin: 10px 0 0;">בית הכנסת ברית שלום</h2>
            </div>
            
            <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px;">
              <h3 style="color: #1e3a5f; margin-top: 0;">גיבוי קבלות</h3>
              
              <div style="background: white; padding: 20px; border-radius: 8px; border-right: 4px solid #2d5a87;">
                <p style="margin: 0 0 10px;"><strong>טווח תאריכים:</strong> ${dateRange}</p>
                <p style="margin: 0 0 10px;"><strong>מספר קבלות:</strong> ${receipts?.length || 0}</p>
                <p style="margin: 0;"><strong>סה"כ:</strong> ₪${totalAmount.toLocaleString('he-IL')}</p>
              </div>
              
              <p style="margin-top: 20px; color: #666;">
                קובץ ה-CSV מצורף למייל זה וניתן לפתיחה ב-Excel.
              </p>
              
              <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
              
              <p style="color: #888; font-size: 12px; text-align: center;">
                נוצר אוטומטית ע"י מערכת ניהול בית הכנסת<br>
                ${now.toLocaleDateString('he-IL')} ${now.toLocaleTimeString('he-IL')}
              </p>
            </div>
          </div>
        `,
        attachments: [
          {
            filename: `receipts-backup-${timestamp}.csv`,
            content: csvBase64,
          }
        ],
      }),
    });

    const emailResult = await emailResponse.json();

    if (!emailResponse.ok) {
      throw new Error(`Failed to send email: ${JSON.stringify(emailResult)}`);
    }

    console.log('Email sent successfully:', emailResult);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Backup email sent successfully',
        receiptsCount: receipts?.length || 0,
        totalAmount
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error: unknown) {
    console.error('Error sending receipts backup:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
