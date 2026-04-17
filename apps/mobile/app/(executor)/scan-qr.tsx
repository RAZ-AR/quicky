import { useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { CameraView, useCameraPermissions, type BarcodeScanningResult } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTaskStore } from '../../src/stores/taskStore';
import { useAppTheme } from '../../src/hooks/useAppTheme';
import { EXEC_GRAD, EXEC_GRAD_DARK } from '../../src/components/GradBtn';
import { RADIUS, type AppColors } from '../../src/constants/config';

type CompletionQrPayload = {
  type: 'quicky_task_completion';
  task_id: string;
  token: string;
};

function parseCompletionQr(data: string): CompletionQrPayload | null {
  try {
    const parsed = JSON.parse(data) as Partial<CompletionQrPayload>;
    if (parsed.type !== 'quicky_task_completion') return null;
    if (!parsed.task_id || !parsed.token) return null;
    return parsed as CompletionQrPayload;
  } catch {
    return null;
  }
}

export default function ExecutorQrScanScreen() {
  const router = useRouter();
  const { taskId } = useLocalSearchParams<{ taskId: string }>();
  const { completeTaskWithQr } = useTaskStore();
  const { COLORS, isDark } = useAppTheme();
  const styles = useMemo(() => makeStyles(COLORS), [COLORS]);
  const [permission, requestPermission] = useCameraPermissions();
  const [isScanned, setIsScanned] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);

  const handleScanned = async ({ data }: BarcodeScanningResult) => {
    if (isScanned || isCompleting) return;
    const payload = parseCompletionQr(data);
    if (!payload) {
      setIsScanned(true);
      Alert.alert('Не тот QR код', 'Попросите заказчика показать QR подтверждения Quicky.', [
        { text: 'Сканировать снова', onPress: () => setIsScanned(false) },
      ]);
      return;
    }
    if (payload.task_id !== taskId) {
      setIsScanned(true);
      Alert.alert('QR от другого заказа', 'Этот код не относится к текущему заданию.', [
        { text: 'Сканировать снова', onPress: () => setIsScanned(false) },
      ]);
      return;
    }

    setIsScanned(true);
    setIsCompleting(true);
    try {
      await completeTaskWithQr(payload.task_id, payload.token);
      Alert.alert('Заказ завершён', 'Теперь можно поставить оценку заказчику.', [
        {
          text: 'Оценить',
          onPress: () => router.replace({ pathname: '/(executor)/task/[id]', params: { id: payload.task_id } }),
        },
      ]);
    } catch {
      Alert.alert('Не удалось подтвердить', 'Проверьте, что заказ в работе и QR код актуален.', [
        { text: 'Сканировать снова', onPress: () => setIsScanned(false) },
      ]);
    } finally {
      setIsCompleting(false);
    }
  };

  if (!permission) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={COLORS.executor} />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.root}>
        <StatusBar barStyle="light-content" />
        <SafeAreaView style={styles.permissionSafe}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={22} color="#fff" />
          </TouchableOpacity>
          <View style={styles.permissionBody}>
            <Ionicons name="qr-code-outline" size={64} color={COLORS.executor} />
            <Text style={styles.permissionTitle}>Нужен доступ к камере</Text>
            <Text style={styles.permissionText}>
              Отсканируйте QR код заказчика, чтобы подтвердить передачу и завершить заказ.
            </Text>
            <TouchableOpacity style={styles.grantWrap} onPress={requestPermission} activeOpacity={0.85}>
              <LinearGradient colors={isDark ? EXEC_GRAD_DARK : EXEC_GRAD} style={styles.grantBtn}>
                <Text style={styles.grantText}>Разрешить камеру</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />
      <CameraView
        style={StyleSheet.absoluteFill}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        onBarcodeScanned={isScanned ? undefined : handleScanned}
      />
      <SafeAreaView style={styles.overlay}>
        <View style={styles.topBar}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={22} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.topTitle}>Сканируйте QR заказчика</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.scanArea}>
          <View style={styles.cornerTopLeft} />
          <View style={styles.cornerTopRight} />
          <View style={styles.cornerBottomLeft} />
          <View style={styles.cornerBottomRight} />
          {isCompleting && (
            <View style={styles.processing}>
              <ActivityIndicator color="#fff" />
              <Text style={styles.processingText}>Подтверждаем...</Text>
            </View>
          )}
        </View>

        <View style={styles.bottomHint}>
          <Text style={styles.hintTitle}>Последний шаг</Text>
          <Text style={styles.hintText}>
            Наведите камеру на QR код у заказчика. После сканирования заказ завершится, и обе стороны смогут оставить отзыв.
          </Text>
        </View>
      </SafeAreaView>
    </View>
  );
}

function makeStyles(C: AppColors, R = RADIUS) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: '#05070A' },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#05070A' },
    overlay: { flex: 1, justifyContent: 'space-between', backgroundColor: 'rgba(0,0,0,0.20)' },
    permissionSafe: { flex: 1 },
    topBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 8 },
    backBtn: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: 'rgba(0,0,0,0.45)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    topTitle: { flex: 1, color: '#fff', fontSize: 17, fontWeight: '800', textAlign: 'center' },
    scanArea: {
      width: 260,
      height: 260,
      alignSelf: 'center',
      alignItems: 'center',
      justifyContent: 'center',
    },
    cornerTopLeft: { position: 'absolute', top: 0, left: 0, width: 58, height: 58, borderTopWidth: 5, borderLeftWidth: 5, borderColor: C.executor, borderTopLeftRadius: R.md },
    cornerTopRight: { position: 'absolute', top: 0, right: 0, width: 58, height: 58, borderTopWidth: 5, borderRightWidth: 5, borderColor: C.executor, borderTopRightRadius: R.md },
    cornerBottomLeft: { position: 'absolute', bottom: 0, left: 0, width: 58, height: 58, borderBottomWidth: 5, borderLeftWidth: 5, borderColor: C.executor, borderBottomLeftRadius: R.md },
    cornerBottomRight: { position: 'absolute', bottom: 0, right: 0, width: 58, height: 58, borderBottomWidth: 5, borderRightWidth: 5, borderColor: C.executor, borderBottomRightRadius: R.md },
    processing: {
      borderRadius: R.xl,
      backgroundColor: 'rgba(0,0,0,0.62)',
      paddingHorizontal: 18,
      paddingVertical: 14,
      alignItems: 'center',
      gap: 8,
    },
    processingText: { color: '#fff', fontSize: 13, fontWeight: '700' },
    bottomHint: {
      margin: 18,
      borderRadius: R.xl,
      backgroundColor: 'rgba(0,0,0,0.62)',
      padding: 18,
    },
    hintTitle: { color: '#fff', fontSize: 18, fontWeight: '800', marginBottom: 6 },
    hintText: { color: 'rgba(255,255,255,0.78)', fontSize: 14, lineHeight: 20 },
    permissionBody: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28 },
    permissionTitle: { color: '#fff', fontSize: 24, fontWeight: '800', marginTop: 18, marginBottom: 8, textAlign: 'center' },
    permissionText: { color: 'rgba(255,255,255,0.72)', fontSize: 15, lineHeight: 22, textAlign: 'center', marginBottom: 24 },
    grantWrap: { width: '100%', borderRadius: R.xl, overflow: 'hidden' },
    grantBtn: { paddingVertical: 16, alignItems: 'center' },
    grantText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  });
}
