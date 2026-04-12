import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import {
    Alert,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

export default function PaymentScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    professionalTitle?: string;
    planName?: string;
    amount?: string;
    period?: string;
  }>();

  const [cardName, setCardName] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');

  const amountNumber = useMemo(() => {
    const parsed = Number(params.amount ?? '0');
    return Number.isFinite(parsed) ? parsed : 0;
  }, [params.amount]);

  const professionalTitle = params.professionalTitle ?? 'Professional Plan';
  const planName = params.planName ?? 'Selected Plan';
  const period = params.period ?? 'per month';

  const isFormValid =
    cardName.trim().length > 2 &&
    cardNumber.replace(/\s/g, '').length >= 16 &&
    expiry.trim().length >= 4 &&
    cvv.trim().length >= 3;

  const handlePayNow = () => {
    if (!isFormValid) {
      Alert.alert('Missing Information', 'Please fill all payment fields correctly.');
      return;
    }

    Alert.alert('Payment Successful', `You are now subscribed to ${planName}.`, [
      {
        text: 'OK',
        onPress: () => router.back(),
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color="#3B82F6" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Payment</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
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
            onChangeText={setCardName}
            placeholder="John Doe"
            placeholderTextColor="#9CA3AF"
          />

          <Text style={styles.label}>Card Number</Text>
          <TextInput
            style={styles.input}
            value={cardNumber}
            onChangeText={setCardNumber}
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
                onChangeText={setExpiry}
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
                onChangeText={setCvv}
                keyboardType="number-pad"
                placeholder="123"
                placeholderTextColor="#9CA3AF"
                secureTextEntry
                maxLength={4}
              />
            </View>
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.payButton, !isFormValid && styles.payButtonDisabled]}
          onPress={handlePayNow}
          disabled={!isFormValid}
        >
          <Text style={styles.payButtonText}>Pay ${amountNumber}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
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
    paddingBottom: 120,
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
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  payButton: {
    backgroundColor: '#2563EB',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  payButtonDisabled: {
    backgroundColor: '#93C5FD',
  },
  payButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
  },
});
