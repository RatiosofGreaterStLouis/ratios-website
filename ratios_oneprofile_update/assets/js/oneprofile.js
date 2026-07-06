document.addEventListener('DOMContentLoaded', () => {
  const cards = document.querySelectorAll('.op-card, .op-product-card, .op-sample-card');
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12 });

  cards.forEach((card) => {
    card.style.opacity = '0';
    card.style.transform = 'translateY(18px)';
    card.style.transition = 'opacity .55s ease, transform .55s ease';
    observer.observe(card);
  });

  const style = document.createElement('style');
  style.textContent = `.is-visible{opacity:1!important;transform:translateY(0)!important}`;
  document.head.appendChild(style);
});
