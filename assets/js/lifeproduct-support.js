(async () => {

  const loading =
    document.getElementById(
      'lifeProductLoading'
    );

  const content =
    document.getElementById(
      'lifeProductContent'
    );

  const form =
    document.getElementById(
      'lifeProductRequestForm'
    );

  const identifierSelect =
    document.getElementById(
      'identifierId'
    );

  const requestTypeSelect =
    document.getElementById(
      'requestType'
    );

  const caregiverNote =
    document.getElementById(
      'caregiverNote'
    );

  const submitButton =
    document.getElementById(
      'submitRequestButton'
    );

  const message =
    document.getElementById(
      'requestMessage'
    );

  const requestList =
    document.getElementById(
      'requestList'
    );

  const noPhysicalProducts =
    document.getElementById(
      'noPhysicalProducts'
    );


  const PHYSICAL_PRODUCTS =
    new Set([
      'lifepatch',
      'lifeband',
      'lifecard',
      'lifetag'
    ]);


  const PRODUCT_NAMES = {

    lifepatch:
      'LifePatch™',

    lifeband:
      'LifeBand™',

    lifecard:
      'LifeCard™',

    lifetag:
      'LifeTag™'

  };


  const REQUEST_NAMES = {

    lost:
      'Lost',

    damaged:
      'Damaged',

    not_scanning:
      'QR code is not scanning',

    fit_or_usability:
      'No longer fits or is usable',

    replacement_requested:
      'Replacement requested',

    other:
      'Other'

  };


  const STATUS_NAMES = {

    open:
      'Open',

    reviewed:
      'Reviewed',

    resolved:
      'Resolved',

    closed:
      'Closed'

  };


  const safeText = value =>
    String(
      value ?? ''
    );


  const normalizeProductType =
    value =>
      safeText(value)
        .trim()
        .toLowerCase();


  const normalizeStatus =
    value =>
      safeText(value)
        .trim()
        .toLowerCase();


  const formatDate =
    value => {

      if (!value) {
        return '';
      }


      const normalized =
        safeText(value)
          .trim()
          .replace(
            ' ',
            'T'
          );


      const date =
        new Date(
          normalized.endsWith('Z')
            ? normalized
            : `${normalized}Z`
        );


      if (
        Number.isNaN(
          date.getTime()
        )
      ) {

        return safeText(
          value
        );
      }


      return new Intl.DateTimeFormat(
        'en-US',
        {
          month:
            'short',

          day:
            'numeric',

          year:
            'numeric'
        }
      ).format(date);

    };


  const showMessage =
    (
      text,
      type = 'info'
    ) => {

      if (!message) {
        return;
      }


      message.textContent =
        text;


      message.className =
        `opc-alert ${type}`;


      message.hidden =
        false;

    };


  const hideMessage =
    () => {

      if (!message) {
        return;
      }


      message.hidden =
        true;


      message.textContent =
        '';

    };


  const productName =
    productType => {

      const normalized =
        normalizeProductType(
          productType
        );


      return (
        PRODUCT_NAMES[
          normalized
        ] ||
        'LifeProduct™'
      );

    };


  const requestName =
    requestType => {

      const normalized =
        safeText(
          requestType
        )
          .trim()
          .toLowerCase();


      return (
        REQUEST_NAMES[
          normalized
        ] ||
        normalized
          .replace(
            /_/g,
            ' '
          ) ||
        'Support request'
      );

    };


  /* -----------------------------------------
     Build physical LifeProduct selector
     ----------------------------------------- */

  const renderPhysicalProducts =
    identifiers => {

      identifierSelect.innerHTML =
        `
          <option value="">
            Select a LifeProduct
          </option>
        `;


      const physical =
        (
          Array.isArray(
            identifiers
          )
            ? identifiers
            : []
        )
          .filter(
            item => {

              const type =
                normalizeProductType(
                  item.product_type
                );


              return (
                PHYSICAL_PRODUCTS
                  .has(type) &&
                normalizeStatus(
                  item.status
                ) === 'active'
              );

            }
          );


      for (
        const item
        of physical
      ) {

        const option =
          document.createElement(
            'option'
          );


        option.value =
          String(
            item.id
          );


        const name =
          productName(
            item.product_type
          );


        const label =
          safeText(
            item.label
          ).trim();


        option.textContent =
          label
            ? `${name} — ${label}`
            : `${name} — Identifier #${item.id}`;


        identifierSelect
          .appendChild(
            option
          );

      }


      const hasProducts =
        physical.length > 0;


      noPhysicalProducts.hidden =
        hasProducts;


      identifierSelect.disabled =
        !hasProducts;


      requestTypeSelect.disabled =
        !hasProducts;


      caregiverNote.disabled =
        !hasProducts;


      submitButton.disabled =
        !hasProducts;


      return physical;

    };


  /* -----------------------------------------
     Request history
     ----------------------------------------- */

  const statusClass =
    value => {

      const status =
        normalizeStatus(
          value
        );


      if (
        status ===
        'resolved' ||
        status ===
        'closed'
      ) {
        return 'resolved';
      }


      if (
        status ===
        'reviewed'
      ) {
        return 'reviewed';
      }


      return 'open';

    };


  const renderRequests =
    requests => {

      requestList.innerHTML =
        '';


      const items =
        Array.isArray(
          requests
        )
          ? requests
          : [];


      if (
        !items.length
      ) {

        const empty =
          document.createElement(
            'div'
          );


        empty.className =
          'lps-empty';


        empty.textContent =
          'No LifeProduct support requests have been submitted yet.';


        requestList
          .appendChild(
            empty
          );


        return;
      }


      for (
        const request
        of items
      ) {

        const card =
          document.createElement(
            'article'
          );


        card.className =
          'lps-request';


        const top =
          document.createElement(
            'div'
          );


        top.className =
          'lps-request-top';


        const title =
          document.createElement(
            'div'
          );


        title.className =
          'lps-request-title';


        const product =
          productName(
            request.product_type
          );


        const productLabel =
          safeText(
            request.identifier_label
          ).trim();


        title.textContent =
          productLabel
            ? `${product} — ${productLabel}`
            : product;


        const badge =
          document.createElement(
            'span'
          );


        const status =
          normalizeStatus(
            request.request_status
          ) ||
          'open';


        badge.className =
          `lps-status ${statusClass(
            status
          )}`;


        badge.textContent =
          STATUS_NAMES[
            status
          ] ||
          status.replace(
            /_/g,
            ' '
          );


        top.append(
          title,
          badge
        );


        card.appendChild(
          top
        );


        const reason =
          document.createElement(
            'div'
          );


        reason.style.marginBottom =
          '6px';


        const reasonStrong =
          document.createElement(
            'strong'
          );


        reasonStrong.textContent =
          'Reason: ';


        reason.append(
          reasonStrong,
          document.createTextNode(
            requestName(
              request.request_type
            )
          )
        );


        card.appendChild(
          reason
        );


        if (
          safeText(
            request.caregiver_note
          ).trim()
        ) {

          const note =
            document.createElement(
              'p'
            );


          note.style.margin =
            '8px 0';


          note.style.color =
            '#526174';


          note.style.lineHeight =
            '1.5';


          note.textContent =
            request.caregiver_note;


          card.appendChild(
            note
          );

        }


        if (
          safeText(
            request.staff_note
          ).trim()
        ) {

          const staffBox =
            document.createElement(
              'div'
            );


          staffBox.style.marginTop =
            '10px';


          staffBox.style.padding =
            '10px 12px';


          staffBox.style.border =
            '1px solid #d7e6ef';


          staffBox.style.borderRadius =
            '12px';


          staffBox.style.background =
            '#f8fbfd';


          const staffLabel =
            document.createElement(
              'strong'
            );


          staffLabel.textContent =
            'RATIOS update: ';


          staffBox.append(
            staffLabel,
            document.createTextNode(
              request.staff_note
            )
          );


          card.appendChild(
            staffBox
          );

        }


        const date =
          formatDate(
            request.created_at
          );


        if (date) {

          const meta =
            document.createElement(
              'div'
            );


          meta.className =
            'opc-small';


          meta.style.marginTop =
            '10px';


          meta.textContent =
            `Submitted ${date}`;


          card.appendChild(
            meta
          );

        }


        requestList
          .appendChild(
            card
          );

      }

    };


  /* -----------------------------------------
     Load caregiver identifiers
     ----------------------------------------- */

  const loadIdentifiers =
    async () => {

      const response =
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
        response.status ===
        401
      ) {

        location.replace(
          'caregiver-login.html'
        );

        return [];
      }


      const data =
        await response.json();


      if (!response.ok) {

        throw new Error(
          data.error ||
          'Unable to load your LifeProducts.'
        );

      }


      return (
        Array.isArray(
          data.identifiers
        )
          ? data.identifiers
          : []
      );

    };


  /* -----------------------------------------
     Load support request history
     ----------------------------------------- */

  const loadRequests =
    async () => {

      const response =
        await fetch(
          '/api/lifeproduct-support',
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
        response.status ===
        401
      ) {

        location.replace(
          'caregiver-login.html'
        );

        return [];
      }


      const data =
        await response.json();


      if (!response.ok) {

        throw new Error(
          data.error ||
          'Unable to load LifeProduct requests.'
        );

      }


      return (
        Array.isArray(
          data.requests
        )
          ? data.requests
          : []
      );

    };


  /* -----------------------------------------
     Initial page load
     ----------------------------------------- */

  try {

    const [
      identifiers,
      requests
    ] =
      await Promise.all([
        loadIdentifiers(),
        loadRequests()
      ]);


    renderPhysicalProducts(
      identifiers
    );


    renderRequests(
      requests
    );


    loading.hidden =
      true;


    content.hidden =
      false;


  } catch (error) {

    console.error(
      'LifeProduct support load error:',
      error
    );


    loading.textContent =
      error.message ||
      'Unable to load LifeProduct support. Please try again.';

  }


  /* -----------------------------------------
     Submit support request
     ----------------------------------------- */

  form.addEventListener(
    'submit',
    async event => {

      event.preventDefault();


      hideMessage();


      const identifierId =
        Number(
          identifierSelect.value
        );


      const requestType =
        safeText(
          requestTypeSelect.value
        )
          .trim()
          .toLowerCase();


      const note =
        safeText(
          caregiverNote.value
        ).trim();


      if (
        !Number.isInteger(
          identifierId
        ) ||
        identifierId < 1
      ) {

        showMessage(
          'Please select a LifeProduct.',
          'info'
        );

        return;
      }


      if (
        !Object.prototype
          .hasOwnProperty.call(
            REQUEST_NAMES,
            requestType
          )
      ) {

        showMessage(
          'Please select a valid reason for your request.',
          'info'
        );

        return;
      }


      if (
        note.length > 1000
      ) {

        showMessage(
          'Your note must be 1,000 characters or fewer.',
          'info'
        );

        return;
      }


      submitButton.disabled =
        true;


      submitButton.textContent =
        'Submitting…';


      try {

        const response =
          await fetch(
            '/api/lifeproduct-support',
            {
              method:
                'POST',

              credentials:
                'same-origin',

              cache:
                'no-store',

              headers: {
                'Content-Type':
                  'application/json',

                'Accept':
                  'application/json'
              },

              body:
                JSON.stringify({

                  identifier_id:
                    identifierId,

                  request_type:
                    requestType,

                  caregiver_note:
                    note

                })
            }
          );


        if (
          response.status ===
          401
        ) {

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
            'Unable to submit this LifeProduct request.'
          );

        }


        showMessage(
          'Your LifeProduct support request was submitted to RATIOS.',
          'success'
        );


        requestTypeSelect.value =
          '';


        caregiverNote.value =
          '';


        const requests =
          await loadRequests();


        renderRequests(
          requests
        );


      } catch (error) {

        console.error(
          'LifeProduct request error:',
          error
        );


        showMessage(
          error.message ||
          'Unable to submit this request. Please try again.',
          'info'
        );


      } finally {

        submitButton.disabled =
          false;


        submitButton.textContent =
          'Submit request';

      }

    }
  );

})();