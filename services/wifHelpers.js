import { PermissionsAndroid, Platform, Alert } from 'react-native';
import { NativeModules } from 'react-native';

const { WiFiDirectModule } = NativeModules;

// Request all needed permissions depending on Android version
const requestWifiDirectPermissions = async () => {
  try {
    const permissions = {};

    if (Platform.OS !== 'android') {
      return true; // Permissions not needed on iOS or others here
    }

    // Location permission is needed for Wi-Fi Direct discovery from Android 10 (API 29)
    if (Platform.Version >= 29) {
      permissions[PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION] = 'Location';
    }

    // Android 13+ requires NEARBY_WIFI_DEVICES for Wi-Fi related operations
    if (Platform.Version >= 33) {
      permissions[PermissionsAndroid.PERMISSIONS.NEARBY_WIFI_DEVICES] = 'Nearby Devices';
      permissions[PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS] = 'Notifications'; // Optional if you use notifications
    }

    const permissionKeys = Object.keys(permissions);

    if (permissionKeys.length === 0) {
      return true; // No runtime permissions needed for this Android version
    }

    return new Promise((resolve) => {
      Alert.alert(
        'Permission Needed',
        'The app needs permissions to scan and connect to devices. Please allow.',
        [
          {
            text: 'Cancel',
            onPress: () => {
              Alert.alert(
                'Action Required',
                'You must grant permissions to connect and send messages.'
              );
              resolve(false);
            },
            style: 'cancel',
          },
          {
            text: 'OK',
            onPress: async () => {
              const granted = await PermissionsAndroid.requestMultiple(permissionKeys);

              const denied = permissionKeys.filter(
                (key) => granted[key] !== PermissionsAndroid.RESULTS.GRANTED
              );

              if (denied.length > 0) {
                const deniedNames = denied.map((key) => permissions[key]);
                Alert.alert(
                  'Permission Denied',
                  `The following permissions are required: ${deniedNames.join(', ')}`
                );
                resolve(false);
              } else {
                resolve(true);
              }
            },
          },
        ]
      );
    });
  } catch (err) {
    console.warn('Permission error:', err);
    return false;
  }
};

const startDiscovery = async () => {
  try {
    console.log('🔍 Starting Wi-Fi Direct peer discovery...');
    await WiFiDirectModule.discoverPeers();

    await new Promise((r) => setTimeout(r, 4000)); // Wait for peers

    const discoveredPeers = await WiFiDirectModule.getAvailablePeers();
    console.log('👥 Discovered peers:', discoveredPeers);

    if (!discoveredPeers || discoveredPeers.length === 0) {
      Alert.alert('No Peers Found', 'No peers found. Make sure the other device is discoverable.');
      return false;
    }

    const peer = discoveredPeers[0];
    console.log(`🔗 Attempting to connect to ${peer.deviceName} (${peer.deviceAddress})...`);

    // Add slight delay before attempting connection
    await new Promise((r) => setTimeout(r, 2000));

    const ip = await WiFiDirectModule.connectToPeer(peer.deviceAddress);
    console.log('✅ Connection successful. Group owner IP:', ip);

    return true;

  } catch (error) {
    console.error('❌ Wi-Fi Direct error:', error);
    Alert.alert('Connection Error', 'Could not connect to peer: ' + error.message);
    return false;
  }
};


export const tryWifiDirectSend = async (sosData, attempt = 1, maxAttempts = 3) => {
  const hasPermission = await requestWifiDirectPermissions();
  if (!hasPermission) return false;

  try {
    const discoverySuccess = await startDiscovery();
    if (!discoverySuccess) return false;

    const info = await WiFiDirectModule.getConnectionInfo();
    console.log('Wi-Fi Direct connection info:', info);

    if (!info.groupFormed) {
      Alert.alert('Not Connected', 'Please connect to a peer before sending a message.');
      return false;
    }

    if (info.isGroupOwner) {
      console.log('🚫 Device is Group Owner. Waiting for client messages.');
      Alert.alert('Server Mode', 'You are the server (Group Owner). Waiting for client messages.');
      try {
        await WiFiDirectModule.removeGroup();
        console.log('Removed group to exit server mode.');
      } catch (e) {
        console.warn('Failed to remove group:', e);
      }
      return false;
    }

    if (!info.groupOwnerAddress) {
      Alert.alert('Connection Error', 'Group Owner IP address not found.');
      return false;
    }

    const host = info.groupOwnerAddress;
    const port = 8888;
    const message = JSON.stringify(sosData);

    console.log(`📡 Attempt ${attempt}: Sending SOS to ${host}:${port}`);
    console.log('Message:', message);

    await WiFiDirectModule.sendData(host, port, message);

    console.log('✅ SOS message sent successfully!');
    return true;

  } catch (error) {
    console.warn(`❌ Attempt ${attempt} failed:`, error.message || error);

    if (attempt < maxAttempts) {
      console.log(`🔁 Retrying... (${attempt + 1}/${maxAttempts})`);
      await new Promise((res) => setTimeout(res, 4000));
      return tryWifiDirectSend(sosData, attempt + 1, maxAttempts);
    } else {
      Alert.alert('Send Failed', 'Failed to send SOS message after multiple attempts.');
      return false;
    }
  }
};
