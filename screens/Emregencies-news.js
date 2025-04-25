import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  FlatList,
  RefreshControl,
  ActivityIndicator,
  Platform,
  PermissionsAndroid,
  Animated
} from 'react-native';
import Geolocation from 'react-native-geolocation-service';

import { fetchAllMyanmarEmergencies } from '../services/emergenciesApi';
import { fetchSosMessages } from '../services/backendApi';

// Animated Button Component
const AnimatedFilterButton = ({ title, isActive, onPress, hasData }) => {
  // Animation value for pulsing effect
  const pulseAnim = useRef(new Animated.Value(0)).current;
  
  // Start animation if there's data
  useEffect(() => {
    if (hasData) {
      const startPulseAnimation = () => {
        // Reset the animation
        pulseAnim.setValue(0);
        // Create sequence animation
        Animated.sequence([
          // Pulse up
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: false, // Set to false for backgroundColor animation
          }),
          // Pulse down
          Animated.timing(pulseAnim, {
            toValue: 0,
            duration: 1000,
            useNativeDriver: false,
          })
        ]).start(() => {
          // Loop the animation
          startPulseAnimation();
        });
      };
      
      startPulseAnimation();
      
      return () => {
        pulseAnim.stopAnimation();
      };
    }
  }, [hasData, pulseAnim]);
  
  // Calculate animation values
  const backgroundColorAnim = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [isActive ? '#ff4444' : '#333', isActive ? '#ff7777' : '#555']
  });
  
  const scaleAnim = pulseAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [1, 1.05, 1]
  });

  return (
    <Animated.View
      style={{
        transform: hasData ? [{ scale: scaleAnim }] : [{ scale: 1 }],
      }}
    >
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.7}
      >
        <Animated.View
          style={[
            styles.filterButton,
            {
              backgroundColor: hasData ? backgroundColorAnim : (isActive ? '#ff4444' : '#333'),
              borderWidth: hasData && !isActive ? 1 : 0,
              borderColor: hasData && !isActive ? '#ff4444' : 'transparent',
              
            }
          ]}
        >
          <Text style={styles.filterButtonText}>{title}</Text>
        </Animated.View>
      </TouchableOpacity>
    </Animated.View>
  );
};

export default function EmergenciesNews({ navigation }) {
  // State for news data
  const [newsItems, setNewsItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [activeFilter, setActiveFilter] = useState('all'); // 'all', 'earthquake', 'storm', 'reports'
  const [sourceCounts, setSourceCounts] = useState({
    earthquake: 0,
    storm: 0,
    reports: 0,
  });
  const [showFloatingButton, setShowFloatingButton] = useState(false);

  useEffect(() => {
    const checkSosMessages = async () => {
      try {
        const { success, count, data } = await fetchSosMessages();
        if (success && data.length > 0) {
          setShowFloatingButton(true);
        } else {
          setShowFloatingButton(false);
        }
      } catch (error) {
        console.error('Error fetching SOS messages:', error);
        setShowFloatingButton(false);
      }
    };

    checkSosMessages();
  }, []);

  // Get user location using React Native Geolocation
  useEffect(() => {
    // Request location permissions and get current position
    const getLocation = async () => {
      try {
        const hasPermission = await requestLocationPermission();
        
        if (!hasPermission) {
          console.log('Location permission denied');
          return;
        }
      } catch (error) {
        console.error('Error in location process:', error);
      }
    };
    
    const requestLocationPermission = async () => {
      if (Platform.OS === 'ios') {
        try {
          const auth = await Geolocation.requestAuthorization('whenInUse');
          return auth === 'granted';
        } catch (error) {
          return false;
        }
      }
      
      // Android
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          {
            title: 'Location Permission',
            message: 'This app needs access to your location to show relevant emergency alerts.',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          }
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      } catch (error) {
        return false;
      }
    };
    
    getLocation();
  }, []);

  // Function to fetch Myanmar emergency news
  const fetchNews = useCallback(async () => {
    try {
      setError(null);
     

      // Fetch all Myanmar emergencies directly from our API service
      const response = await fetchAllMyanmarEmergencies();
      
      if (response.success && response.data) {
        setNewsItems(response.data);
        
        // Update source counts
        if (response.sources) {
          setSourceCounts(response.sources);
        }
      } else {
        // Error or no data available
        throw new Error(response.error || 'No emergency data available');
      }
    } catch (err) {
      console.error('Failed to fetch Myanmar emergency news:', err);
      setError('Failed to load emergency news for Myanmar. Please check your connection and try again.');
      setNewsItems([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);
  
  // Handle pull-to-refresh
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchNews();
  }, [fetchNews]);

  // Initial data fetch
  useEffect(() => {
    fetchNews();
  }, [fetchNews]);

  // Filter items based on active filter
  const getFilteredItems = useCallback(() => {
    if (activeFilter === 'all') {
      
      return newsItems;
    } else {
      return newsItems.filter(item => item.type === activeFilter);
    }
  }, [newsItems, activeFilter]);

  const filteredItems = getFilteredItems();
 
  
  // Determine display content based on toggle
  const getDisplayContent = useCallback((item) => {
      return {
        title: item.title,
        content: item.content
      };
  }, []);

  

  // Filter toggle buttons
  const renderFilterButtons = () => (
    <View style={styles.filterContainer}>
      
      <AnimatedFilterButton 
        title={`All (${newsItems.length? newsItems.length : 0})`}
        isActive={activeFilter === 'all'} 
        onPress={() => setActiveFilter('all')}
        hasData={sourceCounts.all > 0 }
      />
      
      <AnimatedFilterButton 
        title={`Earthquakes (${sourceCounts.earthquake})`}
        isActive={activeFilter === 'earthquake'} 
        onPress={() => setActiveFilter('earthquake')}
        hasData={sourceCounts.earthquake > 0 }
      />
      <AnimatedFilterButton 
        title={`Storms (${sourceCounts.storm})`}
        isActive={activeFilter === 'storm'} 
        onPress={() => setActiveFilter('storm')}
        hasData={sourceCounts.storm > 0 }
      />
       <AnimatedFilterButton 
        title={`Reports (${sourceCounts.reports})`}
        isActive={activeFilter === 'reports'} 
        onPress={() => setActiveFilter('reports')}
        hasData={sourceCounts.reports > 0 }
      />
    </View>
  );
  // Render item component
  const renderItem = useCallback(({ item }) => {
    // For other types or when animation is disabled, use the regular card
    const { title, content } = getDisplayContent(item);
    
    // Determine appropriate icon based on emergency type
    let icon = null;
    if (item.type === 'earthquake') {
      icon = '🔴';
    } else if (item.type === 'storm') {
      icon = '🌪️';
    } else if(item.type === 'reports'){
      icon = '🔴';
    }
   
    
    // Set color based on urgency level
    let urgencyStyle = styles.normalUrgency;
    if (item.urgency === 'critical') {
      urgencyStyle = styles.criticalUrgency;
    } else if (item.urgency === 'high') {
      urgencyStyle = styles.highUrgency;
    }

  return (
      <View style={[styles.card, urgencyStyle]}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardType}>{icon} {item.type}</Text>
          {item.weatherSymbol && (
            <Text style={styles.weatherSymbol}>
              {getWeatherEmoji(item.weatherSymbol)}
            </Text>
          )}
        </View>
        
        <Text style={styles.cardTitle}>{title}</Text>
        <Text style={styles.cardContent}>{content}</Text>
        
        <View style={styles.cardFooter}>
          <Text style={styles.cardSource}>{item.source}</Text>
          <Text style={styles.cardTimestamp}>
            {new Date(item.timestamp).toLocaleString()}
          </Text>
      </View>

        {item.location && (
          <Text style={styles.cardLocation}>📍 {item.location}</Text>
        )}
        
      </View>
    );
  }, [getDisplayContent]);

  // Handle empty state
  const renderEmptyState = () => {
    if (loading) {
      return (
        <View style={styles.emptyContainer}>
          <ActivityIndicator size="large" color="#ff4444" />
          <Text style={styles.emptyText}>Loading emergencies data...</Text>
        </View>
      );
    }
    
    if (error) {
      return (
        <View style={styles.emptyContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchNews}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      );
    }
    
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No emergency alerts for Myanmar at this time.</Text>
        <Text style={styles.emptySubtext}>Pull down to refresh</Text>
      </View>
    );
  };

  // Main render
  return (
    <View style={styles.container}>

{showFloatingButton && (
  <TouchableOpacity
    style={styles.fab}
    onPress={() => navigation.navigate('SOSMessage')}
  >
    <Text style={styles.fabText}>🔴 SOS Messages</Text>
  </TouchableOpacity>
)}

      
      {renderFilterButtons()}
      <FlatList
        data={filteredItems}
        renderItem={renderItem}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#ff4444']}
            tintColor="#ff4444"
          />
        }
        ListEmptyComponent={renderEmptyState}
      />

      <TouchableOpacity 
        style={styles.reportButton} 
        onPress={() => navigation.navigate('SendNews')}
      >
        <Text style={styles.reportButtonText}>📢 Report Emergencies</Text>
      </TouchableOpacity>
    </View>
  );
}

/**
 * Convert Met Norway weather symbol codes to meaningful emojis
 * @param {string} symbolCode - Weather symbol code from Met Norway API
 * @returns {string} Weather emoji representation
 */
const getWeatherEmoji = (symbolCode) => {
  if (!symbolCode) return '';
  
  if (symbolCode.includes('thunder')) return '⚡';
  if (symbolCode.includes('rain') && symbolCode.includes('thunder')) return '🌩️';
  if (symbolCode.includes('heavyrain')) return '🌧️';
  if (symbolCode.includes('rain')) return '🌦️';
  if (symbolCode.includes('sleet')) return '🌨️';
  if (symbolCode.includes('snow')) return '❄️';
  if (symbolCode.includes('fog')) return '🌫️';
  if (symbolCode.includes('cloudy')) return '☁️';
  if (symbolCode.includes('partlycloudy')) return '⛅';
  if (symbolCode.includes('clearsky')) return '☀️';
  
  // Default case
  return '🌡️';
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111',
  },
  header: {
    padding: 15,
    backgroundColor: '#222',
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
  },
  filterContainer: {
    flexDirection: 'row',
    padding: 5,
    backgroundColor: '#222',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#333',
    flexWrap: 'wrap',
  },
  filterButton: {
    paddingVertical: 5,
    paddingHorizontal: 5,
    borderRadius: 20,
    backgroundColor: '#333',
    marginVertical: 1,
  },
  activeFilterButton: {
    backgroundColor: '#ff4444',
  },
  filterButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  toggleButton: {
    backgroundColor: '#333',
    padding: 10,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#444',
    marginBottom: 5,
  },
  toggleButtonActive: {
    backgroundColor: '#333344',
    borderLeftWidth: 4,
    borderLeftColor: '#ff4444',
  },
  toggleButtonText: {
    color: '#ddd',
    fontWeight: 'bold',
  },
  listContainer: {
    paddingBottom: 20,
    flexGrow: 1,
  },
  card: {
    backgroundColor: '#222',
    borderRadius: 10,
    padding: 15,
    margin: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    borderLeftWidth: 4,
    borderLeftColor: '#666',
  },
  normalUrgency: {
    borderLeftColor: '#666',
  },
  highUrgency: {
    borderLeftColor: '#ff9900',
  },
  criticalUrgency: {
    borderLeftColor: '#ff4444',
    backgroundColor: 'rgba(255, 68, 68, 0.1)',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  cardType: {
    color: '#aaa',
    fontSize: 12,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  weatherSymbol: {
    fontSize: 24,
    marginLeft: 5,
    color: '#fff',
  },
  cardTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  cardContent: {
    color: '#ddd',
    marginBottom: 10,
    lineHeight: 20,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  cardSource: {
    color: '#aaa',
    fontSize: 12,
  },
  cardTimestamp: {
    color: '#aaa',
    fontSize: 12,
  },
  cardLocation: {
    color: '#aaa',
    fontSize: 12,
    marginTop: 5,
  },
  paraphrasedBadge: {
    position: 'absolute',
    top: 15,
    right: 15,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 10,
    paddingVertical: 3,
    paddingHorizontal: 8,
  },
  paraphrasedText: {
    color: '#fff',
    fontSize: 10,
  },
  animationIndicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginLeft: 5,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    minHeight: 300,
  },
  emptyText: {
    color: '#ddd',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 20,
  },
  emptySubtext: {
    color: '#999',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 10,
  },
  errorText: {
    color: '#ff6666',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 20,
  },
  retryButton: {
    backgroundColor: '#ff4444',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 5,
    marginTop: 15,
  },
  retryButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  reportButton: {
    position: 'absolute',
    right: 20,
    bottom: 80,
    backgroundColor: '#ff4444',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 30,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
  reportButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  fab: {
    position: 'absolute',
    top: '8%',
    right: 0,
    backgroundColor: 'red',
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 30,
    zIndex: 999,
    elevation: 6,
  },
  fabText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
});

