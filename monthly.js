(function(){
  'use strict';

  var initialized=false;
  var currentKey=(function(){var d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0');})();
  var monthNames={jan:1,january:1,feb:2,february:2,mar:3,march:3,apr:4,april:4,may:5,jun:6,june:6,jul:7,july:7,aug:8,august:8,sep:9,sept:9,september:9,oct:10,october:10,nov:11,november:11,dec:12,december:12};

  function monthlyRoot(){
    return document.getElementById('view-monthly')||document.getElementById('view-monthly-plan')||document.querySelector('[id*="monthly"][class*="view"]');
  }

  function keyFrom(el){
    if(!el)return null;
    var attrs=['data-month','data-month-key','data-date','data-payday'];
    for(var i=0;i<attrs.length;i++){
      var v=el.getAttribute&&el.getAttribute(attrs[i]);
      if(v){var m=String(v).match(/(20\d{2})[-\/]([01]?\d)/);if(m)return m[1]+'-'+String(Math.max(1,Math.min(12,Number(m[2])))).padStart(2,'0');}
    }
    var text=(el.innerText||el.textContent||'').replace(/\s+/g,' ');
    var iso=text.match(/\b(20\d{2})[-\/]([01]?\d)(?:[-\/]\d{1,2})?\b/);
    if(iso)return iso[1]+'-'+String(Number(iso[2])).padStart(2,'0');
    var named=text.match(/\b(January|February|March|April|May|June|July|August|September|Sept|October|November|December|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(20\d{2})\b/i);
    if(named){var n=monthNames[named[1].toLowerCase()];return named[2]+'-'+String(n).padStart(2,'0');}
    var dayNamed=text.match(/\b\d{1,2}\s+(January|February|March|April|May|June|July|August|September|Sept|October|November|December|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(20\d{2})\b/i);
    if(dayNamed){var n2=monthNames[dayNamed[1].toLowerCase()];return dayNamed[2]+'-'+String(n2).padStart(2,'0');}
    return null;
  }

  function candidates(root){
    var els=Array.from(root.querySelectorAll('[data-month],[data-month-key],[data-date],[data-payday],tr,.month-row,.monthly-row,.month-card,.plan-row,.month-section,.monthly-card'));
    if(!els.length)els=Array.from(root.children||[]);
    return els.filter(function(el){
      var k=keyFrom(el);if(!k)return false;
      var p=el.parentElement;
      while(p&&p!==root){if(els.indexOf(p)>=0&&keyFrom(p)===k)return false;p=p.parentElement;}
      return true;
    });
  }

  function hiddenPref(){
    try{return !!(state&&state.settings&&state.settings.hidePastMonths);}catch(e){return false;}
  }

  function apply(){
    var root=monthlyRoot();if(!root)return;
    var hide=hiddenPref();
    candidates(root).forEach(function(el){var k=keyFrom(el);el.classList.toggle('hs-past-month-hidden',!!(hide&&k&&k<currentKey));});
    var btn=root.querySelector('#hsPastMonthsToggle');
    if(btn){btn.textContent=hide?'Show past months':'Hide past months';btn.setAttribute('aria-pressed',hide?'true':'false');}
  }

  function ensureButton(){
    var root=monthlyRoot();if(!root)return;
    var btn=root.querySelector('#hsPastMonthsToggle');
    if(!btn){
      btn=document.createElement('button');btn.id='hsPastMonthsToggle';btn.type='button';btn.className='btn slim secondary hs-past-month-toggle';
      var host=root.querySelector('.page-actions,.view-actions,.toolbar,.section-actions,.header-actions');
      if(host)host.appendChild(btn);
      else{
        var wrap=document.createElement('div');wrap.className='hs-past-month-toolbar';wrap.appendChild(btn);
        var heading=root.querySelector('h1,h2,h3,.page-head,.section-head');
        if(heading&&heading.parentElement)heading.parentElement.insertBefore(wrap,heading.nextSibling);else root.insertBefore(wrap,root.firstChild);
      }
      btn.addEventListener('click',function(){
        try{if(!state.settings)state.settings={};state.settings.hidePastMonths=!hiddenPref();if(typeof persist==='function')persist();}catch(e){}
        apply();
      });
    }
    apply();
  }

  function addStyle(){
    if(document.getElementById('hsMonthlyStyle'))return;
    var st=document.createElement('style');st.id='hsMonthlyStyle';
    st.textContent='.hs-past-month-hidden{display:none!important}.hs-past-month-toolbar{display:flex;justify-content:flex-end;margin:0 0 12px}.hs-past-month-toggle{white-space:nowrap}';document.head.appendChild(st);
  }

  function init(){
    if(initialized)return;
    if(typeof state==='undefined'||typeof setView!=='function'){setTimeout(init,80);return;}
    initialized=true;addStyle();
    if(!state.settings)state.settings={};if(typeof state.settings.hidePastMonths!=='boolean')state.settings.hidePastMonths=false;

    var oldSetView=setView;setView=function(v){var r=oldSetView.apply(this,arguments);if(v==='monthly'||v==='monthly-plan')requestAnimationFrame(ensureButton);return r;};
    if(typeof renderAll==='function'){
      var oldRender=renderAll;renderAll=function(){var r=oldRender.apply(this,arguments);var root=monthlyRoot();if(root&&getComputedStyle(root).display!=='none')requestAnimationFrame(ensureButton);return r;};
    }
    ensureButton();
  }

  init();
})();