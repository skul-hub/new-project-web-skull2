// config.js
const supabaseUrl = 'https://yegkaqzynckagopjinnh.supabase.co'; 
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpqZ2pscWx0eWtqcGJsaWNpemF3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc0Njc3NzAsImV4cCI6MjA3MzA0Mzc3MH0.1uEMkU3MT5-OqiVS2yUDMAn50Cc91ZBLdhyd_ZxxKSQ'; // ganti dengan anon key dari Supabase

const { createClient } = supabase;
window.supabase = createClient(supabaseUrl, supabaseKey);
