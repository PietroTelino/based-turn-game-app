import * as THREE from 'three';

/**
 * Comportamento dos personagens feitos em código (o .glb traz a configuração
 * em userData.rig): física da capa, do cabelo e da barba, mãos fechadas, o
 * cajado preso no punho e os pés sempre no chão.
 *
 * Tudo é calculado com as matrizes do mundo (e não só rotações), para valer
 * também no time da direita, que a arena mostra espelhado.
 */

interface RigData {
    k: number;
    prefix: string;
    chains: { bones: string[]; stiff: number; collide: boolean; gravity?: number; damp?: number }[];
    cloth?: number[];
    colliders: [string, string, number][];
    grip: Record<string, { fingers: number[]; thumb: number[]; hold: string | null } | undefined>;
    /** O cajado: de gelo (Criomante), de fogo (Piromante) ou sagrado (Sacerdote). */
    staff?: 'ice' | 'fire' | 'holy' | 'wood' | 'skull' | 'totem' | 'thorn';
    /** Algo preso às costas (o alaúde do Bardo, a aljava do Arqueiro). */
    back?: 'lute' | 'quiver';
}

interface Chain {
    bones: THREE.Bone[];
    rest: THREE.Quaternion[];
    stiff: number;
    collide: boolean;
    gravity: number;
    damp: number;
    cloth: boolean;
    target: THREE.Vector3[];
    p: THREE.Vector3[];
    q: THREE.Vector3[];
    len: number[];
}

export interface Rig {
    /** Antes do mixer: os dedos voltam à pose de origem (a animação escreve por cima). */
    beforeAnimate(): void;
    /** Depois do mixer e com as matrizes do mundo em dia. */
    step(dt: number): void;
}

const FINGERS = ['Thumb', 'Index', 'Middle', 'Ring', 'Pinky'];
const UP = new THREE.Vector3(0, 1, 0);
const clamp = (x: number, a: number, b: number) => Math.max(a, Math.min(b, x));
const V = () => new THREE.Vector3();
const M1 = new THREE.Matrix4();
const M2 = new THREE.Matrix4();
const ONE = new THREE.Vector3(1, 1, 1);

/** Gira um osso no espaço do mundo em volta de um ponto (vale com o pai espelhado). */
function rotateWorld(object: THREE.Object3D, rotation: THREE.Quaternion, pivot: THREE.Vector3) {
    M2.makeRotationFromQuaternion(rotation).multiply(M1.makeTranslation(-pivot.x, -pivot.y, -pivot.z));
    M1.makeTranslation(pivot.x, pivot.y, pivot.z).multiply(M2).multiply(object.matrixWorld);
    M2.copy(object.parent!.matrixWorld).invert().multiply(M1);
    M2.decompose(object.position, object.quaternion, object.scale);
    object.scale.copy(ONE);
    object.updateMatrixWorld(true);
}

/** Procura no modelo (já clonado, ainda na pose de origem e fora da cena) o nó com a configuração. */
export function attachRig(model: THREE.Object3D): Rig | null {
    let root: THREE.Object3D | null = null;

    model.traverse((node) => { if (!root && node.userData.rig) root = node; });

    return root ? makeRig(root) : null;
}

function makeRig(root: THREE.Object3D): Rig {
    const rig = root.userData.rig as RigData;
    const byName: Record<string, THREE.Bone> = {};

    root.traverse((node) => { if ((node as THREE.Bone).isBone) byName[node.name] = node as THREE.Bone; });

    const B = (name: string) => byName[rig.prefix + name] ?? byName[name];
    const k = rig.k;

    root.updateMatrixWorld(true);

    // ---------------------------------------------------- cadeias com física
    const chains: Chain[] = rig.chains.map((c) => {
        const bones = c.bones.map((name) => byName[name]!);

        return { bones, rest: bones.map((b) => b.quaternion.clone()), stiff: c.stiff, collide: c.collide, gravity: c.gravity ?? 6, damp: c.damp ?? 0.94, cloth: false, target: [], p: [], q: [], len: [] };
    });
    const cloth = (rig.cloth ?? []).map((i) => chains[i]!);
    let gaps: number[][] = [];

    for (const chain of cloth) chain.cloth = true;

    const colliders = rig.colliders.map(([a, b, r]) => ({ a: byName[a]!, b: byName[b]!, r, arm: /(Shoulder|Arm|ForeArm|Hand)$/.test(a) }));
    const spine = B('Spine2')!;

    // ---------------------------------------------------- pés no chão
    const feet = ['LeftFoot', 'RightFoot', 'LeftToeBase', 'RightToeBase', 'LeftToe_End', 'RightToe_End'].map(B).filter((b): b is THREE.Bone => !!b);
    const hips = B('Hips')!;
    const lowest = () => Math.min(...feet.map((b) => root.worldToLocal(b.getWorldPosition(V())).y));
    const restLow = lowest();

    // ---------------------------------------------------- dedos e punho
    const fingers: { bone: THREE.Bone; bind: THREE.Quaternion; curl: THREE.Quaternion }[] = [];
    let grip: { hand: THREE.Bone; hole: THREE.Vector3; fist: THREE.Vector3 } | null = null;
    let palm: { hand: THREE.Bone; at: THREE.Vector3 } | null = null;
    const daggers: { hand: THREE.Bone; hole: THREE.Vector3; fist: THREE.Vector3; mesh: THREE.Group; shield: boolean; upright: boolean }[] = [];

    for (const side of ['Left', 'Right']) {
        const g = rig.grip[side];
        const hand = B(side + 'Hand');

        if (!g || !hand) continue;

        const P = (name: string) => B(name)!.getWorldPosition(V());
        const across = P(side + 'HandIndex1').sub(P(side + 'HandPinky1')).normalize();
        const along = P(side + 'HandMiddle1').sub(P(side + 'Hand')).normalize();
        const sign = side === 'Left' ? -1 : 1;

        for (const finger of FINGERS) {
            for (let i = 1; i <= 3; i++) {
                const bone = B(`${side}Hand${finger}${i}`);

                if (!bone) continue;

                const degrees = (finger === 'Thumb' ? g.thumb : g.fingers)[i - 1] ?? 0;
                const axisWorld = finger === 'Thumb' ? along.clone().multiplyScalar(sign) : across;
                const axis = axisWorld.clone().transformDirection(M1.copy(bone.matrixWorld).invert());

                fingers.push({ bone, bind: bone.quaternion.clone(), curl: new THREE.Quaternion().setFromAxisAngle(axis, sign * THREE.MathUtils.degToRad(degrees)) });
            }
        }

        if (g.hold === 'staff') {
            const fist = P(side + 'Hand').lerp(P(side + 'HandMiddle2'), 0.75).add(new THREE.Vector3(0, -0.11 * k, 0.03 * k));

            grip = { hand, hole: across.clone().transformDirection(M1.copy(hand.matrixWorld).invert()), fist: hand.worldToLocal(fist) };
        }

        const held = g.hold && g.hold !== 'staff' && g.hold !== 'flame' ? makeHeld(k, g.hold) : null;

        if (held) {
            const fist = P(side + 'Hand').lerp(P(side + 'HandMiddle2'), 0.75).add(new THREE.Vector3(0, -0.11 * k, 0.03 * k));

            held.name = 'arma';
            root.add(held);
            daggers.push({ hand, hole: across.clone().transformDirection(M1.copy(hand.matrixWorld).invert()), fist: hand.worldToLocal(fist), mesh: held, shield: g.hold === 'shield', upright: g.hold === 'axe' || g.hold === 'bow' });
        }

        if (g.hold === 'flame') palm = { hand, at: hand.worldToLocal(P(side + 'Hand').lerp(P(side + 'HandMiddle1'), 0.55)) };
    }

    const staff = grip ? (rig.staff === 'fire' ? makeFireStaff(k) : rig.staff === 'holy' ? makeHolyStaff(k) : rig.staff && rig.staff !== 'ice' ? makeWoodStaff(k, rig.staff) : makeStaff(k)) : null;
    const flame = palm ? makeFlame(k) : null;

    if (staff) {
        staff.name = 'cajado';
        root.add(staff);
    }

    // algo preso às costas: posto no lugar com o corpo na pose de origem e preso ao tronco
    if (rig.back) {
        const item = rig.back === 'lute' ? makeLute(k) : makeQuiver(k);
        const s2 = spine.getWorldPosition(V());

        item.position.copy(root.worldToLocal(s2.clone().add(new THREE.Vector3(0, 0, -0.8 * k))));
        item.rotation.set(0, Math.PI, rig.back === 'lute' ? 0.6 : -0.35);
        root.add(item);
        root.updateMatrixWorld(true);
        spine.attach(item);
    }
    if (flame) root.add(flame.group);

    // ---------------------------------------------------- por quadro
    let ready = false;
    let time = 0;
    const tmp = V();
    const tmp2 = V();
    const turn = new THREE.Quaternion();

    function beforeAnimate() {
        for (const f of fingers) f.bone.quaternion.copy(f.bind);
    }

    function step(dt: number) {
        time += dt;
        for (const f of fingers) f.bone.quaternion.multiply(f.curl);
        root.updateMatrixWorld(true);

        // O pé mais baixo encosta no chão: nem afunda nem flutua.
        const lift = restLow - lowest();
        const hip = hips.getWorldPosition(V()).add(root.localToWorld(V().set(0, lift, 0)).sub(root.localToWorld(V())));

        hips.position.copy(hips.parent!.worldToLocal(hip));
        root.updateMatrixWorld(true);

        const scale = root.matrixWorld.getMaxScaleOnAxis();
        // A física foi acertada para um personagem de 2 de altura: a gravidade acompanha o tamanho dele na cena.
        const size = (k * 10 * scale) / 2;
        const segs = colliders.map((c) => ({ a: c.a.getWorldPosition(V()), b: c.b.getWorldPosition(V()), r: c.r * scale, arm: c.arm }));
        const center = spine.getWorldPosition(V());
        const sub = 3;
        const h = Math.min(dt, 1 / 20) / sub;

        // 1. alvos (a pose sem física)
        for (const ch of chains) {
            ch.bones.forEach((b, i) => b.quaternion.copy(ch.rest[i]!));
            ch.bones[0]!.updateMatrixWorld(true);
            ch.target = ch.bones.map((b) => b.getWorldPosition(V()));

            if (!ready) {
                ch.p = ch.target.map((x) => x.clone());
                ch.q = ch.target.map((x) => x.clone());
                ch.len = ch.target.map((x, i) => (i ? x.distanceTo(ch.target[i - 1]!) : 0));
            }
        }

        if (!ready) gaps = cloth.slice(0, -1).map((ch, c) => ch.target.map((x, r) => x.distanceTo(cloth[c + 1]!.target[r]!)));

        const collide = (p: THREE.Vector3, cloak: boolean) => {
            for (const c of segs) {
                const ab = tmp2.copy(c.b).sub(c.a);
                const t = clamp(tmp.copy(p).sub(c.a).dot(ab) / ab.lengthSq(), 0, 1);
                const near = c.a.clone().addScaledVector(ab, t);

                if (cloak && c.arm && Math.hypot(near.x - center.x, near.z - center.z) < 1.75 * k * scale) {
                    // A capa fica sempre por fora do braço: no braço ou entre ele e o corpo, o pano vai para longe do corpo.
                    const px = p.x - center.x;
                    const pz = p.z - center.z;
                    const rp = Math.hypot(px, pz);
                    const ra = Math.hypot(near.x - center.x, near.z - center.z);

                    if (rp < 1e-6 || ra < 1e-6) continue;

                    const side = Math.acos(clamp((px * (near.x - center.x) + pz * (near.z - center.z)) / (rp * ra), -1, 1)) * ra;

                    if (Math.abs(p.y - near.y) < c.r && side < c.r * 1.15 && rp < ra + c.r) {
                        p.x = center.x + (px / rp) * (ra + c.r);
                        p.z = center.z + (pz / rp) * (ra + c.r);
                    }

                    continue;
                }

                const off = tmp.copy(p).sub(near);
                const d = off.length();

                if (d < c.r && d > 1e-6) p.copy(near).addScaledVector(off, c.r / d);
            }
        };

        for (let s = 0; s < sub; s++) {
            // 2. cada fio: inércia, gravidade, volta à pose e comprimento fixo
            for (const ch of chains) {
                ch.p[0]!.copy(ch.target[0]!);

                for (let i = 1; i < ch.p.length; i++) {
                    const p = ch.p[i]!;

                    tmp.copy(p).sub(ch.q[i]!).multiplyScalar(ch.damp);
                    ch.q[i]!.copy(p);
                    p.add(tmp).add(tmp2.set(0, -ch.gravity * size * h * h, 0));
                    p.lerp(ch.target[i]!, ch.stiff);

                    if (ch.cloth) {
                        // Cada faixa da capa volta para o seu lugar em volta do corpo.
                        const px = p.x - center.x;
                        const pz = p.z - center.z;
                        let d = Math.atan2(ch.target[i]!.x - center.x, ch.target[i]!.z - center.z) - Math.atan2(px, pz);

                        d = Math.atan2(Math.sin(d), Math.cos(d)) * 0.3;
                        p.x = center.x + px * Math.cos(d) + pz * Math.sin(d);
                        p.z = center.z - px * Math.sin(d) + pz * Math.cos(d);
                    }

                    tmp.copy(p).sub(ch.p[i - 1]!).setLength(ch.len[i]!);
                    p.copy(ch.p[i - 1]!).add(tmp);

                    if (ch.collide) collide(p, ch.cloth);
                }
            }

            // 3. pano: as faixas vizinhas não se afastam nem se amontoam
            for (let it = 0; it < 2; it++) {
                for (let c = 0; c < cloth.length - 1; c++) {
                    const A = cloth[c]!;
                    const Bc = cloth[c + 1]!;

                    for (let r = 1; r < A.p.length; r++) {
                        const rest = gaps[c]![r]!;
                        const d = A.p[r]!.distanceTo(Bc.p[r]!);
                        const want = clamp(d, rest * 0.8, rest * 1.08);

                        if (Math.abs(want - d) < 1e-6 || d < 1e-6) continue;

                        const fix = tmp.copy(Bc.p[r]!).sub(A.p[r]!).multiplyScalar(((d - want) / d) * 0.5);

                        A.p[r]!.add(fix);
                        Bc.p[r]!.sub(fix);
                    }
                }
            }

            for (const ch of cloth) {
                for (let i = 1; i < ch.p.length; i++) {
                    tmp.copy(ch.p[i]!).sub(ch.p[i - 1]!).setLength(ch.len[i]!);
                    ch.p[i]!.copy(ch.p[i - 1]!).add(tmp);
                    collide(ch.p[i]!, true);
                }
            }
        }

        // 4. os ossos apontam para os pontos simulados
        for (const ch of chains) {
            for (let i = 0; i < ch.bones.length - 1; i++) {
                const b = ch.bones[i]!;

                b.updateMatrixWorld(true);

                const at = b.getWorldPosition(V());
                const from = ch.bones[i + 1]!.getWorldPosition(V()).sub(at).normalize();
                const to = ch.p[i + 1]!.clone().sub(at).normalize();

                rotateWorld(b, turn.setFromUnitVectors(from, to), at);
            }
        }

        ready = true;

        // Cajado preso no punho: o pulso gira (até 70°) para ele ficar o mais em pé possível.
        if (grip && staff) {
            const axis = grip.hole.clone().transformDirection(grip.hand.matrixWorld);
            const fix = turn.setFromUnitVectors(axis, UP.clone().lerp(axis, 0.15).normalize());
            const angle = 2 * Math.acos(clamp(Math.abs(fix.w), 0, 1));
            const max = THREE.MathUtils.degToRad(70);

            if (angle > max) fix.slerp(new THREE.Quaternion(), 1 - max / angle);

            rotateWorld(grip.hand, fix, grip.hand.getWorldPosition(V()));

            const held = grip.hole.clone().transformDirection(grip.hand.matrixWorld);
            const world = new THREE.Matrix4().compose(grip.hand.localToWorld(grip.fist.clone()), new THREE.Quaternion().setFromUnitVectors(UP, held), new THREE.Vector3(scale, scale, scale));

            M2.copy(root.matrixWorld).invert().multiply(world).decompose(staff.position, staff.quaternion, staff.scale);
            flickerStaff(staff, time);
        }

        // As adagas ficam presas no punho e seguem a mão como ela estiver (a lâmina sai do lado do polegar).
        for (const d of daggers) {
            if (d.upright) {
                // armas grandes (machado, arco) ficam em pé como o cajado: o pulso gira até 70°
                const axis = d.hole.clone().transformDirection(d.hand.matrixWorld);
                const fix = new THREE.Quaternion().setFromUnitVectors(axis, UP.clone().lerp(axis, 0.15).normalize());
                const angle = 2 * Math.acos(clamp(Math.abs(fix.w), 0, 1));
                const max = THREE.MathUtils.degToRad(70);

                if (angle > max) fix.slerp(new THREE.Quaternion(), 1 - max / angle);
                rotateWorld(d.hand, fix, d.hand.getWorldPosition(V()));
            }

            const held = d.hole.clone().transformDirection(d.hand.matrixWorld);
            const at = d.hand.localToWorld(d.fist.clone());
            let turn = new THREE.Quaternion().setFromUnitVectors(UP, held);

            if (d.shield) {
                // o escudo fica de frente para fora do corpo, com a alça no punho
                const out = at.clone().sub(spine.getWorldPosition(V())).setY(0).normalize();
                const y = held.clone().normalize();
                const z = out.sub(y.clone().multiplyScalar(out.dot(y))).normalize();
                const x = y.clone().cross(z);

                turn = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(x, y, z));
            }

            const world = new THREE.Matrix4().compose(at, turn, new THREE.Vector3(scale, scale, scale));

            M2.copy(root.matrixWorld).invert().multiply(world).decompose(d.mesh.position, d.mesh.quaternion, d.mesh.scale);
        }

        // A chama flutua junto da mão, sempre em pé, e tremula.
        if (palm && flame) {
            // à frente da mão (para onde o personagem olha) e um pouco acima
            const forward = new THREE.Vector3(0, 0, 1).transformDirection(root.matrixWorld);
            const at = palm.hand.localToWorld(palm.at.clone()).addScaledVector(forward, 0.45 * k * scale).add(new THREE.Vector3(0, (0.3 + Math.sin(time * 3) * 0.04) * k * scale, 0));
            const world = new THREE.Matrix4().compose(at, new THREE.Quaternion(), new THREE.Vector3(scale, scale, scale));

            M2.copy(root.matrixWorld).invert().multiply(world).decompose(flame.group.position, flame.group.quaternion, flame.group.scale);
            flame.flicker(time);
        }
    }

    return { beforeAnimate, step };
}

/**
 * O cajado do Criomante: haste clara e trançada, ponteira de metal, cabeça
 * entalhada em garras segurando um buquê de cristais de gelo e um pingente.
 * Em unidades de k (1/10 da altura); o punho fica na origem.
 */
function makeStaff(k: number): THREE.Group {
    const g = new THREE.Group();
    const bone = new THREE.MeshStandardMaterial({ color: 0xe9e3d6, roughness: 0.65 });
    const boneShade = new THREE.MeshStandardMaterial({ color: 0xc9c1b1, roughness: 0.7 });
    const metal = new THREE.MeshStandardMaterial({ color: 0x8d969f, metalness: 0.75, roughness: 0.35 });
    const leather = new THREE.MeshStandardMaterial({ color: 0x6b4a33, roughness: 0.8 });
    const ice = new THREE.MeshStandardMaterial({ color: 0xbfe6ff, emissive: 0x3d8fe0, emissiveIntensity: 0.35, roughness: 0.12, transparent: true, opacity: 0.92, flatShading: true });

    // O brilho próprio do gelo continua quando a arena mexe no brilho da figura (alvo, golpe).
    ice.userData.baseEmissive = 0x3d8fe0;

    const add = (geo: THREE.BufferGeometry, mat: THREE.Material, x: number, y: number, z: number, rx = 0) => {
        const mesh = new THREE.Mesh(geo, mat);

        mesh.position.set(x * k, y * k, z * k);
        mesh.rotation.x = rx;
        g.add(mesh);

        return mesh;
    };
    const bottom = -3.9;
    const top = 4.3;

    // haste: miolo e três fios enrolados em espiral
    add(new THREE.CylinderGeometry(0.1 * k, 0.09 * k, (top - bottom) * k, 10), boneShade, 0, (top + bottom) / 2, 0);

    for (let f = 0; f < 3; f++) {
        const points: THREE.Vector3[] = [];

        for (let i = 0; i <= 120; i++) {
            const t = i / 120;
            const a = f * ((Math.PI * 2) / 3) + t * Math.PI * 2 * 9;

            points.push(new THREE.Vector3(Math.cos(a) * 0.075 * k, (bottom + (top - bottom) * t) * k, Math.sin(a) * 0.075 * k));
        }

        g.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 240, 0.055 * k, 6), bone));
    }

    // ponteira, amarração de couro e anel
    add(new THREE.CylinderGeometry(0.13 * k, 0.12 * k, 0.25 * k, 10), metal, 0, bottom - 0.1, 0);
    add(new THREE.ConeGeometry(0.11 * k, 0.55 * k, 8), metal, 0, bottom - 0.5, 0, Math.PI);
    add(new THREE.CylinderGeometry(0.135 * k, 0.135 * k, 0.32 * k, 10), leather, 0, top - 0.45, 0);
    add(new THREE.TorusGeometry(0.135 * k, 0.03 * k, 5, 12), metal, 0, top - 0.25, 0, Math.PI / 2);

    // nó entalhado e garras curvas que abraçam os cristais
    add(new THREE.SphereGeometry(0.2 * k, 10, 8), bone, 0, top + 0.05, 0).scale.set(1, 1.3, 1);

    for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2 + 0.3;
        const out = new THREE.Vector3(Math.cos(a), 0, Math.sin(a));
        const curve = new THREE.CatmullRomCurve3([
            new THREE.Vector3(0, top * k, 0),
            out.clone().multiplyScalar(0.22 * k).setY((top + 0.35) * k),
            out.clone().multiplyScalar(0.38 * k).setY((top + 0.75) * k),
            out.clone().multiplyScalar(0.3 * k).setY((top + 1.15) * k),
            out.clone().multiplyScalar(0.16 * k).setY((top + 1.4) * k),
        ]);

        g.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 24, 0.055 * k, 6), bone));
    }

    // buquê de cristais: um grande no centro e lascas abertas em leque
    const crystal = (len: number, rad: number) => {
        const body = new THREE.CylinderGeometry(rad, rad * 0.9, len * 0.62, 6);
        const tip = new THREE.ConeGeometry(rad, len * 0.38, 6);
        const group = new THREE.Group();

        body.translate(0, len * 0.31, 0);
        tip.translate(0, len * 0.81, 0);
        group.add(new THREE.Mesh(body, ice), new THREE.Mesh(tip, ice));

        return group;
    };
    const base = new THREE.Vector3(0, (top + 0.75) * k, 0);
    const shards = [
        [0, 0, 2.4, 0.26], [0.38, 0.3, 1.8, 0.19], [-0.36, 1.4, 1.85, 0.19], [0.42, 2.5, 1.6, 0.17], [-0.4, 3.6, 1.65, 0.17], [0.45, 4.7, 1.5, 0.16],
        [0.75, 0.9, 1.05, 0.12], [-0.8, 2.0, 1.0, 0.12], [0.85, 3.1, 0.95, 0.11], [-0.78, 4.2, 0.95, 0.11], [0.8, 5.4, 0.9, 0.11], [1.05, 1.6, 0.6, 0.08], [-1.05, 3.8, 0.6, 0.08],
    ];

    for (const [tilt, spin, len, rad] of shards) {
        const c = crystal(len! * k, rad! * k);

        c.position.copy(base);
        c.rotation.set(0, spin!, tilt!, 'YXZ');
        g.add(c);
    }

    // pingente: um cristalzinho pendurado numa corrente
    add(new THREE.CylinderGeometry(0.008 * k, 0.008 * k, 0.6 * k, 4), metal, 0.25, top - 0.05, 0.05);

    const pendant = crystal(0.32 * k, 0.05 * k);

    pendant.rotation.z = Math.PI;
    pendant.position.set(0.25 * k, (top - 0.3) * k, 0.05 * k);
    g.add(pendant);
    g.traverse((part) => { if ((part as THREE.Mesh).isMesh) part.castShadow = true; });

    return g;
}

/** Material de fogo: brilho próprio, mesmo quando a arena mexe no brilho da figura. */
function fireMaterial(color: number, glow: number, opacity = 1, flat = true) {
    const material = new THREE.MeshStandardMaterial({ color, emissive: glow, emissiveIntensity: 1, roughness: 0.4, transparent: opacity < 1, opacity, depthWrite: opacity >= 1, flatShading: flat });

    material.userData.baseEmissive = glow;

    return material;
}

/** A chama na mão: três camadas de labareda (vermelha, laranja e um miolo amarelo). */
function makeFlame(k: number) {
    const group = new THREE.Group();
    const layers = [
        { color: 0xb3260a, glow: 0xd83a10, size: 0.42, height: 0.95, opacity: 0.55 },
        { color: 0xff7a1a, glow: 0xff6a10, size: 0.31, height: 0.72, opacity: 0.8 },
        { color: 0xffd36a, glow: 0xffc240, size: 0.17, height: 0.5, opacity: 1 },
    ].map((layer) => {
        const geometry = new THREE.SphereGeometry(layer.size * k, 18, 14);
        const position = geometry.attributes.position as THREE.BufferAttribute;

        // gota: larga embaixo, afinando em ponta para cima
        for (let i = 0; i < position.count; i++) {
            const y = position.getY(i) / (layer.size * k);
            const narrow = y > 0 ? 1 - y * 0.6 : 1;

            position.setXYZ(i, position.getX(i) * narrow, y > 0 ? y * layer.height * k : y * layer.size * k * 0.8, position.getZ(i) * narrow);
        }
        geometry.computeVertexNormals();

        const mesh = new THREE.Mesh(geometry, fireMaterial(layer.color, layer.glow, layer.opacity, false));

        group.add(mesh);

        return mesh;
    });

    return {
        group,
        flicker(time: number) {
            layers.forEach((mesh, i) => {
                const f = 1 + 0.12 * Math.sin(time * (11 + i * 3)) + 0.08 * Math.sin(time * (17 + i * 5));

                mesh.scale.set(1 / Math.sqrt(f), f, 1 / Math.sqrt(f));
                mesh.rotation.y = time * (1.5 + i);
                mesh.rotation.z = 0.08 * Math.sin(time * (7 + i));
            });
        },
    };
}

/** A pedra de fogo do cajado pulsa. */
function flickerStaff(staff: THREE.Object3D, time: number) {
    const gem = staff.getObjectByName('fire-gem');

    if (gem) gem.scale.setScalar(1 + 0.06 * Math.sin(time * 6) + 0.04 * Math.sin(time * 13));
}

/**
 * O cajado do Piromante: madeira escura retorcida (dois troncos trançados),
 * e no alto uma gaiola de galhos curvos prendendo uma pedra de fogo.
 * Em unidades de k (1/10 da altura); o punho fica na origem.
 */
function makeFireStaff(k: number): THREE.Group {
    const g = new THREE.Group();
    const wood = new THREE.MeshStandardMaterial({ color: 0x4a2f1f, roughness: 0.85 });
    const woodDark = new THREE.MeshStandardMaterial({ color: 0x2f1c12, roughness: 0.9 });
    const bronze = new THREE.MeshStandardMaterial({ color: 0x9a6b35, metalness: 0.6, roughness: 0.45 });
    const bottom = -3.9;
    const top = 4.0;

    // dois troncos trançados, um pouco tortos
    for (let f = 0; f < 2; f++) {
        const points: THREE.Vector3[] = [];

        for (let i = 0; i <= 80; i++) {
            const t = i / 80;
            const a = f * Math.PI + t * Math.PI * 2 * 3.5;
            const r = 0.07 + 0.02 * Math.sin(t * 9);

            points.push(new THREE.Vector3(Math.cos(a) * r * k + Math.sin(t * 4) * 0.04 * k, (bottom + (top - bottom) * t) * k, Math.sin(a) * r * k));
        }

        g.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 160, 0.085 * k, 7), f ? woodDark : wood));
    }

    // nós na madeira e ponteira
    for (const y of [-2.2, 0.9, 2.6]) {
        const knot = new THREE.Mesh(new THREE.SphereGeometry(0.15 * k, 7, 5), wood);

        knot.position.set(0.04 * k, y * k, 0);
        knot.scale.set(1, 0.7, 1);
        g.add(knot);
    }

    const tip = new THREE.Mesh(new THREE.ConeGeometry(0.12 * k, 0.5 * k, 7), woodDark);

    tip.position.y = (bottom - 0.2) * k;
    tip.rotation.x = Math.PI;
    g.add(tip);

    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.15 * k, 0.035 * k, 5, 12), bronze);

    ring.position.y = (top - 0.1) * k;
    ring.rotation.x = Math.PI / 2;
    g.add(ring);

    // gaiola: galhos curvos saindo do alto, abrindo e fechando em volta da pedra
    const center = (top + 0.85) * k;

    for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2;
        const out = new THREE.Vector3(Math.cos(a), 0, Math.sin(a));
        const twist = new THREE.Vector3(Math.cos(a + 0.9), 0, Math.sin(a + 0.9));
        const curve = new THREE.CatmullRomCurve3([
            new THREE.Vector3(0, top * k, 0),
            out.clone().multiplyScalar(0.3 * k).setY((top + 0.3) * k),
            out.clone().lerp(twist, 0.5).multiplyScalar(0.48 * k).setY(center),
            twist.clone().multiplyScalar(0.3 * k).setY((top + 1.45) * k),
            new THREE.Vector3(0, (top + 1.8) * k, 0),
        ]);

        g.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 28, 0.055 * k, 6), i % 2 ? woodDark : wood));
    }

    // a pedra de fogo: um cristal laranja com miolo amarelo
    const gem = new THREE.Group();

    gem.name = 'fire-gem';
    gem.position.y = center;

    const outer = new THREE.Mesh(new THREE.OctahedronGeometry(0.3 * k, 0), fireMaterial(0xe0480f, 0xff5a10, 0.9));
    const core = new THREE.Mesh(new THREE.OctahedronGeometry(0.16 * k, 0), fireMaterial(0xffc24a, 0xffb030));

    outer.scale.y = 1.45;
    core.scale.y = 1.45;
    gem.add(outer, core);
    g.add(gem);
    g.traverse((part) => { if ((part as THREE.Mesh).isMesh) part.castShadow = true; });

    return g;
}

/**
 * O cajado do Sacerdote: madeira escura torcida com ponteira dourada e, no
 * alto, um anel dourado com pontas de estrela segurando um cristal claro.
 * Em unidades de k (1/10 da altura); o punho fica na origem.
 */
function makeHolyStaff(k: number): THREE.Group {
    const g = new THREE.Group();
    const wood = new THREE.MeshStandardMaterial({ color: 0x4f3220, roughness: 0.8 });
    const gold = new THREE.MeshStandardMaterial({ color: 0xd4a646, metalness: 0.8, roughness: 0.3 });
    const crystal = new THREE.MeshStandardMaterial({ color: 0xf2f6ff, emissive: 0xbfd4ff, emissiveIntensity: 0.6, roughness: 0.1, transparent: true, opacity: 0.9, flatShading: true });

    crystal.userData.baseEmissive = 0x8fa6d0;

    const bottom = -3.9;
    const top = 3.9;
    const add = (geo: THREE.BufferGeometry, mat: THREE.Material, x: number, y: number, z: number, rz = 0) => {
        const mesh = new THREE.Mesh(geo, mat);

        mesh.position.set(x * k, y * k, z * k);
        mesh.rotation.z = rz;
        g.add(mesh);

        return mesh;
    };

    // haste torcida (um tubo com sulco em espiral)
    const points: THREE.Vector3[] = [];

    for (let i = 0; i <= 60; i++) points.push(new THREE.Vector3(0, (bottom + (top - bottom) * (i / 60)) * k, 0));
    g.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 60, 0.11 * k, 8), wood));

    for (let f = 0; f < 2; f++) {
        const spiral: THREE.Vector3[] = [];

        for (let i = 0; i <= 100; i++) {
            const t = i / 100;
            const a = f * Math.PI + t * Math.PI * 2 * 10;

            spiral.push(new THREE.Vector3(Math.cos(a) * 0.1 * k, (bottom + (top - bottom) * t) * k, Math.sin(a) * 0.1 * k));
        }

        g.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(spiral), 200, 0.03 * k, 5), wood));
    }

    // ponteira e anéis dourados
    add(new THREE.ConeGeometry(0.12 * k, 0.6 * k, 8), gold, 0, bottom - 0.25, 0).rotation.x = Math.PI;
    add(new THREE.CylinderGeometry(0.14 * k, 0.14 * k, 0.3 * k, 10), gold, 0, top - 0.1, 0);
    add(new THREE.SphereGeometry(0.16 * k, 10, 8), gold, 0, top + 0.12, 0);

    // anel com pontas de estrela
    const ringY = top + 0.85;
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.62 * k, 0.07 * k, 8, 32), gold);

    ring.position.y = ringY * k;
    g.add(ring);

    for (let i = 0; i < 4; i++) {
        const a = (i / 4) * Math.PI * 2;
        const spike = add(new THREE.ConeGeometry(0.1 * k, (i === 1 ? 0.6 : 0.38) * k, 4), gold, Math.cos(a) * 0.78, ringY + Math.sin(a) * 0.78, 0, a - Math.PI / 2);

        spike.scale.z = 0.6;
    }

    // o cristal claro no meio do anel
    const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.32 * k, 0), crystal);

    gem.name = 'fire-gem';
    gem.position.y = ringY * k;
    gem.scale.set(0.75, 1.5, 0.75);
    g.add(gem);
    g.traverse((part) => { if ((part as THREE.Mesh).isMesh) part.castShadow = true; });

    return g;
}

/**
 * Adaga do Ladino: cabo de couro com guarda de metal e lâmina reta ou curva.
 * Em unidades de k; o punho fica na origem e a lâmina sobe pelo eixo y.
 */
function makeDagger(k: number, curved: boolean): THREE.Group {
    const g = new THREE.Group();
    const steel = new THREE.MeshStandardMaterial({ color: 0xb9bec4, metalness: 0.85, roughness: 0.25 });
    const dark = new THREE.MeshStandardMaterial({ color: 0x4a4a4c, metalness: 0.7, roughness: 0.4 });
    const grip = new THREE.MeshStandardMaterial({ color: 0x3a2618, roughness: 0.85 });

    const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.06 * k, 0.065 * k, 0.55 * k, 8), grip);

    handle.position.y = -0.05 * k;
    g.add(handle);

    const pommel = new THREE.Mesh(new THREE.SphereGeometry(0.08 * k, 8, 6), dark);

    pommel.position.y = -0.35 * k;
    g.add(pommel);

    const guard = new THREE.Mesh(new THREE.BoxGeometry(0.42 * k, 0.07 * k, 0.1 * k), dark);

    guard.position.y = 0.25 * k;
    g.add(guard);

    // lâmina: uma faixa afinando até a ponta, achatada; a curva entorta para o lado do fio
    const length = curved ? 1.25 : 1.05;
    const shape = new THREE.Shape();

    shape.moveTo(-0.075 * k, 0);
    shape.lineTo(0.075 * k, 0);
    shape.lineTo(0.05 * k, length * 0.7 * k);
    shape.lineTo(0, length * k);
    shape.lineTo(-0.06 * k, length * 0.6 * k);
    shape.closePath();

    const geometry = new THREE.ExtrudeGeometry(shape, { depth: 0.025 * k, bevelEnabled: true, bevelThickness: 0.012 * k, bevelSize: 0.01 * k, bevelSegments: 1, steps: 1, curveSegments: 1 });

    geometry.translate(0, 0, -0.0125 * k);

    if (curved) {
        const position = geometry.attributes.position as THREE.BufferAttribute;

        for (let i = 0; i < position.count; i++) {
            const t = position.getY(i) / (length * k);

            position.setX(i, position.getX(i) + t * t * 0.35 * k);
        }

        geometry.computeVertexNormals();
    }

    const blade = new THREE.Mesh(geometry, steel);

    blade.position.y = 0.28 * k;
    g.add(blade);
    g.traverse((part) => { if ((part as THREE.Mesh).isMesh) part.castShadow = true; });

    return g;
}

const mat = (color: number, metal = 0, rough = 0.6) => new THREE.MeshStandardMaterial({ color, metalness: metal, roughness: rough });
function piece(g: THREE.Group, geo: THREE.BufferGeometry, m: THREE.Material, k: number, x: number, y: number, z: number, rx = 0, ry = 0, rz = 0) {
    const mesh = new THREE.Mesh(geo, m);

    mesh.position.set(x * k, y * k, z * k);
    mesh.rotation.set(rx, ry, rz);
    mesh.castShadow = true;
    g.add(mesh);

    return mesh;
}

/** Armas e escudo seguros na mão (o punho na origem, a arma subindo pelo eixo y). */
function makeHeld(k: number, kind: string): THREE.Group {
    if (kind === 'dagger' || kind === 'curved') return makeDagger(k, kind === 'curved');

    const g = new THREE.Group();
    const steel = mat(0xc4c9cf, 0.85, 0.25);
    const dark = mat(0x4a4a4c, 0.7, 0.4);
    const gold = mat(0xd2a347, 0.8, 0.3);
    const grip = mat(0x3a2618, 0, 0.85);
    const wood = mat(0x5a3b24, 0, 0.8);

    if (kind === 'sword' || kind === 'rapier') {
        const rapier = kind === 'rapier';

        piece(g, new THREE.CylinderGeometry(0.06 * k, 0.065 * k, 0.6 * k, 8), grip, k, 0, -0.05, 0);
        piece(g, new THREE.SphereGeometry(0.09 * k, 8, 6), rapier ? steel : gold, k, 0, -0.38, 0);
        piece(g, new THREE.BoxGeometry((rapier ? 0.5 : 0.75) * k, 0.08 * k, 0.12 * k), rapier ? steel : gold, k, 0, 0.27, 0);
        if (rapier) piece(g, new THREE.TorusGeometry(0.18 * k, 0.02 * k, 5, 14, Math.PI), steel, k, 0, 0.12, 0.05, 0, 0, Math.PI);

        const len = rapier ? 4.2 : 3.6;
        const w = rapier ? 0.045 : 0.13;
        const blade = new THREE.BoxGeometry(w * 2 * k, len * k, 0.035 * k);

        blade.translate(0, (0.3 + len / 2) * k, 0);
        g.add(new THREE.Mesh(blade, steel));
        piece(g, new THREE.ConeGeometry(w * 1.41 * k, 0.35 * k, 4), steel, k, 0, 0.3 + len + 0.17, 0, 0, Math.PI / 4).scale.z = 0.25;
    } else if (kind === 'axe') {
        // machado de batalha de duas lâminas, cabo longo
        piece(g, new THREE.CylinderGeometry(0.07 * k, 0.08 * k, 6.2 * k, 8), wood, k, 0, 1.2, 0);
        piece(g, new THREE.CylinderGeometry(0.11 * k, 0.11 * k, 0.5 * k, 8), dark, k, 0, 3.9, 0);

        for (const side of [-1, 1]) {
            const shape = new THREE.Shape();

            shape.moveTo(0, -0.35);
            shape.quadraticCurveTo(0.6, -0.9, 1.1, -0.95);
            shape.quadraticCurveTo(0.85, 0, 1.1, 0.95);
            shape.quadraticCurveTo(0.6, 0.9, 0, 0.35);
            shape.closePath();

            const geo = new THREE.ExtrudeGeometry(shape, { depth: 0.06, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.03, bevelSegments: 1 });

            geo.scale(side * k, k, k);
            geo.translate(0, 3.9 * k, -0.03 * k);
            g.add(new THREE.Mesh(geo, steel));
        }

        piece(g, new THREE.ConeGeometry(0.1 * k, 0.4 * k, 6), dark, k, 0, 4.6, 0);
    } else if (kind === 'mace') {
        // maça de flanges com cabo curto
        piece(g, new THREE.CylinderGeometry(0.06 * k, 0.07 * k, 2.6 * k, 8), dark, k, 0, 0.9, 0);
        piece(g, new THREE.SphereGeometry(0.28 * k, 10, 8), dark, k, 0, 2.4, 0);

        for (let i = 0; i < 6; i++) piece(g, new THREE.BoxGeometry(0.04 * k, 0.55 * k, 0.24 * k), steel, k, Math.cos((i / 6) * Math.PI * 2) * 0.24, 2.4, Math.sin((i / 6) * Math.PI * 2) * 0.24, 0, -(i / 6) * Math.PI * 2, 0);
        piece(g, new THREE.ConeGeometry(0.08 * k, 0.35 * k, 6), steel, k, 0, 2.85, 0);
    } else if (kind === 'bow') {
        // arco longo: duas curvas presas ao punho e a corda
        const points: THREE.Vector3[] = [];

        for (let i = 0; i <= 24; i++) {
            const t = i / 24 - 0.5;

            points.push(new THREE.Vector3(0, t * 6.2 * k, (0.55 - 2.2 * t * t) * k * 1.0 - 0.55 * k + Math.abs(t) * 0.25 * k));
        }

        g.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 48, 0.07 * k, 6), wood));
        piece(g, new THREE.CylinderGeometry(0.095 * k, 0.095 * k, 0.5 * k, 8), grip, k, 0, 0, 0);
        piece(g, new THREE.CylinderGeometry(0.01 * k, 0.01 * k, 6.1 * k, 3), mat(0xe8e0cc), k, 0, 0, -0.42);
        g.rotation.y = Math.PI / 2;

        const holder = new THREE.Group();

        holder.add(g);

        return holder;
    } else if (kind === 'shield') {
        // escudo de cavaleiro: branco com o sol dourado
        const shape = new THREE.Shape();

        shape.moveTo(0, 1.35);
        shape.quadraticCurveTo(1.0, 1.35, 1.0, 1.15);
        shape.lineTo(1.0, 0.1);
        shape.quadraticCurveTo(0.9, -1.0, 0, -1.6);
        shape.quadraticCurveTo(-0.9, -1.0, -1.0, 0.1);
        shape.lineTo(-1.0, 1.15);
        shape.quadraticCurveTo(-1.0, 1.35, 0, 1.35);

        const geo = new THREE.ExtrudeGeometry(shape, { depth: 0.08, bevelEnabled: true, bevelThickness: 0.04, bevelSize: 0.06, bevelSegments: 2 });

        geo.scale(k, k, k);
        geo.translate(0, 0, 0.35 * k);

        const face = new THREE.MeshStandardMaterial({ color: 0xece6d8, roughness: 0.5, metalness: 0.2 });

        g.add(new THREE.Mesh(geo, [face, gold]));

        const sun = new THREE.Mesh(new THREE.CircleGeometry(0.32 * k, 20), gold);

        sun.position.set(0, 0.05 * k, 0.5 * k);
        g.add(sun);

        for (let i = 0; i < 12; i++) {
            const a = (i / 12) * Math.PI * 2;
            const ray = new THREE.Mesh(new THREE.ConeGeometry(0.07 * k, (i % 2 ? 0.35 : 0.6) * k, 3), gold);

            ray.position.set(Math.sin(a) * 0.5 * k, 0.05 * k + Math.cos(a) * 0.5 * k, 0.5 * k);
            ray.rotation.z = -a;
            g.add(ray);
        }
    }

    g.traverse((part) => { if ((part as THREE.Mesh).isMesh) part.castShadow = true; });

    return g;
}

/** Cajados de madeira com enfeites diferentes no alto. */
function makeWoodStaff(k: number, kind: string): THREE.Group {
    const g = new THREE.Group();
    const color = kind === 'skull' ? 0x2b2018 : kind === 'thorn' ? 0x5b5a2c : 0x5a3b24;
    const wood = mat(color, 0, 0.85);
    const bottom = -3.9;
    const top = kind === 'totem' ? 4.6 : 4.0;
    const points: THREE.Vector3[] = [];

    for (let i = 0; i <= 40; i++) {
        const t = i / 40;

        points.push(new THREE.Vector3(Math.sin(t * 7) * 0.06 * k, (bottom + (top - bottom) * t) * k, Math.cos(t * 5) * 0.05 * k));
    }

    g.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 80, 0.1 * k, 7), wood));

    if (kind === 'wood') {
        // galhos se abrindo em volta de uma pedra âmbar
        for (let i = 0; i < 4; i++) {
            const a = (i / 4) * Math.PI * 2;
            const c = new THREE.CatmullRomCurve3([new THREE.Vector3(0, top * k, 0), new THREE.Vector3(Math.cos(a) * 0.4 * k, (top + 0.5) * k, Math.sin(a) * 0.4 * k), new THREE.Vector3(Math.cos(a + 0.6) * 0.3 * k, (top + 1.2) * k, Math.sin(a + 0.6) * 0.3 * k)]);

            g.add(new THREE.Mesh(new THREE.TubeGeometry(c, 16, 0.06 * k, 5), wood));
        }

        const gem = piece(g, new THREE.OctahedronGeometry(0.28 * k, 1), fireMaterial(0xe0a030, 0xc07a10, 0.92), k, 0, top + 0.65, 0);

        gem.name = 'fire-gem';
    } else if (kind === 'skull') {
        // caveira no alto, ossos e penduricalhos
        const bone = mat(0xd8cfb8, 0, 0.7);

        piece(g, new THREE.SphereGeometry(0.42 * k, 12, 10), bone, k, 0, top + 0.45, 0).scale.set(1, 1.05, 1.1);
        piece(g, new THREE.BoxGeometry(0.5 * k, 0.28 * k, 0.4 * k), bone, k, 0, top + 0.05, 0.08);

        for (const x of [-0.16, 0.16]) piece(g, new THREE.SphereGeometry(0.11 * k, 8, 6), fireMaterial(0x203a10, 0x7cff4a), k, x, top + 0.45, 0.36);
        for (let i = 0; i < 3; i++) piece(g, new THREE.CylinderGeometry(0.012 * k, 0.012 * k, 0.9 * k, 3), mat(0x3a2a1c), k, -0.3 + i * 0.3, top - 0.45, -0.1);
        for (let i = 0; i < 3; i++) piece(g, new THREE.SphereGeometry(0.08 * k, 6, 5), bone, k, -0.3 + i * 0.3, top - 0.95, -0.1);
    } else if (kind === 'totem') {
        // águia entalhada no alto, com penas penduradas
        const carved = mat(0x6b4a2e, 0, 0.8);

        piece(g, new THREE.CylinderGeometry(0.2 * k, 0.16 * k, 0.8 * k, 8), carved, k, 0, top + 0.2, 0);
        piece(g, new THREE.SphereGeometry(0.2 * k, 8, 6), carved, k, 0, top + 0.75, 0.05);
        piece(g, new THREE.ConeGeometry(0.08 * k, 0.3 * k, 6), mat(0xd8a640), k, 0, top + 0.7, 0.3, Math.PI / 2);

        for (const side of [-1, 1]) piece(g, new THREE.BoxGeometry(1.1 * k, 0.08 * k, 0.3 * k), carved, k, side * 0.6, top + 0.45, 0, 0, 0, side * 0.35);
        for (let i = 0; i < 3; i++) {
            const feather = piece(g, new THREE.ConeGeometry(0.08 * k, 0.7 * k, 4), mat(i % 2 ? 0xe8e0d0 : 0x5a3b24), k, 0.2 - i * 0.2, top - 0.6, 0.1, Math.PI);

            feather.scale.z = 0.3;
        }
    } else if (kind === 'thorn') {
        // galhos com folhas e um broto verde brilhando
        const leaf = mat(0x6f8a2a, 0, 0.7);

        for (let i = 0; i < 6; i++) {
            const a = (i / 6) * Math.PI * 2;
            const l = piece(g, new THREE.SphereGeometry(0.16 * k, 6, 4), leaf, k, Math.cos(a) * 0.25, top + 0.2 + (i % 2) * 0.3, Math.sin(a) * 0.25);

            l.scale.set(0.5, 1.4, 0.2);
            l.rotation.set(0, -a, 0.6);
        }

        const bud = piece(g, new THREE.SphereGeometry(0.22 * k, 10, 8), fireMaterial(0xc8ff60, 0x9adf30, 0.95), k, 0, top + 0.55, 0);

        bud.name = 'fire-gem';
        bud.scale.y = 1.3;
    }

    piece(g, new THREE.ConeGeometry(0.1 * k, 0.4 * k, 6), wood, k, 0, bottom - 0.15, 0, Math.PI);
    g.traverse((part) => { if ((part as THREE.Mesh).isMesh) part.castShadow = true; });

    return g;
}

/** O alaúde do Bardo, preso às costas. */
function makeLute(k: number): THREE.Group {
    const g = new THREE.Group();
    const wood = mat(0x8a5a2e, 0, 0.55);
    const dark = mat(0x3a2414, 0, 0.7);
    const body = piece(g, new THREE.SphereGeometry(0.9 * k, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2), wood, k, 0, -0.4, 0, -Math.PI / 2);

    body.scale.set(0.85, 1.15, 0.6);
    piece(g, new THREE.CircleGeometry(0.85 * k, 18), mat(0xc49a62, 0, 0.6), k, 0, -0.4, 0.001).scale.set(0.85, 1.15, 1);
    piece(g, new THREE.CircleGeometry(0.2 * k, 14), dark, k, 0, -0.15, 0.01);
    piece(g, new THREE.BoxGeometry(0.22 * k, 1.9 * k, 0.12 * k), dark, k, 0, 1.3, 0.04);
    piece(g, new THREE.BoxGeometry(0.3 * k, 0.5 * k, 0.1 * k), dark, k, 0, 2.4, -0.05, -0.5);
    g.traverse((part) => { if ((part as THREE.Mesh).isMesh) part.castShadow = true; });

    return g;
}

/** A aljava do Arqueiro, com flechas, presa às costas. */
function makeQuiver(k: number): THREE.Group {
    const g = new THREE.Group();

    piece(g, new THREE.CylinderGeometry(0.28 * k, 0.22 * k, 2.2 * k, 10), mat(0x6b4a33, 0, 0.8), k, 0, 0, 0);

    for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;

        piece(g, new THREE.CylinderGeometry(0.02 * k, 0.02 * k, 0.6 * k, 4), mat(0x8a6a44), k, Math.cos(a) * 0.12, 1.35, Math.sin(a) * 0.12);
        piece(g, new THREE.ConeGeometry(0.07 * k, 0.3 * k, 3), mat(0xe8e0d0), k, Math.cos(a) * 0.12, 1.6, Math.sin(a) * 0.12).scale.z = 0.3;
    }

    return g;
}
