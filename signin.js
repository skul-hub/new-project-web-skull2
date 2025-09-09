// signin.js
document.getElementById('signinForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    const { data, error } = await window.supabase.auth.signInWithPassword({
        email,
        password
    });

    if (error) {
        alert("Login gagal: " + error.message);
        return;
    }

    const { data: userProfile, error: profileError } = await window.supabase
        .from("users")
        .select("*")
        .eq("id", data.user.id)
        .single();

    if (profileError || !userProfile) {
        alert("Gagal memuat profil user.");
        return;
    }

    if (userProfile.role === "admin") {
        alert("Login berhasil! Selamat datang Admin.");
        window.location.href = "admin-dashboard.html";
    } else {
        alert("Login berhasil! Selamat datang " + userProfile.username + ".");
        window.location.href = "user-dashboard.html";
    }
});
