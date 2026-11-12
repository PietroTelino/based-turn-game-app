import * as THREE from 'three';
import { clone as cloneSkinned } from 'three/examples/jsm/utils/SkeletonUtils.js';
import type { Impact, SkillFx } from './fx';
import { LOADED, loadSource } from './assets3d';
import { attachRig } from './rig3d';
import type { Rig } from './rig3d';
import type { Source } from './assets3d';
import { attackFor, filesOf, modelFor } from './models3d';
import type { AttackAnimation, CharacterModel } from './models3d';

/*
 * A arena em 3D (Three.js): cada unidade é um modelo 3D animado (battle/models3d.ts),
 * em pé no chão, com sombra, luz, partículas e uma câmera que se move.
 *
 * A página continua montando a batalha como antes: as placas, os cliques, o
 * dano que sobe e as figuras 2D, que ficam invisíveis. Esta cena põe cada
 * modelo onde a figura dele estaria e copia dela o que o CSS anima no corpo
 * inteiro (o avanço do golpe, o tremor, a queda, a transparência). A
 * animação do modelo (o ataque) começa quando a habilidade é usada.
 *
 * O "palco" de cada unidade (a caixa do dano que sobe e da marca da vez)
 * acompanha o modelo quando a câmera se move, e a pintura do fundo também.
 */

const ELEMENT_COLOR: Record<string, number> = {
    physical: 0xfff0c0,
    fire: 0xff7a1a,
    ice: 0x8fd8ff,
    lightning: 0x9fc0ff,
    nature: 0x8fe36a,
    light: 0xffe08a,
    shadow: 0xb07aff,
    sound: 0xcfe8ff,
    poison: 0x9be35a,
};

const colorOf = (element: string) => ELEMENT_COLOR[element] ?? 0xfff0c0;

/** A câmera parada: ela enquadra os modelos exatamente onde o layout da página põe as figuras. */
const REST_POS = new THREE.Vector3(0, 4.2, 13);
const REST_LOOK = new THREE.Vector3(0, 0.6, 0);

/** O tempo de voo da flecha. */
const FLIGHT = 0.16;
/** A mistura da pose de descanso com a do ataque, no começo e no fim, em segundos. */
const BLEND = 0.12;

/**
 * Ajusta a animação à escala do esqueleto que vai tocá-la: o andar do quadril vem
 * em unidades do arquivo da animação (centímetros, no Mixamo), e há modelos
 * exportados em outra escala (o Sacerdote vem em metros). Sem isso o quadril
 * sairia voando dez vezes mais longe.
 */
function fitClip(clip: THREE.AnimationClip, model: THREE.Object3D): THREE.AnimationClip {
    const hips = model.getObjectByName('mixamorigHips');
    const track = clip.tracks.find((item) => item.name.endsWith('Hips.position'));

    if (!hips || !track || !track.values[1] || !hips.position.y) return clip;

    const ratio = hips.position.y / track.values[1];

    if (Math.abs(ratio - 1) < 0.05) return clip;

    const copy = clip.clone();
    const scaled = copy.tracks.find((item) => item.name.endsWith('Hips.position'))!;

    for (let i = 0; i < scaled.values.length; i++) scaled.values[i]! *= ratio;

    return copy;
}

interface Figure {
    unit: HTMLElement;
    stage: HTMLElement;
    sprite: HTMLElement;
    key: string;
    spec: CharacterModel;
    /** O lugar no chão, que gira para a câmera. */
    group: THREE.Group;
    /** O que o CSS move (avanço, tremor, queda). */
    anim: THREE.Group;
    model: THREE.Group;
    mixer: THREE.AnimationMixer;
    /** Física e mãos dos personagens feitos em código (null nos do Mixamo). */
    rig: Rig | null;
    idle: THREE.AnimationAction;
    /** Uma ação por arquivo de ataque, criada na primeira vez que ele é usado. */
    attacks: Map<string, THREE.AnimationAction>;
    death: THREE.AnimationAction | null;
    /** Quando caiu (derrotado), em segundos da cena; null de pé. */
    fell: number | null;
    materials: (THREE.MeshStandardMaterial | THREE.MeshPhongMaterial)[];
    leftHand: THREE.Object3D | null;
    rightHand: THREE.Object3D | null;
    /** A espada presa à mão direita (aparece só nos golpes com `weapon: 'sword'`). */
    sword: THREE.Group | null;
    bow: THREE.Group | null;
    /** Para que lado ele ataca: 1 para a direita, -1 para a esquerda. */
    facing: number;
    /** O golpe em andamento: quando começou e em quem. */
    strike: { start: number; targets: string[]; anim: AttackAnimation; action: THREE.AnimationAction; fired: boolean; color: number } | null;
    flash: number;
    feet: THREE.Vector3;
    height: number;
    perPx: number;
    rest: { x: number; y: number; h: number };
}

interface Arrow {
    mesh: THREE.Object3D;
    /** A esfera de magia (o resto são flechas). */
    orb: boolean;
    from: THREE.Vector3;
    to: THREE.Vector3;
    start: number;
    hit: boolean;
}

interface Burst {
    points: THREE.Points;
    velocity: THREE.Vector3[];
    born: number;
    rise: boolean;
}

interface Glow {
    light: THREE.PointLight;
    born: number;
    duration: number;
    peak: number;
}

/** Posição de um elemento dentro de outro, pelo layout (sem as transformações do CSS). */
function offsetIn(el: HTMLElement, root: HTMLElement): { x: number; y: number } {
    let x = 0;
    let y = 0;
    let node: HTMLElement | null = el;

    while (node && node !== root) {
        x += node.offsetLeft;
        y += node.offsetTop;
        node = node.offsetParent as HTMLElement | null;

        if (node && !root.contains(node)) {
            const a = el.getBoundingClientRect();
            const b = root.getBoundingClientRect();

            return { x: a.left - b.left, y: a.top - b.top };
        }
    }

    return { x, y };
}

/** O brilho colorido do filtro do CSS (o contorno de quem pode ser alvo), se houver. */
function glowOf(filter: string): THREE.Color | null {
    for (const [, r, g, b, x, y] of filter.matchAll(/drop-shadow\(rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*[\d.]+)?\)\s+(-?[\d.]+)px\s+(-?[\d.]+)px/g)) {
        const color = new THREE.Color(+r! / 255, +g! / 255, +b! / 255);

        if (+x! === 0 && +y! === 0 && color.getHSL({ h: 0, s: 0, l: 0 }).l >= 0.3) return color;
    }

    return null;
}

/** Uma cor por personagem, no tom do time: azul para o seu, vermelho para o outro. */
function tintOf(characterId: string, ally: boolean): THREE.Color {
    let hash = 0;

    for (const char of characterId) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;

    const shift = ((hash % 100) / 100 - 0.5) * 0.08;

    return new THREE.Color().setHSL((ally ? 0.6 : 0.005) + shift, 0.75, 0.3 + ((hash >> 8) % 14) / 100);
}

function makeBow(): THREE.Group {
    const bow = new THREE.Group();
    const limb = new THREE.Mesh(
        new THREE.TorusGeometry(0.62, 0.025, 8, 40, Math.PI * 0.62),
        new THREE.MeshStandardMaterial({ color: 0x6b4423, roughness: 0.7 }),
    );

    limb.rotation.z = -Math.PI * 0.31;
    limb.position.x = -0.5;
    limb.castShadow = true;
    bow.add(limb);

    const string = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()]),
        new THREE.LineBasicMaterial({ color: 0xeee6d0 }),
    );

    string.name = 'string';
    bow.add(string);

    return bow;
}

/**
 * Uma espada longa, nas unidades do modelo do Mixamo (centímetros), presa ao
 * osso da mão direita: o cabo fica no punho e a lâmina sai para o lado do
 * polegar, como numa empunhadura de verdade.
 */
function makeSword(): THREE.Group {
    const sword = new THREE.Group();
    const steel = new THREE.MeshStandardMaterial({ color: 0xd8dde6, metalness: 0.9, roughness: 0.25 });
    const gold = new THREE.MeshStandardMaterial({ color: 0xc8a24b, metalness: 0.8, roughness: 0.35 });
    const leather = new THREE.MeshStandardMaterial({ color: 0x3b2a1e, roughness: 0.8 });
    const blade = new THREE.Mesh(new THREE.BoxGeometry(5, 85, 0.8), steel);
    const tip = new THREE.Mesh(new THREE.ConeGeometry(2.5, 8, 4), steel);
    const guard = new THREE.Mesh(new THREE.BoxGeometry(18, 2.5, 3), gold);
    const grip = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.4, 16, 8), leather);
    const pommel = new THREE.Mesh(new THREE.SphereGeometry(2.4, 10, 8), gold);

    blade.position.y = 52;
    tip.position.y = 98.5;
    tip.scale.z = 0.2;
    guard.position.y = 8.5;
    pommel.position.y = -9;
    sword.add(blade, tip, guard, grip, pommel);
    sword.traverse((part) => (part.castShadow = true));
    // O cabo corta a mão de lado a lado, na altura dos dedos fechados.
    sword.position.set(0, 9, 3);
    sword.rotation.set(Math.PI / 2, 0, 0);
    sword.visible = false;

    return sword;
}

let glow: THREE.Texture | null = null;

/** Um círculo de luz que some nas bordas: o brilho em volta da esfera de magia. */
function glowTexture(): THREE.Texture {
    if (glow) return glow;

    const canvas = document.createElement('canvas');

    canvas.width = canvas.height = 128;

    const g = canvas.getContext('2d')!;
    const gradient = g.createRadialGradient(64, 64, 0, 64, 64, 64);

    gradient.addColorStop(0, 'rgba(255,255,255,1)');
    gradient.addColorStop(0.3, 'rgba(255,255,255,0.55)');
    gradient.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gradient;
    g.fillRect(0, 0, 128, 128);
    glow = new THREE.CanvasTexture(canvas);

    return glow;
}

function makeArrow(): THREE.Group {
    const arrow = new THREE.Group();
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.85, 6), new THREE.MeshStandardMaterial({ color: 0xc9a46a }));
    const head = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.09, 6), new THREE.MeshStandardMaterial({ color: 0x8a8f99, metalness: 0.8, roughness: 0.3 }));

    shaft.rotation.z = Math.PI / 2;
    head.rotation.z = -Math.PI / 2;
    head.position.x = 0.46;
    arrow.add(shaft, head);
    arrow.traverse((part) => (part.castShadow = true));

    return arrow;
}

export class Arena3D {
    private readonly arena: HTMLElement;
    private readonly backdrop: HTMLElement;
    private readonly renderer: THREE.WebGLRenderer;
    private readonly scene = new THREE.Scene();
    private readonly camera = new THREE.PerspectiveCamera(30, 1, 0.1, 200);
    private readonly restCamera = new THREE.PerspectiveCamera(30, 1, 0.1, 200);
    private readonly figures = new Map<string, Figure>();
    /** Os modelos lidos ficam guardados entre uma batalha e outra (são da página, não da cena). */
    private readonly loaded = LOADED;
    private readonly arrows: Arrow[] = [];
    private readonly bursts: Burst[] = [];
    private readonly glows: Glow[] = [];
    private readonly raycaster = new THREE.Raycaster();
    private readonly floorPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    private readonly reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    private width = 1;
    private height = 1;
    private frame = 0;
    private last = performance.now();
    private now = 0;
    private dt = 1 / 60;
    private shake = 0;
    private lastImpacts = new Set<number>();
    private skillId: number | null = null;
    private camLook = REST_LOOK.clone();
    private camDistance = 1;
    private goalLook = REST_LOOK.clone();
    private goalDistance = 1;
    private goalUntil = 0;

    constructor(arena: HTMLElement, canvas: HTMLCanvasElement, backdrop: HTMLElement) {
        this.arena = arena;
        this.backdrop = backdrop;
        this.renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.outputColorSpace = THREE.SRGBColorSpace;
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

        this.scene.add(new THREE.HemisphereLight(0xfff1d6, 0x4a3f33, 1.7));

        const sun = new THREE.DirectionalLight(0xffe2b0, 2.2);

        sun.position.set(-7, 11, 9);
        sun.castShadow = true;
        sun.shadow.mapSize.set(2048, 2048);
        Object.assign(sun.shadow.camera, { left: -14, right: 14, top: 12, bottom: -8, near: 1, far: 50 });
        sun.shadow.bias = -0.0004;
        this.scene.add(sun);

        // O chão não aparece: ele só recebe as sombras, por cima do chão da pintura.
        const floor = new THREE.Mesh(new THREE.PlaneGeometry(120, 120), new THREE.ShadowMaterial({ opacity: 0.38, depthWrite: false }));

        floor.rotation.x = -Math.PI / 2;
        floor.receiveShadow = true;
        this.scene.add(floor);

        this.restCamera.position.copy(REST_POS);
        this.restCamera.lookAt(REST_LOOK);
    }

    /** Carrega o modelo padrão antes de a cena aparecer, para as figuras não sumirem enquanto ele chega. */
    async preload() {
        // O padrão e os modelos de quem está em campo (o arquivo de um personagem pode ser grande).
        // As formas do Druida também: a troca de forma no meio da batalha já encontra o modelo carregado.
        const specs = [
            modelFor(''),
            ...Array.from(this.arena.querySelectorAll<HTMLElement>('[data-unit-id]')).flatMap((unit) =>
                [unit.dataset.form || undefined, 'urso', 'lobo'].map((form) => modelFor(unit.dataset.character ?? '', form)),
            ),
        ];

        await Promise.all([...new Set(specs.flatMap(filesOf))].map((url) => this.source(url)));
    }

    start() {
        const tick = (time: number) => {
            const dt = Math.min(0.05, (time - this.last) / 1000);

            this.last = time;
            this.update(dt);
            this.frame = requestAnimationFrame(tick);
        };

        this.frame = requestAnimationFrame(tick);
    }

    dispose() {
        cancelAnimationFrame(this.frame);
        for (const figure of this.figures.values()) this.removeFigure(figure);
        this.backdrop.style.transform = '';
        this.renderer.dispose();
    }

    /** A habilidade que começou agora: quem usou ataca, e a câmera vai até lá. */
    setSkill(skill: SkillFx | null) {
        if (!skill || skill.id === this.skillId) return;

        this.skillId = skill.id;

        const source = this.figures.get(skill.sourceId);

        if (!source) return;

        const targets = skill.targetIds.filter((id) => id !== skill.sourceId && this.figures.has(id));
        const enemies = targets.filter((id) => this.figures.get(id)!.facing !== source.facing);

        // A animação da habilidade (ou o ataque de sempre, se o arquivo dela ainda não chegou).
        let anim = attackFor(source.spec, skill.skillId);
        let action = this.attackAction(source, anim);

        if (!action) {
            anim = source.spec.attack;
            action = this.attackAction(source, anim)!;
        }

        // A flecha só voa em quem é do outro time; em aliados (cura, escudo) ele só faz o gesto.
        source.strike = { start: this.now, targets: enemies, anim, action, fired: false, color: colorOf(skill.element) };

        // A câmera fica parada no golpe (sem aproximar de quem usa); só treme no crítico.

        if (skill.delivery !== 'melee' && skill.element !== 'physical') {
            this.glow(source.feet.clone().setY(source.height * 0.6), colorOf(skill.element), 6, anim.windup + 0.2);
        }
    }

    /** Os golpes que chegaram agora: faíscas, clarão e, no crítico, a câmera treme. */
    setImpacts(impacts: Impact[], quake: boolean) {
        const fresh = impacts.filter((impact) => !this.lastImpacts.has(impact.id));

        this.lastImpacts = new Set(impacts.map((impact) => impact.id));

        for (const impact of fresh) {
            const figure = this.figures.get(impact.unitId);

            if (!figure) continue;

            const at = figure.feet.clone().setY(figure.height * 0.55).add(new THREE.Vector3(0, 0, 0.3));
            const rise = impact.kind === 'heal' || impact.kind === 'boon' || impact.kind === 'shield';
            const color = impact.kind === 'heal' ? 0x9fe37a : impact.kind === 'shield' ? 0x9fc0ff : colorOf(impact.element);
            const strong = impact.kind === 'hit';

            this.burst(at, color, strong ? (impact.critical ? 110 : 60) : 34, figure.height * (strong ? 1.3 : 0.6), rise);

            if (strong) figure.flash = 1;

            // Provocando, ele apara o golpe com a arma (se não estiver no meio de um golpe próprio).
            if (strong && figure.unit.dataset.taunt === '1' && !figure.strike && figure.fell === null) {
                const action = this.attackAction(figure, figure.spec.guard);

                if (action) figure.strike = { start: this.now, targets: [], anim: figure.spec.guard, action, fired: false, color: 0xffffff };
            }
            if (impact.element !== 'physical' || !strong) this.glow(at, color, strong ? 12 : 6, 0.5);
        }

        if (quake && fresh.length > 0 && !this.reducedMotion) this.shake = 0.12;
    }

    private glow(at: THREE.Vector3, color: number, peak: number, duration: number) {
        const light = new THREE.PointLight(color, 0, 6, 1.6);

        light.position.copy(at);
        this.scene.add(light);
        this.glows.push({ light, born: this.now, duration, peak });
    }

    private burst(at: THREE.Vector3, color: number, count: number, speed: number, rise: boolean) {
        const positions = new Float32Array(count * 3);
        const velocity: THREE.Vector3[] = [];

        for (let i = 0; i < count; i++) {
            positions.set([at.x, at.y, at.z], i * 3);
            velocity.push(
                new THREE.Vector3(Math.random() - 0.5, rise ? Math.random() * 0.6 + 0.2 : Math.random() * 0.9, Math.random() - 0.5)
                    .normalize()
                    .multiplyScalar(speed * (0.35 + Math.random())),
            );
        }

        const geometry = new THREE.BufferGeometry();

        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

        const points = new THREE.Points(
            geometry,
            new THREE.PointsMaterial({ color, size: 0.07, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }),
        );

        this.scene.add(points);
        this.bursts.push({ points, velocity, born: this.now, rise });
    }

    // --------------------------------------------------------------- Modelos

    private source(url: string): Promise<Source> {
        return loadSource(url);
    }

    private buildFigure(unit: HTMLElement, stage: HTMLElement, sprite: HTMLElement, spec: CharacterModel, key: string): Figure | null {
        const source = this.loaded.get(spec.url);
        const dying = this.loaded.get(spec.death);

        // Os arquivos das habilidades próprias começam a carregar já; o modelo e a morte são esperados.
        for (const url of filesOf(spec)) void this.source(url);

        if (!source || !dying) return null;

        const ally = !unit.closest('.bt-team--right');
        const model = cloneSkinned(source.model) as THREE.Group;
        // Antes de tudo (ainda na pose de origem e fora da cena): o cajado e a física entram no modelo.
        const rig = attachRig(model);
        const tint = tintOf(unit.dataset.character ?? '', ally);
        const materials: (THREE.MeshStandardMaterial | THREE.MeshPhongMaterial)[] = [];

        model.traverse((part) => {
            if (!(part instanceof THREE.Mesh)) return;

            // Modelo com roupa e texturas: cada figura ganha uma cópia dos materiais dele (para a transparência e o brilho).
            if (spec.textured) {
                const own = ([] as THREE.Material[]).concat(part.material).map((item) => {
                    const copy = item.clone() as THREE.MeshPhongMaterial;

                    // A transparência só liga quando a figura some ou se esconde: muitas texturas do Mixamo
                    // usam o canal alfa para outra coisa, e ligada o tempo todo o corpo ficaria translúcido.
                    copy.userData.ownTransparent = item.transparent;

                    // Brilho de material com dureza muito baixa (comum nos modelos do Mixamo) vira um véu claro
                    // no corpo todo sob a luz da arena: o reflexo fica menor e mais fraco.
                    // Só nesses: metal com reflexo de verdade (a armadura do Cavaleiro) fica como está.
                    if (copy instanceof THREE.MeshPhongMaterial && copy.shininess < 10) {
                        copy.shininess = 24;
                        copy.specular.multiplyScalar(0.35);
                    }
                    copy.userData.joint = false;
                    materials.push(copy);

                    return copy;
                });

                part.material = own.length === 1 ? own[0]! : own;
                part.castShadow = true;

                return;
            }

            const material = new THREE.MeshStandardMaterial({
                color: part.name.includes('Joints') ? 0x2a2838 : tint,
                roughness: 0.55,
                metalness: 0.1,
                transparent: true,
            });

            material.userData.joint = part.name.includes('Joints');
            part.material = material;
            part.castShadow = true;
            materials.push(material);
        });

        const group = new THREE.Group();
        const anim = new THREE.Group();

        anim.matrixAutoUpdate = false;
        anim.add(model);
        group.add(anim);
        this.scene.add(group);

        const mixer = new THREE.AnimationMixer(model);
        const idle = mixer.clipAction(source.clip);

        // A morte vem de outro arquivo, mas do mesmo esqueleto do Mixamo: os ossos têm os mesmos nomes.
        const death = mixer.clipAction(fitClip(dying.clip, source.model).clone());

        death.setLoop(THREE.LoopOnce, 1);

        for (const action of [idle, death]) {
            action.play();
            action.paused = true;
        }

        idle.time = spec.idle;
        death.setEffectiveWeight(0);

        const bow = filesOf(spec).length > 0 && (spec.attack.bow || Object.values(spec.skills ?? {}).some((item) => item.bow)) ? makeBow() : null;

        if (bow) this.scene.add(bow);

        return {
            unit,
            stage,
            sprite,
            key,
            spec,
            group,
            anim,
            model,
            mixer,
            rig,
            idle,
            attacks: new Map(),
            death,
            fell: null,
            materials,
            leftHand: model.getObjectByName('mixamorigLeftHand') ?? null,
            rightHand: model.getObjectByName('mixamorigRightHand') ?? null,
            sword: null,
            bow,
            facing: ally ? 1 : -1,
            strike: null,
            flash: 0,
            feet: new THREE.Vector3(),
            height: 1,
            perPx: 1,
            rest: { x: 0, y: 0, h: 1 },
        };
    }

    private removeFigure(figure: Figure) {
        this.scene.remove(figure.group);
        if (figure.bow) this.scene.remove(figure.bow);
        figure.mixer.stopAllAction();
        figure.materials.forEach((material) => material.dispose());
        figure.stage.style.transform = '';
    }

    /** Acha as unidades na página e cria, atualiza ou tira os modelos delas. */
    private syncFigures() {
        const seen = new Set<string>();

        for (const unit of this.arena.querySelectorAll<HTMLElement>('[data-unit-id]')) {
            const id = unit.dataset.unitId!;
            const stage = unit.querySelector<HTMLElement>('.bt-unit__stage');
            const sprite = unit.querySelector<HTMLElement>('.bt-unit__sprite');

            if (!stage || !sprite) continue;

            const spec = modelFor(unit.dataset.character ?? '', unit.dataset.form || undefined);
            const key = `${unit.dataset.character}|${unit.dataset.form ?? ''}|${spec.url}`;
            let figure = this.figures.get(id);

            // Trocou de forma ou virou outra unidade (uma invocação): o modelo é refeito.
            if (figure && (figure.key !== key || figure.sprite !== sprite)) {
                this.removeFigure(figure);
                this.figures.delete(id);
                figure = undefined;
            }

            if (!figure) {
                const built = this.buildFigure(unit, stage, sprite, spec, key);

                if (!built) continue;

                figure = built;
                this.figures.set(id, figure);

                if (figure.rightHand) {
                    figure.sword = makeSword();
                    figure.rightHand.add(figure.sword);
                }
            }

            seen.add(id);
            this.place(figure);
        }

        for (const [id, figure] of this.figures) {
            if (!seen.has(id)) {
                this.removeFigure(figure);
                this.figures.delete(id);
            }
        }
    }

    private toNdc(x: number, y: number) {
        return new THREE.Vector2((x / this.width) * 2 - 1, 1 - (y / this.height) * 2);
    }

    /** Põe o modelo no chão onde a página desenha a figura, vista pela câmera parada. */
    private place(figure: Figure) {
        const { x, y } = offsetIn(figure.stage, this.arena);
        const w = figure.stage.offsetWidth;
        const h = figure.stage.offsetHeight;
        const rest = { x: x + w / 2, y: y + h, h };

        figure.rest = rest;
        this.raycaster.setFromCamera(this.toNdc(rest.x, rest.y), this.restCamera);

        const feet = this.raycaster.ray.intersectPlane(this.floorPlane, new THREE.Vector3());

        if (!feet) return;

        this.raycaster.setFromCamera(this.toNdc(rest.x, rest.y - h), this.restCamera);

        const standing = new THREE.Plane().setFromNormalAndCoplanarPoint(new THREE.Vector3(0, 0, 1), feet);
        const head = this.raycaster.ray.intersectPlane(standing, new THREE.Vector3());
        const height = head ? head.y : 1;

        figure.feet.copy(feet);
        figure.height = height;
        figure.perPx = h / height;
        figure.group.position.copy(feet);

        // Cada modelo é ajustado pela altura dele (o boneco tem 181 unidades, o Vampiro 211);
        // na pose de começo os modelos do Mixamo olham 90° de lado.
        const scale = (height * figure.spec.height) / (this.loaded.get(figure.spec.url)?.tall ?? 181);

        figure.model.scale.setScalar(scale);
        figure.model.rotation.y = Math.PI / 2;
        // O time da direita é o espelho do da esquerda (de um lado ao outro da arena):
        // os dois times ficam de frente um para o outro, na mesma pose.
        figure.group.scale.x = figure.facing;
    }

    /** A ação de um arquivo de ataque nesta figura (null se o arquivo ainda não chegou). */
    private attackAction(figure: Figure, anim: AttackAnimation): THREE.AnimationAction | null {
        const key = `${anim.url}|${anim.inPlace}`;
        let action = figure.attacks.get(key);

        if (!action) {
            const source = this.loaded.get(anim.url);

            if (!source) return null;

            action = figure.mixer.clipAction(fitClip(anim.inPlace ? source.still : source.clip, this.loaded.get(figure.spec.url)!.model).clone());
            action.play();
            action.paused = true;
            action.setEffectiveWeight(0);
            figure.attacks.set(key, action);
        }

        return action;
    }

    /** O golpe: a pose de ataque, misturada com a de descanso no começo e no fim. */
    private animate(figure: Figure) {
        const { strike } = figure;
        let weight = 0;

        for (const action of figure.attacks.values()) if (action !== strike?.action) action.setEffectiveWeight(0);

        if (figure.sword) {
            const weapon = figure.fell === null ? strike?.anim.weapon : undefined;

            figure.sword.visible = weapon !== undefined;
            // A adaga é a mesma espada, menor.
            figure.sword.scale.setScalar(weapon === 'dagger' ? 0.55 : 1);
        }

        if (strike) {
            const { anim } = strike;
            const elapsed = this.now - strike.start;
            let time: number;

            if (elapsed < anim.windup) {
                time = anim.from + (elapsed / anim.windup) * (anim.release - anim.from);
            } else {
                time = anim.release + Math.min(1, (elapsed - anim.windup) / anim.recover) * (anim.to - anim.release);

                if (!strike.fired) {
                    strike.fired = true;
                    if ((anim.bow || anim.arrow || anim.orb) && strike.targets.length > 0) this.fire(figure, strike.targets, anim.orb ? strike.color : null);
                }
            }

            strike.action.time = Math.min(time, strike.action.getClip().duration - 0.01);
            weight = Math.min(1, elapsed / BLEND, (anim.windup + anim.recover - elapsed) / BLEND);

            if (elapsed >= anim.windup + anim.recover) figure.strike = null;
        }

        // Derrotado: a animação de morte toma o corpo inteiro e para na última pose, caído no chão.
        let dead = 0;

        if (figure.fell !== null && figure.death) {
            const elapsed = this.now - figure.fell;

            figure.death.time = Math.min(elapsed, figure.death.getClip().duration - 0.01);
            dead = Math.min(1, elapsed / BLEND);
            weight *= 1 - dead;
        }

        figure.death?.setEffectiveWeight(dead);
        figure.strike?.action.setEffectiveWeight(Math.max(0, weight));
        figure.idle.setEffectiveWeight(Math.max(0, 1 - Math.max(0, weight) - dead));
        figure.idle.time = figure.spec.idleLoop ? this.now % figure.idle.getClip().duration : figure.spec.idle;
        figure.rig?.beforeAnimate();
        figure.mixer.update(0);
    }

    /** Solta o projétil de cada alvo: a flecha, ou (com `orb`) a esfera de magia na cor do elemento. */
    private fire(figure: Figure, targets: string[], orb: number | null) {
        const from = new THREE.Vector3();

        (figure.rightHand ?? figure.model).getWorldPosition(from);

        for (const id of targets) {
            const target = this.figures.get(id);

            if (!target) continue;

            let mesh: THREE.Object3D;

            if (orb !== null) {
                const ball = new THREE.Mesh(new THREE.SphereGeometry(0.11, 16, 12), new THREE.MeshBasicMaterial({ color: 0xffffff }));
                const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color: orb, blending: THREE.AdditiveBlending, depthWrite: false }));

                halo.scale.setScalar(0.9);
                ball.add(halo, new THREE.PointLight(orb, 10, 5, 1.6));
                mesh = ball;
            } else {
                mesh = makeArrow();
            }

            this.scene.add(mesh);
            this.arrows.push({ mesh, orb: orb !== null, from: from.clone(), to: target.feet.clone().setY(target.height * 0.55), start: this.now, hit: false });
        }
    }

    /** O arco segue a mão esquerda, de pé, virado para o lado do ataque; a corda vai até a mão direita quando ele puxa. */
    private updateBow(figure: Figure, visible: boolean) {
        const bow = figure.bow;

        if (!bow || !figure.leftHand) return;

        // O arco só aparece com a animação de arqueiro: no golpe de espada ele some.
        const shown = visible && (figure.strike ? figure.strike.anim.bow : figure.spec.attack.bow);

        bow.visible = shown;

        if (!shown) return;

        const hand = new THREE.Vector3();
        const dir = new THREE.Vector3(figure.facing, 0, 0);
        const up = new THREE.Vector3(0, 1, 0);
        const size = figure.height / 2.3;

        figure.leftHand.getWorldPosition(hand);
        bow.position.copy(hand);
        bow.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(dir, up, new THREE.Vector3().crossVectors(dir, up)));
        bow.scale.setScalar(size);
        bow.updateMatrixWorld(true);

        const angle = Math.PI * 0.31;
        const top = new THREE.Vector3(0.62 * Math.cos(angle) - 0.5, 0.62 * Math.sin(angle), 0);
        const bottom = new THREE.Vector3(0.62 * Math.cos(-angle) - 0.5, 0.62 * Math.sin(-angle), 0);
        const strike = figure.strike;
        const drawing = strike && !strike.fired && this.now - strike.start > strike.anim.windup * 0.3;
        const middle = top.clone().lerp(bottom, 0.5);

        if (drawing && figure.rightHand) {
            figure.rightHand.getWorldPosition(middle);
            bow.worldToLocal(middle);
        }

        const string = bow.getObjectByName('string') as THREE.Line;
        const position = string.geometry.attributes.position as THREE.BufferAttribute;

        position.setXYZ(0, top.x, top.y, top.z);
        position.setXYZ(1, middle.x, middle.y, middle.z);
        position.setXYZ(2, bottom.x, bottom.y, bottom.z);
        position.needsUpdate = true;
    }

    /** Copia do CSS o movimento do corpo inteiro (avanço, tremor, queda) e a transparência. */
    private mirror(figure: Figure) {
        const down = figure.unit.classList.contains('bt-unit--falling') || figure.unit.classList.contains('bt-unit--down');

        // Caiu agora (ou já estava caído quando a tela abriu: aí aparece direto no chão).
        if (down && figure.fell === null) {
            figure.fell = figure.unit.classList.contains('bt-unit--falling') ? this.now : this.now - 10;
            figure.strike = null;
        } else if (!down && figure.fell !== null) {
            // Ressuscitou: volta a ficar de pé.
            figure.fell = null;
        }

        if (figure.fell !== null) {
            figure.anim.matrix.identity();
            figure.anim.matrixWorldNeedsUpdate = true;
            figure.group.visible = true;

            for (const material of figure.materials) {
                material.opacity = 1;
                material.depthWrite = true;
                material.emissive.setRGB(0, 0, 0);
                if (material.userData.baseEmissive) material.emissive.set(material.userData.baseEmissive as number);
            }

            this.animate(figure);
            figure.group.updateMatrixWorld(true);
            figure.rig?.step(this.dt);
            this.updateBow(figure, false);

            return;
        }

        const style = getComputedStyle(figure.sprite);
        const matrix = new DOMMatrixReadOnly(style.transform === 'none' ? undefined : style.transform);
        const k = 1 / figure.perPx;
        const css = getComputedStyle(figure.unit).display === 'none' ? 0 : parseFloat(style.opacity);
        // O pulso leve de quem pode ser alvo (até 0,86) deixaria o modelo translúcido, vendo o corpo por dentro:
        // só transparências de verdade (sumir, ficar escondido) passam para o 3D.
        const opacity = css >= 0.8 ? 1 : css;
        const glow = glowOf(style.filter);

        // O time da direita já é espelhado no grupo: o movimento do CSS entra como está.
        const mx = 1;

        figure.anim.matrix.set(matrix.a, -matrix.c * mx, 0, matrix.e * k * mx, -matrix.b * mx, matrix.d, 0, -matrix.f * k, 0, 0, 1, 0, 0, 0, 0, 1);
        figure.anim.matrixWorldNeedsUpdate = true;

        figure.flash = Math.max(0, figure.flash - 0.05);

        for (const material of figure.materials) {
            material.opacity = opacity;
            const transparent = opacity < 1 || material.userData.ownTransparent !== false;

            if (material.transparent !== transparent) {
                material.transparent = transparent;
                material.needsUpdate = true;
            }
            material.depthWrite = opacity > 0.95;
            // Quem pode ser alvo brilha na cor do contorno do CSS; quem leva o golpe pisca em vermelho.
            const lit = glow && !material.userData.joint;

            // Nos modelos com roupa e cores próprias o alvo não brilha no corpo (o brilho desbota as cores e
            // deixava o time inimigo fosco na sua vez): o círculo no chão já mostra quem pode ser alvo.
            material.emissive.copy(lit ? glow : new THREE.Color(0, 0, 0)).multiplyScalar(lit && !figure.spec.textured ? 0.14 : 0);
            material.emissive.r += figure.flash * 0.6;
            if (material.userData.baseEmissive) material.emissive.add(new THREE.Color(material.userData.baseEmissive as number));
        }

        figure.group.visible = opacity > 0.02;
        this.animate(figure);
        figure.group.updateMatrixWorld(true);
        figure.rig?.step(this.dt);
        this.updateBow(figure, figure.group.visible);
    }

    // ---------------------------------------------------------------- Quadro

    private resize() {
        const w = this.arena.clientWidth;
        const h = this.arena.clientHeight;

        if (w === this.width && h === this.height) return;

        this.width = w;
        this.height = h;
        this.renderer.setSize(w, h, false);

        for (const camera of [this.camera, this.restCamera]) {
            camera.aspect = w / h;
            camera.updateProjectionMatrix();
        }
    }

    private project(point: THREE.Vector3, camera: THREE.Camera) {
        const ndc = point.clone().project(camera);

        return { x: ((ndc.x + 1) / 2) * this.width, y: ((1 - ndc.y) / 2) * this.height };
    }

    private update(dt: number) {
        this.dt = dt;
        this.now += dt;
        this.resize();
        this.restCamera.updateMatrixWorld();
        this.syncFigures();

        if (this.now > this.goalUntil) {
            this.goalLook.copy(REST_LOOK);
            this.goalDistance = 1;
        }

        const ease = 1 - Math.exp(-dt * 3.4);

        this.camLook.lerp(this.goalLook, ease);
        this.camDistance += (this.goalDistance - this.camDistance) * ease;
        this.camera.position.copy(this.camLook).add(REST_POS.clone().sub(REST_LOOK).multiplyScalar(this.camDistance));
        this.camera.lookAt(this.camLook);

        if (this.shake > 0) {
            this.camera.position.x += (Math.random() - 0.5) * this.shake;
            this.camera.position.y += (Math.random() - 0.5) * this.shake;
            this.shake = Math.max(0, this.shake - dt * 0.6);
        }

        this.camera.updateMatrixWorld();

        const moved = this.camera.position.distanceToSquared(REST_POS) > 1e-6;
        const zs: number[] = [];

        for (const figure of this.figures.values()) {
            this.mirror(figure);
            zs.push(figure.feet.z);

            if (moved) {
                const feet = this.project(figure.feet, this.camera);
                const head = this.project(figure.feet.clone().setY(figure.height), this.camera);
                const scale = Math.hypot(head.x - feet.x, head.y - feet.y) / figure.rest.h;

                figure.stage.style.transformOrigin = '50% 100%';
                figure.stage.style.transform = `translate(${feet.x - figure.rest.x}px, ${feet.y - figure.rest.y}px) scale(${scale})`;
            } else {
                figure.stage.style.transform = '';
            }
        }

        this.moveBackdrop(moved, zs);
        this.updateEffects(dt);
        this.renderer.render(this.scene, this.camera);
    }

    private moveBackdrop(moved: boolean, zs: number[]) {
        if (!moved || zs.length === 0) {
            this.backdrop.style.transform = '';

            return;
        }

        const z = zs.reduce((sum, value) => sum + value, 0) / zs.length;
        const a = new THREE.Vector3(-3, 0, z);
        const b = new THREE.Vector3(3, 0, z);
        const ra = this.project(a, this.restCamera);
        const rb = this.project(b, this.restCamera);
        const ca = this.project(a, this.camera);
        const cb = this.project(b, this.camera);
        const zoom = Math.max(1, Math.hypot(cb.x - ca.x, cb.y - ca.y) / Math.hypot(rb.x - ra.x, rb.y - ra.y));
        // A pintura nunca sai da borda da arena (senão abriria uma faixa vazia do lado).
        const tx = THREE.MathUtils.clamp(ca.x - ra.x * zoom, this.width * (1 - zoom), 0);
        const ty = THREE.MathUtils.clamp(ca.y - ra.y * zoom, this.height * (1 - zoom), 0);

        this.backdrop.style.transform = `translate(${tx}px, ${ty}px) scale(${zoom})`;
    }

    private updateEffects(dt: number) {
        for (let i = this.arrows.length - 1; i >= 0; i--) {
            const arrow = this.arrows[i]!;
            const t = Math.min(1, (this.now - arrow.start) / (arrow.orb ? FLIGHT * 1.6 : FLIGHT));

            arrow.mesh.position.lerpVectors(arrow.from, arrow.to, t);
            arrow.mesh.position.y += Math.sin(Math.PI * t) * 0.15;
            arrow.mesh.rotation.y = arrow.to.x < arrow.from.x ? Math.PI : 0;

            if (t >= 1 && !arrow.hit) {
                arrow.hit = true;
                // A esfera estoura no alvo; a flecha fica cravada um instante.
                if (arrow.orb) arrow.mesh.visible = false;
            }

            if (this.now - arrow.start > FLIGHT + 0.5) {
                this.scene.remove(arrow.mesh);
                this.arrows.splice(i, 1);
            }
        }

        for (let i = this.bursts.length - 1; i >= 0; i--) {
            const burst = this.bursts[i]!;
            const age = this.now - burst.born;
            const position = burst.points.geometry.attributes.position as THREE.BufferAttribute;

            burst.velocity.forEach((v, n) => {
                v.y += (burst.rise ? 1.5 : -6) * dt;
                position.setXYZ(n, position.getX(n) + v.x * dt, Math.max(0.02, position.getY(n) + v.y * dt), position.getZ(n) + v.z * dt);
            });
            position.needsUpdate = true;
            (burst.points.material as THREE.PointsMaterial).opacity = Math.max(0, 1 - age / 0.9);

            if (age > 0.9) {
                this.scene.remove(burst.points);
                burst.points.geometry.dispose();
                (burst.points.material as THREE.Material).dispose();
                this.bursts.splice(i, 1);
            }
        }

        for (let i = this.glows.length - 1; i >= 0; i--) {
            const glow = this.glows[i]!;
            const t = (this.now - glow.born) / glow.duration;

            glow.light.intensity = glow.peak * Math.sin(Math.PI * Math.min(1, t));

            if (t >= 1) {
                this.scene.remove(glow.light);
                glow.light.dispose();
                this.glows.splice(i, 1);
            }
        }
    }
}
