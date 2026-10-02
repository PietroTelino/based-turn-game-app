# Ilustrações dos personagens

Cada personagem usa três arquivos, nomeados com o `id` dele (o mesmo de
`src/game/data/characters.ts` na API):

| Arquivo | O que é | Tamanho usado hoje |
| --- | --- | --- |
| `<id>.webp` | Corpo inteiro, **fundo transparente**. Aparece no campo de batalha. | 840 de altura |
| `<id>-face.webp` | Rosto, quadrado, fundo transparente. Aparece na fila de turnos. | 160 x 160 |
| `<id>-card.webp` | Busto, quadrado, fundo transparente. Aparece na escolha de time. | 560 x 560 |

Para acrescentar um personagem, salve os arquivos aqui com o id certo. Não é
preciso mexer em código. Também vale `.png`.

Cuidados para a figura combinar com as outras:

- personagem olhando para a **direita** (o time inimigo é espelhado pela tela);
- corpo inteiro, com os **pés encostados na borda de baixo** da imagem: é ali que fica o chão;
- o **corpo no centro da largura** (se a arma ou a capa sobram para um lado, deixe a mesma sobra vazia do outro);
- a mesma escala das atuais: uma pessoa em pé ocupa quase toda a altura.

Quem não tem arquivo aparece com o desenho de reserva de
`src/components/battle/CharacterSprite.tsx`.
