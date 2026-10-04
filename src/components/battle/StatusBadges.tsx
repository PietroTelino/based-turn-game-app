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
    // Sangramento: três cortes de garra.
    bleed: (
        <>
            <path d='M6 3 L9.5 3 L6.5 21 L3 21 Z' fill='#c2352b' />
            <path d='M12 3 L15.5 3 L12.5 21 L9 21 Z' fill='#c2352b' />
            <path d='M18 3 L21.5 3 L18.5 21 L15 21 Z' fill='#c2352b' />
        </>
    ),
    // Escondido: um olho riscado.
    stealth: (
        <>
            <path d='M1.5 12 C5 6 9 4.5 12 4.5 C15 4.5 19 6 22.5 12 C19 18 15 19.5 12 19.5 C9 19.5 5 18 1.5 12 Z' fill='#cfc7e8' />
            <circle cx='12' cy='12' r='3.4' fill={INK} stroke='none' />
            <path d='M4 20.5 L20 3.5' fill='none' stroke={INK} strokeWidth={3} strokeLinecap='round' />
        </>
    ),
    // Cura reduzida: uma cruz de cura riscada.
    heal_down: (
        <>
            <path d='M9 3 L15 3 L15 9 L21 9 L21 15 L15 15 L15 21 L9 21 L9 15 L3 15 L3 9 L9 9 Z' fill='#7fb069' />
            <path d='M4 20 L20 4' fill='none' stroke='#c2352b' strokeWidth={3.4} strokeLinecap='round' />
        </>
    ),
    // Transformado: uma pegada.
    form: (
        <>
            <path d='M12 11 C16 11 19.5 14.5 19.5 18 C19.5 21 16.5 21.5 12 21.5 C7.5 21.5 4.5 21 4.5 18 C4.5 14.5 8 11 12 11 Z' fill='#8a6a3a' />
            <circle cx='5' cy='9.5' r='2.4' fill='#8a6a3a' />
            <circle cx='9.5' cy='5' r='2.4' fill='#8a6a3a' />
            <circle cx='14.5' cy='5' r='2.4' fill='#8a6a3a' />
            <circle cx='19' cy='9.5' r='2.4' fill='#8a6a3a' />
        </>
    ),
    // Provocação: um alvo, porque é nela que os inimigos têm de mirar.
    taunt: (
        <>
            <circle cx='12' cy='12' r='9.5' fill='#e0503a' />
            <circle cx='12' cy='12' r='5.2' fill='#fff4dc' stroke='none' />
            <circle cx='12' cy='12' r='2.2' fill='#e0503a' stroke='none' />
        </>
    ),
    // Contra-ataque: duas espadas cruzadas.
    counter: (
        <>
            <path d='M4 3 L7.5 3 L20.5 16 L20.5 20.5 L16 20.5 L3 7.5 Z' fill='#d9dde6' />
            <path d='M20 3 L16.5 3 L3.5 16 L3.5 20.5 L8 20.5 L21 7.5 Z' fill='#f1c75b' />
        </>
    ),
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
const HELPFUL: StatusKind[] = ['shield', 'atk_up', 'def_up', 'speed_up', 'passive_up', 'taunt', 'form', 'stealth', 'counter'];

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
    const dealsDamage = status.kind === 'burn' || status.kind === 'poison' || status.kind === 'bleed';
    const help = t(`battle.statusHelp.${status.kind}`, {
        value: dealsDamage ? tickDamageOf(status) : status.value,
        percent: Math.round(status.value * 100),
    });
    // Dano que cresce: a dica diz quanto ele sobe por turno.
    const growing = status.growth ? ` ${t('battle.statusHelp.growing', { amount: Math.round(status.value * status.growth) })}` : '';
    const turns = t('battle.turns', { count: status.turns });
    const tone = HELPFUL.includes(status.kind) ? 'good' : 'bad';

    return (
        // Selo de atributo tem texto e seta: ocupa duas casas da grade.
        <span className={`bt-status bt-status--${tone}${arrow ? ' bt-status--wide' : ''}`} title={`${name}. ${help}${growing} ${turns}.`}>
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
 * A coluna de status embaixo da placa de uma unidade: uma grade de selos da largura da placa.
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
            {charge?.kind === 'corpses' && (
                <span className='bt-status bt-status--good bt-status--charge' title={t('battle.corpsesHelp', { passive: charge.passive.name, count: charge.count })}>
                    <svg viewBox='0 0 24 24' className='bt-status__icon' stroke={INK} strokeWidth={2.4} strokeLinejoin='round' aria-hidden='true'>
                        {/* Caveira: os aliados caídos que ainda podem ser erguidos. */}
                        <path d='M12 2.5 C6.5 2.5 3.5 6.5 3.5 11 C3.5 14 5 16 7 17 L7 21 L17 21 L17 17 C19 16 20.5 14 20.5 11 C20.5 6.5 17.5 2.5 12 2.5 Z' fill='#e9e2cf' />
                        <circle cx='8.5' cy='11.5' r='2.2' fill={INK} stroke='none' />
                        <circle cx='15.5' cy='11.5' r='2.2' fill={INK} stroke='none' />
                    </svg>
                    <span aria-hidden='true'>{charge.count}</span>
                    <span className='bt-visually-hidden'>{t('battle.corpsesHelp', { passive: charge.passive.name, count: charge.count })}</span>
                </span>
            )}
            {charge && charge.kind !== 'corpses' && (
                <span
                    className={`bt-status bt-status--good bt-status--charge ${charge.percent >= 100 ? 'bt-status--xwide' : 'bt-status--wide'}`}
                    title={t('battle.passiveCharge', { passive: charge.passive.name, percent: charge.percent })}
                >
                    <svg viewBox='0 0 24 24' className='bt-status__icon' stroke={INK} strokeWidth={2.4} strokeLinejoin='round' aria-hidden='true'>
                        {charge.kind === 'stacks' ? (
                            // Gota de sangue: cargas acumuladas com roubo de vida.
                            <path d='M12 2.5 C15.5 8 19 11.5 19 15.5 C19 19.5 15.8 22 12 22 C8.2 22 5 19.5 5 15.5 C5 11.5 8.5 8 12 2.5 Z' fill='#c2352b' />
                        ) : charge.kind === 'hunt' ? (
                            // Garras: um tanto a mais para cada inimigo sangrando.
                            <>
                                <path d='M6 3 L9.5 3 L6.5 21 L3 21 Z' fill='#ffb020' />
                                <path d='M12 3 L15.5 3 L12.5 21 L9 21 Z' fill='#ffb020' />
                                <path d='M18 3 L21.5 3 L18.5 21 L15 21 Z' fill='#ffb020' />
                            </>
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
