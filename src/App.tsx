import { useEffect, useRef, useState } from 'react';
import { Brand, Icon } from './components/Icon';
import type { IconName } from './components/Icon';
import Contact from './components/Contact';
import { navigation, projects, services, steps, testimonials } from './data';
import { trapDialogFocus } from './lib/dialog';

const imagePath = (name: string) => `${import.meta.env.BASE_URL}images/${name}.webp`;
const Dot = () => <span className="copper-dot">.</span>;

function Header() {
  const [open, setOpen] = useState(false);
  const menuButton = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { setOpen(false); menuButton.current?.focus(); }
    };
    const desktop = window.matchMedia('(min-width: 1001px)');
    const onResize = () => { if (desktop.matches) setOpen(false); };
    document.addEventListener('keydown', onKey);
    desktop.addEventListener('change', onResize);
    return () => { document.removeEventListener('keydown', onKey); desktop.removeEventListener('change', onResize); };
  }, [open]);
  return <>
    <div className="topbar"><div className="container topbar-inner"><span>Projetos sob medida para residências e empresas</span><a href="#contato">Solicite seu orçamento<Icon name="arrow" /></a></div></div>
    <header className="header"><div className="container header-inner"><Brand /><nav className="desktop-navigation" aria-label="Navegação principal">{navigation.map(item => <a key={item.href} href={item.href}>{item.label}</a>)}</nav><a className="button button-primary header-cta" href="#contato">Pedir orçamento</a><button ref={menuButton} className="icon-button menu-toggle" type="button" aria-expanded={open} aria-controls="mobile-navigation" aria-label={open ? 'Fechar menu' : 'Abrir menu'} onClick={() => setOpen(value => !value)}><Icon name={open ? 'close' : 'menu'} /></button></div>
      <nav className="mobile-navigation" id="mobile-navigation" aria-label="Navegação móvel" hidden={!open}>{navigation.map(item => <a key={item.href} href={item.href} onClick={() => { setOpen(false); const section = document.querySelector<HTMLElement>(item.href); if (section) { section.setAttribute('tabindex', '-1'); section.focus({ preventScroll: true }); } }}>{item.label}<Icon name="arrow" /></a>)}<a className="button button-primary" href="#contato" onClick={() => { setOpen(false); document.getElementById('quote-title')?.focus({ preventScroll: true }); }}>Pedir orçamento</a></nav>
    </header>
  </>;
}

function Hero() {
  return <section className="hero container" aria-labelledby="hero-title">
    <div className="hero-copy">
      <p className="eyebrow">Precisão em cada detalhe</p>
      <h1 id="hero-title"><span>Força na</span>{' '}<span>estrutura.</span>{' '}<span><em>Elegância</em> no</span>{' '}<span>acabamento.</span></h1>
      <p className="hero-description">Portões, estruturas e soluções em metal feitas sob medida para valorizar seu espaço.</p>
      <div className="hero-actions"><a className="button button-primary" href="#contato"><Icon name="whatsapp" />Solicitar orçamento</a><a className="text-link" href="#projetos">Conhecer os projetos<Icon name="arrow" /></a></div>
      <p className="hero-note">Conte sua ideia e envie fotos ou medidas do local.</p>
    </div>
    <figure className="hero-visual image-zoom">
      <img src={imagePath('hero-gate')} alt="Fachada contemporânea com portão ripado preto, concreto e paisagismo sob a luz do fim da tarde." width="780" height="750" fetchPriority="high" />
      <figcaption><strong>Portões sob medida</strong><span>Soluções que integram proteção e arquitetura</span></figcaption>
    </figure>
  </section>;
}

function Benefits() {
  const benefits: { title: string; description: string; icon: IconName }[] = [
    { title: 'Projeto sob medida', description: 'Soluções pensadas para cada espaço.', icon: 'measure' },
    { title: 'Acabamento cuidadoso', description: 'Atenção aos detalhes em cada etapa.', icon: 'shield' },
    { title: 'Instalação planejada', description: 'Execução alinhada ao seu projeto.', icon: 'cube' },
  ];
  return <div className="benefits"><div className="container benefits-grid">{benefits.map(item => <div className="benefit" key={item.title}><Icon name={item.icon} /><div><h2>{item.title}</h2><p>{item.description}</p></div></div>)}</div></div>;
}

function Services({ onSelect }: { onSelect: (value: string) => void }) {
  return <section id="servicos" className="services-section section-pad" aria-labelledby="services-title"><div className="container">
    <div className="section-heading" data-reveal><p className="eyebrow">O que fazemos</p><h2 id="services-title" className="section-title">Soluções em metal para o seu projeto<Dot /></h2><p className="section-description">Da proteção da fachada aos detalhes que transformam o ambiente.</p></div>
    <div className="services-grid">{services.map(service => <button type="button" className="service-card" key={service.title} onClick={() => onSelect(service.title)} aria-label={`Pedir orçamento para ${service.title}`} data-reveal><Icon className="service-icon" name={service.icon} /><span className="service-copy"><span className="service-title">{service.title}</span><span className="service-description">{service.description}</span></span><Icon name="arrow" className="service-arrow" /></button>)}</div>
  </div></section>;
}

function About() {
  return <section id="sobre" className="about-section dark-section" aria-labelledby="about-title"><div className="container about-grid">
    <div className="about-image image-zoom" data-reveal><img src={imagePath('workshop')} srcSet={`${imagePath('workshop-480')} 480w, ${imagePath('workshop')} 752w`} sizes="(max-width: 760px) calc(100vw - 40px), 52vw" alt="Profissional com óculos de proteção e luvas medindo uma peça metálica sobre a bancada da oficina." width="752" height="356" loading="lazy" /></div>
    <div className="about-copy" data-reveal><p className="eyebrow">Nossa essência</p><h2 id="about-title" className="section-title">Seu projeto merece cuidado em cada etapa<Dot /></h2><p>Unimos escuta, planejamento e execução para criar soluções em metal que façam sentido para o seu espaço.</p><ul className="check-list">{['Entendimento da sua necessidade', 'Definição de materiais e acabamentos', 'Atenção à fabricação e à instalação'].map(item => <li key={item}><Icon name="check" />{item}</li>)}</ul><a className="text-link" href="#contato">Conversar sobre meu projeto<Icon name="arrow" /></a></div>
  </div></section>;
}

function ProjectGallery() {
  const [active, setActive] = useState<number | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement | null>(null);
  const activeProject = active === null ? null : projects[active];
  const close = () => dialog.current?.close();
  const navigate = (offset: number) => setActive(index => index === null ? 0 : (index + offset + projects.length) % projects.length);
  useEffect(() => {
    if (active === null || !dialog.current || dialog.current.open) return;
    dialog.current.showModal();
  }, [active]);
  const isOpen = active !== null;
  useEffect(() => {
    if (!isOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previous; };
  }, [isOpen]);
  return <section id="projetos" className="projects-section dark-section section-pad" aria-labelledby="projects-title"><div className="container">
    <div className="section-heading" data-reveal><p className="eyebrow">Projetos & possibilidades</p><h2 id="projects-title" className="section-title">O metal ganha forma.<br />O espaço ganha identidade<Dot /></h2><div className="project-intro"><p className="section-description">Referências de aplicações, desenhos e acabamentos para inspirar o seu projeto.</p><p className="demo-note">Imagens ilustrativas do site demonstrativo.</p></div></div>
    <div className="projects-grid">{projects.map((project, index) => <button type="button" className="project-card" key={project.title} onClick={event => { trigger.current = event.currentTarget; setActive(index); }} aria-label={`Ampliar projeto: ${project.title}`} data-reveal><span className="project-image"><img src={imagePath(project.image)} alt={project.alt} width="674" height="189" loading="lazy" /><span className="expand-icon"><Icon name="expand" /></span></span><span className="project-caption"><strong>{project.title}</strong><span>{project.description}</span><Icon name="arrow" /></span></button>)}</div>
    <dialog className="project-dialog" ref={dialog} aria-labelledby="lightbox-title" aria-describedby="lightbox-description" onClose={() => { setActive(null); trigger.current?.focus({ preventScroll: true }); }} onClick={event => { if (event.target === event.currentTarget) close(); }} onKeyDown={event => { trapDialogFocus(event); if (event.key === 'ArrowRight') { event.preventDefault(); navigate(1); } if (event.key === 'ArrowLeft') { event.preventDefault(); navigate(-1); } }}>
      {activeProject && <div className="lightbox-inner"><div className="lightbox-toolbar"><span>PROJETOS & POSSIBILIDADES</span><button type="button" className="icon-button" aria-label="Fechar projeto" onClick={close} autoFocus><Icon name="close" /></button></div><img className="lightbox-image" src={imagePath(activeProject.image)} alt={activeProject.alt} /><div className="lightbox-bottom"><div aria-live="polite"><h2 id="lightbox-title">{activeProject.title}</h2><p id="lightbox-description">{activeProject.description}</p><small>Imagem ilustrativa · {active! + 1} de {projects.length}</small></div><div className="lightbox-controls"><button type="button" className="icon-button previous" aria-label="Projeto anterior" onClick={() => navigate(-1)}><Icon name="arrow" /></button><button type="button" className="icon-button" aria-label="Próximo projeto" onClick={() => navigate(1)}><Icon name="arrow" /></button></div></div></div>}
    </dialog>
  </div></section>;
}

function Process() {
  return <section className="process-section section-pad" aria-labelledby="process-title"><div className="container"><h2 className="section-title" id="process-title" data-reveal>Da sua ideia à instalação<Dot /></h2><ol className="process-grid">{steps.map((step, index) => <li key={step.title} data-reveal><div className="step-number"><span>0{index + 1}</span><span /></div><h3>{step.title}</h3><p>{step.description}</p></li>)}</ol></div></section>;
}

function Testimonials() {
  return <section className="testimonials-section section-pad" aria-labelledby="testimonials-title"><div className="container"><div className="section-heading" data-reveal><p className="eyebrow">Experiência do cliente</p><h2 id="testimonials-title" className="section-title">Confiança também faz parte do projeto<Dot /></h2></div><div className="testimonials-grid">{testimonials.map(item => <figure className="testimonial" key={item.type} data-reveal><p className="testimonial-label">Depoimento ilustrativo</p><blockquote>“{item.quote}”</blockquote><figcaption>Exemplo — {item.type}</figcaption></figure>)}</div></div></section>;
}

function Footer() {
  return <footer className="footer dark-section"><div className="container"><div className="footer-grid"><div className="footer-brand"><Brand light /><p>Estruturas bem pensadas.<br />Acabamentos que valorizam.</p></div><nav aria-label="Navegação do rodapé"><h2>Navegação</h2>{navigation.map(item => <a key={item.href} href={item.href}>{item.label}</a>)}</nav><div className="footer-service"><h2>Atendimento</h2><p>Residencial e comercial</p><p>Projetos sob consulta</p><a href="#contato" className="footer-contact">Fale pelo WhatsApp<Icon name="arrow" /></a></div></div><div className="footer-bottom"><p>FERRO & FORMA — Marca fictícia. Site demonstrativo.</p><p>Imagens e depoimentos ilustrativos.</p></div></div></footer>;
}

function useReveal() {
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window)) return;
    const observer = new IntersectionObserver(entries => { entries.forEach(entry => { if (entry.isIntersecting) { entry.target.classList.add('revealed'); observer.unobserve(entry.target); } }); }, { threshold: 0.08 });
    const elements = document.querySelectorAll<HTMLElement>('[data-reveal]');
    elements.forEach(element => { if (element.getBoundingClientRect().top > window.innerHeight) { element.classList.add('reveal-ready'); observer.observe(element); } });
    // A failsafe keeps all content available if observation is interrupted.
    const timeout = window.setTimeout(() => elements.forEach(element => element.classList.add('revealed')), 6000);
    return () => { observer.disconnect(); clearTimeout(timeout); elements.forEach(element => element.classList.remove('reveal-ready')); };
  }, []);
}

export default function App() {
  const [selection, setSelection] = useState({ service: '', version: 0 });
  useReveal();
  const chooseService = (service: string) => {
    setSelection(current => ({ service, version: current.version + 1 }));
    document.getElementById('contato')?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
  };
  return <div id="inicio"><a className="skip-link" href="#conteudo">Pular para o conteúdo</a><Header /><main id="conteudo" tabIndex={-1}><Hero /><Benefits /><Services onSelect={chooseService} /><About /><ProjectGallery /><Process /><Testimonials /><Contact selectedService={selection.service} selectionVersion={selection.version} /></main><Footer /></div>;
}
