import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://qgvjkedbmywhftyfymee.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFndmprZWRibXl3aGZ0eWZ5bWVlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgwOTE3MTUsImV4cCI6MjA4MzY2NzcxNX0.CY8UrsnrnguvqeAb2F-qf0N2OdKMNykvrHioVzZUYG0'
);

async function checkCols() {
  const { data, error } = await supabase.from('members').select('address, spouse_name').limit(1);
  console.log('Result:', { data, error });
}

checkCols();
