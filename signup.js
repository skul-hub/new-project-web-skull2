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
      data: { username },
    },
  });

  if (error) {
    alert("Registrasi gagal: " + error.message);
    return;
  }

  alert("Registrasi berhasil, silakan login!");
  window.location.href = "signin.html";
}
