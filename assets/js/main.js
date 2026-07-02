const nav=document.querySelector('.nav-links'); const btn=document.querySelector('.menu-toggle'); if(btn&&nav){btn.addEventListener('click',()=>nav.classList.toggle('open'))}
const io=new IntersectionObserver((entries)=>entries.forEach(e=>{if(e.isIntersecting)e.target.classList.add('visible')}),{threshold:.12}); document.querySelectorAll('.reveal').forEach(el=>io.observe(el));
document.querySelectorAll('[data-count]').forEach(el=>{let done=false; const target=+el.dataset.count; const obs=new IntersectionObserver(es=>{if(es[0].isIntersecting&&!done){done=true;let n=0;const step=Math.max(1,Math.ceil(target/80));const t=setInterval(()=>{n+=step;if(n>=target){n=target;clearInterval(t)}el.textContent=n+(el.dataset.suffix||'')},18)}},{threshold:.4});obs.observe(el)});
const kit=document.querySelector('#kit-detail'); document.querySelectorAll('.kit-items button').forEach(b=>b.addEventListener('click',()=>{document.querySelectorAll('.kit-items button').forEach(x=>x.classList.remove('active')); b.classList.add('active'); if(kit) kit.textContent=b.dataset.detail;}));
const filterBtns=document.querySelectorAll('.filter-btn'); const cards=document.querySelectorAll('.gallery-card'); filterBtns.forEach(b=>b.addEventListener('click',()=>{filterBtns.forEach(x=>x.classList.remove('active')); b.classList.add('active'); const f=b.dataset.filter; cards.forEach(c=>c.classList.toggle('hide', f!=='all' && c.dataset.category!==f));}));
const lb=document.querySelector('.lightbox'); if(lb){const img=lb.querySelector('img'), title=lb.querySelector('h2'), cap=lb.querySelector('p'); document.querySelectorAll('.gallery-open').forEach(b=>b.addEventListener('click',()=>{img.src=b.dataset.full; title.textContent=b.dataset.title; cap.textContent=b.dataset.caption; lb.classList.add('open')})); lb.querySelector('.lightbox-close').addEventListener('click',()=>lb.classList.remove('open')); lb.addEventListener('click',e=>{if(e.target===lb)lb.classList.remove('open')});}


// Polished masonry gallery lightbox support
const masonryLightbox=document.querySelector('.lightbox');
if(masonryLightbox){
  const masonryImg=masonryLightbox.querySelector('img');
  const masonryTitle=masonryLightbox.querySelector('h2');
  document.querySelectorAll('.masonry-open').forEach(button=>{
    button.addEventListener('click',()=>{
      if(masonryImg) masonryImg.src=button.dataset.full;
      if(masonryTitle) masonryTitle.textContent=button.dataset.title || 'RATIOS';
      masonryLightbox.classList.add('open');
      masonryLightbox.setAttribute('aria-hidden','false');
    });
  });
  const close=masonryLightbox.querySelector('.lightbox-close');
  if(close) close.addEventListener('click',()=>{masonryLightbox.classList.remove('open');masonryLightbox.setAttribute('aria-hidden','true');});
  masonryLightbox.addEventListener('click',event=>{if(event.target===masonryLightbox){masonryLightbox.classList.remove('open');masonryLightbox.setAttribute('aria-hidden','true');}});
  document.addEventListener('keydown',event=>{if(event.key==='Escape') masonryLightbox.classList.remove('open');});
}


// Image-only masonry gallery filtering + lightbox
const imageOnlyFilterButtons = document.querySelectorAll('.filter-btn');
const masonryItems = document.querySelectorAll('.masonry-item');
imageOnlyFilterButtons.forEach(button => {
  button.addEventListener('click', () => {
    imageOnlyFilterButtons.forEach(item => item.classList.remove('active'));
    button.classList.add('active');
    const selected = button.dataset.filter;
    masonryItems.forEach(item => {
      item.classList.toggle('hide', selected !== 'all' && item.dataset.category !== selected);
    });
  });
});

const imageOnlyLightbox = document.querySelector('.lightbox');
if (imageOnlyLightbox) {
  const lightboxImage = imageOnlyLightbox.querySelector('img');
  document.querySelectorAll('.masonry-open').forEach(button => {
    button.addEventListener('click', () => {
      if (lightboxImage) {
        lightboxImage.src = button.dataset.full;
        lightboxImage.alt = button.querySelector('img')?.alt || 'RATIOS gallery image';
      }
      imageOnlyLightbox.classList.add('open');
      imageOnlyLightbox.setAttribute('aria-hidden', 'false');
    });
  });
}
