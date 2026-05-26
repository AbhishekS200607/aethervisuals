// ─── Shared state ────────────────────────────────────────────────────────────
const state = {
  token: null,
  currentCompany: null,
  currentFolder: null,
};

// ─── API helper ──────────────────────────────────────────────────────────────
async function apiFetch(url, options = {}) {
  const headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${state.token}` };
  if (options.body instanceof FormData) delete headers['Content-Type'];

  const res = await fetch(url, { ...options, headers: { ...headers, ...(options.headers || {}) } });

  if (res.status === 401) {
    await _supabase.auth.signOut();
    showLogin();
    return null;
  }
  return res;
}

// ─── View helpers ─────────────────────────────────────────────────────────────
function showLogin() {
  document.getElementById('login-screen').classList.remove('hidden');
  document.getElementById('dashboard').classList.add('hidden');
}

function showDashboard() {
  document.getElementById('login-screen').classList.add('hidden');
  document.getElementById('dashboard').classList.remove('hidden');
}

// ─── Login form ───────────────────────────────────────────────────────────────
document.getElementById('login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;
  const errEl = document.getElementById('login-error');
  const btn = document.getElementById('login-btn');

  btn.disabled = true;
  btn.textContent = 'Signing in...';
  errEl.textContent = '';

  const { data, error } = await _supabase.auth.signInWithPassword({ email, password });

  btn.disabled = false;
  btn.textContent = 'Sign In';

  if (error || !data.session) {
    errEl.textContent = error?.message || 'Login failed';
    return;
  }

  state.token = data.session.access_token;
  showDashboard();
  loadCompanies();
});

// ─── Logout ───────────────────────────────────────────────────────────────────
async function doLogout() {
  await _supabase.auth.signOut();
  state.token = null;
  state.currentCompany = null;
  state.currentFolder = null;
  showLogin();
}
document.getElementById('logout-btn').addEventListener('click', doLogout);
document.getElementById('topbar-logout').addEventListener('click', doLogout);

// ─── Mobile sidebar toggle ────────────────────────────────────────────────────
const sidebar = document.getElementById('sidebar');
const sidebarBackdrop = document.getElementById('sidebar-backdrop');
const sidebarToggle = document.getElementById('sidebar-toggle');

function openSidebar() {
  sidebar.classList.add('open');
  sidebarBackdrop.classList.add('open');
}
function closeSidebar() {
  sidebar.classList.remove('open');
  sidebarBackdrop.classList.remove('open');
}

sidebarToggle.addEventListener('click', openSidebar);
sidebarBackdrop.addEventListener('click', closeSidebar);

// Close sidebar on nav item click (mobile)
document.querySelectorAll('.nav-item, .logout-btn').forEach(el =>
  el.addEventListener('click', closeSidebar)
);

// ─── Session persistence & token auto-refresh ─────────────────────────────────
_supabase.auth.onAuthStateChange((event, session) => {
  if (session) {
    state.token = session.access_token;
    if (event === 'INITIAL_SESSION') {
      // Defer until all other scripts are loaded
      setTimeout(() => { showDashboard(); loadCompanies(); }, 0);
    }
  } else {
    state.token = null;
    showLogin();
  }
});
