(function(){
  'use strict';

  var initialized=false;
  var names={jan:1,january:1,feb:2,february:2,mar:3,march:3,apr:4,april:4,may:5,jun:6,june:6,jul:7,july:7,aug:8,august:8,sep:9,sept:9,september:9,oct:10,october:10,nov:11,november:11,dec:12,december:12};

  function currentMonthKey(){var d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0');}
  function view(){return document.getElementById('view-monthly')||document.getElementById('view-monthly-plan')||document.querySelector('[data-view="monthly"]');}
  function isVisible(el){return !!el&&getComputedStyle(el).display!=='none'&&!el.hidden;}
  function pref(){try{return !!(state&&state.settings&&state.settings.hidePastMonths);}catch(e){return false;}}
  function setPref(v){try{if(!state.settings)state.settings={};state.settings.hidePastMonths=!!v;if(typeof persist==='function')persist();}catch(e){}}

  function keyFrom(el){
    var text='';
    if(el&&el.getAttribute)text=el.getAttribute('data-month')||el.getAttribute('data-month-key')||el.getAttribute('data-date')||'';
    text=(text||el&&el.textContent||'').replace(/\s+/g,' ');
    var iso=text.match(/\b(20\d{2})[-\/](0?[1-9]|1[0-2])(?:[-\/]\d{1,2})?\b/);if(iso)return iso[1]+'-'+String(Number(iso[2])).padStart(2,'0');
    var named=text.match(/\b(January|February|March|April|May|June|July|August|September|Sept|October|November|December|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(20\d{2})\b/i);
    if(named){var n=names[named[1].toLowerCase()]||names[named[1].slice(0,3).toLowerCase()];return named[2]+'-'+String(n).padStart(2,'0');}
    var dated=text.match(/\b\d{1,2}\s+(January|February|March|April|May|June|July|August|September|Sept|October|November|December|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(20\d{2})\b/i);
    if(dated){var n2=names[dated[1].toLowerCase()]||names[dated[1].slice(0,3).toLowerCase()];return dated[2]+'-'+String(n2).padStart(2,'0');}
    return null;
  }

  function rows(root){
    var list=Array.from(root.querySelectorAll('[data-month],[data-month-key],[data-date],tbody tr,.month-row,.monthly-row,.plan-row,.month-card,.monthly-card,.month-section'));
    return list.filter(function(el){var k=keyFrom(el);if(!k)return false;var p=el.parentElement;while(p&&p!==root){if(list.indexOf(p)>=0&&keyFrom(p)===k)return false;p=p.parentElement;}return true;});
  }

  function apply(){
    var root=view();if(!root)return;var hide=pref(),now=currentMonthKey();
    rows(root).forEach(function(r){var k=keyFrom(r);r.classList.toggle('hs-past-month-hidden',!!(hide&&k&&k<now));});
    var btn=root.querySelector('#hsPastMonthsToggle');if(btn){btn.textContent=hide?'Show past months':'Hide past months';btn.setAttribute('aria-pressed',hide?'true':'false');}
  }

  function ensureControl(){
    var root=view();if(!root)return;var btn=root.querySelector('#hsPastMonthsToggle');
    if(!btn){btn=document.createElement('button');btn.id='hsPastMonthsToggle';btn.type='button';btn.className='btn slim secondary hs-past-months-toggle';btn.addEventListener('click',function(){setPref(!pref());apply();});
      var host=root.querySelector('.page-actions,.view-actions,.toolbar,.section-actions,.header-actions');
      if(host)host.appendChild(btn);else{var wrap=document.createElement('div');wrap.className='hs-month-toggle-wrap';var title=root.querySelector('h1,h2,h3');if(title&&title.parentElement)title.parentElement.insertBefore(wrap,title.nextSibling);else root.insertBefore(wrap,root.firstChild);wrap.appendChild(btn);}
    }
    apply();
  }

  function addStyle(){if(document.getElementById('hsMonthsStyle'))return;var st=document.createElement('style');st.id='hsMonthsStyle';st.textContent='.hs-past-month-hidden{display:none!important}.hs-month-toggle-wrap{display:flex;justify-content:flex-end;margin:0 0 12px}.hs-past-months-toggle{white-space:nowrap}';document.head.appendChild(st);}

  function init(){
    if(initialized)return;if(typeof state==='undefined'||typeof setView!=='function'){setTimeout(init,80);return;}initialized=true;addStyle();if(!state.settings)state.settings={};if(typeof state.settings.hidePastMonths!=='boolean')state.settings.hidePastMonths=false;
    var oldSetView=setView;setView=function(v){var r=oldSetView.apply(this,arguments);if(v==='monthly'||v==='monthly-plan')requestAnimationFrame(ensureControl);return r;};
    if(typeof renderAll==='function'){var oldRender=renderAll;renderAll=function(){var r=oldRender.apply(this,arguments),root=view();if(root&&isVisible(root))requestAnimationFrame(ensureControl);return r;};}
    var root=view();if(root&&isVisible(root))ensureControl();
  }
  init();
})();