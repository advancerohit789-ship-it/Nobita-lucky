// Minimal source command handler. Removed Check Zone, Roast & Reaction, Social,
// Mini Games, Text Tools, Media Fun, and Audio FX command implementations.
function pick(items) { return items[Math.floor(Math.random() * items.length)]; }
function pct() { return Math.floor(Math.random() * 101); }
function bold(s) { return `*${s}*`; }
function mention(jid) { return `@${String(jid || "").split("@")[0].split(":")[0]}`; }
function jidOf(msg) { return msg?.key?.participant || msg?.participant || msg?.key?.senderPn || msg?.key?.senderLid || msg?.key?.remoteJid || ""; }
function targetOf(msg) {
  const mentioned = msg?.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
  return mentioned[0] || jidOf(msg);
}
async function handleSourceCommand(command, args, { msg, sock }) {
  if (command !== "ship") return null;
  const chat = msg.key.remoteJid;
  const user = mention(jidOf(msg));
  if (!chat?.endsWith("@g.us")) return { text: `💞 ${bold("SHIP MATCH")} — 👤 ${user}\n⚠️ ${bold("Group only")} 🌸` };
  const metadata = await sock.groupMetadata(chat);
  const members = (metadata.participants || []).filter(p => !p.admin && p.id);
  if (members.length < 2) return { text: `💞 ${bold("SHIP MATCH")} — 👤 ${user}\n⚠️ ${bold("Not enough members")} 🌸` };
  const p1 = pick(members);
  const p2 = pick(members.filter(x => x.id !== p1.id));
  return { text: `💞 ${bold("SHIP MATCH")} — 👥 ${mention(p1.id)} × ${mention(p2.id)}\n💗 ${bold(`Compatibility : ${pct()}%`)} 🌸`, mentions: [p1.id, p2.id] };
}
async function handleMediaCommand() { return null; }
module.exports = { handleSourceCommand, handleMediaCommand };
