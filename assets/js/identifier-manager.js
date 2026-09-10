(async () => {

  const list = document.getElementById('identifierList');
  const msg = document.getElementById('message');
  const note = document.getElementById('sharingNote');

  const labels = {
    digital_qr: 'Digital QR',
    lifepatch: 'LifePatch™',
    lifeband: 'LifeBand™',
    lifecard: 'LifeCard™',
    lifetag: 'LifeTag™'
  };

  let items = [];

  function esc(v) {
    return String(v ?? '').replace(
      /[&<>"']/g,
      c => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
      }[c])
    );
  }


  /* -----------------------------------------
     Draw identifiers
     ----------------------------------------- */

  function draw() {

    if (!items.length) {
      list.innerHTML = '<p>No identifiers have been created yet.</p>';
      return;
    }

    list.innerHTML = items.map(x => {

      const scanUrl =
        `${location.origin}/scan.html?code=${encodeURIComponent(
          x.identifier_token
        )}`;

      const active = x.status === 'active';

      return `
        <article class="id-item">

          <div>

            <span class="id-type">
              ${esc(labels[x.product_type] || x.product_type)}
            </span>

            <h3>
              ${esc(x.label || 'OneProfile scan destination')}
            </h3>

            <p class="id-status ${active ? 'active' : 'inactive'}">
              ${active ? 'Active' : 'Inactive'}
              ·
              ${Number(x.scan_count || 0)}
              scan${Number(x.scan_count || 0) === 1 ? '' : 's'}
            </p>

            ${
              x.last_scanned_at
                ? `<p class="id-small">
                    Last scan: ${esc(x.last_scanned_at)} UTC
                   </p>`
                : ''
            }

          </div>


          <!-- QR CODE -->

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
              Scan this OneProfile™ QR
            </p>

            <div
              id="qr-${x.id}"
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
              This QR opens the caregiver-approved emergency profile.
            </p>

            <button
              type="button"
              class="download-qr ev-secondary"
              data-id="${x.id}"
            >
              Download QR
            </button>

          </div>


          <!-- SCAN LINK -->

          <div class="id-linkrow">

            <input
              value="${esc(scanUrl)}"
              readonly
            >

            <button
              class="copy"
              data-url="${esc(scanUrl)}"
            >
              Copy link
            </button>

          </div>


          <!-- IDENTIFIER ACTIONS -->

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
              class="toggle ${active ? 'danger' : ''}"
              data-id="${x.id}"
              data-active="${active ? '0' : '1'}"
            >
              ${active ? 'Deactivate' : 'Reactivate'}
            </button>

          </div>

        </article>
      `;

    }).join('');


    /* -----------------------------------------
       Generate QR codes
       ----------------------------------------- */

    items.forEach(x => {

      const qrBox = document.getElementById(`qr-${x.id}`);

      if (!qrBox) return;

      const scanUrl = qrBox.dataset.url;

      if (typeof QRCode !== 'undefined') {

        new QRCode(qrBox, {
          text: scanUrl,
          width: 220,
          height: 220,
          correctLevel: QRCode.CorrectLevel.H
        });

      } else {

        qrBox.innerHTML =
          '<p>QR code could not be loaded.</p>';

      }

    });


    /* -----------------------------------------
       Copy scan URL
       ----------------------------------------- */

    list.querySelectorAll('.copy').forEach(button => {

      button.onclick = async () => {

        await navigator.clipboard.writeText(
          button.dataset.url
        );

        button.textContent = 'Copied!';

        setTimeout(() => {
          button.textContent = 'Copy link';
        }, 1200);

      };

    });


    /* -----------------------------------------
       Download QR as PNG
       ----------------------------------------- */

    list.querySelectorAll('.download-qr').forEach(button => {

      button.onclick = () => {

        const qrBox =
          document.getElementById(`qr-${button.dataset.id}`);

        if (!qrBox) return;

        const canvas = qrBox.querySelector('canvas');
        const image = qrBox.querySelector('img');

        let imageUrl = '';

        if (canvas) {
          imageUrl = canvas.toDataURL('image/png');
        } else if (image) {
          imageUrl = image.src;
        }

        if (!imageUrl) return;

        const download = document.createElement('a');

        download.href = imageUrl;
        download.download =
          `OneProfile-QR-${button.dataset.id}.png`;

        document.body.appendChild(download);

        download.click();

        download.remove();

      };

    });


    /* -----------------------------------------
       Activate / deactivate identifier
       ----------------------------------------- */

    list.querySelectorAll('.toggle').forEach(button => {

      button.onclick = async () => {

        button.disabled = true;

        await fetch('/api/caregiver-identifiers', {

          method: 'POST',

          headers: {
            'Content-Type': 'application/json'
          },

          body: JSON.stringify({

            action: 'status',

            id: Number(button.dataset.id),

            active: button.dataset.active === '1'

          })

        });

        await load();

      };

    });

  }


  /* -----------------------------------------
     Load identifiers
     ----------------------------------------- */

  async function load() {

    const r = await fetch(
      '/api/caregiver-identifiers'
    );

    if (r.status === 401) {
      location.replace('caregiver-login.html');
      return;
    }

    const data = await r.json();

    if (!r.ok) {
      list.textContent =
        data.error || 'Unable to load identifiers.';
      return;
    }

    note.className =
      `id-note ${data.sharing_enabled ? 'on' : 'off'}`;

    note.innerHTML =
      data.sharing_enabled

        ? '<strong>Emergency sharing is ON.</strong> Active identifiers can open the caregiver-approved emergency view.'

        : '<strong>Emergency sharing is OFF.</strong> Identifier links will not reveal a profile until the caregiver turns emergency sharing on.';


    items = data.identifiers || [];

    draw();

  }


  /* -----------------------------------------
     Create identifier
     ----------------------------------------- */

  document
    .getElementById('create')
    .onclick = async () => {

      const button =
        document.getElementById('create');

      button.disabled = true;

      msg.textContent = 'Creating…';

      try {

        const r = await fetch(
          '/api/caregiver-identifiers',
          {

            method: 'POST',

            headers: {
              'Content-Type': 'application/json'
            },

            body: JSON.stringify({

              action: 'create',

              product_type:
                document.getElementById('productType').value,

              label:
                document.getElementById('label').value

            })

          }
        );

        const data = await r.json();

        if (!r.ok) {
          throw Error(
            data.error || 'Unable to create identifier.'
          );
        }

        msg.textContent =
          'Created. Your OneProfile™ QR is ready.';

        document.getElementById('label').value = '';

        await load();

      } catch (error) {

        msg.textContent = error.message;

      } finally {

        button.disabled = false;

      }

    };


  await load();

})();