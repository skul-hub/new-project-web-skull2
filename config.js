// config.js
const supabaseUrl = 'https://qnwmhaiulcvamdfhpyev.supabase.co'; // GANTI DENGAN URL SUPABASE ANDA
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFud21oYWl1bGN2YW1kZmhweWV2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc1MjE3MzMsImV4cCI6MjA3MzA5NzczM30.Nx8mmWebHIQKeJJQ0WHPsrrSrYr97YSMPGYkOGazKPQ'; // GANTI DENGAN ANON KEY SUPABASE ANDA

const { createClient } = supabase;
window.supabase = createClient(supabaseUrl, supabaseKey);
