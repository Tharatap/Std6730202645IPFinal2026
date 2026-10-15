import { useState } from 'react';
import { Platform, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import LoginScreen from './src/screens/LoginScreen';
import MainScreen from './src/screens/MainScreen';
import DialogHost from './src/components/DialogHost';

const TOKEN_KEY = 'hr_token';

// Web only: keep the session across page refresh (F5). Storage may be unavailable → ignore.
const storage = {
  get() {
    if (Platform.OS !== 'web') return null;
    try {
      return window.localStorage.getItem(TOKEN_KEY);
    } catch (e) {
      return null;
    }
  },
  set(value) {
    if (Platform.OS !== 'web') return;
    try {
      if (value) window.localStorage.setItem(TOKEN_KEY, value);
      else window.localStorage.removeItem(TOKEN_KEY);
    } catch (e) {
      // ignore
    }
  },
};

export default function App() {
  const [token, setTokenState] = useState(() => storage.get());

  const setToken = (value) => {
    storage.set(value);
    setTokenState(value);
  };

  return (
    <View style={{ flex: 1 }}>
      <StatusBar style={token ? 'light' : 'dark'} />
      {token ? (
        <MainScreen token={token} onLogout={() => setToken(null)} />
      ) : (
        <LoginScreen onLogin={setToken} />
      )}
      <DialogHost />
    </View>
  );
}
