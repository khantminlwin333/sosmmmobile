import { PermissionsAndroid, Platform, Alert } from 'react-native';
import { NativeModules } from 'react-native';

const { WiFiDirectModule } = NativeModules;

const requestWifiDirectPermissions = async () => {
  try {
    const permissions = {};

    if (Platform.Version >= 29) {
      permissions[PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION] = 'Location';
    }

    if (Platform.Version >= 33) {
      permissions[PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS] = 'Notifications';
    }
    
    if (Platform.Version >= 33) {
      permissions[PermissionsAndroid.PERMISSIONS.NEARBY_WIFI_DEVICES] = 'Nearby Devices';
    }
    const permissionKeys = Object.keys(permissions);

    // Step 1: Ask user with OK/Cancel prompt first
    return new Promise((resolve) => {
      Alert.alert(
        'Permission Needed',
        'App needs permission to connect and send message. Do you want to allow it?',
        [
          {
            text: 'Cancel',
            onPress: () => {
              Alert.alert(
                'Action Required',
                'To connect and send message, you need to allow this!'
              );
              resolve(false);
            },
            style: 'cancel',
          },
          {
            text: 'OK',
            onPress: async () => {
              const granted = await PermissionsAndroid.requestMultiple(permissionKeys);

              const deniedPermissions = permissionKeys.filter(
                (key) => granted[key] !== PermissionsAndroid.RESULTS.GRANTED
              );

              if (deniedPermissions.length > 0) {
                const deniedNames = deniedPermissions.map((key) => permissions[key]);
                Alert.alert(
                  'Permission Denied',
                  `The following permission(s) are required: ${deniedNames.join(', ')}.`
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

        // Wait for the peer discovery to finish
        const discoveredPeers = await WiFiDirectModule.getAvailablePeers();
        if (discoveredPeers.length === 0) {
            Alert.alert('No Peers Found', 'No peers found. Make sure the peer device is discoverable.');
            console.log(discoveredPeers)
            return false;
        }
        // Log the discovered peers
        console.log('Discovered peers:', discoveredPeers);

        // Try to connect to the first discovered peer
        const peerToConnect = discoveredPeers[0];
        console.log('Connecting to peer:', peerToConnect.deviceAddress);
        await WiFiDirectModule.connectToPeer(peerToConnect.deviceAddress);

        return true; // Successfully started discovery and connection
    } catch (error) {
        console.warn('Error during discovery or connection:', error);
        Alert.alert('Error', 'An error occurred during peer discovery or connection.');
        return false;
    }
};

export const tryWifiDirectSend = async (sosData, attempt = 1, maxAttempts = 3) => {
    
    //await WiFiDirectModule.removeGroup();
    const hasPermission = await requestWifiDirectPermissions();
    if (!hasPermission) return false;

    try {
        // Start discovering peers before anything else
        const discoverySuccess = await startDiscovery();
        if (!discoverySuccess) return false;

        // Get connection info after successful connection attempt
        const info = await WiFiDirectModule.getConnectionInfo();
        console.log('Wi-Fi Direct info:', info);

        if (!info.groupFormed) {
            Alert.alert('Not Connected', 'Please connect to a peer before sending.');
            return false;
        }

        
        if (info.isGroupOwner) {
            console.log('🚫 Device is Group Owner. Will not send message to itself.');
            Alert.alert('Server Mode', 'You are the server (Group Owner). Waiting for client message.');
            try {
              await WiFiDirectModule.removeGroup();
              console.log('Group removed to exit server mode.');
          } catch (e) {
              console.warn('Failed to remove group:', e);
          }      
            return false;
        }
    

        if (!info.groupOwnerAddress) {
            Alert.alert('Connection Error', 'Group Owner IP address not found. Make sure you are connected to the server.');
            return false;
        }

        const host = info.groupOwnerAddress; // IP of the server (Group Owner)
        const port = 8888; // Port used for communication
        const message = JSON.stringify(sosData); // SOS data to be sent

        console.log(`📡 Attempt ${attempt}: Sending SOS to ${host}:${port}`);
        console.log('Message:', message);

        // Attempt to send data to the Group Owner
        await WiFiDirectModule.sendData(host, port, message);

        // Log success and alert the user
        console.log('✅ SOS message sent successfully!');
        return true;

    } catch (error) {
        console.warn(`❌ Attempt ${attempt} failed: ${error.message}`);

        if (attempt < maxAttempts) {
            console.log(`🔁 Retrying... (${attempt + 1}/${maxAttempts})`);
            await new Promise((res) => setTimeout(res, 2000)); // wait before retry
            return tryWifiDirectSend(sosData, attempt + 1, maxAttempts);
        } else {
            return false;
        }
    }
};
