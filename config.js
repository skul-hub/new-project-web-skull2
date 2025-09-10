// config.js
const supabaseUrl = 'https://zjgjlqltykjpblicizaw.supabase.co'; // GANTI DENGAN URL SUPABASE ANDA
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpqZ2pscWx0eWtqcGJsaWNpemF3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc0Njc3NzAsImV4cCI6MjA3MzA0Mzc3MH0.1uEMkU3MT5-OqiVS2yUDMAn50Cc91ZBLdhyd_ZxxKSQ'; // GANTI DENGAN ANON KEY SUPABASE ANDA

const { createClient } = supabase;
window.supabase = createClient(supabaseUrl, supabaseKey);
