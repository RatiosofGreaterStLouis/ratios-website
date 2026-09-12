(() => {

  const form =
    document.getElementById('profileForm');

  const loading =
    document.getElementById('profileLoading');

  const content =
    document.getElementById('profileContent');

  const message =
    document.getElementById('saveMessage');

  const saveButton =
    document.getElementById('saveButton');

  const diagnosisList =
    document.getElementById('diagnosisList');

  const medicationList =
    document.getElementById('medicationList');

  const allergyList =
    document.getElementById('allergyList');

  const addDiagnosisButton =
    document.getElementById('addDiagnosisButton');

  const addMedicationButton =
    document.getElementById('addMedicationButton');

  const addAllergyButton =
    document.getElementById('addAllergyButton');

  const noKnownDiagnoses =
    document.getElementById('noKnownDiagnoses');

  const noCurrentMedications =
    document.getElementById('noCurrentMedications');

  const noKnownAllergies =
    document.getElementById('noKnownAllergies');

  const diagnosisSection =
    document.getElementById('diagnosisSection');

  const medicationSection =
    document.getElementById('medicationSection');

  const allergySection =
    document.getElementById('allergySection');

  const heightDisplay =
    document.getElementById('heightDisplay');

  const heightInches =
    document.getElementById('heightInches');


  const coreFields = [
    'preferred_name',
    'communication_method',
    'communication_notes',
    'sensory_triggers',
    'calming_supports',
    'touch_preference',
    'safety_risk_level',
    'known_destinations',
    'safe_approach',
    'emergency_contact_name',
    'emergency_contact_relationship',
    'emergency_contact_phone',
    'alternate_contact_name',
    'alternate_contact_phone',
    'responder_notes'
  ];


  const physicalFields = [
    'approximate_weight_lbs',
    'build_description',
    'hair_color',
    'hair_style',
    'eye_color',
    'complexion',
    'mobility_aids',
    'identifying_features',
    'description_notes'
  ];


  function escapeHtml(value) {

    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');

  }


  function showMessage(text, type = 'info') {

    message.className =
      `opc-alert ${type}`;

    message.textContent =
      text;

    message.hidden =
      false;

    message.scrollIntoView({
      behavior: 'smooth',
      block: 'center'
    });

  }


  function emptyState(text) {

    return `
      <div class="opp-empty">
        ${escapeHtml(text)}
      </div>
    `;

  }


  function updateRepeaterNumbers(container, label) {

    const items =
      [...container.querySelectorAll('.opp-repeat-item')];

    items.forEach((item, index) => {

      const title =
        item.querySelector('.opp-repeat-title');

      if (title) {
        title.textContent =
          `${label} ${index + 1}`;
      }

    });

  }


  function createDiagnosisItem(data = {}) {

    const item =
      document.createElement('div');

    item.className =
      'opp-repeat-item';

    item.innerHTML = `

      <p class="opp-repeat-title">
        Diagnosis
      </p>

      <div class="opp-grid two">

        <label>

          Diagnosis or condition

          <input
            data-field="diagnosis_name"
            value="${escapeHtml(data.diagnosis_name || '')}"
            placeholder="Example: Autism spectrum disorder"
          >

        </label>

        <label>

          Notes

          <textarea
            data-field="diagnosis_notes"
            rows="3"
            placeholder="Optional practical notes"
          >${escapeHtml(data.diagnosis_notes || '')}</textarea>

        </label>

      </div>

      <div class="opp-repeat-actions">

        <button
          class="opp-remove"
          type="button"
        >
          Remove
        </button>

      </div>

    `;

    item
      .querySelector('.opp-remove')
      .addEventListener(
        'click',
        () => {

          item.remove();

          renderDiagnosisEmpty();

          updateRepeaterNumbers(
            diagnosisList,
            'Diagnosis'
          );

        }
      );

    return item;

  }


  function renderDiagnosisEmpty() {

    const items =
      diagnosisList.querySelectorAll(
        '.opp-repeat-item'
      );

    const oldEmpty =
      diagnosisList.querySelector(
        '.opp-empty'
      );

    if (
      items.length === 0 &&
      !oldEmpty
    ) {

      diagnosisList.innerHTML =
        emptyState(
          'No diagnoses or conditions have been added.'
        );

    }

    if (
      items.length > 0 &&
      oldEmpty
    ) {

      oldEmpty.remove();

    }

  }


  function addDiagnosis(data = {}) {

    const oldEmpty =
      diagnosisList.querySelector(
        '.opp-empty'
      );

    if (oldEmpty) {
      oldEmpty.remove();
    }

    diagnosisList.appendChild(
      createDiagnosisItem(data)
    );

    updateRepeaterNumbers(
      diagnosisList,
      'Diagnosis'
    );

  }


  function createMedicationItem(data = {}) {

    const item =
      document.createElement('div');

    item.className =
      'opp-repeat-item';

    item.innerHTML = `

      <p class="opp-repeat-title">
        Medication
      </p>

      <div class="opp-grid two">

        <label>

          Medication name

          <input
            data-field="medication_name"
            value="${escapeHtml(data.medication_name || '')}"
            placeholder="Medication name"
          >

        </label>

        <label>

          Dose

          <input
            data-field="dose"
            value="${escapeHtml(data.dose || '')}"
            placeholder="Example: 10 mg"
          >

        </label>

        <label>

          Route

          <select data-field="route">

            <option value="">
              Select route
            </option>

            <option value="Oral">
              Oral
            </option>

            <option value="Topical">
              Topical
            </option>

            <option value="Inhaled">
              Inhaled
            </option>

            <option value="Injection">
              Injection
            </option>

            <option value="Sublingual">
              Sublingual
            </option>

            <option value="Rectal">
              Rectal
            </option>

            <option value="Other">
              Other
            </option>

          </select>

        </label>

        <label>

          Frequency / schedule

          <input
            data-field="frequency"
            value="${escapeHtml(data.frequency || '')}"
            placeholder="Example: Twice daily"
          >

        </label>

        <label>

          Reason / purpose

          <input
            data-field="purpose"
            value="${escapeHtml(data.purpose || '')}"
            placeholder="Optional"
          >

        </label>

        <label>

          Notes

          <textarea
            data-field="medication_notes"
            rows="3"
            placeholder="Optional practical medication notes"
          >${escapeHtml(data.medication_notes || '')}</textarea>

        </label>

      </div>

      <div class="opp-repeat-actions">

        <button
          class="opp-remove"
          type="button"
        >
          Remove
        </button>

      </div>

    `;


    const routeSelect =
      item.querySelector(
        '[data-field="route"]'
      );

    if (data.route) {

      const matchingOption =
        [...routeSelect.options]
          .find(
            option =>
              option.value ===
              data.route
          );

      if (matchingOption) {

        routeSelect.value =
          data.route;

      } else {

        const option =
          document.createElement(
            'option'
          );

        option.value =
          data.route;

        option.textContent =
          data.route;

        routeSelect.appendChild(
          option
        );

        routeSelect.value =
          data.route;

      }

    }


    item
      .querySelector('.opp-remove')
      .addEventListener(
        'click',
        () => {

          item.remove();

          renderMedicationEmpty();

          updateRepeaterNumbers(
            medicationList,
            'Medication'
          );

        }
      );

    return item;

  }


  function renderMedicationEmpty() {

    const items =
      medicationList.querySelectorAll(
        '.opp-repeat-item'
      );

    const oldEmpty =
      medicationList.querySelector(
        '.opp-empty'
      );

    if (
      items.length === 0 &&
      !oldEmpty
    ) {

      medicationList.innerHTML =
        emptyState(
          'No medications have been added.'
        );

    }

    if (
      items.length > 0 &&
      oldEmpty
    ) {

      oldEmpty.remove();

    }

  }


  function addMedication(data = {}) {

    const oldEmpty =
      medicationList.querySelector(
        '.opp-empty'
      );

    if (oldEmpty) {
      oldEmpty.remove();
    }

    medicationList.appendChild(
      createMedicationItem(data)
    );

    updateRepeaterNumbers(
      medicationList,
      'Medication'
    );

  }


  function createAllergyItem(data = {}) {

    const item =
      document.createElement('div');

    item.className =
      'opp-repeat-item';

    item.innerHTML = `

      <p class="opp-repeat-title">
        Allergy
      </p>

      <div class="opp-grid two">

        <label>

          Allergen

          <input
            data-field="allergen"
            value="${escapeHtml(data.allergen || '')}"
            placeholder="Example: Penicillin or peanuts"
          >

        </label>

        <label>

          Allergy type

          <select data-field="allergy_type">

            <option value="">
              Select type
            </option>

            <option value="medication">
              Medication
            </option>

            <option value="food">
              Food
            </option>

            <option value="environmental">
              Environmental
            </option>

            <option value="latex">
              Latex
            </option>

            <option value="other">
              Other
            </option>

          </select>

        </label>

        <label>

          Reaction

          <input
            data-field="reaction"
            value="${escapeHtml(data.reaction || '')}"
            placeholder="Hives, swelling, difficulty breathing…"
          >

        </label>

        <label>

          Severity

          <select data-field="severity">

            <option value="">
              Select severity
            </option>

            <option value="mild">
              Mild
            </option>

            <option value="moderate">
              Moderate
            </option>

            <option value="severe">
              Severe
            </option>

            <option value="life_threatening">
              Life-threatening
            </option>

            <option value="unknown">
              Unknown
            </option>

          </select>

        </label>

      </div>


      <label>

        Notes

        <textarea
          data-field="allergy_notes"
          rows="3"
          placeholder="Optional allergy notes"
        >${escapeHtml(data.allergy_notes || '')}</textarea>

      </label>


      <div class="opp-repeat-actions">

        <button
          class="opp-remove"
          type="button"
        >
          Remove
        </button>

      </div>

    `;


    item.querySelector(
      '[data-field="allergy_type"]'
    ).value =
      data.allergy_type || '';


    item.querySelector(
      '[data-field="severity"]'
    ).value =
      data.severity || '';


    item
      .querySelector('.opp-remove')
      .addEventListener(
        'click',
        () => {

          item.remove();

          renderAllergyEmpty();

          updateRepeaterNumbers(
            allergyList,
            'Allergy'
          );

        }
      );

    return item;

  }


  function renderAllergyEmpty() {

    const items =
      allergyList.querySelectorAll(
        '.opp-repeat-item'
      );

    const oldEmpty =
      allergyList.querySelector(
        '.opp-empty'
      );

    if (
      items.length === 0 &&
      !oldEmpty
    ) {

      allergyList.innerHTML =
        emptyState(
          'No allergies have been added.'
        );

    }

    if (
      items.length > 0 &&
      oldEmpty
    ) {

      oldEmpty.remove();

    }

  }


  function addAllergy(data = {}) {

    const oldEmpty =
      allergyList.querySelector(
        '.opp-empty'
      );

    if (oldEmpty) {
      oldEmpty.remove();
    }

    allergyList.appendChild(
      createAllergyItem(data)
    );

    updateRepeaterNumbers(
      allergyList,
      'Allergy'
    );

  }


  function updateNoneState(
    checkbox,
    section
  ) {

    const disabled =
      checkbox.checked;

    section.style.opacity =
      disabled
        ? '.45'
        : '1';

    section.style.pointerEvents =
      disabled
        ? 'none'
        : 'auto';

  }


  function parseHeightDisplay() {

    const value =
      String(
        heightDisplay.value || ''
      ).trim();

    if (!value) {

      heightInches.value =
        '';

      return;

    }


    const numbers =
      value.match(/\d+/g) || [];


    if (numbers.length >= 2) {

      const feet =
        Number(numbers[0]);

      const inches =
        Number(numbers[1]);

      if (
        Number.isFinite(feet) &&
        Number.isFinite(inches) &&
        feet >= 1 &&
        feet <= 9 &&
        inches >= 0 &&
        inches <= 11
      ) {

        heightInches.value =
          String(
            feet * 12 +
            inches
          );

        return;

      }

    }


    const direct =
      Number(value);

    if (
      Number.isFinite(direct) &&
      direct >= 12 &&
      direct <= 120
    ) {

      heightInches.value =
        String(
          Math.round(direct)
        );

      return;

    }

    heightInches.value =
      '';

  }


  function displayHeight(totalInches) {

    const value =
      Number(totalInches);

    if (
      !Number.isFinite(value) ||
      value <= 0
    ) {

      heightDisplay.value =
        '';

      heightInches.value =
        '';

      return;

    }

    const feet =
      Math.floor(value / 12);

    const inches =
      value % 12;

    heightDisplay.value =
      `${feet} ft ${inches} in`;

    heightInches.value =
      String(value);

  }


  function readRepeater(
    container,
    fields,
    requiredField
  ) {

    return [
      ...container.querySelectorAll(
        '.opp-repeat-item'
      )
    ]
      .map(item => {

        const result = {};

        fields.forEach(field => {

          const input =
            item.querySelector(
              `[data-field="${field}"]`
            );

          result[field] =
            input
              ? String(
                  input.value || ''
                ).trim()
              : '';

        });

        return result;

      })
      .filter(
        item =>
          item[requiredField]
      );

  }


  async function load() {

    try {

      const response =
        await fetch(
          '/api/caregiver-profile',
          {
            credentials:
              'same-origin'
          }
        );


      if (!response.ok) {

        location.replace(
          'caregiver-login.html'
        );

        return;

      }


      const data =
        await response.json();


      document
        .getElementById(
          'participantName'
        )
        .textContent =
          data.enrollment
            ?.participant_first_name ||
          'your participant';


      for (
        const field
        of coreFields
      ) {

        if (
          form.elements[field]
        ) {

          form.elements[field].value =
            data.details?.[field] || '';

        }

      }


      const physical =
        data.physical_description || {};


      displayHeight(
        physical.height_inches
      );


      for (
        const field
        of physicalFields
      ) {

        if (
          form.elements[field]
        ) {

          form.elements[field].value =
            physical[field] ?? '';

        }

      }


      form.elements.wears_glasses.checked =
        !!physical.wears_glasses;


      const status =
        data.medical_profile_status || {};


      noKnownDiagnoses.checked =
        !!status.no_known_diagnoses;

      noCurrentMedications.checked =
        !!status.no_current_medications;

      noKnownAllergies.checked =
        !!status.no_known_allergies;


      diagnosisList.innerHTML = '';

      if (
        Array.isArray(data.diagnoses) &&
        data.diagnoses.length
      ) {

        data.diagnoses.forEach(
          item =>
            addDiagnosis(item)
        );

      } else {

        renderDiagnosisEmpty();

      }


      medicationList.innerHTML = '';

      if (
        Array.isArray(data.medications) &&
        data.medications.length
      ) {

        data.medications.forEach(
          item =>
            addMedication(item)
        );

      } else {

        renderMedicationEmpty();

      }


      allergyList.innerHTML = '';

      if (
        Array.isArray(data.allergies) &&
        data.allergies.length
      ) {

        data.allergies.forEach(
          item =>
            addAllergy(item)
        );

      } else {

        renderAllergyEmpty();

      }


      updateNoneState(
        noKnownDiagnoses,
        diagnosisSection
      );

      updateNoneState(
        noCurrentMedications,
        medicationSection
      );

      updateNoneState(
        noKnownAllergies,
        allergySection
      );


      loading.hidden =
        true;

      content.hidden =
        false;

    } catch (error) {

      console.error(error);

      location.replace(
        'caregiver-login.html'
      );

    }

  }


  addDiagnosisButton.addEventListener(
    'click',
    () => {

      if (
        noKnownDiagnoses.checked
      ) {
        return;
      }

      addDiagnosis();

    }
  );


  addMedicationButton.addEventListener(
    'click',
    () => {

      if (
        noCurrentMedications.checked
      ) {
        return;
      }

      addMedication();

    }
  );


  addAllergyButton.addEventListener(
    'click',
    () => {

      if (
        noKnownAllergies.checked
      ) {
        return;
      }

      addAllergy();

    }
  );


  noKnownDiagnoses.addEventListener(
    'change',
    () => {

      updateNoneState(
        noKnownDiagnoses,
        diagnosisSection
      );

    }
  );


  noCurrentMedications.addEventListener(
    'change',
    () => {

      updateNoneState(
        noCurrentMedications,
        medicationSection
      );

    }
  );


  noKnownAllergies.addEventListener(
    'change',
    () => {

      updateNoneState(
        noKnownAllergies,
        allergySection
      );

    }
  );


  heightDisplay.addEventListener(
    'change',
    parseHeightDisplay
  );


  heightDisplay.addEventListener(
    'blur',
    parseHeightDisplay
  );


  form.addEventListener(
    'submit',
    async event => {

      event.preventDefault();


      parseHeightDisplay();


      if (
        heightDisplay.value.trim() &&
        !heightInches.value
      ) {

        showMessage(
          'Please enter height like “5 ft 8 in”.',
          'error'
        );

        return;

      }


      saveButton.disabled =
        true;

      message.hidden =
        true;


      const body = {};


      for (
        const field
        of coreFields
      ) {

        body[field] =
          form.elements[field]
            ?.value || '';

      }


      body.physical_description = {

        height_inches:
          heightInches.value
            ? Number(
                heightInches.value
              )
            : null,

        approximate_weight_lbs:
          form.elements
            .approximate_weight_lbs
            .value
              ? Number(
                  form.elements
                    .approximate_weight_lbs
                    .value
                )
              : null,

        build_description:
          form.elements
            .build_description
            .value || '',

        hair_color:
          form.elements
            .hair_color
            .value || '',

        hair_style:
          form.elements
            .hair_style
            .value || '',

        eye_color:
          form.elements
            .eye_color
            .value || '',

        complexion:
          form.elements
            .complexion
            .value || '',

        wears_glasses:
          !!form.elements
            .wears_glasses
            .checked,

        mobility_aids:
          form.elements
            .mobility_aids
            .value || '',

        identifying_features:
          form.elements
            .identifying_features
            .value || '',

        description_notes:
          form.elements
            .description_notes
            .value || ''

      };


      body.medical_profile_status = {

        no_known_diagnoses:
          noKnownDiagnoses.checked,

        no_current_medications:
          noCurrentMedications.checked,

        no_known_allergies:
          noKnownAllergies.checked

      };


      body.diagnoses =
        noKnownDiagnoses.checked
          ? []
          : readRepeater(
              diagnosisList,
              [
                'diagnosis_name',
                'diagnosis_notes'
              ],
              'diagnosis_name'
            );


      body.medications =
        noCurrentMedications.checked
          ? []
          : readRepeater(
              medicationList,
              [
                'medication_name',
                'dose',
                'route',
                'frequency',
                'purpose',
                'medication_notes'
              ],
              'medication_name'
            );


      body.allergies =
        noKnownAllergies.checked
          ? []
          : readRepeater(
              allergyList,
              [
                'allergen',
                'allergy_type',
                'reaction',
                'severity',
                'allergy_notes'
              ],
              'allergen'
            );


      try {

        const response =
          await fetch(
            '/api/caregiver-profile',
            {
              method:
                'POST',

              headers: {
                'Content-Type':
                  'application/json'
              },

              credentials:
                'same-origin',

              body:
                JSON.stringify(body)
            }
          );


        const data =
          await response.json();


        if (!response.ok) {

          throw new Error(
            data.error ||
            'Unable to save profile.'
          );

        }


        showMessage(
          'Saved. Your private OneProfile™ record has been updated. Information remains private unless you choose to share it through Emergency Sharing.',
          'info'
        );

      } catch (error) {

        showMessage(
          error.message,
          'error'
        );

      } finally {

        saveButton.disabled =
          false;

      }

    }
  );


  load();

})();