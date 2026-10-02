import { useLayoutEffect, useRef } from 'react';
import type { CSSProperties } from 'react';
import type { SkillFx } from '@/battle/fx';

const AREA_PARTICLES = [0, 1, 2, 3, 4, 5];

interface Box {
    left: number;
    top: number;
    width: number;
    height: number;
}

/** Posição do "palco" de uma unidade, em pixels, relativa à camada de efeitos. */
function stageBox(arena: Element, layer: DOMRect, unitId: string): Box | null {
    const rect = arena.querySelector(`[data-unit-id="${unitId}"] .bt-unit__stage`)?.getBoundingClientRect();

    if (!rect) return null;

    return { left: rect.left - layer.left, top: rect.top - layer.top, width: rect.width, height: rect.height };
}

/**
 * Camada por cima do campo onde voam os projéteis e acontecem os ataques em
 * área. O que atinge cada unidade (corte, chama, cura...) é desenhado dentro
 * da própria unidade, em UnitToken.
 *
 * As posições vêm de onde as unidades estão na tela neste instante: o efeito
 * mede e escreve as coordenadas em variáveis CSS, e o CSS anima.
 */
export function FxLayer({ skill }: { skill: SkillFx | null }) {
    const layerRef = useRef<HTMLDivElement>(null);

    useLayoutEffect(() => {
        const layer = layerRef.current;
        const arena = layer?.parentElement;

        if (!layer || !arena || !skill) return;

        const bounds = layer.getBoundingClientRect();
        const source = stageBox(arena, bounds, skill.sourceId);

        if (!source) return;

        // De onde o golpe sai: a mão de quem lança, um pouco à frente do corpo.
        const targets = skill.targetIds.map((id) => stageBox(arena, bounds, id)).filter((box) => box !== null);
        const first = targets[0];

        if (!first) return;

        const facing = first.left + first.width / 2 >= source.left + source.width / 2 ? 1 : -1;
        const x0 = source.left + source.width / 2 + facing * source.width * 0.45;
        const y0 = source.top + source.height * 0.36;

        layer.style.setProperty('--fx-dir', String(facing));

        layer.querySelectorAll<HTMLElement>('.bt-proj').forEach((projectile, index) => {
            const target = targets[index];

            if (!target) return;

            const x1 = target.left + target.width / 2;
            const y1 = target.top + target.height * 0.42;

            projectile.style.setProperty('--x0', `${x0}px`);
            projectile.style.setProperty('--y0', `${y0}px`);
            projectile.style.setProperty('--x1', `${x1}px`);
            projectile.style.setProperty('--y1', `${y1}px`);
            projectile.style.setProperty('--angle', `${Math.atan2(y1 - y0, x1 - x0)}rad`);
        });

        const area = layer.querySelector<HTMLElement>('.bt-area');

        if (area) {
            const left = Math.min(...targets.map((box) => box.left));
            const top = Math.min(...targets.map((box) => box.top));
            const right = Math.max(...targets.map((box) => box.left + box.width));
            const bottom = Math.max(...targets.map((box) => box.top + box.height));
            const centerX = (left + right) / 2;
            const centerY = (top + bottom) / 2;

            area.style.setProperty('--left', `${left}px`);
            area.style.setProperty('--top', `${top}px`);
            area.style.setProperty('--width', `${right - left}px`);
            area.style.setProperty('--height', `${bottom - top}px`);
            // Para a onda de choque, que nasce em quem usou e cresce até os alvos.
            area.style.setProperty('--sx', `${source.left + source.width / 2}px`);
            area.style.setProperty('--sy', `${source.top + source.height * 0.45}px`);
            area.style.setProperty('--reach', `${Math.hypot(centerX - x0, centerY - y0) + (right - left) / 2}px`);
        }
    }, [skill]);

    return (
        <div ref={layerRef} className='bt-fx' aria-hidden='true'>
            {skill?.delivery === 'projectile' &&
                skill.targetIds.map((targetId) => (
                    <span key={`${skill.id}-${targetId}`} className={`bt-proj bt-el--${skill.element}`} />
                ))}

            {skill?.delivery === 'area' && (
                <span key={skill.id} className={`bt-area bt-area--${skill.element} bt-el--${skill.element}`}>
                    {AREA_PARTICLES.map((index) => (
                        <i key={index} style={{ '--i': index } as CSSProperties} />
                    ))}
                </span>
            )}
        </div>
    );
}
