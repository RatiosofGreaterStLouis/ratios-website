const json=(body,status=200,headers={})=>new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store',...headers}});
const hex=(buf)=>[...new Uint8Array(buf)].map(b=>b.toString(16).padStart(2,'0')).join('');
async function hash(value){return hex(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value)));}
function cookieValue(request,name){const raw=request.headers.get('Cookie')||'';for(const part of raw.split(';')){const [k,...v]=part.trim().split('=');if(k===name)return v.join('=');}return '';}
function clean(v,max=1000){return String(v??'').trim().slice(0,max);}
async function auth(request,env){
  const token=cookieValue(request,'oneprofile_session'); if(!token) return null;
  const tokenHash=await hash(token), now=Math.floor(Date.now()/1000);
  const session=await env.ONEPROFILE_DB.prepare(`SELECT caregiver_email,enrollment_id,expires_at FROM oneprofile_sessions WHERE token_hash=? LIMIT 1`).bind(tokenHash).first();
  if(!session||Number(session.expires_at)<now) return null;
  const enrollment=await env.ONEPROFILE_DB.prepare(`SELECT enrollment_id,participant_first_name,participant_age_range,caregiver_first_name,caregiver_email FROM oneprofile_enrollments WHERE enrollment_id=? AND lower(caregiver_email)=? LIMIT 1`).bind(session.enrollment_id,String(session.caregiver_email).toLowerCase()).first();
  if(!enrollment) return null; return {session,enrollment,tokenHash};
}
export async function onRequestGet({request,env}){
  try{if(!env.ONEPROFILE_DB)return json({error:'Database unavailable.'},503);const a=await auth(request,env);if(!a)return json({authenticated:false},401);
    let details=await env.ONEPROFILE_DB.prepare(`SELECT preferred_name,communication_method,communication_notes,sensory_triggers,calming_supports,touch_preference,safety_risk_level,known_destinations,safe_approach,emergency_contact_name,emergency_contact_relationship,emergency_contact_phone,alternate_contact_name,alternate_contact_phone,responder_notes,updated_at FROM oneprofile_profile_details WHERE enrollment_id=? LIMIT 1`).bind(a.enrollment.enrollment_id).first();
    if(!details){await env.ONEPROFILE_DB.prepare(`INSERT OR IGNORE INTO oneprofile_profile_details (enrollment_id) VALUES (?)`).bind(a.enrollment.enrollment_id).run();details={};}
    return json({authenticated:true,enrollment:a.enrollment,details});
  }catch(e){console.error(e);return json({error:'Unable to load profile.'},500);}
}
export async function onRequestPost({request,env}){
  try{if(!env.ONEPROFILE_DB)return json({error:'Database unavailable.'},503);const a=await auth(request,env);if(!a)return json({authenticated:false},401);
    const b=await request.json();
    const d={
      preferred_name:clean(b.preferred_name,80), communication_method:clean(b.communication_method,80), communication_notes:clean(b.communication_notes,700),
      sensory_triggers:clean(b.sensory_triggers,700), calming_supports:clean(b.calming_supports,700), touch_preference:clean(b.touch_preference,120),
      safety_risk_level:clean(b.safety_risk_level,40), known_destinations:clean(b.known_destinations,700), safe_approach:clean(b.safe_approach,700),
      emergency_contact_name:clean(b.emergency_contact_name,120), emergency_contact_relationship:clean(b.emergency_contact_relationship,80), emergency_contact_phone:clean(b.emergency_contact_phone,40),
      alternate_contact_name:clean(b.alternate_contact_name,120), alternate_contact_phone:clean(b.alternate_contact_phone,40), responder_notes:clean(b.responder_notes,900)
    };
    if(!d.communication_method||!d.safety_risk_level||!d.emergency_contact_name||!d.emergency_contact_relationship||!d.emergency_contact_phone){return json({error:'Please complete all required fields.'},400);}
    await env.ONEPROFILE_DB.prepare(`INSERT INTO oneprofile_profile_details (enrollment_id,preferred_name,communication_method,communication_notes,sensory_triggers,calming_supports,touch_preference,safety_risk_level,known_destinations,safe_approach,emergency_contact_name,emergency_contact_relationship,emergency_contact_phone,alternate_contact_name,alternate_contact_phone,responder_notes,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,datetime('now')) ON CONFLICT(enrollment_id) DO UPDATE SET preferred_name=excluded.preferred_name,communication_method=excluded.communication_method,communication_notes=excluded.communication_notes,sensory_triggers=excluded.sensory_triggers,calming_supports=excluded.calming_supports,touch_preference=excluded.touch_preference,safety_risk_level=excluded.safety_risk_level,known_destinations=excluded.known_destinations,safe_approach=excluded.safe_approach,emergency_contact_name=excluded.emergency_contact_name,emergency_contact_relationship=excluded.emergency_contact_relationship,emergency_contact_phone=excluded.emergency_contact_phone,alternate_contact_name=excluded.alternate_contact_name,alternate_contact_phone=excluded.alternate_contact_phone,responder_notes=excluded.responder_notes,updated_at=datetime('now')`).bind(a.enrollment.enrollment_id,d.preferred_name,d.communication_method,d.communication_notes,d.sensory_triggers,d.calming_supports,d.touch_preference,d.safety_risk_level,d.known_destinations,d.safe_approach,d.emergency_contact_name,d.emergency_contact_relationship,d.emergency_contact_phone,d.alternate_contact_name,d.alternate_contact_phone,d.responder_notes).run();
    await env.ONEPROFILE_DB.prepare(`UPDATE oneprofile_profiles SET profile_status='in_progress',updated_at=datetime('now') WHERE enrollment_id=?`).bind(a.enrollment.enrollment_id).run();
    return json({ok:true,status:'in_progress'});
  }catch(e){console.error(e);return json({error:'Unable to save profile.'},500);}
}
export async function onRequest(ctx){if(ctx.request.method==='GET')return onRequestGet(ctx);if(ctx.request.method==='POST')return onRequestPost(ctx);return json({error:'Method not allowed'},405);}
