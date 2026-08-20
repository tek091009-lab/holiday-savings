(function(){
  'use strict';

  var initialized=false;

  function monthKeyFromText(text){
    text=String(text||'').replace(/\s+/g,' ').trim();
    var iso=text.match(/\b(20\d{2})-(0[1-9]|1[0-2])(?:-\d{2})?\b/);
    if(iso)return iso[1]+'-'+iso[2];

    var uk=text.match(/\b(?:\d{1,2}[\/\-.])?(0?[1-9]|1[0-2])[\/\-.](20\d{2})\b/);
    if(uk)return uk[2]+'-'+String(Number(uk[1])).padStart(2,'0');

    var names={jan:1,january:1,feb:2,february:2,mar:3,march:3,apr:4,april:4,may:5,jun:6,june:6,jul:7,july:7,aug:8,august:8,sep:9,sept:9,september:9,oct:10,october:10,nov:11,november:11,dec:12,december:12};
    var m=text.match(/\b(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+(20\d{2})\b/i);
    if(m){
      var key=m[1].toLowerCase();
      return m[2]+'-'+String(names[key]||names[key.slice(0,3)]).padStart(2,'0');
    }
    return null;
  }

  function currentMonthKey(){
    var d=new Date();
    return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0');
  }

  function hidePreference(){
    try{return !!(state && state.settings && state.settings.hidePastMonths);}catch(e){return false;}
  }

  function setHidePreference(v){
    try{
      if(!state.settings)state.settings={};
      state.settings.hidePastMonths=!!v;
      if(typeof persist==='function')persist();
    }catch(e){}
  }

  function monthlyView(){
    return document.getElementById('view-monthly') || document.getElementById('view-monthly-plan') || document.querySelector('[data-view="monthly"]');
  }

  function candidateRows(view){
    var rows=Array.from(view.querySelectorAll('tbody tr,.month-row,.monthly-row,.plan-row,[data-month]'));
    if(rows.length)return rows;

    var tables=Array.from(view.querySelectorAll('table'));
    tables.forEach(function(t){Array.from(t.querySelectorAll('tr')).slice(1).forEach(function(r){if(rows.indexOf(r)<0)rows.push(r);});});
    if(rows.length)return rows;

    var all=Array.from(view.querySelectorAll('.card,.row,.item'));
    return all.filter(function(el){return !!monthKeyFromText(el.getAttribute('data-month')||el.textContent||'');});
  }

  function applyVisibility(){
    var view=monthlyView();
    if(!view)return;
    var hide=hidePreference();
    var now=currentMonthKey();
    candidateRows(view).forEach(function(row){
      var key=monthKeyFromText(row.getAttribute('data-month')||row.textContent||'');
      if(!key)return;
      if(!row.dataset.hsOriginalDisplay)row.dataset.hsOriginalDisplay=row.style.display||'';
      row.style.display=(hide && key<now)?'none':row.dataset.hsOriginalDisplay;
    });
    var btn=view.querySelector('#hsPastMonthsToggle');
    if(btn){
      btn.textContent=hide?'Show past months':'Hide past months';
      btn.setAttribute('aria-pressed',hide?'true':'false');
      btn.title=hide?'Show months before '+now:'Hide months before '+now;
    }
  }

  function ensureControl(){
    var view=monthlyView();
    if(!view || view.querySelector('#hsPastMonthsToggle')){applyVisibility();return;}

    var btn=document.createElement('button');
    btn.id='hsPastMonthsToggle';
    btn.type='button';
    btn.className='btn slim secondary hs-past-months-toggle';
    btn.addEventListener('click',function(){
      setHidePreference(!hidePreference());
      applyVisibility();
    });

    var heading=view.querySelector('.page-actions,.view-actions,.toolbar,.section-actions,.header-actions');
    if(heading){
      heading.appendChild(btn);
    }else{
      var title=view.querySelector('h1,h2,h3');
      if(title && title.parentElement){
        var wrap=document.createElement('div');
        wrap.className='hs-month-toggle-wrap';
        title.parentElement.insertBefore(wrap,title.nextSibling);
        wrap.appendChild(btn);
      }else{
        view.insertBefore(btn,view.firstChild);
      }
    }
    applyVisibility();
  }

  function addStyle(){
    if(document.getElementById('hsMonthsStyle'))return;
    var st=document.createElement('style');
    st.id='hsMonthsStyle';
    st.textContent='.hs-month-toggle-wrap{display:flex;justify-content:flex-end;margin:0 0 12px}.hs-past-months-toggle{white-space:nowrap}';
    document.head.appendChild(st);
  }

  function init(){
    if(initialized)return;
    if(typeof state==='undefined' || typeof renderAll!=='function'){setTimeout(init,120);return;}
    initialized=true;
    addStyle();

    var oldRender=renderAll;
    renderAll=function(){
      var r=oldRender.apply(this,arguments);
      setTimeout(ensureControl,0);
      return r;
    };

    document.addEventListener('click',function(e){
      var target=e.target&&e.target.closest&&e.target.closest('button,a,[role="button"]');
      if(!target)return;
      var text=(target.textContent||'').trim().toLowerCase();
      if(text.indexOf('monthly')>=0)setTimeout(ensureControl,30);
    },true);

    ensureControl();
  }

  init();
})();