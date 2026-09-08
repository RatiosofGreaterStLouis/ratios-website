(() => {
  const form = document.getElementById('portalLoginForm');
  const verify = document.getElementById('portalVerifyForm');
  const alertBox = document.getElementById('portalAlert');
  const loginStep = document.getElementById('loginStep');
  const verifyStep = document.getElementById('verifyStep');
  const emailInput = document.getElementById('portalEmail');
  const idInput = document.getElementById('portalEnrollmentId');
  const codeInput = document.getElementById('portalCode');
  const backBtn = document.getElementById('portalBack');
  const showAlert = (msg, type='error') => { alertBox.textContent = msg; alertBox.className = `opc-alert ${type}`; alertBox.hidden = false; };
  const hideAlert = () => { alertBox.hidden = true; };
  const setBusy = (button, busy, text) => { if (!button) return; button.disabled = busy; button.dataset.old ||= button.textContent; button.textContent = busy ? text : button.dataset.old; };

  fetch('/api/caregiver-session', { credentials: 'same-origin' }).then(r => { if (r.ok) location.replace('caregiver-dashboard.html'); }).catch(() => {});

  form.addEventListener('submit', async (e) => {
    e.preventDefault(); hideAlert();
    const email = emailInput.value.trim();
    const enrollment_id = idInput.value.trim().toUpperCase();
    idInput.value = enrollment_id;
    const button = form.querySelector('button[type="submit"]'); setBusy(button, true, 'Sending code…');
    try {
      const r = await fetch('/api/caregiver-start-login', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({email,enrollment_id}) });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || 'Unable to send code.');
      loginStep.hidden = true; verifyStep.hidden = false; codeInput.focus();
      showAlert('Check your email for a 6-digit sign-in code. It expires in 10 minutes.', 'info');
    } catch (err) { showAlert(err.message || 'Unable to send code.'); }
    finally { setBusy(button, false); }
  });

  verify.addEventListener('submit', async (e) => {
    e.preventDefault(); hideAlert();
    const button = verify.querySelector('button[type="submit"]'); setBusy(button, true, 'Signing in…');
    try {
      const r = await fetch('/api/caregiver-verify-login', { method:'POST', headers:{'Content-Type':'application/json'}, credentials:'same-origin', body:JSON.stringify({ email:emailInput.value.trim(), enrollment_id:idInput.value.trim().toUpperCase(), code:codeInput.value.trim() }) });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || 'Unable to sign in.');
      location.replace('caregiver-dashboard.html');
    } catch (err) { showAlert(err.message || 'Unable to sign in.'); }
    finally { setBusy(button, false); }
  });

  backBtn.addEventListener('click', () => { verifyStep.hidden = true; loginStep.hidden = false; codeInput.value = ''; hideAlert(); });
})();
