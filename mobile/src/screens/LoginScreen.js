import React, { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { COLORS, RADIUS } from '../components/theme';
import { loginUser, registerUser } from '../poi/api';

export default function LoginScreen({ onLogin }) {
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!email.trim() || !password || (isRegisterMode && !name.trim())) {
      setErrorMessage(isRegisterMode
        ? 'Nama, email, dan password wajib diisi.'
        : 'Email dan password wajib diisi.');
      return;
    }
    if (isRegisterMode && password !== confirmPassword) {
      setErrorMessage('Konfirmasi password tidak sama.');
      return;
    }

    setErrorMessage('');
    setIsSubmitting(true);
    try {
      const user = isRegisterMode
        ? await registerUser(name, email, password)
        : await loginUser(email, password);
      onLogin(user);
    } catch (error) {
      setErrorMessage(error.message || 'Login gagal. Coba lagi.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.root}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.brandBadge}>
          <Text style={styles.brandText}>BRAGAm</Text>
        </View>
        <Text style={styles.title}>
          {isRegisterMode ? 'Buat akun BRAGAm' : 'Selamat datang kembali'}
        </Text>
        <Text style={styles.subtitle}>
          {isRegisterMode
            ? 'Daftar untuk mulai mengeksplorasi Braga.'
            : 'Masuk untuk melanjutkan eksplorasi Braga.'}
        </Text>

        <View style={styles.form}>
          {isRegisterMode ? (
            <>
              <Text style={styles.label}>Nama</Text>
              <TextInput
                autoCapitalize="words"
                placeholder="Nama lengkap"
                placeholderTextColor={COLORS.textMuted}
                style={styles.input}
                value={name}
                onChangeText={setName}
              />
            </>
          ) : null}

          <Text style={styles.label}>Email</Text>
          <TextInput
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            placeholder="nama@email.com"
            placeholderTextColor={COLORS.textMuted}
            style={styles.input}
            value={email}
            onChangeText={setEmail}
          />

          <Text style={styles.label}>Password</Text>
          <TextInput
            autoCapitalize="none"
            autoComplete="password"
            placeholder="Masukkan password"
            placeholderTextColor={COLORS.textMuted}
            secureTextEntry
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            onSubmitEditing={handleSubmit}
          />

          {isRegisterMode ? (
            <>
              <Text style={styles.label}>Konfirmasi Password</Text>
              <TextInput
                autoCapitalize="none"
                autoComplete="password"
                placeholder="Ulangi password"
                placeholderTextColor={COLORS.textMuted}
                secureTextEntry
                style={styles.input}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                onSubmitEditing={handleSubmit}
              />
            </>
          ) : null}

          {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}

          <Pressable
            accessibilityRole="button"
            disabled={isSubmitting}
            onPress={handleSubmit}
            style={({ pressed }) => [
              styles.loginButton,
              pressed && styles.loginButtonPressed,
              isSubmitting && styles.loginButtonDisabled,
            ]}
          >
            {isSubmitting ? (
              <ActivityIndicator color={COLORS.white} />
            ) : (
              <Text style={styles.loginButtonText}>
                {isRegisterMode ? 'Daftar' : 'Masuk'}
              </Text>
            )}
          </Pressable>

          <Pressable
            disabled={isSubmitting}
            onPress={() => {
              setIsRegisterMode((current) => !current);
              setErrorMessage('');
            }}
            style={styles.switchButton}
          >
            <Text style={styles.switchText}>
              {isRegisterMode
                ? 'Sudah punya akun? Masuk'
                : 'Belum punya akun? Daftar'}
            </Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.softLilacBg,
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  brandBadge: {
    alignSelf: 'flex-start',
    backgroundColor: COLORS.darkPurple,
    borderRadius: RADIUS.md,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginBottom: 22,
  },
  brandText: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: '800',
  },
  title: {
    color: COLORS.textPrimary,
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 8,
  },
  subtitle: {
    color: COLORS.textSecondary,
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 30,
  },
  form: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    padding: 20,
  },
  label: {
    color: COLORS.textPrimary,
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 7,
  },
  input: {
    borderColor: COLORS.borderSubtle,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    color: COLORS.textPrimary,
    fontSize: 15,
    marginBottom: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  error: {
    color: '#B3261E',
    fontSize: 13,
    marginBottom: 14,
  },
  loginButton: {
    alignItems: 'center',
    backgroundColor: COLORS.primaryPurple,
    borderRadius: RADIUS.pill,
    justifyContent: 'center',
    minHeight: 48,
  },
  loginButtonPressed: {
    backgroundColor: COLORS.darkPurple,
  },
  loginButtonDisabled: {
    opacity: 0.7,
  },
  loginButtonText: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: '700',
  },
  switchButton: {
    alignItems: 'center',
    marginTop: 18,
  },
  switchText: {
    color: COLORS.primaryPurple,
    fontSize: 13,
    fontWeight: '600',
  },
});
