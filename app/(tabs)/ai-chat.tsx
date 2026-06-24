/**
 * AI Chat Screen
 * Main screen for AI Chat functionality
 * WhatsApp-inspired modern UI with Gemini integration
 */

import { ChatBubble } from '@/components/chat/ChatBubble';
import { ChatHeader } from '@/components/chat/ChatHeader';
import { ChatInputBox } from '@/components/chat/ChatInputBox';
import { RecordButton } from '@/components/chat/RecordButton';
import { TypingIndicator } from '@/components/chat/TypingIndicator';
import { Colors } from '@/constants/theme';
import { useChat } from '@/hooks/use-chat';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    Alert,
    FlatList,
    Modal,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function AIChatScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const { messages, loading, error, sendMessage, clearMessages } = useChat();
  const [showVoiceModal, setShowVoiceModal] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [pendingTranscription, setPendingTranscription] = useState('');
  const [inputText, setInputText] = useState('');
  const flatListRef = useRef<FlatList>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messages.length > 0) {
      flatListRef.current?.scrollToEnd({ animated: true });
    }
  }, [messages]);

  // Show error alerts
  useEffect(() => {
    if (error) {
      Alert.alert('Error', error, [
        { text: 'OK', onPress: () => {} },
      ]);
    }
  }, [error]);

  const handleSendMessage = useCallback(
    async (message: string) => {
      await sendMessage(message);
      setInputText('');
      setPendingTranscription('');
    },
    [sendMessage]
  );

  const handleVoicePress = useCallback(() => {
    setShowVoiceModal(true);
  }, []);

  const handleTranscriptionComplete = useCallback((text: string) => {
    setPendingTranscription(text);
    setInputText(text);
    setShowVoiceModal(false);
    // Show alert for user to confirm
    Alert.alert('Transcription', `Did we get it right?\n\n"${text}"`, [
      {
        text: 'Cancel',
        onPress: () => {
          setPendingTranscription('');
          setInputText('');
        },
        style: 'cancel',
      },
      {
        text: 'Send',
        onPress: () => {
          handleSendMessage(text);
          setPendingTranscription('');
        },
        style: 'default',
      },
      {
        text: 'Edit',
        onPress: () => {
          // Text remains in pendingTranscription, user can edit in input box
          setShowVoiceModal(false);
        },
      },
    ]);
  }, [handleSendMessage]);

  const handleClearHistory = useCallback(() => {
    Alert.alert(
      'Clear History',
      'Are you sure you want to clear all messages? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          onPress: () => {
            clearMessages();
            setShowMenu(false);
          },
          style: 'destructive',
        },
      ]
    );
  }, [clearMessages]);

  const renderMessage = ({ item }: any) => (
    <ChatBubble
      role={item.role}
      content={item.content}
      timestamp={item.timestamp}
    />
  );

  const renderFooter = () => {
    if (!loading) return null;
    return <TypingIndicator color={colors.icon} />;
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ChatHeader
        onMenuPress={() => setShowMenu(true)}
        onInfoPress={() => {
          Alert.alert(
            'About AI Chat',
            'This AI Assistant is powered by Google Gemini. It can help you with questions, conversations, and more.\n\nFeatures:\n• Smart conversations\n• Voice-to-text\n• Chat history\n• Always available'
          );
        }}
      />

      <FlatList
       ref={flatListRef}
       data={messages}
       renderItem={renderMessage}
      keyExtractor={(item) => item.id}
      ListFooterComponent={renderFooter}
      contentContainerStyle={[
      styles.listContent,
     {
      justifyContent:
        messages.length === 0 ? 'center' : 'flex-end',
      },
     ]}
     onEndReachedThreshold={0.1}
     />

      <ChatInputBox
        message={inputText || pendingTranscription}
        onMessageChange={setInputText}
        onSendMessage={handleSendMessage}
        onVoicePress={handleVoicePress}
        disabled={loading}
        loading={loading}
        placeholder='Message AI Assistant...'
      />

      {/* Voice Recording Modal */}
      <Modal visible={showVoiceModal} transparent animationType="slide">
        <View style={styles.voiceModalOverlay}>
          <View
            style={[
              styles.voiceModalContent,
              { backgroundColor: colors.background },
            ]}
          >
            <View style={styles.voiceModalHeader}>
              <Text style={[styles.voiceModalTitle, { color: colors.text }]}>
                Voice Message
              </Text>
              <TouchableOpacity onPress={() => setShowVoiceModal(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <View style={styles.voiceRecordingContainer}>
              <Text style={[styles.voiceInstructions, { color: colors.text }]}>
                Tap the button to start recording
              </Text>
              <RecordButton
                onTranscriptionComplete={handleTranscriptionComplete}
              />
              <Text
                style={[
                  styles.voiceNote,
                  { color: colors.tabIconDefault },
                ]}
              >
                Press and hold to record, release when done
              </Text>
            </View>
          </View>
        </View>
      </Modal>

      {/* Menu Modal */}
      <Modal visible={showMenu} transparent animationType="fade">
        <View style={styles.menuOverlay}>
          <TouchableOpacity
            style={styles.menuBackdrop}
            onPress={() => setShowMenu(false)}
          />
          <View
            style={[
              styles.menuContent,
              { backgroundColor: colors.background },
            ]}
          >
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                setShowMenu(false);
              }}
            >
              <Ionicons name="document-text" size={20} color={colors.text} />
              <Text style={[styles.menuItemText, { color: colors.text }]}>
                View History
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.menuItem, styles.menuItemDanger]}
              onPress={handleClearHistory}
            >
              <Ionicons name="trash" size={20} color="#ff3b30" />
              <Text style={[styles.menuItemText, { color: '#ff3b30' }]}>
                Clear History
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => setShowMenu(false)}
            >
              <Ionicons name="close" size={20} color={colors.text} />
              <Text style={[styles.menuItemText, { color: colors.text }]}>
                Close
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContent: {
    paddingVertical: 8,
    flexGrow: 1,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  emptyText: {
    fontSize: 16,
    marginTop: 12,
    textAlign: 'center',
  },
  voiceModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  voiceModalContent: {
    paddingBottom: 40,
    paddingTop: 20,
    paddingHorizontal: 20,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  voiceModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  voiceModalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  voiceRecordingContainer: {
    alignItems: 'center',
    gap: 20,
  },
  voiceInstructions: {
    fontSize: 14,
  },
  voiceNote: {
    fontSize: 12,
    textAlign: 'center',
  },
  menuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  menuBackdrop: {
    flex: 1,
  },
  menuContent: {
    paddingBottom: 20,
    paddingTop: 12,
    paddingHorizontal: 20,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    gap: 8,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 12,
  },
  menuItemDanger: {
    backgroundColor: 'rgba(255,59,48,0.1)',
  },
  menuItemText: {
    fontSize: 16,
  },
});
