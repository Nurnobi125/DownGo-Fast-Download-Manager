(() => {
  const config = window.DOWNGO_SUPABASE_CONFIG;
  const ready = config && /^https:\/\//.test(config.url) && config.publishableKey &&
    config.publishableKey !== "YOUR_SUPABASE_PUBLISHABLE_KEY" && window.supabase?.createClient;
  window.downGoSupabase = ready
    ? window.supabase.createClient(config.url, config.publishableKey)
    : null;
})();
