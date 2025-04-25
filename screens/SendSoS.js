import React, { useEffect, useState, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Alert, Platform, PermissionsAndroid, TextInput, Button } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import Geolocation from 'react-native-geolocation-service';
import { sendSOS } from '../services/backendApi';
import { tryWifiDirectSend } from '../services/wifHelpers';
import { useNavigation } from '@react-navigation/native';

export default function SendSOSScreen() {
  const isSentRef = useRef(false);
  const timeoutRef = useRef(null);
  const [status, setStatus] = useState('Checking network...');
  const [isSent, setIsSent] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('HELP ME!');
  const navigation = useNavigation();

  // Memoize the sendMessage function with useCallback
  const sendMessage = useCallback(async () => {
    console.log('[sendMessage] triggered');
    try {
      setIsSent(true);
      setStatus('Requesting location...');
      setIsLoading(true);

      const permission = await requestLocationPermission();
      console.log('[sendMessage] Location permission:', permission);
      if (!permission) throw new Error('Location permission denied');

      setStatus('Getting location...');
      Geolocation.getCurrentPosition(
        async (position) => {
          try {
            const { latitude, longitude } = position.coords;

            const sosData = {
              message,
              coordinates: {
                type: 'Point',
                coordinates: [longitude, latitude],
              },
              timestamp: new Date().toISOString(),
            };

            setStatus('Checking network...');
            const state = await NetInfo.fetch();
            console.log('Network State:', state);
            console.log('Sending message:', sosData);

            if (state.isConnected) {
              setStatus('Sending via internet...');
              const result = await sendSOS(sosData);
              if (result) {
                setStatus('✅ Sent via Internet');
              } else {
                Alert.alert('Message can not sent via Internet!', [
                  { text: 'OK', onPress: () => navigation.replace('Sos') }
                ]);
              }
            } else {
              setStatus('No internet. Trying Wi-Fi Direct...');
              const result = await tryWifiDirectSend(sosData);
              if (result) {
                setStatus('✅ Sent via Wi-Fi Direct');
              } else {
                Alert.alert('Message can not sent via offline!', [
                  { text: 'OK', onPress: () => navigation.replace('Sos') }
                ]);
              }
            }
          } catch (e) {
            console.error('Nested error:', e);
            setStatus('❌ ' + e.message);
            Alert.alert('Error', e.message, [
              { text: 'OK', onPress: () => navigation.replace('Sos') }
            ]);
          }
        },
        (geoError) => {
          console.error('Geo error:', geoError);
          setStatus('❌ Location failed');
          Alert.alert('Location Error', geoError.message, [
            { text: 'OK', onPress: () => navigation.replace('Sos') }
          ]);
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
      );
    } catch (err) {
      console.error('Top level send error:', err);
      setStatus('❌ ' + err.message);
      Alert.alert('Send Failed', err.message, [
        { text: 'OK', onPress: () => navigation.replace('Sos') }
      ]);
    } finally {
      setIsLoading(false);
    }
  }, [message, navigation]);  // Dependencies: message and navigation will trigger re-creation of sendMessage when they change

  const requestLocationPermission = async () => {
    if (Platform.OS === 'android') {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    }
    return true;
  };

  useEffect(() => {
    isSentRef.current = isSent; // Update the ref to reflect latest state
  }, [isSent]);

  useEffect(() => {
    isSentRef.current = isSent;
  }, [isSent]);

  useEffect(() => {
    timeoutRef.current = setTimeout(() => {
      if (!isSentRef.current) {
        sendMessage();
      }
    }, 30000);

    const unsubscribe = navigation.addListener('blur', () => {
      clearTimeout(timeoutRef.current);
    });

    return () => {
      clearTimeout(timeoutRef.current);
      unsubscribe();
    };
  }, [sendMessage]);

  return (
    <View style={styles.container}>
      {isSent ? (
        <>
          <Text style={styles.title}>📤 Sending SOS...</Text>
          {isLoading && <ActivityIndicator size="large" color="#ff4444" style={{ marginVertical: 20 }} />}
          <Text style={styles.status}>{status}</Text>
        </>
      ) : (
        <>
          <Text style={styles.notice}>Message will be sent after 30 seconds if not manually sent.</Text>
          <TextInput
            style={styles.input}
            value={message}
            onChangeText={(text) => {
              const words = text.trim();
              if (words.length <= 30) setMessage(text);
            }}
            placeholder="Type your message"
            placeholderTextColor="#ccc"
            multiline={true}
          />
          <Text style={styles.wordCount}>
            Word count: {message.trim().length}/30
          </Text>
          <Button
            title="Send Now"
            onPress={sendMessage}
            disabled={isSent}
          />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center', padding: 20 },
  title: { fontSize: 24, color: '#fff', marginBottom: 20 },
  status: { color: '#fff', fontSize: 16, textAlign: 'center', paddingHorizontal: 20 },
  input: {
    height: 100,
    borderColor: '#fff',
    borderWidth: 1,
    width: '100%',
    marginBottom: 20,
    color: '#fff',
    paddingLeft: 10,
    textAlignVertical: 'top',
  },
  wordCount: {
    color: '#fff',
    fontSize: 14,
    marginBottom: 10,
  },
  notice:{
    color: 'white'
  }
});
