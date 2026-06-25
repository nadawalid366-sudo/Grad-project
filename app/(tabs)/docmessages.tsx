import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
    FlatList,
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
    sendDoctorMessage,
    fetchDoctorPatients,
} from "../../services/api";

interface Patient {
  id: string; // Using email as ID for now
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
}

export default function DocMessagesPage() {
  const { email: emailParam } = useLocalSearchParams<{ email?: string }>();
  const router = useRouter();
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [messageText, setMessageText] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [doctorEmail, setDoctorEmail] = useState("doctor@example.com");

  useEffect(() => {
    const email = emailParam || "doctor@example.com";
    setDoctorEmail(email);

    let active = true;
    Promise.all([
      fetchDoctorMessages(email),
      fetchDoctorPatients(email).catch(() => ({ patients: [] })),
    ])
      .then(([messagesResponse, patientsResponse]) => {
        if (!active) return;

        const grouped = new Map<string, Patient & { messages: Message[] }>();
        const flatMessages: Message[] = [];

        // Initialize with patients from the doctor's roster
        const rosterPatients: Patient[] = (patientsResponse.patients || []).map((p: any) => ({
          id: String(p.email || p.id),
          name: String(p.name || p.email),
          isOnline: true,
          lastMessage: "No recent messages",
          lastMessageTime: "",
          unreadCount: 0,
          messages: [],
        }));

        rosterPatients.forEach(p => grouped.set(p.id, { ...p }));

        (messagesResponse.messages || []).forEach(
          (item: any, index: number) => {
            const patientEmail = String(item.email || "unknown");
            
            if (!grouped.has(patientEmail)) {
              grouped.set(patientEmail, {
                id: patientEmail,
                name: patientEmail, // Fallback if no roster found
                isOnline: true,
                lastMessage: "",
                lastMessageTime: "",
                unreadCount: 0,
                messages: [],
              });
            }

            const patientRecord = grouped.get(patientEmail)!;
            patientRecord.lastMessage = String(item.lastMessage || item.message || "");
            patientRecord.lastMessageTime = String(item.lastMessageTime || item.timestamp || "");
            patientRecord.unreadCount += Number(item.unreadCount || 0);

            const message: Message = {
              id: String(item.id || item._id || index + 1),
              patientEmail,
              sender: item.sender === "patient" ? "patient" : "doctor",
              message: String(item.message || ""),
              timestamp: String(item.timestamp || "Now"),
              isRead: Boolean(item.isRead ?? true),
            };

            patientRecord.messages.push(message);
            flatMessages.push(message);
          },
        );

        const mergedPatients = Array.from(grouped.values()).map(
          ({ messages: patMessages, ...pat }) => pat,
        );

        setPatients(mergedPatients);
        setMessages(flatMessages);
      })
      .catch((error) => {
        console.log("Failed to load messages:", error);
      });

    return () => {
      active = false;
    };
  }, [emailParam]);

  const getPatientInitials = (name: string) => {
    const cleanName = name.trim();
    const nameParts = cleanName.split(/\s+/).filter(Boolean);
    if (nameParts.length >= 2) {
      return `${nameParts[0][0]}${nameParts[1][0]}`.toUpperCase();
    }
    return cleanName.slice(0, 2).toUpperCase();
  };

  const handleSendMessage = () => {
    if (messageText.trim() === "" || !selectedPatient) {
      return;
    }

    const newMessage: Message = {
      id: (messages.length + 1).toString(),
      patientEmail: selectedPatient.id,
      sender: "doctor",
      message: messageText,
      timestamp: new Date().toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
      }),
      isRead: false,
    };

    setMessages([...messages, newMessage]);
    setMessageText("");
    sendDoctorMessage(doctorEmail, {
      patientEmail: selectedPatient.id,
      message: newMessage.message,
    }).catch((error) => console.log("Failed to send message:", error));
  };

  const messageFilteredByPatient = selectedPatient
    ? messages.filter((msg) => msg.patientEmail === selectedPatient.id)
    : [];

  const renderPatientItem = (patient: Patient) => (
    <TouchableOpacity
      key={patient.id}
      style={[
        styles.patientItem,
        selectedPatient?.id === patient.id && styles.patientItemActive,
      ]}
      onPress={() => setSelectedPatient(patient)}
      activeOpacity={0.7}
    >
      <View style={styles.patientAvatarContainer}>
        <Text style={styles.patientAvatar}>
          {getPatientInitials(patient.name)}
        </Text>
        {patient.isOnline && <View style={styles.onlineIndicator} />}
      </View>

      <View style={styles.patientInfo}>
        <Text style={styles.patientName}>{patient.name}</Text>
        <Text style={styles.lastMessage} numberOfLines={1}>
          {patient.lastMessage}
        </Text>
      </View>

      <View style={styles.patientMeta}>
        <Text style={styles.lastMessageTime}>{patient.lastMessageTime}</Text>
        {patient.unreadCount > 0 && (
          <View style={styles.unreadBadge}>
            <Text style={styles.unreadBadgeText}>{patient.unreadCount}</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );

  const renderMessage = (message: Message) => (
    <View
      key={message.id}
      style={[
        styles.messageBubble,
        message.sender === "doctor"
          ? styles.doctorMessageSent
          : styles.patientMessageReceived,
      ]}
    >
      <View
        style={[
          styles.messageBubbleInner,
          message.sender === "doctor"
            ? styles.doctorMessageSentBubble
            : styles.patientMessageReceivedBubble,
        ]}
      >
        <Text
          style={[
            styles.messageText,
            message.sender === "doctor"
              ? styles.doctorMessageSentText
              : styles.patientMessageReceivedText,
          ]}
        >
          {message.message}
        </Text>
        <Text
          style={[
            styles.messageTime,
            message.sender === "doctor"
              ? styles.doctorMessageSentTime
              : styles.patientMessageReceivedTime,
          ]}
        >
          {message.timestamp}
        </Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Patient Messages</Text>
      </View>

      {!selectedPatient ? (
        // Patients List View
        <View style={styles.listContainer}>
          <View style={styles.listHeader}>
            <Text style={styles.listHeaderTitle}>Your Patients</Text>
            <Text style={styles.patientCount}>{patients.length} total</Text>
          </View>

          <FlatList
            data={patients}
            renderItem={({ item }) => renderPatientItem(item)}
            keyExtractor={(item) => item.id}
            scrollEnabled={true}
            contentContainerStyle={styles.patientsList}
          />
        </View>
      ) : (
        // Chat View
        <View style={styles.chatContainer}>
          <View style={styles.chatHeader}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => setSelectedPatient(null)}
            >
              <Ionicons name="chevron-back" size={24} color="#3B82F6" />
            </TouchableOpacity>

            <View style={styles.chatHeaderInfo}>
              <Text style={styles.chatPatientName}>{selectedPatient.name}</Text>
            </View>
          </View>

          <ScrollView
            style={styles.messagesList}
            contentContainerStyle={styles.messagesListContent}
            showsVerticalScrollIndicator={false}
          >
            {messageFilteredByPatient.length === 0 ? (
              <View style={styles.emptyState}>
                <MaterialCommunityIcons
                  name="message-outline"
                  size={48}
                  color="#D1D5DB"
                />
                <Text style={styles.emptyStateText}>No messages yet</Text>
              </View>
            ) : (
              messageFilteredByPatient.map((message) => renderMessage(message))
            )}
          </ScrollView>

          <View style={styles.inputContainer}>
            <View style={styles.messageInputWrapper}>
              <TextInput
                style={styles.messageInput}
                placeholder="Type your message..."
                value={messageText}
                onChangeText={setMessageText}
                placeholderTextColor="#9CA3AF"
                multiline
              />
            </View>
            <TouchableOpacity
              style={[
                styles.sendButton,
                messageText.trim() === "" && styles.sendButtonDisabled,
              ]}
              onPress={handleSendMessage}
              disabled={messageText.trim() === ""}
            >
              <Ionicons
                name="send"
                size={18}
                color={messageText.trim() === "" ? "#D1D5DB" : "#FFFFFF"}
              />
            </TouchableOpacity>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F6EF",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "700",
    color: "#111827",
  },
  listContainer: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  listHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  listHeaderTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
  },
  patientCount: {
    fontSize: 13,
    color: "#6B7280",
    fontWeight: "500",
  },
  patientsList: {
    paddingHorizontal: 12,
    paddingBottom: 100,
  },
  patientItem: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  patientItemActive: {
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#2563EB",
  },
  patientAvatarContainer: {
    position: "relative",
    marginRight: 12,
  },
  patientAvatar: {
    fontSize: 34,
  },
  onlineIndicator: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: "#10B981",
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  patientInfo: {
    flex: 1,
  },
  patientName: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 2,
  },
  lastMessage: {
    fontSize: 13,
    color: "#9CA3AF",
  },
  patientMeta: {
    alignItems: "flex-end",
    justifyContent: "space-between",
    height: 50,
  },
  lastMessageTime: {
    fontSize: 12,
    color: "#9CA3AF",
  },
  unreadBadge: {
    backgroundColor: "#EF4444",
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 6,
  },
  unreadBadgeText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "700",
  },
  chatContainer: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  chatHeader: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
    gap: 12,
  },
  backButton: {
    padding: 8,
  },
  chatHeaderInfo: {
    flex: 1,
  },
  chatPatientName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 2,
  },
  messagesList: {
    flex: 1,
  },
  messagesListContent: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 100,
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#9CA3AF",
    marginTop: 12,
  },
  messageBubble: {
    marginBottom: 12,
  },
  doctorMessageSent: {
    alignItems: "flex-end",
  },
  patientMessageReceived: {
    alignItems: "flex-start",
  },
  messageBubbleInner: {
    maxWidth: "80%",
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  doctorMessageSentBubble: {
    backgroundColor: "#2563EB",
  },
  patientMessageReceivedBubble: {
    backgroundColor: "#E5E7EB",
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
  },
  doctorMessageSentText: {
    color: "#FFFFFF",
  },
  patientMessageReceivedText: {
    color: "#111827",
  },
  messageTime: {
    fontSize: 11,
    marginTop: 4,
  },
  doctorMessageSentTime: {
    color: "#D1D5DB",
  },
  patientMessageReceivedTime: {
    color: "#9CA3AF",
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    gap: 8,
  },
  messageInputWrapper: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F3F4F6",
    borderRadius: 24,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    maxHeight: 100,
  },
  messageInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 14,
    color: "#111827",
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#2563EB",
    justifyContent: "center",
    alignItems: "center",
  },
  sendButtonDisabled: {
    backgroundColor: "#E5E7EB",
  },
});
