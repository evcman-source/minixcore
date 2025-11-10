// ==========================================================
// GPU Çoban – Panel (RTDB + Komut Gönderme)
// ==========================================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/11.1.0/firebase-app.js";
import { getDatabase, ref, onValue, set } from "https://www.gstatic.com/firebasejs/11.1.0/firebase-database.js";

// -------- Firebase Config (senin proje) --------
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
// UI helpers
// ==========================================================
const $ = sel => document.querySelector(sel);

function timeAgo(ts){
  if(!ts) return "—";
  const s = (Date.now() - Number(ts)) / 1000;
  if(s < 60)  return `${s.toFixed(0)} sn önce`;
  if(s < 3600) return `${(s/60).toFixed(0)} dk önce`;
  return `${(s/3600).toFixed(1)} saat önce`;
}

function snack(msg){
  const el = $("#snack");
  el.textContent = msg;
  el.className = "show";
  setTimeout(()=> el.className = el.className.replace("show",""), 2600);
}

// ==========================================================
// Komut Gönderme
// ==========================================================
async function sendCommand(rig_id, op, target={}, value=null){
  const ts = Date.now();
  const cmdPath = `commands/${rig_id}`;

  const data = {
    ts: ts,
    op: op,
    target: target,
    value: value
  };

  try {
    await set(ref(db, cmdPath), data);
    snack(`Komut gönderildi: ${op}`);
  } catch (e) {
    snack("Komut gönderilemedi ❌");
    console.error(e);
  }
}

// ==========================================================
// Modal aç/kapat + moda detay
// ==========================================================
function openModal(rig){
  const m = $("#rigModal");
  const b = $("#rigDetailBody");
  if(!m || !b) return;
  m.style.display = "flex";

  b.innerHTML = `
    <div class="sheet-head">
      <h3>${rig.host || rig.rig_id}</h3>
      <span class="chip close-btn" onclick="closeModal()">X</span>
    </div>

    <div class="sheet-row"><b>Son Görülme:</b> ${timeAgo(rig.last_seen)}</div>
    <div class="sheet-row"><b>Miner:</b> ${rig.miner?.name || "-"} – ${rig.miner?.algo || "-"}</div>
    <div class="sheet-row"><b>Hash:</b> ${(rig.totals?.hash_mhs||0).toFixed(2)} MH/s</div>
    <div class="sheet-row"><b>Güç:</b> ${Math.round(r.totals?.power_w||0)} W</div>

    <div class="sheet-sep"></div>

    <h4>GPU'lar</h4>
    <table class="gpu-table">
      <thead><tr>
        <th>ID</th><th>Model</th><th>Temp</th><th>Fan</th>
        <th>Power</th><th>Util</th><th>Hash</th>
        <th>Komut</th>
      </tr></thead>
      <tbody id="gpuRows"></tbody>
    </table>
  `;

  const tbody = $("#gpuRows");
  if(rig.gpus){
    rig.gpus.forEach(g=>{
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${g.idx}</td>
        <td>${g.name || "-"}</td>
        <td>${g.temp||0}°C</td>
        <td>${g.fan||0}%</td>
        <td>${Math.round(g.power||0)}W</td>
        <td>${g.util||0}%</td>
        <td>${(g.hash_mhs||0).toFixed(2)} MH/s</td>
        <td>
          <span class="chip" data-cmd="restart_miner" data-rigid="${rig.rig_id}">Restart</span>
        </td>
      `;
      tbody.appendChild(tr);
    });
  }

  // GPU komutları
  tbody.querySelectorAll("[data-cmd]").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      const r = btn.getAttribute("data-rigid");
      const op = btn.getAttribute("data-cmd");
      sendCommand(r, op, {}, null);
    });
  });
}

window.closeModal = function(){
  const m = $("#rigModal");
  if(m) m.style.display = "none";
};

// ==========================================================
// Tablo render
// ==========================================================
function renderRigs(rigs){
  const tbody = $("#rigRows");
  const kpi = $("#kpi");

  if(!tbody || !kpi) return;
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

  kpi.innerHTML = `
    <span class="chip">Toplam Hash: ${totalHash.toFixed(2)} MH/s</span>
    <span class="chip">Güç: ${Math.round(totalWatt)} W</span>
    <span class="chip">Rig: ${rigs.length}</span>
  `;

  // Modal butonları
  document.querySelectorAll("[data-rigid]").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      const id = btn.getAttribute("data-rigid");
      const rig = rigs.find(x=> String(x.rig_id)===String(id) || String(x.host)===String(id));
      if(rig) openModal(rig);
    });
  });
}

// ==========================================================
// RTDB CANLI OKUMA
// ==========================================================
onValue(ref(db, "rigs"), (snap)=>{
  const data = snap.val() || {};
  const rigs = Object.values(data);
  renderRigs(rigs);
});

// İlk boş render
renderRigs([]);
