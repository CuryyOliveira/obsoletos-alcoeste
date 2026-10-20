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
