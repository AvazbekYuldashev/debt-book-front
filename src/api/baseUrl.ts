import { Platform } from 'react-native';

const apiUrlFromEnv = (globalThis as { process?: { env?: Record<string, string | undefined> } })
  .process?.env?.EXPO_PUBLIC_API_URL;

const defaultApiUrl = Platform.OS === 'web' ? 'http://138.249.7.224' : 'http://138.249.7.224';

const API_URL = apiUrlFromEnv || defaultApiUrl;

export const API_BASE = `${API_URL}/api/v1`;
