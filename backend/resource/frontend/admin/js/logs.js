async function loadLogs() {
  showView('view-logs');
  state.currentCompany = null;
  state.currentFolder = null;
  updateBreadcrumb();

  const res = await apiFetch('/api/admin/logs?limit=100');
  if (!res) return;
  const logs = await res.json();

  document.getElementById('logs-count').textContent = logs.length;
  const tbody = document.getElementById('logs-body');

  if (!logs.length) {
    tbody.innerHTML = '<tr><td colspan="4" style="padding:24px;text-align:center;color:var(--text-muted)">No access logs yet.</td></tr>';
    return;
  }

  tbody.innerHTML = logs.map((l, i) => `
    <tr style="border-bottom:1px solid var(--border)">
      <td style="padding:8px 12px;color:var(--text-muted)">${i + 1}</td>
      <td style="padding:8px 12px;font-family:monospace;font-size:0.78rem">${escHtml(l.sharing_token || '—')}</td>
      <td style="padding:8px 12px">${escHtml(l.ip_address || '—')}</td>
      <td style="padding:8px 12px;color:var(--text-muted)">${new Date(l.accessed_at).toLocaleString()}</td>
    </tr>
  `).join('');
}

document.getElementById('nav-logs').addEventListener('click', (e) => {
  e.preventDefault();
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  e.currentTarget.classList.add('active');
  loadLogs();
});

document.getElementById('nav-companies').addEventListener('click', (e) => {
  e.preventDefault();
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  e.currentTarget.classList.add('active');
  loadCompanies();
});

document.getElementById('btn-refresh-logs').addEventListener('click', loadLogs);
