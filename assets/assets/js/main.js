const nav=document.querySelector('.nav-links');
const btn=document.querySelector('.menu-toggle');
if(btn&&nav){btn.addEventListener('click',()=>nav.classList.toggle('open'));}

const io=new IntersectionObserver((entries)=>entries.forEach(e=>{if(e.isIntersecting)e.target.classList.add('visible');}),{threshold:.12});
document.querySelectorAll('.reveal').forEach(el=>io.observe(el));

document.querySelectorAll('[data-count]').forEach(el=>{
  let done=false;
  const target=+el.dataset.count;
  const obs=new IntersectionObserver(es=>{
    if(es[0].isIntersecting&&!done){
      done=true;let n=0;const step=Math.max(1,Math.ceil(target/80));
      const t=setInterval(()=>{n+=step;if(n>=target){n=target;clearInterval(t)}el.textContent=n+(el.dataset.suffix||'');},18);
    }
  },{threshold:.4});
  obs.observe(el);
});

const kit=document.querySelector('#kit-detail');
document.querySelectorAll('.kit-items button').forEach(b=>b.addEventListener('click',()=>{
  document.querySelectorAll('.kit-items button').forEach(x=>x.classList.remove('active'));
  b.classList.add('active');
  if(kit) kit.textContent=b.dataset.detail;
}));

// Clean image-only gallery with previous/next lightbox navigation
const galleryButtons=[...document.querySelectorAll('.masonry-open')];
const lightbox=document.querySelector('.lightbox');
let currentGalleryIndex=0;
function openGalleryImage(index){
  if(!lightbox || !galleryButtons.length) return;
  currentGalleryIndex=(index+galleryButtons.length)%galleryButtons.length;
  const button=galleryButtons[currentGalleryIndex];
  const img=lightbox.querySelector('img');
  if(img){
    img.src=button.dataset.full;
    img.alt=button.querySelector('img')?.alt || 'RATIOS gallery image';
  }
  lightbox.classList.add('open');
  lightbox.setAttribute('aria-hidden','false');
}
function closeGallery(){
  if(!lightbox) return;
  lightbox.classList.remove('open');
  lightbox.setAttribute('aria-hidden','true');
}
galleryButtons.forEach((button,index)=>button.addEventListener('click',()=>openGalleryImage(index)));
if(lightbox){
  const close=lightbox.querySelector('.lightbox-close');
  const prev=lightbox.querySelector('.lightbox-prev');
  const next=lightbox.querySelector('.lightbox-next');
  if(close) close.addEventListener('click',closeGallery);
  if(prev) prev.addEventListener('click',(event)=>{event.stopPropagation();openGalleryImage(currentGalleryIndex-1);});
  if(next) next.addEventListener('click',(event)=>{event.stopPropagation();openGalleryImage(currentGalleryIndex+1);});
  lightbox.addEventListener('click',event=>{if(event.target===lightbox)closeGallery();});
  document.addEventListener('keydown',event=>{
    if(!lightbox.classList.contains('open')) return;
    if(event.key==='Escape') closeGallery();
    if(event.key==='ArrowLeft') openGalleryImage(currentGalleryIndex-1);
    if(event.key==='ArrowRight') openGalleryImage(currentGalleryIndex+1);
  });
}
