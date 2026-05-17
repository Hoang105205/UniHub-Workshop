import { CameraView, useCameraPermissions } from 'expo-camera';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  Vibration,
  View,
} from 'react-native';

import { useScanCooldown } from '../hooks/scanner';
import { handleCheckIn } from '../services/checkin';
import { countPending, initDb } from '../services/sqlite';

export interface ScannerScreenProps {
  staffId: string;
  onOpenPending: () => void;
  onLogout: () => void;
}

type ScanStatus = 'idle' | 'success-online' | 'success-offline' | 'error';

export default function ScannerScreen({ staffId, onOpenPending, onLogout }: ScannerScreenProps) {
  const [permission, requestPermission] = useCameraPermissions();
  const [status, setStatus] = useState<ScanStatus>('idle');
  const [statusMessage, setStatusMessage] = useState('Ready to scan');
  const [pendingCount, setPendingCount] = useState(0);
  const { canScan, triggerCooldown } = useScanCooldown(2000);
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const overlayColor = useMemo(() => {
    switch (status) {
      case 'success-online':
        return 'rgba(46, 204, 113, 0.25)';
      case 'success-offline':
        return 'rgba(241, 196, 15, 0.25)';
      case 'error':
        return 'rgba(231, 76, 60, 0.25)';
      default:
        return 'rgba(0, 0, 0, 0.15)';
    }
  }, [status]);

  const setTemporaryStatus = useCallback((nextStatus: ScanStatus, message: string) => {
    setStatus(nextStatus);
    setStatusMessage(message);
    if (resetTimer.current) {
      clearTimeout(resetTimer.current);
    }
    resetTimer.current = setTimeout(() => {
      setStatus('idle');
      setStatusMessage('Ready to scan');
    }, 1600);
  }, []);

  const refreshPendingCount = useCallback(async () => {
    try {
      await initDb();
      const count = await countPending();
      setPendingCount(count);
    } catch (error) {
      setPendingCount(0);
    }
  }, []);

  useEffect(() => {
    void refreshPendingCount();
    const interval = setInterval(() => {
      void refreshPendingCount();
    }, 3000);
    return () => clearInterval(interval);
  }, [refreshPendingCount]);

  useEffect(() => {
    return () => {
      if (resetTimer.current) {
        clearTimeout(resetTimer.current);
      }
    };
  }, []);

  const onBarcodeScanned = useCallback(
    async ({ data }: { data: string }) => {
      if (!canScan) {
        return;
      }
      triggerCooldown();

      const result = await handleCheckIn(data, staffId);
      if (result.ok) {
        if (result.mode === 'online') {
          setTemporaryStatus('success-online', 'Checked in (online)');
        } else {
          setTemporaryStatus('success-offline', 'Saved locally');
        }
        void refreshPendingCount();
        return;
      }

      Vibration.vibrate(200);
      setTemporaryStatus('error', result.message);
    },
    [canScan, refreshPendingCount, setTemporaryStatus, staffId, triggerCooldown]
  );

  if (!permission) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#e60023" />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.centered}>
        <Text style={styles.title}>Camera access needed</Text>
        <TouchableOpacity style={styles.primaryButton} onPress={requestPermission}>
          <Text style={styles.primaryButtonText}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        style={styles.camera}
        onBarcodeScanned={onBarcodeScanned}
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
      />
      <View style={[styles.overlay, { backgroundColor: overlayColor }]} pointerEvents="none" />

      <View style={styles.topBar}>
        <TouchableOpacity onPress={onLogout}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Staff Check-in</Text>
        <TouchableOpacity style={styles.badge} onPress={onOpenPending}>
          <Text style={styles.badgeText}>{pendingCount}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.statusPanel}>
        <Text style={styles.statusText}>{statusMessage}</Text>
        <Text style={styles.subtleText}>{canScan ? 'Scanner ready' : 'Cooldown...'}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  camera: {
    flex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
  },
  topBar: {
    position: 'absolute',
    top: 40,
    left: 20,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(246, 246, 243, 0.88)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
  },
  badge: {
    backgroundColor: 'hsla(60, 20%, 98%, 0.8)',
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 6,
    minWidth: 32,
    alignItems: 'center',
  },
  badgeText: {
    color: '#211922',
    fontWeight: '700',
    fontFamily: 'Pin Sans',
  },
  title: {
    color: '#211922',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.4,
    fontFamily: 'Pin Sans',
  },
  logoutText: {
    color: '#211922',
    fontSize: 12,
    fontWeight: '600',
    fontFamily: 'Pin Sans',
  },
  statusPanel: {
    position: 'absolute',
    bottom: 40,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(246, 246, 243, 0.92)',
    borderRadius: 20,
    padding: 16,
  },
  statusText: {
    color: '#211922',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Pin Sans',
  },
  subtleText: {
    marginTop: 4,
    color: '#62625b',
    fontSize: 12,
    fontFamily: 'Pin Sans',
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 12,
    backgroundColor: '#ffffff',
  },
  primaryButton: {
    backgroundColor: '#e60023',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 16,
  },
  primaryButtonText: {
    color: '#000000',
    fontWeight: '700',
    fontSize: 12,
    fontFamily: 'Pin Sans',
  },
});
