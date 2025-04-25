/**
 * Emergencies API Service
 * Handles fetching of all emergency data from external APIs
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
/**
 * Fetch earthquake data relevant to Myanmar from USGS
 * @returns {Promise<Object>} Earthquakes data
 */
export const fetchMyanmarEarthquakes = async () => {
  try {
    // Get current time and format it as required (ISO 8601 format)
    const currentTime = new Date().toISOString();
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    //const startDate = "2025-03-28";

    
    // Myanmar region bounding box
    const minlatitude = 9.0;
    const maxlatitude = 29.0;
    const minlongitude = 92.0;
    const maxlongitude = 102.0;
    const url = `https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson&starttime=${oneDayAgo}&endtime=${currentTime}&minmagnitude=2.5&minlatitude=${minlatitude}&maxlatitude=${maxlatitude}&minlongitude=${minlongitude}&maxlongitude=${maxlongitude}`;
    
    console.log('Fetching earthquake data from USGS API:', url);
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`USGS API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Process data to our standard format
    const earthquakes = data.features.map(quake => ({
      id: quake.id,
      title: `Earthquake: M ${quake.properties.mag} - ${quake.properties.place}`,
      content: `Magnitude ${quake.properties.mag} earthquake detected ${quake.properties.place} at a depth of ${quake.geometry.coordinates[2]}km.`,
      source: 'USGS Earthquake Monitoring',
      type: 'earthquake',
      timestamp: new Date(quake.properties.time),
      coordinates: {
        longitude: quake.geometry.coordinates[0],
        latitude: quake.geometry.coordinates[1]
      },
      urgency: quake.properties.mag >= 5.0 ? 'critical' : 
              quake.properties.mag >= 4.0 ? 'high' : 'normal',
      location: quake.properties.place,
      externalLink: quake.properties.url
    }));
    
    // Filter to only include Myanmar-related earthquakes
    const myanmarEarthquakes = earthquakes.filter(quake => 
      isLocationInMyanmar(quake.coordinates.latitude, quake.coordinates.longitude) || 
      quake.location.toLowerCase().includes('myanmar') || 
      quake.location.toLowerCase().includes('burma')
    );
    
    return {
      success: true,
      count: myanmarEarthquakes.length,
      data: myanmarEarthquakes,
      source: 'USGS Earthquake Service'
    };
  } catch (error) {
    console.error('Error in earthquake data processing:', error);
    return {
      success: false,
      count: 0,
      data: [],
      source: 'USGS Earthquake Service',
      error: error.message
    };
  }
};

/**
 * Fetch weather alerts for Myanmar from Met Norway (Yr) API
 * This API doesn't require an API key and has global coverage
 * @returns {Promise<Object>} Weather alerts data
 */
export const fetchMyanmarStormAlerts = async () => {
  try {
    // Myanmar major cities
    const myanmarCities = [
      { name: 'Yangon', lat: 16.8661, lon: 96.1951 },
      { name: 'Mandalay', lat: 21.9588, lon: 96.0891 },
      { name: 'Naypyidaw', lat: 19.7633, lon: 96.0785 },
      { name: 'Bago', lat: 17.3350, lon: 96.4890 },
      { name: 'Mawlamyine', lat: 16.4910, lon: 97.6260 }
    ];

    console.log('Fetching weather data from Met Norway API');

    // Fetch weather data for all cities in parallel using Met Norway API
    const weatherPromises = myanmarCities.map(city => 
      fetch(`https://api.met.no/weatherapi/locationforecast/2.0/compact?lat=${city.lat}&lon=${city.lon}`, {
        headers: {
          // Required by Met Norway API - identify your application
          'User-Agent': 'MyanmarSOSApp/1.0 github.com/myanmar-sos-app'
        }
      })
        .then(response => {
          if (!response.ok) {
            throw new Error(`Weather API error for ${city.name}: ${response.status}`);
          }
          return response.json();
        })
        .then(data => ({
          city: city.name,
          data: data
        }))
        .catch(error => {
          console.error(`Error fetching weather for ${city.name}:`, error);
          return null;
        })
    );

    const citiesData = await Promise.all(weatherPromises);
    const validCitiesData = citiesData.filter(city => city !== null);

    if (validCitiesData.length === 0) {
      throw new Error('No valid weather data received');
    }

    // Process and filter only for storm-related alerts
    let stormAlerts = [];

    const isStormCondition = (weatherSymbol, details) => {
      // Check for storm-specific conditions: high wind speed or heavy precipitation
      const isWindStorm = details.wind_speed && details.wind_speed > 15; // High wind speed threshold
      const isHeavyRain = details.precipitation_amount && details.precipitation_amount > 5; // Precipitation threshold

      return isWindStorm || isHeavyRain;
    };

    validCitiesData.forEach(cityData => {
      const { city, data } = cityData;

      const currentData = data.properties.timeseries[0];
      const forecastData = data.properties.timeseries.slice(1, 9); // Next 24 hours (3-hour intervals)

      // Only process storm-related data
      if (currentData) {
        const details = currentData.data.instant.details;
        const weatherSymbol = currentData.data.next_1_hours?.summary?.symbol_code || '';

        // If storm conditions are detected, create an alert
        if (isStormCondition(weatherSymbol, details)) {
          const windSpeed = details.wind_speed || 0;
          const precipitation = currentData.data.next_1_hours?.details?.precipitation_amount || 0;

          stormAlerts.push({
            id: `storm-${city}-${Date.now()}`,
            title: `Storm Alert: Strong winds in ${city}`,
            content: `Storm conditions detected in ${city}. Wind speed: ${windSpeed} m/s, Precipitation: ${precipitation} mm. Take precautions and stay indoors if possible.`,
            timestamp: new Date(),
            urgency: windSpeed > 15 ? 'critical' : 'high',
            location: city,
            weatherSymbol: weatherSymbol
          });
        }
      }

      // Process forecast data similarly (for storm-related forecasts)
      forecastData.forEach(forecast => {
        const forecastTime = new Date(forecast.time);
        const details = forecast.data.instant.details;
        const weatherSymbol = forecast.data.next_6_hours?.summary?.symbol_code || '';

        // Only process storm conditions
        if (isStormCondition(weatherSymbol, details)) {
          const windSpeed = details.wind_speed || 0;
          const precipitation = forecast.data.next_6_hours?.details?.precipitation_amount || 0;

          stormAlerts.push({
            id: `storm-forecast-${city}-${forecastTime.toISOString()}`,
            title: `Storm Forecast: ${city} - ${forecastTime.toLocaleString()}`,
            content: `Storm conditions forecast for ${city} on ${forecastTime.toDateString()}. Expected wind speed: ${windSpeed} m/s, precipitation: ${precipitation} mm.`,
            timestamp: forecastTime,
            urgency: windSpeed > 15 ? 'critical' : 'high',
            location: city,
            weatherSymbol: weatherSymbol
          });
        }
      });
    });

    return {
      success: true,
      count: stormAlerts.length,
      data: stormAlerts,
      source: 'Met Norway Weather Service'
    };
  } catch (error) {
    console.error('Error in weather data processing:', error);
    return {
      success: false,
      count: 0,
      data: [],
      source: 'Met Norway Weather Service',
      error: error.message
    };
  }
};


/**
 * Fetch Report emergencies *
 * @returns {Promise<Object>} *
 */
// services/emergenciesApi.js
export const fetchReportEmergencies = async () => {
  try {
    const response = await fetch('https://sos-mm.fly.dev/api/reports/getmobilereportnews', {
      method: 'GET',
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    const reportNews = data.data.map((item) => ({
      id: item.id,
      title: item.category,
      content: item.content,
      source: "Local People", // Default/fixed value
      type: "reports",
      timestamp: item.timestamp,
      location: "Myanmar", // Fixed for now
      urgency: item.level,  // Maps directly from `level`
      status: item.status,
      isResolved: item.isResolved,
    }));

    return {
      success: true,
      data: reportNews,
    };
  } catch (error) {
    console.error('Error fetching emergency reports:', error);
    return {
      success: false,
      error: error.message || 'Failed to fetch emergency reports',
    };
  }
};




export const fetchAllMyanmarEmergencies = async () => {
  const CACHE_KEY = 'MYANMAR_EMERGENCY_CACHE';
  const CACHE_EXPIRY = 3 * 60 * 1000; // 3 minutes

  const sources = [
    { name: 'earthquake', fn: fetchMyanmarEarthquakes },
    { name: 'storm', fn: fetchMyanmarStormAlerts },
    { name: 'reports', fn: fetchReportEmergencies }
  ];

  try {
    console.log('Fetching all Myanmar emergency data');

    // Check Cache First
    const cached = await AsyncStorage.getItem(CACHE_KEY);
    let cachedData = null;
    if (cached) {
      cachedData = JSON.parse(cached);
      const age = Date.now() - new Date(cachedData.timestamp).getTime();

      // If the cache is still valid, use it without fetching fresh data
      if (age < CACHE_EXPIRY) {
        console.log('Using cached emergency data');
        return { ...cachedData, cached: true };
      }
    }

    // Set timeout for fetches to avoid long hangs
    const withTimeout = (fn, timeout = 5000) =>
      Promise.race([fn(), new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Timeout')), timeout)
      )]);

    // Fetch new data if cache is expired or doesn't exist
    const results = await Promise.allSettled(
      sources.map(source => withTimeout(source.fn))
    );

    const combinedData = [];
    const errors = [];
    const sourceCounts = {};

    results.forEach((result, index) => {
      const { name } = sources[index];

      if (result.status === 'fulfilled' && result.value?.success) {
        const data = result.value.data || [];
        combinedData.push(...data);
        sourceCounts[name] = data.length;
      } else {
        const reason = result.reason?.message || 'Unknown error';
        errors.push(`${name} service: ${reason}`);
        sourceCounts[name] = 0;
      }
    });

    // Sort the combined data based on timestamp (newest first)
    combinedData.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    // Prepare the final response
    const finalResponse = {
      success: combinedData.length > 0,
      count: combinedData.length,
      data: combinedData,
      sources: sourceCounts,
      errors: errors.length ? errors : undefined,
      timestamp: new Date().toISOString()
    };

    // Update the cache with the fresh data and new timestamp
    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(finalResponse));

    return finalResponse;
  } catch (error) {
    console.error('Error fetching all Myanmar emergencies:', error);

    return {
      success: false,
      count: 0,
      data: [],
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
};


/**
 * Check if a location is within Myanmar's boundaries
 * @param {number} lat - Latitude
 * @param {number} lon - Longitude
 * @returns {boolean} True if location is in Myanmar
 */
const isLocationInMyanmar = (lat, lon) => {
  // Approximate bounding box for Myanmar
  const myanmarBbox = {
    minLat: 9.0,
    maxLat: 29.0,
    minLon: 92.0,
    maxLon: 102.0
  };
  
  return (
    lat >= myanmarBbox.minLat && 
    lat <= myanmarBbox.maxLat && 
    lon >= myanmarBbox.minLon && 
    lon <= myanmarBbox.maxLon
  );
};

/**
 * Check if weather conditions from Met Norway API indicate a storm
 * @param {string} symbolCode - Weather symbol code from Met Norway API
 * @param {Object} details - Weather details object
 * @returns {boolean} True if conditions indicate storm
 */
const isStormConditionNorway = (symbolCode, details) => {
  // Check wind speed (> 10 m/s is strong wind)
  const highWindSpeed = (details.wind_speed && details.wind_speed > 10);
  
  // Check weather symbol for storm-related conditions
  const stormSymbols = [
    'thunderstorm', 'thunder', 'heavyrain', 'heavysleet', 
    'heavysnow', 'rainshowers_day_thunder', 'rainshowers_night_thunder',
    'heavyrainshowers_day', 'heavyrainshowers_night'
  ];
  
  const hasStormSymbol = stormSymbols.some(symbol => 
    symbolCode && symbolCode.toLowerCase().includes(symbol)
  );
  
  return highWindSpeed || hasStormSymbol;
};

export default {
  fetchMyanmarEarthquakes,
  fetchMyanmarStormAlerts,
  fetchAllMyanmarEmergencies,
  fetchReportEmergencies
};
