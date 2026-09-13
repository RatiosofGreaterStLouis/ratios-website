(async () => {

  const loading =
    document.getElementById(
      'portalLoading'
    );

  const content =
    document.getElementById(
      'portalContent'
    );

  const previewButton =
    document.getElementById(
      'previewEmergencyButton'
    );

  const manageIdentifiersButton =
    document.getElementById(
      'manageIdentifiersButton'
    );

  const progressBar =
    document.querySelector(
      '.opc-progress span'
    );


  const safe = value =>
    String(
      value ?? ''
    );


  const hasValue = value =>
    value !== null &&
    value !== undefined &&
    String(value).trim() !== '';


  /* -----------------------------------------
     Find OneProfile™ public sharing token
     ----------------------------------------- */

  const findPublicToken = data => {

    if (!data) {
      return '';
    }

    const candidates = [

      data.public_token,

      data.publicToken,

      data.token,

      data.profile?.public_token,

      data.profile?.publicToken,

      data.sharing?.public_token,

      data.sharing?.publicToken

    ];


    for (
      const candidate
      of candidates
    ) {

      if (
        hasValue(
          candidate
        )
      ) {

        return String(
          candidate
        ).trim();
      }

    }


    return '';
  };


  /* -----------------------------------------
     Extract public token from preview URL
     ----------------------------------------- */

  const findTokenFromUrl = data => {

    if (!data) {
      return '';
    }


    const possibleUrls = [

      data.preview_url,

      data.previewUrl,

      data.public_url,

      data.publicUrl,

      data.url,

      data.profile?.preview_url,

      data.profile?.previewUrl,

      data.profile?.public_url,

      data.profile?.publicUrl,

      data.sharing?.preview_url,

      data.sharing?.public_url

    ];


    for (
      const possibleUrl
      of possibleUrls
    ) {

      if (
        !hasValue(
          possibleUrl
        )
      ) {
        continue;
      }


      try {

        const parsed =
          new URL(
            possibleUrl,
            window.location.origin
          );


        const token =
          parsed.searchParams.get(
            'id'
          );


        if (
          hasValue(
            token
          )
        ) {

          return token.trim();
        }


      } catch (_) {

        /* Ignore invalid URL values. */

      }

    }


    return '';
  };


  try {

    /* -----------------------------------------
       Load caregiver session + dashboard data
       ----------------------------------------- */

    const sessionResponse =
      await fetch(
        '/api/caregiver-session',
        {
          credentials:
            'same-origin',

          cache:
            'no-store',

          headers: {
            'Accept':
              'application/json'
          }
        }
      );


    if (
      !sessionResponse.ok
    ) {

      location.replace(
        'caregiver-login.html'
      );

      return;
    }


    const data =
      await sessionResponse.json();


    if (
      !data.authenticated
    ) {

      location.replace(
        'caregiver-login.html'
      );

      return;
    }


    const e =
      data.enrollment || {};

    const p =
      data.profile || {};


    /* -----------------------------------------
       Basic participant information
       ----------------------------------------- */

    document
      .getElementById(
        'caregiverName'
      )
      .textContent =
        safe(
          e.caregiver_first_name
        );


    document
      .getElementById(
        'participantName'
      )
      .textContent =
        safe(
          e.participant_first_name
        );


    document
      .getElementById(
        'participantInitial'
      )
      .textContent =
        safe(
          e.participant_first_name
        )
          .slice(
            0,
            1
          )
          .toUpperCase() ||
        '1';


    document
      .getElementById(
        'enrollmentId'
      )
      .textContent =
        safe(
          e.enrollment_id
        );


    document
      .getElementById(
        'ageRange'
      )
      .textContent =
        safe(
          e.participant_age_range
        );


    document
      .getElementById(
        'relationship'
      )
      .textContent =
        safe(
          e.relationship
        );


    document
      .getElementById(
        'location'
      )
      .textContent =
        [
          safe(
            e.city
          ),
          safe(
            e.state
          )
        ]
          .filter(Boolean)
          .join(', ');


    document
      .getElementById(
        'preferredContact'
      )
      .textContent =
        safe(
          e.preferred_contact
        );


    /* -----------------------------------------
       Load private profile details
       ----------------------------------------- */

    let details = {};


    try {

      const profileResponse =
        await fetch(
          '/api/caregiver-profile',
          {
            credentials:
              'same-origin',

            cache:
              'no-store',

            headers: {
              'Accept':
                'application/json'
            }
          }
        );


      if (
        profileResponse.ok
      ) {

        const profileData =
          await profileResponse.json();


        details =
          profileData.details ||
          {};

      }


    } catch (_) {

      details = {};

    }


    /* -----------------------------------------
       Load active identifiers

       Identifiers are used only for readiness.
       They are NOT used to build the caregiver
       Emergency Preview URL.
       ----------------------------------------- */

    let activeIdentifier =
      null;


    try {

      const identifierResponse =
        await fetch(
          '/api/caregiver-identifiers',
          {
            credentials:
              'same-origin',

            cache:
              'no-store',

            headers: {
              'Accept':
                'application/json'
            }
          }
        );


      if (
        identifierResponse.ok
      ) {

        const identifierData =
          await identifierResponse.json();


        const identifiers =
          Array.isArray(
            identifierData.identifiers
          )
            ? identifierData.identifiers
            : [];


        activeIdentifier =
          identifiers.find(
            item =>
              item.status ===
              'active'
          ) ||
          null;

      }


    } catch (_) {

      activeIdentifier =
        null;

    }


    /* -----------------------------------------
       Emergency readiness calculation
       ----------------------------------------- */

    const sharingEnabled =
      Number(
        p.public_profile_enabled
      ) === 1;


    const identifierReady =
      Boolean(
        activeIdentifier
      );


    const readinessItems = [

      hasValue(
        details.communication_method
      ),

      hasValue(
        details.safety_risk_level
      ),

      hasValue(
        details.emergency_contact_name
      ),

      hasValue(
        details.emergency_contact_relationship
      ),

      hasValue(
        details.emergency_contact_phone
      ),

      sharingEnabled,

      identifierReady

    ];


    const completedItems =
      readinessItems
        .filter(Boolean)
        .length;


    const totalItems =
      readinessItems.length;


    const readinessPercent =
      Math.round(
        (
          completedItems /
          totalItems
        ) *
        100
      );


    /* -----------------------------------------
       Automatic profile status
       ----------------------------------------- */

    const requiredProfileComplete =

      hasValue(
        details.communication_method
      ) &&

      hasValue(
        details.safety_risk_level
      ) &&

      hasValue(
        details.emergency_contact_name
      ) &&

      hasValue(
        details.emergency_contact_relationship
      ) &&

      hasValue(
        details.emergency_contact_phone
      );


    let status =
      'Setup needed';


    if (
      requiredProfileComplete &&
      sharingEnabled &&
      identifierReady
    ) {

      status =
        'Emergency ready';

    } else if (
      completedItems > 0
    ) {

      status =
        'In progress';

    }


    document
      .getElementById(
        'profileStatus'
      )
      .textContent =
        status;


    /* -----------------------------------------
       Dynamic status message
       ----------------------------------------- */

    const statusMessage =
      document.getElementById(
        'profileStatusMessage'
      );


    if (
      statusMessage
    ) {

      if (
        status ===
        'Emergency ready'
      ) {

        statusMessage.textContent =
          'This OneProfile™ is ready for emergency use. Keep safety information, emergency contacts, sharing settings, and identifiers current.';

      } else if (
        status ===
        'In progress'
      ) {

        statusMessage.textContent =
          'Your OneProfile™ is being built. Complete the remaining emergency information, enable sharing, and make sure an active identifier is assigned.';

      } else {

        statusMessage.textContent =
          'Start building the private OneProfile™ safety record. Emergency information is only shared publicly when you choose to enable sharing.';

      }

    }


    /* -----------------------------------------
       Dynamic readiness progress bar
       ----------------------------------------- */

    if (
      progressBar
    ) {

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
        String(
          readinessPercent
        )
      );


      progressBar.title =
        `Emergency readiness: ${readinessPercent}%`;

    }


    /* -----------------------------------------
       Manage identifiers

       This button always belongs to the
       identifier management workflow.
       ----------------------------------------- */

    if (
      manageIdentifiersButton
    ) {

      manageIdentifiersButton.href =
        'identifier-manager.html';

    }


    /* -----------------------------------------
       OneProfile™ Emergency Preview

       Uses the PUBLIC PROFILE token.

       Does NOT use an identifier token.
       ----------------------------------------- */

    if (
      previewButton
    ) {

      let publicToken =
        findPublicToken(
          p
        );


      /*
        caregiver-session may not return
        the public token.

        In that case, load the authenticated
        Emergency Sharing record.
      */

      if (
        !hasValue(
          publicToken
        )
      ) {

        try {

          const sharingResponse =
            await fetch(
              '/api/emergency-sharing',
              {
                credentials:
                  'same-origin',

                cache:
                  'no-store',

                headers: {
                  'Accept':
                    'application/json'
                }
              }
            );


          if (
            sharingResponse.status ===
            401
          ) {

            location.replace(
              'caregiver-login.html'
            );

            return;
          }


          if (
            sharingResponse.ok
          ) {

            const sharingData =
              await sharingResponse.json();


            publicToken =
              findPublicToken(
                sharingData
              ) ||
              findTokenFromUrl(
                sharingData
              );

          }


        } catch (_) {

          publicToken = '';

        }

      }


      if (
        sharingEnabled &&
        hasValue(
          publicToken
        )
      ) {

        previewButton.href =
          `emergency.html?id=${encodeURIComponent(
            publicToken
          )}`;


        previewButton.target =
          '_blank';


        previewButton.rel =
          'noopener noreferrer';


      } else {

        /*
          Safe fallback:
          if sharing is disabled or no preview
          token exists, return the caregiver
          to Emergency Sharing.

          Never fall back to a QR or identifier.
        */

        previewButton.href =
          'emergency-sharing.html';


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

    loading.hidden =
      true;


    content.hidden =
      false;


  } catch (_) {

    location.replace(
      'caregiver-login.html'
    );

  }


  /* -----------------------------------------
     Sign out
     ----------------------------------------- */

  document
    .getElementById(
      'logoutButton'
    )
    .addEventListener(
      'click',
      async () => {

        const button =
          document.getElementById(
            'logoutButton'
          );


        button.disabled =
          true;


        try {

          await fetch(
            '/api/caregiver-logout',
            {
              method:
                'POST',

              credentials:
                'same-origin'
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