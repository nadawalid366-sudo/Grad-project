import React, { useState, useRef, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  ActivityIndicator,
  Platform,
  TextInput,
  KeyboardAvoidingView,
  Keyboard,
  TouchableWithoutFeedback,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useVoiceTranscription } from '../hooks/use-voice-transcription';
import { classifyVoice, savePatientLog } from '../services/api';
import { getUser } from '../services/auth';

interface VoiceModalProps {
  visible: boolean;
  onClose: () => void;
  email: string;
}

const categories = [
  { id: 'meal', label: 'Meal', color: '#FCE36B' },
  { id: 'exercise', label: 'Exercise', color: '#E0F2FE' },
  { id: 'vitals', label: 'Vitals', color: '#F6A6C1' },
  { id: 'symptom', label: 'Symptom', color: '#D8B4E2' },
  { id: 'medication', label: 'Medication', color: '#A8C487' },
  { id: 'sleep', label: 'Sleep', color: '#D1D5DB' },
  { id: 'water', label: 'Water', color: '#BFDBFE' },
];

function normalizeLogType(text: string) {
  const value = text.toLowerCase();
  if (value.includes('meal') || value.includes('food') || value.includes('breakfast') || value.includes('lunch') || value.includes('dinner') || value.includes('snack') || value.includes('ate')) return 'meal';
  if (value.includes('water') || value.includes('drink') || value.includes('glass')) return 'water';
  if (value.includes('sleep') || value.includes('bed') || value.includes('nap')) return 'sleep';
  if (value.includes('medication') || value.includes('pill') || value.includes('dose')) return 'medication';
  if (value.includes('heart') || value.includes('blood pressure') || value.includes('bpm')) return 'vitals';
  if (value.includes('exercise') || value.includes('run') || value.includes('walk') || value.includes('workout')) return 'exercise';
  return 'symptom';
}

export function VoiceModal({ visible, onClose, email }: VoiceModalProps) {
  const [screen, setScreen] = useState<'listening' | 'confirmation'>('listening');
  const [voiceTranscript, setVoiceTranscript] = useState('');
  const [voiceLogCategory, setVoiceLogCategory] = useState('meal');
  const [voiceLogTitle, setVoiceLogTitle] = useState('');
  const [voiceLogDetails, setVoiceLogDetails] = useState<any>({});
  const [isSavingVoiceLog, setIsSavingVoiceLog] = useState(false);

  const {
    isRecording,
    isTranscribing,
    error: voiceError,
    start: startVoiceRecording,
    stopAndTranscribe,
    cancel: cancelVoiceRecording,
  } = useVoiceTranscription();

  const pulseAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      setScreen('listening');
      setVoiceTranscript('');
      startPulse();
      startVoiceRecording().catch(console.error);
    } else {
      cancelVoiceRecording().catch(console.error);
      pulseAnim.stopAnimation();
    }
  }, [visible]);

  const startPulse = () => {
    pulseAnim.setValue(0);
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    ).start();
  };

  const handleListeningComplete = async () => {
    try {
      const result = await stopAndTranscribe();
      if (result) {
        setVoiceTranscript(result);
        try {
          const aiParsed = await classifyVoice(result);
          setVoiceLogCategory(aiParsed.type || 'symptom');
          setVoiceLogTitle(aiParsed.title || result);
          setVoiceLogDetails(aiParsed.details || {});
        } catch (classifyErr) {
          console.error("Classification failed:", classifyErr);
          setVoiceLogCategory(normalizeLogType(result));
          setVoiceLogTitle(result);
          setVoiceLogDetails({});
        }
      }
      setScreen('confirmation');
    } catch (err) {
      console.error(err);
      setScreen('confirmation');
    }
  };

  const handleSaveVoiceLog = async () => {
    setIsSavingVoiceLog(true);
    try {
      const activeEmail = getUser()?.email || email;
      await savePatientLog(activeEmail, {
        type: voiceLogCategory,
        title: voiceLogTitle,
        details: voiceLogDetails,
        isVoice: false, // Set to false because we already parsed it with Groq on frontend!
        transcript: voiceTranscript,
      });
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSavingVoiceLog(false);
    }
  };

  return (
    <Modal visible={visible} transparent={true} animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView 
        style={{ flex: 1 }} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.overlay}>
            {screen === 'listening' ? (
              <View style={styles.content}>
                <View style={styles.header}>
                  <View>
                    <Text style={styles.title}>Voice Assistant</Text>
                    <Text style={styles.subtitle}>Speak clearly. We'll auto-detect the category.</Text>
                  </View>
                  <TouchableOpacity onPress={onClose}>
                    <Ionicons name="close" size={28} color="#1E1E1E" />
                  </TouchableOpacity>
                </View>

                <View style={styles.listeningContainer}>
                  <Text style={styles.listeningLabel}>
                    {isTranscribing ? 'Transcribing...' : 'Listening...'}
                  </Text>

                  <View style={styles.pulseContainer}>
                    <Animated.View
                      style={[
                        styles.pulseRing,
                        {
                          opacity: pulseAnim.interpolate({
                            inputRange: [0, 1],
                            outputRange: [0.8, 0],
                          }),
                          transform: [{ scale: pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 2] }) }],
                        },
                      ]}
                    />
                    <View style={styles.micCircle}>
                      {isTranscribing ? (
                        <ActivityIndicator size="large" color="#FFFFFF" />
                      ) : (
                        <MaterialCommunityIcons name="microphone" size={40} color="#FFFFFF" />
                      )}
                    </View>
                  </View>
                  <Text style={styles.errorText}>{voiceError || ''}</Text>
                </View>

                <TouchableOpacity 
                  style={[styles.doneBtn, (isTranscribing || !isRecording) && { opacity: 0.5 }]} 
                  onPress={handleListeningComplete}
                  disabled={isTranscribing || !isRecording}
                >
                  <Text style={styles.doneBtnText}>Done</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.content}>
                <View style={styles.header}>
                  <Text style={styles.title}>Confirm your entry</Text>
                  <TouchableOpacity onPress={onClose}>
                    <Ionicons name="close" size={28} color="#1E1E1E" />
                  </TouchableOpacity>
                </View>

                {voiceTranscript ? (
                  <>
                    <View style={styles.transcriptBox}>
                      <Text style={styles.transcriptLabel}>You said (tap to edit):</Text>
                      <TextInput
                        style={styles.transcriptInput}
                        value={voiceTranscript}
                        onChangeText={setVoiceTranscript}
                        multiline
                      />
                    </View>

                    <Text style={styles.confirmSub}>
                      Aura extracted the following details. You can review the category below:
                    </Text>
                    {Object.keys(voiceLogDetails).length > 0 && (
                      <View style={styles.detailsBox}>
                        {Object.entries(voiceLogDetails).map(([k, v]) => (
                           <Text key={k} style={styles.detailText}>• {k}: {String(v)}</Text>
                        ))}
                      </View>
                    )}

                    <View style={styles.categoryContainer}>
                      {categories.map((cat) => (
                        <TouchableOpacity
                          key={cat.id}
                          style={[
                            styles.categoryPill,
                            voiceLogCategory === cat.id && styles.categoryPillActive
                          ]}
                          onPress={() => setVoiceLogCategory(cat.id)}
                        >
                          <Text style={[
                            styles.categoryPillText,
                            voiceLogCategory === cat.id && styles.categoryPillTextActive
                          ]}>{cat.label}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>

                    <TouchableOpacity style={styles.saveBtn} onPress={handleSaveVoiceLog} disabled={isSavingVoiceLog}>
                      <Text style={styles.saveBtnText}>{isSavingVoiceLog ? 'Saving...' : 'Save log'}</Text>
                    </TouchableOpacity>
                  </>
                ) : (
                  <>
                    <View style={styles.transcriptBox}>
                      <Text style={styles.transcriptText}>No speech detected.</Text>
                    </View>
                    <TouchableOpacity style={styles.saveBtn} onPress={onClose}>
                      <Text style={styles.saveBtnText}>Done</Text>
                    </TouchableOpacity>
                  </>
                )}
              </View>
            )}
          </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  content: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    padding: 24,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 30,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#0F172A',
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
  listeningContainer: {
    alignItems: 'center',
    marginVertical: 40,
  },
  listeningLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: '#0F172A',
    marginBottom: 40,
  },
  pulseContainer: {
    width: 100,
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pulseRing: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#3B82F6', // Blue pulse
  },
  micCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#2563EB', // Primary Blue
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    color: '#DC2626',
    marginTop: 20,
  },
  doneBtn: {
    backgroundColor: '#2563EB', // Primary Blue
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
  doneBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  transcriptBox: {
    backgroundColor: '#F8FAFC',
    padding: 16,
    borderRadius: 16,
    marginBottom: 24,
  },
  transcriptLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 8,
  },
  transcriptText: {
    fontSize: 16,
    color: '#0F172A',
    fontStyle: 'italic',
  },
  transcriptInput: {
    fontSize: 16,
    color: '#0F172A',
    minHeight: 60,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#FFFFFF',
    marginTop: 8,
  },
  categoryLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0F172A',
    marginBottom: 12,
  },
  confirmSub: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 20,
    fontStyle: 'italic',
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 30,
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  categoryText: {
    color: '#4B5563',
  },
  saveBtnDisabled: {
    backgroundColor: '#E5E7EB',
  },
  detailsBox: {
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    padding: 10,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  detailText: {
    fontSize: 14,
    color: '#4B5563',
    marginBottom: 4,
  },
  saveBtn: {
    backgroundColor: '#2563EB', // Primary Blue
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
