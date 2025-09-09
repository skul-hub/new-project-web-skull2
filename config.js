// config.js
const supabaseUrl = 'https://yegkaqzynckagopjinnh.supabase.co'; 
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InllZ2thcXp5bmNrYWdvcGppbm5oIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc0MjY5OTQsImV4cCI6MjA3MzAwMjk5NH0.nuxlqVjSJdJGDjrgM2tPmJw-h3i5f4M1aXk_eYej5RQ'; // ganti dengan anon key dari Supabase

const { createClient } = supabase;
window.supabase = createClient(supabaseUrl, supabaseKey);
