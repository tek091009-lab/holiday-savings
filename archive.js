(function(){
  'use strict';

  var candidateId=null;
  var candidateComplete=false;
  var initialized=false;

  function ensureArchiveState(){
    try{if(typeof state!=='undefined'&&state&&!Array.isArray(state.archivedGoals))state.archivedGoals=[];}catch(e){}
  }
  function getGoal(id){try{return (state.goals||[]).find(function(g){return String(g.id)===String(id);})||null;}catch(e){return null;}}
  function completeText(el){var t=(el&&(el.innerText||el.textContent)||'').replace(/\s+/g,' ');return /100%/.test(t)||/Remaining\s*£?0(?:\.00)?\b/i.test(t);}
  function visible(el){if(!el)return false;var s=getComputedStyle(el);return s.display!=='none'&&s.visibility!=='hidden'&&!el.hidden;}
  function esc(v){return String(v==null?'':v).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}

  function archiveGoal(id){
    ensureArchiveState();var goal=getGoal(id);if(!goal)return;
    var copy=JSON.parse(JSON.stringify(goal));copy.archivedAt=new Date().toISOString();state.archivedGoals.push(copy);
    state.goals=state.goals.filter(function(g){return String(g.id)!==String(id);});
    try{if(typeof activeGoalId!=='undefined'&&String(activeGoalId)===String(id))activeGoalId=(state.goals[0]&&state.goals[0].id)||null;}catch(e){}
    try{if(typeof editingPotId!=='undefined')editingPotId=null;}catch(e){}
    try{if(typeof potSettingsDraft!=='undefined')potSettingsDraft=null;}catch(e){}
    if(typeof persist==='function')persist();if(typeof renderAll==='function')renderAll();if(typeof setView==='function')setView('pots');
  }

  function restoreGoal(id){
    ensureArchiveState();var i=state.archivedGoals.findIndex(function(g){return String(g.id)===String(id);});if(i<0)return;
    var goal=state.archivedGoals.splice(i,1)[0];if(goal)delete goal.archivedAt;state.goals.push(goal);
    if(typeof persist==='function')persist();if(typeof renderAll==='function')renderAll();refreshArchiveCard();
  }

  function archiveHtml(){
    ensureArchiveState();var list=state.archivedGoals||[];if(!list.length)return '<div class="hs-archive-empty">No archived holidays yet.</div>';
    return list.map(function(g){var d=g.archivedAt?new Date(g.archivedAt).toLocaleDateString('en-GB'):'Archived';return '<div class="hs-archive-row"><div><b>'+esc(g.name||g.title||'Holiday')+'</b><small>Archived '+esc(d)+'</small></div><button type="button" class="btn slim secondary hs-restore-pot" data-id="'+esc(g.id)+'">Restore</button></div>';}).join('');
  }

  function refreshArchiveCard(){
    ensureArchiveState();var root=document.getElementById('view-settings');if(!root)return;
    var card=root.querySelector('.hs-archive-card');if(!card){card=document.createElement('div');card.className='settings-card hs-archive-card';(root.querySelector('.settings-grid,.settings-cards')||root).appendChild(card);}
    card.innerHTML='<h4>Archive</h4><div class="hs-archive-sub">Completed holidays kept out of active pots and active Total Saved.</div><div class="hs-archive-list">'+archiveHtml()+'</div>';
    card.querySelectorAll('.hs-restore-pot').forEach(function(b){b.addEventListener('click',function(){restoreGoal(b.getAttribute('data-id'));});});
  }

  function findSettingsPanel(){
    var preferred=document.querySelectorAll('[role="dialog"],.modal,.modal-card,.drawer,.sheet,.pot-settings,.settings-modal,[class*="modal"],[class*="drawer"]');
    for(var i=preferred.length-1;i>=0;i--){if(visible(preferred[i])){var tx=(preferred[i].innerText||'').toLowerCase();if(tx.indexOf('delete')>=0||tx.indexOf('target')>=0||tx.indexOf('holiday')>=0||tx.indexOf('pot')>=0)return preferred[i];}}
    var btns=document.querySelectorAll('button');
    for(var j=btns.length-1;j>=0;j--){if(!visible(btns[j]))continue;var t=(btns[j].textContent||'').trim().toLowerCase();if(t.indexOf('delete')>=0||t==='save'||t.indexOf('save changes')>=0)return btns[j].closest('form,.panel,.card,.settings-card')||btns[j].parentElement;}
    return null;
  }

  function injectArchive(attempt){
    if(!candidateComplete)return;
    try{if(typeof editingPotId!=='undefined'&&editingPotId)candidateId=editingPotId;}catch(e){}
    if(!candidateId){if(attempt<5)setTimeout(function(){injectArchive(attempt+1);},50);return;}
    var panel=findSettingsPanel();if(!panel){if(attempt<5)setTimeout(function(){injectArchive(attempt+1);},50);return;}
    if(panel.querySelector('.hs-archive-pot-btn'))return;
    var buttons=Array.from(panel.querySelectorAll('button'));var deleteBtn=buttons.find(function(b){return /delete/i.test(b.textContent||'');});
    var btn=document.createElement('button');btn.type='button';btn.className='btn slim secondary hs-archive-pot-btn';btn.textContent='Archive';btn.title='Archive completed holiday';
    btn.addEventListener('click',function(){var g=getGoal(candidateId),name=g&&(g.name||g.title)||'this holiday';if(window.confirm('Archive '+name+'? It will be removed from active pots and active Total Saved, but its data will be kept.'))archiveGoal(candidateId);});
    if(deleteBtn&&deleteBtn.parentElement)deleteBtn.parentElement.insertBefore(btn,deleteBtn);else (panel.querySelector('.actions,.modal-actions,.form-actions,.settings-actions')||panel).appendChild(btn);
  }

  function addStyle(){if(document.getElementById('hsArchiveStyle'))return;var st=document.createElement('style');st.id='hsArchiveStyle';st.textContent='.hs-archive-card{margin-top:12px}.hs-archive-sub{font-size:11px;color:#89a7ba;margin:-1px 0 10px;line-height:1.45}.hs-archive-list{display:grid;gap:8px}.hs-archive-row{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:10px 11px;border:1px solid rgba(91,146,179,.2);background:rgba(255,255,255,.025);border-radius:12px}.hs-archive-row b{display:block;font-size:12px}.hs-archive-row small{display:block;color:#89a7ba;font-size:10px;margin-top:3px}.hs-archive-empty{padding:12px;border:1px dashed rgba(91,146,179,.25);border-radius:12px;color:#89a7ba;font-size:11px}.hs-archive-pot-btn{margin-right:8px!important;border-color:rgba(91,230,166,.32)!important;color:#8ff0bd!important}';document.head.appendChild(st);}

  function init(){
    if(initialized)return;if(typeof state==='undefined'||typeof setView!=='function'||typeof persist!=='function'){setTimeout(init,80);return;}initialized=true;addStyle();ensureArchiveState();
    try{if(typeof normalizeLoadedState==='function'){var oldN=normalizeLoadedState;normalizeLoadedState=function(raw){var out=oldN(raw);out.archivedGoals=raw&&Array.isArray(raw.archivedGoals)?raw.archivedGoals:[];return out;};}}catch(e){}
    var oldSetView=setView;setView=function(v){var r=oldSetView.apply(this,arguments);if(v==='settings')requestAnimationFrame(refreshArchiveCard);return r;};
    document.addEventListener('click',function(e){
      var btn=e.target&&e.target.closest&&e.target.closest('button');if(!btn)return;var pots=document.getElementById('view-pots');if(!pots||!pots.contains(btn))return;
      var txt=(btn.textContent||'').trim(),lab=((btn.getAttribute('title')||'')+' '+(btn.getAttribute('aria-label')||'')).toLowerCase();if(!(txt==='⚙'||txt==='⚙️'||lab.indexOf('setting')>=0))return;
      var row=btn.closest('tr,.pot-row,.goal-row,.holiday-row,.pot-card,[data-goal-id],[data-id]');if(!row){var n=btn.parentElement;while(n&&n!==pots){if(completeText(n)){row=n;break;}n=n.parentElement;}}
      candidateComplete=completeText(row);candidateId=row&&(row.getAttribute('data-goal-id')||row.getAttribute('data-id'))||null;setTimeout(function(){injectArchive(0);},20);
    },true);
    refreshArchiveCard();
  }
  init();
})();