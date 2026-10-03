import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Layout } from '@/components/Layout';
import { CharacterCard } from '@/components/battle/CharacterCard';
import { TEAM_SIZE } from '@/hooks/usePlay';
import { useRoom } from '@/hooks/useRoom';
import '@/styles/battle.css';

function RoomScreen({ code }: { code: string }) {
    const { t } = useTranslation();
    const { room, characters, phase, errorMessage, team, isReady, isSending, canChoose, toggle, ready, unready, leave } = useRoom(code);
    const [isCopied, setIsCopied] = useState(false);

    if (phase === 'loading') {
        return <p className='bt-message'>{t('room.loading')}</p>;
    }

    if (phase === 'error' || !room) {
        return (
            <div className='bt-message'>
                <p>{errorMessage ?? t('room.loadError')}</p>
                <Link to='/multiplayer' className='bt-btn'>
                    {t('room.backToLobby')}
                </Link>
            </div>
        );
    }

    if (room.status === 'closed') {
        return (
            <div className='bt-message'>
                <p>{t(room.role === 'host' ? 'room.closedByYou' : 'room.closed')}</p>
                <Link to='/multiplayer' className='bt-btn'>
                    {t('room.backToLobby')}
                </Link>
            </div>
        );
    }

    const { opponent } = room;
    /** Os dois confirmaram: a batalha está sendo criada (ou já foi) e a tela vai mudar sozinha. */
    const isStarting = room.status === 'starting' || room.status === 'started';

    async function copyCode() {
        try {
            await navigator.clipboard.writeText(code);
            setIsCopied(true);
            window.setTimeout(() => setIsCopied(false), 1800);
        } catch {
            // Sem permissão para copiar: o código está na tela, dá para ler.
        }
    }

    let note: string;

    if (isStarting) {
        note = t('room.starting');
    } else if (!isReady) {
        note =
            team.length === TEAM_SIZE
                ? t('room.teamComplete', { count: team.length, max: TEAM_SIZE })
                : t('play.selectedMissing', { count: team.length, max: TEAM_SIZE, missing: TEAM_SIZE - team.length });
    } else if (opponent) {
        note = t('room.waitingReady', { name: opponent.name });
    } else {
        note = t('room.waitingJoin');
    }

    return (
        <div className='bt bt-play bt-room'>
            <header>
                <h2 className='bt-title'>{t('room.title')}</h2>
                <p className='bt-lead'>{t('room.subtitle', { size: TEAM_SIZE })}</p>
            </header>

            <section className='bt-panel bt-room__top' aria-label={t('room.statusLabel')}>
                <div className='bt-room__code'>
                    <span className='bt-field-label'>{t('room.code')}</span>
                    <span className='bt-room__code-row'>
                        <strong className='bt-room__code-value'>{room.code}</strong>
                        <button type='button' className='bt-btn bt-btn--small' onClick={copyCode}>
                            {t(isCopied ? 'room.copied' : 'room.copy')}
                        </button>
                    </span>
                    {!opponent && <span className='bt-room__share'>{t('room.shareHint')}</span>}
                </div>

                {/* Do outro jogador só aparecem o nome e se ele já confirmou. O time dele, nunca. */}
                <ul className='bt-room__players' aria-live='polite'>
                    <li className={`bt-room__player ${isReady ? 'bt-room__player--ready' : ''}`}>
                        <span className='bt-room__who'>{t('room.you')}</span>
                        <span className='bt-room__state'>{t(isReady ? 'room.ready' : 'room.choosing')}</span>
                    </li>
                    <li className='bt-room__versus' aria-hidden='true'>
                        {t('room.versus')}
                    </li>
                    {opponent ? (
                        <li className={`bt-room__player ${opponent.ready ? 'bt-room__player--ready' : ''}`}>
                            <span className='bt-room__who'>{opponent.name}</span>
                            <span className='bt-room__state'>{t(opponent.ready ? 'room.ready' : 'room.choosing')}</span>
                        </li>
                    ) : (
                        <li className='bt-room__player bt-room__player--empty'>
                            <span className='bt-room__who'>{t('room.nobody')}</span>
                            <span className='bt-room__state'>{t('room.waitingOpponent')}</span>
                        </li>
                    )}
                </ul>
            </section>

            <div className='bt-roster'>
                {characters.map((character) => {
                    const position = team.indexOf(character.id);

                    return (
                        <CharacterCard
                            key={character.id}
                            character={character}
                            position={position}
                            isLocked={position === -1 && (team.length >= TEAM_SIZE || isReady)}
                            isReadOnly={!canChoose}
                            onToggle={toggle}
                        />
                    );
                })}
            </div>

            <section className='bt-panel bt-room__bar' aria-label={t('room.actionsLabel')}>
                <p className='bt-room__note' aria-live='polite'>
                    {note}
                </p>
                <div className='bt-room__buttons'>
                    {isReady ? (
                        <button type='button' className='bt-btn bt-btn--plain' disabled={isSending || isStarting} onClick={unready}>
                            {t('room.changeTeam')}
                        </button>
                    ) : (
                        <button type='button' className='bt-btn bt-btn--big' disabled={!canChoose || team.length !== TEAM_SIZE} onClick={ready}>
                            {t('room.play')}
                        </button>
                    )}
                    <button type='button' className='bt-btn bt-btn--quiet' disabled={isSending || isStarting} onClick={leave}>
                        {t('room.leave')}
                    </button>
                </div>
            </section>
        </div>
    );
}

export function RoomPage() {
    const { t } = useTranslation();
    const { code } = useParams();

    return (
        <Layout title={t('nav.multiplayer')}>
            {/* key: trocar de sala recria a tela do zero */}
            {code && <RoomScreen key={code} code={code.toUpperCase()} />}
        </Layout>
    );
}
