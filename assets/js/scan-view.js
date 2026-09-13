(async () => {

  const code =
    new URLSearchParams(location.search).get('code') || '';

  const loading =
    document.getElementById('loading');

  const error =
    document.getElementById('error');

  const content =
    document.getElementById('content');

  const grid =
    document.getElementById('profileGrid');


  function hasValue(value) {

    return value !== null &&
      value !== undefined &&
      String(value).trim() !== '';

  }


  function hasItems(value) {

    return value &&
      Array.isArray(value.items) &&
      value.items.length > 0;

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

      return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;

    }

    if (
      digits.length === 11 &&
      digits.startsWith('1')
    ) {

      return `(${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;

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


  /* -----------------------------------------
     PRIMARY PARTICIPANT PHOTO
     ----------------------------------------- */

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


    if (hasValue(photo.caption)) {

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


  /* -----------------------------------------
     ADDITIONAL IDENTIFYING PHOTOS
     ----------------------------------------- */

  function makeAdditionalPhotosSection(
    photos
  ) {

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


    const photoGrid =
      document.createElement('div');

    photoGrid.style.display =
      'grid';

    photoGrid.style.gridTemplateColumns =
      'repeat(auto-fit, minmax(180px, 1fr))';

    photoGrid.style.gap =
      '12px';


    photos.forEach(photo => {

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


      if (hasValue(photo.caption)) {

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


      photoGrid.appendChild(
        item
      );

    });


    if (!photoGrid.children.length) {

      return null;

    }


    wrapper.appendChild(
      photoGrid
    );


    return wrapper;

  }


  /* -----------------------------------------
     PHYSICAL DESCRIPTION
     ----------------------------------------- */

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


  function makePhysicalDescriptionSection(
    data
  ) {

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


    const sectionGrid =
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

          sectionGrid.appendChild(
            card
          );

        }

      }
    );


    wrapper.appendChild(
      sectionGrid
    );


    return wrapper;

  }


  /* -----------------------------------------
     MEDICAL LIST CARDS
     ----------------------------------------- */

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

        const paragraph =
          document.createElement('p');

        paragraph.textContent =
          line;

        paragraph.style.margin =
          '4px 0';

        paragraph.style.color =
          '#526174';

        paragraph.style.lineHeight =
          '1.45';


        card.appendChild(
          paragraph
        );

      });


    return card;

  }


  /* -----------------------------------------
     DIAGNOSES
     ----------------------------------------- */

  function makeDiagnosesSection(
    data
  ) {

    if (
      !data ||
      (
        !data.none_known &&
        !hasItems(data)
      )
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


    const sectionGrid =
      makeGrid();


    data.items.forEach(item => {

      if (
        !hasValue(
          item.diagnosis_name
        )
      ) {

        return;

      }


      sectionGrid.appendChild(

        makeListItemCard(
          item.diagnosis_name,
          [
            item.diagnosis_notes
          ]
        )

      );

    });


    if (!sectionGrid.children.length) {

      return null;

    }


    wrapper.appendChild(
      sectionGrid
    );


    return wrapper;

  }


  /* -----------------------------------------
     MEDICATIONS
     ----------------------------------------- */

  function makeMedicationsSection(
    data
  ) {

    if (
      !data ||
      (
        !data.none_current &&
        !hasItems(data)
      )
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


    const sectionGrid =
      makeGrid();


    data.items.forEach(item => {

      if (
        !hasValue(
          item.medication_name
        )
      ) {

        return;

      }


      const details =
        [];


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


      if (
        hasValue(
          item.medication_notes
        )
      ) {

        details.push(
          `Notes: ${item.medication_notes}`
        );

      }


      sectionGrid.appendChild(

        makeListItemCard(
          item.medication_name,
          details
        )

      );

    });


    if (!sectionGrid.children.length) {

      return null;

    }


    wrapper.appendChild(
      sectionGrid
    );


    return wrapper;

  }


  /* -----------------------------------------
     ALLERGIES
     ----------------------------------------- */

  function makeAllergiesSection(
    data
  ) {

    if (
      !data ||
      (
        !data.none_known &&
        !hasItems(data)
      )
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


    const sectionGrid =
      makeGrid();


    data.items.forEach(item => {

      if (
        !hasValue(
          item.allergen
        )
      ) {

        return;

      }


      const details =
        [];


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


      sectionGrid.appendChild(
        card
      );

    });


    if (!sectionGrid.children.length) {

      return null;

    }


    wrapper.appendChild(
      sectionGrid
    );


    return wrapper;

  }


  /* -----------------------------------------
     QUICK CONTACT
     ----------------------------------------- */

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


  /* -----------------------------------------
     AT A GLANCE
     ----------------------------------------- */

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


  function makeAtAGlance(
    profile
  ) {

    const items = [

      {
        label:
          'Communication',

        value:
          profile.communication_method
      },

      {
        label:
          'Safest approach',

        value:
          profile.safe_approach
      },

      {
        label:
          'Touch',

        value:
          profile.touch_preference
      },

      {
        label:
          'Sensory triggers',

        value:
          profile.sensory_triggers
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
      document.createElement('div');

    itemGrid.style.display =
      'grid';

    itemGrid.style.gridTemplateColumns =
      'repeat(auto-fit, minmax(210px, 1fr))';

    itemGrid.style.gap =
      '10px';


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


  /* -----------------------------------------
     WANDERING / SAFETY
     ----------------------------------------- */

  function makeRiskCard(
    value
  ) {

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
      normalizedRisk.includes(
        'unknown'
      ) ||
      normalizedRisk.includes(
        'assessing'
      ) ||
      normalizedRisk.includes(
        'not assessed'
      )
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
      normalizedRisk.includes(
        'high'
      )
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
      normalizedRisk.includes(
        'moderate'
      ) ||
      normalizedRisk.includes(
        'medium'
      )
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
      normalizedRisk.includes(
        'low'
      )
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
        '1px solid #cbd5e1';

      riskCard.style.background =
        '#f8fafc';

      riskBadge.style.background =
        '#e2e8f0';

      riskBadge.style.color =
        '#334155';

    }


    riskCard.append(
      heading,
      riskBadge
    );


    return riskCard;

  }


  function makeSafetySection(
    profile
  ) {

    const hasSafetyInfo =
      hasValue(
        profile.safety_risk_level
      ) ||
      hasValue(
        profile.known_destinations
      );


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


    wrapper.appendChild(
      sectionGrid
    );


    return wrapper;

  }


  /* -----------------------------------------
     COMMUNICATION + SUPPORT
     ----------------------------------------- */

  function makeSupportSection(
    profile
  ) {

    const hasSupportInfo =
      hasValue(
        profile.communication_notes
      ) ||
      hasValue(
        profile.calming_supports
      );


    if (!hasSupportInfo) {

      return null;

    }


    const wrapper =
      makeSectionShell(
        'SUPPORT INFORMATION',
        'Communication & support',
        'These caregiver-provided details may help support communication, reduce distress, and create a calmer interaction.'
      );


    wrapper.style.background =
      '#f4fafc';

    wrapper.style.border =
      '1px solid #cfe3ea';


    const sectionGrid =
      makeGrid();


    const communicationInstructions =
      makeCard(
        'Communication instructions',
        profile.communication_notes
      );


    if (
      communicationInstructions
    ) {

      communicationInstructions
        .style.margin =
        '0';

      sectionGrid.appendChild(
        communicationInstructions
      );

    }


    const calmingSupports =
      makeCard(
        'What helps me feel safe / calm',
        profile.calming_supports
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


  /* -----------------------------------------
     EMERGENCY CONTACT CARDS
     ----------------------------------------- */

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
        document.createElement(
          'strong'
        );

      contactName.textContent =
        name;

      contactName.style.fontSize =
        '1.35rem';


      card.appendChild(
        contactName
      );

    }


    if (
      hasValue(
        relationship
      )
    ) {

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


  /* -----------------------------------------
     RESPONDER ACTION BUTTONS
     ----------------------------------------- */

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

    } else if (
      options.secondary
    ) {

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


  function makeResponderActions(
    profile
  ) {

    const wrapper =
      makeSectionShell(
        'RESPONDER ACTIONS',
        'Help support safe reunification',
        'If it is safe to do so, remain nearby while attempting to contact the caregiver. Use emergency services for immediate danger or a medical emergency.'
      );


    wrapper.style.background =
      '#f8fbfd';

    wrapper.style.border =
      '1px solid #cfe3ea';


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
          profile.emergency_contact_name
        )
          ? `Call caregiver · ${profile.emergency_contact_name}`
          : 'Call caregiver',

        profile.emergency_contact_phone

      );


    if (caregiverButton) {

      actions.appendChild(
        caregiverButton
      );

    }


    const alternateButton =
      makeActionButton(

        hasValue(
          profile.alternate_contact_name
        )
          ? `Call alternate · ${profile.alternate_contact_name}`
          : 'Call alternate contact',

        profile.alternate_contact_phone,

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


    wrapper.appendChild(
      actions
    );


    return wrapper;

  }


  /* -----------------------------------------
     LOAD QR IDENTIFIER PROFILE
     ----------------------------------------- */

  try {

    if (!code) {

      loading.hidden =
        true;

      error.hidden =
        false;

      return;

    }


    const response =
      await fetch(

        `/api/identifier-profile?code=${encodeURIComponent(code)}`,

        {
          cache:
            'no-store'
        }

      );


    const data =
      await response.json();


    loading.hidden =
      true;


    if (
      !response.ok ||
      !data.profile
    ) {

      error.hidden =
        false;

      return;

    }


    const p =
      data.profile;


    document
      .getElementById(
        'displayName'
      )
      .textContent =
        p.preferred_name ||
        'OneProfile™';


    grid.innerHTML =
      '';


    /* -----------------------------------------
       PARTICIPANT IDENTIFICATION
       ----------------------------------------- */

    const primaryPhoto =
      makePrimaryPhotoSection(
        p.participant_photo
      );


    if (primaryPhoto) {

      grid.appendChild(
        primaryPhoto
      );

    }


    const additionalPhotos =
      makeAdditionalPhotosSection(
        p.additional_photos
      );


    if (additionalPhotos) {

      grid.appendChild(
        additionalPhotos
      );

    }


    const physicalDescription =
      makePhysicalDescriptionSection(
        p.physical_description
      );


    if (physicalDescription) {

      grid.appendChild(
        physicalDescription
      );

    }


    /* -----------------------------------------
       RESPONDER PRIORITY
       ----------------------------------------- */

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
            fullWidth:
              true,

            urgent:
              true
          }
        );


      if (card) {

        grid.appendChild(
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

      grid.appendChild(
        quickContact
      );

    }


    /* -----------------------------------------
       AT A GLANCE
       ----------------------------------------- */

    const atAGlance =
      makeAtAGlance(
        p
      );


    if (atAGlance) {

      grid.appendChild(
        atAGlance
      );

    }


    /* -----------------------------------------
       SAFETY
       ----------------------------------------- */

    const safetySection =
      makeSafetySection(
        p
      );


    if (safetySection) {

      grid.appendChild(
        safetySection
      );

    }


    /* -----------------------------------------
       COMMUNICATION + SUPPORT
       ----------------------------------------- */

    const supportSection =
      makeSupportSection(
        p
      );


    if (supportSection) {

      grid.appendChild(
        supportSection
      );

    }


    /* -----------------------------------------
       MEDICAL INFORMATION
       ----------------------------------------- */

    const diagnosesSection =
      makeDiagnosesSection(
        p.diagnoses
      );


    if (diagnosesSection) {

      grid.appendChild(
        diagnosesSection
      );

    }


    const medicationsSection =
      makeMedicationsSection(
        p.medications
      );


    if (medicationsSection) {

      grid.appendChild(
        medicationsSection
      );

    }


    const allergiesSection =
      makeAllergiesSection(
        p.allergies
      );


    if (allergiesSection) {

      grid.appendChild(
        allergiesSection
      );

    }


    /* -----------------------------------------
       RESPONDER ACTIONS
       ----------------------------------------- */

    const responderActions =
      makeResponderActions(
        p
      );


    grid.appendChild(
      responderActions
    );


    /* -----------------------------------------
       EMERGENCY CONTACTS
       ----------------------------------------- */

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

      const contactHeading =
        document.createElement(
          'h2'
        );

      contactHeading.textContent =
        'Emergency contacts';

      contactHeading.style.gridColumn =
        '1 / -1';

      contactHeading.style.margin =
        '24px 0 4px';

      contactHeading.style.color =
        '#07172e';

      contactHeading.style.fontSize =
        '1.25rem';


      grid.appendChild(
        contactHeading
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

        grid.appendChild(
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

        grid.appendChild(
          alternateCard
        );

      }

    }


    content.hidden =
      false;


  } catch (err) {

    console.error(
      'Unable to load OneProfile identifier:',
      err
    );


    loading.hidden =
      true;

    error.hidden =
      false;

  }

})();