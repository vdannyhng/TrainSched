import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { supabase } from '@/lib/supabase';

/**
 * unsupported: Web/Simulator · unconfigured: noch kein EAS-Projekt (projectId fehlt)
 * undetermined: noch nicht gefragt · denied: im System abgelehnt · enabled: Token registriert
 */
export type PushStatus = 'unsupported' | 'unconfigured' | 'undetermined' | 'denied' | 'enabled';

const isNative = Platform.OS === 'ios' || Platform.OS === 'android';
let currentToken: string | null = null;

/** Einmal beim App-Start: Darstellung im Vordergrund + Android-Kanal. */
export function configureNotifications() {
  if (!isNative) return;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

function easProjectId(): string | undefined {
  const extra = Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined;
  return extra?.eas?.projectId ?? Constants.easConfig?.projectId;
}

async function ensureAndroidChannel() {
  if (Platform.OS !== 'android') return;
  // Ab Android 13 erscheint die Berechtigungsabfrage erst, wenn ein Kanal existiert.
  await Notifications.setNotificationChannelAsync('default', {
    name: 'TrainSched',
    importance: Notifications.AndroidImportance.HIGH,
  });
}

function isGranted(p: Notifications.NotificationPermissionsStatus): boolean {
  if (Platform.OS === 'ios') {
    const s = p.ios?.status;
    return (
      s === Notifications.IosAuthorizationStatus.AUTHORIZED ||
      s === Notifications.IosAuthorizationStatus.PROVISIONAL ||
      s === Notifications.IosAuthorizationStatus.EPHEMERAL
    );
  }
  return p.granted;
}

export async function getPushStatus(): Promise<PushStatus> {
  if (!isNative || !Device.isDevice) return 'unsupported';
  if (!easProjectId()) return 'unconfigured';
  const p = await Notifications.getPermissionsAsync();
  if (isGranted(p)) return currentToken ? 'enabled' : 'undetermined';
  return p.canAskAgain ? 'undetermined' : 'denied';
}

/**
 * Fragt (falls `prompt`) nach der Berechtigung, holt das Expo-Push-Token und meldet es dem Server.
 * Wirft nie – Push ist ein Komfort-Feature und darf den Login nicht blockieren.
 */
export async function registerForPush({ prompt }: { prompt: boolean }): Promise<PushStatus> {
  try {
    const projectId = easProjectId();
    if (!isNative || !Device.isDevice) return 'unsupported';
    if (!projectId) return 'unconfigured';
    await ensureAndroidChannel();

    let permissions = await Notifications.getPermissionsAsync();
    if (!isGranted(permissions) && prompt && permissions.canAskAgain) {
      permissions = await Notifications.requestPermissionsAsync();
    }
    if (!isGranted(permissions)) return permissions.canAskAgain ? 'undetermined' : 'denied';

    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
    const { error } = await supabase.rpc('register_push_token', {
      p_token: token,
      p_platform: Platform.OS,
    });
    if (error) throw error;
    currentToken = token;
    return 'enabled';
  } catch (e) {
    console.warn('push registration failed', e);
    return 'undetermined';
  }
}

/** Vor dem Abmelden: Gerät vom Konto lösen, damit keine fremden Pushes mehr ankommen. */
export async function unregisterPush() {
  if (!currentToken) return;
  const token = currentToken;
  currentToken = null;
  await supabase.rpc('unregister_push_token', { p_token: token }).then(
    () => undefined,
    () => undefined,
  );
}
