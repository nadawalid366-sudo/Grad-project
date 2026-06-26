import { Ionicons } from "@expo/vector-icons";
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
  fetchDoctorMessages,
  fetchDoctorPatients,
  markDoctorMessagesRead,
  sendDoctorMessage,
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
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return parts.length >= 2
    ? (parts[0][0] + parts[1][0]).toUpperCase()
    : name.trim().slice(0, 2).toUpperCase();
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

interface Patient {
  id: string;
  name: string;
  isOnline: boolean;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
}

interface Message {
  id: string;
  patientEmail: string;
  sender: "patient" | "doctor";
  message: string;
  timestamp: string;
  isRead: boolean;
  createdAt?: string;
}

type ChatItem =
  | { type: "date"; label: string }
  | { type: "message"; data: Message };

// ─── component ─────────────────────────────────────────────────────────────

export default function DocMessagesPage() {
  const { email: emailParam } = useLocalSearchParams<{ email?: string }>();

  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [messageText, setMessageText] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [doctorEmail, setDoctorEmail] = useState("");
  const scrollRef = useRef<ScrollView>(null);
  const insets = useSafeAreaInsets();

  // ── data loading ──────────────────────────────────────────────────────────

  useEffect(() => {
    const email = emailParam || getUser()?.email || "";
    setDoctorEmail(email);

    let active = true;
    Promise.all([
      fetchDoctorMessages(email),
      fetchDoctorPatients(email).catch(() => ({ patients: [] })),
    ])
      .then(([messagesResponse, patientsResponse]) => {
        if (!active) return;

        const rosterMap = new Map<string, Patient>();
        (patientsResponse.patients || []).forEach((p: any) => {
          const id = String(p.patientEmail || p.email || p.id);
          rosterMap.set(id, {
            id,
            name: String(p.name || p.patientEmail || p.email || "Patient"),
            isOnline: true,
            lastMessage: "",
            lastMessageTime: "",
            unreadCount: 0,
          });
        });

        const flatMessages: Message[] = [];

        (messagesResponse.messages || []).forEach((item: any, index: number) => {
          const patientEmail = String(item.email || "unknown");

          if (!rosterMap.has(patientEmail)) return;

          const message: Message = {
            id: String(item.id || item._id || index + 1),
            patientEmail,
            sender: item.sender === "patient" ? "patient" : "doctor",
            message: String(item.message || ""),
            timestamp: String(item.timestamp || "Now"),
            isRead: Boolean(item.isRead ?? true),
            createdAt: item.createdAt ? String(item.createdAt) : undefined,
          };

          const record = rosterMap.get(patientEmail)!;
          record.lastMessage = message.message;
          record.lastMessageTime = message.timestamp;
          if (message.sender === "patient" && !message.isRead) record.unreadCount += 1;
          flatMessages.push(message);
        });

        setPatients(Array.from(rosterMap.values()));
        setMessages(flatMessages);
      })
      .catch((err) => console.log("Failed to load messages:", err));

    return () => { active = false; };
  }, [emailParam]);

  // ── realtime polling: refresh messages every 5 s while in a thread ──────

  useEffect(() => {
    if (!selectedPatient || !doctorEmail) return;
    const interval = setInterval(async () => {
      try {
        const res = await fetchDoctorMessages(doctorEmail);
        const fresh: Message[] = (res.messages || []).map((item: any, i: number) => ({
          id: String(item.id || item._id || i + 1),
          patientEmail: String(item.email || "unknown"),
          sender: (item.sender === "patient" ? "patient" : "doctor") as "patient" | "doctor",
          message: String(item.message || ""),
          timestamp: String(item.timestamp || "Now"),
          isRead: Boolean(item.isRead ?? true),
          createdAt: item.createdAt ? String(item.createdAt) : undefined,
        }));
        setMessages(fresh);
      } catch {}
    }, 5000);
    return () => clearInterval(interval);
  }, [selectedPatient, doctorEmail]);

  // ── patient list refresh every 10 s ────────────────────────────────────

  useEffect(() => {
    if (!doctorEmail) return;
    const interval = setInterval(async () => {
      try {
        const res = await fetchDoctorPatients(doctorEmail);
        const updated = (res.patients || []).map((p: any) => ({
          id: String(p.patientEmail || p.email || p.id),
          name: String(p.name || p.patientEmail || p.email || "Patient"),
          isOnline: true,
          lastMessage: "",
          lastMessageTime: "",
          unreadCount: 0,
        }));
        setPatients((prev) => {
          const prevMap = new Map(prev.map((p) => [p.id, p]));
          return updated.map((p) => prevMap.get(p.id) || p);
        });
      } catch {}
    }, 10000);
    return () => clearInterval(interval);
  }, [doctorEmail]);

  // ── auto-scroll ───────────────────────────────────────────────────────────

  useEffect(() => {
    const t = setTimeout(() => scrollRef.current?.scrollToEnd({ animated: false }), 80);
    return () => clearTimeout(t);
  }, [messages, selectedPatient]);

  // ── actions ───────────────────────────────────────────────────────────────

  const openThread = (patient: Patient) => {
    setSelectedPatient(patient);
    DeviceEventEmitter.emit("HIDE_TAB_BAR");
    if (patient.unreadCount > 0) {
      markDoctorMessagesRead(doctorEmail, patient.id).catch(() => {});
      setPatients((prev) =>
        prev.map((p) => (p.id === patient.id ? { ...p, unreadCount: 0 } : p)),
      );
    }
  };

  const closeThread = () => {
    setSelectedPatient(null);
    DeviceEventEmitter.emit("SHOW_TAB_BAR");
  };

  const handleSend = () => {
    if (!messageText.trim() || !selectedPatient) return;

    const newMsg: Message = {
      id: Date.now().toString(),
      patientEmail: selectedPatient.id,
      sender: "doctor",
      message: messageText.trim(),
      timestamp: new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
      isRead: false,
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, newMsg]);
    setPatients((prev) =>
      prev.map((p) =>
        p.id === selectedPatient.id
          ? { ...p, lastMessage: newMsg.message, lastMessageTime: newMsg.timestamp }
          : p,
      ),
    );
    setMessageText("");
    sendDoctorMessage(doctorEmail, {
      patientEmail: selectedPatient.id,
      message: newMsg.message,
    }).catch((err) => console.log("Failed to send message:", err));
  };

  // ── derived data ──────────────────────────────────────────────────────────

  const chatMessages = selectedPatient
    ? messages.filter((m) => m.patientEmail === selectedPatient.id)
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

  const renderConvItem = (patient: Patient) => {
    const color = avatarColor(patient.name);
    const initials = getInitials(patient.name);
    const hasUnread = patient.unreadCount > 0;

    return (
      <TouchableOpacity
        key={patient.id}
        style={styles.convCard}
        onPress={() => openThread(patient)}
        activeOpacity={0.75}
      >
        <View style={[styles.convAvatar, { backgroundColor: color }]}>
          <Text style={styles.convAvatarText}>{initials}</Text>
          {patient.isOnline && <View style={styles.onlineDot} />}
        </View>

        <View style={styles.convBody}>
          <View style={styles.convRow}>
            <Text style={[styles.convName, hasUnread && styles.convNameBold]} numberOfLines={1}>
              {patient.name}
            </Text>
            <Text style={[styles.convTime, hasUnread && styles.convTimeBold]}>
              {patient.lastMessageTime}
            </Text>
          </View>
          <View style={styles.convRow}>
            <Text style={[styles.convPreview, hasUnread && styles.convPreviewBold]} numberOfLines={1}>
              {patient.lastMessage || "No messages yet"}
            </Text>
            {hasUnread && (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadText}>{patient.unreadCount}</Text>
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
    const isSent = msg.sender === "doctor";
    return (
      <View key={msg.id} style={[styles.msgRow, isSent ? styles.msgRowRight : styles.msgRowLeft]}>
        {!isSent && selectedPatient && (
          <View style={[styles.msgAvatar, { backgroundColor: avatarColor(selectedPatient.name) }]}>
            <Text style={styles.msgAvatarText}>{getInitials(selectedPatient.name)}</Text>
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
  if (selectedPatient) {
    return (
      <SafeAreaView style={styles.threadContainer}>
        {/* Thread header */}
        <View style={styles.threadHeader}>
          <TouchableOpacity style={styles.backBtn} onPress={closeThread} activeOpacity={0.7}>
            <Ionicons name="arrow-back" size={22} color="#2563EB" />
          </TouchableOpacity>

          <View style={[styles.threadAvatar, { backgroundColor: avatarColor(selectedPatient.name) }]}>
            <Text style={styles.threadAvatarText}>{getInitials(selectedPatient.name)}</Text>
          </View>

          <View style={styles.threadInfo}>
            <Text style={styles.threadName} numberOfLines={1}>{selectedPatient.name}</Text>
            <View style={styles.threadStatusRow}>
              {selectedPatient.isOnline && <View style={styles.threadOnlineDot} />}
              <Text style={[styles.threadStatus, selectedPatient.isOnline && styles.threadStatusOnline]}>
                {selectedPatient.isOnline ? "Online" : "Offline"}
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

  // ── Patient list ──────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.listContainer}>
      {/* Header */}
      <View style={styles.listHeader}>
        <View>
          <Text style={styles.listTitle}>Patient Messages</Text>
          <Text style={styles.listSub}>Conversations with your patients</Text>
        </View>
        <TouchableOpacity style={styles.searchBtn}>
          <Ionicons name="search" size={20} color="#2563EB" />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 120, gap: 10, paddingTop: 8 }}
      >
        {patients.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <Ionicons name="people-outline" size={36} color="#2563EB" />
            </View>
            <Text style={styles.emptyTitle}>No patients yet</Text>
            <Text style={styles.emptySubtitle}>
              Patients who subscribe to you will appear here
            </Text>
          </View>
        ) : (
          patients.map(renderConvItem)
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  // ── Patient list ───────────────────────────────────────────────────────
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
