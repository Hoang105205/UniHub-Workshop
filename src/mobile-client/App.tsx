import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

import LoginScreen from './src/screens/LoginScreen';
import PendingListScreen from './src/screens/PendingListScreen';
import ScannerScreen from './src/screens/ScannerScreen';
import { AuthUser, clearAuthSession, getAuthToken, getAuthUser } from './src/services/auth';
import { startSyncListener } from './src/services/sync';

type ScreenKey = 'scanner' | 'pending';

export default function App() {
  const [screen, setScreen] = useState<ScreenKey>('scanner');
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [bootstrapping, setBootstrapping] = useState(true);

  const staffId = authUser?.id ?? 'staff-unknown';

  const handleLogout = useCallback(async () => {
    await clearAuthSession();
    setAuthUser(null);
    setScreen('scanner');
  }, []);

  useEffect(() => {
    const bootstrap = async () => {
      const token = await getAuthToken();
      if (token) {
        const user = await getAuthUser();
        if (user) {
          setAuthUser(user);
        }
      }
      setBootstrapping(false);
    };
    void bootstrap();
  }, []);

  useEffect(() => {
    if (!authUser) {
      return undefined;
    }
    const unsubscribe = startSyncListener();
    return () => unsubscribe();
  }, [authUser]);

  if (bootstrapping) {
    return (
      <View style={{ flex: 1, backgroundColor: '#ffffff', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color="#e60023" />
      </View>
    );
  }

  if (!authUser) {
    return (
      <>
        <LoginScreen onLogin={setAuthUser} />
        <StatusBar style="light" />
      </>
    );
  }

  return (
    <>
      {screen === 'scanner' ? (
        <ScannerScreen
          staffId={staffId}
          onOpenPending={() => setScreen('pending')}
          onLogout={handleLogout}
        />
      ) : (
        <PendingListScreen onBack={() => setScreen('scanner')} />
      )}
      <StatusBar style="light" />
    </>
  );
}
