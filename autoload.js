(function(){
  'use strict';

  var finished=false;
  var timer=null;
  var busy=false;
  var directTried=false;
  var startedAt=Date.now();

  function normalise(text){
    return String(text||'').replace(/\s+/g,' ').trim().toLowerCase();
  }

  function actuallyVisible(el){
    if(!el || !el.isConnected)return false;
    var node=el;
    while(node && node.nodeType===1){
      var s=getComputedStyle(node);
      if(s.display==='none' || s.visibility==='hidden' || s.opacity==='0')return false;
      node=node.parentElement;
    }
    var r=el.getBoundingClientRect();
    return r.width>0 && r.height>0;
  }

  function findLoadButton(){
    return Array.from(document.querySelectorAll('button,[role="button"],input[type="button"],input[type="submit"]')).find(function(btn){
      if(!actuallyVisible(btn) || btn.disabled)return false;
      var text=normalise(btn.textContent||btn.innerText||btn.value||'');
      var title=normalise(btn.getAttribute('title')||'');
      var aria=normalise(btn.getAttribute('aria-label')||'');
      return text==='load database' || text.indexOf('load database')>=0 || title.indexOf('load database')>=0 || aria.indexOf('load database')>=0;
    })||null;
  }

  function stop(){
    finished=true;
    if(timer){clearInterval(timer);timer=null;}
  }

  async function getSessionUser(){
    try{
      if(typeof currentUser!=='undefined' && currentUser)return currentUser;
    }catch(e){}
    try{
      if(typeof supabaseClient!=='undefined' && supabaseClient && supabaseClient.auth){
        var result=await supabaseClient.auth.getSession();
        return result && result.data && result.data.session && result.data.session.user || null;
      }
    }catch(e){}
    return null;
  }

  async function attempt(){
    if(finished || busy)return;
    busy=true;
    try{
      var user=await getSessionUser();
      if(!user){
        if(Date.now()-startedAt>30000)stop();
        return;
      }

      // Use the app's own cloud loader once the saved login session has been restored.
      // This is more reliable than clicking the UI before its handlers/data are ready.
      if(!directTried){
        directTried=true;
        try{
          if(typeof loadCloudForUser==='function'){
            await loadCloudForUser(user);
            stop();
            return;
          }
        }catch(e){
          // Fall back to the app's visible Load database control below.
        }
      }

      var btn=findLoadButton();
      if(btn){
        btn.click();
        // Give the app time to finish the load, then stop rather than polling forever.
        setTimeout(stop,1800);
        return;
      }

      if(Date.now()-startedAt>30000)stop();
    }finally{
      busy=false;
    }
  }

  function start(){
    attempt();
    timer=setInterval(attempt,500);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();
})();
