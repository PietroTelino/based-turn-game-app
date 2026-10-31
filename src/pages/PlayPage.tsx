import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Layout } from '@/components/Layout';
import { CharacterArt } from '@/components/battle/CharacterArt';
import { CharacterCard } from '@/components/battle/CharacterCard';
import { DifficultyMark, DifficultyPicker } from '@/components/battle/DifficultyPicker';
import { ModeTabs } from '@/components/battle/ModeTabs';
import { useCampaign } from '@/hooks/useCampaign';
import { useDifficulty } from '@/hooks/useDifficulty';
import { TEAM_SIZE, usePlay } from '@/hooks/usePlay';
import { ratingKey } from '@/battle/rating';
import type { AiDifficulty, BattleSummary, CampaignStage, Character } from '@/types/battle';
import '@/styles/battle.css';

/** As duas abas do single player: cada uma é uma rota. */
export type SinglePlayerMode = 'quick' | 'campaign';

function battleLabelKey(battle: BattleSummary): string {
    if (battle.status === 'in_progress') return 'play.inProgress';

    // Contra a IA o jogador é o time A; entre jogadores, pode ser qualquer um dos dois.
    return battle.winner === battle.playerTeam ? 'play.won' : 'play.lost';
}

/**
 * Single player: jogar contra a IA. Na partida rápida o time inimigo é
 * sorteado; na campanha, cada fase tem o seu. Nas duas o jogador escolhe o
 * nível da IA e monta o time.
 */
export function PlayPage({ mode = 'quick' }: { mode?: SinglePlayerMode }) {
    const { t } = useTranslation();
    const play = usePlay();
    const [difficulty, setDifficulty] = useDifficulty();
    const { battles, isLoading, hasError } = play;

    return (
        <Layout title={t('nav.play')}>
            <div className='bt bt-play'>
                <header>
                    <h2 className='bt-title'>{t('singlePlayer.title')}</h2>
                    <p className='bt-lead'>{t('singlePlayer.subtitle')}</p>
                </header>

                {/* Quem nunca jogou é convidado a começar pelo treino. */}
                {!isLoading && !hasError && battles.length === 0 && (
                    <p className='bt-callout'>
                        {t('play.firstTime')}{' '}
                        <Link to='/tutorial' className='bt-link'>
                            {t('play.firstTimeLink')}
                        </Link>
                    </p>
                )}

                <ModeTabs
                    label={t('singlePlayer.modes')}
                    tabs={[
                        { to: '/play', label: t('singlePlayer.tabs.quick') },
                        { to: '/play/campaign', label: t('singlePlayer.tabs.campaign') },
                    ]}
                />

                {isLoading && <p className='bt-message'>{t('play.loading')}</p>}
                {hasError && <p className='bt-message bt-message--error'>{t('play.loadError')}</p>}

                {!isLoading && !hasError && mode === 'quick' && (
                    <>
                        <p className='bt-lead'>{t('singlePlayer.quickLead')}</p>
                        <DifficultyPicker value={difficulty} onChange={setDifficulty} disabled={play.isStarting} />
                        <TeamPicker play={play} />
                        <StartBar play={play} label={t('play.start')} onStart={() => play.start({ difficulty })} />
                        <History battles={battles} />
                    </>
                )}

                {!isLoading && !hasError && mode === 'campaign' && <Campaign play={play} difficulty={difficulty} onDifficulty={setDifficulty} />}
            </div>
        </Layout>
    );
}

type Play = ReturnType<typeof usePlay>;

/** A aba da campanha: as fases, o nível e o time para a fase escolhida. */
function Campaign({ play, difficulty, onDifficulty }: { play: Play; difficulty: AiDifficulty; onDifficulty: (difficulty: AiDifficulty) => void }) {
    const { t } = useTranslation();
    const { stages, selected, isLoading, hasError, select } = useCampaign();

    if (isLoading) return <p className='bt-message'>{t('campaign.loading')}</p>;
    if (hasError) return <p className='bt-message bt-message--error'>{t('campaign.loadError')}</p>;

    return (
        <>
            <p className='bt-lead'>{t('campaign.lead')}</p>

            <ol className='bt-stages'>
                {stages.map((stage) => (
                    <StageCard
                        key={stage.stage}
                        stage={stage}
                        characters={play.characters}
                        isSelected={selected?.stage === stage.stage}
                        onSelect={() => select(stage.stage)}
                    />
                ))}
            </ol>

            {selected ? (
                <>
                    <DifficultyPicker value={difficulty} onChange={onDifficulty} disabled={play.isStarting} />
                    <div>
                        <h3 className='bt-subtitle'>{t('campaign.teamTitle')}</h3>
                        <p className='bt-lead'>{t('campaign.teamText', { size: TEAM_SIZE, stage: selected.stage })}</p>
                    </div>
                    <TeamPicker play={play} />
                    <StartBar
                        play={play}
                        label={t('campaign.start', { stage: selected.stage })}
                        onStart={() => play.start({ difficulty, campaignStage: selected.stage })}
                    />
                </>
            ) : (
                <p className='bt-lead'>{t('campaign.pickStage')}</p>
            )}
        </>
    );
}

/** Uma fase da campanha: o cenário de fundo, a história, o time inimigo e o que o jogador já fez nela. */
function StageCard({ stage, characters, isSelected, onSelect }: { stage: CampaignStage; characters: Character[]; isSelected: boolean; onSelect: () => void }) {
    const { t } = useTranslation();
    const name = t(`campaign.stages.${stage.key}.name`);

    return (
        <li
            className={['bt-stage', isSelected && 'bt-stage--selected', !stage.unlocked && 'bt-stage--locked'].filter(Boolean).join(' ')}
            data-arena={stage.arena}
        >
            <div className='bt-stage__scene' aria-hidden='true' />

            <div className='bt-stage__body'>
                <p className='bt-stage__number'>{t('campaign.stageLabel', { stage: stage.stage })}</p>
                <h3 className='bt-stage__name'>{name}</h3>
                <p className='bt-stage__story'>{t(`campaign.stages.${stage.key}.story`)}</p>

                <ul className='bt-stage__enemies' aria-label={t('campaign.enemies')}>
                    {stage.enemyTeam.map((id) => {
                        const character = characters.find((item) => item.id === id);

                        return (
                            <li key={id} className='bt-stage__enemy' title={character?.name ?? id}>
                                <CharacterArt characterId={id} kind='face' className='bt-stage__face' />
                                <span className='bt-visually-hidden'>{character?.name ?? id}</span>
                            </li>
                        );
                    })}
                </ul>

                <div className='bt-stage__footer'>
                    {!stage.unlocked ? (
                        <p className='bt-stage__status'>
                            <LockIcon />
                            {t('campaign.locked', { stage: stage.stage - 1 })}
                        </p>
                    ) : stage.clearedOn.length > 0 ? (
                        <p className='bt-stage__status bt-stage__status--cleared'>
                            {t('campaign.clearedOn')}
                            {stage.clearedOn.map((difficulty) => (
                                <span key={difficulty} className='bt-stage__medal'>
                                    <DifficultyMark difficulty={difficulty} />
                                    {t(`difficulty.${difficulty}`)}
                                </span>
                            ))}
                        </p>
                    ) : (
                        <p className='bt-stage__status'>{t('campaign.notCleared')}</p>
                    )}

                    {stage.unlocked && (
                        <button
                            type='button'
                            className={isSelected ? 'bt-btn bt-btn--small bt-btn--plain' : 'bt-btn bt-btn--small'}
                            aria-pressed={isSelected}
                            onClick={onSelect}
                        >
                            {t(isSelected ? 'campaign.chosen' : 'campaign.choose')}
                        </button>
                    )}
                </div>
            </div>
        </li>
    );
}

function LockIcon() {
    return (
        <svg viewBox='0 0 16 16' className='bt-stage__lock' aria-hidden='true'>
            <path d='M4.5 7V5.2a3.5 3.5 0 0 1 7 0V7' fill='none' strokeWidth='1.8' />
            <rect x='3' y='7' width='10' height='7.5' rx='1.4' />
        </svg>
    );
}

/** As cartas dos personagens para montar o time. */
function TeamPicker({ play }: { play: Play }) {
    const { characters, team, toggle } = play;

    return (
        <div className='bt-roster'>
            {characters.map((character) => {
                const position = team.indexOf(character.id);

                return (
                    <CharacterCard
                        key={character.id}
                        character={character}
                        position={position}
                        isLocked={position === -1 && team.length >= TEAM_SIZE}
                        onToggle={toggle}
                    />
                );
            })}
        </div>
    );
}

/** A barra presa ao pé da tela: quantos já foram escolhidos e o botão de começar. */
function StartBar({ play, label, onStart }: { play: Play; label: string; onStart: () => void }) {
    const { t } = useTranslation();
    const { team, isStarting } = play;

    return (
        <section className='bt-panel bt-room__bar'>
            <p className='bt-room__note' aria-live='polite'>
                {team.length === TEAM_SIZE
                    ? t('play.selected', { count: team.length, max: TEAM_SIZE })
                    : t('play.selectedMissing', { count: team.length, max: TEAM_SIZE, missing: TEAM_SIZE - team.length })}
            </p>
            <div className='bt-room__buttons'>
                <button type='button' className='bt-btn bt-btn--big' disabled={team.length !== TEAM_SIZE || isStarting} onClick={onStart}>
                    {isStarting ? t('play.starting') : label}
                </button>
            </div>
        </section>
    );
}

/** As últimas batalhas do jogador, de qualquer modo. */
function History({ battles }: { battles: BattleSummary[] }) {
    const { t, i18n } = useTranslation();

    return (
        <section className='bt-history'>
            <h2 className='bt-subtitle'>{t('play.recent')}</h2>
            {battles.length === 0 ? (
                <p className='bt-lead'>{t('play.noBattles')}</p>
            ) : (
                <ul className='bt-history__list'>
                    {battles.map((battle) => (
                        <li key={battle.id} className='bt-history__item'>
                            <span>
                                <b>{t(battleLabelKey(battle), { turn: battle.turn })}</b>
                                {battle.ranked ? (
                                    <span className='bt-history__tag bt-history__tag--ranked'>{t('play.ranked')}</span>
                                ) : battle.mode === 'pvp' ? (
                                    <span className='bt-history__tag'>{t('play.versusPlayer')}</span>
                                ) : (
                                    <>
                                        {typeof battle.campaignStage === 'number' && (
                                            <span className='bt-history__tag bt-history__tag--campaign'>{t('play.campaignTag', { stage: battle.campaignStage })}</span>
                                        )}
                                        {battle.difficulty && (
                                            <span className={`bt-history__tag bt-history__tag--level bt-history__tag--${battle.difficulty}`}>
                                                {t('play.difficultyTag', { level: t(`difficulty.${battle.difficulty}`) })}
                                            </span>
                                        )}
                                    </>
                                )}
                                {/* Partida ranqueada encerrada: quantos pontos ela valeu. */}
                                {battle.ratingChange !== null && (
                                    <span className={`bt-history__points ${battle.ratingChange > 0 ? 'bt-history__points--up' : ''}`}>
                                        {t(ratingKey(battle.ratingChange), { count: Math.abs(battle.ratingChange) })}
                                    </span>
                                )}
                                <span className='bt-history__date'>{new Date(battle.createdAt).toLocaleString(i18n.language)}</span>
                            </span>
                            <span className='bt-history__links'>
                                {/* As batalhas antigas não guardaram o começo: delas só dá para ver o resultado. */}
                                {battle.status === 'finished' && battle.hasReplay && (
                                    <Link to={`/replay/${battle.id}`} className='bt-link'>
                                        {t('play.replay')}
                                    </Link>
                                )}
                                <Link to={`/battle/${battle.id}`} className='bt-link'>
                                    {t(battle.status === 'in_progress' ? 'play.continue' : 'play.review')}
                                </Link>
                            </span>
                        </li>
                    ))}
                </ul>
            )}
        </section>
    );
}
