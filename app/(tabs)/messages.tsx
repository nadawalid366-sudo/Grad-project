import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useLocalSearchParams } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  DeviceEventEmitter,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import {
  fetchMessages,
  fetchUserSubscriptions,
  markMessagesRead,
  sendMessage,
} from "../../services/api";
import { getUser } from "../../services/auth";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// ─── helpers ───────────────────────────────────────────────────────────────

const AVATAR_COLORS = [
  "#E91E63", "#9C27B0", "#3F51B5", "#2196F3",
  "#00ACC1", "#43A047", "#F4511E", "#6D4C41",
];

function avatarColor(name: string): string {
  const n = name.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  return AVATAR_COLORS[n % AVATAR_COLORS.length];
}

function getInitials(name: string): string {
  const clean = name.replace(/^dr\.?\s+/i, "").trim();
  const parts = clean.split(/\s+/).filter(Boolean);
  return parts.length >= 2
    ? (parts[0][0] + parts[1][0]).toUpperCase()
    : clean.slice(0, 2).toUpperCase();
}

function getDateLabel(dateStr?: string): string {
  const d = dateStr ? new Date(dateStr) : null;
  if (!d || isNaN(d.getTime())) return "Today";
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return "Today";
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

// ─── types ─────────────────────────────────────────────────────────────────

interface Doctor {
  id: string;
  name: string;
  specialty: string;
  isOnline: boolean;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
}

interface Message {
  id: string;
  doctorId: string;
  sender: "patient" | "doctor";
  message: string;
  timestamp: string;
  isRead: boolean;
  createdAt?: string;
}

interface SubscriptionBanner {
  professionalTitle: string;
  planName: string;
}

type ChatItem =
  | { type: "date"; label: string }
  | { type: "message"; data: Message };

// ─── component ─────────────────────────────────────────────────────────────

export default function MessagesPage() {
  const {
    email: emailParam,
    subscribedProfessionalTitle,
    subscribedPlanName,
    subscribedProfessionalId,
  } = useLocalSearchParams<{
    email?: string;
    subscribedProfessionalTitle?: string;
    subscribedPlanName?: string;
    subscribedProfessionalId?: string;
  }>();

  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
  const [messageText, setMessageText] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [userEmail, setUserEmail] = useState("");
  const [subscriptionBanner, setSubscriptionBanner] = useState<SubscriptionBanner | null>(null);
  const scrollRef = useRef<ScrollView>(null);
  const insets = useSafeAreaInsets();

  // ── data loading ──────────────────────────────────────────────────────────

  useEffect(() => {
    const email = emailParam || getUser()?.email || "";
    setUserEmail(email);

    if (subscribedProfessionalTitle && subscribedPlanName) {
      setSubscriptionBanner({
        professionalTitle: String(subscribedProfessionalTitle),
        planName: String(subscribedPlanName),
      });
    }

    let active = true;
    Promise.all([
      fetchMessages(email),
      fetchUserSubscriptions(email).catch(() => ({ subscriptions: [] })),
    ])
      .then(([messagesResponse, subscriptionsResponse]) => {
        if (!active) return;

        const seenIds = new Set<string>();
        const subscriptionDoctors: (Doctor & { _msgs: Message[] })[] = (subscriptionsResponse.subscriptions || [])
          .filter((sub: any) => {
            const id = String(sub.professionalId || sub.id || sub.professionalTitle);
            if (seenIds.has(id)) return false;
            seenIds.add(id);
            return true;
          })
          .map((sub: any, i: number) => ({
            id: String(sub.professionalId || sub.id || `subscription-${i + 1}`),
            name: String(sub.selectedDoctorName || sub.professionalTitle || "Subscribed Program"),
            specialty: String(sub.planName || "Subscribed Plan"),
            isOnline: true,
            lastMessage: `Subscribed to ${sub.planName || "a plan"}`,
            lastMessageTime: sub.subscribedAt
              ? new Date(sub.subscribedAt).toLocaleDateString()
              : "Now",
            unreadCount: 0,
            _msgs: [] as Message[],
          }));

        const flatMessages: Message[] = [];

        (messagesResponse.messages || []).forEach((item: any, index: number) => {
          const doctorId = String(item.doctorId || "");
          const message: Message = {
            id: String(item.id || item._id || index + 1),
            doctorId,
            sender: item.sender === "doctor" ? "doctor" : "patient",
            message: String(item.message || ""),
            timestamp: String(item.timestamp || "Now"),
            isRead: Boolean(item.isRead ?? true),
            createdAt: item.createdAt ? String(item.createdAt) : undefined,
          };

          flatMessages.push(message);

          const record = subscriptionDoctors.find((d) => d.id === doctorId);
          if (record) {
            record.lastMessage = message.message;
            record.lastMessageTime = message.timestamp;
            if (message.sender === "doctor" && !message.isRead) record.unreadCount++;
            record._msgs.push(message);
          }
        });

        const merged = subscriptionDoctors.map(({ _msgs, ...d }) => d);

        setDoctors(merged);
        setMessages(flatMessages);

        const preferred =
          merged.find((d) => d.id === String(subscribedProfessionalId)) ||
          merged.find((d) => d.name === String(subscribedProfessionalTitle)) ||
          merged[0] ||
          null;

        setSelectedDoctor((cur) => cur || preferred);
      })
      .catch((err) => console.log("Failed to load messages:", err));

    return () => { active = false; };
  }, [emailParam, subscribedProfessionalTitle, subscribedPlanName, subscribedProfessionalId]);

  // ── realtime polling ─────────────────────────────────────────────────────

  useEffect(() => {
    if (!selectedDoctor || !userEmail) return;
    const interval = setInterval(async () => {
      try {
        const res = await fetchMessages(userEmail);
        const fresh: Message[] = (res.messages || []).map((item: any, i: number) => ({
          id: String(item.id || item._id || i + 1),
          doctorId: String(item.doctorId || ""),
          sender: (item.sender === "doctor" ? "doctor" : "patient") as "doctor" | "patient",
          message: String(item.message || ""),
          timestamp: String(item.timestamp || "Now"),
          isRead: Boolean(item.isRead ?? true),
          createdAt: item.createdAt ? String(item.createdAt) : undefined,
        }));
        setMessages(fresh);
      } catch {}
    }, 5000);
    return () => clearInterval(interval);
  }, [selectedDoctor, userEmail]);

  // ── auto-scroll ───────────────────────────────────────────────────────────

  useEffect(() => {
    const t = setTimeout(() => scrollRef.current?.scrollToEnd({ animated: false }), 80);
    return () => clearTimeout(t);
  }, [messages, selectedDoctor]);

  // ── actions ───────────────────────────────────────────────────────────────

  const openThread = (doctor: Doctor) => {
    setSelectedDoctor(doctor);
    DeviceEventEmitter.emit("HIDE_TAB_BAR");
    if (doctor.unreadCount > 0) {
      markMessagesRead(userEmail, doctor.id).catch(() => {});
      setDoctors((prev) =>
        prev.map((d) => (d.id === doctor.id ? { ...d, unreadCount: 0 } : d)),
      );
    }
  };

  const closeThread = () => {
    setSelectedDoctor(null);
    DeviceEventEmitter.emit("SHOW_TAB_BAR");
  };

  const handleSend = () => {
    if (!messageText.trim() || !selectedDoctor) return;

    const newMsg: Message = {
      id: Date.now().toString(),
      doctorId: selectedDoctor.id,
      sender: "patient",
      message: messageText.trim(),
      timestamp: new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
      isRead: false,
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, newMsg]);
    setDoctors((prev) =>
      prev.map((d) =>
        d.id === selectedDoctor.id
          ? { ...d, lastMessage: newMsg.message, lastMessageTime: newMsg.timestamp }
          : d,
      ),
    );
    setMessageText("");
    sendMessage(userEmail, {
      doctorId: selectedDoctor.id,
      doctorName: selectedDoctor.name,
      message: newMsg.message,
    }).catch((err) => console.log("Failed to send message:", err));
  };

  // ── derived data ──────────────────────────────────────────────────────────

  const chatMessages = selectedDoctor
    ? messages.filter((m) => m.doctorId === selectedDoctor.id)
    : [];

  const chatItems: ChatItem[] = [];
  let lastDate = "";
  for (const msg of chatMessages) {
    const label = getDateLabel(msg.createdAt);
    if (label !== lastDate) {
      chatItems.push({ type: "date", label });
      lastDate = label;
    }
    chatItems.push({ type: "message", data: msg });
  }

  // ── render helpers ────────────────────────────────────────────────────────

  const renderConvItem = (doctor: Doctor) => {
    const color = avatarColor(doctor.name);
    const initials = getInitials(doctor.name);
    const hasUnread = doctor.unreadCount > 0;

    return (
      <TouchableOpacity
        key={doctor.id}
        style={styles.convCard}
        onPress={() => openThread(doctor)}
        activeOpacity={0.75}
      >
        <View style={[styles.convAvatar, { backgroundColor: color }]}>
          <Text style={styles.convAvatarText}>{initials}</Text>
          {doctor.isOnline && <View style={styles.onlineDot} />}
        </View>

        <View style={styles.convBody}>
          <View style={styles.convRow}>
            <Text style={[styles.convName, hasUnread && styles.convNameBold]} numberOfLines={1}>
              {doctor.name}
            </Text>
            <Text style={[styles.convTime, hasUnread && styles.convTimeBold]}>
              {doctor.lastMessageTime}
            </Text>
          </View>
          <View style={styles.convRow}>
            <Text style={[styles.convPreview, hasUnread && styles.convPreviewBold]} numberOfLines={1}>
              {doctor.lastMessage || doctor.specialty}
            </Text>
            {hasUnread && (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadText}>{doctor.unreadCount}</Text>
              </View>
            )}
          </View>
        </View>

        <Ionicons name="chevron-forward" size={16} color="#CBD5E1" />
      </TouchableOpacity>
    );
  };

  const renderDateSep = (label: string) => (
    <View key={`date-${label}`} style={styles.dateSep}>
      <View style={styles.dateSepLine} />
      <Text style={styles.dateSepLabel}>{label}</Text>
      <View style={styles.dateSepLine} />
    </View>
  );

  const renderMessage = (msg: Message) => {
    const isSent = msg.sender === "patient";
    return (
      <View key={msg.id} style={[styles.msgRow, isSent ? styles.msgRowRight : styles.msgRowLeft]}>
        {!isSent && selectedDoctor && (
          <View style={[styles.msgAvatar, { backgroundColor: avatarColor(selectedDoctor.name) }]}>
            <Text style={styles.msgAvatarText}>{getInitials(selectedDoctor.name)}</Text>
          </View>
        )}
        <View style={[styles.bubble, isSent ? styles.bubbleSent : styles.bubbleReceived]}>
          <Text style={[styles.bubbleText, isSent ? styles.bubbleTextSent : styles.bubbleTextReceived]}>
            {msg.message}
          </Text>
          <View style={styles.bubbleFooter}>
            <Text style={[styles.bubbleTime, isSent ? styles.bubbleTimeSent : styles.bubbleTimeReceived]}>
              {msg.timestamp}
            </Text>
            {isSent && (
              <Ionicons
                name={msg.isRead ? "checkmark-done" : "checkmark"}
                size={12}
                color={msg.isRead ? "#93C5FD" : "rgba(255,255,255,0.5)"}
                style={{ marginLeft: 3 }}
              />
            )}
          </View>
        </View>
      </View>
    );
  };

  // ── render ────────────────────────────────────────────────────────────────

  // ── Thread view ───────────────────────────────────────────────────────────
  if (selectedDoctor) {
    return (
      <SafeAreaView style={styles.threadContainer}>
        {/* Thread header */}
        <View style={styles.threadHeader}>
          <TouchableOpacity style={styles.backBtn} onPress={closeThread} activeOpacity={0.7}>
            <Ionicons name="arrow-back" size={22} color="#2563EB" />
          </TouchableOpacity>

          <View style={[styles.threadAvatar, { backgroundColor: avatarColor(selectedDoctor.name) }]}>
            <Text style={styles.threadAvatarText}>{getInitials(selectedDoctor.name)}</Text>
          </View>

          <View style={styles.threadInfo}>
            <Text style={styles.threadName} numberOfLines={1}>{selectedDoctor.name}</Text>
            <View style={styles.threadStatusRow}>
              {selectedDoctor.isOnline && <View style={styles.threadOnlineDot} />}
              <Text style={[styles.threadStatus, selectedDoctor.isOnline && styles.threadStatusOnline]}>
                {selectedDoctor.isOnline ? "Online" : "Offline"}
              </Text>
            </View>
          </View>
        </View>

        {/* Messages */}
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={0}
        >
          <ScrollView
            ref={scrollRef}
            style={styles.chatBody}
            contentContainerStyle={styles.chatBodyContent}
            showsVerticalScrollIndicator={false}
          >
            {chatMessages.length === 0 ? (
              <View style={styles.emptyChatState}>
                <View style={styles.encryptionNote}>
                  <Ionicons name="lock-closed" size={13} color="#2563EB" />
                  <Text style={styles.encryptionText}>Messages are private and secure</Text>
                </View>
              </View>
            ) : (
              chatItems.map((item) =>
                item.type === "date"
                  ? renderDateSep(item.label)
                  : renderMessage(item.data),
              )
            )}
          </ScrollView>

          {/* Input bar */}
          <View style={[styles.inputBar, { paddingBottom: Math.max(insets.bottom, 10) }]}>
            <TextInput
              style={styles.input}
              placeholder="Write a message…"
              value={messageText}
              onChangeText={setMessageText}
              placeholderTextColor="#94A3B8"
              multiline
              maxLength={1000}
            />
            <TouchableOpacity
              style={[styles.sendBtn, !messageText.trim() && styles.sendBtnDisabled]}
              onPress={handleSend}
              disabled={!messageText.trim()}
              activeOpacity={0.8}
            >
              <Ionicons
                name={messageText.trim() ? "send" : "mic-outline"}
                size={18}
                color="#FFFFFF"
              />
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  // ── Conversation list ─────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.listContainer}>
      {/* Header */}
      <View style={styles.listHeader}>
        <View>
          <Text style={styles.listTitle}>Messages</Text>
          <Text style={styles.listSub}>Your care team conversations</Text>
        </View>
        <TouchableOpacity style={styles.searchBtn}>
          <Ionicons name="search" size={20} color="#2563EB" />
        </TouchableOpacity>
      </View>

      {subscriptionBanner && (
        <View style={styles.banner}>
          <MaterialCommunityIcons name="check-decagram" size={15} color="#2563EB" />
          <Text style={styles.bannerText} numberOfLines={1}>
            {subscriptionBanner.professionalTitle} — {subscriptionBanner.planName}
          </Text>
        </View>
      )}

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 120, gap: 10, paddingTop: 8 }}
      >
        {doctors.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <MaterialCommunityIcons name="message-text-outline" size={36} color="#2563EB" />
            </View>
            <Text style={styles.emptyTitle}>No conversations yet</Text>
            <Text style={styles.emptySubtitle}>Subscribe to a doctor to start messaging</Text>
          </View>
        ) : (
          doctors.map(renderConvItem)
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  // ── Conversation list ──────────────────────────────────────────────────
  listContainer: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  listHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 16,
  },
  listTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: "#0F172A",
  },
  listSub: {
    fontSize: 13,
    color: "#64748B",
    marginTop: 2,
  },
  searchBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#EFF6FF",
    alignItems: "center",
    justifyContent: "center",
  },
  banner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginHorizontal: 16,
    marginBottom: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: "#EFF6FF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#BFDBFE",
  },
  bannerText: {
    flex: 1,
    fontSize: 13,
    color: "#1D4ED8",
    fontWeight: "600",
  },
  convCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    gap: 12,
  },
  convAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: "center",
    alignItems: "center",
    flexShrink: 0,
  },
  convAvatarText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  onlineDot: {
    position: "absolute",
    bottom: 1,
    right: 1,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#10B981",
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  convBody: {
    flex: 1,
  },
  convRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 3,
  },
  convName: {
    flex: 1,
    fontSize: 15,
    fontWeight: "600",
    color: "#0F172A",
    marginRight: 8,
  },
  convNameBold: {
    fontWeight: "700",
  },
  convTime: {
    fontSize: 12,
    color: "#94A3B8",
  },
  convTimeBold: {
    color: "#2563EB",
    fontWeight: "600",
  },
  convPreview: {
    flex: 1,
    fontSize: 13,
    color: "#94A3B8",
    marginRight: 8,
  },
  convPreviewBold: {
    color: "#374151",
    fontWeight: "500",
  },
  unreadBadge: {
    backgroundColor: "#2563EB",
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 5,
  },
  unreadText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "700",
  },
  emptyState: {
    alignItems: "center",
    paddingTop: 80,
    paddingHorizontal: 32,
  },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#EFF6FF",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0F172A",
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: "#64748B",
    textAlign: "center",
    lineHeight: 20,
  },

  // ── Thread view ────────────────────────────────────────────────────────
  threadContainer: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  threadHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#E2E8F0",
    gap: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#EFF6FF",
    alignItems: "center",
    justifyContent: "center",
  },
  threadAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: "center",
    alignItems: "center",
  },
  threadAvatarText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  threadInfo: {
    flex: 1,
  },
  threadName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
  },
  threadStatusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 1,
  },
  threadOnlineDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "#10B981",
  },
  threadStatus: {
    fontSize: 12,
    color: "#94A3B8",
  },
  threadStatusOnline: {
    color: "#10B981",
  },

  // ── Chat body ──────────────────────────────────────────────────────────
  chatBody: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  chatBodyContent: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    paddingBottom: 8,
    gap: 4,
  },
  emptyChatState: {
    paddingVertical: 80,
    alignItems: "center",
  },
  encryptionNote: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
  },
  encryptionText: {
    fontSize: 12,
    color: "#2563EB",
    fontWeight: "500",
  },

  // ── Date separator ─────────────────────────────────────────────────────
  dateSep: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 12,
    gap: 8,
  },
  dateSepLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: "#E2E8F0",
  },
  dateSepLabel: {
    fontSize: 11,
    color: "#94A3B8",
    fontWeight: "600",
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    letterSpacing: 0.3,
  },

  // ── Message bubbles ────────────────────────────────────────────────────
  msgRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    marginBottom: 6,
  },
  msgRowRight: {
    justifyContent: "flex-end",
    paddingLeft: 48,
  },
  msgRowLeft: {
    justifyContent: "flex-start",
    paddingRight: 48,
  },
  msgAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    flexShrink: 0,
  },
  msgAvatarText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  bubble: {
    maxWidth: "78%",
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  bubbleSent: {
    backgroundColor: "#2563EB",
    borderBottomRightRadius: 4,
  },
  bubbleReceived: {
    backgroundColor: "#FFFFFF",
    borderBottomLeftRadius: 4,
  },
  bubbleText: {
    fontSize: 15,
    lineHeight: 22,
  },
  bubbleTextSent: {
    color: "#FFFFFF",
  },
  bubbleTextReceived: {
    color: "#0F172A",
  },
  bubbleFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    marginTop: 4,
    gap: 2,
  },
  bubbleTime: {
    fontSize: 10,
  },
  bubbleTimeSent: {
    color: "rgba(255,255,255,0.65)",
  },
  bubbleTimeReceived: {
    color: "#94A3B8",
  },

  // ── Input bar ──────────────────────────────────────────────────────────
  inputBar: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 12,
    paddingTop: 10,
    backgroundColor: "#FFFFFF",
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#E2E8F0",
    gap: 10,
  },
  input: {
    flex: 1,
    backgroundColor: "#F8FAFC",
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    color: "#0F172A",
    maxHeight: 100,
    minHeight: 44,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#2563EB",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#2563EB",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  sendBtnDisabled: {
    backgroundColor: "#94A3B8",
    shadowOpacity: 0,
    elevation: 0,
  },
});
