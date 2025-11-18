// GPU Çoban Panel JS – Luna UI v0.1

async function fetchJSON(path) {
  const url = `${path}?t=${Date.now()}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} for ${path}`);
  }
  return res.json();
}

function formatHash(totalMh) {
  if (totalMh >= 1000000) {
    return (totalMh / 1000000).toFixed(2) + " TH/s";
  }
  if (totalMh >= 1000) {
    return (totalMh / 1000).toFixed(2) + " GH/s";
  }
  return totalMh.toFixed(1) + " MH/s";
}

function formatPower(totalW) {
  if (totalW >= 1000) {
    return (totalW / 1000).toFixed(2) + " kW";
  }
  return totalW.toFixed(1) + " W";
}

function formatTemp(avgTemp) {
  return avgTemp.toFixed(1) + "°C";
}

function timeAgo(iso) {
  if (!iso) return "-";
  const ts = new Date(iso);
  if (Number.isNaN(ts.getTime())) return iso;
  const now = new Date();
  const diff = (now - ts) / 1000;
  if (diff < 60) return `${Math.floor(diff)} sn önce`;
  if (diff < 3600) return `${Math.floor(diff / 60)} dk önce`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} sa önce`;
  return ts.toLocaleString("tr-TR");
}

function computeOverview(rigs) {
  let rigCount = rigs.length;
  let gpuCount = 0;
  let isoCount = 0;
  let totalHash = 0;
  let totalPower = 0;
  let totalTemp = 0;

  let bestRigName = "-";
  let bestRigHash = 0;

  rigs.forEach((rig) => {
    const gpus = rig.gpus || [];
    gpuCount += gpus.length;

    let rigHash = 0;
    let rigPower = 0;
    let rigTemp = 0;

    gpus.forEach((g) => {
      const status = (g.status || "").toLowerCase();
      if (status.includes("iso")) isoCount += 1;

      const h = Number(g.hash_mhs || 0);
      const p = Number(g.power_w || 0);
      const t = Number(g.temp_c || 0);

      rigHash += h;
      rigPower += p;
      rigTemp += t;

      totalHash += h;
      totalPower += p;
      totalTemp += t;
    });

    if (rigHash > bestRigHash) {
      bestRigHash = rigHash;
      bestRigName = rig.name || rig.rig_id || "-";
    }
  });

  const avgTemp = gpuCount > 0 ? totalTemp / gpuCount : 0;
  const efficiency =
    totalPower > 0 ? (totalHash / totalPower).toFixed(3) + " MH/s / W" : "-";

  return {
    rigCount,
    gpuCount,
    isoCount,
    totalHash,
    totalPower,
    avgTemp,
    bestRigName,
    bestRigHash,
    efficiency,
  };
}

function updateSummaryCards(rigs) {
  const o = computeOverview(rigs);

  document.getElementById("summary-rigs").textContent =
    `${o.rigCount} rig`;
  document.getElementById("summary-gpus").textContent =
    `Toplam GPU: ${o.gpuCount} (İzole: ${o.isoCount})`;

  const systemStatusEl = document.getElementById("summary-system-status");
  if (o.rigCount === 0) {
    systemStatusEl.textContent = "Hiç rig bağlı değil";
  } else if (o.isoCount > 0) {
    systemStatusEl.textContent = "Bazı GPU’lar izolasyonda";
  } else {
    systemStatusEl.textContent = "Her şey sakin görünüyor";
  }

  document.getElementById("summary-hash").textContent = formatHash(o.totalHash);
  document.getElementById("summary-hash-sub").textContent =
    o.rigCount > 0 ? "Anlık toplam hashrate" : "Rig verisi alınamadı";

  document.getElementById("summary-power").textContent = formatPower(
    o.totalPower
  );
  document.getElementById("summary-power-sub").textContent =
    "Tahmini toplam tüketim";

  document.getElementById("summary-efficiency").textContent = o.efficiency;

  document.getElementById("summary-temp").textContent = formatTemp(o.avgTemp);
  let stability = "-";
  if (o.avgTemp === 0 || Number.isNaN(o.avgTemp)) {
    stability = "Veri yok";
  } else if (o.avgTemp < 60) {
    stability = "Stabil (serin sürü)";
  } else if (o.avgTemp < 70) {
    stability = "Normal çalışma bandı";
  } else {
    stability = "Yüksek sıcaklık bandı";
  }
  document.getElementById("summary-stability").textContent = stability;

  document.getElementById("summary-best-rig").textContent =
    o.bestRigName === "-" ? "-" : `${o.bestRigName} (${formatHash(o.bestRigHash)})`;

  document.getElementById("rig-count-label").textContent =
    `${o.rigCount} rig listeleniyor`;
}

function classifyRigStatus(rig) {
  const warnings = rig.warnings || [];
  let hasWarn = warnings.length > 0;
  let hasCrit = false;

  const gpus = rig.gpus || [];
  gpus.forEach((g) => {
    const status = (g.status || "").toLowerCase();
    if (status.includes("crit") || status.includes("error")) hasCrit = true;
    if (status.includes("hot") || status.includes("throttle")) hasWarn = true;
    if (status.includes("iso")) hasWarn = true;
  });

  if (hasCrit) return "crit";
  if (hasWarn) return "warn";
  return "ok";
}

function buildRigCards(rigs) {
  const container = document.getElementById("rigs-list");
  container.innerHTML = "";

  if (!rigs || rigs.length === 0) {
    const empty = document.createElement("div");
    empty.style.fontSize = "12px";
    empty.style.color = "#9ca3af";
    empty.textContent =
      "Bu panelde henüz hiç rig yok. İlk rig bağlandığında burada görünecek.";
    container.appendChild(empty);
    return;
  }

  rigs.forEach((rig) => {
    const card = document.createElement("article");
    card.className = "rig-card";

    const status = classifyRigStatus(rig);
    const statusPill = document.createElement("span");
    statusPill.className = "rig-status-pill";

    let statusText = "OK";
    let statusIcon = "🟢";
    if (status === "warn") {
      statusPill.classList.add("rig-status-warn");
      statusText = "Uyarı";
      statusIcon = "🟠";
    } else if (status === "crit") {
      statusPill.classList.add("rig-status-crit");
      statusText = "Kritik";
      statusIcon = "🟥";
    } else {
      statusPill.classList.add("rig-status-ok");
    }
    statusPill.textContent = `${statusIcon} ${statusText}`;

    const main = document.createElement("div");
    main.className = "rig-main";

    const nameRow = document.createElement("div");
    nameRow.className = "rig-name-row";
    const nameSpan = document.createElement("span");
    nameSpan.textContent = `🐑 ${rig.name || rig.rig_id || "Bilinmeyen rig"}`;
    nameRow.appendChild(nameSpan);
    nameRow.appendChild(statusPill);

    const meta = document.createElement("div");
    meta.className = "rig-meta";
    const gpuCount = (rig.gpus || []).length;
    meta.textContent = `${gpuCount} GPU · Son görüldü: ${timeAgo(
      rig.last_seen
    )}`;

    main.appendChild(nameRow);
    main.appendChild(meta);

    const metrics = document.createElement("div");
    metrics.className = "rig-metrics";

    let rigHash = 0;
    let rigPower = 0;
    let rigTemp = 0;

    (rig.gpus || []).forEach((g) => {
      rigHash += Number(g.hash_mhs || 0);
      rigPower += Number(g.power_w || 0);
      rigTemp += Number(g.temp_c || 0);
    });

    const avgTemp =
      (rig.gpus || []).length > 0
        ? rigTemp / (rig.gpus || []).length
        : 0;

    const pillHash = document.createElement("span");
    pillHash.className = "metric-pill";
    pillHash.textContent = `⛏️ ${formatHash(rigHash)}`;

    const pillPower = document.createElement("span");
    pillPower.className = "metric-pill";
    pillPower.textContent = `⚡ ${formatPower(rigPower)}`;

    const pillTemp = document.createElement("span");
    pillTemp.className = "metric-pill";
    pillTemp.textContent = `🔥 ${avgTemp.toFixed(1)}°C ort.`;

    metrics.appendChild(pillHash);
    metrics.appendChild(pillPower);
    metrics.appendChild(pillTemp);

    const side = document.createElement("div");
    side.className = "rig-side";

    const badge = document.createElement("div");
    badge.className = "badge-small";
    badge.textContent = rig.miner
      ? `${rig.miner.name || "miner"} · ${rig.miner.coin || "-"}`
      : "miner: -";

    const btn = document.createElement("button");
    btn.className = "btn-mini";
    btn.type = "button";
    btn.innerHTML = "🔍 Detay";

    side.appendChild(badge);
    side.appendChild(btn);

    card.appendChild(main);
    card.appendChild(metrics);
    card.appendChild(side);

    card.addEventListener("click", () => openRigModal(rig));
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      openRigModal(rig);
    });

    container.appendChild(card);
  });
}

function updateAISummaryFromOutbox(outbox) {
  const messages = (outbox && outbox.messages) || [];
  const total = messages.length;

  let cobanMsgs = messages.filter((m) => m.source === "coban");
  let guardianMsgs = messages.filter((m) => m.source === "guardian");

  const lastCoban = cobanMsgs[0];
  const lastGuardian = guardianMsgs[0];
  const lastAny = messages[0];

  const warnCount = messages.filter(
    (m) => m.level === "WARN" || m.level === "WARNING"
  ).length;
  const critCount = messages.filter(
    (m) => m.level === "CRITICAL" || m.level === "ERROR"
  ).length;

  // AI Çoban card
  const cobanStatusEl = document.getElementById("ai-coban-status");
  const cobanMainEl = document.getElementById("ai-coban-main");
  const cobanSubEl = document.getElementById("ai-coban-sub");
  const cobanLogCountEl = document.getElementById("ai-coban-log-count");
  const cobanWarnEl = document.getElementById("ai-coban-warn");

  cobanLogCountEl.textContent = cobanMsgs.length;
  cobanWarnEl.textContent = warnCount;

  if (lastCoban) {
    cobanMainEl.textContent = `${lastCoban.level} · ${lastCoban.ts}`;
    cobanSubEl.textContent = lastCoban.text;
    if (lastCoban.level === "WARN") {
      cobanStatusEl.textContent = "Uyarı modu";
    } else if (
      lastCoban.level === "CRITICAL" ||
      lastCoban.level === "ERROR"
    ) {
      cobanStatusEl.textContent = "Kritik izleme";
    } else {
      cobanStatusEl.textContent = "Sakin mod";
    }
  } else {
    cobanMainEl.textContent = "Veri yok";
    cobanSubEl.textContent = "Çoban logu bulunamadı.";
    cobanStatusEl.textContent = "Beklemede";
  }

  // Guardian card
  const guardianStatusEl = document.getElementById("ai-guardian-status");
  const guardianMainEl = document.getElementById("ai-guardian-main");
  const guardianSubEl = document.getElementById("ai-guardian-sub");
  const guardianResetsEl = document.getElementById("ai-guardian-resets");
  const guardianRiskEl = document.getElementById("ai-guardian-risk");

  guardianResetsEl.textContent = guardianMsgs.length;

  let riskCount = 0;
  guardianMsgs.forEach((m) => {
    const txt = (m.text || "").toLowerCase();
    if (
      txt.includes("kritik") ||
      txt.includes("hot") ||
      txt.includes("risk")
    ) {
      riskCount += 1;
    }
  });
  guardianRiskEl.textContent = riskCount;

  if (lastGuardian) {
    guardianMainEl.textContent = `${lastGuardian.level} · ${lastGuardian.ts}`;
    guardianSubEl.textContent = lastGuardian.text;
    if (
      lastGuardian.level === "WARN" ||
      lastGuardian.level === "CRITICAL"
    ) {
      guardianStatusEl.textContent = "Bekçi tetikte";
    } else {
      guardianStatusEl.textContent = "Pasif uyarı yok";
    }
  } else {
    guardianMainEl.textContent = "Veri yok";
    guardianSubEl.textContent = "Guardian logu bulunamadı.";
    guardianStatusEl.textContent = "Beklemede";
  }

  // Messages card
  const msgStatusEl = document.getElementById("ai-messages-status");
  const msgMainEl = document.getElementById("ai-messages-main");
  const msgSubEl = document.getElementById("ai-messages-sub");
  const msgWarnEl = document.getElementById("ai-messages-warn");
  const msgCritEl = document.getElementById("ai-messages-crit");

  msgWarnEl.textContent = warnCount;
  msgCritEl.textContent = critCount;
  msgMainEl.textContent = `${total} log kaydı`;

  if (lastAny) {
    msgSubEl.textContent = `${lastAny.source} · ${lastAny.text}`;
    if (critCount > 0) {
      msgStatusEl.textContent = "Kritik loglar var";
    } else if (warnCount > 0) {
      msgStatusEl.textContent = "Bazı uyarılar var";
    } else {
      msgStatusEl.textContent = "Temiz log";
    }
  } else {
    msgSubEl.textContent = "Henüz log üretilmedi.";
    msgStatusEl.textContent = "Log bekleniyor";
  }

  document.getElementById("log-count-label").textContent =
    `${total} mesaj`;
}

function renderLogList(outbox) {
  const listEl = document.getElementById("log-list");
  listEl.innerHTML = "";

  const messages = (outbox && outbox.messages) || [];
  if (messages.length === 0) {
    const empty = document.createElement("div");
    empty.style.fontSize = "11px";
    empty.style.color = "#9ca3af";
    empty.textContent =
      "Bu panel için henüz AI Çoban logu üretilmedi. Çoban ve Bekçi çalıştıkça burada göreceksin.";
    listEl.appendChild(empty);
    return;
  }

  messages.slice(0, 40).forEach((m) => {
    const item = document.createElement("article");
    item.className = "log-item";

    const level = (m.level || "").toUpperCase();
    if (level === "WARN" || level === "WARNING") {
      item.classList.add("log-warn");
    } else if (level === "CRITICAL" || level === "ERROR") {
      item.classList.add("log-crit");
    }

    const header = document.createElement("div");
    header.className = "log-item-header";

    const title = document.createElement("div");
    title.className = "log-item-title";

    const iconSpan = document.createElement("span");
    iconSpan.textContent = m.source === "guardian" ? "🛡️" : "🤖";

    const textSpan = document.createElement("span");
    textSpan.textContent = `${m.source || "-"} · ${level || "INFO"}`;

    title.appendChild(iconSpan);
    title.appendChild(textSpan);

    const badge = document.createElement("span");
    badge.className = "log-badge";
    badge.textContent = m.ts || "";

    header.appendChild(title);
    header.appendChild(badge);

    const body = document.createElement("div");
    body.textContent = m.text || "";

    const meta = document.createElement("div");
    meta.className = "log-meta";
    meta.textContent =
      level === "CRITICAL"
        ? "AI Çoban bu olayı kritik olarak işaretledi."
        : level === "WARN"
        ? "Bu olay izlenmesi gereken bir uyarı olarak kaydedildi."
        : "";

    item.appendChild(header);
    item.appendChild(body);
    if (meta.textContent) item.appendChild(meta);

    listEl.appendChild(item);
  });
}

// Modal logic
let currentModalRig = null;

function openRigModal(rig) {
  currentModalRig = rig;
  const backdrop = document.getElementById("rig-modal-backdrop");
  backdrop.classList.add("open");

  const title = document.getElementById("modal-rig-title");
  const sub = document.getElementById("modal-rig-sub");
  const body = document.getElementById("gpu-table-body");
  const isoMsg = document.getElementById("modal-iso-message");

  title.textContent = `🐑 ${rig.name || rig.rig_id || "Rig"}`;
  sub.textContent = `Miner: ${
    rig.miner ? rig.miner.name || "-" : "-"
  } · Coin: ${rig.miner ? rig.miner.coin || "-" : "-"} · Son görüldü: ${timeAgo(
    rig.last_seen
  )}`;

  body.innerHTML = "";

  const gpus = rig.gpus || [];
  let isolatedGpus = [];
  let hottestGpu = null;

  gpus.forEach((g) => {
    const tr = document.createElement("tr");

    const idTd = document.createElement("td");
    idTd.textContent = `GPU${g.id}`;
    tr.appendChild(idTd);

    const modelTd = document.createElement("td");
    modelTd.textContent = g.model || "-";
    tr.appendChild(modelTd);

    const hashTd = document.createElement("td");
    const h = Number(g.hash_mhs || 0);
    hashTd.textContent = `${h.toFixed(2)} MH/s`;
    tr.appendChild(hashTd);

    const powerTd = document.createElement("td");
    const p = Number(g.power_w || 0);
    powerTd.textContent = `${p.toFixed(1)} W`;
    tr.appendChild(powerTd);

    const tempTd = document.createElement("td");
    const t = Number(g.temp_c || 0);
    tempTd.textContent = `${t.toFixed(1)}°C`;
    tr.appendChild(tempTd);

    const fanTd = document.createElement("td");
    fanTd.textContent = `${Number(g.fan_percent || 0).toFixed(0)}%`;
    tr.appendChild(fanTd);

    const plTd = document.createElement("td");
    plTd.textContent = `${Number(g.power_limit_w || 0).toFixed(0)} W`;
    tr.appendChild(plTd);

    const statusTd = document.createElement("td");
    const pill = document.createElement("span");
    pill.className = "gpu-status-pill";
    const status = (g.status || "ok").toLowerCase();

    if (status.includes("crit") || status.includes("error")) {
      pill.classList.add("gpu-status-crit");
      pill.textContent = "🟥 Kritik";
    } else if (
      status.includes("hot") ||
      status.includes("throttle") ||
      status.includes("iso")
    ) {
      pill.classList.add("gpu-status-warn");
      pill.textContent = status.includes("iso") ? "🟠 İzole" : "🟠 Uyarı";
    } else {
      pill.classList.add("gpu-status-ok");
      pill.textContent = "🟢 OK";
    }

    statusTd.appendChild(pill);
    tr.appendChild(statusTd);

    body.appendChild(tr);

    if (status.includes("iso")) {
      isolatedGpus.push({ gpu: g, row: tr });
    }

    if (!hottestGpu || t > hottestGpu.temp_c) {
      hottestGpu = g;
    }
  });

  // Iso warning / ok text
  if (isolatedGpus.length > 0) {
    isoMsg.classList.remove("iso-ok");
    isoMsg.innerHTML =
      "⚠️ İzolasyona alınmış GPU’lar: " +
      isolatedGpus
        .map((x) => `GPU${x.gpu.id} (${x.gpu.model || "-"})`)
        .join(", ");
  } else {
    isoMsg.classList.add("iso-ok");
    isoMsg.textContent = "☑️ Bu rig’de izolasyona alınmış GPU yok.";
  }

  // Highlight suspicious GPU row (for Find GPU)
  const rows = body.querySelectorAll("tr");
  rows.forEach((r) => r.classList.remove("gpu-row-hot"));
  if (hottestGpu) {
    const row = Array.from(rows).find((tr) =>
      tr.firstChild.textContent.includes(`GPU${hottestGpu.id}`)
    );
    if (row) row.classList.add("gpu-row-hot");
  }
}

function closeRigModal() {
  const backdrop = document.getElementById("rig-modal-backdrop");
  backdrop.classList.remove("open");
  currentModalRig = null;
}

function initModalEvents() {
  const backdrop = document.getElementById("rig-modal-backdrop");
  const closeBtn = document.getElementById("modal-close-btn");
  const findBtn = document.getElementById("btn-find-gpu");

  closeBtn.addEventListener("click", closeRigModal);
  backdrop.addEventListener("click", (e) => {
    if (e.target === backdrop) closeRigModal();
  });

  findBtn.addEventListener("click", () => {
    if (!currentModalRig) return;
    const gpus = currentModalRig.gpus || [];
    if (gpus.length === 0) return;

    let isolated = gpus.filter((g) =>
      (g.status || "").toLowerCase().includes("iso")
    );
    let target = isolated[0];

    if (!target) {
      target = gpus.reduce((max, g) =>
        Number(g.temp_c || 0) > Number(max.temp_c || 0) ? g : max
      );
    }

    const msg = [
      "🔍 Fan taktiği için önerilen GPU:",
      "",
      `Rig: ${currentModalRig.name || currentModalRig.rig_id || "-"}`,
      `GPU: GPU${target.id} · ${target.model || "-"}`,
      "",
      "Gerçek fan komutu henüz otomatik gönderilmiyor.",
      "Rig tarafında AI Çoban'a 'find_gpu' komutunu eklediğimizde",
      "bu buton doğrudan ilgili kartın fanını %100’e çekecek.",
    ].join("\n");

    alert(msg);
  });
}

async function refreshPanel() {
  const refreshBtn = document.getElementById("btn-refresh");
  const lastUpdateLabel = document.getElementById("last-update-label");

  try {
    refreshBtn.disabled = true;
    refreshBtn.textContent = "Yükleniyor…";

    const [rigData, outbox] = await Promise.all([
      fetchJSON("rigs.json"),
      fetchJSON("outbox.json"),
    ]);

    const rigs = rigData.rigs || [];

    updateSummaryCards(rigs);
    buildRigCards(rigs);
    updateAISummaryFromOutbox(outbox);
    renderLogList(outbox);

    const now = new Date();
    lastUpdateLabel.textContent =
      "⏱️ Son güncelleme: " +
      now.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });
  } catch (err) {
    console.error("Panel yenileme hatası:", err);
    lastUpdateLabel.textContent = "⏱️ Son güncelleme: hata";
  } finally {
    refreshBtn.disabled = false;
    refreshBtn.innerHTML = "<span>🔄</span> Yenile";
  }
}

function initAutoRefresh() {
  // Hafif: her 60 sn’de bir rigs/outbox çek
  setInterval(refreshPanel, 60000);
}

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("btn-refresh").addEventListener("click", refreshPanel);
  initModalEvents();
  initAutoRefresh();
  refreshPanel();
});
