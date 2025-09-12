// config.js
const supabaseUrl = 'https://uvrkoqbnzjayeqzwlxhx.supabase.co'; // GANTI DENGAN URL SUPABASE ANDA
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV2cmtvcWJuempheWVxendseGh4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc2Njg4MjUsImV4cCI6MjA3MzI0NDgyNX0.tB-cbdwgBYDrmTHOcUhJQk1ZgRCbh5cfsNeXkTHG5iY'; // GANTI DENGAN ANON KEY SUPABASE ANDA

const { createClient } = supabase;
window.supabase = createClient(supabaseUrl, supabaseKey);
