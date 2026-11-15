import { Stack, SplashScreen, useRouter, useSegments } from 'expo-router';
import { PaperProvider } from 'react-native-paper';
import { AppTheme } from '../theme';
import * as Kadwa from '@expo-google-fonts/kadwa';
import * as Inter from '@expo-google-fonts/inter';
import { useEffect, useState } from 'react';
import { pt, registerTranslation } from "react-native-paper-dates";
import { ProfileProvider } from '@/context/ProfileContext';
import { NotificationProvider } from '@/context/NotificationContext';
import { ChatProvider } from '@/context/ChatContext';
import NotificationDisplay from '@/components/NotificationDisplay';
import GlobalSocketController from '@/components/GlobalSocketController';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { initializeSocket } from '@/services/socketService';
import { Platform, View, useWindowDimensions } from 'react-native';

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 30,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

// Cache da role para evitar chamada à API em cada navegação
const getCachedRole = async (): Promise<string> => {
  // Tenta ler role cacheada (salva no login)
  const cached = await AsyncStorage.getItem('userRole');
  if (cached) return cached;
  // Fallback: busca da API (só na primeira vez ou após limpar cache)
  try {
    const token = await AsyncStorage.getItem('accessToken');
    if (!token) return 'patient';
    const { API_BASE_URL } = await import('../constants/api');
    const res = await fetch(`${API_BASE_URL}/auth/me`, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) return 'patient';
    const profile = await res.json();
    const role = profile.role || 'patient';
    await AsyncStorage.setItem('userRole', role);
    return role;
  } catch { return 'patient'; }
};

function AuthGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const segments = useSegments();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    const check = async () => {
      try {
        const token = await AsyncStorage.getItem('accessToken');
        const inProtectedArea = segments[0] === 'screens';
        const inAdminArea = segments.includes('admin');
        const inTabsArea = segments.includes('(tabs)');
        const inSupportArea = segments.includes('support');

        if (!token && inProtectedArea) {
          await AsyncStorage.removeItem('userRole');
          router.replace('/');
          return;
        }
        if (!token) return;

        // Conecta o socket com o usuário atual (idempotente; após logout+login usa o token novo)
        initializeSocket().catch(() => {});

        const role = await getCachedRole();

        if (role === 'admin') {
          if (inTabsArea || inSupportArea) router.replace('/screens/admin');
        } else if (role === 'support') {
          // Suporte NUNCA acessa app de paciente nem painel admin
          if (inTabsArea || inAdminArea) router.replace('/screens/support');
        } else {
          // Paciente NUNCA acessa admin nem app de suporte
          if (inAdminArea || inSupportArea) router.replace('/screens/(tabs)/home');
        }
      } finally {
        setChecked(true);
      }
    };
    check();
  }, [segments]);

  if (!checked) return null;
  return <>{children}</>;
}

// Rotas usadas pela rede de apoio no navegador (apresentação em monitor 1920x1080).
const SUPPORT_WEB_ROUTES = ['', 'cadastroSupport', 'recuperarSenha', 'redefinirSenha', 'support'];
const DESKTOP_BREAKPOINT = 900;
const DESKTOP_MAX_WIDTH = 960;

// Em web com tela larga, centraliza as telas da rede de apoio numa coluna com largura máxima.
// A estrutura de Views é sempre a mesma (só o estilo muda) para não remontar o Stack ao navegar.
function DesktopFrame({ children }: { children: React.ReactNode }) {
  const segments = useSegments() as string[];
  const { width } = useWindowDimensions();
  const route = segments[0] === 'screens' ? segments[1] ?? '' : segments[0] ?? '';
  const framed = Platform.OS === 'web' && width >= DESKTOP_BREAKPOINT && SUPPORT_WEB_ROUTES.includes(route);

  return (
    <View style={[{ flex: 1 }, framed && { alignItems: 'center', backgroundColor: '#E9EEF0' }]}>
      <View
        style={[
          { flex: 1, width: '100%' },
          framed && {
            maxWidth: DESKTOP_MAX_WIDTH,
            backgroundColor: AppTheme.colors.background,
            shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 24, shadowOffset: { width: 0, height: 0 },
          },
        ]}
      >
        {children}
      </View>
    </View>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = Kadwa.useFonts({
    ...Kadwa,
    ...Inter,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  registerTranslation("pt", pt);

  return (
    // GestureHandlerRootView: obrigatório no react-native-gesture-handler v3 (SDK 58) para os gestos do carrossel
    <GestureHandlerRootView style={{ flex: 1 }}>
    <QueryClientProvider client={queryClient}>
      <PaperProvider theme={AppTheme}>
        <NotificationProvider>
          <ChatProvider>
            <ProfileProvider>
              <AuthGate>
                <NotificationDisplay />
              <GlobalSocketController />
              <DesktopFrame>
              <Stack screenOptions={{ headerShown: false }}>
                <Stack.Screen name="index" />
                <Stack.Screen name="cadastro" />
                <Stack.Screen name="cadastroSupport" />
                <Stack.Screen name="screens/community/chatCommunity" />
                <Stack.Screen name="screens/community/groupCommunity" />
                <Stack.Screen name="screens/community/postDetail" />
                <Stack.Screen name="screens/admin/index" />
                <Stack.Screen name="screens/support/index" />
                <Stack.Screen name="screens/support/diary" />
                <Stack.Screen name="screens/support/diaryEntry" />
                <Stack.Screen name="screens/support/agenda" />
                <Stack.Screen name="screens/support/marcos" />
                <Stack.Screen name="screens/profile/invite" />
                <Stack.Screen name="screens/profile/about" />
                <Stack.Screen name="screens/profile/help" />
                <Stack.Screen name="screens/profile/marcosView" />
                <Stack.Screen name="screens/profile/marcosAdd" />
                <Stack.Screen name="screens/profile/marcosEdit" />
                <Stack.Screen name="screens/diary/passagemAdd" />
                <Stack.Screen name="screens/diary/passagemRead" />
                <Stack.Screen name="screens/diary/sentimentosAdd" />
              </Stack>
              </DesktopFrame>
              </AuthGate>
            </ProfileProvider>
          </ChatProvider>
        </NotificationProvider>
      </PaperProvider>
    </QueryClientProvider>
    </GestureHandlerRootView>
  );
}

