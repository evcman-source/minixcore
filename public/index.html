// GPU Çoban Panel JS
// Kaynaklar: /rigs.json ve /outbox.json

async function fetchJson(path) {
  try {
    const res = await fetch(path + `?t=${Date.now()}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (e) {
    console.error("JSON fetch error", path, e);
    return null;
  }
}

// Basit helper – ISO tarihi "x dk önce" çevir
function timeAgo(iso) {
  if (!iso) return "bilinmiyor";
  const then = new Date(iso);
  if (isNaN(then.getTime())) return iso;
  const now = new Date();
  const diffSec = Math.floor((now - then) / 1000);
  if (diffSec < 60) return `${diffSec}s önce`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin} dk önce`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH} sa önce`;
  const diffD = Math.floor(diffH / 24);
  return `${diffD} gün önce`;
}

// Sayı formatı
function formatHash(v) {
  if (v == null) return "0";
  if (v >= 1000) return (v / 1000).toFixed(2) + " GH/s";
  return v.toFixed(1) + " MH/s";
}

function formatPower(v) {
  if (v == null) return "0 W";
  if (v >= 1000) return (v / 1000).toFixed(2) + " kW";
  return v.toFixed(2) + " W";
}

function formatTemp(v) {
  if (v == null) return "–";
  return v.toFixed(1) + "°C";
}

// DOM referansları
const rigGridEl = document.getElementById("rig-grid");

const metricTotalRigsEl = document.getElementById("metric-total-rigs");
const metricTotalGpusEl = document.getElementById("metric-total-gpus");
const metricTotalHashEl = document.getElementById("metric-total-hash");
const metricHashUnitEl = document.getElementById("metric-hash-unit");
const metricTotalPowerEl = document.getElementById("metric-total-power");
const metricAvgTempEl = document.getElementById("metric-avg-temp");
const metricHealthNoteEl = document.getElementById("metric-health-note");

// AI / Guardian kartları
const aiModePillEl = document.getElementById("ai-mode-pill");
const aiLastActionEl = document.getElementById("ai-last-action");
const aiLastDetailEl = document.getElementById("ai-last-detail");
const aiLastTsEl = document.getElementById("ai-last-ts");

const guardPillEl = document.getElementById("guard-pill");
const guardIsoCountEl = document.getElementById("guard-iso-count");
const guardIsoDetailEl = document.getElementById("guard-iso-detail");
const guardLastTsEl = document.getElementById("guard-last-ts");

// Modal
const modalBackdropEl = document.getElementById("rig-modal-backdrop");
const modalTitleEl = document.getElementById("modal-title");
const modalSubtitleEl = document.getElementById("modal-subtitle");
const gpuListEl = document.getElementById("gpu-list");
const isoSummaryEl = document.getElementById("iso-summary");
const modalCloseBtn = document.getElementById("modal-close-btn");
const findGpuBtn = document.getElementById("find-gpu-btn");

let lastRigsData = null;

// Modal helpers
function openModal() {
  modalBackdropEl.classList.add("show");
}

function closeModal() {
  modalBackdropEl.classList.remove("show");
}

modalCloseBtn.addEventListener("click", closeModal);
modalBackdropEl.addEventListener("click", (e) => {
  if (e.target === modalBackdropEl) closeModal();
});

findGpuBtn.addEventListener("click", () => {
  alert(
    "Find GPU (fan taktiği) komutu henüz panel üzerinden aktif değil.\n\n" +
      "Terminalde kullandığımız Luna bot komutlarına bağlandığında burada tetiklenecek. 🙂"
  );
});

// RIG kartlarını çiz
function renderRigs(rigs) {
  rigGridEl.innerHTML = "";

  if (!rigs || rigs.length === 0) {
    rigGridEl.innerHTML =
      '<div style="font-size:12px;color:#9ca3af;">Hiç rig telemetrisi bulunamadı.</div>';
    return;
  }

  rigs.forEach((rig) => {
    const gpuCount = rig.gpus ? rig.gpus.length : 0;
    const totalHash = (rig.gpus || []).reduce(
      (sum, g) => sum + (g.hash_mhs || 0),
      0
    );
    const totalPower = (rig.gpus || []).reduce(
      (sum, g) => sum + (g.power_w || 0),
      0
    );
    const avgTemp =
      gpuCount > 0
        ? (rig.gpus || []).reduce((sum, g) => sum + (g.temp_c || 0), 0) /
          gpuCount
        : 0;

    const anyWarn =
      (rig.warnings && rig.warnings.length > 0) ||
      (rig.gpus || []).some((g) => g.status && g.status !== "ok");

    const card = document.createElement("article");
    card.className = "rig-card";
    card.innerHTML = `
      <div class="rig-header">
        <div class="rig-title">
          <div class="rig-name">
            <span class="icon">🐑</span>
            <span>${rig.name || rig.rig_id || "Rig"}</span>
          </div>
          <div class="rig-sub">
            ${gpuCount} GPU • Son görüldü: ${timeAgo(rig.last_seen)}
          </div>
        </div>
        <div class="rig-status-chip ${anyWarn ? "warn" : "ok"}">
          <span>${anyWarn ? "Uyarı" : "OK"}</span>
        </div>
      </div>
      <div class="rig-body">
        <div class="rig-metric-list">
          <div>
            <span class="rig-metric-label">Hashrate</span><br/>
            <span class="rig-metric-value">${formatHash(totalHash)}</span>
          </div>
          <div>
            <span class="rig-metric-label">Güç</span><br/>
            <span class="rig-metric-value">${formatPower(totalPower)}</span>
          </div>
          <div>
            <span class="rig-metric-label">Sıcaklık</span><br/>
            <span class="rig-metric-value">${formatTemp(avgTemp)}</span>
          </div>
        </div>
        <div class="rig-sparkline">
          <div class="rig-sparkline-line"></div>
        </div>
      </div>
      <div class="rig-footer">
        <span>Miner: ${rig.miner?.name || "bilinmiyor"} ${
      rig.miner?.coin ? "• " + rig.miner.coin : ""
    }</span>
        <span class="highlight">${
          anyWarn ? "Detay için tıklayın" : "GPU'lar stabil görünüyor"
        }</span>
      </div>
    `;

    card.addEventListener("click", () => openRigModal(rig));
    rigGridEl.appendChild(card);
  });
}

// Modal içeriği doldur
function openRigModal(rig) {
  modalTitleEl.innerHTML = `🐑 ${rig.name || rig.rig_id || "Rig"}`;
  modalSubtitleEl.textContent = `${
    (rig.gpus || []).length
  } GPU • Son görüldü: ${timeAgo(rig.last_seen)}`;

  gpuListEl.innerHTML = "";

  const headerRow = document.createElement("div");
  headerRow.className = "gpu-row header";
  headerRow.innerHTML = `
    <div>GPU</div>
    <div>Model</div>
    <div>Hashrate</div>
    <div>Güç</div>
    <div>Sıcaklık</div>
    <div>Durum</div>
  `;
  gpuListEl.appendChild(headerRow);

  let isoCount = 0;
  (rig.gpus || []).forEach((g) => {
    const row = document.createElement("div");
    row.className = "gpu-row";

    const status = (g.status || "ok").toLowerCase();
    let pillClass = "ok";
    let label = "OK";
    if (status === "isolated") {
      pillClass = "iso";
      label = "İZOLASYON";
      isoCount++;
    } else if (status !== "ok") {
      pillClass = "warn";
      label = status.toUpperCase();
    }

    row.innerHTML = `
      <div>GPU${g.id != null ? g.id : ""}</div>
      <div>${g.model || "-"}</div>
      <div>${(g.hash_mhs || 0).toFixed(2)} MH/s</div>
      <div>${formatPower(g.power_w || 0)}</div>
      <div>${formatTemp(g.temp_c || 0)}</div>
      <div><span class="gpu-status-pill ${pillClass}">${label}</span></div>
    `;
    gpuListEl.appendChild(row);
  });

  if (isoCount > 0) {
    isoSummaryEl.innerHTML = `<span class="count">${isoCount}</span> GPU kalıcı izolasyonda. Fan taktiğiyle sahada doğrulama önerilir.`;
  } else {
    isoSummaryEl.textContent = "İzolasyonda GPU yok. Tüm kartlar aktif görünüyor.";
  }

  openModal();
}

// Genel metricleri hesapla
function computeAndRenderSummary(rigs) {
  if (!rigs || rigs.length === 0) {
    metricTotalRigsEl.textContent = "0";
    metricTotalGpusEl.textContent = "0 GPU";
    metricTotalHashEl.textContent = "0.0";
    metricHashUnitEl.textContent = "MH/s";
    metricTotalPowerEl.textContent = "0.00";
    metricAvgTempEl.textContent = "–";
    metricHealthNoteEl.textContent = "Telemetri yok.";
    return;
  }

  let totalRigs = rigs.length;
  let totalGpus = 0;
  let sumHash = 0;
  let sumPower = 0;
  let sumTemp = 0;
  let tempCount = 0;
  let anyWarn = false;

  rigs.forEach((rig) => {
    const gpus = rig.gpus || [];
    totalGpus += gpus.length;
    gpus.forEach((g) => {
      sumHash += g.hash_mhs || 0;
      sumPower += g.power_w || 0;
      if (g.temp_c != null) {
        sumTemp += g.temp_c;
        tempCount++;
      }
      if (g.status && g.status !== "ok") anyWarn = true;
    });
    if (rig.warnings && rig.warnings.length > 0) anyWarn = true;
  });

  const avgTemp = tempCount ? sumTemp / tempCount : 0;

  metricTotalRigsEl.textContent = totalRigs.toString();
  metricTotalGpusEl.textContent = `${totalGpus} GPU`;

  // Hash gösterimi – toplama göre MH/s veya GH/s
  if (sumHash >= 1000) {
    metricTotalHashEl.textContent = (sumHash / 1000).toFixed(2);
    metricHashUnitEl.textContent = "GH/s";
  } else {
    metricTotalHashEl.textContent = sumHash.toFixed(1);
    metricHashUnitEl.textContent = "MH/s";
  }

  metricTotalPowerEl.textContent = sumPower.toFixed(2);
  metricAvgTempEl.textContent = avgTemp ? avgTemp.toFixed(1) : "–";

  metricHealthNoteEl.textContent = anyWarn
    ? "Bazı GPU’larda uyarı mevcut, detay için rig kartlarına bak."
    : "GPU’ların büyük çoğunluğu sağlıklı görünüyor.";
}

// outbox.json’dan AI & Guardian özetleri
function renderOutbox(outbox) {
  if (!outbox || !Array.isArray(outbox.messages) || outbox.messages.length === 0) {
    aiLastActionEl.textContent = "Henüz AI mesajı yok.";
    aiLastDetailEl.textContent =
      "Shepherd ve Guardian loglarından özetler burada görünecek.";
    aiLastTsEl.textContent = "–";
    guardIsoDetailEl.textContent = "Guardian logu alınamadı.";
    guardLastTsEl.textContent = "–";
    guardIsoCountEl.textContent = "0 GPU";
    return;
  }

  // Varsayım: messages[0] en yeni
  const last = outbox.messages[0];
  aiLastActionEl.textContent = last.text || "Son aksiyon bilgisi yok.";
  aiLastDetailEl.textContent = last.source
    ? `Kaynak: ${last.source} • Seviye: ${last.level || "INFO"}`
    : "Shepherd / Guardian karması.";

  aiLastTsEl.textContent = last.ts ? timeAgo(last.ts) : "–";

  // Guardian + izolasyon sayısı (rig verisinden de bakacağız)
  let isoFromOutbox = 0;
  if (typeof outbox.isolated_gpu_count === "number") {
    isoFromOutbox = outbox.isolated_gpu_count;
  }

  // lastRigsData varsa oradan da kontrol et
  let isoFromRigs = 0;
  if (lastRigsData) {
    lastRigsData.forEach((rig) => {
      (rig.gpus || []).forEach((g) => {
        if ((g.status || "").toLowerCase() === "isolated") isoFromRigs++;
      });
    });
  }

  const isoTotal = Math.max(isoFromOutbox, isoFromRigs);

  guardIsoCountEl.textContent = `${isoTotal} GPU`;
  if (isoTotal > 0) {
    guardIsoDetailEl.textContent =
      "Kalıcı izolasyonda GPU var. Sahada kontrol önerilir.";
    guardPillEl.textContent = "Dikkat";
  } else {
    guardIsoDetailEl.textContent = "Kalıcı izolasyonda GPU görünmüyor.";
    guardPillEl.textContent = "Temiz";
  }

  // Guardian’a ait son logu bulmaya çalışalım
  const guardLog = outbox.messages.find(
    (m) => m.source && m.source.toLowerCase().includes("guardian")
  );
  if (guardLog) {
    guardLastTsEl.textContent = timeAgo(guardLog.ts);
  } else {
    guardLastTsEl.textContent = "–";
  }

  // Shepherd modu tahmini
  if (last.mode) {
    aiModePillEl.textContent = last.mode;
  } else {
    aiModePillEl.textContent = "Sakin Mod";
  }
}

// Ana loop
async function refresh() {
  const rigsData = await fetchJson("rigs.json");
  const outboxData = await fetchJson("outbox.json");

  const rigs = rigsData && rigsData.rigs ? rigsData.rigs : [];
  lastRigsData = rigs;

  renderRigs(rigs);
  computeAndRenderSummary(rigs);
  renderOutbox(outboxData);
}

// İlk yükleme
document.addEventListener("DOMContentLoaded", () => {
  refresh();
  // 20 sn’de bir yenileyelim
  setInterval(refresh, 20000);
});
