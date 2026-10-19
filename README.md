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

`src/components/IntroGate.tsx` mantém a página montada enquanto reproduz o portão em uma camada branca opaca. O evento real `ended` oculta o vídeo e inicia o único fade do overlay, revelando o site em 650 ms. O fundo e as animações existentes da página são preservados.

O vídeo em `public/media/gate-intro.mp4` foi preparado a partir do novo `gate-intro.mp4` fornecido: **1920 × 1080, 30 fps, 47 quadros e cerca de 1,58 s**, H.264 com faststart. A conversão de HEVC para H.264 amplia a compatibilidade; a trilha AAC estéreo original é copiada sem recompressão. O ritmo e o trecho branco final do arquivo são mantidos. `gate-poster.webp` contém o primeiro quadro.

A reprodução automática começa silenciada para respeitar as políticas dos navegadores. **Ativar som** libera a trilha durante a reprodução, sem reiniciar o vídeo; **Silenciar** desliga o áudio novamente. Os controles funcionam com toque, clique e teclado. Não é necessário ativar o som para entrar no site.

| Ajuste | Local |
| --- | --- |
| Fade normal e ao pular | `src/introConfig.ts`: `fadeMs` e `skipFadeMs`. |
| Frequência | `src/introConfig.ts`: `frequency: 'session'` ou `'always'`. |
| Chave da sessão | `src/introConfig.ts`: `storageKey`. |
| Vídeo e poster | `src/introConfig.ts`: `videoPath` e `posterPath`, relativos ao `BASE_URL` do Vite. |
| Enquadramento mobile | `src/components/IntroGate.css`: `--intro-video-position` na regra `max-aspect-ratio: 1/1`. |
| Recuperação de falhas | `src/introConfig.ts`: `loadingTimeoutMs`, `stalledTimeoutMs` e `maxWaitMs`. |

A introdução aparece uma vez por sessão da aba. Para revê-la, abra uma aba independente ou remova a chave `ferro-forma:intro:v2` do `sessionStorage` dessa origem. A nova chave permite que quem já viu o vídeo anterior veja esta atualização. Links com âncora, como `#contato`, e a preferência por movimento reduzido abrem diretamente o conteúdo. Se o armazenamento estiver bloqueado, a página continua funcionando.

O botão **Pular introdução** funciona por toque e teclado. Durante a abertura, `inert` retira os controles da página da interação e da navegação por Tab, e a rolagem fica bloqueada com compensação da barra lateral. O fim da transição restaura tudo. Autoplay rejeitado, erro de mídia, carregamento superior a 4,5 s ou reprodução parada por 2,5 s liberam o site automaticamente; há ainda um limite total de segurança de 12 s. Esses timers são recuperação de falhas, não controlam a sequência normal.

Para preparar novamente os assets, use Python com Pillow, FFmpeg e FFprobe:

```sh
python scripts/prepare_intro.py --source CAMINHO_DO_VIDEO
```

Os testes de `tests/browser/intro.spec.ts` exercitam a mídia real e simulam falhas de reprodução. Capturas e gravações de verificação ficam em `test-results/` e não são publicadas.

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
