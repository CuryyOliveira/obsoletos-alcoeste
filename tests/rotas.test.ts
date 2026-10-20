import { readFileSync } from 'node:fs';
import { matchPath } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { PARAM_LOTE, ROTA_LOTE, ROTA_PREVIA } from '../src/rotas';

describe('rotas do lote', () => {
  it('o link do QR entrega o token no parâmetro que a página lê', () => {
    const m = matchPath(ROTA_LOTE, '/lote/1-b419f52523b49838');
    expect(m?.params[PARAM_LOTE]).toBe('1-b419f52523b49838');
    expect(matchPath(ROTA_PREVIA, 'previa/1-b419f52523b49838')?.params[PARAM_LOTE]).toBe('1-b419f52523b49838');
  });
  it('main.tsx e Admin.tsx usam as constantes (não um caminho escrito à mão)', () => {
    expect(readFileSync('src/main.tsx', 'utf8')).toContain('path={ROTA_LOTE}');
    expect(readFileSync('src/pages/Admin.tsx', 'utf8')).toContain('path={ROTA_PREVIA}');
    expect(readFileSync('src/pages/LotePublico.tsx', 'utf8')).toContain('useParams()[PARAM_LOTE]');
  });
});
