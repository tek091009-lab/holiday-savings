(function(){
  'use strict';

  var finished=false;
  var busy=false;
  var timer=null;
  var startedAt=Date.now();
  var attempts=0;

  function stop(){
    finished=true;
    if(timer){clearInterval(timer);timer=null;}
  }

  function isCloudReady(){
    try{return typeof cloudReady!=='undefined' && cloudReady===true;}catch(e){return false;}
  }

  async function sessionUser(){
    try{
      if(typeof currentUser!=='undefined' && currentUser)return currentUser;
    }catch(e){}
    try{
      if(typeof supabaseClient!=='undefined' && supabaseClient && supabaseClient.auth){
        var out=await supabaseClient.auth.getSession();
        return out && out.data && out.data.session && out.data.session.user || null;
      }
    }catch(e){}
    return null;
  }

  function showTrying(){
    try{if(typeof setCloudStatus==='function')setCloudStatus('Loading cloud…','saving');}catch(e){}
  }

  function findManualLoad(){
    var els=Array.from(document.querySelectorAll('button,[role="button"],input[type="button"],input[type="submit"]'));
    return els.find(function(el){
      if(el.disabled)return false;
      var s=getComputedStyle(el);
      if(s.display==='none'||s.visibility==='hidden')return false;
      var t=String(el.textContent||el.innerText||el.value||el.getAttribute('aria-label')||el.getAttribute('title')||'').replace(/\s+/g,' ').trim().toLowerCase();
      return t.indexOf('load database')>=0 || t.indexOf('load cloud')>=0 || t==='load data';
    })||null;
  }

  async function attempt(){
    if(finished||busy)return;
    busy=true;
    attempts++;
    try{
      if(isCloudReady()){stop();return;}

      var user=await sessionUser();
      if(!user){
        if(Date.now()-startedAt>30000)stop();
        return;
      }

      showTrying();

      // Let the app's normal initAuth flow have first chance. Only recover if it has not completed.
      if(attempts>=2 && !isCloudReady()){
        try{
          if(typeof enterAuthenticatedApp==='function'){
            await enterAuthenticatedApp(user);
          }else if(typeof loadCloudForUser==='function'){
            await loadCloudForUser(user);
          }
        }catch(e){}
      }

      if(isCloudReady()){stop();return;}

      // Compatibility fallback for any older cached app shell that still exposes a manual loader.
      var btn=findManualLoad();
      if(btn){
        try{btn.click();}catch(e){}
      }

      if(Date.now()-startedAt>30000)stop();
    }finally{
      busy=false;
    }
  }

  function start(){
    // Give the built-in auth/session restore a moment before recovery kicks in.
    setTimeout(function(){
      attempt();
      if(!finished)timer=setInterval(attempt,1500);
    },1200);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();
})();
