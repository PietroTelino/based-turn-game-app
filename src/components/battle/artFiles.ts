/**
 * As ilustrações dos personagens ficam em src/assets/characters.
 * Cada personagem tem até três arquivos, com o id dele no nome:
 *
 *   <id>.webp        corpo inteiro, com fundo transparente (campo de batalha)
 *   <id>-face.webp   rosto, quadrado (fila de turnos)
 *   <id>-card.webp   busto, quadrado, com fundo transparente (escolha de time)
 *
 * Quem se transforma tem também os arquivos de cada forma, com o id dela
 * depois do id do personagem: druida-urso.webp, druida-urso-face.webp.
 *
 * Basta salvar os arquivos na pasta: o Vite encontra sozinho, sem mexer em
 * código. Personagem sem arquivo aparece com o desenho antigo, de reserva.
 *
 * Poses de ação: além do <id>.webp, o personagem pode ter os desenhos
 * <id>-pose-<momento>.webp (windup, strike, charge, cast, bolt, area e os quadros extras
 * heavy-windup, heavy-strike, cast-charge, rise-1, rise-2, rise-3, combo-1, combo-2, combo-3, bolt-end, area-start, area-charge, area-end), trocados durante a
 * animação em battle.css. Ver getPoseFrames.
 *
 * As formas têm poses próprias, com o id da forma no nome:
 * druida-urso-pose-strike.webp. A transformação usa os quadros shift-0 (o
 * personagem antes, como aparece parado), shift-1 e shift-2, da forma nova.
 */
export type ArtKind = 'figure' | 'face' | 'card';

const files = import.meta.glob<string>('../../assets/characters/*.{webp,png}', { eager: true, import: 'default' });

const ART = new Map<string, string>();

for (const [path, url] of Object.entries(files)) {
    // '../../assets/characters/piromante-face.webp' -> 'piromante-face'
    const name = path.split('/').pop()?.replace(/\.(webp|png)$/, '');

    if (name) ART.set(name, url);
}

// Ids antigos dos personagens. Batalhas gravadas antes da troca de nome ainda
// usam esses ids, então eles apontam para a ilustração do nome novo.
const RENAMED: Record<string, string> = {
    brasa: 'piromante',
    muralha: 'cavaleiro',
    brisa: 'sacerdote',
    clerigo: 'sacerdote',
    faisca: 'barbaro',
    geada: 'criomante',
    espinho: 'guardiao',
};

export type PoseName =
    | 'windup'
    | 'strike'
    | 'heavy-windup'
    | 'heavy-strike'
    | 'combo-1'
    | 'combo-2'
    | 'combo-3'
    | 'charge'
    | 'cast-charge'
    | 'cast'
    | 'bolt'
    | 'bolt-end'
    | 'area-start'
    | 'area-charge'
    | 'area'
    | 'area-end'
    | 'rise-1'
    | 'rise-2'
    | 'rise-3'
    | 'shift-0'
    | 'shift-1'
    | 'shift-2';

const POSES: PoseName[] = ['windup', 'strike', 'heavy-windup', 'heavy-strike', 'combo-1', 'combo-2', 'combo-3', 'charge', 'cast-charge', 'cast', 'bolt', 'bolt-end', 'area-start', 'area-charge', 'area', 'area-end', 'rise-1', 'rise-2', 'rise-3', 'shift-0', 'shift-1', 'shift-2'];

/**
 * Os desenhos de cada momento da ação (preparar e acertar o golpe; juntar,
 * lançar a magia; o projétil e a magia em área podem ter pose própria),
 * ou null se o personagem não tem nenhum. Na forma de quem se transforma,
 * valem as poses da forma (druida-urso-pose-*), se houver.
 */
/**
 * O id com que as ilustrações do personagem foram salvas (ids antigos apontam
 * para o nome novo). Com `form`, o da forma: druida-urso.
 */
export function getArtId(characterId: string, form?: string): string {
    const id = RENAMED[characterId] ?? characterId;

    return form === undefined ? id : `${id}-${form}`;
}

export function getPoseFrames(characterId: string, form?: string): { pose: PoseName; src: string }[] | null {
    const id = getArtId(characterId, form);
    const frames = POSES.flatMap((pose) => {
        const src = ART.get(`${id}-pose-${pose}`);

        return src ? [{ pose, src }] : [];
    });

    return frames.length > 0 ? frames : null;
}

/** `form` é a forma em que a unidade está, se estiver transformada. Sem ilustração da forma, vale a do personagem. */
export function getCharacterArt(characterId: string, kind: ArtKind, form?: string): string | undefined {
    const id = RENAMED[characterId] ?? characterId;
    const find = (name: string) => ART.get(kind === 'figure' ? name : `${name}-${kind}`);

    return (form === undefined ? undefined : find(`${id}-${form}`)) ?? find(id);
}

/** As imagens já pedidas ao navegador, guardadas para ele não descartar. */
const preloaded = new Map<string, HTMLImageElement>();

/**
 * Carrega antes as imagens de uma forma (a figura e as poses), para a
 * transformação não mostrar a figura vazia enquanto elas chegam.
 */
export function preloadForm(characterId: string, form: string): void {
    const urls = [getCharacterArt(characterId, 'figure', form), ...(getPoseFrames(characterId, form) ?? []).map((frame) => frame.src)];

    for (const url of urls) {
        if (!url || preloaded.has(url)) continue;

        const image = new Image();

        image.src = url;
        image.decode().catch(() => undefined);
        preloaded.set(url, image);
    }
}
