import React, { useState, useEffect } from "react";
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  Alert,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { sendNewsReport } from '../services/backendApi';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function SendNewsScreen({ navigation }) {
  const [news, setNews] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [level, setLevel] = useState("normal"); // "normal", "high", "critical"
  const [submittedReports, setSubmittedReports] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState(null);
  

  const newsCategories = ["Earthquake", "Storm", "Disease", "Disaster", "Rescue", "Other"];

  const levelOptions = [
    { level: "normal", label: "Standard", description: "Informational report, not urgent" },
    { level: "high", label: "Important", description: "Significant event requiring attention" },
    { level: "critical", label: "Critical", description: "Life-threatening situation, immediate response needed" }
  ];
  const MAX_SUBMISSIONS = 5;
const SUBMISSION_TIME_WINDOW = 60000; // 1 minute
const MAX_WORD_COUNT = 100;

const submitNews = async () => {
  if (news.trim() === "") {
    Alert.alert("⚠️ Error", "Please enter a report.");
    return;
  }

  if (!selectedCategory) {
    Alert.alert("⚠️ Error", "Please select a category for your report.");
    return;
  }

  // Check if the report has more than MAX_WORD_COUNT words
  const wordCount = news.trim().split(/\s+/).length;
  if (wordCount > MAX_WORD_COUNT) {
    Alert.alert("⚠️ Error", `Report exceeds the maximum allowed word count of ${MAX_WORD_COUNT} words.`);
    return;
  }

  // Retrieve submission history from AsyncStorage
  let submissionHistory = await getSubmissionHistory();

  // Check if the user has exceeded the submission limit
  const now = Date.now();
  submissionHistory = submissionHistory.filter(submissionTime => now - submissionTime < SUBMISSION_TIME_WINDOW);

  if (submissionHistory.length >= MAX_SUBMISSIONS) {
    Alert.alert("⚠️ Error", `You can only submit ${MAX_SUBMISSIONS} reports in the last minute. Please wait before submitting another report.`);
    return;
  }

  // Add the current submission time to the history
  submissionHistory.push(now);

  // Save updated history to AsyncStorage
  await saveSubmissionHistory(submissionHistory);

  try {
    setSubmitting(true);

    const reportData = {
      content: news,
      category: selectedCategory.toLowerCase(),
      level: level,
      timestamp: new Date().toISOString(),
    };

    const result = await sendNewsReport(reportData);

    if (result.success) {
      const newReport = {
        content: reportData.content,
        category: reportData.category,
        level: reportData.level,
        timestamp: reportData.timestamp,
      };

      setSubmittedReports(prevReports => [newReport, ...prevReports]);
      Alert.alert(
        "📢 REPORT SENT",
        `Your emergency report has been submitted successfully.${level === 'critical' ? ' It has been marked as CRITICAL.' : ''}`,
        [
          {
            text: "OK",
            style: "cancel",
          },
        ]
      );
      setNews("");
      setSelectedCategory("");
      setLevel("normal");
    } else {
      throw new Error(result.error || "Submission failed");
    }
  } catch (error) {
    if (error instanceof Error) {
      console.error('Error in submitNews:', error.stack);
    } else {
      console.error('Unexpected error in submitNews:', error);
    }

    Alert.alert("❌ Submission Failed", error.message || "There was a problem submitting your report. Please check your connection and try again.");
    console.error("Error submitting news report:", error);
  } finally {
    setSubmitting(false);
  }
};

// Helper function to retrieve submission history from AsyncStorage
const getSubmissionHistory = async () => {
  try {
    const history = await AsyncStorage.getItem('submissionHistory');
    return history ? JSON.parse(history) : [];
  } catch (error) {
    console.error('Error retrieving submission history:', error);
    return [];
  }
};

// Helper function to save submission history to AsyncStorage
const saveSubmissionHistory = async (history) => {
  try {
    await AsyncStorage.setItem('submissionHistory', JSON.stringify(history));
  } catch (error) {
    console.error('Error saving submission history:', error);
  }
};
  

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>📢 REPORT NEWS</Text>

        {/* Category Selection */}
        <View style={styles.sectionTitle}>
          <Text style={styles.sectionTitleText}>Select Category:</Text>
        </View>
        <View style={styles.tagContainer}>
          {newsCategories.map((cat) => (
            <TouchableOpacity
              key={cat}
              style={[styles.tagButton, selectedCategory === cat && styles.selectedTag]}
              onPress={() => setSelectedCategory(cat)}
            >
              <Text style={[styles.tagText, selectedCategory === cat && styles.selectedTagText]}>
                {selectedCategory === cat ? "✓ " : ""}{cat}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Level Selection */}
        <View style={styles.sectionTitle}>
          <Text style={styles.sectionTitleText}>Urgency Level:</Text>
        </View>
        <View style={styles.urgencyContainer}>
          {levelOptions.map((opt) => (
            <TouchableOpacity
              key={opt.level}
              style={[
                styles.urgencyButton,
                level === opt.level && styles.selectedUrgency,
                opt.level === 'high' && styles.highUrgency,
                opt.level === 'critical' && styles.criticalUrgency,
              ]}
              onPress={() => setLevel(opt.level)}
            >
              <Text style={[
                styles.urgencyText,
                level === opt.level && styles.selectedUrgencyText
              ]}>
                {opt.label}
              </Text>
              <Text style={styles.urgencyDescription}>{opt.description}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* News Content Input */}
        <View style={styles.sectionTitle}>
          <Text style={styles.sectionTitleText}>Report Details:</Text>
        </View>
        <TextInput
          style={styles.input}
          placeholder="Describe the emergency situation in detail..."
          placeholderTextColor="gray"
          multiline
          numberOfLines={4}
          value={news}
          onChangeText={setNews}
        />

        {/* Submit Button */}
        <TouchableOpacity
          style={[
            styles.button,
            level === 'critical' && styles.criticalButton,
            submitting && styles.disabledButton
          ]}
          onPress={submitNews}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color="white" size="small" />
          ) : (
            <Text style={styles.buttonText}>
              {level === 'critical' ? '🚨 SUBMIT CRITICAL REPORT' : '📢 Submit Report'}
            </Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#111", paddingBottom: 70 },
  scrollContent: { padding: 20, paddingBottom: 30 },
  title: { fontSize: 24, fontWeight: "bold", color: "#ff4444", marginBottom: 15, textTransform: "uppercase", textAlign: "center" },
  sectionTitle: { marginTop: 15, marginBottom: 10 },
  sectionTitleText: { color: "#ddd", fontSize: 16, fontWeight: "bold" },
  tagContainer: { flexDirection: "row", flexWrap: "wrap", marginBottom: 10 },
  tagButton: { backgroundColor: "#333", paddingVertical: 8, paddingHorizontal: 12, borderRadius: 20, margin: 5, borderWidth: 1, borderColor: "#555" },
  selectedTag: { backgroundColor: "#444", borderColor: "#ff4444" },
  tagText: { color: "#fff", fontSize: 14 },
  selectedTagText: { color: "#ff4444", fontWeight: "bold" },
  urgencyContainer: { marginBottom: 15 },
  urgencyButton: { backgroundColor: "#333", padding: 10, borderRadius: 8, marginBottom: 8, borderLeftWidth: 4, borderColor: "#555" },
  highUrgency: { borderColor: "#ff9900" },
  criticalUrgency: { borderColor: "#ff0000" },
  selectedUrgency: { backgroundColor: "#444" },
  urgencyText: { color: "#fff", fontSize: 16, fontWeight: "bold", marginBottom: 4 },
  selectedUrgencyText: { color: "#ff4444" },
  urgencyDescription: { color: "#aaa", fontSize: 12 },
  input: { width: "100%", height: 150, borderWidth: 2, borderColor: "#444", borderRadius: 10, paddingHorizontal: 15, paddingVertical: 10, backgroundColor: "#222", color: "white", textAlignVertical: "top", marginBottom: 20, fontSize: 16 },
  button: { backgroundColor: "#333", paddingVertical: 15, paddingHorizontal: 30, borderRadius: 8, alignItems: "center", marginBottom: 15 },
  criticalButton: { backgroundColor: "#661111" },
  disabledButton: { opacity: 0.6 },
  buttonText: { color: "white", fontSize: 18, fontWeight: "bold" },
});
