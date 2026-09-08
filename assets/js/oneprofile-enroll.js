(function(){
  const form = document.getElementById('oneprofileEnrollmentForm');
  if(!form) return;
  const alertBox = document.getElementById('formAlert');
  const submit = document.getElementById('submitEnrollment');

  function showAlert(message, type='error'){
    alertBox.textContent = message;
    alertBox.className = 'ope-alert ' + type;
    alertBox.hidden = false;
    alertBox.scrollIntoView({behavior:'smooth', block:'center'});
  }

  form.addEventListener('submit', async (e)=>{
    e.preventDefault();
    alertBox.hidden = true;
    if(!form.checkValidity()){
      form.reportValidity();
      return;
    }
    const fd = new FormData(form);
    const payload = Object.fromEntries(fd.entries());
    payload.interests = fd.getAll('interests');

    submit.disabled = true;
    submit.textContent = 'Submitting…';
    try{
      const res = await fetch('/api/oneprofile-enroll', {
        method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(payload)
      });
      const data = await res.json().catch(()=>({}));
      if(!res.ok) throw new Error(data.error || 'We could not submit your enrollment. Please try again.');
      const id = encodeURIComponent(data.enrollment_id || '');
      window.location.href = 'oneprofile-success.html' + (id ? '?id='+id : '');
    }catch(err){
      showAlert(err.message || 'Something went wrong. Please try again or email info@ratiossaveslives.org.');
      submit.disabled = false;
      submit.textContent = 'Submit OneProfile™ Enrollment';
    }
  });
})();
