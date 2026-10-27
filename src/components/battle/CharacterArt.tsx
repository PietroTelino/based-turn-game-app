import { CharacterSprite } from './CharacterSprite';
import { getArtId, getCharacterArt, getPoseFrames } from './artFiles';
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
    const poses = kind === 'figure' && src ? getPoseFrames(characterId, form) : null;

    // Figura com poses de ação: a figura parada e, por cima, uma pose de cada
    // momento, que battle.css mostra uma de cada vez durante o golpe ou a magia.
    if (src && poses) {
        return (
            <span className={`${className} bt-art--figure bt-posed bt-posed--${getArtId(characterId)}`} aria-hidden='true'>
                <img src={src} alt='' draggable={false} className='bt-posed__still' />
                {poses.map(({ pose, src: frame }) => (
                    <img key={pose} src={frame} alt='' draggable={false} className={`bt-posed__pose bt-posed__pose--${pose}`} />
                ))}
            </span>
        );
    }

    if (!src) {
        return <CharacterSprite characterId={characterId} className={`${className} bt-art--drawn`} />;
    }

    return <img src={src} alt='' draggable={false} className={`${className} bt-art--${kind}`} />;
}
