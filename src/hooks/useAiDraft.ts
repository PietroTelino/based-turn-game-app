import { useEffect, useRef, useState } from 'react';
import { sfx } from '@/audio/sfx';
import type { Character } from '@/types/battle';
import type { DraftAction, DraftStep, DraftTeam, DraftView } from '@/types/ranked';

/**
 * A ordem da seleção contra a IA: a mesma da ranqueada, sem os banimentos.
 * O jogador (A) começa, e depois cada um escolhe dois de cada vez.
 */
export const AI_DRAFT_ORDER: DraftStep[] = (['A', 'B', 'B', 'A', 'A', 'B', 'B', 'A', 'A', 'B'] as const).map((team) => ({ team, kind: 'pick' }));

/** Quanto a IA "pensa" antes de cada escolha, em ms: o bastante para o jogador ver quem ela pegou. */
const AI_PICK_MS = 800;

interface AiDraftInput {
    characters: Character[];
    /**
     * As escolhas da IA, na ordem (a campanha: o time da fase). Sem isto, a
     * IA sorteia a cada vez, sem repetir no time dela.
     */
    aiTeam?: string[];
    /** Os nomes que aparecem na seleção: o do jogador e o da IA. */
    names: Record<DraftTeam, string>;
    /** A seleção acabou: os dois times, na ordem das escolhas. */
    onComplete: (team: string[], enemyTeam: string[]) => void;
    /** Os personagens que o jogador já desbloqueou. Sem isto, todos. A IA escolhe entre todos. */
    owned?: string[];
}

/**
 * A seleção de personagens contra a IA, toda neste navegador. Monta o mesmo
 * DraftView que a ranqueada recebe da API, para a tela ser a mesma
 * (DraftBoard). Como na ranqueada, o mesmo personagem pode estar nos dois
 * times, mas não duas vezes no mesmo.
 */
export function useAiDraft({ characters, aiTeam, names, onComplete, owned }: AiDraftInput) {
    const [actions, setActions] = useState<DraftAction[]>([]);
    const completedRef = useRef(false);
    // O último onComplete: o efeito de fim não precisa recomeçar quando a função muda.
    const onCompleteRef = useRef(onComplete);

    useEffect(() => {
        onCompleteRef.current = onComplete;
    });

    const index = actions.length;
    const step = AI_DRAFT_ORDER[index] ?? null;
    const teamOf = (team: DraftTeam) => actions.filter((action) => action.team === team).map((action) => action.characterId);
    const teams: Record<DraftTeam, string[]> = { A: teamOf('A'), B: teamOf('B') };
    const isOver = step === null;

    // A vez da IA: escolhe depois de um instante.
    useEffect(() => {
        if (!step || step.team !== 'B') return;

        const timer = window.setTimeout(() => {
            setActions((current) => {
                // Outra escolha já entrou (a tela pode chamar o efeito duas vezes em desenvolvimento).
                if (current.length !== index) return current;

                const taken = current.filter((action) => action.team === 'B').map((action) => action.characterId);
                const fixed = aiTeam?.[taken.length];
                const pool = characters.filter((character) => !taken.includes(character.id));
                const characterId = fixed ?? pool[Math.floor(Math.random() * pool.length)]?.id;

                if (!characterId) return current;

                sfx.play('select');

                return [...current, { team: 'B', kind: 'pick', characterId, auto: false }];
            });
        }, AI_PICK_MS);

        return () => window.clearTimeout(timer);
    }, [step, index, aiTeam, characters]);

    // Fim da seleção: avisa uma vez só.
    useEffect(() => {
        if (!isOver || completedRef.current) return;

        completedRef.current = true;
        onCompleteRef.current(
            actions.filter((action) => action.team === 'A').map((action) => action.characterId),
            actions.filter((action) => action.team === 'B').map((action) => action.characterId),
        );
    }, [isOver, actions]);

    const isMyTurn = step?.team === 'A';
    const draft: DraftView = {
        id: 'ai',
        status: isOver ? 'starting' : 'drafting',
        you: 'A',
        players: names,
        order: AI_DRAFT_ORDER,
        actions,
        current: step ? { index, team: step.team, kind: step.kind, timeLeftMs: 0 } : null,
        banned: [],
        teams,
        choices: isMyTurn ? characters.filter((character) => !teams.A.includes(character.id) && (!owned || owned.includes(character.id))).map((character) => character.id) : [],
        battleId: null,
    };

    /** O jogador escolhe na vez dele. */
    function choose(characterId: string) {
        if (!isMyTurn || teams.A.includes(characterId)) return;

        sfx.play('click');
        setActions((current) => (current.length === index ? [...current, { team: 'A', kind: 'pick', characterId, auto: false }] : current));
    }

    return { draft, choose };
}
