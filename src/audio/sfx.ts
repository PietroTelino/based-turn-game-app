/**
 * Sons do jogo, gerados por código com a Web Audio API. Não existe nenhum
 * arquivo de áudio: cada som é uma receita de osciladores e ruído filtrado.
 *
 * Uso: sfx.play('hit'). O volume e o mudo ficam guardados no navegador.
 *
 * Para trocar um som por um arquivo no futuro, basta mudar a receita dele
 * aqui; quem chama sfx.play não precisa saber de onde o som vem.
 */

export const SOUND_NAMES = [
    'click',
    'select',
    'round',
    'turn',
    'cast',
    'whoosh',
    'hit',
    'crit',
    'fire',
    'ice',
    'lightning',
    'nature',
    'light',
    'heal',
    'shield',
    'boon',
    'bane',
    'stun',
    'tick',
    'down',
    'start',
    'victory',
    'defeat',
] as const;

export type SoundName = (typeof SOUND_NAMES)[number];

interface ToneOptions {
    type: OscillatorType;
    /** Frequência inicial, em Hz. */
    from: number;
    /** Frequência final: o som desliza até ela. */
    to?: number;
    /** Atraso dentro do som, em segundos. */
    at?: number;
    duration: number;
    gain: number;
    /** Tempo até o volume máximo. Curto = estalo; longo = som que cresce. */
    attack?: number;
}

interface NoiseOptions {
    filter: BiquadFilterType;
    from: number;
    to?: number;
    q?: number;
    at?: number;
    duration: number;
    gain: number;
    attack?: number;
}

/** As duas "tintas" com que as receitas são escritas. */
interface Voice {
    tone(options: ToneOptions): void;
    noise(options: NoiseOptions): void;
}

const SILENCE = 0.0001;
const noiseBuffers = new WeakMap<BaseAudioContext, AudioBuffer>();

function noiseBuffer(context: BaseAudioContext): AudioBuffer {
    let buffer = noiseBuffers.get(context);

    if (!buffer) {
        buffer = context.createBuffer(1, context.sampleRate, context.sampleRate);

        const data = buffer.getChannelData(0);

        for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;

        noiseBuffers.set(context, buffer);
    }

    return buffer;
}

function envelope(gain: AudioParam, start: number, peak: number, attack: number, duration: number) {
    gain.setValueAtTime(SILENCE, start);
    gain.exponentialRampToValueAtTime(peak, start + Math.min(attack, duration * 0.8));
    gain.exponentialRampToValueAtTime(SILENCE, start + duration);
}

function createVoice(context: BaseAudioContext, output: AudioNode, when: number, mix: number): Voice {
    return {
        tone({ type, from, to, at = 0, duration, gain, attack = 0.006 }) {
            const start = when + at;
            const oscillator = context.createOscillator();
            const level = context.createGain();

            oscillator.type = type;
            oscillator.frequency.setValueAtTime(from, start);
            if (to) oscillator.frequency.exponentialRampToValueAtTime(to, start + duration);

            envelope(level.gain, start, gain * mix, attack, duration);
            oscillator.connect(level).connect(output);
            oscillator.start(start);
            oscillator.stop(start + duration + 0.03);
        },

        noise({ filter, from, to, q = 0.8, at = 0, duration, gain, attack = 0.004 }) {
            const start = when + at;
            const source = context.createBufferSource();
            const band = context.createBiquadFilter();
            const level = context.createGain();

            source.buffer = noiseBuffer(context);
            source.loop = true;
            band.type = filter;
            band.Q.value = q;
            band.frequency.setValueAtTime(from, start);
            if (to) band.frequency.exponentialRampToValueAtTime(to, start + duration);

            envelope(level.gain, start, gain * mix, attack, duration);
            source.connect(band).connect(level).connect(output);
            source.start(start);
            source.stop(start + duration + 0.03);
        },
    };
}

/** Uma nota de "metal": triângulo encorpado por uma onda quadrada baixinha. */
function brass(voice: Voice, frequency: number, at: number, duration: number, gain = 0.2) {
    voice.tone({ type: 'triangle', from: frequency, at, duration, gain, attack: 0.02 });
    voice.tone({ type: 'square', from: frequency, at, duration, gain: gain * 0.22, attack: 0.02 });
}

function drum(voice: Voice, at: number, gain = 0.5) {
    voice.tone({ type: 'sine', from: 120, to: 48, at, duration: 0.22, gain });
    voice.noise({ filter: 'lowpass', from: 900, to: 200, at, duration: 0.1, gain: gain * 0.5 });
}

const RECIPES: Record<SoundName, (voice: Voice) => void> = {
    // Interface
    click(voice) {
        voice.tone({ type: 'triangle', from: 1400, to: 900, duration: 0.05, gain: 0.12 });
    },
    select(voice) {
        voice.tone({ type: 'triangle', from: 660, duration: 0.08, gain: 0.14 });
        voice.tone({ type: 'triangle', from: 990, at: 0.06, duration: 0.12, gain: 0.14 });
    },
    // Turno novo: um toque de tambor com uma nota grave.
    round(voice) {
        drum(voice, 0, 0.32);
        brass(voice, 294, 0.02, 0.32, 0.13);
    },
    // Chegou a vez de uma unidade do jogador.
    turn(voice) {
        voice.tone({ type: 'sine', from: 880, duration: 0.14, gain: 0.1 });
        voice.tone({ type: 'sine', from: 1320, at: 0.09, duration: 0.22, gain: 0.09 });
    },

    // Preparação do golpe
    cast(voice) {
        voice.tone({ type: 'sine', from: 330, to: 880, duration: 0.42, gain: 0.11, attack: 0.2 });
        voice.noise({ filter: 'bandpass', from: 1200, to: 4200, q: 2, duration: 0.42, gain: 0.07, attack: 0.25 });
    },
    whoosh(voice) {
        voice.noise({ filter: 'bandpass', from: 500, to: 2600, q: 1.2, duration: 0.22, gain: 0.3, attack: 0.08 });
    },

    // Impactos
    hit(voice) {
        voice.noise({ filter: 'lowpass', from: 1800, to: 400, duration: 0.12, gain: 0.5 });
        voice.tone({ type: 'sine', from: 150, to: 55, duration: 0.16, gain: 0.55 });
    },
    crit(voice) {
        voice.noise({ filter: 'highpass', from: 3000, duration: 0.08, gain: 0.22 });
        voice.tone({ type: 'sine', from: 110, to: 40, duration: 0.32, gain: 0.7 });
        voice.tone({ type: 'triangle', from: 1320, to: 880, at: 0.02, duration: 0.2, gain: 0.15 });
        voice.tone({ type: 'square', from: 1760, at: 0.02, duration: 0.05, gain: 0.06 });
    },
    fire(voice) {
        voice.noise({ filter: 'bandpass', from: 400, to: 1400, duration: 0.45, gain: 0.45, attack: 0.03 });
        voice.noise({ filter: 'lowpass', from: 900, to: 200, duration: 0.5, gain: 0.3, attack: 0.02 });
        voice.tone({ type: 'sawtooth', from: 90, to: 50, duration: 0.35, gain: 0.13 });
    },
    ice(voice) {
        [2093, 2637, 3136, 3951].forEach((frequency, index) => {
            voice.tone({ type: 'sine', from: frequency, at: index * 0.035, duration: 0.24, gain: 0.11 });
        });
        voice.noise({ filter: 'highpass', from: 5000, duration: 0.06, gain: 0.2 });
    },
    lightning(voice) {
        voice.noise({ filter: 'highpass', from: 1500, duration: 0.09, gain: 0.5 });
        voice.tone({ type: 'sawtooth', from: 1600, to: 120, duration: 0.16, gain: 0.2 });
        voice.noise({ filter: 'lowpass', from: 300, to: 80, at: 0.04, duration: 0.5, gain: 0.45, attack: 0.03 });
    },
    nature(voice) {
        voice.tone({ type: 'sine', from: 520, to: 300, duration: 0.12, gain: 0.2 });
        voice.tone({ type: 'sine', from: 420, to: 260, at: 0.08, duration: 0.12, gain: 0.18 });
        voice.tone({ type: 'sine', from: 600, to: 340, at: 0.17, duration: 0.14, gain: 0.16 });
        voice.noise({ filter: 'bandpass', from: 900, q: 2, duration: 0.3, gain: 0.12, attack: 0.05 });
    },
    light(voice) {
        [1047, 1319, 1568].forEach((frequency, index) => {
            voice.tone({ type: 'sine', from: frequency, at: index * 0.05, duration: 0.5, gain: 0.12 });
        });
        voice.tone({ type: 'sine', from: 2093, at: 0.15, duration: 0.6, gain: 0.06 });
    },

    // Suporte e status
    heal(voice) {
        [659, 831, 988, 1319].forEach((frequency, index) => {
            voice.tone({ type: 'sine', from: frequency, at: index * 0.07, duration: 0.36, gain: 0.13 });
        });
        voice.tone({ type: 'triangle', from: 330, duration: 0.5, gain: 0.08, attack: 0.05 });
    },
    shield(voice) {
        voice.tone({ type: 'sine', from: 196, to: 392, duration: 0.36, gain: 0.3, attack: 0.12 });
        voice.tone({ type: 'triangle', from: 784, at: 0.2, duration: 0.4, gain: 0.08 });
        voice.noise({ filter: 'bandpass', from: 1200, to: 2400, duration: 0.3, gain: 0.08, attack: 0.1 });
    },
    boon(voice) {
        voice.tone({ type: 'triangle', from: 523, duration: 0.1, gain: 0.16 });
        voice.tone({ type: 'triangle', from: 784, at: 0.09, duration: 0.18, gain: 0.16 });
    },
    bane(voice) {
        voice.tone({ type: 'triangle', from: 392, duration: 0.1, gain: 0.16 });
        voice.tone({ type: 'triangle', from: 277, at: 0.09, duration: 0.22, gain: 0.16 });
    },
    stun(voice) {
        [1200, 1000, 800].forEach((frequency, index) => {
            voice.tone({ type: 'sine', from: frequency, to: frequency * 0.8, at: index * 0.1, duration: 0.1, gain: 0.14 });
        });
    },
    tick(voice) {
        voice.noise({ filter: 'bandpass', from: 2500, q: 3, duration: 0.1, gain: 0.2 });
        voice.tone({ type: 'sine', from: 300, to: 200, duration: 0.1, gain: 0.12 });
    },
    down(voice) {
        voice.tone({ type: 'sine', from: 320, to: 70, duration: 0.55, gain: 0.32, attack: 0.02 });
        voice.noise({ filter: 'lowpass', from: 500, to: 100, at: 0.35, duration: 0.3, gain: 0.4 });
    },

    // Começo e fim
    start(voice) {
        drum(voice, 0);
        brass(voice, 196, 0.02, 0.28);
        brass(voice, 262, 0.28, 0.55);
        drum(voice, 0.28, 0.4);
    },
    victory(voice) {
        drum(voice, 0, 0.4);
        brass(voice, 523, 0, 0.16);
        brass(voice, 659, 0.14, 0.16);
        brass(voice, 784, 0.28, 0.16);
        drum(voice, 0.42, 0.5);
        brass(voice, 1047, 0.42, 0.95, 0.18);
        [523, 659, 784].forEach((frequency) => {
            voice.tone({ type: 'sine', from: frequency, at: 0.42, duration: 0.95, gain: 0.07, attack: 0.03 });
        });
    },
    defeat(voice) {
        brass(voice, 392, 0, 0.36, 0.16);
        brass(voice, 349, 0.32, 0.36, 0.16);
        brass(voice, 294, 0.64, 0.95, 0.16);
        voice.tone({ type: 'sine', from: 98, at: 0.64, duration: 1.0, gain: 0.25, attack: 0.05 });
    },
};

/**
 * Mesa de som: o volume de cada receita em relação às outras (1 = como foi
 * escrita). É aqui que se ajusta um som que ficou alto ou baixo demais.
 * O ruído filtrado sai bem mais fraco que um tom puro, por isso os sons
 * feitos de ruído (vento, fogo) precisam de mais ganho.
 */
const MIX: Partial<Record<SoundName, number>> = {
    cast: 1.7,
    whoosh: 3,
    hit: 0.85,
    fire: 1.9,
    nature: 1.7,
    light: 1.6,
    heal: 1.5,
    boon: 1.3,
    bane: 1.3,
    stun: 1.4,
    tick: 1.6,
    down: 1.25,
};

/**
 * Escreve um som em qualquer contexto de áudio, a partir do instante `when`.
 * O jogo usa via sfx.play; exportado para dar para conferir os sons fora do
 * navegador "ao vivo" (OfflineAudioContext).
 */
export function renderSound(name: SoundName, context: BaseAudioContext, output: AudioNode, when: number): void {
    RECIPES[name](createVoice(context, output, when, MIX[name] ?? 1));
}

// --------------------------------------------------------------- Preferências

export interface SoundSettings {
    /** De 0 a 1. */
    volume: number;
    muted: boolean;
}

const STORAGE_KEY = 'based-turn-game.sound';
const DEFAULT_SETTINGS: SoundSettings = { volume: 0.6, muted: false };

function loadSettings(): SoundSettings {
    try {
        const saved = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? 'null') as Partial<SoundSettings> | null;

        if (saved && typeof saved.volume === 'number' && typeof saved.muted === 'boolean') {
            return { volume: Math.min(1, Math.max(0, saved.volume)), muted: saved.muted };
        }
    } catch {
        // Navegação privada ou armazenamento bloqueado: usa o padrão.
    }

    return DEFAULT_SETTINGS;
}

let settings = typeof window === 'undefined' ? DEFAULT_SETTINGS : loadSettings();
const listeners = new Set<() => void>();

// --------------------------------------------------------------------- Motor

let context: AudioContext | null = null;
let master: GainNode | null = null;
let createdAt = 0;

/** Logo depois de criado, o contexto ainda está "acordando": o som agendado toca assim que ele acorda. */
const WARM_UP_MS = 1000;

function level(): number {
    // Curva quadrática: o controle fica mais natural para o ouvido.
    return settings.muted ? 0 : settings.volume * settings.volume;
}

/**
 * O navegador só deixa tocar som depois de um clique ou tecla do usuário.
 * Por isso o contexto de áudio nasce no primeiro gesto, e não antes.
 */
function unlock() {
    if (context) {
        if (context.state === 'suspended') void context.resume();
        return;
    }

    const AudioContextClass =
        window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

    if (!AudioContextClass) return;

    context = new AudioContextClass();
    createdAt = performance.now();
    master = context.createGain();
    master.gain.value = level();

    // O compressor segura o volume quando vários sons tocam juntos.
    const limiter = context.createDynamicsCompressor();

    master.connect(limiter).connect(context.destination);
}

if (typeof window !== 'undefined') {
    window.addEventListener('pointerdown', unlock, { capture: true });
    window.addEventListener('keydown', unlock, { capture: true });
}

function update(next: SoundSettings) {
    settings = next;

    if (context && master) master.gain.setTargetAtTime(level(), context.currentTime, 0.02);

    try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch {
        // Sem armazenamento: a preferência vale só até fechar a página.
    }

    listeners.forEach((listener) => listener());
}

export const sfx = {
    /** Toca um som. `delay` (em ms) agenda para daqui a pouco, em sincronia com a animação. */
    play(name: SoundName, delay = 0): void {
        if (!context || !master || settings.muted) return;

        // Contexto parado (aba em segundo plano, por exemplo): não acumula sons
        // para tocarem todos juntos depois.
        if (context.state !== 'running' && performance.now() - createdAt > WARM_UP_MS) return;

        renderSound(name, context, master, context.currentTime + delay / 1000);
    },

    setVolume(volume: number): void {
        update({ ...settings, volume: Math.min(1, Math.max(0, volume)) });
    },

    setMuted(muted: boolean): void {
        update({ ...settings, muted });
    },

    getSettings(): SoundSettings {
        return settings;
    },

    subscribe(listener: () => void): () => void {
        listeners.add(listener);

        return () => {
            listeners.delete(listener);
        };
    },
};
