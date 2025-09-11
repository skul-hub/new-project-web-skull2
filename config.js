// config.js
const supabaseUrl = 'https://nnycywdkbtfludsuuvys.supabase.co'; // GANTI DENGAN URL SUPABASE ANDA
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ueWN5d2RrYnRmbHVkc3V1dnlzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc2MTAyMTksImV4cCI6MjA3MzE4NjIxOX0.Hfp-ahW4S29SuORA3803ZCIivrwuquFgoSaTHUkALJU'; // GANTI DENGAN ANON KEY SUPABASE ANDA

const { createClient } = supabase;
window.supabase = createClient(supabaseUrl, supabaseKey);
