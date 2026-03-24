import * as AppleAuthentication from 'expo-apple-authentication';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';

import { AuthTabSwitcher } from '@/components/auth/AuthTabSwitcher';
import { FormField } from '@/components/common/FormField';
import { OAuthButton } from '@/components/auth/OAuthButton';
import { PrimaryButton } from '@/components/common/PrimaryButton';
import { APP_CONFIG } from '@/constants/config';
import { COLORS, FONT_SIZE, FONT_WEIGHT, SPACING } from '@/theme';
import { supabase } from '@/lib/supabase';

// Required at module level for expo-web-browser OAuth redirect completion
WebBrowser.maybeCompleteAuthSession();

type Tab = 'login' | 'signup';

function validateEmail(email: string): string | undefined {
  if (!email.includes('@') || !email.includes('.')) {
    return 'Please enter a valid email address.';
  }
  return undefined;
}

function validatePassword(password: string): string | undefined {
  if (password.length < APP_CONFIG.passwordMinLength) {
    return 'Password must be at least 8 characters with one letter and one number.';
  }
  if (!/[a-zA-Z]/.test(password)) {
    return 'Password must be at least 8 characters with one letter and one number.';
  }
  if (!/[0-9]/.test(password)) {
    return 'Password must be at least 8 characters with one letter and one number.';
  }
  return undefined;
}

function mapAuthError(message: string): string {
  if (message.includes('Invalid login credentials')) {
    return 'Incorrect email or password. Try again.';
  }
  if (message.includes('User already registered') || message.includes('already registered')) {
    return 'An account with this email already exists. Sign in instead.';
  }
  return 'Something went wrong. Check your connection and try again.';
}

export default function AuthScreen() {
  const [activeTab, setActiveTab] = useState<Tab>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [emailError, setEmailError] = useState<string | undefined>();
  const [passwordError, setPasswordError] = useState<string | undefined>();
  const [confirmPasswordError, setConfirmPasswordError] = useState<string | undefined>();
  const [generalError, setGeneralError] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [appleLoading, setAppleLoading] = useState(false);

  function clearErrors() {
    setEmailError(undefined);
    setPasswordError(undefined);
    setConfirmPasswordError(undefined);
    setGeneralError(undefined);
  }

  function handleTabChange(tab: Tab) {
    setActiveTab(tab);
    clearErrors();
  }

  async function handleEmailAuth() {
    clearErrors();

    const emailErr = validateEmail(email);
    const passwordErr = validatePassword(password);
    let confirmErr: string | undefined;

    if (activeTab === 'signup' && password !== confirmPassword) {
      confirmErr = 'Passwords do not match.';
    }

    if (emailErr) setEmailError(emailErr);
    if (passwordErr) setPasswordError(passwordErr);
    if (confirmErr) setConfirmPasswordError(confirmErr);
    if (emailErr || passwordErr || confirmErr) return;

    setLoading(true);
    try {
      if (activeTab === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
          setGeneralError(mapAuthError(error.message));
        }
      } else {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) {
          setGeneralError(mapAuthError(error.message));
        }
        // onAuthStateChange in root layout handles needsProfileSetup → routes to profile-setup
      }
    } catch {
      setGeneralError('Something went wrong. Check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }

  async function signInWithGoogle() {
    setGoogleLoading(true);
    try {
      const redirectUri = AuthSession.makeRedirectUri({
        scheme: APP_CONFIG.scheme,
        path: 'auth/callback',
      });
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: redirectUri, skipBrowserRedirect: true },
      });
      if (error || !data.url) {
        setGeneralError('Something went wrong. Check your connection and try again.');
        return;
      }
      const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUri);
      if (result.type === 'success' && result.url) {
        // Supabase returns tokens as URL fragments (#access_token=...)
        // Custom schemes can break new URL(), so parse the fragment directly
        const hashIndex = result.url.indexOf('#');
        const fragment = hashIndex >= 0 ? result.url.substring(hashIndex + 1) : '';
        const params = new URLSearchParams(fragment);
        const accessToken = params.get('access_token');
        const refreshToken = params.get('refresh_token');
        if (accessToken && refreshToken) {
          await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
        }
      }
    } catch {
      setGeneralError('Something went wrong. Check your connection and try again.');
    } finally {
      setGoogleLoading(false);
    }
  }

  async function signInWithApple() {
    setAppleLoading(true);
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });
      if (!credential.identityToken) {
        throw new Error('No identity token');
      }
      const { error } = await supabase.auth.signInWithIdToken({
        provider: 'apple',
        token: credential.identityToken,
      });
      if (error) throw error;

      // Capture full name — only provided on first sign-in
      if (credential.fullName?.givenName || credential.fullName?.familyName) {
        const fullName = [credential.fullName.givenName, credential.fullName.familyName]
          .filter(Boolean)
          .join(' ');
        await supabase.auth.updateUser({ data: { full_name: fullName } });
      }
    } catch (err: unknown) {
      // User cancelled the Apple Sign-In — not an error
      if (
        err &&
        typeof err === 'object' &&
        'code' in err &&
        (err as { code: string }).code === 'ERR_REQUEST_CANCELED'
      ) {
        return;
      }
      setGeneralError('Something went wrong. Check your connection and try again.');
    } finally {
      setAppleLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.keyboardView}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerEmoji}>🔥</Text>
          <Text style={styles.headerTitle}>Campfire</Text>
          <Text style={styles.headerTagline}>Your friends, one app.</Text>
        </View>

        {/* Tab Switcher */}
        <AuthTabSwitcher activeTab={activeTab} onTabChange={handleTabChange} />

        {/* Email Form */}
        <View style={styles.form}>
          <FormField
            label="Email address"
            value={email}
            onChangeText={setEmail}
            error={emailError}
            placeholder="you@example.com"
            autoCapitalize="none"
            keyboardType="email-address"
          />
          <View style={styles.fieldGap} />
          <FormField
            label="Password"
            value={password}
            onChangeText={setPassword}
            error={passwordError}
            placeholder="••••••••"
            secureTextEntry
            helperText={
              activeTab === 'signup'
                ? 'Min 8 characters, at least one letter and one number'
                : undefined
            }
          />
          {activeTab === 'signup' && (
            <>
              <View style={styles.fieldGap} />
              <FormField
                label="Confirm password"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                error={confirmPasswordError}
                placeholder="••••••••"
                secureTextEntry
              />
            </>
          )}

          {!!generalError && <Text style={styles.generalError}>{generalError}</Text>}

          <View style={styles.buttonTop}>
            <PrimaryButton
              title={activeTab === 'login' ? 'Sign In' : 'Create Account'}
              onPress={handleEmailAuth}
              loading={loading}
              disabled={loading}
            />
          </View>
        </View>

        {/* OAuth Divider */}
        <View style={styles.dividerRow}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>or continue with</Text>
          <View style={styles.dividerLine} />
        </View>

        {/* OAuth Buttons */}
        <View style={styles.oauthButtons}>
          <OAuthButton provider="google" onPress={signInWithGoogle} loading={googleLoading} />
          {Platform.OS === 'ios' && (
            <>
              <View style={styles.oauthGap} />
              <OAuthButton provider="apple" onPress={signInWithApple} loading={appleLoading} />
            </>
          )}
        </View>

        {/* Bottom Link */}
        <View style={styles.bottomLink}>
          {activeTab === 'login' ? (
            <Text style={styles.bottomLinkText}>
              {"Don't have an account? "}
              <Text style={styles.bottomLinkAction} onPress={() => handleTabChange('signup')}>
                Create one
              </Text>
            </Text>
          ) : (
            <Text style={styles.bottomLinkText}>
              {'Already have an account? '}
              <Text style={styles.bottomLinkAction} onPress={() => handleTabChange('login')}>
                Sign in
              </Text>
            </Text>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  keyboardView: {
    flex: 1,
    backgroundColor: COLORS.surface.base,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.xxl,
  },
  header: {
    // eslint-disable-next-line campfire/no-hardcoded-styles
    paddingTop: 64, // no exact token
    paddingBottom: SPACING.xxl,
    alignItems: 'center',
  },
  headerEmoji: {
    // eslint-disable-next-line campfire/no-hardcoded-styles
    fontSize: 32, // no exact token
  },
  headerTitle: {
    fontSize: FONT_SIZE.xl,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.text.primary,
    marginTop: SPACING.xs,
  },
  headerTagline: {
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.regular,
    color: COLORS.text.secondary,
    marginTop: SPACING.sm,
  },
  form: {
    marginTop: SPACING.xl,
  },
  fieldGap: {
    height: SPACING.lg,
  },
  buttonTop: {
    marginTop: SPACING.xl,
  },
  generalError: {
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.regular,
    color: COLORS.interactive.destructive,
    marginTop: SPACING.sm,
    textAlign: 'center',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: SPACING.xl,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.border,
  },
  dividerText: {
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.regular,
    color: COLORS.text.secondary,
    marginHorizontal: SPACING.md,
  },
  oauthButtons: {
    gap: SPACING.sm,
  },
  oauthGap: {
    height: SPACING.sm,
  },
  bottomLink: {
    marginTop: SPACING.lg,
    alignItems: 'center',
  },
  bottomLinkText: {
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.regular,
    color: COLORS.text.secondary,
    textAlign: 'center',
  },
  bottomLinkAction: {
    color: COLORS.interactive.accent,
  },
});
