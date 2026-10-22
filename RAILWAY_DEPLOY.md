# X NOBITA XD — Multi Pair Setup

## Telegram settings (no .env file required)
Open `telegram.js` and edit the settings near the top:
- `OWNER_TELEGRAM_IDS`: add your numeric Telegram user ID(s), e.g. `["123456789"]`.
- `TELEGRAM_BOT_TOKEN`: your Telegram BotFather token.
- `WA_CHANNEL_LINK`: WhatsApp channel link.
- `GROUP_INVITE_LINK`: optional Telegram group invite link.

Find your numeric Telegram ID by messaging `@userinfobot` on Telegram. Replace `PUT_YOUR_TELEGRAM_ID_HERE` before using `/delpair`; until then, `/delpair` stays locked.

## Start
`npm start`

## Telegram pairing
Use in the official Telegram pairing group:
`/pair 919876543210`

Only the Telegram user IDs listed in `OWNER_TELEGRAM_IDS` can run `/delpair`.

Each paired number is stored under `sessions/<number>/` and runs as an independent WhatsApp session.

## Persistence
Attach a Railway Volume and mount it at the project working directory (or the directory used by the service). The `sessions/` and `data/` directories must persist across restarts/deploys if you want paired sessions and settings to survive.
