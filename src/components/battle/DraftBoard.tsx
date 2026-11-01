import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { CharacterArt } from '@/components/battle/CharacterArt';
import type { Character, CharacterRole } from '@/types/battle';
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
/** A ordem dos filtros de categoria (só aparecem as que algum personagem tem). */
const ROLE_ORDER: CharacterRole[] = ['tank', 'fighter', 'attacker', 'assassin', 'mage', 'support', 'shapeshifter'];

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

/** "Súcubo" -> "sucubo": a busca ignora acento e maiúscula. */
function normalize(text: string): string {
    return text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

/**
 * A seleção de personagens da ranqueada, numa tela só (como a de um jogo de
 * arena): o seu time à esquerda, o do adversário à direita e, no centro, o
 * relógio, a ordem dos passos e os personagens, com busca e filtro por
 * categoria. Só a lista do centro rola. Clicar num personagem o destaca e
 * mostra a ficha dele embaixo; a escolha vale no botão de confirmar.
 *
 * Ocupa a janela inteira, por cima do resto da página, enquanto a seleção
 * dura: nada fica escondido embaixo da dobra. Vai direto no <body> (portal),
 * para nenhum contêiner da página limitar o tamanho dela.
 */
export function DraftBoard({ draft, deadline, characters, isChoosing, onChoose }: DraftBoardProps) {
    const { t } = useTranslation();
    const [selected, setSelected] = useState<string | null>(null);
    const [query, setQuery] = useState('');
    const [role, setRole] = useState<CharacterRole | null>(null);
    const timeLeft = useTimeLeft(deadline);

    // A página por baixo não rola enquanto a seleção está aberta.
    useEffect(() => {
        const previous = document.body.style.overflow;

        document.body.style.overflow = 'hidden';

        return () => {
            document.body.style.overflow = previous;
        };
    }, []);

    const enemy: DraftTeam = draft.you === 'A' ? 'B' : 'A';
    const current = draft.current;
    const isMyTurn = current !== null && current.team === draft.you && draft.status === 'drafting';
    const nameOf = (id: string) => characters.find((character) => character.id === id)?.name ?? id;
    const opponent = draft.players[enemy];
    const seconds = Math.ceil(timeLeft / 1000);
    const selectedCharacter = characters.find((character) => character.id === selected) ?? null;

    const roles = useMemo(() => ROLE_ORDER.filter((item) => characters.some((character) => character.role === item)), [characters]);
    const visible = useMemo(() => {
        const search = normalize(query.trim());

        return characters.filter((character) => (!role || character.role === role) && (!search || normalize(character.name).includes(search)));
    }, [characters, query, role]);

    let status: string;

    if (draft.status !== 'drafting' || !current) {
        status = t('ranked.draft.starting');
    } else if (isMyTurn) {
        status = t(current.kind === 'ban' ? 'ranked.draft.yourTurnBan' : 'ranked.draft.yourTurnPick');
    } else {
        status = t(current.kind === 'ban' ? 'ranked.draft.theirTurnBan' : 'ranked.draft.theirTurnPick', { name: opponent });
    }

    return createPortal(
        <div className='bt bt-draft' role='dialog' aria-modal='true' aria-labelledby='bt-draft-title'>
            <header className='bt-draft__head'>
                <p id='bt-draft-title' className='bt-draft__title'>
                    {t('ranked.draft.title')}
                </p>
                <p className={`bt-draft__turn ${isMyTurn ? 'bt-draft__turn--mine' : ''}`} aria-live='polite'>
                    {status}
                </p>

                {current && draft.status === 'drafting' && (
                    <div className={`bt-draft__clock ${timeLeft <= HURRY_MS ? 'bt-draft__clock--hurry' : ''}`} role='timer' aria-label={t('ranked.draft.timeLeft', { seconds })}>
                        <span className='bt-draft__bar bt-draft__bar--left' aria-hidden='true'>
                            <span style={{ width: `${Math.min(100, (timeLeft / TURN_MS) * 100)}%` }} />
                        </span>
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
            </header>

            <TeamColumn draft={draft} team={draft.you} title={t('ranked.draft.yourTeam')} nameOf={nameOf} mine />

            <main className='bt-draft__center'>
                <div className='bt-draft__tools'>
                    <div className='bt-draft__filters' role='group' aria-label={t('ranked.draft.filterLabel')}>
                        <button type='button' className={`bt-draft__filter ${role === null ? 'bt-draft__filter--on' : ''}`} aria-pressed={role === null} onClick={() => setRole(null)}>
                            {t('ranked.draft.allRoles')}
                        </button>
                        {roles.map((item) => (
                            <button
                                key={item}
                                type='button'
                                className={`bt-draft__filter ${role === item ? 'bt-draft__filter--on' : ''}`}
                                aria-pressed={role === item}
                                onClick={() => setRole(role === item ? null : item)}
                            >
                                {t(`play.roles.${item}`)}
                            </button>
                        ))}
                    </div>

                    <label className='bt-draft__search'>
                        <svg viewBox='0 0 16 16' aria-hidden='true'>
                            <circle cx='7' cy='7' r='4.6' fill='none' strokeWidth='1.8' />
                            <path d='M10.4 10.4 14 14' strokeWidth='1.8' strokeLinecap='round' />
                        </svg>
                        <span className='bt-visually-hidden'>{t('ranked.draft.searchLabel')}</span>
                        <input type='search' value={query} placeholder={t('ranked.draft.searchPlaceholder')} onChange={(event) => setQuery(event.target.value)} />
                    </label>
                </div>

                <div className='bt-draft__scroll'>
                    {visible.length === 0 ? (
                        <p className='bt-draft__none'>{t('ranked.draft.noneFound')}</p>
                    ) : (
                        <ul className='bt-draft__roster' aria-label={t('ranked.draft.rosterLabel')}>
                            {visible.map((character) => {
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
                                                theirs && 'bt-draft__tile--theirs',
                                                selected === character.id && 'bt-draft__tile--selected',
                                                isMyTurn && valid && 'bt-draft__tile--valid',
                                            ]
                                                .filter(Boolean)
                                                .join(' ')}
                                            // Fora da sua vez dá para destacar e ler a ficha; banido e repetido no seu time, não.
                                            disabled={banned || mine}
                                            aria-pressed={selected === character.id}
                                            title={banned ? t('ranked.draft.bannedTag') : mine ? t('ranked.draft.inYourTeam') : theirs ? t('ranked.draft.inTheirTeam') : undefined}
                                            onClick={() => setSelected(character.id)}
                                            onDoubleClick={() => isMyTurn && valid && !isChoosing && onChoose(character.id)}
                                        >
                                            <span className='bt-draft__portrait'>
                                                <CharacterArt characterId={character.id} kind='face' className='bt-queue__sprite' />
                                                {(banned || mine || theirs) && (
                                                    <span className='bt-draft__mark'>
                                                        {banned ? t('ranked.draft.bannedTag') : mine ? t('ranked.draft.youShort') : t('ranked.draft.themShort')}
                                                    </span>
                                                )}
                                            </span>
                                            <span className='bt-draft__tile-name'>{character.name}</span>
                                        </button>
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </div>

                <section className='bt-draft__detail' aria-live='polite'>
                    {selectedCharacter ? (
                        <>
                            <span className='bt-draft__detail-face'>
                                <CharacterArt characterId={selectedCharacter.id} kind='face' className='bt-queue__sprite' />
                            </span>
                            <div className='bt-draft__detail-main'>
                                <p className='bt-draft__detail-name'>
                                    {selectedCharacter.name}
                                    <span className='bt-draft__detail-role'>{t(`play.roles.${selectedCharacter.role}`)}</span>
                                </p>
                                <dl className='bt-draft__stats'>
                                    {(['maxHp', 'atk', 'def', 'speed'] as const).map((stat) => (
                                        <div key={stat}>
                                            <dt>{t(`play.stats.${stat === 'maxHp' ? 'hp' : stat}`)}</dt>
                                            <dd>{selectedCharacter.stats[stat]}</dd>
                                        </div>
                                    ))}
                                </dl>
                            </div>
                            <ul className='bt-draft__skills'>
                                {selectedCharacter.skills.map((skill) => (
                                    <li key={skill.id}>
                                        <b>{skill.name}</b>
                                        <span className='bt-draft__skill-cost'>
                                            {skill.energyCost === 0 ? t('ranked.draft.free') : t('ranked.draft.cost', { count: skill.energyCost })}
                                        </span>
                                        <span className='bt-draft__skill-text'>{skill.description}</span>
                                    </li>
                                ))}
                                {selectedCharacter.passives.map((passive) => (
                                    <li key={passive.id}>
                                        <b>{passive.name}</b>
                                        <span className='bt-draft__skill-cost'>{t('ranked.draft.passive')}</span>
                                        <span className='bt-draft__skill-text'>{passive.description}</span>
                                    </li>
                                ))}
                            </ul>
                        </>
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
                            {selected && draft.choices.includes(selected)
                                ? t(current.kind === 'ban' ? 'ranked.draft.confirmBan' : 'ranked.draft.confirmPick', { name: nameOf(selected) })
                                : t(current.kind === 'ban' ? 'ranked.draft.chooseBan' : 'ranked.draft.choosePick')}
                        </button>
                    )}
                </section>
            </main>

            <TeamColumn draft={draft} team={enemy} title={t('ranked.draft.theirTeam', { name: opponent })} nameOf={nameOf} />
        </div>,
        document.body,
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
        <aside className={`bt-draft__team ${mine ? 'bt-draft__team--mine' : 'bt-draft__team--theirs'}`} aria-label={title}>
            <h2 className='bt-draft__team-title'>{title}</h2>

            <ol className='bt-draft__slots'>
                {Array.from({ length: 5 }, (_, index) => {
                    const pick = picks[index];
                    const isFilling = filling === index;

                    return (
                        <li key={index} className={`bt-draft__slot ${isFilling ? 'bt-draft__slot--filling' : ''} ${pick ? 'bt-draft__slot--done' : ''}`}>
                            <span className='bt-draft__slot-face'>{pick && <CharacterArt characterId={pick.characterId} kind='face' className='bt-queue__sprite' />}</span>
                            <span className='bt-draft__slot-text'>
                                <span className='bt-draft__slot-label'>{isFilling ? t('ranked.draft.picking') : t('ranked.draft.pickSlot', { n: index + 1 })}</span>
                                {pick && <PickName action={pick} nameOf={nameOf} />}
                            </span>
                        </li>
                    );
                })}
            </ol>

            <div className={`bt-draft__ban ${filling === 'ban' ? 'bt-draft__slot--filling' : ''}`}>
                <span className='bt-draft__ban-face'>{ban && <CharacterArt characterId={ban.characterId} kind='face' className='bt-queue__sprite' />}</span>
                <span className='bt-draft__slot-text'>
                    <span className='bt-draft__slot-label'>{filling === 'ban' ? t('ranked.draft.banning') : t('ranked.draft.banLabel')}</span>
                    {ban ? <PickName action={ban} nameOf={nameOf} /> : <span className='bt-draft__empty'>{t('ranked.draft.emptySlot')}</span>}
                </span>
            </div>
        </aside>
    );
}

function PickName({ action, nameOf }: { action: DraftAction; nameOf: (id: string) => string }) {
    const { t } = useTranslation();

    return (
        <span className={`bt-draft__slot-name ${action.kind === 'ban' ? 'bt-draft__slot-name--ban' : ''}`}>
            {nameOf(action.characterId)}
            {action.auto && <span className='bt-draft__auto'>{t('ranked.draft.auto')}</span>}
        </span>
    );
}
