import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://qgvjkedbmywhftyfymee.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFndmprZWRibXl3aGZ0eWZ5bWVlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgwOTE3MTUsImV4cCI6MjA4MzY2NzcxNX0.CY8UrsnrnguvqeAb2F-qf0N2OdKMNykvrHioVzZUYG0'
);

async function checkRpc() {
  const { data, error } = await supabase.rpc('update_public_member_profile', {
    _member_id: '00000000-0000-0000-0000-000000000000',
    _phone: '123',
    _new_full_name: 'a',
    _new_email: 'a',
    _new_address: 'a',
    _new_spouse_name: 'a'
  });
  console.log('Result:', data, 'Error:', error?.message);
}

checkRpc();
