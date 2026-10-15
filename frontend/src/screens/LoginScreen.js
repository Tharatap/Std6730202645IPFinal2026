import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { apiRequest } from '../api';
import { describeError, showAlert } from '../alert';
import Button from '../components/Button';
import Input, { ErrorLine } from '../components/Input';
import { colors, fonts, spacing, type, WIDE } from '../theme';

export default function LoginScreen({ onLogin }) {
  const { width } = useWindowDimensions();
  const wide = width >= WIDE;

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState('');

  const handleLogin = async () => {
    if (loading) return;
    const errs = {};
    if (!username.trim()) errs.username = 'Enter your username.';
    if (!password) errs.password = 'Enter your password.';
    setFieldErrors(errs);
    if (Object.keys(errs).length) {
      setFormError('Please fill in both username and password.');
      showAlert('Missing information', 'Please enter both username and password.', { type: 'warning' });
      return;
    }
    setFormError('');
    setLoading(true);
    try {
      const data = await apiRequest('/login', { method: 'POST', body: { username: username.trim(), password } });
      if (!data?.token) throw new Error('Invalid response from server');
      onLogin(data.token);
    } catch (e) {
      if (e.status === 401) {
        setFormError('Invalid username or password.');
        showAlert('Login failed', 'Invalid username or password.');
      } else {
        const d = describeError(e, 'Sign in failed');
        setFormError(`${d.title}. ${d.message}`);
        showAlert(d.title, d.message);
      }
      setLoading(false);
    }
  };

  const change = (setter, key) => (v) => {
    setter(v);
    if (fieldErrors[key]) setFieldErrors((f) => ({ ...f, [key]: undefined }));
    if (formError) setFormError('');
  };

  const invalid = !!formError && formError.startsWith('Invalid');

  return (
    <View style={styles.root}>
      {wide ? (
        <View style={styles.brandPanel}>
          <Text style={[type.label, { color: colors.brassLight, letterSpacing: 2.5 }]}>People & Compensation</Text>
          <View>
            <Text style={[type.wordmark, styles.wordmark]}>HR{'\n'}Manager</Text>
            <View style={styles.brassRule} />
            <Text style={styles.tagline}>Every salary, read clearly — and every tier, accounted for.</Text>
          </View>
          <View style={styles.brandFooter}>
            <Text style={[type.small, { color: colors.onInkMuted }]}>Salary Analytics</Text>
            <Text style={[type.small, { color: colors.onInkMuted }]}>Version 1.0</Text>
          </View>
        </View>
      ) : null}

      <KeyboardAvoidingView style={styles.formPanel} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.formScroll} keyboardShouldPersistTaps="handled">
          <View style={styles.form}>
            {!wide ? <Text style={[type.titleMobile, { marginBottom: spacing.s9 }]}>HR Manager</Text> : null}
            <Text style={type.label}>Sign in</Text>
            <Text style={[wide ? type.title : type.titleMobile, { marginTop: spacing.s2 }]}>Welcome back</Text>
            <Text style={[type.body, { color: colors.muted, marginTop: spacing.s2, marginBottom: spacing.s8 }]}>
              Use your HR administrator account.
            </Text>

            <Input
              label="Username"
              value={username}
              onChangeText={change(setUsername, 'username')}
              placeholder="admin"
              autoCapitalize="none"
              autoCorrect={false}
              editable={!loading}
              error={fieldErrors.username}
              invalid={invalid}
            />
            <Input
              label="Password"
              value={password}
              onChangeText={change(setPassword, 'password')}
              placeholder="••••••••"
              secureTextEntry
              autoCapitalize="none"
              editable={!loading}
              onSubmitEditing={handleLogin}
              error={fieldErrors.password}
              invalid={invalid}
            />

            {formError ? (
              <View style={styles.formError}>
                <ErrorLine message={formError} style={{ marginTop: 0 }} />
              </View>
            ) : null}

            <Button title="Log in" onPress={handleLogin} loading={loading} style={{ marginTop: spacing.s2 }} />
            <Text style={[type.small, { marginTop: spacing.s5 }]}>
              Forgot your password? Contact your system administrator.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, flexDirection: 'row', backgroundColor: colors.paper },
  brandPanel: {
    flex: 53,
    backgroundColor: colors.ink,
    paddingHorizontal: spacing.s11,
    paddingTop: spacing.s11,
    paddingBottom: spacing.s9,
    justifyContent: 'space-between',
  },
  wordmark: { color: colors.paper },
  brassRule: { width: 56, height: 1, backgroundColor: colors.brass, marginTop: spacing.s8, marginBottom: spacing.s8 },
  tagline: { fontFamily: fonts.displayItalic, fontSize: 26, lineHeight: 36, color: colors.onInkMuted, maxWidth: 440 },
  brandFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: 'rgba(201,207,214,0.2)',
    paddingTop: spacing.s5,
  },
  formPanel: { flex: 47 },
  formScroll: { flexGrow: 1, justifyContent: 'center', padding: spacing.s6 },
  form: { width: '100%', maxWidth: 440, alignSelf: 'center' },
  formError: {
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.hairline,
    paddingVertical: spacing.s3,
    marginBottom: spacing.s6,
  },
});
