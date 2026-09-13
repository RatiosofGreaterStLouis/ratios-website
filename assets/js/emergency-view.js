(async () => {
  const id =
    new URLSearchParams(location.search).get('id') || '';

  const loading =
    document.getElementById('loading');

  const unavailable =
    document.getElementById('unavailable');

  const profile =
    document.getElementById('profile');

  const cards =
    document.getElementById('cards');

  const COLORS = {
    navy: '#07172e',
    text: '#29405a',
    muted: '#617388',
    teal: '#14869a',
    tealSoft: '#eef9fb',
    tealBorder: '#cfe7ec',
    blueSoft: '#f4f8fc',
    blueBorder: '#d7e4ee',
    white: '#ffffff',
    red: '#b42318',
    redDark: '#8f1710',
    redSoft: '#fff1f0',
    redSofter: '#fff7f6',
    redBorder: '#efb5b0',
    redStrongBorder: '#dc6b63',
    green: '#247a4b',
    greenSoft: '#f1faf5',
    greenBorder: '#bfe2cc'
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


  function cleanPhone(phone) {
    return String(phone || '')
      .replace(/[^\d+]/g, '');
  }


  function formatPhone(phone) {
    const digits =
      String(phone || '')
        .replace(/\D/g, '');

    if (digits.length === 10) {
      return (
        `(${digits.slice(0, 3)}) ` +
        `${digits.slice(3, 6)}-` +
        `${digits.slice(6)}`
      );
    }

    if (
      digits.length === 11 &&
      digits.startsWith('1')
    ) {
      return (
        `(${digits.slice(1, 4)}) ` +
        `${digits.slice(4, 7)}-` +
        `${digits.slice(7)}`
      );
    }

    return String(phone || '');
  }


  function normalizeDisplayValue(value) {
    if (!hasValue(value)) {
      return '';
    }

    const normalized =
      String(value)
        .trim()
        .replace(/_/g, ' ')
        .replace(/\s+/g, ' ');

    if (
      normalized.toLowerCase() ===
      'life threatening'
    ) {
      return 'Life-threatening';
    }

    return normalized
      .split(' ')
      .map(word => {
        if (!word) {
          return '';
        }

        return (
          word.charAt(0).toUpperCase() +
          word.slice(1)
        );
      })
      .join(' ');
  }


  function isHighRiskAllergy(item) {
    const severity =
      String(item?.severity || '')
        .replace(/_/g, ' ')
        .toLowerCase();

    const reaction =
      String(item?.reaction || '')
        .replace(/_/g, ' ')
        .toLowerCase();

    return (
      severity.includes('life threatening') ||
      severity.includes('severe') ||
      severity.includes('critical') ||
      severity.includes('anaphyl') ||
      reaction.includes('anaphyl')
    );
  }


  function makeSectionShell(
    eyebrowText,
    titleText,
    introText = '',
    options = {}
  ) {
    const wrapper =
      document.createElement('section');

    wrapper.style.gridColumn =
      '1 / -1';

    wrapper.style.margin =
      '24px 0 4px';

    wrapper.style.padding =
      options.padding || '20px';

    wrapper.style.border =
      options.border ||
      `1px solid ${COLORS.blueBorder}`;

    wrapper.style.borderRadius =
      '20px';

    wrapper.style.background =
      options.background ||
      COLORS.blueSoft;

    if (options.shadow) {
      wrapper.style.boxShadow =
        options.shadow;
    }

    const header =
      document.createElement('div');

    header.style.display =
      'flex';

    header.style.alignItems =
      'flex-start';

    header.style.gap =
      '13px';

    const icon =
      document.createElement('div');

    icon.textContent =
      options.icon || '✚';

    icon.style.flex =
      '0 0 auto';

    icon.style.display =
      'flex';

    icon.style.alignItems =
      'center';

    icon.style.justifyContent =
      'center';

    icon.style.width =
      options.iconSize || '38px';

    icon.style.height =
      options.iconSize || '38px';

    icon.style.borderRadius =
      '50%';

    icon.style.background =
      options.iconBackground ||
      COLORS.tealSoft;

    icon.style.color =
      options.iconColor ||
      COLORS.teal;

    icon.style.fontSize =
      options.iconFontSize ||
      '1.1rem';

    icon.style.fontWeight =
      '900';

    icon.style.lineHeight =
      '1';

    const headingWrap =
      document.createElement('div');

    headingWrap.style.minWidth =
      '0';

    headingWrap.style.flex =
      '1';

    const eyebrow =
      document.createElement('div');

    eyebrow.textContent =
      eyebrowText;

    eyebrow.style.marginBottom =
      '5px';

    eyebrow.style.color =
      options.eyebrowColor ||
      COLORS.teal;

    eyebrow.style.fontSize =
      '.74rem';

    eyebrow.style.fontWeight =
      '900';

    eyebrow.style.letterSpacing =
      '.1em';

    const title =
      document.createElement('h2');

    title.textContent =
      titleText;

    title.style.margin =
      introText
        ? '0 0 7px'
        : '0';

    title.style.color =
      options.titleColor ||
      COLORS.navy;

    title.style.fontSize =
      '1.2rem';

    title.style.lineHeight =
      '1.25';

    headingWrap.append(
      eyebrow,
      title
    );

    if (introText) {
      const intro =
        document.createElement('p');

      intro.textContent =
        introText;

      intro.style.margin =
        '0';

      intro.style.color =
        options.introColor ||
        '#526174';

      intro.style.lineHeight =
        '1.5';

      intro.style.fontSize =
        '.95rem';

      headingWrap.appendChild(
        intro
      );
    }

    header.append(
      icon,
      headingWrap
    );

    wrapper.appendChild(
      header
    );

    return wrapper;
  }


  function makeGrid() {
    const sectionGrid =
      document.createElement('div');

    sectionGrid.style.display =
      'grid';

    sectionGrid.style.gridTemplateColumns =
      'repeat(auto-fit, minmax(230px, 1fr))';

    sectionGrid.style.gap =
      '12px';

    return sectionGrid;
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

    card.className =
      'em-card';

    if (options.fullWidth) {
      card.style.gridColumn =
        '1 / -1';
    }

    if (options.urgent) {
      card.style.border =
        '2px solid #d97706';

      card.style.background =
        '#fffaf0';
    }

    const heading =
      document.createElement('span');

    heading.textContent =
      label;

    const strong =
      document.createElement('strong');

    strong.textContent =
      value;

    card.append(
      heading,
      strong
    );

    return card;
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

    wrapper.style.gridColumn =
      '1 / -1';

    wrapper.style.margin =
      '4px 0 8px';

    const button =
      document.createElement('a');

    button.href =
      `tel:${cleanPhone(phone)}`;

    button.textContent =
      hasValue(name)
        ? `Contact caregiver · ${name}`
        : 'Contact caregiver';

    button.style.display =
      'flex';

    button.style.alignItems =
      'center';

    button.style.justifyContent =
      'center';

    button.style.width =
      '100%';

    button.style.minHeight =
      '56px';

    button.style.padding =
      '14px 18px';

    button.style.background =
      COLORS.navy;

    button.style.color =
      COLORS.white;

    button.style.borderRadius =
      '999px';

    button.style.fontWeight =
      '800';

    button.style.fontSize =
      '1.05rem';

    button.style.textDecoration =
      'none';

    button.style.textAlign =
      'center';

    wrapper.appendChild(
      button
    );

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

    item.style.padding =
      '14px 16px';

    item.style.border =
      '1px solid #d8e5ec';

    item.style.borderRadius =
      '14px';

    item.style.background =
      COLORS.white;

    const small =
      document.createElement('div');

    small.textContent =
      label;

    small.style.marginBottom =
      '5px';

    small.style.color =
      COLORS.muted;

    small.style.fontSize =
      '.76rem';

    small.style.fontWeight =
      '800';

    small.style.textTransform =
      'uppercase';

    small.style.letterSpacing =
      '.06em';

    const strong =
      document.createElement('div');

    strong.textContent =
      value;

    strong.style.color =
      COLORS.navy;

    strong.style.fontWeight =
      '800';

    strong.style.lineHeight =
      '1.4';

    item.append(
      small,
      strong
    );

    return item;
  }


  function makeAtAGlance(
    profileData
  ) {
    const values = [
      [
        'Communication',
        profileData.communication_method
      ],
      [
        'Safety risk',
        profileData.safety_risk_level
      ],
      [
        'Touch preference',
        profileData.touch_preference
      ]
    ];

    const valid =
      values.filter(
        ([, value]) =>
          hasValue(value)
      );

    if (!valid.length) {
      return null;
    }

    const wrapper =
      makeSectionShell(
        'QUICK INFORMATION',
        'At a glance',
        'Key information that may help with the first moments of contact.',
        {
          icon: 'i',
          iconBackground:
            COLORS.tealSoft,
          iconColor:
            COLORS.teal
        }
      );

    const sectionGrid =
      makeGrid();

    sectionGrid.style.marginTop =
      '16px';

    valid.forEach(
      ([label, value]) => {
        const item =
          makeGlanceItem(
            label,
            value
          );

        if (item) {
          sectionGrid.appendChild(
            item
          );
        }
      }
    );

    wrapper.appendChild(
      sectionGrid
    );

    return wrapper;
  }


  function makeSafetySection(
    profileData
  ) {
    const values = [
      [
        'Known destinations',
        profileData.known_destinations
      ],
      [
        'Safe approach',
        profileData.safe_approach
      ]
    ];

    const valid =
      values.filter(
        ([, value]) =>
          hasValue(value)
      );

    if (!valid.length) {
      return null;
    }

    const wrapper =
      makeSectionShell(
        'SAFETY & WANDERING',
        'Safety information',
        'Use these details to support a calm and safe approach.',
        {
          icon: '⌖',
          iconBackground:
            COLORS.tealSoft,
          iconColor:
            COLORS.teal
        }
      );

    const sectionGrid =
      makeGrid();

    sectionGrid.style.marginTop =
      '16px';

    valid.forEach(
      ([label, value]) => {
        const item =
          makeCard(
            label,
            value
          );

        if (item) {
          sectionGrid.appendChild(
            item
          );
        }
      }
    );

    wrapper.appendChild(
      sectionGrid
    );

    return wrapper;
  }


  function makeSupportSection(
    profileData
  ) {
    const values = [
      [
        'Communication notes',
        profileData.communication_notes
      ],
      [
        'Sensory triggers',
        profileData.sensory_triggers
      ],
      [
        'Calming supports',
        profileData.calming_supports
      ]
    ];

    const valid =
      values.filter(
        ([, value]) =>
          hasValue(value)
      );

    if (!valid.length) {
      return null;
    }

    const wrapper =
      makeSectionShell(
        'COMMUNICATION & SUPPORT',
        'How to help',
        'These caregiver-approved details may help make communication and interaction safer.',
        {
          icon: '♥',
          iconBackground:
            COLORS.tealSoft,
          iconColor:
            COLORS.teal
        }
      );

    const sectionGrid =
      makeGrid();

    sectionGrid.style.marginTop =
      '16px';

    valid.forEach(
      ([label, value]) => {
        const item =
          makeCard(
            label,
            value
          );

        if (item) {
          sectionGrid.appendChild(
            item
          );
        }
      }
    );

    wrapper.appendChild(
      sectionGrid
    );

    return wrapper;
  }


  function makePrimaryPhotoSection(
    photo
  ) {
    if (
      !photo ||
      !hasValue(photo.url)
    ) {
      return null;
    }

    const wrapper =
      makeSectionShell(
        'PARTICIPANT IDENTIFICATION',
        'Primary identification photo',
        'Use this caregiver-approved photo to help confirm identity.',
        {
          icon: '●',
          iconBackground:
            COLORS.tealSoft,
          iconColor:
            COLORS.teal
        }
      );

    const photoWrap =
      document.createElement('div');

    photoWrap.style.marginTop =
      '16px';

    photoWrap.style.display =
      'flex';

    photoWrap.style.flexDirection =
      'column';

    photoWrap.style.alignItems =
      'flex-start';

    photoWrap.style.gap =
      '10px';

    const image =
      document.createElement('img');

    image.src =
      photo.url;

    image.alt =
      hasValue(photo.caption)
        ? photo.caption
        : 'Participant identification photo';

    image.loading =
      'eager';

    image.style.display =
      'block';

    image.style.width =
      '100%';

    image.style.maxWidth =
      '360px';

    image.style.maxHeight =
      '420px';

    image.style.objectFit =
      'cover';

    image.style.borderRadius =
      '18px';

    image.style.border =
      '1px solid #d7e2ea';

    image.style.background =
      COLORS.white;

    if (hasValue(photo.caption)) {
      const caption =
        document.createElement('div');

      caption.textContent =
        photo.caption;

      caption.style.color =
        COLORS.muted;

      caption.style.fontSize =
        '.9rem';

      caption.style.fontWeight =
        '700';

      photoWrap.append(
        image,
        caption
      );
    } else {
      photoWrap.appendChild(
        image
      );
    }

    wrapper.appendChild(
      photoWrap
    );

    return wrapper;
  }


  function makeAdditionalPhotosSection(
    photos
  ) {
    if (
      !Array.isArray(photos) ||
      !photos.length
    ) {
      return null;
    }

    const valid =
      photos.filter(
        photo =>
          photo &&
          hasValue(photo.url)
      );

    if (!valid.length) {
      return null;
    }

    const wrapper =
      makeSectionShell(
        'ADDITIONAL IDENTIFICATION',
        'Additional identifying photos',
        'These caregiver-approved photos may help confirm identity from different views.',
        {
          icon: '●',
          iconBackground:
            COLORS.tealSoft,
          iconColor:
            COLORS.teal
        }
      );

    const photoGrid =
      document.createElement('div');

    photoGrid.style.display =
      'grid';

    photoGrid.style.gridTemplateColumns =
      'repeat(auto-fit, minmax(180px, 1fr))';

    photoGrid.style.gap =
      '12px';

    photoGrid.style.marginTop =
      '16px';

    valid.forEach(photo => {
      const card =
        document.createElement('div');

      card.style.padding =
        '10px';

      card.style.border =
        '1px solid #d7e2ea';

      card.style.borderRadius =
        '16px';

      card.style.background =
        COLORS.white;

      const image =
        document.createElement('img');

      image.src =
        photo.url;

      image.alt =
        hasValue(photo.caption)
          ? photo.caption
          : 'Additional participant identification photo';

      image.loading =
        'lazy';

      image.style.display =
        'block';

      image.style.width =
        '100%';

      image.style.aspectRatio =
        '4 / 3';

      image.style.objectFit =
        'cover';

      image.style.borderRadius =
        '12px';

      if (hasValue(photo.caption)) {
        const caption =
          document.createElement('div');

        caption.textContent =
          photo.caption;

        caption.style.marginTop =
          '8px';

        caption.style.color =
          COLORS.muted;

        caption.style.fontSize =
          '.86rem';

        caption.style.fontWeight =
          '700';

        card.append(
          image,
          caption
        );
      } else {
        card.appendChild(
          image
        );
      }

      photoGrid.appendChild(
        card
      );
    });

    wrapper.appendChild(
      photoGrid
    );

    return wrapper;
  }


  function makePhysicalDescriptionSection(
    description
  ) {
    if (
      !description ||
      typeof description !== 'object'
    ) {
      return null;
    }

    const height =
      Number(
        description.height_inches
      );

    let heightText = '';

    if (
      Number.isFinite(height) &&
      height > 0
    ) {
      const feet =
        Math.floor(height / 12);

      const inches =
        height % 12;

      heightText =
        `${feet} ft ${inches} in`;
    }

    const weight =
      Number(
        description.approximate_weight_lbs
      );

    const weightText =
      Number.isFinite(weight) &&
      weight > 0
        ? `${weight} lb`
        : '';

    const glasses =
      description.wears_glasses === true
        ? 'Yes'
        : description.wears_glasses === false
          ? 'No'
          : '';

    const fields = [
      ['Height', heightText],
      [
        'Approximate weight',
        weightText
      ],
      [
        'Build',
        description.build_description
      ],
      [
        'Complexion',
        description.complexion
      ],
      [
        'Hair color',
        description.hair_color
      ],
      [
        'Hair style',
        description.hair_style
      ],
      [
        'Eye color',
        description.eye_color
      ],
      [
        'Wears glasses',
        glasses
      ],
      [
        'Mobility / assistive aids',
        description.mobility_aids
      ],
      [
        'Identifying features',
        description.identifying_features
      ],
      [
        'Additional description',
        description.description_notes
      ]
    ];

    const valid =
      fields.filter(
        ([, value]) =>
          hasValue(value)
      );

    if (!valid.length) {
      return null;
    }

    const wrapper =
      makeSectionShell(
        'IDENTIFYING DESCRIPTION',
        'Physical description',
        'Caregiver-approved identifying details that may help responders confirm identity.',
        {
          icon: '⌖',
          iconBackground:
            COLORS.tealSoft,
          iconColor:
            COLORS.teal
        }
      );

    const sectionGrid =
      makeGrid();

    sectionGrid.style.marginTop =
      '16px';

    valid.forEach(
      ([label, value]) => {
        const item =
          makeCard(
            label,
            value
          );

        if (item) {
          sectionGrid.appendChild(
            item
          );
        }
      }
    );

    wrapper.appendChild(
      sectionGrid
    );

    return wrapper;
  }


  function makeMedicalItemCard(
    title,
    rows = [],
    notes = '',
    options = {}
  ) {
    const card =
      document.createElement('div');

    card.style.padding =
      options.padding || '17px';

    card.style.border =
      options.border ||
      `1px solid ${COLORS.blueBorder}`;

    card.style.borderRadius =
      '16px';

    card.style.background =
      options.background ||
      COLORS.white;

    const titleRow =
      document.createElement('div');

    titleRow.style.display =
      'flex';

    titleRow.style.alignItems =
      'center';

    titleRow.style.gap =
      '10px';

    titleRow.style.marginBottom =
      '13px';

    if (options.icon) {
      const icon =
        document.createElement('div');

      icon.textContent =
        options.icon;

      icon.style.display =
        'flex';

      icon.style.alignItems =
        'center';

      icon.style.justifyContent =
        'center';

      icon.style.flex =
        '0 0 auto';

      icon.style.width =
        '32px';

      icon.style.height =
        '32px';

      icon.style.borderRadius =
        '50%';

      icon.style.background =
        options.iconBackground ||
        COLORS.tealSoft;

      icon.style.color =
        options.iconColor ||
        COLORS.teal;

      icon.style.fontWeight =
        '900';

      icon.style.lineHeight =
        '1';

      titleRow.appendChild(
        icon
      );
    }

    const heading =
      document.createElement('div');

    heading.textContent =
      title;

    heading.style.color =
      options.titleColor ||
      COLORS.navy;

    heading.style.fontSize =
      '1.03rem';

    heading.style.fontWeight =
      '900';

    heading.style.lineHeight =
      '1.3';

    titleRow.appendChild(
      heading
    );

    card.appendChild(
      titleRow
    );

    const validRows =
      rows.filter(
        row =>
          row &&
          hasValue(row.value)
      );

    if (validRows.length) {
      const details =
        document.createElement('div');

      details.style.display =
        'grid';

      details.style.gridTemplateColumns =
        'repeat(auto-fit, minmax(150px, 1fr))';

      details.style.gap =
        '10px';

      validRows.forEach(row => {
        const field =
          document.createElement('div');

        field.style.padding =
          '10px 12px';

        field.style.borderRadius =
          '12px';

        field.style.background =
          row.alert
            ? '#fff5f4'
            : '#f8fafc';

        const label =
          document.createElement('div');

        label.textContent =
          row.label;

        label.style.marginBottom =
          '4px';

        label.style.color =
          row.alert
            ? COLORS.red
            : COLORS.muted;

        label.style.fontSize =
          '.73rem';

        label.style.fontWeight =
          '900';

        label.style.textTransform =
          'uppercase';

        label.style.letterSpacing =
          '.05em';

        const value =
          document.createElement('div');

        value.textContent =
          row.value;

        value.style.color =
          row.alert
            ? COLORS.red
            : COLORS.navy;

        value.style.fontWeight =
          row.alert
            ? '900'
            : '800';

        value.style.lineHeight =
          '1.4';

        field.append(
          label,
          value
        );

        details.appendChild(
          field
        );
      });

      card.appendChild(
        details
      );
    }

    if (hasValue(notes)) {
      const note =
        document.createElement('div');

      note.textContent =
        notes;

      note.style.marginTop =
        '13px';

      note.style.paddingTop =
        '12px';

      note.style.borderTop =
        options.noteBorder ||
        '1px solid #e3eaf0';

      note.style.color =
        COLORS.text;

      note.style.lineHeight =
        '1.5';

      note.style.fontSize =
        '.93rem';

      card.appendChild(
        note
      );
    }

    return card;
  }


  function makeNoneKnownBox(
    text,
    options = {}
  ) {
    const box =
      document.createElement('div');

    box.style.marginTop =
      '16px';

    box.style.padding =
      '15px 16px';

    box.style.border =
      `1px solid ${
        options.border ||
        COLORS.greenBorder
      }`;

    box.style.borderRadius =
      '14px';

    box.style.background =
      options.background ||
      COLORS.greenSoft;

    box.style.display =
      'flex';

    box.style.alignItems =
      'center';

    box.style.gap =
      '10px';

    const icon =
      document.createElement('div');

    icon.textContent =
      '✓';

    icon.style.display =
      'flex';

    icon.style.alignItems =
      'center';

    icon.style.justifyContent =
      'center';

    icon.style.flex =
      '0 0 auto';

    icon.style.width =
      '30px';

    icon.style.height =
      '30px';

    icon.style.borderRadius =
      '50%';

    icon.style.background =
      COLORS.green;

    icon.style.color =
      COLORS.white;

    icon.style.fontWeight =
      '900';

    const copy =
      document.createElement('div');

    copy.textContent =
      text;

    copy.style.color =
      COLORS.navy;

    copy.style.fontWeight =
      '800';

    copy.style.lineHeight =
      '1.4';

    box.append(
      icon,
      copy
    );

    return box;
  }


  function makeDiagnosesSection(
    diagnoses
  ) {
    if (
      !diagnoses ||
      (
        !diagnoses.none_known &&
        !hasItems(diagnoses)
      )
    ) {
      return null;
    }

    const wrapper =
      makeSectionShell(
        'MEDICAL INFORMATION',
        'Diagnoses & conditions',
        'Caregiver-provided diagnoses or conditions that may be important during an emergency response.',
        {
          icon: '✚',
          iconBackground:
            '#e8f4fb',
          iconColor:
            '#1f6f96',
          background:
            '#f7fbfe',
          border:
            '1px solid #cfe3ee'
        }
      );

    if (
      diagnoses.none_known &&
      !hasItems(diagnoses)
    ) {
      wrapper.appendChild(
        makeNoneKnownBox(
          'No known diagnoses or conditions reported.'
        )
      );

      return wrapper;
    }

    const list =
      document.createElement('div');

    list.style.display =
      'grid';

    list.style.gap =
      '12px';

    list.style.marginTop =
      '16px';

    diagnoses.items.forEach(
      item => {
        if (
          !item ||
          !hasValue(
            item.diagnosis_name
          )
        ) {
          return;
        }

        const card =
          makeMedicalItemCard(
            item.diagnosis_name,
            [],
            item.diagnosis_notes || '',
            {
              icon: '✚',
              iconBackground:
                '#e8f4fb',
              iconColor:
                '#1f6f96',
              border:
                '1px solid #d5e6ef'
            }
          );

        list.appendChild(
          card
        );
      }
    );

    if (!list.children.length) {
      return diagnoses.none_known
        ? wrapper
        : null;
    }

    wrapper.appendChild(
      list
    );

    return wrapper;
  }


  function makeMedicationsSection(
    medications
  ) {
    if (
      !medications ||
      (
        !medications.none_current &&
        !hasItems(medications)
      )
    ) {
      return null;
    }

    const wrapper =
      makeSectionShell(
        'MEDICAL INFORMATION',
        'Current medications',
        'Caregiver-provided medication information that may be relevant during emergency care.',
        {
          icon: '✚',
          iconBackground:
            '#e8f4fb',
          iconColor:
            '#1f6f96',
          background:
            '#f7fbfe',
          border:
            '1px solid #cfe3ee'
        }
      );

    if (
      medications.none_current &&
      !hasItems(medications)
    ) {
      wrapper.appendChild(
        makeNoneKnownBox(
          'No current medications reported.'
        )
      );

      return wrapper;
    }

    const list =
      document.createElement('div');

    list.style.display =
      'grid';

    list.style.gap =
      '12px';

    list.style.marginTop =
      '16px';

    medications.items.forEach(
      item => {
        if (
          !item ||
          !hasValue(
            item.medication_name
          )
        ) {
          return;
        }

        const rows = [
          {
            label: 'Dose',
            value:
              item.dose
          },
          {
            label: 'Route',
            value:
              normalizeDisplayValue(
                item.route
              )
          },
          {
            label: 'Frequency',
            value:
              item.frequency
          },
          {
            label: 'Purpose',
            value:
              item.purpose
          }
        ];

        const card =
          makeMedicalItemCard(
            item.medication_name,
            rows,
            item.medication_notes || '',
            {
              icon: '✚',
              iconBackground:
                '#e8f4fb',
              iconColor:
                '#1f6f96',
              border:
                '1px solid #d5e6ef'
            }
          );

        list.appendChild(
          card
        );
      }
    );

    if (!list.children.length) {
      return medications.none_current
        ? wrapper
        : null;
    }

    wrapper.appendChild(
      list
    );

    return wrapper;
  }


  function makeAllergiesSection(
    allergies
  ) {
    if (
      !allergies ||
      (
        !allergies.none_known &&
        !hasItems(allergies)
      )
    ) {
      return null;
    }

    if (
      allergies.none_known &&
      !hasItems(allergies)
    ) {
      const wrapper =
        makeSectionShell(
          'MEDICAL INFORMATION',
          'Allergies',
          'Caregiver-provided allergy information.',
          {
            icon: '✓',
            iconBackground:
              COLORS.green,
            iconColor:
              COLORS.white,
            background:
              COLORS.greenSoft,
            border:
              `1px solid ${COLORS.greenBorder}`,
            eyebrowColor:
              COLORS.green
          }
        );

      wrapper.appendChild(
        makeNoneKnownBox(
          'No known allergies reported.'
        )
      );

      return wrapper;
    }

    const hasHighRisk =
      allergies.items.some(
        item =>
          isHighRiskAllergy(item)
      );

    const wrapper =
      makeSectionShell(
        hasHighRisk
          ? 'MEDICAL ALERT'
          : 'MEDICAL INFORMATION',
        'Allergies',
        'Important allergy information. Review before providing food, medication, treatment, or emergency care.',
        {
          icon:
            hasHighRisk
              ? '✚'
              : '✚',
          iconBackground:
            hasHighRisk
              ? COLORS.red
              : '#fce8e6',
          iconColor:
            hasHighRisk
              ? COLORS.white
              : COLORS.red,
          background:
            hasHighRisk
              ? COLORS.redSoft
              : COLORS.redSofter,
          border:
            hasHighRisk
              ? `2px solid ${COLORS.redStrongBorder}`
              : `1px solid ${COLORS.redBorder}`,
          eyebrowColor:
            COLORS.red,
          titleColor:
            hasHighRisk
              ? COLORS.redDark
              : COLORS.navy,
          shadow:
            hasHighRisk
              ? '0 8px 24px rgba(180,35,24,.08)'
              : ''
        }
      );

    const list =
      document.createElement('div');

    list.style.display =
      'grid';

    list.style.gap =
      '13px';

    list.style.marginTop =
      '17px';

    allergies.items.forEach(
      item => {
        if (
          !item ||
          !hasValue(
            item.allergen
          )
        ) {
          return;
        }

        const highRisk =
          isHighRiskAllergy(item);

        const rows = [
          {
            label: 'Type',
            value:
              normalizeDisplayValue(
                item.allergy_type
              )
          },
          {
            label: 'Reaction',
            value:
              normalizeDisplayValue(
                item.reaction
              ),
            alert:
              highRisk &&
              hasValue(
                item.reaction
              )
          },
          {
            label: 'Severity',
            value:
              normalizeDisplayValue(
                item.severity
              ),
            alert:
              highRisk &&
              hasValue(
                item.severity
              )
          }
        ];

        const card =
          makeMedicalItemCard(
            item.allergen,
            rows,
            item.allergy_notes || '',
            {
              icon: '!',
              iconBackground:
                COLORS.red,
              iconColor:
                COLORS.white,
              titleColor:
                COLORS.redDark,
              background:
                COLORS.white,
              border:
                highRisk
                  ? `2px solid ${COLORS.redStrongBorder}`
                  : `1px solid ${COLORS.redBorder}`,
              noteBorder:
                `1px solid ${COLORS.redBorder}`
            }
          );

        if (highRisk) {
          const warning =
            document.createElement('div');

          warning.textContent =
            'HIGH-RISK ALLERGY — USE IMMEDIATE CAUTION';

          warning.style.marginTop =
            '13px';

          warning.style.padding =
            '10px 12px';

          warning.style.borderRadius =
            '11px';

          warning.style.background =
            '#fde4e1';

          warning.style.color =
            COLORS.redDark;

          warning.style.fontSize =
            '.78rem';

          warning.style.fontWeight =
            '900';

          warning.style.letterSpacing =
            '.04em';

          warning.style.lineHeight =
            '1.4';

          card.appendChild(
            warning
          );
        }

        list.appendChild(
          card
        );
      }
    );

    if (!list.children.length) {
      return allergies.none_known
        ? wrapper
        : null;
    }

    wrapper.appendChild(
      list
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

    card.className =
      'em-card';

    const heading =
      document.createElement('span');

    heading.textContent =
      title;

    card.appendChild(
      heading
    );

    if (hasValue(name)) {
      const strong =
        document.createElement('strong');

      strong.textContent =
        name;

      card.appendChild(
        strong
      );
    }

    if (hasValue(relationship)) {
      const relationshipLine =
        document.createElement('div');

      relationshipLine.textContent =
        relationship;

      relationshipLine.style.marginTop =
        '4px';

      relationshipLine.style.color =
        COLORS.muted;

      relationshipLine.style.fontWeight =
        '700';

      card.appendChild(
        relationshipLine
      );
    }

    if (hasValue(phone)) {
      const link =
        document.createElement('a');

      link.href =
        `tel:${cleanPhone(phone)}`;

      link.textContent =
        formatPhone(phone);

      link.style.display =
        'inline-block';

      link.style.marginTop =
        '12px';

      link.style.color =
        COLORS.teal;

      link.style.fontWeight =
        '900';

      link.style.fontSize =
        '1.05rem';

      link.style.textDecoration =
        'none';

      card.appendChild(
        link
      );
    }

    return card;
  }


  function makeActionButton(
    label,
    phone,
    options = {}
  ) {
    const button =
      document.createElement('a');

    button.textContent =
      label;

    button.href =
      `tel:${cleanPhone(phone)}`;

    button.style.display =
      'flex';

    button.style.alignItems =
      'center';

    button.style.justifyContent =
      'center';

    button.style.minHeight =
      '50px';

    button.style.padding =
      '12px 16px';

    button.style.borderRadius =
      '999px';

    button.style.fontWeight =
      '900';

    button.style.textAlign =
      'center';

    button.style.textDecoration =
      'none';

    if (options.emergency) {
      button.style.background =
        '#b91c1c';

      button.style.color =
        COLORS.white;

      return button;
    }

    if (options.secondary) {
      button.style.background =
        COLORS.white;

      button.style.color =
        COLORS.navy;

      button.style.border =
        '1px solid #cbd9e2';

      return button;
    }

    button.style.background =
      COLORS.navy;

    button.style.color =
      COLORS.white;

    return button;
  }


  function makeResponderActions(
    profileData
  ) {
    const wrapper =
      document.createElement('section');

    wrapper.style.gridColumn =
      '1 / -1';

    wrapper.style.margin =
      '24px 0 4px';

    wrapper.style.padding =
      '22px';

    wrapper.style.border =
      '1px solid #cfe3ea';

    wrapper.style.borderRadius =
      '18px';

    wrapper.style.background =
      '#f8fbfd';

    const eyebrow =
      document.createElement('div');

    eyebrow.textContent =
      'RESPONDER ACTIONS';

    eyebrow.style.marginBottom =
      '6px';

    eyebrow.style.color =
      COLORS.teal;

    eyebrow.style.fontSize =
      '.75rem';

    eyebrow.style.fontWeight =
      '900';

    eyebrow.style.letterSpacing =
      '.1em';

    const title =
      document.createElement('h2');

    title.textContent =
      'Help support safe reunification';

    title.style.margin =
      '0 0 8px';

    title.style.color =
      COLORS.navy;

    title.style.fontSize =
      '1.2rem';

    const note =
      document.createElement('p');

    note.textContent =
      'If it is safe to do so, remain nearby while attempting to contact the caregiver. Use emergency services for immediate danger or a medical emergency.';

    note.style.margin =
      '0 0 16px';

    note.style.color =
      '#526174';

    note.style.lineHeight =
      '1.55';

    const actions =
      document.createElement('div');

    actions.style.display =
      'grid';

    actions.style.gridTemplateColumns =
      'repeat(auto-fit, minmax(210px, 1fr))';

    actions.style.gap =
      '10px';

    const caregiverButton =
      makeActionButton(
        hasValue(
          profileData.emergency_contact_name
        )
          ? `Call caregiver · ${profileData.emergency_contact_name}`
          : 'Call caregiver',
        profileData.emergency_contact_phone
      );

    if (caregiverButton) {
      actions.appendChild(
        caregiverButton
      );
    }

    const alternateButton =
      makeActionButton(
        hasValue(
          profileData.alternate_contact_name
        )
          ? `Call alternate · ${profileData.alternate_contact_name}`
          : 'Call alternate contact',
        profileData.alternate_contact_phone,
        {
          secondary: true
        }
      );

    if (alternateButton) {
      actions.appendChild(
        alternateButton
      );
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


  function addEmergencyContactsHeading() {
    const heading =
      document.createElement('h2');

    heading.textContent =
      'Emergency contacts';

    heading.style.gridColumn =
      '1 / -1';

    heading.style.margin =
      '24px 0 4px';

    heading.style.color =
      COLORS.navy;

    heading.style.fontSize =
      '1.25rem';

    cards.appendChild(
      heading
    );
  }


  try {
    const response =
      await fetch(
        `/api/emergency-profile?id=${encodeURIComponent(
          id
        )}`,
        {
          cache: 'no-store'
        }
      );

    if (!response.ok) {
      throw new Error();
    }

    const data =
      await response.json();

    if (!data.profile) {
      throw new Error();
    }

    const p =
      data.profile;

    loading.hidden =
      true;

    document
      .getElementById('name')
      .textContent =
        p.preferred_name ||
        'OneProfile™';

    cards.innerHTML =
      '';


    /*
      PARTICIPANT IDENTIFICATION
    */

    const primaryPhoto =
      makePrimaryPhotoSection(
        p.participant_photo
      );

    if (primaryPhoto) {
      cards.appendChild(
        primaryPhoto
      );
    }


    const additionalPhotos =
      makeAdditionalPhotosSection(
        p.additional_photos
      );

    if (additionalPhotos) {
      cards.appendChild(
        additionalPhotos
      );
    }


    const physicalDescription =
      makePhysicalDescriptionSection(
        p.physical_description
      );

    if (physicalDescription) {
      cards.appendChild(
        physicalDescription
      );
    }


    /*
      RESPONDER PRIORITY
    */

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

      if (card) {
        cards.appendChild(
          card
        );
      }
    }


    const quickContact =
      makeQuickContactButton(
        p.emergency_contact_name,
        p.emergency_contact_phone
      );

    if (quickContact) {
      cards.appendChild(
        quickContact
      );
    }


    /*
      AT A GLANCE
    */

    const atAGlance =
      makeAtAGlance(p);

    if (atAGlance) {
      cards.appendChild(
        atAGlance
      );
    }


    /*
      SAFETY
    */

    const safetySection =
      makeSafetySection(p);

    if (safetySection) {
      cards.appendChild(
        safetySection
      );
    }


    /*
      COMMUNICATION & SUPPORT
    */

    const supportSection =
      makeSupportSection(p);

    if (supportSection) {
      cards.appendChild(
        supportSection
      );
    }


    /*
      MEDICAL INFORMATION
    */

    const diagnosesSection =
      makeDiagnosesSection(
        p.diagnoses
      );

    if (diagnosesSection) {
      cards.appendChild(
        diagnosesSection
      );
    }


    const medicationsSection =
      makeMedicationsSection(
        p.medications
      );

    if (medicationsSection) {
      cards.appendChild(
        medicationsSection
      );
    }


    const allergiesSection =
      makeAllergiesSection(
        p.allergies
      );

    if (allergiesSection) {
      cards.appendChild(
        allergiesSection
      );
    }


    /*
      RESPONDER ACTIONS
    */

    const responderActions =
      makeResponderActions(p);

    cards.appendChild(
      responderActions
    );


    /*
      EMERGENCY CONTACTS
    */

    const hasPrimary =
      hasValue(
        p.emergency_contact_name
      ) ||
      hasValue(
        p.emergency_contact_relationship
      ) ||
      hasValue(
        p.emergency_contact_phone
      );

    const hasAlternate =
      hasValue(
        p.alternate_contact_name
      ) ||
      hasValue(
        p.alternate_contact_phone
      );

    if (
      hasPrimary ||
      hasAlternate
    ) {
      addEmergencyContactsHeading();
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
        cards.appendChild(
          primaryCard
        );
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
        cards.appendChild(
          alternateCard
        );
      }
    }


    profile.hidden =
      false;

  } catch (error) {
    console.error(error);

    loading.hidden =
      true;

    unavailable.hidden =
      false;
  }
})();