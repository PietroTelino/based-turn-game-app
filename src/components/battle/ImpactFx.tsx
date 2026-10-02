import type { CSSProperties } from 'react';
import type { Impact } from '@/battle/fx';

const PARTICLES = [0, 1, 2, 3, 4, 5];

/**
 * O que acontece em cima de uma unidade quando algo a atinge: o corte, a
 * chama, os cristais de gelo, a luz da cura. É só marcação: o desenho e a
 * animação de cada tipo ficam em battle.css (classes bt-impact--*).
 */
export function ImpactFx({ impact }: { impact: Impact }) {
    const classes = [
        'bt-impact',
        `bt-impact--${impact.kind}`,
        `bt-el--${impact.element}`,
        // O formato muda por elemento só nos golpes; cura e status têm desenho próprio.
        (impact.kind === 'hit' || impact.kind === 'tick') && `bt-impact--${impact.element}`,
        impact.critical && 'bt-impact--crit',
    ]
        .filter(Boolean)
        .join(' ');

    return (
        <span className={classes} aria-hidden='true'>
            {PARTICLES.map((index) => (
                <i key={index} style={{ '--i': index } as CSSProperties} />
            ))}
        </span>
    );
}
