(() => {

  const emailInput =
    document.getElementById('email');

  const codeInput =
    document.getElementById('code');

  const sendButton =
    document.getElementById('sendCode');

  const verifyButton =
    document.getElementById('verifyCode');

  const requestStep =
    document.getElementById('requestStep');

  const verifyStep =
    document.getElementById('verifyStep');

  const message =
    document.getElementById('message');


  function setMessage(text, isError = false) {
    message.textContent = text;
    message.style.color =
      isError ? '#b91c1c' : '#07172e';
  }


  sendButton.onclick = async () => {

    const email =
      String(emailInput.value || '')
        .trim()
        .toLowerCase();

    if (!email) {
      setMessage(
        'Enter your RATIOS staff email address.',
        true
      );
      return;
    }

    sendButton.disabled = true;
    setMessage('Sending secure login code…');

    try {

      const response =
        await fetch('/api/admin-start-login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            email
          })
        });

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
          'Unable to send the login code.'
        );
      }

      setMessage(
        data.message ||
        'If this email is authorized, a login code has been sent.'
      );

      requestStep.hidden = true;
      verifyStep.hidden = false;

      codeInput.focus();

    } catch (error) {

      setMessage(
        error.message ||
        'Something went wrong. Please try again.',
        true
      );

    } finally {

      sendButton.disabled = false;

    }
  };


  verifyButton.onclick = async () => {

    const email =
      String(emailInput.value || '')
        .trim()
        .toLowerCase();

    const code =
      String(codeInput.value || '')
        .trim();

    if (!/^\d{6}$/.test(code)) {
      setMessage(
        'Enter the 6-digit code from your email.',
        true
      );
      return;
    }

    verifyButton.disabled = true;
    setMessage('Verifying secure login code…');

    try {

      const response =
        await fetch('/api/admin-verify-login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            email,
            code
          })
        });

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
          'Unable to verify the login code.'
        );
      }

      setMessage('Signed in. Redirecting…');

      location.replace('admin-dashboard.html');

    } catch (error) {

      setMessage(
        error.message ||
        'Something went wrong. Please try again.',
        true
      );

    } finally {

      verifyButton.disabled = false;

    }
  };


  codeInput.addEventListener(
    'keydown',
    event => {
      if (event.key === 'Enter') {
        verifyButton.click();
      }
    }
  );

})();