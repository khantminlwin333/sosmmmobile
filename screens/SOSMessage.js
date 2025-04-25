import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, Dimensions, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { fetchSosMessages } from '../services/backendApi';
import MiniSOSMap from './MiniSOSMap';

const SosMessagesScreen = () => {
  const [sosMessages, setSosMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigation = useNavigation();

  useEffect(() => {
    const getData = async () => {
      try {
        const result = await fetchSosMessages();
        if (result.success && result.data) {
          setSosMessages(result.data);
        } else {
          console.warn('No SOS messages found:', result.error);
          setSosMessages([]);
        }
      } catch (err) {
        console.error('Failed to fetch SOS messages:', err);
        setSosMessages([]);
      } finally {
        setLoading(false);
      }
    };

    getData();
  }, []);

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <Text style={styles.title}>🚨 {item.message}</Text>
      <Text style={styles.meta}>Status: {item.status}</Text>
      <Text style={styles.meta}>Time: {new Date(item.timestamp).toLocaleString()}</Text>

      {item.location?.latitude && item.location?.longitude ? (

        <TouchableOpacity
        activeOpacity={0.8}
        onPress={() =>
          navigation.navigate('FullSOSMap', {
            latitude: item.location.latitude,
            longitude: item.location.longitude,
            message: item.message
          })
        }
        >
       <MiniSOSMap latitude={item.location.latitude} longitude={item.location.longitude} />
       </TouchableOpacity>

      ) : (
        <Text style={styles.meta}>📍 No Location Info</Text>
      )}
    </View>
  );

  if (loading) {
    return <Text style={styles.loadingText}>Loading SOS Messages...</Text>;
  }

  return (
    <FlatList
      data={sosMessages || []}
      keyExtractor={(item) => item.id.toString()}
      renderItem={renderItem}
      contentContainerStyle={{ paddingBottom: 10 }}
      style={styles.container}
    />
  );
};

export default SosMessagesScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  card: {
    margin: 12,
    padding: 12,
    backgroundColor: '#fff0f0',
    borderRadius: 10,
    elevation: 2,
  },
  title: {
    fontWeight: 'bold',
    fontSize: 16,
    color: '#d00000',
    marginBottom: 4,
  },
  meta: {
    fontSize: 13,
    color: '#444',
    marginBottom: 4,
  },
  map: {
    height: Dimensions.get('window').height * 0.25,
    width: '100%',
    marginTop: 8,
    borderRadius: 10,
  },
  loadingText: {
    fontSize: 16,
    color: '#555',
    textAlign: 'center',
    marginTop: 20,
  },
});
