(() => {

  const staffEmail =
    document.getElementById('staffEmail');

  const totalProfiles =
    document.getElementById('totalProfiles');

  const activeIdentifiers =
    document.getElementById('activeIdentifiers');

  const totalScans =
    document.getElementById('totalScans');

  const profileList =
    document.getElementById('profileList');

  const profileSearch =
    document.getElementById('profileSearch');

const logoutButton =
  document.getElementById('logout');

  const page =
    document.body;

  let profiles = [];


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
      return 'No scans yet';
    }

    const date =
      new Date(
        String(value).replace(' ', 'T') + 'Z'
      );

    if (Number.isNaN(date.getTime())) {
      return String(value);
    }

    return date.toLocaleString();
  }


  function renderProfiles(rows) {

    if (!profileList) {
      return;
    }

    if (!rows.length) {

      profileList.innerHTML =
        '<p>No OneProfile™ enrollments found.</p>';

      return;
    }

    profileList.innerHTML =
      rows.map(profile => {

        const participant =
          escapeHtml(
            profile.participant_first_name ||
            'Participant'
          );

        const caregiverName =
          escapeHtml(
            [
              profile.caregiver_first_name,
              profile.caregiver_last_name
            ]
              .filter(Boolean)
              .join(' ') ||
            'Caregiver'
          );

        const caregiverEmail =
          escapeHtml(
            profile.caregiver_email || ''
          );

        const enrollmentId =
          escapeHtml(
            profile.enrollment_id || ''
          );

        const location =
          escapeHtml(
            [
              profile.city,
              profile.state
            ]
              .filter(Boolean)
              .join(', ')
          );

        const sharing =
          Number(
            profile.public_profile_enabled
          ) === 1
            ? 'Emergency sharing ON'
            : 'Emergency sharing OFF';

        return `
  <article
    onclick="location.href='admin-profile.html?id=${encodeURIComponent(profile.enrollment_id)}'"
    style="
      cursor:pointer;
            
              border:1px solid #d8e3ea;
              border-radius:18px;
              padding:20px;
            "
          >

            <div
              style="
                display:flex;
                justify-content:space-between;
                gap:18px;
                flex-wrap:wrap;
              "
            >

              <div>

                <h3 style="margin:0 0 6px;">
                  ${participant}
                </h3>

                <div
                  style="
                    font-weight:800;
                    margin-bottom:10px;
                  "
                >
                  ${enrollmentId}
                </div>

                <div>
                  Caregiver:
                  <strong>${caregiverName}</strong>
                </div>

                <div>
                  ${caregiverEmail}
                </div>

                ${
                  location
                    ? `<div>${location}</div>`
                    : ''
                }

              </div>


              <div
                style="
                  min-width:230px;
                  line-height:1.7;
                "
              >

                <div>
                  <strong>
                    ${sharing}
                  </strong>
                </div>

                <div>
                  Active identifiers:
                  <strong>
                    ${profile.active_identifier_count}
                  </strong>
                </div>

                <div>
                  Total identifiers:
                  <strong>
                    ${profile.total_identifier_count}
                  </strong>
                </div>

                <div>
                  Scans:
                  <strong>
                    ${profile.scan_count}
                  </strong>
                </div>

                <div>
                  Last scan:
                  <strong>
                    ${escapeHtml(
                      formatDate(
                        profile.last_scanned_at
                      )
                    )}
                  </strong>
                </div>

              </div>

            </div>

          </article>
        `;
      }).join('');
  }


  function filterProfiles() {

    const query =
      String(
        profileSearch?.value || ''
      )
        .trim()
        .toLowerCase();

    if (!query) {
      renderProfiles(profiles);
      return;
    }

    const filtered =
      profiles.filter(profile => {

        const searchable = [
          profile.participant_first_name,
          profile.caregiver_first_name,
          profile.caregiver_last_name,
          profile.caregiver_email,
          profile.enrollment_id,
          profile.city,
          profile.state
        ]
          .join(' ')
          .toLowerCase();

        return searchable.includes(query);
      });

    renderProfiles(filtered);
  }


  async function loadAdminDashboard() {

    try {

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

      if (
        staffEmail &&
        sessionData.staff?.email
      ) {
        staffEmail.textContent =
          sessionData.staff.email;
      }

      const dataResponse =
        await fetch('/api/admin-profiles', {
          method: 'GET',
          credentials: 'same-origin',
          headers: {
            'Accept': 'application/json'
          }
        });

      const data =
        await dataResponse.json();

      if (
        dataResponse.status === 401 ||
        !data.authenticated
      ) {
        location.replace(
          'admin-login.html'
        );
        return;
      }

      if (!dataResponse.ok) {
        throw new Error(
          data.error ||
          'Unable to load admin data.'
        );
      }

      profiles =
        Array.isArray(data.profiles)
          ? data.profiles
          : [];

      if (totalProfiles) {
        totalProfiles.textContent =
          data.stats?.total_profiles ?? 0;
      }

      if (activeIdentifiers) {
        activeIdentifiers.textContent =
          data.stats?.active_identifiers ?? 0;
      }

      if (totalScans) {
        totalScans.textContent =
          data.stats?.total_scans ?? 0;
      }

      renderProfiles(profiles);

      page.style.display = '';

    } catch (error) {

      console.error(
        'Admin dashboard error:',
        error
      );

      if (profileList) {
        profileList.innerHTML =
          '<p>Unable to load OneProfile™ data. Please refresh and try again.</p>';
      }

      page.style.display = '';
    }
  }


  if (profileSearch) {
    profileSearch.addEventListener(
      'input',
      filterProfiles
    );
  }

if (logoutButton) {

  logoutButton.addEventListener(
    'click',
    async () => {

      logoutButton.disabled = true;
      logoutButton.textContent =
        'Signing out…';

      try {

        const response =
          await fetch('/api/admin-logout', {
            method: 'POST',
            credentials: 'same-origin',
            headers: {
              'Accept': 'application/json'
            }
          });

        if (!response.ok) {
          throw new Error(
            'Unable to sign out.'
          );
        }

        location.replace(
          'admin-login.html'
        );

      } catch (error) {

        console.error(
          'Admin logout error:',
          error
        );

        logoutButton.disabled = false;
        logoutButton.textContent =
          'Sign out';

        alert(
          'Unable to sign out. Please try again.'
        );
      }
    }
  );
}
  loadAdminDashboard();

})();