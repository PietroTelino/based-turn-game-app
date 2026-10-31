/**
 * Formatos que a API de batalhas devolve.
 * São o espelho de src/game/types.ts e src/modules/battles/battle.types.ts
 * no repositório da API: se mudar lá, mude aqui.
 */

export type TeamId = 'A' | 'B';

export interface Stats {
    maxHp: number;
    atk: number;
    def: number;
    speed: number;
    critChance: number;
    critDamage: number;
}

/** 'corpse' é o cadáver de um aliado (unidade derrotada do próprio time que ainda não foi erguida): o jogador escolhe qual, como num alvo único. */
export type TargetType = 'single-enemy' | 'all-enemies' | 'single-ally' | 'all-allies' | 'self' | 'corpse';

export type StatusKind =
    | 'stun'
    | 'burn'
    | 'poison'
    | 'shield'
    | 'atk_up'
    | 'atk_down'
    | 'def_up'
    | 'def_down'
    | 'speed_up'
    | 'speed_down'
    /** A passiva de começo de vez da unidade cura e causa dano mais forte (0.8 = 80% a mais). */
    | 'passive_up'
    /** Provocação: os golpes de alvo único dos inimigos só podem mirar em quem a carrega. */
    | 'taunt'
    /** Sangramento: dano por turno, como queimadura e veneno, mas um status à parte. */
    | 'bleed'
    /** A unidade recebe menos cura, de qualquer origem (0.6 = 60% a menos). */
    | 'heal_down'
    /** Escondida: os inimigos não podem escolhê-la como alvo até ela agir ou levar dano. */
    | 'stealth'
    /** Contra-ataque: todo golpe que a unidade leva de um inimigo é revidado com o ataque básico dela. */
    | 'counter'
    /** A unidade está transformada; quando acaba, ela volta à forma original. */
    | 'form'
    /** Protegida: os golpes de alvo único dos inimigos nela vão para quem aplicou o status (`sourceId`). */
    | 'guard'
    /** Dormindo: perde a próxima vez e acorda; um golpe também acorda, e causa 50% a mais. */
    | 'sleep'
    /** Torpor: quando a duração acaba, a unidade adormece. */
    | 'drowsy'
    /** Maldição de quem aplicou (`sourceId`): dano por turno, e os golpes de alvo único dela não miram nele enquanto houver outro alvo. */
    | 'curse'
    /** Contagem do sono, na própria Súcubo: `turns` é quantas vezes dela faltam; no começo da vez em que ela chega ao fim, todos os inimigos adormecem. Nada a remove. */
    | 'countdown';

export interface StatusEffect {
    kind: StatusKind;
    /** Quantos turnos o status ainda dura. Gasta um cada vez que a unidade termina a própria vez. */
    turns: number;
    /** Dano por turno, pontos de escudo ou fração do atributo, conforme o tipo. */
    value: number;
    sourceId: string;
    /** Permanente: não gasta duração (`turns` não conta). A maldição da Súcubo. */
    permanent?: boolean;
    /**
     * Só no dano por turno que cresce (o veneno do Guardião): a fração do valor
     * original que o dano sobe a cada turno, e quantas vezes ele já causou
     * dano. O dano da próxima vez é `value x (1 + growth x ticks)`.
     */
    growth?: number;
    ticks?: number;
    appliedOnStep: number;
}

export type SkillEffect =
    /** `perTargetMissingHp`: essa porcentagem a mais de dano para cada 1% de vida que o alvo já perdeu. */
    /** `bounces`: o golpe salta para essa quantidade de outros inimigos sorteados, `falloff` mais fraco a cada salto. */
    | { type: 'damage'; power: number; drain?: number; perTargetMissingHp?: number; bounces?: number; falloff?: number }
    | { type: 'heal'; power: number }
    | { type: 'status'; status: StatusKind; turns: number; power: number; chance?: number; to?: 'target' | 'self'; permanent?: boolean }
    /** Purificação: tira do alvo os efeitos negativos. */
    | { type: 'cleanse' }
    /** Muda o alvo para uma das formas dele (`form` é o id em `forms`) por `turns` turnos. */
    | { type: 'transform'; form: string; turns: number }
    /** Ergue o cadáver de um aliado como uma invocação de quem usou (`summon` é o id em `summons`). */
    | { type: 'summon'; summon: string }
    /** Tira do alvo os efeitos que o ajudam (todos, ou só os de `statuses`). */
    | { type: 'dispel'; statuses?: StatusKind[] }
    /** Dá energia ao time (`own`) ou tira do adversário (`enemy`), uma vez por ação. */
    | { type: 'energy'; amount: number; team: 'own' | 'enemy' }
    /** Traz de volta o aliado caído, com `ratio` da vida máxima. */
    | { type: 'revive'; ratio: number };

/** Só escolhe o efeito visual e o som; não entra em nenhuma conta. */
export type SkillElement = 'physical' | 'fire' | 'ice' | 'lightning' | 'nature' | 'light' | 'shadow' | 'sound';

export interface Skill {
    id: string;
    name: string;
    description: string;
    energyCost: number;
    target: TargetType;
    effects: SkillEffect[];
    /** Ausente em batalhas gravadas antes de os elementos existirem. */
    element?: SkillElement;
    /** Golpe à distância: num alvo só, um projétil; em área, uma chuva de projéteis. */
    ranged?: boolean;
    /** Quantas vezes pode ser usada na batalha inteira (sem o campo, sem limite). */
    uses?: number;
}

/** Quando uma passiva de golpe vale, olhando para o alvo. Sem condição, vale sempre. */
export type PassiveCondition =
    /** `fromSelf`: só o status aplicado por quem tem a passiva. */
    | { type: 'target_has_status'; statuses: StatusKind[]; fromSelf?: boolean }
    | { type: 'target_hp_below'; ratio: number }
    | { type: 'target_hp_above'; ratio: number };

/**
 * O que a passiva faz. Quem aplica é a API; a tela só precisa saber se é uma
 * passiva que age sozinha (`turn_start`, no começo da vez, ou `battle_start`,
 * no começo da batalha), para animar o golpe ou a cura dela.
 */
export type PassiveEffect =
    | { type: 'damage_bonus'; amount: number; when?: PassiveCondition }
    | { type: 'crit_chance_bonus'; amount: number; when?: PassiveCondition }
    | { type: 'ignore_defense'; amount: number }
    | { type: 'atk_from_def'; amount: number }
    | { type: 'lifesteal'; amount: number }
    | { type: 'energy_on_crit'; amount: number }
    /** Todo golpe também aplica este status no alvo (com `when`, só nos alvos que cumprem a condição antes do golpe). */
    | { type: 'status_on_hit'; status: StatusKind; turns: number; power: number; chance?: number; permanent?: boolean; when?: PassiveCondition }
    /** Acumula cargas: cada cura por roubo de vida soma `amount` ao dano dos golpes (0.05 = +5%). */
    | { type: 'damage_per_drain'; amount: number; max?: number }
    /** Para cada 1% de vida perdida, `amount`% a mais de dano. */
    | { type: 'damage_per_missing_hp'; amount: number }
    /** `amount` a mais de dano para cada inimigo vivo com algum dos `statuses` (0.1 = +10% por inimigo). */
    | { type: 'damage_per_enemy_status'; statuses: StatusKind[]; amount: number }
    | { type: 'status_power'; statuses: StatusKind[]; amount: number }
    /** O dano por turno desses status cresce `amount` do valor original a cada turno que o alvo segue com eles. */
    | { type: 'status_growth'; statuses: StatusKind[]; amount: number }
    /** Ao se transformar, a unidade age de novo na mesma vez. */
    | { type: 'extra_action_on_transform' }
    /** Conta os cadáveres do time; o número vem em `passiveStacks`. */
    | { type: 'count_corpses' }
    /** Todo turno a unidade começa escondida (status `stealth`). */
    | { type: 'stealth_each_turn' }
    /** No começo da batalha (só no turno 1), aplica os efeitos em todos os inimigos. */
    | { type: 'battle_start'; target: 'all-enemies'; effects: SkillEffect[] }
    /** Começa a batalha com uma contagem de `turns` na unidade; no começo da vez dela em que a contagem acaba, aplica os efeitos em todos os inimigos. */
    | { type: 'countdown'; turns: number; target: 'all-enemies'; effects: SkillEffect[] }
    | { type: 'turn_start'; target: 'all-allies' | 'fastest-enemy' | 'lowest-ally'; effects: SkillEffect[] }
    /** Acumula cargas: cada efeito tirado de um inimigo soma `amount` ao dano dos golpes. */
    | { type: 'damage_per_dispel'; amount: number; max?: number }
    /** Os golpes de todo o time causam `amount` a mais nos alvos que cumprem `when`. */
    | { type: 'team_damage_bonus'; amount: number; when: PassiveCondition }
    /** No começo da vez, se o time está sem energia, recupera `amount`. */
    | { type: 'energy_when_empty'; amount: number };

/** Habilidade que ninguém usa: vale sozinha para o personagem que a tem. */
export interface Passive {
    id: string;
    name: string;
    description: string;
    effect: PassiveEffect;
    /** Outros efeitos da mesma passiva, quando ela faz mais de uma coisa. */
    also?: PassiveEffect[];
    element?: SkillElement;
    ranged?: boolean;
}

export type CharacterRole = 'attacker' | 'tank' | 'support' | 'assassin' | 'mage' | 'fighter' | 'shapeshifter';

/**
 * Uma forma em que o personagem pode se transformar (o urso e o lobo do
 * Druida): na forma, ele troca atributos, habilidades e passivas pelos dela.
 * A ilustração da forma é procurada em "<personagem>-<forma>".
 */
export interface Form {
    id: string;
    name: string;
    stats: Stats;
    skills: Skill[];
    passives: Passive[];
}

export interface Character {
    id: string;
    name: string;
    role: CharacterRole;
    stats: Stats;
    skills: Skill[];
    passives: Passive[];
    /** As formas em que ele se transforma. A maioria não tem. */
    forms?: Form[];
    /** O que ele invoca (o Guerreiro Esqueleto do Necromante), no mesmo formato de uma forma. */
    summons?: Form[];
}

export interface BattleUnit {
    id: string;
    characterId: string;
    name: string;
    team: TeamId;
    stats: Stats;
    hp: number;
    /** Ausente em batalhas gravadas antes de os status existirem. */
    statuses?: StatusEffect[];
    skills: Skill[];
    /** Ausente em batalhas gravadas antes de as passivas existirem. */
    passives?: Passive[];
    /** O número que a passiva da unidade guarda: cargas acumuladas ou cadáveres do time. */
    passiveStacks?: number;
    /** Só em quem invoca: as invocações dele. */
    summons?: Form[];
    /** A unidade foi invocada (um esqueleto erguido no lugar de um aliado derrotado). */
    summoned?: boolean;
    /**
     * Só em quem se transforma: o id da forma atual (ausente = a original),
     * todas as formas e a original (id 'base'). Transformada, a unidade já vem
     * com `stats`, `skills` e `passives` da forma.
     */
    form?: string;
    forms?: Form[];
    baseForm?: Form;
}

export interface BattleState {
    units: BattleUnit[];
    /** Energia que cada time ainda tem para gastar neste turno. */
    energy: Record<TeamId, number>;
    /** Com quanta energia os dois times começaram este turno (3 no turno 1, mais 1 por turno, até 10). */
    turnEnergy: number;
    activeUnitId: string | null;
    /** Turno atual: uma rodada em que cada unidade viva age uma vez. Começa em 1. */
    turn: number;
    /**
     * Berserk (a "fúria" do motor): quanto o dano das habilidades está aumentado
     * neste turno. 0 = ainda não começou, 0.5 = +50%, 1 = +100%.
     */
    fury: number;
    /**
     * Ordem de ação do turno atual. Quem vem antes de `activeUnitId` já agiu.
     * Pode mudar no meio do turno, se a velocidade de alguém mudar.
     */
    order: string[];
    /** Contador de vezes da batalha inteira; só cresce. */
    step: number;
    winner: TeamId | null;
    /** Preenchido quando a batalha acabou porque um time desistiu. */
    surrenderedBy?: TeamId;
    /** A desistência foi por tempo esgotado: numa ranqueada, o time de `surrenderedBy` passou do prazo sem jogar. */
    timedOut?: boolean;
    /** Batalha de treino (o tutorial): a IA joga fraco e a tela mostra o guia. */
    training?: boolean;
    /** O cenário, sorteado pela API quando a batalha é criada. Batalhas antigas não têm: vale a muralha. */
    arena?: ArenaId;
    /** Contra a IA: o nível dela. Batalhas antigas não têm: vale o normal. */
    difficulty?: AiDifficulty;
    /** Batalha da campanha: a fase (1, 2...). */
    campaignStage?: number;
}

/** O nível da IA nas partidas single player. */
export type AiDifficulty = 'easy' | 'normal' | 'hard';

/** Os níveis, do mais fácil ao mais difícil (é a ordem dos botões). */
export const AI_DIFFICULTIES: AiDifficulty[] = ['easy', 'normal', 'hard'];

/** Uma fase da campanha como a API devolve: contra quem, onde e o que o jogador já fez nela. */
export interface CampaignStage {
    stage: number;
    /** O nome da fase nas traduções (campaign.stages.<key>). */
    key: string;
    arena: ArenaId;
    /** Os personagens do time inimigo, na ordem. */
    enemyTeam: string[];
    /** Dá para jogar: é a primeira fase ou a anterior já foi vencida. */
    unlocked: boolean;
    /** Os níveis em que o jogador já venceu a fase. */
    clearedOn: AiDifficulty[];
}

/** Os cenários possíveis (a imagem de cada um fica em src/assets/scenery). */
export type ArenaId = 'muralha' | 'floresta' | 'lago-gelado';

export type BattleEvent =
    /** Um turno novo começou, com a ordem de ação dele e a energia que os dois times recebem. */
    | { type: 'turn_started'; turn: number; order: string[]; energy: number; fury: number }
    /** A velocidade de alguém mudou e quem ainda não agiu foi reordenado. */
    | { type: 'order_changed'; order: string[] }
    /** Chegou a vez de uma unidade. */
    | { type: 'unit_activated'; unitId: string; team: TeamId }
    | { type: 'skill_used'; unitId: string; skillId: string; targetIds: string[]; team: TeamId; energy: number }
    /** `unitId` (com o status `counter`) revida o golpe de `targetIds[0]` com o ataque básico `skillId`, fora da vez. */
    | { type: 'counter_attack'; unitId: string; skillId: string; targetIds: string[] }
    | { type: 'damage'; sourceId: string; targetId: string; amount: number; absorbed: number; critical: boolean; hp: number }
    | { type: 'heal'; sourceId: string; targetId: string; amount: number; hp: number }
    | { type: 'status_applied'; sourceId: string; targetId: string; status: StatusKind; turns: number; value: number }
    | { type: 'status_damage'; targetId: string; status: StatusKind; amount: number; hp: number }
    | { type: 'status_expired'; unitId: string; status: StatusKind }
    /** `sourceId` purificou `targetId`: `statuses` são os efeitos negativos que saíram. */
    | { type: 'cleansed'; sourceId: string; targetId: string; statuses: StatusKind[] }
    | { type: 'statuses_changed'; unitId: string; statuses: StatusEffect[] }
    /** A unidade perdeu a vez (atordoada). */
    | { type: 'unit_skipped'; unitId: string; status: StatusKind }
    | { type: 'unit_defeated'; unitId: string }
    /** A unidade mudou de forma (`form` null = voltou à original). `hp` é a vida dela depois da troca. */
    | { type: 'transformed'; unitId: string; form: string | null; hp: number }
    /** `sourceId` ergueu um cadáver: no lugar da unidade `unitId` entra `unit`, a invocação, com o mesmo id. */
    | { type: 'summoned'; sourceId: string; unitId: string; unit: BattleUnit }
    /** A vez da unidade não acabou: ela age de novo. */
    | { type: 'extra_action'; unitId: string }
    /**
     * A passiva de uma unidade fez diferença agora. Numa passiva de começo de
     * vez, `targetIds` é quem ela atingiu; numa passiva de golpe, o alvo do golpe.
     */
    | { type: 'passive_triggered'; unitId: string; passiveId: string; targetIds: string[]; /** Passiva que acumula: quantas cargas ela tem agora. */ stacks?: number }
    /** O time recuperou energia no meio do turno, por causa de `unitId`. `energy` é quanto ele tem agora. */
    | { type: 'energy_gained'; team: TeamId; unitId: string; amount: number; energy: number }
    /** O time `team` perdeu energia por causa de `unitId`, do outro time. */
    | { type: 'energy_lost'; team: TeamId; unitId: string; amount: number; energy: number }
    /** `sourceId` tirou de `targetId` os efeitos que o ajudavam. */
    | { type: 'dispelled'; sourceId: string; targetId: string; statuses: StatusKind[] }
    /** O golpe de `sourceId` saltou de `fromId` para `toId`. */
    | { type: 'chain_jump'; sourceId: string; fromId: string; toId: string }
    /** O golpe que mirava em `protectedId` foi para `unitId`, que o protege. */
    | { type: 'guarded'; unitId: string; protectedId: string }
    /** `sourceId` trouxe de volta o aliado caído `unitId`, com `hp` de vida. */
    | { type: 'revived'; sourceId: string; unitId: string; hp: number }
    | { type: 'surrendered'; team: TeamId }
    | { type: 'battle_ended'; winner: TeamId };

/**
 * Os números da habilidade para quem está na vez: dano e cura "base", com o
 * ataque atual de quem usa, sem contar a defesa do alvo nem o crítico.
 */
export interface SkillPreview {
    damage: number | null;
    heal: number | null;
}

/**
 * O que a habilidade faria num alvo se fosse usada agora, já com a defesa,
 * o escudo e a vida dele (sem crítico e sem status que dependem de sorte).
 * É o número que aparece em cima de cada alvo possível.
 */
export interface TargetPreview {
    unitId: string;
    /** Dano total sem crítico, antes do escudo. `null` quando a habilidade não causa dano. */
    damage: number | null;
    /** O mesmo dano com todos os golpes críticos. */
    critDamage: number | null;
    /** Chance de crítico de cada golpe, de 0 a 1. */
    critChance: number;
    /** Quanto do dano o escudo segura. */
    absorbed: number;
    /** Cura que o alvo recebe de fato. `null` quando a habilidade não cura. */
    heal: number | null;
    /** O golpe sem crítico já derruba o alvo. */
    defeats: boolean;
    /** O alvo está protegido: o golpe vai para esta unidade, e os números são os do golpe nela. */
    guardedBy?: string;
}

export interface AvailableAction {
    skill: Skill;
    preview: SkillPreview;
    /** A prévia em cada alvo de `targetIds`. Pode faltar numa resposta de uma versão antiga da API. */
    targets?: TargetPreview[];
    /** Usos que restam numa habilidade com limite por batalha (`null` ou ausente: sem limite). */
    usesLeft?: number | null;
    usable: boolean;
    requiresTarget: boolean;
    targetIds: string[];
}

export type BattleStatus = 'in_progress' | 'finished';

/** ai: contra o computador. pvp: entre dois jogadores, criada a partir de uma sala. */
export type BattleMode = 'ai' | 'pvp';

export interface BattleView {
    id: string;
    status: BattleStatus;
    winner: TeamId | null;
    mode: BattleMode;
    /** De que lado está quem pediu. Contra a IA é sempre "A"; entre jogadores, quem entrou na sala é "B". */
    playerTeam: TeamId;
    state: BattleState;
    /** As jogadas da unidade da vez. Vazio quando a vez é do outro jogador. */
    availableActions: AvailableAction[];
    /**
     * Quantos eventos a batalha já teve. Entre jogadores, é a partir daqui que
     * a tela pergunta pelo que o outro fez (`getBattleEvents`).
     */
    cursor: number;
    /** Dá para assistir de novo depois que acabar (as batalhas antigas não guardaram o começo). */
    hasReplay: boolean;
    /** Partida ranqueada: vale pontos e tem prazo para jogar. */
    ranked: boolean;
    /** Partida ranqueada encerrada: os pontos que você ganhou (ou perdeu, negativo). */
    ratingChange: number | null;
    /**
     * Partida ranqueada em andamento: quanto tempo quem está na vez ainda tem
     * para jogar, em ms, no instante da resposta. `null` quando não há prazo.
     */
    /** Contra a IA: o nível dela (`null` entre jogadores, no treino e nas batalhas antigas). */
    difficulty: AiDifficulty | null;
    /** Batalha da campanha: a fase. */
    campaignStage: number | null;
    turnTimeLeftMs: number | null;
    createdAt: string;
    updatedAt: string;
    finishedAt: string | null;
}

export interface BattleResponse {
    battle: BattleView;
    events: BattleEvent[];
}

/** Uma batalha encerrada, do começo ao fim, para assistir de novo. */
export interface ReplayResponse {
    /** A batalha como terminou. */
    battle: BattleView;
    /** O estado de quando ela foi criada: a tela parte dele e aplica os eventos. */
    initial: BattleState;
    /** Tudo o que aconteceu, em ordem. */
    events: BattleEvent[];
}

export interface BattleSummary {
    id: string;
    status: BattleStatus;
    winner: TeamId | null;
    mode: BattleMode;
    playerTeam: TeamId;
    turn: number;
    hasReplay: boolean;
    ranked: boolean;
    /** Partida ranqueada encerrada: os pontos que você ganhou (ou perdeu, negativo). */
    ratingChange: number | null;
    /** Contra a IA: o nível dela (`null` entre jogadores, no treino e nas batalhas antigas). */
    difficulty: AiDifficulty | null;
    /** Batalha da campanha: a fase. */
    campaignStage: number | null;
    createdAt: string;
    updatedAt: string;
    finishedAt: string | null;
}

export interface BattleActionInput {
    unitId: string;
    skillId: string;
    targetId?: string;
}
