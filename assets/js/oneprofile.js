
document.addEventListener('DOMContentLoaded', function(){
  document.querySelectorAll('.op-card, .op-product-card, .op-sample-card').forEach((el, i)=>{
    el.style.opacity='0'; el.style.transform='translateY(14px)';
    setTimeout(()=>{el.style.transition='all .55s ease'; el.style.opacity='1'; el.style.transform='translateY(0)';}, 80 + i*70);
  });
});
