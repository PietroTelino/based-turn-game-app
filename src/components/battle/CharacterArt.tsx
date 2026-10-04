import { CharacterSprite } from './CharacterSprite';
import { getCharacterArt } from './artFiles';
import type { ArtKind } from './artFiles';

interface CharacterArtProps {
    characterId: string;
    kind: ArtKind;
    /** A forma em que a unidade está, se estiver transformada (o urso ou o lobo do Druida). */
    form?: string;
    className?: string;
}

/**
 * A imagem de um personagem. Se ainda não existe ilustração para ele,
 * mostra o desenho de reserva (CharacterSprite) no mesmo lugar.
 */
export function CharacterArt({ characterId, kind, form, className = '' }: CharacterArtProps) {
    const src = getCharacterArt(characterId, kind, form);

    if (!src) {
        return <CharacterSprite characterId={characterId} className={`${className} bt-art--drawn`} />;
    }

    return <img src={src} alt='' draggable={false} className={`${className} bt-art--${kind}`} />;
}
