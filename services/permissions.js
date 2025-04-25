import { PermissionsAndroid, Platform, Alert, AsyncStorage } from 'react-native';

// List of permissions to request
const requiredPermissions = [
  PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
  PermissionsAndroid.PERMISSIONS.ACCESS_WIFI_STATE,
  PermissionsAndroid.PERMISSIONS.CHANGE_WIFI_STATE,
  PermissionsAndroid.PERMISSIONS.NEARBY_WIFI_DEVICES,  // For Android 10+
  PermissionsAndroid.PERMISSIONS.INTERNET,  // For Internet access
  PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION,  // Coarse Location, if needed
  PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,  // For Notification (Android 13+)
];

// Check if all required permissions are granted
const checkPermissions = async () => {
  try {
    if (Platform.OS === 'android' && Platform.Version >= 23) {
      const granted = await PermissionsAndroid.requestMultiple(requiredPermissions);
      const deniedPermissions = Object.entries(granted).filter(
        ([, status]) => status !== PermissionsAndroid.RESULTS.GRANTED
      );

      return deniedPermissions;
    }
    return [];  // No permission checks needed for non-Android platforms or below API level 23
  } catch (error) {
    console.error('Error checking permissions', error);
    return [];
  }
};

// Request permissions if denied
const requestPermissions = async () => {
  try {
    const deniedPermissions = await checkPermissions();

    if (deniedPermissions.length > 0) {
      // Generate a list of denied permissions
      const deniedPermissionsList = deniedPermissions.map(([permission]) => permission).join(', ');

      // Show alert with OK and Cancel
      Alert.alert(
        'Permission Required',
        `Please grant the following permissions to use this feature: ${deniedPermissionsList}`,
        [
          {
            text: 'Cancel',
            onPress: () => {
              console.log('Permissions denied, operation canceled');
            },
            style: 'cancel',
          },
          {
            text: 'OK',
            onPress: async () => {
              const granted = await PermissionsAndroid.requestMultiple(deniedPermissions.map(([permission]) => permission));
              const remainingDeniedPermissions = Object.entries(granted).filter(
                ([, status]) => status !== PermissionsAndroid.RESULTS.GRANTED
              );
              if (remainingDeniedPermissions.length > 0) {
                const deniedPermissionsList = remainingDeniedPermissions.map(([permission]) => permission).join(', ');
                Alert.alert('Permissions Denied', `Cannot proceed without the following permissions: ${deniedPermissionsList}`);
              } else {
                // Store flag to prevent further permission prompts
                await AsyncStorage.setItem('permissionsGranted', 'true');
                console.log('All required permissions granted.');
              }
            },
          },
        ]
      );
    } else {
      console.log('All required permissions granted.');
      // Proceed with your Wi-Fi Direct or other tasks
      await AsyncStorage.setItem('permissionsGranted', 'true');
    }
  } catch (error) {
    console.error('Error requesting permissions', error);
  }
};

// Function to check and request permissions at runtime
const checkAndRequestPermissions = async () => {
  try {
    // Check if permissions have already been granted
    const permissionsGranted = await AsyncStorage.getItem('permissionsGranted');
    
    if (permissionsGranted === 'true') {
      console.log('Permissions already granted, no need to ask again.');
      // Proceed with the app tasks
    } else {
      console.log('Permissions not granted yet, requesting...');
      await requestPermissions();
    }
  } catch (error) {
    console.error('Error checking permissions status', error);
  }
};

// Example Usage: Call this function when you need to check permissions (e.g., on app launch or when navigating to Wi-Fi Direct screen)
const initializeApp = () => {
  checkAndRequestPermissions();
};

export default initializeApp;
