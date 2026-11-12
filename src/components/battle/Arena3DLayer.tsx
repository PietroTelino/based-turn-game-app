import { useEffect, useRef, useState } from 'react';
import type { Arena3D } from '@/battle/arena3d';
import type { Impact, SkillFx } from '@/battle/fx';

interface Arena3DLayerProps {
    skill: SkillFx | null;
    impacts: Impact[];
    quake: boolean;
}

/**
 * A camada 3D da arena (battle/arena3d.ts): a pintura do cenário, que acompanha
 * a câmera, e o canvas com os modelos 3D, as sombras, as luzes e as partículas.
 * Fica no começo da arena, atrás das placas e do resto da tela.
 *
 * Se o navegador não tiver WebGL, a camada não liga e a batalha continua com
 * as figuras desenhadas pela página, como antes.
 */
export function Arena3DLayer({ skill, impacts, quake }: Arena3DLayerProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const backdropRef = useRef<HTMLDivElement>(null);
    const [engine, setEngine] = useState<Arena3D | null>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        const backdrop = backdropRef.current;
        const arena = canvas?.closest<HTMLElement>('.bt-arena');
        let created: Arena3D | null = null;
        let cancelled = false;

        if (!canvas || !backdrop || !arena) return;

        // O Three.js só é baixado quando a batalha abre: as outras telas não pagam por ele.
        import('@/battle/arena3d')
            .then(async ({ Arena3D }) => {
                if (cancelled) return;

                created = new Arena3D(arena, canvas, backdrop);
                // As figuras 2D só somem quando o modelo 3D já chegou.
                await created.preload();

                if (cancelled) return;

                // Um atributo, e não uma classe: o React reescreve as classes da arena a cada mudança.
                arena.dataset.scene3d = 'on';
                created.start();
                // Em desenvolvimento, a cena fica acessível no console (window.__arena) para depurar.
                if (import.meta.env.DEV) (window as unknown as { __arena?: Arena3D }).__arena = created;
                setEngine(created);
            })
            // Sem WebGL (ou se o arquivo não carregar), a batalha segue com as figuras da página.
            .catch(() => undefined);

        return () => {
            cancelled = true;
            delete arena.dataset.scene3d;
            created?.dispose();
            setEngine(null);
        };
    }, []);

    useEffect(() => engine?.setSkill(skill), [engine, skill]);
    useEffect(() => engine?.setImpacts(impacts, quake), [engine, impacts, quake]);

    return (
        <>
            <div ref={backdropRef} className='bt-arena__backdrop' aria-hidden='true' />
            <canvas ref={canvasRef} className='bt-arena__canvas' aria-hidden='true' />
        </>
    );
}
