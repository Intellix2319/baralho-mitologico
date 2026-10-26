/**
 * Base dos jogos online.
 *
 * O ANFITRIÃO roda a partida inteira (motor do jogo). Os convidados só mandam jogadas
 * e recebem a "visão" da mesa, já sem as cartas que não podem ver.
 * O motor é feito só de funções puras (sem React), por isso dá para testar no terminal.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { onlineRoom, useOnlineRoom } from './room';

export interface Seat {
  /** id do jogador na sala (null = IA) */
  playerId: string | null;
  name: string;
  human: boolean;
}

export interface Step<A> {
  /** quem joga (IA) ou 0 para passos automáticos do sistema */
  seat: number;
  action: A;
  /** espera em ms antes de executar (dá tempo de ver a jogada anterior) */
  delay: number;
}

export interface OnlineEngine<S extends { seats: Seat[] }, A extends { type: string }, V extends { mySeat: number }> {
  buildSeats(humans: { id: string; name: string }[]): Seat[];
  init(seats: Seat[]): S;
  /** Devolve o MESMO objeto quando a jogada é inválida. */
  reduce(state: S, action: A, seat: number): S;
  view(state: S, seat: number): V;
  /** Próximo passo automático (IA ou sistema). null = esperando um humano. */
  next(state: S): Step<A> | null;
}

export const AI_NAMES = ['Hera', 'Poseidon', 'Hefesto', 'Ártemis', 'Apolo', 'Atena', 'Ares', 'Hermes'];

/** Humanos primeiro (na ordem da sala), depois IAs até completar `total` lugares. */
export function fillSeats(humans: { id: string; name: string }[], total: number): Seat[] {
  const seats: Seat[] = humans.slice(0, total).map((h) => ({ playerId: h.id, name: h.name, human: true }));
  let ai = 0;
  while (seats.length < total) {
    seats.push({ playerId: null, name: AI_NAMES[ai % AI_NAMES.length], human: false });
    ai++;
  }
  return seats;
}

export const turnIntoAI = (seat: Seat): Seat => ({ ...seat, human: false, playerId: null, name: `${seat.name} (IA)` });

/**
 * Liga um motor de jogo à sala online.
 * - Anfitrião: guarda o estado, aplica as jogadas (dele, dos convidados e das IAs) e envia a visão de cada um.
 * - Convidado: mostra a visão recebida e manda as jogadas para o anfitrião.
 */
export function useOnlineGame<S extends { seats: Seat[] }, A extends { type: string }, V extends { mySeat: number }>(
  engine: OnlineEngine<S, A, V>
) {
  const room = useOnlineRoom();
  const isHost = room.role === 'host';

  const [hostState, setHostState] = useState<S | null>(() =>
    isHost
      ? engine.init(engine.buildSeats(onlineRoom.getState().players.map((p) => ({ id: p.id, name: p.name }))))
      : null
  );
  const stateRef = useRef<S | null>(hostState);
  const [guestView, setGuestView] = useState<V | null>(null);

  const apply = useCallback(
    (action: A, seat: number) => {
      const cur = stateRef.current;
      if (!cur) return;
      const nxt = engine.reduce(cur, action, seat);
      if (nxt === cur) return;
      stateRef.current = nxt;
      setHostState(nxt);
    },
    [engine]
  );

  // ----- anfitrião: envia a visão de cada convidado e agenda o próximo passo (IA / sistema)
  useEffect(() => {
    if (!isHost || !hostState) return;
    hostState.seats.forEach((seat, i) => {
      if (seat.human && seat.playerId && seat.playerId !== 'host') {
        onlineRoom.sendToPlayer(seat.playerId, { k: 'view', view: engine.view(hostState, i) });
      }
    });
    const step = engine.next(hostState);
    if (!step) return;
    const id = setTimeout(() => apply(step.action, step.seat), step.delay);
    return () => clearTimeout(id);
  }, [hostState, isHost, engine, apply]);

  // ----- mensagens da rede
  useEffect(() => {
    return onlineRoom.onGameMessage((from, payload) => {
      if (!payload || typeof payload !== 'object') return;
      if (isHost) {
        const st = stateRef.current;
        if (!st) return;
        const seat = st.seats.findIndex((s) => s.human && s.playerId === from);
        if (seat < 0) return;
        if (payload.k === 'act' && payload.action && typeof payload.action.type === 'string') {
          if (String(payload.action.type).startsWith('sys_')) return; // convidado não pode mandar passos do sistema
          apply(payload.action as A, seat);
        } else if (payload.k === 'sync') {
          onlineRoom.sendToPlayer(from, { k: 'view', view: engine.view(st, seat) });
        }
      } else if (payload.k === 'view') {
        setGuestView(payload.view as V);
      }
    });
  }, [isHost, engine, apply]);

  // ----- convidado: pede a mesa ao entrar (repete até chegar)
  const gotView = guestView !== null;
  useEffect(() => {
    if (isHost || gotView) return;
    onlineRoom.sendToHost({ k: 'sync' });
    const id = setInterval(() => onlineRoom.sendToHost({ k: 'sync' }), 2500);
    return () => clearInterval(id);
  }, [isHost, gotView]);

  // ----- anfitrião: quem saiu da sala vira IA
  const rosterKey = room.players.map((p) => p.id).join('|');
  useEffect(() => {
    if (!isHost) return;
    const st = stateRef.current;
    if (!st) return;
    const present = new Set(room.players.map((p) => p.id));
    st.seats.forEach((seat, i) => {
      if (seat.human && seat.playerId && seat.playerId !== 'host' && !present.has(seat.playerId)) {
        apply({ type: 'leave' } as unknown as A, i);
      }
    });
  }, [rosterKey, isHost, apply]);

  const view: V | null = isHost && hostState ? engine.view(hostState, 0) : guestView;

  const dispatch = useCallback(
    (action: A) => {
      if (isHost) apply(action, 0);
      else onlineRoom.sendToHost({ k: 'act', action });
    },
    [isHost, apply]
  );

  return { view, dispatch, isHost, room };
}
