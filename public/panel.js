// ==========================================================
// GPU Çoban – Panel (RTDB Canlı Mod)
// ==========================================================

// ------------------- Firebase RTDB (CDN/ESM) -------------------
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.1.0/firebase-app.js";
import { getDatabase, ref, onValue } from "https://www.gstatic.com/firebasejs/11.1.0/firebase-database.js";

// ⚠️ BURAYI kendi proje bilgine göre DOLDUR
const firebaseConfig = {
  apiKey: "AIzaSyCgTUoaHiiwtrs9FnVoiAi5-3qmMWuih80",
  authDomain: "gpu-coban.firebaseapp.com",
  databaseURL: "https://gpu-coban-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "gpu-coban",
  storageBucket: "gpu-coban.firebasestorage.app",
  messagingSenderId: "231403963193",
  appId: "1:231403963193:web:616908deb40cfe29c09ee8"
};

const app = initializeApp(firebaseConfig);
const db  = getDatabase(app);


// ==========================================================
// UI Yardımcıları
// ==========================================================
function $(sel) {
  return document.querySelector(sel);
}

function timeAgo(ts){
  if(!ts) return "—";
  const d = (Date.now() - Number(ts)) / 1000;
  if (d < 60)  return `${d.toFixed(0)} sn önce`;
  if (d < 3600) return `${(d/60).toFixed(0)} dk önce`;
  return `${(d/3600).toFixed(1)} saat önce`;
}

// Modal aç/kapat
function openModal(rig){
  const m = $("#rigModal");
  if(!m) return;
  m.style.display = "flex";

  const body = $("#rigDetailBody");
  if(!body) return;
  body.innerHTML = `
     <div class="sheet-head">
        <h3>${rig.host || rig.rig_id}</h3>
        <span class="chip close-btn" onclick="closeModal()">X</span>
     </div>

     <div class="sheet-row"><b>Son Görülme:</b> ${timeAgo(rig.last_seen)}</div>
     <div class="sheet-row"><b>Miner:</b> ${rig.miner?.name || "-"} – ${rig.miner?.algo || "-"}</div>
     <div class="sheet-row"><b>Toplam Hash:</b> ${(rig.totals?.hash_mhs||0).toFixed(2)} MH/s</div>
     <div class="sheet-row"><b>Toplam Güç:</b> ${rig.totals?.power_w||0} W</div>

     <div class="sheet-sep"></div>

     <h4>GPU'lar</h4>
     <table class="gpu-table">
        <thead><tr>
           <th>ID</th><th>Model</th><th>Temp</th><th>Fan</th>
           <th>Power</th><th>Util</th><th>Hash</th>
        </tr></thead>
        <tbody id="gpuRows"></tbody>
     </table>
  `;

  const tbody = $("#gpuRows");
  if(rig.gpus && rig.gpus.length){
    rig.gpus.forEach(g=>{
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${g.idx}</td>
        <td>${g.name || "-"}</td>
        <td>${g.temp || 0}°C</td>
        <td>${g.fan || 0}%</td>
        <td>${Math.round(g.power || 0)}W</td>
        <td>${g.util || 0}%</td>
        <td>${(g.hash_mhs||0).toFixed(2)} MH/s</td>
      `;
      tbody.appendChild(tr);
    });
  }
}

window.closeModal = function(){
  const m = $("#rigModal");
  if(m) m.style.display = "none";
};


// ==========================================================
// Render Tablo (Ana sayfa)
// ==========================================================
function renderRigs(rigs){
  const tbody = $("#rigRows");
  if(!tbody) return;
  tbody.innerHTML = "";

  let totalHash = 0;
  let totalWatt = 0;

  rigs.forEach(r=>{
    const h = r.totals?.hash_mhs || 0;
    const w = r.totals?.power_w || 0;
    totalHash += h;
    totalWatt += w;

    const tr = document.createElement("tr");
    tr.innerHTML = `
       <td>${r.host || r.rig_id}</td>
       <td>${(r.gpus && r.gpus.length) || 0}</td>
       <td>${h.toFixed(2)} MH/s</td>
       <td>${Math.round(w)} W</td>
       <td>${timeAgo(r.last_seen)}</td>
       <td><span class="chip" data-rigid="${r.rig_id}">Detay</span></td>
    `;
    tbody.appendChild(tr);
  });

  const kpi = $("#kpi");
  if(kpi){
    kpi.innerHTML = `
      <span class="chip" style="background:#283046">Toplam Hash: ${totalHash.toFixed(2)} MH/s</span>
      <span class="chip" style="background:#283046">Güç: ${Math.round(totalWatt)} W</span>
      <span class="chip" style="background:#283046">Rig: ${rigs.length}</span>
    `;
  }

  // Detay butonları
  document.querySelectorAll('[data-rigid]').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const id = btn.getAttribute('data-rigid');
      const rig = rigs.find(x=> String(x.rig_id)===String(id) || String(x.host)===String(id));
      if(rig) openModal(rig);
    });
  });
}


// ==========================================================
// RTDB – CANLI OKUMA
// ==========================================================
const rigsRef = ref(db, "rigs");
onValue(rigsRef, (snap)=>{
  const data = snap.val() || {}; 
  const rigs = Object.values(data);
  renderRigs(rigs);
});


// ==========================================================
// İlk yükleme – placeholder boş görünmesin
// ==========================================================
renderRigs([]);
