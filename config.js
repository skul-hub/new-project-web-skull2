// config.js
const supabaseUrl = 'https://rzvzhnfrogokupuzjipn.supabase.co'; 
const supabaseKey = 'YOUR_SUPABASE_ANON_KEY'; // ganti dengan anon key dari Supabase

const { createClient } = supabase;
window.supabase = createClient(supabaseUrl, supabaseKey);
