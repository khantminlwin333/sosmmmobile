import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Vibration,
  Animated,
  PermissionsAndroid,
  ScrollView,
  Button,
  Platform,
  TextInput,
  NativeModules,
  ActivityIndicator
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import NetInfo from "@react-native-community/netinfo";



export default function SosScreen() {

  const navigation = useNavigation();
  const [connectedDevice, setConnectedDevice] = useState(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [availableDevices, setAvailableDevices] = useState([]);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [pulseAnim]);


  return (
    <>
  
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.contentContainer}>
        <Animated.View style={[styles.sosButtonContainer, { transform: [{ scale: pulseAnim }]}]}>
          <TouchableOpacity
            style={styles.sosButtonConnect}
            onPress={() => {
              navigation.navigate('SendSOS');
            }}
          >
            <Text style={styles.sosButtonText}>Tap To Send</Text>
          </TouchableOpacity>
          
            <Text style = {styles.chooseText}>Tap as your requirement!</Text>
          
          <TouchableOpacity
            style={styles.sosButtonReceive}
            onPress={() => {
              navigation.navigate('WifiDirectReceiverScreen');
            }}
          >
            <Text style={styles.sosButtonText}>Tap To Receive</Text>
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>
    </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111',
  },
  contentContainer: {
    padding: 20,
    alignItems: 'center',
  },
  chooseText: {
    borderBottomWidth : 1,
    color : 'blue',
    textAlign : 'center',
    fontSize : 20,
    width : '300px',
    backgroundColor : 'white',
  },
  sosButtonContainer: {
    marginVertical: 30,
  },
  sosButtonConnect: {
    width: 250,
    height: 250,
    borderRadius: 125,
    backgroundColor: '#ff0000',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 5,
    margin: 3,
    borderColor: 'gray',
  },
  sosButtonReceive: {
    width: 250,
    height: 250,
    borderRadius: 125,
    backgroundColor: 'green',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 5,
    margin: 3,
    borderColor: 'blue',
  },
  sosButtonSendMessage: {
    width: 250,
    height: 250,
    borderRadius: 125,
    backgroundColor: '#00f',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 5,
    margin: 3,
  },
  sosButtonSendFile: {
    width: 250,
    height: 250,
    borderRadius: 125,
    backgroundColor: '#0f0',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 5,
    margin: 3,
  },
  sosButtonText: {
    color: 'white',
    fontSize: 30,
    fontWeight: 'bold',
    textAlign: 'center',
    animation : 'ease in 100'
  },
});
