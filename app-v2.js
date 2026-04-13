// ════════════════════════════════════════
// FIRESTORE REFERENCE — lazy init to avoid crash on load
// ════════════════════════════════════════
var _db = null;
var _currentUid = null;
function getDb(){if(!_db)_db=firebase.firestore();return _db;}

// ════════════════════════════════════════
// DEFAULT USER DATA — used for new accounts
// ════════════════════════════════════════
function getDefaultUserData() {
  return {
    settings: { name: '', weedTarget: 1, workoutWeekTarget: 5, sleepTarget: 7, startWeight: 162 },
    workouts: [],
    weedLogs: [],
    mealLogs: [],
    waterLogs: [],
    sleepLogs: [],
    weightLog: [],
    checkItems: [
      { id: 1, label: 'No Doom Scroll',       pts: 15 },
      { id: 2, label: '2 Real Meals',          pts: 15 },
      { id: 3, label: 'Workout / Walk',        pts: 25 },
      { id: 4, label: 'Read',                  pts: 15 },
      { id: 5, label: 'Nightly Gratitude',     pts: 15 },
      { id: 6, label: 'Phone Down by 10pm',    pts: 15 }
    ],
    dailyChecks: {},
    ctrlCategories: [
      { id: 'porn',   label: 'No Porn',           icon: '🔒', active: true },
      { id: 'mast',   label: 'No Masturbation',   icon: '🔒', active: true },
      { id: 'weed',   label: 'Weed Control',      icon: '🌿', active: true },
      { id: 'scroll', label: 'No Doom Scrolling', icon: '📱', active: true },
      { id: 'food',   label: 'Food Discipline',   icon: '🍽', active: true }
    ],
    ctrlLogs: {},
    journalEntries: [],
    mantraText: "I don't obey urges — I observe them until they pass."
  };
}

// ════════════════════════════════════════
// LOAD USER DATA FROM FIRESTORE
// Called by index.html auth listener after login
// ════════════════════════════════════════
function loadUserData(uid) {
  _currentUid = uid;
  var docRef = getDb().collection('users').doc(uid).collection('data').doc('appState');

  return docRef.get().then(function(doc) {
    var data = doc.exists ? doc.data() : getDefaultUserData();

    // Hydrate all app state variables
    settings        = data.settings        || getDefaultUserData().settings;
    workouts        = data.workouts        || [];
    weedLogs        = data.weedLogs        || [];
    mealLogs        = data.mealLogs        || [];
    waterLogs       = data.waterLogs       || [];
    sleepLogs       = data.sleepLogs       || [];
    weightLog       = data.weightLog       || [];
    checkItems      = data.checkItems      || getDefaultUserData().checkItems;
    dailyChecks     = data.dailyChecks     || {};
    ctrlCategories  = data.ctrlCategories  || getDefaultUserData().ctrlCategories;
    ctrlLogs        = data.ctrlLogs        || {};
    journalEntries  = data.journalEntries  || [];
    mantraText      = data.mantraText      || getDefaultUserData().mantraText;

    // If brand new user, save defaults immediately
    if (!doc.exists) {
      return saveUserData();
    }
  });
}

// ════════════════════════════════════════
// SAVE ALL USER DATA TO FIRESTORE
// ════════════════════════════════════════
function saveUserData() {
  if (!_currentUid) return Promise.resolve();
  var docRef = getDb().collection('users').doc(_currentUid).collection('data').doc('appState');
  return docRef.set({
    settings:       settings,
    workouts:       workouts,
    weedLogs:       weedLogs,
    mealLogs:       mealLogs,
    waterLogs:      waterLogs,
    sleepLogs:      sleepLogs,
    weightLog:      weightLog,
    checkItems:     checkItems,
    dailyChecks:    dailyChecks,
    ctrlCategories: ctrlCategories,
    ctrlLogs:       ctrlLogs,
    journalEntries: journalEntries,
    mantraText:     mantraText
  }).catch(function(err) {
    console.error('Firestore save error:', err);
  });
}

// ════════════════════════════════════════
// RESET APP STATE ON LOGOUT
// Called from index.html auth listener when user signs out
// ════════════════════════════════════════
function resetAppState() {
  _currentUid = null;
  var d = getDefaultUserData();
  settings       = d.settings;
  workouts       = d.workouts;
  weedLogs       = d.weedLogs;
  mealLogs       = d.mealLogs;
  waterLogs      = d.waterLogs;
  sleepLogs      = d.sleepLogs;
  weightLog      = d.weightLog;
  checkItems     = d.checkItems;
  dailyChecks    = d.dailyChecks;
  ctrlCategories = d.ctrlCategories;
  ctrlLogs       = d.ctrlLogs;
  journalEntries = d.journalEntries;
  mantraText     = d.mantraText;
}

// ════════════════════════════════════════
// LEGACY localStorage HELPER
// Kept as no-op shim so nothing breaks if called internally.
// Firestore is now the source of truth.
// ════════════════════════════════════════
var S = {
  load: function(k) { return null; },
  save: function(k, v) { /* no-op — Firestore handles persistence */ }
};

// ════════════════════════════════════════
// STATE — initialized to defaults; overwritten by loadUserData()
// ════════════════════════════════════════
var _d = getDefaultUserData();
var settings       = _d.settings;
var workouts       = _d.workouts;
var weedLogs       = _d.weedLogs;
var mealLogs       = _d.mealLogs;
var waterLogs      = _d.waterLogs;
var sleepLogs      = _d.sleepLogs;
var weightLog      = _d.weightLog;
var checkItems     = _d.checkItems;
var dailyChecks    = _d.dailyChecks;
var ctrlCategories = _d.ctrlCategories;
var ctrlLogs       = _d.ctrlLogs;
var journalEntries = _d.journalEntries;
var mantraText     = _d.mantraText;

var calYear            = new Date().getFullYear();
var calMonth           = new Date().getMonth();
var dashRange          = 7;
var logFilter          = 'all';
var selectedMealQuality= 'Clean';
var selectedEnergyVal  = 3;
var keptWordVal        = 'yes';
var exerciseBlocks     = [];
var chartInstances     = {};

// EXERCISE LIBRARY
var EX_LIB = {
  Calisthenics: ['Pull-Ups','Chin-Ups','Neutral Grip Pull-Ups','Dips','Push-Ups','Diamond Push-Ups','Pike Push-Ups','Bodyweight Squats','Lunges','Step-Ups','Planks','Leg Raises','Mountain Climbers','Australian Rows','Hollow Body Hold'],
  Dumbbell:     ['Dumbbell Curls','Hammer Curls','Shoulder Press','Lateral Raises','Front Raises','Bent-Over Rows','Goblet Squats','Romanian Deadlifts','DB Lunges','Chest Press','Skull Crushers','Overhead Extensions','Arnold Press','Incline Curl','Concentration Curl','Farmers Carry','DB Shrug','Zottman Curl']
};

// ════════════════════════════════════════
// DATE HELPERS
// ════════════════════════════════════════
function today(){return new Date().toISOString().split('T')[0];}
function fmt(s){var d=new Date(s+'T00:00:00');return d.toLocaleDateString('en-US',{month:'short',day:'numeric'});}
function fmtTime(s){if(!s)return'';var p=s.split(':');var h=parseInt(p[0]);var m=p[1];return(h>12?h-12:h||12)+':'+m+(h>=12?'pm':'am');}
function monthDays(y,m){return new Date(y,m+1,0).getDate();}
function firstDOW(y,m){return new Date(y,m,1).getDay();}
function dateKey(y,m,d){return y+'-'+String(m+1).padStart(2,'0')+'-'+String(d).padStart(2,'0');}
function daysAgo(n){var d=new Date();d.setDate(d.getDate()-n);return d.toISOString().split('T')[0];}
function dateRange(n){var r=[];for(var i=n-1;i>=0;i--)r.push(daysAgo(i));return r;}
function dayName(s){var d=new Date(s+'T00:00:00');return d.toLocaleDateString('en-US',{weekday:'short'});}
function monthNames(){return['January','February','March','April','May','June','July','August','September','October','November','December'];}

// ════════════════════════════════════════
// NAVIGATION
// ════════════════════════════════════════
function navTo(page,btn){
  document.querySelectorAll('.page').forEach(function(p){p.classList.remove('active');});
  document.querySelectorAll('.nav-item').forEach(function(b){b.classList.remove('active');});
  document.getElementById('page-'+page).classList.add('active');
  btn.classList.add('active');
  if(page==='today')    renderToday();
  if(page==='log')      renderLog();
  if(page==='dashboard')renderDashboard();
  if(page==='calendar') renderCalendar();
  if(page==='control')  renderControl();
  if(page==='journal')  renderJournal();
  if(page==='settings') renderSettingsPage();
}

// ════════════════════════════════════════
// MODAL
// ════════════════════════════════════════
function openModal(id){
  var now=new Date();
  var t=String(now.getHours()).padStart(2,'0')+':'+String(now.getMinutes()).padStart(2,'0');
  ['weed-time','meal-time','w-start'].forEach(function(fid){var el=document.getElementById(fid);if(el&&!el.value)el.value=t;});
  var wd=document.getElementById('w-date');
  if(wd&&!wd.value)wd.value=today();
  if(id==='modal-workout'){exerciseBlocks=[];renderExBlocks();}
  document.getElementById(id).classList.add('open');
}
function closeModal(id){document.getElementById(id).classList.remove('open');}
document.querySelectorAll('.modal-overlay').forEach(function(o){
  o.addEventListener('click',function(e){if(e.target===o)o.classList.remove('open');});
});

// ════════════════════════════════════════
// SCORE
// ════════════════════════════════════════
function calcScore(date){
  var score=0;
  var dW=workouts.filter(function(x){return x.date===date;});
  var dWeed=weedLogs.filter(function(x){return x.date===date;});
  var dMeals=mealLogs.filter(function(x){return x.date===date;});
  var dSleep=(sleepLogs.find(function(x){return x.date===date;})||{}).hours||0;
  var checks=dailyChecks[date]||{};
  var checkedCount=Object.values(checks).filter(function(v){return v==='done';}).length;
  var checkScore=checkItems.length?Math.round((checkedCount/checkItems.length)*40):0;
  if(dW.length>0) score+=25;
  if(dWeed.length<=settings.weedTarget) score+=15;
  if(dMeals.length>=2) score+=10;
  if(dSleep>=settings.sleepTarget) score+=10;
  score+=checkScore;
  return Math.min(100,score);
}

function calcStreak(){
  var streak=0;
  var d=new Date();
  for(var i=0;i<365;i++){
    var ds=d.toISOString().split('T')[0];
    if(calcScore(ds)<60) break;
    streak++;
    d.setDate(d.getDate()-1);
  }
  return streak;
}

// ════════════════════════════════════════
// RENDER TODAY
// ════════════════════════════════════════
function renderToday(){
  var dt=today();
  var now=new Date();
  document.getElementById('top-date').textContent=now.toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric'}).toUpperCase();
  document.getElementById('top-streak').textContent=calcStreak();
  var score=calcScore(dt);
  var el=document.getElementById('hero-score');
  el.textContent=score;
  el.style.color=score>=80?'#2d9e6b':score>=60?'#fff':score>=40?'#ffb740':'#f87171';
  document.getElementById('hero-date').textContent=now.toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'});
  var dW=workouts.filter(function(x){return x.date===dt;});
  var dWeed=weedLogs.filter(function(x){return x.date===dt;});
  var dMeals=mealLogs.filter(function(x){return x.date===dt;});
  var dSleep=(sleepLogs.find(function(x){return x.date===dt;})||{}).hours;
  var sw=document.getElementById('stat-workout');
  sw.textContent=dW.length?'✓':'—';
  sw.style.color=dW.length?'#2d9e6b':'#c47e1a';
  var sweed=document.getElementById('stat-weed');
  sweed.textContent=dWeed.length;
  sweed.style.color=dWeed.length>settings.weedTarget?'#d94f4f':dWeed.length===0?'#2d9e6b':'#c47e1a';
  document.getElementById('stat-meals').textContent=dMeals.length||'—';
  document.getElementById('stat-sleep').textContent=dSleep?dSleep+'h':'—';
  renderChecklist(dt);
  var built=[],took=[];
  if(dW.length) built.push('Trained today');
  if(dMeals.some(function(m){return m.quality==='Clean';})) built.push('Ate clean');
  if(dWeed.length<=settings.weedTarget) built.push('Weed in control');
  if(dSleep>=settings.sleepTarget) built.push('Slept enough');
  if(dWeed.length>settings.weedTarget) took.push('Over weed target');
  if(!dW.length) took.push('Skipped training');
  if(dSleep&&dSleep<settings.sleepTarget) took.push('Low sleep');
  if(!dMeals.length) took.push('No meals logged');
  document.getElementById('bmt-built').innerHTML=built.map(function(b){return '<div>✓ '+b+'</div>';}).join('')||'<div style="color:var(--gray-4)">Nothing yet</div>';
  document.getElementById('bmt-took').innerHTML=took.map(function(t){return '<div>✗ '+t+'</div>';}).join('')||'<div style="color:var(--gray-4)">Nothing yet</div>';
}

function renderChecklist(date){
  var checks=dailyChecks[date]||{};
  var el=document.getElementById('daily-checklist');
  if(!el) return;
  el.innerHTML=checkItems.map(function(item){
    var state=checks[item.id]||null;
    var cls=state==='done'?'done':state==='slipped'?'slipped':'';
    var icon=state==='done'?'✓':state==='slipped'?'⚠':'';
    var status=state==='done'?'Done':state==='slipped'?'Aware':'';
    return '<div class="check-row '+cls+'" onclick="cycleCheck(\''+date+'\','+item.id+')">'
      +'<div class="check-box">'+icon+'</div>'
      +'<div class="check-label">'+item.label+'</div>'
      +'<div class="check-status">'+status+'</div>'
      +'</div>';
  }).join('');
}

function cycleCheck(date,itemId){
  if(!dailyChecks[date]) dailyChecks[date]={};
  var cur=dailyChecks[date][itemId]||null;
  var next=cur===null?'done':cur==='done'?'slipped':null;
  if(next===null) delete dailyChecks[date][itemId];
  else dailyChecks[date][itemId]=next;
  saveUserData();
  renderChecklist(date);
  document.getElementById('hero-score').textContent=calcScore(date);
}

// ════════════════════════════════════════
// RENDER LOG
// ════════════════════════════════════════
function filterLog(type,btn){
  logFilter=type;
  document.querySelectorAll('#page-log .pill').forEach(function(p){p.style.fontWeight='500';});
  btn.style.fontWeight='700';
  renderLog();
}

function renderLog(){
  var el=document.getElementById('log-content');
  if(!el) return;
  var entries=[];
  if(logFilter==='all'||logFilter==='workout'){
    workouts.forEach(function(w){
      var exSummary=w.exercises&&w.exercises.length?w.exercises.map(function(e){return e.name;}).join(', '):'';
      entries.push({type:'workout',date:w.date,time:w.startTime,title:w.type,meta:(w.duration||'?')+' min'+(w.energyBefore?' · Energy '+w.energyBefore+'/5':''),extra:exSummary,icon:'💪',bg:'#edf7f2',id:w.id,quality:''});
    });
  }
  if(logFilter==='all'||logFilter==='weed'){
    weedLogs.forEach(function(w){
      entries.push({type:'weed',date:w.date,time:w.time,title:w.method,meta:w.trigger+' · '+(w.amount||'?')+'g',extra:'',icon:'🌿',bg:'#f5f0ff',id:w.id,quality:''});
    });
  }
  if(logFilter==='all'||logFilter==='meal'){
    mealLogs.forEach(function(m){
      entries.push({type:'meal',date:m.date,time:m.time,title:m.name||'Meal',meta:m.quality,extra:'',icon:'🍽',bg:m.quality==='Clean'?'#edf7f2':m.quality==='Poor'?'#fdf0f0':'#fdf5e6',id:m.id,quality:m.quality});
    });
  }
  entries.sort(function(a,b){var dd=b.date.localeCompare(a.date);if(dd!==0)return dd;return(b.time||'').localeCompare(a.time||'');});
  if(!entries.length){el.innerHTML='<div style="text-align:center;padding:40px 20px;color:var(--gray-5)">Nothing logged yet.<br>Use Quick Log on Today tab.</div>';return;}
  var html='',lastDate='';
  entries.forEach(function(e){
    if(e.date!==lastDate){html+='<div class="log-date-header">'+fmt(e.date)+'</div>';lastDate=e.date;}
    var qualPill='';
    if(e.type==='meal'){var cls=e.quality==='Clean'?'pill-green':e.quality==='Poor'?'pill-red':'pill-amber';qualPill=' <span class="pill '+cls+'" style="font-size:10px">'+e.quality+'</span>';}
    html+='<div class="log-item">'
      +'<div class="log-icon-wrap" style="background:'+e.bg+'">'+e.icon+'</div>'
      +'<div class="log-item-body">'
        +'<div class="log-item-title">'+e.title+qualPill+'</div>'
        +'<div class="log-item-meta">'+e.meta+'</div>'
        +(e.extra?'<div class="log-item-exercises">'+e.extra+'</div>':'')
      +'</div>'
      +'<div style="display:flex;flex-direction:column;align-items:flex-end;gap:4px;flex-shrink:0">'
        +'<div class="log-item-time">'+(fmtTime(e.time)||'—')+'</div>'
        +'<button onclick="deleteLogEntry(\''+e.type+'\',\''+e.id+'\')" style="background:none;border:none;cursor:pointer;font-size:18px;color:var(--gray-4);padding:0;line-height:1">×</button>'
      +'</div>'
      +'</div>';
  });
  el.innerHTML=html;
}

function deleteLogEntry(type,id){
  if(!confirm('Delete this entry?')) return;
  if(type==='workout') workouts   =workouts.filter(function(x){return x.id!==id;});
  if(type==='weed')    weedLogs   =weedLogs.filter(function(x){return x.id!==id;});
  if(type==='meal')    mealLogs   =mealLogs.filter(function(x){return x.id!==id;});
  saveUserData();
  renderLog();renderToday();
}

// ════════════════════════════════════════
// EXERCISE BUILDER
// ════════════════════════════════════════
function addExBlock(){
  exerciseBlocks.push({id:Date.now(),name:'',cat:'Calisthenics',sets:[{reps:'',weight:'',rest:'',rpe:''}]});
  renderExBlocks();
}

function renderExBlocks(){
  var el=document.getElementById('ex-blocks');
  if(!el) return;
  if(!exerciseBlocks.length){el.innerHTML='<div style="text-align:center;padding:16px;color:var(--gray-4);font-size:13px">No exercises added yet</div>';return;}
  var html='';
  exerciseBlocks.forEach(function(block,bi){
    var opts='';
    Object.entries(EX_LIB).forEach(function(kv){
      opts+='<optgroup label="'+kv[0]+'">';
      kv[1].forEach(function(n){opts+='<option'+(block.name===n?' selected':'')+'>'+n+'</option>';});
      opts+='</optgroup>';
    });
    html+='<div class="ex-block">'
      +'<div class="ex-block-head">'
        +'<select class="form-select" style="flex:1;font-size:13px;padding:7px 10px" onchange="updateExName('+bi+',this.value)"><option value="">— Select exercise —</option>'+opts+'</select>'
        +'<button onclick="removeExBlock('+bi+')" style="background:none;border:none;cursor:pointer;font-size:18px;color:var(--gray-4);margin-left:8px;padding:0">×</button>'
      +'</div>'
      +'<div class="set-grid" style="margin-bottom:4px">'
        +'<div></div>'
        +'<div class="set-col-label">REPS</div>'
        +'<div class="set-col-label">WEIGHT</div>'
        +'<div class="set-col-label">REST(s)</div>'
        +'<div class="set-col-label">RPE</div>'
        +'<div></div>'
      +'</div>';
    block.sets.forEach(function(set,si){
      html+='<div class="set-grid">'
        +'<div class="set-num">'+(si+1)+'</div>'
        +'<input class="set-input" type="number" placeholder="10" min="0" value="'+set.reps+'" onchange="updateSet('+bi+','+si+',\'reps\',this.value)">'
        +'<input class="set-input" type="number" placeholder="BW" min="0" value="'+set.weight+'" onchange="updateSet('+bi+','+si+',\'weight\',this.value)">'
        +'<input class="set-input" type="number" placeholder="60" min="0" value="'+set.rest+'" onchange="updateSet('+bi+','+si+',\'rest\',this.value)">'
        +'<input class="set-input" type="number" placeholder="7" min="1" max="10" value="'+set.rpe+'" onchange="updateSet('+bi+','+si+',\'rpe\',this.value)">'
        +'<button class="set-del" onclick="removeSet('+bi+','+si+')">×</button>'
        +'</div>';
    });
    html+='<button class="btn btn-outline btn-xs" style="margin-top:6px;font-size:11px" onclick="addSet('+bi+')">+ Set</button>'
      +'</div>';
  });
  el.innerHTML=html;
}

function updateExName(bi,name){exerciseBlocks[bi].name=name;exerciseBlocks[bi].cat=Object.entries(EX_LIB).find(function(kv){return kv[1].includes(name);})?.[0]||'Custom';}
function updateSet(bi,si,field,val){exerciseBlocks[bi].sets[si][field]=field==='reps'||field==='rest'||field==='rpe'?parseInt(val)||0:parseFloat(val)||0;}
function addSet(bi){exerciseBlocks[bi].sets.push({reps:'',weight:'',rest:'',rpe:''});renderExBlocks();}
function removeSet(bi,si){if(exerciseBlocks[bi].sets.length>1){exerciseBlocks[bi].sets.splice(si,1);renderExBlocks();}}
function removeExBlock(bi){exerciseBlocks.splice(bi,1);renderExBlocks();}

// ════════════════════════════════════════
// DASHBOARD
// ════════════════════════════════════════
function setDashRange(n,btn){
  dashRange=n;
  document.querySelectorAll('.dash-filter-btn').forEach(function(b){b.classList.remove('active');});
  btn.classList.add('active');
  renderDashboard();
}

function destroyChart(id){if(chartInstances[id]){chartInstances[id].destroy();delete chartInstances[id];}}

function mkChart(id,type,labels,datasets,opts){
  destroyChart(id);
  var ctx=document.getElementById(id);
  if(!ctx) return;
  var base={responsive:true,maintainAspectRatio:false,animation:{duration:500},plugins:{legend:{display:false},tooltip:{backgroundColor:'#1a1a1a',titleColor:'#a8a8b3',bodyColor:'#f0f0f2',padding:10,titleFont:{size:10},bodyFont:{size:12}}},scales:{x:{grid:{color:'rgba(0,0,0,0.04)'},ticks:{color:'#8a8a82',font:{size:10},maxRotation:0},border:{display:false}},y:{grid:{color:'rgba(0,0,0,0.04)'},ticks:{color:'#8a8a82',font:{size:10}},border:{display:false}}}};
  if(type==='doughnut'){base={responsive:true,maintainAspectRatio:false,cutout:'65%',plugins:{legend:{display:true,position:'right',labels:{font:{size:11},color:'#555550',padding:8}}},animation:{duration:500}};}
  var finalOpts=Object.assign({},base,opts||{});
  chartInstances[id]=new Chart(ctx,{type:type,data:{labels:labels,datasets:datasets},options:finalOpts});
}

function renderDashboard(){
  var dates=dateRange(dashRange);
  var scores=dates.map(function(d){return calcScore(d);});
  var avgScore=scores.length?Math.round(scores.reduce(function(a,b){return a+b;},0)/scores.length):0;
  var consistencyDays=scores.filter(function(s){return s>=60;}).length;
  var consistencyRate=scores.length?Math.round(consistencyDays/scores.length*100):0;
  var periodWorkouts=workouts.filter(function(w){return w.date>=dates[0]&&w.date<=dates[dates.length-1];});
  var periodWeed=weedLogs.filter(function(w){return w.date>=dates[0]&&w.date<=dates[dates.length-1];});
  var periodSleep=sleepLogs.filter(function(s){return s.date>=dates[0]&&s.date<=dates[dates.length-1];});
  var avgWeed=periodWeed.length?(periodWeed.length/dashRange).toFixed(1):0;
  var avgSleep=periodSleep.length?(periodSleep.reduce(function(t,s){return t+s.hours;},0)/periodSleep.length).toFixed(1):0;
  var bwSorted=weightLog.slice().sort(function(a,b){return a.date.localeCompare(b.date);});
  var currBW=bwSorted.length?bwSorted[bwSorted.length-1].weight:null;
  var bwChange=currBW&&settings.startWeight?(currBW-settings.startWeight).toFixed(1):null;

  var el=function(id){return document.getElementById(id);};
  el('kpi-avg-score').textContent=avgScore;
  el('kpi-avg-score-sub').textContent='over '+dashRange+' days';
  el('kpi-consistency').textContent=consistencyRate+'%';
  el('kpi-consistency-sub').textContent=consistencyDays+' of '+dashRange+' days';
  el('kpi-workouts').textContent=periodWorkouts.length;
  el('kpi-workouts-sub').textContent='avg '+(periodWorkouts.length?Math.round(periodWorkouts.reduce(function(t,w){return t+(w.duration||0);},0)/periodWorkouts.length):0)+' min';
  el('kpi-weed-avg').textContent=avgWeed;
  el('kpi-weed-sub').textContent=periodWeed.length+' total sessions';
  el('kpi-bw-current').textContent=currBW?currBW+' lbs':'—';
  el('kpi-bw-change').textContent=bwChange?(parseFloat(bwChange)>0?'+':'')+bwChange+' lbs since start':'—';
  el('kpi-sleep-avg').textContent=avgSleep?avgSleep+'h':'—';
  el('disc-chart-title').textContent='Last '+dashRange+' Days';

  var dlabels=dates.map(function(d){return dashRange<=14?dayName(d):fmt(d);});
  mkChart('chart-discipline','line',dlabels,[{
    data:scores,borderColor:'#1a1a1a',backgroundColor:'rgba(26,26,26,0.07)',
    borderWidth:2,pointRadius:3,pointBackgroundColor:scores.map(function(s){return s>=70?'#2d9e6b':s>=50?'#c47e1a':'#d94f4f';}),
    pointBorderColor:'#fff',pointBorderWidth:1.5,tension:0.4,fill:true
  }],{scales:{y:{min:0,max:100}}});

  var wlabels=dates.map(function(d){return dashRange<=14?dayName(d):fmt(d);});
  var wdata=dates.map(function(d){var dw=workouts.filter(function(w){return w.date===d;});return dw.length?dw[0].duration||45:0;});
  mkChart('chart-workouts','bar',wlabels,[{
    data:wdata,backgroundColor:wdata.map(function(v){return v>0?'rgba(45,158,107,0.7)':'rgba(224,224,219,0.5)';}),
    borderRadius:4,borderSkipped:false
  }]);

  var weedData=dates.map(function(d){return weedLogs.filter(function(w){return w.date===d;}).length;});
  var sleepData=dates.map(function(d){var s=sleepLogs.find(function(x){return x.date===d;});return s?s.hours:0;});
  mkChart('chart-weed-sleep','line',dlabels,[
    {label:'Weed',data:weedData,borderColor:'#7c3aed',backgroundColor:'rgba(124,58,237,0.08)',borderWidth:2,tension:0.4,fill:true,pointRadius:3,yAxisID:'y'},
    {label:'Sleep',data:sleepData,borderColor:'#2563eb',backgroundColor:'transparent',borderWidth:2,tension:0.4,borderDash:[4,3],pointRadius:2,yAxisID:'y2'}
  ],{plugins:{legend:{display:true,labels:{font:{size:10},color:'#555550',padding:12}}},scales:{y:{position:'left',grid:{color:'rgba(0,0,0,0.04)'},ticks:{color:'#8a8a82',font:{size:9}},border:{display:false}},y2:{position:'right',grid:{drawOnChartArea:false},ticks:{color:'#2563eb',font:{size:9}},border:{display:false}}}});

  var bwDates=bwSorted.slice(-12);
  if(bwDates.length>0){
    mkChart('chart-bodyweight','line',bwDates.map(function(b){return fmt(b.date);}),[{
      data:bwDates.map(function(b){return b.weight;}),borderColor:'#c47e1a',backgroundColor:'rgba(196,126,26,0.08)',
      borderWidth:2,pointRadius:5,pointBackgroundColor:'#c47e1a',pointBorderColor:'#fff',pointBorderWidth:2,tension:0.3,fill:true
    }]);
    var startBW=settings.startWeight||bwDates[0].weight;
    var netChange=(currBW-startBW).toFixed(1);
    var weeklyAvg=bwDates.length>1?((bwDates[bwDates.length-1].weight-bwDates[0].weight)/Math.max(1,(bwDates.length-1))).toFixed(2):0;
    el('bw-stats-row').innerHTML='<div style="display:flex;gap:16px;flex-wrap:wrap">'
      +'<div><div style="font-size:10px;color:var(--gray-5);font-weight:700;letter-spacing:0.08em">CURRENT</div><div style="font-size:16px;font-weight:800;color:var(--ink)">'+currBW+' lbs</div></div>'
      +'<div><div style="font-size:10px;color:var(--gray-5);font-weight:700;letter-spacing:0.08em">NET CHANGE</div><div style="font-size:16px;font-weight:800;color:'+(parseFloat(netChange)>=0?'var(--green)':'var(--red)')+'">'+( parseFloat(netChange)>0?'+':'')+netChange+' lbs</div></div>'
      +'<div><div style="font-size:10px;color:var(--gray-5);font-weight:700;letter-spacing:0.08em">AVG/ENTRY</div><div style="font-size:16px;font-weight:800;color:var(--amber)">'+(parseFloat(weeklyAvg)>0?'+':'')+weeklyAvg+' lbs</div></div>'
      +'</div>';
    el('bw-chart-sub').textContent=bwDates.length+' weigh-ins logged';
  } else {
    el('bw-stats-row').innerHTML='<div style="color:var(--gray-4);font-size:13px;text-align:center;padding:10px 0">Log your weight to see trend</div>';
  }

  var periodMeals=mealLogs.filter(function(m){return m.date>=dates[0]&&m.date<=dates[dates.length-1];});
  var cleanN=periodMeals.filter(function(m){return m.quality==='Clean';}).length;
  var decentN=periodMeals.filter(function(m){return m.quality==='Decent';}).length;
  var poorN=periodMeals.filter(function(m){return m.quality==='Poor';}).length;
  mkChart('chart-meals','doughnut',['Clean','Decent','Poor'],[{
    data:[cleanN||0,decentN||0,poorN||0],
    backgroundColor:['#2d9e6b','#c47e1a','#d94f4f'],
    borderWidth:0,hoverOffset:4
  }]);

  renderInsights(dates,scores,periodWorkouts,periodWeed,periodSleep,periodMeals);
  renderMovementOverview(periodWorkouts);
}

function renderInsights(dates,scores,periodWorkouts,periodWeed,periodSleep,periodMeals){
  var el=document.getElementById('insight-cards');
  if(!el) return;
  var insights=[];

  var highSleepDays=dates.filter(function(d){var s=sleepLogs.find(function(x){return x.date===d;});return s&&s.hours>=settings.sleepTarget;});
  var lowSleepDays=dates.filter(function(d){var s=sleepLogs.find(function(x){return x.date===d;});return s&&s.hours<settings.sleepTarget;});
  if(highSleepDays.length>2&&lowSleepDays.length>2){
    var avgHigh=Math.round(highSleepDays.reduce(function(t,d){return t+calcScore(d);},0)/highSleepDays.length);
    var avgLow=Math.round(lowSleepDays.reduce(function(t,d){return t+calcScore(d);},0)/lowSleepDays.length);
    var diff=avgHigh-avgLow;
    if(Math.abs(diff)>=3){
      insights.push({type:diff>0?'pos':'neg',label:'SLEEP → PERFORMANCE',text:'Your average score is '+Math.abs(diff)+' points '+(diff>0?'higher':'lower')+' on nights you get '+settings.sleepTarget+'+ hours of sleep.',stat:'High sleep: '+avgHigh+' · Low sleep: '+avgLow+' (avg score)'});
    }
  }

  var weedDays=dates.filter(function(d){return weedLogs.filter(function(x){return x.date===d;}).length>settings.weedTarget;});
  var cleanDays=dates.filter(function(d){return weedLogs.filter(function(x){return x.date===d;}).length<=settings.weedTarget;});
  if(weedDays.length>1&&cleanDays.length>2){
    var trainedWeedDays=weedDays.filter(function(d){return workouts.some(function(w){return w.date===d;});}).length;
    var trainedCleanDays=cleanDays.filter(function(d){return workouts.some(function(w){return w.date===d;});}).length;
    var weedTrainRate=Math.round(trainedWeedDays/weedDays.length*100);
    var cleanTrainRate=Math.round(trainedCleanDays/cleanDays.length*100);
    var diff2=cleanTrainRate-weedTrainRate;
    if(Math.abs(diff2)>=10){
      insights.push({type:diff2>0?'neg':'info',label:'WEED USE → TRAINING',text:'You train '+diff2+'% more often on days within your weed target vs over-target days.',stat:'Within target: '+cleanTrainRate+'% trained · Over target: '+weedTrainRate+'% trained'});
    }
  }

  var meal2plusDays=dates.filter(function(d){return mealLogs.filter(function(x){return x.date===d;}).length>=2;});
  var meal1Days=dates.filter(function(d){return mealLogs.filter(function(x){return x.date===d;}).length<2;});
  if(meal2plusDays.length>2&&meal1Days.length>2){
    var avg2plus=Math.round(meal2plusDays.reduce(function(t,d){return t+calcScore(d);},0)/meal2plusDays.length);
    var avg1=Math.round(meal1Days.reduce(function(t,d){return t+calcScore(d);},0)/meal1Days.length);
    var diff3=avg2plus-avg1;
    if(Math.abs(diff3)>=5){
      insights.push({type:diff3>0?'pos':'neg',label:'MEALS LOGGED → DISCIPLINE',text:'Days with 2+ meals logged average '+(diff3>0?diff3+' points higher':Math.abs(diff3)+' points lower')+' discipline score.',stat:'2+ meals: '+avg2plus+' avg · Under 2 meals: '+avg1+' avg'});
    }
  }

  var weedByHour={Morning:0,Afternoon:0,Evening:0,Night:0};
  weedLogs.forEach(function(w){
    if(!w.time) return;
    var h=parseInt(w.time.split(':')[0]);
    if(h<12) weedByHour.Morning++;
    else if(h<17) weedByHour.Afternoon++;
    else if(h<21) weedByHour.Evening++;
    else weedByHour.Night++;
  });
  var peakTime=Object.entries(weedByHour).sort(function(a,b){return b[1]-a[1];})[0];
  if(peakTime&&peakTime[1]>0){
    insights.push({type:'neu',label:'WEED TIMING PATTERN',text:'Most of your weed sessions happen in the '+peakTime[0].toLowerCase()+'. This is your highest-risk window.',stat:peakTime[1]+' sessions in '+peakTime[0].toLowerCase()+' across all logged data'});
  }

  var dowCount={0:0,1:0,2:0,3:0,4:0,5:0,6:0};
  workouts.forEach(function(w){
    var d=new Date(w.date+'T00:00:00').getDay();
    dowCount[d]=(dowCount[d]||0)+1;
  });
  var dowNames=['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  var bestDOW=Object.entries(dowCount).sort(function(a,b){return b[1]-a[1];});
  if(bestDOW.length>0&&parseInt(bestDOW[0][1])>0){
    insights.push({type:'info',label:'STRONGEST TRAINING DAY',text:dowNames[parseInt(bestDOW[0][0])]+' is your most consistent training day. Build your week structure around it.',stat:bestDOW[0][1]+' workouts logged on '+dowNames[parseInt(bestDOW[0][0])]+'s'});
  }

  var loggedDays=dates.filter(function(d){return mealLogs.some(function(m){return m.date===d;})||workouts.some(function(w){return w.date===d;});});
  var unloggedDays=dates.filter(function(d){return !mealLogs.some(function(m){return m.date===d;})&&!workouts.some(function(w){return w.date===d;});});
  if(loggedDays.length>2&&unloggedDays.length>1){
    var loggedAvg=Math.round(loggedDays.reduce(function(t,d){return t+calcScore(d);},0)/loggedDays.length);
    var unloggedAvg=Math.round(unloggedDays.reduce(function(t,d){return t+calcScore(d);},0)/unloggedDays.length);
    if(loggedAvg>unloggedAvg+5){
      insights.push({type:'pos',label:'LOGGING = HIGHER SCORES',text:'Days you log anything score an average of '+(loggedAvg-unloggedAvg)+' points higher. Tracking is not just recording — it is discipline.',stat:'Logged days avg: '+loggedAvg+' · Unlogged days avg: '+unloggedAvg});
    }
  }

  if(!insights.length){
    el.innerHTML='<div style="text-align:center;padding:20px;color:var(--gray-4);font-size:13px">Log more data to unlock correlation insights.</div>';
    return;
  }
  el.innerHTML=insights.map(function(ins){
    return '<div class="insight-card '+ins.type+'">'
      +'<div class="insight-label">'+ins.label+'</div>'
      +'<div class="insight-text">'+ins.text+'</div>'
      +'<div class="insight-stat">'+ins.stat+'</div>'
      +'</div>';
  }).join('');
}

function renderMovementOverview(periodWorkouts){
  var el=document.getElementById('movement-overview');
  if(!el) return;
  var exMap={};
  periodWorkouts.forEach(function(w){
    if(!w.exercises) return;
    w.exercises.forEach(function(ex){
      if(!ex.name) return;
      if(!exMap[ex.name]) exMap[ex.name]={name:ex.name,sessions:0,bestReps:0,totalSets:0};
      exMap[ex.name].sessions++;
      ex.sets&&ex.sets.forEach(function(s){
        exMap[ex.name].totalSets++;
        if((s.reps||0)>exMap[ex.name].bestReps) exMap[ex.name].bestReps=s.reps||0;
      });
    });
  });
  var movements=Object.values(exMap).sort(function(a,b){return b.sessions-a.sessions;});
  if(!movements.length){el.innerHTML='<div style="color:var(--gray-4);font-size:13px;text-align:center;padding:10px">Add exercises to workouts to see movement data</div>';return;}
  el.innerHTML=movements.slice(0,8).map(function(m){
    return '<div style="display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid var(--gray-2)">'
      +'<div style="flex:1;font-size:13px;font-weight:600;color:var(--ink)">'+m.name+'</div>'
      +'<div style="text-align:right"><div style="font-size:14px;font-weight:700;color:var(--green)">'+m.bestReps+'</div><div style="font-size:10px;color:var(--gray-5)">Best reps</div></div>'
      +'<div style="text-align:right"><div style="font-size:14px;font-weight:700;color:var(--ink)">'+m.sessions+'x</div><div style="font-size:10px;color:var(--gray-5)">Sessions</div></div>'
      +'</div>';
  }).join('');
}

// ════════════════════════════════════════
// RENDER CALENDAR
// ════════════════════════════════════════
function renderCalendar(){
  var days=['Su','Mo','Tu','We','Th','Fr','Sa'];
  var el=document.getElementById('cal-grid');
  if(!el) return;
  var now=new Date();
  var todayStr=today();
  var numDays=monthDays(calYear,calMonth);
  var startDow=firstDOW(calYear,calMonth);
  document.getElementById('cal-month-label').textContent=monthNames()[calMonth]+' '+calYear;
  document.getElementById('ctrl-month').textContent=monthNames()[calMonth]+' '+calYear;
  var html=days.map(function(d){return '<div class="cal-day-label">'+d+'</div>';}).join('');
  for(var i=0;i<startDow;i++) html+='<div class="cal-day empty"></div>';
  var hitDays=0,totalPast=0;
  for(var d=1;d<=numDays;d++){
    var dk=dateKey(calYear,calMonth,d);
    var isFuture=dk>todayStr;
    var isToday=dk===todayStr;
    var cls='';
    if(isToday) cls='today';
    else if(isFuture) cls='future';
    else{
      totalPast++;
      var sc=calcScore(dk);
      if(sc>=70){cls='win';hitDays++;}
      else if(sc>=40){cls='partial';hitDays+=0.5;}
      else cls='loss';
    }
    html+='<button class="cal-day '+cls+'" onclick="calDayClick(\''+dk+'\')">'+d+'</button>';
  }
  el.innerHTML=html;
  document.getElementById('cal-hit-days').textContent=Math.round(hitDays);
  document.getElementById('cal-total-days').textContent=numDays;
  var pct=totalPast?Math.round(hitDays/totalPast*100):0;
  document.getElementById('cal-progress-bar').style.width=pct+'%';
  var monthPfx=calYear+'-'+String(calMonth+1).padStart(2,'0');
  var mw=workouts.filter(function(w){return w.date.startsWith(monthPfx);});
  var gwTarget=Math.round(settings.workoutWeekTarget*4.3);
  document.getElementById('goal-workouts').textContent=mw.length;
  document.getElementById('gn-workouts').textContent=mw.length;
  document.getElementById('gn-workouts-target').textContent=gwTarget;
  document.getElementById('gn-workouts-left').textContent=Math.max(0,gwTarget-mw.length);
  document.getElementById('bar-workouts').style.width=Math.min(100,mw.length/gwTarget*100)+'%';
  document.getElementById('gn-weed-target-label').textContent=settings.weedTarget;
  var weedOk=0,weedOver=0;
  for(var dd=1;dd<=Math.min(numDays,now.getDate());dd++){
    var ddk=dateKey(calYear,calMonth,dd);
    var cnt=weedLogs.filter(function(x){return x.date===ddk;}).length;
    if(cnt<=settings.weedTarget) weedOk++; else weedOver++;
  }
  document.getElementById('goal-weed-ctrl').textContent=weedOk+'/'+totalPast;
  document.getElementById('gn-weed-ok').textContent=weedOk;
  document.getElementById('gn-weed-over').textContent=weedOver;
  document.getElementById('bar-weed').style.width=(totalPast?Math.round(weedOk/totalPast*100):0)+'%';
  var ctrlStreak=0,ctrlWins=0,ctrlAware=0,ctrlLoss=0,ctrlTracking=true;
  for(var ddd=1;ddd<=Math.min(numDays,now.getDate());ddd++){
    var dddk=dateKey(calYear,calMonth,ddd);
    var dl=ctrlLogs[dddk]||{};
    var vals=Object.values(dl);
    var hasLoss=vals.includes('loss'),hasAware=vals.includes('aware'),allWin=vals.length>0&&!hasLoss&&!hasAware;
    if(allWin){ctrlWins++;if(ctrlTracking)ctrlStreak++;}
    else if(hasAware&&!hasLoss){ctrlAware++;if(ctrlTracking)ctrlStreak++;}
    else if(hasLoss){ctrlLoss++;ctrlTracking=false;}
  }
  document.getElementById('goal-control-streak').textContent=ctrlStreak+' days';
  document.getElementById('gn-ctrl-wins').textContent=ctrlWins;
  document.getElementById('gn-ctrl-aware').textContent=ctrlAware;
  document.getElementById('gn-ctrl-loss').textContent=ctrlLoss;
  var ct=ctrlWins+ctrlAware+ctrlLoss;
  document.getElementById('bar-control').style.width=(ct?Math.round((ctrlWins+ctrlAware)/ct*100):0)+'%';
}

function calNav(dir){calMonth+=dir;if(calMonth<0){calMonth=11;calYear--;}if(calMonth>11){calMonth=0;calYear++;}renderCalendar();}
function calDayClick(dk){
  var sc=calcScore(dk);
  var dw=workouts.filter(function(w){return w.date===dk;});
  var msg='Date: '+fmt(dk)+'\nScore: '+sc+'/100';
  if(dw.length) msg+='\nWorkout: '+dw.map(function(w){return w.type+' ('+w.duration+'min)';}).join(', ');
  alert(msg);
}

// ════════════════════════════════════════
// RENDER CONTROL
// ════════════════════════════════════════
function renderMantra(){var el=document.getElementById('mantra-display');if(el)el.textContent=mantraText;}
function editMantra(){var n=prompt('Edit your daily mantra:',mantraText);if(n!==null&&n.trim()){mantraText=n.trim();saveUserData();renderMantra();}}

function renderControl(){
  renderMantra();
  var now=new Date();
  var numDays=monthDays(calYear,calMonth);
  var todayStr=today();
  var activeCats=ctrlCategories.filter(function(c){return c.active;});
  var el=document.getElementById('control-categories');
  if(!el) return;
  var html='';
  activeCats.forEach(function(cat){
    var streak=0,tracking=true,dotHtml='';
    for(var d=1;d<=numDays;d++){
      var dk=dateKey(calYear,calMonth,d);
      var isFuture=dk>todayStr;
      var val=(ctrlLogs[dk]||{})[cat.id]||null;
      var cls='future',icon=d;
      if(!isFuture){
        if(val==='win'){cls='win';icon='✓';if(tracking)streak++;}
        else if(val==='loss'){cls='loss';icon='✗';tracking=false;}
        else if(val==='aware'){cls='aware';icon='⚠';if(tracking)streak++;}
        else{cls='';icon=d;}
      }
      dotHtml+='<button class="ctrl-dot '+cls+'" onclick="cycleCtrl(\''+dk+'\',\''+cat.id+'\')" title="Day '+d+'">'+icon+'</button>';
    }
    html+='<div class="control-category">'
      +'<div class="control-cat-header"><div class="control-cat-icon">'+cat.icon+'</div><div class="control-cat-name">'+cat.label+'</div><div class="control-cat-streak">🔥 '+streak+' days</div></div>'
      +'<div class="control-cat-body"><div class="control-dot-grid">'+dotHtml+'</div>'
      +'<div class="ctrl-legend">'
        +'<div class="ctrl-legend-item"><div class="ctrl-legend-dot" style="background:var(--green-bg);border:1.5px solid var(--green)"></div>✓ Kept</div>'
        +'<div class="ctrl-legend-item"><div class="ctrl-legend-dot" style="background:var(--amber-bg);border:1.5px solid var(--amber)"></div>⚠ Aware</div>'
        +'<div class="ctrl-legend-item"><div class="ctrl-legend-dot" style="background:var(--red-bg);border:1.5px solid var(--red)"></div>✗ Gave in</div>'
      +'</div></div></div>';
  });
  el.innerHTML=html;
  var tl=document.getElementById('ctrl-toggle-list');
  if(tl){
    tl.innerHTML=ctrlCategories.map(function(c,i){
      return '<div style="display:flex;align-items:center;justify-content:space-between;padding:10px 0;border-bottom:1px solid var(--gray-2);gap:8px">'
        +'<div style="display:flex;align-items:center;gap:8px;flex:1;min-width:0">'
          +'<input type="text" value="'+c.icon+'" onchange="updateCtrlCatIcon('+i+',this.value)" style="width:36px;text-align:center;font-size:18px;border:1px solid var(--gray-2);border-radius:6px;padding:2px 4px;background:transparent;cursor:pointer" title="Click to change emoji">'
          +'<input type="text" value="'+c.label+'" onchange="updateCtrlCatLabel('+i+',this.value)" style="flex:1;font-size:14px;font-weight:500;border:1px solid var(--gray-2);border-radius:6px;padding:4px 8px;background:transparent;color:var(--ink)" placeholder="Category name">'
        +'</div>'
        +'<div style="display:flex;align-items:center;gap:6px;flex-shrink:0">'
          +'<button onclick="toggleCtrlCat('+i+')" style="padding:5px 12px;border-radius:99px;border:none;font-weight:700;font-size:13px;cursor:pointer;background:'+(c.active?'var(--green)':'var(--gray-3)')+';color:'+(c.active?'#fff':'var(--gray-6)')+'">'+( c.active?'On':'Off')+'</button>'
          +'<button onclick="deleteCtrlCat('+i+')" style="background:none;border:none;cursor:pointer;font-size:18px;color:var(--gray-4);padding:0 2px;line-height:1" title="Delete">×</button>'
        +'</div>'
        +'</div>';
    }).join('')
    +'<div style="padding:14px 0 4px">'
      +'<div style="display:flex;gap:8px">'
        +'<input type="text" id="new-ctrl-cat-emoji" placeholder="🔒" style="width:48px;text-align:center;font-size:18px;border:1px solid var(--gray-2);border-radius:8px;padding:6px;background:transparent">'
        +'<input type="text" id="new-ctrl-cat-label" placeholder="New category name..." style="flex:1;font-size:14px;border:1px solid var(--gray-2);border-radius:8px;padding:6px 10px;background:transparent;color:var(--ink)">'
        +'<button onclick="addCtrlCat()" style="padding:6px 14px;border-radius:8px;border:none;background:var(--ink);color:#fff;font-weight:700;font-size:13px;cursor:pointer">Add</button>'
      +'</div>'
    +'</div>';
  }
}

function cycleCtrl(date,catId){
  if(!ctrlLogs[date]) ctrlLogs[date]={};
  var cur=ctrlLogs[date][catId]||null;
  var next=cur===null?'win':cur==='win'?'aware':cur==='aware'?'loss':null;
  if(next===null) delete ctrlLogs[date][catId];
  else ctrlLogs[date][catId]=next;
  saveUserData();
  renderControl();renderCalendar();
}

function toggleCtrlCat(i){ctrlCategories[i].active=!ctrlCategories[i].active;saveUserData();renderControl();}
function updateCtrlCatLabel(i,val){var v=val.trim();if(v)ctrlCategories[i].label=v;saveUserData();}
function updateCtrlCatIcon(i,val){var v=val.trim();if(v)ctrlCategories[i].icon=v;saveUserData();}
function deleteCtrlCat(i){if(!confirm('Delete "'+ctrlCategories[i].label+'"?'))return;ctrlCategories.splice(i,1);saveUserData();renderControl();}
function addCtrlCat(){var icon=document.getElementById('new-ctrl-cat-emoji').value.trim()||'⭐';var label=document.getElementById('new-ctrl-cat-label').value.trim();if(!label){toast('Enter a category name first');return;}var id='cat_'+Date.now();ctrlCategories.push({id:id,label:label,icon:icon,active:true});saveUserData();renderControl();}
function saveCtrlSettings(){saveUserData();closeModal('modal-ctrl-settings');renderControl();}

// ════════════════════════════════════════
// JOURNAL
// ════════════════════════════════════════
function selectKeptWord(v){
  keptWordVal=v;
  document.getElementById('kept-yes').className='quality-btn'+(v==='yes'?' sel-green':'');
  document.getElementById('kept-no').className='quality-btn'+(v==='no'?' sel-red':'');
}

function saveReflection(){
  var date=document.getElementById('reflect-date').value||today();
  var strong=document.getElementById('reflect-strong').value.trim();
  var slip=document.getElementById('reflect-slip').value.trim();
  var pattern=document.getElementById('reflect-pattern').value.trim();
  var next=document.getElementById('reflect-next').value.trim();
  if(!strong&&!slip){toast('Add at least one note first');return;}
  journalEntries.push({id:'j_'+Date.now(),date:date,strong:strong,slip:slip,pattern:pattern,next:next,keptWord:keptWordVal});
  saveUserData();
  document.getElementById('reflect-strong').value='';
  document.getElementById('reflect-slip').value='';
  document.getElementById('reflect-pattern').value='';
  document.getElementById('reflect-next').value='';
  keptWordVal='yes';
  document.getElementById('kept-yes').className='quality-btn sel-green';
  document.getElementById('kept-no').className='quality-btn';
  renderJournal();
  toast('Reflection saved ✓');
}

function deleteJournalEntry(id){
  if(!confirm('Delete this entry?')) return;
  journalEntries=journalEntries.filter(function(e){return e.id!==id;});
  saveUserData();
  renderJournal();
}

function renderJournal(){
  var el=document.getElementById('journal-entries-list');
  if(!el) return;
  var d=document.getElementById('reflect-date');
  if(d&&!d.value) d.value=today();
  if(!journalEntries.length){el.innerHTML='<div style="text-align:center;padding:30px 0;color:var(--gray-4);font-size:13px">No entries yet. Write your first review above.</div>';return;}
  var sorted=journalEntries.slice().sort(function(a,b){return b.date.localeCompare(a.date);});
  var html='';
  sorted.forEach(function(e){
    var keptColor=e.keptWord==='yes'?'var(--green)':'var(--red)';
    var keptText=e.keptWord==='yes'?'✓ Kept my word':'✗ Broke my word';
    html+='<div class="journal-entry-card" style="border-left:3px solid '+(e.keptWord==='yes'?'var(--green)':'var(--red)')+';">';
    html+='<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">';
    html+='<div style="font-size:12px;font-weight:700;color:var(--gray-5)">'+fmt(e.date)+'</div>';
    html+='<div style="display:flex;align-items:center;gap:8px"><span style="font-size:11px;font-weight:700;color:'+keptColor+'">'+keptText+'</span>';
    html+='<button onclick="deleteJournalEntry(\''+e.id+'\')" style="background:none;border:none;cursor:pointer;font-size:18px;color:var(--gray-4);padding:0">×</button></div></div>';
    if(e.strong) html+='<div style="margin-bottom:8px"><div style="font-size:10px;font-weight:700;letter-spacing:0.08em;color:var(--green);margin-bottom:3px">▲ STRONGEST</div><div style="font-size:13px;color:var(--ink-2)">'+e.strong+'</div></div>';
    if(e.slip)   html+='<div style="margin-bottom:8px"><div style="font-size:10px;font-weight:700;letter-spacing:0.08em;color:var(--red);margin-bottom:3px">▼ SLIPPED</div><div style="font-size:13px;color:var(--ink-2)">'+e.slip+'</div></div>';
    if(e.pattern)html+='<div style="margin-bottom:8px"><div style="font-size:10px;font-weight:700;letter-spacing:0.08em;color:var(--amber);margin-bottom:3px">◎ PATTERN</div><div style="font-size:13px;color:var(--ink-2)">'+e.pattern+'</div></div>';
    if(e.next)   html+='<div><div style="font-size:10px;font-weight:700;letter-spacing:0.08em;color:var(--blue);margin-bottom:3px">→ TIGHTEN</div><div style="font-size:13px;color:var(--ink-2)">'+e.next+'</div></div>';
    html+='</div>';
  });
  el.innerHTML=html;
}

// ════════════════════════════════════════
// SETTINGS
// ════════════════════════════════════════
function renderSettingsPage(){
  var el=document.getElementById('check-items-list');
  if(el){
    el.innerHTML=checkItems.map(function(item,i){
      return '<div style="display:flex;align-items:center;gap:8px;padding:8px 0;border-bottom:1px solid var(--gray-2)">'
        +'<div style="flex:1;font-size:14px;font-weight:500">'+item.label+'</div>'
        +'<button onclick="deleteCheckItem('+i+')" style="background:none;border:none;cursor:pointer;font-size:18px;color:var(--gray-4);padding:2px 4px">×</button>'
        +'</div>';
    }).join('');
  }
  var sw=document.getElementById('s-weed-target');
  var so=document.getElementById('s-workout-target');
  var sl=document.getElementById('s-sleep-target');
  var sst=document.getElementById('s-start-weight');
  if(sw) sw.value=settings.weedTarget;
  if(so) so.value=settings.workoutWeekTarget;
  if(sl) sl.value=settings.sleepTarget;
  if(sst) sst.value=settings.startWeight||162;
}

function addCheckItem(){
  var inp=document.getElementById('new-check-item');
  var label=inp?inp.value.trim():'';
  if(!label) return;
  checkItems.push({id:Date.now(),label:label,pts:10});
  saveUserData();
  inp.value='';
  renderSettingsPage();
  renderChecklist(today());
  toast('Item added ✓');
}

function deleteCheckItem(idx){
  if(!confirm('Remove "'+checkItems[idx].label+'"?')) return;
  checkItems.splice(idx,1);
  saveUserData();
  renderSettingsPage();
  renderChecklist(today());
}

function saveSettings(){
  settings.weedTarget=parseInt(document.getElementById('s-weed-target').value)||1;
  settings.workoutWeekTarget=parseInt(document.getElementById('s-workout-target').value)||5;
  settings.sleepTarget=parseFloat(document.getElementById('s-sleep-target').value)||7;
  settings.startWeight=parseFloat(document.getElementById('s-start-weight').value)||162;
  saveUserData();
  toast('Settings saved ✓');
}

function clearDemoData(){
  if(!confirm('Clear all logged data and start fresh? Settings and categories are kept.')) return;
  var savedSettings=Object.assign({},settings);
  var savedCats=JSON.parse(JSON.stringify(ctrlCategories));
  var savedChecks=JSON.parse(JSON.stringify(checkItems));
  settings=savedSettings;
  ctrlCategories=savedCats;
  checkItems=savedChecks;
  workouts=[];weedLogs=[];mealLogs=[];waterLogs=[];sleepLogs=[];weightLog=[];
  ctrlLogs={};dailyChecks={};journalEntries=[];
  saveUserData();
  toast('Cleared. Fresh start!');
  renderToday();
  renderSettingsPage();
}

// ════════════════════════════════════════
// FORM SAVES
// ════════════════════════════════════════
function selEnergy(v){
  selectedEnergyVal=v;
  document.querySelectorAll('[data-energy]').forEach(function(b){b.className='quality-btn';b.style.flex='1';});
  var btn=document.querySelector('[data-energy="'+v+'"]');
  if(btn){btn.className='quality-btn '+(v>=4?'sel-green':v<=2?'sel-red':'sel-amber');btn.style.flex='1';}
}

function selectQuality(q){
  selectedMealQuality=q;
  document.getElementById('qb-clean').className='quality-btn'+(q==='Clean'?' sel-green':'');
  document.getElementById('qb-decent').className='quality-btn'+(q==='Decent'?' sel-amber':'');
  document.getElementById('qb-poor').className='quality-btn'+(q==='Poor'?' sel-red':'');
}

function saveWorkout(){
  var dur=parseInt(document.getElementById('w-dur').value)||45;
  var t=document.getElementById('w-start').value||'';
  var type=document.getElementById('w-type').value;
  var notes=document.getElementById('w-notes').value;
  var date=document.getElementById('w-date').value||today();
  var cleanedExercises=exerciseBlocks.filter(function(b){return b.name;}).map(function(b){
    return {name:b.name,cat:b.cat,sets:b.sets.map(function(s){return {reps:parseInt(s.reps)||0,weight:parseFloat(s.weight)||0,rest:parseInt(s.rest)||60,rpe:parseInt(s.rpe)||7};})};
  });
  workouts.push({id:'w_'+Date.now(),date:date,type:type,startTime:t,duration:dur,energyBefore:selectedEnergyVal,notes:notes,exercises:cleanedExercises});
  saveUserData();
  closeModal('modal-workout');
  document.getElementById('w-notes').value='';
  toast('Workout logged ✓');
  renderToday();
}

function saveWeed(){
  weedLogs.push({id:'weed_'+Date.now(),date:today(),time:document.getElementById('weed-time').value,method:document.getElementById('weed-method').value,amount:parseFloat(document.getElementById('weed-amount').value)||0.5,trigger:document.getElementById('weed-trigger').value});
  saveUserData();
  closeModal('modal-weed');
  document.getElementById('weed-amount').value='';
  toast('Weed session logged ✓');
  renderToday();
}

function saveMeal(){
  mealLogs.push({id:'meal_'+Date.now(),date:today(),time:document.getElementById('meal-time').value,name:document.getElementById('meal-name').value||'Meal',quality:selectedMealQuality});
  saveUserData();
  closeModal('modal-meal');
  document.getElementById('meal-name').value='';
  toast('Meal logged ✓');
  renderToday();
}

function saveWater(){
  var g=parseInt(document.getElementById('water-glasses').value)||0;
  waterLogs=waterLogs.filter(function(x){return x.date!==today();});
  waterLogs.push({date:today(),glasses:g});
  saveUserData();
  closeModal('modal-water');
  document.getElementById('water-glasses').value='';
  toast('Water: '+g+' glasses ✓');
}

function saveSleep(){
  var h=parseFloat(document.getElementById('sleep-hours').value)||7;
  var q=document.getElementById('sleep-quality').value;
  sleepLogs=sleepLogs.filter(function(x){return x.date!==today();});
  sleepLogs.push({date:today(),hours:h,quality:q});
  saveUserData();
  closeModal('modal-sleep');
  document.getElementById('sleep-hours').value='';
  toast('Sleep: '+h+'hrs logged ✓');
  renderToday();
}

function saveWeight(){
  var w=parseFloat(document.getElementById('weight-val').value)||0;
  if(w){
    weightLog.push({date:today(),weight:w,notes:document.getElementById('weight-notes').value});
    saveUserData();
  }
  closeModal('modal-weight');
  document.getElementById('weight-val').value='';
  toast('Weight logged ✓');
}

// ════════════════════════════════════════
// TOAST
// ════════════════════════════════════════
function toast(msg){
  var t=document.getElementById('_toast');
  if(!t){t=document.createElement('div');t.id='_toast';t.style.cssText='position:fixed;bottom:90px;left:50%;transform:translateX(-50%);background:#1a1a1a;color:#fff;padding:10px 18px;border-radius:99px;font-size:13px;font-weight:600;z-index:9999;opacity:0;transition:opacity 0.2s;white-space:nowrap;max-width:90vw';document.body.appendChild(t);}
  t.textContent=msg;t.style.opacity='1';
  clearTimeout(t._t);t._t=setTimeout(function(){t.style.opacity='0';},2200);
}

// ════════════════════════════════════════
// INIT — intentionally empty.
// renderToday() and renderMantra() are called
// by the auth state listener in index.html
// AFTER Firestore data is loaded.
// ════════════════════════════════════════

// ════════════════════════════════════════
// AUTH CONTROLLER — runs after all app functions are defined
// ════════════════════════════════════════
function revealApp(user) {
  var loading    = document.getElementById('loading-screen');
  var authScreen = document.getElementById('auth-screen');
  var appWrapper = document.getElementById('app-wrapper');
  if (loading)    loading.style.display    = 'none';
  if (authScreen) authScreen.style.display = 'none';
  if (appWrapper) appWrapper.classList.add('visible');
  if (user) {
    var displayName = user.email.split('@')[0];
    var nameEl = document.getElementById('topbar-name');
    if (nameEl) nameEl.textContent = 'Hey, ' + displayName + ' \u{1F44B}';
    var emailEl = document.getElementById('settings-email-display');
    if (emailEl) emailEl.textContent = 'Signed in as ' + user.email;
  }
  if (typeof renderToday  === 'function') renderToday();
  if (typeof renderMantra === 'function') renderMantra();
}

firebase.auth().onAuthStateChanged(function(user) {
  if (window._sroTimeout) { clearTimeout(window._sroTimeout); window._sroTimeout = null; }
  var loading    = document.getElementById('loading-screen');
  var authScreen = document.getElementById('auth-screen');
  var appWrapper = document.getElementById('app-wrapper');

  if (user) {
    if (authScreen) authScreen.style.display = 'none';
    if (loading)    loading.style.display    = 'flex';

    var revealTimer = setTimeout(function() { revealApp(user); }, 4000);

    try {
      loadUserData(user.uid)
        .then(function()  { clearTimeout(revealTimer); revealApp(user); })
        .catch(function() { clearTimeout(revealTimer); revealApp(user); });
    } catch(e) {
      clearTimeout(revealTimer);
      revealApp(user);
    }
  } else {
    if (typeof resetAppState === 'function') resetAppState();
    if (appWrapper) appWrapper.classList.remove('visible');
    if (loading)    loading.style.display = 'none';
    if (authScreen) authScreen.style.display = 'flex';
    var btn = document.getElementById('auth-submit-btn');
    if (btn) { btn.disabled = false; btn.textContent = 'Log In'; }
    if (typeof setAuthMode === 'function') setAuthMode('login');
  }
});
