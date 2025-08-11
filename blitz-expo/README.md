# Blitzortung Expo (SDK 53)

- React Native Expo app that visualizes Blitzortung lightning strikes on a map in near real-time.
- Data source: JSON-RPC service used by the original Android app (`bo-android`): `http://bo-service.tryb.de/`.

## Prerequisites
- Node.js 18+
- Android SDK + emulator or Android device with USB debugging
- Google Maps API key for Android

## Config
1) Open `app.json` and replace both occurrences of `YOUR_ANDROID_GOOGLE_MAPS_KEY` with your real Android Maps key.
2) Optional: Change `expo.extra.blitz.serviceUrl` to another compatible service if needed.

## Install
```
npm install
```

## Prebuild (native code)
```
npx expo prebuild -p android
```

This applies config plugins (expo-maps, cleartext traffic for HTTP).

## Run (Android)
- Start an emulator or connect a device.
```
# If you want dev client
npx expo run:android

# Or use Expo Go (not recommended for expo-maps)
npm run android
```

If you see SDK errors about Android SDK location, set `ANDROID_HOME` or create `android/local.properties` with your SDK path.

## What it does
- Calls `get_strikes` via JSON-RPC:
  - Initial: `[intervalMinutes, 0]`
  - Incremental: `[intervalMinutes, nextId]` every 5s
- Parses `t` (reference time, format `yyyyMMdd'T'HH:mm:ss`) and `s` (strikes array) just like the native app
- Renders markers on the map. Keeps last 60 minutes in memory.

## Files
- `App.tsx`: UI, map, data fetching & incremental updates
- `app.json`: Android permissions, Google Maps config, service URL

## Notes
- The legacy `data.blitzortung.org` endpoints require auth and are not used here. We use the same JSON-RPC path as in `bo-android`.
- Ensure that your device has internet access. Cleartext HTTP is enabled for Android in this project.