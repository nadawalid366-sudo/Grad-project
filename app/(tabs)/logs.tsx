import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Modal,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { deletePatientLog, fetchPatientDashboard, savePatientLog, updatePatientLog } from '../../services/api';
import { getUser } from '../../services/auth';
import { useVoiceTranscription } from '../../hooks/use-voice-transcription';
import { DetailedMetricScreen } from '../../components/DetailedMetricScreen';

type Priority = 'Critical' | 'High' | 'Medium' | 'Low';

const PRIORITY_COLORS: Record<Priority, string> = {
  Critical: '#EF4444',
  High:     '#F59E0B',
  Medium:   '#3B82F6',
  Low:      '#10B981',
};

interface LogEntry {
  id: string;
  type: 'meal' | 'exercise' | 'vitals' | 'symptom' | 'medication';
  title: string;
  subtitle: string;
  timestamp: string;
  date: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  color: string;
  priority?: Priority;
  priorityReason?: string;
  details?: {
    calories?: number;
    protein?: number;
    carbs?: number;
    fat?: number;
    duration?: string;
    distance?: string;
    reading?: string;
    status?: string;
    trend?: string;
    dosage?: string;
  };
}

type FilterType = 'all' | 'meal' | 'exercise' | 'vitals' | 'symptom' | 'medication';
type LogCategory = Exclude<FilterType, 'all'>;

const sectionOrder: LogCategory[] = ['meal', 'exercise', 'vitals', 'medication', 'symptom'];
const sectionLabels: Record<LogCategory, string> = {
  meal: 'Meals',
  exercise: 'Exercise',
  vitals: 'Vitals',
  symptom: 'Symptoms',
  medication: 'Medications',
};

function normalizeLogType(type: string, title = '', subtitle = ''): LogCategory {
  const value = `${type} ${title} ${subtitle}`.toLowerCase();

  if (value.includes('meal') || value.includes('food') || value.includes('breakfast') || value.includes('lunch') || value.includes('dinner') || value.includes('snack')) {
    return 'meal';
  }

  if (value.includes('exercise') || value.includes('workout') || value.includes('walk') || value.includes('run') || value.includes('jog') || value.includes('activity')) {
    return 'exercise';
  }

  if (value.includes('vital') || value.includes('blood pressure') || value.includes('bp') || value.includes('glucose') || value.includes('pulse') || value.includes('heart rate')) {
    return 'vitals';
  }

  if (value.includes('medication') || value.includes('medicine') || value.includes('pill') || value.includes('dose') || value.includes('tablet')) {
    return 'medication';
  }

  if (value.includes('symptom') || value.includes('pain') || value.includes('headache') || value.includes('nausea') || value.includes('fever') || value.includes('cough')) {
    return 'symptom';
  }

  return 'symptom';
}

export default function HealthLogs() {
  const params = useLocalSearchParams<{ fullName?: string; age?: string; height?: string; weight?: string; email?: string }>();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<FilterType>('all');
  const [expandedEntryId, setExpandedEntryId] = useState<string | null>(null);
  const [userData, setUserData] = useState<any>(null);
  const [logEntries, setLogEntries] = useState<LogEntry[]>([]);
  const [editingEntry, setEditingEntry] = useState<LogEntry | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editSubtitle, setEditSubtitle] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  useEffect(() => {
    setUserData({
      fullName: params.fullName || 'User Name',
      age: params.age || '',
      height: params.height || '',
      weight: params.weight || '',
      email: params.email || getUser()?.email || '',
    });
  }, [params.fullName, params.age, params.height, params.weight, params.email]);

  const loadLogs = useCallback(
    (email: string, isActive: () => boolean = () => true) => {
      return fetchPatientDashboard(email)
        .then((response) => {
          if (!isActive()) return;

          const mappedLogs = (response.logs || []).map(
            (log: Record<string, any>, index: number) => {
              const type = normalizeLogType(String(log.type || ''), String(log.title || ''), String(log.subtitle || log.note || ''));
              const subtitle = String(log.subtitle || log.note || '');
              const details =
                type === 'meal'
                  ? { calories: Number(log.calories ?? 0) }
                  : type === 'exercise'
                    ? { duration: subtitle || '30 min', calories: Number(log.calories ?? 0), distance: String(log.distance || '') }
                    : type === 'vitals'
                      ? {
                          reading: String(log.blood_pressure ?? (subtitle || 'No reading')),
                          status: String(log.status || 'Recorded'),
                          trend: String(log.trend || 'Stable'),
                        }
                      : type === 'medication'
                        ? { dosage: subtitle || 'Taken as prescribed', status: String(log.status || 'Completed') }
                        : { status: subtitle || 'Logged' };

              const logPriority = (['Critical', 'High', 'Medium', 'Low'].includes(log.priority)
                ? log.priority
                : undefined) as Priority | undefined;

              return {
                id: String(log.id || log._id || index + 1),
                type,
                title: String(log.title || 'Health Log'),
                subtitle,
                timestamp: String(log.timestamp || 'Just now'),
                date: log.createdAt ? new Date(log.createdAt).toDateString() : new Date().toDateString(),
                icon: (
                  log.icon ||
                  (type === 'meal'
                    ? 'food-fork-drink'
                    : type === 'exercise'
                      ? 'walk'
                      : type === 'medication'
                        ? 'pill'
                        : type === 'vitals'
                          ? 'heart-pulse'
                          : 'note-text')
                ) as keyof typeof MaterialCommunityIcons.glyphMap,
                color: logPriority
                  ? PRIORITY_COLORS[logPriority]
                  : String(
                      log.color ||
                        (type === 'vitals' ? '#EF4444' : '#2563EB')
                    ),
                priority: logPriority,
                priorityReason: log.priorityReason ? String(log.priorityReason) : undefined,
                details,
              };
            }
          );

          setLogEntries(mappedLogs);
        })
        .catch((error) => {
          console.log('Failed to load logs:', error);
        });
    },
    []
  );

  // Reload every time the screen comes into focus. On native (Expo Go) the screen
  // stays mounted in the navigator, so a plain mount-effect would keep showing
  // stale data after you add a log on the dashboard and come back here.
  useFocusEffect(
    useCallback(() => {
      const email = userData?.email;
      if (!email) {
        return;
      }

      let active = true;
      loadLogs(email, () => active);

      return () => {
        active = false;
      };
    }, [userData?.email, loadLogs])
  );

  const handleOpenVoiceAssistant = () => {
    DeviceEventEmitter.emit("OPEN_VOICE_MODAL");
  };

  const handleOpenEdit = (entry: LogEntry) => {
    setEditingEntry(entry);
    setEditTitle(entry.title);
    setEditSubtitle(entry.subtitle);
  };

  const handleCloseEdit = () => {
    setEditingEntry(null);
    setEditTitle('');
    setEditSubtitle('');
  };

  const handleSaveEdit = async () => {
    const email = userData?.email;
    if (!editingEntry || !email || !editTitle.trim()) {
      return;
    }

    setIsSavingEdit(true);
    try {
      await updatePatientLog(email, editingEntry.id, {
        type: editingEntry.type,
        title: editTitle.trim(),
        subtitle: editSubtitle.trim(),
        note: editSubtitle.trim(),
      });
      await loadLogs(email);
      handleCloseEdit();
    } catch (error) {
      console.log('Failed to update log:', error);
      Alert.alert('Could not save', 'Failed to update the log. Please try again.');
    } finally {
      setIsSavingEdit(false);
    }
  };

  const performDelete = async (entry: LogEntry) => {
    const email = userData?.email;
    if (!email) {
      return;
    }

    // Optimistically remove, then reconcile with the server.
    setLogEntries((prev) => prev.filter((item) => item.id !== entry.id));
    if (expandedEntryId === entry.id) {
      setExpandedEntryId(null);
    }

    try {
      await deletePatientLog(email, entry.id);
      await loadLogs(email);
    } catch (error) {
      console.log('Failed to delete log:', error);
      Alert.alert('Could not delete', 'Failed to delete the log. Please try again.');
      await loadLogs(email);
    }
  };

  const handleDeleteEntry = (entry: LogEntry) => {
    // Alert.alert has no UI on web — delete directly there, confirm on native.
    if (Platform.OS === 'web') {
      performDelete(entry);
      return;
    }

    Alert.alert(
      'Delete log',
      `Delete "${entry.title}"? This can't be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => performDelete(entry) },
      ],
    );
  };

  const categories = [
    { id: 'all', label: 'All', color: '#9CA3AF' },
    { id: 'meal', label: 'Meals', color: '#F59E0B' },
    { id: 'exercise', label: 'Exercise', color: '#3B82F6' },
    { id: 'vitals', label: 'Vitals', color: '#EF4444' },
    { id: 'symptom', label: 'Symptoms', color: '#8B5CF6' },
    { id: 'medication', label: 'Medications', color: '#EC4899' },
  ];

  const filteredEntries = logEntries.filter((entry) => {
    const matchesCategory = selectedCategory === 'all' || entry.type === selectedCategory;
    const matchesSearch =
      entry.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entry.subtitle.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  // Group by Date
  const groupedByDate = filteredEntries.reduce((acc, entry) => {
    const d = entry.date;
    if (!acc[d]) acc[d] = [];
    acc[d].push(entry);
    return acc;
  }, {} as Record<string, LogEntry[]>);

  const groupedEntries = Object.keys(groupedByDate)
    .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())
    .map(dateStr => {
      let label = dateStr;
      const todayStr = new Date().toDateString();
      const yesterdayStr = new Date(Date.now() - 86400000).toDateString();
      if (dateStr === todayStr) label = 'Today';
      else if (dateStr === yesterdayStr) label = 'Yesterday';
      return { type: dateStr, label, entries: groupedByDate[dateStr] };
    });

  const renderLogEntry = (entry: LogEntry) => {
    const isExpanded = expandedEntryId === entry.id;

    return (
      <TouchableOpacity
        key={entry.id}
        onPress={() =>
          setExpandedEntryId(isExpanded ? null : entry.id)
        }
        activeOpacity={0.7}
      >
        <View style={styles.logCard}>
          <View style={styles.logHeader}>
            <View style={[styles.logIcon, { backgroundColor: entry.color + '20' }]}>
              <MaterialCommunityIcons name={entry.icon} size={24} color={entry.color} />
            </View>
            <View style={styles.logInfo}>
              <View style={styles.logTitleRow}>
                <Text style={styles.logTitle} numberOfLines={1}>{entry.title}</Text>
              </View>
              <Text style={styles.logSubtitle}>{entry.subtitle}</Text>
            </View>
            <Text style={styles.logTime}>{entry.timestamp}</Text>
          </View>

          {isExpanded && entry.details && (
            <View style={styles.expandedContent}>
              {entry.type === 'meal' && (
                <>
                  <View style={styles.imagePlaceholder}>
                    <MaterialCommunityIcons name="image" size={40} color="#D1D5DB" />
                  </View>
                  <View style={styles.mealsNutritionalBreakdown}>
                    <View style={styles.nutritionItem}>
                      <Text style={styles.nutritionLabel}>Calories</Text>
                      <Text style={styles.nutritionValue}>{entry.details.calories}</Text>
                    </View>
                    <View style={styles.nutritionItem}>
                      <Text style={styles.nutritionLabel}>Protein</Text>
                      <Text style={styles.nutritionValue}>{entry.details.protein}g</Text>
                    </View>
                    <View style={styles.nutritionItem}>
                      <Text style={styles.nutritionLabel}>Carbs</Text>
                      <Text style={styles.nutritionValue}>{entry.details.carbs}g</Text>
                    </View>
                    <View style={styles.nutritionItem}>
                      <Text style={styles.nutritionLabel}>Fat</Text>
                      <Text style={styles.nutritionValue}>{entry.details.fat}g</Text>
                    </View>
                  </View>
                </>
              )}

              {entry.type === 'exercise' && (
                <View style={styles.exerciseDetails}>
                  <View style={styles.detailRow}>
                    <Text style={styles.exerciseDetailLabel}>Duration</Text>
                    <Text style={styles.exerciseDetailValue}>{entry.details.duration}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.exerciseDetailLabel}>Calories</Text>
                    <Text style={styles.exerciseDetailValue}>{entry.details.calories}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.exerciseDetailLabel}>Distance</Text>
                    <Text style={styles.exerciseDetailValue}>{entry.details.distance}</Text>
                  </View>
                </View>
              )}

              {entry.type === 'vitals' && (
                <View style={styles.vitalsDetails}>
                  <View style={styles.vitalReading}>
                    <Text style={styles.vitalValue}>{entry.details.reading}</Text>
                  </View>
                  <View style={styles.vitalStatus}>
                    <Ionicons name="checkmark-circle" size={18} color="#10B981" />
                    <Text style={styles.statusText}>{entry.details.status}</Text>
                  </View>
                  <View style={styles.trendIndicator}>
                    <MaterialCommunityIcons name="trending-up" size={16} color="#6B7280" />
                    <Text style={styles.trendText}>{entry.details.trend}</Text>
                  </View>
                </View>
              )}

              {entry.type === 'medication' && (
                <View style={styles.medicationDetails}>
                  <View style={styles.dosageInfo}>
                    <Text style={styles.dosageLabel}>Dosage</Text>
                    <Text style={styles.dosageValue}>{entry.details.dosage}</Text>
                  </View>
                  <View style={styles.adherenceStatus}>
                    <Ionicons name="checkmark-circle" size={18} color="#10B981" />
                    <Text style={styles.adherenceText}>{entry.details.status}</Text>
                  </View>
                </View>
              )}

              {entry.type === 'symptom' && (
                <View style={styles.symptomDetails}>
                  <Text style={styles.symptomText}>{entry.details.status}</Text>
                </View>
              )}

              <View style={styles.actionButtons}>
                <TouchableOpacity style={styles.editButton} onPress={() => handleOpenEdit(entry)}>
                  <Text style={styles.editButtonText}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.deleteButton} onPress={() => handleDeleteEntry(entry)}>
                  <Text style={styles.deleteButtonText}>Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  if (params.type) {
    return <DetailedMetricScreen type={params.type as string} email={params.email as string} />;
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Health Logs</Text>
          <Text style={styles.headerSubtitle}>View and manage your health data</Text>
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#9CA3AF" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search logs..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#D1D5DB"
          />
        </View>

        {/* Category Filters */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.categoryScroll}
          contentContainerStyle={styles.categoryContent}
        >
          {categories.map((category) => (
            <TouchableOpacity
              key={category.id}
              onPress={() => setSelectedCategory(category.id as FilterType)}
              style={[
                styles.categoryButton,
                selectedCategory === category.id && [
                  styles.categoryButtonActive,
                  { backgroundColor: category.color },
                ],
              ]}
            >
              <Text
                style={[
                  styles.categoryButtonText,
                  selectedCategory === category.id && styles.categoryButtonTextActive,
                ]}
              >
                {category.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Log Entries */}
        <View style={styles.logsList}>
          {groupedEntries.length > 0 ? (
            groupedEntries.map((section) => (
              <View key={section.type} style={styles.logSection}>
                <Text style={styles.logSectionTitle}>{section.label}</Text>
                {section.entries.map(renderLogEntry)}
              </View>
            ))
          ) : (
            <View style={styles.emptyState}>
              <MaterialCommunityIcons name="inbox" size={48} color="#D1D5DB" />
              <Text style={styles.emptyStateText}>No logs found</Text>
              <Text style={styles.emptyStateSubtext}>
                Try adjusting your search or filters
              </Text>
            </View>
          )}
        </View>

        {/* View Trends & Analytics Button */}
        <TouchableOpacity style={styles.analyticsButton}>
          <MaterialCommunityIcons name="chart-line" size={20} color="#FFFFFF" />
          <Text style={styles.analyticsButtonText}>View Trends & Analytics</Text>
        </TouchableOpacity>

        {/* Bottom Spacer */}
        <View style={styles.bottomSpacer} />
      </ScrollView>


      {/* Edit Log Modal */}
      <Modal
        visible={editingEntry !== null}
        transparent={true}
        animationType="fade"
        onRequestClose={handleCloseEdit}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.editModalContent}>
            <View style={styles.editModalHeader}>
              <Text style={styles.editModalTitle}>Edit Log</Text>
              <TouchableOpacity onPress={handleCloseEdit}>
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <Text style={styles.editLabel}>Title</Text>
            <TextInput
              style={styles.editInput}
              value={editTitle}
              onChangeText={setEditTitle}
              placeholder="Log title"
              placeholderTextColor="#9CA3AF"
            />

            <Text style={styles.editLabel}>Details</Text>
            <TextInput
              style={[styles.editInput, styles.editInputMultiline]}
              value={editSubtitle}
              onChangeText={setEditSubtitle}
              placeholder="Add any extra details"
              placeholderTextColor="#9CA3AF"
              multiline
              textAlignVertical="top"
            />

            <TouchableOpacity
              style={[
                styles.editSaveButton,
                (!editTitle.trim() || isSavingEdit) && styles.editSaveButtonDisabled,
              ]}
              onPress={handleSaveEdit}
              disabled={!editTitle.trim() || isSavingEdit}
            >
              <Text style={styles.editSaveButtonText}>
                {isSavingEdit ? 'Saving...' : 'Save Changes'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>



      {/* Floating Action Button */}
      <TouchableOpacity 
        style={styles.fab} 
        onPress={() => DeviceEventEmitter.emit('OPEN_VOICE_MODAL')}
      >
        <MaterialCommunityIcons name="microphone" size={24} color="#FFFFFF" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F6EF',
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 100,
  },
  header: {
    marginBottom: 24,
    marginTop: 20,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#64748B',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    color: '#0F172A',
  },
  categoryScroll: {
    marginBottom: 24,
    maxHeight: 40,
  },
  categoryContent: {
    paddingRight: 24,
  },
  categoryButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  categoryButtonActive: {
    borderColor: 'transparent',
  },
  categoryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
  },
  categoryButtonTextActive: {
    color: '#FFFFFF',
  },
  logsList: {
    gap: 24,
  },
  logSection: {
    marginBottom: 8,
  },
  logSectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 16,
  },
  logEntry: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  logCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    overflow: 'hidden',
  },
  logIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  logInfo: {
    flex: 1,
  },
  logIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  logContent: {
    flex: 1,
  },
  logTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 2,
  },
  logHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  logTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
    flexShrink: 1,
  },
  logTimestamp: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '500',
  },
  logSubtitle: {
    color: '#6B7280',
    marginTop: 2,
  },
  logTime: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  expandedContent: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  imagePlaceholder: {
    width: '100%',
    height: 120,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  mealsNutritionalBreakdown: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  nutritionItem: {
    alignItems: 'center',
  },
  nutritionLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
  },
  nutritionValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  exerciseDetails: {
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  exerciseDetailLabel: {
    fontSize: 13,
    color: '#6B7280',
  },
  exerciseDetailValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#111827',
  },
  vitalsDetails: {
    marginBottom: 16,
  },
  vitalReading: {
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  vitalValue: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
  },
  vitalStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusText: {
    fontSize: 13,
    color: '#10B981',
    fontWeight: '600',
    marginLeft: 6,
  },
  trendIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  trendText: {
    fontSize: 13,
    color: '#6B7280',
    marginLeft: 6,
  },
  medicationDetails: {
    marginBottom: 16,
  },
  dosageInfo: {
    paddingVertical: 12,
    marginBottom: 12,
  },
  dosageLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
  },
  dosageValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  adherenceStatus: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  adherenceText: {
    fontSize: 13,
    color: '#10B981',
    fontWeight: '600',
    marginLeft: 6,
  },
  symptomDetails: {
    paddingVertical: 12,
    marginBottom: 16,
  },
  symptomText: {
    fontSize: 14,
    color: '#6B7280',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  editButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    alignItems: 'center',
  },
  editButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#111827',
  },
  deleteButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#EF4444',
    alignItems: 'center',
  },
  deleteButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#EF4444',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginTop: 12,
  },
  emptyStateSubtext: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 4,
  },
  analyticsButton: {
    marginHorizontal: 16,
    marginVertical: 12,
    paddingVertical: 16,
    backgroundColor: '#2563EB', // Primary Blue
    borderRadius: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  analyticsButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  bottomSpacer: {
    height: 100, // Extra padding for the floating CustomTabBar
  },
  fab: {
    display: 'none', // Removed since we use CustomTabBar central button now
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
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  navLabel: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 4,
    fontWeight: '600',
  },
  // Voice Assistant Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: '#00000080',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  voiceModalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 10,
  },
  voiceModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 32,
  },
  voiceModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  selectedTypeLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  listeningContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  listeningLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 24,
  },
  pulseContainer: {
    position: 'relative',
    width: 140,
    height: 140,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  pulseRing: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    borderColor: '#3B82F6',
  },
  microphoneCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  instructionText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
  listeningButton: {
    backgroundColor: '#3B82F6',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 16,
  },
  listeningButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  confirmationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 28,
  },
  confirmationTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  confirmationGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    justifyContent: 'space-between',
  },
  confirmationTile: {
    width: '48%',
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  tileIcon: {
    width: 60,
    height: 60,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  tileName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#111827',
    textAlign: 'center',
  },
  confirmationDetails: {
    alignItems: 'center',
    marginVertical: 32,
    paddingVertical: 20,
    paddingHorizontal: 16,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    marginBottom: 24,
  },
  confirmationDetailLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 8,
  },
  confirmationDetailValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  detailSubtext: {
    fontSize: 13,
    color: '#10B981',
    fontWeight: '600',
  },
  confirmButton: {
    backgroundColor: '#3B82F6',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  categoryPickerLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 10,
  },
  categoryPickerRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
  },
  categoryPickerChip: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
  },
  categoryPickerChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
  },
  categoryPickerChipTextActive: {
    color: '#FFFFFF',
  },
  editModalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    width: '100%',
    maxWidth: 420,
  },
  editModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  editModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  editLabel: {
    fontSize: 13,
    color: '#374151',
    marginBottom: 6,
    fontWeight: '600',
  },
  editInput: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#111827',
    marginBottom: 12,
    backgroundColor: '#F9FAFB',
  },
  editInputMultiline: {
    minHeight: 90,
  },
  editSaveButton: {
    marginTop: 4,
    backgroundColor: '#3B82F6',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  editSaveButtonDisabled: {
    backgroundColor: '#BFDBFE',
  },
  editSaveButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
