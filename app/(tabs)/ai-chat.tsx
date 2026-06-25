/**
 * AI Chat Screen — VitalConnect AI Assistant
 * Health-aware AI powered by Groq (llama3-70b)
 */

import { useChat } from '@/hooks/use-chat';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { type HealthContext } from '@/services/aiChatService';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

// ─── Quick-start prompts shown when chat is empty ───────────────────────────
const QUICK_PROMPTS = [
  { icon: 'heart-pulse', label: 'Health summary', prompt: 'Aura, how am I doing today?' },
  { icon: 'food-apple', label: 'Nutrition advice', prompt: 'What should I eat for dinner to stay on track?' },
  { icon: 'sleep', label: 'Sleep tips', prompt: 'Aura, how can I improve my sleep tonight?' },
  { icon: 'pill', label: 'Medication', prompt: 'Did I miss any medications today?' },
  { icon: 'run', label: 'Exercise plan', prompt: 'Suggest a quick workout based on my calories.' },
  { icon: 'water', label: 'Hydration', prompt: 'Am I drinking enough water?' },
];

// ─── Color palette ────────────────────────────────────────────────────────────
const COLORS = {
  primary: '#2563EB',
  primaryDark: '#1D4ED8',
  surface: '#FFFFFF',
  surfaceDark: '#1E293B',
  bg: '#F8FAFC',
  bgDark: '#0F172A',
  userBubble: '#2563EB',
  aiBubble: '#FFFFFF',
  aiBubbleDark: '#1E293B',
  text: '#0F172A',
  textDark: '#F1F5F9',
  subtext: '#64748B',
  subtextDark: '#94A3B8',
  border: '#E2E8F0',
  borderDark: '#334155',
};

function formatTime(iso: string) {
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch { return ''; }
}

// ─── Chat bubble ──────────────────────────────────────────────────────────────
function ChatBubble({
  role, content, timestamp, isDark,
}: { role: 'user' | 'assistant'; content: string; timestamp: string; isDark: boolean }) {
  const isUser = role === 'user';
  return (
    <View style={[styles.bubbleRow, isUser && styles.bubbleRowUser]}>
      {!isUser && (
        <View style={styles.avatarCircle}>
          <MaterialCommunityIcons name="auto-awesome" size={18} color="#FFFFFF" />
        </View>
      )}
      <View
        style={[
          styles.bubble,
          isUser
            ? styles.bubbleUser
            : [styles.bubbleAI, { backgroundColor: isDark ? COLORS.aiBubbleDark : COLORS.aiBubble }],
        ]}
      >
        <Text style={[styles.bubbleText, isUser ? styles.bubbleTextUser : { color: isDark ? COLORS.textDark : COLORS.text }]}>
          {content}
        </Text>
        <Text style={[styles.bubbleTime, { color: isUser ? 'rgba(255,255,255,0.6)' : isDark ? COLORS.subtextDark : COLORS.subtext }]}>
          {formatTime(timestamp)}
        </Text>
      </View>
    </View>
  );
}

// ─── Typing indicator ─────────────────────────────────────────────────────────
function TypingIndicator({ isDark }: { isDark: boolean }) {
  return (
    <View style={styles.bubbleRow}>
      <View style={styles.avatarCircle}>
        <MaterialCommunityIcons name="auto-awesome" size={18} color="#FFFFFF" />
      </View>
      <View style={[styles.bubble, styles.bubbleAI, { backgroundColor: isDark ? COLORS.aiBubbleDark : COLORS.aiBubble }]}>
        <Text style={{ color: isDark ? COLORS.subtextDark : COLORS.subtext, fontSize: 20, letterSpacing: 4 }}>•••</Text>
      </View>
    </View>
  );
}

// ─── Main screen ─────────────────────────────────────────────────────────────
export default function AIChatScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const params = useLocalSearchParams<{
    fullName?: string; email?: string;
    calories?: string; caloriesGoal?: string;
    sleepBedtime?: string; sleepWake?: string;
    waterAmount?: string; waterUnit?: string; waterGoal?: string;
    medicationTaken?: string; medicationGoal?: string;
  }>();

  // Build health context from navigation params
  const healthContext: HealthContext = {
    userName: params.fullName || undefined,
    calories: params.calories
      ? { current: Number(params.calories), goal: Number(params.caloriesGoal) || 2000 }
      : undefined,
    sleep: params.sleepBedtime
      ? { bedtime: params.sleepBedtime, wakeTime: params.sleepWake || '07:00' }
      : undefined,
    water: params.waterAmount
      ? { amount: Number(params.waterAmount), unit: params.waterUnit || 'cups', goal: Number(params.waterGoal) || 8 }
      : undefined,
    medication: params.medicationTaken
      ? { taken: Number(params.medicationTaken), goal: Number(params.medicationGoal) || 1 }
      : undefined,
  };

  const { messages, loading, error, sendMessage, clearMessages } = useChat(healthContext);
  const [inputText, setInputText] = useState('');
  const router = useRouter();

  // Scroll ref
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [messages]);

  useEffect(() => {
    if (error) {
      Alert.alert('Error', error);
    }
  }, [error]);

  const handleSend = useCallback(async (text?: string) => {
    const msg = (text || inputText).trim();
    if (!msg || loading) return;
    setInputText('');
    await sendMessage(msg);
  }, [inputText, loading, sendMessage]);

  const handleClear = useCallback(() => {
    Alert.alert('Clear Chat', 'Delete all messages?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: clearMessages },
    ]);
  }, [clearMessages]);

  const bg = isDark ? COLORS.bgDark : COLORS.bg;
  const surface = isDark ? COLORS.surfaceDark : COLORS.surface;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: bg }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: COLORS.primary }]}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={styles.headerAvatar}>
            <MaterialCommunityIcons name="auto-awesome" size={24} color="#FFFFFF" />
          </View>
          <View>
            <Text style={styles.headerTitle}>Chat with Aura</Text>
            <Text style={styles.headerSub}>Your personal health companion</Text>
          </View>
        </View>
        <TouchableOpacity onPress={handleClear} style={styles.headerAction}>
          <Ionicons name="trash-outline" size={20} color="rgba(255,255,255,0.8)" />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        {/* Messages list */}
        {messages.length === 0 && !loading ? (
          <ScrollView contentContainerStyle={styles.welcomeContainer}>
            {/* Welcome card */}
            <View style={[styles.welcomeCard, { backgroundColor: surface }]}>
              <View style={styles.welcomeIconWrapper}>
                <MaterialCommunityIcons name="auto-awesome" size={40} color={COLORS.primary} />
              </View>
              <Text style={[styles.welcomeTitle, { color: isDark ? COLORS.textDark : COLORS.text }]}>
                Hi{params.fullName ? `, ${params.fullName}` : ''}, I'm Aura! 👋
              </Text>
              <Text style={[styles.welcomeSubtitle, { color: isDark ? COLORS.subtextDark : COLORS.subtext }]}>
                Your personal health companion. I'm here to help you understand your data, stay motivated, and feel your best.
              </Text>
            </View>

            {/* Quick prompts */}
            <Text style={[styles.promptsHeader, { color: isDark ? COLORS.subtextDark : COLORS.subtext }]}>
              Try asking me about…
            </Text>
            <View style={styles.promptsGrid}>
              {QUICK_PROMPTS.map((p) => (
                <TouchableOpacity
                  key={p.label}
                  style={[styles.promptCard, { backgroundColor: surface }]}
                  onPress={() => handleSend(p.prompt)}
                  activeOpacity={0.8}
                >
                  <MaterialCommunityIcons name={p.icon as any} size={22} color={COLORS.primary} />
                  <Text style={[styles.promptLabel, { color: isDark ? COLORS.textDark : COLORS.text }]}>{p.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <ChatBubble role={item.role} content={item.content} timestamp={item.timestamp} isDark={isDark} />
            )}
            ListFooterComponent={loading ? <TypingIndicator isDark={isDark} /> : null}
            contentContainerStyle={styles.listContent}
          />
        )}

        {/* Input bar */}
        <View style={[styles.inputBar, { backgroundColor: surface, borderTopColor: isDark ? COLORS.borderDark : COLORS.border }]}>
          <TextInput
            style={[styles.input, { backgroundColor: isDark ? '#0F172A' : '#F8FAFF', color: isDark ? COLORS.textDark : COLORS.text }]}
            value={inputText}
            onChangeText={setInputText}
            placeholder="Ask me about your health…"
            placeholderTextColor={isDark ? COLORS.subtextDark : COLORS.subtext}
            multiline
            maxLength={1000}
            onSubmitEditing={() => handleSend()}
            returnKeyType="send"
          />
          <TouchableOpacity
            style={[styles.sendButton, { opacity: (!inputText.trim() || loading) ? 0.5 : 1 }]}
            onPress={() => handleSend()}
            disabled={!inputText.trim() || loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Ionicons name="send" size={18} color="#FFFFFF" />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  backButton: { marginRight: 4, padding: 4 },
  headerAvatar: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  headerSub: { color: 'rgba(255,255,255,0.7)', fontSize: 11 },
  headerAction: { padding: 8 },
  listContent: { padding: 16, gap: 8, flexGrow: 1 },
  bubbleRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginBottom: 8 },
  bubbleRowUser: { flexDirection: 'row-reverse' },
  avatarCircle: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: COLORS.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  bubble: {
    maxWidth: '78%', padding: 12, borderRadius: 18,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
  },
  bubbleUser: { backgroundColor: COLORS.userBubble, borderBottomRightRadius: 4 },
  bubbleAI: { borderBottomLeftRadius: 4 },
  bubbleText: { fontSize: 15, lineHeight: 22 },
  bubbleTextUser: { color: '#FFFFFF' },
  bubbleTime: { fontSize: 10, marginTop: 4, alignSelf: 'flex-end' },
  welcomeContainer: { padding: 20, gap: 16 },
  welcomeCard: {
    borderRadius: 20, padding: 24, alignItems: 'center', gap: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 3,
  },
  welcomeIconWrapper: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: '#EFF6FF', alignItems: 'center', justifyContent: 'center',
  },
  welcomeTitle: { fontSize: 22, fontWeight: '700', textAlign: 'center' },
  welcomeSubtitle: { fontSize: 14, textAlign: 'center', lineHeight: 21 },
  promptsHeader: { fontSize: 13, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  promptsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  promptCard: {
    width: '47%', padding: 14, borderRadius: 14, alignItems: 'center', gap: 8,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
  },
  promptLabel: { fontSize: 13, fontWeight: '600', textAlign: 'center' },
  inputBar: {
    flexDirection: 'row', alignItems: 'flex-end', gap: 10,
    paddingHorizontal: 12, paddingVertical: 10, borderTopWidth: 1,
  },
  input: {
    flex: 1, borderRadius: 22, paddingHorizontal: 16, paddingVertical: 10,
    fontSize: 15, maxHeight: 120, minHeight: 44,
  },
  sendButton: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center',
  },
});
