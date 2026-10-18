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

## Fotografias

As fotografias disponíveis foram recortadas dos mockups originais, excluindo textos e legendas gravados nos pixels. As legendas do site são HTML. As imagens foram exportadas em WebP, sem ampliação artificial, com variantes de 480 px de largura.

A resolução da fonte limita o detalhe: o hero tem 780 × 750 px; a oficina, 752 × 356 px; os quatro projetos, 669 × 186–188 px. Os projetos têm proporção panorâmica porque as legendas dos mockups cobrem a região inferior das fotos. A lightbox preserva os recortes disponíveis. Para versões maiores e mais detalhadas, substitua os arquivos por fotografias originais de maior resolução.

`public/images/manifest.json` registra dimensões e recortes. Para refazer os assets com os mockups originais, use Python e Pillow:

```sh
python scripts/prepare_assets.py --source-dir CAMINHO_DOS_MOCKUPS
```

O projeto está pronto para gerar o build e ser implantado em uma hospedagem estática. Nenhuma publicação externa é feita pelos comandos acima.
