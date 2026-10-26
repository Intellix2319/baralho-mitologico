/**
 * Salas online de verdade (PeerJS / WebRTC).
 *
 * - O ANFITRIÃO cria a sala e registra um endereço no servidor gratuito do PeerJS
 *   (baralho-sombrio-CODIGO). Os outros jogadores conectam direto nele.
 * - Tudo passa pelo anfitrião: ele guarda a lista de jogadores e repassa o chat e,
 *   nas próximas etapas, o estado da mesa de cada jogo.
 * - A biblioteca PeerJS é carregada pelo index.html (window.Peer).
 */
import { useSyncExternalStore } from 'react';

declare global {
  interface Window {
    Peer?: any;
  }
}

const PEER_PREFIX = 'baralho-sombrio-';
const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; // sem I, L, O, 0, 1 (evita confusão)
const CODE_LENGTH = 5;
const TICK_MS = 4000;
const TIMEOUT_MS = 40000; // celular que sai do navegador um pouco (ex.: abre o WhatsApp) não cai na hora
const JOIN_TIMEOUT_MS = 15000;
const MAX_CHAT = 100;

/** Jogos já sincronizados entre os celulares. Cada etapa nova acrescenta o id do jogo aqui. */
export const ONLINE_READY_GAMES: string[] = ['truco_paulista', 'truco_mineiro', 'poker', 'blackjack'];

export interface RoomPlayer {
  id: string;
  name: string;
  isHost: boolean;
}

export interface ChatMsg {
  id: string;
  from: string;
  text: string;
  ts: number;
  system?: boolean;
}

export interface RoomInfo {
  code: string;
  name: string;
  gameId: string;
  gameName: string;
  maxPlayers: number;
}

export type RoomStatus = 'idle' | 'connecting' | 'lobby' | 'error' | 'closed';

export interface RoomState {
  status: RoomStatus;
  role: 'host' | 'guest' | null;
  info: RoomInfo | null;
  players: RoomPlayer[];
  myId: string | null;
  chat: ChatMsg[];
  error: string | null;
  startToken: number; // aumenta a cada "Iniciar partida"
  startedGameId: string | null;
  startedCount: number;
  gameActive: boolean; // há uma partida em andamento na sala
}

const INITIAL_STATE: RoomState = {
  status: 'idle',
  role: null,
  info: null,
  players: [],
  myId: null,
  chat: [],
  error: null,
  startToken: 0,
  startedGameId: null,
  startedCount: 0,
  gameActive: false
};

export interface CreateRoomOptions {
  playerName: string;
  roomName: string;
  gameId: string;
  gameName: string;
  maxPlayers: number;
}

type GameHandler = (fromId: string, payload: any) => void;

const cleanName = (raw: unknown): string => {
  const s = String(raw ?? '').replace(/\s+/g, ' ').trim().slice(0, 20);
  return s || 'Jogador';
};

const cleanText = (raw: unknown): string => String(raw ?? '').trim().slice(0, 300);

export const normalizeCode = (raw: string): string =>
  raw.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, CODE_LENGTH);

export const inviteLink = (code: string): string => {
  if (typeof window === 'undefined') return `?sala=${code}`;
  return `${window.location.origin}/?sala=${code}`;
};

export const getSavedName = (): string => {
  try {
    return localStorage.getItem('baralho_player_name') || '';
  } catch {
    return '';
  }
};

export const saveName = (name: string) => {
  try {
    localStorage.setItem('baralho_player_name', name);
  } catch {}
};

const generateCode = (): string => {
  let out = '';
  for (let i = 0; i < CODE_LENGTH; i++) {
    out += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  }
  return out;
};

export class OnlineRoom {
  private state: RoomState = INITIAL_STATE;
  private listeners = new Set<() => void>();
  private gameHandlers = new Set<GameHandler>();

  private peer: any = null;
  private conns = new Map<string, any>(); // anfitrião: id do jogador -> conexão
  private hostConn: any = null; // convidado: conexão com o anfitrião
  private lastSeen = new Map<string, number>();
  private lastHostSeen = 0;
  private timer: ReturnType<typeof setInterval> | null = null;
  private joinTimer: ReturnType<typeof setTimeout> | null = null;
  private seq = 0;
  private token = 0; // identifica a tentativa atual (ignora eventos de tentativas antigas)

  // ---------- assinatura (React) ----------
  subscribe = (fn: () => void) => {
    this.listeners.add(fn);
    return () => {
      this.listeners.delete(fn);
    };
  };

  getState = () => this.state;

  private set(partial: Partial<RoomState>) {
    this.state = { ...this.state, ...partial };
    this.listeners.forEach((fn) => fn());
  }

  /** Recebe as mensagens de jogo (etapas 2 e 3). Retorna função para parar de ouvir. */
  onGameMessage(handler: GameHandler) {
    this.gameHandlers.add(handler);
    return () => {
      this.gameHandlers.delete(handler);
    };
  }

  // ---------- utilidades ----------
  private newId() {
    return `${Date.now()}-${this.seq++}`;
  }

  private pushChat(msg: ChatMsg) {
    const chat = [...this.state.chat, msg].slice(-MAX_CHAT);
    this.set({ chat });
  }

  private systemMsg(text: string): ChatMsg {
    return { id: this.newId(), from: '', text, ts: Date.now(), system: true };
  }

  private safeSend(conn: any, msg: any) {
    try {
      if (conn && conn.open !== false) conn.send(msg);
    } catch {}
  }

  private broadcast(msg: any) {
    this.conns.forEach((conn) => this.safeSend(conn, msg));
  }

  private broadcastRoster() {
    this.broadcast({ t: 'roster', players: this.state.players });
  }

  private startTimer() {
    this.stopTimer();
    this.timer = setInterval(() => this.tick(), TICK_MS);
  }

  private stopTimer() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  private tick() {
    const now = Date.now();
    if (this.state.role === 'host') {
      this.broadcast({ t: 'ping' });
      this.conns.forEach((_conn, id) => {
        const seen = this.lastSeen.get(id) || now;
        if (now - seen > TIMEOUT_MS) this.removePlayer(id);
      });
    } else if (this.state.role === 'guest' && this.state.status === 'lobby') {
      this.safeSend(this.hostConn, { t: 'ping' });
      if (now - this.lastHostSeen > TIMEOUT_MS) {
        this.closeWith('A conexão com o anfitrião caiu.');
      }
    }
  }

  private cleanup() {
    this.token++;
    this.stopTimer();
    if (this.joinTimer) clearTimeout(this.joinTimer);
    this.joinTimer = null;
    this.conns.forEach((c) => {
      try {
        c.close();
      } catch {}
    });
    this.conns.clear();
    this.lastSeen.clear();
    try {
      this.hostConn?.close();
    } catch {}
    this.hostConn = null;
    try {
      this.peer?.destroy();
    } catch {}
    this.peer = null;
  }

  private fail(message: string) {
    this.cleanup();
    this.set({ ...INITIAL_STATE, status: 'error', error: message });
  }

  private closeWith(message: string) {
    this.cleanup();
    this.set({ ...INITIAL_STATE, status: 'closed', error: message });
  }

  private loadPeer(): any | null {
    if (typeof window === 'undefined' || !window.Peer) {
      this.fail('Não foi possível carregar o módulo online. Verifique sua internet e recarregue a página.');
      return null;
    }
    return window.Peer;
  }

  private friendlyPeerError(err: any): string {
    switch (err?.type) {
      case 'peer-unavailable':
        return 'Sala não encontrada. Confira o código e peça para o anfitrião manter a tela aberta.';
      case 'network':
      case 'server-error':
      case 'socket-error':
      case 'socket-closed':
        return 'Sem conexão com o servidor de salas. Verifique sua internet e tente de novo.';
      case 'browser-incompatible':
        return 'Este navegador não suporta jogo online.';
      default:
        return 'Não foi possível conectar. Tente de novo.';
    }
  }

  // ---------- anfitrião ----------
  createRoom(opts: CreateRoomOptions) {
    this.cleanup();
    const Peer = this.loadPeer();
    if (!Peer) return;

    const myToken = this.token;
    this.set({ ...INITIAL_STATE, status: 'connecting', role: 'host' });

    const attempt = (n: number) => {
      const code = generateCode();
      let peer: any;
      try {
        peer = new Peer(PEER_PREFIX + code);
      } catch {
        this.fail('Não foi possível criar a sala.');
        return;
      }
      this.peer = peer;

      peer.on('open', () => {
        if (myToken !== this.token) return;
        const hostName = cleanName(opts.playerName);
        const info: RoomInfo = {
          code,
          name: opts.roomName.trim().slice(0, 40) || 'Sala de amigos',
          gameId: opts.gameId,
          gameName: opts.gameName,
          maxPlayers: Math.max(2, Math.min(8, opts.maxPlayers))
        };
        this.set({
          status: 'lobby',
          info,
          players: [{ id: 'host', name: hostName, isHost: true }],
          myId: 'host',
          chat: [this.systemMsg('Sala criada. Compartilhe o código ou o link para os amigos entrarem.')]
        });
        this.startTimer();
      });

      peer.on('connection', (conn: any) => {
        if (myToken !== this.token) return;
        this.handleGuestConn(conn);
      });

      peer.on('disconnected', () => {
        // perdeu o contato com o servidor de salas (ex.: celular trocou de rede): reconecta
        if (myToken !== this.token) return;
        try {
          peer.reconnect();
        } catch {}
      });

      peer.on('error', (err: any) => {
        if (myToken !== this.token) return;
        if (err?.type === 'unavailable-id' && n < 5) {
          try {
            peer.destroy();
          } catch {}
          attempt(n + 1);
          return;
        }
        if (this.state.status === 'lobby') return; // erro isolado de um convidado: ignora
        this.fail(this.friendlyPeerError(err));
      });
    };

    attempt(0);
  }

  private handleGuestConn(conn: any) {
    conn.on('data', (data: any) => this.onHostData(conn, data));
    conn.on('close', () => this.removePlayer(conn.peer));
    conn.on('error', () => this.removePlayer(conn.peer));
  }

  private onHostData(conn: any, msg: any) {
    if (!msg || typeof msg !== 'object') return;
    const id: string = conn.peer;
    this.lastSeen.set(id, Date.now());

    if (msg.t === 'hello') {
      if (this.conns.has(id)) return;
      const info = this.state.info;
      if (!info) return;
      if (this.state.players.length >= info.maxPlayers) {
        this.safeSend(conn, { t: 'reject', reason: 'A sala está cheia.' });
        setTimeout(() => {
          try {
            conn.close();
          } catch {}
        }, 400);
        return;
      }
      let name = cleanName(msg.name);
      const taken = new Set(this.state.players.map((p) => p.name));
      if (taken.has(name)) {
        let n = 2;
        while (taken.has(`${name} ${n}`)) n++;
        name = `${name} ${n}`;
      }
      this.conns.set(id, conn);
      const players = [...this.state.players, { id, name, isHost: false }];
      this.set({ players });
      this.pushChat(this.systemMsg(`${name} entrou na sala.`));
      this.safeSend(conn, {
        t: 'welcome',
        info,
        players,
        youId: id,
        chat: this.state.chat
      });
      this.broadcastRoster();
      // avisa os outros (o recém-chegado já recebeu isso dentro do "welcome")
      const joinedMsg = this.state.chat[this.state.chat.length - 1];
      this.conns.forEach((c, otherId) => {
        if (otherId !== id) this.safeSend(c, { t: 'chat', msg: joinedMsg });
      });
      return;
    }

    if (!this.conns.has(id)) return; // ainda não se apresentou

    if (msg.t === 'chat') {
      const player = this.state.players.find((p) => p.id === id);
      const text = cleanText(msg.text);
      if (!player || !text) return;
      const chatMsg: ChatMsg = { id: this.newId(), from: player.name, text, ts: Date.now() };
      this.pushChat(chatMsg);
      this.broadcast({ t: 'chat', msg: chatMsg });
      return;
    }

    if (msg.t === 'game') {
      this.gameHandlers.forEach((h) => h(id, msg.payload));
    }
    // 'ping' só atualiza lastSeen
  }

  private removePlayer(id: string) {
    if (!this.conns.has(id)) return;
    const player = this.state.players.find((p) => p.id === id);
    try {
      this.conns.get(id)?.close();
    } catch {}
    this.conns.delete(id);
    this.lastSeen.delete(id);
    this.set({ players: this.state.players.filter((p) => p.id !== id) });
    if (player) {
      const sys = this.systemMsg(`${player.name} saiu da sala.`);
      this.pushChat(sys);
      this.broadcast({ t: 'chat', msg: sys });
    }
    this.broadcastRoster();
  }

  startGame(gameId: string, playerCount: number) {
    if (this.state.role !== 'host' || this.state.status !== 'lobby') return;
    const token = this.state.startToken + 1;
    this.set({ startToken: token, startedGameId: gameId, startedCount: playerCount, gameActive: true });
    this.broadcast({ t: 'start', gameId, count: playerCount, token });
  }

  /** Anfitrião encerra a partida: todos voltam para a sala. */
  endGame() {
    if (this.state.role !== 'host' || this.state.status !== 'lobby') return;
    this.set({ gameActive: false });
    this.broadcast({ t: 'end' });
  }

  /** Anfitrião -> um jogador específico (cada um recebe só o que pode ver). */
  sendToPlayer(playerId: string, payload: any) {
    if (this.state.role !== 'host') return;
    this.safeSend(this.conns.get(playerId), { t: 'game', payload });
  }

  // ---------- convidado ----------
  joinRoom(rawCode: string, playerName: string) {
    this.cleanup();
    const code = normalizeCode(rawCode);
    if (code.length !== CODE_LENGTH) {
      this.set({ ...INITIAL_STATE, status: 'error', error: `O código tem ${CODE_LENGTH} letras/números.` });
      return;
    }
    const Peer = this.loadPeer();
    if (!Peer) return;

    const myToken = this.token;
    this.set({ ...INITIAL_STATE, status: 'connecting', role: 'guest' });

    let peer: any;
    try {
      peer = new Peer();
    } catch {
      this.fail('Não foi possível entrar na sala.');
      return;
    }
    this.peer = peer;

    this.joinTimer = setTimeout(() => {
      if (myToken !== this.token || this.state.status !== 'connecting') return;
      this.fail('Não foi possível entrar. Confira o código, a sua internet e se o anfitrião está com a sala aberta.');
    }, JOIN_TIMEOUT_MS);

    peer.on('open', () => {
      if (myToken !== this.token) return;
      const conn = peer.connect(PEER_PREFIX + code, { reliable: true });
      this.hostConn = conn;
      conn.on('open', () => {
        if (myToken !== this.token) return;
        this.lastHostSeen = Date.now();
        this.safeSend(conn, { t: 'hello', name: cleanName(playerName) });
      });
      conn.on('data', (data: any) => {
        if (myToken !== this.token) return;
        this.onGuestData(data);
      });
      conn.on('close', () => {
        if (myToken !== this.token) return;
        if (this.state.status === 'lobby') this.closeWith('O anfitrião encerrou a sala ou a conexão caiu.');
      });
      conn.on('error', () => {
        if (myToken !== this.token) return;
        if (this.state.status === 'lobby') this.closeWith('A conexão com o anfitrião caiu.');
      });
    });

    peer.on('disconnected', () => {
      if (myToken !== this.token) return;
      try {
        peer.reconnect();
      } catch {}
    });

    peer.on('error', (err: any) => {
      if (myToken !== this.token) return;
      this.fail(this.friendlyPeerError(err));
    });
  }

  private onGuestData(msg: any) {
    if (!msg || typeof msg !== 'object') return;
    this.lastHostSeen = Date.now();

    switch (msg.t) {
      case 'welcome':
        if (this.joinTimer) clearTimeout(this.joinTimer);
        this.joinTimer = null;
        this.set({
          status: 'lobby',
          info: msg.info,
          players: msg.players || [],
          myId: msg.youId,
          chat: Array.isArray(msg.chat) ? msg.chat.slice(-MAX_CHAT) : []
        });
        this.startTimer();
        break;
      case 'reject':
        this.fail(String(msg.reason || 'Não foi possível entrar na sala.'));
        break;
      case 'roster':
        this.set({ players: Array.isArray(msg.players) ? msg.players : [] });
        break;
      case 'chat':
        if (msg.msg) this.pushChat(msg.msg);
        break;
      case 'start':
        this.set({
          startToken: msg.token || this.state.startToken + 1,
          startedGameId: msg.gameId,
          startedCount: msg.count,
          gameActive: true
        });
        break;
      case 'end':
        this.set({ gameActive: false });
        break;
      case 'game':
        this.gameHandlers.forEach((h) => h('host', msg.payload));
        break;
      case 'bye':
        this.closeWith('O anfitrião encerrou a sala.');
        break;
      default:
        break; // ping
    }
  }

  // ---------- comum ----------
  sendChat(raw: string) {
    const text = cleanText(raw);
    if (!text || this.state.status !== 'lobby') return;
    if (this.state.role === 'host') {
      const me = this.state.players.find((p) => p.id === 'host');
      const msg: ChatMsg = { id: this.newId(), from: me?.name || 'Anfitrião', text, ts: Date.now() };
      this.pushChat(msg);
      this.broadcast({ t: 'chat', msg });
    } else {
      this.safeSend(this.hostConn, { t: 'chat', text });
    }
  }

  /** Convidado -> anfitrião (jogadas). Usado nas etapas 2 e 3. */
  sendToHost(payload: any) {
    if (this.state.role !== 'guest') return;
    this.safeSend(this.hostConn, { t: 'game', payload });
  }

  /** Anfitrião -> todos (estado da mesa). Usado nas etapas 2 e 3. */
  broadcastGame(payload: any) {
    if (this.state.role !== 'host') return;
    this.broadcast({ t: 'game', payload });
  }

  leave() {
    if (this.state.role === 'host') this.broadcast({ t: 'bye' });
    // dá um instante para o aviso sair antes de fechar as conexões
    const hadConns = this.conns.size > 0;
    if (hadConns) {
      const peer = this.peer;
      const conns = new Map(this.conns);
      this.token++;
      this.stopTimer();
      this.peer = null;
      this.hostConn = null;
      this.conns = new Map();
      this.lastSeen.clear();
      setTimeout(() => {
        conns.forEach((c) => {
          try {
            c.close();
          } catch {}
        });
        try {
          peer?.destroy();
        } catch {}
      }, 400);
    } else {
      this.cleanup();
    }
    this.set({ ...INITIAL_STATE });
  }
}

export const onlineRoom = new OnlineRoom();

export function useOnlineRoom(): RoomState {
  return useSyncExternalStore(onlineRoom.subscribe, onlineRoom.getState, onlineRoom.getState);
}
