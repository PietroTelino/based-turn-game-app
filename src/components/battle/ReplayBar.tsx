import { useTranslation } from 'react-i18next';
import { REPLAY_SPEEDS } from '@/hooks/useBattle';
import type { ReplayControls } from '@/hooks/useBattle';

/**
 * Os controles do replay, no lugar onde ficam as habilidades numa batalha de
 * verdade: pausar, escolher a velocidade, pular para o resultado e recomeçar.
 */
export function ReplayBar({ replay }: { replay: ReplayControls }) {
    const { t } = useTranslation();
    const percent = replay.total === 0 ? 0 : Math.round((replay.done / replay.total) * 100);

    return (
        <div className='bt-replay'>
            <div
                className='bt-replay__track'
                role='progressbar'
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={percent}
                aria-label={t('replay.progress')}
            >
                <span className='bt-replay__fill' style={{ width: `${percent}%` }} />
            </div>

            <div className='bt-replay__controls'>
                <button type='button' className='bt-btn' disabled={replay.isFinished} onClick={replay.togglePause}>
                    {t(replay.isPaused ? 'replay.resume' : 'replay.pause')}
                </button>

                <div className='bt-replay__speeds' role='group' aria-label={t('replay.speed')}>
                    <span className='bt-field-label'>{t('replay.speed')}</span>
                    {REPLAY_SPEEDS.map((speed) => (
                        <button
                            key={speed}
                            type='button'
                            className={`bt-btn bt-btn--small ${replay.speed === speed ? '' : 'bt-btn--plain'}`}
                            aria-pressed={replay.speed === speed}
                            onClick={() => replay.setSpeed(speed)}
                        >
                            {speed}x
                        </button>
                    ))}
                </div>

                <button type='button' className='bt-btn bt-btn--plain' disabled={replay.isFinished} onClick={replay.skip}>
                    {t('replay.skip')}
                </button>
                <button type='button' className='bt-btn bt-btn--plain' onClick={replay.restart}>
                    {t('replay.restart')}
                </button>
            </div>
        </div>
    );
}
