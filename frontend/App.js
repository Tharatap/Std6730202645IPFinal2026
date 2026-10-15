import { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import LoginScreen from './src/screens/LoginScreen';
import DashboardScreen from './src/screens/DashboardScreen';

export default function App() {
  const [token, setToken] = useState(null);

  return (
    <>
      <StatusBar style={token ? 'light' : 'dark'} />
      {token ? (
        <DashboardScreen token={token} onLogout={() => setToken(null)} />
      ) : (
        <LoginScreen onLogin={setToken} />
      )}
    </>
  );
}
