import { Ionicons } from '@expo/vector-icons';
import { useRoute } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { fetchDoctorAlerts, resolveDoctorAlert } from '../../services/api';

type SeverityLevel = 'Critical' | 'High' | 'Medium' | 'Low';

interface Alert {
  id: string;
  patientName: string;
  patientAge: number;
  patientGender: 'Male' | 'Female';
  alertType: string;
  description: string;
  severity: SeverityLevel;
  time: string;
  isResolved: boolean;
}

export default function AlertsScreen() {
  const route = useRoute();
  const router = useRouter();
  const [doctorName, setDoctorName] = useState('Doctor');
  const [doctorEmail, setDoctorEmail] = useState('doctor@example.com');
  const [selectedSeverity, setSelectedSeverity] = useState<SeverityLevel | 'All'>('All');
  const [selectedTab, setSelectedTab] = useState('alerts');
  const [dashboardAlerts, setDashboardAlerts] = useState<Alert[]>([]);

  useEffect(() => {
    const params = route.params as any;
    const name = params?.doctorName || 'Doctor';
    setDoctorName(name);
    setDoctorEmail(params?.email || 'doctor@example.com');
  }, [route.params]);

  useEffect(() => {
    let active = true;
    fetchDoctorAlerts(doctorEmail)
      .then((response) => {
        if (!active) return;
        setDashboardAlerts((response.alerts || []).map((alert: any, index: number) => ({
          id: alert.id || alert._id || String(index + 1),
          patientName: alert.patientName,
          patientAge: Number(alert.patientAge || 0),
          patientGender: alert.patientGender,
          alertType: alert.alertType,
          description: alert.description,
          severity: alert.severity,
          time: alert.time || 'Just now',
          isResolved: Boolean(alert.isResolved),
        })));
      })
      .catch((error) => console.log('Failed to load alerts:', error));

    return () => {
      active = false;
    };
  }, [doctorEmail]);

  const allAlerts: Alert[] = dashboardAlerts.length > 0 ? dashboardAlerts : [
    {
      id: '1',
      patientName: 'Omar Hassan',
      patientAge: 52,
      patientGender: 'Male',
      alertType: 'Blood Glucose Critical',
      description: 'Blood glucose level at 45 mg/dL - immediate attention required',
      severity: 'Critical',
      time: '10 mins ago',
      isResolved: false,
    },
    {
      id: '2',
      patientName: 'Ahmed Mohamed',
      patientAge: 45,
      patientGender: 'Male',
      alertType: 'Missed Medication',
      description: 'Missed insulin dose for breakfast',
      severity: 'Critical',
      time: '2 hours ago',
      isResolved: false,
    },
    {
      id: '3',
      patientName: 'Sara Ibrahim',
      patientAge: 29,
      patientGender: 'Female',
      alertType: 'Blood Pressure Elevated',
      description: 'BP reading: 145/95 mmHg - above target range',
      severity: 'High',
      time: '3 hours ago',
      isResolved: false,
    },
    {
      id: '4',
      patientName: 'Fatima Ali',
      patientAge: 38,
      patientGender: 'Female',
      alertType: 'Activity Goal Not Met',
      description: 'No exercise logged for 3 consecutive days',
      severity: 'High',
      time: '5 hours ago',
      isResolved: false,
    },
    {
      id: '5',
      patientName: 'Layla Ahmed',
      patientAge: 34,
      patientGender: 'Female',
      alertType: 'Inhaler Usage Spike',
      description: 'Used rescue inhaler 4 times today - possible trigger exposure',
      severity: 'Medium',
      time: '6 hours ago',
      isResolved: false,
    },
    {
      id: '6',
      patientName: 'Ahmed Mohamed',
      patientAge: 45,
      patientGender: 'Male',
      alertType: 'Weight Fluctuation',
      description: 'Weight increased by 2.5 kg over 3 days',
      severity: 'Medium',
      time: '1 day ago',
      isResolved: false,
    },
    {
      id: '7',
      patientName: 'Omar Hassan',
      patientAge: 52,
      patientGender: 'Male',
      alertType: 'Meal Logging Delayed',
      description: 'No meal logged since lunch yesterday',
      severity: 'Low',
      time: '1 day ago',
      isResolved: false,
    },
    {
      id: '8',
      patientName: 'Sara Ibrahim',
      patientAge: 29,
      patientGender: 'Female',
      alertType: 'Sleep Pattern Change',
      description: 'Average sleep reduced to 5 hours for past week',
      severity: 'Low',
      time: '2 days ago',
      isResolved: false,
    },
  ];

  const getSeverityColor = (severity: SeverityLevel) => {
    switch (severity) {
      case 'Critical':
        return { bg: '#FEE2E2', border: '#EF4444', text: '#DC2626', icon: '#DC2626' };
      case 'High':
        return { bg: '#FED7AA', border: '#F97316', text: '#C2410C', icon: '#F97316' };
      case 'Medium':
        return { bg: '#FEF3C7', border: '#EAB308', text: '#A16207', icon: '#EAB308' };
      case 'Low':
        return { bg: '#DBEAFE', border: '#3B82F6', text: '#1E40AF', icon: '#3B82F6' };
    }
  };

  const getSeverityIcon = (severity: SeverityLevel) => {
    switch (severity) {
      case 'Critical':
        return 'alert-circle';
      case 'High':
        return 'warning';
      case 'Medium':
        return 'information-circle';
      case 'Low':
        return 'alert-circle-outline';
    }
  };

  const filteredAlerts = selectedSeverity === 'All' 
    ? allAlerts 
    : allAlerts.filter(alert => alert.severity === selectedSeverity);

  const criticalCount = allAlerts.filter(a => a.severity === 'Critical').length;
  const highCount = allAlerts.filter(a => a.severity === 'High').length;
  const mediumCount = allAlerts.filter(a => a.severity === 'Medium').length;
  const lowCount = allAlerts.filter(a => a.severity === 'Low').length;

  const renderAlertCard = (alert: Alert) => {
    const colors = getSeverityColor(alert.severity);
    
    return (
      <View key={alert.id} style={[styles.alertCard, { borderLeftColor: colors.border }]}>
        <View style={styles.alertHeader}>
          <View style={[styles.severityBadge, { backgroundColor: colors.bg }]}>
            <Ionicons name={getSeverityIcon(alert.severity)} size={16} color={colors.icon} />
            <Text style={[styles.severityText, { color: colors.text }]}>
              {alert.severity}
            </Text>
          </View>
          <Text style={styles.alertTime}>{alert.time}</Text>
        </View>

        <View style={styles.patientSection}>
          <View style={styles.patientAvatar}>
            <Ionicons name="person" size={20} color="#3B82F6" />
          </View>
          <View style={styles.patientDetails}>
            <Text style={styles.patientName}>{alert.patientName}</Text>
            <Text style={styles.patientInfo}>
              {alert.patientAge} • {alert.patientGender}
            </Text>
          </View>
        </View>

        <View style={styles.alertContent}>
          <Text style={styles.alertType}>{alert.alertType}</Text>
          <Text style={styles.alertDescription}>{alert.description}</Text>
        </View>

        <View style={styles.alertActions}>
          <TouchableOpacity style={styles.actionButtonPrimary}>
            <Ionicons name="call" size={16} color="#FFFFFF" />
            <Text style={styles.actionButtonPrimaryText}>Contact Patient</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButtonSecondary}
            onPress={() => resolveDoctorAlert(doctorEmail, alert.id).catch((error) => console.log('Failed to resolve alert:', error))}
          >
            <Ionicons name="checkmark" size={16} color="#3B82F6" />
            <Text style={styles.actionButtonSecondaryText}>Mark Resolved</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>Patient Alerts</Text>
            <Text style={styles.headerSubtitle}>
              {filteredAlerts.length} active alert{filteredAlerts.length !== 1 ? 's' : ''}
            </Text>
          </View>
        </View>

        {/* Severity Summary */}
        <View style={styles.summarySection}>
          <View style={styles.summaryCard}>
            <View style={[styles.summaryIconContainer, { backgroundColor: '#FEE2E2' }]}>
              <Ionicons name="alert-circle" size={20} color="#DC2626" />
            </View>
            <Text style={styles.summaryCount}>{criticalCount}</Text>
            <Text style={styles.summaryLabel}>Critical</Text>
          </View>

          <View style={styles.summaryCard}>
            <View style={[styles.summaryIconContainer, { backgroundColor: '#FED7AA' }]}>
              <Ionicons name="warning" size={20} color="#F97316" />
            </View>
            <Text style={styles.summaryCount}>{highCount}</Text>
            <Text style={styles.summaryLabel}>High</Text>
          </View>

          <View style={styles.summaryCard}>
            <View style={[styles.summaryIconContainer, { backgroundColor: '#FEF3C7' }]}>
              <Ionicons name="information-circle" size={20} color="#EAB308" />
            </View>
            <Text style={styles.summaryCount}>{mediumCount}</Text>
            <Text style={styles.summaryLabel}>Medium</Text>
          </View>

          <View style={styles.summaryCard}>
            <View style={[styles.summaryIconContainer, { backgroundColor: '#DBEAFE' }]}>
              <Ionicons name="alert-circle-outline" size={20} color="#3B82F6" />
            </View>
            <Text style={styles.summaryCount}>{lowCount}</Text>
            <Text style={styles.summaryLabel}>Low</Text>
          </View>
        </View>

        {/* Severity Filter */}
        <View style={styles.filterSection}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterScrollContent}
          >
            <TouchableOpacity
              style={[
                styles.filterButton,
                selectedSeverity === 'All' && styles.filterButtonActive,
              ]}
              onPress={() => setSelectedSeverity('All')}
            >
              <Text
                style={[
                  styles.filterButtonText,
                  selectedSeverity === 'All' && styles.filterButtonTextActive,
                ]}
              >
                All ({allAlerts.length})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.filterButton,
                selectedSeverity === 'Critical' && styles.filterButtonActive,
              ]}
              onPress={() => setSelectedSeverity('Critical')}
            >
              <Text
                style={[
                  styles.filterButtonText,
                  selectedSeverity === 'Critical' && styles.filterButtonTextActive,
                ]}
              >
                Critical ({criticalCount})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.filterButton,
                selectedSeverity === 'High' && styles.filterButtonActive,
              ]}
              onPress={() => setSelectedSeverity('High')}
            >
              <Text
                style={[
                  styles.filterButtonText,
                  selectedSeverity === 'High' && styles.filterButtonTextActive,
                ]}
              >
                High ({highCount})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.filterButton,
                selectedSeverity === 'Medium' && styles.filterButtonActive,
              ]}
              onPress={() => setSelectedSeverity('Medium')}
            >
              <Text
                style={[
                  styles.filterButtonText,
                  selectedSeverity === 'Medium' && styles.filterButtonTextActive,
                ]}
              >
                Medium ({mediumCount})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.filterButton,
                selectedSeverity === 'Low' && styles.filterButtonActive,
              ]}
              onPress={() => setSelectedSeverity('Low')}
            >
              <Text
                style={[
                  styles.filterButtonText,
                  selectedSeverity === 'Low' && styles.filterButtonTextActive,
                ]}
              >
                Low ({lowCount})
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>

        {/* Alerts List */}
        <View style={styles.alertsList}>
          {filteredAlerts.length > 0 ? (
            filteredAlerts.map(renderAlertCard)
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="checkmark-circle" size={64} color="#10B981" />
              <Text style={styles.emptyStateTitle}>No Alerts</Text>
              <Text style={styles.emptyStateText}>
                There are no {selectedSeverity.toLowerCase()} alerts at the moment
              </Text>
            </View>
          )}
        </View>

        {/* Bottom Spacer */}
        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* Bottom Navigation Bar */}
      <View style={styles.bottomNavigation}>
        <TouchableOpacity
          style={styles.navItem}
          onPress={() => router.push({ pathname: '/(tabs)/dochome', params: { doctorName } })}
        >
          <Ionicons name="grid" size={24} color="#9CA3AF" />
          <Text style={styles.navLabel}>Dashboard</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navItem}
          onPress={() => router.push({ pathname: '/(tabs)/patients', params: { doctorName } })}
        >
          <Ionicons name="people" size={24} color="#9CA3AF" />
          <Text style={styles.navLabel}>My Patients</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.navItem}>
          <View style={styles.navIconWithBadge}>
            <Ionicons name="alert-circle" size={24} color="#3B82F6" />
            <View style={styles.navBadge}>
              <Text style={styles.navBadgeText}>{allAlerts.length}</Text>
            </View>
          </View>
          <Text style={[styles.navLabel, { color: '#3B82F6' }]}>Alerts</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navItem}
          onPress={() => router.push({ pathname: '/(tabs)/docplans', params: { doctorName } })}
        >
          <Ionicons name="clipboard" size={24} color="#9CA3AF" />
          <Text style={styles.navLabel}>Plans</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.navItem}>
          <Ionicons name="bar-chart" size={24} color="#9CA3AF" />
          <Text style={styles.navLabel}>Analytics</Text>
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
  scrollContent: {
    paddingBottom: 100,
  },
  header: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#6B7280',
  },
  summarySection: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 12,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  summaryIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  summaryCount: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 2,
  },
  summaryLabel: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '500',
  },
  filterSection: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  filterScrollContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
  },
  filterButtonActive: {
    backgroundColor: '#3B82F6',
  },
  filterButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
  },
  filterButtonTextActive: {
    color: '#FFFFFF',
  },
  alertsList: {
    paddingHorizontal: 16,
    paddingTop: 16,
    gap: 12,
  },
  alertCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  alertHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  severityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  severityText: {
    fontSize: 12,
    fontWeight: '700',
  },
  alertTime: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  patientSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  patientAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#DBEAFE',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  patientDetails: {
    flex: 1,
  },
  patientName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  patientInfo: {
    fontSize: 12,
    color: '#6B7280',
  },
  alertContent: {
    marginBottom: 16,
  },
  alertType: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  alertDescription: {
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 18,
  },
  alertActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButtonPrimary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3B82F6',
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  actionButtonPrimaryText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  actionButtonSecondary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#DBEAFE',
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  actionButtonSecondaryText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#3B82F6',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
  bottomSpacer: {
    height: 20,
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 8,
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  navIconWithBadge: {
    position: 'relative',
  },
  navBadge: {
    position: 'absolute',
    top: -4,
    right: -8,
    backgroundColor: '#EF4444',
    borderRadius: 8,
    width: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  navBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  navLabel: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 4,
    fontWeight: '600',
  },
});
