// Supabase Configuration

const SUPABASE_URL = 'https://zpgebfbzdmahlbhjbvvk.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpwZ2ViZmJ6ZG1haGxiaGpidnZrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg0MDYxNzAsImV4cCI6MjA3Mzk4MjE3MH0.KtiKm9TdgedUXKXMQQxYNzeFbKAgKbqP2_0IhI_AFHA';

// Initialize Supabase client
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

console.log('Supabase client initialized');