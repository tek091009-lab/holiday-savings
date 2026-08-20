(function(){
  'use strict';

  var initialized=false;
  var PREF_KEY='holidaySavingsHidePastMonths';

  function currentMonthKey(){
    var d=new Date();
    return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0');
  }

  function getPref(){
    try{
      var raw=localStorage.getItem(PREF_KEY);
      if(raw===null && typeof state!=='undefined' && state && state.settings && typeof state.settings.hidePastMonths==='boolean'){
        raw=state.settings.hidePastMonths?'1':'0';
        localStorage.setItem(PREF_KEY,raw);
      }
      return raw==='1';
    }catch(e){return false;}
  }

  function setPref(v){
    try{localStorage.setItem(PREF_KEY,v?'1':'0');}catch(e){}
  }

  function monthlyRoot(){
    return document.getElementById('view-monthly');
  }

  function ensureControl(){
    var root=monthlyRoot();
    if(!root)return;

    var filters=root.querySelector('.filters');
    if(!filters)return;

    var btn=document.getElementById('hsPastMonthsToggle');
    if(!btn){
      btn=document.createElement('button');
      btn.id='hsPastMonthsToggle';
      btn.type='button';
      btn.className='btn slim secondary hs-past-months-toggle';
      filters.appendChild(btn);
      btn.addEventListener('click',function(){
        var next=!getPref();
        setPref(next);

        if(next){
          var year=document.getElementById('yearFilter');
          var thisYear=String(new Date().getFullYear());
          if(year && Array.from(year.options).some(function(o){return o.value===thisYear;})){
            year.value=thisYear;
            try{if(typeof renderMonthlyGrid==='function')renderMonthlyGrid();}catch(e){}
          }
        }

        applyVisibility();
      });
    }

    applyVisibility();
  }

  function applyVisibility(){
    var root=monthlyRoot();
    if(!root)return;

    var hide=getPref();
    var now=currentMonthKey();
    var cards=Array.from(root.querySelectorAll('#monthGrid [data-open-month]'));

    cards.forEach(function(card){
      var payday=String(card.getAttribute('data-open-month')||'');
      var key=payday.slice(0,7);
      card.style.display=(hide && /^20\d{2}-\d{2}$/.test(key) && key<now)?'none':'';
    });

    var btn=document.getElementById('hsPastMonthsToggle');
    if(btn){
      btn.textContent=hide?'Show past months':'Hide past months';
      btn.setAttribute('aria-pressed',hide?'true':'false');
    }
  }

  function addStyle(){
    if(document.getElementById('hsMonthsStyle'))return;
    var st=document.createElement('style');
    st.id='hsMonthsStyle';
    st.textContent='.hs-past-months-toggle{white-space:nowrap}';
    document.head.appendChild(st);
  }

  function init(){
    if(initialized)return;
    if(typeof renderMonthlyGrid!=='function' || typeof setView!=='function'){
      setTimeout(init,80);
      return;
    }
    initialized=true;
    addStyle();

    var oldGrid=renderMonthlyGrid;
    renderMonthlyGrid=function(){
      var out=oldGrid.apply(this,arguments);
      requestAnimationFrame(applyVisibility);
      return out;
    };

    var oldSetView=setView;
    setView=function(v){
      var out=oldSetView.apply(this,arguments);
      if(v==='monthly')requestAnimationFrame(function(){ensureControl();applyVisibility();});
      return out;
    };

    var year=document.getElementById('yearFilter');
    if(year){
      year.addEventListener('change',function(){setTimeout(applyVisibility,0);});
    }

    ensureControl();
  }

  init();
})();