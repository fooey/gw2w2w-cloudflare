import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import type { EmblemSize } from '@repo/emblem-renderer/sizes';
import { DEFAULT_EMBLEM_SIZE, EMBLEM_SIZES } from '@repo/emblem-renderer/sizes';

import type { Lang } from '#ui/wvw/config/lang';
import { DEFAULT_LANG, LANGS } from '#ui/wvw/config/lang';

interface UserPrefsState {
  lang: Lang;
  apiKey: string;
  emblemSize: EmblemSize;
  setLang: (lang: Lang) => void;
  setApiKey: (apiKey: string) => void;
  setEmblemSize: (size: EmblemSize) => void;
}

export const useUserPrefs = create<UserPrefsState>()(
  persist(
    (set) => ({
      lang: DEFAULT_LANG,
      apiKey: '',
      emblemSize: DEFAULT_EMBLEM_SIZE,
      setLang: (lang) => {
        set({ lang });
      },
      setApiKey: (apiKey) => {
        set({ apiKey });
      },
      setEmblemSize: (emblemSize) => {
        set({ emblemSize });
      },
    }),
    {
      name: 'gw2w2w.prefs',
      onRehydrateStorage: () => (state) => {
        if (state && !LANGS.includes(state.lang)) {
          state.lang = DEFAULT_LANG;
        }
        if (state && !(EMBLEM_SIZES as readonly number[]).includes(state.emblemSize)) {
          state.emblemSize = DEFAULT_EMBLEM_SIZE;
        }
      },
    },
  ),
);
