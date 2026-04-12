import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  Dimensions,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

const { width } = Dimensions.get('window');

interface Professional {
  id: string;
  type: 'doctor' | 'nutritionist' | 'coach';
  title: string;
  description: string;
  icon: string;
  subscriptionPlans: SubscriptionPlan[];
  features: string[];
  rating: number;
  reviewCount: number;
}

interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  period: string;
  description: string;
  features: string[];
}

export default function FindProfessionals() {
  const router = useRouter();
  const [selectedTab, setSelectedTab] = useState('professionals');

  const handleSubscribeNow = (professional: Professional, plan: SubscriptionPlan) => {
    router.push({
      pathname: '/payment',
      params: {
        professionalTitle: professional.title,
        planName: plan.name,
        amount: String(plan.price),
        period: plan.period,
      },
    });
  };

  const professionals: Professional[] = [
    {
      id: '1',
      type: 'doctor',
      title: 'Professional Doctors',
      description: 'Consult with licensed medical professionals for your health concerns',
      icon: 'stethoscope',
      rating: 4.8,
      reviewCount: 245,
      features: [
        'Direct consultation via messages and video calls',
        'Access to medical history and prescriptions',
        'Health monitoring and follow-ups',
        'Appointment scheduling',
        'Lab results analysis',
      ],
      subscriptionPlans: [
        {
          id: 'doc-basic',
          name: 'Basic',
          price: 29,
          period: 'per month',
          description: 'Get started with professional medical guidance',
          features: [
            'Monthly consultation with doctor',
            'Message support',
            'Health tracking',
            'Prescription management',
          ],
        },
        {
          id: 'doc-pro',
          name: 'Pro',
          price: 59,
          period: 'per month',
          description: 'Enhanced medical care and monitoring',
          features: [
            'Unlimited consultations',
            'Priority message support',
            'Video consultations',
            'Prescription management',
            'Health analytics',
            'Emergency support',
          ],
        },
        {
          id: 'doc-premium',
          name: 'Premium',
          price: 99,
          period: 'per month',
          description: 'Complete personalized medical care',
          features: [
            'Unlimited consultations',
            ' 24/7 priority support',
            'Video & in-person consultations',
            'Full health profile management',
            'Advanced health analytics',
            'Emergency hotline',
            'Specialist referrals',
          ],
        },
      ],
    },
    {
      id: '2',
      type: 'nutritionist',
      title: 'Expert Nutritionists',
      description: 'Get personalized nutrition plans and dietary guidance from certified nutritionists',
      icon: 'apple',
      rating: 4.7,
      reviewCount: 198,
      features: [
        'Personalized meal plans',
        'Dietary consultations',
        'Nutrition tracking',
        'Weekly check-ins',
        'Recipe recommendations',
      ],
      subscriptionPlans: [
        {
          id: 'nut-basic',
          name: 'Basic',
          price: 24,
          period: 'per month',
          description: 'Start your nutrition journey',
          features: [
            'Monthly nutrition consultation',
            'Basic meal plan',
            'Food tracking access',
            'Nutritionist messaging',
          ],
        },
        {
          id: 'nut-pro',
          name: 'Pro',
          price: 49,
          period: 'per month',
          description: 'Personalized nutrition focused',
          features: [
            'Bi-weekly consultations',
            'Custom meal plans',
            'Advanced food tracking',
            'Recipe library access',
            'Weekly progress reports',
            'Supplement guidance',
          ],
        },
        {
          id: 'nut-premium',
          name: 'Premium',
          price: 79,
          period: 'per month',
          description: 'Complete nutrition transformation',
          features: [
            'Weekly consultations',
            'Dynamic meal plans',
            'Advanced tracking & analytics',
            'Recipe customization',
            'Daily support',
            'Supplement recommendations',
            'Food allergy management',
            'Weight management program',
          ],
        },
      ],
    },
    {
      id: '3',
      type: 'coach',
      title: 'Fitness Coaches',
      description: 'Get fit with personalized workout plans and training guidance from certified coaches',
      icon: 'dumbbell',
      rating: 4.9,
      reviewCount: 312,
      features: [
        'Customized workout plans',
        'Fitness tracking',
        'Form correction',
        'Progress monitoring',
        'Motivation support',
      ],
      subscriptionPlans: [
        {
          id: 'coach-basic',
          name: 'Basic',
          price: 19,
          period: 'per month',
          description: 'Begin your fitness journey',
          features: [
            'Monthly coaching session',
            'Basic workout plan',
            'Fitness tracking',
            'Message support',
          ],
        },
        {
          id: 'coach-pro',
          name: 'Pro',
          price: 44,
          period: 'per month',
          description: 'Intensive fitness training',
          features: [
            'Bi-weekly sessions',
            'Personalized workout plans',
            'Advanced tracking',
            'Video form correction',
            'Weekly progress analysis',
            'Exercise library access',
          ],
        },
        {
          id: 'coach-premium',
          name: 'Premium',
          price: 74,
          period: 'per month',
          description: 'Elite fitness coaching',
          features: [
            'Weekly 1-on-1 sessions',
            'Dynamic workout plans',
            'Real-time video coaching',
            'Advanced analytics',
            'Nutrition coordination',
            'Injury prevention',
            'Goal achievement program',
            'Priority support',
          ],
        },
      ],
    },
  ];

  const getProfessionalInitials = (title: string) => {
    const parts = title.split(/\s+/).filter(Boolean);

    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }

    return title.slice(0, 2).toUpperCase();
  };

  const renderProfessionalCard = (professional: Professional) => (
    <View key={professional.id} style={styles.professionalCard}>
      {/* Header */}
      <View style={styles.cardHeader}>
        <View style={styles.cardAvatarBadge}>
          <Text style={styles.cardAvatar}>{getProfessionalInitials(professional.title)}</Text>
        </View>
        <View style={styles.cardHeaderInfo}>
          <Text style={styles.cardTitle}>{professional.title}</Text>
          <View style={styles.ratingContainer}>
            <Ionicons name="star" size={14} color="#F59E0B" />
            <Text style={styles.rating}>{professional.rating}</Text>
            <Text style={styles.reviewCount}>({professional.reviewCount})</Text>
          </View>
        </View>
      </View>

      <Text style={styles.cardDescription}>{professional.description}</Text>

      {/* Features */}
      <View style={styles.featuresContainer}>
        <Text style={styles.featuresTitle}>Key Features:</Text>
        {professional.features.map((feature, index) => (
          <View key={index} style={styles.featureItem}>
            <Ionicons name="checkmark-circle" size={16} color="#10B981" />
            <Text style={styles.featureText}>{feature}</Text>
          </View>
        ))}
      </View>

      {/* Subscription Plans */}
      <View style={styles.plansContainer}>
        <Text style={styles.plansTitle}>Subscription Plans</Text>
        {professional.subscriptionPlans.map((plan, index) => (
          <View key={plan.id} style={styles.planCard}>
            <View style={styles.planHeader}>
              <Text style={styles.planName}>{plan.name}</Text>
              <View style={styles.priceContainer}>
                <Text style={styles.planPrice}>${plan.price}</Text>
                <Text style={styles.planPeriod}>{plan.period}</Text>
              </View>
            </View>
            <Text style={styles.planDescription}>{plan.description}</Text>

            {/* Plan Features */}
            <View style={styles.planFeatures}>
              {plan.features.map((feature, idx) => (
                <View key={idx} style={styles.planFeatureItem}>
                  <Ionicons name="checkmark" size={14} color="#3B82F6" />
                  <Text style={styles.planFeatureText}>{feature}</Text>
                </View>
              ))}
            </View>

            {/* Subscribe Button */}
            <TouchableOpacity
              style={styles.subscribeButton}
              onPress={() => handleSubscribeNow(professional, plan)}
            >
              <Text style={styles.subscribeButtonText}>Subscribe Now</Text>
            </TouchableOpacity>
          </View>
        ))}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color="#3B82F6" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Find Professionals</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Introduction */}
        <View style={styles.introContainer}>
          <Text style={styles.introTitle}>Connect with Healthcare Professionals</Text>
          <Text style={styles.introSubtitle}>
            Get personalized guidance from certified doctors, nutritionists, and fitness coaches
          </Text>
        </View>

        {/* Professional Cards */}
        {professionals.map((professional) => renderProfessionalCard(professional))}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Bottom Navigation Bar */}
      <View style={styles.bottomNavigation}>
        <TouchableOpacity 
          style={styles.navItem}
          onPress={() => router.push('/(tabs)/home')}
        >
          <Ionicons 
            name="home" 
            size={24} 
            color={selectedTab === 'home' ? '#3B82F6' : '#9CA3AF'} 
          />
          <Text style={[
            styles.navLabel, 
            selectedTab === 'home' && { color: '#3B82F6' }
          ]}>Home</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.navItem}
          onPress={() => router.push('/(tabs)/logs')}
        >
          <Ionicons 
            name="document-text" 
            size={24} 
            color={selectedTab === 'logs' ? '#3B82F6' : '#9CA3AF'} 
          />
          <Text style={[
            styles.navLabel,
            selectedTab === 'logs' && { color: '#3B82F6' }
          ]}>Logs</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.navItem}
          onPress={() => router.push('/(tabs)/plans')}
        >
          <Ionicons 
            name="calendar" 
            size={24} 
            color={selectedTab === 'plans' ? '#3B82F6' : '#9CA3AF'} 
          />
          <Text style={[
            styles.navLabel,
            selectedTab === 'plans' && { color: '#3B82F6' }
          ]}>Plans</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.navItem}
          onPress={() => router.push('/(tabs)/messages')}
        >
          <Ionicons 
            name="chatbubble" 
            size={24} 
            color={selectedTab === 'messages' ? '#3B82F6' : '#9CA3AF'} 
          />
          <Text style={[
            styles.navLabel,
            selectedTab === 'messages' && { color: '#3B82F6' }
          ]}>Messages</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.navItem}
          onPress={() => router.push('/(tabs)/prof')}
        >
          <Ionicons 
            name="person" 
            size={24} 
            color={selectedTab === 'profile' ? '#3B82F6' : '#9CA3AF'} 
          />
          <Text style={[
            styles.navLabel,
            selectedTab === 'profile' && { color: '#3B82F6' }
          ]}>Profile</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  introContainer: {
    padding: 20,
    backgroundColor: '#EFF6FF',
    borderRadius: 16,
    marginHorizontal: 16,
    marginVertical: 16,
  },
  introTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0C4A6E',
    marginBottom: 8,
  },
  introSubtitle: {
    fontSize: 14,
    color: '#0E7490',
    lineHeight: 20,
  },
  professionalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardAvatar: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1D4ED8',
  },
  cardAvatarBadge: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#DBEAFE',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  cardHeaderInfo: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  rating: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
  },
  reviewCount: {
    fontSize: 12,
    color: '#6B7280',
  },
  cardDescription: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
    marginBottom: 16,
  },
  featuresContainer: {
    marginBottom: 20,
    backgroundColor: '#F9FAFB',
    padding: 12,
    borderRadius: 12,
  },
  featuresTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 10,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  featureText: {
    fontSize: 13,
    color: '#374151',
    flex: 1,
  },
  plansContainer: {
    marginTop: 12,
  },
  plansTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
  },
  planCard: {
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  planName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
  },
  priceContainer: {
    alignItems: 'flex-end',
  },
  planPrice: {
    fontSize: 18,
    fontWeight: '700',
    color: '#3B82F6',
  },
  planPeriod: {
    fontSize: 12,
    color: '#6B7280',
  },
  planDescription: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 10,
  },
  planFeatures: {
    marginBottom: 12,
  },
  planFeatureItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 6,
    gap: 6,
  },
  planFeatureText: {
    fontSize: 12,
    color: '#374151',
    flex: 1,
  },
  subscribeButton: {
    backgroundColor: '#3B82F6',
    borderRadius: 8,
    padding: 10,
    alignItems: 'center',
  },
  subscribeButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  bottomNavigation: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingBottom: 8,
    paddingTop: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 10,
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  navLabel: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 4,
    fontWeight: '500',
  },
});
