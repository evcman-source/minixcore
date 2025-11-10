/* panel.js — GPU Çoban (SAFE v3, Central Queue)
 * Veri:  public/rigs.json  (telemetri)
 * Kuyruk: public/queue.json (merkezi komut kuyruğu) — panel JSON’u panoya kopyalar, edit sayfasını açar
 * Not: Dış bağımlılık yok; tek JS dosyası.
 */
(function () {
  'use strict';

  // =========================
  // Ayarlar
  // =========================
  var JSON_URL = 'rigs.json';
  var AUTO_REFRESH_MS = 15000; // 15 sn
  var COINS = ['RVN', 'ETC', 'KAS', 'ERG', 'CFX', 'ALPH', 'XNA', 'FLUX', 'RXD']; // filtre shortlist
  var STATE = {
    rigs: [],
    lastFetchAt: null,
    timer: null,
    filterStatus: 'all',   // all|online|stale|throttle|offline
    filterCoin: 'all',     // all|RVN|ETC|...
    search: ''
  };

  // =========================
  // Yardımcılar
  // =========================
  function $(id) { return document.getElementById(id); }
  function c(el, cls) { var e = document.createElement(el); if (cls) e.className = cls; return e; }
  function esc(s){ return String(s==null?'':s).replace(/[&<>"]/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m])); }

  function fmtMH(x){ return (typeof x==='number'? x : 0).toFixed(2) + ' MH/s'; }
  function fmtW(x){ return (typeof x==='number'? x : 0) + ' W'; }
  function fmtEff(x){ return (typeof x==='number'? x : 0).toFixed(3) + ' MH/W'; }
  function fmtTimeAgo(deltaSec){
    if (deltaSec==null || isNaN(deltaSec)) return '—';
    if (deltaSec < 60) return Math.floor(deltaSec) + ' sn önce';
    var m = Math.floor(deltaSec/60);
    if (m < 60) return m + ' dk önce';
    var h = Math.floor(m/60);
    return h + ' sa önce';
  }
  function sum(arr, sel){ var t=0; for (var i=0;i<arr.length;i++) t += +sel(arr[i])||0; return t; }

  function badge(status){
    var cls = 'b-ok', lbl = 'online';
    if (status === 'offline') { cls = 'b-off'; lbl = 'offline'; }
    else if (status === 'stale') { cls = 'b-st'; lbl = 'stale'; }
    else if (status === 'throttle') { cls = 'b-warn'; lbl = 'throttle'; }
    return '<span class="badge '+cls+'">'+lbl+'</span>';
  }

  // =========================
  // Veri normalize
  // =========================
  function normalizeData(raw){
    var rigs = (raw && raw.rigs) ? raw.rigs.slice() : [];
    var nowSec = Math.floor(Date.now()/1000);

    rigs.forEach(function(r){
      // toplamlar
      var gpus = Array.isArray(r.gpus) ? r.gpus : [];
      r.total_mhs = sum(gpus, g=>g.hash_mhs);
      r.total_w   = sum(gpus, g=>g.power_w);
      r.gpu_count = gpus.length;
      r.eff       = r.total_w>0 ? (r.total_mhs / r.total_w) : 0;

      // zaman
      var seen = r.last_seen ? Date.parse(r.last_seen) : NaN;
      var delta = isNaN(seen) ? null : Math.max(0, Math.floor((Date.now()-seen)/1000));
      r.delta = delta;

      // durum (rig)
      var anyThrottle = gpus.some(g => String(g.status||'').toLowerCase()==='throttle');
      if (delta==null) r.status='offline';
      else if (delta>600) r.status='stale'; // 10 dk üstü
      else if (anyThrottle) r.status='throttle';
      else r.status='online';
    });

    rigs.sort(function(a,b){ return (a.rig_id||'').localeCompare(b.rig_id||''); });
    return rigs;
  }

  // =========================
  // Veri çekme
  // =========================
  function fetchJSON(url){
    return new Promise(function(resolve, reject){
      var xhr = new XMLHttpRequest();
      xhr.open('GET', url + '?_=' + (Date.now()), true);
      xhr.onreadystatechange = function(){
        if (xhr.readyState === 4){
          try{
            if (xhr.status>=200 && xhr.status<300) resolve(JSON.parse(xhr.responseText));
            else reject(new Error('HTTP '+xhr.status));
          }catch(e){ reject(e); }
        }
      };
      xhr.send();
    });
  }

  // =========================
  // UI kurulum
  // =========================
  function ensureScaffold(){
    // tek giriş: body içine root oluştur
    if ($('app')) return;
    var root = c('div'); root.id = 'app';
    document.body.innerHTML = ''; document.body.appendChild(root);

    // Stil (minimal; index.html’nin mevcut temasıyla uyumlu)
    var css = `
:root{
  --bg:#131722; --panel:#171b26; --muted:#8a8b92; --text:#e6eef6; --brand:#f26b1d;
  --ok:#22c55e; --warn:#f1c40f; --err:#e74c3c; --line:#232a36; --chip:#2a3140;
}
*{box-sizing:border-box}
html,body{height:100%}
body{margin:0;background:var(--bg);color:var(--text);font:14px/1.45 system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial}
a{color:#8cb5ff;text-decoration:none}
.container{max-width:1200px;margin:32px auto;padding:0 24px;}
.title{font-size:22px;font-weight:800;letter-spacing:.2px;margin-bottom:12px}
.muted{color:var(--muted)}
.card{background:var(--panel);border:1px solid var(--line);border-radius:14px;padding:16px;box-shadow:0 0 0 1px rgba(0,0,0,.12) inset}
.row{display:flex;gap:16px;flex-wrap:wrap;align-items:center;justify-content:space-between;margin-bottom:12px}
.kpis{display:flex;gap:12px;flex-wrap:wrap}
.kpi{background:#101522;border:1px dashed var(--line);border-radius:12px;padding:10px 12px;min-width:170px}
.kpi .v{font-weight:800;margin-top:6px}
.toolbar{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
.badge{display:inline-block;border:1px solid var(--line);padding:2px 8px;border-radius:999px;font-size:12px}
.b-ok{color:#a7ffbf;background:rgba(63,220,113,.08)}
.b-st{color:#ffd180;background:rgba(255,195,31,.08)}
.b-warn{color:#ffd180;background:rgba(241,196,15,.08)}
.b-off{color:#ff8f8f;background:rgba(231,76,60,.08)}
.chip{background:var(--chip);color:#d6e0ea;border:1px solid var(--line);padding:7px 10px;border-radius:999px;cursor:pointer}
.chip[disabled]{opacity:.5;cursor:not-allowed}
.controls{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin:12px 0}
.controls .seg{display:flex;gap:6px;flex-wrap:wrap}
input.search{background:#101522;color:var(--text);border:1px solid var(--line);border-radius:10px;padding:9px 12px;min-width:220px}
table{width:100%;border-collapse:collapse}
th,td{padding:12px;border-bottom:1px solid var(--line)}
thead th{font-size:13px;color:var(--muted)}
tbody tr:hover{background:rgba(255,255,255,.02)}
tbody tr:hover .badge{box-shadow:0 0 0 1px rgba(255,255,255,.06) inset, 0 0 12px rgba(255,255,255,.04)}
.right{display:flex;gap:8px;align-items:center}
.btn{border:1px solid var(--line);background:#0f1420;color:var(--text);padding:6px 10px;border-radius:10px;cursor:pointer;font-size:13px}
.btn:hover{filter:brightness(1.08)}
.link{font-size:13px}
.sheet{position:fixed;inset:0 0 0 auto;display:none}
.sheet.open{display:block}
.sheet .backdrop{position:absolute;inset:0;background:rgba(0,0,0,.5)}
.sheet .panel{position:absolute;top:0;right:0;width:min(780px,92vw);height:100%;background:var(--panel);border-left:1px solid var(--line);display:flex;flex-direction:column}
.sheet-head{display:flex;align-items:center;justify-content:space-between;padding:14px;border-bottom:1px dashed var(--line)}
.sheet-title{font-weight:800}
.sheet-body{padding:14px;overflow:auto}
.close{cursor:pointer;border:1px solid var(--line);padding:6px 10px;border-radius:10px}
  `;
    var style = c('style'); style.textContent = css; document.head.appendChild(style);

    // DOM iskelet
    root.innerHTML = `
      <div class="container">
        <div class="title">
          <span style="margin-right:8px;opacity:.9">
            <svg width="20" height="20" viewBox="0 0 24 24" style="vertical-align:-3px">
              <path fill="#f26b1d" d="M3 10h2v4H3v-4Zm16-5h2v14h-2V5ZM7 7h8a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H7a2 2 0 1 1-2-2V9a2 2 0 0 1 2-2Zm1 2v6h6V9H8Z"/>
            </svg>
          </span>
          GPU Çoban <span>– Panel</span>
        </div>

        <div class="card">
          <div class="row">
            <div class="toolbar">
              <span class="badge" id="pulse">⏺ Son çekim: —</span>
              <button class="btn" id="btnRefresh">Yenile</button>
              <a class="link" id="viewJSON" target="_blank">JSON’u Gör</a>
            </div>
            <div class="kpis" id="totals"></div>
          </div>

          <div class="controls">
            <div class="seg" id="statusFilters"></div>
            <div class="seg" id="coinFilters"></div>
            <input id="searchBox" class="search" placeholder="Rig ara..." />
          </div>

          <div id="listWrap" class="card" style="padding:0">
            <table>
              <thead>
                <tr>
                  <th>Rig ID</th><th>Ad</th><th>Durum</th><th>GPU</th>
                  <th>Toplam Hash</th><th>Toplam Güç</th><th>Verimlilik</th><th>Son Güncelleme</th><th></th>
                </tr>
              </thead>
              <tbody id="rigRows"></tbody>
            </table>
          </div>
        </div>

        <div class="card" style="margin-top:14px">
          <div style="font-weight:800;margin-bottom:6px">AI GPU Çoban — Ne yapıyor?</div>
          <ul style="margin:0 0 4px 16px;padding:0;line-height:1.6">
            <li>Telemetry’den sıcaklık/hash/power izler; eşik aşımlarında <b>throttle</b> ve <b>isolated</b> önerisi üretir.</li>
            <li>Hash düşüşü &gt; %20 ise “Miner restart” önerir.</li>
            <li>Riser/hata şüphesinde “Find GPU / İzole” önerir.</li>
            <li>(Komut akışı) Panel → <code>public/queue.json</code> → Ajan → (opsiyonel) <code>public/outbox.json</code>.</li>
          </ul>
          <div class="muted" style="font-size:12px;margin-top:6px">
            Proje <a href="https://github.com/evcman-source/minixcore" target="_blank">evcman-source/minixcore</a> — Hosting: Firebase — Veri dosyası: <code>public/rigs.json</code>
          </div>
        </div>
      </div>

      <div class="sheet" id="modal">
        <div class="backdrop" id="closeModal"></div>
        <div class="panel">
          <div class="sheet-head">
            <div class="sheet-title" id="sheetTitle">—</div>
            <div class="right">
              <button class="chip">İzole Et</button>
              <button class="chip">OC Reset</button>
              <button class="chip">Miner Restart</button>
              <button class="close" id="xClose">Kapat ✕</button>
            </div>
          </div>
          <div class="sheet-body" id="sheetBody">—</div>
        </div>
      </div>
    `;

    // Etkinlikler
    $('btnRefresh').addEventListener('click', function(){ loadAndRender(true); });
    $('viewJSON').setAttribute('href', JSON_URL + '?v=' + Date.now());
    $('searchBox').addEventListener('input', function(e){
      STATE.search = e.target.value.trim().toLowerCase();
      renderList();
    });
    $('closeModal').addEventListener('click', closeModal);
    $('xClose').addEventListener('click', closeModal);

    // Filtre butonları
    var statusHtml = [
      ['all','Hepsi'], ['online','online'], ['stale','stale'], ['throttle','throttle'], ['offline','offline']
    ].map(function([key, label]){
      var b = c('button','chip'); b.textContent = label;
      b.addEventListener('click', function(){ STATE.filterStatus = key; renderList(); });
      return b;
    });
    statusHtml.forEach(function(b){ $('statusFilters').appendChild(b); });

    var coinWrap = $('coinFilters');
    var all = c('button','chip'); all.textContent = 'Tüm coinler';
    all.addEventListener('click', function(){ STATE.filterCoin = 'all'; renderList(); });
    coinWrap.appendChild(all);
    COINS.forEach(function(coin){
      var b = c('button','chip'); b.textContent = coin;
      b.addEventListener('click', function(){ STATE.filterCoin = coin; renderList(); });
      coinWrap.appendChild(b);
    });
  }

  // =========================
  // Render — Liste & Totals
  // =========================
  function renderList(){
    var rigs = STATE.rigs.slice();
    var fs = STATE.filterStatus, fc = STATE.filterCoin, q = STATE.search;

    // filtreler
    rigs = rigs.filter(function(r){
      var ok = true;
      if (fs !== 'all') ok = ok && (r.status === fs);
      if (fc !== 'all') ok = ok && r.miner && String(r.miner.coin||'').toUpperCase() === fc;
      if (q) ok = ok && ((r.name||'').toLowerCase().includes(q) || (r.rig_id||'').toLowerCase().includes(q));
      return ok;
    });

    // totals
    var tHash = sum(rigs, r=>r.total_mhs);
    var tW    = sum(rigs, r=>r.total_w);
    var tEff  = tW>0 ? (tHash/tW) : 0;
    $('totals').innerHTML =
      '<div class="kpi"><div class="muted">Toplam Hash</div><div class="v">⚡ '+fmtMH(tHash)+'</div></div>'+
      '<div class="kpi"><div class="muted">Toplam Güç</div><div class="v">🔌 '+fmtW(tW)+'</div></div>'+
      '<div class="kpi"><div class="muted">Ortalama Verimlilik</div><div class="v">📈 '+fmtEff(tEff)+'</div></div>';

    // rows
    var tbody = $('rigRows'); tbody.innerHTML='';
    rigs.forEach(function(r){
      var tr = c('tr');
      tr.innerHTML =
        '<td><a href="#/rig/'+esc(r.rig_id)+'">'+esc(r.rig_id)+'</a></td>'+
        '<td>'+esc(r.name||'—')+'</td>'+
        '<td>'+badge(r.status)+'</td>'+
        '<td>'+ (r.gpu_count||0) +'</td>'+
        '<td>'+fmtMH(r.total_mhs)+'</td>'+
        '<td>'+fmtW(r.total_w)+'</td>'+
        '<td>'+fmtEff(r.eff)+'</td>'+
        '<td>'+fmtTimeAgo(r.delta)+'</td>'+
        '<td><button class="btn">Detay</button></td>';
      // Detay butonu
      tr.querySelector('.btn').addEventListener('click', function(){ openModal(r.rig_id); });
      tbody.appendChild(tr);
    });

    // pulse & link
    $('pulse').textContent = '⏺ Son çekim: ' + (STATE.lastFetchAt ? new Date(STATE.lastFetchAt).toLocaleTimeString() : '—');
    $('viewJSON').setAttribute('href', JSON_URL + '?v=' + Date.now());
  }

  // =========================
  // Modal — Detay
  // =========================
  function byRigId(id){ return STATE.rigs.find(function(x){ return String(x.rig_id)===String(id); }); }

  function renderDetail(r){
    var miner = r.miner || {};
    var gpurs = (r.gpus||[]).map(function(g){
      return '<tr>'+
        '<td>'+esc(g.id)+'</td>'+
        '<td>'+esc(g.model||'—')+'</td>'+
        '<td>'+ (g.temp_c!=null? esc(g.temp_c)+'°C':'—') +'</td>'+
        '<td>'+ (g.fan_percent!=null? esc(g.fan_percent)+'%':'—') +'</td>'+
        '<td>'+fmtW(g.power_w)+'</td>'+
        '<td>'+ (g.power_limit_w!=null? esc(g.power_limit_w)+' W':'—') +'</td>'+
        '<td>'+ (g.util_pct!=null? esc(g.util_pct)+'%':'—') +'</td>'+
        '<td>'+fmtMH(g.hash_mhs)+'</td>'+
        '<td>'+ (g.status ? '<span class="badge '+(g.status==='throttle'?'b-warn':'b-ok')+'">'+esc(g.status)+'</span>' : '—') +'</td>'+
        '<td><button class="chip">Find GPU</button></td>'+
      '</tr>';
    }).join('');

    var warn = (r.warnings && r.warnings.length) ? (
      '<div class="card" style="background:#1a1f2f;border:1px dashed var(--line);margin-bottom:10px">'+
        '<b>Uyarılar</b><br>'+ r.warnings.map(w => '• '+esc(w)).join('<br>') +
      '</div>'
    ) : '';

    return `
      <div class="muted" style="margin-bottom:8px">
        ${badge(r.status)} &nbsp; ${esc(miner.name||'miner?')} ${miner.version?('v'+esc(miner.version)):' '} &nbsp; ${miner.coin?('coin: '+esc(miner.coin)):' '}
      </div>
      ${warn}
      <div class="card" style="padding:0">
        <table>
          <thead>
            <tr><th>GPU</th><th>Model</th><th>Temp</th><th>Fan</th><th>Power</th><th>PL</th><th>Util</th><th>Hash</th><th>Durum</th><th>İşlem</th></tr>
          </thead>
          <tbody>
            ${gpurs || '<tr><td colspan="10" class="muted">GPU verisi yok.</td></tr>'}
          </tbody>
        </table>
      </div>
    `;
  }

  function openModal(rig_id){
    var rig = byRigId(rig_id);
    if (!rig){ alert('Rig bulunamadı.'); return; }
    $('sheetTitle').textContent = 'Rig: ' + rig.rig_id;
    $('sheetBody').innerHTML = renderDetail(rig);
    $('modal').classList.add('open');

    // --- Merkezi kuyruk: JSON’u panoya kopyala + queue.json edit aç ---
    function enqueueViaGithubCentral(rigId, cmdName, args){
      var cmd_id = 'cmd_' + Date.now();
      var payload = {
        cmd_id: cmd_id,
        rig_id: rigId,
        cmd: cmdName,
        args: (args||{}),
        by: 'panel',
        created_ts: new Date().toISOString()
      };
      var snippet = JSON.stringify(payload, null, 2);
      if (navigator.clipboard) {
        navigator.clipboard.writeText(snippet).then(function(){
          alert('Komut JSON panoya kopyalandı.\nAçılan sayfada `commands` dizisinin SONUNA virgül ile EKLEYİP Commit et.');
        }).catch(function(){
          alert('Kopyalama izin vermedi; JSON konsola yazıldı.');
        });
      }
      console.log('Kuyruğa eklenecek nesne:', payload);
      window.open('https://github.com/evcman-source/minixcore/edit/main/public/queue.json', '_blank');
    }

    // Hızlı butonlar
    var quick = document.querySelectorAll('.sheet-head .chip');
    quick.forEach(function(b){
      var t = b.textContent.trim();
      if (t==='İzole Et')       b.addEventListener('click', function(){ enqueueViaGithubCentral(rig.rig_id, 'isolate_gpu', {}); });
      if (t==='OC Reset')       b.addEventListener('click', function(){ enqueueViaGithubCentral(rig.rig_id, 'oc_reset', {}); });
      if (t==='Miner Restart')  b.addEventListener('click', function(){ enqueueViaGithubCentral(rig.rig_id, 'restart_miner', {}); });
    });

    // Satır butonları (Find GPU)
    var findBtns = document.querySelectorAll('#sheetBody table tbody tr td .chip');
    findBtns.forEach(function(b, idx){
      if (b.textContent.indexOf('Find GPU')>-1){
        b.addEventListener('click', function(){
          enqueueViaGithubCentral(rig.rig_id, 'find_gpu', { gpu_id: idx });
        });
      }
    });
  }

  function closeModal(){ $('modal').classList.remove('open'); }

  // =========================
  // Yükle & Yenile
  // =========================
  function loadAndRender(force){
    if (STATE.timer) { clearTimeout(STATE.timer); STATE.timer = null; }
    fetchJSON(JSON_URL).then(function(data){
      STATE.rigs = normalizeData(data);
      STATE.lastFetchAt = Date.now();
      renderList();
    }).catch(function(err){
      console.warn('Veri yüklenemedi:', err);
      $('rigRows').innerHTML = '<tr><td colspan="9" class="muted">Veri yüklenemedi.</td></tr>';
    }).finally(function(){
      STATE.timer = setTimeout(loadAndRender, AUTO_REFRESH_MS);
    });
  }

  // =========================
  // Router (isteğe bağlı)
  // =========================
  window.addEventListener('hashchange', function(){
    var m = location.hash.match(/^#\/rig\/(.+)$/);
    if (m){ openModal(decodeURIComponent(m[1])); }
  });

  // =========================
  // Başlat
  // =========================
  function boot(){
    ensureScaffold();
    loadAndRender(true);
  }

  // DOM hazır
  if (document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', boot);
  }else{
    boot();
  }
})();
