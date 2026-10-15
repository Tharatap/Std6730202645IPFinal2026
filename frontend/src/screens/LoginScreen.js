import { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, Text, View } from 'react-native';
import { apiRequest } from '../api';
import { describeError } from '../alert';
import Button from '../components/Button';
import Input from '../components/Input';
import { colors, radius, shadow, spacing, type } from '../theme';

export default function LoginScreen({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [banner, setBanner] = useState(null); // { title, message }

  const handleLogin = async () => {
    if (loading) return;
    const errs = {};
    if (!username.trim()) errs.username = 'Please enter your username';
    if (!password) errs.password = 'Please enter your password';
    setFieldErrors(errs);
    if (Object.keys(errs).length) {
      setBanner({ title: 'Missing information', message: 'Please fill in both username and password.' });
      return;
    }
    setBanner(null);
    setLoading(true);
    try {
      const data = await apiRequest('/login', {
        method: 'POST',
        body: { username: username.trim(), password },
      });
      if (!data?.token) throw new Error('Invalid response from server');
      onLogin(data.token);
    } catch (e) {
      setBanner(
        e.status === 401
          ? { title: 'Incorrect username or password', message: 'Please check your credentials and try again.' }
          : describeError(e, 'Sign in failed')
      );
      setLoading(false);
    }
  };

  const change = (setter, key) => (v) => {
    setter(v);
    if (fieldErrors[key]) setFieldErrors((f) => ({ ...f, [key]: undefined }));
    if (banner) setBanner(null);
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

        {banner ? (
          <View style={styles.banner} accessibilityRole="alert">
            <View style={styles.bannerIcon}>
              <Text style={styles.bannerIconText}>!</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.bannerTitle}>{banner.title}</Text>
              {banner.message ? <Text style={styles.bannerMsg}>{banner.message}</Text> : null}
            </View>
          </View>
        ) : null}

        <Input
          label="Username"
          value={username}
          onChangeText={change(setUsername, 'username')}
          placeholder="Enter your username"
          autoCapitalize="none"
          autoCorrect={false}
          editable={!loading}
          error={fieldErrors.username}
        />
        <Input
          label="Password"
          value={password}
          onChangeText={change(setPassword, 'password')}
          placeholder="Enter your password"
          secureTextEntry
          autoCapitalize="none"
          editable={!loading}
          onSubmitEditing={handleLogin}
          error={fieldErrors.password}
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
  banner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.dangerBg,
    borderRadius: radius.control,
    borderLeftWidth: 4,
    borderLeftColor: colors.danger,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  bannerIcon: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
    marginTop: 1,
  },
  bannerIconText: { color: colors.textInverse, fontSize: 12, fontWeight: '800' },
  bannerTitle: { fontSize: 14, fontWeight: '600', color: colors.danger },
  bannerMsg: { fontSize: 13, color: colors.text, marginTop: 2 },
  button: { marginTop: spacing.sm },
  footer: { fontSize: 12, color: colors.textMuted, marginTop: spacing.xl },
});
