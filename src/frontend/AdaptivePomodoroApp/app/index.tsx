import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';

import { AtmosphericBackground } from '@/components/atmospheric-background';
import { GlassPanel } from '@/components/glass-panel';
import { GradientText } from '@/components/gradient-text';
import { DesignColors, DesignFonts, DesignRadius, DesignSpacing, DesignTypography } from '@/constants/design';
import { apiPost, ApiError } from '@/lib/api';
import { saveToken, saveUser, StoredUser } from '@/lib/auth-storage';

type Mode = 'login' | 'register';

function passwordEmoji(password: string) {
  if (password.length === 0) return '😶';
  if (password.length < 6) return '🤨';
  if (password.length < 10) return '😎';
  return '🔥';
}

function UnderlineInput({
  label,
  rightElement,
  style,
  ...rest
}: TextInputProps & { label: string; rightElement?: React.ReactNode }) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={styles.inputGroup}>
      <View style={styles.inputLabelRow}>
        <Text style={styles.inputLabel}>{label}</Text>
        {rightElement}
      </View>
      <TextInput
        style={[
          styles.input,
          { borderBottomColor: focused ? DesignColors.secondary : 'rgba(255,255,255,0.1)' },
          style,
        ]}
        placeholderTextColor="rgba(199,196,216,0.25)"
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        {...rest}
      />
    </View>
  );
}

export default function LoginScreen() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>('login');
  const [usuario, setUsuario] = useState('');
  const [nombreUsuario, setNombreUsuario] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const shakeX = useSharedValue(0);
  const shakeStyle = useAnimatedStyle(() => ({ transform: [{ translateX: shakeX.value }] }));

  const triggerShake = () => {
    shakeX.value = withSequence(
      withTiming(-6, { duration: 60 }),
      withTiming(6, { duration: 60 }),
      withTiming(-6, { duration: 60 }),
      withTiming(6, { duration: 60 }),
      withTiming(0, { duration: 60 })
    );
  };

  const clearInputs = () => {
    triggerShake();
    setErrorMessage(null);
    setTimeout(() => {
      setUsuario('');
      setPassword('');
      setNombreUsuario('');
    }, 300);
  };

  const handleSubmit = async () => {
    setErrorMessage(null);

    if (!usuario.trim() || !password) {
      triggerShake();
      setErrorMessage('Completa usuario y contraseña');
      return;
    }
    if (mode === 'register' && !nombreUsuario.trim()) {
      triggerShake();
      setErrorMessage('Cuéntanos cómo te llamas');
      return;
    }

    setLoading(true);
    try {
      const path = mode === 'login' ? '/auth/login' : '/auth/register';
      const body = mode === 'login' ? { usuario, password } : { usuario, nombreUsuario, password };
      const data = await apiPost<{ token: string; user: StoredUser }>(path, body);
      await saveToken(data.token);
      await saveUser(data.user);
      router.replace('/home');
    } catch (err) {
      triggerShake();
      setErrorMessage(err instanceof ApiError ? err.message : 'Algo salió mal');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.root}>
      <AtmosphericBackground />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.hero}>
            <MaterialIcons name="bubble-chart" size={48} color={DesignColors.secondary} style={styles.heroIcon} />
            <Text style={styles.headline}>
              ¡Hola!{'\n'}
              <GradientText style={styles.headline}>PomodoroIA</GradientText> te espera.
            </Text>
          </View>

          <Animated.View style={shakeStyle}>
            <GlassPanel style={styles.panel}>
              <UnderlineInput
                label="Usuario"
                placeholder="INGRESA TU ALIAS"
                value={usuario}
                onChangeText={setUsuario}
                autoCapitalize="none"
                autoCorrect={false}
              />

              {mode === 'register' && (
                <UnderlineInput
                  label="Nombre"
                  placeholder="¿CÓMO TE LLAMAS?"
                  value={nombreUsuario}
                  onChangeText={setNombreUsuario}
                  autoCapitalize="words"
                />
              )}

              <UnderlineInput
                label="Contraseña"
                placeholder="••••••••"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoCapitalize="none"
                rightElement={<Text style={styles.emoji}>{passwordEmoji(password)}</Text>}
              />

              <Pressable style={styles.clearButton} onPress={clearInputs} hitSlop={8}>
                <MaterialIcons name="refresh" size={14} color={DesignColors.onSurfaceVariant} style={{ opacity: 0.4 }} />
                <Text style={styles.clearButtonText}>Agitar para borrar</Text>
              </Pressable>
            </GlassPanel>
          </Animated.View>

          {errorMessage && <Text style={styles.errorText}>{errorMessage}</Text>}
        </ScrollView>

        <View style={styles.footer}>
          <View style={styles.modeSwitch}>
            <Pressable onPress={() => setMode('login')} hitSlop={8}>
              <Text style={[styles.modeTab, mode === 'login' && styles.modeTabActive]}>Login</Text>
            </Pressable>
            <Pressable onPress={() => setMode('register')} hitSlop={8}>
              <Text style={[styles.modeTab, mode === 'register' && styles.modeTabActive]}>Registro</Text>
            </Pressable>
          </View>

          <Pressable onPress={handleSubmit} disabled={loading}>
            <LinearGradient
              colors={[DesignColors.primary, DesignColors.secondary]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.ctaButton}
            >
              {loading ? (
                <ActivityIndicator color={DesignColors.onPrimary} />
              ) : (
                <Text style={styles.ctaButtonText}>
                  {mode === 'login' ? 'Comenzar Partida' : 'Crear Avatar'}
                </Text>
              )}
            </LinearGradient>
          </Pressable>

          <Text style={styles.terms}>
            Al continuar, aceptas nuestros términos de{'\n'}servicio y política de bio-privacidad.
          </Text>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: DesignColors.surface,
  },
  flex: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: DesignSpacing.containerPadding,
    paddingTop: 48,
    gap: DesignSpacing.cardGap,
  },
  hero: {
    alignItems: 'center',
    marginBottom: DesignSpacing.cardGap,
  },
  heroIcon: {
    marginBottom: DesignSpacing.gutter,
    opacity: 0.8,
  },
  headline: {
    ...DesignTypography.headlineLgMobile,
    color: DesignColors.onSurface,
    fontWeight: '600',
    textAlign: 'center',
  },
  panel: {
    padding: DesignSpacing.containerPadding,
    gap: DesignSpacing.cardGap,
  },
  inputGroup: {
    gap: 8,
  },
  inputLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  inputLabel: {
    ...DesignTypography.labelCaps,
    fontSize: 10,
    color: 'rgba(199,196,216,0.6)',
    textTransform: 'uppercase',
  },
  input: {
    borderBottomWidth: 1,
    color: DesignColors.onSurface,
    fontFamily: DesignFonts.headline,
    fontSize: 20,
    paddingBottom: 8,
    paddingHorizontal: 0,
  },
  emoji: {
    fontSize: 22,
  },
  clearButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingTop: 4,
  },
  clearButtonText: {
    ...DesignTypography.labelCaps,
    fontSize: 10,
    color: 'rgba(199,196,216,0.4)',
    textTransform: 'uppercase',
  },
  errorText: {
    ...DesignTypography.labelCaps,
    color: DesignColors.error,
    textAlign: 'center',
    marginTop: DesignSpacing.base,
  },
  footer: {
    paddingHorizontal: DesignSpacing.containerPadding,
    paddingBottom: 32,
    paddingTop: DesignSpacing.gutter,
    gap: DesignSpacing.gutter,
  },
  modeSwitch: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 32,
  },
  modeTab: {
    ...DesignTypography.labelCaps,
    color: 'rgba(199,196,216,0.4)',
    fontWeight: '600',
    fontSize: 13,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  modeTabActive: {
    color: DesignColors.secondary,
    borderBottomWidth: 2,
    borderBottomColor: DesignColors.secondary,
  },
  ctaButton: {
    borderRadius: DesignRadius.full,
    paddingVertical: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaButtonText: {
    color: DesignColors.onPrimary,
    fontFamily: DesignFonts.label,
    fontSize: 15,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
  terms: {
    ...DesignTypography.labelCaps,
    fontSize: 9,
    color: DesignColors.onSurface,
    opacity: 0.3,
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 1,
    lineHeight: 14,
  },
});
