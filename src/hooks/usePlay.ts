import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { createBattle, getCharacters, listBattles } from '@/api/battles';
import { sfx } from '@/audio/sfx';
import { useToast } from '@/contexts/ToastContext';
import type { BattleSummary, Character } from '@/types/battle';

/** Toda batalha é 5 contra 5: o time precisa ter exatamente este número de personagens. */
export const TEAM_SIZE = 5;

/** Tela de montar o time: catálogo, escolha dos personagens e batalhas anteriores. */
export function usePlay() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { showToast } = useToast();

    const [characters, setCharacters] = useState<Character[]>([]);
    const [battles, setBattles] = useState<BattleSummary[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [hasError, setHasError] = useState(false);
    const [team, setTeam] = useState<string[]>([]);
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

    function toggle(characterId: string) {
        sfx.play('select');

        setTeam((current) => {
            if (current.includes(characterId)) {
                return current.filter((id) => id !== characterId);
            }

            return current.length < TEAM_SIZE ? [...current, characterId] : current;
        });
    }

    async function start() {
        if (team.length !== TEAM_SIZE || isStarting) return;

        setIsStarting(true);
        sfx.play('click');

        try {
            const response = await createBattle(team);

            // A resposta vai junto para a tela de batalha animar a abertura.
            navigate(`/battle/${response.battle.id}`, { state: { opening: response } });
        } catch (error) {
            const message = (error as { response?: { data?: { message?: string } } }).response?.data?.message;

            showToast(message ?? t('play.startError'), 'error');
            setIsStarting(false);
        }
    }

    return { characters, battles, isLoading, hasError, team, isStarting, toggle, start };
}
