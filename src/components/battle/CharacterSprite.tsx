import type { ReactNode } from 'react';

/**
 * Desenhos de reserva, em SVG direto no código. Aparecem quando o personagem
 * ainda não tem ilustração em src/assets/characters (ver CharacterArt.tsx).
 * Cada desenho ocupa um quadro de 120x120 e olha para a direita; o time
 * inimigo é espelhado pelo CSS.
 *
 * Os nomes abaixo são os ids antigos dos personagens (hoje piromante,
 * cavaleiro, clérigo, bárbaro, criomante e guardião). Todos já têm
 * ilustração, então estes desenhos só aparecem se um arquivo de imagem
 * for apagado.
 */

const INK = '#2a1b3d';

function Eyes({ y, left, right }: { y: number; left: number; right: number }) {
    return (
        <>
            {[left, right].map((x) => (
                <g key={x}>
                    <circle cx={x} cy={y} r={9} fill='#fff' stroke={INK} strokeWidth={3} />
                    <circle cx={x + 2.5} cy={y + 1} r={4} fill={INK} />
                </g>
            ))}
        </>
    );
}

function Smile({ x, y }: { x: number; y: number }) {
    return <path d={`M${x - 8} ${y} Q${x} ${y + 9} ${x + 8} ${y}`} fill='none' stroke={INK} strokeWidth={3.5} strokeLinecap='round' />;
}

const SPRITES: Record<string, ReactNode> = {
    // Chama
    brasa: (
        <>
            <path d='M60 8 C72 30 100 48 100 78 C100 100 82 112 60 112 C38 112 20 100 20 78 C20 58 34 50 40 34 C46 44 50 46 52 40 C54 28 56 18 60 8 Z' fill='#ff6b3d' />
            <path d='M60 62 C70 74 82 80 82 93 C82 106 70 109 60 109 C50 109 38 106 38 93 C38 82 52 76 60 62 Z' fill='#ffc145' stroke='none' />
            <Eyes y={80} left={48} right={72} />
            <Smile x={60} y={95} />
        </>
    ),
    // Pedra
    muralha: (
        <>
            <path d='M26 40 L44 22 L84 20 L100 42 L104 96 Q104 110 90 110 L30 110 Q16 110 16 96 Z' fill='#a99c8d' />
            <path d='M44 22 L52 40 L40 52 M84 20 L80 36 M100 70 L88 78' fill='none' strokeWidth={3} />
            <path d='M36 54 L56 60 M86 54 L66 60' fill='none' strokeWidth={5} strokeLinecap='round' />
            <Eyes y={70} left={46} right={76} />
            <path d='M50 92 L72 92' fill='none' strokeWidth={4} strokeLinecap='round' />
        </>
    ),
    // Nuvem
    brisa: (
        <>
            <path d='M30 98 C10 98 8 70 28 66 C24 42 54 30 68 46 C84 32 110 48 100 70 C116 76 112 100 92 98 Z' fill='#e9f9ff' />
            <path d='M22 26 C34 16 50 22 46 32 C43 39 34 36 36 30' fill='none' strokeWidth={4} strokeLinecap='round' />
            <Eyes y={72} left={52} right={78} />
            <Smile x={65} y={86} />
        </>
    ),
    // Raio
    faisca: (
        <>
            <path d='M60 10 L74 38 L104 30 L88 58 L112 78 L80 82 L78 112 L58 90 L34 110 L36 78 L8 68 L34 52 L24 24 L50 36 Z' fill='#ffd23f' />
            <Eyes y={62} left={50} right={74} />
            <path d='M52 78 L60 84 L68 76 L74 82' fill='none' strokeWidth={3.5} strokeLinecap='round' />
        </>
    ),
    // Cristal de gelo
    geada: (
        <>
            <path d='M60 8 L100 34 L100 84 L60 112 L20 84 L20 34 Z' fill='#a9c9ff' />
            <path d='M60 8 L60 34 L20 34 M60 34 L100 34 M60 112 L60 92' fill='none' stroke='#fff' strokeWidth={3} />
            <Eyes y={64} left={47} right={73} />
            <Smile x={60} y={80} />
        </>
    ),
    // Cacto
    espinho: (
        <>
            <path d='M38 82 L26 82 Q14 82 14 70 L14 56 Q14 50 21 50 Q28 50 28 56 L28 68 L38 68 Z' fill='#5dbb63' />
            <path d='M82 72 L94 72 Q106 72 106 60 L106 46 Q106 40 99 40 Q92 40 92 46 L92 58 L82 58 Z' fill='#5dbb63' />
            <path d='M38 112 L38 40 Q38 16 60 16 Q82 16 82 40 L82 112 Z' fill='#5dbb63' />
            <circle cx={60} cy={14} r={8} fill='#ff7ab6' />
            <Eyes y={54} left={50} right={72} />
            <Smile x={61} y={70} />
        </>
    ),
};

// Personagem que ainda não tem desenho: um bloco neutro, para nada quebrar.
const FALLBACK = (
    <>
        <rect x={20} y={20} width={80} height={90} rx={24} fill='#d9d2e9' />
        <Eyes y={62} left={48} right={72} />
    </>
);

export function CharacterSprite({ characterId, className }: { characterId: string; className?: string }) {
    return (
        <svg
            viewBox='0 0 120 120'
            className={className}
            stroke={INK}
            strokeWidth={5}
            strokeLinejoin='round'
            aria-hidden='true'
        >
            {SPRITES[characterId] ?? FALLBACK}
        </svg>
    );
}
