import React, { useState, useEffect } from 'react';
import { playSound } from '../utils/audio';
import {
  Users,
  Copy,
  Check,
  Share2,
  X,
  Play,
  Bot,
  User,
  Shield,
  Sparkles,
  Wifi,
  MessageCircle,
  PlusCircle,
  Dices
} from 'lucide-react';

export interface OnlinePlayer {
  id: string;
  name: string;
  avatar: string;
  status: 'disponivel' | 'jogando' | 'na_sala';
  gameName?: string;
  ping: number;
}

const INITIAL_COMMUNITY_PLAYERS: OnlinePlayer[] = [
  { id: 'usr_1', name: 'Mineiro_Raiz', avatar: '🤠', status: 'disponivel', ping: 18 },
  { id: 'usr_2', name: 'Zeus_BR', avatar: '⚡', status: 'disponivel', ping: 22 },
  { id: 'usr_3', name: 'Atena_Estrategista', avatar: '🦉', status: 'disponivel', ping: 14 },
  { id: 'usr_4', name: 'Carioca_Do_Truco', avatar: '🌊', status: 'disponivel', ping: 25 },
  { id: 'usr_5', name: 'Gaucho_Platino', avatar: '🧉', status: 'jogando', gameName: 'Truco Paulista', ping: 31 },
  { id: 'usr_6', name: 'Poseidon_Poker', avatar: '🔱', status: 'disponivel', ping: 19 },
  { id: 'usr_7', name: 'Dama_De_Copas', avatar: '👑', status: 'disponivel', ping: 16 }
];

interface OnlineRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  gameId: string;
  gameTitle: string;
  playerCount: number;
  onStartGame: (gameId: string, mode: 'solo' | 'online', roomCode: string) => void;
}

export const OnlineRoomModal: React.FC<OnlineRoomModalProps> = ({
  isOpen,
  onClose,
  gameId,
  gameTitle,
  playerCount,
  onStartGame
}) => {
  const [roomCode, setRoomCode] = useState(() => {
    const prefix = gameId.toUpperCase().slice(0, 5);
    return `${prefix}-${Math.floor(100 + Math.random() * 900)}`;
  });
  const [copied, setCopied] = useState(false);
  const [onlinePlayers, setOnlinePlayers] = useState<OnlinePlayer[]>(INITIAL_COMMUNITY_PLAYERS);
  const [invitedPlayerIds, setInvitedPlayerIds] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<'create_invite' | 'online_players'>('create_invite');

  // BroadcastChannel for real-time presence across local tabs & windows
  useEffect(() => {
    let channel: BroadcastChannel | null = null;
    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        channel = new BroadcastChannel('olympus_card_presence');
        channel.onmessage = (event) => {
          if (event.data?.type === 'HEARTBEAT' && event.data?.player) {
            setOnlinePlayers((prev) => {
              if (prev.some((p) => p.id === event.data.player.id)) return prev;
              return [event.data.player, ...prev];
            });
          }
        };
        // Announce presence
        channel.postMessage({
          type: 'HEARTBEAT',
          player: {
            id: 'you_host',
            name: 'Você (Anfitrião)',
            avatar: '👤',
            status: 'disponivel',
            ping: 12
          }
        });
      }
    } catch (e) {
      console.warn('BroadcastChannel presence fallback:', e);
    }

    return () => {
      try {
        channel?.close();
      } catch {}
    };
  }, []);

  if (!isOpen) return null;

  const handleCopyCode = () => {
    playSound('click');
    navigator.clipboard.writeText(roomCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const inviteMessage = `Bora jogar ${gameTitle} comigo? Entra no app e usa o código da mesa: ${roomCode} para jogarmos juntos agora!`;

  const handleShareWhatsApp = () => {
    playSound('click');
    navigator.clipboard.writeText(inviteMessage);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleInvitePlayer = (player: OnlinePlayer) => {
    playSound('chime');
    setInvitedPlayerIds((prev) => (prev.includes(player.id) ? prev : [...prev, player.id]));
  };

  const totalSeatsFilled = 1 + invitedPlayerIds.length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/80 backdrop-blur-sm animate-in fade-in select-none">
      <div className="relative w-full max-w-2xl bg-gradient-to-b from-slate-900 via-[#0b0c1b] to-black border-2 border-emerald-500/50 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90dvh]">
        {/* Top Header */}
        <div className="shrink-0 p-4 border-b border-emerald-500/30 flex items-center justify-between bg-emerald-950/30">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center shadow-lg">
              <Users className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-white tracking-wide">
                  Jogar {gameTitle} Online
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-mono font-black border border-emerald-500/40 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  MESA ONLINE
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Jogue com amigos convidados ou desafie jogadores online na plataforma
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              playSound('click');
              onClose();
            }}
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center cursor-pointer transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tabs for Navigation */}
        <div className="shrink-0 px-4 pt-3 flex border-b border-slate-800 gap-2">
          <button
            onClick={() => setActiveTab('create_invite')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'create_invite'
                ? 'bg-emerald-500 text-slate-950 shadow-md font-black'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>Código da Sala & Convidar</span>
          </button>

          <button
            onClick={() => setActiveTab('online_players')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'online_players'
                ? 'bg-purple-600 text-white shadow-md font-black'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Wifi className="w-3.5 h-3.5" />
            <span>Jogadores Online no Site ({onlinePlayers.length})</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4">
          {activeTab === 'create_invite' ? (
            <>
              {/* Room Code Card */}
              <div className="bg-slate-950/90 border border-emerald-500/40 rounded-2xl p-4 shadow-xl text-center space-y-3">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Código da Sua Mesa Online
                </span>
                <div className="flex items-center justify-center gap-2">
                  <div className="font-mono text-2xl sm:text-3xl font-black text-amber-300 tracking-widest bg-black/80 px-6 py-2 rounded-2xl border-2 border-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.2)]">
                    {roomCode}
                  </div>
                  <button
                    onClick={handleCopyCode}
                    className="min-h-[44px] min-w-[44px] p-2.5 bg-slate-900 hover:bg-slate-800 border border-amber-400/50 rounded-xl text-amber-300 hover:text-amber-200 transition-all cursor-pointer shadow flex items-center justify-center active:scale-95"
                    title="Copiar Código"
                  >
                    {copied ? <Check className="w-5 h-5 text-emerald-400" /> : <Copy className="w-5 h-5" />}
                  </button>
                </div>
                {copied && (
                  <span className="text-xs font-bold text-emerald-400 animate-in fade-in block">
                    ✓ Código copiado para a área de transferência!
                  </span>
                )}

                <div className="flex flex-col sm:flex-row items-center justify-center gap-2 pt-1">
                  <button
                    onClick={handleShareWhatsApp}
                    className="w-full sm:w-auto px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/30 active:scale-95 transition-all cursor-pointer"
                  >
                    <MessageCircle className="w-4 h-4 fill-current" />
                    <span>Convidar no WhatsApp</span>
                  </button>
                  <button
                    onClick={handleCopyCode}
                    className="w-full sm:w-auto px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center justify-center gap-2 border border-slate-700 transition-all cursor-pointer"
                  >
                    <Share2 className="w-4 h-4" />
                    <span>Copiar Link de Convite</span>
                  </button>
                </div>
              </div>

              {/* Seats Status */}
              <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 shadow">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold text-slate-300">
                    Ocupação da Mesa ({totalSeatsFilled}/{playerCount})
                  </span>
                  <span className="text-[11px] font-mono text-emerald-400 font-bold">
                    Vagas vazias completadas por IA
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <div className="bg-emerald-950/50 border border-emerald-500/50 rounded-xl p-2.5 flex items-center gap-2">
                    <span className="text-xl">👤</span>
                    <div className="min-w-0">
                      <div className="text-xs font-black text-white truncate">Você</div>
                      <div className="text-[10px] text-emerald-400 font-bold">Anfitrião</div>
                    </div>
                  </div>

                  {invitedPlayerIds.map((id) => {
                    const p = onlinePlayers.find((pl) => pl.id === id);
                    return (
                      <div key={id} className="bg-purple-950/50 border border-purple-500/50 rounded-xl p-2.5 flex items-center gap-2">
                        <span className="text-xl">{p?.avatar || '👤'}</span>
                        <div className="min-w-0">
                          <div className="text-xs font-black text-white truncate">{p?.name || 'Amigo'}</div>
                          <div className="text-[10px] text-purple-300 font-bold">Conectado</div>
                        </div>
                      </div>
                    );
                  })}

                  {[...Array(Math.max(0, playerCount - totalSeatsFilled))].map((_, i) => (
                    <div key={i} className="bg-slate-900/50 border border-dashed border-slate-800 rounded-xl p-2.5 flex items-center gap-2 opacity-60">
                      <Bot className="w-5 h-5 text-slate-500" />
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-slate-400">Vaga Livre</div>
                        <div className="text-[10px] text-slate-500 font-mono">IA inteligente</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            /* Online Players Roster */
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400">
                  Registro de Jogadores Conectados no Site:
                </span>
                <span className="text-[11px] font-mono text-emerald-400 font-bold flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  Tempo Real
                </span>
              </div>

              <div className="space-y-2">
                {onlinePlayers.map((player) => {
                  const isInvited = invitedPlayerIds.includes(player.id);
                  return (
                    <div
                      key={player.id}
                      className="bg-slate-950/80 border border-slate-800 hover:border-slate-700 rounded-2xl p-3 flex items-center justify-between transition-colors shadow"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-slate-900 border border-slate-700 flex items-center justify-center text-lg">
                          {player.avatar}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-black text-white">{player.name}</span>
                            <span className="text-[9px] font-mono text-emerald-400 flex items-center gap-0.5">
                              <Wifi className="w-2.5 h-2.5" />
                              {player.ping}ms
                            </span>
                          </div>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {player.status === 'jogando'
                              ? `Em partida (${player.gameName})`
                              : 'Disponível para jogar'}
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={() => handleInvitePlayer(player)}
                        disabled={isInvited}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                          isInvited
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 cursor-default'
                            : 'bg-purple-600 hover:bg-purple-500 text-white shadow active:scale-95'
                        }`}
                      >
                        {isInvited ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Convidado</span>
                          </>
                        ) : (
                          <>
                            <PlusCircle className="w-3.5 h-3.5" />
                            <span>Convidar</span>
                          </>
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer with Launch Options */}
        <div className="shrink-0 p-4 border-t border-slate-800 bg-slate-950/90 flex flex-col sm:flex-row items-center justify-between gap-3">
          <button
            onClick={() => {
              playSound('flip');
              onClose();
              onStartGame(gameId, 'solo', roomCode);
            }}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700 font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow"
          >
            <Bot className="w-4 h-4 text-amber-400" />
            <span>Jogar Sozinho (vs IA)</span>
          </button>

          <button
            onClick={() => {
              playSound('chime');
              onClose();
              onStartGame(gameId, 'online', roomCode);
            }}
            className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 via-emerald-400 to-green-500 hover:from-emerald-400 hover:to-emerald-500 text-slate-950 font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-xl shadow-emerald-500/30 transition-all cursor-pointer active:scale-95"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>Entrar na Mesa Online ({roomCode})</span>
          </button>
        </div>
      </div>
    </div>
  );
};
