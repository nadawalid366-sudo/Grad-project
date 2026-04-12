import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';

export default function SignUpScreen() {
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [language, setLanguage] = useState('en');
  const router = useRouter();

  const handleContinuePress = () => {
    // Handle account creation
    if (!email || !phone || !password) {
      alert('Please fill in all fields');
      return;
    }
    console.log('Account created:', { email, phone, password });
    // Navigate to verify page with email
    router.push({ pathname: '/(tabs)/verify', params: { email } });
  };

  const handleSignInPress = () => {
    // Navigate back to login page
    router.push('/login');
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

  const handleBackPress = () => {
    // Navigate back to login screen
    router.push('/(tabs)/login');
  };

  return (
    <View style={styles.container}>
      {/* Deep Royal Blue Gradient Background */}
      <View style={styles.background} />

      {/* Language Selector - Top Right */}
      <TouchableOpacity
        style={styles.languageButton}
        onPress={handleLanguagePress}
        activeOpacity={0.7}
      >
        <MaterialIcons name="language" size={16} color="white" />
        <Text style={styles.languageText}>العربية</Text>
      </TouchableOpacity>

      {/* Back Button - Top Left */}
      <TouchableOpacity
        style={styles.backButton}
        onPress={handleBackPress}
        activeOpacity={0.7}
      >
        <MaterialIcons name="arrow-back" size={24} color="white" />
      </TouchableOpacity>

      {/* Main Content - ScrollView for mobile devices */}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.cardContainer}>
          {/* Header */}
          <Text style={styles.cardHeading}>Create Account</Text>
          <Text style={styles.cardSubtitle}>Join VitalConnect to start your health journey</Text>

          {/* Email Field */}
          <View style={styles.fieldContainer}>
            <View style={styles.fieldLabelContainer}>
              <Text style={styles.fieldLabel}>Email Address</Text>
              <Text style={styles.requiredAsterisk}>*</Text>
            </View>
            <View style={styles.inputContainer}>
              <MaterialIcons name="mail" size={20} color="#999" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="you@example.com"
                placeholderTextColor="#A0A0A0"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>
          </View>

          {/* Phone Number Field */}
          <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>Phone Number</Text>
            <View style={styles.inputContainer}>
              <MaterialIcons name="phone" size={20} color="#999" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="+20 123 456 7890"
                placeholderTextColor="#A0A0A0"
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
              />
            </View>
          </View>

          {/* Password Field */}
          <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>Password</Text>
            <View style={styles.inputContainer}>
              <MaterialIcons name="lock" size={20} color="#999" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="••••••••"
                placeholderTextColor="#A0A0A0"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!passwordVisible}
              />
              <TouchableOpacity
                onPress={() => setPasswordVisible(!passwordVisible)}
                activeOpacity={0.7}
              >
                <MaterialIcons
                  name={passwordVisible ? 'visibility' : 'visibility-off'}
                  size={20}
                  color="#999"
                  style={styles.eyeIcon}
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Continue Button */}
          <TouchableOpacity
            style={styles.continueButton}
            onPress={handleContinuePress}
            activeOpacity={0.9}
          >
            <Text style={styles.continueButtonText}>Continue</Text>
          </TouchableOpacity>

          {/* Sign In Link */}
          <View style={styles.signInContainer}>
            <Text style={styles.signInText}>Already have an account? </Text>
            <TouchableOpacity onPress={handleSignInPress}>
              <Text style={styles.signInLink}>Sign In</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Help Button - Bottom Right */}
      <TouchableOpacity
        style={styles.helpButton}
        onPress={handleHelpPress}
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
    backgroundColor: '#0D47A1',
    position: 'relative',
  },
  background: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'white',
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
  backButton: {
    position: 'absolute',
    top: 40,
    left: 24,
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    
    alignItems: 'center',
    zIndex: 10,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  cardContainer: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 32,
    marginHorizontal: 20,
    maxWidth: 500,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    //shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 10,
  },
  cardHeading: {
    fontSize: 28,
    fontWeight: '700',
    color: '#333333',
    marginBottom: 8,
  },
  cardSubtitle: {
    fontSize: 14,
    color: '#888888',
    marginBottom: 32,
    fontWeight: '400',
  },
  fieldContainer: {
    marginBottom: 24,
  },
  fieldLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333333',
  },
  requiredAsterisk: {
    color: '#DC3545',
    fontSize: 14,
    fontWeight: '700',
    marginLeft: 4,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#E0E0E0',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: '#FAFAFA',
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: '#333333',
    paddingVertical: 4,
  },
  eyeIcon: {
    marginLeft: 10,
  },
  continueButton: {
    backgroundColor: '#0D47A1',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
    shadowColor: '#0D47A1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  continueButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
    textAlign: 'center',
  },
  signInContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
  },
  signInText: {
    fontSize: 14,
    color: '#888888',
  },
  signInLink: {
    fontSize: 14,
    color: '#0D47A1',
    fontWeight: '600',
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
