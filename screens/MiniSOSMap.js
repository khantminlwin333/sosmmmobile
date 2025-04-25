import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Dimensions, PermissionsAndroid, Platform } from 'react-native';
import { WebView } from 'react-native-webview';
import Geolocation from 'react-native-geolocation-service';

const SosMap = (props) => {
  const [userLat, setUserLat] = useState(null);
  const [userLng, setUserLng] = useState(null);
  const { latitude, longitude } = props;

  useEffect(() => {
    const requestPermission = async () => {
      if (Platform.OS === 'android') {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
        );
        if (granted !== PermissionsAndroid.RESULTS.GRANTED) return;
      }
      Geolocation.getCurrentPosition(
        position => {
          setUserLat(position.coords.latitude);
          setUserLng(position.coords.longitude);
        },
        error => console.error(error),
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
      );
    };

    requestPermission();
  }, []);

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>Leaflet Map</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <link
          rel="stylesheet"
          href="https://unpkg.com/leaflet@1.9.3/dist/leaflet.css"
        />
        <style>
          html, body, #map { margin: 0; padding: 0; height: 100%; }
        </style>
      </head>
      <body>
        <div id="map"></div>
        <script src="https://unpkg.com/leaflet@1.9.3/dist/leaflet.js"></script>
        <script>
          var map = L.map('map').setView([${latitude}, ${longitude}], 15);
          L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
          }).addTo(map);

          // SOS Location (Red)
           var sosIcon = L.icon({
              iconUrl: 'https://raw.githubusercontent.com/khantminlwin333/sosapp/backend/sos.png',
              iconSize: [32, 32],
              iconAnchor: [16, 32],
              popupAnchor: [0, -32]
            });
          L.marker([${latitude}, ${longitude}], { icon: sosIcon }).addTo(map)
            .bindPopup('🚨 SOS Location')
            .openPopup();

          // User Location (Blue)
          ${userLat && userLng ? `
            var blueIcon = L.icon({
              iconUrl: 'https://raw.githubusercontent.com/khantminlwin333/sosapp/backend/user.png',
              iconSize: [32, 32],
              iconAnchor: [16, 32],
              popupAnchor: [0, -32]
            });
            L.marker([${userLat}, ${userLng}], { icon: blueIcon }).addTo(map)
              .bindPopup('📍 You are here');
          ` : ''}
        </script>
      </body>
    </html>
  `;

  return (
    <View style={styles.container}>
      <WebView
        originWhitelist={['*']}
        source={{ html }}
        style={styles.map}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        automaticallyAdjustContentInsets={false}
      />
    </View>
  );
};

export default SosMap;

const styles = StyleSheet.create({
  container: {
    height: Dimensions.get('window').height * 0.25,
    width: '100%',
    borderRadius: 10,
    overflow: 'hidden',
    marginTop: 10,
  },
  map: {
    flex: 1,
  },
});
