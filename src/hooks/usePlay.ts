import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { createBattle, getCharacters, listBattles } from '@/api/battles';
import type { CreateBattleOptions } from '@/api/battles';
import { sfx } from '@/audio/sfx';
import { useToast } from '@/contexts/ToastContext';
import type { BattleSummary, Character } from '@/types/battle';

/** Toda batalha é 5 contra 5: o time precisa ter exatamente este número de personagens. */
export const TEAM_SIZE = 5;

/**
 * As abas de partida contra a IA: o catálogo de personagens, as batalhas
 * anteriores e a criação da batalha quando a seleção de personagens acaba.
 */
export function usePlay() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { showToast } = useToast();

    const [characters, setCharacters] = useState<Character[]>([]);
    const [battles, setBattles] = useState<BattleSummary[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [hasError, setHasError] = useState(false);
    const [isStarting, setIsStarting] = useState(false);

    useEffect(() => {
        let cancelled = false;

        Promise.all([getCharacters(), listBattles()])
            .then(([loadedCharacters, loadedBattles]) => {
                if (cancelled) return;

                setCharacters(loadedCharacters);
                setBattles(loadedBattles);
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

    /**
     * Cria a batalha contra a IA com os times da seleção. `options`: o nível
     * da IA, o time dela (partida rápida) ou a fase (campanha). Devolve
     * `false` se não deu certo (o aviso já apareceu).
     */
    async function start(team: string[], options: Pick<CreateBattleOptions, 'difficulty' | 'campaignStage' | 'enemyTeam' | 'towerFloor'> = {}): Promise<boolean> {
        if (team.length !== TEAM_SIZE || isStarting) return false;

        setIsStarting(true);
        sfx.play('click');

        try {
            const response = await createBattle(team, options);

            // A resposta vai junto para a tela de batalha animar a abertura.
            navigate(`/battle/${response.battle.id}`, { state: { opening: response } });

            return true;
        } catch (error) {
            const message = (error as { response?: { data?: { message?: string } } }).response?.data?.message;

            showToast(message ?? t('play.startError'), 'error');
            setIsStarting(false);

            return false;
        }
    }

    return { characters, battles, isLoading, hasError, isStarting, start };
}
