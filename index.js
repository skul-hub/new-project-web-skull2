// index.js
async function checkSession() {
  const { data: { user }, error } = await window.supabase.auth.getUser();
  if (error || !user) return; // belum login, tetap di index.html

  // ambil role dari tabel users
  const { data: userData, error: userError } = await window.supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  if (userError || !userData) return;

  if (userData.role === "admin") {
    window.location.href = "admin-dashboard.html";
  } else {
    window.location.href = "user-dashboard.html";
  }
}

window.onload = checkSession;
