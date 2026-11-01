import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CharacterArt } from '@/components/battle/CharacterArt';
import { CharacterCard } from '@/components/battle/CharacterCard';
import type { Character } from '@/types/battle';
import type { DraftAction, DraftTeam, DraftView } from '@/types/ranked';

interface DraftBoardProps {
    draft: DraftView;
    /** Quando acaba o prazo do passo da vez, no relógio deste navegador (ms). */
    deadline: number | null;
    characters: Character[];
    isChoosing: boolean;
    onChoose: (characterId: string) => void;
}

/** Abaixo disto o relógio fica vermelho. */
const HURRY_MS = 10_000;
/** O prazo de cada passo (DRAFT_TURN_MS na API): é a barra cheia. */
const TURN_MS = 30_000;

/** Quanto falta para `deadline`, atualizado algumas vezes por segundo. */
function useTimeLeft(deadline: number | null): number {
    const [now, setNow] = useState(() => Date.now());

    useEffect(() => {
        if (deadline === null) return;

        const timer = window.setInterval(() => setNow(Date.now()), 250);

        return () => window.clearInterval(timer);
    }, [deadline]);

    return deadline === null ? 0 : Math.max(0, deadline - now);
}

/**
 * A seleção de personagens da ranqueada: os dois times à vista, a ordem dos
 * passos, o relógio do passo da vez e a lista de personagens para banir ou
 * escolher. Clicar num personagem só o destaca (e mostra a carta dele); a
 * escolha vale no botão de confirmar.
 */
export function DraftBoard({ draft, deadline, characters, isChoosing, onChoose }: DraftBoardProps) {
    const { t } = useTranslation();
    const [selected, setSelected] = useState<string | null>(null);
    const timeLeft = useTimeLeft(deadline);

    const enemy: DraftTeam = draft.you === 'A' ? 'B' : 'A';
    const current = draft.current;
    const isMyTurn = current !== null && current.team === draft.you && draft.status === 'drafting';
    const nameOf = (id: string) => characters.find((character) => character.id === id)?.name ?? id;
    const opponent = draft.players[enemy];

    const selectedCharacter = characters.find((character) => character.id === selected) ?? null;
    const seconds = Math.ceil(timeLeft / 1000);

    let status: string;

    if (draft.status !== 'drafting' || !current) {
        status = t('ranked.draft.starting');
    } else if (isMyTurn) {
        status = t(current.kind === 'ban' ? 'ranked.draft.yourTurnBan' : 'ranked.draft.yourTurnPick');
    } else {
        status = t(current.kind === 'ban' ? 'ranked.draft.theirTurnBan' : 'ranked.draft.theirTurnPick', { name: opponent });
    }

    return (
        <div className='bt-draft'>
            <section className='bt-panel bt-draft__head' aria-live='polite'>
                <div className='bt-draft__status'>
                    <h3 className='bt-subtitle'>{t('ranked.draft.title')}</h3>
                    <p className={`bt-draft__turn ${isMyTurn ? 'bt-draft__turn--mine' : ''}`}>{status}</p>
                </div>

                {current && draft.status === 'drafting' && (
                    <div className={`bt-draft__clock ${timeLeft <= HURRY_MS ? 'bt-draft__clock--hurry' : ''}`} role='timer' aria-label={t('ranked.draft.timeLeft', { seconds })}>
                        <span className='bt-draft__seconds'>{seconds}</span>
                        <span className='bt-draft__bar' aria-hidden='true'>
                            <span style={{ width: `${Math.min(100, (timeLeft / TURN_MS) * 100)}%` }} />
                        </span>
                    </div>
                )}

                <ol className='bt-draft__order' aria-label={t('ranked.draft.orderLabel')}>
                    {draft.order.map((item, index) => {
                        const done = draft.actions[index];
                        const picksBefore = draft.order.slice(0, index).filter((other) => other.team === item.team && other.kind === 'pick').length;
                        const label = item.kind === 'ban' ? t('ranked.draft.banShort') : String(picksBefore + 1);

                        return (
                            <li
                                key={index}
                                className={[
                                    'bt-draft__chip',
                                    item.team === draft.you ? 'bt-draft__chip--mine' : 'bt-draft__chip--theirs',
                                    item.kind === 'ban' && 'bt-draft__chip--ban',
                                    done && 'bt-draft__chip--done',
                                    current?.index === index && 'bt-draft__chip--current',
                                ]
                                    .filter(Boolean)
                                    .join(' ')}
                                title={t(item.kind === 'ban' ? 'ranked.draft.stepBan' : 'ranked.draft.stepPick', {
                                    name: item.team === draft.you ? t('ranked.draft.you') : draft.players[item.team],
                                })}
                            >
                                {done ? <CharacterArt characterId={done.characterId} kind='face' className='bt-draft__chip-face' /> : label}
                            </li>
                        );
                    })}
                </ol>
            </section>

            <div className='bt-draft__teams'>
                <TeamColumn draft={draft} team={draft.you} title={t('ranked.draft.yourTeam')} nameOf={nameOf} mine />
                <TeamColumn draft={draft} team={enemy} title={t('ranked.draft.theirTeam', { name: opponent })} nameOf={nameOf} />
            </div>

            <div className='bt-draft__pick'>
                <ul className='bt-draft__roster' aria-label={t('ranked.draft.rosterLabel')}>
                    {characters.map((character) => {
                        const banned = draft.banned.includes(character.id);
                        const mine = draft.teams[draft.you].includes(character.id);
                        const theirs = draft.teams[enemy].includes(character.id);
                        const valid = draft.choices.includes(character.id);

                        return (
                            <li key={character.id}>
                                <button
                                    type='button'
                                    className={[
                                        'bt-draft__tile',
                                        banned && 'bt-draft__tile--banned',
                                        mine && 'bt-draft__tile--mine',
                                        selected === character.id && 'bt-draft__tile--selected',
                                        isMyTurn && valid && 'bt-draft__tile--valid',
                                    ]
                                        .filter(Boolean)
                                        .join(' ')}
                                    // Fora da sua vez dá para destacar e ler a carta; banido e repetido no seu time, não.
                                    disabled={banned || mine}
                                    aria-pressed={selected === character.id}
                                    onClick={() => setSelected(character.id)}
                                >
                                    <span className='bt-draft__face'>
                                        <CharacterArt characterId={character.id} kind='face' className='bt-queue__sprite' />
                                    </span>
                                    <span className='bt-draft__tile-name'>{character.name}</span>
                                    <span className='bt-draft__tile-tag'>
                                        {banned
                                            ? t('ranked.draft.bannedTag')
                                            : mine
                                              ? t('ranked.draft.inYourTeam')
                                              : theirs
                                                ? t('ranked.draft.inTheirTeam')
                                                : t(`play.roles.${character.role}`)}
                                    </span>
                                </button>
                            </li>
                        );
                    })}
                </ul>

                <aside className='bt-draft__detail'>
                    {selectedCharacter ? (
                        <CharacterCard character={selectedCharacter} position={-1} isLocked={false} isReadOnly onToggle={() => undefined} />
                    ) : (
                        <p className='bt-draft__hint'>{t(isMyTurn ? 'ranked.draft.pickHint' : 'ranked.draft.waitHint')}</p>
                    )}

                    {isMyTurn && current && (
                        <button
                            type='button'
                            className='bt-btn bt-btn--big bt-draft__confirm'
                            disabled={!selected || !draft.choices.includes(selected) || isChoosing}
                            onClick={() => selected && onChoose(selected)}
                        >
                            {selected
                                ? t(current.kind === 'ban' ? 'ranked.draft.confirmBan' : 'ranked.draft.confirmPick', { name: nameOf(selected) })
                                : t(current.kind === 'ban' ? 'ranked.draft.chooseBan' : 'ranked.draft.choosePick')}
                        </button>
                    )}
                </aside>
            </div>
        </div>
    );
}

/** Um time na seleção: o banimento dele e as cinco vagas, preenchidas na ordem das escolhas. */
function TeamColumn({ draft, team, title, nameOf, mine = false }: { draft: DraftView; team: DraftTeam; title: string; nameOf: (id: string) => string; mine?: boolean }) {
    const { t } = useTranslation();
    const ban = draft.actions.find((action) => action.team === team && action.kind === 'ban');
    const picks = draft.actions.filter((action) => action.team === team && action.kind === 'pick');
    const current = draft.current;
    /** A vaga que está sendo preenchida agora (para destacar). */
    const filling = current && current.team === team ? (current.kind === 'ban' ? 'ban' : picks.length) : null;

    return (
        <section className={`bt-panel bt-draft__team ${mine ? 'bt-draft__team--mine' : 'bt-draft__team--theirs'}`} aria-label={title}>
            <h4 className='bt-draft__team-title'>{title}</h4>

            <div className={`bt-draft__ban ${filling === 'ban' ? 'bt-draft__slot--filling' : ''}`}>
                <span className='bt-draft__ban-label'>{t('ranked.draft.banLabel')}</span>
                {ban ? <SlotFace action={ban} nameOf={nameOf} /> : <span className='bt-draft__empty'>{t('ranked.draft.emptySlot')}</span>}
            </div>

            <ol className='bt-draft__slots'>
                {Array.from({ length: 5 }, (_, index) => {
                    const pick = picks[index];

                    return (
                        <li key={index} className={`bt-draft__slot ${filling === index ? 'bt-draft__slot--filling' : ''}`}>
                            {pick ? <SlotFace action={pick} nameOf={nameOf} /> : <span className='bt-draft__empty'>{t('ranked.draft.pickSlot', { n: index + 1 })}</span>}
                        </li>
                    );
                })}
            </ol>
        </section>
    );
}

function SlotFace({ action, nameOf }: { action: DraftAction; nameOf: (id: string) => string }) {
    const { t } = useTranslation();

    return (
        <span className={`bt-draft__chosen ${action.kind === 'ban' ? 'bt-draft__chosen--ban' : ''}`}>
            <span className='bt-draft__face'>
                <CharacterArt characterId={action.characterId} kind='face' className='bt-queue__sprite' />
            </span>
            <span className='bt-draft__chosen-name'>
                {nameOf(action.characterId)}
                {action.auto && <span className='bt-draft__auto'>{t('ranked.draft.auto')}</span>}
            </span>
        </span>
    );
}
