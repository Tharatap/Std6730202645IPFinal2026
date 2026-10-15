import { useState } from 'react';
import { Platform, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useFonts, Fraunces_300Light, Fraunces_300Light_Italic, Fraunces_400Regular } from '@expo-google-fonts/fraunces';
import { IBMPlexSans_400Regular, IBMPlexSans_500Medium, IBMPlexSans_600SemiBold } from '@expo-google-fonts/ibm-plex-sans';
import LoginScreen from './src/screens/LoginScreen';
import MainScreen from './src/screens/MainScreen';
import DialogHost from './src/components/DialogHost';
import { colors } from './src/theme';

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
  // If fonts fail to load, render anyway with system fallback
  const [fontsLoaded, fontError] = useFonts({
    Fraunces_300Light,
    Fraunces_300Light_Italic,
    Fraunces_400Regular,
    IBMPlexSans_400Regular,
    IBMPlexSans_500Medium,
    IBMPlexSans_600SemiBold,
  });

  const setToken = (value) => {
    storage.set(value);
    setTokenState(value);
  };

  if (!fontsLoaded && !fontError) return null;

  return (
    <View style={{ flex: 1, backgroundColor: colors.paper }}>
      <StatusBar style="dark" />
      {token ? (
        <MainScreen token={token} onLogout={() => setToken(null)} />
      ) : (
        <LoginScreen onLogin={setToken} />
      )}
      <DialogHost />
    </View>
  );
}
