// signup.js
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
        await window.supabase.auth.getSession();

        const { error: dbError } = await window.supabase.from('users').insert([{
            id: data.user.id,
            username: username,
            whatsapp: whatsapp,
            role: 'user'
        }]);

        if (dbError) {
            alert('Sign up berhasil, tapi gagal simpan profil: ' + dbError.message);
            await window.supabase.auth.signOut();
            return;
        }

        alert('Sign up berhasil! Silakan login.');
        window.location.href = 'signin.html';
    } else {
        alert('Sign up gagal: Email mungkin sudah terdaftar.');
    }
});
