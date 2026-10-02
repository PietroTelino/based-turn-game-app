import { useTranslation } from 'react-i18next';
import { sfx } from '@/audio/sfx';
import { useSound } from '@/hooks/useSound';

/** Botão de mudo e controle de volume. A escolha fica guardada no navegador. */
export function SoundControl() {
    const { t } = useTranslation();
    const { volume, muted } = useSound();
    const isSilent = muted || volume === 0;

    return (
        <div className='bt-sound'>
            <button
                type='button'
                className='bt-sound__toggle'
                aria-pressed={muted}
                aria-label={t(muted ? 'battle.sound.unmute' : 'battle.sound.mute')}
                title={t(muted ? 'battle.sound.unmute' : 'battle.sound.mute')}
                onClick={() => {
                    sfx.setMuted(!muted);
                    // Depois de religar, um clique para ouvir que voltou.
                    if (muted) sfx.play('click', 30);
                }}
            >
                <svg viewBox='0 0 24 24' width='22' height='22' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round' aria-hidden='true'>
                    <path d='M4 9.5h3.5L12 5.5v13l-4.5-4H4z' fill='currentColor' />
                    {isSilent ? (
                        <path d='M16 9.5l5 5M21 9.5l-5 5' />
                    ) : (
                        <>
                            <path d='M15.5 9.2a4 4 0 0 1 0 5.6' />
                            {volume > 0.5 && <path d='M18 6.8a7.5 7.5 0 0 1 0 10.4' />}
                        </>
                    )}
                </svg>
            </button>
            <input
                type='range'
                className='bt-sound__volume'
                min={0}
                max={100}
                step={5}
                value={Math.round(volume * 100)}
                disabled={muted}
                aria-label={t('battle.sound.volume')}
                onChange={(event) => sfx.setVolume(Number(event.target.value) / 100)}
                onPointerUp={() => sfx.play('select')}
                onKeyUp={() => sfx.play('click')}
            />
        </div>
    );
}
