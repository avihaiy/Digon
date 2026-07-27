import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://qgvjkedbmywhftyfymee.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFndmprZWRibXl3aGZ0eWZ5bWVlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgwOTE3MTUsImV4cCI6MjA4MzY2NzcxNX0.CY8UrsnrnguvqeAb2F-qf0N2OdKMNykvrHioVzZUYG0';
const supabase = createClient(supabaseUrl, supabaseKey);

async function testSignup() {
  console.log('Attempting to sign up avihaidj0@gmail.com...');
  const { data, error } = await supabase.auth.signUp({
    email: 'avihaidj0@gmail.com',
    password: 'As0546526856',
    options: {
      data: { full_name: 'Avihai Admin' },
    }
  });

  if (error) {
    console.error('Signup Failed:', error.message);
  } else {
    console.log('Signup Success!');
    console.log('User ID:', data.user.id);
  }
}

testSignup();
