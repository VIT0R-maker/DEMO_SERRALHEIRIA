import assert from 'node:assert/strict';
import test from 'node:test';
import { buildWhatsAppMessage, buildWhatsAppUrl } from '../src/lib/whatsapp.ts';

test('a mensagem reúne nome, cidade, serviço e descrição com espaços externos removidos', () => {
  const message = buildWhatsAppMessage({
    name: '  João & Ana  ',
    city: '  São Paulo / Sé  ',
    service: '  Peças especiais  ',
    description: '  Mesa #1 + aço, 2 × 1 m.\nAcabamento em cobre.  ',
  });

  assert.equal(message, [
    'Olá, FERRO & FORMA! Gostaria de conversar sobre um projeto.',
    '',
    'Nome: João & Ana',
    'Cidade / bairro: São Paulo / Sé',
    'Serviço: Peças especiais',
    '',
    'Sobre o projeto: Mesa #1 + aço, 2 × 1 m.\nAcabamento em cobre.',
  ].join('\n'));
});

test('a descrição opcional vazia não cria uma linha sem conteúdo', () => {
  for (const description of ['', '   ', '\n\t']) {
    const message = buildWhatsAppMessage({
      name: 'Ana',
      city: 'Campinas',
      service: 'Outro / preciso de orientação',
      description,
    });

    assert.match(message, /Nome: Ana\nCidade \/ bairro: Campinas\nServiço: Outro \/ preciso de orientação$/);
    assert.equal(message.includes('Sobre o projeto:'), false);
    assert.equal(message.endsWith('\n'), false);
  }
});

test('a URL preserva acentos, quebras de linha, &, +, # e ? sem criar parâmetros extras', () => {
  // Synthetic digits exercise formatting only; no request or conversation is opened.
  const syntheticNumber = '999000000000000';
  const message = buildWhatsAppMessage({
    name: 'José & Lívia',
    city: 'São Paulo / Sé',
    service: 'Portões sob medida',
    description: 'Portão #2 + grade?\nReferência: 3,5 m & pintura em cobre.',
  });
  const result = buildWhatsAppUrl(syntheticNumber, message);

  assert.ok(result);
  const url = new URL(result);
  assert.equal(url.protocol, 'https:');
  assert.equal(url.hostname, 'wa.me');
  assert.equal(url.pathname, `/${syntheticNumber}`);
  assert.equal(url.hash, '');
  assert.deepEqual([...url.searchParams.keys()], ['text']);
  assert.equal(url.searchParams.get('text'), message);
  assert.match(result, /%26/);
  assert.match(result, /%2B/);
  assert.match(result, /%23/);
  assert.match(result, /%0A/);
});

test('ausência de número mantém o modo demonstrativo', () => {
  assert.equal(buildWhatsAppUrl('', 'Uma ideia de projeto'), null);
});

test('números malformados nunca produzem um destino do WhatsApp', () => {
  const invalidNumbers = [
    '1234567',
    '1234567890123456',
    '09990000000',
    '+999000000000',
    '999 000000000',
    '999-000000000',
    '(999)000000000',
    '999000000000x',
    ' 999000000000',
    '999000000000 ',
    '999000000000\n',
    '９９９０００００００００',
  ];

  for (const number of invalidNumbers) {
    assert.equal(buildWhatsAppUrl(number, 'Projeto'), null, `Configuração inválida: ${JSON.stringify(number)}`);
  }
});
