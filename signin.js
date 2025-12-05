// signin.js
async function signin(event) {
  event.preventDefault();
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  const { data, error } = await window.supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    alert("Login gagal: " + error.message);
    return;
  }

  const { data: userData, error: userError } = await window.supabase
    .from("users")
    .select("role")
    .eq("id", data.user.id)
    .single();

  if (userError || !userData) {
    alert("Gagal memuat data user.");
    return;
  }

  if (userData.role === "admin") {
    window.location.href = "admin-dashboard.html";
  } else {
    window.location.href = "user-dashboard.html";
  }
}
