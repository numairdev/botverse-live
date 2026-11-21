const dns = require('dns');
dns.setDefaultResultOrder('ipv4first');

require('dotenv').config();
const botProfiles = require('./bots');
const { generateMessage } = require('./generator');

const token = process.env.BOT_TOKEN?.trim();
const groupChatId = process.env.GROUP_CHAT_ID?.trim();
const adminUserId = Number(process.env.ADMIN_USER_ID);
const proxyUrl = process.env.PROXY_URL?.trim();
let intervalMs = Number(process.env.DEFAULT_INTERVAL_MS) || 4000;

if (!token) {
  console.error("❌ Error: BOT_TOKEN .env file mein missing hai!");
  process.exit(1);
}

// Optional ProxyAgent (agar .env mein PROXY_URL diya ho)
let dispatcher = null;
if (proxyUrl) {
  try {
    const { ProxyAgent } = require('undici');
    dispatcher = new ProxyAgent(proxyUrl);
    console.log(`🌐 Using proxy: ${proxyUrl}`);
  } catch (err) {
    console.warn("⚠️ ProxyAgent load nahi ho saka:", err.message);
  }
}

const API_BASE = `https://api.telegram.org/bot${token}`;

let isRunning = false;
let timer = null;
let messageCount = 0;
let lastMessageContext = null;
let pollingOffset = 0;
let isPolling = true;

async function tgApi(method, body = {}) {
  const fetchOptions = {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(15000)
  };

  if (dispatcher) {
    fetchOptions.dispatcher = dispatcher;
  }

  const res = await fetch(`${API_BASE}/${method}`, fetchOptions);
  const data = await res.json();

  if (!data.ok) {
    const err = new Error(data.description || `Telegram API error on ${method}`);
    err.code = data.error_code;
    err.retryAfter = data.parameters?.retry_after;
    throw err;
  }
  return data.result;
}

function formatBotMessage(profile, text) {
  return `${profile.emoji} <b>${profile.name}</b>\n${text}`;
}

function isAdmin(msg) {
  if (!adminUserId) return true;
  return msg.from && msg.from.id === adminUserId;
}

async function handleCommand(msg) {
  if (!msg.text) return;
  const text = msg.text.trim();
  const chatId = msg.chat.id;

  if (!text.startsWith('/')) {
    console.log(`ℹ️ Msg from ${msg.from?.first_name || 'Unknown'} (User ID: ${msg.from?.id}) | Chat ID: ${chatId}`);
    return;
  }

  if (!isAdmin(msg)) return;

  const cmd = text.split(/\s+/)[0].toLowerCase().split('@')[0];
  const arg = text.split(/\s+/)[1];

  try {
    if (cmd === '/start') {
      const started = startEngine();
      await tgApi('sendMessage', {
        chat_id: chatId,
        parse_mode: 'HTML',
        text: started
          ? `🟢 <b>BOTVERSE LIVE Started!</b>\nActive Personas: ${botProfiles.length}\nSpeed: ~${(intervalMs / 1000).toFixed(1)}s`
          : `⚡ Engine pehle se chal raha hai!`
      });
    } else if (cmd === '/stop') {
      const stopped = stopEngine();
      await tgApi('sendMessage', {
        chat_id: chatId,
        parse_mode: 'HTML',
        text: stopped ? `🔴 <b>BOTVERSE LIVE Stopped.</b>` : `⏸️ Engine pehle se ruka hua hai.`
      });
    } else if (cmd === '/status') {
      await tgApi('sendMessage', {
        chat_id: chatId,
        parse_mode: 'HTML',
        text:
          `📊 <b>BOTVERSE LIVE Status</b>\n` +
          `• State: ${isRunning ? '🟢 RUNNING' : '🔴 STOPPED'}\n` +
          `• Total Bots: ${botProfiles.length}\n` +
          `• Messages Sent: ${messageCount}\n` +
          `• Interval: ${(intervalMs / 1000).toFixed(1)} sec`
      });
    } else if (cmd === '/speed') {
      const seconds = Number(arg);
      if (!seconds || seconds < 3) {
        await tgApi('sendMessage', {
          chat_id: chatId,
          parse_mode: 'HTML',
          text: `⚠️ Istemaal: <code>/speed 5</code> (minimum <b>3 seconds</b> rakhein).`
        });
        return;
      }
      intervalMs = seconds * 1000;
      await tgApi('sendMessage', {
        chat_id: chatId,
        parse_mode: 'HTML',
        text: `⏱️ Speed updated: Ab har <b>${seconds} seconds</b> baad message jayega.`
      });
    }
  } catch (err) {
    console.error('❌ Command Error:', err.message);
  }
}

async function pollUpdates() {
  while (isPolling) {
    try {
      const updates = await tgApi('getUpdates', {
        offset: pollingOffset,
        timeout: 25
      });

      for (const update of updates) {
        pollingOffset = update.update_id + 1;
        if (update.message) {
          await handleCommand(update.message);
        }
      }
    } catch (err) {
      const causeCode = err?.cause?.code || err?.name || '';
      console.warn(`⚠️ Polling retry (${err.message}${causeCode ? ` -> ${causeCode}` : ''})`);
      await new Promise((r) => setTimeout(r, 3000));
    }
  }
}

async function tick() {
  if (!isRunning) return;

  if (!groupChatId) {
    console.error("❌ Error: GROUP_CHAT_ID .env file mein set nahi hai! Group mein koi message bhejo taake Chat ID dekh sako.");
    stopEngine();
    return;
  }

  let selectedBot;
  do {
    selectedBot = botProfiles[Math.floor(Math.random() * botProfiles.length)];
  } while (lastMessageContext && selectedBot.id === lastMessageContext.bot.id);

  const text = generateMessage(selectedBot, lastMessageContext);
  const formatted = formatBotMessage(selectedBot, text);

  try {
    await tgApi('sendMessage', {
      chat_id: groupChatId,
      text: formatted,
      parse_mode: 'HTML'
    });
    messageCount++;
    lastMessageContext = { bot: selectedBot, text };
    console.log(`[#${messageCount}] ${selectedBot.name}: ${text}`);
  } catch (err) {
    if (err.code === 429) {
      const waitSec = err.retryAfter || 10;
      console.warn(`⚠️ Rate limit hit! Pausing for ${waitSec}s...`);
      clearTimeout(timer);
      timer = setTimeout(tick, waitSec * 1000);
      return;
    }

    const causeCode = err?.cause?.code || '';
    console.error(`❌ Send Error: ${err.message}${causeCode ? ` (${causeCode})` : ''}`);
  }

  const jitter = Math.floor(Math.random() * 1000) - 500;
  const nextDelay = Math.max(3000, intervalMs + jitter);
  timer = setTimeout(tick, nextDelay);
}

function startEngine() {
  if (isRunning) return false;
  isRunning = true;
  tick();
  return true;
}

function stopEngine() {
  if (!isRunning) return false;
  isRunning = false;
  clearTimeout(timer);
  return true;
}

process.on('unhandledRejection', (reason) => {
  console.error('⚠️ Unhandled Rejection:', reason?.message || reason);
});

console.log("🚀 BOTVERSE LIVE Controller initialized. Group mein /start bhejein!");
pollUpdates();