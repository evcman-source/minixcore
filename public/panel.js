(function(){
function closeModal(){ $('modal').classList.remove('open'); }


function badgeChip(txt,val){ return '<span class="chip" data-v="'+val+'">'+txt+'</span>'; }


function uniqueCoins(rigs){
var map={}, arr=[], i; for(i=0;i<rigs.length;i++){ var c=rigs[i].miner && rigs[i].miner.coin; if(c && !map[c]){ map[c]=1; arr.push(c); } }
return arr;
}


function makeChips(){
var html=[ badgeChip('Hepsi','all'), badgeChip('online','online'), badgeChip('stale','stale'), badgeChip('throttle','throttle'), badgeChip('offline','offline') ].join('');
html += '<span style="width:8px"></span>';
html += badgeChip('Tüm coinler','all');
var coins = uniqueCoins(RIGS), i; for(i=0;i<coins.length;i++){ html += badgeChip(coins[i], coins[i]); }
$('chips').innerHTML = html;


var chips=document.querySelectorAll('.chip');
for(i=0;i<chips.length;i++){
chips[i].addEventListener('click', function(){
var v=this.getAttribute('data-v');
if(v==='all'||v==='online'||v==='stale'||v==='throttle'||v==='offline') filterStatus=v;
else filterCoin=v;
var all=document.querySelectorAll('.chip');
for(var k=0;k<all.length;k++){ all[k].classList.remove('active'); }
this.classList.add('active');
applyFilters();
});
}
}


function applyFilters(){
var arr=RIGS.slice(0);
if(filterCoin!=='all') arr=arr.filter(function(r){ return (r.miner && r.miner.coin===filterCoin); });
if(filterStatus!=='all') arr=arr.filter(function(r){ return deriveRigMetrics(r).status===filterStatus; });
var q = ($('q').value||'').toLowerCase();
if(q) arr=arr.filter(function(r){ return String(r.rig_id).toLowerCase().indexOf(q)>-1 || String(r.name||'').toLowerCase().indexOf(q)>-1; });


if(sortKey){
arr.sort(function(a,b){
var am=deriveRigMetrics(a), bm=deriveRigMetrics(b);
var ka = (sortKey==='rig_id')? String(a.rig_id): (sortKey==='name'? String(a.name||''): null);
if(ka!=null){ return (ka.localeCompare(sortKey==='name'? String(b.name||''): String(b.rig_id))) * sortDir; }
var kv=0;
if(sortKey==='gpu') kv=(a.gpus.length)-(b.gpus.length);
else if(sortKey==='hash') kv=(am.totalMHs||0)-(bm.totalMHs||0);
else if(sortKey==='power') kv=(am.totalW||0)-(bm.totalW||0);
else if(sortKey==='eff') kv=(am.eff||0)-(bm.eff||0);
else if(sortKey==='seen') kv=(am.delta||0)-(bm.delta||0);
return kv*sortDir;
});
}
renderList(arr);
}


function updateOffline(){ $('offlineBanner').style.display = navigator.onLine? 'none':'block'; }


function loadAndRender(force){
fetchJSON(JSON_URL + (force? (JSON_URL.indexOf('?')>-1?'&':'?')+'cache='+Math.random() : ''), function(err, data){
if(err){ $('view').innerHTML='<div class="skeleton" style="height:180px"></div>'; return; }
RIGS = normalizeData(data);
makeChips();
applyFilters();
$('pulse').textContent='⟳ Son çekim: '+new Date().toLocaleTimeString();
updateOffline();
if(timer) clearTimeout(timer);
timer=setTimeout(function(){ loadAndRender(false); }, AUTO_REFRESH_MS);
});
}


function boot(){
on($('refreshBtn'),'click', function(e){ e.preventDefault(); loadAndRender(true); });
on($('q'),'input', applyFilters);
on($('closeModal'),'click', closeModal);
on($('modal'),'click', function(e){ if(e.target && e.target.id==='modal') closeModal(); });
window.addEventListener('online', updateOffline);
window.addEventListener('offline', updateOffline);
loadAndRender(false);
}


if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
