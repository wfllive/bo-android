export function getAppConfig() {
  const globalConfig = typeof window !== 'undefined' && window.APP_CONFIG ? window.APP_CONFIG : {};
  return {
    lightningWsUrl: globalConfig.lightningWsUrl || null
  };
}