import { useTranslation } from 'react-i18next';
import { CharacterArt } from './CharacterArt';
import type { LogEntry } from '@/hooks/useBattle';
import type { AvailableAction, BattleUnit } from '@/types/battle';

/** O máximo de energia que um turno pode dar. É o mesmo valor de MAX_ENERGY na API. */
const MAX_ENERGY = 10;

interface EnergyPipsProps {
    /** Quanto o time ainda tem para gastar neste turno. */
    value: number;
    /** Com quanto o time começou este turno. */
    turnEnergy: number;
    label: string;
}

/**
 * Energia do time, desenhada como gemas, com o número ao lado ("3/10").
 * São sempre dez gemas: as cheias são a energia disponível, as vazias são o
 * que já foi gasto neste turno e as apagadas ainda não foram liberadas (a
 * energia do turno cresce 1 por turno).
 */
export function EnergyPips({ value, turnEnergy, label }: EnergyPipsProps) {
    return (
        <span className='bt-energy' role='img' aria-label={`${label}: ${value}/${MAX_ENERGY}`}>
            <span className='bt-energy__pips'>
                {Array.from({ length: MAX_ENERGY }, (_, index) => {
                    const status = index < value ? 'full' : index < turnEnergy ? 'spent' : 'locked';

                    return <span key={index} className={`bt-energy__pip bt-energy__pip--${status}`} />;
                })}
            </span>
            <span className='bt-energy__count'>
                {value}/{MAX_ENERGY}
            </span>
        </span>
    );
}

interface TurnQueueProps {
    /** A ordem de ação do turno atual, do primeiro ao último. */
    order: string[];
    activeUnitId: string | null;
    units: BattleUnit[];
    /** A batalha acabou: ninguém mais vai agir. */
    isOver: boolean;
    /** A ordem acabou de mudar no meio do turno: a fila pisca para chamar atenção. */
    justChanged: boolean;
}

/**
 * A ordem de ação do turno. Quem já agiu fica apagado, quem está na vez fica
 * em destaque e quem foi derrotado aparece em cinza. Se a velocidade de
 * alguém muda no meio do turno, quem ainda não agiu troca de lugar aqui.
 */
export function TurnQueue({ order, activeUnitId, units, isOver, justChanged }: TurnQueueProps) {
    const { t } = useTranslation();
    const activeIndex = activeUnitId === null ? -1 : order.indexOf(activeUnitId);

    return (
        <ol className={justChanged ? 'bt-queue bt-queue--changed' : 'bt-queue'} aria-label={t('battle.queue')}>
            {order.map((unitId, index) => {
                const unit = units.find((u) => u.id === unitId);

                if (!unit) return null;

                let status: 'down' | 'active' | 'done' | 'waiting' = 'waiting';

                // Sem ninguém na vez: ou o turno acabou de começar (todos ainda
                // vão agir) ou a batalha acabou (ninguém mais age).
                if (unit.hp <= 0) status = 'down';
                else if (index === activeIndex) status = 'active';
                else if (activeIndex === -1 ? isOver : index < activeIndex) status = 'done';

                return (
                    <li
                        key={unitId}
                        className={`bt-queue__item bt-queue__item--${unit.team} bt-queue__item--${status}`}
                        title={unit.name}
                    >
                        <CharacterArt characterId={unit.characterId} kind='face' className='bt-queue__sprite' />
                        <span className='bt-visually-hidden'>
                            {unit.name}: {t(`battle.queueStatus.${status}`)}
                        </span>
                    </li>
                );
            })}
        </ol>
    );
}

interface SkillBarProps {
    actions: AvailableAction[];
    selectedSkillId: string | null;
    disabled: boolean;
    onSelect: (skillId: string) => void;
}

export function SkillBar({ actions, selectedSkillId, disabled, onSelect }: SkillBarProps) {
    const { t } = useTranslation();

    return (
        <div className='bt-skills'>
            {actions.map(({ skill, preview, usable }) => {
                const isSelected = !disabled && skill.id === selectedSkillId;

                return (
                    <button
                        key={skill.id}
                        type='button'
                        className={`bt-skill ${isSelected ? 'bt-skill--selected' : ''}`}
                        disabled={disabled || !usable}
                        aria-pressed={isSelected}
                        onClick={() => onSelect(skill.id)}
                    >
                        <span className='bt-skill__top'>
                            <span className='bt-skill__name'>{skill.name}</span>
                            <span className='bt-skill__cost'>
                                {skill.energyCost === 0 ? t('battle.free') : t('battle.cost', { count: skill.energyCost })}
                            </span>
                        </span>
                        <span className='bt-skill__text'>{!usable && !disabled ? t('battle.notEnoughEnergy') : skill.description}</span>
                        {/* Dano e cura base: sem a defesa do alvo, com o ataque atual de quem usa. */}
                        {(preview.damage !== null || preview.heal !== null) && (
                            <span className='bt-skill__numbers'>
                                {preview.damage !== null && (
                                    <span className='bt-skill__number bt-skill__number--damage'>
                                        {t('battle.baseDamage')} <b>{preview.damage}</b>
                                    </span>
                                )}
                                {preview.heal !== null && (
                                    <span className='bt-skill__number bt-skill__number--heal'>
                                        {t('battle.baseHeal')} <b>{preview.heal}</b>
                                    </span>
                                )}
                            </span>
                        )}
                    </button>
                );
            })}
        </div>
    );
}

export function BattleLog({ entries }: { entries: LogEntry[] }) {
    const { t } = useTranslation();

    return (
        <section className='bt-log' aria-label={t('battle.log.title')}>
            <h2 className='bt-log__title'>{t('battle.log.title')}</h2>
            {entries.length === 0 ? (
                <p className='bt-log__empty'>{t('battle.log.empty')}</p>
            ) : (
                <ol className='bt-log__list'>
                    {entries.map((entry) => (
                        <li key={entry.id} className={`bt-log__item ${entry.team ? `bt-log__item--${entry.team}` : 'bt-log__item--end'}`}>
                            {entry.text}
                        </li>
                    ))}
                </ol>
            )}
        </section>
    );
}
