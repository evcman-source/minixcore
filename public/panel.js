(function(){
  var JSON_URL = "./rigs.json";
  var AUTO_REFRESH_MS = 10000;
  var timer = null;
  var RIGS = [];
  var sortKey = null, sortDir = 1;
  var filterStatus = 'all', filterCoin = 'all';

  function $(id){ return document.getElementById(id); }
  function on(el, ev, fn){ if(el) el.addEventListener(ev, fn); }

  function fetchJSON(url, cb){
    try{
      var x = new XMLHttpRequest();
      x.open("GET", url + (url.indexOf("?")>-1?"&":"?") + "ts=" + Date.now(), true);
      x.onreadystatechange = function(){
        if(x.readyState === 4){
          if(x.status === 200){
            try{ cb(null, JSON.parse(x.responseText)); }
            catch(e){ cb("JSON parse hatası: "+e); }
          } else { cb("HTTP "+x.status); }
        }
      };
      x.send();
    }catch(e){ cb("İstek hatası: "+e); }
  }

  function parseISOSec(ts){ if(!ts) return null; var t=Date.parse(ts); return isNaN(t)? null:Math.floor(t/1000); }
  function nowSec(){ return Math.floor(Date.now()/1000); }

  function normalizeData(data){
    var rigs = data && data.rigs && data.rigs.slice ? data.rigs.slice(0) : [];
    for(var i=0;i<rigs.length;i++){ rigs[i].gpus = rigs[i].gpus || []; }
    return rigs;
  }

  function deriveRigMetrics(r){
    var totalMHs=0, totalW=0, i;
    for(i=0;i<r.gpus.length;i++){
      var g=r.gpus[i];
      if(typeof g.hash_mhs==='number') totalMHs+=g.hash_mhs;
      if(typeof g.power_w==='number') totalW+=g.power_w;
    }
    var eff=(totalMHs>0 && totalW>0)? (totalMHs/totalW):null;
    var seen=parseISOSec(r.last_seen); var delta= seen? (nowSec()-seen):null;
    var status='online';
    if(delta!=null){ if(delta>600) status='offline'; else if(delta>180) status='stale'; }
    for(i=0;i<r.gpus.length;i++){
      var gg=r.gpus[i];
      if((gg.temp_c>=75) || (typeof gg.util_pct==='number' && gg.util_pct<70)) { status='throttle'; break; }
    }
    if(r.status) status=r.status;
    return { totalMHs:totalMHs, totalW:totalW, eff:eff, delta:delta, status:status };
  }

  function fmtMH(x){ return (typeof x==='number') ? x.toFixed(2)+' MH/s' : '—'; }
  function fmtW(x){ return (typeof x==='number') ? Math.round(x)+' W' : '—'; }
  function fmtEff(x){ return (typeof x==='number') ? x.toFixed(3)+' MH/W' : '—'; }
  function fmtTimeAgo(d){ if(d==null) return '—'; if(d<60) return d+' sn önce'; var m=Math.floor(d/60); if(m<60) return m+' dk önce'; var h=Math.floor(m/60); return h+' sa önce'; }

  function badge(status){
    var s=(status||'online').toLowerCase();
    var cls='b-off', lbl='offline';
    if(s==='online'){cls='b-ok'; lbl='online';}
    else if(s==='stale'){cls='b-warn'; lbl='stale';}
    else if(s==='throttle'){cls='b-warn'; lbl='throttle';}
    else if(s==='isolated'){cls='b-iso'; lbl='isolated';}
    return '<span class="badge '+cls+'">● '+lbl+'</span>';
  }

  function makeHeader(){
    return '<table><thead><tr>'
      +'<th data-k="rig_id">Rig ID</th>'
      +'<th data-k="name">Ad</th>'
      +'<th>Durum</th>'
      +'<th data-k="gpu">GPU</th>'
      +'<th data-k="hash">Toplam Hash</th>'
      +'<th data-k="power">Toplam Güç</th>'
      +'<th data-k="eff">Verimlilik</th>'
      +'<th data-k="seen">Son Güncelleme</th>'
      +'<th></th>'
      +'</tr></thead><tbody id="tbody"></tbody></table>';
  }

  function renderList(rigs){
    var view=$('view'); view.innerHTML='<div class="card" style="overflow:auto">'+makeHeader()+'</div>';
    var tb=$('tbody');
    var rows=[], i;
    for(i=0;i<rigs.length;i++){ rows.push({ r:rigs[i], m:deriveRigMetrics(rigs[i]), gpuCount: rigs[i].gpus.length }); }

    var tHash=0,tW=0; for(i=0;i<rows.length;i++){ tHash+=(rows[i].m.totalMHs||0); tW+=(rows[i].m.totalW||0); }
    var tEff=(tHash>0 && tW>0)?(tHash/tW):null;
    $('totals').innerHTML=
      '<div class="kpi"><div class="muted">Toplam Hash</div><div class="v">'+fmtMH(tHash)+'</div></div>'
     +'<div class="kpi"><div class="muted">Toplam Güç</div><div class="v">'+fmtW(tW)+'</div></div>'
     +'<div class="kpi"><div class="muted">Ortalama Verimlilik</div><div class="v">'+fmtEff(tEff)+'</div></div>';

    var html='';
    for(i=0;i<rows.length;i++){
      var r=rows[i].r, m=rows[i].m, gpuCount=rows[i].gpuCount;
      html+='<tr>'
        +'<td><a class="link riglink" data-id="'+r.rig_id+'" href="#">'+r.rig_id+'</a></td>'
        +'<td>'+(r.name||'—')+'</td>'
        +'<td>'+badge(m.status)+'</td>'
        +'<td>'+gpuCount+'</td>'
        +'<td>'+fmtMH(m.totalMHs)+'</td>'
        +'<td>'+fmtW(m.totalW)+'</td>'
        +'<td>'+fmtEff(m.eff)+'</td>'
        +'<td class="muted">'+fmtTimeAgo(m.delta)+'</td>'
        +'<td><a class="pill riglink" data-id="'+r.rig_id+'" href="#">Detay</a></td>'
      +'</tr>';
    }
    tb.innerHTML = html || '<tr><td colspan="9" class="muted">Kayıt yok.</td></tr>';

    // linkler
    var links = document.querySelectorAll('.riglink');
    for(i=0;i<links.length;i++){
      links[i].addEventListener('click', function(e){ e.preventDefault(); openModal(this.getAttribute('data-id')); });
    }

    // sıralama başlıkları
    var heads=document.querySelectorAll('thead th[data-k]');
    for(i=0;i<heads.length;i++){
      heads[i].addEventListener('click', function(){ sortKey=this.getAttribute('data-k'); sortDir=(sortDir===1?-1:1); applyFilters(); });
    }
  }

  function bullet(arr){ var s='', i; for(i=0;i<arr.length;i++){ s+='• '+arr[i]+(i<arr.length-1?'\n':''); } return s.replace(/\n/g,'<br>'); }

  function renderDetail(r){
    var m=deriveRigMetrics(r);
    var miner=r.miner||{};
    var gpus=r.gpus||[];
    var gpuRows='';
    for(var i=0;i<gpus.length;i++){
      var g=gpus[i];
      var st=(g.status||'ok').toLowerCase();
      var cls= st==='ok'?'b-ok':(st==='throttle'?'b-warn':(st==='isolated'?'b-iso':(st==='error'?'b-err':'b-off')));
      gpuRows+='<tr>'
        +'<td>'+((g.id!=null)? g.id:i)+'</td>'
        +'<td>'+(g.model||'—')+'</td>'
        +'<td>'+((g.temp_c!=null? g.temp_c+'°C':'—'))+'</td>'
        +'<td>'+((g.fan_percent!=null? g.fan_percent+'%':'—'))+'</td>'
        +'<td>'+fmtW(g.power_w)+'</td>'
        +'<td>'+((g.util_pct!=null? g.util_pct+'%':'—'))+'</td>'
        +'<td>'+((typeof g.hash_mhs==='number'? g.hash_mhs.toFixed(2)+' MH/s':'—'))+'</td>'
        +'<td>'+((g.power_limit_w!=null? g.power_limit_w+' W':'—'))+'</td>'
        +'<td>'+((g.invalid_pct!=null? g.invalid_pct+'%':'—'))+'</td>'
        +'<td><span class="badge '+cls+'">'+st+'</span></td>'
        +'<td class="muted"><button class="chip" disabled title="SSH yokken pasif">Find GPU</button></td>'
      +'</tr>';
    }
    return '<div class="row" style="margin-bottom:12px">'
      +'<div class="col card pad">'
        +'<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">'
          +'<div>'
            +'<div style="font-size:18px;font-weight:700">'+r.rig_id+' <span class="muted">'+(r.name?('· '+r.name):'')+'</span></div>'
            +'<div class="badges" style="margin-top:6px">'+badge(m.status)+' '+(miner.name?('<span class="badge">'+miner.name+(miner.version?(' v'+miner.version):'')+'</span>'):'')+' '+(miner.coin?('<span class="badge">coin: '+miner.coin+'</span>'):'')+'</div>'
          +'</div>'
        +'</div>'
        +'<div class="kv">'
          +'<div class="muted">Toplam Hash</div><div>'+fmtMH(m.totalMHs)+'</div>'
          +'<div class="muted">Toplam Güç</div><div>'+fmtW(m.totalW)+'</div>'
          +'<div class="muted">Verimlilik</div><div>'+fmtEff(m.eff)+'</div>'
          +'<div class="muted">Son Güncelleme</div><div>'+fmtTimeAgo(m.delta)+'</div>'
        +'</div>'
      +'</div>'
      +'<div class="col card pad">'
        +'<div style="font-weight:700;margin-bottom:8px">Uyarılar</div>'
        +'<div class="muted">'+(((r.warnings&&r.warnings.length)? bullet(r.warnings) : '—'))+'</div>'
      +'</div>'
    +'</div>'
    +'<div class="card" style="overflow:auto">'
      +'<table>'
        +'<thead><tr>'
          +'<th>#</th><th>Model</th><th>Temp</th><th>Fan</th><th>Power</th><th>Util</th><th>Hash</th><th>PL</th><th>Invalid%</th><th>Durum</th><th>İşlem</th>'
        +'</tr></thead>'
        +'<tbody>'+ (gpuRows || '<tr><td colspan="11" class="muted">GPU verisi yok.</td></tr>') +'</tbody>'
      +'</table>'
    +'</div>';
  }

  function openModal(id){
    var i, rig=null; for(i=0;i<RIGS.length;i++){ if(String(RIGS[i].rig_id)===String(id)){ rig=RIGS[i]; break; } }
    if(!rig) return;
    $('sheetTitle').textContent='Rig: '+rig.rig_id;
    $('sheetBody').innerHTML=renderDetail(rig);
    $('modal').classList.add('open');
  }
  function closeModal(){ $('modal').classList.remove('open'); }

  function badgeChip(txt,val){ return '<span class="chip" data-v="'+val+'">'+txt+'</span>'; }
  function uniqueCoins(rigs){ var map={}, arr=[], i; for(i=0;i<rigs.length;i++){ var c=rigs[i].miner && rigs[i].miner.coin; if(c && !map[c]){ map[c]=1; arr.push(c); } } return arr; }

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
        var all=document.querySelectorAll('.chip'); for(var k=0;k<all.length;k++){ all[k].classList.remove('active'); }
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
      if(err){ $('view').innerHTML='<div style="height:180px"></div>'; return; }
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
