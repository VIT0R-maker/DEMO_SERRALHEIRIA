import type { IconName } from './components/Icon';

export const navigation = [{ label: 'Serviços', href: '#servicos' }, { label: 'Projetos', href: '#projetos' }, { label: 'Sobre', href: '#sobre' }, { label: 'Contato', href: '#contato' }];
export const services: { title: string; description: string; icon: IconName }[] = [
  { title: 'Portões sob medida', description: 'Modelos de correr e de abrir, com desenho integrado à fachada.', icon: 'gate' },
  { title: 'Portas e grades', description: 'Proteção e funcionalidade para acessos, janelas e ambientes.', icon: 'door' },
  { title: 'Guarda-corpos e corrimãos', description: 'Soluções para escadas, varandas e áreas de circulação.', icon: 'railing' },
  { title: 'Coberturas e estruturas', description: 'Estruturas metálicas dimensionadas conforme cada projeto.', icon: 'structure' },
  { title: 'Escadas metálicas', description: 'Desenho funcional com presença arquitetônica.', icon: 'stairs' },
  { title: 'Peças especiais', description: 'Mobiliário e elementos em metal feitos sob encomenda.', icon: 'table' },
];
export const projects = [
  { title: 'Portão ripado', description: 'Privacidade e presença na fachada', image: 'project-gate', alt: 'Portão preto com ripas verticais integrado a uma fachada contemporânea de concreto.' },
  { title: 'Escada metálica', description: 'Leveza visual e estrutura marcante', image: 'project-stairs', alt: 'Escada de estrutura metálica preta, degraus de madeira e corrimão leve em uma sala iluminada.' },
  { title: 'Pergolado', description: 'Integração entre arquitetura e área externa', image: 'project-pergola', alt: 'Pergolado metálico preto sobre área de convivência externa com vegetação.' },
  { title: 'Guarda-corpo', description: 'Detalhes que completam o ambiente', image: 'project-railing', alt: 'Guarda-corpo de barras metálicas pretas em uma varanda com vista para o verde.' },
];
export const steps = [
  { title: 'Conte sua ideia', description: 'Envie referências, fotos e medidas iniciais.' },
  { title: 'Alinhamos os detalhes', description: 'Definimos necessidades, materiais e acabamentos.' },
  { title: 'Você aprova a proposta', description: 'Escopo, valores e prazos combinados com clareza.' },
  { title: 'Produção e instalação', description: 'Executamos conforme o projeto aprovado.' },
];
export const testimonials = [
  { quote: 'O desenho do portão ficou integrado à fachada, exatamente como imaginávamos.', type: 'projeto residencial' },
  { quote: 'O atendimento ajudou a esclarecer materiais, medidas e opções de acabamento.', type: 'projeto comercial' },
  { quote: 'O cuidado com os detalhes fez diferença no resultado do ambiente.', type: 'projeto sob medida' },
];
