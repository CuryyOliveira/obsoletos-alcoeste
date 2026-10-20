import type { ReactNode } from 'react';

export function Estado({ loading, error, onRetry, children }: {
  loading: boolean; error: Error | null; onRetry?: () => void; children: ReactNode;
}) {
  if (loading) return <p className="aviso" role="status">Carregando…</p>;
  if (error)
    return (
      <div className="aviso erro" role="alert">
        <p>{error.message}</p>
        {onRetry && <button className="btn" onClick={onRetry}>Tentar novamente</button>}
      </div>
    );
  return <>{children}</>;
}
