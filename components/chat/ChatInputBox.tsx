/**
 * ChatInputBox Component
 * Multiline text input with send button and voice recording
 */

import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

interface ChatInputBoxProps {
  onSendMessage: (message: string) => void;
  onVoicePress?: () => void;
  onMessageChange?: (message: string) => void;
  message?: string;
  disabled?: boolean;
  loading?: boolean;
  placeholder?: string;
}

export function ChatInputBox({
  onSendMessage,
  onVoicePress,
  onMessageChange,
  message,
  disabled = false,
  loading = false,
  placeholder = 'Message AI Assistant...',
}: ChatInputBoxProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const [localMessage, setLocalMessage] = useState(message ?? '');
  const [height, setHeight] = useState(40);
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (message !== undefined) {
      setLocalMessage(message);
    }
  }, [message]);

  const currentMessage = message !== undefined ? message : localMessage;

  const handleSend = () => {
    if (currentMessage.trim() && !disabled && !loading) {
      onSendMessage(currentMessage);
      if (onMessageChange) {
        onMessageChange('');
      } else {
        setLocalMessage('');
      }
      setHeight(40);
      inputRef.current?.focus();
    }
  };

  const handleChangeText = (text: string) => {
    if (onMessageChange) {
      onMessageChange(text);
    } else {
      setLocalMessage(text);
    }
  };

  const handleContentSizeChange = (e: any) => {
    const newHeight = Math.max(40, Math.min(e.nativeEvent.contentSize.height, 120));
    setHeight(newHeight);
  };

  const canSend = currentMessage.trim().length > 0 && !disabled && !loading;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[
        styles.container,
        {
          borderTopColor: colors.tabIconDefault,
          backgroundColor: colors.background,
        },
      ]}
    >
      <View style={styles.inputContainer}>
        <TouchableOpacity
          style={styles.voiceButton}
          onPress={onVoicePress}
          disabled={disabled || loading}
          activeOpacity={0.6}
        >
          <Ionicons
            name="mic-outline"
            size={20}
            color={disabled || loading ? '#ccc' : colors.tint}
          />
        </TouchableOpacity>

        <TextInput
          ref={inputRef}
          style={[
            styles.input,
            {
              backgroundColor: colors.tabIconDefault + '15',
              color: colorScheme === 'dark' ? '#FFFFFF' : '#111111',
              height: Math.min(height, 120),
            },
          ]}
          placeholder={placeholder}
          placeholderTextColor={colorScheme === 'dark' ? '#CCCCCC' : '#888888'}
          value={currentMessage}
          onChangeText={handleChangeText}
          multiline
          maxLength={5000}
          editable={!disabled && !loading}
          onContentSizeChange={handleContentSizeChange}
        />

        <TouchableOpacity
          style={[
            styles.sendButton,
            {
              backgroundColor: canSend ? colors.tint : '#ccc',
            },
          ]}
          onPress={handleSend}
          disabled={!canSend}
          activeOpacity={0.7}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <Ionicons name="send" size={18} color="#ffffff" />
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.characterCount}>
        <Text
          style={{
            color: colors.tabIconDefault,
            fontSize: 11,
          }}
        >
          {currentMessage.length}/5000
        </Text>
      </View>
    </KeyboardAvoidingView>
  );
}

export default ChatInputBox;

const styles = StyleSheet.create({
  container: {
    borderTopWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  voiceButton: {
    padding: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderWidth: 0,
    maxHeight: 120,
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  characterCount: {
    alignItems: 'flex-end',
    paddingRight: 8,
    marginTop: 4,
  },
});
