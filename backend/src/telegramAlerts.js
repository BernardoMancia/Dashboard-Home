import { getState } from "./store.js";

const THRESHOLDS = {
  cpu: 70,
  ram: 70,
  temp: 60,
  tempCritical: 90,
  stepCpuRam: 5,
  stepTemp: 1,
};

let botToken = "";
let chatId = "";
let sendRebootFn = null;

let lastAlertCpu = null;
let lastAlertRam = null;
let lastAlertTemp = null;
let wasOffline = false;
let tempHistory = [];
let pollOffset = 0;
let pollTimer = null;

export function initTelegramAlerts(token, groupId, rebootFn) {
  botToken = token;
  chatId = groupId;
  sendRebootFn = rebootFn;

  if (!botToken || !chatId) {
    console.log("[Telegram] Token ou Chat ID não configurado, alertas desativados");
    return;
  }

  console.log("[Telegram] Alertas ativados");
  setInterval(checkMetrics, 10000);
  startCallbackPolling();
}

async function sendMessage(text, replyMarkup) {
  try {
    const body = {
      chat_id: chatId,
      text,
      parse_mode: "HTML",
    };
    if (replyMarkup) {
      body.reply_markup = JSON.stringify(replyMarkup);
    }
    const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!data.ok) console.error("[Telegram] Erro ao enviar:", data.description);
  } catch (err) {
    console.error("[Telegram] Falha na comunicação:", err.message);
  }
}

async function answerCallback(callbackId, text) {
  try {
    await fetch(`https://api.telegram.org/bot${botToken}/answerCallbackQuery`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ callback_query_id: callbackId, text, show_alert: true }),
    });
  } catch {}
}

function restartButton() {
  return {
    inline_keyboard: [[{ text: "🔄 Reiniciar Raspberry Pi", callback_data: "reboot_rpi" }]],
  };
}

function formatTimestamp() {
  return new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
}

function getTempChangeLastHour() {
  const now = Date.now();
  const oneHourAgo = now - 3600000;
  const recent = tempHistory.filter((e) => e.ts >= oneHourAgo);
  if (recent.length < 2) return null;
  const oldest = recent[0].val;
  const newest = recent[recent.length - 1].val;
  return +(newest - oldest).toFixed(1);
}

function checkMetrics() {
  const state = getState();

  if (!state.connected) {
    if (!wasOffline) {
      wasOffline = true;
      sendMessage(
        `🔴 <b>ALERTA: Raspberry Pi OFFLINE</b>\n\n` +
        `O Raspberry Pi está inacessível.\n` +
        `⏰ ${formatTimestamp()}`
      );
    }
    return;
  }

  if (wasOffline) {
    wasOffline = false;
    sendMessage(
      `🟢 <b>Raspberry Pi ONLINE</b>\n\n` +
      `Conexão restabelecida.\n` +
      `⏰ ${formatTimestamp()}`
    );
  }

  const { cpuUsage, ram, temperature } = state.system;
  const cpuPct = Math.round(cpuUsage || 0);
  const ramPct = Math.round(ram?.percent || 0);
  const temp = Math.round(temperature || 0);

  tempHistory.push({ ts: Date.now(), val: temp });
  const cutoff = Date.now() - 3600000;
  tempHistory = tempHistory.filter((e) => e.ts >= cutoff);

  checkCpu(cpuPct);
  checkRam(ramPct);
  checkTemp(temp);
}

function checkCpu(pct) {
  if (pct < THRESHOLDS.cpu) {
    if (lastAlertCpu !== null && lastAlertCpu >= THRESHOLDS.cpu) {
      sendMessage(
        `✅ <b>CPU normalizada</b>\n\n` +
        `📉 CPU: <b>${pct}%</b> (abaixo de ${THRESHOLDS.cpu}%)\n` +
        `⏰ ${formatTimestamp()}`
      );
    }
    lastAlertCpu = pct;
    return;
  }

  if (lastAlertCpu === null || lastAlertCpu < THRESHOLDS.cpu) {
    lastAlertCpu = pct;
    sendMessage(
      `⚠️ <b>ALERTA: CPU Alta</b>\n\n` +
      `📊 CPU: <b>${pct}%</b>\n` +
      `⏰ ${formatTimestamp()}`,
      restartButton()
    );
    return;
  }

  const step = THRESHOLDS.stepCpuRam;
  const lastStep = Math.floor(lastAlertCpu / step) * step;
  const currentStep = Math.floor(pct / step) * step;

  if (currentStep !== lastStep) {
    const direction = pct > lastAlertCpu ? "📈 Subindo" : "📉 Descendo";
    const emoji = pct > lastAlertCpu ? "🔴" : "🟡";
    const msg =
      `${emoji} <b>CPU ${direction}</b>\n\n` +
      `📊 CPU: <b>${pct}%</b> (anterior: ${lastAlertCpu}%)\n` +
      `⏰ ${formatTimestamp()}`;

    if (pct > lastAlertCpu) {
      sendMessage(msg, restartButton());
    } else {
      sendMessage(msg);
    }
    lastAlertCpu = pct;
  }
}

function checkRam(pct) {
  if (pct < THRESHOLDS.ram) {
    if (lastAlertRam !== null && lastAlertRam >= THRESHOLDS.ram) {
      sendMessage(
        `✅ <b>RAM normalizada</b>\n\n` +
        `📉 RAM: <b>${pct}%</b> (abaixo de ${THRESHOLDS.ram}%)\n` +
        `⏰ ${formatTimestamp()}`
      );
    }
    lastAlertRam = pct;
    return;
  }

  if (lastAlertRam === null || lastAlertRam < THRESHOLDS.ram) {
    lastAlertRam = pct;
    sendMessage(
      `⚠️ <b>ALERTA: RAM Alta</b>\n\n` +
      `💾 RAM: <b>${pct}%</b>\n` +
      `⏰ ${formatTimestamp()}`,
      restartButton()
    );
    return;
  }

  const step = THRESHOLDS.stepCpuRam;
  const lastStep = Math.floor(lastAlertRam / step) * step;
  const currentStep = Math.floor(pct / step) * step;

  if (currentStep !== lastStep) {
    const direction = pct > lastAlertRam ? "📈 Subindo" : "📉 Descendo";
    const emoji = pct > lastAlertRam ? "🔴" : "🟡";
    const msg =
      `${emoji} <b>RAM ${direction}</b>\n\n` +
      `💾 RAM: <b>${pct}%</b> (anterior: ${lastAlertRam}%)\n` +
      `⏰ ${formatTimestamp()}`;

    if (pct > lastAlertRam) {
      sendMessage(msg, restartButton());
    } else {
      sendMessage(msg);
    }
    lastAlertRam = pct;
  }
}

function checkTemp(temp) {
  if (temp >= THRESHOLDS.tempCritical) {
    sendMessage(
      `🚨 <b>CRÍTICO: Temperatura ${temp}°C — REINICIANDO!</b>\n\n` +
      `🌡 Temperatura atingiu ${THRESHOLDS.tempCritical}°C.\n` +
      `O Raspberry Pi será reiniciado automaticamente.\n` +
      `⏰ ${formatTimestamp()}`
    );
    if (sendRebootFn) sendRebootFn();
    return;
  }

  if (temp < THRESHOLDS.temp) {
    if (lastAlertTemp !== null && lastAlertTemp >= THRESHOLDS.temp) {
      sendMessage(
        `✅ <b>Temperatura normalizada</b>\n\n` +
        `📉 Temp: <b>${temp}°C</b> (abaixo de ${THRESHOLDS.temp}°C)\n` +
        `⏰ ${formatTimestamp()}`
      );
    }
    lastAlertTemp = temp;
    return;
  }

  if (lastAlertTemp === null || lastAlertTemp < THRESHOLDS.temp) {
    lastAlertTemp = temp;
    const change = getTempChangeLastHour();
    let extra = "";
    if (change !== null) {
      extra = `\n📊 Variação última hora: <b>${change > 0 ? "+" : ""}${change}°C</b>`;
    }
    sendMessage(
      `🌡 <b>ALERTA: Temperatura Alta</b>\n\n` +
      `🌡 Temp: <b>${temp}°C</b>${extra}\n` +
      `⏰ ${formatTimestamp()}`,
      restartButton()
    );
    return;
  }

  const diff = Math.abs(temp - lastAlertTemp);
  if (diff >= THRESHOLDS.stepTemp) {
    const direction = temp > lastAlertTemp ? "📈 Subindo" : "📉 Descendo";
    const emoji = temp > lastAlertTemp ? "🔴" : "🟡";
    const change = getTempChangeLastHour();
    let extra = "";
    if (change !== null && temp > lastAlertTemp) {
      extra = `\n📊 Variação última hora: <b>${change > 0 ? "+" : ""}${change}°C</b>`;
    }
    const msg =
      `${emoji} <b>Temperatura ${direction}</b>\n\n` +
      `🌡 Temp: <b>${temp}°C</b> (anterior: ${lastAlertTemp}°C)${extra}\n` +
      `⏰ ${formatTimestamp()}`;

    if (temp > lastAlertTemp) {
      sendMessage(msg, restartButton());
    } else {
      sendMessage(msg);
    }
    lastAlertTemp = temp;
  }
}

function startCallbackPolling() {
  async function poll() {
    try {
      const res = await fetch(
        `https://api.telegram.org/bot${botToken}/getUpdates?offset=${pollOffset}&timeout=30&allowed_updates=["callback_query"]`,
        { signal: AbortSignal.timeout(35000) }
      );
      const data = await res.json();
      if (data.ok && data.result.length > 0) {
        for (const update of data.result) {
          pollOffset = update.update_id + 1;
          if (update.callback_query?.data === "reboot_rpi") {
            const user = update.callback_query.from;
            const name = user.first_name || user.username || "Desconhecido";
            await answerCallback(update.callback_query.id, "🔄 Reiniciando Raspberry Pi...");
            sendMessage(
              `🔄 <b>Reinício solicitado</b>\n\n` +
              `👤 Por: <b>${name}</b>\n` +
              `⏰ ${formatTimestamp()}\n\n` +
              `O Raspberry Pi será reiniciado em instantes.`
            );
            if (sendRebootFn) sendRebootFn();
          }
        }
      }
    } catch {}
    pollTimer = setTimeout(poll, 1000);
  }
  poll();
}

export function stopPolling() {
  if (pollTimer) clearTimeout(pollTimer);
}
