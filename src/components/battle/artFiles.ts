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

/** `form` é a forma em que a unidade está, se estiver transformada. Sem ilustração da forma, vale a do personagem. */
export function getCharacterArt(characterId: string, kind: ArtKind, form?: string): string | undefined {
    const id = RENAMED[characterId] ?? characterId;
    const find = (name: string) => ART.get(kind === 'figure' ? name : `${name}-${kind}`);

    return (form === undefined ? undefined : find(`${id}-${form}`)) ?? find(id);
}
