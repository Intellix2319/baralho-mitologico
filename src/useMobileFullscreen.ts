import { useEffect } from 'react';

/** Celular de verdade (tela de toque e pequena). Não pega computador nem notebook com tela touch grande. */
export const isTouchPhone = (): boolean => {
  if (typeof window === 'undefined') return false;
  const touch = window.matchMedia('(pointer: coarse)').matches;
  const small = Math.min(window.screen.width, window.screen.height) <= 900;
  return touch && small;
};

/**
 * No celular, entra em tela cheia sozinho no primeiro toque (sem pedir permissão e sem botão)
 * e trava na horizontal. Se a pessoa sair da tela cheia (gesto de voltar), o próximo toque volta.
 * Observação: o navegador só deixa entrar em tela cheia depois de um toque; por isso é no 1º toque.
 */
export function useMobileFullscreen() {
  useEffect(() => {
    if (!isTouchPhone()) return;

    // App instalado já abre em tela cheia pelo manifesto: não precisa fazer nada
    if (window.matchMedia('(display-mode: fullscreen)').matches) return;

    const enter = async () => {
      if (document.fullscreenElement) return;
      try {
        await document.documentElement.requestFullscreen({ navigationUI: 'hide' });
      } catch {
        return; // navegador não permitiu (ex.: iPhone no Safari)
      }
      try {
        const o = screen.orientation as ScreenOrientation & { lock?: (o: string) => Promise<void> };
        await o.lock?.('landscape');
      } catch {
        /* sem suporte: o aviso "gire o celular" cobre */
      }
    };

    document.addEventListener('pointerup', enter);
    document.addEventListener('touchend', enter);
    return () => {
      document.removeEventListener('pointerup', enter);
      document.removeEventListener('touchend', enter);
    };
  }, []);
}
