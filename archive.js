(function(){
  'use strict';

  var initialized=false;

  function esc(v){
    return String(v==null?'':v).replace(/[&<>"']/g,function(c){
      return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];
    });
  }

  function archiveStore(){
    if(!state.settings)state.settings={};
    if(!Array.isArray(state.settings.archivedGoals))state.settings.archivedGoals=[];

    // One-time compatibility with the first archive attempt.
    if(Array.isArray(state.archivedGoals) && state.archivedGoals.length){
      state.archivedGoals.forEach(function(g){
        if(!state.settings.archivedGoals.some(function(a){return String(a.id)===String(g.id);})){
          state.settings.archivedGoals.push(g);
        }
      });
    }
    try{delete state.archivedGoals;}catch(e){}
    return state.settings.archivedGoals;
  }

  function getGoal(id){
    return (state.goals||[]).find(function(g){return String(g.id)===String(id);})||null;
  }

  function savedFor(goal){
    try{if(typeof goalSaved==='function')return Number(goalSaved(goal))||0;}catch(e){}
    return Object.values(goal&&goal.entries||{}).reduce(function(sum,e){
      return sum + (e && e.actual!=='' && e.actual!=null && Number.isFinite(Number(e.actual)) ? Number(e.actual) : 0);
    },0);
  }

  function isComplete(goal){
    if(!goal)return false;
    var target=Number(goal.target)||0;
    return target>0 && savedFor(goal)+0.005>=target;
  }

  function archiveGoal(id){
    var goal=getGoal(id);
    if(!goal || !isComplete(goal))return;

    var list=archiveStore();
    var copy=JSON.parse(JSON.stringify(goal));
    copy.archivedAt=new Date().toISOString();
    list.push(copy);
    state.goals=state.goals.filter(function(g){return String(g.id)!==String(id);});

    try{if(String(activeGoalId)===String(id))activeGoalId=(state.goals[0]&&state.goals[0].id)||null;}catch(e){}
    try{editingPotId=null;}catch(e){}
    try{potSettingsDraft=null;}catch(e){}

    persist();
    renderAll();
    setView('pots');
  }

  function restoreGoal(id){
    var list=archiveStore();
    var index=list.findIndex(function(g){return String(g.id)===String(id);});
    if(index<0)return;

    var goal=list.splice(index,1)[0];
    if(goal)delete goal.archivedAt;
    if(!state.goals.some(function(g){return String(g.id)===String(goal.id);})){
      state.goals.push(goal);
    }

    persist();
    renderAll();
    setView('pots');
  }

  function archiveRows(){
    var list=archiveStore();
    if(!list.length){
      return '<div class="hs-archive-empty">No archived holidays yet. Complete a holiday, open its ⚙ settings and choose Archive.</div>';
    }

    return list.map(function(goal){
      var saved=savedFor(goal);
      var target=Number(goal.target)||0;
      var when=goal.archivedAt?new Date(goal.archivedAt).toLocaleDateString('en-GB'):'Archived';
      var bg='';
      try{if(typeof photo==='function')bg=photo(goal)||'';}catch(e){}
      return '<div class="hs-archive-row">'
        +'<div class="hs-archive-thumb"'+(bg?' style="background-image:url(\''+esc(bg)+'\')"':'')+'></div>'
        +'<div class="hs-archive-main"><b>'+esc(goal.name||'Holiday')+'</b><small>'+esc(goal.category||'Holiday pot')+' · Archived '+esc(when)+'</small></div>'
        +'<div class="hs-archive-money"><small>Saved</small><b>'+formatMoney(saved)+'</b></div>'
        +'<div class="hs-archive-money"><small>Target</small><b>'+formatMoney(target)+'</b></div>'
        +'<button type="button" class="btn slim secondary hs-restore-pot" data-id="'+esc(goal.id)+'">Restore</button>'
        +'</div>';
    }).join('');
  }

  function formatMoney(v){
    try{if(typeof fmtMoney==='function')return fmtMoney(v);}catch(e){}
    return '£'+(Number(v)||0).toFixed(2);
  }

  function renderArchivePanel(){
    var root=document.getElementById('view-pots');
    var grid=document.getElementById('potGrid');
    if(!root || !grid)return;

    var oldSettingsArchive=document.querySelector('#view-settings .hs-archive-card');
    if(oldSettingsArchive)oldSettingsArchive.remove();

    var panel=root.querySelector('.hs-archive-panel');
    if(!panel){
      panel=document.createElement('div');
      panel.className='card card-pad hs-archive-panel';
      var activeCard=grid.closest('.card');
      if(activeCard && activeCard.parentElement){
        activeCard.parentElement.insertBefore(panel,activeCard.nextSibling);
      }else{
        root.appendChild(panel);
      }
    }

    panel.innerHTML='<div class="section-head hs-archive-head"><div><h3>Archive</h3><p>Completed holidays moved out of your active pots and active Total Saved.</p></div></div>'
      +'<div class="hs-archive-list">'+archiveRows()+'</div>';

    panel.querySelectorAll('.hs-restore-pot').forEach(function(btn){
      btn.addEventListener('click',function(){restoreGoal(btn.getAttribute('data-id'));});
    });
  }

  function renderArchiveButton(){
    var actions=document.querySelector('#view-potsettings .settings-actions');
    var deleteBtn=document.getElementById('deletePotBtn');
    if(!actions || !deleteBtn)return;

    var btn=document.getElementById('archivePotBtn');
    if(!btn){
      btn=document.createElement('button');
      btn.type='button';
      btn.id='archivePotBtn';
      btn.className='btn hs-archive-pot-btn hidden';
      btn.textContent='Archive';
      btn.title='Archive completed holiday';
      deleteBtn.parentElement.insertBefore(btn,deleteBtn.nextSibling);
      btn.addEventListener('click',function(){
        var id=null;
        try{id=editingPotId;}catch(e){}
        var goal=getGoal(id);
        if(!goal || !isComplete(goal))return;
        if(confirm('Archive '+(goal.name||'this holiday')+'? It will be removed from active Holiday Pots and active Total Saved, but kept here in the Archive.'))archiveGoal(id);
      });
    }

    var id=null;
    try{id=editingPotId;}catch(e){}
    var goal=getGoal(id);
    btn.classList.toggle('hidden',!goal || !isComplete(goal));
  }

  function addStyle(){
    if(document.getElementById('hsArchiveStyle'))return;
    var st=document.createElement('style');
    st.id='hsArchiveStyle';
    st.textContent=''
      +'.hs-archive-panel{margin-top:14px}'
      +'.hs-archive-head{margin-top:0!important}'
      +'.hs-archive-list{display:grid;gap:9px}'
      +'.hs-archive-row{display:grid;grid-template-columns:46px minmax(0,1fr) 110px 110px auto;align-items:center;gap:12px;padding:11px;border:1px solid rgba(91,146,179,.2);background:rgba(255,255,255,.025);border-radius:14px}'
      +'.hs-archive-thumb{width:46px;height:46px;border-radius:11px;background:linear-gradient(135deg,rgba(0,214,255,.12),rgba(89,240,141,.08));background-size:cover;background-position:center}'
      +'.hs-archive-main{min-width:0}.hs-archive-main b{display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.hs-archive-main small,.hs-archive-money small{display:block;color:#89a7ba;font-size:10px;margin-top:3px}'
      +'.hs-archive-money b{display:block;font-size:12px;margin-top:3px}'
      +'.hs-archive-empty{padding:14px;border:1px dashed rgba(91,146,179,.25);border-radius:13px;color:#89a7ba;font-size:11px}'
      +'.hs-archive-pot-btn{margin-left:8px;border-color:rgba(91,230,166,.32)!important;color:#8ff0bd!important}'
      +'@media(max-width:760px){.hs-archive-row{grid-template-columns:42px minmax(0,1fr) auto}.hs-archive-money{display:none}.hs-archive-thumb{width:42px;height:42px}}';
    document.head.appendChild(st);
  }

  function init(){
    if(initialized)return;
    if(typeof state==='undefined' || typeof persist!=='function' || typeof renderPots!=='function' || typeof renderPotSettings!=='function'){
      setTimeout(init,80);
      return;
    }
    initialized=true;
    addStyle();
    archiveStore();

    var oldRenderPots=renderPots;
    renderPots=function(){
      var out=oldRenderPots.apply(this,arguments);
      renderArchivePanel();
      return out;
    };

    var oldRenderPotSettings=renderPotSettings;
    renderPotSettings=function(){
      var out=oldRenderPotSettings.apply(this,arguments);
      renderArchiveButton();
      return out;
    };

    renderArchivePanel();
    renderArchiveButton();
  }

  init();
})();