import * as React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, AppState } from 'react-native';
import { NavigationContainer, NavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import messaging from '@react-native-firebase/messaging';
import notifee, { AndroidImportance, AndroidStyle, EventType } from '@notifee/react-native';
import SosScreen from './screens/SoS';
import PrivacyPolicyScreen from './screens/PVC';
import EmergenciesNews from './screens/Emregencies-news';
import SendNewsScreen from './screens/Send-news';
import WifiDirectReceiverScreen from './screens/WifiDirectReceiver';
import SendSOSScreen from './screens/SendSoS';
import SosMessagesScreen from './screens/SOSMessage';
import SOSMAPScreen from './screens/MiniSOSMap';
import FullSOSMapScreen from './screens/FullSOSMap';

// Define our app's routes for TypeScript
type RootStackParamList = {
  EmgNews: undefined;
  Sos: undefined;
  policy: undefined;
  SendNews: undefined;
  WifiDirectReceiverScreen: undefined;
  SendSOS: undefined;
  SOSMessage: undefined;
  SOSMAP: undefined;
  FullSOSMap: undefined;
};

// Create a strongly typed navigation reference
const navigationRef = React.createRef<NavigationContainerRef<RootStackParamList>>();

// Create navigation functions
const navigate = (name: keyof RootStackParamList) => {
  if (navigationRef.current) {
    navigationRef.current.navigate(name);
  }
};



// Website-style footer navigation bar
interface FooterBarProps {
  currentRoute: string;
}

function FooterBar({ currentRoute }: FooterBarProps) {
  return (
    <View style={styles.footer}>
      <TouchableOpacity
        style={[styles.navButton, currentRoute === 'EmgNews' ? styles.activeNavButton : null]}
        onPress={() => navigate('EmgNews')}
      >
        <Text style={[styles.navButtonText, currentRoute === 'EmgNews' ? styles.activeNavText : null]}>
          📰 News
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.navButton, currentRoute === 'Sos' ? styles.activeNavButton : null]}
        onPress={() => navigate('Sos')}
      >
        <Text style={[styles.navButtonText, currentRoute === 'Sos' ? styles.activeNavText : null]}>
          🆘 SoS
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.navButton, currentRoute === 'policy' ? styles.activeNavButton : null]}
        onPress={() => navigate('policy')}
      >
        <Text style={[styles.navButtonText, currentRoute === 'policy' ? styles.activeNavText : null]}>
          🔒 Policy
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const Stack = createNativeStackNavigator<RootStackParamList>();

function App(): React.JSX.Element {
  const [currentRoute, setCurrentRoute] = React.useState<string>('EmgNews');
  const appState = React.useRef(AppState.currentState);

  React.useEffect(() => {
    let isSubscribed = true;
    // Ask notification permission
    messaging().requestPermission().then(authStatus => {
      const enabled = authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
                      authStatus === messaging.AuthorizationStatus.PROVISIONAL;
      if (enabled) console.log('🔓 Notification Permission Granted');
    });
    console.log('AppState:', AppState.currentState);

    // Get device FCM token
    messaging().getToken().then(token => {
      console.log('📱 FCM Token:', token);
    });

    // Subscribe to topic
    messaging().subscribeToTopic('all').then(() => {
      console.log('📢 Subscribed to topic: all');
    });

    const unsubscribe = messaging().onMessage(async remoteMessage => {
      try {
        console.log('📩 Foreground Message:', remoteMessage);

        // Create notification channel for foreground messages
        await notifee.createChannel({
          id: 'default',
          name: 'Default Channel',
          sound: 'default',
          vibration: true,
          importance: AndroidImportance.HIGH,
        });

        // Display notification
        await notifee.displayNotification({
          title: remoteMessage.notification?.title || 'Notification',
          body: remoteMessage.notification?.body || 'You have a new alert',
          android: {
            channelId: 'default',
            smallIcon: 'ic_launcher',
            sound: 'default', // enable sound
            importance: AndroidImportance.HIGH, // make sure it pops up
            vibrationPattern: [500, 500, 300,200],
            style: {
              type: AndroidStyle.BIGTEXT,
              text: remoteMessage.notification?.body || 'You have a new alert',
            },
            pressAction: {
              id: 'default',
            },
          },
          data: {
            targetScreen: remoteMessage.data?.targetScreen || '',
          },
        });

        // If targetScreen is provided, navigate immediately
        if (
          remoteMessage.data &&
          typeof remoteMessage.data.targetScreen === 'string' &&
          ['EmgNews', 'Sos', 'policy', 'SendNews', 'WifiDirectReceiverScreen', 'SendSOS', 'SOSMessage', 'SOSMAP'].includes(
            remoteMessage.data.targetScreen
          )
        ) {
          const notiScreen = remoteMessage.data.targetScreen as keyof RootStackParamList;
          console.log(`Foreground: Navigating to: ${notiScreen}`);
          navigate(notiScreen);
        }
      } catch (error) {
        console.error('Error handling foreground notification:', error);
      }
    });

    // ---------- Background Notification Handler ----------
    // When a notification is tapped and the app is already in the background
    const unsubscribeOpened = messaging().onNotificationOpenedApp(remoteMessage => {
      console.log('📲 Notification opened from background state:', remoteMessage);
      if (
        remoteMessage.data &&
        typeof remoteMessage.data.targetScreen === 'string' &&
        ['EmgNews', 'Sos', 'policy', 'SendNews', 'WifiDirectReceiverScreen', 'SendSOS', 'SOSMessage', 'SOSMAP'].includes(
          remoteMessage.data.targetScreen
        )
      ) {
        const target = remoteMessage.data.targetScreen as keyof RootStackParamList;
        console.log(`Background: Navigating to: ${target}`);
        navigate(target);
      }
    });

    // When the app is launched from a quit state via notification
    messaging()
      .getInitialNotification()
      .then(remoteMessage => {
        if (remoteMessage) {
          console.log('🧊 App opened from quit state by notification:', remoteMessage);
          if (
            remoteMessage.data &&
            typeof remoteMessage.data.targetScreen === 'string' &&
            ['EmgNews', 'Sos', 'policy', 'SendNews', 'WifiDirectReceiverScreen', 'SendSOS', 'SOSMessage', 'SOSMAP'].includes(
              remoteMessage.data.targetScreen
            )
          ) {
            const target = remoteMessage.data.targetScreen as keyof RootStackParamList;
            console.log(`Quit state: Navigating to: ${target}`);
            navigate(target);
          }
        }
      });

    // ---------- Notifee Foreground Tap Handler ----------
    // (Optional) If a notification is tapped while the app is in the foreground
    const unsubscribeNotifeeForeground = notifee.onForegroundEvent(({ type, detail }) => {
      if (type === EventType.PRESS && detail.notification?.data?.targetScreen) {
        const target = detail.notification.data.targetScreen as keyof RootStackParamList;
        console.log('Notifee foreground tap: navigating to:', target);
        navigate(target);
      }
    });

    // Listen to AppState changes (optional)
    const appStateSubscription = AppState.addEventListener('change', nextAppState => {
      appState.current = nextAppState;
    });

    return () => {
      isSubscribed = false;
      unsubscribe();
      unsubscribeOpened();
      unsubscribeNotifeeForeground();
      appStateSubscription.remove();
    };
  }, []);

  // Function to get the current route name
  const getActiveRouteName = (state: any): string => {
    if (state.routes && state.routes.length > 0 && typeof state.index === 'number') {
      const route = state.routes[state.index];
      return route.name;
    }
    return 'EmgNews'; // Default route
  };

  return (
    <View style={styles.container}>
      <NavigationContainer
        ref={navigationRef}
        onStateChange={(state) => {
          if (state) {
            const currentRouteName = getActiveRouteName(state);
            console.log('Current route:', currentRouteName); // Debugging log
            setCurrentRoute(currentRouteName);
          }
        }}
      >
        <Stack.Navigator
          initialRouteName="EmgNews"
          screenOptions={{
            headerStyle: {
              backgroundColor: '#990000', // Deeper red for emergency app
            },
            headerShown: false,
            headerTintColor: '#fff',
            headerTitleStyle: {
              fontWeight: 'bold',
              fontSize: 20,
            },
          }}
        >
          <Stack.Screen
            name="EmgNews"
            component={EmergenciesNews}
            options={{ title: '🔔 EMERGENCY NEWS' }}
          />
          <Stack.Screen
            name="Sos"
            component={SosScreen}
            options={{ title: '🆘 SOS EMERGENCY' }}
          />
          <Stack.Screen
            name="policy"
            component={PrivacyPolicyScreen}
            options={{ title: 'Privacy & Policy' }}
          />
          <Stack.Screen
            name="SendNews"
            component={SendNewsScreen}
            options={{ title: '📢 REPORT NEWS' }}
          />
          <Stack.Screen
            name="WifiDirectReceiverScreen"
            component={WifiDirectReceiverScreen}
            options={{ title: 'Receive News' }}
          />
          <Stack.Screen
            name="SendSOS"
            component={SendSOSScreen}
            options={{ title: 'Sending SOS' }}
          />
          <Stack.Screen
          name="SOSMessage"
          component={SosMessagesScreen}
          options={{ title: 'SOS Messages' }} 
          />
          <Stack.Screen
          name="SOSMAP"
          component={SOSMAPScreen}
          options={{title: 'SOS Map'}}
          />
          <Stack.Screen
          name='FullSOSMap'
          component={FullSOSMapScreen}
          options={{title: 'SOS Message'}}
          />
        </Stack.Navigator>
      </NavigationContainer>

      {/* Website-style footer navigation */}
      <FooterBar currentRoute={currentRoute} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  footer: {
    flexDirection: 'row',
    backgroundColor: '#009',
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 60,
    justifyContent: 'space-around',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#444',
    elevation: 8, // Add shadow on Android
    zIndex: 100,
  },
  navButton: {
    flex: 1,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#660',
  },
  activeNavButton: {
    backgroundColor: '#444',
    borderTopWidth: 3,
    borderTopColor: '#ff4444',
  },
  navButtonText: {
    color: '#aaa',
    fontSize: 16,
    fontWeight: 'bold',
  },
  activeNavText: {
    color: '#fff',
  },
});

export default App;
