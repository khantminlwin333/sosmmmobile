import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useRef, useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  PermissionsAndroid,
  Platform,
  Alert,
  StyleSheet,
  Button,
  DeviceEventEmitter,
  ActivityIndicator,
} from 'react-native';
import { NativeModules } from 'react-native';
import notifee, { AndroidImportance } from '@notifee/react-native';
import { Vibration } from 'react-native';

const { WiFiDirectModule } = NativeModules;

export default function WifiDirectReceiverScreen() {
  const [messages, setMessages] = useState([]);
  const [groupCreated, setGroupCreated] = useState(false);
  const [failed, setFailed] = useState(false);
  const [groupOwnerIp, setGroupOwnerIp] = useState(null);
  const [isRetrying, setIsRetrying] = useState(false);
  const retryTimerRef = useRef(null);

  const checkWifiAndCreateGroup = async () => {
    try {
      const isWifiOn = await WiFiDirectModule.isWifiEnabled();
      if (!isWifiOn) {
        Alert.alert('⚠️ Wi-Fi is OFF', 'Please turn on Wi-Fi to use Wi-Fi Direct.');
        return;
      }
      await requestAndCreateGroup();
    } catch (err) {
      console.error('Wi-Fi check failed:', err);
    }
  };

  const requestAndCreateGroup = async () => {
    try {
      if (Platform.OS === 'android') {
        const apiLevel = parseInt(Platform.constants.Release || '0');
  
        const permissions = [
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        ];
  
        if (apiLevel >= 33) { // Android 13+
          permissions.push(PermissionsAndroid.PERMISSIONS.NEARBY_WIFI_DEVICES);
        }
  
        if(apiLevel >= 33){
          permissions.push(
            PermissionsAndroid.PERMISSIONS.ACCESS_WIFI_STATE,
            PermissionsAndroid.PERMISSIONS.CHANGE_WIFI_STATE,
          )
        }
        const granted = await PermissionsAndroid.requestMultiple(permissions);
  
        const denied = Object.entries(granted).filter(
          ([, result]) => result !== PermissionsAndroid.RESULTS.GRANTED
        );
  
        if (denied.length > 0) {
          Alert.alert('Permission Denied', 'Cannot proceed without required permissions.');
          return;
        }
      }
  
      const result = await WiFiDirectModule.createGroup();
      if (result) {
        setGroupCreated(true);
        setFailed(false);
        console.log('Group created');
      } else {
        console.warn('Group creation failed');
        setGroupCreated(false);
        setFailed(true);
        startAutoRetry();
        throw new Error('Group creation returned false');
      }
    } catch (err) {
      console.warn('Group creation failed:', err.message);
      setGroupCreated(false);
      setFailed(true);
      startAutoRetry();
    }
  };

  const startAutoRetry = () => {
    if (retryTimerRef.current) return;

    setIsRetrying(true);
    retryTimerRef.current = setInterval(() => {
      console.log('Retrying group creation...');
      checkWifiAndCreateGroup();
    }, 10000);
  };

  const stopAutoRetry = () => {
    if (retryTimerRef.current) {
      clearInterval(retryTimerRef.current);
      retryTimerRef.current = null;
    }
    setIsRetrying(false);
  };

  const autoRetry = async (attempts = 3) => {
    stopAutoRetry(); // stop background retry while manual retry happens
    setIsRetrying(true);

    for (let i = 0; i < attempts; i++) {
      const wifiOkay = await WiFiDirectModule.isWifiEnabled();
      if (!wifiOkay) return;

      try {
        await WiFiDirectModule.removeGroup();
        const result = await WiFiDirectModule.createGroup();
        if(result){
          setGroupCreated(true);
          setFailed(false);
          console.log('Group created');
          return;
        }
        else {
          console.warn('Group creation failed:');
          setGroupCreated(false);
          setFailed(true);
          startAutoRetry();
          throw new Error('Group creation returned false');
        }
      } catch (err) {
        console.warn(`Retry ${i + 1} failed:`, err.message);
      }
      await new Promise((res) => setTimeout(res, 2000));
    }

    setFailed(true);
    setIsRetrying(false);
    Alert.alert('❌ Retry Failed', 'Unable to create Wi-Fi Direct group.');
  };


  useFocusEffect(
    useCallback(() => {
      checkWifiAndCreateGroup();
      WiFiDirectModule.startServer();
      console.log('Server started');

      const msgSub = DeviceEventEmitter.addListener('onMessageReceived', async(event) => {
        try {
          // First, parse event.message since it's stringified JSON
          const parsedMessage = JSON.parse(event.message);
      
          // Now we can access the actual message, coordinates, and timestamp
          const msg = parsedMessage.message || 'No content';
          const coordinates = parsedMessage.coordinates?.coordinates || [];
          const timestamp = parsedMessage.timestamp || '';
      
          console.log('Message received:', msg);
          console.log('Coordinates:', coordinates);
          console.log('Timestamp:', timestamp);
      
          // Add the parsed message to the state
          setMessages((prev) => [
            ...prev,
            { message: msg, coordinates, timestamp },
          ]);


          //
          // Vibrate device
    Vibration.vibrate(500); // Can be an array like [200, 300, 500] for patterns

    // Display local notification
    await notifee.displayNotification({
      title: '⚠️ SOS Alert',
      body: msg,
      android: {
        channelId: 'default', // You're using this channel already
        importance: AndroidImportance.HIGH,
        vibration: true,
        sound: 'default',
        pressAction: {
          id: 'default',
        },
      },
    });
          //
        } catch (e) {
          console.warn('Failed to parse the message:', event);
          // Fallback if the event or message is not valid JSON
          setMessages((prev) => [...prev, { message: event.message }]);
        }
      });
      
      const ipSub = DeviceEventEmitter.addListener('onGroupOwnerIpReceived', (ip) => {
        console.log('Group Owner IP:', ip);
        setGroupOwnerIp(ip);
      });

      return () => {
        msgSub.remove();
        ipSub.remove();
        stopAutoRetry();
        WiFiDirectModule.removeGroup()
          .then(() => console.log('Wi-Fi Direct group removed.'))
          .catch((err) => console.warn('Group removal failed:', err.message));
      };
    }, [])
  );

  return (
    <View style={styles.container}>
      {groupCreated ? (
        <>
          <Text style={styles.statusText}>✅ Waiting to receive messages...</Text>
          <Text style={styles.header}>📥 RECEIVED SOS MESSAGES</Text>
          <ScrollView style={styles.messageScroll}>
  {messages.length === 0 ? (
    <Text style={styles.empty}>No messages yet.</Text>
  ) : (
    messages.map((msgObj, index) => (
      <View key={index} style={styles.message}>
        <Text style={styles.message}>📩 {msgObj.message}</Text> {/* Render message as string */}

        {msgObj.coordinates.length > 0 && (
          <Text style={styles.message}>📍 Coordinates: {msgObj.coordinates.join(', ')}</Text>
        )}

        <Text style={styles.message}>🕒 Time: {msgObj.timestamp}</Text> {/* Render timestamp */}
      </View>
    ))
  )}
</ScrollView>
        
  {!groupOwnerIp && (
    <Text style={{ color: 'orange', textAlign: 'center', marginTop: 8 }}>
      🔄 Waiting for Group Owner IP...
    </Text>
  )}
        </>
      ) : (
        <>
          <Text style={styles.errorText}>❌ Group not created. Please retry or check Wi-Fi.</Text>
          {isRetrying && (
            <View style={styles.loadingRow}>
              <ActivityIndicator color="yellow" />
              <Text style={styles.retryText}>Retrying group creation...</Text>
            </View>
          )}
        </>
      )}

      {failed && !groupCreated && (
        <View style={styles.retryContainer}>
          <Text style={styles.errorMessage}>⚠️ Something went wrong. Please try again.</Text>
          <Button title="Retry (3 Attempts)" onPress={() => autoRetry(3)} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111',
    padding: 20,
  },
  header: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    borderBottomColor: 'red',
    borderBottomWidth: 2,
    marginBottom: 20,
  },
  statusText: {
    color: 'lightgreen',
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 10,
  },
  messageScroll: {
    flex: 1,
    backgroundColor: '#222',
    borderRadius: 12,
    padding: 10,
    marginBottom: 10,
  },
  message: {
    color: '#999',
    fontSize: 14,
    marginBottom: 0,
    padding: 8,
    backgroundColor: '#000',
    borderRadius: 8,
    fontWeight: 'bold'
  },
  testButton:{
    backgroundColor: 'red',
    padding :10
  },
  empty: {
    color: '#888',
    textAlign: 'center',
    marginTop: 40,
    fontSize: 16,
  },
  errorText: {
    color: 'red',
    fontSize: 18,
    textAlign: 'center',
    marginTop: 30,
  },
  retryContainer: {
    marginTop: 20,
    alignItems: 'center',
  },
  errorMessage: {
    color: 'yellow',
    fontSize: 16,
    marginBottom: 10,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    gap: 10,
  },
  retryText: {
    color: 'orange',
    fontSize: 16,
  },
});
