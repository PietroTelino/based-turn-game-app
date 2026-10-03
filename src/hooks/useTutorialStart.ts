import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { createBattle, getCharacters } from '@/api/battles';
import { sfx } from '@/audio/sfx';
import { TUTORIAL_ENEMY_TEAM, TUTORIAL_TEAM } from '@/battle/tutorial';
import { useToast } from '@/contexts/ToastContext';
import type { Character } from '@/types/battle';

/** Página do tutorial: mostra o time de treino e cria a batalha guiada. */
export function useTutorialStart() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { showToast } = useToast();

    const [team, setTeam] = useState<Character[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [hasError, setHasError] = useState(false);
    const [isStarting, setIsStarting] = useState(false);

    useEffect(() => {
        let cancelled = false;

        getCharacters()
            .then((characters) => {
                if (cancelled) return;

                // Na ordem do time de treino, que é a ordem de entrada em campo.
                setTeam(
                    TUTORIAL_TEAM.map((id) => characters.find((character) => character.id === id)).filter(
                        (character): character is Character => character !== undefined,
                    ),
                );
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

    async function start() {
        if (isStarting) return;

        setIsStarting(true);
        sfx.play('click');

        try {
            const response = await createBattle(TUTORIAL_TEAM, { enemyTeam: TUTORIAL_ENEMY_TEAM, training: true });

            // A tela de batalha é a de sempre: ela mostra o guia porque a batalha vem marcada como treino.
            navigate(`/battle/${response.battle.id}`, { state: { opening: response } });
        } catch (error) {
            const message = (error as { response?: { data?: { message?: string } } }).response?.data?.message;

            showToast(message ?? t('play.startError'), 'error');
            setIsStarting(false);
        }
    }

    return { team, isLoading, hasError, isStarting, start };
}
