// ==========================================================
// GPU Çoban – Panel (RTDB + Auto-Alias + Komut Gönderme)
// ==========================================================

// Firebase (CDN/ESM)
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.1.0/firebase-app.js";
import {
  getDatabase, ref, onValue, onChildAdded,
  get, runTransaction, set
} from "https://www.gstatic.com/firebasejs/11.1.0/firebase-database.js";

// ---- Firebase Config (kendi projenle aynı olsun) ----
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
// Yardımcılar
// ==========================================================
const $ = (sel)=>document.querySelector(sel);

function timeAgo(ts){
  if(!ts) return "—";
  const s = (Date.now() - Number(ts)) / 1000;
  if (s < 60) return `${s.toFixed(0)} sn önce`;
  if (s < 3600) return `${(s/60).toFixed(0)} dk önce`;
  return `${(s/3600).toFixed(1)} saat önce`;
}

function snack(msg, ok=true){
  const el = $("#snack");
  if(!el) return;
  el.textContent = msg;
  el.style.background = ok ? "#10b981" : "#ef4444";
  el.className = "show";
  setTimeout(()=> el.className = el.className.replace("show",""), 2600);
}

// ==========================================================
// AUTO-ALIAS (Panel: yeni rig'e Rig-01, Rig-02... atar)
// ==========================================================
function enableAutoAlias(db) {
  const rigsRef = ref(db, '/rigs');
  const serialRef = ref(db, '/counters/rig_serial');

  onChildAdded(rigsRef, async (snap) => {
    try {
      const rigId = snap.key;
      if (!rigId) return;
      const metaRef = ref(db, `/meta/${rigId}`);
      const metaSnap = await get(metaRef);
      if (metaSnap.exists() && metaSnap.val() && metaSnap.val().alias) {
        return; // alias zaten atanmış
      }

      const tx = await runTransaction(serialRef, (cur) => (cur === null ? 1 : cur + 1), { applyLocally:false });
      const n = tx?.snapshot?.val();
      if (!n) return;

      const alias  = `Rig-${String(n).padStart(2,'0')}`;  // Rig-01, Rig-02...
      const worker = alias.toLowerCase().replace(/[^a-z0-9]/g,''); // rig01
      await set(metaRef, { alias, worker, created: Date.now() });
      console.log(`AUTO-ALIAS -> ${rigId} = ${alias}/${worker}`);
    } catch(e){
      console.error("AUTO-ALIAS error:", e);
    }
  });
}
enableAutoAlias(db);

// ==========================================================
// KOMUT GÖNDERME (panel → /commands/<rig_id>)
// ==========================================================
async function sendCommand(rig_id, op, target={}, value=null){
  try {
    await set(ref(db, `commands/${rig_id}`), {
      ts: Date.now(), op, target, value
    });
    snack(`Komut gönderildi: ${op}`);
  } catch (e) {
    console.error(e);
    snack("Komut gönderilemedi", false);
  }
}

// ==========================================================
// MODAL (Detay)
// ==========================================================
function openModal(rig){
  const m = $("#rigModal");
  const b = $("#rigDetailBody");
  if(!m || !b) return;
  m.style.display = "flex";

  const alias = rig.alias || rig.meta?.alias || rig.rig_id;
  b.innerHTML = `
    <div class="sheet-head">
      <h3>${alias}</h3>
      <span class="chip close-btn" onclick="closeModal()">X</span>
    </div>

    <div class="sheet-row"><b>Rig ID:</b> ${rig.rig_id || "-"}</div>
    <div class="sheet-row"><b>Son Görülme:</b> ${timeAgo(rig.last_seen)}</div>
    <div class="sheet-row"><b>Hash:</b> ${(rig.totals?.hash_mhs||0).toFixed(2)} MH/s</div>
    <div class="sheet-row"><b>Güç:</b> ${Math.round(rig.totals?.power_w||0)} W</div>

    <div class="sheet-sep"></div>

    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px;">
      <span class="chip" data-cmd="restart_miner" data-rigid="${rig.rig_id}">Miner Restart</span>
      <span class="chip" data-cmd="alias_prompt"   data-rigid="${rig.rig_id}">Alias Değiştir</span>
    </div>

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
  if (Array.isArray(rig.gpus)) {
    rig.gpus.forEach(g=>{
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${g.idx}</td>
        <td>${g.name || "-"}</td>
        <td>${g.temp ?? 0}°C</td>
        <td>${g.fan ?? 0}%</td>
        <td>${Math.round(g.power ?? 0)}W</td>
        <td>${g.util ?? 0}%</td>
        <td>${(g.hash_mhs ?? 0).toFixed ? (g.hash_mhs).toFixed(2) : Number(g.hash_mhs||0).toFixed(2)} MH/s</td>
      `;
      tbody.appendChild(tr);
    });
  }

  // Butonlar
  b.querySelectorAll("[data-cmd]").forEach(btn=>{
    btn.addEventListener("click", async ()=>{
      const rid = btn.getAttribute("data-rigid");
      const op  = btn.getAttribute("data-cmd");
      if (op === "restart_miner"){
        sendCommand(rid, "restart_miner");
      } else if (op === "alias_prompt"){
        const cur = rig.alias || "";
        const val = prompt("Yeni alias (örn: Rig-03 veya Ev-Rig):", cur || "");
        if (val && val.trim()){
          // /meta/<rig_id> altında alias/worker güncelle
          const alias  = val.trim();
          const worker = alias.toLowerCase().replace(/[^a-z0-9]/g,'');
          await set(ref(db, `meta/${rid}`), { alias, worker, updated: Date.now() });
          snack("Alias değiştirildi");
        }
      }
    });
  });
}
window.closeModal = function(){
  const m = $("#rigModal");
  if(m) m.style.display = "none";
};

// ==========================================================
// RENDER (Anasayfa)
// ==========================================================
function renderRigs(rigs, metas){
  const tbody = $("#rigRows");
  const kpi   = $("#kpi");
  if(!tbody || !kpi) return;
  tbody.innerHTML = "";

  let totalHash = 0, totalWatt = 0;

  rigs.forEach(r=>{
    const meta = metas[r.rig_id] || {};
    const alias = meta.alias || r.alias || r.rig_id;

    const h = Number(r.totals?.hash_mhs || 0);
    const w = Number(r.totals?.power_w || 0);
    totalHash += h; totalWatt += w;

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${alias}</td>
      <td>${Array.isArray(r.gpus) ? r.gpus.length : 0}</td>
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

  // Detay butonları
  document.querySelectorAll("[data-rigid]").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      const id = btn.getAttribute("data-rigid");
      const rig = rigs.find(x=> String(x.rig_id)===String(id));
      // alias'ı ekle
      const meta = metas[id] || {};
      openModal({...rig, alias: meta.alias});
    });
  });
}

// RTDB canlı dinleme (rigs + meta birlikte)
let metasCache = {};
onValue(ref(db, "meta"), (snap)=>{
  metasCache = snap.val() || {};
});

onValue(ref(db, "rigs"), (snap)=>{
  const obj = snap.val() || {};
  // rigs objesini diziye çevirirken rig_id’yi koru
  const rigs = Object.entries(obj).map(([rid, v])=>({ rig_id: rid, ...v }));
  renderRigs(rigs, metasCache);
});

// İlk boş render
renderRigs([], {});
