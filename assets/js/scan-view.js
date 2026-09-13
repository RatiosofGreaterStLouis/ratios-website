(async () => {
  const code = new URLSearchParams(location.search).get('code') || '';

  const loading = document.getElementById('loading');
  const error = document.getElementById('error');
  const content = document.getElementById('content');
  const grid = document.getElementById('profileGrid');

  const COLORS = {
    navy: '#07172e',
    teal: '#14869a',
    slate: '#526174',
    border: '#d7e2ea',
    paleBlue: '#f4fafc',
    soft: '#f8fafc',
    white: '#ffffff',
    red: '#c9182b',
    darkRed: '#a70f21',
    paleRed: '#fff4f5',
    redBorder: '#f0a5ae',
    green: '#15803d',
    paleGreen: '#f0fdf4',
    amber: '#d97706',
    paleAmber: '#fffaf0'
  };

  function hasValue(value) {
    return (
      value !== null &&
      value !== undefined &&
      String(value).trim() !== ''
    );
  }

  function hasItems(value) {
    return (
      value &&
      Array.isArray(value.items) &&
      value.items.length > 0
    );
  }

  function normalizeDisplayValue(value) {
    if (!hasValue(value)) return '';

    const normalized = String(value)
      .trim()
      .replace(/_/g, ' ')
      .replace(/\s+/g, ' ');

    if (normalized.toLowerCase() === 'life threatening') {
      return 'Life-threatening';
    }

    return normalized
      .split(' ')
      .map(word =>
        word.length
          ? word.charAt(0).toUpperCase() + word.slice(1)
          : word
      )
      .join(' ');
  }

  function isHighRiskAllergy(item) {
    const severity = String(item?.severity || '')
      .toLowerCase()
      .replace(/[_-]/g, ' ');

    const reaction = String(item?.reaction || '')
      .toLowerCase()
      .replace(/[_-]/g, ' ');

    return (
      severity.includes('life threatening') ||
      severity.includes('severe') ||
      severity.includes('critical') ||
      severity.includes('anaphyl') ||
      reaction.includes('anaphyl')
    );
  }

  function makeGrid(minWidth = 230) {
    const sectionGrid = document.createElement('div');

    sectionGrid.style.display = 'grid';
    sectionGrid.style.gridTemplateColumns =
      `repeat(auto-fit, minmax(${minWidth}px, 1fr))`;
    sectionGrid.style.gap = '12px';

    return sectionGrid;
  }

  function makeSectionShell(
    eyebrowText,
    titleText,
    introText = '',
    options = {}
  ) {
    const wrapper = document.createElement('section');

    wrapper.style.gridColumn = '1 / -1';
    wrapper.style.margin = '24px 0 4px';
    wrapper.style.padding = '20px';
    wrapper.style.border =
      options.border || `1px solid ${COLORS.border}`;
    wrapper.style.borderRadius = '20px';
    wrapper.style.background =
      options.background || COLORS.soft;

    if (options.boxShadow) {
      wrapper.style.boxShadow = options.boxShadow;
    }

    const headingRow = document.createElement('div');

    headingRow.style.display = 'flex';
    headingRow.style.alignItems = 'center';
    headingRow.style.gap = '10px';
    headingRow.style.marginBottom = '6px';

    if (options.icon) {
      const icon = document.createElement('div');

      icon.textContent = options.icon;
      icon.setAttribute('aria-hidden', 'true');

      icon.style.display = 'inline-flex';
      icon.style.alignItems = 'center';
      icon.style.justifyContent = 'center';
      icon.style.flex = '0 0 auto';
      icon.style.width = options.iconSize || '34px';
      icon.style.height = options.iconSize || '34px';
      icon.style.borderRadius = '50%';
      icon.style.background =
        options.iconBackground || '#eaf6f8';
      icon.style.color =
        options.iconColor || COLORS.teal;
      icon.style.fontWeight = '900';
      icon.style.fontSize = '1rem';

      headingRow.appendChild(icon);
    }

    const eyebrow = document.createElement('div');

    eyebrow.textContent = eyebrowText;
    eyebrow.style.color =
      options.eyebrowColor || COLORS.teal;
    eyebrow.style.fontSize = '.75rem';
    eyebrow.style.fontWeight = '900';
    eyebrow.style.letterSpacing = '.11em';

    headingRow.appendChild(eyebrow);

    const title = document.createElement('h2');

    title.textContent = titleText;
    title.style.margin =
      introText ? '0 0 8px' : '0 0 16px';
    title.style.color =
      options.titleColor || COLORS.navy;
    title.style.fontSize = '1.3rem';
    title.style.lineHeight = '1.2';

    wrapper.append(headingRow, title);

    if (introText) {
      const intro = document.createElement('p');

      intro.textContent = introText;
      intro.style.margin = '0 0 18px';
      intro.style.color = COLORS.slate;
      intro.style.lineHeight = '1.5';

      wrapper.appendChild(intro);
    }

    return wrapper;
  }

  function makeCard(label, value, options = {}) {
    if (!hasValue(value)) return null;

    const card = document.createElement('div');

    card.className = 'em-card';

    if (options.fullWidth) {
      card.style.gridColumn = '1 / -1';
    }

    if (options.urgent) {
      card.style.border = `2px solid ${COLORS.amber}`;
      card.style.background = COLORS.paleAmber;
    }

    const heading = document.createElement('span');
    heading.textContent = label;

    const strong = document.createElement('strong');
    strong.textContent = value;

    card.append(heading, strong);

    return card;
  }

  function makePrimaryPhotoSection(photo) {
    if (!photo || !hasValue(photo.url)) return null;

    const wrapper = makeSectionShell(
      'IDENTIFICATION',
      'Participant identification photo',
      'Use this caregiver-approved photo to help confirm the participant’s identity.',
      {
        background: COLORS.paleBlue,
        border: '1px solid #cfe3ea'
      }
    );

    const photoWrap = document.createElement('div');

    photoWrap.style.display = 'flex';
    photoWrap.style.flexDirection = 'column';
    photoWrap.style.alignItems = 'center';
    photoWrap.style.gap = '10px';

    const image = document.createElement('img');

    image.src = photo.url;
    image.alt = 'Participant identification photo';
    image.loading = 'eager';

    image.style.width = '100%';
    image.style.maxWidth = '420px';
    image.style.maxHeight = '480px';
    image.style.objectFit = 'cover';
    image.style.borderRadius = '20px';
    image.style.border = '1px solid #d6e4ea';
    image.style.background = COLORS.white;

    photoWrap.appendChild(image);

    if (hasValue(photo.caption)) {
      const caption = document.createElement('p');

      caption.textContent = photo.caption;
      caption.style.margin = '0';
      caption.style.color = COLORS.slate;
      caption.style.fontSize = '.9rem';
      caption.style.textAlign = 'center';

      photoWrap.appendChild(caption);
    }

    wrapper.appendChild(photoWrap);

    return wrapper;
  }

  function makeAdditionalPhotosSection(photos) {
    if (!Array.isArray(photos) || !photos.length) {
      return null;
    }

    const wrapper = makeSectionShell(
      'ADDITIONAL IDENTIFICATION',
      'Additional identifying photos',
      'These optional caregiver-approved photos may help responders recognize the participant from different views.'
    );

    const photoGrid = makeGrid(180);

    photos.forEach(photo => {
      if (!photo || !hasValue(photo.url)) return;

      const item = document.createElement('div');

      item.style.border = '1px solid #dbe5ec';
      item.style.borderRadius = '16px';
      item.style.padding = '10px';
      item.style.background = COLORS.white;

      const image = document.createElement('img');

      image.src = photo.url;
      image.alt =
        'Additional participant identification photo';
      image.loading = 'lazy';

      image.style.display = 'block';
      image.style.width = '100%';
      image.style.aspectRatio = '4 / 3';
      image.style.objectFit = 'cover';
      image.style.borderRadius = '12px';

      item.appendChild(image);

      if (hasValue(photo.caption)) {
        const caption = document.createElement('p');

        caption.textContent = photo.caption;
        caption.style.margin = '8px 2px 2px';
        caption.style.color = COLORS.slate;
        caption.style.fontSize = '.85rem';
        caption.style.lineHeight = '1.4';

        item.appendChild(caption);
      }

      photoGrid.appendChild(item);
    });

    if (!photoGrid.children.length) return null;

    wrapper.appendChild(photoGrid);

    return wrapper;
  }

  function heightText(inches) {
    const total = Number(inches);

    if (!Number.isFinite(total) || total <= 0) {
      return '';
    }

    const feet = Math.floor(total / 12);
    const remaining = total % 12;

    return `${feet} ft ${remaining} in`;
  }

  function makePhysicalDescriptionSection(data) {
    if (!data) return null;

    const values = [
      ['Height', heightText(data.height_inches)],
      [
        'Approx. weight',
        data.approximate_weight_lbs
          ? `${data.approximate_weight_lbs} lb`
          : ''
      ],
      ['Build', data.build_description],
      ['Complexion', data.complexion],
      ['Hair color', data.hair_color],
      ['Hair style', data.hair_style],
      ['Eye color', data.eye_color],
      ['Glasses', data.wears_glasses ? 'Yes' : ''],
      ['Mobility / assistive aids', data.mobility_aids],
      ['Identifying features', data.identifying_features],
      ['Additional description', data.description_notes]
    ].filter(([, value]) => hasValue(value));

    if (!values.length) return null;

    const wrapper = makeSectionShell(
      'IDENTIFYING DESCRIPTION',
      'Physical description',
      'Caregiver-approved identifying details that may help confirm identity or locate the participant.'
    );

    const sectionGrid = makeGrid();

    values.forEach(([label, value]) => {
      const card = makeCard(label, value);

      if (card) {
        card.style.margin = '0';
        sectionGrid.appendChild(card);
      }
    });

    wrapper.appendChild(sectionGrid);

    return wrapper;
  }

  function makeListItemCard(title, lines = []) {
    const card = document.createElement('div');

    card.className = 'em-card';
    card.style.margin = '0';
    card.style.padding = '18px 20px';
    card.style.borderRadius = '16px';
    card.style.background = COLORS.white;

    const heading = document.createElement('strong');

    heading.textContent = title;
    heading.style.display = 'block';
    heading.style.color = COLORS.navy;
    heading.style.fontSize = '1.08rem';
    heading.style.lineHeight = '1.3';
    heading.style.marginBottom = '8px';

    card.appendChild(heading);

    lines
      .filter(line => hasValue(line))
      .forEach(line => {
        const paragraph = document.createElement('p');

        paragraph.textContent = line;
        paragraph.style.margin = '4px 0';
        paragraph.style.color = COLORS.slate;
        paragraph.style.lineHeight = '1.45';

        card.appendChild(paragraph);
      });

    return card;
  }

  function makeDiagnosesSection(data) {
    if (!data || (!data.none_known && !hasItems(data))) {
      return null;
    }

    const wrapper = makeSectionShell(
      'MEDICAL INFORMATION',
      'Diagnoses & conditions',
      'Only diagnoses and conditions the caregiver chose to share appear here.',
      {
        icon: '✚',
        background: '#f7fbfc',
        border: '1px solid #cfe3ea'
      }
    );

    if (data.none_known) {
      const noneCard = makeCard(
        'Diagnoses',
        'No known diagnoses reported'
      );

      if (noneCard) {
        noneCard.style.margin = '0';
        wrapper.appendChild(noneCard);
      }

      return wrapper;
    }

    const sectionGrid = makeGrid();

    data.items.forEach(item => {
      if (!hasValue(item.diagnosis_name)) return;

      const card = makeListItemCard(
        item.diagnosis_name,
        [item.diagnosis_notes]
      );

      card.style.border = '1px solid #d5e5eb';

      sectionGrid.appendChild(card);
    });

    if (!sectionGrid.children.length) return null;

    wrapper.appendChild(sectionGrid);

    return wrapper;
  }

  function makeMedicationsSection(data) {
    if (!data || (!data.none_current && !hasItems(data))) {
      return null;
    }

    const wrapper = makeSectionShell(
      'MEDICAL INFORMATION',
      'Current medications',
      'Only medication information the caregiver chose to share appears here.',
      {
        icon: '+',
        background: '#f7fbfc',
        border: '1px solid #cfe3ea'
      }
    );

    if (data.none_current) {
      const noneCard = makeCard(
        'Medications',
        'No current medications reported'
      );

      if (noneCard) {
        noneCard.style.margin = '0';
        wrapper.appendChild(noneCard);
      }

      return wrapper;
    }

    const sectionGrid = makeGrid();

    data.items.forEach(item => {
      if (!hasValue(item.medication_name)) return;

      const details = [];

      if (hasValue(item.dose)) {
        details.push(`Dose: ${item.dose}`);
      }

      if (hasValue(item.route)) {
        details.push(
          `Route: ${normalizeDisplayValue(item.route)}`
        );
      }

      if (hasValue(item.frequency)) {
        details.push(`Frequency: ${item.frequency}`);
      }

      if (hasValue(item.purpose)) {
        details.push(`Purpose: ${item.purpose}`);
      }

      if (hasValue(item.medication_notes)) {
        details.push(`Notes: ${item.medication_notes}`);
      }

      const card = makeListItemCard(
        item.medication_name,
        details
      );

      card.style.border = '1px solid #d5e5eb';

      sectionGrid.appendChild(card);
    });

    if (!sectionGrid.children.length) return null;

    wrapper.appendChild(sectionGrid);

    return wrapper;
  }

  function makeAllergyDetail(label, value, urgent = false) {
    if (!hasValue(value)) return null;

    const row = document.createElement('div');

    row.style.display = 'grid';
    row.style.gridTemplateColumns = '90px 1fr';
    row.style.gap = '8px';
    row.style.alignItems = 'baseline';
    row.style.margin = '8px 0';

    const labelEl = document.createElement('span');

    labelEl.textContent = `${label}:`;
    labelEl.style.color = COLORS.slate;
    labelEl.style.fontSize = '.95rem';

    const valueEl = document.createElement('strong');

    valueEl.textContent = normalizeDisplayValue(value);
    valueEl.style.color =
      urgent ? COLORS.red : COLORS.navy;
    valueEl.style.fontSize = urgent ? '1.05rem' : '1rem';
    valueEl.style.lineHeight = '1.35';

    row.append(labelEl, valueEl);

    return row;
  }

  function makeAllergyCard(item) {
    const highRisk = isHighRiskAllergy(item);

    const card = document.createElement('div');

    card.style.position = 'relative';
    card.style.margin = '0';
    card.style.padding = '20px';
    card.style.borderRadius = '18px';
    card.style.background = COLORS.white;
    card.style.border = highRisk
      ? `2px solid ${COLORS.red}`
      : `1.5px solid ${COLORS.redBorder}`;

    const topRow = document.createElement('div');

    topRow.style.display = 'flex';
    topRow.style.alignItems = 'center';
    topRow.style.gap = '12px';
    topRow.style.marginBottom = '12px';

    const alertIcon = document.createElement('div');

    alertIcon.textContent = '!';
    alertIcon.setAttribute('aria-hidden', 'true');

    alertIcon.style.display = 'inline-flex';
    alertIcon.style.alignItems = 'center';
    alertIcon.style.justifyContent = 'center';
    alertIcon.style.flex = '0 0 auto';
    alertIcon.style.width = '42px';
    alertIcon.style.height = '42px';
    alertIcon.style.borderRadius = '50%';
    alertIcon.style.background =
      highRisk ? COLORS.red : '#ffe8eb';
    alertIcon.style.color =
      highRisk ? COLORS.white : COLORS.red;
    alertIcon.style.fontSize = '1.25rem';
    alertIcon.style.fontWeight = '900';

    const allergen = document.createElement('strong');

    allergen.textContent = item.allergen;
    allergen.style.display = 'block';
    allergen.style.color = COLORS.red;
    allergen.style.fontSize = '1.25rem';
    allergen.style.lineHeight = '1.2';

    topRow.append(alertIcon, allergen);
    card.appendChild(topRow);

    const typeRow = makeAllergyDetail(
      'Type',
      item.allergy_type
    );

    const reactionRow = makeAllergyDetail(
      'Reaction',
      item.reaction,
      highRisk
    );

    const severityRow = makeAllergyDetail(
      'Severity',
      item.severity,
      highRisk
    );

    [typeRow, reactionRow, severityRow]
      .filter(Boolean)
      .forEach(row => card.appendChild(row));

    if (hasValue(item.allergy_notes)) {
      const notes = document.createElement('div');

      notes.style.marginTop = '12px';
      notes.style.paddingTop = '12px';
      notes.style.borderTop = '1px solid #f0c6cc';

      const noteLabel = document.createElement('span');

      noteLabel.textContent = 'Notes';
      noteLabel.style.display = 'block';
      noteLabel.style.marginBottom = '4px';
      noteLabel.style.color = COLORS.slate;
      noteLabel.style.fontSize = '.78rem';
      noteLabel.style.fontWeight = '800';
      noteLabel.style.textTransform = 'uppercase';
      noteLabel.style.letterSpacing = '.06em';

      const noteValue = document.createElement('strong');

      noteValue.textContent = item.allergy_notes;
      noteValue.style.display = 'block';
      noteValue.style.color = COLORS.navy;
      noteValue.style.lineHeight = '1.45';

      notes.append(noteLabel, noteValue);
      card.appendChild(notes);
    }

    if (highRisk) {
      const warning = document.createElement('div');

      warning.textContent =
        'HIGH-RISK ALLERGY — USE IMMEDIATE CAUTION';

      warning.style.marginTop = '16px';
      warning.style.padding = '10px 12px';
      warning.style.borderRadius = '10px';
      warning.style.background = '#ffe1e5';
      warning.style.color = COLORS.darkRed;
      warning.style.fontSize = '.78rem';
      warning.style.fontWeight = '900';
      warning.style.letterSpacing = '.05em';
      warning.style.textAlign = 'center';

      card.appendChild(warning);
    }

    return card;
  }

  function makeAllergiesSection(data) {
    if (!data || (!data.none_known && !hasItems(data))) {
      return null;
    }

    if (data.none_known) {
      const wrapper = makeSectionShell(
        'MEDICAL INFORMATION',
        'Allergies',
        'Only allergy information the caregiver chose to share appears here.',
        {
          icon: '✓',
          iconBackground: '#dcfce7',
          iconColor: COLORS.green,
          background: '#f7fcf8',
          border: '1px solid #bbdfc5'
        }
      );

      const noneCard = makeCard(
        'Allergies',
        'No known allergies reported'
      );

      if (noneCard) {
        noneCard.style.margin = '0';
        wrapper.appendChild(noneCard);
      }

      return wrapper;
    }

    const hasHighRisk =
      data.items.some(item => isHighRiskAllergy(item));

    const wrapper = makeSectionShell(
      hasHighRisk
        ? 'MEDICAL ALERT'
        : 'MEDICAL INFORMATION',
      'Allergies',
      hasHighRisk
        ? 'Important allergy information. Review before providing food, medication, treatment, or emergency care.'
        : 'Only allergy information the caregiver chose to share appears here.',
      {
        icon: '✚',
        iconBackground: COLORS.red,
        iconColor: COLORS.white,
        background: COLORS.paleRed,
        border: hasHighRisk
          ? `2px solid ${COLORS.redBorder}`
          : `1.5px solid ${COLORS.redBorder}`,
        eyebrowColor: COLORS.red,
        titleColor: COLORS.navy,
        boxShadow: hasHighRisk
          ? '0 8px 24px rgba(201, 24, 43, 0.08)'
          : ''
      }
    );

    const sectionGrid = makeGrid();

    data.items.forEach(item => {
      if (!hasValue(item.allergen)) return;

      sectionGrid.appendChild(
        makeAllergyCard(item)
      );
    });

    if (!sectionGrid.children.length) return null;

    wrapper.appendChild(sectionGrid);

    return wrapper;
  }

  function cleanPhone(phone) {
    return String(phone || '').replace(/[^\d+]/g, '');
  }

  function formatPhone(phone) {
    const digits = String(phone || '')
      .replace(/\D/g, '');

    if (digits.length === 10) {
      return `(${digits.slice(0, 3)}) ${digits.slice(
        3,
        6
      )}-${digits.slice(6)}`;
    }

    if (
      digits.length === 11 &&
      digits.startsWith('1')
    ) {
      return `(${digits.slice(1, 4)}) ${digits.slice(
        4,
        7
      )}-${digits.slice(7)}`;
    }

    return String(phone || '');
  }

  function makeQuickContactButton(name, phone) {
    if (!hasValue(phone)) return null;

    const wrapper = document.createElement('div');

    wrapper.style.gridColumn = '1 / -1';
    wrapper.style.margin = '4px 0 8px';

    const button = document.createElement('a');

    button.href = `tel:${cleanPhone(phone)}`;
    button.textContent = hasValue(name)
      ? `Contact caregiver · ${name}`
      : 'Contact caregiver';

    button.style.display = 'flex';
    button.style.alignItems = 'center';
    button.style.justifyContent = 'center';
    button.style.width = '100%';
    button.style.minHeight = '56px';
    button.style.padding = '14px 18px';
    button.style.background = COLORS.navy;
    button.style.color = COLORS.white;
    button.style.borderRadius = '999px';
    button.style.fontWeight = '800';
    button.style.fontSize = '1.05rem';
    button.style.textDecoration = 'none';
    button.style.textAlign = 'center';

    wrapper.appendChild(button);

    return wrapper;
  }

  function makeGlanceItem(label, value) {
    if (!hasValue(value)) return null;

    const item = document.createElement('div');

    item.style.padding = '14px 16px';
    item.style.border = '1px solid #d8e5ec';
    item.style.borderRadius = '14px';
    item.style.background = COLORS.white;

    const labelElement = document.createElement('span');

    labelElement.textContent = label;
    labelElement.style.display = 'block';
    labelElement.style.marginBottom = '5px';
    labelElement.style.color = COLORS.teal;
    labelElement.style.fontSize = '.72rem';
    labelElement.style.fontWeight = '900';
    labelElement.style.letterSpacing = '.08em';
    labelElement.style.textTransform = 'uppercase';

    const valueElement = document.createElement('strong');

    valueElement.textContent = value;
    valueElement.style.display = 'block';
    valueElement.style.color = COLORS.navy;
    valueElement.style.fontSize = '1rem';
    valueElement.style.lineHeight = '1.4';

    item.append(labelElement, valueElement);

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
    ].filter(item => hasValue(item.value));

    if (!items.length) return null;

    const wrapper = makeSectionShell(
      'AT A GLANCE',
      'How to interact safely',
      '',
      {
        background: COLORS.paleBlue,
        border: '1px solid #cfe3ea'
      }
    );

    wrapper.style.margin = '12px 0 4px';

    const itemGrid = makeGrid(210);

    items.forEach(item => {
      const glanceItem = makeGlanceItem(
        item.label,
        item.value
      );

      if (glanceItem) {
        itemGrid.appendChild(glanceItem);
      }
    });

    wrapper.appendChild(itemGrid);

    return wrapper;
  }

  function makeRiskCard(value) {
    if (!hasValue(value)) return null;

    const riskCard = document.createElement('div');

    riskCard.className = 'em-card';
    riskCard.style.margin = '0';

    const heading = document.createElement('span');

    heading.textContent =
      'Wandering / elopement risk';

    const riskBadge = document.createElement('strong');

    const riskValue = String(value).trim();
    const normalizedRisk = riskValue.toLowerCase();

    if (
      normalizedRisk.includes('unknown') ||
      normalizedRisk.includes('assessing') ||
      normalizedRisk.includes('not assessed')
    ) {
      riskBadge.textContent =
        'Risk level not specified';
    } else {
      riskBadge.textContent = riskValue;
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

    if (normalizedRisk.includes('high')) {
      riskCard.style.border =
        `2px solid ${COLORS.red}`;
      riskCard.style.background =
        COLORS.paleRed;
      riskBadge.style.background =
        COLORS.red;
      riskBadge.style.color =
        COLORS.white;
    } else if (
      normalizedRisk.includes('moderate') ||
      normalizedRisk.includes('medium')
    ) {
      riskCard.style.border =
        `2px solid ${COLORS.amber}`;
      riskCard.style.background =
        COLORS.paleAmber;
      riskBadge.style.background =
        '#f59e0b';
      riskBadge.style.color =
        COLORS.navy;
    } else if (normalizedRisk.includes('low')) {
      riskCard.style.border =
        `2px solid ${COLORS.green}`;
      riskCard.style.background =
        COLORS.paleGreen;
      riskBadge.style.background =
        COLORS.green;
      riskBadge.style.color =
        COLORS.white;
    } else {
      riskCard.style.border =
        '1px solid #cbd5e1';
      riskCard.style.background =
        COLORS.soft;
      riskBadge.style.background =
        '#e2e8f0';
      riskBadge.style.color =
        '#334155';
    }

    riskCard.append(heading, riskBadge);

    return riskCard;
  }

  function makeSafetySection(profile) {
    const hasSafetyInfo =
      hasValue(profile.safety_risk_level) ||
      hasValue(profile.known_destinations);

    if (!hasSafetyInfo) return null;

    const wrapper = makeSectionShell(
      'SAFETY INFORMATION',
      'Safety & wandering information',
      'Use this information to help reduce distress, support safe redirection, and assist with reunification.'
    );

    const sectionGrid = makeGrid(250);

    const riskCard = makeRiskCard(
      profile.safety_risk_level
    );

    if (riskCard) {
      riskCard.style.gridColumn = '1 / -1';
      sectionGrid.appendChild(riskCard);
    }

    const destinations = makeCard(
      'Places I may try to go',
      profile.known_destinations
    );

    if (destinations) {
      destinations.style.margin = '0';
      sectionGrid.appendChild(destinations);
    }

    wrapper.appendChild(sectionGrid);

    return wrapper;
  }

  function makeSupportSection(profile) {
    const hasSupportInfo =
      hasValue(profile.communication_notes) ||
      hasValue(profile.calming_supports);

    if (!hasSupportInfo) return null;

    const wrapper = makeSectionShell(
      'SUPPORT INFORMATION',
      'Communication & support',
      'These caregiver-provided details may help support communication, reduce distress, and create a calmer interaction.',
      {
        background: COLORS.paleBlue,
        border: '1px solid #cfe3ea'
      }
    );

    const sectionGrid = makeGrid(250);

    const communicationInstructions = makeCard(
      'Communication instructions',
      profile.communication_notes
    );

    if (communicationInstructions) {
      communicationInstructions.style.margin = '0';

      sectionGrid.appendChild(
        communicationInstructions
      );
    }

    const calmingSupports = makeCard(
      'What helps me feel safe / calm',
      profile.calming_supports
    );

    if (calmingSupports) {
      calmingSupports.style.margin = '0';

      sectionGrid.appendChild(calmingSupports);
    }

    wrapper.appendChild(sectionGrid);

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
      const rel = document.createElement('p');

      rel.textContent = relationship;
      rel.style.margin = '4px 0 14px';
      rel.style.color = COLORS.slate;

      card.appendChild(rel);
    }

    if (hasValue(phone)) {
      const callButton =
        document.createElement('a');

      callButton.href =
        `tel:${cleanPhone(phone)}`;

      callButton.textContent = hasValue(name)
        ? `Call ${name} · ${formatPhone(phone)}`
        : `Call ${formatPhone(phone)}`;

      callButton.style.display = 'flex';
      callButton.style.alignItems = 'center';
      callButton.style.justifyContent = 'center';
      callButton.style.width = '100%';
      callButton.style.minHeight = '54px';
      callButton.style.marginTop = '10px';
      callButton.style.padding = '12px 18px';
      callButton.style.background = COLORS.navy;
      callButton.style.color = COLORS.white;
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
    if (!hasValue(phone)) return null;

    const button = document.createElement('a');

    button.href = `tel:${cleanPhone(phone)}`;
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
      button.style.background = COLORS.red;
      button.style.color = COLORS.white;
      button.style.border =
        `2px solid ${COLORS.red}`;
    } else if (options.secondary) {
      button.style.background = COLORS.white;
      button.style.color = COLORS.navy;
      button.style.border =
        `2px solid ${COLORS.navy}`;
    } else {
      button.style.background = COLORS.navy;
      button.style.color = COLORS.white;
      button.style.border =
        `2px solid ${COLORS.navy}`;
    }

    return button;
  }

  function makeResponderActions(profile) {
    const wrapper = makeSectionShell(
      'RESPONDER ACTIONS',
      'Help support safe reunification',
      'If it is safe to do so, remain nearby while attempting to contact the caregiver. Use emergency services for immediate danger or a medical emergency.',
      {
        background: '#f8fbfd',
        border: '1px solid #cfe3ea'
      }
    );

    const actions = makeGrid(210);

    const caregiverButton = makeActionButton(
      hasValue(profile.emergency_contact_name)
        ? `Call caregiver · ${profile.emergency_contact_name}`
        : 'Call caregiver',
      profile.emergency_contact_phone
    );

    if (caregiverButton) {
      actions.appendChild(caregiverButton);
    }

    const alternateButton = makeActionButton(
      hasValue(profile.alternate_contact_name)
        ? `Call alternate · ${profile.alternate_contact_name}`
        : 'Call alternate contact',
      profile.alternate_contact_phone,
      { secondary: true }
    );

    if (alternateButton) {
      actions.appendChild(alternateButton);
    }

    const emergencyButton = makeActionButton(
      'Call 911 · Immediate emergency',
      '911',
      { emergency: true }
    );

    actions.appendChild(emergencyButton);

    wrapper.appendChild(actions);

    return wrapper;
  }

  try {
    const response = await fetch(
      `/api/identifier-profile?code=${encodeURIComponent(
        code
      )}`,
      {
        cache: 'no-store'
      }
    );

    const data = await response.json();

    loading.hidden = true;

    if (!response.ok || !data.profile) {
      error.hidden = false;
      return;
    }

    const p = data.profile;

    document
      .getElementById('displayName')
      .textContent =
        p.preferred_name || 'OneProfile™';

    grid.innerHTML = '';

    /* PARTICIPANT IDENTIFICATION */

    const primaryPhoto =
      makePrimaryPhotoSection(
        p.participant_photo
      );

    if (primaryPhoto) {
      grid.appendChild(primaryPhoto);
    }

    const additionalPhotos =
      makeAdditionalPhotosSection(
        p.additional_photos
      );

    if (additionalPhotos) {
      grid.appendChild(additionalPhotos);
    }

    const physicalDescription =
      makePhysicalDescriptionSection(
        p.physical_description
      );

    if (physicalDescription) {
      grid.appendChild(physicalDescription);
    }

    /* RESPONDER PRIORITY */

    if (hasValue(p.responder_notes)) {
      const card = makeCard(
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

    /* AT A GLANCE */

    const atAGlance = makeAtAGlance(p);

    if (atAGlance) {
      grid.appendChild(atAGlance);
    }

    /* SAFETY */

    const safetySection =
      makeSafetySection(p);

    if (safetySection) {
      grid.appendChild(safetySection);
    }

    /* COMMUNICATION + SUPPORT */

    const supportSection =
      makeSupportSection(p);

    if (supportSection) {
      grid.appendChild(supportSection);
    }

    /* MEDICAL INFORMATION */

    const diagnosesSection =
      makeDiagnosesSection(p.diagnoses);

    if (diagnosesSection) {
      grid.appendChild(diagnosesSection);
    }

    const medicationsSection =
      makeMedicationsSection(p.medications);

    if (medicationsSection) {
      grid.appendChild(medicationsSection);
    }

    const allergiesSection =
      makeAllergiesSection(p.allergies);

    if (allergiesSection) {
      grid.appendChild(allergiesSection);
    }

    /* RESPONDER ACTIONS */

    const responderActions =
      makeResponderActions(p);

    grid.appendChild(responderActions);

    /* EMERGENCY CONTACTS */

    const hasPrimary =
      hasValue(p.emergency_contact_name) ||
      hasValue(
        p.emergency_contact_relationship
      ) ||
      hasValue(p.emergency_contact_phone);

    const hasAlternate =
      hasValue(p.alternate_contact_name) ||
      hasValue(p.alternate_contact_phone);

    if (hasPrimary || hasAlternate) {
      const contactHeading =
        document.createElement('h2');

      contactHeading.textContent =
        'Emergency contacts';

      contactHeading.style.gridColumn =
        '1 / -1';
      contactHeading.style.margin =
        '24px 0 4px';
      contactHeading.style.color =
        COLORS.navy;
      contactHeading.style.fontSize =
        '1.25rem';

      grid.appendChild(contactHeading);
    }

    if (hasPrimary) {
      const primaryCard = makePhoneCard(
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
      const alternateCard = makePhoneCard(
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