// public/panel.js
// GPU Çoban Paneli – rigs.json'dan veri okuyan sade frontend

async function fetchRigs() {
  try {
    const res = await fetch("rigs.json", { cache: "no-cache" });
    if (!res.ok) throw new Error("HTTP " + res.status);
    return await res.json();
  } catch (err) {
    console.error("rigs.json okunamadı:", err);
    return null;
  }
}

function $(sel) {
  return document.querySelector(sel);
}

function formatHash(totalMh) {
  if (totalMh >= 1000) {
    return (totalMh / 1000).toFixed(2) + " GH/s";
  }
  return totalMh.toFixed(2) + " MH/s";
}

function formatPower(totalW) {
  if (totalW >= 1000) {
    return (totalW / 1000).toFixed(2) + " kW";
  }
  return totalW.toFixed(0) + " W";
}

function buildRigCard(rig) {
  const gpuCount = rig.gpus.length;
  const activeGpus = rig.gpus.filter(g => g.status === "ok").length;
  const warnGpus = gpuCount - activeGpus;

  const totalHash = rig.gpus.reduce((s, g) => s + (g.hash_mhs || 0), 0);
  const totalPower = rig.gpus.reduce((s, g) => s + (g.power_w || 0), 0);
  const avgTemp =
    gpuCount > 0
      ? rig.gpus.reduce((s, g) => s + (g.temp_c || 0), 0) / gpuCount
      : 0;

  const statusClass = warnGpus > 0 ? "warn" : "ok";
  const statusLabel = warnGpus > 0 ? "Uyarı" : "OK";
  const statusIcon = warnGpus > 0 ? "🟠" : "🟢";

  const metaText =
    gpuCount +
    " GPU (" +
    activeGpus +
    " aktif" +
    (warnGpus > 0 ? ", " + warnGpus + " uyarı" : "") +
    ") · Son ping: " +
    (rig.last_seen || "-");

  const warnHtml =
    rig.warnings && rig.warnings.length
      ? `<div class="panel-sub" style="margin-top:4px;color:#f97316;">⚠ ${rig.warnings.join(
          " · "
        )}</div>`
      : "";

  return `
    <div class="rig-card">
      <div class="rig-main">
        <div class="rig-title">
          <span>🐑 ${rig.name || rig.rig_id}</span>
          <span class="rig-status ${statusClass}">
            <span>${statusIcon}</span> ${statusLabel}
          </span>
        </div>
        <div class="rig-meta">
          ${metaText}
        </div>
        ${warnHtml}
      </div>
      <div class="rig-metrics">
        <span class="metric-pill">⛏️ ${formatHash(totalHash)}</span>
        <span class="metric-pill">⚡ ${formatPower(totalPower)}</span>
        <span class="metric-pill">🔥 ${avgTemp.toFixed(1)}°C ort.</span>
        <span class="metric-pill">🪙 ${
          (rig.miner && rig.miner.coin) || "Bilinmiyor"
        }</span>
      </div>
      <div class="rig-actions">
        <button class="btn-mini primary">Detay</button>
        <button class="btn-mini">
          <span>🤖</span> AI Çoban
        </button>
      </div>
    </div>
  `;
}

function updateSummary(rigsData) {
  const rigs = rigsData.rigs || [];

  const totalRigs = rigs.length;
  const totalGpus = rigs.reduce((s, r) => s + (r.gpus ? r.gpus.length : 0), 0);

  let totalHash = 0;
  let totalPower = 0;
  let tempSum = 0;
  let tempCount = 0;
  let warnGpus = 0;

  rigs.forEach(rig => {
    (rig.gpus || []).forEach(g => {
      totalHash += g.hash_mhs || 0;
      totalPower += g.power_w || 0;
      if (typeof g.temp_c === "number") {
        tempSum += g.temp_c;
        tempCount += 1;
      }
      if (g.status && g.status !== "ok") {
        warnGpus += 1;
      }
    });
  });

  const avgTemp = tempCount > 0 ? tempSum / tempCount : 0;

  const summaryRigs = $("#summary-total-rigs");
  const summaryRigsSub = $("#summary-total-rigs-sub");

  if (summaryRigs) {
    summaryRigs.textContent = `${totalRigs} Rig`;
  }
  if (summaryRigsSub) {
    summaryRigsSub.textContent = `${totalGpus} aktif GPU, ${warnGpus} uyarılı`;
  }

  const hashEl = document.querySelector(
    '[data-summary="total-hash-main"]'
  );
  const powerEl = document.querySelector(
    '[data-summary="total-power-main"]'
  );
  const tempMainEl = document.querySelector(
    '[data-summary="temp-main"]'
  );
  const tempSubEl = document.querySelector(
    '[data-summary="temp-sub"]'
  );

  if (hashEl) hashEl.textContent = formatHash(totalHash);
  if (powerEl) powerEl.textContent = formatPower(totalPower);
  if (tempMainEl) tempMainEl.textContent = `${avgTemp.toFixed(1)}°C ort.`;
  if (tempSubEl)
    tempSubEl.textContent =
      warnGpus > 0
        ? `${warnGpus} GPU yüksek sıcaklık / sorunlu`
        : "Tüm GPU'lar sağlıklı görünüyor";
}

async function initPanel() {
  const rigsData = await fetchRigs();
  const rigListEl = $("#rig-list");

  if (!rigsData || !rigsData.rigs) {
    if (rigListEl) {
      rigListEl.innerHTML =
        '<div class="panel-sub">rigs.json okunamadı veya boş. (Panel.js)</div>';
    }
    return;
  }

  // Özet kartları güncelle
  updateSummary(rigsData);

  // Rig kartlarını oluştur
  if (rigListEl) {
    rigListEl.innerHTML = rigsData.rigs.map(buildRigCard).join("");
  }
}

document.addEventListener("DOMContentLoaded", () => {
  initPanel();
  // İleride istersen periyodik refresh:
  // setInterval(initPanel, 15000);
});
