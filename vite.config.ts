import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

/** Executa as funções de /api localmente (sem precisar da CLI da Vercel). */
function devApi(): Plugin {
  return {
    name: 'dev-api',
    configureServer(server) {
      Object.assign(process.env, loadEnv('development', process.cwd(), ''));
      server.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith('/api/')) return next();
        const url = new URL(req.url, 'http://localhost');
        const file = '/api/' + url.pathname.slice(5).replace(/[^\w/-]/g, '') + '.ts';
        try {
          const mod = await server.ssrLoadModule(file);
          const chunks: Buffer[] = [];
          for await (const c of req) chunks.push(c as Buffer);
          const raw = Buffer.concat(chunks).toString();
          const r = req as any;
          r.query = Object.fromEntries(url.searchParams);
          try { r.body = raw ? JSON.parse(raw) : undefined; } catch { r.body = undefined; }
          const s = res as any;
          s.status = (c: number) => ((res.statusCode = c), s);
          s.json = (o: unknown) => (res.setHeader('Content-Type', 'application/json'), res.end(JSON.stringify(o)));
          s.send = (b: Buffer | string) => res.end(b);
          await mod.default(r, s);
        } catch (e) {
          console.error(e);
          res.statusCode = 404;
          res.end();
        }
      });
    },
  };
}

export default defineConfig({ plugins: [react(), devApi()] });
