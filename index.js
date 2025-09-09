// index.js
function showAuth() {
  window.location.href = 'signin.html';
}

window.onload = async () => {
  const { data: { user }, error } = await window.supabase.auth.getUser();
  if (error || !user) return;

  const { data: userData, error: userError } = await window.supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();

  if (userError || !userData) {
    window.location.href = 'signin.html';
    return;
  }

  if (userData.role === 'admin') {
    window.location.href = 'admin-dashboard.html';
  } else {
    window.location.href = 'user-dashboard.html';
  }
};
