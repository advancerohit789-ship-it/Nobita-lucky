const TelegramBot = require("node-telegram-bot-api");
const path = require("path");
const fs = require("fs");

const pairingSessions = new Map();
const pairCooldown = new Map();
const pairingFinalized = new Set();
const PAIR_COOLDOWN_MS = 30_000;
const BRAND = "𝐗 𝐍𝐎𝐁𝐈𝐓𝐀 𝐗𝐃";
const BOT_STARTED_AT = Date.now();
const START_PHOTO = path.join(process.cwd(), "telegram_start.jpg");
const OFFICIAL_PAIR_GROUP_ID = "-1004299700995";
const OFFICIAL_PAIR_GROUP_LINK = "https://t.me/x_nobita_pair_zoon";

// ALL TELEGRAM SETTINGS ARE CONFIGURED HERE — no .env file required.
// Put your numeric Telegram user ID(s) below. Find your ID via @userinfobot.
const OWNER_TELEGRAM_IDS = ["8488798327"];
const TELEGRAM_BOT_TOKEN = "8537474935:AAENmaAp8Hm8giHGqy7lXfIOJxuHrpF0mSE";
const WA_CHANNEL_LINK = "https://whatsapp.com/channel/0029Vb6gE1WHrDZX1MbuPi3G";
const GROUP_INVITE_LINK = "";

function normalizePhone(value) { return String(value || "").replace(/\D/g, ""); }
function isoToFlag(iso) {
  const code = String(iso || "").trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(code)) return "🌍";
  return String.fromCodePoint(...[...code].map(ch => 0x1F1E6 + ch.charCodeAt(0) - 65));
}
function safeSessionId(phone) { return normalizePhone(phone); }
function maskPhone(phone) { const value = String(phone || ""); return value.length > 2 ? `${value.slice(0, 2)}*********` : value; }
function formatPairingCode(value) { const raw = String(value || "").replace(/\s+/g, ""); return raw.match(/.{1,4}/g)?.join("-") || raw; }

const startText = `💗🌷🦋 <b>${BRAND}</b> 🦋🌷💗

🥀💌 <b>𝐘ᴏᴜʀ 𝐋ᴏᴠᴇʟʏ 𝐁ᴏᴛ 𝐂ᴏᴍᴍᴀɴᴅs</b> 💋🧸

💞🌹 /pair &lt;number&gt;
💔🫶🏻 /delpair &lt;number&gt;
💖🦋 /status
⚡💋 /ping
🌸❤️‍🩹 /alive
⏳💗 /uptime
🧸💌 /halp

💘🥀 <i>𝐌ᴀᴅᴇ 𝐖ɪᴛʜ 𝐋ᴏᴠᴇ</i> 💋🌹`;
function startingText(phone) { return `💗🦋 𝐏ᴀɪʀɪɴɢ 𝐒ᴛᴀʀᴛɪɴɢ 🌹💋\n\n📱💌 𝐍ᴜᴍʙᴇʀ: +${esc(phone)}\n⏳🧸 𝐏ʟᴇᴀsᴇ 𝐖ᴀɪᴛ, 𝐌ʏ 𝐋ᴏᴠᴇ 💞`; }
function codeText(code) { return `💘🦋 𝐏ᴀɪʀɪɴɢ 𝐂ᴏᴅᴇ 𝐑ᴇᴀᴅʏ 🥀💋\n\n🔐💗 𝐂ᴏᴅᴇ: <code>${formatPairingCode(code)}</code>\n\n📲🌹 𝐎ᴘᴇɴ 𝐖ʜᴀᴛs𝐀ᴘᴘ → 𝐋ɪɴᴋᴇᴅ 𝐃ᴇᴠɪᴄᴇs\n⚠️💞 𝐍ᴇᴠᴇʀ 𝐒ʜᴀʀᴇ 𝐘ᴏᴜʀ 𝐂ᴏᴅᴇ`; }
const successText = `💚💋 𝐖ʜᴀᴛs𝐀ᴘᴘ 𝐂ᴏɴɴᴇᴄᴛᴇᴅ! 🌹🦋\n\n💗🧸 𝐏ᴀɪʀɪɴɢ 𝐂ᴏᴍᴘʟᴇᴛᴇ\n💘🥀 ${BRAND} 𝐈s 𝐑ᴇᴀᴅʏ 𝐅ᴏʀ 𝐘ᴏᴜ 💞`;
function failedText(phone) { return `💔🥀 𝐏ᴀɪʀɪɴɢ 𝐅ᴀɪʟᴇᴅ ❤️‍🩹\n\n📱💌 𝐍ᴜᴍʙᴇʀ: +${esc(phone)}\n🌹🫶🏻 𝐃ᴏɴ'ᴛ 𝐖ᴏʀʀʏ, 𝐓ʀʏ 𝐀ɢᴀɪɴ 💗\n/pair ${esc(phone)}`; }
function expiredText(phone) { return `🥀💔 𝐏ᴀɪʀɪɴɢ 𝐂ᴏᴅᴇ 𝐄xᴘɪʀᴇᴅ ❤️‍🩹🕊️\n\n💌📱 𝐍ᴜᴍʙᴇʀ: +${esc(phone)}\n⏳🥺 𝐓ʜᴇ 𝐂ᴏᴅᴇ 𝐈s 𝐍ᴏ 𝐋ᴏɴɢᴇʀ 𝐕ᴀʟɪᴅ\n\n🫶🏻🌹 𝐃ᴏɴ'ᴛ 𝐖ᴏʀʀʏ, 𝐓ʀʏ 𝐀ɢᴀɪɴ 💗🧸\n\n💋🔄 /pair ${esc(phone)}\n\n🌸💞 𝐋ᴏᴠᴇ 𝐍ᴇᴠᴇʀ 𝐆ɪᴠᴇs 𝐔ᴘ 🥀💘`; }

const CALLING_CODE_MAP = {
    1: { iso: "US", name: "United States/Canada" },
    7: { iso: "RU", name: "Russia/Kazakhstan" },
    20: { iso: "EG", name: "Egypt" },
    27: { iso: "ZA", name: "South Africa" },
    30: { iso: "GR", name: "Greece" },
    31: { iso: "NL", name: "Netherlands" },
    32: { iso: "BE", name: "Belgium" },
    33: { iso: "FR", name: "France" },
    34: { iso: "ES", name: "Spain" },
    36: { iso: "HU", name: "Hungary" },
    39: { iso: "IT", name: "Italy" },
    40: { iso: "RO", name: "Romania" },
    41: { iso: "CH", name: "Switzerland" },
    43: { iso: "AT", name: "Austria" },
    44: { iso: "GB", name: "United Kingdom" },
    45: { iso: "DK", name: "Denmark" },
    46: { iso: "SE", name: "Sweden" },
    47: { iso: "NO", name: "Norway" },
    48: { iso: "PL", name: "Poland" },
    49: { iso: "DE", name: "Germany" },
    51: { iso: "PE", name: "Peru" },
    52: { iso: "MX", name: "Mexico" },
    53: { iso: "CU", name: "Cuba" },
    54: { iso: "AR", name: "Argentina" },
    55: { iso: "BR", name: "Brazil" },
    56: { iso: "CL", name: "Chile" },
    57: { iso: "CO", name: "Colombia" },
    58: { iso: "VE", name: "Venezuela" },
    60: { iso: "MY", name: "Malaysia" },
    61: { iso: "AU", name: "Australia" },
    62: { iso: "ID", name: "Indonesia" },
    63: { iso: "PH", name: "Philippines" },
    64: { iso: "NZ", name: "New Zealand" },
    65: { iso: "SG", name: "Singapore" },
    66: { iso: "TH", name: "Thailand" },
    81: { iso: "JP", name: "Japan" },
    82: { iso: "KR", name: "South Korea" },
    84: { iso: "VN", name: "Vietnam" },
    86: { iso: "CN", name: "China" },
    90: { iso: "TR", name: "Turkey" },
    91: { iso: "IN", name: "India" },
    92: { iso: "PK", name: "Pakistan" },
    93: { iso: "AF", name: "Afghanistan" },
    94: { iso: "LK", name: "Sri Lanka" },
    95: { iso: "MM", name: "Myanmar" },
    98: { iso: "IR", name: "Iran" },
    211: { iso: "SS", name: "South Sudan" },
    212: { iso: "MA", name: "Morocco" },
    213: { iso: "DZ", name: "Algeria" },
    216: { iso: "TN", name: "Tunisia" },
    218: { iso: "LY", name: "Libya" },
    220: { iso: "GM", name: "Gambia" },
    221: { iso: "SN", name: "Senegal" },
    233: { iso: "GH", name: "Ghana" },
    234: { iso: "NG", name: "Nigeria" },
    254: { iso: "KE", name: "Kenya" },
    255: { iso: "TZ", name: "Tanzania" },
    256: { iso: "UG", name: "Uganda" },
    260: { iso: "ZM", name: "Zambia" },
    263: { iso: "ZW", name: "Zimbabwe" },
    351: { iso: "PT", name: "Portugal" },
    353: { iso: "IE", name: "Ireland" },
    358: { iso: "FI", name: "Finland" },
    380: { iso: "UA", name: "Ukraine" },
    420: { iso: "CZ", name: "Czech Republic" },
    421: { iso: "SK", name: "Slovakia" },
    500: { iso: "FK", name: "Falkland Islands" },
    501: { iso: "BZ", name: "Belize" },
    502: { iso: "GT", name: "Guatemala" },
    505: { iso: "NI", name: "Nicaragua" },
    506: { iso: "CR", name: "Costa Rica" },
    507: { iso: "PA", name: "Panama" },
    591: { iso: "BO", name: "Bolivia" },
    593: { iso: "EC", name: "Ecuador" },
    595: { iso: "PY", name: "Paraguay" },
    598: { iso: "UY", name: "Uruguay" },
    670: { iso: "TL", name: "East Timor" },
    673: { iso: "BN", name: "Brunei" },
    675: { iso: "PG", name: "Papua New Guinea" },
    679: { iso: "FJ", name: "Fiji" },
    850: { iso: "KP", name: "North Korea" },
    852: { iso: "HK", name: "Hong Kong" },
    853: { iso: "MO", name: "Macau" },
    855: { iso: "KH", name: "Cambodia" },
    856: { iso: "LA", name: "Laos" },
    880: { iso: "BD", name: "Bangladesh" },
    886: { iso: "TW", name: "Taiwan" },
    960: { iso: "MV", name: "Maldives" },
    961: { iso: "LB", name: "Lebanon" },
    962: { iso: "JO", name: "Jordan" },
    963: { iso: "SY", name: "Syria" },
    964: { iso: "IQ", name: "Iraq" },
    965: { iso: "KW", name: "Kuwait" },
    966: { iso: "SA", name: "Saudi Arabia" },
    967: { iso: "YE", name: "Yemen" },
    968: { iso: "OM", name: "Oman" },
    971: { iso: "AE", name: "UAE" },
    972: { iso: "IL", name: "Israel" },
    973: { iso: "BH", name: "Bahrain" },
    974: { iso: "QA", name: "Qatar" },
    975: { iso: "BT", name: "Bhutan" },
    977: { iso: "NP", name: "Nepal" },
    992: { iso: "TJ", name: "Tajikistan" },
    993: { iso: "TM", name: "Turkmenistan" },
    994: { iso: "AZ", name: "Azerbaijan" },
    995: { iso: "GE", name: "Georgia" },
    996: { iso: "KG", name: "Kyrgyzstan" },
    998: { iso: "UZ", name: "Uzbekistan" },
    1242: { iso: "BS", name: "Bahamas" },
    1246: { iso: "BB", name: "Barbados" },
    1345: { iso: "KY", name: "Cayman Islands" },
    1868: { iso: "TT", name: "Trinidad and Tobago" },
    1876: { iso: "JM", name: "Jamaica" },
};

const SORTED_CODES = Object.keys(CALLING_CODE_MAP)
    .map(Number)
    .sort((a, b) => String(b).length - String(a).length || b - a);

function detectCountry(digits) {
    if (!digits) return null;
    if (digits.startsWith("00")) digits = digits.slice(2);
    for (const code of SORTED_CODES) {
      if (digits.startsWith(String(code))) {
        const info = CALLING_CODE_MAP[code];
        return { callingCode: code, iso: info.iso, name: info.name };
      }
    }
    return null;
}

function startTelegramPairing() {
  const token = TELEGRAM_BOT_TOKEN;
  if (!token || token === "PASTE_TELEGRAM_BOT_TOKEN_HERE" || /^YOUR_|^$/.test(token)) {
    console.log("ℹ️ Telegram pairing disabled: TELEGRAM_BOT_TOKEN is not set.");
    return null;
  }

  const bot = new TelegramBot(token, { polling: true });

  // Clean up a previous/incomplete pairing socket and stale auth data.
  // This must be defined before /pair uses it.
  async function cleanupPairingSession(sessionId, authDir, removeAuth = true) {
    const oldSock = pairingSessions.get(sessionId);
    try { oldSock?.ws?.terminate?.(); } catch {}
    try { oldSock?.end?.(); } catch {}
    pairingSessions.delete(sessionId);
    if (removeAuth) {
      await fs.promises.rm(authDir, { recursive: true, force: true }).catch(() => {});
    }
  }
  function esc(s = "") {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function safeReply(chatId, text, opts = {}) {
    return bot.sendMessage(chatId, text, {
      parse_mode: "HTML",
      ...opts
    }).catch((e) => {
      console.error("Telegram sendMessage failed:", e?.message || e);
      return null;
    });
  }

  function safeEdit(chatId, messageId, text, opts = {}) {
    return bot.editMessageText(text, {
      chat_id: chatId,
      message_id: messageId,
      parse_mode: "HTML",
      ...opts
    }).catch(() => null);
  }

  function isGroup(msg) {
    return msg?.chat?.type === "group" || msg?.chat?.type === "supergroup";
  }

  function redirectToGroup(chatId, replyToId) {
    const buttons = GROUP_INVITE_LINK
      ? { inline_keyboard: [[{ text: "🌷 Join Telegram Group", url: GROUP_INVITE_LINK }]] }
      : undefined;

    return safeReply(
      chatId,
      `🌸💗 <b>𝐆ʀᴏᴜᴘ 𝐎ɴʟʏ 𝐅ᴇᴀᴛᴜʀᴇ</b> 🧸💋\n\n🥀💌 ${BRAND} 𝐏ᴀɪʀɪɴɢ 𝐖ᴏʀᴋs 𝐈ɴ 𝐀 𝐓ᴇʟᴇɢʀᴀᴍ 𝐆ʀᴏᴜᴘ 💞\n🌹🫶🏻 𝐔sᴇ: <code>/pair 91XXXXXXXXXX</code>`,
      {
        reply_to_message_id: replyToId,
        reply_markup: buttons
      }
    );
  }

  async function sendStart(msg) {
    if (!isGroup(msg)) return redirectToGroup(msg.chat.id, msg.message_id);
    if (fs.existsSync(START_PHOTO)) {
      try {
        return await bot.sendPhoto(msg.chat.id, START_PHOTO, {
          caption: startText,
          parse_mode: "HTML",
          reply_to_message_id: msg.message_id
        });
      } catch {}
    }
    return safeReply(msg.chat.id, startText, { reply_to_message_id: msg.message_id });
  }

  bot.onText(/^\/(start|help|halp)$/i, sendStart);

  bot.onText(/^\/ping$/i, async (msg) => {
    const began = Date.now();
    const sent = await safeReply(msg.chat.id, `⚡💋 <b>𝐏ᴏɴɢ! 𝐌ʏ 𝐋ᴏᴠᴇ, 𝐈'ᴍ 𝐀ʟɪᴠᴇ</b> 💗🦋\n\n🚀💕 𝐒ᴘᴇᴇᴅ: <code>...</code>\n🟢🌹 𝐒ᴛᴀᴛᴜs: 𝐎ɴʟɪɴᴇ\n\n🫶🏻💘 𝐅ᴀsᴛ 𝐋ɪᴋᴇ 𝐘ᴏᴜʀ 𝐇ᴇᴀʀᴛʙᴇᴀᴛ 💓💋`, { reply_to_message_id: msg.message_id });
    if (sent?.message_id) await safeEdit(msg.chat.id, sent.message_id, `⚡💋 <b>𝐏ᴏɴɢ! 𝐌ʏ 𝐋ᴏᴠᴇ, 𝐈'ᴍ 𝐀ʟɪᴠᴇ</b> 💗🦋\n\n🚀💕 𝐒ᴘᴇᴇᴅ: <code>${Date.now() - began} ms</code>\n🟢🌹 𝐒ᴛᴀᴛᴜs: 𝐎ɴʟɪɴᴇ\n\n🫶🏻💘 𝐅ᴀsᴛ 𝐋ɪᴋᴇ 𝐘ᴏᴜʀ 𝐇ᴇᴀʀᴛʙᴇᴀᴛ 💓💋`);
  });

  bot.onText(/^\/alive$/i, (msg) => safeReply(msg.chat.id,
    `🌹💗 <b>𝐘ᴇs, 𝐈'ᴍ 𝐀ʟɪᴠᴇ</b> 🧸💋\n\n🦋💞 ${BRAND} 𝐈s 𝐑ᴜɴɴɪɴɢ\n💌🫶🏻 𝐀ʟᴡᴀʏs 𝐑ᴇᴀᴅʏ 𝐅ᴏʀ 𝐘ᴏᴜ\n\n🥀❤️‍🩹 𝐒ᴇɴᴅɪɴɢ 𝐋ᴏᴠᴇ 𝐖ɪᴛʜ 𝐄ᴠᴇʀʏ 𝐁ᴇᴀᴛ 💓🌷`, { reply_to_message_id: msg.message_id }));

  bot.onText(/^\/uptime$/i, (msg) => {
    const total = Math.floor((Date.now() - BOT_STARTED_AT) / 1000);
    const days = Math.floor(total / 86400), hours = Math.floor((total % 86400) / 3600);
    const minutes = Math.floor((total % 3600) / 60), seconds = total % 60;
    return safeReply(msg.chat.id,
      `⏳💗 <b>𝐔ᴘᴛɪᴍᴇ 𝐑ᴇᴘᴏʀᴛ</b> 🌹🦋\n\n🌷💌 𝐃ᴀʏs: <code>${days}</code>\n🕰️💞 𝐇ᴏᴜʀs: <code>${hours}</code>\n⏱️💋 𝐌ɪɴᴜᴛᴇs: <code>${minutes}</code>\n🕊️💗 𝐒ᴇᴄᴏɴᴅs: <code>${seconds}</code>\n🟢🧸 𝐒ᴛᴀᴛᴜs: 𝐎ɴʟɪɴᴇ\n\n💘🥀 𝐄ᴠᴇʀʏ 𝐒ᴇᴄᴏɴᴅ 𝐈s 𝐒ᴘᴇᴄɪᴀʟ 💗🫶🏻`, { reply_to_message_id: msg.message_id });
  });

  bot.onText(/^\/status$/i, async (msg) => {
    const manager = global.__nobitaSessionManager;
    const sessions = manager?.sessions;
    const activeCount = sessions instanceof Map
      ? [...sessions.values()].filter(s => s.status === "connected" || s.status === "registered").length
      : 0;
    const total = Math.max(0, Math.floor((Date.now() - BOT_STARTED_AT) / 1000));
    const days = Math.floor(total / 86400);
    const hours = Math.floor((total % 86400) / 3600);
    const minutes = Math.floor((total % 3600) / 60);
    const body = `❤️‍🩹 <b>𝐁ᴏᴛ 𝐒ᴛᴀᴛᴜs</b>

🟢 𝐒ᴛᴀᴛᴜs: 𝐎ɴʟɪɴᴇ
📱 𝐒ᴇssɪᴏɴs: ${activeCount}
⏱️ 𝐔ᴘᴛɪᴍᴇ: ${days} 𝐃ʏ ${hours} 𝐇ʀ ${minutes} 𝐌ɪɴ
⚡ 𝐏ɪɴɢ: 𝐑ᴇᴀʟ-𝐓ɪᴍᴇ

🌷 𝐗 Nᴏʙɪᴛᴀ Mᴏᴅᴢ`;
    return safeReply(msg.chat.id, body, { reply_to_message_id: msg.message_id });
  });

  bot.onText(/^\/delpair(?:\s+(.+))?$/i, async (msg, match) => {
    const userId = String(msg.from?.id || "");
    const chatId = msg.chat.id;
    if (!OWNER_TELEGRAM_IDS.includes(userId) || OWNER_TELEGRAM_IDS.includes("PUT_YOUR_TELEGRAM_ID_HERE")) {
      return safeReply(chatId, `💔🔐 <b>𝐎ᴡɴᴇʀ 𝐎ɴʟʏ</b> ❤️‍🩹\n\n🌹 𝐎ɴʟʏ 𝐓ʜᴇ 𝐁ᴏᴛ 𝐎ᴡɴᴇʀ 𝐂ᴀɴ 𝐔sᴇ /delpair 💗`, { reply_to_message_id: msg.message_id });
    }
    if (!isGroup(msg)) return redirectToGroup(chatId, msg.message_id);
    if (String(chatId) !== OFFICIAL_PAIR_GROUP_ID) {
      return safeReply(chatId, `💗🌹 <b>𝐎ғғɪᴄɪᴀʟ 𝐆ʀᴏᴜᴘ 𝐎ɴʟʏ</b> 🦋💋\n\n🥀💌 𝐔sᴇ /delpair 𝐈ɴ 𝐓ʜᴇ 𝐎ғғɪᴄɪᴀʟ 𝐏ᴀɪʀɪɴɢ 𝐆ʀᴏᴜᴘ 💗`, { reply_to_message_id: msg.message_id });
    }
    const phone = normalizePhone(match?.[1] || "");
    if (!/^\d{8,15}$/.test(phone)) return safeReply(chatId, `💗🌹 <b>𝐔sᴀɢᴇ</b> 💋\n\n💔 /delpair &lt;number&gt;\n🧸 𝐄xᴀᴍᴘʟᴇ: <code>/delpair 918788801637</code>`, { reply_to_message_id: msg.message_id });
    const id = safeSessionId(phone), manager = global.__nobitaSessionManager;
    try {
      const authDir = path.join(process.cwd(), "sessions", id);
      await cleanupPairingSession(id, authDir, false);
      pairingFinalized.delete(id);
      if (manager && typeof manager.remove === "function") await manager.remove(id);
      else await fs.promises.rm(authDir, { recursive: true, force: true });
      return safeReply(chatId, `💔🥀 <b>𝐒ᴇssɪᴏɴ 𝐃ᴇʟᴇᴛᴇᴅ</b> ❤️‍🩹🕊️\n\n📱💌 𝐍ᴜᴍʙᴇʀ: <code>+${esc(phone)}</code>\n🧸🌧️ 𝐒ᴇssɪᴏɴ 𝐑ᴇᴍᴏᴠᴇᴅ 𝐒ᴜᴄᴄᴇssғᴜʟʟʏ\n\n🥀💋 𝐒ᴛᴀʏ 𝐒ᴀғᴇ, 𝐒ᴛᴀʏ 𝐂ᴏɴɴᴇᴄᴛᴇᴅ 💗`, { reply_to_message_id: msg.message_id });
    } catch (err) {
      console.error("Telegram delpair error:", err?.message || err);
      return safeReply(chatId, `🥀💔 <b>𝐃ᴇʟᴇᴛɪᴏɴ 𝐅ᴀɪʟᴇᴅ</b> ❤️‍🩹\n\n📱 <code>+${esc(phone)}</code>\n🌷 𝐏ʟᴇᴀsᴇ 𝐓ʀʏ 𝐀ɢᴀɪɴ 💗`, { reply_to_message_id: msg.message_id });
    }
  });

  bot.onText(/^\/pair(?:\s+(.+))?$/i, async (msg, match) => {
    // Pairing codes are only generated inside the official X NOBITA XD group.
    // Any other group/private chat gets redirected to the official group instead.
    if (String(msg.chat?.id || "") !== OFFICIAL_PAIR_GROUP_ID) {
      return safeReply(
        msg.chat.id,
        `💗🌹 <b>𝐗 𝐍𝐎𝐁𝐈𝐓𝐀 𝐗𝐃 𝐏ᴀɪʀɪɴɢ</b> 🦋💋\n\n🥀💌 𝐏ᴀɪʀɪɴɢ 𝐂ᴏᴅᴇ 𝐏ᴇᴛᴇ 𝐎ғғɪᴄɪᴀʟ 𝐆ʀᴏᴜᴘ-এ 𝐀sᴏ 💗🧸\n\n🌷💞 <a href="${OFFICIAL_PAIR_GROUP_LINK}">𝐉ᴏɪɴ 𝐎ғғɪᴄɪᴀʟ 𝐆ʀᴏᴜᴘ 💋</a>`,
        { reply_to_message_id: msg.message_id, disable_web_page_preview: false }
      );
    }

    const userId = String(msg.from?.id || msg.chat.id);
    const remaining = PAIR_COOLDOWN_MS - (Date.now() - (pairCooldown.get(userId) || 0));
    if (remaining > 0) {
      return safeReply(
        msg.chat.id,
        `⏳💗 <b>𝐏ʟᴇᴀsᴇ 𝐖ᴀɪᴛ ${Math.ceil(remaining / 1000)}s</b> 🧸🌹\n\n💌🥀 𝐀 𝐋ɪᴛᴛʟᴇ 𝐏ᴀᴛɪᴇɴᴄᴇ, 𝐌ʏ 𝐋ᴏᴠᴇ 💋`,
        { reply_to_message_id: msg.message_id }
      );
    }

    const rawArg = String(match?.[1] || "").trim();
    const phone = normalizePhone(rawArg);

    if (!phone || !/^\d{8,15}$/.test(phone)) {
      return safeReply(
        msg.chat.id,
        `🥀💔 <b>𝐈ɴᴠᴀʟɪᴅ 𝐏ʜᴏɴᴇ 𝐍ᴜᴍʙᴇʀ</b> ❤️‍🩹\n\n` +
        `💌🌹 𝐔sᴇ 𝐘ᴏᴜʀ 𝐅ᴜʟʟ 𝐍ᴜᴍʙᴇʀ 𝐖ɪᴛʜ 𝐂ᴏᴜɴᴛʀʏ 𝐂ᴏᴅᴇ 💗\n` +
        `🧸💋 𝐄xᴀᴍᴘʟᴇ: <code>/pair 919876543210</code>\n\n` +
        `🦋💞 𝐃ᴏɴ'ᴛ 𝐔sᴇ 𝐓ʜᴇ + 𝐒ɪɢɴ 🥀`,
        { reply_to_message_id: msg.message_id }
      );
    }

    // Do not reject a number just because our local country-code display map
    // does not contain its calling code. WhatsApp/Baileys is the authority for
    // whether the E.164 number can actually receive a pairing code.
    const countryInfo = detectCountry(phone) || {
      callingCode: "",
      iso: "",
      name: "International"
    };

    pairCooldown.set(userId, Date.now());

    const sessionId = safeSessionId(phone);
    const authDir = path.join(process.cwd(), "sessions", sessionId);
    const manager = global.__nobitaSessionManager;

    if (manager?.isRunning(sessionId)) {
      return safeReply(
        msg.chat.id,
        `💚💋 <b>𝐀ʟʀᴇᴀᴅʏ 𝐂ᴏɴɴᴇᴄᴛᴇᴅ</b> 🌹🦋\n\n📱💗 <code>+${esc(phone)}</code> 𝐈s 𝐀ʟʀᴇᴀᴅʏ 𝐑ᴜɴɴɪɴɢ\n💌🧸 𝐔sᴇ /status 𝐓ᴏ 𝐂ʜᴇᴄᴋ`,
        { reply_to_message_id: msg.message_id }
      );
    }

    if (pairingSessions.has(sessionId)) {
      return safeReply(
        msg.chat.id,
        `⏳💞 𝐏ᴀɪʀɪɴɢ 𝐀ʟʀᴇᴀᴅʏ 𝐈ɴ 𝐏ʀᴏɢʀᴇss 🧸\n\n📱💗 <code>+${esc(phone)}</code>\n🌹🥀 𝐏ʟᴇᴀsᴇ 𝐖ᴀɪᴛ 𝐀 𝐋ɪᴛᴛʟᴇ 💋`,
        { reply_to_message_id: msg.message_id }
      );
    }

    await cleanupPairingSession(sessionId, authDir, true);

    if (!manager || typeof manager.start !== "function") {
      return safeReply(
        msg.chat.id,
        failedText(phone),
        { reply_to_message_id: msg.message_id }
      );
    }

    let loadingMsg = null;

    try {
      loadingMsg = await safeReply(
        msg.chat.id,
        `💗🦋 <b>𝐏ᴀɪʀɪɴɢ 𝐂ᴏᴅᴇ 𝐈s 𝐁ᴇɪɴɢ 𝐏ʀᴇᴘᴀʀᴇᴅ</b> 🌹💋\n\n📱💌 <b>𝐍ᴜᴍʙᴇʀ:</b> <code>+${esc(phone)}</code>\n${isoToFlag(countryInfo.iso)}💞 <b>${esc(countryInfo.name)}</b>${countryInfo.callingCode ? ` (+${countryInfo.callingCode})` : ""}\n\n⏳🧸 <i>𝐏ʟᴇᴀsᴇ 𝐖ᴀɪᴛ, 𝐌ʏ 𝐋ᴏᴠᴇ...</i> 💗`,
        { reply_to_message_id: msg.message_id }
      );

      let resolveCode, rejectCode;
      const codePromise = new Promise((resolve, reject) => {
        resolveCode = resolve;
        rejectCode = reject;
      });

      let opened = false;

      const sock = await manager.start(sessionId, {
        skipPairing: false,
        pairedPhone: phone,
        isPairingFlow: true,
        onPairingCode: resolveCode,
        onPairingError: rejectCode,
        onOpen: async () => {
          opened = true;
          pairingFinalized.add(sessionId);
          pairingSessions.delete(sessionId);
          try { manager.register(sessionId); } catch {}

          // If the code message is already present, the watcher below will edit it.
          // Otherwise send a connected confirmation.
        },
        onClose: async (code, detail) => {
          // Always clear the in-memory pairing lock when the pairing socket closes.
          // This prevents a stale "pairing request is already running" message after
          // the linked account logs out or the pairing socket disconnects.
          pairingSessions.delete(sessionId);

          if (!opened && code !== 515 && !pairingFinalized.has(sessionId)) {
            pairingFinalized.add(sessionId);
            await cleanupPairingSession(sessionId, authDir, true);
            const reason = detail?.error?.message || detail?.message || `status ${code || "unknown"}`;
            rejectCode(new Error(reason));
          }
        }
      });

      if (!sock || typeof sock.requestPairingCode !== "function") {
        throw new Error("WhatsApp socket was not created");
      }

      pairingSessions.set(sessionId, sock);

      if (loadingMsg?.message_id) {
        try { await bot.deleteMessage(msg.chat.id, loadingMsg.message_id); } catch {}
      }

      const code = await Promise.race([
        codePromise,
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Pairing code generation timed out")), 30_000)
        )
      ]);

      const formatted = formatPairingCode(code);
      const flag = isoToFlag(countryInfo.iso);

      const pairText =
        `💘🦋 <b>𝐏ᴀɪʀɪɴɢ 𝐂ᴏᴅᴇ 𝐑ᴇᴀᴅʏ</b> 🥀💋\n\n` +
        `💌📱 <b>𝐍ᴜᴍʙᴇʀ:</b> <code>+${esc(phone)}</code>\n` +
        `${flag}💞 <b>𝐂ᴏᴜɴᴛʀʏ:</b> ${esc(countryInfo.name)}${countryInfo.callingCode ? ` (+${countryInfo.callingCode})` : ""}\n\n` +
        `🔐💗 <b>𝐏ᴀɪʀɪɴɢ 𝐂ᴏᴅᴇ:</b> <code>${esc(formatted)}</code>\n\n` +
        `📲🌹 <b>𝐇ᴏᴡ 𝐓ᴏ 𝐂ᴏɴɴᴇᴄᴛ</b>\n` +
        `① 𝐎ᴘᴇɴ 𝐖ʜᴀᴛs𝐀ᴘᴘ 💚\n` +
        `② 𝐒ᴇᴛᴛɪɴɢs → 𝐋ɪɴᴋᴇᴅ 𝐃ᴇᴠɪᴄᴇs 🧸\n` +
        `③ 𝐋ɪɴᴋ 𝐀 𝐃ᴇᴠɪᴄᴇ 💋\n` +
        `④ 𝐄ɴᴛᴇʀ 𝐓ʜᴇ 𝐂ᴏᴅᴇ 💗\n\n` +
        `⏳💞 𝐄xᴘɪʀᴇs 𝐈ɴ ~𝟗𝟎 𝐒ᴇᴄᴏɴᴅs\n` +
        `⚠️🥀 𝐍ᴇᴠᴇʀ 𝐒ʜᴀʀᴇ 𝐘ᴏᴜʀ 𝐂ᴏᴅᴇ!\n\n` +
        `🌷💘 <i>𝐒ᴛᴀʏ 𝐂ᴏɴɴᴇᴄᴛᴇᴅ, 𝐒ᴛᴀʏ 𝐋ᴏᴠᴇᴅ</i> 💋🦋`;

      const pairMsg = await safeReply(
        msg.chat.id,
        pairText,
        {
          reply_to_message_id: msg.message_id,
          disable_web_page_preview: true,
          reply_markup: {
            inline_keyboard: [
              [{ text: "📋 𝑪𝒐𝒑𝒚 𝑪𝒐𝒅𝒆", copy_text: { text: formatted } }],
              []
            ]
          }
        }
      );

      // Miku-style background watcher: edit the same pair message after connection.
      if (pairMsg?.message_id) {
        const msgId = pairMsg.message_id;
        const WATCH_TIMEOUT_MS = 5 * 60 * 1000;

        (async () => {
          try {
            await new Promise((resolve, reject) => {
              const timer = setTimeout(() => {
                manager.removeListener("connected", onConn);
                manager.removeListener("session.deleted", onDel);
                reject(new Error("timeout"));
              }, WATCH_TIMEOUT_MS);

              function onConn(sid) {
                if (sid !== sessionId) return;
                clearTimeout(timer);
                manager.removeListener("connected", onConn);
                manager.removeListener("session.deleted", onDel);
                resolve();
              }

              function onDel(sid) {
                if (sid !== sessionId) return;
                clearTimeout(timer);
                manager.removeListener("connected", onConn);
                manager.removeListener("session.deleted", onDel);
                reject(new Error("deleted"));
              }

              manager.on("connected", onConn);
              manager.on("session.deleted", onDel);

              if (manager.isRunning(sessionId)) {
                onConn(sessionId);
              }
            });

            await safeEdit(
              msg.chat.id,
              msgId,
              `💚💋 <b>𝐖ʜᴀᴛs𝐀ᴘᴘ 𝐂ᴏɴɴᴇᴄᴛᴇᴅ!</b> 🌹🦋\n\n💌📱 𝐍ᴜᴍʙᴇʀ: <code>+${esc(phone)}</code>\n${flag}💞 𝐂ᴏᴜɴᴛʀʏ: <b>${esc(countryInfo.name)}</b>${countryInfo.callingCode ? ` (+${countryInfo.callingCode})` : ""}\n\n🧸💗 𝐘ᴏᴜʀ 𝐁ᴏᴛ 𝐈s 𝐑ᴇᴀᴅʏ 𝐓ᴏ 𝐒ᴘʀᴇᴀᴅ 𝐋ᴏᴠᴇ 💘🥀`,
              { reply_markup: { inline_keyboard: [[]] } }
            );
          } catch {
            await safeEdit(
              msg.chat.id,
              msgId,
              `🥀💔 <b>𝐏ᴀɪʀɪɴɢ 𝐂ᴏᴅᴇ 𝐄xᴘɪʀᴇᴅ</b> ❤️‍🩹🕊️\n\n📱💌 𝐍ᴜᴍʙᴇʀ: <code>+${esc(phone)}</code>\n⏳🥺 𝐓ʜᴇ 𝐂ᴏᴅᴇ 𝐈s 𝐍ᴏ 𝐋ᴏɴɢᴇʀ 𝐕ᴀʟɪᴅ\n\n🫶🏻🌹 𝐃ᴏɴ'ᴛ 𝐖ᴏʀʀʏ, 𝐓ʀʏ 𝐀ɢᴀɪɴ 💗🧸\n\n💋🔄 /pair ${esc(phone)}\n\n🌸💞 𝐋ᴏᴠᴇ 𝐍ᴇᴠᴇʀ 𝐆ɪᴠᴇs 𝐔ᴘ 🥀💘`,
              { reply_markup: { inline_keyboard: [[]] } }
            );
          }
        })();
      }

      // Give the session manager time to emit connection events.
      return pairMsg;
    } catch (error) {
      if (loadingMsg?.message_id) {
        try { await bot.deleteMessage(msg.chat.id, loadingMsg.message_id); } catch {}
      }
      await cleanupPairingSession(sessionId, authDir, true);
      console.error("Telegram pairing error:", error?.message || error);

      if (!pairingFinalized.has(sessionId)) {
        pairingFinalized.add(sessionId);
        return safeReply(
          msg.chat.id,
          `╭━━━〔 ❌ 𝑷𝑨𝑰𝑹 𝑭𝑨𝑰𝑳𝑬𝑫 〕━━━╮\n\n` +
          `📱 𝑵𝒖𝒎𝒃𝒆𝒓 ➜ <code>+${esc(phone)}</code>\n` +
          `💬 𝑹𝒆𝒂𝒔𝒐𝒏 ➜ <i>${esc(error?.message || String(error))}</i>\n\n` +
          `🔁 𝑻𝒓𝒚 𝒂𝒈𝒂𝒊𝒏:\n` +
          `<code>/pair ${esc(phone)}</code>\n\n` +
          `╰━━━━〔 💗 ${BRAND} 〕━━━━╯`,
          { reply_to_message_id: msg.message_id }
        );
      }
    }
  });

  bot.on("polling_error", (error) =>
    console.error("Telegram polling error:", error?.message || error)
  );
  bot.on("error", (error) =>
    console.error("Telegram bot error:", error?.message || error)
  );

  console.log("💗 Telegram romantic command controls for X NOBITA XD are running.");
  return bot;
}

module.exports = { startTelegramPairing };
