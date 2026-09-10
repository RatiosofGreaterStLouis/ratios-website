(() => {

  const staffEmail =
    document.getElementById('staffEmail');

  const page =
    document.body;

  async function checkAdminSession() {

    try {

      const response =
        await fetch('/api/admin-session', {
          method: 'GET',
          credentials: 'same-origin',
          headers: {
            'Accept': 'application/json'
          }
        });

      const data =
        await response.json();

      if (
        !response.ok ||
        !data.authenticated
      ) {
        location.replace('admin-login.html');
        return;
      }

      if (staffEmail && data.staff?.email) {
        staffEmail.textContent =
          data.staff.email;
      }

      page.style.display = '';

    } catch (error) {

      console.error(
        'Admin session check failed:',
        error
      );

      location.replace(
        'admin-login.html'
      );
    }
  }

  checkAdminSession();

})();