import { useSyncExternalStore } from 'react';
import { sfx } from '@/audio/sfx';
import type { SoundSettings } from '@/audio/sfx';

/** Volume e mudo atuais. O componente se atualiza sozinho quando mudam. */
export function useSound(): SoundSettings {
    return useSyncExternalStore(sfx.subscribe, sfx.getSettings, sfx.getSettings);
}
