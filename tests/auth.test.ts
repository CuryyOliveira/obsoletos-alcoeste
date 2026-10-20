import { beforeAll, describe, expect, it } from 'vitest';
import { criarCookie, pinCorreto, sessaoValida } from '../server/auth';

beforeAll(() => { process.env.ADMIN_PIN = '4321'; process.env.SESSION_SECRET = 'segredo-de-teste-bem-longo'; });
const req = (cookie?: string) => ({ headers: { cookie } }) as never;

describe('auth por PIN', () => {
  it('valida PIN', () => { expect(pinCorreto('4321')).toBe(true); expect(pinCorreto('0000')).toBe(false); expect(pinCorreto(undefined)).toBe(false); });
  it('cookie assinado vale; adulterado não', () => {
    const c = criarCookie().split(';')[0];
    expect(sessaoValida(req(c))).toBe(true);
    expect(sessaoValida(req(c.slice(0, -2) + 'aa'))).toBe(false);
    expect(sessaoValida(req())).toBe(false);
  });
});

import { criarCookieView, pinVisualizacaoCorreto, sessaoViewValida } from '../server/auth';

describe('sessão de visualização', () => {
  it('cookie de visualização NÃO vale como administrador; o de admin vale como visualização', () => {
    process.env.VIEW_PIN = '8765';
    const view = criarCookieView().split(';')[0];
    const admin = criarCookie().split(';')[0];
    expect(sessaoViewValida(req(view))).toBe(true);
    expect(sessaoValida(req(view))).toBe(false);
    expect(sessaoViewValida(req(admin))).toBe(true);
    // forjar: trocar o nome do cookie de visualização pelo de admin não passa
    expect(sessaoValida(req(view.replace('obs_view', 'obs_sess')))).toBe(false);
  });
  it('sem VIEW_PIN a visualização fica desligada', () => {
    expect(pinVisualizacaoCorreto('8765')).toBe(true);
    expect(pinVisualizacaoCorreto('0000')).toBe(false);
    delete process.env.VIEW_PIN;
    expect(pinVisualizacaoCorreto('8765')).toBe(false);
    expect(pinVisualizacaoCorreto('')).toBe(false);
  });
});
