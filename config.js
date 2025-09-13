// config.js
const supabaseUrl = 'https://pfjpwfpnirbwfmfpmkuc.supabase.co'; // GANTI DENGAN URL SUPABASE ANDA
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBmanB3ZnBuaXJid2ZtZnBta3VjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc3ODQ5MTcsImV4cCI6MjA3MzM2MDkxN30.EadYOACg3gj79nsDkSc4NWStQyr2BokNVkVilgWWoX8'; // GANTI DENGAN ANON KEY SUPABASE ANDA

const { createClient } = supabase;
window.supabase = createClient(supabaseUrl, supabaseKey);
