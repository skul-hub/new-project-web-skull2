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

  // After successful signup, insert user data into 'users' table
  const { error: insertError } = await window.supabase
    .from("users")
    .insert([
      { id: data.user.id, email: data.user.email, username: username, role: "user" },
    ]);

  if (insertError) {
    alert("Gagal menyimpan data user: " + insertError.message);
    // Optionally, you might want to delete the auth user if this fails
    await window.supabase.auth.admin.deleteUser(data.user.id); // Requires service role key
    return;
  }

  alert("Registrasi berhasil, silakan login!");
  window.location.href = "signin.html";
}
