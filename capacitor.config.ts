import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.rotafacil.turbo',
  appName: 'RotaFacil Turbo',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    url: 'http://localhost:8080/auth/login'
  },
  plugins: {
    Geolocation: {
      permissions: ['ACCESS_COARSE_LOCATION', 'ACCESS_FINE_LOCATION']
    },
    Camera: {
      permissions: ['CAMERA', 'WRITE_EXTERNAL_STORAGE']
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert']
    },
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#3b82f6',
      showSpinner: true,
      spinnerColor: '#ffffff'
    },
    StatusBar: {
      style: 'default',
      backgroundColor: '#3b82f6'
    }
  }
};

export default config;
