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


  function hasValue(value) {

    return value !== null &&
           value !== undefined &&
           String(value).trim() !== '';

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


  function makeSectionShell(
    eyebrowText,
    titleText,
    introText = ''
  ) {

    const wrapper =
      document.createElement('section');

    wrapper.style.gridColumn =
      '1 / -1';

    wrapper.style.margin =
      '24px 0 4px';

    wrapper.style.padding =
      '20px';

    wrapper.style.border =
      '1px solid #d7e2ea';

    wrapper.style.borderRadius =
      '18px';

    wrapper.style.background =
      '#f8fafc';


    const eyebrow =
      document.createElement('div');

    eyebrow.textContent =
      eyebrowText;

    eyebrow.style.marginBottom =
      '6px';

    eyebrow.style.color =
      '#14869a';

    eyebrow.style.fontSize =
      '.75rem';

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
        ? '0 0 8px'
        : '0 0 16px';

    title.style.color =
      '#07172e';

    title.style.fontSize =
      '1.2rem';


    wrapper.append(
      eyebrow,
      title
    );


    if (introText) {

      const intro =
        document.createElement('p');

      intro.textContent =
        introText;

      intro.style.margin =
        '0 0 16px';

      intro.style.color =
        '#526174';

      intro.style.lineHeight =
        '1.5';


      wrapper.appendChild(
        intro
      );

    }


    return wrapper;

  }


  function makeGrid() {

    const grid =
      document.createElement('div');

    grid.style.display =
      'grid';

    grid.style.gridTemplateColumns =
      'repeat(auto-fit, minmax(230px, 1fr))';

    grid.style.gap =
      '12px';


    return grid;

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
      '#07172e';

    button.style.color =
      '#ffffff';

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


  function makePrimaryPhotoSection(photo) {

    if (
      !photo ||
      !hasValue(photo.url)
    ) {

      return null;

    }


    const wrapper =
      makeSectionShell(
        'IDENTIFICATION',
        'Participant identification photo',
        'Use this caregiver-approved photo to help confirm the participant’s identity.'
      );


    wrapper.style.background =
      '#f4fafc';

    wrapper.style.border =
      '1px solid #cfe3ea';


    const photoWrap =
      document.createElement('div');

    photoWrap.style.display =
      'flex';

    photoWrap.style.flexDirection =
      'column';

    photoWrap.style.alignItems =
      'center';

    photoWrap.style.gap =
      '10px';


    const image =
      document.createElement('img');

    image.src =
      photo.url;

    image.alt =
      'Participant identification photo';

    image.loading =
      'eager';

    image.style.width =
      '100%';

    image.style.maxWidth =
      '420px';

    image.style.maxHeight =
      '480px';

    image.style.objectFit =
      'cover';

    image.style.borderRadius =
      '20px';

    image.style.border =
      '1px solid #d6e4ea';

    image.style.background =
      '#ffffff';


    photoWrap.appendChild(
      image
    );


    if (
      hasValue(photo.caption)
    ) {

      const caption =
        document.createElement('p');

      caption.textContent =
        photo.caption;

      caption.style.margin =
        '0';

      caption.style.color =
        '#526174';

      caption.style.fontSize =
        '.9rem';

      caption.style.textAlign =
        'center';


      photoWrap.appendChild(
        caption
      );

    }


    wrapper.appendChild(
      photoWrap
    );


    return wrapper;

  }


  function makeAdditionalPhotosSection(photos) {

    if (
      !Array.isArray(photos) ||
      !photos.length
    ) {

      return null;

    }


    const wrapper =
      makeSectionShell(
        'ADDITIONAL IDENTIFICATION',
        'Additional identifying photos',
        'These optional caregiver-approved photos may help responders recognize the participant from different views.'
      );


    const grid =
      document.createElement('div');

    grid.style.display =
      'grid';

    grid.style.gridTemplateColumns =
      'repeat(auto-fit, minmax(180px, 1fr))';

    grid.style.gap =
      '12px';


    photos.forEach((photo) => {

      if (
        !photo ||
        !hasValue(photo.url)
      ) {
        return;
      }


      const item =
        document.createElement('div');

      item.style.border =
        '1px solid #dbe5ec';

      item.style.borderRadius =
        '16px';

      item.style.padding =
        '10px';

      item.style.background =
        '#ffffff';


      const image =
        document.createElement('img');

      image.src =
        photo.url;

      image.alt =
        'Additional participant identification photo';

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


      item.appendChild(
        image
      );


      if (
        hasValue(photo.caption)
      ) {

        const caption =
          document.createElement('p');

        caption.textContent =
          photo.caption;

        caption.style.margin =
          '8px 2px 2px';

        caption.style.color =
          '#526174';

        caption.style.fontSize =
          '.85rem';

        caption.style.lineHeight =
          '1.4';


        item.appendChild(
          caption
        );

      }


      grid.appendChild(
        item
      );

    });


    if (!grid.children.length) {
      return null;
    }


    wrapper.appendChild(
      grid
    );


    return wrapper;

  }


  function heightText(inches) {

    const total =
      Number(inches);

    if (
      !Number.isFinite(total) ||
      total <= 0
    ) {

      return '';

    }


    const feet =
      Math.floor(total / 12);

    const remaining =
      total % 12;


    return `${feet} ft ${remaining} in`;

  }


  function makePhysicalDescriptionSection(data) {

    if (!data) {
      return null;
    }


    const values = [

      [
        'Height',
        heightText(
          data.height_inches
        )
      ],

      [
        'Approx. weight',
        data.approximate_weight_lbs
          ? `${data.approximate_weight_lbs} lb`
          : ''
      ],

      [
        'Build',
        data.build_description
      ],

      [
        'Complexion',
        data.complexion
      ],

      [
        'Hair color',
        data.hair_color
      ],

      [
        'Hair style',
        data.hair_style
      ],

      [
        'Eye color',
        data.eye_color
      ],

      [
        'Glasses',
        data.wears_glasses
          ? 'Yes'
          : ''
      ],

      [
        'Mobility / assistive aids',
        data.mobility_aids
      ],

      [
        'Identifying features',
        data.identifying_features
      ],

      [
        'Additional description',
        data.description_notes
      ]

    ].filter(
      ([, value]) =>
        hasValue(value)
    );


    if (!values.length) {
      return null;
    }


    const wrapper =
      makeSectionShell(
        'IDENTIFYING DESCRIPTION',
        'Physical description',
        'Caregiver-approved identifying details that may help confirm identity or locate the participant.'
      );


    const grid =
      makeGrid();


    values.forEach(
      ([label, value]) => {

        const card =
          makeCard(
            label,
            value
          );


        if (card) {

          card.style.margin =
            '0';

          grid.appendChild(
            card
          );

        }

      }
    );


    wrapper.appendChild(
      grid
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
      '#ffffff';


    const labelElement =
      document.createElement('span');

    labelElement.textContent =
      label;

    labelElement.style.display =
      'block';

    labelElement.style.marginBottom =
      '5px';

    labelElement.style.color =
      '#14869a';

    labelElement.style.fontSize =
      '.72rem';

    labelElement.style.fontWeight =
      '900';

    labelElement.style.letterSpacing =
      '.08em';

    labelElement.style.textTransform =
      'uppercase';


    const valueElement =
      document.createElement('strong');

    valueElement.textContent =
      value;

    valueElement.style.display =
      'block';

    valueElement.style.color =
      '#07172e';

    valueElement.style.fontSize =
      '1rem';

    valueElement.style.lineHeight =
      '1.4';


    item.append(
      labelElement,
      valueElement
    );


    return item;

  }


  function makeAtAGlance(profileData) {

    const items = [

      {
        label: 'Communication',
        value: profileData.communication_method
      },

      {
        label: 'Safest approach',
        value: profileData.safe_approach
      },

      {
        label: 'Touch',
        value: profileData.touch_preference
      },

      {
        label: 'Sensory triggers',
        value: profileData.sensory_triggers
      }

    ].filter(
      item =>
        hasValue(item.value)
    );


    if (!items.length) {
      return null;
    }


    const wrapper =
      document.createElement('section');

    wrapper.style.gridColumn =
      '1 / -1';

    wrapper.style.margin =
      '12px 0 4px';

    wrapper.style.padding =
      '20px';

    wrapper.style.border =
      '1px solid #cfe3ea';

    wrapper.style.borderRadius =
      '18px';

    wrapper.style.background =
      '#f4fafc';


    const eyebrow =
      document.createElement('div');

    eyebrow.textContent =
      'AT A GLANCE';

    eyebrow.style.marginBottom =
      '6px';

    eyebrow.style.color =
      '#14869a';

    eyebrow.style.fontSize =
      '.75rem';

    eyebrow.style.fontWeight =
      '900';

    eyebrow.style.letterSpacing =
      '.1em';


    const title =
      document.createElement('h2');

    title.textContent =
      'How to interact safely';

    title.style.margin =
      '0 0 14px';

    title.style.color =
      '#07172e';

    title.style.fontSize =
      '1.2rem';


    const itemGrid =
      makeGrid();


    items.forEach(item => {

      const glanceItem =
        makeGlanceItem(
          item.label,
          item.value
        );


      if (glanceItem) {

        itemGrid.appendChild(
          glanceItem
        );

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

    riskCard.className =
      'em-card';

    riskCard.style.margin =
      '0';


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


    riskBadge.style.display =
      'inline-flex';

    riskBadge.style.alignItems =
      'center';

    riskBadge.style.justifyContent =
      'center';

    riskBadge.style.width =
      'fit-content';

    riskBadge.style.marginTop =
      '8px';

    riskBadge.style.padding =
      '8px 14px';

    riskBadge.style.borderRadius =
      '999px';

    riskBadge.style.fontWeight =
      '800';

    riskBadge.style.fontSize =
      '1rem';


    if (
      normalizedRisk.includes('high')
    ) {

      riskCard.style.border =
        '2px solid #b91c1c';

      riskCard.style.background =
        '#fff1f2';

      riskBadge.style.background =
        '#b91c1c';

      riskBadge.style.color =
        '#ffffff';


    } else if (
      normalizedRisk.includes('moderate') ||
      normalizedRisk.includes('medium')
    ) {

      riskCard.style.border =
        '2px solid #d97706';

      riskCard.style.background =
        '#fffaf0';

      riskBadge.style.background =
        '#f59e0b';

      riskBadge.style.color =
        '#07172e';


    } else if (
      normalizedRisk.includes('low')
    ) {

      riskCard.style.border =
        '2px solid #15803d';

      riskCard.style.background =
        '#f0fdf4';

      riskBadge.style.background =
        '#15803d';

      riskBadge.style.color =
        '#ffffff';


    } else {

      riskCard.style.border =
        '1px solid #d8e0e8';

      riskCard.style.background =
        '#f8fafc';

      riskBadge.style.background =
        '#e5e7eb';

      riskBadge.style.color =
        '#07172e';

    }


    riskCard.append(
      heading,
      riskBadge
    );


    return riskCard;

  }


  function makeSafetySection(profileData) {

    const hasSafetyInfo =
      hasValue(profileData.safety_risk_level) ||
      hasValue(profileData.known_destinations);


    if (!hasSafetyInfo) {
      return null;
    }


    const wrapper =
      makeSectionShell(
        'SAFETY INFORMATION',
        'Safety & wandering information',
        'Use this information to help reduce distress, support safe redirection, and assist with reunification.'
      );


    const sectionGrid =
      makeGrid();


    const riskCard =
      makeRiskCard(
        profileData.safety_risk_level
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
        profileData.known_destinations
      );


    if (destinations) {

      destinations.style.margin =
        '0';

      sectionGrid.appendChild(
        destinations
      );

    }


    wrapper.appendChild(
      sectionGrid
    );


    return wrapper;

  }


  function makeSupportSection(profileData) {

    const hasSupportInfo =
      hasValue(profileData.communication_notes) ||
      hasValue(profileData.calming_supports);


    if (!hasSupportInfo) {
      return null;
    }


    const wrapper =
      makeSectionShell(
        'SUPPORT INFORMATION',
        'Communication & support',
        'These caregiver-provided details may help support communication, reduce distress, and create a calmer interaction.'
      );


    wrapper.style.border =
      '1px solid #cfe3ea';

    wrapper.style.background =
      '#f4fafc';


    const sectionGrid =
      makeGrid();


    const communicationInstructions =
      makeCard(
        'Communication instructions',
        profileData.communication_notes
      );


    if (communicationInstructions) {

      communicationInstructions.style.margin =
        '0';

      sectionGrid.appendChild(
        communicationInstructions
      );

    }


    const calmingSupports =
      makeCard(
        'What helps me feel safe / calm',
        profileData.calming_supports
      );


    if (calmingSupports) {

      calmingSupports.style.margin =
        '0';

      sectionGrid.appendChild(
        calmingSupports
      );

    }


    wrapper.appendChild(
      sectionGrid
    );


    return wrapper;

  }


  function makeListItemCard(
    title,
    lines = []
  ) {

    const card =
      document.createElement('div');

    card.className =
      'em-card';

    card.style.margin =
      '0';


    const heading =
      document.createElement('strong');

    heading.textContent =
      title;

    heading.style.fontSize =
      '1.05rem';

    heading.style.marginBottom =
      '8px';


    card.appendChild(
      heading
    );


    lines
      .filter(
        line =>
          hasValue(line)
      )
      .forEach(line => {

        const p =
          document.createElement('p');

        p.textContent =
          line;

        p.style.margin =
          '4px 0';

        p.style.color =
          '#526174';

        p.style.lineHeight =
          '1.45';


        card.appendChild(
          p
        );

      });


    return card;

  }


  function makeDiagnosesSection(data) {

    if (!data) {
      return null;
    }


    if (
      !data.none_known &&
      !hasItems(data)
    ) {

      return null;

    }


    const wrapper =
      makeSectionShell(
        'MEDICAL INFORMATION',
        'Diagnoses & conditions',
        'Only diagnoses the caregiver chose to share appear here.'
      );


    if (data.none_known) {

      const noneCard =
        makeCard(
          'Diagnoses',
          'No known diagnoses reported'
        );


      if (noneCard) {

        noneCard.style.margin =
          '0';

        wrapper.appendChild(
          noneCard
        );

      }


      return wrapper;

    }


    const grid =
      makeGrid();


    data.items.forEach(item => {

      if (
        !hasValue(
          item.diagnosis_name
        )
      ) {
        return;
      }


      const card =
        makeListItemCard(
          item.diagnosis_name,
          [
            item.diagnosis_notes
          ]
        );


      grid.appendChild(
        card
      );

    });


    if (!grid.children.length) {
      return null;
    }


    wrapper.appendChild(
      grid
    );


    return wrapper;

  }


  function makeMedicationsSection(data) {

    if (!data) {
      return null;
    }


    if (
      !data.none_current &&
      !hasItems(data)
    ) {

      return null;

    }


    const wrapper =
      makeSectionShell(
        'MEDICAL INFORMATION',
        'Current medications',
        'Only medication information the caregiver chose to share appears here.'
      );


    if (data.none_current) {

      const noneCard =
        makeCard(
          'Medications',
          'No current medications reported'
        );


      if (noneCard) {

        noneCard.style.margin =
          '0';

        wrapper.appendChild(
          noneCard
        );

      }


      return wrapper;

    }


    const grid =
      makeGrid();


    data.items.forEach(item => {

      if (
        !hasValue(
          item.medication_name
        )
      ) {
        return;
      }


      const details = [];


      if (hasValue(item.dose)) {

        details.push(
          `Dose: ${item.dose}`
        );

      }


      if (hasValue(item.route)) {

        details.push(
          `Route: ${item.route}`
        );

      }


      if (hasValue(item.frequency)) {

        details.push(
          `Frequency: ${item.frequency}`
        );

      }


      if (hasValue(item.purpose)) {

        details.push(
          `Purpose: ${item.purpose}`
        );

      }


      if (hasValue(item.medication_notes)) {

        details.push(
          `Notes: ${item.medication_notes}`
        );

      }


      const card =
        makeListItemCard(
          item.medication_name,
          details
        );


      grid.appendChild(
        card
      );

    });


    if (!grid.children.length) {
      return null;
    }


    wrapper.appendChild(
      grid
    );


    return wrapper;

  }


  function makeAllergiesSection(data) {

    if (!data) {
      return null;
    }


    if (
      !data.none_known &&
      !hasItems(data)
    ) {

      return null;

    }


    const wrapper =
      makeSectionShell(
        'MEDICAL INFORMATION',
        'Allergies',
        'Only allergy information the caregiver chose to share appears here.'
      );


    if (data.none_known) {

      const noneCard =
        makeCard(
          'Allergies',
          'No known allergies reported'
        );


      if (noneCard) {

        noneCard.style.margin =
          '0';

        wrapper.appendChild(
          noneCard
        );

      }


      return wrapper;

    }


    const grid =
      makeGrid();


    data.items.forEach(item => {

      if (
        !hasValue(
          item.allergen
        )
      ) {
        return;
      }


      const details = [];


      if (
        hasValue(
          item.allergy_type
        )
      ) {

        details.push(
          `Type: ${item.allergy_type}`
        );

      }


      if (
        hasValue(
          item.reaction
        )
      ) {

        details.push(
          `Reaction: ${item.reaction}`
        );

      }


      if (
        hasValue(
          item.severity
        )
      ) {

        details.push(
          `Severity: ${item.severity}`
        );

      }


      if (
        hasValue(
          item.allergy_notes
        )
      ) {

        details.push(
          `Notes: ${item.allergy_notes}`
        );

      }


      const card =
        makeListItemCard(
          item.allergen,
          details
        );


      if (
        hasValue(
          item.severity
        ) &&
        String(
          item.severity
        )
          .toLowerCase()
          .includes('severe')
      ) {

        card.style.border =
          '2px solid #b91c1c';

        card.style.background =
          '#fff1f2';

      }


      grid.appendChild(
        card
      );

    });


    if (!grid.children.length) {
      return null;
    }


    wrapper.appendChild(
      grid
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

    card.style.gridColumn =
      '1 / -1';

    card.style.padding =
      '22px';


    const label =
      document.createElement('span');

    label.textContent =
      title;


    card.appendChild(
      label
    );


    if (hasValue(name)) {

      const contactName =
        document.createElement('strong');

      contactName.textContent =
        name;

      contactName.style.fontSize =
        '1.35rem';


      card.appendChild(
        contactName
      );

    }


    if (hasValue(relationship)) {

      const rel =
        document.createElement('p');

      rel.textContent =
        relationship;

      rel.style.margin =
        '4px 0 14px';

      rel.style.color =
        '#526174';


      card.appendChild(
        rel
      );

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


      callButton.style.display =
        'flex';

      callButton.style.alignItems =
        'center';

      callButton.style.justifyContent =
        'center';

      callButton.style.width =
        '100%';

      callButton.style.minHeight =
        '54px';

      callButton.style.marginTop =
        '10px';

      callButton.style.padding =
        '12px 18px';

      callButton.style.background =
        '#07172e';

      callButton.style.color =
        '#ffffff';

      callButton.style.borderRadius =
        '999px';

      callButton.style.fontWeight =
        '800';

      callButton.style.textDecoration =
        'none';

      callButton.style.textAlign =
        'center';


      card.appendChild(
        callButton
      );

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

    button.textContent =
      text;

    button.style.display =
      'flex';

    button.style.alignItems =
      'center';

    button.style.justifyContent =
      'center';

    button.style.minHeight =
      '52px';

    button.style.padding =
      '12px 18px';

    button.style.borderRadius =
      '999px';

    button.style.fontWeight =
      '800';

    button.style.textDecoration =
      'none';

    button.style.textAlign =
      'center';


    if (options.emergency) {

      button.style.background =
        '#b91c1c';

      button.style.color =
        '#ffffff';

      button.style.border =
        '2px solid #b91c1c';


    } else if (options.secondary) {

      button.style.background =
        '#ffffff';

      button.style.color =
        '#07172e';

      button.style.border =
        '2px solid #07172e';


    } else {

      button.style.background =
        '#07172e';

      button.style.color =
        '#ffffff';

      button.style.border =
        '2px solid #07172e';

    }


    return button;

  }


  function makeResponderActions(profileData) {

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
      '#14869a';

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
      '#07172e';

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
      '#07172e';

    heading.style.fontSize =
      '1.25rem';


    cards.appendChild(
      heading
    );

  }


  try {

    const response =
      await fetch(
        `/api/emergency-profile?id=${encodeURIComponent(id)}`,
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