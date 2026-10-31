import { useTranslation } from 'react-i18next';
import { AI_DIFFICULTIES } from '@/types/battle';
import type { AiDifficulty } from '@/types/battle';

interface DifficultyPickerProps {
    value: AiDifficulty;
    onChange: (difficulty: AiDifficulty) => void;
    disabled?: boolean;
}

/** A escolha do nível da IA: três opções lado a lado, cada uma dizendo como a IA joga. */
export function DifficultyPicker({ value, onChange, disabled = false }: DifficultyPickerProps) {
    const { t } = useTranslation();

    return (
        <fieldset className='bt-difficulty' disabled={disabled}>
            <legend className='bt-difficulty__legend'>{t('difficulty.label')}</legend>

            <div className='bt-difficulty__options'>
                {AI_DIFFICULTIES.map((difficulty) => (
                    <label key={difficulty} className={`bt-difficulty__option bt-difficulty__option--${difficulty}`}>
                        <input
                            type='radio'
                            name='bt-difficulty'
                            value={difficulty}
                            checked={value === difficulty}
                            onChange={() => onChange(difficulty)}
                            className='bt-difficulty__input'
                        />
                        <span className='bt-difficulty__name'>
                            <DifficultyMark difficulty={difficulty} />
                            {t(`difficulty.${difficulty}`)}
                        </span>
                        <span className='bt-difficulty__hint'>{t(`difficulty.hint.${difficulty}`)}</span>
                    </label>
                ))}
            </div>
        </fieldset>
    );
}

/** Um, dois ou três crânios: o nível num relance (nos botões e nas fases vencidas). */
export function DifficultyMark({ difficulty, className = '' }: { difficulty: AiDifficulty; className?: string }) {
    const count = AI_DIFFICULTIES.indexOf(difficulty) + 1;

    return (
        <span className={`bt-difficulty__mark ${className}`} aria-hidden='true'>
            {Array.from({ length: 3 }, (_, index) => (
                <svg key={index} viewBox='0 0 16 16' className={index < count ? 'bt-difficulty__skull bt-difficulty__skull--on' : 'bt-difficulty__skull'}>
                    <path d='M8 1.5C4.4 1.5 2 3.9 2 7c0 1.9.9 3.3 2.3 4.1V13c0 .6.4 1 1 1h5.4c.6 0 1-.4 1-1v-1.9C13.1 10.3 14 8.9 14 7c0-3.1-2.4-5.5-6-5.5Z' />
                    <circle cx='5.7' cy='7.4' r='1.45' className='bt-difficulty__eye' />
                    <circle cx='10.3' cy='7.4' r='1.45' className='bt-difficulty__eye' />
                    <path d='M7.2 10.4 8 9.2l.8 1.2Z' className='bt-difficulty__eye' />
                </svg>
            ))}
        </span>
    );
}
