import { useTranslation } from 'react-i18next';
import { CharacterArt } from '@/components/battle/CharacterArt';
import { LockMark } from '@/components/battle/TutorialLock';
import { useTutorialStart } from '@/hooks/useTutorialStart';

/** As regras do resumo, na ordem em que aparecem. Os textos ficam em `tutorial.rules.<id>`. */
const RULES = ['goal', 'turns', 'energy', 'skills', 'passives', 'effects', 'berserk'] as const;

/** O que o guia ensina, na ordem da batalha de treino. Os textos ficam em `tutorialGate.learn.<id>`. */
const LEARNS = ['screen', 'energy', 'skills', 'effects'] as const;

/** O que fica travado até o tutorial acabar. Os nomes saem das abas. */
const UNLOCKS = ['singlePlayer.tabs.quick', 'singlePlayer.tabs.campaign', 'multiplayer.tabs.casual', 'multiplayer.tabs.ranked'] as const;

/**
 * A aba Tutorial do single player: o resumo das regras e o botão que começa a
 * batalha de treino. `required`: o jogador ainda não fez o tutorial, então a
 * aba abre explicando por que ele vem primeiro e o que ele libera.
 */
export function TutorialLobby({ required = false }: { required?: boolean }) {
    const { t } = useTranslation();
    const { team, isLoading, hasError, isStarting, start } = useTutorialStart();

    return (
        <>
            <p className='bt-lead'>{t('tutorial.subtitle')}</p>

            {required && (
                <section className='bt-panel bt-welcome' aria-labelledby='bt-welcome-title'>
                    <h3 id='bt-welcome-title' className='bt-welcome__title'>
                        {t('tutorialGate.welcomeTitle')}
                    </h3>
                    <p className='bt-welcome__text'>{t('tutorialGate.welcomeText')}</p>

                    <div className='bt-welcome__columns'>
                        <div>
                            <h4 className='bt-welcome__heading'>{t('tutorialGate.learnTitle')}</h4>
                            <ul className='bt-welcome__list'>
                                {LEARNS.map((item) => (
                                    <li key={item}>{t(`tutorialGate.learn.${item}`)}</li>
                                ))}
                            </ul>
                        </div>
                        <div>
                            <h4 className='bt-welcome__heading'>{t('tutorialGate.unlockTitle')}</h4>
                            <ul className='bt-welcome__list bt-welcome__list--locked'>
                                {UNLOCKS.map((key) => (
                                    <li key={key}>
                                        <LockMark small />
                                        {t(key)}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>

                    <p className='bt-welcome__note'>{t('tutorialGate.welcomeNote')}</p>
                </section>
            )}

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
        </>
    );
}
