(() => {

  const page =
    document.body;

  const loadingState =
    document.getElementById('loadingState');

  const profileRecord =
    document.getElementById('profileRecord');

  const errorState =
    document.getElementById('errorState');

  const errorMessage =
    document.getElementById('errorMessage');

  const participantName =
    document.getElementById('participantName');

  const enrollmentIdElement =
    document.getElementById('enrollmentId');

  const participantDetails =
    document.getElementById('participantDetails');

  const caregiverDetails =
    document.getElementById('caregiverDetails');

  const profileStatus =
    document.getElementById('profileStatus');

  const identifierSummary =
    document.getElementById('identifierSummary');

  const staffActions =
    document.getElementById('staffActions');

  const issueIdentifierForm =
    document.getElementById('issueIdentifierForm');

  const identifierType =
    document.getElementById('identifierType');

  const identifierLabel =
    document.getElementById('identifierLabel');

  const issueIdentifierButton =
    document.getElementById('issueIdentifierButton');

  const issueIdentifierMessage =
    document.getElementById('issueIdentifierMessage');

  const issuedIdentifierResult =
    document.getElementById('issuedIdentifierResult');

  const issuedIdentifierDetails =
    document.getElementById('issuedIdentifierDetails');

  const issuedQrCode =
    document.getElementById('issuedQrCode');

  const issuedScanLink =
    document.getElementById('issuedScanLink');

  const downloadIssuedQr =
    document.getElementById('downloadIssuedQr');


  let currentEnrollmentId = '';
  let currentIssuedIdentifier = null;


  function escapeHtml(value) {

    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }


  function formatDate(value) {

    if (!value) {
      return 'Not available';
    }

    const raw =
      String(value);

    const normalized =
      raw.includes('T')
        ? raw
        : raw.replace(' ', 'T') + 'Z';

    const date =
      new Date(normalized);

    if (Number.isNaN(date.getTime())) {
      return raw;
    }

    return date.toLocaleString();
  }


  function formatProductType(value) {

    const labels = {
      digital_qr: 'Digital QR',
      lifepatch: 'LifePatch™',
      lifeband: 'LifeBand™',
      lifecard: 'LifeCard™',
      lifetag: 'LifeTag™'
    };

    return labels[value] || value || 'Identifier';
  }


  function formatAuditAction(value) {

    const labels = {
      identifier_deactivated:
        'Identifier deactivated',

      identifier_reactivated:
        'Identifier reactivated',

      identifier_issued:
        'Identifier issued'
    };

    return labels[value] ||
      String(value || 'Administrative action')
        .replace(/_/g, ' ');
  }


  function safeFileName(value) {

    return String(value || 'OneProfile-QR')
      .trim()
      .replace(/[^\w\-]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 70) || 'OneProfile-QR';
  }


  function showError(message) {

    loadingState.hidden = true;
    profileRecord.hidden = true;
    errorState.hidden = false;

    errorMessage.textContent =
      message ||
      'Please return to the directory and try again.';

    page.style.display = '';
  }


  function renderIssuedIdentifier(data) {

    if (
      !issuedIdentifierResult ||
      !issuedIdentifierDetails ||
      !issuedQrCode ||
      !issuedScanLink ||
      !data?.identifier ||
      !data?.scan_url
    ) {
      return;
    }


    const item =
      data.identifier;


    const productName =
      formatProductType(
        item.product_type
      );


    const displayLabel =
      item.label ||
      productName;


    currentIssuedIdentifier = {
      id:
        item.id,

      label:
        displayLabel,

      scanUrl:
        data.scan_url
    };


    issuedIdentifierDetails.innerHTML = `
      <div>
        <strong>
          ${escapeHtml(displayLabel)}
        </strong>
      </div>

      <div>
        Type:
        <strong>
          ${escapeHtml(productName)}
        </strong>
      </div>

      <div>
        Identifier ID:
        <strong>
          ${escapeHtml(item.id)}
        </strong>
      </div>

      <div>
        Status:
        <strong>
          Active
        </strong>
      </div>

      <p style="margin-bottom:0;">
        This QR code opens the participant's
        emergency OneProfile™ scan page.
      </p>
    `;


    issuedQrCode.innerHTML =
      '';


    if (
      typeof QRCode !== 'undefined'
    ) {

      new QRCode(
        issuedQrCode,
        {
          text:
            data.scan_url,

          width:
            220,

          height:
            220,

          correctLevel:
            QRCode.CorrectLevel.H
        }
      );

    } else {

      issuedQrCode.innerHTML = `
        <p>
          QR preview is temporarily unavailable.
          The scan link below is still active.
        </p>
      `;
    }


    issuedScanLink.href =
      data.scan_url;


    issuedIdentifierResult.hidden =
      false;
  }


  function downloadQr() {

    if (
      !currentIssuedIdentifier ||
      !issuedQrCode
    ) {

      window.alert(
        'No newly issued QR is available to download.'
      );

      return;
    }


    const image =
      issuedQrCode.querySelector('img');


    const canvas =
      issuedQrCode.querySelector('canvas');


    let imageUrl = '';


    if (
      image &&
      image.src
    ) {

      imageUrl =
        image.src;

    } else if (canvas) {

      imageUrl =
        canvas.toDataURL(
          'image/png'
        );
    }


    if (!imageUrl) {

      window.alert(
        'The QR image is not ready yet. Please try again.'
      );

      return;
    }


    const fileName =
      `${safeFileName(
        currentIssuedIdentifier.label
      )}-ID-${currentIssuedIdentifier.id}-QR.png`;


    const link =
      document.createElement('a');


    link.href =
      imageUrl;

    link.download =
      fileName;


    document.body.appendChild(
      link
    );


    link.click();


    link.remove();
  }


  function renderAuditLog(entries) {

    if (!staffActions) {
      return;
    }


    const rows =
      Array.isArray(entries)
        ? entries
        : [];


    if (!rows.length) {

      staffActions.innerHTML = `
        <p style="margin-bottom:0;">
          No administrative actions have
          been recorded for this enrollment.
        </p>
      `;

      return;
    }


    staffActions.innerHTML =
      rows.map(entry => {

        let details = {};

        if (entry.details) {

          try {

            details =
              JSON.parse(
                entry.details
              );

          } catch {

            details = {};
          }
        }


        const action =
          formatAuditAction(
            entry.action
          );


        const identifierLabel =
          details.label ||
          (
            entry.identifier_id
              ? `Identifier #${entry.identifier_id}`
              : 'OneProfile™ record'
          );


        const productType =
          details.product_type
            ? formatProductType(
                details.product_type
              )
            : '';


        return `
          <div
            style="
              border-top:1px solid #d8e3ea;
              padding:16px 0;
            "
          >

            <div>
              <strong>
                ${escapeHtml(action)}
              </strong>
            </div>

            <div>
              Identifier:
              <strong>
                ${escapeHtml(identifierLabel)}
              </strong>
            </div>

            ${
              productType
                ? `
                  <div>
                    Type:
                    <strong>
                      ${escapeHtml(productType)}
                    </strong>
                  </div>
                `
                : ''
            }

            ${
              entry.identifier_id
                ? `
                  <div>
                    Identifier ID:
                    <strong>
                      ${escapeHtml(
                        entry.identifier_id
                      )}
                    </strong>
                  </div>
                `
                : ''
            }

            <div>
              Staff:
              <strong>
                ${escapeHtml(
                  entry.staff_email ||
                  'Authorized RATIOS staff'
                )}
              </strong>
            </div>

            <div>
              Date:
              <strong>
                ${escapeHtml(
                  formatDate(
                    entry.created_at
                  )
                )}
              </strong>
            </div>

          </div>
        `;
      }).join('');
  }


  async function issueIdentifier() {

    const productType =
      String(
        identifierType?.value || ''
      )
        .trim()
        .toLowerCase();


    const label =
      String(
        identifierLabel?.value || ''
      )
        .trim();


    if (!productType) {

      issueIdentifierMessage.textContent =
        'Please select an identifier type.';

      return;
    }


    const productName =
      formatProductType(
        productType
      );


    const displayLabel =
      label || productName;


    const confirmed =
      window.confirm(
        `Issue a new ${productName} labeled "${displayLabel}" for this participant?`
      );


    if (!confirmed) {
      return;
    }


    issueIdentifierButton.disabled =
      true;

    issueIdentifierMessage.textContent =
      'Issuing identifier…';


    currentIssuedIdentifier =
      null;


    if (issuedIdentifierResult) {
      issuedIdentifierResult.hidden =
        true;
    }


    try {

      const response =
        await fetch(
          '/api/admin-issue-identifier',
          {
            method: 'POST',
            credentials: 'same-origin',

            headers: {
              'Content-Type':
                'application/json',

              'Accept':
                'application/json'
            },

            body: JSON.stringify({
              enrollment_id:
                currentEnrollmentId,

              product_type:
                productType,

              label:
                label
            })
          }
        );


      const data =
        await response.json();


      if (
        response.status === 401 ||
        !data.authenticated
      ) {

        location.replace(
          'admin-login.html'
        );

        return;
      }


      if (
        !response.ok ||
        !data.ok
      ) {

        throw new Error(
          data.error ||
          'Unable to issue this identifier.'
        );
      }


      identifierType.value =
        '';

      identifierLabel.value =
        '';

      issueIdentifierMessage.textContent =
        'Identifier issued successfully.';


      renderIssuedIdentifier(
        data
      );


      await loadProfile();


    } catch (error) {

      console.error(
        'Admin issue identifier error:',
        error
      );


      issueIdentifierMessage.textContent =
        error.message ||
        'Unable to issue this identifier. Please try again.';

    } finally {

      issueIdentifierButton.disabled =
        false;
    }
  }


  async function changeIdentifierStatus(
    identifierId,
    newStatus,
    label
  ) {

    const actionWord =
      newStatus === 'active'
        ? 'reactivate'
        : 'deactivate';


    const confirmed =
      window.confirm(
        `Are you sure you want to ${actionWord} "${label}"?`
      );


    if (!confirmed) {
      return;
    }


    try {

      const response =
        await fetch(
          '/api/admin-identifier-status',
          {
            method: 'POST',
            credentials: 'same-origin',

            headers: {
              'Content-Type':
                'application/json',

              'Accept':
                'application/json'
            },

            body: JSON.stringify({
              enrollment_id:
                currentEnrollmentId,

              identifier_id:
                Number(identifierId),

              status:
                newStatus
            })
          }
        );


      const data =
        await response.json();


      if (
        response.status === 401 ||
        !data.authenticated
      ) {

        location.replace(
          'admin-login.html'
        );

        return;
      }


      if (
        !response.ok ||
        !data.ok
      ) {

        throw new Error(
          data.error ||
          'Unable to update this identifier.'
        );
      }


      await loadProfile();


    } catch (error) {

      console.error(
        'Admin identifier update error:',
        error
      );


      window.alert(
        error.message ||
        'Unable to update this identifier. Please try again.'
      );
    }
  }


  function bindIdentifierButtons() {

    const buttons =
      document.querySelectorAll(
        '[data-identifier-action]'
      );


    buttons.forEach(button => {

      button.addEventListener(
        'click',
        async () => {

          const identifierId =
            button.dataset.identifierId;

          const newStatus =
            button.dataset.newStatus;

          const label =
            button.dataset.label ||
            'this identifier';


          button.disabled = true;


          try {

            await changeIdentifierStatus(
              identifierId,
              newStatus,
              label
            );

          } finally {

            button.disabled = false;
          }
        }
      );
    });
  }


  function renderIdentifiers(identifiers) {

    const rows =
      Array.isArray(identifiers)
        ? identifiers
        : [];


    const activeCount =
      rows.filter(
        item =>
          String(item.status || '')
            .toLowerCase() === 'active'
      ).length;


    const totalScans =
      rows.reduce(
        (sum, item) =>
          sum +
          Number(
            item.scan_count || 0
          ),
        0
      );


    let latestScan = null;


    for (const item of rows) {

      if (!item.last_scanned_at) {
        continue;
      }


      const current =
        new Date(
          String(item.last_scanned_at)
            .replace(' ', 'T') + 'Z'
        );


      if (
        !Number.isNaN(
          current.getTime()
        ) &&
        (
          !latestScan ||
          current > latestScan
        )
      ) {

        latestScan =
          current;
      }
    }


    let html = `
      <div style="margin-bottom:18px;">

        <div>
          Active identifiers:
          <strong>
            ${activeCount}
          </strong>
        </div>

        <div>
          Total identifiers:
          <strong>
            ${rows.length}
          </strong>
        </div>

        <div>
          Total scans:
          <strong>
            ${totalScans}
          </strong>
        </div>

        <div>
          Last scan:
          <strong>
            ${
              latestScan
                ? escapeHtml(
                    latestScan.toLocaleString()
                  )
                : 'No scans yet'
            }
          </strong>
        </div>

      </div>
    `;


    if (!rows.length) {

      html += `
        <p style="margin-bottom:0;">
          No identifiers have been issued
          for this enrollment.
        </p>
      `;


      identifierSummary.innerHTML =
        html;

      return;
    }


    html +=
      rows.map(item => {

        const status =
          String(
            item.status || 'unknown'
          )
            .trim()
            .toLowerCase();


        const isActive =
          status === 'active';


        const newStatus =
          isActive
            ? 'inactive'
            : 'active';


        const buttonText =
          isActive
            ? 'Deactivate identifier'
            : 'Reactivate identifier';


        const label =
          item.label ||
          formatProductType(
            item.product_type
          );


        return `
          <div
            style="
              border-top:1px solid #d8e3ea;
              padding:16px 0;
            "
          >

            <div>
              <strong>
                ${escapeHtml(label)}
              </strong>
            </div>

            <div>
              Type:
              <strong>
                ${escapeHtml(
                  formatProductType(
                    item.product_type
                  )
                )}
              </strong>
            </div>

            <div>
              Status:
              <strong>
                ${escapeHtml(status)}
              </strong>
            </div>

            <div>
              Identifier ID:
              <strong>
                ${escapeHtml(item.id)}
              </strong>
            </div>

            <div>
              Scans:
              <strong>
                ${Number(
                  item.scan_count || 0
                )}
              </strong>
            </div>

            <div>
              Last scanned:
              <strong>
                ${escapeHtml(
                  item.last_scanned_at
                    ? formatDate(
                        item.last_scanned_at
                      )
                    : 'No scans yet'
                )}
              </strong>
            </div>

            <div>
              Issued:
              <strong>
                ${escapeHtml(
                  formatDate(
                    item.created_at
                  )
                )}
              </strong>
            </div>

            <div style="margin-top:12px;">

              <button
                type="button"
                data-identifier-action
                data-identifier-id="${escapeHtml(item.id)}"
                data-new-status="${escapeHtml(newStatus)}"
                data-label="${escapeHtml(label)}"
              >
                ${escapeHtml(buttonText)}
              </button>

            </div>

          </div>
        `;
      }).join('');


    identifierSummary.innerHTML =
      html;


    bindIdentifierButtons();
  }


  async function loadProfile() {

    try {

      const params =
        new URLSearchParams(
          window.location.search
        );


      const enrollmentId =
        String(
          params.get('id') || ''
        )
          .trim()
          .toUpperCase();


      if (
        !/^RAT-OP-[A-Z0-9]{8}$/.test(
          enrollmentId
        )
      ) {

        showError(
          'A valid OneProfile™ enrollment ID was not provided.'
        );

        return;
      }


      currentEnrollmentId =
        enrollmentId;


      const sessionResponse =
        await fetch(
          '/api/admin-session',
          {
            method: 'GET',
            credentials:
              'same-origin',

            headers: {
              'Accept':
                'application/json'
            }
          }
        );


      const sessionData =
        await sessionResponse.json();


      if (
        !sessionResponse.ok ||
        !sessionData.authenticated
      ) {

        location.replace(
          'admin-login.html'
        );

        return;
      }


      const response =
        await fetch(
          `/api/admin-profile-detail?id=${encodeURIComponent(enrollmentId)}`,
          {
            method: 'GET',
            credentials:
              'same-origin',

            headers: {
              'Accept':
                'application/json'
            }
          }
        );


      const data =
        await response.json();


      if (
        response.status === 401 ||
        !data.authenticated
      ) {

        location.replace(
          'admin-login.html'
        );

        return;
      }


      if (
        response.status === 404
      ) {

        showError(
          'This OneProfile™ enrollment could not be found.'
        );

        return;
      }


      if (!response.ok) {

        throw new Error(
          data.error ||
          'Unable to load OneProfile™ data.'
        );
      }


      const profile =
        data.profile;


      if (!profile) {

        showError(
          'This OneProfile™ enrollment could not be found.'
        );

        return;
      }


      participantName.textContent =
        profile.participant_first_name ||
        'Participant';


      enrollmentIdElement.textContent =
        profile.enrollment_id;


      participantDetails.innerHTML = `
        <div>
          Age range:
          <strong>
            ${escapeHtml(
              profile.participant_age_range ||
              'Not provided'
            )}
          </strong>
        </div>

        <div>
          Location:
          <strong>
            ${escapeHtml(
              [
                profile.city,
                profile.state
              ]
                .filter(Boolean)
                .join(', ') ||
              'Not provided'
            )}
          </strong>
        </div>

        <div>
          Enrolled:
          <strong>
            ${escapeHtml(
              formatDate(
                profile.created_at
              )
            )}
          </strong>
        </div>
      `;


      const caregiverName =
        [
          profile.caregiver_first_name,
          profile.caregiver_last_name
        ]
          .filter(Boolean)
          .join(' ') ||
        'Not provided';


      caregiverDetails.innerHTML = `
        <div>
          <strong>
            ${escapeHtml(
              caregiverName
            )}
          </strong>
        </div>

        <div>
          ${escapeHtml(
            profile.relationship ||
            'Relationship not provided'
          )}
        </div>

        <div>
          ${escapeHtml(
            profile.caregiver_email ||
            'Email not provided'
          )}
        </div>

        <div>
          Preferred contact:
          <strong>
            ${escapeHtml(
              profile.preferred_contact ||
              'Not provided'
            )}
          </strong>
        </div>
      `;


      const sharingOn =
        Number(
          profile.public_profile_enabled
        ) === 1;


      profileStatus.innerHTML = `
        <div>
          Profile:
          <strong>
            ${escapeHtml(
              profile.profile_status ||
              'setup_needed'
            )}
          </strong>
        </div>

        <div>
          Emergency sharing:
          <strong>
            ${
              sharingOn
                ? 'ON'
                : 'OFF'
            }
          </strong>
        </div>

        <div>
          Last profile update:
          <strong>
            ${escapeHtml(
              profile.profile_updated_at
                ? formatDate(
                    profile.profile_updated_at
                  )
                : 'Not available'
            )}
          </strong>
        </div>
      `;


      renderIdentifiers(
        data.identifiers
      );


      renderAuditLog(
        data.audit_log
      );


      loadingState.hidden =
        true;

      errorState.hidden =
        true;

      profileRecord.hidden =
        false;

      page.style.display =
        '';


    } catch (error) {

      console.error(
        'Admin profile error:',
        error
      );


      showError(
        'Unable to load this OneProfile™ record. Please try again.'
      );
    }
  }


  if (issueIdentifierForm) {

    issueIdentifierForm.addEventListener(
      'submit',
      async event => {

        event.preventDefault();

        await issueIdentifier();
      }
    );
  }


  if (downloadIssuedQr) {

    downloadIssuedQr.addEventListener(
      'click',
      downloadQr
    );
  }


  loadProfile();

})();