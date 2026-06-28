import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://qgvjkedbmywhftyfymee.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFndmprZWRibXl3aGZ0eWZ5bWVlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgwOTE3MTUsImV4cCI6MjA4MzY2NzcxNX0.CY8UrsnrnguvqeAb2F-qf0N2OdKMNykvrHioVzZUYG0'
);

async function checkRpc() {
  const { data: members, error: err1 } = await supabase.from('members').select('*').limit(1);
  if (err1 || !members || members.length === 0) return console.log('no members');
  const m = members[0];
  
  const { data, error } = await supabase.rpc('get_member_area_data', {
    _member_id: m.id,
    _phone: m.phone,
    _user_agent: 'test'
  });
  console.log('Keys in result:', Object.keys(data || {}));
}

checkRpc();
