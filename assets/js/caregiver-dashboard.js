(async () => {
  const loading = document.getElementById('portalLoading');
  const content = document.getElementById('portalContent');
  const safe = (v) => String(v ?? '');
  try {
    const r = await fetch('/api/caregiver-session', { credentials:'same-origin' });
    if (!r.ok) { location.replace('caregiver-login.html'); return; }
    const data = await r.json();
    if (!data.authenticated) { location.replace('caregiver-login.html'); return; }
    const e = data.enrollment;
    const p = data.profile || {};
    document.getElementById('caregiverName').textContent = safe(e.caregiver_first_name);
    document.getElementById('participantName').textContent = safe(e.participant_first_name);
    document.getElementById('participantInitial').textContent = safe(e.participant_first_name).slice(0,1).toUpperCase() || '1';
    document.getElementById('enrollmentId').textContent = safe(e.enrollment_id);
    document.getElementById('ageRange').textContent = safe(e.participant_age_range);
    document.getElementById('relationship').textContent = safe(e.relationship);
    document.getElementById('location').textContent = `${safe(e.city)}, ${safe(e.state)}`;
    document.getElementById('preferredContact').textContent = safe(e.preferred_contact);
    const status = p.profile_status === 'complete' ? 'Complete' : p.profile_status === 'in_progress' ? 'In progress' : 'Setup needed';
    document.getElementById('profileStatus').textContent = status;
    loading.hidden = true; content.hidden = false;
  } catch (_) { location.replace('caregiver-login.html'); }

  document.getElementById('logoutButton').addEventListener('click', async () => {
    const b = document.getElementById('logoutButton'); b.disabled = true;
    try { await fetch('/api/caregiver-logout', { method:'POST', credentials:'same-origin' }); } finally { location.replace('caregiver-login.html'); }
  });
})();
