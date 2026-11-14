import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { dismissInvite, getInvites } from '@/api/friends';
import type { RoomInvite } from '@/api/friends';
import { sfx } from '@/audio/sfx';

/** De quanto em quanto tempo pergunta se chegou convite. */
const POLL_INTERVAL = 10000;

/**
 * O aviso de convite para sala, no canto da tela, em qualquer página (menos
 * dentro de uma batalha ou sala). Mostra o convite mais novo, com entrar e
 * dispensar.
 */
export function InviteNotifier() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { pathname } = useLocation();
    const [invite, setInvite] = useState<RoomInvite | null>(null);
    const seen = useRef(new Set<string>());
    // Na aba de amigos os convites já aparecem na lista.
    const busy = /^\/(battle|room|replay|watch)\//.test(pathname) || pathname === '/multiplayer/friends';

    useEffect(() => {
        if (busy) return;

        let cancelled = false;

        async function check() {
            try {
                const list = await getInvites();
                const fresh = list.find((item) => !seen.current.has(item.id)) ?? null;

                if (cancelled) return;
                if (fresh && fresh.id !== invite?.id) sfx.play('turn');
                setInvite(fresh);
            } catch {
                // Sem conexão por um instante: tenta de novo na próxima volta.
            }
        }

        void check();

        const timer = window.setInterval(check, POLL_INTERVAL);

        return () => {
            cancelled = true;
            window.clearInterval(timer);
        };
    }, [busy, invite?.id]);

    if (!invite || busy) return null;

    const close = () => {
        seen.current.add(invite.id);
        setInvite(null);
    };

    return (
        <div className='bt-invite-toast' role='status'>
            <p className='bt-invite-toast__text'>{t('friends.invitedBy', { name: invite.from.name })}</p>
            <div className='bt-invite-toast__buttons'>
                <button
                    type='button'
                    className='bt-btn bt-btn--small'
                    onClick={() => {
                        close();
                        navigate(`/room/${invite.roomCode}`);
                    }}
                >
                    {t('friends.join')}
                </button>
                <button
                    type='button'
                    className='bt-btn bt-btn--small bt-btn--quiet'
                    onClick={() => {
                        close();
                        void dismissInvite(invite.id).catch(() => undefined);
                    }}
                >
                    {t('friends.dismiss')}
                </button>
            </div>
        </div>
    );
}
