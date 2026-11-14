import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Layout } from '@/components/Layout';
import { CharacterArt } from '@/components/battle/CharacterArt';
import { Collection } from '@/components/battle/Collection';
import { DifficultyMark, DifficultyPicker } from '@/components/battle/DifficultyPicker';
import { DraftBoard } from '@/components/battle/DraftBoard';
import { ModeTabs } from '@/components/battle/ModeTabs';
import { TutorialLobby } from '@/components/battle/TutorialLobby';
import { TutorialLock } from '@/components/battle/TutorialLock';
import { Achievements } from '@/components/battle/Achievements';
import { Shop } from '@/components/battle/Shop';
import { Missions } from '@/components/battle/Missions';
import { StageStars, StarChests } from '@/components/battle/StarChests';
import { Amount } from '@/components/battle/Currency';
import { getTower } from '@/api/battles';
import { useAiDraft } from '@/hooks/useAiDraft';
import { useProgression } from '@/hooks/useProgression';
import { useCampaign } from '@/hooks/useCampaign';
import { useDifficulty } from '@/hooks/useDifficulty';
import { useTutorialStatus } from '@/hooks/useTutorialStatus';
import { usePlay } from '@/hooks/usePlay';
import { ratingKey } from '@/battle/rating';
import type { AiDifficulty, BattleSummary, CampaignStage, Character, TowerView } from '@/types/battle';
import '@/styles/battle.css';

/** As abas do single player: cada uma é uma rota. */
export type SinglePlayerMode = 'tutorial' | 'quick' | 'campaign' | 'tower' | 'missions' | 'collection' | 'achievements' | 'shop';

function battleLabelKey(battle: BattleSummary): string {
    if (battle.status === 'in_progress') return 'play.inProgress';

    // Contra a IA o jogador é o time A; entre jogadores, pode ser qualquer um dos dois.
    return battle.winner === battle.playerTeam ? 'play.won' : 'play.lost';
}

/**
 * Single player: jogar contra a IA. O tutorial é a batalha de treino, com o
 * guia, e é obrigatório: enquanto o jogador não o termina, as abas de partida
 * mostram a trava. Na partida rápida e na campanha o jogador escolhe o nível
 * da IA e monta o time numa seleção de personagens contra ela (DraftBoard, sem
 * banimento); na campanha a IA escolhe o time da fase. A coleção mostra as
 * cartas de todos os personagens, para ler com calma. Cada aba cabe na tela
 * sem rolar a página; só listas longas rolam por dentro.
 */
export function PlayPage({ mode = 'quick' }: { mode?: SinglePlayerMode }) {
    const { t } = useTranslation();
    const play = usePlay();
    const [difficulty, setDifficulty] = useDifficulty();
    const { isLoading, hasError } = play;
    const tutorialDone = useTutorialStatus();
    /** Falta o tutorial: as abas de partida mostram a trava no lugar do conteúdo. */
    const locked = tutorialDone === false;
    /** A aba é de partida (a coleção e o tutorial não são). */
    const isMatch = mode === 'quick' || mode === 'campaign' || mode === 'tower';
    /** O conteúdo de uma aba de partida (enquanto não se sabe do tutorial, nada aparece). */
    const showGame = isMatch && tutorialDone === true;
    /** A aba usa o catálogo carregado (as de partida e a coleção). */
    const needsCatalog = showGame || mode === 'collection' || mode === 'achievements' || mode === 'shop';

    return (
        <Layout title={t('nav.play')} heading={false}>
            <div className='bt bt-play'>
                {/* O título e as abas numa faixa só, no alto da página. */}
                <header className='bt-hero'>
                    <div className='bt-hero__text'>
                        <h2 className='bt-title'>{t('singlePlayer.title')}</h2>
                        <p className='bt-lead'>{t('singlePlayer.subtitle')}</p>
                    </div>
                    <ModeTabs
                        label={t('singlePlayer.modes')}
                        tabs={[
                            { to: '/play/tutorial', label: t('singlePlayer.tabs.tutorial') },
                            { to: '/play', label: t('singlePlayer.tabs.quick'), locked },
                            { to: '/play/campaign', label: t('singlePlayer.tabs.campaign'), locked },
                            { to: '/play/tower', label: t('singlePlayer.tabs.tower'), locked },
                            { to: '/play/missions', label: t('singlePlayer.tabs.missions') },
                            { to: '/play/collection', label: t('singlePlayer.tabs.collection') },
                            { to: '/play/achievements', label: t('singlePlayer.tabs.achievements') },
                            { to: '/play/shop', label: t('singlePlayer.tabs.shop') },
                        ]}
                    />
                </header>

                {/* O tutorial carrega o próprio time; as outras abas, o catálogo e o histórico. */}
                {mode === 'tutorial' && <TutorialLobby required={locked} />}

                {isMatch && locked && <TutorialLock />}

                {needsCatalog && isLoading && <p className='bt-message'>{t('play.loading')}</p>}
                {needsCatalog && hasError && <p className='bt-message bt-message--error'>{t('play.loadError')}</p>}

                {showGame && !isLoading && !hasError && mode === 'quick' && <QuickMatch play={play} difficulty={difficulty} onDifficulty={setDifficulty} />}

                {showGame && !isLoading && !hasError && mode === 'campaign' && <Campaign play={play} difficulty={difficulty} onDifficulty={setDifficulty} />}

                {showGame && !isLoading && !hasError && mode === 'tower' && <Tower play={play} />}

                {mode === 'missions' && <Missions />}

                {mode === 'collection' && !isLoading && !hasError && <Collection characters={play.characters} />}

                {mode === 'achievements' && !isLoading && !hasError && <Achievements characters={play.characters} />}

                {mode === 'shop' && !isLoading && !hasError && <Shop characters={play.characters} />}
            </div>
        </Layout>
    );
}

type Play = ReturnType<typeof usePlay>;

/** O que a aba de partida recebe da página. */
interface MatchTabProps {
    play: Play;
    difficulty: AiDifficulty;
    onDifficulty: (difficulty: AiDifficulty) => void;
}

/**
 * A partida rápida: o nível da IA e o botão que abre a seleção de
 * personagens; ao lado, as últimas batalhas. O time da IA sai da seleção, e
 * o cenário é sorteado pela API.
 */
function QuickMatch({ play, difficulty, onDifficulty }: MatchTabProps) {
    const { t } = useTranslation();
    const [isDrafting, setIsDrafting] = useState(false);

    return (
        <div className='bt-mode bt-mode--fill'>
            <section className='bt-launch' aria-label={t('singlePlayer.quickTitle')}>
                <div className='bt-launch__intro'>
                    <h3 className='bt-subtitle'>{t('singlePlayer.quickTitle')}</h3>
                    <p className='bt-launch__text'>{t('singlePlayer.quickLead')}</p>
                </div>
                <DifficultyPicker value={difficulty} onChange={onDifficulty} disabled={play.isStarting} />
                <button type='button' className='bt-btn bt-btn--big bt-launch__go' disabled={play.isStarting} onClick={() => setIsDrafting(true)}>
                    {t('singlePlayer.openDraft')}
                </button>
            </section>

            <History battles={play.battles} />

            {isDrafting && (
                <AiDraft
                    play={play}
                    title={t('singlePlayer.draftTitle', { level: t(`difficulty.${difficulty}`) })}
                    onLeave={() => setIsDrafting(false)}
                    onComplete={async (team, enemyTeam) => {
                        if (!(await play.start(team, { difficulty, enemyTeam }))) setIsDrafting(false);
                    }}
                />
            )}
        </div>
    );
}

/**
 * A seleção de personagens contra a IA, por cima da página (DraftBoard). Na
 * campanha, `aiTeam` é o time da fase: a IA escolhe exatamente ele, na ordem.
 */
function AiDraft({
    play,
    title,
    aiTeam,
    arena,
    onLeave,
    onComplete,
}: {
    play: Play;
    title: string;
    aiTeam?: string[];
    arena?: string;
    onLeave: () => void;
    onComplete: (team: string[], enemyTeam: string[]) => void;
}) {
    const { t } = useTranslation();
    const names = useMemo(() => ({ A: t('ranked.draft.you'), B: t('singlePlayer.ai') }), [t]);
    const progression = useProgression();
    const owned = progression?.owned;
    const { draft, choose } = useAiDraft({ characters: play.characters, names, onComplete, ...(aiTeam && { aiTeam }), ...(owned && { owned }) });
    const locked = owned ? play.characters.map((c) => c.id).filter((id) => !owned.includes(id)) : [];

    return (
        <DraftBoard
            draft={draft}
            deadline={null}
            characters={play.characters}
            isChoosing={play.isStarting}
            onChoose={choose}
            title={title}
            opponentTitle={t('singlePlayer.aiTeam')}
            onLeave={onLeave}
            locked={locked}
            {...(arena && { arena })}
        />
    );
}

/** A aba da campanha: as fases e, embaixo, o nível e o botão que abre a seleção para a fase escolhida. */
function Campaign({ play, difficulty, onDifficulty }: MatchTabProps) {
    const { t } = useTranslation();
    const { stages, selected, isLoading, hasError, select } = useCampaign();
    const [isDrafting, setIsDrafting] = useState(false);

    if (isLoading) return <p className='bt-message'>{t('campaign.loading')}</p>;
    if (hasError) return <p className='bt-message bt-message--error'>{t('campaign.loadError')}</p>;

    return (
        <div className='bt-mode'>
            <StarChests />
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
                <section className='bt-launch bt-launch--row' aria-label={t('campaign.stageLabel', { stage: selected.stage })}>
                    <DifficultyPicker value={difficulty} onChange={onDifficulty} disabled={play.isStarting} />
                    <div className='bt-launch__side'>
                        <p className='bt-launch__text'>{t('campaign.draftText', { stage: selected.stage })}</p>
                        <button type='button' className='bt-btn bt-btn--big bt-launch__go' disabled={play.isStarting} onClick={() => setIsDrafting(true)}>
                            {t('singlePlayer.openDraft')}
                        </button>
                    </div>
                </section>
            ) : (
                <p className='bt-lead'>{t('campaign.pickStage')}</p>
            )}

            {isDrafting && selected && (
                <AiDraft
                    play={play}
                    title={t('campaign.draftTitle', { stage: selected.stage, name: t(`campaign.stages.${selected.key}.name`) })}
                    aiTeam={selected.enemyTeam}
                    arena={selected.arena}
                    onLeave={() => setIsDrafting(false)}
                    onComplete={async (team) => {
                        if (!(await play.start(team, { difficulty, campaignStage: selected.stage }))) setIsDrafting(false);
                    }}
                />
            )}
        </div>
    );
}

/** Uma fase da campanha: o cenário de fundo, a história, o time inimigo e o que o jogador já fez nela. */
function StageCard({ stage, characters, isSelected, onSelect }: { stage: CampaignStage; characters: Character[]; isSelected: boolean; onSelect: () => void }) {
    const { t } = useTranslation();
    const name = t(`campaign.stages.${stage.key}.name`);
    const stars = useProgression()?.stars.byStage[String(stage.stage)] ?? 0;

    return (
        <li
            className={['bt-stage', isSelected && 'bt-stage--selected', !stage.unlocked && 'bt-stage--locked'].filter(Boolean).join(' ')}
            data-arena={stage.arena}
        >
            <div className='bt-stage__scene' aria-hidden='true' />

            <div className='bt-stage__body'>
                <p className='bt-stage__number'>
                    {t('campaign.stageLabel', { stage: stage.stage })}
                    {stage.unlocked && <StageStars stars={stars} />}
                </p>
                <h3 className='bt-stage__name'>{name}</h3>
                <p className='bt-stage__story'>{t(`campaign.stages.${stage.key}.story`)}</p>

                <ul className='bt-stage__enemies' aria-label={t('campaign.enemies')}>
                    {stage.enemyTeam.map((id, index) => {
                        const character = characters.find((item) => item.id === id);
                        const isBoss = stage.boss?.slot === index;

                        return (
                            <li key={id} className={isBoss ? 'bt-stage__enemy bt-stage__enemy--boss' : 'bt-stage__enemy'} title={isBoss ? stage.boss!.name : (character?.name ?? id)}>
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

/**
 * A torre: andares sem fim, cada um mais difícil. O jogador vê o próximo
 * andar (time inimigo, nível, modificadores e prêmio) e monta o time numa
 * seleção contra a IA, que leva o time do andar.
 */
function Tower({ play }: { play: Play }) {
    const { t } = useTranslation();
    const [tower, setTower] = useState<TowerView | null>(null);
    const [hasError, setHasError] = useState(false);
    const [isDrafting, setIsDrafting] = useState(false);

    useEffect(() => {
        let cancelled = false;

        getTower()
            .then((data) => !cancelled && setTower(data))
            .catch(() => !cancelled && setHasError(true));

        return () => {
            cancelled = true;
        };
    }, []);

    if (hasError) return <p className='bt-message bt-message--error'>{t('tower.loadError')}</p>;
    if (!tower) return <p className='bt-message'>{t('tower.loading')}</p>;

    const { next } = tower;

    return (
        <div className='bt-mode bt-tower'>
            <p className='bt-lead'>{t('tower.lead')}</p>

            <section className='bt-stage bt-stage--selected bt-tower__floor' data-arena={next.arena}>
                <div className='bt-stage__scene' aria-hidden='true' />
                <div className='bt-stage__body'>
                    <p className='bt-stage__number'>{t('tower.best', { floor: tower.best })}</p>
                    <h3 className='bt-stage__name'>{t('tower.floorLabel', { floor: next.floor })}</h3>
                    <p className='bt-stage__story'>
                        {t('tower.floorText', { level: t(`difficulty.${next.difficulty}`), percent: next.scalePercent })}
                    </p>

                    <ul className='bt-stage__enemies' aria-label={t('campaign.enemies')}>
                        {next.enemyTeam.map((id, index) => {
                            const isBoss = index === 0 && next.modifiers.includes('chefe');

                            return (
                                <li key={id} className={isBoss ? 'bt-stage__enemy bt-stage__enemy--boss' : 'bt-stage__enemy'} title={play.characters.find((c) => c.id === id)?.name ?? id}>
                                    <CharacterArt characterId={id} kind='face' className='bt-stage__face' />
                                </li>
                            );
                        })}
                    </ul>

                    {next.modifiers.length > 0 ? (
                        <ul className='bt-tower__mods'>
                            {next.modifiers.map((id) => (
                                <li key={id} className='bt-tower__mod'>
                                    <b>{t(`tower.modifiers.${id}.name`)}</b> {t(`tower.modifiers.${id}.text`)}
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className='bt-stage__status'>{t('tower.noModifiers')}</p>
                    )}

                    <div className='bt-stage__footer'>
                        <p className='bt-stage__status bt-tower__reward'>
                            {t('tower.reward')}
                            <Amount currency='gold' value={next.reward.gold} />
                            {next.reward.diamonds ? <Amount currency='diamonds' value={next.reward.diamonds} /> : null}
                        </p>
                        <button type='button' className='bt-btn bt-btn--big' disabled={play.isStarting} onClick={() => setIsDrafting(true)}>
                            {t('tower.climb')}
                        </button>
                    </div>
                </div>
            </section>

            {isDrafting && (
                <AiDraft
                    play={play}
                    title={t('tower.draftTitle', { floor: next.floor })}
                    aiTeam={next.enemyTeam}
                    arena={next.arena}
                    onLeave={() => setIsDrafting(false)}
                    onComplete={async (team) => {
                        if (!(await play.start(team, { towerFloor: next.floor }))) setIsDrafting(false);
                    }}
                />
            )}
        </div>
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

/** As últimas batalhas do jogador, de qualquer modo. */
function History({ battles }: { battles: BattleSummary[] }) {
    const { t, i18n } = useTranslation();

    return (
        <section className='bt-history'>
            <h3 className='bt-subtitle'>{t('play.recent')}</h3>
            {battles.length === 0 ? (
                <p className='bt-lead'>{t('play.noBattles')}</p>
            ) : (
                <ul className='bt-history__list'>
                    {battles.map((battle) => (
                        // O resultado também vira cor: uma faixa verde (vitória), vermelha (derrota) ou dourada (em andamento).
                        <li key={battle.id} className={`bt-history__item bt-history__item--${battle.status === 'in_progress' ? 'live' : battle.winner === battle.playerTeam ? 'won' : 'lost'}`}>
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
