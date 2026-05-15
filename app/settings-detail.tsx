import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    Alert,
    FlatList,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

type SettingsSection = 'notifications' | 'language-region' | 'privacy-security' | 'help-support' | 'data-privacy';

export default function SettingsDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    section?: string;
    email?: string;
    fullName?: string;
  }>();

  const section = (Array.isArray(params.section) ? params.section[0] : params.section) as SettingsSection | undefined;
  const fullName = Array.isArray(params.fullName) ? params.fullName[0] : params.fullName;
  const email = Array.isArray(params.email) ? params.email[0] : params.email;

  const page = getSettingsPageContent(section);
  const [notificationsState, setNotificationsState] = useState({
    medication: true,
    meals: true,
    plans: false,
    emergency: true,
  });

  const [selectedLanguage, setSelectedLanguage] = useState('en');
  const languages = [
    { code: 'en', label: 'English' },
    { code: 'ar', label: 'Arabic' },
    { code: 'fr', label: 'French' },
    { code: 'es', label: 'Spanish' },
    { code: 'de', label: 'German' },
  ];

  useEffect(() => {
    // Could load/save preferences here (AsyncStorage or backend) if desired
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{page.title}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Profile header removed per user request */}

        <View style={styles.detailCard}>
          <View style={[styles.iconBadge, { backgroundColor: page.iconBg }]}>
            <Ionicons name={page.icon as any} size={20} color={page.iconColor} />
          </View>
          <Text style={styles.sectionTitle}>{page.title}</Text>
          <Text style={styles.description}>{page.description}</Text>

          {/* Section specific content */}
          {section === 'notifications' && (
            <View style={{ gap: 12 }}>
              <SettingToggle
                label="Medication reminders"
                value={notificationsState.medication}
                onValueChange={(v) => setNotificationsState((s) => ({ ...s, medication: v }))}
              />
              <SettingToggle
                label="Meal and hydration alerts"
                value={notificationsState.meals}
                onValueChange={(v) => setNotificationsState((s) => ({ ...s, meals: v }))}
              />
              <SettingToggle
                label="Plan deadlines"
                value={notificationsState.plans}
                onValueChange={(v) => setNotificationsState((s) => ({ ...s, plans: v }))}
              />
              <SettingToggle
                label="Emergency notifications"
                value={notificationsState.emergency}
                onValueChange={(v) => setNotificationsState((s) => ({ ...s, emergency: v }))}
              />
            </View>
          )}

          {section === 'language-region' && (
            <View>
              <FlatList
                data={languages}
                keyExtractor={(i) => i.code}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.langRow}
                    onPress={() => setSelectedLanguage(item.code)}
                  >
                    <Text style={styles.itemText}>{item.label}</Text>
                    <Text style={[styles.langSelected, selectedLanguage === item.code && { color: '#10B981' }]}>
                      {selectedLanguage === item.code ? 'Selected' : ''}
                    </Text>
                  </TouchableOpacity>
                )}
              />
            </View>
          )}

          {section === 'privacy-security' && (
            <View style={{ gap: 12 }}>
              <SettingToggle label="Require PIN on launch" value={false} onValueChange={() => {}} />
              <SettingToggle label="Allow data sharing" value={false} onValueChange={() => {}} />
              <SettingToggle label="Biometric unlock" value={true} onValueChange={() => {}} />
            </View>
          )}

          {section === 'data-privacy' && (
            <View style={{ gap: 12 }}>
              <SettingToggle label="Allow data export" value={true} onValueChange={() => {}} />
              <SettingToggle label="Automatic backups" value={false} onValueChange={() => {}} />
              <SettingToggle label="Share anonymized data" value={false} onValueChange={() => {}} />

              <TouchableOpacity
                style={styles.linkRow}
                onPress={() => Alert.alert('Download', 'A data export request has been initiated.')}
              >
                <Text style={styles.itemText}>Download my data</Text>
                <Ionicons name="download-outline" size={18} color="#9CA3AF" />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.linkRow}
                onPress={() => Alert.alert('Privacy Policy', 'Open privacy policy placeholder.')}
              >
                <Text style={styles.itemText}>Privacy policy</Text>
                <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.linkRow}
                onPress={() => Alert.alert('Delete account', 'To delete your account, contact support or follow the deletion flow.')}
              >
                <Text style={[styles.itemText, { color: '#DC2626' }]}>Request account deletion</Text>
                <Ionicons name="trash-outline" size={18} color="#DC2626" />
              </TouchableOpacity>
            </View>
          )}

          {section === 'help-support' && (
            <View style={{ gap: 12 }}>
              <TouchableOpacity style={styles.linkRow} onPress={() => console.log('Open FAQ')}>
                <Text style={styles.itemText}>FAQ and tutorials</Text>
                <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.linkRow} onPress={() => console.log('Contact support')}>
                <Text style={styles.itemText}>Contact support</Text>
                <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.linkRow} onPress={() => console.log('Report problem')}>
                <Text style={styles.itemText}>Report a problem</Text>
                <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function getSettingsPageContent(section: SettingsSection | undefined) {
  switch (section) {
    case 'notifications':
      return {
        title: 'Notifications',
        icon: 'notifications-outline',
        iconColor: '#F59E0B',
        iconBg: '#FEF3C7',
        description: 'Manage reminders and activity alerts so you only receive what matters.',
        items: ['Medication reminders', 'Meal and hydration alerts', 'Plan deadlines', 'Emergency notifications'],
      };
    case 'language-region':
      return {
        title: 'Language & Region',
        icon: 'globe-outline',
        iconColor: '#3B82F6',
        iconBg: '#DBEAFE',
        description: 'Choose your preferred language, date format, and regional display options.',
        items: ['App language', 'Date and time format', 'Measurement units', 'Regional content'],
      };
    case 'privacy-security':
      return {
        title: 'Privacy & Security',
        icon: 'shield-checkmark-outline',
        iconColor: '#EC4899',
        iconBg: '#FCE7F3',
        description: 'Control account safety and how your medical information is protected.',
        items: ['Password and login security', 'Data sharing permissions', 'Connected devices', 'Session history'],
      };
    case 'data-privacy':
      return {
        title: 'Data & Privacy',
        icon: 'lock-closed-outline',
        iconColor: '#7C3AED',
        iconBg: '#F3E8FF',
        description: 'Manage data export, backups, sharing preferences, and account deletion requests.',
        items: ['Download my data', 'Automatic backups', 'Data sharing preferences', 'Privacy policy'],
      };
    case 'help-support':
      return {
        title: 'Help & Support',
        icon: 'help-circle-outline',
        iconColor: '#10B981',
        iconBg: '#D1FAE5',
        description: 'Find answers and contact support for account or health app guidance.',
        items: ['FAQ and tutorials', 'Contact support', 'Report a problem', 'Community guidelines'],
      };
    default:
      return {
        title: 'Settings',
        icon: 'settings-outline',
        iconColor: '#6B7280',
        iconBg: '#E5E7EB',
        description: 'Open a settings category from the profile page to view details.',
        items: ['Notifications', 'Language & Region', 'Privacy & Security', 'Help & Support'],
      };
  }
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
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  content: {
    padding: 16,
    gap: 14,
    paddingBottom: 32,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#DBEAFE',
    justifyContent: 'center',
    alignItems: 'center',
  },
  name: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 2,
  },
  email: {
    fontSize: 13,
    color: '#3B82F6',
  },
  detailCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  iconBadge: {
    width: 38,
    height: 38,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 21,
    marginBottom: 14,
  },
  itemList: {
    gap: 10,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  itemText: {
    fontSize: 14,
    color: '#111827',
    flexShrink: 1,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  toggleLabel: {
    fontSize: 15,
    color: '#111827',
  },
  langRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  langSelected: {
    fontSize: 13,
    color: '#9CA3AF',
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
});

function SettingToggle({ label, value, onValueChange }: { label: string; value: boolean; onValueChange: (v: boolean) => void }) {
  return (
    <View style={styles.toggleRow}>
      <Text style={styles.toggleLabel}>{label}</Text>
      <Switch value={value} onValueChange={onValueChange} />
    </View>
  );
}