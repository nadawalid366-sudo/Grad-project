import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRoute } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  Dimensions,
  FlatList,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { fetchMessages, fetchUserSubscriptions, sendMessage } from '../../services/api';

const { width } = Dimensions.get('window');

interface Doctor {
  id: string;
  name: string;
  specialty: string;
  isOnline: boolean;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
}

interface SubscriptionBanner {
  professionalTitle: string;
  planName: string;
}

interface Message {
  id: string;
  doctorId: string;
  sender: 'patient' | 'doctor';
  message: string;
  timestamp: string;
  isRead: boolean;
}

export default function MessagesPage() {
  const route = useRoute();
  const router = useRouter();
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
  const [selectedTab, setSelectedTab] = useState('messages');
  const [messageText, setMessageText] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [userEmail, setUserEmail] = useState('user@example.com');
  const [subscriptionBanner, setSubscriptionBanner] = useState<SubscriptionBanner | null>(null);

  useEffect(() => {
    const params = route.params as any;
    const email = params?.email || 'user@example.com';
    const subscribedProfessionalTitle = params?.subscribedProfessionalTitle;
    const subscribedPlanName = params?.subscribedPlanName;
    const subscribedProfessionalId = params?.subscribedProfessionalId;
    setUserEmail(email);
    if (subscribedProfessionalTitle && subscribedPlanName) {
      setSubscriptionBanner({
        professionalTitle: String(subscribedProfessionalTitle),
        planName: String(subscribedPlanName),
      });
    }

    let active = true;
    Promise.all([fetchMessages(email), fetchUserSubscriptions(email).catch(() => ({ subscriptions: [] }))])
      .then(([messagesResponse, subscriptionsResponse]) => {
        if (!active) return;

        const grouped = new Map<string, Doctor & { messages: Message[] }>();
        const flatMessages: Message[] = [];

        const subscriptionDoctors: Doctor[] = (subscriptionsResponse.subscriptions || []).map((subscription: any, index: number) => ({
          id: String(subscription.professionalId || subscription.id || `subscription-${index + 1}`),
          name: String(subscription.selectedDoctorName || subscription.professionalTitle || 'Subscribed Program'),
          specialty: String(subscription.planName || 'Subscribed Plan'),
          isOnline: true,
          lastMessage: `Subscribed to ${subscription.planName || 'a plan'}`,
          lastMessageTime: subscription.subscribedAt ? new Date(subscription.subscribedAt).toLocaleDateString() : 'Now',
          unreadCount: 0,
        }));

        (messagesResponse.messages || []).forEach((item: any, index: number) => {
          const doctorId = String(item.doctorId || '1');
          const doctorName = String(item.doctorName || 'Dr. Ahmed Hassan');

          if (!grouped.has(doctorId)) {
            grouped.set(doctorId, {
              id: doctorId,
              name: doctorName,
              specialty: String(item.specialty || 'Care Team'),
              isOnline: Boolean(item.isOnline ?? true),
              lastMessage: String(item.lastMessage || item.message || ''),
              lastMessageTime: String(item.lastMessageTime || item.timestamp || ''),
              unreadCount: Number(item.unreadCount || 0),
              messages: [],
            });
          }

          const message: Message = {
            id: String(item.id || item._id || index + 1),
            doctorId,
            sender: item.sender === 'doctor' ? 'doctor' : 'patient',
            message: String(item.message || ''),
            timestamp: String(item.timestamp || 'Now'),
            isRead: Boolean(item.isRead ?? true),
          };

          grouped.get(doctorId)!.messages.push(message);
          flatMessages.push(message);
        });

        const messageDoctors = Array.from(grouped.values()).map(({ messages: doctorMessages, ...doctor }) => doctor);
        const mergedDoctors = [
          ...subscriptionDoctors,
          ...messageDoctors.filter((doctor) => !subscriptionDoctors.some((subscriptionDoctor) => subscriptionDoctor.id === doctor.id)),
        ];

        setDoctors(mergedDoctors);
        setMessages(flatMessages);

        const preferredDoctor =
          mergedDoctors.find((doctor) => doctor.id === String(subscribedProfessionalId)) ||
          mergedDoctors.find((doctor) => doctor.name === String(subscribedProfessionalTitle)) ||
          mergedDoctors[0] ||
          null;

        setSelectedDoctor((currentSelected) => currentSelected || preferredDoctor);
      })
      .catch((error) => {
        console.log('Failed to load messages:', error);
      });

    return () => {
      active = false;
    };
  }, [route.params]);

  const getDoctorInitials = (name: string) => {
    const cleanName = name.replace(/^dr\.?\s+/i, '').trim();
    const nameParts = cleanName.split(/\s+/).filter(Boolean);

    if (nameParts.length >= 2) {
      return `${nameParts[0][0]}${nameParts[1][0]}`.toUpperCase();
    }

    return cleanName.slice(0, 2).toUpperCase();
  };

  const handleSendMessage = () => {
    if (messageText.trim() === '' || !selectedDoctor) {
      return;
    }

    const newMessage: Message = {
      id: (messages.length + 1).toString(),
      doctorId: selectedDoctor.id,
      sender: 'patient',
      message: messageText,
      timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      isRead: false,
    };

    setMessages([...messages, newMessage]);
    setMessageText('');
    sendMessage(userEmail, {
      doctorId: selectedDoctor.id,
      doctorName: selectedDoctor.name,
      message: newMessage.message,
    }).catch((error) => console.log('Failed to send message:', error));
  };

  const messageFilteredByDoctor = selectedDoctor
    ? messages.filter((msg) => msg.doctorId === selectedDoctor.id)
    : [];

  const renderDoctorItem = (doctor: Doctor) => (
    <TouchableOpacity
      key={doctor.id}
      style={[
        styles.doctorItem,
        selectedDoctor?.id === doctor.id && styles.doctorItemActive,
      ]}
      onPress={() => setSelectedDoctor(doctor)}
      activeOpacity={0.7}
    >
      <View style={styles.doctorAvatarContainer}>
        <Text style={styles.doctorAvatar}>{getDoctorInitials(doctor.name)}</Text>
        {doctor.isOnline && <View style={styles.onlineIndicator} />}
      </View>

      <View style={styles.doctorInfo}>
        <Text style={styles.doctorName}>{doctor.name}</Text>
        <Text style={styles.doctorSpecialty}>{doctor.specialty}</Text>
        <Text style={styles.lastMessage} numberOfLines={1}>
          {doctor.lastMessage}
        </Text>
      </View>

      <View style={styles.doctorMeta}>
        <Text style={styles.lastMessageTime}>{doctor.lastMessageTime}</Text>
        {doctor.unreadCount > 0 && (
          <View style={styles.unreadBadge}>
            <Text style={styles.unreadBadgeText}>{doctor.unreadCount}</Text>
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
        message.sender === 'patient' ? styles.patientMessage : styles.doctorMessage,
      ]}
    >
      <View
        style={[
          styles.messageBubbleInner,
          message.sender === 'patient'
            ? styles.patientMessageBubble
            : styles.doctorMessageBubble,
        ]}
      >
        <Text
          style={[
            styles.messageText,
            message.sender === 'patient'
              ? styles.patientMessageText
              : styles.doctorMessageText,
          ]}
        >
          {message.message}
        </Text>
        <Text
          style={[
            styles.messageTime,
            message.sender === 'patient'
              ? styles.patientMessageTime
              : styles.doctorMessageTime,
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
        <Text style={styles.headerTitle}>Messages</Text>
        <TouchableOpacity style={styles.headerAction}>
          <Ionicons name="search" size={24} color="#3B82F6" />
        </TouchableOpacity>
      </View>

      {subscriptionBanner && (
        <View style={styles.subscriptionBanner}>
          <MaterialCommunityIcons name="check-decagram" size={20} color="#2563EB" />
          <View style={styles.subscriptionBannerTextWrap}>
            <Text style={styles.subscriptionBannerTitle}>Subscribed program</Text>
            <Text style={styles.subscriptionBannerText} numberOfLines={1}>
              {subscriptionBanner.professionalTitle} - {subscriptionBanner.planName}
            </Text>
          </View>
        </View>
      )}

      {!selectedDoctor ? (
        // Doctors List View
        <View style={styles.listContainer}>
          <View style={styles.listHeader}>
            <Text style={styles.listHeaderTitle}>Your Doctors</Text>
            <Text style={styles.doctorCount}>{doctors.length} subscribed</Text>
          </View>

          <FlatList
            data={doctors}
            renderItem={({ item }) => renderDoctorItem(item)}
            keyExtractor={(item) => item.id}
            scrollEnabled={false}
            contentContainerStyle={styles.doctorsList}
          />
        </View>
      ) : (
        // Chat View
        <View style={styles.chatContainer}>
          {/* Chat Header */}
          <View style={styles.chatHeader}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => setSelectedDoctor(null)}
            >
              <Ionicons name="chevron-back" size={24} color="#3B82F6" />
            </TouchableOpacity>

            <View style={styles.chatHeaderInfo}>
              <Text style={styles.chatDoctorName}>{selectedDoctor.name}</Text>
              <View style={styles.statusContainer}>
                <View
                  style={[
                    styles.statusDot,
                    { backgroundColor: selectedDoctor.isOnline ? '#10B981' : '#9CA3AF' },
                  ]}
                />
                <Text style={styles.statusText}>
                  {selectedDoctor.isOnline ? 'Online' : 'Offline'}
                </Text>
              </View>
            </View>

            <TouchableOpacity style={styles.callButton}>
              <Ionicons name="call" size={20} color="#3B82F6" />
            </TouchableOpacity>
          </View>

          {/* Messages List */}
          <ScrollView
            style={styles.messagesList}
            contentContainerStyle={styles.messagesListContent}
            showsVerticalScrollIndicator={false}
          >
            {messageFilteredByDoctor.length === 0 ? (
              <View style={styles.emptyState}>
                <MaterialCommunityIcons
                  name="message-outline"
                  size={48}
                  color="#D1D5DB"
                />
                <Text style={styles.emptyStateText}>No messages yet</Text>
                <Text style={styles.emptyStateSubtext}>Start a conversation!</Text>
              </View>
            ) : (
              messageFilteredByDoctor.map((message) => renderMessage(message))
            )}
          </ScrollView>

          {/* Message Input */}
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
              <TouchableOpacity style={styles.attachButton}>
                <Ionicons name="add-circle" size={20} color="#3B82F6" />
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              style={[
                styles.sendButton,
                messageText.trim() === '' && styles.sendButtonDisabled,
              ]}
              onPress={handleSendMessage}
              disabled={messageText.trim() === ''}
            >
              <Ionicons
                name="send"
                size={18}
                color={messageText.trim() === '' ? '#D1D5DB' : '#FFFFFF'}
              />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Bottom Navigation Bar */}
      <View style={styles.bottomNavigation}>
        <TouchableOpacity 
          style={styles.navItem}
          onPress={() => router.push({ pathname: '/(tabs)/home', params: { email: userEmail } })}
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
          onPress={() => router.push({ pathname: '/(tabs)/plans', params: { email: userEmail } })}
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
          onPress={() => setSelectedTab('messages')}
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
          onPress={() => router.push({ pathname: '/(tabs)/prof', params: { email: userEmail } })}
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
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
  },
  headerAction: {
    padding: 8,
  },
  subscriptionBanner: {
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 4,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  subscriptionBannerTextWrap: {
    flex: 1,
  },
  subscriptionBannerTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1D4ED8',
    marginBottom: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  subscriptionBannerText: {
    fontSize: 14,
    color: '#1E3A8A',
    fontWeight: '600',
  },
  listContainer: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  listHeaderTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  doctorCount: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
  },
  doctorsList: {
    paddingHorizontal: 12,
    paddingBottom: 100,
  },
  doctorItem: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  doctorItemActive: {
    backgroundColor: '#EFF6FF',
    borderLeftWidth: 4,
    borderLeftColor: '#3B82F6',
  },
  doctorAvatarContainer: {
    position: 'relative',
    marginRight: 12,
  },
  doctorAvatar: {
    fontSize: 34,
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#10B981',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  doctorInfo: {
    flex: 1,
  },
  doctorName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 2,
  },
  doctorSpecialty: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
  },
  lastMessage: {
    fontSize: 13,
    color: '#9CA3AF',
  },
  doctorMeta: {
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: 50,
  },
  lastMessageTime: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  unreadBadge: {
    backgroundColor: '#EF4444',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  unreadBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  chatContainer: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  chatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    gap: 12,
  },
  backButton: {
    padding: 8,
  },
  chatHeaderInfo: {
    flex: 1,
  },
  chatDoctorName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 2,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 12,
    color: '#6B7280',
  },
  callButton: {
    padding: 8,
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
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 100,
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#9CA3AF',
    marginTop: 12,
  },
  emptyStateSubtext: {
    fontSize: 13,
    color: '#D1D5DB',
    marginTop: 4,
  },
  messageBubble: {
    marginBottom: 12,
  },
  patientMessage: {
    alignItems: 'flex-end',
  },
  doctorMessage: {
    alignItems: 'flex-start',
  },
  messageBubbleInner: {
    maxWidth: '80%',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  patientMessageBubble: {
    backgroundColor: '#3B82F6',
  },
  doctorMessageBubble: {
    backgroundColor: '#E5E7EB',
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
  },
  patientMessageText: {
    color: '#FFFFFF',
  },
  doctorMessageText: {
    color: '#111827',
  },
  messageTime: {
    fontSize: 11,
    marginTop: 4,
  },
  patientMessageTime: {
    color: '#D1D5DB',
  },
  doctorMessageTime: {
    color: '#9CA3AF',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    gap: 8,
  },
  messageInputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 24,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    maxHeight: 100,
  },
  messageInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 14,
    color: '#111827',
  },
  attachButton: {
    padding: 4,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#E5E7EB',
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
