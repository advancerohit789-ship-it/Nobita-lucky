/**
 * X NOBITA XD — Gemini AI command.
 * Uses the panel GEMINI_API_KEY variable first, then the bundled fallback key.
 * For security, keep this ZIP private if the fallback key is enabled.
 */
const axios = require('axios');
const MODEL = process.env.GEMINI_MODEL || 'gemini-1.5-flash';
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;
const FALLBACK_API_KEY = 'AQ.Ab8RN6InlsrZ8Pr83M-QMRXalD9d94daGKAfE83Az9E9f0ommg';

module.exports = {
  name: 'gemini',
  aliases: ['gem'],
  category: 'ai',
  description: 'Ask Google Gemini AI',
  usage: '.gemini <question>',
  async execute(sock, msg, args, extra) {
    const prompt = args.join(' ').trim();
    if (!prompt) return extra.reply('💗 𝐔sᴀɢᴇ: .gemini <question> 🌸');

    const apiKey = (process.env.GEMINI_API_KEY || FALLBACK_API_KEY || '').trim();
    if (!apiKey) {
      return extra.reply('🥀 𝐆ᴇᴍɪɴɪ 𝐀𝐏𝐈 𝐊ᴇʏ ɴᴏᴛ sᴇᴛ! Add GEMINI_API_KEY in panel variables. 💗');
    }

    try {
      const response = await axios.post(
        `${ENDPOINT}?key=${encodeURIComponent(apiKey)}`,
        {
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.7, maxOutputTokens: 1024 }
        },
        { timeout: 45000, headers: { 'Content-Type': 'application/json' } }
      );

      const answer = response.data?.candidates?.[0]?.content?.parts
        ?.map(part => part.text || '').join('').trim();
      if (answer) return extra.reply(`💗 𝐆ᴇᴍɪɴɪ 𝐀𝐈 🌸\n\n${answer}`);

      const reason = response.data?.promptFeedback?.blockReason;
      return extra.reply(reason
        ? `🥀 𝐆ᴇᴍɪɴɪ 𝐛ʟᴏᴄᴋᴇᴅ ᴛʜɪs ᴘʀᴏᴍᴘᴛ: ${reason} 💗`
        : '🥀 𝐆ᴇᴍɪɴɪ 𝐫ᴇᴛᴜʀɴᴇᴅ ɴᴏ ᴀɴsᴡᴇʀ. Try again, dear! 💗');
    } catch (error) {
      const status = error.response?.status;
      const detail = error.response?.data?.error?.message || error.message || 'Request failed';
      console.error('[GEMINI]', status || '', detail);
      if (status === 400 || status === 401 || status === 403) {
        return extra.reply(`🥀 𝐆ᴇᴍɪɴɪ 𝐀𝐏𝐈 𝐊ᴇʏ/𝐀𝐏𝐈 𝐄ʀʀᴏʀ: ${String(detail).slice(0, 180)}\nCheck that the key is valid and Gemini API is enabled. 💗`);
      }
      if (status === 429) return extra.reply('🥀 𝐆ᴇᴍɪɴɪ 𝐪ᴜᴏᴛᴀ ᴏʀ ʀᴀᴛᴇ ʟɪᴍɪᴛ ʀᴇᴀᴄʜᴇᴅ. Try again later. 💗');
      return extra.reply(`🥀 𝐆ᴇᴍɪɴɪ 𝐀𝐈 𝐄ʀʀᴏʀ: ${String(detail).slice(0, 180)} 💗`);
    }
  }
};
