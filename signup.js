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

  // --- START PERUBAHAN PENTING ---
  // Kode untuk INSERT ke public.users DIHAPUS karena sekarang ditangani oleh trigger database.
  // Pengecekan data.user tetap dipertahankan untuk robustness.
  if (!data || !data.user || !data.user.id) {
    alert("Registrasi berhasil, tetapi data pengguna tidak lengkap. Silakan coba login.");
    window.location.href = "signin.html";
    return;
  }
  // --- END PERUBAHAN PENTING ---

  // alert("Registrasi berhasil, silakan login!"); // Ini akan dipindahkan ke bawah
  // window.location.href = "signin.html"; // Ini akan dipindahkan ke bawah

  // Setelah pendaftaran auth berhasil, kita tidak perlu lagi melakukan INSERT manual ke public.users.
  // Trigger database 'on_auth_user_created' akan menanganinya secara otomatis.

  alert("Registrasi berhasil, silakan login!");
  window.location.href = "signin.html";
}
