import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface Config {
  relayUrl: string;
  apiKey: string;
  clientId: string;
  clientName: string;
  role: 'gm' | 'player';
  sessionId?: string;
}

interface UIConfig {
  sidebarOpen: boolean;
  /** Dark mode or light mode */
  theme: 'dark' | 'light';
  /** Active theme preset ID (e.g. 'default', 'dnd', 'cyberpunk') */
  themePreset: string;
}

interface Status {
  connected: boolean;
  online: boolean;
  connecting: boolean;
  error: string | null;
}

interface AppState {
  config: Config;
  status: Status;
  ui: UIConfig;

  setConfig: (config: Partial<Config>) => void;
  setConnected: (connected: boolean) => void;
  setStatus: (status: 'connected' | 'connecting' | 'disconnected') => void;
  setError: (error: string | null) => void;
  toggleSidebar: () => void;
  toggleTheme: () => void;
  setThemePreset: (preset: string) => void;
  reset: () => void;
}

const defaultConfig: Config = {
  relayUrl: '',
  apiKey: '',
  clientId: '',
  clientName: '',
  role: 'gm',
};

const defaultUi: UIConfig = {
  sidebarOpen: true,
  theme: 'dark',
  themePreset: 'default',
};

const defaultStatus: Status = {
  connected: false,
  online: false,
  connecting: false,
  error: null,
};

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      config: defaultConfig,
      status: defaultStatus,
      ui: defaultUi,

      setConfig: (partial) => {
        set({ config: { ...get().config, ...partial } });
      },

      setConnected: (connected) => {
        set({ status: { ...get().status, connected, connecting: false, error: null } });
      },

      setStatus: (status) => {
        set({
          status: {
            ...get().status,
            connected: status === 'connected',
            connecting: status === 'connecting',
            error: status === 'disconnected' ? 'Disconnected' : null,
          },
        });
      },

      setError: (error) => {
        set({ status: { ...get().status, error } });
      },

      toggleSidebar: () => {
        set({ ui: { ...get().ui, sidebarOpen: !get().ui.sidebarOpen } });
      },

      toggleTheme: () => {
        set({ ui: { ...get().ui, theme: get().ui.theme === 'dark' ? 'light' : 'dark' } });
      },

      setThemePreset: (preset) => {
        set({ ui: { ...get().ui, themePreset: preset } });
      },

      reset: () => {
        set({ config: defaultConfig, status: defaultStatus });
      },
    }),
    {
      name: 'foundry-companion',
      partialize: (state) => ({
        config: state.config,
        ui: state.ui,
      }),
    },
  ),
);
