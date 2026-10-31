# Ilustrações dos personagens

Cada personagem usa três arquivos, nomeados com o `id` dele (o mesmo de
`src/game/data/characters.ts` na API):

| Arquivo | O que é | Tamanho usado hoje |
| --- | --- | --- |
| `<id>.webp` | Corpo inteiro, **fundo transparente**. Aparece no campo de batalha. | 840 de altura |
| `<id>-face.webp` | Rosto, quadrado, fundo transparente. Aparece na fila de turnos. | 160 x 160 |
| `<id>-card.webp` | Busto, quadrado, fundo transparente. Aparece na escolha de time. | 560 x 560 |

Quem se transforma (o Druida) tem também os arquivos de cada forma, com o id
da forma depois do id do personagem: `druida-urso.webp` e `druida-urso-face.webp`,
`druida-lobo.webp` e `druida-lobo-face.webp`. A forma não precisa de `-card`
(na escolha de time aparece a forma original). Se faltar o arquivo de uma
forma, a tela usa o do personagem. Bicho de quatro patas fica mais baixo que
uma pessoa, mas o arquivo tem os mesmos 840 de altura, com o espaço de cima vazio.

Uma invocação (o Guerreiro Esqueleto do Necromante) é uma unidade com id
próprio: usa `esqueleto.webp` e `esqueleto-face.webp`, sem `-card`, porque não
aparece na escolha de time.

Para acrescentar um personagem, salve os arquivos aqui com o id certo. Não é
preciso mexer em código. Também vale `.png`.

Cuidados para a figura combinar com as outras:

- personagem olhando para a **direita** (o time inimigo é espelhado pela tela);
- corpo inteiro, com os **pés encostados na borda de baixo** da imagem: é ali que fica o chão;
- o **corpo no centro da largura** (se a arma ou a capa sobram para um lado, deixe a mesma sobra vazia do outro);
- a mesma escala das atuais: uma pessoa em pé ocupa quase toda a altura.

## Poses de ação

Além da figura parada, um personagem pode ter desenhos de cada momento da
ação, trocados durante a animação (hoje, a Inquisidora, o Piromante, o Sacerdote, o Vampiro, o Ladino, o Cavaleiro, a Súcubo, a Harpia e o Arqueiro):

| Arquivo | Quando aparece |
| --- | --- |
| `<id>-pose-windup.webp` | Golpe corpo a corpo: preparando o golpe (recuo). |
| `<id>-pose-strike.webp` | Golpe corpo a corpo: o golpe acertando (avanço). |
| `<id>-pose-charge.webp` | Magia: juntando a magia, antes de lançar (opcional). |
| `<id>-pose-cast.webp` | Habilidade à distância, em área ou de suporte: lançando. |
| `<id>-pose-bolt.webp` | Projétil: no lugar da `cast` (opcional). |
| `<id>-pose-area.webp` | Habilidade em área: no lugar da `cast` (opcional). |
| `<id>-pose-bolt-end.webp` | Projétil: o fim do gesto, depois do disparo (opcional). |
| `<id>-pose-area-start.webp`, `<id>-pose-area-charge.webp` | Área: dois quadros de preparo, no lugar da `charge` (opcionais). |
| `<id>-pose-area-end.webp` | Área: o fim do gesto, depois do disparo (opcional). |

O golpe usa `windup` e `strike` juntas. Na magia, com `charge` a pose de
juntar aparece primeiro e a de lançar (`cast`, ou `bolt` no projétil e `area` em área) depois;
sem ela, só a de lançar. Pode haver só as do golpe ou só as da magia: o que
faltar fica com a figura parada.

As poses têm **todas o mesmo tamanho**, maior que a figura (para caber a arma
erguida ou o braço estendido), com a pessoa na mesma escala e os pés no mesmo
lugar da figura parada, olhando para o mesmo lado. Onde a pose fica em
relação à figura (as medidas `--pose-*`), a mão de onde sai o projétil
(`--fx-hand-*`) e o tempo de cada troca ficam em
`src/styles/battle.css`, na seção `.bt-posed--<id>`.

Quem não tem arquivo aparece com o desenho de reserva de
`src/components/battle/CharacterSprite.tsx`.
