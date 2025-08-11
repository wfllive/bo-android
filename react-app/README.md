# Lightning Monitor (React + Webpack)

Мониторинг молний в стиле Blitzortung: карта Leaflet, поток через WebSocket или демо-генератор.

Запуск:

```bash
npm install
npm run dev
```
Откройте `http://localhost:5173`.

Сборка продакшн:

```bash
npm run build
```

Конфиг:
- Рантайм-файл `public/config.js`. Установите `window.APP_CONFIG.lightningWsUrl = 'wss://...'` для реального потока.
- По умолчанию включён демо-режим (случайные молнии).

Структура:
- `src/components/MapView.jsx` — карта Leaflet
- `src/hooks/useLightningStream.js` — поток молний
- `src/components/Controls.jsx` — панель управления