import { useTranslation } from 'react-i18next';
import type { RankId } from '@/types/ranked';

/** As duas cores do escudo de cada rank (clara em cima, escura embaixo) e a da joia do meio. */
const COLORS: Record<RankId, { light: string; dark: string; gem: string }> = {
    bronze: { light: '#d59a63', dark: '#8a5326', gem: '#f3c79a' },
    silver: { light: '#e6eaf0', dark: '#8a93a3', gem: '#ffffff' },
    gold: { light: '#f7dc6f', dark: '#b8860b', gem: '#fff6c9' },
    platinum: { light: '#a8ece4', dark: '#2f8f8a', gem: '#e9fffb' },
    diamond: { light: '#b3d9ff', dark: '#2f62c0', gem: '#f1f8ff' },
    legendary: { light: '#ff8f6b', dark: '#7a1f6b', gem: '#ffe9a8' },
};

const INK = '#1c1a2b';

interface RankBadgeProps {
    rank: RankId;
    /** Só o desenho, sem o nome ao lado (o nome fica como texto alternativo). */
    iconOnly?: boolean;
    className?: string;
}

/**
 * O emblema de um rank: um escudo na cor do rank, com uma joia no meio. Do
 * Ouro para cima ganha louros dos lados; o Lendário, uma coroa.
 */
export function RankBadge({ rank, iconOnly = false, className = '' }: RankBadgeProps) {
    const { t } = useTranslation();
    const { light, dark, gem } = COLORS[rank];
    const name = t(`ranked.ranks.${rank}`);
    const hasLaurels = rank === 'gold' || rank === 'platinum' || rank === 'diamond' || rank === 'legendary';
    // Cada emblema na página precisa do seu próprio id de degradê.
    const gradientId = `bt-rank-${rank}`;

    return (
        <span className={`bt-rank bt-rank--${rank} ${className}`}>
            <svg viewBox='0 0 48 52' className='bt-rank__icon' role='img' aria-label={name}>
                <defs>
                    <linearGradient id={gradientId} x1='0' y1='0' x2='0' y2='1'>
                        <stop offset='0' stopColor={light} />
                        <stop offset='1' stopColor={dark} />
                    </linearGradient>
                </defs>
                {hasLaurels && (
                    <g fill={dark} stroke={INK} strokeWidth={1.2} strokeLinejoin='round'>
                        <path d='M6 20 C1 26 2 36 9 42 C8 35 8 27 6 20 Z' />
                        <path d='M42 20 C47 26 46 36 39 42 C40 35 40 27 42 20 Z' />
                    </g>
                )}
                <path
                    d='M24 5 L40 10 L40 26 C40 36 33 43 24 47 C15 43 8 36 8 26 L8 10 Z'
                    fill={`url(#${gradientId})`}
                    stroke={INK}
                    strokeWidth={2.4}
                    strokeLinejoin='round'
                />
                <path d='M24 10 L35.5 13.6 L35.5 26 C35.5 33 30.5 38.4 24 41.6 Z' fill='#ffffff' opacity={0.22} />
                <path d='M24 16 L31 25 L24 34 L17 25 Z' fill={gem} stroke={INK} strokeWidth={1.8} strokeLinejoin='round' />
                {rank === 'legendary' && (
                    <path d='M14 8 L16 1.5 L20.5 5.5 L24 0.8 L27.5 5.5 L32 1.5 L34 8 Z' fill='#ecd07a' stroke={INK} strokeWidth={1.6} strokeLinejoin='round' />
                )}
            </svg>
            {!iconOnly && <span className='bt-rank__name'>{name}</span>}
        </span>
    );
}
