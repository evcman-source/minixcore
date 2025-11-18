// GPU Çoban Panel JS
// - rigs.json'dan rig & GPU verilerini okur
// - outbox.json'dan (varsa) AI Çoban loglarını çeker
// - 5 sn'de bir otomatik yeniler

const RIGS_URL = "/rigs.json";
const LOGS_URL = "/outbox.json"; // yoksa graceful degrade

let rigsData = [];
let activeRigId = null;

function $(sel) {
  return document.querySelector(sel);
}

function formatNumber(value, decimals = 1) {
  if (value === null || value === undefined || Number.isNaN(value)) return "–";
  return value.toFixed(decimals).replace(".", ",");
}

function formatTimeAgo(iso) {
  if (!iso) return "-";
  const ts = typeof iso === "string" ? Date.parse(iso) : iso;
  if (!ts) return "-";
  const diffMs = Date.now() - ts;
  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 10) return "şimdi";
  if (diffSec < 60) return diffSec + " sn önce";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return diffMin + " dk önce";
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return diffHr + " sa önce";
  const diffDay = Math.floor(diffHr / 24);
  return diffDay + " gün önce";
}

function overallStatusFromRigs(rigs) {
  let hasCrit = false;
  let hasWarn = false;
  for (const rig of rigs) {
    for (const g of rig.gpus || []) {
      if (g.status === "isolated" || g.status === "down" || g.status === "error") {
        hasCrit = true;
      } else if (g.status === "throttle" || g.status === "warn") {
        hasWarn = true;
      }
    }
  }
  if (hasCrit) return { text: "Bazı GPU’lar kritik modda", level: "crit" };
  if (hasWarn) return { text: "Bazı GPU’lar takipte", level: "warn" };
  return { text: "Sürü genel olarak sağlıklı", level: "ok" };
}

function rigStatus(rig) {
  let hasCrit = false;
  let hasWarn = false;
  (rig.gpus || []).forEach((g) => {
    if (g.status === "isolated" || g.status === "down" || g.status === "error") hasCrit = true;
    else if (g.status === "throttle" || g.status === "warn") hasWarn = true;
  });
  if (hasCrit) return "crit";
  if (hasWarn) return "warn";
  return "ok";
}

function rigStatusLabel(status) {
  if (status === "crit") return "KRİTİK";
  if (status === "warn") return "UYARI";
  return "OK";
}

function gpuStatusClass(status) {
  if (!status) return "ok";
  if (status === "isolated" || status === "down" || status === "error") return "isolated";
  if (status === "throttle" || status === "warn") return "throttle";
  return "ok";
}

function gpuStatusText(status) {
  if (!status || status === "ok") return "OK";
  if (status === "throttle") return "Throttle";
  if (status === "isolated") return "İzole";
  if (status === "down" || status === "error") return "Offline";
  return status;
}

function sumRigMetrics(rigs) {
  let totalHash = 0;
  let totalPower = 0;
  let totalTemp = 0;
  let tempCount = 0;
  rigs.forEach((rig) => {
    (rig.gpus || []).forEach((g) => {
      if (typeof g.hash_mhs === "number") totalHash += g.hash_mhs;
      if (typeof g.power_w === "number") totalPower += g.power_w;
      if (typeof g.temp_c === "number") {
        totalTemp += g.temp_c;
        tempCount += 1;
      }
    });
  });
  return {
    totalHash,
    totalPower,
    avgTemp: tempCount ? totalTemp / tempCount : null,
  };
}

function updateSummary(rigs) {
  const totalRigs = rigs.length;
  const totalGpus = rigs.reduce((acc, r) => acc + (r.gpus ? r.gpus.length : 0), 0);
  const { totalHash, totalPower, avgTemp } = sumRigMetrics(rigs);

  $("#summary-total-rigs").textContent = totalRigs || "0";
  $("#summary-total-gpus").textContent = totalGpus || "0";

  const subRigs = totalRigs
    ? `${totalRigs} rig, ${totalGpus} GPU izleniyor`
    : "Henüz rig verisi gelmedi.";
  $("#summary-rigs-sub").textContent = subRigs;

  $("#summary-hashrate").textContent = totalHash ? `${formatNumber(totalHash, 1)} MH/s` : "– MH/s";

  // Algo/coin bilgisini ilk rig'den çek
  let algoText = "-";
  if (rigs[0] && rigs[0].miner) {
    const m = rigs[0].miner;
    const parts = [];
    if (m.coin) parts.push(m.coin);
    if (m.algo) parts.push(m.algo);
    if (m.name) parts.push(m.name);
    algoText = parts.join(" / ") || "-";
  }
  $("#summary-hash-sub").textContent = `Aktif: ${algoText}`;

  $("#summary-power").textContent = totalPower ? `${formatNumber(totalPower, 1)} W` : "– W";
  let effText = "-";
  if (totalPower && totalHash) {
    const eff = totalHash / (totalPower / 1000); // MH/s / kW
    effText = `${formatNumber(eff, 2)} MH/s / kW`;
  }
  $("#summary-power-sub").textContent = effText;

  $("#summary-temp").textContent = avgTemp !== null ? `${formatNumber(avgTemp, 1)}°C` : "–°C";

  const { text, level } = overallStatusFromRigs(rigs);
  const healthEl = $("#summary-health-sub");
  healthEl.textContent = text;
  healthEl.style.color =
    level === "crit" ? "#fecaca" : level === "warn" ? "#facc15" : "#a7f3d0";
}

function renderRigList(rigs) {
  const listEl = $("#rig-list");
  listEl.innerHTML = "";

  if (!rigs.length) {
    listEl.innerHTML =
      '<div style="font-size:11px;color:#9ca3af;padding:4px;">Henüz rig verisi yok.</div>';
    return;
  }

  rigs.forEach((rig, index) => {
    const rigId = rig.rig_id || rig.name || `Rig-${index + 1}`;
    const status = rigStatus(rig);
    const lastSeen = formatTimeAgo(rig.last_seen);
    const gpuCount = rig.gpus ? rig.gpus.length : 0;
    const { totalHash, totalPower, avgTemp } = sumRigMetrics([rig]);

    const row = document.createElement("div");
    row.className = "rig-row";
    row.dataset.rigId = rigId;

    if (!activeRigId && index === 0) {
      activeRigId = rigId;
    }
    if (rigId === activeRigId) {
      row.classList.add("active");
    }

    row.innerHTML = `
      <div class="rig-main">
        <div class="rig-title">
          <span class="icon">🐑</span>
          <span>${rig.name || rigId}</span>
        </div>
        <div class="rig-meta">
          ${gpuCount} GPU · Son görüldü: ${lastSeen}
        </div>
      </div>
      <div class="rig-metrics">
        <span class="metric-pill">⛏️ ${formatNumber(totalHash, 1)} MH/s</span>
        <span class="metric-pill">⚡ ${formatNumber(totalPower, 1)} W</span>
        <span class="metric-pill">🔥 ${avgTemp !== null ? formatNumber(avgTemp, 1) + "°C" : "-°C"}</span>
      </div>
      <div class="rig-status-badge ${status}">
        ${
          status === "crit"
            ? "🟥"
            : status === "warn"
            ? "🟠"
            : "🟢"
        } ${rigStatusLabel(status)}
      </div>
    `;

    row.addEventListener("click", () => {
      activeRigId = rigId;
      document
        .querySelectorAll(".rig-row")
        .forEach((el) => el.classList.toggle("active", el === row));
      renderRigDetail(rig);
    });

    listEl.appendChild(row);
  });

  $("#rig-count-label").textContent = `${rigs.length} rig`;
}

function renderRigDetail(rig) {
  const nameEl = $("#rig-detail-name");
  const statusBadge = $("#rig-detail-status-badge");
  const metaEl = $("#rig-detail-meta");
  const warningsEl = $("#rig-warnings");
  const tbody = $("#gpu-table-body");

  if (!rig) {
    nameEl.textContent = "Rig seçilmedi";
    statusBadge.textContent = "-";
    statusBadge.style.borderColor = "rgba(148,163,184,0.5)";
    metaEl.textContent =
      "Sol taraftan bir rig seçtiğinde, GPU’lar burada listelenecek.";
    warningsEl.innerHTML = "";
    tbody.innerHTML =
      '<tr><td colspan="8" style="padding:8px 6px;font-size:11px;color:#9ca3af;">Henüz bir rig seçilmedi.</td></tr>';
    return;
  }

  const rigId = rig.rig_id || rig.name;
  nameEl.textContent = rig.name || rigId || "Bilinmeyen rig";

  const status = rigStatus(rig);
  statusBadge.textContent = rigStatusLabel(status);

  if (status === "crit") {
    statusBadge.style.borderColor = "rgba(248,113,113,0.9)";
    statusBadge.style.color = "#fecaca";
  } else if (status === "warn") {
    statusBadge.style.borderColor = "rgba(251,191,36,0.9)";
    statusBadge.style.color = "#fed7aa";
  } else {
    statusBadge.style.borderColor = "rgba(52,211,153,0.8)";
    statusBadge.style.color = "#bbf7d0";
  }

  const lastSeen = formatTimeAgo(rig.last_seen);
  const gpuCount = rig.gpus ? rig.gpus.length : 0;
  const miner = rig.miner || {};
  const minerParts = [];
  if (miner.name) minerParts.push(miner.name);
  if (miner.coin) minerParts.push(miner.coin);
  if (miner.algo) minerParts.push(miner.algo);
  const minerText = minerParts.join(" / ") || "Bilinmiyor";

  metaEl.textContent = `${gpuCount} GPU · Son görüldü: ${lastSeen} · Miner: ${minerText}`;

  // Warnings
  warningsEl.innerHTML = "";
  (rig.warnings || []).forEach((w) => {
    const span = document.createElement("span");
    span.className = "warning-pill";
    span.innerHTML = `⚠️ ${w}`;
    warningsEl.appendChild(span);
  });

  if (!rig.warnings || !rig.warnings.length) {
    // no explicit warnings, show nothing (temiz olsun)
  }

  // GPU table
  tbody.innerHTML = "";

  if (!rig.gpus || !rig.gpus.length) {
    tbody.innerHTML =
      '<tr><td colspan="8" style="padding:8px 6px;font-size:11px;color:#9ca3af;">Bu rig için GPU verisi yok.</td></tr>';
    return;
  }

  rig.gpus.forEach((g) => {
    const tr = document.createElement("tr");
    const statusClass = gpuStatusClass(g.status);
    const statusLabel = gpuStatusText(g.status);

    tr.innerHTML = `
      <td>GPU${g.id}</td>
      <td>${g.model || "-"}</td>
      <td>${formatNumber(g.hash_mhs, 2)} MH/s</td>
      <td>${formatNumber(g.power_w, 1)} W</td>
      <td>${formatNumber(g.temp_c, 1)}°C</td>
      <td>${formatNumber(g.fan_percent, 0)}%</td>
      <td>${formatNumber(g.power_limit_w, 0)} W</td>
      <td>
        <span class="gpu-status-pill ${statusClass}">
          ${
            statusClass === "isolated"
              ? "🚫"
              : statusClass === "throttle"
              ? "🔥"
              : "🟢"
          } ${statusLabel}
        </span>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

async function fetchJsonSafe(url) {
  try {
    const res = await fetch(url + "?t=" + Date.now());
    if (!res.ok) throw new Error("status " + res.status);
    return await res.json();
  } catch (err) {
    console.warn("fetchJsonSafe error for", url, err);
    return null;
  }
}

async function refreshRigs() {
  const data = await fetchJsonSafe(RIGS_URL);
  if (!data || !Array.isArray(data.rigs)) {
    console.warn("Rigs verisi yok veya bozuk.");
    return;
  }

  rigsData = data.rigs;
  updateSummary(rigsData);
  renderRigList(rigsData);

  const firstRig = rigsData.find(
    (r) => (r.rig_id || r.name) === activeRigId
  ) || rigsData[0];

  renderRigDetail(firstRig);

  const now = new Date();
  $("#last-sync").textContent =
    "Son senkron: " +
    now.toLocaleTimeString("tr-TR", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
}

function renderLogs(logs) {
  const container = $("#logs-container");
  container.innerHTML = "";

  if (!logs || !Array.isArray(logs.messages) || !logs.messages.length) {
    container.innerHTML =
      '<div class="logs-empty">Henüz AI Çoban logu yok veya outbox.json oluşturulmadı.</div>';
    $("#logs-counter").textContent = "0 log";
    return;
  }

  $("#logs-counter").textContent = `${logs.messages.length} log`;

  logs.messages.slice(0, 40).forEach((msg) => {
    const level = (msg.level || "info").toLowerCase();
    const tsText = msg.ts
      ? new Date(msg.ts).toLocaleTimeString("tr-TR", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        })
      : "-";

    const item = document.createElement("div");
    item.className = "log-item " + (level === "warn" || level === "warning"
      ? "warn"
      : level === "crit" || level === "error"
      ? "crit"
      : "info");

    item.innerHTML = `
      <div class="log-header">
        <div class="log-title">
          <span>${
            level === "crit" || level === "error"
              ? "🟥"
              : level === "warn" || level === "warning"
              ? "🟠"
              : "🔵"
          }</span>
          <span>${msg.title || "AI Çoban Mesajı"}</span>
        </div>
        <span class="log-meta">${tsText}</span>
      </div>
      <div>${msg.text || msg.message || ""}</div>
      ${
        msg.meta
          ? `<div class="log-meta">${msg.meta}</div>`
          : ""
      }
    `;
    container.appendChild(item);
  });
}

async function refreshLogs() {
  const data = await fetchJsonSafe(LOGS_URL);
  if (!data) {
    renderLogs(null);
    return;
  }
  renderLogs(data);
}

async function refreshAll() {
  await Promise.all([refreshRigs(), refreshLogs()]);
}

// Initial
document.addEventListener("DOMContentLoaded", () => {
  $("#btn-refresh").addEventListener("click", () => {
    refreshAll();
  });

  refreshAll();

  // 5 sn'de bir otomatik yenile
  setInterval(refreshAll, 5000);
});
