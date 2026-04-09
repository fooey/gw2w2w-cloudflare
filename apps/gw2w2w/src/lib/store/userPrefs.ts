import { DEFAULT_LANG, LANGS, type Lang } from '#ui/wvw/config/lang';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface UserPrefsState {
  lang: Lang;
  apiKey: string;
  setLang: (lang: Lang) => void;
  setApiKey: (apiKey: string) => void;
}

export const useUserPrefs = create<UserPrefsState>()(
  persist(
    (set) => ({
      lang: DEFAULT_LANG,
      apiKey: '',
      setLang: (lang) => set({ lang }),
      setApiKey: (apiKey) => set({ apiKey }),
    }),
    {
      name: 'gw2w2w.prefs',
      onRehydrateStorage: () => (state) => {
        if (state && !LANGS.includes(state.lang)) {
          state.lang = DEFAULT_LANG;
        }
      },
    },
  ),
);
