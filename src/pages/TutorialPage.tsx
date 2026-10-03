import { useTranslation } from 'react-i18next';
import { Layout } from '@/components/Layout';
import { CharacterArt } from '@/components/battle/CharacterArt';
import { useTutorialStart } from '@/hooks/useTutorialStart';
import '@/styles/battle.css';

/** As regras do resumo, na ordem em que aparecem. Os textos ficam em `tutorial.rules.<id>`. */
const RULES = ['goal', 'turns', 'energy', 'skills', 'passives', 'effects', 'berserk'] as const;

/** Entrada do tutorial: o resumo das regras e o botão que começa a batalha de treino. */
export function TutorialPage() {
    const { t } = useTranslation();
    const { team, isLoading, hasError, isStarting, start } = useTutorialStart();

    return (
        <Layout title={t('nav.tutorial')}>
            <div className='bt bt-play'>
                <header>
                    <h2 className='bt-title'>{t('tutorial.title')}</h2>
                    <p className='bt-lead'>{t('tutorial.subtitle')}</p>
                </header>

                <section className='bt-panel bt-training'>
                    <h3 className='bt-subtitle'>{t('tutorial.teamTitle')}</h3>
                    <p className='bt-panel__text'>{t('tutorial.teamText')}</p>

                    {isLoading && <p className='bt-panel__text'>{t('play.loading')}</p>}
                    {hasError && <p className='bt-message bt-message--error'>{t('play.loadError')}</p>}

                    {team.length > 0 && (
                        <ul className='bt-training__team'>
                            {team.map((character) => (
                                <li key={character.id} className='bt-training__member'>
                                    <span className='bt-result__face'>
                                        <CharacterArt characterId={character.id} kind='face' className='bt-queue__sprite' />
                                    </span>
                                    <span className='bt-training__name'>{character.name}</span>
                                    <span className='bt-training__role'>{t(`play.roles.${character.role}`)}</span>
                                </li>
                            ))}
                        </ul>
                    )}

                    <button type='button' className='bt-btn bt-btn--big' disabled={isLoading || hasError || isStarting} onClick={start}>
                        {isStarting ? t('play.starting') : t('tutorial.start')}
                    </button>
                </section>

                <section className='bt-panel bt-rules'>
                    <h3 className='bt-subtitle'>{t('tutorial.rulesTitle')}</h3>
                    <dl className='bt-rules__list'>
                        {RULES.map((rule) => (
                            <div key={rule} className='bt-rules__item'>
                                <dt>{t(`tutorial.rules.${rule}.title`)}</dt>
                                <dd>{t(`tutorial.rules.${rule}.text`)}</dd>
                            </div>
                        ))}
                    </dl>
                </section>
            </div>
        </Layout>
    );
}
