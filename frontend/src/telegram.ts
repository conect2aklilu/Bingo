declare global {
  interface Window {
    Telegram?: {
      WebApp?: {
        initData?: string;
        initDataUnsafe?: {
          user?: {
            id?: number;
            first_name?: string;
            last_name?: string;
            username?: string;
            language_code?: string;
          };
        };
        ready?: () => void;
        expand?: () => void;
        colorScheme?: string;
        themeParams?: Record<string, unknown>;
        isExpanded?: boolean;
        platform?: string;
        version?: string;
        initDataRaw?: string;
        setHeaderColor?: (color: string, kind: string) => void;
        setBackgroundColor?: (color: string, kind: string) => void;
      };
    };
  }
}

export interface TelegramUserInfo {
  id?: number;
  firstName?: string;
  lastName?: string;
  username?: string;
  languageCode?: string;
  initData?: string;
}

export function isTelegramMiniApp() {
  return Boolean(typeof window !== 'undefined' && window.Telegram?.WebApp);
}

export function getTelegramUserInfo(): TelegramUserInfo | null {
  if (typeof window === 'undefined' || !window.Telegram?.WebApp) return null;

  const user = window.Telegram.WebApp.initDataUnsafe?.user;
  if (!user) return null;

  return {
    id: user.id,
    firstName: user.first_name,
    lastName: user.last_name,
    username: user.username,
    languageCode: user.language_code,
    initData: window.Telegram.WebApp.initData,
  };
}

export function initTelegramMiniApp() {
  if (typeof window === 'undefined' || !window.Telegram?.WebApp) return null;

  try {
    window.Telegram.WebApp.ready?.();
    window.Telegram.WebApp.expand?.();
    window.Telegram.WebApp.setHeaderColor?.('#0f1720', 'bg_color');
    window.Telegram.WebApp.setBackgroundColor?.('#0f1720', 'bg_color');
  } catch (error) {
    console.warn('Telegram Mini App init failed', error);
  }

  return getTelegramUserInfo();
}
