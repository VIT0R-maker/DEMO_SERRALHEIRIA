import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { whatsappNumber } from '../config';
import { services } from '../data';
import { buildWhatsAppMessage, buildWhatsAppUrl } from '../lib/whatsapp';
import type { ContactDetails } from '../lib/whatsapp';
import './Contact.css';

interface ContactProps {
  selectedService: string;
  selectionVersion: number;
}

type RequiredField = 'name' | 'city' | 'service';
type FormErrors = Partial<Record<RequiredField, string>>;

const serviceOptions = [...services.map((service) => service.title), 'Outro / preciso de orientação'];

function ContactIcon({ type }: { type: 'chat' | 'pin' | 'box' | 'whatsapp' }) {
  return (
    <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {type === 'chat' && <path d="M27 15a12 12 0 0 1-17.8 10.5L3 28l2.5-6.2A12 12 0 1 1 27 15Z" />}
      {type === 'pin' && <><path d="M26 13c0 8-10 16-10 16S6 21 6 13a10 10 0 1 1 20 0Z" /><circle cx="16" cy="13" r="3.5" /></>}
      {type === 'box' && <><path d="m16 2 13 7.5v15L16 32 3 24.5v-15L16 2Z" transform="translate(1 0) scale(.94)" /><path d="m4 9.5 12 7 12-7M16 16.5v13" /></>}
      {type === 'whatsapp' && <><path d="M28 15.5A12.5 12.5 0 0 1 9.3 26.3L3 28l1.7-6.1A12.5 12.5 0 1 1 28 15.5Z" /><path d="m11 9-2 1c-1 4 5 11 10 11l2-2-4-2-1 1c-2-1-4-3-4-5l1-1-2-3Z" /></>}
    </svg>
  );
}

export default function Contact({ selectedService, selectionVersion }: ContactProps) {
  const [details, setDetails] = useState<ContactDetails>({ name: '', city: '', service: '', description: '' });
  const [errors, setErrors] = useState<FormErrors>({});
  const [previewMessage, setPreviewMessage] = useState<string | null>(null);
  const [copyStatus, setCopyStatus] = useState('');
  const [handoffStatus, setHandoffStatus] = useState('');
  const titleRef = useRef<HTMLHeadingElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const previewRef = useRef<HTMLTextAreaElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (selectionVersion === 0) return;
    setDetails((current) => ({ ...current, service: selectedService }));
    setErrors((current) => ({ ...current, service: undefined }));
    titleRef.current?.focus({ preventScroll: true });
  }, [selectedService, selectionVersion]);

  useEffect(() => {
    if (!previewMessage || !dialogRef.current) return;
    const dialog = dialogRef.current;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    if (!dialog.open) dialog.showModal();

    return () => {
      document.body.style.overflow = previousOverflow;
      if (dialog.open) dialog.close();
      returnFocusRef.current?.focus({ preventScroll: true });
    };
  }, [previewMessage]);

  function updateField(field: keyof ContactDetails, value: string) {
    setDetails((current) => ({ ...current, [field]: value }));
    setHandoffStatus('');
    if (field !== 'description') setErrors((current) => ({ ...current, [field]: undefined }));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors: FormErrors = {};
    if (!details.name.trim()) nextErrors.name = 'Conte como podemos chamar você.';
    if (!details.city.trim()) nextErrors.city = 'Informe a cidade ou o bairro do projeto.';
    if (!serviceOptions.includes(details.service)) nextErrors.service = 'Selecione um serviço ou peça orientação.';
    setErrors(nextErrors);

    const firstInvalid = (['name', 'city', 'service'] as const).find((field) => nextErrors[field]);
    if (firstInvalid) {
      requestAnimationFrame(() => document.getElementById(`quote-${firstInvalid}`)?.focus());
      return;
    }

    const message = buildWhatsAppMessage(details);
    const url = buildWhatsAppUrl(whatsappNumber, message);
    if (url) {
      window.open(url, '_blank', 'noopener,noreferrer');
      setHandoffStatus('Revise a mensagem na conversa do WhatsApp e confirme o envio por lá.');
      return;
    }

    returnFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setCopyStatus('');
    setPreviewMessage(message);
  }

  async function copyMessage() {
    if (!previewMessage) return;
    try {
      await navigator.clipboard.writeText(previewMessage);
      setCopyStatus('Mensagem copiada. Você pode colá-la onde preferir.');
    } catch {
      previewRef.current?.focus();
      previewRef.current?.select();
      setCopyStatus('Selecione e copie o texto acima com Ctrl+C, ⌘C ou o menu do seu dispositivo.');
    }
  }

  return (
    <section className="contact-section" id="contato" aria-labelledby="contact-title">
      <div className="container contact-layout">
        <div className="contact-intro">
          <p className="eyebrow">Vamos conversar?</p>
          <h2 className="section-title" id="contact-title">Seu próximo projeto começa com uma conversa<span className="contact-dot">.</span></h2>
          <p className="contact-description">Conte o que você precisa. Fotos do local, medidas aproximadas e referências ajudam a entender sua ideia.</p>
          <ul className="contact-prompts">
            <li><ContactIcon type="chat" /><span>Qual solução você procura?</span></li>
            <li><ContactIcon type="pin" /><span>Em qual cidade será o projeto?</span></li>
            <li><ContactIcon type="box" /><span>Você já tem medidas ou referências?</span></li>
          </ul>
        </div>

        <form className="quote-form" noValidate onSubmit={handleSubmit} aria-labelledby="quote-title">
          <h3 id="quote-title" ref={titleRef} tabIndex={-1}>Peça seu orçamento</h3>
          <div className="quote-fields">
            <div className="quote-field">
              <label htmlFor="quote-name">Seu nome <span className="required-marker" aria-hidden="true">*</span></label>
              <input id="quote-name" name="name" autoComplete="name" placeholder="Digite seu nome" required maxLength={100} value={details.name} onChange={(event) => updateField('name', event.target.value)} aria-invalid={Boolean(errors.name)} aria-describedby={errors.name ? 'quote-name-error' : undefined} />
              {errors.name && <p className="field-error" id="quote-name-error">{errors.name}</p>}
            </div>
            <div className="quote-field">
              <label htmlFor="quote-city">Cidade / bairro <span className="required-marker" aria-hidden="true">*</span></label>
              <input id="quote-city" name="city" autoComplete="address-level2" placeholder="Ex.: São Paulo, Vila Mariana" required maxLength={160} value={details.city} onChange={(event) => updateField('city', event.target.value)} aria-invalid={Boolean(errors.city)} aria-describedby={errors.city ? 'quote-city-error' : undefined} />
              {errors.city && <p className="field-error" id="quote-city-error">{errors.city}</p>}
            </div>
            <div className="quote-field quote-field-wide">
              <label htmlFor="quote-service">O que você precisa? <span className="required-marker" aria-hidden="true">*</span></label>
              <div className="quote-select-wrap">
                <select id="quote-service" name="service" required value={details.service} onChange={(event) => updateField('service', event.target.value)} aria-invalid={Boolean(errors.service)} aria-describedby={errors.service ? 'quote-service-error' : undefined}>
                  <option value="" disabled>Selecione um serviço</option>
                  {serviceOptions.map((service) => <option key={service} value={service}>{service}</option>)}
                </select>
                <svg viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="m5 7.5 5 5 5-5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </div>
              {errors.service && <p className="field-error" id="quote-service-error">{errors.service}</p>}
            </div>
            <div className="quote-field quote-field-wide">
              <label htmlFor="quote-description">Conte um pouco sobre o projeto <span className="field-optional">(opcional)</span></label>
              <textarea id="quote-description" name="description" rows={3} maxLength={2000} placeholder="Ex.: Tipo de projeto, medidas aproximadas, referências, etc." value={details.description} onChange={(event) => updateField('description', event.target.value)} />
            </div>
          </div>
          <button className="button button-primary quote-submit" type="submit"><ContactIcon type="whatsapp" />Continuar no WhatsApp</button>
          <p className="quote-note">Você poderá revisar a mensagem no WhatsApp antes de enviá-la.</p>
          {handoffStatus && <p className="quote-handoff" role="status">{handoffStatus}</p>}
        </form>
      </div>

      <dialog className="quote-dialog" ref={dialogRef} aria-labelledby="preview-title" aria-describedby="preview-description" onClose={() => setPreviewMessage(null)} onClick={(event) => {
        if (event.target !== event.currentTarget) return;
        const bounds = event.currentTarget.getBoundingClientRect();
        if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) event.currentTarget.close();
      }}>
        <div className="quote-dialog-heading">
          <p className="eyebrow">Sua ideia, organizada</p>
          <button className="quote-dialog-close" type="button" aria-label="Fechar prévia da mensagem" onClick={() => dialogRef.current?.close()}><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m6 6 12 12M6 18 18 6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" /></svg></button>
        </div>
        <h2 id="preview-title">Tudo pronto para conversar.</h2>
        <p id="preview-description">Demonstração: nenhum número de atendimento foi configurado.</p>
        <label className="preview-label" htmlFor="quote-preview-message">Prévia da sua mensagem</label>
        <textarea ref={previewRef} id="quote-preview-message" className="quote-preview-message" readOnly value={previewMessage ?? ''} rows={9} />
        <button className="button button-primary quote-copy" type="button" onClick={copyMessage}><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="8" y="8" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="1.7" /><path d="M15 5V4a1 1 0 0 0-1-1H4a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h1" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" /></svg>Copiar mensagem</button>
        <p className="quote-copy-status" role="status">{copyStatus || 'Nenhuma mensagem foi enviada. Você pode copiar esta prévia.'}</p>
      </dialog>
    </section>
  );
}
