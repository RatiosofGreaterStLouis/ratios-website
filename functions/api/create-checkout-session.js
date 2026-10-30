import {PRODUCTS} from '../../assets/js/identification-catalog.js';
const ALLOWED_PRICES=new Set(["price_1UIv6kBEQmRGbpGgZw0UUlnv","price_1UIv6kBEQmRGbpGgJq0nnuZY","price_1UIv6kBEQmRGbpGgXi4mmD2W","price_1UIvK6BEQmRGbpGgxOFdbVuD","price_1UIvK6BEQmRGbpGgiY2KLRxE","price_1UIvK6BEQmRGbpGgP2qkUAz5","price_1UIvP2BEQmRGbpGgUOIZ33xt","price_1UIvP2BEQmRGbpGgO8f6ixBP","price_1UIvP2BEQmRGbpGgPg1x1cft","price_1UIveqBEQmRGbpGg9x566pkY"]);

 

const json=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{"Content-Type":"application/json","Cache-Control":"no-store"}});

 

export async function onRequestPost(context){

 try{

  if(!context.env.STRIPE_SECRET_KEY)return json({error:"Stripe is not configured."},500);

 

  const raw=await context.request.text();if(raw.length>40000)return json({error:"Order is too large."},413);
  const body=JSON.parse(raw),items=Array.isArray(body.items)?body.items:[],delivery=body.delivery==="pickup"?"pickup":"shipping";

 

  if(!items.length||items.length>40)return json({error:"Your cart is empty."},400);

 

  for(const item of items){

   if(item.identificationId){
    if(!PRODUCTS.some(p=>p.id===item.identificationId))return json({error:"Invalid identification item."},400);
    const p=item.personalization;
    if(!p||typeof p.personName!=="string"||!p.personName.trim()||p.personName.length>80||typeof p.profileEmail!=="string"||p.profileEmail.length>150||! /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(p.profileEmail)||typeof p.notes!=="string"||p.notes.length>150||typeof p.color!=="string"||p.color.length>30)return json({error:"Please complete the identification personalization."},400);
   }else if(!ALLOWED_PRICES.has(item.priceId))return json({error:"Invalid product selection."},400);

   if(!Number.isInteger(item.quantity)||item.quantity<1||item.quantity>20)return json({error:"Invalid quantity."},400);

  }

 

  const origin=new URL(context.request.url).origin,form=new URLSearchParams();

 

  form.set("mode","payment");

  form.set("success_url",`${origin}/order-confirmation.html?session_id={CHECKOUT_SESSION_ID}`);

  form.set("cancel_url",`${origin}/shop.html?checkout=cancelled`);

  form.set("billing_address_collection","auto");

  form.set("phone_number_collection[enabled]","true");

  form.set("metadata[delivery_method]",delivery);

 

  items.forEach((item,i)=>{

   if(item.identificationId){
    const product=PRODUCTS.find(p=>p.id===item.identificationId),p=item.personalization;
    form.set(`line_items[${i}][price_data][currency]`,"usd");
    form.set(`line_items[${i}][price_data][unit_amount]`,String(product.amount));
    form.set(`line_items[${i}][price_data][product_data][name]`,product.name);
    form.set(`metadata[item_${i+1}]`,`For: ${p.personName.trim()} | ${p.profileEmail.trim()} | ${p.color} | ${p.notes} | Welcome kit: ${p.firstKit===true?"requested":"not requested"}`);
   }else form.set(`line_items[${i}][price]`,item.priceId);

   form.set(`line_items[${i}][quantity]`,String(item.quantity));

   if(!item.identificationId)form.set(`metadata[item_${i+1}]`,`${item.name||"Item"} | ${item.fit||""}${item.size?" | Size "+item.size:""}`.slice(0,500));

  });

 

  if(delivery==="shipping"){

   form.set("shipping_address_collection[allowed_countries][0]","US");

   form.set("shipping_options[0][shipping_rate_data][type]","fixed_amount");

   form.set("shipping_options[0][shipping_rate_data][fixed_amount][amount]","695");

   form.set("shipping_options[0][shipping_rate_data][fixed_amount][currency]","usd");

   form.set("shipping_options[0][shipping_rate_data][display_name]","Flat-rate shipping");

  }else{

   form.set("metadata[pickup_note]","Local pickup - pickup details provided after order confirmation");

  }

 

  const r=await fetch("https://api.stripe.com/v1/checkout/sessions",{

   method:"POST",

   headers:{Authorization:`Bearer ${context.env.STRIPE_SECRET_KEY}`,"Content-Type":"application/x-www-form-urlencoded"},

   body:form.toString()

  }),d=await r.json();

 

  if(!r.ok){

   console.error("Stripe Checkout error:",d?.error?.message||d);

   return json({error:"Stripe could not start checkout. Please try again."},502);

  }

 

  return json({url:d.url});

 }catch(e){

  console.error("Checkout function error:",e);

  return json({error:"Checkout could not be started."},500);

 }

}

 

export function onRequestGet(){return json({error:"Method not allowed."},405)}