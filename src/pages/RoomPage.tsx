import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Layout } from '@/components/Layout';
import { DraftBoard } from '@/components/battle/DraftBoard';
import { TEAM_SIZE } from '@/hooks/usePlay';
import { useRoom } from '@/hooks/useRoom';
import '@/styles/battle.css';

function RoomScreen({ code }: { code: string }) {
    const { t } = useTranslation();
    const { room, characters, phase, errorMessage, deadline, isChoosing, isLeaving, choose, leave } = useRoom(code);
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

    // Os dois na sala: a seleção de personagens, igual à da ranqueada, ocupando a tela.
    if (room.status === 'selecting' && room.draft) {
        return (
            <DraftBoard
                draft={room.draft}
                deadline={deadline}
                characters={characters}
                isChoosing={isChoosing}
                onChoose={choose}
                title={t('room.draftTitle')}
                onLeave={leave}
            />
        );
    }

    const { opponent } = room;
    const isStarting = room.status !== 'waiting';

    async function copyCode() {
        try {
            await navigator.clipboard.writeText(code);
            setIsCopied(true);
            window.setTimeout(() => setIsCopied(false), 1800);
        } catch {
            // Sem permissão para copiar: o código está na tela, dá para ler.
        }
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

                <ul className='bt-room__players' aria-live='polite'>
                    <li className='bt-room__player bt-room__player--ready'>
                        <span className='bt-room__who'>{t('room.you')}</span>
                        <span className='bt-room__state'>{t('room.inRoom')}</span>
                    </li>
                    <li className='bt-room__versus' aria-hidden='true'>
                        {t('room.versus')}
                    </li>
                    {opponent ? (
                        <li className='bt-room__player bt-room__player--ready'>
                            <span className='bt-room__who'>{opponent.name}</span>
                            <span className='bt-room__state'>{t('room.inRoom')}</span>
                        </li>
                    ) : (
                        <li className='bt-room__player bt-room__player--empty'>
                            <span className='bt-room__who'>{t('room.nobody')}</span>
                            <span className='bt-room__state'>{t('room.waitingOpponent')}</span>
                        </li>
                    )}
                </ul>
            </section>

            <section className='bt-panel bt-room__bar' aria-label={t('room.actionsLabel')}>
                <p className='bt-room__note' aria-live='polite'>
                    {t(isStarting ? 'room.starting' : 'room.waitingJoin')}
                </p>
                <div className='bt-room__buttons'>
                    <button type='button' className='bt-btn bt-btn--quiet' disabled={isLeaving || room.status === 'started'} onClick={leave}>
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
        <Layout title={t('nav.multiplayer')} heading={false}>
            {/* key: trocar de sala recria a tela do zero */}
            {code && <RoomScreen key={code} code={code.toUpperCase()} />}
        </Layout>
    );
}
