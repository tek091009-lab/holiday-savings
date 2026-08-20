(function(){
  'use strict';

  var finished=false;
  var running=false;
  var tries=0;
  var timer=null;

  function normalise(text){
    return String(text||'').replace(/\s+/g,' ').trim().toLowerCase();
  }

  function visible(el){
    if(!el)return false;
    var s=getComputedStyle(el);
    return s.display!=='none' && s.visibility!=='hidden';
  }

  function findLoadButton(){
    var buttons=Array.from(document.querySelectorAll('button,[role="button"]'));
    return buttons.find(function(btn){
      if(!visible(btn) || btn.disabled)return false;
      var text=normalise(btn.textContent||btn.innerText||'');
      var title=normalise(btn.getAttribute('title')||'');
      var aria=normalise(btn.getAttribute('aria-label')||'');
      return text==='load database' || text.indexOf('load database')>=0 || title.indexOf('load database')>=0 || aria.indexOf('load database')>=0;
    })||null;
  }

  function stop(){
    finished=true;
    if(timer){clearInterval(timer);timer=null;}
  }

  function attempt(){
    if(finished || running)return;
    running=true;
    tries++;
    try{
      var btn=findLoadButton();
      if(btn){
        btn.click();
        stop();
        return;
      }
      if(tries>=60)stop();
    }catch(e){}
    finally{running=false;}
  }

  function start(){
    attempt();
    if(!finished)timer=setInterval(attempt,250);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();
})();
