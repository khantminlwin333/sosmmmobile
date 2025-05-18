import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  LayoutAnimation,
  Platform,
  UIManager,
  Image,
  Linking
} from 'react-native';

if (Platform.OS === 'android') {
  UIManager.setLayoutAnimationEnabledExperimental?.(true);
}

export default function PrivacyPolicyScreen({ navigation }) {
  const [showUsage, setShowUsage] = useState(false);
  const [showRestrictions, setShowRestrictions] = useState(false);
  const [showDonation, setShowDonation] = useState(false);

  const toggleUsage = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setShowUsage(!showUsage);
  };

  const toggleRestrictions = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setShowRestrictions(!showRestrictions);
  };

  const handleDonation = () =>{
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setShowDonation(!showDonation);
  };
  const handlePaypalClick= ()=>{
    const paypalUrl = 'https://www.paypal.me/WDeveloper56';
  Linking.openURL(paypalUrl).catch(err => 
    console.error("Failed to open PayPal:", err)
  );
  }
  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>Privacy Policy & Terms of Use</Text>

        <Text style={styles.sectionTitle}>Purpose of the Application</Text>
        <Text style={styles.paragraph}>
          This application is built to assist individuals in Myanmar by providing timely emergency updates and enabling users to report incidents in real-time. 
          The goal is to enhance public safety, foster civic responsibility, and enable better crisis communication in both online and offline scenarios.
          We are trying to make a better Myanmar, We are trying to update for better features! You can send your opinions from eamil!
        </Text>

        <Text style={styles.sectionTitle}>What Data We Collect</Text>
        <Text style={styles.paragraph}>
          The app strictly avoids collecting any personally identifiable information (PII) 
          unless explicitly required by a feature and agreed to by the user. We only gather:
        </Text>
        <Text style={styles.listItem}>• Emergency reports submitted by users</Text>
        <Text style={styles.listItem}>• SOS messages (including location if granted)</Text>
        <Text style={styles.listItem}>• Device location only during SOS requests (user permission is required)</Text>

        <Text style={styles.sectionTitle}>How Your Data is Used</Text>
        <Text style={styles.paragraph}>
          All data collected is used exclusively for public safety purposes and includes:
        </Text>
        <Text style={styles.listItem}>• Delivering emergency alerts</Text>
        <Text style={styles.listItem}>• Displaying relevant news and updates</Text>
        <Text style={styles.listItem}>• Broadcasting SOS requests for assistance</Text>
        <Text style={styles.listItem}>• Improving the quality and relevance of emergency services</Text>

        <Text style={styles.sectionTitle}>Third-Party Integrations</Text>
        <Text style={styles.paragraph}>
          The app uses public APIs from trusted sources, including:
        </Text>
        <Text style={styles.listItem}>• USGS (earthquake monitoring)</Text>
        <Text style={styles.listItem}>• Met Norway (storm warnings)</Text>
        <Text style={styles.paragraph}>
          These services have independent privacy policies that govern their data handling practices.
        </Text>

        <Text style={styles.sectionTitle}>Data Protection & Security</Text>
        <Text style={styles.paragraph}>
          All report data is stored securely and handled in compliance with industry-standard privacy and security practices. SOS messages are sent only with user permission and are not stored permanently unless required for follow-up safety purposes.
        </Text>

        <Text style={styles.sectionTitle}>User Rights</Text>
        <Text style={styles.listItem}>• You may opt out of location services at any time</Text>
        <Text style={styles.listItem}>• You may delete your reports if you submitted them</Text>
        <Text style={styles.listItem}>• You may review and request correction of any data submitted</Text>

        <TouchableOpacity onPress={toggleUsage} style={styles.expandableHeader}>
          <Text style={styles.sectionTitle}>📘 How to Use This App {showUsage ? '▲' : '▼'}</Text>
        </TouchableOpacity>
        {showUsage && (
          <View style={styles.expandedContent}>
            <Text style={styles.paragraph}>1. Open the app to see real-time emergency updates based on your region.</Text>
            <Text style={styles.paragraph}>2. Use the “Report Emergency” button to share any critical events with others.</Text>
            <Text style={styles.paragraph}>3. Tap the SOS button if you're in danger. Your location and status will be sent automatically if permitted.</Text>
            <Text style={styles.paragraph}>4. In offline mode, the app will try to use Wi-Fi Direct to send SOS messages.</Text>
            <Text style={styles.paragraph}>5. "Tap To Receive" is only for Oflline situation. User can receive by tapping "Tap To Receive"</Text>
          </View>
        )}

        <TouchableOpacity onPress={toggleRestrictions} style={styles.expandableHeader}>
          <Text style={styles.sectionTitle}>🚫 What Not to Do {showRestrictions ? '▲' : '▼'}</Text>
        </TouchableOpacity>
        {showRestrictions && (
          <View style={styles.expandedContent}>
            <Text style={styles.paragraph}>• Do not submit false or misleading emergency reports.</Text>
            <Text style={styles.paragraph}>• Do not use the SOS system as a joke — it's designed to save lives.</Text>
            <Text style={styles.paragraph}>• Do not tamper with location permissions unless privacy is a concern.</Text>
            <Text style={styles.paragraph}>• Do not use this app for non-emergency communication.</Text>
          </View>
        )}

        <TouchableOpacity onPress={handleDonation} style={styles.expandableHeader}>
          <Text style={[styles.sectionTitle,{textAlign: 'center'}]}>Donation(Click)</Text>
        </TouchableOpacity>
        {showDonation && (
          <View style={styles.expandedContent}>
          <Text style={styles.paragraph}>We don't use this donation for our national interest.</Text>
          <Text style={styles.paragraph}>We are trying to help people. We will use to imporvement app and to help people.</Text>
          <Text style={styles.paragraph}>You have the right to choice what you do!</Text>
          <Text style={[styles.paragraph, { color: 'red', fontWeight: 'bold' }]}>Please, Note should be Donation</Text>
          <Image source={require('./assets/donation.jpg')}
           style = {{ width: '300', height: '370' }}
          />
           <Image source={require('./assets/binance.png')}
           style = {{ width: '300', height: '370' }}
          />
          <TouchableOpacity onPress={handlePaypalClick} style={styles.paypallink}><Text style={styles.paypaltext}>Donate by PayPal (Click Here)</Text></TouchableOpacity>
        </View>
        )}
        
        <Text style={styles.footer}>
          © 2025 Myanmar SOSMM App. All rights reserved. Last updated: April 2025
        </Text>
        <Text style={[styles.paragraph,{marginBottom : 20,fontSize : 12,textAlign: 'center'}]}>Contact email: khantminlwin333@gmail.com</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#101010',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  title: {
    fontSize: 20,
    color: '#ff4444',
    fontWeight: 'bold',
    marginBottom: 12,
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    color: '#ff8888',
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 10,
  },
  paypallink: {
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 10,
  },
  paypaltext:{
    color: 'white',
    fontSize: 20
  },
  paragraph: {
    fontSize: 16,
    color: '#ddd',
    marginBottom: 10,
    lineHeight: 22,
  },
  listItem: {
    fontSize: 16,
    color: '#ccc',
    marginLeft: 10,
    marginBottom: 8,
    lineHeight: 22,
  },
  footer: {
    fontSize: 12,
    color: '#888',
    marginTop: 30,
    marginBottom: 0,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  button: {
    backgroundColor: '#ff4444',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 30,
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  expandableHeader: {
    marginTop: 20,
  },
  expandedContent: {
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    padding: 15,
    marginTop: 10,
  },
});
