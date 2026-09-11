(async () => {

  const loading = document.getElementById('portalLoading');
  const content = document.getElementById('portalContent');
  const previewButton = document.querySelector('.opc-preview-button');
  const progressBar = document.querySelector('.opc-progress span');

  const safe = (v) => String(v ?? '');

  const hasValue = (v) =>
    v !== null &&
    v !== undefined &&
    String(v).trim() !== '';


  try {

    /* -----------------------------------------
       Load caregiver session + dashboard data
       ----------------------------------------- */

    const sessionResponse = await fetch(
      '/api/caregiver-session',
      {
        credentials: 'same-origin'
      }
    );


    if (!sessionResponse.ok) {

      location.replace('caregiver-login.html');

      return;
    }


    const data = await sessionResponse.json();


    if (!data.authenticated) {

      location.replace('caregiver-login.html');

      return;
    }


    const e = data.enrollment;
    const p = data.profile || {};


    /* -----------------------------------------
       Basic participant information
       ----------------------------------------- */

    document.getElementById('caregiverName').textContent =
      safe(e.caregiver_first_name);


    document.getElementById('participantName').textContent =
      safe(e.participant_first_name);


    document.getElementById('participantInitial').textContent =
      safe(e.participant_first_name)
        .slice(0, 1)
        .toUpperCase() || '1';


    document.getElementById('enrollmentId').textContent =
      safe(e.enrollment_id);


    document.getElementById('ageRange').textContent =
      safe(e.participant_age_range);


    document.getElementById('relationship').textContent =
      safe(e.relationship);


    document.getElementById('location').textContent =
      [safe(e.city), safe(e.state)]
        .filter(Boolean)
        .join(', ');


    document.getElementById('preferredContact').textContent =
      safe(e.preferred_contact);



    /* -----------------------------------------
       Load private profile details
       ----------------------------------------- */

    let details = {};


    try {

      const profileResponse = await fetch(
        '/api/caregiver-profile',
        {
          credentials: 'same-origin'
        }
      );


      if (profileResponse.ok) {

        const profileData =
          await profileResponse.json();

        details =
          profileData.details || {};
      }

    } catch (_) {

      details = {};
    }



    /* -----------------------------------------
       Load active identifiers
       ----------------------------------------- */

    let activeIdentifier = null;


    try {

      const identifierResponse = await fetch(
        '/api/caregiver-identifiers',
        {
          credentials: 'same-origin'
        }
      );


      if (identifierResponse.ok) {

        const identifierData =
          await identifierResponse.json();

        const identifiers =
          identifierData.identifiers || [];


        activeIdentifier =
          identifiers.find(
            item => item.status === 'active'
          ) || null;
      }

    } catch (_) {

      activeIdentifier = null;
    }



    /* -----------------------------------------
       Emergency readiness calculation

       These are the essential items needed
       for an emergency-ready OneProfile™.

       Optional support fields can still be
       added later without preventing readiness.
       ----------------------------------------- */

    const readinessItems = [

      hasValue(details.communication_method),

      hasValue(details.safety_risk_level),

      hasValue(details.emergency_contact_name),

      hasValue(
        details.emergency_contact_relationship
      ),

      hasValue(details.emergency_contact_phone),

      Number(p.public_profile_enabled) === 1,

      Boolean(activeIdentifier)

    ];


    const completedItems =
      readinessItems.filter(Boolean).length;


    const totalItems =
      readinessItems.length;


    const readinessPercent =
      Math.round(
        (completedItems / totalItems) * 100
      );



    /* -----------------------------------------
       Automatic profile status
       ----------------------------------------- */

    const requiredProfileComplete =

      hasValue(details.communication_method) &&

      hasValue(details.safety_risk_level) &&

      hasValue(details.emergency_contact_name) &&

      hasValue(
        details.emergency_contact_relationship
      ) &&

      hasValue(details.emergency_contact_phone);


    const sharingEnabled =
      Number(p.public_profile_enabled) === 1;


    const identifierReady =
      Boolean(activeIdentifier);


    let status =
      'Setup needed';


    if (
      requiredProfileComplete &&
      sharingEnabled &&
      identifierReady
    ) {

      status = 'Emergency ready';

    } else if (completedItems > 0) {

      status = 'In progress';
    }


    document.getElementById(
      'profileStatus'
    ).textContent = status;



    /* -----------------------------------------
       Dynamic readiness progress bar
       ----------------------------------------- */

    if (progressBar) {

      progressBar.style.width =
        `${readinessPercent}%`;

      progressBar.style.transition =
        'width .4s ease';

      progressBar.setAttribute(
        'role',
        'progressbar'
      );

      progressBar.setAttribute(
        'aria-valuemin',
        '0'
      );

      progressBar.setAttribute(
        'aria-valuemax',
        '100'
      );

      progressBar.setAttribute(
        'aria-valuenow',
        String(readinessPercent)
      );

      progressBar.title =
        `Emergency readiness: ${readinessPercent}%`;
    }



    /* -----------------------------------------
       Preview emergency profile
       ----------------------------------------- */

    if (previewButton) {

      if (activeIdentifier) {

        const scanUrl =
          `/scan.html?code=${encodeURIComponent(
            activeIdentifier.identifier_token
          )}`;


        previewButton.href =
          scanUrl;


        /*
         Keep the caregiver dashboard open while
         previewing the responder-facing profile.
        */

        previewButton.target =
          '_blank';

        previewButton.rel =
          'noopener';


      } else {

        /*
         An emergency scan preview requires an
         active identifier.
        */

        previewButton.href =
          'identifier-manager.html';

        previewButton.removeAttribute(
          'target'
        );

        previewButton.removeAttribute(
          'rel'
        );
      }
    }



    /* -----------------------------------------
       Show protected dashboard
       ----------------------------------------- */

    loading.hidden = true;

    content.hidden = false;


  } catch (_) {

    location.replace(
      'caregiver-login.html'
    );
  }



  /* -----------------------------------------
     Sign out
     ----------------------------------------- */

  document
    .getElementById('logoutButton')
    .addEventListener(
      'click',
      async () => {

        const b =
          document.getElementById(
            'logoutButton'
          );


        b.disabled = true;


        try {

          await fetch(
            '/api/caregiver-logout',
            {
              method: 'POST',
              credentials: 'same-origin'
            }
          );

        } finally {

          location.replace(
            'caregiver-login.html'
          );
        }
      }
    );

})();