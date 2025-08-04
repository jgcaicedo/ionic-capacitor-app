import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.jgcaicedo.todoapp',
  appName: 'Todo App',
  webDir: 'www',
  server: {
    androidScheme: 'http'
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: "#3880ff",
      showSpinner: false
    }
  }
};

export default config;
