import { useTranslation } from 'react-i18next';
import { Layout } from '@/components/Layout';
import { ModeTabs } from '@/components/battle/ModeTabs';
import { RankedLobby } from '@/components/battle/RankedLobby';
import { useLobby } from '@/hooks/useLobby';
import '@/styles/battle.css';

/** O código tem sempre este tamanho (CODE_LENGTH em room.service.ts, na API). */
const CODE_LENGTH = 6;

/** As duas abas do multiplayer: cada uma é uma rota. */
export type MultiplayerMode = 'casual' | 'ranked';

/**
 * Multiplayer: jogar contra outras pessoas. Na partida casual, por uma sala
 * com código; na ranqueada, pela fila, valendo pontos.
 */
export function MultiplayerPage({ mode = 'casual' }: { mode?: MultiplayerMode }) {
    const { t } = useTranslation();

    return (
        <Layout title={t('nav.multiplayer')}>
            <div className={mode === 'ranked' ? 'bt bt-play bt-ranked' : 'bt bt-play'}>
                <header>
                    <h2 className='bt-title'>{t('multiplayer.title')}</h2>
                    <p className='bt-lead'>{t('multiplayer.subtitle')}</p>
                </header>

                <ModeTabs
                    label={t('multiplayer.modes')}
                    tabs={[
                        { to: '/multiplayer', label: t('multiplayer.tabs.casual') },
                        { to: '/multiplayer/ranked', label: t('multiplayer.tabs.ranked') },
                    ]}
                />

                {mode === 'ranked' ? <RankedLobby /> : <CasualLobby />}
            </div>
        </Layout>
    );
}

/** A aba casual: criar uma sala, entrar por código ou escolher uma sala aberta. */
function CasualLobby() {
    const { t, i18n } = useTranslation();
    const { rooms, isLoading, hasError, code, setCode, isBusy, create, join } = useLobby();

    return (
        <>
            <p className='bt-lead'>{t('multiplayer.casualLead')}</p>

            <div className='bt-lobby'>
                <section className='bt-panel'>
                    <h3 className='bt-subtitle'>{t('multiplayer.createTitle')}</h3>
                    <p className='bt-panel__text'>{t('multiplayer.createText')}</p>
                    <button type='button' className='bt-btn' disabled={isBusy} onClick={create}>
                        {t('multiplayer.create')}
                    </button>
                </section>

                <section className='bt-panel'>
                    <h3 className='bt-subtitle'>{t('multiplayer.joinTitle')}</h3>
                    <form
                        className='bt-lobby__join'
                        onSubmit={(event) => {
                            event.preventDefault();
                            join(code);
                        }}
                    >
                        <label className='bt-field-label' htmlFor='bt-room-code'>
                            {t('multiplayer.codeLabel')}
                        </label>
                        <div className='bt-lobby__row'>
                            <input
                                id='bt-room-code'
                                className='bt-input bt-input--code'
                                value={code}
                                onChange={(event) => setCode(event.target.value.toUpperCase())}
                                maxLength={CODE_LENGTH}
                                autoComplete='off'
                                autoCapitalize='characters'
                                spellCheck={false}
                            />
                            <button type='submit' className='bt-btn' disabled={isBusy || code.trim().length !== CODE_LENGTH}>
                                {t('multiplayer.join')}
                            </button>
                        </div>
                    </form>
                </section>
            </div>

            <section className='bt-history'>
                <h2 className='bt-subtitle'>{t('multiplayer.openRooms')}</h2>

                {isLoading && <p className='bt-lead'>{t('multiplayer.loading')}</p>}
                {!isLoading && hasError && <p className='bt-message bt-message--error'>{t('multiplayer.loadError')}</p>}
                {!isLoading && !hasError && rooms.length === 0 && <p className='bt-lead'>{t('multiplayer.noRooms')}</p>}

                {rooms.length > 0 && (
                    <ul className='bt-history__list'>
                        {rooms.map((room) => (
                            <li key={room.code} className='bt-history__item'>
                                <span>
                                    <b>{t('multiplayer.roomOf', { name: room.hostName })}</b>
                                    <span className='bt-history__date'>
                                        {new Date(room.createdAt).toLocaleTimeString(i18n.language, { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                </span>
                                <button type='button' className='bt-btn bt-btn--small' disabled={isBusy} onClick={() => join(room.code)}>
                                    {t('multiplayer.enter')}
                                </button>
                            </li>
                        ))}
                    </ul>
                )}
            </section>
        </>
    );
}
