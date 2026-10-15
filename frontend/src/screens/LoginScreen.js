import { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, Text, View } from 'react-native';
import { apiRequest } from '../api';
import { showAlert } from '../alert';
import Button from '../components/Button';
import Input from '../components/Input';
import { colors, radius, shadow, spacing, type } from '../theme';

export default function LoginScreen({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (loading) return;
    if (!username.trim() || !password) {
      showAlert('Validation Error', 'Please enter both username and password.');
      return;
    }
    setLoading(true);
    try {
      const data = await apiRequest('/login', {
        method: 'POST',
        body: { username: username.trim(), password },
      });
      if (!data?.token) throw new Error('Invalid response from server');
      onLogin(data.token);
    } catch (e) {
      showAlert('Login Failed', e.message);
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.card}>
        <View style={styles.brand}>
          <Text style={styles.brandText}>HR</Text>
          <View style={styles.brandAccent} />
        </View>
        <Text style={[type.title, styles.center]}>HR Manager</Text>
        <Text style={styles.subtitle}>Salary Analytics System</Text>

        <Input
          label="Username"
          value={username}
          onChangeText={setUsername}
          placeholder="Enter your username"
          autoCapitalize="none"
          autoCorrect={false}
          editable={!loading}
        />
        <Input
          label="Password"
          value={password}
          onChangeText={setPassword}
          placeholder="Enter your password"
          secureTextEntry
          autoCapitalize="none"
          editable={!loading}
          onSubmitEditing={handleLogin}
        />
        <Button title="Sign In" onPress={handleLogin} loading={loading} style={styles.button} />
      </View>
      <Text style={styles.footer}>© 2026 HR Manager · Internal use only</Text>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  card: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.xxl,
    ...shadow,
  },
  brand: {
    width: 56,
    height: 56,
    borderRadius: radius.card,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: spacing.lg,
    overflow: 'hidden',
  },
  brandText: { color: colors.textInverse, fontSize: 20, fontWeight: '700', letterSpacing: 1 },
  brandAccent: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 4, backgroundColor: colors.accent },
  center: { textAlign: 'center' },
  subtitle: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.xs,
    marginBottom: spacing.xl,
  },
  button: { marginTop: spacing.sm },
  footer: { fontSize: 12, color: colors.textMuted, marginTop: spacing.xl },
});
