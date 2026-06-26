import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Keyboard,
    KeyboardAvoidingView,
    Modal,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { saveUserSubscription } from '../services/api';

export default function PaymentScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    email?: string;
    professionalId?: string;
    professionalTitle?: string;
    planName?: string;
    amount?: string;
    period?: string;
  }>();

  const [cardName, setCardName] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [last4, setLast4] = useState('');

  const amountNumber = useMemo(() => {
    const parsed = Number(params.amount ?? '0');
    return Number.isFinite(parsed) ? parsed : 0;
  }, [params.amount]);

  const userEmail = params.email ?? '';
  const professionalId = params.professionalId ?? '';
  const professionalTitle = params.professionalTitle ?? 'Professional Plan';
  const planName = params.planName ?? 'Selected Plan';
  const period = params.period ?? 'per month';

  const digitsOnly = (value: string) => value.replace(/\D/g, '');

  const handleCardNumberChange = (value: string) => {
    const digits = digitsOnly(value).slice(0, 16);
    const grouped = digits.replace(/(.{4})/g, '$1 ').trim();
    setCardNumber(grouped);
  };

  const handleExpiryChange = (value: string) => {
    const digits = digitsOnly(value).slice(0, 4);
    if (digits.length >= 3) {
      setExpiry(`${digits.slice(0, 2)}/${digits.slice(2)}`);
    } else {
      setExpiry(digits);
    }
  };

  const isFormValid =
    cardName.trim().length > 2 &&
    cardNumber.replace(/\s/g, '').length >= 16 &&
    expiry.trim().length >= 4 &&
    cvv.trim().length >= 3;

  const handlePayNow = async () => {
    Keyboard.dismiss();
    setErrorMessage('');

    if (!isFormValid) {
      const problems: string[] = [];
      if (cardName.trim().length <= 2) problems.push('cardholder name');
      if (cardNumber.replace(/\s/g, '').length < 16)
        problems.push('a 16-digit card number');
      if (expiry.trim().length < 4) problems.push('expiry (MM/YY)');
      if (cvv.trim().length < 3) problems.push('CVV');
      setErrorMessage(`Please enter ${problems.join(', ')}.`);
      return;
    }

    try {
      setIsProcessing(true);
      setLast4(digitsOnly(cardNumber).slice(-4));
      await new Promise((resolve) => setTimeout(resolve, 1500));
      if (userEmail) {
        await saveUserSubscription({
          email: userEmail,
          subscription: {
            id: `${professionalTitle}-${planName}`,
            professionalId: professionalId || null,
            professionalTitle,
            planName,
            amount: amountNumber,
            period,
            selectedDoctorName: professionalTitle,
          },
        });
      }
      setShowSuccess(true);
    } catch (error) {
      console.log('Failed to save subscription:', error);
      setErrorMessage(
        'Could not complete the subscription. Check your connection and try again.',
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const goToMessages = () => {
    setShowSuccess(false);
    router.replace({
      pathname: '/(tabs)/messages',
      params: {
        email: userEmail,
        subscribedProfessionalId: professionalId,
        subscribedProfessionalTitle: professionalTitle,
        subscribedPlanName: planName,
      },
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <Ionicons name="chevron-back" size={24} color="#3B82F6" />
        </Pressable>
        <Text style={styles.headerTitle}>Payment</Text>
        <View style={{ width: 24 }} />
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
      >
        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.contentContainer}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        >
          <View style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>{professionalTitle}</Text>
            <Text style={styles.summaryPlan}>{planName}</Text>
            <View style={styles.priceRow}>
              <Text style={styles.price}>${amountNumber}</Text>
              <Text style={styles.period}>{period}</Text>
            </View>
          </View>

          <View style={styles.formCard}>
            <Text style={styles.sectionTitle}>Card Information</Text>

            <Text style={styles.label}>Cardholder Name</Text>
            <TextInput
              style={styles.input}
              value={cardName}
              onChangeText={(value) => {
                setCardName(value);
                if (errorMessage) setErrorMessage('');
              }}
              placeholder="John Doe"
              placeholderTextColor="#9CA3AF"
              autoCapitalize="words"
            />

            <Text style={styles.label}>Card Number</Text>
            <TextInput
              style={styles.input}
              value={cardNumber}
              onChangeText={(value) => {
                handleCardNumberChange(value);
                if (errorMessage) setErrorMessage('');
              }}
              keyboardType="number-pad"
              placeholder="1234 5678 9012 3456"
              placeholderTextColor="#9CA3AF"
              maxLength={19}
            />

            <View style={styles.row}>
              <View style={styles.halfField}>
                <Text style={styles.label}>Expiry</Text>
                <TextInput
                  style={styles.input}
                  value={expiry}
                  onChangeText={(value) => {
                    handleExpiryChange(value);
                    if (errorMessage) setErrorMessage('');
                  }}
                  keyboardType="number-pad"
                  placeholder="MM/YY"
                  placeholderTextColor="#9CA3AF"
                  maxLength={5}
                />
              </View>

              <View style={styles.halfField}>
                <Text style={styles.label}>CVV</Text>
                <TextInput
                  style={styles.input}
                  value={cvv}
                  onChangeText={(value) => {
                    setCvv(digitsOnly(value).slice(0, 4));
                    if (errorMessage) setErrorMessage('');
                  }}
                  keyboardType="number-pad"
                  placeholder="123"
                  placeholderTextColor="#9CA3AF"
                  maxLength={4}
                />
              </View>
            </View>
          </View>

          {errorMessage ? (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle" size={18} color="#DC2626" />
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          ) : null}

          <Pressable
            style={({ pressed }) => [
              styles.payButton,
              !isFormValid && styles.payButtonInactive,
              pressed && styles.payButtonPressed,
            ]}
            onPress={handlePayNow}
            disabled={isProcessing}
            android_ripple={{ color: '#1D4ED8' }}
          >
            {isProcessing ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.payButtonText}>Pay ${amountNumber}</Text>
            )}
          </Pressable>

          <Text style={styles.helperText}>
            Demo payment — use any name, a 16-digit number, future expiry and CVV.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal
        visible={showSuccess}
        transparent
        animationType="fade"
        onRequestClose={goToMessages}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.successIcon}>
              <Ionicons name="checkmark" size={36} color="#FFFFFF" />
            </View>
            <Text style={styles.modalTitle}>Payment Successful</Text>
            <Text style={styles.modalText}>
              You are now subscribed to {professionalTitle} — {planName}.
              {last4 ? `\nCharged to card ending in ${last4}.` : ''}
            </Text>

            <Pressable
              style={({ pressed }) => [
                styles.modalPrimaryButton,
                pressed && styles.payButtonPressed,
              ]}
              onPress={goToMessages}
            >
              <Text style={styles.modalPrimaryText}>Open Messages</Text>
            </Pressable>

            <Pressable
              onPress={() => {
                setShowSuccess(false);
                router.back();
              }}
            >
              <Text style={styles.modalSecondaryText}>Back to Professionals</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  flex: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    gap: 14,
    paddingBottom: 40,
  },
  summaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  summaryTitle: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 4,
  },
  summaryPlan: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginTop: 10,
    gap: 6,
  },
  price: {
    fontSize: 30,
    fontWeight: '800',
    color: '#2563EB',
  },
  period: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 5,
  },
  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 14,
  },
  label: {
    fontSize: 13,
    color: '#374151',
    marginBottom: 6,
    marginTop: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 11,
    fontSize: 15,
    color: '#111827',
    backgroundColor: '#FFFFFF',
  },
  row: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  halfField: {
    flex: 1,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 10,
    padding: 12,
  },
  errorText: {
    flex: 1,
    color: '#B91C1C',
    fontSize: 13,
    fontWeight: '600',
  },
  payButton: {
    backgroundColor: '#2563EB',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
  },
  payButtonInactive: {
    backgroundColor: '#60A5FA',
  },
  payButtonPressed: {
    opacity: 0.85,
  },
  payButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
  },
  helperText: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: '#00000080',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCard: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
  },
  successIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  modalText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  modalPrimaryButton: {
    backgroundColor: '#2563EB',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    width: '100%',
    marginBottom: 12,
  },
  modalPrimaryText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  modalSecondaryText: {
    color: '#6B7280',
    fontSize: 14,
    fontWeight: '600',
  },
});
