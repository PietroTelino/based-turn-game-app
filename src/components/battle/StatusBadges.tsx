import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import type { PassiveCharge } from '@/battle/passives';
import type { StatusEffect, StatusKind } from '@/types/battle';

const INK = '#2a1b3d';

/** Desenho de cada status. Os modificadores de atributo usam uma seta e uma sigla. */
const ICONS: Partial<Record<StatusKind, ReactNode>> = {
    stun: <path d='M12 2 L14.6 8.6 L21.5 9 L16.2 13.4 L18 20.2 L12 16.5 L6 20.2 L7.8 13.4 L2.5 9 L9.4 8.6 Z' fill='#ffd23f' />,
    burn: <path d='M12 2 C14 7 19 9.5 19 15 C19 19.5 15.5 22 12 22 C8.5 22 5 19.5 5 15 C5 11.5 7.5 10.5 8.5 7.5 C9.8 9.5 10.8 9.2 12 2 Z' fill='#ff6b3d' />,
    poison: <path d='M12 2.5 C15.5 8 19 11.5 19 15.5 C19 19.5 15.8 22 12 22 C8.2 22 5 19.5 5 15.5 C5 11.5 8.5 8 12 2.5 Z' fill='#a565e8' />,
    shield: <path d='M12 2 L20 5 L20 12 C20 17 16.5 20.5 12 22 C7.5 20.5 4 17 4 12 L4 5 Z' fill='#5aa2ff' />,
    // Passiva fortalecida: um brilho de quatro pontas.
    passive_up: <path d='M12 1.5 L14.6 9.4 L22.5 12 L14.6 14.6 L12 22.5 L9.4 14.6 L1.5 12 L9.4 9.4 Z' fill='#ecd07a' />,
};

const ARROWS: Partial<Record<StatusKind, { stat: 'atk' | 'def' | 'speed'; up: boolean }>> = {
    atk_up: { stat: 'atk', up: true },
    atk_down: { stat: 'atk', up: false },
    def_up: { stat: 'def', up: true },
    def_down: { stat: 'def', up: false },
    speed_up: { stat: 'speed', up: true },
    speed_down: { stat: 'speed', up: false },
};

/** Status que ajudam quem os carrega. Os outros atrapalham. */
const HELPFUL: StatusKind[] = ['shield', 'atk_up', 'def_up', 'speed_up', 'passive_up'];

/**
 * Quanto um status de dano por turno vai causar na próxima vez. Num status
 * que cresce (o veneno do Guardião), é o valor original mais o crescimento de
 * cada turno que já passou. Mesma conta da API (`getStatusTickDamage`).
 */
function tickDamageOf(status: StatusEffect): number {
    return Math.max(1, Math.round(status.value * (1 + (status.growth ?? 0) * (status.ticks ?? 0))));
}

function StatusBadge({ status }: { status: StatusEffect }) {
    const { t } = useTranslation();
    const arrow = ARROWS[status.kind];
    const name = t(`battle.status.${status.kind}`);
    const dealsDamage = status.kind === 'burn' || status.kind === 'poison';
    const help = t(`battle.statusHelp.${status.kind}`, {
        value: dealsDamage ? tickDamageOf(status) : status.value,
        percent: Math.round(status.value * 100),
    });
    // Dano que cresce: a dica diz quanto ele sobe por turno.
    const growing = status.growth ? ` ${t('battle.statusHelp.growing', { amount: Math.round(status.value * status.growth) })}` : '';
    const turns = t('battle.turns', { count: status.turns });
    const tone = HELPFUL.includes(status.kind) ? 'good' : 'bad';

    return (
        <span className={`bt-status bt-status--${tone}`} title={`${name}. ${help}${growing} ${turns}.`}>
            {arrow ? (
                <>
                    <span className='bt-status__stat'>{t(`battle.statShort.${arrow.stat}`)}</span>
                    <svg viewBox='0 0 12 12' className='bt-status__arrow' aria-hidden='true'>
                        <path d={arrow.up ? 'M6 1.5 L11 10 L1 10 Z' : 'M6 10.5 L11 2 L1 2 Z'} fill='currentColor' />
                    </svg>
                </>
            ) : (
                <svg viewBox='0 0 24 24' className='bt-status__icon' stroke={INK} strokeWidth={2.4} strokeLinejoin='round' aria-hidden='true'>
                    {ICONS[status.kind]}
                </svg>
            )}
            <span className='bt-status__turns' aria-hidden='true'>
                {status.turns}
            </span>
            <span className='bt-visually-hidden'>{`${name}, ${turns}`}</span>
        </span>
    );
}

/**
 * A fileira de status embaixo da barra de vida de uma unidade.
 * Fica no lugar mesmo vazia, para o desenho não pular quando um status chega.
 */
interface StatusBadgesProps {
    statuses: StatusEffect[];
    /** O bônus de dano que a passiva da unidade está dando agora, se ela tem uma que varia: um selo a mais, sem prazo. */
    charge?: PassiveCharge | null;
}

export function StatusBadges({ statuses, charge = null }: StatusBadgesProps) {
    const { t } = useTranslation();

    return (
        <span className='bt-statuses'>
            {charge && (
                <span className='bt-status bt-status--good bt-status--charge' title={t('battle.passiveCharge', { passive: charge.passive.name, percent: charge.percent })}>
                    <svg viewBox='0 0 24 24' className='bt-status__icon' stroke={INK} strokeWidth={2.4} strokeLinejoin='round' aria-hidden='true'>
                        {charge.kind === 'stacks' ? (
                            // Gota de sangue: cargas acumuladas com roubo de vida.
                            <path d='M12 2.5 C15.5 8 19 11.5 19 15.5 C19 19.5 15.8 22 12 22 C8.2 22 5 19.5 5 15.5 C5 11.5 8.5 8 12 2.5 Z' fill='#c2352b' />
                        ) : (
                            // Raio: quanto mais ferido, mais forte.
                            <path d='M13.5 1.5 L4.5 13.5 L11 13.5 L9.5 22.5 L19.5 9.5 L13 9.5 Z' fill='#ffb020' />
                        )}
                    </svg>
                    <span aria-hidden='true'>+{charge.percent}%</span>
                    <span className='bt-visually-hidden'>{t('battle.passiveCharge', { passive: charge.passive.name, percent: charge.percent })}</span>
                </span>
            )}
            {statuses.map((status) => (
                <StatusBadge key={status.kind} status={status} />
            ))}
        </span>
    );
}
