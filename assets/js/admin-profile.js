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


  function showError(message) {

    loadingState.hidden = true;
    profileRecord.hidden = true;
    errorState.hidden = false;

    errorMessage.textContent =
      message ||
      'Please return to the directory and try again.';

    page.style.display = '';
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
        await fetch('/api/admin-session', {
          method: 'GET',
          credentials: 'same-origin',
          headers: {
            'Accept': 'application/json'
          }
        });

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
        await fetch('/api/admin-profiles', {
          method: 'GET',
          credentials: 'same-origin',
          headers: {
            'Accept': 'application/json'
          }
        });

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

      if (!response.ok) {
        throw new Error(
          data.error ||
          'Unable to load OneProfile™ data.'
        );
      }


      const profile =
        (data.profiles || []).find(
          item =>
            String(
              item.enrollment_id || ''
            ).toUpperCase() ===
            enrollmentId
        );

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
            ${escapeHtml(caregiverName)}
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
      `;


      identifierSummary.innerHTML = `
        <div>
          Active identifiers:
          <strong>
            ${Number(
              profile.active_identifier_count ||
              0
            )}
          </strong>
        </div>

        <div>
          Total identifiers:
          <strong>
            ${Number(
              profile.total_identifier_count ||
              0
            )}
          </strong>
        </div>

        <div>
          Total scans:
          <strong>
            ${Number(
              profile.scan_count ||
              0
            )}
          </strong>
        </div>

        <div>
          Last scan:
          <strong>
            ${escapeHtml(
              profile.last_scanned_at ||
              'No scans yet'
            )}
          </strong>
        </div>
      `;


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