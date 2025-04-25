import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Dimensions, PermissionsAndroid, Platform } from 'react-native';
import { WebView } from 'react-native-webview';
import Geolocation from 'react-native-geolocation-service';
import { useRoute } from '@react-navigation/native';

const SosMapFullScreen = () => {
  const route = useRoute();
  const { latitude, longitude, message } = route.params;
  const [userLat, setUserLat] = useState(null);
  const [userLng, setUserLng] = useState(null);

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
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.3/dist/leaflet.css" />
        <style>
          html, body, #map { margin: 0; padding: 0; height: 100%; }
        </style>
      </head>
      <body>
        <div id="map"></div>
        <script src="https://unpkg.com/leaflet@1.9.3/dist/leaflet.js"></script>
        <script>
          function getDistanceFromLatLonInKm(lat1, lon1, lat2, lon2) {
            var R = 6371;
            var dLat = (lat2 - lat1) * Math.PI / 180;
            var dLon = (lon2 - lon1) * Math.PI / 180;
            var a =
              Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
            var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
            return (R * c).toFixed(2);
          }

          var map = L.map('map').setView([${latitude}, ${longitude}], 15);
          L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
          }).addTo(map);

          var sosIcon = L.icon({
            iconUrl: 'https://raw.githubusercontent.com/khantminlwin333/sosapp/backend/sos.png',
            iconSize: [32, 32],
            iconAnchor: [16, 32],
            popupAnchor: [0, -32]
          });

          L.marker([${latitude}, ${longitude}], { icon: sosIcon }).addTo(map)
            .bindPopup('${message || "🚨 SOS Location"}').openPopup();

          ${userLat && userLng ? `
            var userIcon = L.icon({
              iconUrl: 'https://raw.githubusercontent.com/khantminlwin333/sosapp/backend/user.png',
              iconSize: [22, 22],
              iconAnchor: [16, 32],
              popupAnchor: [0, -32]
            });

            L.marker([${userLat}, ${userLng}], { icon: userIcon }).addTo(map)
              .bindPopup('📍 You are here').openPopup();

            var latlngs = [
              [${latitude}, ${longitude}],
              [${userLat}, ${userLng}]
            ];
            var polyline = L.polyline(latlngs, {color: 'red', weight: 3}).addTo(map);
            map.fitBounds(polyline.getBounds());

            var distanceKm = getDistanceFromLatLonInKm(${latitude}, ${longitude}, ${userLat}, ${userLng});
            var midLat = (${latitude} + ${userLat}) / 2;
            var midLng = (${longitude} + ${userLng}) / 2;

            L.popup({ offset: [0, -8] })
              .setLatLng([midLat, midLng])
              .setContent( distanceKm + ' km away')
              .openOn(map);
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

export default SosMapFullScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#002',
  },
  map: {
    flex: 1,
  },
});
