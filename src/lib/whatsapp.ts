export interface ContactDetails {
  name: string;
  city: string;
  service: string;
  description: string;
}

export function buildWhatsAppMessage(details: ContactDetails): string {
  const lines = [
    'Olá, FERRO & FORMA! Gostaria de conversar sobre um projeto.',
    '',
    `Nome: ${details.name.trim()}`,
    `Cidade / bairro: ${details.city.trim()}`,
    `Serviço: ${details.service.trim()}`,
  ];

  if (details.description.trim()) {
    lines.push('', `Sobre o projeto: ${details.description.trim()}`);
  }

  return lines.join('\n');
}

/** Invalid or absent configuration must never open an unrelated conversation. */
export function buildWhatsAppUrl(number: string, message: string): string | null {
  if (!/^[1-9]\d{7,14}$/.test(number)) return null;
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}
