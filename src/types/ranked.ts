/**
 * Formatos que a API da ranqueada e das estatísticas devolve. São o espelho
 * de src/modules/ranked/ranked.types.ts e src/modules/stats/stats.types.ts no
 * repositório da API: se mudar lá, mude aqui.
 */

/** Do mais baixo para o mais alto. */
export const RANK_IDS = ['bronze', 'silver', 'gold', 'platinum', 'diamond', 'legendary'] as const;

export type RankId = (typeof RANK_IDS)[number];

/** Como o jogador está na fila agora. */
export interface QueueView {
    /** idle: fora da fila | searching: procurando adversário | matched: tem uma partida ranqueada em andamento */
    status: 'idle' | 'searching' | 'matched';
    /** A partida, quando há uma em andamento. */
    battleId: string | null;
    /** Há quanto tempo está procurando, em segundos. */
    waitedSeconds: number;
    /** O time com que entrou na fila, enquanto procura. */
    team: string[] | null;
}

/** A ranqueada como o jogador logado a enxerga: os pontos, o rank e a fila. */
export interface RankedProfile {
    points: number;
    rank: RankId;
    /** Onde o rank atual começa: a barra de progresso vai daqui até `next.at`. */
    rankFloor: number;
    /** O próximo rank e quantos pontos ele pede. `null` para quem já está no mais alto. */
    next: { rank: RankId; at: number } | null;
    wins: number;
    losses: number;
    queue: QueueView;
}

/** Um personagem numa lista de mais usados. */
export interface CharacterUsage {
    characterId: string;
    /** Em quantos times o personagem entrou. */
    picks: number;
    /** A fração dos times em que ele entrou (0.4 = 40% dos times). */
    share: number;
}

/** Uma lista de personagens mais usados, do mais para o menos usado. */
export interface UsageRanking {
    /** Quantos times foram montados no total. */
    teams: number;
    characters: CharacterUsage[];
}

export interface CharacterStats {
    /** Os personagens que você mais usou. */
    mine: UsageRanking;
    /** Os mais usados do jogo todo. São só as contagens: nenhum jogador é identificado. */
    global: UsageRanking;
}
