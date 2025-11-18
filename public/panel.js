// =====================================================
// GPU Çoban Panel.js – Minimal v1.0
// rigs.json -> Summary + Rig List + Alerts
// =====================================================

async function loadRigs() {
    try {
        const res = await fetch("rigs.json", { cache: "no-store" });
        const data = await res.json();

        if (!data || !data.rigs) {
            console.error("rigs.json boş veya hatalı.");
            return;
        }

        const rigs = data.rigs;

        updateSummary(rigs);
        renderRigList(rigs);
        renderAlerts(rigs);

    } catch (err) {
        console.error("Rigs yüklenemedi:", err);
    }
}

// =====================================================
// 1) GENEL DURUM (SUMMARY)
// =====================================================

function updateSummary(rigs) {
    let totalRigs = rigs.length;
    let totalGpus = 0;
    let totalHash = 0;
    let totalPower = 0;
    let tempSum = 0;
    let tempCount = 0;
    let isolated = 0;

    rigs.forEach(rig => {
        totalGpus += rig.gpus.length;
        rig.gpus.forEach(g => {
            totalHash += g.hash_mhs || 0;
            totalPower += g.power_w || 0;
            tempSum += g.temp_c || 0;
            tempCount++;
            if (g.status === "isolated") isolated++;
        });
    });

    let avgTemp = tempCount > 0 ? (tempSum / tempCount).toFixed(1) : 0;

    const summary = `
        <div>Toplam Rig: <b>${totalRigs}</b></div>
        <div>Toplam GPU: <b>${totalGpus}</b> (İzole: ${isolated})</div>
        <div>Toplam Hashrate: <b>${(totalHash).toFixed(1)} MH/s</b></div>
        <div>Toplam Güç: <b>${totalPower} W</b></div>
        <div>Ortalama Sıcaklık: <b>${avgTemp}°C</b></div>
    `;

    document.getElementById("summary").innerHTML = summary;
}

// =====================================================
// 2) RIG LİSTESİ
// =====================================================

function renderRigList(rigs) {
    const area = document.getElementById("rig-list");
    area.innerHTML = "";

    rigs.forEach(rig => {
        const hash = sumHash(rig.gpus);
        const power = sumPower(rig.gpus);
        const temp = avgTemp(rig.gpus);

        const statusClass = rig.warnings.length > 0 ? "warn" : "ok";
        const statusText = statusClass === "ok" ? "OK" : "Uyarı";

        const item = `
            <div class="rig-item">
                <div>
                    <div><b>${rig.name}</b></div>
                    <div style="font-size:12px;color:#8b949e;">
                        ${rig.gpus.length} GPU · Son görüldü: ${timeAgo(rig.last_seen)}
                    </div>
                </div>

                <div style="text-align:right;">
                    <div>${hash} MH/s</div>
                    <div>${power} W</div>
                    <div>${temp}°C</div>
                </div>

                <div class="badge ${statusClass}">${statusText}</div>
            </div>
        `;

        area.insertAdjacentHTML("beforeend", item);
    });
}

// =====================================================
// 3) UYARI PANELİ
// =====================================================

function renderAlerts(rigs) {
    const alertsDiv = document.getElementById("alerts");
    alertsDiv.innerHTML = "";

    let count = 0;

    rigs.forEach(rig => {
        rig.warnings.forEach(w => {
            const item = `
                <div style="margin-bottom:6px;">
                    <b>${rig.name}</b>: ${w}
                    <div style="font-size:12px;color:#8b949e;">
                        ${timeAgo(rig.last_seen)}
                    </div>
                </div>
            `;
            alertsDiv.insertAdjacentHTML("beforeend", item);
            count++;
        });
    });

    if (count === 0) {
        alertsDiv.innerHTML = "<i>Hiç uyarı yok.</i>";
    }
}

// =====================================================
// Yardımcılar
// =====================================================

function sumHash(gpus) {
    return gpus.reduce((a, g) => a + (g.hash_mhs || 0), 0).toFixed(1);
}

function sumPower(gpus) {
    return gpus.reduce((a, g) => a + (g.power_w || 0), 0);
}

function avgTemp(gpus) {
    const sum = gpus.reduce((a, g) => a + (g.temp_c || 0), 0);
    return (sum / gpus.length).toFixed(1);
}

function timeAgo(ts) {
    const diff = (Date.now() - new Date(ts)) / 1000;
    if (diff < 60) return `${Math.floor(diff)} sn önce`;
    if (diff < 3600) return `${Math.floor(diff / 60)} dk önce`;
    return `${Math.floor(diff / 3600)} saat önce`;
}

// =====================================================
// PANELİ ÇALIŞTIR
// =====================================================

loadRigs();
setInterval(loadRigs, 10000);
