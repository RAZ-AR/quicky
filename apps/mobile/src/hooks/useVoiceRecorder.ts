import { useState, useRef } from 'react';

// expo-av requires a native build — import lazily so Expo Go doesn't crash
let Audio: typeof import('expo-av').Audio | null = null;
try {
  Audio = require('expo-av').Audio;
} catch {
  // running in Expo Go without native module — voice recording unavailable
}

type RecorderState = 'idle' | 'recording' | 'stopping' | 'error';

export function useVoiceRecorder() {
  const [state, setState] = useState<RecorderState>('idle');
  const [error, setError] = useState<string | null>(null);
  const recordingRef = useRef<any>(null);

  const startRecording = async () => {
    if (!Audio) {
      setError('Запись недоступна в Expo Go');
      setState('error');
      return;
    }
    try {
      setError(null);
      const { granted } = await Audio.requestPermissionsAsync();
      if (!granted) {
        setError('Нет доступа к микрофону');
        setState('error');
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY,
      );
      recordingRef.current = recording;
      setState('recording');
    } catch {
      setError('Не удалось начать запись');
      setState('error');
    }
  };

  const stopRecording = async (): Promise<string | null> => {
    const recording = recordingRef.current;
    if (!recording) return null;

    setState('stopping');
    try {
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      recordingRef.current = null;
      setState('idle');
      return uri ?? null;
    } catch {
      setError('Не удалось остановить запись');
      setState('error');
      return null;
    }
  };

  const reset = () => {
    recordingRef.current?.stopAndUnloadAsync().catch(() => {});
    recordingRef.current = null;
    setState('idle');
    setError(null);
  };

  return { state, error, startRecording, stopRecording, reset };
}
