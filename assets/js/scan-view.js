(async () => {

  const code =
    new URLSearchParams(location.search).get('code') || '';

  const loading = document.getElementById('loading');
  const error = document.getElementById('error');
  const content = document.getElementById('content');
  const grid = document.getElementById('profileGrid');


  function hasValue(value) {
    return value !== null &&
           value !== undefined &&
           String(value).trim() !== '';
  }


  function cleanPhone(phone) {
    return String(phone || '')
      .replace(/[^\d+]/g, '');
  }


  function formatPhone(phone) {

    const digits =
      String(phone || '')
        .replace(/\D/g, '');

    if (digits.length === 10) {
      return `(${digits.slice(0,3)}) ${digits.slice(3,6)}-${digits.slice(6)}`;
    }

    if (
      digits.length === 11 &&
      digits.startsWith('1')
    ) {
      return `(${digits.slice(1,4)}) ${digits.slice(4,7)}-${digits.slice(7)}`;
    }

    return String(phone || '');

  }


  function makeCard(
    label,
    value,
    options = {}
  ) {

    if (!hasValue(value)) {
      return null;
    }

    const card =
      document.createElement('div');

    card.className = 'em-card';

    if (options.fullWidth) {
      card.style.gridColumn = '1 / -1';
    }

    if (options.urgent) {
      card.style.border = '2px solid #d97706';
      card.style.background = '#fffaf0';
    }

    const heading =
      document.createElement('span');

    heading.textContent = label;

    const strong =
      document.createElement('strong');

    strong.textContent = value;

    card.append(
      heading,
      strong
    );

    return card;

  }


  function addSectionTitle(text) {

    const heading =
      document.createElement('h2');

    heading.textContent = text;
    heading.style.gridColumn = '1 / -1';
    heading.style.margin = '24px 0 4px';
    heading.style.color = '#07172e';
    heading.style.fontSize = '1.25rem';

    grid.appendChild(heading);

  }


  function makeQuickContactButton(
    name,
    phone
  ) {

    if (!hasValue(phone)) {
      return null;
    }

    const wrapper =
      document.createElement('div');

    wrapper.style.gridColumn = '1 / -1';
    wrapper.style.margin = '4px 0 8px';

    const button =
      document.createElement('a');

    button.href =
      `tel:${cleanPhone(phone)}`;

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


  function makeGlanceItem(
    label,
    value
  ) {

    if (!hasValue(value)) {
      return null;
    }

    const item =
      document.createElement('div');

    item.style.padding = '14px 16px';
    item.style.border = '1px solid #d8e5ec';
    item.style.borderRadius = '14px';
    item.style.background = '#ffffff';

    const labelElement =
      document.createElement('span');

    labelElement.textContent = label;
    labelElement.style.display = 'block';
    labelElement.style.marginBottom = '5px';
    labelElement.style.color = '#14869a';
    labelElement.style.fontSize = '.72rem';
    labelElement.style.fontWeight = '900';
    labelElement.style.letterSpacing = '.08em';
    labelElement.style.textTransform = 'uppercase';

    const valueElement =
      document.createElement('strong');

    valueElement.textContent = value;
    valueElement.style.display = 'block';
    valueElement.style.color = '#07172e';
    valueElement.style.fontSize = '1rem';
    valueElement.style.lineHeight = '1.4';

    item.append(
      labelElement,
      valueElement
    );

    return item;

  }


  function makeAtAGlance(profile) {

    const items = [

      {
        label: 'Communication',
        value: profile.communication_method
      },

      {
        label: 'Safest approach',
        value: profile.safe_approach
      },

      {
        label: 'Touch',
        value: profile.touch_preference
      },

      {
        label: 'Sensory triggers',
        value: profile.sensory_triggers
      }

    ].filter(
      item => hasValue(item.value)
    );

    if (!items.length) {
      return null;
    }

    const wrapper =
      document.createElement('section');

    wrapper.style.gridColumn = '1 / -1';
    wrapper.style.margin = '12px 0 4px';
    wrapper.style.padding = '20px';
    wrapper.style.border = '1px solid #cfe3ea';
    wrapper.style.borderRadius = '18px';
    wrapper.style.background = '#f4fafc';

    const eyebrow =
      document.createElement('div');

    eyebrow.textContent = 'AT A GLANCE';
    eyebrow.style.marginBottom = '6px';
    eyebrow.style.color = '#14869a';
    eyebrow.style.fontSize = '.75rem';
    eyebrow.style.fontWeight = '900';
    eyebrow.style.letterSpacing = '.1em';

    const title =
      document.createElement('h2');

    title.textContent = 'How to interact safely';
    title.style.margin = '0 0 14px';
    title.style.color = '#07172e';
    title.style.fontSize = '1.2rem';

    const itemGrid =
      document.createElement('div');

    itemGrid.style.display = 'grid';
    itemGrid.style.gridTemplateColumns =
      'repeat(auto-fit, minmax(210px, 1fr))';
    itemGrid.style.gap = '10px';

    items.forEach(item => {

      const glanceItem =
        makeGlanceItem(
          item.label,
          item.value
        );

      if (glanceItem) {
        itemGrid.appendChild(glanceItem);
      }

    });

    wrapper.append(
      eyebrow,
      title,
      itemGrid
    );

    return wrapper;

  }


  function makeRiskCard(value) {

    if (!hasValue(value)) {
      return null;
    }

    const riskCard =
      document.createElement('div');

    riskCard.className = 'em-card';
    riskCard.style.margin = '0';

    const heading =
      document.createElement('span');

    heading.textContent =
      'Wandering / elopement risk';

    const riskBadge =
      document.createElement('strong');

    const riskValue =
      String(value).trim();

    const normalizedRisk =
      riskValue.toLowerCase();

    if (
      normalizedRisk.includes('unknown') ||
      normalizedRisk.includes('assessing') ||
      normalizedRisk.includes('not assessed')
    ) {
      riskBadge.textContent =
        'Risk level not specified';
    } else {
      riskBadge.textContent =
        riskValue;
    }

    riskBadge.style.display = 'inline-flex';
    riskBadge.style.alignItems = 'center';
    riskBadge.style.justifyContent = 'center';
    riskBadge.style.width = 'fit-content';
    riskBadge.style.marginTop = '8px';
    riskBadge.style.padding = '8px 14px';
    riskBadge.style.borderRadius = '999px';
    riskBadge.style.fontWeight = '800';
    riskBadge.style.fontSize = '1rem';

    if (
      normalizedRisk.includes('high')
    ) {

      riskCard.style.border = '2px solid #b91c1c';
      riskCard.style.background = '#fff1f2';
      riskBadge.style.background = '#b91c1c';
      riskBadge.style.color = '#ffffff';

    } else if (
      normalizedRisk.includes('moderate') ||
      normalizedRisk.includes('medium')
    ) {

      riskCard.style.border = '2px solid #d97706';
      riskCard.style.background = '#fffaf0';
      riskBadge.style.background = '#f59e0b';
      riskBadge.style.color = '#07172e';

    } else if (
      normalizedRisk.includes('low')
    ) {

      riskCard.style.border = '2px solid #15803d';
      riskCard.style.background = '#f0fdf4';
      riskBadge.style.background = '#15803d';
      riskBadge.style.color = '#ffffff';

    } else if (
      normalizedRisk.includes('unknown') ||
      normalizedRisk.includes('assessing') ||
      normalizedRisk.includes('not assessed')
    ) {

      riskCard.style.border = '1px solid #cbd5e1';
      riskCard.style.background = '#f8fafc';
      riskBadge.style.background = '#e2e8f0';
      riskBadge.style.color = '#334155';

    } else {

      riskCard.style.border = '1px solid #d8e0e8';
      riskCard.style.background = '#f8fafc';
      riskBadge.style.background = '#e5e7eb';
      riskBadge.style.color = '#07172e';

    }

    riskCard.append(
      heading,
      riskBadge
    );

    return riskCard;

  }


  function makeSafetySection(profile) {

    const hasSafetyInfo =
      hasValue(profile.safety_risk_level) ||
      hasValue(profile.known_destinations);

    if (!hasSafetyInfo) {
      return null;
    }

    const wrapper =
      document.createElement('section');

    wrapper.style.gridColumn = '1 / -1';
    wrapper.style.margin = '24px 0 4px';
    wrapper.style.padding = '20px';
    wrapper.style.border = '1px solid #d7e2ea';
    wrapper.style.borderRadius = '18px';
    wrapper.style.background = '#f8fafc';

    const eyebrow =
      document.createElement('div');

    eyebrow.textContent = 'SAFETY INFORMATION';
    eyebrow.style.marginBottom = '6px';
    eyebrow.style.color = '#14869a';
    eyebrow.style.fontSize = '.75rem';
    eyebrow.style.fontWeight = '900';
    eyebrow.style.letterSpacing = '.1em';

    const title =
      document.createElement('h2');

    title.textContent =
      'Safety & wandering information';

    title.style.margin = '0 0 8px';
    title.style.color = '#07172e';
    title.style.fontSize = '1.2rem';

    const intro =
      document.createElement('p');

    intro.textContent =
      'Use this information to help reduce distress, support safe redirection, and assist with reunification.';

    intro.style.margin = '0 0 16px';
    intro.style.color = '#526174';
    intro.style.lineHeight = '1.5';

    const sectionGrid =
      document.createElement('div');

    sectionGrid.style.display = 'grid';
    sectionGrid.style.gridTemplateColumns =
      'repeat(auto-fit, minmax(250px, 1fr))';
    sectionGrid.style.gap = '12px';

    const riskCard =
      makeRiskCard(
        profile.safety_risk_level
      );

    if (riskCard) {

      riskCard.style.gridColumn =
        '1 / -1';

      sectionGrid.appendChild(
        riskCard
      );

    }

    const destinations =
      makeCard(
        'Places I may try to go',
        profile.known_destinations
      );

    if (destinations) {

      destinations.style.margin =
        '0';

      sectionGrid.appendChild(
        destinations
      );

    }

    wrapper.append(
      eyebrow,
      title,
      intro,
      sectionGrid
    );

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

    const card =
      document.createElement('div');

    card.className = 'em-card';
    card.style.gridColumn = '1 / -1';
    card.style.padding = '22px';

    const label =
      document.createElement('span');

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


  function makeActionButton(
    text,
    phone,
    options = {}
  ) {

    if (!hasValue(phone)) {
      return null;
    }

    const button =
      document.createElement('a');

    button.href =
      `tel:${cleanPhone(phone)}`;

    button.textContent = text;
    button.style.display = 'flex';
    button.style.alignItems = 'center';
    button.style.justifyContent = 'center';
    button.style.minHeight = '52px';
    button.style.padding = '12px 18px';
    button.style.borderRadius = '999px';
    button.style.fontWeight = '800';
    button.style.textDecoration = 'none';
    button.style.textAlign = 'center';

    if (options.emergency) {

      button.style.background = '#b91c1c';
      button.style.color = '#ffffff';
      button.style.border = '2px solid #b91c1c';

    } else if (options.secondary) {

      button.style.background = '#ffffff';
      button.style.color = '#07172e';
      button.style.border = '2px solid #07172e';

    } else {

      button.style.background = '#07172e';
      button.style.color = '#ffffff';
      button.style.border = '2px solid #07172e';

    }

    return button;

  }


  function makeResponderActions(profile) {

    const wrapper =
      document.createElement('section');

    wrapper.style.gridColumn = '1 / -1';
    wrapper.style.margin = '24px 0 4px';
    wrapper.style.padding = '22px';
    wrapper.style.border = '1px solid #cfe3ea';
    wrapper.style.borderRadius = '18px';
    wrapper.style.background = '#f8fbfd';

    const eyebrow =
      document.createElement('div');

    eyebrow.textContent = 'RESPONDER ACTIONS';
    eyebrow.style.marginBottom = '6px';
    eyebrow.style.color = '#14869a';
    eyebrow.style.fontSize = '.75rem';
    eyebrow.style.fontWeight = '900';
    eyebrow.style.letterSpacing = '.1em';

    const title =
      document.createElement('h2');

    title.textContent =
      'Help support safe reunification';

    title.style.margin = '0 0 8px';
    title.style.color = '#07172e';
    title.style.fontSize = '1.2rem';

    const note =
      document.createElement('p');

    note.textContent =
      'If it is safe to do so, remain nearby while attempting to contact the caregiver. Use emergency services for immediate danger or a medical emergency.';

    note.style.margin = '0 0 16px';
    note.style.color = '#526174';
    note.style.lineHeight = '1.55';

    const actions =
      document.createElement('div');

    actions.style.display = 'grid';
    actions.style.gridTemplateColumns =
      'repeat(auto-fit, minmax(210px, 1fr))';
    actions.style.gap = '10px';

    const caregiverButton =
      makeActionButton(
        hasValue(profile.emergency_contact_name)
          ? `Call caregiver · ${profile.emergency_contact_name}`
          : 'Call caregiver',
        profile.emergency_contact_phone
      );

    if (caregiverButton) {
      actions.appendChild(caregiverButton);
    }

    const alternateButton =
      makeActionButton(
        hasValue(profile.alternate_contact_name)
          ? `Call alternate · ${profile.alternate_contact_name}`
          : 'Call alternate contact',
        profile.alternate_contact_phone,
        {
          secondary: true
        }
      );

    if (alternateButton) {
      actions.appendChild(alternateButton);
    }

    const emergencyButton =
      makeActionButton(
        'Call 911 · Immediate emergency',
        '911',
        {
          emergency: true
        }
      );

    actions.appendChild(
      emergencyButton
    );

    wrapper.append(
      eyebrow,
      title,
      note,
      actions
    );

    return wrapper;

  }


  try {

    const response =
      await fetch(
        `/api/identifier-profile?code=${encodeURIComponent(code)}`
      );

    const data =
      await response.json();

    loading.hidden = true;

    if (
      !response.ok ||
      !data.profile
    ) {

      error.hidden = false;
      return;

    }

    const p =
      data.profile;

    document
      .getElementById('displayName')
      .textContent =
        p.preferred_name ||
        'OneProfile™';

    grid.innerHTML = '';


    if (
      hasValue(
        p.responder_notes
      )
    ) {

      const card =
        makeCard(
          'What you should know first',
          p.responder_notes,
          {
            fullWidth: true,
            urgent: true
          }
        );

      grid.appendChild(card);

    }


    const quickContact =
      makeQuickContactButton(
        p.emergency_contact_name,
        p.emergency_contact_phone
      );

    if (quickContact) {
      grid.appendChild(quickContact);
    }


    const atAGlance =
      makeAtAGlance(p);

    if (atAGlance) {
      grid.appendChild(atAGlance);
    }


    const safetySection =
      makeSafetySection(p);

    if (safetySection) {
      grid.appendChild(safetySection);
    }


    const hasCommunicationDetails =
      hasValue(p.communication_notes) ||
      hasValue(p.calming_supports);

    if (hasCommunicationDetails) {

      addSectionTitle(
        'Communication & support'
      );

    }


    if (
      hasValue(
        p.communication_notes
      )
    ) {

      grid.appendChild(
        makeCard(
          'Communication instructions',
          p.communication_notes
        )
      );

    }


    if (
      hasValue(
        p.calming_supports
      )
    ) {

      grid.appendChild(
        makeCard(
          'What helps me feel safe / calm',
          p.calming_supports
        )
      );

    }


    const responderActions =
      makeResponderActions(p);

    grid.appendChild(
      responderActions
    );


    const hasPrimary =
      hasValue(p.emergency_contact_name) ||
      hasValue(p.emergency_contact_relationship) ||
      hasValue(p.emergency_contact_phone);

    const hasAlternate =
      hasValue(p.alternate_contact_name) ||
      hasValue(p.alternate_contact_phone);

    if (
      hasPrimary ||
      hasAlternate
    ) {

      addSectionTitle(
        'Emergency contacts'
      );

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
        grid.appendChild(primaryCard);
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
        grid.appendChild(alternateCard);
      }

    }


    content.hidden = false;


  } catch (err) {

    loading.hidden = true;
    error.hidden = false;

  }

})();