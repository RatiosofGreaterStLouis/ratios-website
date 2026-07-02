
const toggle=document.querySelector('.menu-toggle');const nav=document.querySelector('.nav-links');if(toggle&&nav){toggle.addEventListener('click',()=>{nav.classList.toggle('open');toggle.setAttribute('aria-expanded',nav.classList.contains('open'))})}
const revealEls=document.querySelectorAll('.reveal');const io=new IntersectionObserver((entries)=>{entries.forEach(e=>{if(e.isIntersecting){e.target.classList.add('visible');io.unobserve(e.target)}})},{threshold:.12});revealEls.forEach(el=>io.observe(el));
const counters=document.querySelectorAll('.counter');const cio=new IntersectionObserver((entries)=>{entries.forEach(entry=>{if(entry.isIntersecting){const el=entry.target;const target=+el.dataset.target;let current=0;const step=Math.max(1,Math.ceil(target/80));const timer=setInterval(()=>{current+=step;if(current>=target){current=target;clearInterval(timer)}el.textContent=current.toLocaleString()},20);cio.unobserve(el)}})},{threshold:.4});counters.forEach(c=>cio.observe(c));
const kit=document.getElementById('kitItems');const detail=document.getElementById('kitDetail');if(kit&&detail){kit.querySelectorAll('button').forEach(btn=>btn.addEventListener('click',()=>{kit.querySelectorAll('button').forEach(b=>b.classList.remove('active'));btn.classList.add('active');detail.textContent=btn.dataset.detail;}))}


// Enhanced gallery filters and lightbox
const filterButtons=document.querySelectorAll('.filter-btn');
const galleryCards=document.querySelectorAll('.gallery-card');
if(filterButtons.length&&galleryCards.length){
  filterButtons.forEach(btn=>btn.addEventListener('click',()=>{
    filterButtons.forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');
    const filter=btn.dataset.filter;
    galleryCards.forEach(card=>{
      const show=filter==='all'||card.dataset.category===filter;
      card.classList.toggle('hide',!show);
    });
  }));
}
const lightbox=document.getElementById('galleryLightbox');
const lightboxImage=document.getElementById('lightboxImage');
const lightboxTitle=document.getElementById('lightboxTitle');
const lightboxCaption=document.getElementById('lightboxCaption');
const lightboxClose=document.querySelector('.lightbox-close');
function closeLightbox(){if(lightbox){lightbox.classList.remove('open');lightbox.setAttribute('aria-hidden','true');document.body.style.overflow='';}}
document.querySelectorAll('.gallery-open').forEach(btn=>btn.addEventListener('click',()=>{
  if(!lightbox)return;
  lightboxImage.src=btn.dataset.img;
  lightboxImage.alt=btn.querySelector('img')?.alt||'';
  lightboxTitle.textContent=btn.dataset.title||'';
  lightboxCaption.textContent=btn.dataset.caption||'';
  lightbox.classList.add('open');
  lightbox.setAttribute('aria-hidden','false');
  document.body.style.overflow='hidden';
}));
if(lightboxClose){lightboxClose.addEventListener('click',closeLightbox)}
if(lightbox){lightbox.addEventListener('click',(e)=>{if(e.target===lightbox)closeLightbox();})}
document.addEventListener('keydown',(e)=>{if(e.key==='Escape')closeLightbox();});
