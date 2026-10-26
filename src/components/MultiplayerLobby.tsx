import React, { useState } from 'react';
import { MultiplayerRoom, AIDifficulty } from '../types/deck';
import { playSound } from '../utils/audio';
import {
  Users,
  PlusCircle,
  KeyRound,
  Share2,
  Copy,
  Check,
  Bot,
  User,
  Shield,
  MessageCircle,
  Sparkles,
  PlayCircle,
  Coins
} from 'lucide-react';

interface MultiplayerLobbyProps {
  onJoinRoom: (room: MultiplayerRoom) => void;
}

const PUBLIC_ROOMS_MOCK: MultiplayerRoom[] = [
  {
    code: 'OLYMP-1',
    name: 'Mesa Aberta de Poker Hold\'em',
    gameId: 'poker',
    gameName: 'Poker Texas Hold\'em',
    hostName: 'Zeus_BR',
    maxPlayers: 6,
    currentPlayers: 4,
    isPrivate: false,
    stakes: '$50 / $100',
    aiFilled: true,
    aiDifficulty: 'intermediate'
  },
  {
    code: 'TRUCO-7',
    name: 'Truco Paulista da Madrugada',
    gameId: 'truco_paulista',
    gameName: 'Truco Paulista',
    hostName: 'Mineiro_Raiz',
    maxPlayers: 4,
    currentPlayers: 3,
    isPrivate: false,
    stakes: 'Valendo 12 Tentos',
    aiFilled: true,
    aiDifficulty: 'advanced'
  },
  {
    code: 'BLACK-9',
    name: 'Cassino 21 VIP',
    gameId: 'blackjack',
    gameName: 'Blackjack 21',
    hostName: 'Atena_Strategist',
    maxPlayers: 5,
    currentPlayers: 2,
    isPrivate: false,
    stakes: '$25 Mínimo',
    aiFilled: true,
    aiDifficulty: 'intermediate'
  }
];

export const MultiplayerLobby: React.FC<MultiplayerLobbyProps> = ({ onJoinRoom }) => {
  const [rooms, setRooms] = useState<MultiplayerRoom[]>(PUBLIC_ROOMS_MOCK);
  const [createdRoom, setCreatedRoom] = useState<MultiplayerRoom | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const [joinCodeInput, setJoinCodeInput] = useState('');
  const [activeTab, setActiveTab] = useState<'public' | 'create' | 'join'>('public');

  // New Room Form
  const [newRoomName, setNewRoomName] = useState('Minha Sala com Amigos');
  const [selectedGame, setSelectedGame] = useState('poker');
  const [maxPlayers, setMaxPlayers] = useState(4);
  const [isPrivate, setIsPrivate] = useState(true);
  const [aiFilled, setAiFilled] = useState(true);
  const [aiDifficulty, setAiDifficulty] = useState<AIDifficulty>('intermediate');

  const handleCreateRoom = (e: React.FormEvent) => {
    e.preventDefault();
    playSound('chime');
    const randomCode = `OLYMP-${Math.floor(100 + Math.random() * 900)}`;

    const gameNameMap: Record<string, string> = {
      poker: "Poker Texas Hold'em",
      blackjack: 'Blackjack 21',
      truco: 'Truco Paulista',
      solitaire: 'Paciência'
    };

    const newRoom: MultiplayerRoom = {
      code: randomCode,
      name: newRoomName,
      gameId: selectedGame,
      gameName: gameNameMap[selectedGame] || 'Poker',
      hostName: 'Você (Anfitrião)',
      maxPlayers,
      currentPlayers: 1,
      isPrivate,
      stakes: '$20 / $50',
      aiFilled,
      aiDifficulty
    };

    setCreatedRoom(newRoom);
    setRooms((prev) => [newRoom, ...prev]);
  };

  const handleCopyCode = () => {
    if (!createdRoom) return;
    playSound('click');
    navigator.clipboard.writeText(createdRoom.code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleShareInvite = () => {
    if (!createdRoom) return;
    playSound('click');
    const text = `Venha jogar cartas comigo na Sala Privada ${createdRoom.name}! Código da sala: ${createdRoom.code}`;
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const handleJoinWithCode = (e: React.FormEvent) => {
    e.preventDefault();
    const found = rooms.find((r) => r.code.toUpperCase() === joinCodeInput.trim().toUpperCase());
    if (found) {
      playSound('chime');
      onJoinRoom(found);
    } else {
      // Create ad-hoc room with that code
      const adhoc: MultiplayerRoom = {
        code: joinCodeInput.trim().toUpperCase(),
        name: `Sala ${joinCodeInput}`,
        gameId: 'poker',
        gameName: 'Poker Texas Hold\'em',
        hostName: 'Amigo',
        maxPlayers: 4,
        currentPlayers: 2,
        isPrivate: true,
        stakes: '$20 / $50',
        aiFilled: true,
        aiDifficulty: 'intermediate'
      };
      playSound('chime');
      onJoinRoom(adhoc);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-3 sm:px-6 py-4 space-y-6">
      {/* Lobby Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-purple-950/70 via-slate-900/90 to-blue-950/70 border border-purple-500/30 p-5 sm:p-7 shadow-2xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/20 border border-purple-400/40 text-purple-300 text-xs font-semibold mb-2">
              <Users className="w-3.5 h-3.5" />
              <span>Salas & Partidas Multijogador</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-wide">
              Jogue com Amigos ou Partidas Públicas
            </h1>
            <p className="text-slate-300 text-xs sm:text-sm mt-1 max-w-2xl leading-relaxed">
              Crie uma sala privada, compartilhe o código de convite pelo WhatsApp ou junte-se a mesas públicas. Se faltarem amigos na sala, IAs inteligentes completam as vagas!
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('create')}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-black text-xs sm:text-sm shadow-lg shadow-purple-900/30 active:scale-95 transition-all"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Criar Nova Sala</span>
            </button>
          </div>
        </div>
      </div>

      {/* Lobby Navigation Tabs */}
      <div className="flex border-b border-slate-800 gap-3 text-xs sm:text-sm font-bold">
        <button
          onClick={() => setActiveTab('public')}
          className={`pb-2.5 px-3 border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'public'
              ? 'border-purple-400 text-purple-300'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Mesas Públicas ({rooms.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('create')}
          className={`pb-2.5 px-3 border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'create'
              ? 'border-purple-400 text-purple-300'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <PlusCircle className="w-4 h-4" />
          <span>Criar Sala Privada</span>
        </button>

        <button
          onClick={() => setActiveTab('join')}
          className={`pb-2.5 px-3 border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'join'
              ? 'border-purple-400 text-purple-300'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <KeyRound className="w-4 h-4" />
          <span>Digitar Código de Convite</span>
        </button>
      </div>

      {/* Tab 1: Public Rooms */}
      {activeTab === 'public' && (
        <div className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {rooms.map((room) => (
              <div
                key={room.code}
                className="bg-slate-900/90 border border-slate-800 hover:border-purple-500/50 rounded-2xl p-4 shadow-xl transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-mono font-bold bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded border border-purple-400/30">
                      {room.code}
                    </span>
                    <span className="text-xs text-slate-400 flex items-center gap-1 font-mono">
                      <User className="w-3 h-3" />
                      <span>
                        {room.currentPlayers}/{room.maxPlayers}
                      </span>
                    </span>
                  </div>

                  <h3 className="font-bold text-sm text-white">{room.name}</h3>
                  <div className="text-xs text-amber-300 font-bold mt-0.5">{room.gameName}</div>
                  <div className="text-[11px] text-slate-400 mt-2 space-y-1">
                    <div>Anfitrião: {room.hostName}</div>
                    <div>Apostas / Limites: {room.stakes}</div>
                    {room.aiFilled && (
                      <div className="flex items-center gap-1 text-purple-300">
                        <Bot className="w-3 h-3" />
                        <span>IAs preenchem vagas ({room.aiDifficulty})</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between">
                  <button
                    onClick={() => onJoinRoom(room)}
                    className="w-full py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow transition-colors"
                  >
                    <PlayCircle className="w-4 h-4" />
                    <span>Entrar na Mesa</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 2: Create Room */}
      {activeTab === 'create' && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl max-w-xl mx-auto">
          {createdRoom ? (
            <div className="text-center space-y-4 animate-fadeIn">
              <div className="w-14 h-14 rounded-full bg-emerald-500/20 border border-emerald-400/50 text-emerald-300 flex items-center justify-center mx-auto">
                <Sparkles className="w-7 h-7" />
              </div>

              <div>
                <h3 className="text-lg font-black text-white">Sala Criada com Sucesso!</h3>
                <p className="text-xs text-slate-400 mt-1">
                  Envie o código de convite para seus amigos entrarem na partida:
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-950 border border-amber-500/40 inline-flex items-center gap-3">
                <span className="font-mono text-xl sm:text-2xl font-black text-amber-300 tracking-wider">
                  {createdRoom.code}
                </span>
                <button
                  onClick={handleCopyCode}
                  className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-200 transition-colors"
                  title="Copiar Código"
                >
                  {copiedCode ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-2">
                <button
                  onClick={handleShareInvite}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow"
                >
                  <Share2 className="w-4 h-4" />
                  <span>Enviar Convite WhatsApp</span>
                </button>

                <button
                  onClick={() => onJoinRoom(createdRoom)}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow"
                >
                  <PlayCircle className="w-4 h-4" />
                  <span>Abrir Mesa Agora</span>
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleCreateRoom} className="space-y-4">
              <h3 className="text-base font-black text-white border-b border-slate-800 pb-2">
                Configurar Nova Sala
              </h3>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Nome da Mesa</label>
                <input
                  type="text"
                  value={newRoomName}
                  onChange={(e) => setNewRoomName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-purple-400"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Jogo de Cartas</label>
                  <select
                    value={selectedGame}
                    onChange={(e) => setSelectedGame(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-purple-400"
                  >
                    <option value="poker">Poker Texas Hold'em</option>
                    <option value="truco">Truco Paulista</option>
                    <option value="blackjack">Blackjack 21</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Vagas de Jogadores</label>
                  <select
                    value={maxPlayers}
                    onChange={(e) => setMaxPlayers(parseInt(e.target.value, 10))}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-purple-400"
                  >
                    <option value={2}>2 Jogadores (Mano a Mano)</option>
                    <option value={4}>4 Jogadores (Padrão Truco/Poker)</option>
                    <option value={6}>6 Jogadores (Mesa Cheia)</option>
                  </select>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={aiFilled}
                    onChange={(e) => setAiFilled(e.target.checked)}
                    className="rounded text-purple-600 focus:ring-0"
                  />
                  <span className="text-xs font-bold text-slate-200">
                    Completar vagas vazias com IAs inteligentes
                  </span>
                </label>

                {aiFilled && (
                  <div className="flex items-center gap-2 pt-1 pl-5">
                    <span className="text-[11px] text-slate-400 font-bold">Dificuldade da IA:</span>
                    {(['beginner', 'intermediate', 'advanced'] as AIDifficulty[]).map((d) => (
                      <button
                        type="button"
                        key={d}
                        onClick={() => setAiDifficulty(d)}
                        className={`text-[11px] px-2 py-0.5 rounded font-bold capitalize transition-colors ${
                          aiDifficulty === d
                            ? 'bg-purple-600 text-white'
                            : 'bg-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        {d === 'beginner' ? 'Iniciante' : d === 'intermediate' ? 'Médio' : 'Avançado'}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-500 hover:to-purple-600 text-white font-black text-sm shadow-xl active:scale-95 transition-all"
              >
                Criar Sala & Gerar Convite
              </button>
            </form>
          )}
        </div>
      )}

      {/* Tab 3: Join Room */}
      {activeTab === 'join' && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl max-w-md mx-auto text-center">
          <KeyRound className="w-10 h-10 text-purple-400 mx-auto mb-2" />
          <h3 className="text-base font-black text-white">Entrar com Código</h3>
          <p className="text-xs text-slate-400 mt-1 mb-4">
            Digite o código de 6 dígitos que seu amigo compartilhou (ex: OLYMP-482):
          </p>

          <form onSubmit={handleJoinWithCode} className="space-y-3">
            <input
              type="text"
              placeholder="Ex: OLYMP-123"
              value={joinCodeInput}
              onChange={(e) => setJoinCodeInput(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-center font-mono font-bold text-sm text-amber-300 placeholder-slate-600 focus:outline-none focus:border-purple-400 uppercase tracking-widest"
              required
            />

            <button
              type="submit"
              className="w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs sm:text-sm shadow-lg active:scale-95 transition-all"
            >
              Entrar na Partida
            </button>
          </form>
        </div>
      )}
    </div>
  );
};
