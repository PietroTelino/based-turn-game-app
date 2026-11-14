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
    /**
     * idle: fora da fila | searching: procurando adversário | drafting: pareado,
     * escolhendo os personagens | matched: tem uma partida ranqueada em andamento
     */
    status: 'idle' | 'searching' | 'drafting' | 'matched';
    /** A seleção de personagens, enquanto ela acontece. */
    draftId: string | null;
    /** A partida, quando há uma em andamento. */
    battleId: string | null;
    /** Há quanto tempo está procurando, em segundos. */
    waitedSeconds: number;
}

export type DraftTeam = 'A' | 'B';
export type DraftKind = 'ban' | 'pick';

/** Um passo da seleção: de quem é a vez e o que ele faz. */
export interface DraftStep {
    team: DraftTeam;
    kind: DraftKind;
}

/** O que foi feito num passo. `auto`: o tempo acabou e o jogo escolheu pelo jogador. */
export interface DraftAction extends DraftStep {
    characterId: string;
    auto: boolean;
}

/**
 * A seleção de personagens da ranqueada, como você a vê: cada um bane um
 * personagem e depois os dois escolhem alternando, à vista um do outro.
 */
export interface DraftView {
    id: string;
    /** drafting: escolhendo | starting: criando a partida | done: a partida existe */
    status: 'drafting' | 'starting' | 'done';
    /** O seu time. */
    you: DraftTeam;
    /** O nome de quem está em cada time. */
    players: Record<DraftTeam, string>;
    /** A ordem completa dos passos. */
    order: DraftStep[];
    actions: DraftAction[];
    /** O passo da vez e quanto tempo resta nele. `null` quando a seleção acabou. */
    current: { index: number; team: DraftTeam; kind: DraftKind; timeLeftMs: number } | null;
    banned: string[];
    teams: Record<DraftTeam, string[]>;
    /** Na sua vez: os personagens que valem agora. Vazio na vez do outro. */
    choices: string[];
    /** A partida, quando a seleção acaba. */
    battleId: string | null;
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
    /** A temporada atual (ex.: "2026-11") e quando ela acaba. */
    season: { id: string; endsAt: string };
    /** Como você terminou a última temporada em que jogou, e o que ganhou. */
    lastSeason: SeasonResult | null;
}

export interface SeasonResult {
    season: string;
    rating: number;
    rank: RankId;
    wins: number;
    losses: number;
    gold: number;
    diamonds: number;
}

export interface LeaderboardEntry {
    position: number;
    userId: string;
    name: string;
    points: number;
    rank: RankId;
    wins: number;
    losses: number;
}

/** Os melhores da temporada e a sua posição (se você jogou nela). */
export interface Leaderboard {
    season: string;
    endsAt: string;
    entries: LeaderboardEntry[];
    you: { position: number; points: number } | null;
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
