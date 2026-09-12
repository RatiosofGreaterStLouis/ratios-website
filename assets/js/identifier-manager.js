(async () => {

  const list =
    document.getElementById('identifierList');

  const msg =
    document.getElementById('message');

  const note =
    document.getElementById('sharingNote');


  const labels = {
    digital_qr:
      'Digital QR',

    lifepatch:
      'LifePatch™',

    lifeband:
      'LifeBand™',

    lifecard:
      'LifeCard™',

    lifetag:
      'LifeTag™'
  };


  let items = [];


  function esc(value) {

    return String(
      value ?? ''
    ).replace(
      /[&<>"']/g,
      character => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
      }[character])
    );

  }


  function isDigitalQr(item) {

    return String(
      item?.product_type || ''
    )
      .trim()
      .toLowerCase() ===
      'digital_qr';

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


    if (
      Number.isNaN(
        date.getTime()
      )
    ) {
      return raw;
    }


    return date.toLocaleString();

  }


  function productLabel(item) {

    return labels[
      item?.product_type
    ] ||
    item?.product_type ||
    'Identifier';

  }


  function productDisplayName(item) {

    return item?.label ||
      productLabel(item);

  }


  /* -----------------------------------------
     Draw identifiers
     ----------------------------------------- */

  function draw() {

    if (!items.length) {

      list.innerHTML = `
        <p>
          No identifiers have been created
          or assigned yet.
        </p>
      `;

      return;

    }


    list.innerHTML =
      items.map(item => {

        const digitalQr =
          isDigitalQr(item);


        const active =
          String(
            item.status || ''
          )
            .trim()
            .toLowerCase() ===
          'active';


        const typeName =
          productLabel(item);


        const displayName =
          productDisplayName(item);


        const scanCount =
          Number(
            item.scan_count || 0
          );


        const scanText =
          `${scanCount} scan${scanCount === 1 ? '' : 's'}`;


        const scanUrl =
          digitalQr &&
          item.identifier_token

            ? `${location.origin}/scan.html?code=${encodeURIComponent(
                item.identifier_token
              )}`

            : '';


        return `
          <article class="id-item">

            <div>

              <span class="id-type">
                ${esc(typeName)}
              </span>

              <h3>
                ${esc(displayName)}
              </h3>

              <p
                class="
                  id-status
                  ${active ? 'active' : 'inactive'}
                "
              >
                ${active ? 'Active' : 'Inactive'}
                ·
                ${esc(scanText)}
              </p>


              ${
                digitalQr
                  ? `
                    <p class="id-small">
                      Caregiver-created Digital QR
                    </p>
                  `
                  : `
                    <p class="id-small">
                      RATIOS-issued physical LifeProduct
                    </p>
                  `
              }


              ${
                item.last_scanned_at
                  ? `
                    <p class="id-small">
                      Last scan:
                      ${esc(
                        formatDate(
                          item.last_scanned_at
                        )
                      )}
                    </p>
                  `
                  : `
                    <p class="id-small">
                      Last scan:
                      No scans yet
                    </p>
                  `
              }


              ${
                item.created_at
                  ? `
                    <p class="id-small">
                      ${
                        digitalQr
                          ? 'Created'
                          : 'Issued'
                      }:
                      ${esc(
                        formatDate(
                          item.created_at
                        )
                      )}
                    </p>
                  `
                  : ''
              }

            </div>


            ${
              digitalQr
                ? renderDigitalQrControls(
                    item,
                    scanUrl,
                    active
                  )
                : renderPhysicalProductDetails(
                    item,
                    active
                  )
            }

          </article>
        `;

      }).join('');


    generateDigitalQrCodes();

    bindCopyButtons();

    bindDownloadButtons();

    bindDigitalQrStatusButtons();

  }


  /* -----------------------------------------
     Digital QR controls
     ----------------------------------------- */

  function renderDigitalQrControls(
    item,
    scanUrl,
    active
  ) {

    if (!scanUrl) {

      return `
        <div
          style="
            margin-top:20px;
            padding:18px;
            background:#fff8e8;
            border:1px solid #efcf84;
            border-radius:16px;
          "
        >

          <strong>
            Digital QR unavailable
          </strong>

          <p
            class="id-small"
            style="margin-bottom:0;"
          >
            This Digital QR could not be loaded.
            Please refresh the page or contact RATIOS
            if the problem continues.
          </p>

        </div>
      `;

    }


    return `
      <!-- DIGITAL QR -->

      <div
        style="
          margin:20px 0;
          padding:20px;
          background:#ffffff;
          border:1px solid #d8e3ea;
          border-radius:18px;
          display:flex;
          flex-direction:column;
          align-items:center;
          gap:12px;
        "
      >

        <p
          style="
            margin:0;
            font-weight:800;
            color:#07172e;
          "
        >
          OneProfile™ Digital QR
        </p>


        <div
          id="qr-${item.id}"
          class="oneprofile-qr"
          data-url="${esc(scanUrl)}"
          style="
            padding:12px;
            background:#ffffff;
            border-radius:12px;
          "
        ></div>


        <p
          class="id-small"
          style="
            margin:0;
            text-align:center;
            max-width:340px;
          "
        >
          This QR opens the caregiver-approved
          emergency OneProfile™ when emergency
          sharing is enabled.
        </p>


        <button
          type="button"
          class="download-qr ev-secondary"
          data-id="${esc(item.id)}"
        >
          Download QR
        </button>

      </div>


      <!-- DIGITAL QR LINK -->

      <div class="id-linkrow">

        <input
          value="${esc(scanUrl)}"
          readonly
        >

        <button
          type="button"
          class="copy"
          data-url="${esc(scanUrl)}"
        >
          Copy link
        </button>

      </div>


      <!-- DIGITAL QR ACTIONS -->

      <div class="id-actions">

        <a
          class="ev-secondary"
          href="${esc(scanUrl)}"
          target="_blank"
          rel="noopener"
        >
          Test scan
        </a>


        <button
          type="button"
          class="
            toggle-digital
            ${active ? 'danger' : ''}
          "
          data-id="${esc(item.id)}"
          data-active="${active ? '0' : '1'}"
        >
          ${
            active
              ? 'Deactivate Digital QR'
              : 'Reactivate Digital QR'
          }
        </button>

      </div>
    `;

  }


  /* -----------------------------------------
     Physical LifeProduct details
     ----------------------------------------- */

  function renderPhysicalProductDetails(
    item,
    active
  ) {

    const typeName =
      productLabel(item);


    return `
      <div
        style="
          margin-top:20px;
          padding:20px;
          background:#f8fbfd;
          border:1px solid #d8e3ea;
          border-radius:18px;
        "
      >

        <p
          class="op-eyebrow"
          style="
            margin-top:0;
            margin-bottom:8px;
          "
        >
          RATIOS-ISSUED LIFEPRODUCT
        </p>


        <h4
          style="
            margin-top:0;
            margin-bottom:10px;
          "
        >
          ${esc(typeName)}
        </h4>


        <p
          style="
            margin-top:0;
            margin-bottom:10px;
          "
        >
          This physical identifier was issued
          and assigned by RATIOS and is connected
          to this OneProfile™.
        </p>


        <div
          style="
            display:grid;
            gap:6px;
            margin-bottom:14px;
          "
        >

          <div>
            Product status:
            <strong>
              ${active ? 'Active' : 'Inactive'}
            </strong>
          </div>


          <div>
            Identifier ID:
            <strong>
              ${esc(item.id)}
            </strong>
          </div>

        </div>


        <p
          class="id-small"
          style="
            margin-bottom:0;
          "
        >
          The QR assigned to this LifeProduct
          is managed by RATIOS and is not
          available for copying or downloading
          from the caregiver portal.
        </p>

      </div>


      <div
        style="
          margin-top:14px;
          padding:16px;
          border:1px solid #d8e3ea;
          border-radius:14px;
          background:#ffffff;
        "
      >

        <strong>
          Need help with this ${esc(typeName)}?
        </strong>


        <p
          class="id-small"
          style="
            margin-top:6px;
            margin-bottom:0;
          "
        >
          If this LifeProduct is lost, damaged,
          or needs to be replaced, contact RATIOS
          for assistance. Physical LifeProduct
          status is managed by authorized RATIOS staff.
        </p>

      </div>
    `;

  }


  /* -----------------------------------------
     Generate caregiver Digital QR codes
     ----------------------------------------- */

  function generateDigitalQrCodes() {

    items
      .filter(item =>
        isDigitalQr(item) &&
        item.identifier_token
      )
      .forEach(item => {

        const qrBox =
          document.getElementById(
            `qr-${item.id}`
          );


        if (!qrBox) {
          return;
        }


        const scanUrl =
          qrBox.dataset.url;


        if (
          typeof QRCode !== 'undefined'
        ) {

          new QRCode(
            qrBox,
            {
              text:
                scanUrl,

              width:
                220,

              height:
                220,

              correctLevel:
                QRCode.CorrectLevel.H
            }
          );

        } else {

          qrBox.innerHTML = `
            <p>
              QR code could not be loaded.
            </p>
          `;

        }

      });

  }


  /* -----------------------------------------
     Copy Digital QR scan URL
     ----------------------------------------- */

  function bindCopyButtons() {

    list
      .querySelectorAll('.copy')
      .forEach(button => {

        button.onclick =
          async () => {

            try {

              await navigator.clipboard
                .writeText(
                  button.dataset.url
                );


              button.textContent =
                'Copied!';


              setTimeout(
                () => {

                  button.textContent =
                    'Copy link';

                },
                1200
              );

            } catch {

              button.textContent =
                'Copy failed';


              setTimeout(
                () => {

                  button.textContent =
                    'Copy link';

                },
                1500
              );

            }

          };

      });

  }


  /* -----------------------------------------
     Download Digital QR as PNG
     ----------------------------------------- */

  function bindDownloadButtons() {

    list
      .querySelectorAll('.download-qr')
      .forEach(button => {

        button.onclick =
          () => {

            const qrBox =
              document.getElementById(
                `qr-${button.dataset.id}`
              );


            if (!qrBox) {
              return;
            }


            const canvas =
              qrBox.querySelector('canvas');


            const image =
              qrBox.querySelector('img');


            let imageUrl =
              '';


            if (canvas) {

              try {

                imageUrl =
                  canvas.toDataURL(
                    'image/png'
                  );

              } catch {

                imageUrl =
                  '';

              }

            } else if (
              image &&
              image.src
            ) {

              imageUrl =
                image.src;

            }


            if (!imageUrl) {
              return;
            }


            const download =
              document.createElement('a');


            download.href =
              imageUrl;


            download.download =
              `OneProfile-Digital-QR-${button.dataset.id}.png`;


            document.body
              .appendChild(
                download
              );


            download.click();


            download.remove();

          };

      });

  }


  /* -----------------------------------------
     Activate / deactivate caregiver Digital QR
     ----------------------------------------- */

  function bindDigitalQrStatusButtons() {

    list
      .querySelectorAll(
        '.toggle-digital'
      )
      .forEach(button => {

        button.onclick =
          async () => {

            const id =
              Number(
                button.dataset.id
              );


            const activating =
              button.dataset.active ===
              '1';


            const actionWord =
              activating
                ? 'reactivate'
                : 'deactivate';


            const confirmed =
              window.confirm(
                `Are you sure you want to ${actionWord} this Digital QR?`
              );


            if (!confirmed) {
              return;
            }


            button.disabled =
              true;


            try {

              const response =
                await fetch(
                  '/api/caregiver-identifiers',
                  {

                    method:
                      'POST',

                    headers: {
                      'Content-Type':
                        'application/json',

                      'Accept':
                        'application/json'
                    },

                    body:
                      JSON.stringify({

                        action:
                          'status',

                        id,

                        active:
                          activating

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
                  'Unable to update this Digital QR.'
                );

              }


              await load();

            } catch (error) {

              window.alert(
                error.message ||
                'Unable to update this Digital QR. Please try again.'
              );

            } finally {

              button.disabled =
                false;

            }

          };

      });

  }


  /* -----------------------------------------
     Load identifiers
     ----------------------------------------- */

  async function load() {

    try {

      const response =
        await fetch(
          '/api/caregiver-identifiers',
          {
            headers: {
              'Accept':
                'application/json'
            }
          }
        );


      if (
        response.status === 401
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
          'Unable to load identifiers.'
        );

      }


      note.className =
        `id-note ${
          data.sharing_enabled
            ? 'on'
            : 'off'
        }`;


      note.innerHTML =
        data.sharing_enabled

          ? `
            <strong>
              Emergency sharing is ON.
            </strong>
            Active identifiers can open the
            caregiver-approved emergency view.
          `

          : `
            <strong>
              Emergency sharing is OFF.
            </strong>
            Identifier links will not reveal
            the emergency profile until the
            caregiver turns sharing on.
          `;


      items =
        Array.isArray(
          data.identifiers
        )
          ? data.identifiers
          : [];


      draw();


    } catch (error) {

      list.textContent =
        error.message ||
        'Unable to load identifiers.';

    }

  }


  /* -----------------------------------------
     Create caregiver Digital QR
     ----------------------------------------- */

  const createButton =
    document.getElementById(
      'create'
    );


  if (createButton) {

    createButton.onclick =
      async () => {

        createButton.disabled =
          true;


        msg.textContent =
          'Creating…';


        try {

          const productType =
            String(
              document
                .getElementById(
                  'productType'
                )
                ?.value ||
              ''
            )
              .trim()
              .toLowerCase();


          if (
            productType !==
            'digital_qr'
          ) {

            throw new Error(
              'Caregivers can create Digital QR identifiers only.'
            );

          }


          const response =
            await fetch(
              '/api/caregiver-identifiers',
              {

                method:
                  'POST',

                headers: {
                  'Content-Type':
                    'application/json',

                  'Accept':
                    'application/json'
                },

                body:
                  JSON.stringify({

                    action:
                      'create',

                    product_type:
                      'digital_qr',

                    label:
                      document
                        .getElementById(
                          'label'
                        )
                        ?.value ||
                      ''

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
              'Unable to create identifier.'
            );

          }


          msg.textContent =
            'Created. Your OneProfile™ Digital QR is ready.';


          const labelInput =
            document.getElementById(
              'label'
            );


          if (labelInput) {

            labelInput.value =
              '';

          }


          await load();


        } catch (error) {

          msg.textContent =
            error.message;

        } finally {

          createButton.disabled =
            false;

        }

      };

  }


  await load();

})();