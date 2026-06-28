import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://qgvjkedbmywhftyfymee.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFndmprZWRibXl3aGZ0eWZ5bWVlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgwOTE3MTUsImV4cCI6MjA4MzY2NzcxNX0.CY8UrsnrnguvqeAb2F-qf0N2OdKMNykvrHioVzZUYG0'
);

async function testRpc() {
  const dummyId = '00000000-0000-0000-0000-000000000000';
  const { data, error } = await supabase.rpc('get_member_area_data', {
    _member_id: dummyId,
    _phone: '0500000000',
    _user_agent: 'test'
  });
  console.log('RPC Error:', error);
  console.log('RPC Data:', data);
}

testRpc();
