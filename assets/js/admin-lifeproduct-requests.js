(() => {

  const page =
    document.body;

  const requestList =
    document.getElementById('requestList');

  const requestMessage =
    document.getElementById('requestMessage');

  const statusFilter =
    document.getElementById('statusFilter');

  const openCount =
    document.getElementById('openCount');

  const reviewedCount =
    document.getElementById('reviewedCount');

  const resolvedCount =
    document.getElementById('resolvedCount');

  const totalCount =
    document.getElementById('totalCount');

  let requests = [];


  function escapeHtml(value) {

    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }


  function productName(value) {

    const names = {
      lifepatch: 'LifePatch™',
      lifeband: 'LifeBand™',
      lifecard: 'LifeCard™',
      lifetag: 'LifeTag™'
    };

    return names[
      String(value || '').toLowerCase()
    ] || 'LifeProduct';
  }


  function requestTypeName(value) {

    const names = {
      lost: 'Lost product',
      damaged: 'Damaged product',
      not_scanning: 'QR code is not scanning',
      fit_or_usability: 'Fit or usability issue',
      replacement_requested: 'Replacement requested',
      other: 'Other support request'
    };

    return names[
      String(value || '').toLowerCase()
    ] || 'Support request';
  }


  function statusName(value) {

    const status =
      String(value || 'open')
        .toLowerCase();

    if (status === 'reviewed') {
      return 'Reviewed';
    }

    if (status === 'resolved') {
      return 'Resolved';
    }

    return 'Open';
  }


  function statusClass(value) {

    const status =
      String(value || 'open')
        .toLowerCase();

    if (status === 'reviewed') {
      return 'lpa-status-reviewed';
    }

    if (status === 'resolved') {
      return 'lpa-status-resolved';
    }

    return 'lpa-status-open';
  }


  function formatDate(value) {

    if (!value) {
      return '—';
    }

    const normalized =
      String(value).includes('T')
        ? String(value)
        : String(value).replace(' ', 'T') + 'Z';

    const date =
      new Date(normalized);

    if (Number.isNaN(date.getTime())) {
      return String(value);
    }

    return date.toLocaleString();
  }


  function caregiverName(item) {

    return [
      item.caregiver_first_name,
      item.caregiver_last_name
    ]
      .filter(Boolean)
      .join(' ') ||
      'Caregiver';
  }


  function setMessage(
    message = '',
    type = ''
  ) {

    if (!requestMessage) {
      return;
    }

    requestMessage.textContent =
      message;

    requestMessage.style.marginBottom =
      message ? '16px' : '0';

    requestMessage.style.padding =
      message ? '13px 15px' : '0';

    requestMessage.style.borderRadius =
      message ? '14px' : '0';

    requestMessage.style.fontWeight =
      message ? '750' : '';

    if (!message) {
      requestMessage.style.background = '';
      requestMessage.style.color = '';
      requestMessage.style.border = '';
      return;
    }

    if (type === 'success') {

      requestMessage.style.background =
        '#e8f7ef';

      requestMessage.style.color =
        '#17633f';

      requestMessage.style.border =
        '1px solid #c8ead8';

      return;
    }

    if (type === 'error') {

      requestMessage.style.background =
        '#fff0f0';

      requestMessage.style.color =
        '#8b2525';

      requestMessage.style.border =
        '1px solid #f0cccc';

      return;
    }

    requestMessage.style.background =
      '#eef7fb';

    requestMessage.style.color =
      '#155d73';

    requestMessage.style.border =
      '1px solid #d1e8f1';
  }


  function updateStats(data) {

    const stats =
      data?.stats || {};

    if (openCount) {
      openCount.textContent =
        stats.open ?? 0;
    }

    if (reviewedCount) {
      reviewedCount.textContent =
        stats.reviewed ?? 0;
    }

    if (resolvedCount) {
      resolvedCount.textContent =
        stats.resolved ?? 0;
    }

    if (totalCount) {
      totalCount.textContent =
        stats.total ?? requests.length;
    }
  }


  function filteredRequests() {

    const filter =
      statusFilter?.value || 'active';

    if (filter === 'all') {
      return requests;
    }

    if (filter === 'active') {

      return requests.filter(item => {

        const status =
          String(
            item.request_status || ''
          ).toLowerCase();

        return (
          status === 'open' ||
          status === 'reviewed'
        );
      });
    }

    return requests.filter(
      item =>
        String(
          item.request_status || ''
        ).toLowerCase() === filter
    );
  }


  function renderRequests() {

    if (!requestList) {
      return;
    }

    const rows =
      filteredRequests();

    if (!rows.length) {

      requestList.innerHTML = `
        <div class="lpa-empty">
          No LifeProduct support requests
          match this filter.
        </div>
      `;

      return;
    }


    requestList.innerHTML =
      rows.map(item => {

        const requestId =
          Number(item.id);

        const product =
          productName(
            item.product_type
          );

        const label =
          item.identifier_label
            ? escapeHtml(
                item.identifier_label
              )
            : `Identifier #${escapeHtml(
                item.identifier_id
              )}`;

        const participant =
          escapeHtml(
            item.participant_first_name ||
            'Participant'
          );

        const caregiver =
          escapeHtml(
            caregiverName(item)
          );

        const caregiverEmail =
          escapeHtml(
            item.caregiver_email || '—'
          );

        const enrollment =
          escapeHtml(
            item.enrollment_id || '—'
          );

        const identifierStatus =
          escapeHtml(
            item.identifier_status || '—'
          );

        const caregiverNote =
          item.caregiver_note
            ? escapeHtml(
                item.caregiver_note
              )
            : 'No additional details were provided.';

        const staffNote =
          escapeHtml(
            item.staff_note || ''
          );

        const currentStatus =
          String(
            item.request_status || 'open'
          ).toLowerCase();

        const resolved =
          currentStatus === 'resolved';

        return `

          <article
            class="lpa-request"
            data-request-id="${requestId}"
          >

            <div class="lpa-request-head">

              <div>

                <h3>
                  ${product} — ${label}
                </h3>

                <p>
                  ${escapeHtml(
                    requestTypeName(
                      item.request_type
                    )
                  )}
                  • Submitted
                  ${escapeHtml(
                    formatDate(
                      item.created_at
                    )
                  )}
                </p>

              </div>

              <span
                class="
                  lpa-status
                  ${statusClass(
                    currentStatus
                  )}
                "
              >
                ${statusName(
                  currentStatus
                )}
              </span>

            </div>


            <div class="lpa-request-body">


              <div class="lpa-grid">

                <div class="lpa-detail">

                  <span class="lpa-detail-label">
                    Participant
                  </span>

                  <div class="lpa-detail-value">
                    ${participant}
                  </div>

                </div>


                <div class="lpa-detail">

                  <span class="lpa-detail-label">
                    Caregiver
                  </span>

                  <div class="lpa-detail-value">
                    ${caregiver}
                    <br>
                    ${caregiverEmail}
                  </div>

                </div>


                <div class="lpa-detail">

                  <span class="lpa-detail-label">
                    Enrollment ID
                  </span>

                  <div class="lpa-detail-value">
                    ${enrollment}
                  </div>

                </div>


                <div class="lpa-detail">

                  <span class="lpa-detail-label">
                    Identifier
                  </span>

                  <div class="lpa-detail-value">
                    #${escapeHtml(
                      item.identifier_id
                    )}
                    • ${identifierStatus}
                  </div>

                </div>

              </div>


              <div class="lpa-note">

                <strong>
                  Caregiver note
                </strong>

                <p>
                  ${caregiverNote}
                </p>

              </div>


              ${
                item.reviewed_at
                  ? `
                    <div class="lpa-note">

                      <strong>
                        Staff activity
                      </strong>

                      <p>
                        Reviewed:
                        ${escapeHtml(
                          formatDate(
                            item.reviewed_at
                          )
                        )}
                        ${
                          item.reviewed_by
                            ? ` by ${escapeHtml(
                                item.reviewed_by
                              )}`
                            : ''
                        }

                        ${
                          item.resolved_at
                            ? `<br>Resolved: ${escapeHtml(
                                formatDate(
                                  item.resolved_at
                                )
                              )}`
                            : ''
                        }
                      </p>

                    </div>
                  `
                  : ''
              }


              <div class="lpa-staff-area">

                <label
                  for="staffNote-${requestId}"
                >
                  Staff note
                </label>

                <textarea
                  id="staffNote-${requestId}"
                  maxlength="1500"
                  placeholder="Add an internal staff note or caregiver follow-up details…"
                  ${resolved ? 'disabled' : ''}
                >${staffNote}</textarea>


                <div class="lpa-actions">

                  ${
                    currentStatus === 'open'
                      ? `
                        <button
                          type="button"
                          class="op-button op-secondary"
                          data-action="review"
                          data-request-id="${requestId}"
                        >
                          Mark reviewed
                        </button>
                      `
                      : ''
                  }


                  ${
                    !resolved
                      ? `
                        <button
                          type="button"
                          class="op-button"
                          data-action="resolve"
                          data-request-id="${requestId}"
                        >
                          Resolve request
                        </button>
                      `
                      : ''
                  }


                  <a
                    class="op-button op-secondary"
                    href="admin-profile.html?id=${encodeURIComponent(
                      item.enrollment_id || ''
                    )}"
                  >
                    Open participant profile
                  </a>

                </div>


                <div
                  id="message-${requestId}"
                  class="lpa-message"
                ></div>

              </div>


            </div>

          </article>
        `;

      }).join('');
  }


  async function loadRequests() {

    setMessage();

    try {

      const response =
        await fetch(
          '/api/admin-lifeproduct-requests',
          {
            method: 'GET',
            credentials: 'same-origin',
            cache: 'no-store',
            headers: {
              'Accept':
                'application/json'
            }
          }
        );


      if (response.status === 401) {

        location.replace(
          'admin-login.html'
        );

        return;
      }


      const data =
        await response.json();


      if (!response.ok) {

        throw new Error(
          data.error ||
          'Unable to load support requests.'
        );
      }


      requests =
        Array.isArray(data.requests)
          ? data.requests
          : [];


      updateStats(data);

      renderRequests();

      page.style.display = '';


    } catch (error) {

      console.error(
        'LifeProduct admin request error:',
        error
      );

      setMessage(
        error.message ||
        'Unable to load LifeProduct support requests.',
        'error'
      );

      if (requestList) {

        requestList.innerHTML = `
          <div class="lpa-empty">
            Unable to load support requests.
            Please refresh and try again.
          </div>
        `;
      }

      page.style.display = '';
    }
  }


  async function updateRequest(
    requestId,
    action
  ) {

    const message =
      document.getElementById(
        `message-${requestId}`
      );

    const noteField =
      document.getElementById(
        `staffNote-${requestId}`
      );

    const article =
      document.querySelector(
        `[data-request-id="${requestId}"]`
      );

    const buttons =
      article
        ? article.querySelectorAll(
            'button[data-action]'
          )
        : [];


    buttons.forEach(button => {
      button.disabled = true;
    });


    if (message) {

      message.textContent =
        action === 'resolve'
          ? 'Resolving request…'
          : 'Updating request…';

      message.style.color =
        '#607486';
    }


    try {

      const response =
        await fetch(
          '/api/admin-lifeproduct-request-update',
          {
            method: 'POST',
            credentials: 'same-origin',
            cache: 'no-store',
            headers: {
              'Content-Type':
                'application/json',
              'Accept':
                'application/json'
            },
            body: JSON.stringify({
              request_id:
                requestId,

              action,

              staff_note:
                String(
                  noteField?.value || ''
                ).trim()
            })
          }
        );


      if (response.status === 401) {

        location.replace(
          'admin-login.html'
        );

        return;
      }


      const data =
        await response.json();


      if (!response.ok) {

        throw new Error(
          data.error ||
          'Unable to update request.'
        );
      }


      setMessage(
        action === 'resolve'
          ? 'LifeProduct support request resolved.'
          : 'LifeProduct support request marked as reviewed.',
        'success'
      );


      await loadRequests();


    } catch (error) {

      console.error(
        'LifeProduct request update error:',
        error
      );

      if (message) {

        message.textContent =
          error.message ||
          'Unable to update request.';

        message.style.color =
          '#8b2525';
      }


      buttons.forEach(button => {
        button.disabled = false;
      });
    }
  }


  if (statusFilter) {

    statusFilter.addEventListener(
      'change',
      renderRequests
    );
  }


  if (requestList) {

    requestList.addEventListener(
      'click',
      event => {

        const button =
          event.target.closest(
            'button[data-action][data-request-id]'
          );

        if (!button) {
          return;
        }

        const requestId =
          Number(
            button.dataset.requestId
          );

        const action =
          button.dataset.action;

        if (
          !Number.isInteger(requestId) ||
          requestId <= 0
        ) {
          return;
        }

        if (
          action !== 'review' &&
          action !== 'resolve'
        ) {
          return;
        }

        updateRequest(
          requestId,
          action
        );
      }
    );
  }


  loadRequests();

})();