import { useTranslation } from 'react-i18next';
import { CharacterSprite } from './CharacterSprite';
import type { LogEntry } from '@/hooks/useBattle';
import type { AvailableAction, BattleUnit } from '@/types/battle';

const MAX_ENERGY = 8;

/** Energia do time, desenhada como gemas. */
export function EnergyPips({ value, label }: { value: number; label: string }) {
    return (
        <span className='bt-energy' role='img' aria-label={`${label}: ${value}`}>
            {Array.from({ length: MAX_ENERGY }, (_, index) => (
                <span key={index} className={`bt-energy__pip ${index < value ? 'bt-energy__pip--full' : ''}`} />
            ))}
        </span>
    );
}

/** Fila dos próximos a jogar. O primeiro é quem está na vez. */
export function TurnQueue({ order, units }: { order: string[]; units: BattleUnit[] }) {
    const { t } = useTranslation();

    return (
        <ol className='bt-queue' aria-label={t('battle.queue')}>
            {order.map((unitId, index) => {
                const unit = units.find((u) => u.id === unitId);

                if (!unit) return null;

                return (
                    <li key={`${unitId}-${index}`} className={`bt-queue__item bt-queue__item--${unit.team}`} title={unit.name}>
                        <CharacterSprite characterId={unit.characterId} className='bt-queue__sprite' />
                        <span className='bt-visually-hidden'>{unit.name}</span>
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
            {actions.map(({ skill, usable }) => {
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
