import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { TUTORIAL_MOVES } from '@/hooks/useTutorial';
import type { TutorialGuide as Guide } from '@/hooks/useTutorial';

interface TutorialGuideProps {
    guide: Guide;
    /** Nome de quem está na vez, para os textos do passo. */
    unitName: string;
    /** Nome da habilidade do passo, como aparece na carta. */
    skillName: string;
    /** Nome do alvo do passo, como aparece na arena. */
    targetName: string;
    onAdvance: () => void;
}

/**
 * A faixa do guia na batalha de treino, entre a arena e o painel de jogadas.
 * Fica sempre no mesmo lugar e com a mesma altura mínima, para a tela não
 * pular quando uma dica entra ou sai.
 */
export function TutorialGuide({ guide, unitName, skillName, targetName, onAdvance }: TutorialGuideProps) {
    const { t } = useTranslation();
    const values = { unit: unitName, skill: skillName, target: targetName, button: t('battle.useSkill', { skill: skillName }) };
    /** Dica que pede leitura ou ação: a faixa ganha destaque. */
    const isLoud = guide.kind === 'page' || guide.kind === 'do' || guide.kind === 'free' || guide.kind === 'berserk' || guide.kind === 'lost';

    let title: string | null = null;
    let text: string;
    let step: string | null = null;
    let key: string = guide.kind;

    switch (guide.kind) {
        case 'page':
            title = t(`tutorial.script.${guide.id}.title`);
            text = t(`tutorial.script.${guide.id}.text`, values);
            step = t('tutorial.move', { current: guide.move, total: TUTORIAL_MOVES });
            key = `page-${guide.move}-${guide.page}`;
            break;
        case 'do':
            title = t('tutorial.doTitle');
            text = t(`tutorial.do.${guide.stage}`, values);
            step = t('tutorial.move', { current: guide.move, total: TUTORIAL_MOVES });
            key = `do-${guide.move}-${guide.stage}`;
            break;
        case 'free':
            title = t('tutorial.freeTitle');
            text = t('tutorial.free');
            break;
        case 'berserk':
            title = t('tutorial.script.berserk.title');
            text = t('tutorial.script.berserk.text');
            break;
        case 'done':
            title = t('tutorial.doneTitle');
            text = t('tutorial.done');
            break;
        case 'lost':
            title = t('tutorial.lostTitle');
            text = t('tutorial.lost');
            break;
        default:
            text = t(`tutorial.${guide.kind}`);
    }

    return (
        <aside className={`bt-coach ${isLoud ? 'bt-coach--tip' : ''}`} aria-label={t('tutorial.guide')} aria-live='polite'>
            <span className='bt-coach__badge' aria-hidden='true'>
                {t('tutorial.guide')}
            </span>

            {/* A chave refaz a entrada do texto a cada dica nova. */}
            <div key={key} className='bt-coach__body'>
                {title && (
                    <p className='bt-coach__title'>
                        {title}
                        {step && <span className='bt-coach__step'>{step}</span>}
                    </p>
                )}
                <p className='bt-coach__text'>{text}</p>
            </div>

            <div className='bt-coach__actions'>
                {guide.kind === 'page' && (
                    <button type='button' className='bt-btn bt-btn--small' onClick={onAdvance}>
                        {t('tutorial.next')}
                    </button>
                )}
                {(guide.kind === 'free' || guide.kind === 'berserk') && (
                    <button type='button' className='bt-btn bt-btn--small' onClick={onAdvance}>
                        {t('tutorial.gotIt')}
                    </button>
                )}
                {guide.kind === 'lost' && (
                    <Link to='/play/tutorial' className='bt-btn bt-btn--small'>
                        {t('tutorial.retry')}
                    </Link>
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
