import type { DraftView } from '@/types/ranked';

/**
 * Formatos que a API de salas devolve.
 * São o espelho de src/modules/rooms/room.types.ts no repositório da API:
 * se mudar lá, mude aqui.
 */

/**
 * waiting   — só o anfitrião está na sala, esperando alguém entrar.
 * selecting — os dois estão na sala, na seleção de personagens (como na ranqueada).
 * starting  — (salas antigas) a batalha estava sendo criada.
 * started   — a batalha existe (`battleId`).
 * closed    — o anfitrião saiu antes de a batalha começar.
 */
export type RoomStatus = 'waiting' | 'selecting' | 'starting' | 'started' | 'closed';

/** Quem criou a sala é o anfitrião (time A); quem entrou é o convidado (time B). */
export type RoomRole = 'host' | 'guest';

/** A sala como o jogador logado a enxerga. */
export interface RoomView {
    code: string;
    status: RoomStatus;
    role: RoomRole;
    /** Do outro jogador, o nome. `null` enquanto ninguém entrou. */
    opponent: { name: string } | null;
    /** A seleção de personagens, enquanto ela acontece (status "selecting"). Mesmo formato da ranqueada. */
    draft: DraftView | null;
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
