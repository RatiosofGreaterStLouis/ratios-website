(async () => {

  const groups = [

    {
      title: 'Identity & communication',
      description:
        'Basic information that can help a responder identify, address, and communicate with the participant.',
      fields: [
        ['preferred_name', 'Preferred name'],
        ['communication_method', 'Communication method'],
        ['communication_notes', 'Communication instructions']
      ]
    },

    {
      title: 'Identification',
      description:
        'Photos and physical characteristics that may help confirm identity during a wandering, missing-person, or emergency event.',
      fields: [
        ['participant_photo', 'Primary participant photo'],
        ['additional_photos', 'Additional identifying photos'],
        ['physical_description', 'Physical description & identifying features']
      ]
    },

    {
      title: 'Sensory & calming support',
      description:
        'Information that may help someone approach the participant safely and reduce distress.',
      fields: [
        ['sensory_triggers', 'Sensory triggers'],
        ['calming_supports', 'What helps them feel safe / calm'],
        ['touch_preference', 'Touch preference']
      ]
    },

    {
      title: 'Safety & wandering',
      description:
        'Practical information that may help locate, approach, redirect, or protect the participant.',
      fields: [
        ['safety_risk_level', 'Wandering / elopement risk'],
        ['known_destinations', 'Places they may try to go'],
        ['safe_approach', 'Safe approach / redirection']
      ]
    },

    {
      title: 'Medical information',
      description:
        'Health information remains private unless you specifically choose to share these sections.',
      fields: [
        ['diagnoses', 'Diagnoses & conditions'],
        ['medications', 'Current medications'],
        ['allergies', 'Allergies']
      ]
    },

    {
      title: 'Emergency contacts',
      description:
        'Choose which contact details a responder may use during an emergency.',
      fields: [
        ['emergency_contact_name', 'Primary emergency contact name'],
        ['emergency_contact_relationship', 'Primary contact relationship'],
        ['emergency_contact_phone', 'Primary emergency phone'],
        ['alternate_contact_name', 'Alternate contact name'],
        ['alternate_contact_phone', 'Alternate phone']
      ]
    },

    {
      title: 'Responder note',
      description:
        'A caregiver-written summary of the most important practical information responders should know.',
      fields: [
        ['responder_notes', 'Responder note']
      ]
    }

  ];


  const fieldsBox =
    document.getElementById('fields');

  const enabled =
    document.getElementById('enabled');

  const message =
    document.getElementById('message');

  const linkCard =
    document.getElementById('linkCard');

  const saveButton =
    document.getElementById('save');

  const copyButton =
    document.getElementById('copy');

  const publicUrl =
    document.getElementById('publicUrl');

  const preview =
    document.getElementById('preview');

  const stateTitle =
    document.getElementById('stateTitle');

  const stateText =
    document.getElementById('stateText');


  function buildSharingOptions() {

    fieldsBox.innerHTML = '';

    groups.forEach((group) => {

      const section =
        document.createElement('section');

      section.style.padding = '18px';
      section.style.border = '1px solid #dfe9f2';
      section.style.borderRadius = '18px';
      section.style.background = '#ffffff';
      section.style.marginBottom = '4px';


      const heading =
        document.createElement('h3');

      heading.textContent =
        group.title;

      heading.style.margin = '0 0 5px';
      heading.style.color = '#07172e';


      const helper =
        document.createElement('p');

      helper.textContent =
        group.description;

      helper.style.margin = '0 0 12px';
      helper.style.color = '#617388';
      helper.style.fontSize = '.9rem';
      helper.style.lineHeight = '1.5';


      section.appendChild(heading);
      section.appendChild(helper);


      group.fields.forEach(([value, label]) => {

        const row =
          document.createElement('label');

        const checkbox =
          document.createElement('input');

        checkbox.type = 'checkbox';
        checkbox.value = value;


        const text =
          document.createElement('span');

        text.textContent = label;


        row.appendChild(checkbox);
        row.appendChild(text);

        section.appendChild(row);

      });


      fieldsBox.appendChild(section);

    });

  }


  function updateState(on) {

    stateTitle.textContent =
      `Emergency profile ${on ? 'ON' : 'OFF'}`;

    stateText.textContent =
      on
        ? 'Only the caregiver-approved information selected below may appear in the responder-facing emergency view.'
        : 'No responder-facing emergency profile is available.';

  }


  function showLink(token, on) {

    linkCard.hidden =
      !on || !token;

    if (!on || !token) {
      return;
    }

    const url =
      `${location.origin}/emergency.html?id=${encodeURIComponent(token)}`;

    publicUrl.value =
      url;

    preview.href =
      url;

  }


  function checkSavedFields(fields) {

    const saved =
      new Set(
        Array.isArray(fields)
          ? fields
          : []
      );

    const checkboxes =
      fieldsBox.querySelectorAll(
        'input[type="checkbox"]'
      );

    checkboxes.forEach((checkbox) => {

      checkbox.checked =
        saved.has(checkbox.value);

    });

  }


  function selectedFields() {

    return [
      ...fieldsBox.querySelectorAll(
        'input[type="checkbox"]:checked'
      )
    ].map(
      (checkbox) =>
        checkbox.value
    );

  }


  async function loadSettings() {

    try {

      const response =
        await fetch(
          '/api/emergency-sharing',
          {
            credentials: 'same-origin'
          }
        );


      if (response.status === 401) {

        location.replace(
          'caregiver-login.html'
        );

        return;

      }


      const data =
        await response.json();


      if (!response.ok) {

        throw new Error(
          data.error ||
          'Unable to load sharing settings.'
        );

      }


      enabled.checked =
        !!data.enabled;

      updateState(
        enabled.checked
      );

      checkSavedFields(
        data.fields
      );

      showLink(
        data.public_token,
        data.enabled
      );


    } catch (error) {

      console.error(error);

      message.textContent =
        error.message ||
        'Unable to load sharing settings.';

    }

  }


  async function saveSettings() {

    saveButton.disabled =
      true;

    message.textContent =
      'Saving…';


    try {

      const fields =
        selectedFields();


      const response =
        await fetch(
          '/api/emergency-sharing',
          {
            method: 'POST',

            headers: {
              'Content-Type':
                'application/json'
            },

            credentials:
              'same-origin',

            body:
              JSON.stringify({
                enabled:
                  enabled.checked,

                fields
              })
          }
        );


      const data =
        await response.json();


      if (!response.ok) {

        throw new Error(
          data.error ||
          'Unable to save sharing settings.'
        );

      }


      message.textContent =
        data.enabled
          ? 'Saved. Emergency sharing is ON. Only the selected information is authorized for the responder view.'
          : 'Saved. Emergency sharing is OFF.';


      showLink(
        data.public_token,
        data.enabled
      );


    } catch (error) {

      console.error(error);

      message.textContent =
        error.message ||
        'Unable to save sharing settings.';


    } finally {

      saveButton.disabled =
        false;

    }

  }


  enabled.addEventListener(
    'change',
    () => {

      updateState(
        enabled.checked
      );

    }
  );


  saveButton.addEventListener(
    'click',
    saveSettings
  );


  copyButton.addEventListener(
    'click',
    async () => {

      try {

        await navigator.clipboard.writeText(
          publicUrl.value
        );


        copyButton.textContent =
          'Copied!';


        setTimeout(
          () => {

            copyButton.textContent =
              'Copy link';

          },
          1500
        );


      } catch (error) {

        console.error(error);

        message.textContent =
          'Unable to copy the link automatically.';

      }

    }
  );


  buildSharingOptions();

  await loadSettings();

})();