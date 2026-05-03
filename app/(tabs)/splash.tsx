import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
    Dimensions,
    Platform,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

const WINDOW_HEIGHT = Dimensions.get('window').height;
const WINDOW_WIDTH = Dimensions.get('window').width;

export default function SplashScreen() {
  const [language, setLanguage] = useState('en');
  const router = useRouter();

  const handlePatientPress = () => {
    // Navigate to login page
    router.push('/(tabs)/login');
  };

  const handleProfessionalPress = () => {
    // Navigate to professional login page
    router.push('/(tabs)/doclogin');
  };

  const handleLanguagePress = () => {
    // Toggle language
    setLanguage(language === 'en' ? 'ar' : 'en');
    console.log('Language toggled to:', language === 'en' ? 'Arabic' : 'English');
  };

  const handleHelpPress = () => {
    // Show help or support modal
    console.log('Help button pressed');
  };

  return <WelcomeScreen
    language={language}
    onLanguagePress={handleLanguagePress}
    onPatientPress={handlePatientPress}
    onProfessionalPress={handleProfessionalPress}
    onHelpPress={handleHelpPress}
  />;
}

// Welcome Screen Component
function WelcomeScreen({
  language,
  onLanguagePress,
  onPatientPress,
  onProfessionalPress,
  onHelpPress,
}: any) {
  return (
    <View style={styles.container}>
      {/* Deep Royal Blue Gradient Background */}
      <View style={styles.background} />

      {/* Language Selector - Top Right */}
      <TouchableOpacity
        style={styles.languageButton}
        onPress={onLanguagePress}
        activeOpacity={0.7}
      >
        <MaterialIcons name="language" size={16} color="white" />
        <Text style={styles.languageText}>العربية</Text>
      </TouchableOpacity>

      {/* Main Content - Centered */}
      <View style={styles.centerContent}>
        {/* Heart Icon */}
        <View style={styles.iconContainer}>
          <MaterialIcons name="favorite" size={60} color="#1E5A96" />
        </View>

        {/* Brand Name */}
        <Text style={styles.brandName}>VitalConnect</Text>

        {/* Tagline */}
        <Text style={styles.tagline}>Your health, always connected</Text>

        {/* Buttons Container */}
        <View style={styles.buttonsContainer}>
          {/* Patient Button - Solid White */}
          <TouchableOpacity
            style={styles.patientButton}
            onPress={onPatientPress}
            activeOpacity={0.9}
          >
            <Text style={styles.patientButtonText}>Continue as Patient</Text>
          </TouchableOpacity>

          {/* Professional Button - Ghost/Transparent */}
          <TouchableOpacity
            style={styles.professionalButton}
            onPress={onProfessionalPress}
            activeOpacity={0.8}
          >
            <Text style={styles.professionalButtonText}>
              Healthcare Professional Portal
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Footer Text - Bottom Center */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>Powered by AI • MENA Region</Text>
      </View>

      {/* Help Button - Bottom Right */}
      <TouchableOpacity
        style={styles.helpButton}
        onPress={onHelpPress}
        activeOpacity={0.7}
      >
        <Text style={styles.helpButtonIcon}>?</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#0D47A1',
    position: 'relative',
  },
  background: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#0D47A1',
    zIndex: 0,
  },
  languageButton: {
    position: 'absolute',
    top: 40,
    right: 24,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    zIndex: 10,
  },
  languageText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 5,
    gap: 16,
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
  },
  brandName: {
    fontSize: 48,
    fontWeight: '700',
    color: 'white',
    textAlign: 'center',
    fontFamily: Platform.select({
      ios: 'System',
      android: 'Roboto',
      web: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    }),
  },
  tagline: {
    fontSize: 16,
    color: 'white',
    textAlign: 'center',
    fontWeight: '400',
    marginBottom: 32,
    opacity: 0.95,
  },
  buttonsContainer: {
    width: '85%',
    maxWidth: 380,
    gap: 12,
    marginTop: 16,
  },
  patientButton: {
    backgroundColor: 'white',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 6,
  },
  patientButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0D47A1',
    textAlign: 'center',
  },
  professionalButton: {
    backgroundColor: 'transparent',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
  },
  professionalButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
    textAlign: 'center',
  },
  footer: {
    position: 'absolute',
    bottom: 32,
    left: 0,
    right: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  footerText: {
    fontSize: 12,
    color: 'white',
    opacity: 0.85,
    textAlign: 'center',
  },
  helpButton: {
    position: 'absolute',
    bottom: 32,
    right: 24,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#333333',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
    zIndex: 10,
  },
  helpButtonIcon: {
    fontSize: 24,
    fontWeight: '700',
    color: 'white',
  },
});