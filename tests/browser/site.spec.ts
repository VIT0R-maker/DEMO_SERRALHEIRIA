import { test, expect } from '@playwright/test';

for (const width of [320, 360, 390, 768, 1024, 1440]) {
  test(`layout e imagens em ${width}px`, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
    await page.setViewportSize({ width, height: 1000 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const response = await page.goto('./');
    expect(response?.status()).toBe(200);
    await page.evaluate(() => document.fonts.ready);
    await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
    for (const section of ['#servicos', '#sobre', '#projetos', '#contato']) {
      await page.locator(section).scrollIntoViewIfNeeded();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    }
    const pictures = page.locator('main img');
    for (const picture of await pictures.all()) {
      await picture.scrollIntoViewIfNeeded();
      await expect.poll(() => picture.evaluate(img => (img as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
    }
    const outside = await page.locator('main *').evaluateAll(elements => elements.filter(element => {
      if (!(element instanceof HTMLElement) || !element.getClientRects().length || element.closest('dialog:not([open])')) return false;
      const rect = element.getBoundingClientRect();
      return rect.width > 0 && (rect.right > innerWidth + 1 || rect.left < -1);
    }).map(element => `${element.tagName}.${element.className}`));
    expect(outside).toEqual([]);
    await page.evaluate(() => window.scrollTo(0, 0));
    if (width === 1440 || width === 390) await page.screenshot({ path: `test-results/${width === 1440 ? 'desktop' : 'mobile'}.png`, fullPage: true });
    expect(errors).toEqual([]);
  });
}

test('serviços preenchem orçamento, validação e prévia copiada', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto('./');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.getByRole('button', { name: 'Pedir orçamento para Escadas metálicas', exact: true }).click();
  await expect(page.locator('#quote-service')).toHaveValue('Escadas metálicas');
  await expect(page.locator('#quote-title')).toBeFocused();
  await page.getByRole('button', { name: 'Continuar no WhatsApp' }).click();
  await expect(page.locator('#quote-name')).toBeFocused();
  await expect(page.locator('#quote-name-error')).toBeVisible();
  await expect(page.locator('#quote-city-error')).toBeVisible();
  await page.getByLabel('Seu nome').fill('João & Ana');
  await page.getByLabel('Cidade / bairro').fill('São Paulo / Sé');
  await page.getByLabel('Conte um pouco sobre o projeto').fill('Escada de 3 m + guarda-corpo #1');
  await page.getByRole('button', { name: 'Continuar no WhatsApp' }).click();
  const dialog = page.getByRole('dialog', { name: 'Tudo pronto para conversar.' });
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText('Demonstração: nenhum número de atendimento foi configurado.');
  await expect(page.locator('#quote-preview-message')).toHaveValue(/João & Ana[\s\S]*São Paulo \/ Sé[\s\S]*Escadas metálicas[\s\S]*3 m \+ guarda-corpo #1/);
  expect(await page.evaluate(() => document.body.style.overflow)).toBe('hidden');
  await page.getByRole('button', { name: 'Copiar mensagem' }).click();
  await expect(page.getByRole('status')).toContainText('Mensagem copiada.');
  expect(await page.evaluate(() => navigator.clipboard.readText())).toContain('João & Ana');
  await page.keyboard.press('Escape');
  await expect(dialog).not.toBeVisible();
  await expect(page.getByRole('button', { name: 'Continuar no WhatsApp' })).toBeFocused();
  await expect.poll(() => page.evaluate(() => document.body.style.overflow)).not.toBe('hidden');
  expect(context.pages()).toHaveLength(1);
});

test('galeria por teclado, navegação, contenção e retorno do foco', async ({ page }) => {
  await page.goto('./');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const trigger = page.getByRole('button', { name: 'Ampliar projeto: Portão ripado' });
  await trigger.focus();
  await page.keyboard.press('Enter');
  const dialog = page.locator('.project-dialog');
  await expect(dialog).toBeVisible();
  await expect(page.getByRole('button', { name: 'Fechar projeto' })).toBeFocused();
  await page.keyboard.press('ArrowRight');
  await expect(page.locator('#lightbox-title')).toHaveText('Escada metálica');
  await page.keyboard.press('ArrowLeft');
  await expect(page.locator('#lightbox-title')).toHaveText('Portão ripado');
  await page.keyboard.press('ArrowLeft');
  await expect(page.locator('#lightbox-title')).toHaveText('Guarda-corpo');
  for (let i = 0; i < 7; i++) {
    await page.keyboard.press('Tab');
    expect(await dialog.evaluate(element => element.contains(document.activeElement))).toBe(true);
  }
  await page.keyboard.press('Escape');
  await expect(dialog).not.toBeVisible();
  await expect(trigger).toBeFocused();
});

test('menu móvel, âncoras e movimento reduzido', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('./');
  const menu = page.getByRole('button', { name: 'Abrir menu' });
  await menu.click();
  await expect(page.getByRole('button', { name: 'Fechar menu' })).toHaveAttribute('aria-expanded', 'true');
  await page.keyboard.press('Escape');
  await expect(menu).toBeFocused();
  await menu.click();
  await page.getByRole('navigation', { name: 'Navegação móvel' }).getByRole('link', { name: 'Projetos', exact: true }).click();
  await expect(page).toHaveURL(/#projetos$/);
  await expect(menu).toHaveAttribute('aria-expanded', 'false');
  expect(await page.evaluate(() => getComputedStyle(document.documentElement).scrollBehavior)).toBe('auto');
  await page.getByRole('link', { name: 'Solicitar orçamento', exact: true }).click();
  await expect(page).toHaveURL(/#contato$/);
  for (const link of await page.locator('a[href^="#"]').all()) {
    const href = await link.getAttribute('href');
    expect(await page.locator(href!).count()).toBe(1);
  }
});
