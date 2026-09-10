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


  function showError(message) {

    loadingState.hidden = true;
    profileRecord.hidden = true;
    errorState.hidden = false;

    errorMessage.textContent =
      message ||
      'Please return to the directory and try again.';

    page.style.display = '';
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
          sum + Number(item.scan_count || 0),
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
        !Number.isNaN(current.getTime()) &&
        (
          !latestScan ||
          current > latestScan
        )
      ) {
        latestScan = current;
      }
    }


    let html = `
      <div style="margin-bottom:18px;">
        <div>
          Active identifiers:
          <strong>${activeCount}</strong>
        </div>

        <div>
          Total identifiers:
          <strong>${rows.length}</strong>
        </div>

        <div>
          Total scans:
          <strong>${totalScans}</strong>
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

      identifierSummary.innerHTML = html;

      return;
    }


    html += rows.map(item => {

      const status =
        String(item.status || 'unknown');

      return `
        <div
          style="
            border-top:1px solid #d8e3ea;
            padding:16px 0;
          "
        >

          <div>
            <strong>
              ${escapeHtml(
                item.label ||
                formatProductType(
                  item.product_type
                )
              )}
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

        </div>
      `;
    }).join('');


    identifierSummary.innerHTML = html;
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


      const sessionResponse =
        await fetch(
          '/api/admin-session',
          {
            method: 'GET',
            credentials: 'same-origin',
            headers: {
              'Accept': 'application/json'
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
            credentials: 'same-origin',
            headers: {
              'Accept': 'application/json'
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


      if (response.status === 404) {

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
            ${sharingOn ? 'ON' : 'OFF'}
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


      loadingState.hidden = true;
      errorState.hidden = true;
      profileRecord.hidden = false;

      page.style.display = '';


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


  loadProfile();

})();