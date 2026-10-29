// Dukaan Khata — owner data syncs to the shared database for customer portal access
(function(){
  const SUPABASE_URL="https://nzsldzyjpxwyyrdwkphp.supabase.co";
  const SUPABASE_PUBLISHABLE_KEY="sb_publishable_k3ZPG1Wuqm3KFzoQAXnByA_YTMLkUG-";
  window.DukaanKhataMode="cloud";
  window.DukaanKhataSyncVersion="2026-10-29f";
  window.dkSupabase=null;
  window.DukaanKhataUser=null;
  let syncTimer=null, syncing=false, syncRequested=false, cloudPollTimer=null, pollInFlight=false, cloudRealtimeChannel=null, cloudRealtimeUid="", localMutationVersion=0;
  const SHARED_PREFERENCE_KEYS=["dukaan_khata_background_theme","dukaan_khata_pass_profile","dukaan_khata_pass_color","dukaan_khata_outstanding_color","dukaan_khata_logo_text","dukaan_khata_logo_image","dukaan_khata_global_background_v1","dukaan_khata_language"];

  function client(){
    if(window.dkSupabase)return window.dkSupabase;
    if(!window.supabase?.createClient)return null;
    window.dkSupabase=window.supabase.createClient(SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
    window.dispatchEvent(new CustomEvent("dk:supabase-ready"));
    return window.dkSupabase;
  }
  function accountFromUser(u){
    const identities=Array.isArray(u?.identities)?u.identities:[];
    const googleIdentity=identities.find(x=>String(x?.provider||"").toLowerCase()==="google")||identities.find(x=>x?.identity_data?.picture||x?.identity_data?.avatar_url)||identities[0]||{};
    const identity=googleIdentity.identity_data||{};
    const meta=u?.user_metadata||{};
    const picture=meta.picture||meta.avatar_url||meta.photo_url||meta.profile_picture||identity.picture||identity.avatar_url||identity.photo_url||identity.profile_picture||"";
    return u?{id:u.id,name:meta.full_name||meta.name||identity.full_name||identity.name||u.email?.split("@")[0]||"Google account",email:u.email||"",picture}:null;
  }
  function paintOwnerStartProfile(account){
    const img=document.getElementById("ownerStartPhoto"),initial=document.getElementById("ownerStartInitial"),btn=document.getElementById("ownerStartProfile");
    if(!img||!initial||!btn)return;
    const picture=String(account?.picture||"").trim();
    if(picture){img.src=picture;img.hidden=false;initial.hidden=true;img.onerror=()=>{img.hidden=true;initial.hidden=false;initial.textContent=(account?.name||"O").trim().charAt(0).toUpperCase()||"O"};}
    else{img.removeAttribute("src");img.hidden=true;initial.hidden=false;initial.textContent=(account?.name||"Owner").trim().charAt(0).toUpperCase()||"O";}
    btn.title=account?.name?("Owner: "+account.name):"Owner Google profile";
    btn.setAttribute("aria-label",account?.name?("Owner Google profile: "+account.name):"Owner Google profile");
  }
  function saveAccount(user){
    window.DukaanKhataUser=accountFromUser(user);
    localStorage.setItem("dukaan_khata_account",JSON.stringify(window.DukaanKhataUser||null));
    paintOwnerStartProfile(window.DukaanKhataUser);
  }
  try{paintOwnerStartProfile(JSON.parse(localStorage.getItem("dukaan_khata_account")||"null"))}catch(e){paintOwnerStartProfile(null)}
  function mergeStates(primary, secondary){
    const a=primary&&typeof primary==="object"?primary:{};
    const b=secondary&&typeof secondary==="object"?secondary:{};
    const out={...b,...a};
    // Fresh browsers start with placeholder shop values. Do not let those
    // defaults replace a real profile already saved by this Google owner.
    const primaryShop=a.shop&&typeof a.shop==="object"?a.shop:{};
    const secondaryShop=b.shop&&typeof b.shop==="object"?b.shop:{};
    const shop={...secondaryShop,...primaryShop};
    for(const key of ["name","owner","phone","upi","address","profilePic"]){
      const primary=String(primaryShop[key]??"").trim();
      const secondary=String(secondaryShop[key]??"").trim();
      const placeholder=(key==="name"&&primary==="My Dukaan")||(key==="owner"&&primary==="Shop Owner");
      if((!primary||placeholder)&&secondary)shop[key]=secondary;
      else if(primary)shop[key]=primary;
      else if(!(key in shop))shop[key]=primaryShop[key]??secondaryShop[key]??"";
    }
    out.shop=shop;
    // A deletion tombstone must win over stale copies on every device. Never use
    // a union-only merge for customers without carrying explicit deletion IDs.
    const deletedCustomerIds=Array.from(new Set([
      ...(Array.isArray(a.deletedCustomerIds)?a.deletedCustomerIds:[]),
      ...(Array.isArray(b.deletedCustomerIds)?b.deletedCustomerIds:[])
    ].map(String)));
    const deleted=new Set(deletedCustomerIds);
    out.deletedCustomerIds=deletedCustomerIds;
    const deletedRecordIds={...(b.deletedRecordIds||{}),...(a.deletedRecordIds||{})};
    for(const key of ["tx","expenses","returns","reminders"]){
      deletedRecordIds[key]=Array.from(new Set([
        ...(Array.isArray(a.deletedRecordIds?.[key])?a.deletedRecordIds[key]:[]),
        ...(Array.isArray(b.deletedRecordIds?.[key])?b.deletedRecordIds[key]:[])
      ].map(String)));
    }
    out.deletedRecordIds=deletedRecordIds;
    for(const key of ["customers","tx","expenses","returns","reminders"]){
      const first=Array.isArray(a[key])?a[key]:[];
      const second=Array.isArray(b[key])?b[key]:[];
      const map=new Map();
      for(const item of second)map.set(String(item?.id??JSON.stringify(item)),item);
      for(const item of first)map.set(String(item?.id??JSON.stringify(item)),item);
      out[key]=Array.from(map.values());
    }
    out.customers=out.customers.filter(item=>!deleted.has(String(item?.id)));
    for(const key of ["tx","expenses","returns","reminders"]){
      const ids=new Set(deletedRecordIds[key]);
      out[key]=out[key].filter(item=>!ids.has(String(item?.id)));
    }
    // Deleting a customer also deletes their linked bills and reminders. Apply
    // the customer tombstone during every merge so an older cloud copy cannot
    // bring those linked records back after refresh or the next poll.
    out.tx=out.tx.filter(item=>!deleted.has(String(item?.customerId??item?.customer_id??"")));
    out.reminders=out.reminders.filter(item=>!deleted.has(String(item?.customerId??item?.customer_id??"")));
    // Keep the validated shop merge above; a raw spread here would reintroduce placeholder overwrites.
    out.settings={...(b.settings||{}),...(a.settings||{})};
    out.cloudPreferences={...(b.cloudPreferences||{}),...(a.cloudPreferences||{})};
    return out;
  }
  function stateKey(){return "dukaan_khata_infinity_v2"}
  function same(a,b){try{return JSON.stringify(a)===JSON.stringify(b)}catch(e){return false}}
  function localState(){
    try{
      const v=JSON.parse(localStorage.getItem(stateKey())||"null");
      if(!v||typeof v!=="object")return null;
      const prefs={...(v.cloudPreferences||{})};
      for(const key of SHARED_PREFERENCE_KEYS){
        if(!Object.prototype.hasOwnProperty.call(prefs,key)){
          const value=localStorage.getItem(key);
          if(value!==null)prefs[key]=value;
        }
      }
      return {...v,cloudPreferences:prefs};
    }catch(e){return null}
  }
  function applySharedPreferences(snapshot){
    const prefs=snapshot?.cloudPreferences;
    if(!prefs||typeof prefs!=="object")return;
    for(const key of SHARED_PREFERENCE_KEYS){
      if(!Object.prototype.hasOwnProperty.call(prefs,key))continue;
      try{if(prefs[key]===null)localStorage.removeItem(key);else if(typeof prefs[key]==="string")localStorage.setItem(key,prefs[key]);}catch(e){console.warn("Could not apply shared preference",key,e)}
    }
  }
  window.dkSaveSharedPreference=function(key,value){
    if(!SHARED_PREFERENCE_KEYS.includes(key))return false;
    try{
      if(value===null)localStorage.removeItem(key);else localStorage.setItem(key,String(value));
      const current=window.state&&typeof window.state==="object"?window.state:{};
      current.cloudPreferences={...(current.cloudPreferences||{}),[key]:value===null?null:String(value)};
      window.state=current;
      localStorage.setItem(stateKey(),JSON.stringify(current));
      if(typeof window.dkQueueSync==="function")window.dkQueueSync();
      return true;
    }catch(e){console.warn("Shared preference could not be saved",key,e);return false}
  };
  // Keep a device-local safety copy per Google owner before switching accounts.
  // This is a recovery fallback only; cloud remains the shared source of truth.
  function accountBackupKey(uid){return "dukaan_khata_local_backup_"+String(uid||"")}
  function readAccountBackup(uid){
    if(!uid)return null;
    try{const v=JSON.parse(localStorage.getItem(accountBackupKey(uid))||"null");return v&&typeof v==="object"?v:null}catch(e){return null}
  }
  function saveAccountBackup(uid,snapshot){
    if(!uid||!snapshot||typeof snapshot!=="object")return;
    try{localStorage.setItem(accountBackupKey(uid),JSON.stringify(snapshot))}catch(e){console.warn("Could not save owner recovery copy on this device",e)}
  }
  async function readCloud(sb,uid){
    const {data,error}=await sb.from("dukaan_khata_state").select("state,updated_at").eq("user_id",uid).maybeSingle();
    if(error)throw error;
    return data||null;
  }
  async function writeCloud(sb,uid,data,baseUpdatedAt){
    // Optimistic concurrency: never blindly upsert a stale whole-account snapshot.
    // If another device writes between our read and write, merge its latest row
    // and retry against that exact updated_at version.
    let candidate=data&&typeof data==="object"?data:{};
    let expectedVersion=baseUpdatedAt;
    for(let attempt=0;attempt<6;attempt++){
      const current=await readCloud(sb,uid);
      if(current){
        if(expectedVersion!==undefined&&current.updated_at!==expectedVersion){
          // A concurrent device won the previous race. Preserve its version for
          // records with the same ID, while retaining unique local records and tombstones.
          candidate=mergeStates(current.state,candidate);
        }else if(expectedVersion===undefined){
          candidate=mergeStates(candidate,current.state);
        }
        const nextStamp=new Date().toISOString();
        const result=await sb.from("dukaan_khata_state")
          .update({state:candidate,updated_at:nextStamp})
          .eq("user_id",uid).eq("updated_at",current.updated_at)
          .select("updated_at").maybeSingle();
        if(result.error)throw result.error;
        if(result.data){
          const verified=await readCloud(sb,uid);
          if(verified&&verified.updated_at)localStorage.setItem("dukaan_khata_cloud_updated_at",verified.updated_at);
          return verified;
        }
        expectedVersion=current.updated_at;
        continue;
      }
      const inserted=await sb.from("dukaan_khata_state")
        .insert({user_id:uid,state:candidate,updated_at:new Date().toISOString()});
      if(!inserted.error){
        const row=await readCloud(sb,uid);
        if(row&&row.updated_at)localStorage.setItem("dukaan_khata_cloud_updated_at",row.updated_at);
        return row;
      }
      // Another device may have created this owner's first row concurrently.
      if(inserted.error.code!=="23505")throw inserted.error;
      expectedVersion="";
    }
    throw new Error("Cloud state changed repeatedly while saving. Local data is preserved; retry sync.");
  }
  async function compactShopPhoto(snapshot){
    const picture=snapshot?.shop?.profilePic;
    if(typeof picture!=="string"||picture.length<350000||!picture.startsWith("data:image/"))return snapshot;
    try{
      const compressed=await new Promise(resolve=>{
        const image=new Image();
        image.onerror=()=>resolve(picture);
        image.onload=()=>{
          try{
            const scale=Math.min(1,800/Math.max(image.naturalWidth||image.width,image.naturalHeight||image.height));
            const canvas=document.createElement("canvas");
            canvas.width=Math.max(1,Math.round((image.naturalWidth||image.width)*scale));
            canvas.height=Math.max(1,Math.round((image.naturalHeight||image.height)*scale));
            const ctx=canvas.getContext("2d");
            if(!ctx){resolve(picture);return}
            ctx.fillStyle="#ffffff";ctx.fillRect(0,0,canvas.width,canvas.height);
            ctx.drawImage(image,0,0,canvas.width,canvas.height);
            canvas.toBlob(blob=>{
              if(!blob||blob.size*1.4>=picture.length*0.85){resolve(picture);return}
              const reader=new FileReader();
              reader.onload=()=>resolve(typeof reader.result==="string"&&reader.result.length<picture.length*0.85?reader.result:picture);
              reader.onerror=()=>resolve(picture);
              reader.readAsDataURL(blob);
            },"image/jpeg",0.76);
          }catch(e){resolve(picture)}
        };
        image.src=picture;
      });
      if(compressed===picture)return snapshot;
      return {...snapshot,shop:{...(snapshot.shop||{}),profilePic:compressed}};
    }catch(e){return snapshot}
  }
  async function compactPreferenceImage(value){
    if(typeof value!=="string"||value.length<350000||!value.startsWith("data:image/"))return value;
    try{return await new Promise(resolve=>{
      const image=new Image();
      image.onerror=()=>resolve(value);
      image.onload=()=>{
        try{
          const scale=Math.min(1,1000/Math.max(image.naturalWidth||image.width,image.naturalHeight||image.height));
          const canvas=document.createElement("canvas");
          canvas.width=Math.max(1,Math.round((image.naturalWidth||image.width)*scale));
          canvas.height=Math.max(1,Math.round((image.naturalHeight||image.height)*scale));
          const ctx=canvas.getContext("2d");if(!ctx){resolve(value);return}
          ctx.fillStyle="#ffffff";ctx.fillRect(0,0,canvas.width,canvas.height);
          ctx.drawImage(image,0,0,canvas.width,canvas.height);
          canvas.toBlob(blob=>{
            if(!blob||blob.size*1.4>=value.length*0.85){resolve(value);return}
            const reader=new FileReader();
            reader.onload=()=>resolve(typeof reader.result==="string"&&reader.result.length<value.length*0.85?reader.result:value);
            reader.onerror=()=>resolve(value);reader.readAsDataURL(blob);
          },"image/jpeg",0.78);
        }catch(e){resolve(value)}
      };
      image.src=value;
    })}catch(e){return value}
  }
  async function compactSharedPreferences(snapshot){
    const prefs={...(snapshot?.cloudPreferences||{})};
    if(typeof prefs["dukaan_khata_logo_image"]==="string")
      prefs["dukaan_khata_logo_image"]=await compactPreferenceImage(prefs["dukaan_khata_logo_image"]);
    const bgKey="dukaan_khata_global_background_v1";
    if(typeof prefs[bgKey]==="string"){
      try{
        const bg=JSON.parse(prefs[bgKey]);
        if(bg&&typeof bg.image==="string"){
          const image=await compactPreferenceImage(bg.image);
          if(image!==bg.image)prefs[bgKey]=JSON.stringify({...bg,image});
        }
      }catch(e){}
    }
    return {...snapshot,cloudPreferences:prefs};
  }
  async function syncToCloud(){
    // Device-local mode: never merge, upload, or restore customer data from cloud.
    if(window.DukaanKhataMode!=="cloud")return;
    const sb=client(),userId=window.DukaanKhataUser?.id;
    if(!sb||!userId)return;
    // Serialize writes. A request arriving during a sync must trigger another pass.
    if(syncing){syncRequested=true;return;}
    if(localStorage.getItem("dukaan_khata_cloud_user_id")!==userId ||
       localStorage.getItem("dukaan_khata_local_cloud_ready")!=="1")return;
    syncing=true;
    const syncVersion=localMutationVersion;
    try{
      let local=localState()||window.state;
      if(!local||typeof local!=="object")return;
      const originalLocal=local;
      local=await compactShopPhoto(local);
      local=await compactSharedPreferences(local);
      if(localMutationVersion===syncVersion&&local!==originalLocal){
        // Profile photos are display assets, not ledger data. Compress oversized
        // data URLs before syncing so they cannot exhaust mobile storage or make
        // every full-state upload several megabytes.
        localStorage.setItem(stateKey(),JSON.stringify(local));
        if(window.state===originalLocal||same(window.state,originalLocal))window.state=local;
      }else if(localMutationVersion!==syncVersion){
        local=localState()||window.state||local;
      }
      const row=await readCloud(sb,userId);
      // Re-read after the network wait. If a deletion/edit happened while the
      // cloud read was in flight, merge the newest local snapshot, not the stale one.
      if(localMutationVersion!==syncVersion){
        local=localState()||window.state||local;
      }
      const merged=row?.state?mergeStates(local,row.state):local;
      // Use the server-verified snapshot returned by writeCloud, not just the
      // pre-write candidate. This makes deletions/tombstones acknowledged only
      // after the durable row has been read back successfully.
      const written=await writeCloud(sb,userId,merged,row?.updated_at);
      const committed=written?.state?mergeStates(written.state,written.state):merged;
      applySharedPreferences(committed);
      localStorage.setItem("dukaan_khata_local_cloud_ready","1");
      if(localMutationVersion===syncVersion){
        // Only replace local state when no user edit occurred during the whole
        // read/merge/write. Otherwise keep the newer local state for the next pass.
        localStorage.setItem(stateKey(),JSON.stringify(committed));
        localStorage.removeItem("dukaan_khata_local_dirty");
        if(!same(window.state,committed)){
          window.state=committed;
          try{if(typeof window.render==="function")window.render()}catch(e){console.warn("Could not redraw after cloud sync",e)}
        }
      }else{
        localStorage.setItem("dukaan_khata_local_dirty","1");
        syncRequested=true;
      }
    }catch(e){
      console.error("Dukaan Khata database sync failed:",e);
      localStorage.setItem("dukaan_khata_local_dirty","1");
      if(window.toast)window.toast("Cloud sync failed. Your changes remain saved on this device and will retry when sync is available.");
    }finally{
      syncing=false;
      if(syncRequested){
        syncRequested=false;
        clearTimeout(syncTimer);
        syncTimer=setTimeout(()=>syncToCloud(),0);
      }
    }
  }
  window.dkSyncNow=syncToCloud;
  window.dkQueueSync=function(){
    if(window.DukaanKhataMode!=="cloud")return;
    localMutationVersion++;
    localStorage.setItem("dukaan_khata_local_dirty","1");
    clearTimeout(syncTimer);
    syncTimer=setTimeout(syncToCloud,100);
  };
  async function pollCloud(){
    // Hard stop: local-only mode must never read or restore remote shop data.
    if(window.DukaanKhataMode!=="cloud")return;
    const sb=client(),userId=window.DukaanKhataUser?.id;
    if(!sb||!userId||syncing||pollInFlight||localStorage.getItem("dukaan_khata_local_dirty")==="1")return;
    if(localStorage.getItem("dukaan_khata_cloud_user_id")!==userId ||
       localStorage.getItem("dukaan_khata_local_cloud_ready")!=="1")return;
    pollInFlight=true;
    const pollVersion=localMutationVersion;
    const hasLocalMutation=()=>localMutationVersion!==pollVersion||localStorage.getItem("dukaan_khata_local_dirty")==="1"||syncing;
    try{
      const row=await readCloud(sb,userId);
      // Polling is read-only with respect to the browser's current edits. If a
      // local save or cloud sync began while the read was pending, discard it.
      if(hasLocalMutation())return;
      if(!row?.state)return;
      let merged=mergeStates(row.state,row.state);
      let cloudUpdatedAt=row.updated_at||"";
      if(!same(merged,row.state)){
        await writeCloud(sb,userId,merged,row.updated_at);
        if(hasLocalMutation())return;
        cloudUpdatedAt=localStorage.getItem("dukaan_khata_cloud_updated_at")||cloudUpdatedAt;
      }
      if(hasLocalMutation())return;
      const last=localStorage.getItem("dukaan_khata_cloud_updated_at")||"";
      if((cloudUpdatedAt&&cloudUpdatedAt!==last)||!same(row.state,merged)){
        const local=localState()||{};
        // Never clear the dirty flag here. Only a completed syncToCloud write
        // may acknowledge local edits; a poll must not acknowledge a deletion.
        applySharedPreferences(merged);
        localStorage.setItem(stateKey(),JSON.stringify(merged));
        if(cloudUpdatedAt)localStorage.setItem("dukaan_khata_cloud_updated_at",cloudUpdatedAt);
        if(!same(local,merged)){
          window.state=merged;
          try{if(typeof window.render==="function")window.render()}catch(e){console.warn("Could not redraw cloud data",e)}
        }
      }
    }catch(e){console.error("Dukaan Khata cloud polling failed:",e)}
    finally{pollInFlight=false}
  }
  function startCloudPolling(){
    clearInterval(cloudPollTimer);
    const userId=window.DukaanKhataUser?.id;
    const sb=client();
    // Supabase Realtime delivers cross-device writes immediately when the table
    // is included in the project's Realtime publication. The 1-second poll is
    // a fallback for projects/environments where Realtime is not enabled.
    if(sb&&userId&&cloudRealtimeUid!==userId){
      try{if(cloudRealtimeChannel)sb.removeChannel(cloudRealtimeChannel)}catch(e){}
      cloudRealtimeUid=userId;
      cloudRealtimeChannel=sb.channel("dk-shared-state-"+userId)
        .on("postgres_changes",{event:"*",schema:"public",table:"dukaan_khata_state",filter:"user_id=eq."+userId},()=>{
          if(!syncing&&!pollInFlight)pollCloud();
        })
        .subscribe(status=>{if(status==="SUBSCRIBED")pollCloud()});
    }
    cloudPollTimer=setInterval(pollCloud,1000);
  }
  async function restoreCloudState(user){
    // Hard stop: preserve device-local records; never import a cloud snapshot.
    if(window.DukaanKhataMode!=="cloud")return;
    const uid=user?.id;
    const restoredKey=uid?"dukaan_khata_restored_"+uid:"";
    if(!uid)return;
    // Always verify the durable cloud row after a page reload. sessionStorage can
    // outlive a reload while the local state is missing/empty on some mobile browsers.
    try{
      const sb=client();
      const previousUid=localStorage.getItem("dukaan_khata_cloud_user_id");
      const currentLocal=localState();
      // Preserve the previous owner's current local snapshot before another
      // Google account is allowed to restore into the shared localStorage key.
      if(previousUid&&previousUid!==uid&&currentLocal)saveAccountBackup(previousUid,currentLocal);
      // Never copy one Google account's local shop records into another account.
      const local=(!previousUid||previousUid===uid)?currentLocal:null;
      const accountBackup=readAccountBackup(uid);
      const legacy=user?.user_metadata?.dukaan_khata;
      let row=await readCloud(sb,uid);
      if(!row){
        // One-time migration from the old metadata-based sync. If this owner has
        // a device-local recovery copy, use it instead of creating an empty cloud
        // state after an account switch. Other owners' records are never imported.
        let initial=local||accountBackup||legacy||{};
        if(local&&legacy)initial=mergeStates(legacy,local);
        else if(accountBackup&&legacy)initial=mergeStates(legacy,accountBackup);
        await writeCloud(sb,uid,initial);
        row=await readCloud(sb,uid);
      }else if(local&&(
        previousUid!==uid ||
        localStorage.getItem("dukaan_khata_local_cloud_ready")!=="1" ||
        localStorage.getItem("dukaan_khata_local_dirty")==="1"
      )){
        // Merge device-only or explicitly unsynced records during first migration.
        // Once this device is known to be synced and clean, cloud wins on login:
        // a stale local snapshot must not overwrite newer edits from another device.
        const merged=mergeStates(local,row.state);
        if(!same(merged,row.state))await writeCloud(sb,uid,merged,row.updated_at);
        row=await readCloud(sb,uid);
      }
      if(row?.state){
        const currentLocal=localState();
        // Sanitize any historical cloud snapshot before restoring it into the UI.
        const cleanCloudState=mergeStates(row.state,row.state);
        if(!same(cleanCloudState,row.state))await writeCloud(sb,uid,cleanCloudState,row.updated_at);
        row=await readCloud(sb,uid);
        const restoredState=row?.state?mergeStates(row.state,row.state):cleanCloudState;
        applySharedPreferences(restoredState);
        localStorage.setItem(stateKey(),JSON.stringify(restoredState));
        localStorage.setItem("dukaan_khata_cloud_updated_at",row?.updated_at||"");
        localStorage.removeItem("dukaan_khata_local_dirty");
        localStorage.setItem("dukaan_khata_local_cloud_ready","1");
        localStorage.setItem("dukaan_khata_cloud_user_id",uid);
        if(restoredKey)sessionStorage.setItem(restoredKey,"1");
        if(!same(currentLocal,restoredState)){
          window.state=restoredState;
          try{if(typeof window.render==="function")window.render()}catch(e){console.warn("Could not redraw restored cloud data",e)}
        }
      }
    }catch(e){
      console.error("Dukaan Khata initial database sync failed:",e);
      if(window.toast)window.toast("Cloud database is not ready yet. Your existing data remains saved on this device.");
    }
    startCloudPolling();
  }

  let portalPublishTimer=null, portalPublishSnapshot=null, portalPublishing=false;
  window.dkPublishCustomerPortalSnapshot=function(snapshot){
    if(!snapshot||typeof snapshot!=="object")return;
    portalPublishSnapshot=snapshot;
    clearTimeout(portalPublishTimer);
    portalPublishTimer=setTimeout(async()=>{
      if(portalPublishing){
        portalPublishTimer=setTimeout(()=>window.dkPublishCustomerPortalSnapshot(portalPublishSnapshot),1500);
        return;
      }
      const sb=client();
      if(!sb)return;
      const {data:{session}}=await sb.auth.getSession();
      if(!session?.access_token||!session?.user?.id)return;
      const snap=portalPublishSnapshot;portalPublishSnapshot=null;
      const deleted=new Set((Array.isArray(snap.deletedCustomerIds)?snap.deletedCustomerIds:[]).map(String));
      const customers=(Array.isArray(snap.customers)?snap.customers:[]).filter(c=>c?.id&&!deleted.has(String(c.id)));
      const normalizePhone=v=>{let d=String(v||"").replace(/\D/g,"");if(d.startsWith("0091")&&d.length===14)d=d.slice(4);if(d.startsWith("91")&&d.length===12)d=d.slice(2);if(d.length===11&&d.startsWith("0"))d=d.slice(1);return /^\d{10}$/.test(d)?d:""};
      const records=customers.filter(c=>normalizePhone(c.phone)).map(c=>{
        const id=String(c.id);
        const transactions=(Array.isArray(snap.tx)?snap.tx:[]).filter(t=>String(t?.customerId??t?.customer_id??"")===id);
        const reminders=(Array.isArray(snap.reminders)?snap.reminders:[]).filter(r=>String(r?.customerId??r?.customer_id??"")===id);
        return {customerId:id,phone:normalizePhone(c.phone),customerName:String(c.name||"Customer").slice(0,120),shopName:String(snap.shop?.name||"Dukaan").slice(0,120),shopOwner:String(snap.shop?.owner||"Shop Owner").slice(0,120),shopPhone:normalizePhone(snap.shop?.phone),shopAddress:String(snap.shop?.address||"").slice(0,240),transactions,reminders};
      });
      portalPublishing=true;
      try{
        const response=await fetch(SUPABASE_URL+"/functions/v1/customer-pin-portal",{method:"POST",headers:{"Content-Type":"application/json","apikey":SUPABASE_PUBLISHABLE_KEY,"Authorization":"Bearer "+session.access_token},body:JSON.stringify({action:"publish",records})});
        const result=await response.json().catch(()=>({}));
        if(!response.ok)throw new Error(result.error||"Customer portal publish failed");
        console.info("Customer portal records updated:",result.published);
      }catch(e){
        console.warn("Customer portal update did not complete; local owner data is unchanged.",e?.message||e);
        // Retry the same snapshot after transient network/service failures.
        portalPublishSnapshot=snap;
      }
      finally{portalPublishing=false;if(portalPublishSnapshot){clearTimeout(portalPublishTimer);portalPublishTimer=setTimeout(()=>window.dkPublishCustomerPortalSnapshot(portalPublishSnapshot),5000)}}
    },1200);
  };

  function showOwnerAccountPopup(user){
    const meta=user?.user_metadata||{};
    const name=meta.full_name||meta.name||meta.preferred_username||user?.email?.split("@")[0]||"Owner";
    const email=user?.email||"Google account";
    if(window.closeModal)window.closeModal();
    window.modal('<div class="dk-login-shell dk-login-signed"><div class="dk-login-top"><div class="dk-login-icon">👤</div><span class="dk-login-badge">OWNER ACCOUNT</span></div><h2>'+esc(name)+'</h2><p class="dk-login-sub">'+esc(email)+'</p><button class="dk-login-action dk-login-primary" id="dkOpenDashboard">⌂ Open Full Dashboard <span>→</span></button><button class="dk-login-action" id="dkOtherOwner">⇄ Login with another owner account <span>→</span></button><button class="dk-login-action dk-logout" id="dkOwnerLogout">↪ Logout</button><button class="dk-login-close" onclick="closeModal()">× Close</button></div>');
    document.getElementById("dkOpenDashboard")?.addEventListener("click",()=>{window.showPage?.("home");window.closeModal?.()});
    document.getElementById("dkOtherOwner")?.addEventListener("click",async()=>{
      const sb=client();
      try{if(sb)await sb.auth.signOut()}catch(e){console.warn("Could not clear previous owner session",e)}
      sessionStorage.setItem("dk_owner_login_pending","1");
      startGoogleLogin();
    });
    document.getElementById("dkOwnerLogout")?.addEventListener("click",async()=>{
      const sb=client();
      try{if(sb)await sb.auth.signOut()}catch(e){console.warn("Owner sign-out failed",e)}
      saveAccount(null);
      window.closeModal?.();
      window.openDukaanLogin?.();
      window.toast?.("Logged out");
    });
  }

  async function handleSession(session){
    const user=session?.user;
    const loginRole=sessionStorage.getItem("dk_login_role")||"owner";
    saveAccount(user);
    if(!user)return;
    if(loginRole==="customer"){
      sessionStorage.removeItem("dk_login_role");
      setTimeout(()=>openCustomerLogin(),250);
      return;
    }
    // Only show the account confirmation after a deliberate owner sign-in,
    // including the OAuth redirect back to this page.
    if(sessionStorage.getItem("dk_owner_login_pending")==="1"){
      sessionStorage.removeItem("dk_owner_login_pending");
      setTimeout(()=>showOwnerAccountPopup(user),300);
    }
    // Restore and reconcile the owner's full ledger before publishing the customer-facing projection.
    // Merge existing device data with cloud data so older local records are not discarded.
    await restoreCloudState(user);
    if (window.dkPublishCustomerPortalSnapshot && window.state) {
      window.dkPublishCustomerPortalSnapshot(window.state);
      setTimeout(() => {
        if (document.visibilityState !== "hidden" && window.dkPublishCustomerPortalSnapshot && window.state) {
          window.dkPublishCustomerPortalSnapshot(window.state);
        }
      }, 5000);
    }
  }

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible" && window.state && window.dkPublishCustomerPortalSnapshot) {
      window.dkPublishCustomerPortalSnapshot(window.state);
    }
  });

  // Nationwide customer portal: publish after owner-side data changes, not only
  // at login/when the tab becomes visible. This is deliberately limited to the
  // customer-facing snapshot and never uploads the owner's full ledger.
  let lastPortalSnapshotSignature = "";
  let portalWatchStarted = false;
  function startCustomerPortalWatch() {
    if (portalWatchStarted) return;
    portalWatchStarted = true;
    const readSnapshot = () => {
      if (document.visibilityState === "hidden" || !window.state || !window.dkPublishCustomerPortalSnapshot) return;
      let signature = "";
      try {
        const s = window.state;
        signature = JSON.stringify({
          shop: s.shop || {},
          customers: s.customers || [],
          tx: s.tx || [],
          reminders: s.reminders || [],
          deletedCustomerIds: s.deletedCustomerIds || []
        });
      } catch (_) { return; }
      if (signature && signature !== lastPortalSnapshotSignature) {
        lastPortalSnapshotSignature = signature;
        window.dkPublishCustomerPortalSnapshot(window.state);
      }
    };
    // Polling catches edits made by the existing app's different save paths
    // without changing those paths or interfering with recent features.
    setInterval(readSnapshot, 2500);
    window.addEventListener("dk:state-updated", readSnapshot);
    window.addEventListener("storage", readSnapshot);
    readSnapshot();
  }
  startCustomerPortalWatch();

  let initAttempts=0;
  async function init(){
    // Owner Google sign-in enables per-owner cloud restore/sync; customer login remains independent of owner sign-in.
    const sb=client();
    if(!sb){
      if(initAttempts++<20){setTimeout(init,500);return;}
      console.warn("Supabase client failed to load; app remains available without login.");
      return;
    }
    const {data:{session}}=await sb.auth.getSession();
    if(session)await handleSession(session);
    // getSession() handles the initial session; do not handle INITIAL_SESSION
    // again because that caused duplicate restore/reload cycles.
    sb.auth.onAuthStateChange((event,session)=>{
      if(event==="SIGNED_IN")setTimeout(()=>handleSession(session),0);
      if(event==="SIGNED_OUT")saveAccount(null);
    });
  }

  function openDukaanLogin(){
    document.getElementById("dkChooseAccessOverlay")?.remove();
    if(window.closeModal)window.closeModal();
    const root=document.createElement("div");
    root.id="dkChooseAccessOverlay";
    root.style.cssText="position:fixed;inset:0;z-index:2147483000;display:flex;align-items:center;justify-content:center;padding:14px;background:rgba(3,12,19,.78);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);overflow-y:auto;overflow-x:hidden;box-sizing:border-box";
    root.innerHTML='<style>'+
      '#dkChooseAccessOverlay *{box-sizing:border-box}'+
      '#dkChooseAccessOverlay .dk-choice-panel{width:min(440px,100%);max-height:calc(100dvh - 28px);overflow-y:auto;background:#f8f5e9;color:#18211c;padding:18px 0 15px;box-shadow:0 28px 90px #0007;border:1px solid #e7e0cf;border-radius:5px}'+
      '#dkChooseAccessOverlay .dk-choice-heading{display:flex;align-items:center;gap:14px;padding:0 18px 18px}'+
      '#dkChooseAccessOverlay .dk-choice-lock{width:60px;height:60px;flex:0 0 60px;display:grid;place-items:center;border-radius:19px;background:linear-gradient(145deg,#1c9b70,#087b59);font-size:30px;box-shadow:inset 0 1px 0 #ffffff55}'+
      '#dkChooseAccessOverlay .dk-choice-eyebrow{font:800 10px/1.3 Georgia,serif;letter-spacing:2px;color:#39443b;margin:0 0 7px}'+
      '#dkChooseAccessOverlay .dk-choice-title{font:700 clamp(25px,5vw,30px)/1.08 Georgia,serif;letter-spacing:-.5px;margin:0;color:#1c2921}'+
      '#dkChooseAccessOverlay .dk-choice-subtitle{font:14px/1.4 Georgia,serif;color:#51584e;margin:8px 0 0}'+
      '#dkChooseAccessOverlay .dk-choice-card{display:flex;align-items:center;gap:12px;width:calc(100% - 32px);min-height:92px;margin:0 16px;padding:14px 15px;text-align:left;border:1px solid #e5dece;border-radius:19px;background:linear-gradient(120deg,#fffefa,#f8f4e9);box-shadow:0 2px 0 #e9e2d4,0 5px 13px #51462a0a;color:#17211b;cursor:pointer;font-family:Georgia,serif;transition:transform .16s ease,box-shadow .16s ease}'+
      '#dkChooseAccessOverlay .dk-choice-card+.dk-choice-card{margin-top:14px}'+
      '#dkChooseAccessOverlay .dk-choice-card:active{transform:scale(.99)}'+
      '#dkChooseAccessOverlay .dk-choice-card.owner{border-left:6px solid #159875}'+
      '#dkChooseAccessOverlay .dk-choice-card.customer{border-left:6px solid #1685c3}'+
      '#dkChooseAccessOverlay .dk-choice-icon{width:40px;flex:0 0 40px;text-align:center;font-family:Arial,sans-serif;font-size:29px}'+
      '#dkChooseAccessOverlay .dk-choice-copy{min-width:0;flex:1}'+
      '#dkChooseAccessOverlay .dk-choice-copy b{display:block;font-size:21px;line-height:1.15;font-weight:700;letter-spacing:-.3px;margin-bottom:5px}'+
      '#dkChooseAccessOverlay .dk-choice-copy small{display:block;font-size:13px;line-height:1.35;color:#55574f}'+
      '#dkChooseAccessOverlay .dk-choice-arrow{font:29px/1 Arial,sans-serif;color:#148d68;flex:0 0 auto}'+
      '#dkChooseAccessOverlay .dk-choice-card.customer .dk-choice-arrow{color:#151b19}'+
      '#dkChooseAccessOverlay .dk-choice-note{margin:20px 16px 0;padding:12px 13px;background:#edf5ef;color:#6d756d;border-radius:12px;font:12px/1.4 Georgia,serif}'+
      '@media(max-width:420px){#dkChooseAccessOverlay .dk-choice-panel{width:min(360px,100%);padding-top:15px;padding-bottom:13px}#dkChooseAccessOverlay .dk-choice-heading{gap:11px;padding:0 14px 15px}#dkChooseAccessOverlay .dk-choice-lock{width:52px;height:52px;flex-basis:52px;border-radius:16px;font-size:26px}#dkChooseAccessOverlay .dk-choice-eyebrow{font-size:9px;letter-spacing:1.8px;margin-bottom:6px}#dkChooseAccessOverlay .dk-choice-title{font-size:26px}#dkChooseAccessOverlay .dk-choice-subtitle{font-size:12px;margin-top:6px}#dkChooseAccessOverlay .dk-choice-card{width:calc(100% - 26px);margin-left:13px;margin-right:13px;min-height:82px;padding:12px 10px;gap:8px;border-radius:16px}#dkChooseAccessOverlay .dk-choice-card+.dk-choice-card{margin-top:12px}#dkChooseAccessOverlay .dk-choice-icon{width:32px;flex-basis:32px;font-size:25px}#dkChooseAccessOverlay .dk-choice-copy b{font-size:19px;margin-bottom:4px}#dkChooseAccessOverlay .dk-choice-copy small{font-size:11px;line-height:1.3}#dkChooseAccessOverlay .dk-choice-arrow{font-size:25px}#dkChooseAccessOverlay .dk-choice-note{margin:15px 13px 0;padding:10px 11px;font-size:11px}}'+
      '</style>'+
      '<section class="dk-choice-panel" role="dialog" aria-modal="true" aria-labelledby="dkChoiceTitle">'+
        '<header class="dk-choice-heading"><div class="dk-choice-lock" aria-hidden="true">🔐</div><div><p class="dk-choice-eyebrow">LOGIN ACCESS</p><h2 class="dk-choice-title" id="dkChoiceTitle">Choose Access</h2><p class="dk-choice-subtitle">Choose how you want to enter Dukaan Khata.</p></div></header>'+
        '<button type="button" class="dk-choice-card owner" id="dkChooseOwner"><span class="dk-choice-icon" aria-hidden="true">🏪</span><span class="dk-choice-copy"><b>Owner Login</b><small>Full Dukaan Khata • Customers • Bills • Payments • Reports • More</small></span><span class="dk-choice-arrow" aria-hidden="true">→</span></button>'+
        '<button type="button" class="dk-choice-card customer" id="dkChooseCustomer"><span class="dk-choice-icon" aria-hidden="true">👤</span><span class="dk-choice-copy"><b>Customer Login</b><small>View your own Khata, Bills and Paid Payments by phone number</small></span><span class="dk-choice-arrow" aria-hidden="true">→</span></button>'+
        '<div class="dk-choice-note">Owner uses Google. Customer uses mobile number.</div>'+
      '</section>';
    document.body.appendChild(root);
    root.querySelector("#dkChooseOwner")?.addEventListener("click",()=>{root.remove();openOwnerLogin()});
    root.querySelector("#dkChooseCustomer")?.addEventListener("click",()=>{root.remove();openCustomerLogin()});
  }
  async function popupOwnerGooglePhoto(){let u=window.DukaanKhataUser||{};try{u={...JSON.parse(localStorage.getItem("dukaan_khata_account")||"{}"),...u}}catch(e){}const src=u.picture||u.avatar_url||u.photo_url||"";if(!src){toast("Google profile photo is not available for this account");return}modal('<div class="dk-google-photo-view" onclick="closeModal()"><img src="'+esc(src)+'" alt="Google account profile photo" referrerpolicy="no-referrer"><p>Touch anywhere to go back</p></div>')}
async function openOwnerLogin(){
    const sb=client();
    if(!sb){toast("Google sign-in is unavailable right now. Please refresh and try again.");return}
    const {data,error}=await sb.auth.getSession();
    if(error){toast("Could not check Google sign-in: "+error.message);return}
    if(data?.session?.user){
      saveAccount(data.session.user);
      showOwnerAccountPopup(data.session.user);
      return;
    }
    modal('<div class="dk-login-shell"><div class="dk-login-top"><div class="dk-login-icon">🏪</div><div><span class="dk-login-badge">OWNER ACCESS</span><h2>Sign in with Google</h2></div></div><p class="dk-login-sub">Use your Google account to verify your owner identity. Shop records sync through your Google account so you can access them on your other signed-in devices.</p><button class="dk-login-action dk-login-primary" onclick="startGoogleLogin()">Continue with Google <span>→</span></button><button class="dk-login-close" onclick="closeModal()">Cancel</button></div>');
  }
  function normPhone(v){
    let d=String(v??"").replace(/\D/g,"");
    // Treat Indian +91/0091 numbers consistently with locally saved 10-digit numbers.
    if(d.length===12&&d.startsWith("91"))d=d.slice(2);
    if(d.length===13&&d.startsWith("0091"))d=d.slice(4);
    return d;
  }
  function customerTransactions(c){
    return (state.tx||[]).filter(t=>String(t.customerId)===String(c.id));
  }
  function openCustomerLogin(){
    // Match the previous compact popup style used by Owner Login.
    modal('<div class="dk-login-shell dk-customer-login">'+
      '<div class="dk-login-top"><div class="dk-login-icon">👤</div><div><span class="dk-login-badge">CUSTOMER ACCESS</span><h2>My Khata Login</h2></div></div>'+
      '<p class="dk-login-sub">Enter the mobile number saved by your shopkeeper and the common customer PIN to view your own Khata, bills and payments.</p>'+
      '<label class="dk-customer-label" for="customerLoginPhone">Registered mobile number<input id="customerLoginPhone" class="search dk-customer-phone-input" inputmode="tel" autocomplete="tel" placeholder="Enter mobile number"></label>'+
      '<label class="dk-customer-label" for="customerLoginPin">Customer PIN<input id="customerLoginPin" class="search dk-customer-phone-input" inputmode="numeric" type="password" maxlength="4" autocomplete="off" placeholder="Enter PIN"></label>'+
      '<button id="dkCustomerViewBtn" class="dk-login-action dk-login-primary dk-customer-view-btn" type="button">View My Khata <span>→</span></button>'+
      '<div class="dk-customer-home-features"><span>📒 Khata</span><span>🧾 Bills</span><span>💳 Payments</span><span>🔴 Due</span></div>'+
      '<button class="dk-login-close" type="button" onclick="openDukaanLogin()">← Back</button></div>');
    const viewBtn=document.getElementById("dkCustomerViewBtn");
    const phoneInput=document.getElementById("customerLoginPhone");
    const pinInput=document.getElementById("customerLoginPin");
    viewBtn?.addEventListener("click",function(e){
      e.preventDefault();
      findCustomerPortal();
    });
    phoneInput?.addEventListener("keydown",e=>{if(e.key==="Enter"){e.preventDefault();viewBtn?.click()}});
    pinInput?.addEventListener("keydown",e=>{if(e.key==="Enter"){e.preventDefault();viewBtn?.click()}});
    setTimeout(()=>phoneInput?.focus(),120);
  }
  function closeCustomerFullScreen(){
    if(window.closeModal)closeModal();
    if(window.openDukaanLogin)openDukaanLogin();
  }
  async function findCustomerPortal(){
    const q=normPhone(document.getElementById("customerLoginPhone")?.value);
    const pin=String(document.getElementById("customerLoginPin")?.value||"").trim();
    if(!q||q.length!==10){toast("Enter a valid 10-digit mobile number");return}
    if(pin!=="2007"){toast("Enter the customer PIN");return}
    const submit=document.querySelector("#modal button[type=submit],#modal .dk-login-primary");
    if(submit){submit.disabled=true;submit.textContent="Finding your shops…"}
    try{
      const response=await fetch("https://nzsldzyjpxwyyrdwkphp.supabase.co/functions/v1/customer-pin-portal",{
        method:"POST",headers:{"Content-Type":"application/json","apikey":"sb_publishable_k3ZPG1Wuqm3KFzoQAXnByA_YTMLkUG-"},
        body:JSON.stringify({action:"login",phone:q,pin})
      });
      const data=await response.json();
      if(!response.ok)throw new Error(data.error||"Customer login failed");
      const accounts=Array.isArray(data.accounts)?data.accounts:[];
      if(!accounts.length){toast("No registered shop records were found for this number");return}
      openRemoteCustomerPortal(accounts,q,pin);
    }catch(e){
      console.error("Cross-shop customer lookup failed",e);
      toast(e.message||"Could not connect to customer records. Please try again.");
    }finally{if(submit){submit.disabled=false;submit.textContent="Login as Customer"}}
  }
  function openRemoteCustomerPortal(accounts,customerPhone,customerPin){
    window.__dkCustomerPhoneForNotifications=customerPhone;window.__dkCustomerPinForNotifications=customerPin;
    const allTx=accounts.flatMap(a=>(Array.isArray(a.transactions)?a.transactions:[]).map(t=>({...t,__customer:a.customer,__shop:a.shop})));
    const sales=allTx.filter(t=>t.type==="sale");
    const payments=allTx.filter(t=>t.type==="payment");
    const totalSales=sales.reduce((s,t)=>s+(Number(t.total)||0),0);
    const totalPaid=payments.reduce((s,t)=>s+(Number(t.amount)||0),0);
    const totalDue=accounts.reduce((s,a)=>{const tx=Array.isArray(a.transactions)?a.transactions:[];const sales=tx.filter(t=>t.type==="sale").reduce((x,t)=>x+(Number(t.total)||0),0);const paid=tx.filter(t=>t.type==="payment").reduce((x,t)=>x+(Number(t.amount)||0),0);return s+Math.max(0,sales-paid)},0);
    const shopCards=accounts.map(a=>{
      const shop=a.shop||{}, customer=a.customer||{};
      const tx=Array.isArray(a.transactions)?a.transactions:[];
      const shopSales=tx.filter(t=>t.type==="sale");
      const shopPaid=tx.filter(t=>t.type==="payment").reduce((s,t)=>s+(Number(t.amount)||0),0);
      const shopTotal=shopSales.reduce((s,t)=>s+(Number(t.total)||0),0);
      const shopDue=Math.max(0,shopTotal-shopPaid);
      const phone=String(shop.phone||"").replace(/\\D/g,"");
      const wa=phone.length===10?"91"+phone:phone;
      const bills=shopSales.sort((x,y)=>new Date(y.date||y.created_at||0)-new Date(x.date||x.created_at||0)).map(t=>{
        const lines=Array.isArray(t.lines)?t.lines:Array.isArray(t.items)?t.items:[];
        const items=lines.length?lines.map(i=>'<div class="dk-customer-item-row"><span>'+esc(i.name||i.itemName||i.title||"Item")+' <small>× '+(Number(i.qty??i.quantity)||1)+'</small></span><strong>'+money(Number(i.total??i.amount)||((Number(i.qty??i.quantity)||1)*(Number(i.price??i.rate??i.unitPrice)||0)))+'</strong></div>').join(""):'<small>Item details not saved for this bill.</small>';
        return '<article class="dk-exec-record dk-customer-bill"><div class="dk-record-icon">🧾</div><div class="dk-record-main"><b>Bill '+esc(t.id||t.invoiceNo||t.invoice_no||"")+'</b><small>'+new Date(t.date||t.created_at||Date.now()).toLocaleString()+'</small><div class="dk-record-items">'+items+'</div></div><strong class="dk-record-amount">'+money(Number(t.total)||0)+'</strong></article>';
      }).join("")||'<div class="dk-empty">No bills saved.</div>';
      const pays=tx.filter(t=>t.type==="payment").map(t=>'<article class="dk-exec-record"><div class="dk-record-icon">✓</div><div class="dk-record-main"><b>Payment recorded</b><small>'+new Date(t.date||t.created_at||Date.now()).toLocaleString()+'</small></div><strong class="dk-customer-paid">+'+money(Number(t.amount)||0)+'</strong></article>').join("")||'<div class="dk-empty">No payments recorded.</div>';
      return '<section class="dk-exec-section"><div class="dk-exec-section-title"><span>🏪</span><div><h3>'+esc(shop.name||"Shop")+'</h3><small>'+esc(shop.owner||"Shop Owner")+' • '+esc(shop.address||"")+'</small></div></div><div class="dk-customer-summary"><div><small>BILLS</small><b>'+money(shopTotal)+'</b></div><div><small>PAID</small><b class="dk-customer-paid">'+money(shopPaid)+'</b></div><div><small>DUE</small><b class="dk-customer-due">'+money(shopDue)+'</b></div></div><p>Registered customer: <b>'+esc(customer.name||"Customer")+'</b> • '+esc(customer.phone||"")+'</p>'+(phone?'<div class="dk-customer-contact-actions"><a href="tel:'+esc(shop.phone||"")+'">📞 Call owner/shop</a><a target="_blank" rel="noopener noreferrer" href="https://wa.me/'+esc(wa)+'?text='+encodeURIComponent("Hello "+(shop.name||"shop")+", I am contacting you about my Dukaan Khata.")+'">🟢 WhatsApp</a></div>':"")+'<h4>My Bills & Items</h4>'+bills+'<h4>Payments</h4>'+pays+'</section>';
    }).join("");
    modal('<div class="dk-customer-portal dk-executive-portal dk-customer-fullscreen"><div class="dk-customer-screen-top"><button class="dk-exec-back" type="button" onclick="openCustomerLogin()">‹</button><div><span>DUKAAN KHATA • CUSTOMER VIEW</span><h2>My Shops & Khata</h2></div><button class="dk-customer-screen-close" type="button" onclick="closeModal()">×</button><button id="dkCustomerNotificationsBell" type="button" aria-label="Customer notifications" style="border:1px solid #d7e1eb;border-radius:12px;background:#fff;padding:9px 12px;font-size:20px;cursor:pointer">🔔</button></div><div class="dk-exec-hero"><div class="dk-exec-avatar">👤</div><div class="dk-exec-identity"><span>REGISTERED CUSTOMER</span><h2>'+esc(accounts[0]?.customer?.name||"Customer")+'</h2><small>📱 '+esc(accounts[0]?.customer?.phone||"")+'</small></div></div><div class="dk-customer-summary dk-exec-summary"><div><small>ALL BILLS</small><b>'+money(totalSales)+'</b></div><div><small>PAYMENTS</small><b class="dk-customer-paid">'+money(totalPaid)+'</b></div><div><small>EST. DUE</small><b class="dk-customer-due">'+money(Math.max(0,totalDue))+'</b></div></div><p class="dk-muted-note">Showing '+accounts.length+' shop account(s) registered to this mobile number.</p>'+shopCards+'<div class="dk-exec-private">🔐 Read-only customer view. Contact each shop directly for corrections to its records.</div></div>');
  }

  function openCustomerNotificationPanel(customerPhone,customerPin){
    const old=document.getElementById("dkCustomerNotificationPanel");old?.remove();
    const panel=document.createElement("div");panel.id="dkCustomerNotificationPanel";
    panel.style.cssText="position:fixed;inset:0;z-index:2147483600;background:#f8fafc;color:#0f172a;overflow:auto;padding:18px;box-sizing:border-box";
    panel.innerHTML='<div style="max-width:760px;margin:0 auto"><header style="display:flex;justify-content:space-between;align-items:center;gap:12px"><div><small style="font-weight:800;color:#176b4d">DUKAAN KHATA</small><h2 style="margin:4px 0 12px">My Notifications</h2></div><button id="dkCustomerNotificationClose" type="button" style="padding:10px 14px;border:1px solid #dbe3ea;border-radius:10px;background:#fff">← Back</button></header><p style="color:#64748b">Bill, item, payment and outstanding updates for your account.</p><div class="dk-push-setting"><div class="dk-push-setting-copy"><span class="dk-push-setting-icon">🔔</span><span><strong>Phone notifications</strong><small id="dkPushStateLabel">Checking status…</small></span></div><button id="dkCustomerNotificationEnable" class="dk-push-switch" type="button" role="switch" aria-checked="false" aria-label="Phone notifications"><span></span></button></div><div id="dkCustomerNotificationStatus" role="status" style="margin:12px 0"></div><div id="dkCustomerNotificationRows"></div><p style="font-size:12px;color:#64748b">This login uses the shared customer PIN 2007, which is not unique identity verification.</p></div>';
    document.body.appendChild(panel);
    const status=panel.querySelector("#dkCustomerNotificationStatus"),rows=panel.querySelector("#dkCustomerNotificationRows");
    panel.querySelector("#dkCustomerNotificationClose")?.addEventListener("click",()=>panel.remove());
    const pushToggle=panel.querySelector("#dkCustomerNotificationEnable");
    const pushLabel=panel.querySelector("#dkPushStateLabel");
    const syncPushToggle=()=>{let saved=null;try{saved=localStorage.getItem("dk_customer_push_enabled");}catch(e){}const permission=window.Notification?.permission;const on=permission==="granted"&&saved!=="off";pushToggle?.setAttribute("aria-checked",String(on));pushToggle?.classList.toggle("is-on",on);if(pushLabel)pushLabel.textContent=on?"On · saved on this device":(permission==="denied"?"Blocked in browser settings":"Off · tap to enable");};
    syncPushToggle();
    pushToggle?.addEventListener("click",async()=>{
      if(window.Notification?.permission==="granted"){let saved="on";try{saved=localStorage.getItem("dk_customer_push_enabled")||"on";}catch(e){}if(saved==="on"){status.textContent="Phone notifications are already enabled. To disable them, use Android Settings → Apps → Chrome → Notifications.";return;}try{localStorage.setItem("dk_customer_push_enabled","on");}catch(e){}syncPushToggle();status.textContent="Phone notifications are on.";return;}
      status.textContent="Requesting notification permission…";
      try{if(!window.dkEnableCustomerNotifications)throw new Error("Notification service is still loading. Refresh and try again.");await window.dkEnableCustomerNotifications(customerPhone,customerPin);try{localStorage.setItem("dk_customer_push_enabled","on");}catch(e){}status.textContent="Notifications are enabled on this device and this preference is saved.";syncPushToggle();}
      catch(e){status.textContent=e.message||"Could not enable phone notifications.";syncPushToggle();}
    });
    (async()=>{
      try{
        if(!window.dkFetchCustomerNotifications)throw new Error("Notification service is still loading. Refresh and try again.");
        status.textContent="Loading notifications…";
        const result=await window.dkFetchCustomerNotifications(customerPhone,customerPin);
        const list=Array.isArray(result.notifications)?result.notifications:[];
        status.textContent=list.length?list.length+" notification(s)":"No notifications yet.";
        rows.innerHTML=list.map(n=>'<article style="background:white;border:1px solid #e2e8f0;border-radius:14px;padding:14px;margin:10px 0"><b>'+esc(n.title||"Account update")+'</b><p style="margin:7px 0;color:#334155">'+esc(n.body||"Your account has been updated.")+'</p><small style="color:#64748b">'+esc(n.createdAt?new Date(n.createdAt).toLocaleString("en-IN"):"")+'</small></article>').join("");
      }catch(e){status.textContent=e.message||"Could not load notifications."}
    })();
  }

  document.addEventListener("click",function(e){if(e.target?.id==="dkCustomerNotificationsBell")openCustomerNotificationPanel(window.__dkCustomerPhoneForNotifications,window.__dkCustomerPinForNotifications)});
  function openCustomerPortal(customerId){
    const c=(state.customers||[]).find(x=>String(x.id)===String(customerId));
    if(!c){toast("Customer record not found");return}
    const phoneKey=normPhone(c.phone);
    const accounts=(state.customers||[]).filter(x=>phoneKey&&normPhone(x.phone)===phoneKey);
    const visibleAccounts=accounts.length?accounts:[c];
    const ids=new Set(visibleAccounts.map(x=>String(x.id)));
    const shop=state.shop||{};
    const tx=(state.tx||[]).filter(t=>ids.has(String(t.customerId)));
    const sales=tx.filter(t=>t.type==="sale");
    const payments=tx.filter(t=>t.type==="payment"&&Number(t.amount)>0);
    const due=visibleAccounts.reduce((sum,account)=>sum+Math.max(0,Number(balance(account.id))||0),0);
    const paid=payments.reduce((s,t)=>s+(Number(t.amount)||0),0);
    const salesTotal=sales.reduce((s,t)=>s+(Number(t.total)||0),0);
    const sorted=(arr)=>arr.slice().sort((a,b)=>new Date(b.date||0)-new Date(a.date||0));
    const contactDigits=String(shop.phone||"").replace(/\\D/g,"");
    const waDigits=contactDigits.length===10?"91"+contactDigits:contactDigits;
    const itemRows=sales.flatMap(t=>(Array.isArray(t.lines)?t.lines:Array.isArray(t.items)?t.items:[]).map(i=>({
      name:i.name||i.itemName||i.title||"Item",
      qty:Number(i.qty??i.quantity)||1,
      price:Number(i.price??i.rate??i.unitPrice)||0,
      total:Number(i.total??i.amount)||((Number(i.qty??i.quantity)||1)*(Number(i.price??i.rate??i.unitPrice)||0)),
      date:t.date,
      bill:t.id
    })));
    const billHtml=sales.length?sorted(sales).map(t=>{
      const savedLines=Array.isArray(t.lines)?t.lines:Array.isArray(t.items)?t.items:[]; const items=savedLines.length?savedLines.map(i=>{
        const qty=Number(i.qty??i.quantity)||1,price=Number(i.price??i.rate??i.unitPrice)||0;
        const lineTotal=Number(i.total??i.amount)||qty*price;
        return '<div class="dk-customer-item-row"><span>'+esc(i.name||i.itemName||i.title||"Item")+' <small>× '+qty+'</small></span><strong>'+money(lineTotal)+'</strong></div>';
      }).join(""):"<div class=\"dk-muted-note\">Item details were not saved for this bill.</div>";
      return '<article class="dk-exec-record dk-customer-bill"><div class="dk-record-icon">🧾</div><div class="dk-record-main"><b>Bill '+esc(t.id||"")+'</b><small>'+new Date(t.date||Date.now()).toLocaleString()+'</small><div class="dk-record-items">'+items+'</div></div><strong class="dk-record-amount">'+money(Number(t.total)||0)+'</strong></article>';
    }).join(""):'<div class="dk-empty">No bills available for this customer yet.</div>';
    const payHtml=payments.length?sorted(payments).map(t=>'<article class="dk-exec-record"><div class="dk-record-icon">✓</div><div class="dk-record-main"><b>Payment received</b><small>'+new Date(t.date||Date.now()).toLocaleString()+' • '+esc(t.mode||"payment")+'</small></div><strong class="dk-customer-paid">+'+money(Number(t.amount)||0)+'</strong></article>').join(""):'<div class="dk-empty">No paid payments available.</div>';
    const khataHtml=sorted(tx).map(t=>{
      const isPayment=t.type==="payment";
      const amount=isPayment?Number(t.amount)||0:Number(t.total)||0;
      const account=visibleAccounts.find(account=>String(account.id)===String(t.customerId)); return '<article class="dk-exec-record"><div class="dk-record-icon">'+(isPayment?"✓":"₹")+'</div><div class="dk-record-main"><b>'+esc(isPayment?"Payment recorded":"Khata Bill")+'</b><small>'+esc(account?.name||c.name)+' • '+new Date(t.date||Date.now()).toLocaleString()+(t.mode?" • "+esc(t.mode):"")+'</small></div><strong class="'+(isPayment?"dk-customer-paid":"dk-customer-due")+'">'+(isPayment?"−":"")+money(amount)+'</strong></article>';
    }).join("")||'<div class="dk-empty">No Khata transactions available.</div>';
    const allItemsHtml=itemRows.length?itemRows.map(i=>'<article class="dk-customer-item-card"><div><b>'+esc(i.name)+'</b><small>'+esc(i.bill?"Bill "+i.bill:"Item")+' • '+new Date(i.date||Date.now()).toLocaleDateString()+'</small><span>'+i.qty+' × '+money(i.price)+'</span></div><strong>'+money(i.total)+'</strong></article>').join(""):'<div class="dk-empty">No saved item details are available in this customer’s bills.</div>';
    const shopRows=[
      ["Shop name",shop.name||"Not added","🏪"],
      ["Owner name",shop.owner||"Not added","👤"],
      ["Shop contact",shop.phone||"Not added","📞"],
      ["Shop address",shop.address||"Not added","📍"],
      ["UPI ID",shop.upi||"Not added","💳"]
    ];
    modal('<div class="dk-customer-portal dk-executive-portal dk-customer-fullscreen">'+
      '<div class="dk-customer-screen-top"><button class="dk-exec-back" type="button" onclick="openCustomerLogin()" aria-label="Back to customer login">‹</button><div><span>DUKAAN KHATA • CUSTOMER VIEW</span><h2>My Shops & Khata</h2></div><button class="dk-customer-screen-close" type="button" onclick="closeModal()" aria-label="Close customer view">×</button></div>'+
      '<div class="dk-exec-hero"><div class="dk-exec-avatar">👤</div><div class="dk-exec-identity"><span>PRIVATE CUSTOMER ACCOUNT</span><h2>'+esc(c.name)+'</h2><small>📱 '+esc(c.phone||"No customer mobile saved")+'</small></div><div class="dk-exec-lock">🔒</div></div>'+
      '<div class="dk-exec-welcome"><b>Welcome back, '+esc(c.name)+'</b><small>Your shop profile, contact, saved items, bills and payment history</small></div>'+
      '<div class="dk-customer-summary dk-exec-summary"><div><small>TOTAL BILLS</small><b>'+money(salesTotal)+'</b></div><div><small>TOTAL PAID</small><b class="dk-customer-paid">'+money(paid)+'</b></div><div><small>OUTSTANDING DUE</small><b class="dk-customer-due">'+money(due)+'</b></div></div>'+
      '<div class="dk-exec-section"><div class="dk-exec-section-title"><span>🏪</span><div><h3>Complete Shop Details</h3><small>Shop identity and contact information</small></div></div><div class="dk-customer-shop-grid">'+shopRows.map(r=>'<div class="dk-customer-shop-row"><span>'+r[2]+'</span><div><small>'+r[0]+'</small><b>'+esc(r[1])+'</b></div></div>').join("")+'</div>'+(contactDigits?'<div class="dk-customer-contact-actions"><a href="tel:'+esc(shop.phone||"")+'">📞 Call shop</a><a target="_blank" rel="noopener noreferrer" href="https://wa.me/'+esc(waDigits)+'?text='+encodeURIComponent("Hello "+(shop.name||"shop")+", I am "+(c.name||"a customer")+".")+'">🟢 WhatsApp shop</a></div>':"")+'</div>'+
      '<div class="dk-exec-section"><div class="dk-exec-section-title"><span>👥</span><div><h3>Accounts for This Mobile</h3><small>'+visibleAccounts.length+' matching customer record(s) saved here</small></div></div><div class="dk-customer-shop-grid">'+visibleAccounts.map(account=>'<div class="dk-customer-shop-row"><span>👤</span><div><small>Customer account</small><b>'+esc(account.name||"Customer")+'</b><b>'+esc(account.phone||"No mobile saved")+'</b>'+(account.address?'<small>'+esc(account.address)+'</small>':"")+'</div></div>').join("")+'</div></div>'+
      '<div class="dk-exec-section"><div class="dk-exec-section-title"><span>🛍️</span><div><h3>All Items Bought</h3><small>Item quantities, unit prices and bill totals from saved records</small></div></div><div class="dk-customer-items-list">'+allItemsHtml+'</div></div>'+
      '<div class="dk-exec-section"><div class="dk-exec-section-title"><span>📒</span><div><h3>My Khata</h3><small>All transactions for this customer</small></div></div>'+khataHtml+'</div>'+
      '<div class="dk-exec-section"><div class="dk-exec-section-title"><span>🧾</span><div><h3>My Bills</h3><small>Bill-by-bill items and amounts</small></div></div>'+billHtml+'</div>'+
      '<div class="dk-exec-section"><div class="dk-exec-section-title"><span>💚</span><div><h3>Paid Payments</h3><small>Payments recorded for this account</small></div></div>'+payHtml+'</div>'+
      '<div class="dk-exec-private">🔐 <span>This is a read-only customer view. Only this customer’s records and the shop’s saved public profile are shown.</span></div>'+
      '</div>');
  }
  async function startGoogleLogin(){
    const sb=client();
    if(!sb){toast("Google sign-in is unavailable. Please refresh and try again.");return}
    sessionStorage.setItem("dk_owner_login_pending","1");
    const redirectTo=window.location.origin+window.location.pathname;
    const {error}=await sb.auth.signInWithOAuth({provider:"google",options:{redirectTo,queryParams:{prompt:"select_account"}}});
    if(error){sessionStorage.removeItem("dk_owner_login_pending");toast("Google sign-in failed: "+error.message)}
  }

  async function logoutDukaanKhata(){
    if(window.closeModal)window.closeModal();
    if(window.toast)window.toast("This app is using local-only access.");
  }

  window.openDukaanLogin=openDukaanLogin;
  window.openOwnerLogin=openOwnerLogin;
  window.openCustomerLogin=openCustomerLogin;
  window.findCustomerPortal=findCustomerPortal;
  window.openCustomerPortal=openCustomerPortal;
  window.closeCustomerFullScreen=closeCustomerFullScreen;
  window.openDukaanProfile=openDukaanLogin;
  window.logoutDukaanKhata=logoutDukaanKhata;
  window.startGoogleLogin=startGoogleLogin;

  let launchLoginShown=false;
  function showLoginAfterLaunch(){
    if(launchLoginShown)return;
    launchLoginShown=true;
    // Always show the Choose Access popup at app launch. Each button then
    // enters its own existing login flow.
    try{
      if(window.openDukaanLogin)window.openDukaanLogin();
      else window.setTimeout(()=>{if(window.openDukaanLogin)window.openDukaanLogin()},250);
    }catch(err){
      console.error("Could not open Dukaan Khata access popup:",err);
      window.setTimeout(()=>{try{if(window.openDukaanLogin)window.openDukaanLogin()}catch(e){console.error(e)}},300);
    }
  }
  function boot(){
    // Authentication initialization must not block the launch access popup.
    try{Promise.resolve(init()).catch(err=>console.warn("Dukaan Khata auth initialization failed:",err));}
    catch(err){console.warn("Dukaan Khata auth initialization failed:",err);}
    let launchFinished=false;
    const finishLaunch=()=>{
      if(launchFinished)return;
      launchFinished=true;
      showLoginAfterLaunch();
    };
    window.addEventListener("uvms-launch-complete",finishLaunch,{once:true});
    // Fallback in case splash timing or a service worker prevents its event.
    window.setTimeout(()=>{
      const splash=document.getElementById("uvmsLaunchSplash");
      if(splash)splash.remove();
      finishLaunch();
    },2800);
    if(!document.getElementById("uvmsLaunchSplash"))window.setTimeout(finishLaunch,80);
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot,{once:true});else boot();
})();