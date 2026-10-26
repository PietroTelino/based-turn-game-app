import { useTranslation } from 'react-i18next';
import { CharacterArt } from './CharacterArt';
import { ImpactFx } from './ImpactFx';
import { StatusBadges } from './StatusBadges';
import type { Impact, SkillFx } from '@/battle/fx';
import { bonusOf } from '@/battle/passives';
import type { Floater } from '@/hooks/useBattle';
import type { BattleUnit, TargetPreview } from '@/types/battle';

interface UnitTokenProps {
    unit: BattleUnit;
    /** Todas as unidades da batalha: há passiva que conta o que acontece no outro time. */
    units: BattleUnit[];
    isActive: boolean;
    /** A habilidade que esta unidade está usando agora, se for ela a da vez. */
    acting: SkillFx | null;
    isHit: boolean;
    isHealed: boolean;
    /** Acabou de mudar de forma: a figura nova surge num clarão. */
    isMorphing: boolean;
    /** Acabou de ser derrotada: anima a queda. */
    isFalling: boolean;
    isTargetable: boolean;
    /** O que a habilidade selecionada faria nesta unidade (só quando ela é um alvo possível). */
    preview: TargetPreview | null;
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
export function UnitToken({ unit, units, isActive, acting, isHit, isHealed, isMorphing, isFalling, isTargetable, preview, impact, floaters, onSelect }: UnitTokenProps) {
    const { t } = useTranslation();
    const ratio = unit.hp / unit.stats.maxHp;
    const isDown = unit.hp <= 0;
    const statuses = unit.statuses ?? [];
    const shield = statuses.find((status) => status.kind === 'shield');
    const charge = isDown ? null : bonusOf(unit, units);
    /** A vida que o golpe tira de fato: o que o escudo segura não sai da vida. */
    const hpLoss = preview?.damage != null ? preview.damage - preview.absorbed : null;
    const previewText =
        hpLoss !== null ? t('battle.preview.damage', { amount: hpLoss }) : preview?.heal ? t('battle.preview.heal', { amount: preview.heal }) : null;

    const classes = [
        'bt-unit',
        isActive && 'bt-unit--active',
        // Corpo a corpo avança no alvo; o resto conjura no lugar, na cor do elemento.
        acting && (acting.delivery === 'melee' ? 'bt-unit--acting' : `bt-unit--casting bt-el--${acting.element}`),
        isHit && 'bt-unit--hit',
        isHealed && 'bt-unit--healed',
        isMorphing && 'bt-unit--morphing',
        isTargetable && 'bt-unit--target',
        isDown && 'bt-unit--down',
        isFalling && 'bt-unit--falling',
        shield && 'bt-unit--shielded',
        statuses.some((status) => status.kind === 'stun') && 'bt-unit--stunned',
        // Escondida: a figura fica quase transparente até ela agir ou levar dano.
        statuses.some((status) => status.kind === 'stealth') && 'bt-unit--hidden',
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
                ...(charge
                    ? [
                          charge.kind === 'corpses'
                              ? t('battle.corpsesHelp', { passive: charge.passive.name, count: charge.count })
                              : t('battle.passiveCharge', { passive: charge.passive.name, percent: charge.percent }),
                      ]
                    : []),
                ...(previewText ? [previewText] : []),
                ...(preview?.defeats ? [t('battle.preview.defeats')] : []),
            ].join('. ')}
        >
            {/* A figura é maior que a área clicável e passa por cima das vizinhas. */}
            <span className='bt-unit__stage'>
                <span className='bt-unit__shadow' aria-hidden='true' />
                <CharacterArt characterId={unit.characterId} form={unit.form} kind='figure' className='bt-unit__sprite' />

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
                {/*
                 * Prévia: quanto a habilidade selecionada tira (ou cura) desta
                 * unidade, com o crítico e o escudo. Aparece ao parar o mouse em
                 * cima (veja .bt-preview no CSS).
                 * Aliado com a vida cheia não mostra nada: a cura não faria nada.
                 */}
                {preview && (hpLoss !== null || (preview.heal ?? 0) > 0) && (
                    <span
                        className={['bt-preview', hpLoss === null && 'bt-preview--heal', preview.defeats && 'bt-preview--defeats'].filter(Boolean).join(' ')}
                        aria-hidden='true'
                    >
                        {preview.defeats && <span className='bt-preview__tag'>{t('battle.preview.defeats')}</span>}
                        <span className='bt-preview__amount'>{hpLoss !== null ? `−${hpLoss}` : `+${preview.heal}`}</span>
                        {preview.absorbed > 0 && <span className='bt-preview__detail bt-preview__detail--shield'>{t('battle.preview.shield', { amount: preview.absorbed })}</span>}
                        {preview.critDamage !== null && preview.critChance > 0 && preview.critDamage !== preview.damage && (
                            <span className='bt-preview__detail'>
                                {t('battle.preview.crit', { amount: preview.critDamage, chance: Math.round(preview.critChance * 100) })}
                            </span>
                        )}
                    </span>
                )}
                {/* Nome comprido (Guerreiro Esqueleto) quebra em duas linhas menores em vez de ser cortado. */}
                <span className={unit.name.length > 12 ? 'bt-unit__name bt-unit__name--long' : 'bt-unit__name'}>{unit.name}</span>
                <span className='bt-hp'>
                    <span className='bt-hp__fill' style={{ width: `${Math.max(0, ratio) * 100}%`, background: hpColor(ratio) }} />
                </span>
                <span className='bt-hp__text'>
                    {unit.hp}/{unit.stats.maxHp}
                    {shield && <span className='bt-hp__shield'> +{shield.value}</span>}
                </span>
                <StatusBadges statuses={statuses} charge={charge} />
            </span>
        </button>
    );
}
