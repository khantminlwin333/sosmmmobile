/**
 * @format
 */
import { useEffect } from 'react';
import {AppRegistry, Alert, Linking, Platform} from 'react-native';
import App from './App.tsx';
import {name as appName} from './app.json';
import messaging from '@react-native-firebase/messaging';
import notifee, { AndroidImportance, AndroidStyle } from '@notifee/react-native';
import remoteConfig from '@react-native-firebase/remote-config';
import DeviceInfo from 'react-native-device-info';

const checkForUpdate = async () => {
  try {
    // Fetch Remote Config values from Firebase
    await remoteConfig().fetchAndActivate();

    await remoteConfig().fetch(0);
    await remoteConfig().activate();
    // Get required values from Remote Config
    // Get the updated minimum version from Firebase
    const minimumVersion = remoteConfig().getValue('minimum_version').asString().replace(/"/g, '');

    const updateUrl = remoteConfig().getValue('update_url').asString();

    // Get the current app version (e.g., "1.0.0")
    const currentVersion = DeviceInfo.getVersion();

    console.log('🔥 Current Version:', currentVersion);
    console.log('🔥 Minimum Version (Remote):', minimumVersion);
    console.log('🔥 Update URL:', updateUrl);

    // Basic string comparison (can improve using semver if needed)
    if (currentVersion < minimumVersion) {
      Alert.alert(
        'New Update Available',
        'Please update to get full features! Thank You!.',
        [
          {
            text: 'Update Now',
            onPress: () => {
              if (updateUrl) {
                Linking.openURL(updateUrl);
              } else {
                console.warn('Update URL not found in Remote Config.');
              }
            },
          },
        ],
        { cancelable: false },
      );
    }
  } catch (error) {
    console.error('Error checking for update:', error);
  }
};

// ✅ Background message handler (app killed or in background)
messaging().setBackgroundMessageHandler(async remoteMessage => {
    try {
      console.log('📥 Background Message:', remoteMessage);
      if (remoteMessage.data?.validate === 'true') {
        console.log('✅ Silent validation received. No UI action taken.');
        return;
      }
  
      const title = remoteMessage?.notification?.title || 'SOS Alert';
      const body = remoteMessage?.notification?.body || 'You received SOS Message!';
  
      await notifee.createChannel({
        id: 'default',
        name: 'Default Channel',
        sound: 'default',
        importance: AndroidImportance.HIGH,
      });
  
      await notifee.displayNotification({
        title,
        body,
        android: {
          channelId: 'default',
          smallIcon: 'ic_launcher', 
          sound: 'default',
          importance: AndroidImportance.HIGH,
          style: {
            type: AndroidStyle.BIGTEXT,
            text: body,
          },
          pressAction: {
            id: 'default',
          },
        },
        data: {
          targetScreen: remoteMessage.data?.targetScreen || '',
        },
      });
  
    } catch (e) {
      console.error('🔥 Error in background handler:', e);
    }
  });
  
// Main App Component
const MainApp = () => {
  useEffect(() => {
    // Initialize the app and check for permissions on app launch
    checkForUpdate();
  }, []);

  return <App />;
};
AppRegistry.registerComponent(appName, () => MainApp);
