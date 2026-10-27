import React from 'react';

/** Erro típico de "arquivo do jogo não carregou" (versão velha em cache, rede caiu, etc.) */
export const isChunkError = (e: unknown): boolean =>
  /Loading chunk|dynamically imported module|Importing a module script|error loading dynamically|Unable to preload|Failed to fetch dynamically/i.test(
    String((e as { message?: string })?.message || e)
  );

/** Limpa o cache do app instalado (PWA) e recarrega, pegando a versão nova do site */
export async function recoverFromStaleBuild(): Promise<void> {
  try {
    const regs = (await navigator.serviceWorker?.getRegistrations()) || [];
    await Promise.all(regs.map((r) => r.unregister()));
  } catch {
    /* ignora */
  }
  try {
    const keys = await caches.keys();
    await Promise.all(keys.map((k) => caches.delete(k)));
  } catch {
    /* ignora */
  }
  window.location.reload();
}

/** React.lazy que, se o arquivo do jogo falhar ao carregar, se conserta sozinho (1 vez) em vez de dar tela de erro */
export function lazyWithRetry<T extends React.ComponentType<any>>(
  factory: () => Promise<{ default: T }>
) {
  return React.lazy(async () => {
    try {
      const mod = await factory();
      try { sessionStorage.removeItem('chunk_retry'); } catch { /* ignora */ }
      return mod;
    } catch (e) {
      let already = false;
      try { already = !!sessionStorage.getItem('chunk_retry'); sessionStorage.setItem('chunk_retry', '1'); } catch { /* ignora */ }
      if (isChunkError(e) && !already) {
        await recoverFromStaleBuild();
        return new Promise<never>(() => {}); // fica esperando o reload
      }
      throw e;
    }
  });
}
