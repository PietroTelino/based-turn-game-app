import arqueiro from '@/assets/models/arqueiro.glb?url';
// A animação do tiro com arco do Arqueiro (o arquivo antigo dele, só para a animação).
import arqueiroTiro from '@/assets/models/arqueiro-tiro.fbx?url';
import defenderGolpe from '@/assets/models/defender-golpe.fbx?url';
import espadaBasico from '@/assets/models/espada-basico.fbx?url';
import espadachimDanca from '@/assets/models/espadachim-danca-das-laminas.fbx?url';
import magiaArea from '@/assets/models/magia-area.fbx?url';
import magiaUmAlvo from '@/assets/models/magia-um-alvo.fbx?url';
import morte from '@/assets/models/morte.fbx?url';
import guardiaoAtaque from '@/assets/models/guardiao-ataque.fbx?url';
import esqueleto from '@/assets/models/esqueleto.glb?url';
import necromante from '@/assets/models/necromante.glb?url';
import sucubo from '@/assets/models/sucubo.glb?url';
import barbaro from '@/assets/models/barbaro.glb?url';
// O Criomante é feito em código (corpo, capa com física e cajado): vem em .glb.
import criomante from '@/assets/models/criomante.glb?url';
import espadachim from '@/assets/models/espadachim.glb?url';
import inquisidora from '@/assets/models/inquisidora.glb?url';
import paladino from '@/assets/models/paladino.glb?url';
// O Sacerdote é feito em código (corpo, capa com física e cajado): vem em .glb.
import sacerdote from '@/assets/models/sacerdote.glb?url';
import bardo from '@/assets/models/bardo.glb?url';
import driade from '@/assets/models/driade.glb?url';
import harpia from '@/assets/models/harpia.glb?url';
import xama from '@/assets/models/xama.glb?url';
import druidaHumana from '@/assets/models/druida-humana.glb?url';
import druidaLobo from '@/assets/models/druida-lobo.glb?url';
import druidaUrso from '@/assets/models/druida-urso.glb?url';
import banshee from '@/assets/models/banshee.glb?url';
import cavaleiro from '@/assets/models/cavaleiro.glb?url';
import guardiao from '@/assets/models/guardiao.glb?url';
// O Piromante é feito em código (corpo, capa com física, cajado e chama): vem em .glb.
import piromante from '@/assets/models/piromante.glb?url';
import vampiro from '@/assets/models/vampiro.glb?url';
// O Ladino é feito em código (capa esfarrapada com física e uma adaga em cada mão): vem em .glb.
import ladino from '@/assets/models/ladino.glb?url';
import ladinoCorte from '@/assets/models/ladino-corte.fbx?url';
import padrao from '@/assets/models/padrao.fbx?url';
import provocar from '@/assets/models/provocar.fbx?url';

/**
 * Os modelos 3D dos personagens (src/assets/models) e as animações de cada um.
 *
 * Por enquanto todos usam o boneco padrão do Mixamo, que ataca atirando uma
 * flecha ("Shooting Arrow"). Cada personagem pode ter animações próprias para
 * algumas habilidades (`skills`, pelo id da habilidade), e mais tarde um
 * modelo próprio (`url`). As animações precisam ser do mesmo esqueleto do
 * Mixamo do modelo. Quem não tem entrada em MODELS usa o padrão; as formas do
 * Druida usam a chave `<id>-<forma>`.
 */
export interface AttackAnimation {
    /** O .fbx da animação. */
    url: string;
    /**
     * Os tempos da animação, em segundos do arquivo: onde o golpe começa, o
     * instante do golpe (a flecha sai, o último corte acerta) e onde termina,
     * de volta à pose de descanso.
     */
    from: number;
    release: number;
    to: number;
    /** Quanto dura, no jogo, a parte até o golpe e a volta ao descanso, em segundos. */
    windup: number;
    recover: number;
    /** Desenha um arco na mão esquerda e solta uma flecha no golpe. */
    bow: boolean;
    /** Solta uma flecha em cada alvo no golpe, sem desenhar o arco (o modelo já tem o dele). */
    arrow?: boolean;
    /** Lança uma esfera de magia da mão direita até cada alvo, na cor do elemento. */
    orb?: boolean;
    /** Arma na mão direita durante o golpe. */
    weapon?: 'sword' | 'dagger';
    /**
     * Tira o deslocamento da animação (ela anda para a frente): o corpo golpeia
     * no lugar, e quem avança até o alvo é o avanço da própria batalha.
     */
    inPlace: boolean;
}

export interface CharacterModel {
    /** O .fbx do modelo (com o esqueleto); a pose de descanso sai dele. */
    url: string;
    /** O modelo tem roupa e texturas próprias: mantém os materiais dele, em vez de pintar o boneco na cor do time. */
    textured?: boolean;
    /** O instante da animação do modelo usado como pose de descanso. */
    idle: number;
    /** A animação do arquivo do modelo é a de parado (respirando): ela toca em repetição no descanso. */
    idleLoop?: boolean;
    /** Altura do modelo em relação à figura 2D que ele substitui (a ilustração tem margem em volta). */
    height: number;
    /** O .fbx com a animação de morte. */
    death: string;
    /** O ataque de sempre (qualquer habilidade sem animação própria). */
    attack: AttackAnimation;
    /** Animações próprias, pelo id da habilidade (ou da passiva que age sozinha). */
    skills?: Record<string, AttackAnimation>;
    /** A reação ao levar um golpe enquanto provoca (com a provocação ativa): ele apara com a arma. */
    guard: AttackAnimation;
}

const ATIRAR_FLECHA: AttackAnimation = { url: padrao, from: 0.9, release: 3.2, to: 5, windup: 0.55, recover: 0.6, bow: true, inPlace: false };

export const DEFAULT_MODEL: CharacterModel = {
    url: padrao,
    idle: 0,
    height: 0.9,
    death: morte,
    attack: ATIRAR_FLECHA,
    // Aparar o golpe com espada e escudo ("Sword And Shield Impact"): o tranco é logo no começo.
    guard: { url: defenderGolpe, from: 0, release: 0.12, to: 0.77, windup: 0.06, recover: 0.6, bow: false, inPlace: true, weapon: 'sword' },
};

/** Ataque básico de espada ("Sword And Shield Slash"): o corte acerta aos 0,62 s. */
const CORTE_DE_ESPADA: AttackAnimation = { url: espadaBasico, from: 0.15, release: 0.62, to: 1.5, windup: 0.45, recover: 0.55, bow: false, inPlace: true, weapon: 'sword' };

/** Provocação ("animacao-taunt-do-guardiao"): o gesto de chamar o inimigo aos 0,6 s, e a pose segura um instante. */
const PROVOCAR: AttackAnimation = { url: provocar, from: 0.1, release: 0.6, to: 2.3, windup: 0.45, recover: 0.95, bow: false, inPlace: true };

/** Os golpes do Ladino ("Stable Sword Outward Slash"), com uma adaga: o corte acerta aos 0,9 s. */
const CORTE_DO_LADINO: AttackAnimation = { url: ladinoCorte, from: 0.3, release: 0.9, to: 2, windup: 0.5, recover: 0.6, bow: false, inPlace: true, weapon: 'dagger' };

/** Magia de um alvo só, com uma mão ("Standing 1H Magic Attack 01"): a mão vai à frente aos 0,85 s. */
const MAGIA_UM_ALVO: AttackAnimation = { url: magiaUmAlvo, from: 0.2, release: 0.85, to: 2.2, windup: 0.5, recover: 0.6, bow: false, inPlace: true, orb: true };

/** Magia em área, com as duas mãos ("Standing 2H Magic Area Attack 02"): as mãos descem juntas aos 1,8 s. */
const MAGIA_AREA: AttackAnimation = { url: magiaArea, from: 0.3, release: 1.8, to: 3.1, windup: 0.75, recover: 0.6, bow: false, inPlace: true, orb: true };

/** Os magos: as habilidades de um alvo só usam a magia com uma mão; as em área, a com as duas. */
const mage = (single: string[], area: string[]): CharacterModel => ({
    ...DEFAULT_MODEL,
    skills: Object.fromEntries([...single.map((id) => [id, MAGIA_UM_ALVO]), ...area.map((id) => [id, MAGIA_AREA])]),
});

const MODELS: Record<string, CharacterModel> = {
    // O Piromante feito em código; o resto (fora os ataques) usa a magia de um alvo.
    piromante: {
        ...mage(['piromante.labareda', 'piromante.bola-de-fogo'], ['piromante.chuva-de-meteoros']),
        url: piromante,
        textured: true,
        idleLoop: true,
        attack: MAGIA_UM_ALVO,
    },
    // O Criomante do Mixamo, com a animação de parado em repetição.
    criomante: { ...mage(['criomante.estilhaco', 'criomante.prisao-de-gelo'], ['criomante.nevasca']), url: criomante, textured: true, idleLoop: true, attack: MAGIA_UM_ALVO },
    // O Bárbaro do Mixamo já vem com o machado na mão: o golpe é o corte de espada, sem a espada desenhada.
    barbaro: { ...DEFAULT_MODEL, url: barbaro, textured: true, idleLoop: true, attack: { ...CORTE_DE_ESPADA, weapon: undefined } },
    // A Banshee do Mixamo, com a animação de parado em repetição.
    banshee: { ...mage(['banshee.lamento', 'banshee.maldicao'], ['banshee.grito-aterrador']), url: banshee, textured: true, idleLoop: true, attack: MAGIA_UM_ALVO },
    // O Xamã do Mixamo, com a animação de parado em repetição.
    xama: { ...mage(['xama.faisca', 'xama.corrente-eletrica'], ['xama.tempestade']), url: xama, textured: true, idleLoop: true, attack: MAGIA_UM_ALVO },
    // A Dríade: espinhos e cura com uma mão, o Florescer (o time todo) com as duas.
    driade: { ...mage(['driade.espinhos', 'driade.abraco-da-floresta'], ['driade.florescer']), url: driade, textured: true, idleLoop: true, attack: MAGIA_UM_ALVO },
    // O Bardo: o Acorde com uma mão, a Canção de Marcha e a Dissonância com as duas.
    bardo: { ...mage(['bardo.acorde'], ['bardo.cancao-de-marcha', 'bardo.dissonancia']), url: bardo, textured: true, idleLoop: true, attack: MAGIA_UM_ALVO },
    // A Harpia: as garras com o corte de mão vazia; o Grito Estridente é a magia em área.
    harpia: {
        ...DEFAULT_MODEL,
        url: harpia,
        textured: true,
        idleLoop: true,
        attack: { ...CORTE_DE_ESPADA, weapon: undefined },
        skills: { 'harpia.grito-estridente': MAGIA_AREA },
    },
    // A Súcubo do Mixamo, com a animação de parado em repetição.
    sucubo: { ...mage(['sucubo.acoite'], ['sucubo.tormento', 'sucubo.torpor']), url: sucubo, textured: true, idleLoop: true, attack: MAGIA_UM_ALVO },
    // O Necromante do Mixamo: magia de um alvo, em área e para erguer o esqueleto.
    necromante: {
        ...mage(['necromante.toque-da-morte', 'necromante.erguer-esqueleto'], ['necromante.praga']),
        url: necromante,
        textured: true,
        idleLoop: true,
        attack: MAGIA_UM_ALVO,
    },
    // Quem luta com espada: o ataque básico é o corte de espada. Quem provoca: o gesto de provocar.
    // O Cavaleiro do Mixamo já vem com espada e escudo: os golpes e o aparar não desenham outra espada.
    cavaleiro: {
        ...DEFAULT_MODEL,
        url: cavaleiro,
        textured: true,
        idleLoop: true,
        attack: { ...CORTE_DE_ESPADA, weapon: undefined },
        guard: { ...DEFAULT_MODEL.guard, weapon: undefined },
        skills: { 'cavaleiro.brado-de-guerra': PROVOCAR },
    },
    // O Paladino feito em código, com espada e escudo nas mãos: o golpe radiante corta com a espada; o resto é magia de uma mão.
    paladino: { ...DEFAULT_MODEL, url: paladino, textured: true, idleLoop: true, attack: MAGIA_UM_ALVO, skills: { 'paladino.golpe-radiante': { ...CORTE_DE_ESPADA, weapon: undefined } } },
    // O Sacerdote do Mixamo: o raio e a cura com uma mão, a bênção em todo o time com as duas.
    sacerdote: {
        ...mage(['sacerdote.raio-de-luz', 'sacerdote.toque-curativo'], ['sacerdote.bencao', 'sacerdote.aura-restauradora']),
        url: sacerdote,
        textured: true,
        idleLoop: true,
        attack: MAGIA_UM_ALVO,
    },
    // A Inquisidora feita em código: golpeia com a maça que segura (o corte de espada) e o Expurgo é magia em área.
    inquisidora: {
        ...DEFAULT_MODEL,
        url: inquisidora,
        textured: true,
        idleLoop: true,
        attack: { ...CORTE_DE_ESPADA, weapon: undefined },
        skills: { 'inquisidora.expurgo': MAGIA_AREA },
    },
    // O Guerreiro Esqueleto (a invocação do Necromante): o modelo do Mixamo, golpeando com a espada.
    esqueleto: { ...DEFAULT_MODEL, url: esqueleto, textured: true, idleLoop: true, attack: { ...CORTE_DE_ESPADA, weapon: undefined } },
    // O Druida: cada forma tem o seu modelo do Mixamo, e a troca de forma troca o modelo.
    // Na forma humana, o Golpe de Cajado é o corte de mão vazia; as transformações são o gesto de magia.
    druida: {
        ...DEFAULT_MODEL,
        url: druidaHumana,
        textured: true,
        idleLoop: true,
        attack: MAGIA_UM_ALVO,
        skills: { 'druida.golpe-de-cajado': { ...CORTE_DE_ESPADA, weapon: undefined } },
    },
    // O urso golpeia com as patas (o corte de mão vazia) e provoca no Rugido.
    'druida-urso': {
        ...DEFAULT_MODEL,
        url: druidaUrso,
        textured: true,
        idleLoop: true,
        attack: { ...CORTE_DE_ESPADA, weapon: undefined },
        skills: { 'druida.rugido': PROVOCAR },
    },
    // O lobo morde e dilacera com o corte de mão vazia; o Frenesi também.
    'druida-lobo': { ...DEFAULT_MODEL, url: druidaLobo, textured: true, idleLoop: true, attack: { ...CORTE_DE_ESPADA, weapon: undefined } },
    // O Guardião ataca com magia de natureza nas duas mãos ("Standing 2H Magic Attack 05"): o segundo empurrão, aos 2,1 s, é o golpe.
    // O Guardião do Mixamo (um monstro grande), com a animação de parado em repetição.
    guardiao: {
        ...DEFAULT_MODEL,
        url: guardiao,
        textured: true,
        idleLoop: true,
        attack: { url: guardiaoAtaque, from: 0.3, release: 2.1, to: 3.5, windup: 0.9, recover: 0.6, bow: false, inPlace: true, orb: true },
        skills: Object.fromEntries(
            ['guardiao.raizes', 'guardiao.toxina-potente', 'guardiao.nuvem-de-esporos'].map((id) => [
                id,
                { url: guardiaoAtaque, from: 0.3, release: 2.1, to: 3.5, windup: 0.9, recover: 0.6, bow: false, inPlace: true, orb: true },
            ]),
        ),
    },
    // A Erika do Mixamo, com o arco e a aljava dela: o arquivo traz o modelo e a animação de atirar.
    arqueiro: {
        ...DEFAULT_MODEL,
        url: arqueiro,
        textured: true,
        attack: { url: arqueiroTiro, from: 0.9, release: 3.2, to: 5, windup: 0.55, recover: 0.6, bow: false, arrow: true, inPlace: false },
    },
    // O ninja do Mixamo: o arquivo traz o modelo e a animação de parado, que fica em repetição.
    // O Vampiro feito em código, com a postura de parado do modelo antigo. Ele ataca com as garras:
    // o mesmo corte do ataque básico de espada, de mãos vazias.
    vampiro: { ...DEFAULT_MODEL, url: vampiro, textured: true, idleLoop: true, attack: { ...CORTE_DE_ESPADA, weapon: undefined } },
    // Todas as habilidades usam o corte com a adaga; as adagas já estão nas mãos dele (o golpe não desenha outra).
    ladino: { ...DEFAULT_MODEL, url: ladino, textured: true, idleLoop: true, attack: { ...CORTE_DO_LADINO, weapon: undefined } },
    // O Espadachim feito em código, com a rapieira sempre na mão.
    espadachim: {
        ...DEFAULT_MODEL,
        url: espadachim,
        textured: true,
        idleLoop: true,
        // a rapieira já está na mão dele: os golpes não desenham outra espada
        attack: { ...CORTE_DE_ESPADA, weapon: undefined },
        skills: {
            'espadachim.estocada': { ...CORTE_DE_ESPADA, weapon: undefined },
            // Três cortes seguidos ("One Hand Sword Combo"), aos 1, 2 e 3 s do arquivo: o dano aparece no último.
            'espadachim.danca-das-laminas': { url: espadachimDanca, from: 0.3, release: 3, to: 4.5, windup: 1.3, recover: 0.7, bow: false, inPlace: true },
        },
    },
};

/** O modelo do personagem (ou da forma em que ele está), ou o padrão. */
export function modelFor(characterId: string, form?: string): CharacterModel {
    return (form && MODELS[`${characterId}-${form}`]) || MODELS[characterId] || DEFAULT_MODEL;
}

/** A animação de uma habilidade: a própria do personagem, se houver, ou o ataque de sempre. */
export function attackFor(model: CharacterModel, skillId: string): AttackAnimation {
    return model.skills?.[skillId] ?? model.attack;
}

/** Todos os arquivos de que um personagem precisa. */
export function filesOf(model: CharacterModel): string[] {
    return [...new Set([model.url, model.death, model.attack.url, model.guard.url, ...Object.values(model.skills ?? {}).map((item) => item.url)])];
}

/** Todos os arquivos 3D do jogo (de todos os personagens e formas), sem repetir. */
export function allFiles(): string[] {
    return [...new Set([DEFAULT_MODEL, ...Object.values(MODELS)].flatMap(filesOf))];
}
