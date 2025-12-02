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

  // Tetap ambil role (opsional) tapi arahkan user ke index terlebih dahulu
  try {
    const { data: userData, error: userError } = await window.supabase
      .from("users")
      .select("role")
      .eq("id", data.user.id)
      .single();

    if (userError || !userData) {
      // kalau gagal ambil role, tetap redirect ke index
      window.location.href = "index.html";
      return;
    }
    // Simpan role di localStorage supaya index.html bisa menentukan tombol target
    localStorage.setItem("user_role", userData.role || "user");
    localStorage.setItem("user_id", data.user.id);
  } catch (err) {
    console.warn("Tidak bisa mengambil role user:", err);
  }

  if (data.user.user_metadata.role === "admin") {
    window.location.href = "admin-dashboard.html"; // langsung admin
} else {
    window.location.href = "user-dashboard.html";  // user langsung ke panel
}


}
