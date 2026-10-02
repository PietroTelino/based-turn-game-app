/**
 * As ilustrações dos personagens ficam em src/assets/characters.
 * Cada personagem tem até três arquivos, com o id dele no nome:
 *
 *   <id>.webp        corpo inteiro, com fundo transparente (campo de batalha)
 *   <id>-face.webp   rosto, quadrado (fila de turnos)
 *   <id>-card.webp   busto, quadrado, com fundo transparente (escolha de time)
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
    brisa: 'clerigo',
    faisca: 'barbaro',
    geada: 'criomante',
    espinho: 'guardiao',
};

export function getCharacterArt(characterId: string, kind: ArtKind): string | undefined {
    const id = RENAMED[characterId] ?? characterId;

    return ART.get(kind === 'figure' ? id : `${id}-${kind}`);
}
