# FERRO & FORMA

Landing page demonstrativa de serralheria sob medida, construída com React, TypeScript e Vite a partir das quatro referências fornecidas. Textos, navegação, cards e formulários são elementos reais. A marca, as imagens e os depoimentos têm caráter ilustrativo.

## Executar

Requisitos: Node.js 22.12 ou superior, ou Node.js 24, e npm.

```sh
npm ci
npm run dev
```

Abra o endereço local informado pelo Vite. O projeto funciona sem backend, banco de dados ou credenciais.

| Comando | Finalidade |
| --- | --- |
| `npm run dev` | Iniciar o servidor de desenvolvimento. |
| `npm run build` | Verificar os tipos e gerar a versão de produção em `dist/`. |
| `npm run preview` | Visualizar localmente o último build. |
| `npm test` | Verificar a preparação da mensagem e a construção segura da URL do WhatsApp. |
| `npm run test:e2e` | Executar os testes de interface e fluxos com Playwright. |

Antes da primeira execução dos testes de interface, instale o navegador de teste:

```sh
npx playwright install chromium
npm run test:e2e
```

## Contato e modo demonstrativo

O número é centralizado em **`src/config.ts`**, na configuração `whatsappNumber`. O valor padrão é uma string vazia:

```ts
export const whatsappNumber: string = '';
```

Nesse estado, o formulário valida nome, cidade e serviço, prepara a mensagem e abre um diálogo com a prévia e a opção de copiar. Nenhuma conversa é aberta e nenhuma mensagem é enviada.

Para ativar o atendimento real, substitua a string vazia pelo número comercial autorizado, em formato internacional: código do país, código de área e telefone, **somente dígitos**, sem `+`, espaços ou pontuação. Gere um novo build após alterar a configuração. Um valor ausente ou fora do formato mantém a prévia demonstrativa.

Com um número válido configurado, o botão abre `https://wa.me/NUMERO?text=MENSAGEM`. A mensagem é codificada na URL; o visitante revisa e confirma o envio no próprio WhatsApp. Os testes de URL usam dados sintéticos e não iniciam conversas.

## Organização

- `src/App.tsx`: seções da página, navegação, seleção dos serviços, galeria e lightbox.
- `src/data.ts`: serviços, projetos, etapas, depoimentos e navegação.
- `src/components/Contact.tsx` e `Contact.css`: formulário, validação e diálogo de prévia.
- `src/components/Icon.tsx`: símbolo da marca e ícones SVG.
- `src/config.ts`: configuração central de contato.
- `src/lib/whatsapp.ts`: funções puras para montar a mensagem e a URL.
- `src/styles.css` e `src/fonts.css`: identidade visual, responsividade e fontes locais.
- `public/images/`: fotografias WebP e versões menores para telas compactas.
- `tests/`: testes automatizados.

As interações incluem menu compacto, navegação por âncoras, serviço preenchendo o formulário, lightbox com teclado, fechamento de diálogos com Escape, restauração de foco e preferência por movimento reduzido.

## Introdução cinematográfica

A abertura começa com o portão fechado e uma seta animada para a direita. Arraste nessa direção, com mouse ou toque, para iniciar o filme com áudio. Não há quadro de boas-vindas, botão “Abrir o portão” nem controle “Ativar som”. A seta é um controle acessível sem aparência de botão: Enter, Espaço ou Seta para a direita também iniciam a abertura quando ela está focada. Pular e Escape continuam disponíveis.

No desktop, a posição da seta acompanha a maçaneta no recorte real de `object-fit: cover`. No celular, ela fica no meio da altura da tela, junto à borda esquerda: o traço chega a 8 px da borda, respeitando a área segura do aparelho. Arrastos curtos, verticais, para a esquerda e gestos cancelados não iniciam a reprodução. A distância mínima varia de 40 a 72 px conforme a tela. A chamada de reprodução acontece diretamente ao soltar o arrasto, sem temporizador.

| Variante | Arquivo fornecido | Imagem | Áudio original completo |
| --- | --- | --- | --- |
| Desktop | COMPUTADOR.mp4 | 1920 × 1080, 48 quadros, **1,600 s** | **4,179002 s** |
| Celular | CELULAR.mp4 | 1080 × 1920, 54 quadros, **1,800 s** | **4,040 s** |

Os arquivos publicados em `public/media/gate-desktop-v4.mp4` e `gate-mobile-v4.mp4` usam H.264 com faststart e AAC estéreo a 192 kbps. A imagem foi retemporizada para eliminar a espera inicial com o portão parado e a espera branca final excessiva. A revisão v4 removeu 0,367 s de espera inicial do desktop e 0,567 s do celular da versão v3; a abertura continua durando 1,6 s e 1,8 s. O vídeo é pré-carregado enquanto aguarda o gesto. O áudio mantém velocidade, tom e duração da fonte, com limite preciso em amostras para não acrescentar padding AAC. O script verifica os tempos das duas faixas. Os posters WebP são os primeiros quadros de cada versão.

O relógio real da mídia inicia o fade branco de **650 ms** ao atingir 1,6 s ou 1,8 s. O mesmo elemento continua tocando o áudio até `ended`, mesmo com o site já visível e interativo. O gesto do visitante é usado diretamente para autorizar áudio no navegador; não há tentativa de contornar suas políticas nem reprodução silenciosa alternativa. Pular, Escape, falha de mídia ou mudança para movimento reduzido interrompem o som.

| Ajuste | Local |
| --- | --- |
| Fade normal e ao pular | `src/introConfig.ts`: `fadeMs` e `skipFadeMs`. |
| Frequência e chave de sessão | `frequency` e `storageKey`. |
| Vídeos, posters e tempos visuais | `media.desktop` e `media.mobile`. Os tempos devem corresponder aos arquivos preparados pelo script. |
| Posição da maçaneta e recorte | `media.desktop.handle` e `media.mobile.handle`, em pixels do vídeo original. |
| Seta na borda esquerda do celular | `IntroGate.css`: `.intro-gate[data-variant='mobile'] .intro-gate-handle`. |
| Seleção de celular | `mobileQuery`: até 767 px de largura ou tela de toque em paisagem com até 600 px de altura. |
| Animação da seta | `src/components/IntroGate.css`: `gate-pull-hint`. |
| Recuperação de falhas | `loadingTimeoutMs`, `stalledTimeoutMs` e `maxWaitMs`. |

A variante é escolhida uma vez por abertura. Girar ou redimensionar a tela recalcula o recorte e a posição da seta, sem trocar ou reiniciar o filme. A introdução aparece uma vez por sessão da aba. Para revê-la, abra uma aba independente ou remova a chave `ferro-forma:intro:v5` do `sessionStorage`. Links com âncora e movimento reduzido apresentam diretamente o conteúdo.

Durante a abertura, `inert` bloqueia a interação com a página e a rolagem é travada com compensação da barra lateral. O fade libera esses controles. Erro de mídia, carregamento superior a 4,5 s ou reprodução parada por 2,5 s liberam o site; existe limite total de 12 s após a tentativa de reprodução. A espera pelo gesto não é contada como falha.

Para preparar os vídeos novamente, use Python com Pillow, FFmpeg e FFprobe:

```sh
python scripts/prepare_intro.py --desktop CAMINHO_COMPUTADOR --mobile CAMINHO_CELULAR
```

Os testes de `tests/browser/intro.spec.ts` e `intro-autoplay.spec.ts` verificam mídia real, áudio após a revelação, mouse, toque, teclado, seleção responsiva, sessão e falhas. Capturas e gravações ficam em `test-results/` e não são publicadas.

## Fotografias

As fotografias disponíveis foram recortadas dos mockups originais, excluindo textos e legendas gravados nos pixels. As legendas do site são HTML. As imagens foram exportadas em WebP, sem ampliação artificial, com variantes de 480 px de largura.

A resolução da fonte limita o detalhe: o hero tem 780 × 750 px; a oficina, 752 × 356 px; os quatro projetos, 669 × 186–188 px. Os projetos têm proporção panorâmica porque as legendas dos mockups cobrem a região inferior das fotos. A lightbox preserva os recortes disponíveis. Para versões maiores e mais detalhadas, substitua os arquivos por fotografias originais de maior resolução.

`public/images/manifest.json` registra dimensões e recortes. Para refazer os assets com os mockups originais, use Python e Pillow:

```sh
python scripts/prepare_assets.py --source-dir CAMINHO_DOS_MOCKUPS
```

## Publicação no GitHub Pages

Site: https://vit0r-maker.github.io/DEMO_SERRALHEIRIA/

O workflow `.github/workflows/deploy.yml` instala as dependências, executa os testes de contato, gera o build e publica **somente `dist/`** a cada push na branch `main`. Também pode ser iniciado pela aba Actions. O deploy usa o token automático do GitHub; não exige um token pessoal no código.

Em **Settings → Pages → Build and deployment → Source**, mantenha **GitHub Actions** selecionado. Publicar a raiz da branch diretamente entrega TypeScript sem compilar e resulta em página branca.

O `base` de produção em `vite.config.ts` é `/DEMO_SERRALHEIRIA/`, respeitando as maiúsculas do nome do repositório. O desenvolvimento continua em `/`. Para visualizar o build localmente, execute `npm run build` e `npm run preview`, então abra o caminho `/DEMO_SERRALHEIRIA/` no endereço informado pelo Vite.

Para testar esse mesmo build, defina `PLAYWRIGHT_BASE_URL` com o endereço completo da prévia, incluindo `/DEMO_SERRALHEIRIA/`, e execute `npm run test:e2e`. Opcionalmente, `PLAYWRIGHT_CHROMIUM_EXECUTABLE` pode apontar para um Chromium já instalado. Sem essas variáveis, os testes iniciam o servidor de desenvolvimento automaticamente.
