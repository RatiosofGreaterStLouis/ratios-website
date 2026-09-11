(async () => {

  const id =
    new URLSearchParams(location.search).get('id') || '';

  const loading = document.getElementById('loading');
  const unavailable = document.getElementById('unavailable');
  const profile = document.getElementById('profile');
  const cards = document.getElementById('cards');


  /* -----------------------------------------
     Helpers
     ----------------------------------------- */

  function hasValue(value) {
    return value !== null &&
           value !== undefined &&
           String(value).trim() !== '';
  }


  function cleanPhone(phone) {
    return String(phone || '').replace(/[^\d+]/g, '');
  }


  function formatPhone(phone) {

    const digits =
      String(phone || '').replace(/\D/g, '');

    if (digits.length === 10) {
      return `(${digits.slice(0,3)}) ${digits.slice(3,6)}-${digits.slice(6)}`;
    }

    if (digits.length === 11 && digits.startsWith('1')) {
      return `(${digits.slice(1,4)}) ${digits.slice(4,7)}-${digits.slice(7)}`;
    }

    return String(phone || '');
  }


  function makeCard(label, value, options = {}) {

    if (!hasValue(value)) return null;

    const card = document.createElement('div');
    card.className = 'em-card';

    if (options.fullWidth) {
      card.style.gridColumn = '1 / -1';
    }

    if (options.urgent) {
      card.style.border = '2px solid #d97706';
      card.style.background = '#fffaf0';
    }

    const heading = document.createElement('span');
    heading.textContent = label;

    const strong = document.createElement('strong');
    strong.textContent = value;

    card.append(heading, strong);

    return card;
  }


  function addSectionTitle(text) {

    const heading = document.createElement('h2');

    heading.textContent = text;

    heading.style.gridColumn = '1 / -1';
    heading.style.margin = '24px 0 4px';
    heading.style.color = '#07172e';
    heading.style.fontSize = '1.25rem';

    cards.appendChild(heading);
  }


  function makeQuickContactButton(name, phone) {

    if (!hasValue(phone)) {
      return null;
    }

    const wrapper = document.createElement('div');

    wrapper.style.gridColumn = '1 / -1';
    wrapper.style.margin = '4px 0 8px';

    const button = document.createElement('a');

    button.href = `tel:${cleanPhone(phone)}`;

    button.textContent =
      hasValue(name)
        ? `Contact caregiver · ${name}`
        : 'Contact caregiver';

    button.style.display = 'flex';
    button.style.alignItems = 'center';
    button.style.justifyContent = 'center';

    button.style.width = '100%';
    button.style.minHeight = '56px';

    button.style.padding = '14px 18px';

    button.style.background = '#07172e';
    button.style.color = '#ffffff';

    button.style.borderRadius = '999px';

    button.style.fontWeight = '800';
    button.style.fontSize = '1.05rem';
    button.style.textDecoration = 'none';
    button.style.textAlign = 'center';

    wrapper.appendChild(button);

    return wrapper;
  }


  function makePhoneCard(
    title,
    name,
    relationship,
    phone
  ) {

    if (
      !hasValue(name) &&
      !hasValue(relationship) &&
      !hasValue(phone)
    ) {
      return null;
    }

    const card = document.createElement('div');

    card.className = 'em-card';

    card.style.gridColumn = '1 / -1';
    card.style.padding = '22px';

    const label = document.createElement('span');

    label.textContent = title;

    card.appendChild(label);


    if (hasValue(name)) {

      const contactName =
        document.createElement('strong');

      contactName.textContent = name;

      contactName.style.fontSize = '1.35rem';

      card.appendChild(contactName);
    }


    if (hasValue(relationship)) {

      const rel =
        document.createElement('p');

      rel.textContent = relationship;

      rel.style.margin = '4px 0 14px';
      rel.style.color = '#526174';

      card.appendChild(rel);
    }


    if (hasValue(phone)) {

      const callButton =
        document.createElement('a');

      callButton.href =
        `tel:${cleanPhone(phone)}`;

      callButton.textContent =
        hasValue(name)
          ? `Call ${name} · ${formatPhone(phone)}`
          : `Call ${formatPhone(phone)}`;

      callButton.style.display = 'flex';
      callButton.style.alignItems = 'center';
      callButton.style.justifyContent = 'center';

      callButton.style.width = '100%';
      callButton.style.minHeight = '54px';

      callButton.style.marginTop = '10px';
      callButton.style.padding = '12px 18px';

      callButton.style.background = '#07172e';
      callButton.style.color = '#ffffff';

      callButton.style.borderRadius = '999px';

      callButton.style.fontWeight = '800';
      callButton.style.textDecoration = 'none';
      callButton.style.textAlign = 'center';

      card.appendChild(callButton);
    }

    return card;
  }


  /* -----------------------------------------
     Load caregiver preview profile
     ----------------------------------------- */

  try {

    const response = await fetch(
      `/api/emergency-profile?id=${encodeURIComponent(id)}`
    );

    if (!response.ok) {
      throw new Error();
    }

    const data = await response.json();

    if (!data.profile) {
      throw new Error();
    }

    const p = data.profile;

    loading.hidden = true;

    document.getElementById('name').textContent =
      p.preferred_name || 'OneProfile™';

    cards.innerHTML = '';


    /* =========================================
       RESPONDER PRIORITY
       ========================================= */

    if (hasValue(p.responder_notes)) {

      const card = makeCard(
        'What you should know first',
        p.responder_notes,
        {
          fullWidth: true,
          urgent: true
        }
      );

      cards.appendChild(card);
    }


    const quickContact =
      makeQuickContactButton(
        p.emergency_contact_name,
        p.emergency_contact_phone
      );

    if (quickContact) {
      cards.appendChild(quickContact);
    }


    /* =========================================
       SAFETY
       ========================================= */

    if (
      hasValue(p.safety_risk_level) ||
      hasValue(p.safe_approach) ||
      hasValue(p.known_destinations)
    ) {

      addSectionTitle('Safety & wandering information');
    }


    if (hasValue(p.safety_risk_level)) {

      const riskCard = document.createElement('div');

      riskCard.className = 'em-card';
      riskCard.style.border = '2px solid #d97706';
      riskCard.style.background = '#fffaf0';

      const heading = document.createElement('span');
      heading.textContent = 'Wandering / elopement risk';

      const riskBadge = document.createElement('strong');

      const riskValue =
        String(p.safety_risk_level).trim();

      riskBadge.textContent = riskValue;

      riskBadge.style.display = 'inline-flex';
      riskBadge.style.alignItems = 'center';
      riskBadge.style.justifyContent = 'center';
      riskBadge.style.width = 'fit-content';
      riskBadge.style.marginTop = '8px';
      riskBadge.style.padding = '8px 14px';
      riskBadge.style.borderRadius = '999px';
      riskBadge.style.fontWeight = '800';
      riskBadge.style.fontSize = '1rem';

      const normalizedRisk =
        riskValue.toLowerCase();

      if (normalizedRisk.includes('high')) {

        riskBadge.style.background = '#b91c1c';
        riskBadge.style.color = '#ffffff';

      } else if (
        normalizedRisk.includes('moderate') ||
        normalizedRisk.includes('medium')
      ) {

        riskBadge.style.background = '#f59e0b';
        riskBadge.style.color = '#07172e';

      } else if (normalizedRisk.includes('low')) {

        riskBadge.style.background = '#15803d';
        riskBadge.style.color = '#ffffff';

      } else {

        riskBadge.style.background = '#e5e7eb';
        riskBadge.style.color = '#07172e';
      }

      riskCard.append(
        heading,
        riskBadge
      );

      cards.appendChild(riskCard);
    }


    if (hasValue(p.safe_approach)) {

      cards.appendChild(
        makeCard(
          'Safest way to approach or redirect me',
          p.safe_approach
        )
      );
    }


    if (hasValue(p.known_destinations)) {

      cards.appendChild(
        makeCard(
          'Places I may try to go',
          p.known_destinations
        )
      );
    }


    /* =========================================
       COMMUNICATION + SUPPORT
       ========================================= */

    if (
      hasValue(p.communication_method) ||
      hasValue(p.communication_notes) ||
      hasValue(p.touch_preference) ||
      hasValue(p.sensory_triggers) ||
      hasValue(p.calming_supports)
    ) {

      addSectionTitle('Communication & support');
    }


    if (hasValue(p.communication_method)) {

      cards.appendChild(
        makeCard(
          'Communication method',
          p.communication_method
        )
      );
    }


    if (hasValue(p.communication_notes)) {

      cards.appendChild(
        makeCard(
          'Communication instructions',
          p.communication_notes
        )
      );
    }


    if (hasValue(p.touch_preference)) {

      cards.appendChild(
        makeCard(
          'Touch preference',
          p.touch_preference
        )
      );
    }


    if (hasValue(p.sensory_triggers)) {

      cards.appendChild(
        makeCard(
          'Sensory triggers',
          p.sensory_triggers
        )
      );
    }


    if (hasValue(p.calming_supports)) {

      cards.appendChild(
        makeCard(
          'What helps me feel safe / calm',
          p.calming_supports
        )
      );
    }


    /* =========================================
       EMERGENCY CONTACTS
       ========================================= */

    const hasPrimary =
      hasValue(p.emergency_contact_name) ||
      hasValue(p.emergency_contact_relationship) ||
      hasValue(p.emergency_contact_phone);

    const hasAlternate =
      hasValue(p.alternate_contact_name) ||
      hasValue(p.alternate_contact_phone);


    if (hasPrimary || hasAlternate) {

      addSectionTitle('Emergency contacts');
    }


    if (hasPrimary) {

      const primaryCard =
        makePhoneCard(
          'Primary emergency contact',
          p.emergency_contact_name,
          p.emergency_contact_relationship,
          p.emergency_contact_phone
        );

      if (primaryCard) {
        cards.appendChild(primaryCard);
      }
    }


    if (hasAlternate) {

      const alternateCard =
        makePhoneCard(
          'Alternate emergency contact',
          p.alternate_contact_name,
          '',
          p.alternate_contact_phone
        );

      if (alternateCard) {
        cards.appendChild(alternateCard);
      }
    }


    profile.hidden = false;


  } catch (err) {

    loading.hidden = true;
    unavailable.hidden = false;
  }

})();