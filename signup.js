// signup.js
async function signup(event) {
  event.preventDefault();
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;
  const username = document.getElementById("username").value;

  const { data, error } = await window.supabase.auth.signUp({
    email,
    password,
    options: {
      data: { username }, // Store username in user metadata
    },
  });

  if (error) {
    alert("Registrasi gagal: " + error.message);
    return;
  }

  // --- START PERUBAHAN/PENINGKATAN ROBUSTNESS ---
  // Pastikan objek user ada dan valid sebelum mencoba menyisipkan ke tabel public.users.
  // Ini menangani skenario langka di mana signUp berhasil tanpa error,
  // tetapi objek user mungkin tidak dikembalikan dengan benar.
  if (!data || !data.user || !data.user.id) {
    alert("Registrasi berhasil, tetapi data pengguna tidak lengkap. Silakan coba login.");
    window.location.href = "signin.html";
    return;
  }
  // --- END PERUBAHAN/PENINGKATAN ROBUSTNESS ---

  // After successful signup, insert user data into 'users' table
  const { error: insertError } = await window.supabase
    .from("users")
    .insert([
      { id: data.user.id, email: data.user.email, username: username, role: "user" },
    ]);

  if (insertError) {
    alert("Gagal menyimpan data user: " + insertError.message);
    // Optionally, you might want to delete the auth user if this fails.
    // Note: Deleting auth user requires a service role key, which should NOT be exposed client-side.
    // The line below is commented out for security reasons in a client-side script.
    // await window.supabase.auth.admin.deleteUser(data.user.id);
    return;
  }

  alert("Registrasi berhasil, silakan login!");
  window.location.href = "signin.html";
}
