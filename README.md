# URBTRAIN GAME

Endless runner 3D mobile-first com identidade visual da URBTRAIN. O jogador corre por uma pista urbana de três faixas, coleta medalhas e desvia de obstáculos usando gestos ou teclado.

## Tecnologias

- Babylon.js + WebGL
- TypeScript strict + Vite
- HTML e CSS para interface sobreposta ao canvas
- PWA básica (manifest e service worker)
- GitHub Actions + GitHub Pages

## Rodar localmente

```bash
npm install
npm run dev
```

Para validar a versão de produção:

```bash
npm run build
npm run preview
```

## Controles

| Ação | Celular | Desktop |
| --- | --- | --- |
| Mudar de faixa | Deslize para esquerda/direita | Setas ou A/D |
| Pular | Deslize para cima | Seta para cima, W ou Espaço |
| Deslizar | Deslize para baixo | Seta para baixo ou S |
| Pausar | — | P ou Esc |
| Iniciar/recomeçar | Toque | Enter |

## Arquitetura

- `src/game`: loop, estado, configuração e performance.
- `src/player`: corredor procedural e sua movimentação.
- `src/world`: pista segmentada, object pooling e geração de objetos.
- `src/input`: teclado e gestos de toque.
- `src/ui`: telas HTML, HUD e persistência das opções.

## Publicação

Todo push na branch `main` executa o build e publica `dist` no GitHub Pages. Em **Settings → Pages**, escolha **GitHub Actions** como fonte de publicação. O jogo ficará disponível em `https://urbtrain.github.io/urbtrain-game/`.

## Roadmap

- Modelos GLB e animações oficiais da URBTRAIN
- Efeitos sonoros e música original
- Novos mapas, skins, missões e ranking online

## Licença

Uso interno e promocional da URBTRAIN. Não utiliza assets ou marcas de terceiros.
