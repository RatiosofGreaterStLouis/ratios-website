const json=(body,status=200)=>new Response(JSON.stringify(body),{

  status,

  headers:{

    'Content-Type':'application/json',

    'Cache-Control':'no-store'

  }

});

 

function validEmail(value){

  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

}

 

export async function onRequestGet(){

  return json({ok:true,service:'RATIOS newsletter signup'});

}

 

export async function onRequestPost({request,env}){

  try{

    if(!env.BREVO_API_KEY){

      return json({ok:false,error:'Newsletter service is not configured.'},500);

    }

 

    const body=await request.json().catch(()=>null);

    const email=String(body?.email||'').trim().toLowerCase();

 

    if(!email||!validEmail(email)){

      return json({ok:false,error:'Please enter a valid email address.'},400);

    }

 

    // Save the subscriber in Brevo Contacts.

    // If BREVO_NEWS_LIST_ID is later added in Cloudflare, the same request

    // will also place the subscriber into that specific Brevo list.

    const contactPayload={

      email,

      updateEnabled:true

    };

 

    const listId=Number(env.BREVO_NEWS_LIST_ID);

    if(Number.isInteger(listId)&&listId>0){

      contactPayload.listIds=[listId];

    }

 

    const contactResponse=await fetch('https://api.brevo.com/v3/contacts',{

      method:'POST',

      headers:{

        'accept':'application/json',

        'api-key':env.BREVO_API_KEY,

        'content-type':'application/json'

      },

      body:JSON.stringify(contactPayload)

    });

 

    // Brevo may return 201 for a new contact or 204 for an update.

    if(!contactResponse.ok){

      const detail=await contactResponse.text();

      console.error('Brevo contact error:',contactResponse.status,detail);

      return json({ok:false,error:'Unable to save newsletter signup.'},502);

    }

 

    // Send RATIOS an internal notification using the same Brevo key.

    const senderEmail=env.ONEPROFILE_SENDER_EMAIL||'info@ratiossaveslives.org';

    const notifyEmail=env.RATIOS_NOTIFICATION_EMAIL||'info@ratiossaveslives.org';

 

    const notification={

      sender:{name:'RATIOS Website',email:senderEmail},

      to:[{email:notifyEmail,name:'RATIOS'}],

      subject:'New RATIOS News Subscriber',

      htmlContent:

        '<h2>New RATIOS News Subscriber</h2>'+

        '<p>A visitor joined the RATIOS news list.</p>'+

        '<p><strong>Email:</strong> '+email.replace(/[<>&"']/g,'')+'</p>'+

        '<p>Source: News &amp; Events page</p>'

    };

 

    const mailResponse=await fetch('https://api.brevo.com/v3/smtp/email',{

      method:'POST',

      headers:{

        'accept':'application/json',

        'api-key':env.BREVO_API_KEY,

        'content-type':'application/json'

      },

      body:JSON.stringify(notification)

    });

 

    if(!mailResponse.ok){

      const detail=await mailResponse.text();

      console.error('Brevo notification error:',mailResponse.status,detail);

      // The subscriber was already saved, so do not tell the visitor signup failed.

    }

 

    return json({ok:true});

  }catch(error){

    console.error('Newsletter signup error:',error);

    return json({ok:false,error:'Unable to complete signup.'},500);

  }

}