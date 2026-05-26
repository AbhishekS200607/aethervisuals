// Supabase JS client — initialized with values injected by the server at request time.
// Only the anon key is exposed here. The service role key never leaves the backend.
const _supabase = supabase.createClient(
  window.__AV_SUPABASE_URL__,
  window.__AV_SUPABASE_ANON_KEY__
);
