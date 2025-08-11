# Blitzortung Expo (SDK 53)

- React Native Expo app that visualizes Blitzortung lightning strikes on a map in near real-time.
- Data source: JSON-RPC service: `http://bo-service.tryb.de/`.
- Map rendering: MapLibre GL JS inside WebView (no API keys required).

## Prerequisites
- Node.js 18+
- Android SDK + emulator or Android device with USB debugging

## Config
- Optional: Change `expo.extra.blitz.serviceUrl` in `app.json`.

## Install
```
npm install
```

## Run (Android)
- Expo Go is sufficient (no native map module required).
```
npm run android
```

If you need a native build, you can still run:
```
npx expo prebuild -p android
npx expo run:android
```

## What it does
- Calls `get_strikes` via JSON-RPC:
  - Initial: `[intervalMinutes, 0]`
  - Incremental: `[intervalMinutes, nextId]` every 5s
- Parses `t` (format `yyyyMMdd'T'HH:mm:ss`) and `s` arrays, same as original app
- Sends strikes to the embedded MapLibre GL JS page, which renders markers and keeps only the last 60 minutes

## Files
- `App.tsx`: WebView + data fetching and incremental updates
- `app.json`: Android permissions, cleartext HTTP, service URL

## Notes
- No API key is needed. Style: `https://demotiles.maplibre.org/style.json`.
- Cleartext HTTP is enabled to allow `http://bo-service.tryb.de/`.