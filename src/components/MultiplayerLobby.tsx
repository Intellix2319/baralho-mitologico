import React, { useEffect, useRef, useState } from 'react';
import { playSound } from '../utils/audio';
import { GAME_RULES_DATABASE } from '../data/gameRulesData';
import {
  onlineRoom,
  useOnlineRoom,
  inviteLink,
  normalizeCode,
  getSavedName,
  saveName,
  ONLINE_READY_GAMES
} from '../online/room';
import {
  Users,
  PlusCircle,
  KeyRound,
  Copy,
  Check,
  Crown,
  Send,
  Link2,
  MessageCircle,
  LogOut,
  Loader2,
  PlayCircle,
  AlertTriangle
} from 'lucide-react';

interface MultiplayerLobbyProps {
  /** código vindo do link de convite (?sala=XXXXX) */
  initialJoinCode?: string | null;
  /** jogo escolhido no botão "Jogar Online" do salão */
  presetGame?: { gameId: string; playerCount: number } | null;
  /** chamado quando o anfitrião inicia uma partida de um jogo já sincronizado */
  onStartOnlineGame: (gameId: string, playerCount: number) => void;
}

const SOLO_GAMES = ['solitaire_klondike', 'freecell', 'spider'];
const ONLINE_GAMES = GAME_RULES_DATABASE.filter((g) => !SOLO_GAMES.includes(g.id));

export const MultiplayerLobby: React.FC<MultiplayerLobbyProps> = ({
  initialJoinCode,
  presetGame,
  onStartOnlineGame
}) => {
  const room = useOnlineRoom();

  const [tab, setTab] = useState<'create' | 'join'>(initialJoinCode ? 'join' : 'create');
  const [name, setName] = useState(getSavedName());
  const [roomName, setRoomName] = useState('Mesa dos amigos');
  const [gameId, setGameId] = useState(presetGame?.gameId || 'poker');
  const [maxPlayers, setMaxPlayers] = useState(
    presetGame ? Math.max(2, Math.min(6, presetGame.playerCount)) : 4
  );
  const [joinCode, setJoinCode] = useState(initialJoinCode ? normalizeCode(initialJoinCode) : '');
  const [chatText, setChatText] = useState('');
  const [copied, setCopied] = useState<'code' | 'link' | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // novo link de convite ou novo jogo escolhido no salão
  useEffect(() => {
    if (initialJoinCode) {
      setTab('join');
      setJoinCode(normalizeCode(initialJoinCode));
    }
  }, [initialJoinCode]);

  useEffect(() => {
    if (presetGame) {
      setTab('create');
      setGameId(presetGame.gameId);
      setMaxPlayers(Math.max(2, Math.min(6, presetGame.playerCount)));
    }
  }, [presetGame]);

  // o anfitrião iniciou um jogo que já está sincronizado
  const lastStart = useRef(room.startToken);
  useEffect(() => {
    if (room.startToken !== lastStart.current) {
      lastStart.current = room.startToken;
      if (room.startedGameId && ONLINE_READY_GAMES.includes(room.startedGameId)) {
        onStartOnlineGame(room.startedGameId, room.startedCount);
      }
    }
  }, [room.startToken, room.startedGameId, room.startedCount, onStartOnlineGame]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ block: 'end' });
  }, [room.chat.length]);

  const nameOk = name.trim().length > 0;

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameOk) return;
    playSound('chime');
    saveName(name.trim());
    const game = ONLINE_GAMES.find((g) => g.id === gameId) || ONLINE_GAMES[0];
    onlineRoom.createRoom({
      playerName: name,
      roomName,
      gameId: game.id,
      gameName: game.title,
      maxPlayers
    });
  };

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameOk || joinCode.length < 5) return;
    playSound('chime');
    saveName(name.trim());
    onlineRoom.joinRoom(joinCode, name);
  };

  const copy = async (what: 'code' | 'link') => {
    if (!room.info) return;
    playSound('click');
    const text = what === 'code' ? room.info.code : inviteLink(room.info.code);
    try {
      await navigator.clipboard.writeText(text);
    } catch {}
    setCopied(what);
    setTimeout(() => setCopied(null), 1800);
  };

  const shareWhatsApp = () => {
    if (!room.info) return;
    playSound('click');
    const text = `Bora jogar ${room.info.gameName} comigo? Entra na sala pelo link: ${inviteLink(room.info.code)} (código ${room.info.code})`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  const sendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatText.trim()) return;
    onlineRoom.sendChat(chatText);
    setChatText('');
  };

  const isHost = room.role === 'host';
  const startReady = room.info ? ONLINE_READY_GAMES.includes(room.info.gameId) : false;

  // ---------------------------------------------------------------- conectando
  if (room.status === 'connecting') {
    return (
      <div className="flex-1 min-h-[60vh] flex flex-col items-center justify-center gap-3 p-6 text-center select-none">
        <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
        <p className="text-sm font-bold text-slate-200">
          {room.role === 'host' ? 'Criando a sala...' : 'Entrando na sala...'}
        </p>
        <button
          onClick={() => onlineRoom.leave()}
          className="text-xs text-slate-400 hover:text-white underline cursor-pointer"
        >
          Cancelar
        </button>
      </div>
    );
  }

  // ---------------------------------------------------------------- dentro da sala
  if (room.status === 'lobby' && room.info) {
    return (
      <div className="max-w-5xl mx-auto w-full p-4 short:p-2 select-none">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 short:gap-2">
          {/* Sala + jogadores */}
          <div className="rounded-2xl border border-emerald-500/40 bg-gradient-to-b from-emerald-950/40 to-slate-950 p-4 short:p-3 space-y-3 short:space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="text-[10px] font-mono font-bold uppercase text-emerald-400 tracking-wider">
                  Código da sala
                </div>
                <div className="text-3xl short:text-2xl font-black font-mono tracking-[0.2em] text-amber-300">
                  {room.info.code}
                </div>
                <div className="text-xs text-slate-300 truncate">
                  {room.info.name} • {room.info.gameName}
                </div>
              </div>
              <button
                onClick={() => {
                  playSound('click');
                  onlineRoom.leave();
                }}
                className="shrink-0 px-3 py-2 short:py-1.5 rounded-xl bg-slate-900 hover:bg-red-950 border border-slate-700 hover:border-red-500/60 text-slate-300 hover:text-red-300 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sair</span>
              </button>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => copy('code')}
                className="px-3 py-2 short:py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-amber-500/40 text-amber-300 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                {copied === 'code' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied === 'code' ? 'Copiado!' : 'Copiar código'}</span>
              </button>
              <button
                onClick={() => copy('link')}
                className="px-3 py-2 short:py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-amber-500/40 text-amber-300 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                {copied === 'link' ? <Check className="w-3.5 h-3.5" /> : <Link2 className="w-3.5 h-3.5" />}
                <span>{copied === 'link' ? 'Copiado!' : 'Copiar link'}</span>
              </button>
              <button
                onClick={shareWhatsApp}
                className="px-3 py-2 short:py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black flex items-center gap-1.5 cursor-pointer"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                <span>Convidar no WhatsApp</span>
              </button>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] font-bold text-slate-300 flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-emerald-400" />
                  Jogadores na sala
                </span>
                <span className="text-[11px] font-mono font-bold text-emerald-300">
                  {room.players.length}/{room.info.maxPlayers}
                </span>
              </div>
              <ul className="space-y-1">
                {room.players.map((p) => (
                  <li
                    key={p.id}
                    className="flex items-center gap-2 bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-1.5 text-xs"
                  >
                    <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
                    <span className="font-bold text-slate-100 truncate">{p.name}</span>
                    {p.id === room.myId && <span className="text-[10px] text-slate-400">(você)</span>}
                    {p.isHost && <Crown className="w-3.5 h-3.5 text-amber-400 ml-auto shrink-0" />}
                  </li>
                ))}
              </ul>
            </div>

            {isHost ? (
              <div className="space-y-2">
                <button
                  disabled={!startReady}
                  onClick={() => {
                    if (!startReady) return;
                    playSound('chime');
                    onlineRoom.startGame(room.info!.gameId, room.players.length);
                  }}
                  className={`w-full py-2.5 short:py-2 rounded-xl text-xs font-black flex items-center justify-center gap-2 ${
                    startReady
                      ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 cursor-pointer active:scale-95'
                      : 'bg-slate-900 text-slate-500 border border-slate-800 cursor-not-allowed'
                  }`}
                >
                  <PlayCircle className="w-4 h-4" />
                  <span>Iniciar partida</span>
                </button>
                {!startReady && (
                  <div className="flex gap-2 rounded-xl border border-amber-500/40 bg-amber-500/10 p-2.5 text-[11px] text-amber-200 leading-snug">
                    <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400 mt-0.5" />
                    <span>
                      A sala e a conexão já são reais. Este jogo ainda não está sincronizado entre os
                      celulares (vem nas próximas etapas). Por enquanto, use o chat para testar se
                      todo mundo está conectado.
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-[11px] text-slate-400 text-center">
                Aguardando o anfitrião iniciar a partida...
              </p>
            )}
          </div>

          {/* Chat */}
          <div className="rounded-2xl border border-slate-800 bg-slate-950/90 p-3 short:p-2 flex flex-col min-h-[240px] short:min-h-[200px] max-h-[60vh] short:max-h-[300px]">
            <div className="text-[11px] font-bold text-slate-300 mb-2 flex items-center gap-1.5">
              <MessageCircle className="w-3.5 h-3.5 text-amber-400" />
              Chat da sala
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto space-y-1.5 pr-1">
              {room.chat.map((m) =>
                m.system ? (
                  <div key={m.id} className="text-[10px] text-center text-slate-500 font-mono">
                    {m.text}
                  </div>
                ) : (
                  <div key={m.id} className="text-xs">
                    <span className="font-black text-amber-300">{m.from}: </span>
                    <span className="text-slate-200 break-words">{m.text}</span>
                  </div>
                )
              )}
              <div ref={chatEndRef} />
            </div>
            <form onSubmit={sendChat} className="mt-2 flex gap-2">
              <input
                value={chatText}
                onChange={(e) => setChatText(e.target.value)}
                maxLength={300}
                placeholder="Escreva uma mensagem..."
                className="flex-1 min-w-0 bg-slate-900 border border-slate-700 focus:border-amber-500 rounded-xl px-3 py-2 short:py-1.5 text-xs text-white outline-none select-text"
              />
              <button
                type="submit"
                className="px-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 cursor-pointer active:scale-95"
                title="Enviar"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------- criar / entrar
  const fieldClass =
    'w-full bg-slate-900 border border-slate-700 focus:border-amber-500 rounded-xl px-3 py-2.5 short:py-1.5 text-sm text-white outline-none select-text [&>option]:bg-slate-900';

  return (
    <div className="max-w-xl mx-auto w-full p-4 short:p-2 select-none">
      {(room.status === 'error' || room.status === 'closed') && room.error && (
        <div className="mb-3 flex gap-2 rounded-xl border border-red-500/50 bg-red-950/40 p-3 text-xs text-red-200">
          <AlertTriangle className="w-4 h-4 shrink-0 text-red-400 mt-0.5" />
          <span>{room.error}</span>
        </div>
      )}

      <div className="rounded-2xl border border-amber-500/30 bg-gradient-to-b from-slate-900 to-slate-950 p-4 short:p-3 space-y-3 short:space-y-2">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-emerald-400" />
          <h2 className="text-base font-black text-amber-100">Jogar online com amigos</h2>
        </div>

        <div>
          <label className="block text-[11px] font-bold text-slate-300 mb-1">Seu nome</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={20}
            placeholder="Como os amigos vão te ver"
            className={fieldClass}
          />
        </div>

        <div className="grid grid-cols-2 gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
          <button
            onClick={() => setTab('create')}
            className={`py-2 short:py-1.5 rounded-lg text-xs font-black flex items-center justify-center gap-1.5 cursor-pointer ${
              tab === 'create' ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-white'
            }`}
          >
            <PlusCircle className="w-3.5 h-3.5" />
            Criar sala
          </button>
          <button
            onClick={() => setTab('join')}
            className={`py-2 short:py-1.5 rounded-lg text-xs font-black flex items-center justify-center gap-1.5 cursor-pointer ${
              tab === 'join' ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-white'
            }`}
          >
            <KeyRound className="w-3.5 h-3.5" />
            Entrar com código
          </button>
        </div>

        {tab === 'create' ? (
          <form onSubmit={handleCreate} className="space-y-3 short:space-y-2">
            <div>
              <label className="block text-[11px] font-bold text-slate-300 mb-1">Nome da sala</label>
              <input
                value={roomName}
                onChange={(e) => setRoomName(e.target.value)}
                maxLength={40}
                className={fieldClass}
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1">Jogo</label>
                <select value={gameId} onChange={(e) => setGameId(e.target.value)} className={fieldClass}>
                  {ONLINE_GAMES.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.title}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1">Máx. de jogadores</label>
                <select
                  value={maxPlayers}
                  onChange={(e) => setMaxPlayers(Number(e.target.value))}
                  className={fieldClass}
                >
                  {[2, 3, 4, 5, 6].map((n) => (
                    <option key={n} value={n}>
                      {n} jogadores
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <button
              type="submit"
              disabled={!nameOk}
              className="w-full py-3 short:py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 disabled:from-slate-800 disabled:to-slate-800 disabled:text-slate-500 text-white text-sm font-black cursor-pointer disabled:cursor-not-allowed active:scale-95"
            >
              Criar sala
            </button>
          </form>
        ) : (
          <form onSubmit={handleJoin} className="space-y-3 short:space-y-2">
            <div>
              <label className="block text-[11px] font-bold text-slate-300 mb-1">Código da sala</label>
              <input
                value={joinCode}
                onChange={(e) => setJoinCode(normalizeCode(e.target.value))}
                placeholder="Ex.: K7P2Q"
                autoCapitalize="characters"
                className={`${fieldClass} font-mono tracking-[0.3em] text-center text-lg uppercase`}
              />
            </div>
            <button
              type="submit"
              disabled={!nameOk || joinCode.length < 5}
              className="w-full py-3 short:py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 disabled:from-slate-800 disabled:to-slate-800 disabled:text-slate-500 text-slate-950 text-sm font-black cursor-pointer disabled:cursor-not-allowed active:scale-95"
            >
              Entrar na sala
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
