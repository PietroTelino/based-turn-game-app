import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { dismissInvite, inviteToRoom, searchPlayers } from '@/api/friends';
import type { SearchResult } from '@/api/friends';
import { useFriends } from '@/hooks/useFriends';

/**
 * A aba de amigos: procurar jogadores pelo nome, responder pedidos, ver quem
 * está jogando (e assistir) e os convites para sala.
 */
export function Friends() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { view, hasError, isBusy, reload, request, accept, remove } = useFriends();
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<SearchResult[]>([]);

    // A busca espera a pessoa parar de digitar.
    useEffect(() => {
        const text = query.trim();

        if (text.length < 2) return;

        const timer = window.setTimeout(() => {
            searchPlayers(text)
                .then(setResults)
                .catch(() => setResults([]));
        }, 300);

        return () => window.clearTimeout(timer);
    }, [query, view]);

    /** Com menos de 2 letras não há busca: a lista antiga não aparece. */
    const shown = query.trim().length >= 2 ? results : [];

    if (hasError && !view) return <p className='bt-message bt-message--error'>{t('friends.loadError')}</p>;
    if (!view) return <p className='bt-message'>{t('friends.loading')}</p>;

    return (
        <div className='bt-mode bt-friends'>
            {view.invites.length > 0 && (
                <section className='bt-panel'>
                    <h3 className='bt-subtitle'>{t('friends.invitesTitle')}</h3>
                    <ul className='bt-history__list'>
                        {view.invites.map((invite) => (
                            <li key={invite.id} className='bt-history__item'>
                                <span>{t('friends.invitedBy', { name: invite.from.name })}</span>
                                <span className='bt-friends__actions'>
                                    <button type='button' className='bt-btn bt-btn--small' onClick={() => navigate(`/room/${invite.roomCode}`)}>
                                        {t('friends.join')}
                                    </button>
                                    <button
                                        type='button'
                                        className='bt-btn bt-btn--small bt-btn--quiet'
                                        onClick={async () => {
                                            await dismissInvite(invite.id).catch(() => undefined);
                                            void reload();
                                        }}
                                    >
                                        {t('friends.dismiss')}
                                    </button>
                                </span>
                            </li>
                        ))}
                    </ul>
                </section>
            )}

            <div className='bt-lobby'>
                <section className='bt-panel'>
                    <h3 className='bt-subtitle'>{t('friends.addTitle')}</h3>
                    <label className='bt-field-label' htmlFor='bt-friend-search'>
                        {t('friends.searchLabel')}
                    </label>
                    <input
                        id='bt-friend-search'
                        className='bt-input'
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                        placeholder={t('friends.searchPlaceholder')}
                        autoComplete='off'
                    />
                    {query.trim().length >= 2 && shown.length === 0 && <p className='bt-panel__text'>{t('friends.noResults')}</p>}
                    {shown.length > 0 && (
                        <ul className='bt-history__list'>
                            {shown.map((player) => (
                                <li key={player.id} className='bt-history__item'>
                                    <span>{player.name}</span>
                                    {player.status === 'none' ? (
                                        <button type='button' className='bt-btn bt-btn--small' disabled={isBusy} onClick={() => request(player.id)}>
                                            {t('friends.add')}
                                        </button>
                                    ) : player.status === 'incoming' ? (
                                        <button type='button' className='bt-btn bt-btn--small' disabled={isBusy} onClick={() => request(player.id)}>
                                            {t('friends.accept')}
                                        </button>
                                    ) : (
                                        <span className='bt-friends__status'>{t(`friends.status.${player.status}`)}</span>
                                    )}
                                </li>
                            ))}
                        </ul>
                    )}
                </section>

                <section className='bt-panel'>
                    <h3 className='bt-subtitle'>{t('friends.requestsTitle')}</h3>
                    {view.incoming.length === 0 && view.outgoing.length === 0 && <p className='bt-panel__text'>{t('friends.noRequests')}</p>}
                    <ul className='bt-history__list'>
                        {view.incoming.map(({ requestId, user }) => (
                            <li key={requestId} className='bt-history__item'>
                                <span>{t('friends.wantsToBeFriend', { name: user.name })}</span>
                                <span className='bt-friends__actions'>
                                    <button type='button' className='bt-btn bt-btn--small' disabled={isBusy} onClick={() => accept(requestId)}>
                                        {t('friends.accept')}
                                    </button>
                                    <button type='button' className='bt-btn bt-btn--small bt-btn--quiet' disabled={isBusy} onClick={() => remove(user.id)}>
                                        {t('friends.decline')}
                                    </button>
                                </span>
                            </li>
                        ))}
                        {view.outgoing.map(({ requestId, user }) => (
                            <li key={requestId} className='bt-history__item'>
                                <span>{t('friends.waitingFor', { name: user.name })}</span>
                                <button type='button' className='bt-btn bt-btn--small bt-btn--quiet' disabled={isBusy} onClick={() => remove(user.id)}>
                                    {t('friends.cancel')}
                                </button>
                            </li>
                        ))}
                    </ul>
                </section>
            </div>

            <section className='bt-history'>
                <h3 className='bt-subtitle'>{t('friends.listTitle', { count: view.friends.length })}</h3>
                {view.friends.length === 0 ? (
                    <p className='bt-lead'>{t('friends.empty')}</p>
                ) : (
                    <ul className='bt-history__list'>
                        {view.friends.map((friend) => (
                            <li key={friend.id} className='bt-history__item'>
                                <span>
                                    <b>{friend.name}</b>
                                    <span className='bt-history__date'>{t(friend.battleId ? 'friends.playing' : 'friends.idle')}</span>
                                </span>
                                <span className='bt-friends__actions'>
                                    {friend.battleId && (
                                        <Link to={`/watch/${friend.battleId}`} className='bt-btn bt-btn--small'>
                                            {t('friends.watch')}
                                        </Link>
                                    )}
                                    <button type='button' className='bt-btn bt-btn--small bt-btn--quiet' disabled={isBusy} onClick={() => remove(friend.id)}>
                                        {t('friends.remove')}
                                    </button>
                                </span>
                            </li>
                        ))}
                    </ul>
                )}
                <p className='bt-callout'>{t('friends.inviteHint')}</p>
            </section>
        </div>
    );
}

/** Na sala esperando alguém: a lista de amigos com o botão de convidar. */
export function InviteFriends({ code }: { code: string }) {
    const { t } = useTranslation();
    const { view } = useFriends();
    const [sent, setSent] = useState<string[]>([]);

    if (!view || view.friends.length === 0) return null;

    return (
        <section className='bt-panel bt-friends__invite' aria-label={t('friends.inviteTitle')}>
            <h3 className='bt-subtitle'>{t('friends.inviteTitle')}</h3>
            <ul className='bt-history__list'>
                {view.friends.map((friend) => (
                    <li key={friend.id} className='bt-history__item'>
                        <span>{friend.name}</span>
                        <InviteButton code={code} friendId={friend.id} isSent={sent.includes(friend.id)} onSent={() => setSent((list) => [...list, friend.id])} />
                    </li>
                ))}
            </ul>
        </section>
    );
}

function InviteButton({ code, friendId, isSent, onSent }: { code: string; friendId: string; isSent: boolean; onSent: () => void }) {
    const { t } = useTranslation();
    const [isBusy, setIsBusy] = useState(false);

    return (
        <button
            type='button'
            className='bt-btn bt-btn--small'
            disabled={isBusy || isSent}
            onClick={async () => {
                setIsBusy(true);

                try {
                    await inviteToRoom(code, friendId);
                    onSent();
                } finally {
                    setIsBusy(false);
                }
            }}
        >
            {t(isSent ? 'friends.invited' : 'friends.invite')}
        </button>
    );
}
