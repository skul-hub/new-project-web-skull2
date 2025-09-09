// signup.js (versi baru, pakai trigger SQL)
document.getElementById('signupForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('username').value;
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const whatsapp = document.getElementById('whatsapp').value;

    const { data, error: authError } = await window.supabase.auth.signUp({
        email,
        password
    });

    if (authError) {
        alert('Sign up gagal: ' + authError.message);
        return;
    }

    if (data.user) {
        // ✅ Row di tabel "users" otomatis dibuat oleh trigger SQL
        // Sekarang tinggal update data user itu (username & whatsapp)

        const { error: updateError } = await window.supabase
            .from("users")
            .update({
                username: username,
                whatsapp: whatsapp
            })
            .eq("id", data.user.id);

        if (updateError) {
            alert('Sign up berhasil, tapi gagal update profil: ' + updateError.message);
            return;
        }

        alert('Sign up berhasil! Silakan login.');
        window.location.href = 'signin.html';
    } else {
        alert('Sign up gagal: Email mungkin sudah terdaftar.');
    }
});
