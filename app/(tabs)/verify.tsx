import { MaterialIcons } from '@expo/vector-icons';
import { useRoute } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import React, { useRef, useState } from 'react';
import {
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';

export default function VerifyScreen() {
  const route = useRoute();
  const router = useRouter();
  const params = route.params as any;
  const userEmail = params?.email || 'user@example.com';
  
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [language, setLanguage] = useState('en');
  const [phoneNumber] = useState('2345678');
  const inputRefs = useRef<(TextInput | null)[]>([]);

  const handleCodeInputChange = (index: number, value: string) => {
    const numericValue = value.replace(/[^0-9]/g, '');
    
    if (numericValue.length > 1) {
      // If user pastes multiple digits
      const digits = numericValue.split('');
      const newCode = [...code];
      for (let i = 0; i < digits.length && index + i < 6; i++) {
        newCode[index + i] = digits[i];
      }
      setCode(newCode);
      
      // Focus on the last filled input or the next empty one
      const nextEmptyIndex = newCode.findIndex(d => d === '');
      if (nextEmptyIndex !== -1) {
        inputRefs.current[nextEmptyIndex]?.focus();
      } else {
        inputRefs.current[5]?.focus();
      }
    } else {
      const newCode = [...code];
      newCode[index] = numericValue;
      setCode(newCode);
      
      // Auto-focus to next input
      if (numericValue && index < 5) {
        inputRefs.current[index + 1]?.focus();
      }
    }
  };

  const handleKeyPress = (index: number, key: string) => {
    if (key === 'Backspace') {
      const newCode = [...code];
      if (code[index]) {
        newCode[index] = '';
      } else if (index > 0) {
        newCode[index - 1] = '';
        inputRefs.current[index - 1]?.focus();
      }
      setCode(newCode);
    }
  };

  const isCodeComplete = code.every(digit => digit !== '');

  const handleVerifyPress = () => {
    if (!isCodeComplete) {
      alert('Please enter all 6 digits');
      return;
    }
    const fullCode = code.join('');
    console.log('Verification code submitted:', fullCode);
    // Navigate to profile page with email
    router.push({ pathname: '/(tabs)/profile', params: { email: userEmail } });
  };

  const handleResendCodePress = () => {
    setCode(['', '', '', '', '', '']);
    inputRefs.current[0]?.focus();
    console.log('Resend code requested');
    // Reset code and show toast/alert
    alert('Code has been resent to your phone');
  };

  const handleLanguagePress = () => {
    setLanguage(language === 'en' ? 'ar' : 'en');
    console.log('Language toggled to:', language === 'en' ? 'Arabic' : 'English');
  };

  const handleBackPress = () => {
    router.push('/(tabs)/signup');
  };

  const handleHelpPress = () => {
    console.log('Help button pressed');
  };

  return (
    <View style={styles.container}>
      {/* Light Background */}
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
          <Text style={styles.cardHeading}>Verify Your Phone</Text>
          <Text style={styles.cardSubtitle}>
            Enter the 6-digit code sent to {phoneNumber}
          </Text>

          {/* OTP Input Fields */}
          <View style={styles.otpContainer}>
            {code.map((digit, index) => (
              <TextInput
                key={index}
                ref={(ref) => {
                  inputRefs.current[index] = ref;
                }}
                style={[styles.otpInput, digit !== '' && styles.otpInputFilled]}
                placeholder=""
                placeholderTextColor="#D0D0D0"
                value={digit}
                onChangeText={(value) => handleCodeInputChange(index, value)}
                onKeyPress={({ nativeEvent: { key } }) => handleKeyPress(index, key)}
                keyboardType="number-pad"
                maxLength={1}
                editable={true}
              />
            ))}
          </View>

          {/* Verify Button */}
          <TouchableOpacity
            style={[
              styles.verifyButton,
              !isCodeComplete && styles.verifyButtonDisabled
            ]}
            onPress={handleVerifyPress}
            activeOpacity={0.9}
            disabled={!isCodeComplete}
          >
            <Text style={styles.verifyButtonText}>Verify</Text>
          </TouchableOpacity>

          {/* Resend Code Link */}
          <TouchableOpacity
            onPress={handleResendCodePress}
            style={styles.resendCodeContainer}
          >
            <Text style={styles.resendCodeLink}>Resend Code</Text>
          </TouchableOpacity>
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
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 32,
    gap: 8,
  },
  otpInput: {
    flex: 1,
    aspectRatio: 1,
    borderWidth: 1.5,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    fontSize: 24,
    fontWeight: '600',
    color: '#333333',
    textAlign: 'center',
    backgroundColor: '#FAFAFA',
  },
  otpInputFilled: {
    borderColor: '#0D47A1',
    backgroundColor: '#F0F5FF',
    color: '#0D47A1',
  },
  verifyButton: {
    backgroundColor: '#0D47A1',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#0D47A1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  verifyButtonDisabled: {
    backgroundColor: '#CCCCCC',
    shadowColor: '#999999',
    shadowOpacity: 0.2,
  },
  verifyButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
    textAlign: 'center',
  },
  resendCodeContainer: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  resendCodeLink: {
    fontSize: 14,
    color: '#0D47A1',
    fontWeight: '600',
    textDecorationLine: 'underline',
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
