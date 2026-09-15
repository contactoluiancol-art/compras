const SUPABASE_URL = 'https://rkehgfvjnenklygxgvqy.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJrZWhnZnZqbmVua2x5Z3hndnF5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg0MjY1MTQsImV4cCI6MjEwNDAwMjUxNH0.GOy8YoyCaB16-LzFcQmtEpuKrOeKrMq2jM6h6eHiF-s';

export const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
