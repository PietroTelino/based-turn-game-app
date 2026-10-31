import { useEffect, useState } from 'react';
import { getCampaign } from '@/api/battles';
import type { CampaignStage } from '@/types/battle';

/**
 * As fases da campanha e qual está escolhida. Ao carregar, já vem escolhida a
 * primeira fase aberta que o jogador ainda não venceu (ou a última aberta, se
 * venceu todas): é por onde ele continua.
 */
export function useCampaign() {
    const [stages, setStages] = useState<CampaignStage[]>([]);
    const [selected, setSelected] = useState<number | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [hasError, setHasError] = useState(false);

    useEffect(() => {
        let cancelled = false;

        getCampaign()
            .then((loaded) => {
                if (cancelled) return;

                const open = loaded.filter((stage) => stage.unlocked);
                const next = open.find((stage) => stage.clearedOn.length === 0) ?? open[open.length - 1];

                setStages(loaded);
                setSelected(next?.stage ?? null);
            })
            .catch(() => {
                if (!cancelled) setHasError(true);
            })
            .finally(() => {
                if (!cancelled) setIsLoading(false);
            });

        return () => {
            cancelled = true;
        };
    }, []);

    /** Escolhe a fase, se ela estiver aberta. */
    function select(stage: number) {
        if (stages.some((item) => item.stage === stage && item.unlocked)) {
            setSelected(stage);
        }
    }

    return { stages, selected: stages.find((stage) => stage.stage === selected) ?? null, isLoading, hasError, select };
}
