/**
 * Formatos que a API de salas devolve.
 * São o espelho de src/modules/rooms/room.types.ts no repositório da API:
 * se mudar lá, mude aqui.
 */

/**
 * waiting   — só o anfitrião está na sala, esperando alguém entrar.
 * selecting — os dois estão na sala, escolhendo os times.
 * starting  — os dois avisaram que estão prontos; a batalha está sendo criada.
 * started   — a batalha existe (`battleId`).
 * closed    — o anfitrião saiu antes de a batalha começar.
 */
export type RoomStatus = 'waiting' | 'selecting' | 'starting' | 'started' | 'closed';

/** Quem criou a sala é o anfitrião; quem entrou é o convidado. */
export type RoomRole = 'host' | 'guest';

/** A sala como o jogador logado a enxerga. O time do outro nunca vem aqui. */
export interface RoomView {
    code: string;
    status: RoomStatus;
    role: RoomRole;
    you: {
        ready: boolean;
        /** O time que você confirmou, enquanto estiver pronto. */
        team: string[] | null;
    };
    /** Do outro jogador só se sabe o nome e se ele já está pronto. `null` enquanto ninguém entrou. */
    opponent: { name: string; ready: boolean } | null;
    /** Preenchido quando a batalha começa: é para lá que a tela vai. */
    battleId: string | null;
    createdAt: string;
}

/** Uma sala na lista de salas abertas. */
export interface OpenRoom {
    code: string;
    hostName: string;
    createdAt: string;
}
