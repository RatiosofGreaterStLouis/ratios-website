(async () => {
  const $ = id => document.getElementById(id);
  const groups = [
    ['Identity & communication', [['preferred_name', 'Preferred name'], ['communication_method', 'Communication method'], ['communication_notes', 'Communication instructions']]],
    ['Identification', [['participant_photo', 'Primary participant photo'], ['additional_photos', 'Additional identifying photos'], ['physical_description', 'Physical description & identifying features']]],
    ['Sensory & calming support', [['sensory_triggers', 'Sensory triggers'], ['calming_supports', 'What helps them feel safe / calm'], ['touch_preference', 'Touch preference']]],
    ['Safety & wandering', [['safety_risk_level', 'Wandering / elopement risk'], ['known_destinations', 'Places they may try to go'], ['safe_approach', 'Safe approach / redirection']]],
    ['Medical information', [['diagnoses', 'Diagnoses & conditions'], ['medications', 'Current medications'], ['allergies', 'Allergies']]],
    ['Emergency contacts', [['emergency_contact_name', 'Primary contact name'], ['emergency_contact_relationship', 'Primary contact relationship'], ['emergency_contact_phone', 'Primary contact phone'], ['alternate_contact_name', 'Alternate contact name'], ['alternate_contact_phone', 'Alternate contact phone']]],
    ['Responder note', [['responder_notes', 'Detailed responder note']]]
  ];
  const baseline = new Set(['preferred_name', 'emergency_contact_name', 'emergency_contact_relationship', 'emergency_contact_phone', 'alternate_contact_name', 'alternate_contact_phone']);
  let saved = null;
  let dirty = false;
  let saving = false;
  for (const [title, fields] of groups) {
    const section = document.createElement('section');
    section.className = 'esh-field-group';
    const heading = document.createElement('h3');
    heading.textContent = title;
    section.appendChild(heading);
    for (const [value, label] of fields) {
      const row = document.createElement('label');
      const input = document.createElement('input');
      input.type = 'checkbox'; input.value = value;
      const span = document.createElement('span'); span.textContent = label;
      row.append(input, span); section.appendChild(row);
    }
    $('fields').appendChild(section);
  }
  function updateState() {
    const basic = $('basicEnabled').checked;
    const full = $('enabled').checked;
    $('stateTitle').textContent = full ? 'Full emergency profile' : basic ? 'Basic emergency card' : 'All public sharing paused';
    $('stateText').textContent = full
      ? 'The saved full view includes your selected details and the basic card, if enabled.'
      : basic ? 'The saved basic card shows the participant’s name, preferred name, and emergency contacts. Detailed information stays hidden.'
      : 'No profile information is available through the public links after you save.';
    $('basicOptions').hidden = !basic;
    $('fullOptions').hidden = !full;
    $('consentRow').hidden = !basic;
    $('basicPhoto').disabled = !basic || saving;
    $('basicHelp').disabled = !basic || saving;
    $('basicConsent').required = basic;
    for (const box of $('fields').querySelectorAll('input')) {
      box.disabled = saving || !full || (basic && baseline.has(box.value));
      if (basic && baseline.has(box.value)) box.checked = true;
    }
    $('save').disabled = saving || !saved;
  }
  function showLinks() {
    const available = saved && saved.public_token && (saved.enabled || saved.basic_enabled);
    $('linkCard').hidden = !available;
    if (!available) return;
    const url = `${location.origin}/emergency.html?id=${encodeURIComponent(saved.public_token)}`;
    $('publicUrl').value = url;
    $('preview').href = url;
    $('basicPreview').href = `${url}&view=basic`;
    $('basicPreview').hidden = !saved.basic_enabled;
    $('preview').textContent = saved.enabled ? 'Preview saved full profile' : 'Preview saved basic card';
  }
  function setBusy(value) {
    saving = value;
    $('basicEnabled').disabled = value || !saved;
    $('enabled').disabled = value || !saved;
    $('basicConsent').disabled = value || !saved;
    updateState();
  }
  function apply(data) {
    saved = data;
    $('enabled').checked = Boolean(data.enabled);
    $('basicEnabled').checked = Boolean(data.basic_enabled);
    $('basicPhoto').checked = Boolean(data.basic_photo);
    $('basicHelp').value = data.basic_help_note || '';
    $('basicConsent').checked = Boolean(data.basic_enabled);
    const fields = new Set(data.fields || []);
    for (const box of $('fields').querySelectorAll('input')) box.checked = fields.has(box.value);
    dirty = false;
    setBusy(false);
    showLinks();
  }
  $('settingsForm').addEventListener('input', () => {
    dirty = true; updateState();
    $('message').textContent = 'Unsaved changes. Save before previewing; preview links show your saved settings.';
  });
  $('settingsForm').addEventListener('submit', async event => {
    event.preventDefault();
    if (!saved || saving) return;
    if ($('basicEnabled').checked && !$('basicConsent').checked) {
      $('message').textContent = 'Please confirm who can see the basic emergency card.'; return;
    }
    const body = {
      enabled: $('enabled').checked,
      basic_enabled: $('basicEnabled').checked,
      basic_photo: $('basicPhoto').checked,
      basic_help_note: $('basicHelp').value,
      basic_consent: $('basicConsent').checked,
      fields: [...$('fields').querySelectorAll('input:checked')].map(input => input.value)
    };
    setBusy(true); $('message').textContent = 'Saving…';
    try {
      const response = await fetch('/api/emergency-sharing', {
        method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
      });
      if (response.status === 401) { location.replace('caregiver-login.html'); return; }
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Unable to save sharing settings.');
      apply(data);
      $('message').textContent = data.enabled ? 'Saved. Your selected full profile is available.'
        : data.basic_enabled ? 'Saved. Your basic emergency card stays visible; detailed information is hidden.'
        : 'Saved. All public profile sharing is paused.';
    } catch (error) { $('message').textContent = error.message; }
    finally { setBusy(false); }
  });
  $('copy').addEventListener('click', async () => {
    try { await navigator.clipboard.writeText($('publicUrl').value); $('message').textContent = 'Link copied.'; }
    catch { $('publicUrl').select(); $('message').textContent = 'Select and copy the link above.'; }
  });
  window.addEventListener('beforeunload', event => {
    if (dirty) { event.preventDefault(); event.returnValue = ''; }
  });
  try {
    const response = await fetch('/api/emergency-sharing', { credentials: 'same-origin', cache: 'no-store' });
    if (response.status === 401) { location.replace('caregiver-login.html'); return; }
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Unable to load sharing settings.');
    apply(data);
    $('message').textContent = data.basic_enabled ? 'Your saved settings are shown below.'
      : 'New: you can enable a basic emergency card that stays visible when full sharing is off. Review and save to activate it.';
  } catch (error) { $('message').textContent = `${error.message} Reload this page to try again.`; }
})();
