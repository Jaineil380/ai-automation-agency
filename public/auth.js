const supabase = supabase.createClient(
  "YOUR_SUPABASE_URL",
  "YOUR_SUPABASE_ANON_KEY"
);

async function protectPage() {
  const { data } = await supabase.auth.getSession();
  if (!data.session) {
    window.location.href = "/admin-login.html";
  }
}

async function logout() {
  await supabase.auth.signOut();
  window.location.href = "/admin-login.html";
}
