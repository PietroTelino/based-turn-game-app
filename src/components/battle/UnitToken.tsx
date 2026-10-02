import { useTranslation } from 'react-i18next';
import { CharacterSprite } from './CharacterSprite';
import { StatusBadges } from './StatusBadges';
import type { Floater } from '@/hooks/useBattle';
import type { BattleUnit } from '@/types/battle';

interface UnitTokenProps {
    unit: BattleUnit;
    isActive: boolean;
    isActing: boolean;
    isHit: boolean;
    isHealed: boolean;
    isTargetable: boolean;
    floaters: Floater[];
    onSelect: (unitId: string) => void;
}

function hpColor(ratio: number): string {
    if (ratio > 0.5) return 'var(--bt-good)';
    if (ratio > 0.25) return 'var(--bt-sun)';
    return 'var(--bt-enemy)';
}

/** Uma unidade no campo: desenho, nome, barra de vida e os números que sobem. */
export function UnitToken({ unit, isActive, isActing, isHit, isHealed, isTargetable, floaters, onSelect }: UnitTokenProps) {
    const { t } = useTranslation();
    const ratio = unit.hp / unit.stats.maxHp;
    const isDown = unit.hp <= 0;
    const statuses = unit.statuses ?? [];
    const shield = statuses.find((status) => status.kind === 'shield');

    const classes = [
        'bt-unit',
        isActive && 'bt-unit--active',
        isActing && 'bt-unit--acting',
        isHit && 'bt-unit--hit',
        isHealed && 'bt-unit--healed',
        isTargetable && 'bt-unit--target',
        isDown && 'bt-unit--down',
        shield && 'bt-unit--shielded',
        statuses.some((status) => status.kind === 'stun') && 'bt-unit--stunned',
    ]
        .filter(Boolean)
        .join(' ');

    return (
        <button
            type='button'
            className={classes}
            disabled={!isTargetable}
            onClick={() => onSelect(unit.id)}
            aria-label={[
                unit.name,
                t('battle.hp', { hp: unit.hp, max: unit.stats.maxHp }),
                ...statuses.map((status) => t(`battle.status.${status.kind}`)),
            ].join('. ')}
        >
            {isActive && <span className='bt-unit__marker' aria-hidden='true' />}

            <span className='bt-unit__floaters' aria-hidden='true'>
                {floaters.map((floater) => (
                    <span key={floater.id} className={`bt-floater bt-floater--${floater.kind}`}>
                        {floater.text}
                    </span>
                ))}
            </span>

            <CharacterSprite characterId={unit.characterId} className='bt-unit__sprite' />
            <span className='bt-unit__shadow' aria-hidden='true' />

            <span className='bt-unit__plate'>
                <span className='bt-unit__name'>{unit.name}</span>
                <span className='bt-hp'>
                    <span className='bt-hp__fill' style={{ width: `${Math.max(0, ratio) * 100}%`, background: hpColor(ratio) }} />
                </span>
                <span className='bt-hp__text'>
                    {unit.hp}/{unit.stats.maxHp}
                    {shield && <span className='bt-hp__shield'> +{shield.value}</span>}
                </span>
                <StatusBadges statuses={statuses} />
            </span>
        </button>
    );
}
