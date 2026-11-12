import * as THREE from 'three';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { allFiles } from './models3d';

export interface Source {
    model: THREE.Group;
    clip: THREE.AnimationClip;
    /** A mesma animação sem o deslocamento do quadril no chão (o corpo fica no lugar). */
    still: THREE.AnimationClip;
    /** A altura do modelo, em unidades do arquivo (o boneco do Mixamo tem 181). */
    tall: number;
}

export interface LoadProgress {
    /** Arquivos já baixados e montados. */
    done: number;
    total: number;
    /** Bytes baixados até agora e o total (0 se o servidor não informar o tamanho). */
    loaded: number;
    bytes: number;
}

/**
 * Tira o deslocamento do quadril no chão (x/z), para o corpo atacar sem sair
 * do lugar. A altura (y) fica, para agachar e pular continuarem iguais.
 */
export function inPlace(clip: THREE.AnimationClip): THREE.AnimationClip {
    const copy = clip.clone();

    for (const track of copy.tracks) {
        if (!track.name.endsWith('Hips.position')) continue;

        const values = track.values;
        const [x0, , z0] = [values[0]!, values[1]!, values[2]!];

        for (let i = 0; i < values.length; i += 3) {
            values[i] = x0;
            values[i + 2] = z0;
        }
    }

    return copy;
}

/** Os modelos montados ficam guardados enquanto a página estiver aberta (valem para todas as batalhas). */
const SOURCES = new Map<string, Promise<Source>>();
export const LOADED = new Map<string, Source>();

function build(url: string, model: THREE.Group): Source {
    // O arquivo do Mixamo traz um clipe vazio ("Take 001") além da animação.
    const clip = model.animations.find((item) => item.duration > 0) ?? model.animations[0]!;
    const tall = new THREE.Box3().setFromObject(model).getSize(new THREE.Vector3()).y || 181;
    const source = { model, clip, still: inPlace(clip), tall };

    LOADED.set(url, source);

    return source;
}

/** Os personagens feitos em código vêm em .glb (com a física dentro); os do Mixamo, em .fbx. */
const isGltf = (url: string) => /\.glb(\?|$)/i.test(url);

async function fromGltf(url: string, data: ArrayBuffer | null): Promise<THREE.Group> {
    const loader = new GLTFLoader();
    const gltf = data ? await loader.parseAsync(data, url.slice(0, url.lastIndexOf('/') + 1)) : await loader.loadAsync(url);

    gltf.scene.animations = gltf.animations;

    return gltf.scene;
}

async function parse(url: string, buffer: ArrayBuffer): Promise<Source> {
    if (isGltf(url)) return build(url, await fromGltf(url, buffer));

    return build(url, new FBXLoader().parse(buffer, url.slice(0, url.lastIndexOf('/') + 1)));
}

/** Um modelo: o que já foi montado, ou baixa e monta agora. */
export function loadSource(url: string): Promise<Source> {
    let promise = SOURCES.get(url);

    if (!promise) {
        promise = (isGltf(url) ? fromGltf(url, null) : new FBXLoader().loadAsync(url)).then((model) => build(url, model));
        SOURCES.set(url, promise);
        // Se falhar, a próxima tentativa baixa de novo.
        promise.catch(() => SOURCES.delete(url));
    }

    return promise;
}

/** Baixa um arquivo inteiro, contando os bytes que vão chegando. */
async function download(url: string, onBytes: (size: number, total: number) => void): Promise<ArrayBuffer> {
    const response = await fetch(url);

    if (!response.ok || !response.body) throw new Error(`${response.status} ${url}`);

    const total = Number(response.headers.get('content-length')) || 0;
    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let size = 0;

    onBytes(0, total);

    for (;;) {
        const { done, value } = await reader.read();

        if (done) break;
        chunks.push(value);
        size += value.length;
        onBytes(size, total);
    }

    const buffer = new Uint8Array(size);
    let offset = 0;

    for (const chunk of chunks) {
        buffer.set(chunk, offset);
        offset += chunk.length;
    }

    return buffer.buffer;
}

/** Deixa a tela respirar entre um modelo e outro (a barra de progresso anda). */
const breathe = () => new Promise<void>((resolve) => window.setTimeout(resolve, 0));

/**
 * Baixa e monta todos os modelos do jogo, avisando o progresso. Os downloads
 * correm três de cada vez; a montagem é um modelo por vez, enquanto os próximos
 * ainda chegam. Um arquivo que falhar é pulado: a batalha tenta de novo.
 */
export async function loadAllModels(onProgress: (progress: LoadProgress) => void): Promise<void> {
    const files = allFiles();
    const sizes = new Map<string, { loaded: number; total: number }>();
    let done = 0;
    let known = false;

    const report = () => {
        let loaded = 0;
        let bytes = 0;

        for (const item of sizes.values()) {
            loaded += item.loaded;
            bytes += item.total;
        }
        onProgress({ done, total: files.length, loaded, bytes: known ? bytes : 0 });
    };

    // Os que já estão montados (de uma vez anterior) não baixam de novo.
    const pending = files.filter((url) => {
        if (!LOADED.has(url)) return true;
        done += 1;
        sizes.set(url, { loaded: 1, total: 1 });
        return false;
    });

    // O tamanho de cada arquivo antes de baixar, para a barra mostrar os MB desde o começo.
    const heads = await Promise.all(
        pending.map((url) =>
            fetch(url, { method: 'HEAD' })
                .then((response) => Number(response.headers.get('content-length')) || 0)
                .catch(() => 0),
        ),
    );
    known = heads.every((size) => size > 0);

    pending.forEach((url, index) => sizes.set(url, { loaded: 0, total: heads[index]! }));
    report();

    let parsing = Promise.resolve();
    let next = 0;

    const worker = async () => {
        while (next < pending.length) {
            const url = pending[next++]!;

            try {
                const buffer = await download(url, (loaded, total) => {
                    sizes.set(url, { loaded, total: sizes.get(url)?.total || total || loaded });
                    report();
                });

                // A montagem segue em fila: uma de cada vez, para não travar a tela de vez.
                parsing = parsing.then(async () => {
                    await breathe();
                    if (!SOURCES.has(url)) {
                        try {
                            const source = await parse(url, buffer);

                            SOURCES.set(url, Promise.resolve(source));
                        } catch {
                            // Arquivo com defeito: a batalha tenta de novo com o carregador normal.
                        }
                    }
                    done += 1;
                    report();
                });
            } catch {
                done += 1;
                report();
            }
        }
    };

    await Promise.all([worker(), worker(), worker()]);
    await parsing;
}
