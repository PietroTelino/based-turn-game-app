import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CharacterArt } from '@/components/battle/CharacterArt';
import type { Character } from '@/types/battle';

interface CharacterCardProps {
    character: Character;
    /** Posição no time (0, 1, 2...) ou -1 se não foi escolhido. */
    position: number;
    /** O time já está completo e este personagem não faz parte dele. */
    isLocked: boolean;
    /** O time já foi confirmado (sala do multiplayer): a carta ainda vira, mas não dá para escolher nem tirar. */
    isReadOnly?: boolean;
    onToggle: (characterId: string) => void;
}

/**
 * Carta de personagem da tela de montar o time. A frente mostra a arte e os
 * atributos; o verso, as habilidades. Com mouse, a carta vira ao passar por
 * cima; no toque e no teclado, vira pelo botão do canto.
 */
export function CharacterCard({ character, position, isLocked, isReadOnly = false, onToggle }: CharacterCardProps) {
    const { t } = useTranslation();
    const [isFlipped, setIsFlipped] = useState(false);
    const isSelected = position !== -1;

    return (
        <div
            className={['bt-card', isSelected && 'bt-card--selected', isLocked && 'bt-card--locked', isFlipped && 'bt-card--flipped']
                .filter(Boolean)
                .join(' ')}
        >
            {isSelected && <span className='bt-card__order'>{position + 1}</span>}

            <button type='button' className='bt-card__pick' aria-pressed={isSelected} disabled={isLocked || isReadOnly} onClick={() => onToggle(character.id)}>
                <span className='bt-card__face bt-card__face--front'>
                    <span className='bt-card__art'>
                        <CharacterArt characterId={character.id} kind='card' className='bt-card__sprite' />
                    </span>
                    <span className='bt-card__name'>{character.name}</span>
                    <span className='bt-card__role'>{t(`play.roles.${character.role}`)}</span>
                    <span className='bt-card__stats'>
                        <span>{t('play.stats.hp')} <b>{character.stats.maxHp}</b></span>
                        <span>{t('play.stats.atk')} <b>{character.stats.atk}</b></span>
                        <span>{t('play.stats.def')} <b>{character.stats.def}</b></span>
                        <span>{t('play.stats.speed')} <b>{character.stats.speed}</b></span>
                    </span>
                    <span className='bt-card__hint'>{t('play.skillsOnBack', { count: character.skills.length })}</span>
                </span>

                <span className='bt-card__face bt-card__face--back'>
                    <span className='bt-card__back-title'>
                        <span className='bt-card__back-name'>{character.name}</span>
                        <span className='bt-card__back-label'>{t('play.skills')}</span>
                    </span>
                    <span className='bt-card__skills'>
                        {character.skills.map((skill) => (
                            <span key={skill.id} className='bt-card__skill'>
                                <span className='bt-card__skill-top'>
                                    <span className='bt-card__skill-name'>{skill.name}</span>
                                    <span className={`bt-card__cost ${skill.energyCost === 0 ? 'bt-card__cost--free' : ''}`}>
                                        {skill.energyCost === 0 ? t('battle.free') : t('battle.cost', { count: skill.energyCost })}
                                    </span>
                                </span>
                                <span className='bt-card__skill-text'>{skill.description}</span>
                            </span>
                        ))}
                    </span>
                </span>
            </button>

            <button
                type='button'
                className='bt-card__flip'
                aria-pressed={isFlipped}
                aria-label={t('play.flip', { name: character.name })}
                title={t('play.flip', { name: character.name })}
                onClick={() => setIsFlipped((current) => !current)}
            >
                <svg viewBox='0 0 24 24' width='18' height='18' aria-hidden='true'>
                    <path
                        d='M4 12a8 8 0 0 1 13.7-5.7L20 8.5M20 4v4.5h-4.5M20 12a8 8 0 0 1-13.7 5.7L4 15.5M4 20v-4.5h4.5'
                        fill='none'
                        stroke='currentColor'
                        strokeWidth='2.2'
                        strokeLinecap='round'
                        strokeLinejoin='round'
                    />
                </svg>
            </button>
        </div>
    );
}
