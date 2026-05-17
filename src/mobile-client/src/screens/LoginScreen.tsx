import axios from 'axios';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { createApiClient } from '../services/api';
import { AuthUser, saveAuthSession } from '../services/auth';

export interface LoginScreenProps {
  onLogin: (user: AuthUser) => void;
}

interface LoginResponse {
  accessToken: string;
  user: AuthUser;
}

export default function LoginScreen({ onLogin }: LoginScreenProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleLogin = useCallback(async () => {
    if (!email || !password) {
      setErrorMessage('Email and password are required.');
      return;
    }

    setLoading(true);
    setErrorMessage('');

    try {
      const client = createApiClient();
      const response = await client.post<LoginResponse>('/auth/login', {
        email,
        password,
      });
      const { accessToken, user } = response.data;
      await saveAuthSession(accessToken, user);
      onLogin(user);
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error('Login failed (Axios):', {
          message: error.message,
          status: error.response?.status,
          statusText: error.response?.statusText,
          response: error.response?.data,
          url: error.config?.url,
          baseURL: error.config?.baseURL,
        });
      } else {
        console.error('Login failed (Unknown):', error);
      }
      setErrorMessage('Login failed. Check your credentials.');
    } finally {
      setLoading(false);
    }
  }, [email, onLogin, password]);

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Staff Check-in</Text>
        <Text style={styles.subtitle}>Sign in to continue</Text>

        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor="#9aa0a6"
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />
        <TextInput
          style={styles.input}
          placeholder="Password"
          placeholderTextColor="#9aa0a6"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />

        {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

        <TouchableOpacity style={styles.primaryButton} onPress={handleLogin}>
          {loading ? (
            <ActivityIndicator color="#0b0f14" />
          ) : (
            <Text style={styles.primaryButtonText}>Login</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#f6f6f3',
    padding: 24,
    borderRadius: 20,
  },
  title: {
    color: '#211922',
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
    fontFamily: 'Pin Sans',
  },
  subtitle: {
    color: '#62625b',
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 20,
    fontFamily: 'Pin Sans',
  },
  input: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 11,
    color: '#211922',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#91918c',
    fontFamily: 'Pin Sans',
  },
  primaryButton: {
    backgroundColor: '#e60023',
    paddingVertical: 10,
    borderRadius: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  primaryButtonText: {
    color: '#000000',
    fontWeight: '700',
    fontSize: 12,
    letterSpacing: 0.2,
    fontFamily: 'Pin Sans',
  },
  errorText: {
    color: '#9e0a0a',
    marginBottom: 8,
    fontFamily: 'Pin Sans',
  },
});
