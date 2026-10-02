import { useTranslation } from 'react-i18next';
import { CharacterArt } from './CharacterArt';
import { ImpactFx } from './ImpactFx';
import { StatusBadges } from './StatusBadges';
import type { Impact, SkillFx } from '@/battle/fx';
import type { Floater } from '@/hooks/useBattle';
import type { BattleUnit } from '@/types/battle';

interface UnitTokenProps {
    unit: BattleUnit;
    isActive: boolean;
    /** A habilidade que esta unidade está usando agora, se for ela a da vez. */
    acting: SkillFx | null;
    isHit: boolean;
    isHealed: boolean;
    /** Acabou de ser derrotada: anima a queda. */
    isFalling: boolean;
    isTargetable: boolean;
    impact: Impact | null;
    floaters: Floater[];
    onSelect: (unitId: string) => void;
}

function hpColor(ratio: number): string {
    if (ratio > 0.5) return 'var(--bt-good)';
    if (ratio > 0.25) return 'var(--bt-sun)';
    return 'var(--bt-enemy)';
}

/** Uma unidade no campo: desenho, nome, barra de vida e os números que sobem. */
export function UnitToken({ unit, isActive, acting, isHit, isHealed, isFalling, isTargetable, impact, floaters, onSelect }: UnitTokenProps) {
    const { t } = useTranslation();
    const ratio = unit.hp / unit.stats.maxHp;
    const isDown = unit.hp <= 0;
    const statuses = unit.statuses ?? [];
    const shield = statuses.find((status) => status.kind === 'shield');

    const classes = [
        'bt-unit',
        isActive && 'bt-unit--active',
        // Corpo a corpo avança no alvo; o resto conjura no lugar, na cor do elemento.
        acting && (acting.delivery === 'melee' ? 'bt-unit--acting' : `bt-unit--casting bt-el--${acting.element}`),
        isHit && 'bt-unit--hit',
        isHealed && 'bt-unit--healed',
        isTargetable && 'bt-unit--target',
        isDown && 'bt-unit--down',
        isFalling && 'bt-unit--falling',
        shield && 'bt-unit--shielded',
        statuses.some((status) => status.kind === 'stun') && 'bt-unit--stunned',
    ]
        .filter(Boolean)
        .join(' ');

    return (
        <button
            type='button'
            className={classes}
            data-unit-id={unit.id}
            disabled={!isTargetable}
            onClick={() => onSelect(unit.id)}
            aria-label={[
                unit.name,
                t('battle.hp', { hp: unit.hp, max: unit.stats.maxHp }),
                ...statuses.map((status) => t(`battle.status.${status.kind}`)),
            ].join('. ')}
        >
            {/* A figura é maior que a área clicável e passa por cima das vizinhas. */}
            <span className='bt-unit__stage'>
                <span className='bt-unit__shadow' aria-hidden='true' />
                <CharacterArt characterId={unit.characterId} kind='figure' className='bt-unit__sprite' />

                {impact && <ImpactFx key={impact.id} impact={impact} />}

                {isActive && <span className='bt-unit__marker' aria-hidden='true' />}

                <span className='bt-unit__floaters' aria-hidden='true'>
                    {floaters.map((floater) => (
                        <span key={floater.id} className={`bt-floater bt-floater--${floater.kind}`}>
                            {floater.label && <span className='bt-floater__label'>{floater.label}</span>}
                            {floater.text}
                        </span>
                    ))}
                </span>
            </span>

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
