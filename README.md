# X-NOBITA-XD-

## Gemini AI command
Add a `GEMINI_API_KEY` environment variable in your hosting panel, then restart the bot. Use `.gemini <question>`. Do not put API keys directly in source code.

Configure the API key in your hosting environment (Railway Variables or Katabump environment variables):

```env
GEMINI_API_KEY=YOUR_NEW_GOOGLE_AI_STUDIO_API_KEY
```

Restart the bot and use `.gemini <question>`. The key is intentionally not embedded in this ZIP. The command uses the Gemini generateContent endpoint configured in `plugins/lucky/commands/ai/gemini.js`.
