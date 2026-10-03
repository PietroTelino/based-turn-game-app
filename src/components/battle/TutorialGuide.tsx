import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { TutorialGuide as Guide } from '@/hooks/useTutorial';

interface TutorialGuideProps {
    guide: Guide;
    /** Nome de quem está na vez, para a dica das habilidades. */
    unitName: string;
    onAdvance: () => void;
}

/**
 * A faixa do guia na batalha de treino, entre a arena e o painel de jogadas.
 * Fica sempre no mesmo lugar e com a mesma altura mínima, para a tela não
 * pular quando uma dica entra ou sai.
 */
export function TutorialGuide({ guide, unitName, onAdvance }: TutorialGuideProps) {
    const { t } = useTranslation();
    const hasTip = guide.kind === 'lesson' || guide.kind === 'moment';

    return (
        <aside className={`bt-coach ${hasTip ? 'bt-coach--tip' : ''}`} aria-label={t('tutorial.guide')} aria-live='polite'>
            <span className='bt-coach__badge' aria-hidden='true'>
                {t('tutorial.guide')}
            </span>

            {hasTip ? (
                // A chave refaz a entrada do texto a cada dica nova.
                <div key={guide.id} className='bt-coach__body'>
                    <p className='bt-coach__title'>
                        {t(`tutorial.tips.${guide.id}.title`)}
                        {guide.kind === 'lesson' && (
                            <span className='bt-coach__step'>{t('tutorial.step', { current: guide.step, total: guide.total })}</span>
                        )}
                    </p>
                    <p className='bt-coach__text'>{t(`tutorial.tips.${guide.id}.text`, { unit: unitName })}</p>
                </div>
            ) : (
                <div className='bt-coach__body'>
                    {guide.kind === 'done' && <p className='bt-coach__title'>{t('tutorial.doneTitle')}</p>}
                    <p className='bt-coach__text'>{t(`tutorial.${guide.kind}`)}</p>
                </div>
            )}

            <div className='bt-coach__actions'>
                {guide.kind === 'lesson' && guide.hasNext && (
                    <button type='button' className='bt-btn bt-btn--small' onClick={onAdvance}>
                        {t('tutorial.next')}
                    </button>
                )}
                {guide.kind === 'moment' && (
                    <button type='button' className='bt-btn bt-btn--small' onClick={onAdvance}>
                        {t('tutorial.gotIt')}
                    </button>
                )}
                {guide.kind === 'done' && (
                    <>
                        <Link to='/play' className='bt-btn bt-btn--small'>
                            {t('tutorial.buildTeam')}
                        </Link>
                        <Link to='/multiplayer' className='bt-btn bt-btn--small bt-btn--plain'>
                            {t('nav.multiplayer')}
                        </Link>
                    </>
                )}
            </div>
        </aside>
    );
}
