(function(){
  'use strict';

  var archiveCandidateId=null;
  var archiveCandidateComplete=false;
  var initialized=false;

  function ensureArchiveState(){
    try{
      if(typeof state!=='undefined' && state && !Array.isArray(state.archivedGoals)) state.archivedGoals=[];
    }catch(e){}
  }

  function getGoal(id){
    try{return (state.goals||[]).find(function(g){return String(g.id)===String(id);})||null;}catch(e){return null;}
  }

  function isCompleteRow(row){
    if(!row)return false;
    var text=(row.innerText||row.textContent||'').replace(/\s+/g,' ');
    return /100%/.test(text) || /Remaining\s*£?0(?:\.00)?\b/i.test(text);
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
    if(typeof persist==='function')persist();
    if(typeof renderAll==='function')renderAll();
    if(typeof setView==='function')setView('pots');
  }

  function restoreGoal(id){
    ensureArchiveState();
    var idx=state.archivedGoals.findIndex(function(g){return String(g.id)===String(id);});
    if(idx<0)return;
    var goal=state.archivedGoals.splice(idx,1)[0];
    if(goal)delete goal.archivedAt;
    state.goals.push(goal);
    if(typeof persist==='function')persist();
    if(typeof renderAll==='function')renderAll();
    setTimeout(renderArchiveCard,0);
  }

  function esc(v){
    return String(v==null?'':v).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});
  }

  function archiveCardHtml(){
    ensureArchiveState();
    var items=state.archivedGoals||[];
    if(!items.length)return '<div class="hs-archive-empty">No archived holidays yet.</div>';
    return items.map(function(g){
      var when=g.archivedAt?new Date(g.archivedAt).toLocaleDateString('en-GB'):'Archived';
      return '<div class="hs-archive-row"><div><b>'+esc(g.name||g.title||'Holiday')+'</b><small>Archived '+esc(when)+'</small></div><button type="button" class="btn slim secondary hs-restore-pot" data-id="'+esc(g.id)+'">Restore</button></div>';
    }).join('');
  }

  function renderArchiveCard(){
    ensureArchiveState();
    var settings=document.getElementById('view-settings');
    if(!settings)return;
    var card=settings.querySelector('.hs-archive-card');
    if(!card){
      card=document.createElement('div');
      card.className='settings-card hs-archive-card';
      var host=settings.querySelector('.settings-grid,.settings-cards')||settings;
      host.appendChild(card);
    }
    card.innerHTML='<h4>Archive</h4><div class="hs-archive-sub">Completed holidays kept out of your active pots and Total Saved.</div><div class="hs-archive-list">'+archiveCardHtml()+'</div>';
    card.querySelectorAll('.hs-restore-pot').forEach(function(btn){
      btn.addEventListener('click',function(){restoreGoal(btn.getAttribute('data-id'));});
    });
  }

  function visible(el){
    if(!el)return false;
    var s=getComputedStyle(el);
    return s.display!=='none' && s.visibility!=='hidden';
  }

  function findPotSettingsPanel(){
    var selectors=['[role="dialog"]','.modal','.modal-card','.drawer','.sheet','.pot-settings','.settings-modal','[class*="modal"]','[class*="drawer"]'];
    for(var i=0;i<selectors.length;i++){
      var els=document.querySelectorAll(selectors[i]);
      for(var j=els.length-1;j>=0;j--){
        if(visible(els[j]))return els[j];
      }
    }
    var buttons=document.querySelectorAll('button');
    for(var k=buttons.length-1;k>=0;k--){
      if(!visible(buttons[k]))continue;
      var t=(buttons[k].textContent||'').trim().toLowerCase();
      if(t.indexOf('delete')>=0 || t.indexOf('save')>=0){
        var p=buttons[k].closest('form,.panel,.card,.settings-card')||buttons[k].parentElement;
        if(p)return p;
      }
    }
    return null;
  }

  function addArchiveAction(){
    if(!archiveCandidateId || !archiveCandidateComplete)return;
    var panel=findPotSettingsPanel();
    if(!panel || panel.querySelector('.hs-archive-pot-btn'))return;
    var actions=panel.querySelector('.modal-actions,.actions,.form-actions,.settings-actions,.drawer-actions')||null;
    if(!actions){
      var deleteBtn=Array.from(panel.querySelectorAll('button')).find(function(b){return /delete/i.test(b.textContent||'');});
      actions=deleteBtn&&deleteBtn.parentElement || panel;
    }
    var btn=document.createElement('button');
    btn.type='button';
    btn.className='btn slim secondary hs-archive-pot-btn';
    btn.textContent='Archive';
    btn.title='Move this completed holiday to Archive';
    btn.addEventListener('click',function(){
      var goal=getGoal(archiveCandidateId);
      var name=goal&&(goal.name||goal.title)||'this holiday';
      if(!window.confirm('Archive '+name+'? It will disappear from active pots and active totals, but all of its data will stay in Archive.'))return;
      archiveGoal(archiveCandidateId);
    });
    actions.appendChild(btn);
  }

  function addStyle(){
    if(document.getElementById('hsArchiveStyle'))return;
    var st=document.createElement('style');
    st.id='hsArchiveStyle';
    st.textContent='.hs-archive-card{margin-top:12px}.hs-archive-sub{font-size:11px;color:#89a7ba;margin:-1px 0 10px;line-height:1.45}.hs-archive-list{display:grid;gap:8px}.hs-archive-row{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:10px 11px;border:1px solid rgba(91,146,179,.2);background:rgba(255,255,255,.025);border-radius:12px}.hs-archive-row b{display:block;font-size:12px}.hs-archive-row small{display:block;color:#89a7ba;font-size:10px;margin-top:3px}.hs-archive-empty{padding:12px;border:1px dashed rgba(91,146,179,.25);border-radius:12px;color:#89a7ba;font-size:11px}.hs-archive-pot-btn{margin-top:10px!important;border-color:rgba(91,230,166,.28)!important;color:#8ff0bd!important}';
    document.head.appendChild(st);
  }

  function init(){
    if(initialized)return;
    if(typeof state==='undefined' || typeof renderAll!=='function' || typeof persist!=='function'){setTimeout(init,120);return;}
    initialized=true;
    addStyle();
    ensureArchiveState();

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

      if(btn.classList.contains('hs-restore-pot'))return;

      var settingsView=document.getElementById('view-settings');
      if(settingsView && settingsView.contains(btn)) setTimeout(renderArchiveCard,0);

      var text=(btn.textContent||'').trim();
      var title=(btn.getAttribute('title')||'').toLowerCase();
      var aria=(btn.getAttribute('aria-label')||'').toLowerCase();
      var gear=text==='⚙' || text==='⚙️' || title.indexOf('setting')>=0 || aria.indexOf('setting')>=0;
      if(!gear)return;

      var pots=document.getElementById('view-pots');
      if(!pots || !pots.contains(btn))return;

      var row=btn.closest('tr,.pot-row,.goal-row,.holiday-row,.pot-card,[data-goal-id],[data-id]');
      if(!row){
        var n=btn.parentElement;
        while(n && n!==pots){
          if(isCompleteRow(n)){row=n;break;}
          n=n.parentElement;
        }
      }
      archiveCandidateComplete=isCompleteRow(row);
      archiveCandidateId=null;
      setTimeout(function(){
        try{if(typeof editingPotId!=='undefined' && editingPotId) archiveCandidateId=editingPotId;}catch(err){}
        if(archiveCandidateComplete && archiveCandidateId) addArchiveAction();
      },60);
    },true);

    var oldRender=renderAll;
    renderAll=function(){
      var r=oldRender.apply(this,arguments);
      var settings=document.getElementById('view-settings');
      if(settings && !settings.classList.contains('hidden')) setTimeout(renderArchiveCard,0);
      return r;
    };

    renderArchiveCard();
  }

  init();
})();