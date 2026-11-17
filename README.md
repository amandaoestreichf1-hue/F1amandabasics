# Paddock Press: gerador de transições e overlays de F1

Ferramenta web local para criar **transições, cards e overlays de F1** no estilo
editorial / colagem de jornal (papel rasgado, fita crepe, carimbos, letras recortadas)
para Reels e TikTok **9:16 (1080×1920)**, exportando com **fundo transparente**.

## Abrir

A versão publicada fica em **https://claude.ai/artifact/SpF7eBvUNSn2rpfYEfXjDT**. Não precisa instalar nada.

Para atualizar o link depois de mexer no código: `npm run build:artifact` gera `artifact/paddock-press.html`, que é republicado no mesmo endereço.

## Rodar localmente

```bash
npm install
npm run dev      # abre em http://localhost:5173
```

Use **Chrome ou Edge no computador** (melhor suporte a WebCodecs, VP9 com alfa e upload de fontes).

## O que tem

**✎ Didático · pista & pneus**

- **Circuito:** traçado real das 24 pistas do calendário 2026. O desenho vem de [bacinger/f1-circuits](https://github.com/bacinger/f1-circuits), licença MIT,
  e começa na largada no sentido da corrida. Dá para mostrar:
  - a pista se desenhando
  - os setores coloridos, com um deles piscando
  - as curvas numeradas uma a uma (contagem automática, que pode diferir da numeração oficial)
  - uma curva em destaque com círculo, nota e zoom, escolhida pelo número ou pela posição exata na volta
  - uma bolinha ou o seu PNG dando a volta

  Os limites dos setores são ajustáveis, porque o padrão divide a volta em terços.
- **Anatomia do Carro:** um monoposto genérico com proporções das regras de 2026 (entre-eixos de 3,4 m, 1,9 m de largura, pneus mais estreitos, asa dianteira curva, asa traseira arredondada sem beam wing). Não é o carro de nenhuma equipe. Vista de cima ou lateral, com o carro se montando peça por peça.
  - até 3 destaques em sequência: asa dianteira, assoalho, difusor, pneus, sidepods, asa traseira, freios, suspensão…
  - cada destaque tem nome, nota e etiqueta (ex.: UPGRADE)
  - a peça destacada aparece em raio-x, então dá para ver até as peças escondidas
  - zoom opcional e fluxo de ar animado
- **Compostos de Pneu:**
  - apresentação dos compostos com barras de aderência × durabilidade
  - um composto em destaque com o desgaste caindo
  - a estratégia de cada piloto, com stints e paradas (formato `NOR: M-22, H-35`)

**✿ Do seu jeito · Lilás** (identidade padrão, tirada das suas edições: lilás `#c0b4fc`,
xadrez lilás/linho com trama de tecido, papel quadriculado amassado, letra de mão em caixa alta):

- **Xadrez Lilás:** transição com quadradinhos de tecido em cascata.
- **Disclaimer / Nota:** título circulado à mão e texto em letra de mão.
- **Cabecinhas & Pontos:** cabeças recortadas, "340 PTS" ou "PRECISA GANHAR TUDO", seta lilás e diferença.

Os demais templates aparecem abaixo. Todos usam a paleta Lilás por padrão; ao escolher uma equipe, o controle
**Suavizar cores** deixa as cores mais delicadas.

| Categoria | Template | Notas |
|---|---|---|
| A · Transições | **Passagem de Carro** | Carrinho ilustrado ou seu PNG cruza a tela; rastro lilás, xadrez ou papel quadriculado |
| | **Luzes de Largada** | 5 luzes presas com fita, apagando em *LIGHTS OUT* |
| B · Pós-corrida | **Quem Serviu** | Capa de revista, foto (Polaroid / recorte / PNG solto), adesivo *Purple Sector* |
| | **Quem Dormiu** | Faixa Safety Car / Bandeira Amarela, foto P&B, adesivo *BOX BOX*, Zzz |
| C · Overlays | **Errata / Correção** | Bloco pautado, texto riscado com marcador e correção datilografada |
| | **Placar / Posição** | `P12 ➔ P4` com contador rolando, ou `P2 ➔ DNF` |

- **11 equipes do grid 2026** com paletas automáticas e color pickers livres.
- **Fontes:** Anton, Syne, Playfair Display (itálico), Courier Prime, mais **upload de .ttf/.otf/.woff** (ex.: Bootzy TM).
- **Slots de imagem** com zoom, rotação, enquadramento e P&B.
- **Gaveta de trinkets:** suba vários PNGs transparentes e depois arraste, redimensione (roda do mouse) e gire (Shift + roda) no preview. Já vem com 8 adesivos nativos.
- **Stop-motion 15 fps** (com "boil" de recorte) ou **animação fluida**.
- **Sombra seca** configurável.
- **Fundo de teste** no preview (não é exportado).

## Meu acervo

Na aba **✿ Meu acervo** você sobe suas imagens e fontes. Elas ficam salvas no navegador (IndexedDB), então não somem quando você fecha a página.

- **Categorias de imagem:** Trinkets, Fundos, Cabecinhas & Fotos, Objetos que cruzam. Dá para trocar a categoria depois.
- **Fontes:** cada uma tem um papel, Título, Subtítulo ou Destaque. Por exemplo, a Bootzy como Título passa a ser usada em todas as manchetes.
- **No editor:** os espaços de foto mostram as imagens do acervo, os templates Lilás aceitam "Imagem do meu acervo" como fundo,
  o Xadrez pode virar mosaico de uma imagem, e a **✨ Auto-colagem** espalha seus trinkets pelas bordas com animação.
- **Animação contínua:** todo trinket tem entrada (pop, carimbo, cai, gira) e movimento enquanto está na tela (flutuar, balançar, pulsar, girar).
- **Backup:** baixe o acervo em .zip para guardar no Drive ou levar para outro computador, e restaure por lá.

## Ritmo, preview e som

- **Visual:** "✿ Delicado", o padrão, usa a linguagem lilás: letra de mão, papel quadriculado e adesivos limpos no lugar de carimbos. "Colagem de jornal" é o estilo antigo.
- **Enquanto está na tela:** zoom lento (respiro), flutuar ou parado, para os cards e overlays não congelarem depois da entrada.
- **Terminar parado:** tira a animação de saída para você cortar onde quiser no CapCut.
- **📱 Zona segura:** mostra no preview o que a interface do Reels/TikTok cobre.
- **🎬 Testar com meu vídeo:** coloca o seu vídeo, com som, atrás da animação, sincronizado com o play e com um ajuste de início.
- **Marcas de som:** a timeline mostra 💨 whoosh, 🫧 pop e ⌨️ typing de cada animação, e dá para exportar a lista em .txt com o tempo e o número do quadro.

## Exportação

- **`.mp4` com fundo verde ou azul (chroma key).** É o recomendado para o CapCut no celular e no iPad: Recortar → Chroma key.
- **`.webm` VP9 + Alpha.** Usa WebCodecs quadro a quadro quando o navegador suporta codificar alfa. Se não suportar, grava com MediaRecorder em tempo real (o alfa continua no arquivo).
- **Sequência PNG (`.zip`).** Garante transparência em qualquer editor.
- **Quadro atual em PNG.**

Nas transições, a tela fica 100% coberta no ponto marcado com ✂ na timeline. É ali que você faz o corte entre as cenas.

## Estrutura

```
src/lib/paper.js        papel rasgado, texturas, fita, carimbos, letras recortadas
src/lib/car.js          carrinho ilustrado + adesivos com sombra
src/lib/renderer.js     renderiza um quadro (preview e exportação usam o mesmo código)
src/lib/exporter.js     WebM com alfa (mediabunny) e ZIP de PNGs (jszip)
src/templates/*.js      cada animação: campos editáveis + render(rc)
src/components/*.jsx    UI (React + Tailwind + Framer Motion)
```

Para criar um template novo, exporte um objeto `{ id, name, category, defaultDuration, fields, render(rc) }`
e registre-o em `src/templates/index.js`. O painel de edição é gerado automaticamente a partir de `fields`.
