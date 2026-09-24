(() => {

  "use strict";

 

  const PRODUCTS = {

    tree: { name:"RATIOS Tree Tee", prices:{

      youth:{id:"price_1UIv6kBEQmRGbpGgJq0nnuZY",amount:20},

      adult:{id:"price_1UIv6kBEQmRGbpGgZw0UUlnv",amount:24},

      plus:{id:"price_1UIv6kBEQmRGbpGgXi4mmD2W",amount:27}

    }},

    unity: { name:"RATIOS Unity Tee", prices:{

      youth:{id:"price_1UIvK6BEQmRGbpGgiY2KLRxE",amount:20},

      adult:{id:"price_1UIvK6BEQmRGbpGgxOFdbVuD",amount:24},

      plus:{id:"price_1UIvK6BEQmRGbpGgP2qkUAz5",amount:27}

    }},

    sunset: { name:"Sunset Safety Tee", prices:{

      youth:{id:"price_1UIvP2BEQmRGbpGgO8f6ixBP",amount:22},

      adult:{id:"price_1UIvP2BEQmRGbpGgUOIZ33xt",amount:26},

      plus:{id:"price_1UIvP2BEQmRGbpGgPg1x1cft",amount:29}

    }},

    book: { name:"Ready, Set, Save! Coloring Book", prices:{

      physical:{id:"price_1UIveqBEQmRGbpGg9x566pkY",amount:12}

    }}

  };

 

  const ADULT_SIZES=["S","M","L","XL","2XL","3XL","4XL"];

  const YOUTH_SIZES=["XS","S","M","L","XL"];

  const money=n=>new Intl.NumberFormat("en-US",{style:"currency",currency:"USD"}).format(n);

 

  let cart=[];

  try {

    const saved=JSON.parse(localStorage.getItem("ratiosCart")||"[]");

    cart=Array.isArray(saved)?saved:[];

  } catch (_) { cart=[]; }

 

  const menuButton=document.querySelector(".menu-btn");

  const shopNav=document.getElementById("shopNav");

  if(menuButton&&shopNav){

    menuButton.addEventListener("click",()=>{

      const open=shopNav.classList.toggle("open");

      menuButton.setAttribute("aria-expanded",open?"true":"false");

    });

  }

 

  function priceFor(key,fit,size){

    const p=PRODUCTS[key];

    if(key==="book") return p.prices.physical;

    if(fit==="youth") return p.prices.youth;

    if(["2XL","3XL","4XL"].includes(size)) return p.prices.plus;

    return p.prices.adult;

  }

 

  function updateVisiblePrice(key){

    if(key==="book") return;

    const fit=document.querySelector(`.fit-select[data-product="${key}"]`);

    const size=document.querySelector(`.size-select[data-product="${key}"]`);

    const button=document.querySelector(`.add-cart[data-product="${key}"]`);

    if(!fit||!size||!button) return;

    const priceEl=button.closest(".product-card")?.querySelector(".price");

    if(priceEl) priceEl.textContent=`$${priceFor(key,fit.value,size.value).amount}`;

  }

 

  function fillSizes(key){

    const fit=document.querySelector(`.fit-select[data-product="${key}"]`);

    const size=document.querySelector(`.size-select[data-product="${key}"]`);

    if(!fit||!size) return;

    const sizes=fit.value==="youth"?YOUTH_SIZES:ADULT_SIZES;

    const old=size.value;

    size.innerHTML=sizes.map(v=>`<option value="${v}">${v}</option>`).join("");

    if(sizes.includes(old)) size.value=old;

    updateVisiblePrice(key);

  }

 

  document.querySelectorAll(".fit-select").forEach(el=>{

    fillSizes(el.dataset.product);

    el.addEventListener("change",()=>fillSizes(el.dataset.product));

  });

  document.querySelectorAll(".size-select").forEach(el=>{

    el.addEventListener("change",()=>updateVisiblePrice(el.dataset.product));

  });

 

  const drawer=document.getElementById("cartDrawer");

  const overlay=document.getElementById("cartOverlay");

  const count=document.getElementById("cartCount");

  const items=document.getElementById("cartItems");

  const total=document.getElementById("cartTotal");

  const checkout=document.getElementById("checkoutBtn");

  const errorBox=document.getElementById("cartError");

  const pickupNote=document.getElementById("pickupNote");

 

  function openCart(){

    drawer.classList.add("open");

    overlay.classList.add("open");

    drawer.setAttribute("aria-hidden","false");

    document.body.classList.add("cart-open");

  }

  function closeCart(){

    drawer.classList.remove("open");

    overlay.classList.remove("open");

    drawer.setAttribute("aria-hidden","true");

    document.body.classList.remove("cart-open");

  }

  function saveCart(){

    localStorage.setItem("ratiosCart",JSON.stringify(cart));

    renderCart();

  }

  function addItem(key){

    const p=PRODUCTS[key];

    if(!p) return;

    let fit="physical",size="Physical Copy";

    if(key!=="book"){

      const fitEl=document.querySelector(`.fit-select[data-product="${key}"]`);

      const sizeEl=document.querySelector(`.size-select[data-product="${key}"]`);

      if(!fitEl||!sizeEl) return;

      fit=fitEl.value; size=sizeEl.value;

    }

    const price=priceFor(key,fit,size);

    const itemKey=`${key}|${fit}|${size}|${price.id}`;

    const found=cart.find(x=>x.itemKey===itemKey);

    if(found) found.quantity+=1;

    else cart.push({itemKey,productKey:key,name:p.name,fit,size,priceId:price.id,unitPrice:price.amount,quantity:1});

    saveCart();

    openCart();

  }

 

  document.addEventListener("click",event=>{

    const add=event.target.closest(".add-cart");

    if(add){

      event.preventDefault();

      addItem(add.dataset.product);

      return;

    }

    const action=event.target.closest("button[data-action]");

    if(!action) return;

    const i=Number(action.dataset.index);

    if(!Number.isInteger(i)||!cart[i]) return;

    if(action.dataset.action==="plus") cart[i].quantity+=1;

    if(action.dataset.action==="minus"){

      cart[i].quantity-=1;

      if(cart[i].quantity<1) cart.splice(i,1);

    }

    if(action.dataset.action==="remove") cart.splice(i,1);

    saveCart();

  });

 

  function renderCart(){

    count.textContent=cart.reduce((a,x)=>a+x.quantity,0);

    items.innerHTML=!cart.length

      ? '<div class="cart-empty">Your cart is empty.</div>'

      : cart.map((x,i)=>`<div class="cart-item"><div><strong>${x.name}</strong><small>${x.productKey==="book"?"Physical Copy":`${x.fit==="youth"?"Youth":"Adult"} • Size ${x.size}`}</small><div class="qty-row"><button type="button" data-action="minus" data-index="${i}">−</button><span>${x.quantity}</span><button type="button" data-action="plus" data-index="${i}">+</button><button class="remove-item" type="button" data-action="remove" data-index="${i}">Remove</button></div></div><div class="cart-item-price">${money(x.unitPrice*x.quantity)}</div></div>`).join("");

 

    const delivery=document.querySelector('input[name="delivery"]:checked')?.value||"shipping";

    pickupNote.hidden=delivery!=="pickup";

    const subtotal=cart.reduce((a,x)=>a+x.unitPrice*x.quantity,0);

    total.textContent=money(subtotal+(cart.length&&delivery==="shipping"?6.95:0));

    checkout.disabled=!cart.length;

  }

 

  document.getElementById("cartLaunch").addEventListener("click",openCart);

  document.getElementById("cartClose").addEventListener("click",closeCart);

  overlay.addEventListener("click",closeCart);

  document.querySelectorAll('input[name="delivery"]').forEach(r=>r.addEventListener("change",renderCart));

 

  checkout.addEventListener("click",async()=>{

    if(!cart.length) return;

    errorBox.style.display="none";

    checkout.disabled=true;

    checkout.textContent="Opening secure checkout…";

    try{

      const delivery=document.querySelector('input[name="delivery"]:checked')?.value||"shipping";

      const response=await fetch("/api/create-checkout-session",{

        method:"POST",

        headers:{"Content-Type":"application/json"},

        body:JSON.stringify({

          delivery,

          items:cart.map(x=>({

            priceId:x.priceId,quantity:x.quantity,size:x.size,

            fit:x.fit,productKey:x.productKey,name:x.name

          }))

        })

      });

      const data=await response.json();

      if(!response.ok||!data.url) throw new Error(data.error||"Checkout could not be started.");

      window.location.href=data.url;

    }catch(err){

      errorBox.textContent=err.message||"Checkout could not be started. Please try again.";

      errorBox.style.display="block";

      checkout.disabled=false;

      checkout.textContent="Secure Checkout";

    }

  });

 

  renderCart();

})();