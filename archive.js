(function(){
  'use strict';

  var archiveCandidateId=null;
  var archiveCandidateComplete=false;
  var initialized=false;

  function moneyZeroText(text){
    return /Remaining\s*£?0(?:\.00)?\b/i.test(text||'');
  }

  function isCompleteRow(row){
    if(!row)return false;
    var text=(row.innerText||row.textContent||'').replace(/\s+/g,' ');
    return /100%/.test(text) || moneyZeroText(text);
  }

  function ensureArchiveState(){
    try{
      if(typeof state!=='undefined' && state && !Array.isArray(state.archivedGoals)) state.archivedGoals=[];
    }catch(e){}
  }

  function getGoal(id){
    try{return (state.goals||[]).find(function(g){return String(g.id)===String(id);})||null;}catch(e){return null;}
  }

  function archiveGoal(id){
    ensureArchiveState();
    var goal=getGoal(id);
    if(!goal)return;
    var copy=JSON.parse(JSON.stringify(goal));
    copy.archivedAt=new Date().toISOString();
    state.archivedGoals.push(copy);
    state.goals=state.goals.filter(function(g){return String(g.id)!==String(id);});
    try{if(typeof activeGoalId!=='undefined' && String(activeGoalId)===String(id)) activeGoalId=(state.goals[0]&&state.goals[0].id)||null;}catch(e){}
    try{if(typeof editingPotId!=='undefined') editingPotId=null;}catch(e){}
    try{if(typeof potSettingsDraft!=='undefined') potSettingsDraft=null;}catch(e){}
    if(typeof persist==='function') persist();
    if(typeof renderAll==='function') renderAll();
    if(typeof setView==='function') setView('pots');
    setTimeout(ensureArchiveUi,30);
  }

  function restoreGoal(id){
    ensureArchiveState();
    var idx=state.archivedGoals.findIndex(function(g){return String(g.id)===String(id);});
    if(idx<0)return;
    var goal=state.archivedGoals.splice(idx,1)[0];
    if(goal)delete goal.archivedAt;
    if(!Array.isArray(state.goals))state.goals=[];
    state.goals.push(goal);
    if(typeof persist==='function')persist();
    if(typeof renderAll==='function')renderAll();
    setTimeout(ensureArchiveUi,30);
  }

  function visible(el){
    if(!el)return false;
    var s=getComputedStyle(el),r=el.getBoundingClientRect();
    return s.display!=='none' && s.visibility!=='hidden' && r.width>0 && r.height>0;
  }

  function findSettingsPanel(){
    var sels=['[role="dialog"]','.modal','.drawer','.sheet','.panel','.pot-settings','.settings-modal','.modal-card','.dialog'];
    var all=[];
    sels.forEach(function(sel){try{document.querySelectorAll(sel).forEach(function(el){if(visible(el)&&all.indexOf(el)<0)all.push(el);});}catch(e){}});
    var goal=getGoal(archiveCandidateId),name=goal&&String(goal.name||goal.title||'').trim();
    if(name){
      var named=all.find(function(el){return (el.innerText||'').indexOf(name)>=0;});
      if(named)return named;
    }
    return all.find(function(el){var t=(el.innerText||'').toLowerCase();return t.indexOf('pot')>=0 && (t.indexOf('save')>=0||t.indexOf('target')>=0||t.indexOf('settings')>=0);})||null;
  }

  function ensureArchiveAction(){
    if(!archiveCandidateId || !archiveCandidateComplete)return;
    var panel=findSettingsPanel();
    if(!panel || panel.querySelector('.hs-archive-pot-btn'))return;
    var actions=panel.querySelector('.modal-actions,.actions,.form-actions,.settings-actions,.drawer-actions')||panel;
    var btn=document.createElement('button');
    btn.type='button';
    btn.className='btn slim secondary hs-archive-pot-btn';
    btn.textContent='Archive';
    btn.title='Move this completed holiday out of active totals';
    btn.style.marginTop='10px';
    btn.addEventListener('click',function(){
      var goal=getGoal(archiveCandidateId);
      var name=goal&&(goal.name||goal.title)||'this holiday';
      if(!window.confirm('Archive '+name+'? It will be removed from active pots and Total Saved, but its data will be kept in Archive.'))return;
      archiveGoal(archiveCandidateId);
    });
    actions.appendChild(btn);
  }

  function archiveCardHtml(){
    ensureArchiveState();
    var items=state.archivedGoals||[];
    if(!items.length)return '<div class="hs-archive-empty">No archived holidays yet.</div>';
    return items.map(function(g){
      var name=String(g.name||g.title||'Holiday').replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});
      var when=g.archivedAt?new Date(g.archivedAt).toLocaleDateString('en-GB'):'Archived';
      return '<div class="hs-archive-row"><div><b>'+name+'</b><small>'+when+'</small></div><button type="button" class="btn slim secondary hs-restore-pot" data-id="'+String(g.id).replace(/"/g,'&quot;')+'">Restore</button></div>';
    }).join('');
  }

  function ensureArchiveUi(){
    ensureArchiveState();
    var settings=document.getElementById('view-settings');
    if(settings && visible(settings)){
      var card=settings.querySelector('.hs-archive-card');
      if(!card){
        card=document.createElement('div');
        card.className='settings-card hs-archive-card';
        var host=settings.querySelector('.settings-grid,.settings-cards')||settings;
        host.appendChild(card);
      }
      card.innerHTML='<h4>Archive</h4><div class="hs-archive-sub">Completed holidays kept out of your active pots and Total Saved.</div><div class="hs-archive-list">'+archiveCardHtml()+'</div>';
      card.querySelectorAll('.hs-restore-pot').forEach(function(btn){btn.addEventListener('click',function(){restoreGoal(btn.getAttribute('data-id'));});});
    }
    ensureArchiveAction();
  }

  function addStyle(){
    if(document.getElementById('hsArchiveStyle'))return;
    var st=document.createElement('style');st.id='hsArchiveStyle';
    st.textContent='.hs-archive-card{margin-top:12px}.hs-archive-sub{font-size:11px;color:#89a7ba;margin:-1px 0 10px;line-height:1.45}.hs-archive-list{display:grid;gap:8px}.hs-archive-row{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:10px 11px;border:1px solid rgba(91,146,179,.2);background:rgba(255,255,255,.025);border-radius:12px}.hs-archive-row b{display:block;font-size:12px}.hs-archive-row small{display:block;color:#89a7ba;font-size:10px;margin-top:3px}.hs-archive-empty{padding:12px;border:1px dashed rgba(91,146,179,.25);border-radius:12px;color:#89a7ba;font-size:11px}.hs-archive-pot-btn{border-color:rgba(91,230,166,.28)!important;color:#8ff0bd!important}';
    document.head.appendChild(st);
  }

  function init(){
    if(initialized)return;
    if(typeof state==='undefined' || typeof renderAll!=='function' || typeof persist!=='function'){setTimeout(init,100);return;}
    initialized=true;addStyle();ensureArchiveState();

    try{
      if(typeof normalizeLoadedState==='function'){
        var oldNormalize=normalizeLoadedState;
        normalizeLoadedState=function(raw){
          var out=oldNormalize(raw);
          out.archivedGoals=raw&&Array.isArray(raw.archivedGoals)?raw.archivedGoals:[];
          return out;
        };
      }
    }catch(e){}

    document.addEventListener('click',function(e){
      var btn=e.target&&e.target.closest&&e.target.closest('button');
      if(!btn)return;
      var text=(btn.innerText||btn.textContent||'').trim();
      var title=(btn.getAttribute('title')||'').toLowerCase();
      var gear=text==='⚙' || text==='⚙️' || title.indexOf('setting')>=0 || btn.getAttribute('aria-label')&&btn.getAttribute('aria-label').toLowerCase().indexOf('setting')>=0;
      if(!gear)return;
      var pots=document.getElementById('view-pots');
      if(pots && pots.contains(btn)){
        var row=btn.closest('tr,.pot-row,.goal-row,.holiday-row,.pot-card,[data-goal-id],[data-id]')||btn.parentElement;
        archiveCandidateComplete=isCompleteRow(row);
        setTimeout(function(){
          try{archiveCandidateId=typeof editingPotId!=='undefined'&&editingPotId?editingPotId:archiveCandidateId;}catch(err){}
          ensureArchiveAction();
        },40);
      }
    },true);

    var oldRender=renderAll;
    renderAll=function(){var r=oldRender.apply(this,arguments);setTimeout(ensureArchiveUi,0);return r;};
    var mo=new MutationObserver(function(){ensureArchiveUi();});mo.observe(document.body,{childList:true,subtree:true});
    ensureArchiveUi();
  }

  init();
})();