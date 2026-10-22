const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "lucky", "commands");
const ALLOWED = new Set(["anime", "textmaker", "ai", "fun", "utility"]);
const BLOCKED = new Set(["loli", "hneko", "milf", "autoreply"]);
const PRESERVE_EXISTING = new Set(["ship", "love", "truth", "dare", "8ball", "joke", "meme", "quiz", "dice", "rps", "guess"]);
const commands = new Map();

for (const category of ALLOWED) {
  const dir = path.join(ROOT, category);
  if (!fs.existsSync(dir)) continue;
  for (const file of fs.readdirSync(dir).filter(x => x.endsWith(".js"))) {
    if (BLOCKED.has(path.basename(file, ".js").toLowerCase())) continue;
    try {
      const mod = require(path.join(dir, file));
      if (!mod || typeof mod.execute !== "function" || !mod.name) continue;
      const entry = { mod, category };
      for (const name of [mod.name, ...(mod.aliases || [])]) {
        const key = String(name).toLowerCase();
        // Preserve existing bot command behavior where names overlap.
        if (!commands.has(key)) commands.set(key, entry);
      }
    } catch (e) {
      console.error(`[LUCKY COMMAND LOAD] ${file}:`, e.message);
    }
  }
}

function styleText(value) {
  let text = String(value ?? "").trim();
  // Do not add a forced bot-name heading to command replies.
  if (text.length > 600) text = text.slice(0, 597) + "...";
  return text;
}

async function handleLuckyCommand(command, args, ctx) {
  const normalized = String(command || "").toLowerCase();
  if (PRESERVE_EXISTING.has(normalized)) return false;
  const entry = commands.get(normalized);
  if (!entry) return false;
  const { sock, msg, quotedContact, runtimeConfig } = ctx;
  const chat = msg.key.remoteJid;
  const extra = {
    from: chat,
    prefix: runtimeConfig?.prefix || ".",
    quotedContact,
    reply: async (text, options = {}) => {
      const cleanText = styleText(text);
      if (!cleanText) return null;
      return sock.sendMessage(chat, {
        text: cleanText,
        ...(options.mentions ? { mentions: options.mentions } : {})
      });
    }
  };
  // Apply the same short romantic style to
  // every WhatsApp message emitted by an imported command (text or media).
  const originalSendMessage = sock.sendMessage;
  sock.sendMessage = async function (jid, content, sendOptions = {}) {
    const outgoing = { ...(content || {}) };
    if (typeof outgoing.text === "string") outgoing.text = styleText(outgoing.text);
    if (typeof outgoing.caption === "string") outgoing.caption = styleText(outgoing.caption);
    // Prevent accidental empty text-only messages (they appear as blank bubbles).
    const hasMedia = ["image", "video", "audio", "document", "sticker", "location", "contact", "contacts", "react", "poll", "buttons", "template", "listMessage"].some(k => outgoing[k] != null);
    if (!hasMedia && typeof outgoing.text === "string" && !outgoing.text.trim()) return null;
    return originalSendMessage.call(this, jid, outgoing, sendOptions || {});
  };
  try {
    await entry.mod.execute(sock, msg, args, extra);
  } finally {
    sock.sendMessage = originalSendMessage;
  }
  return true;
}

function getLuckyCommands() {
  return [...new Set([...commands.values()].map(x => x.mod))]
    .map(mod => ({ name: mod.name, aliases: mod.aliases || [], category: mod.category || "other", description: mod.description || mod.desc || "" }));
}
module.exports = { handleLuckyCommand, getLuckyCommands };
