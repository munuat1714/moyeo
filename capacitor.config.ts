import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.moyeotrip.app',
  appName: '모두의 여행',
  webDir: 'android-web',
  server: {
    url: 'https://moyeo.moyo-ra.workers.dev/demo',
    cleartext: false,
    androidScheme: 'https',
  },
  android: {
    allowMixedContent: false,
    backgroundColor: '#ffffff',
  },
}

export default config
