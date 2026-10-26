import React, { useState, useMemo, Suspense } from 'react';
import { TrucoVariant } from './games/TrucoGame';
import { GAME_RULES_DATABASE } from '../data/gameRulesData';
import { playSound } from '../utils/audio';

// Lazy loaded games to minimize initial bundle footprint and load only on demand
const PokerGame = React.lazy(() =>
  import('./games/PokerGame').then((m) => ({ default: m.PokerGame }))
);
const BlackjackGame = React.lazy(() =>
  import('./games/BlackjackGame').then((m) => ({ default: m.BlackjackGame }))
);
const TrucoGame = React.lazy(() =>
  import('./games/TrucoGame').then((m) => ({ default: m.TrucoGame }))
);
const SolitaireGame = React.lazy(() =>
  import('./games/SolitaireGame').then((m) => ({ default: m.SolitaireGame }))
);
const GenericCardGameArena = React.lazy(() =>
  import('./games/GenericCardGameArena').then((m) => ({ default: m.GenericCardGameArena }))
);
const TabletopSimulator = React.lazy(() =>
  import('./TabletopSimulator').then((m) => ({ default: m.TabletopSimulator }))
);

const GameLoadingFallback = ({ name = 'Mesa' }: { name?: string }) => (
  <div className="flex-1 min-h-0 flex flex-col items-center justify-center p-6 text-center select-none">
    <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-400/40 flex items-center justify-center shadow-xl mb-3">
      <Shuffle className="w-6 h-6 text-amber-400 animate-spin" />
    </div>
    <span className="text-sm font-black text-amber-300">Preparando {name}...</span>
    <span className="text-xs text-slate-400 font-mono mt-1">Carregando cartas e regras</span>
  </div>
);
import {
  Coins,
  Shield,
  Flame,
  LayoutGrid,
  Sparkles,
  BookOpen,
  Users,
  Play,
  ArrowLeft,
  Search,
  ChevronRight,
  Info,
  Trophy,
  Dices,
  Layers,
  HelpCircle,
  Crown,
  Zap,
  Heart,
  Sword,
  Swords,
  Gem,
  Shuffle,
  Globe,
  Wifi,
  Bot,
  Share2
} from 'lucide-react';
import { OnlineRoomModal } from './OnlineRoomModal';

import rawCardsData from '../cards_data.json';
import { CardData, CustomDeck } from '../types/deck';

const allDeckCards: CardData[] = rawCardsData as CardData[];

const DEFAULT_DECK: CustomDeck = {
  id: 'deck_standard',
  name: 'Baralho Padrão',
  description: '54 cartas',
  tag: 'Padrão',
  coverCardId: 'A_S',
  cards: allDeckCards.map((c) => ({ cardId: c.id, count: 1 })),
  createdAt: Date.now(),
  updatedAt: Date.now()
};

interface PlayArenaProps {
  initialGame?: string | null;
  onOpenAcademy?: () => void;
  allCards?: CardData[];
  activeDeck?: CustomDeck;
  onInspectCard?: (card: CardData) => void;
  onGameActiveChange?: (isActive: boolean) => void;
}

interface GameVisualConfig {
  border: string;
  iconBg: string;
  iconColor: string;
  buttonClass: string;
  icon: React.ReactNode;
}

interface PlayerOptionConfig {
  options: number[];
  labels?: Record<number, string>;
  title: string;
}

const GAME_PLAYER_CONFIGS: Record<string, PlayerOptionConfig> = {
  poker: {
    options: [2, 3, 4, 5, 6],
    labels: { 2: '1v1', 3: '3', 4: '4', 5: '5', 6: '6 Max' },
    title: 'Jogadores na Mesa (Máx 6):'
  },
  blackjack: {
    options: [1, 2, 3, 4, 5],
    labels: { 1: '1 Mão', 2: '2 Mãos', 3: '3 Mãos', 4: '4 Mãos', 5: '5 Mãos' },
    title: 'Posições Simultâneas:'
  },
  truco_paulista: {
    options: [2, 4, 6],
    labels: { 2: '2 (1v1)', 4: '4 (Duplas)', 6: '6 (Trios)' },
    title: 'Jogadores (Em Pares):'
  },
  truco_mineiro: {
    options: [2, 4, 6],
    labels: { 2: '2 (1v1)', 4: '4 (Duplas)', 6: '6 (Trios)' },
    title: 'Jogadores (Em Pares):'
  },
  buraco_canastra: {
    options: [2, 4],
    labels: { 2: '2 (1v1 Solo)', 4: '4 (Duplas Oficiais)' },
    title: 'Participantes (Regra Oficial):'
  },
  pife_cacheta: {
    options: [2, 3, 4, 5, 6],
    labels: { 2: '2 (1v1)', 3: '3 Jog', 4: '4 Padrão', 5: '5 Jog', 6: '6 Max' },
    title: 'Jogadores na Mesa (2 a 6):'
  },
  rummy: {
    options: [2, 3, 4, 5, 6],
    labels: { 2: '2 (1v1)', 3: '3 Jog', 4: '4 Padrão', 5: '5 Jog', 6: '6 Max' },
    title: 'Jogadores na Mesa (2 a 6):'
  },
  copas: {
    options: [3, 4],
    labels: { 3: '3 Jogadores', 4: '4 (Oficial)' },
    title: 'Participantes na Mesa:'
  },
  espadas: {
    options: [2, 4],
    labels: { 2: '2 (1v1 Solo)', 4: '4 (Duplas Oficiais)' },
    title: 'Participantes na Mesa:'
  },
  sueca_bisca: {
    options: [2, 4],
    labels: { 2: '2 (Bisca 1v1)', 4: '4 (Sueca Duplas)' },
    title: 'Modalidade / Jogadores:'
  },
  escopa: {
    options: [2, 3, 4],
    labels: { 2: '2 (1v1 Solo)', 3: '3 Jogadores', 4: '4 (Duplas)' },
    title: 'Participantes na Mesa:'
  },
  mau_mau_oito_maluco: {
    options: [2, 3, 4, 5, 6],
    labels: { 2: '2 (1v1)', 3: '3 Jog', 4: '4 Padrão', 5: '5 Jog', 6: '6 Max' },
    title: 'Jogadores na Roda (2 a 6):'
  },
  war_batalha: {
    options: [2, 3, 4],
    labels: { 2: '2 (Duelo 1v1)', 3: '3 Combate', 4: '4 Guerra Total' },
    title: 'Exércitos / Jogadores:'
  }
};

const DEFAULT_GAME_PLAYER_COUNTS: Record<string, number> = {
  poker: 6,
  blackjack: 3,
  truco_paulista: 4,
  truco_mineiro: 4,
  buraco_canastra: 4,
  pife_cacheta: 4,
  rummy: 4,
  copas: 4,
  espadas: 4,
  sueca_bisca: 4,
  escopa: 4,
  mau_mau_oito_maluco: 4,
  war_batalha: 2,
  solitaire_klondike: 1,
  freecell: 1,
  spider: 1
};

export const PlayArena: React.FC<PlayArenaProps> = ({
  initialGame = null,
  onOpenAcademy,
  allCards = allDeckCards,
  activeDeck = DEFAULT_DECK,
  onInspectCard = () => {},
  onGameActiveChange
}) => {
  const [activeGame, setActiveGame] = useState<string | null>(initialGame);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Sync active game state with parent to hide global header
  React.useEffect(() => {
    onGameActiveChange?.(Boolean(activeGame));
  }, [activeGame, onGameActiveChange]);

  React.useEffect(() => {
    if (initialGame) {
      setActiveGame(initialGame);
    }
  }, [initialGame]);

  // Player count selection for every game
  const [gamePlayerCounts, setGamePlayerCounts] = useState<Record<string, number>>(DEFAULT_GAME_PLAYER_COUNTS);

  // Online multiplayer room modal & active session state
  const [onlineModalConfig, setOnlineModalConfig] = useState<{
    isOpen: boolean;
    gameId: string;
    gameTitle: string;
    playerCount: number;
  } | null>(null);

  const [onlineSession, setOnlineSession] = useState<{
    mode: 'solo' | 'online';
    roomCode: string;
  } | null>(null);

  const handleLaunchGame = (gameId: string, mode: 'solo' | 'online' = 'solo') => {
    playSound('flip');
    setOnlineSession({ mode, roomCode: `${gameId.toUpperCase().slice(0, 5)}-${Math.floor(100 + Math.random() * 900)}` });
    setActiveGame(gameId);
  };

  const handleOpenOnlineModal = (gameId: string, gameTitle: string, playerCount: number) => {
    playSound('click');
    setOnlineModalConfig({
      isOpen: true,
      gameId,
      gameTitle,
      playerCount
    });
  };

  const handleStartFromModal = (gameId: string, mode: 'solo' | 'online', roomCode: string) => {
    setOnlineSession({ mode, roomCode });
    setActiveGame(gameId);
  };

  const handleBackToHub = () => {
    playSound('click');
    setActiveGame(null);
    setOnlineSession(null);
  };

  // Dedicated vibrant visual configuration for every single game
  const getGameVisualConfig = (id: string): GameVisualConfig => {
    switch (id) {
      case 'poker':
        return {
          border: 'border-amber-500/50 hover:border-amber-400 shadow-amber-500/10',
          iconBg: 'bg-amber-500/20 border-amber-500/40',
          iconColor: 'text-amber-400',
          buttonClass:
            'bg-gradient-to-r from-amber-500 via-amber-400 to-amber-600 text-slate-950 font-black hover:from-amber-400 hover:to-amber-500 shadow-amber-500/25',
          icon: <Coins className="w-5 h-5 text-amber-400" />
        };
      case 'blackjack':
        return {
          border: 'border-purple-500/50 hover:border-purple-400 shadow-purple-500/10',
          iconBg: 'bg-purple-500/20 border-purple-500/40',
          iconColor: 'text-purple-400',
          buttonClass:
            'bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-black hover:from-purple-500 hover:to-indigo-500 shadow-purple-500/25',
          icon: <Shield className="w-5 h-5 text-purple-400" />
        };
      case 'truco_paulista':
        return {
          border: 'border-red-500/50 hover:border-red-400 shadow-red-500/10',
          iconBg: 'bg-red-500/20 border-red-500/40',
          iconColor: 'text-red-400',
          buttonClass:
            'bg-gradient-to-r from-red-600 via-orange-600 to-amber-600 text-white font-black hover:from-red-500 hover:to-amber-500 shadow-red-500/25',
          icon: <Flame className="w-5 h-5 text-red-400" />
        };
      case 'truco_mineiro':
        return {
          border: 'border-orange-500/50 hover:border-orange-400 shadow-orange-500/10',
          iconBg: 'bg-orange-500/20 border-orange-500/40',
          iconColor: 'text-orange-400',
          buttonClass:
            'bg-gradient-to-r from-orange-600 via-amber-600 to-yellow-600 text-slate-950 font-black hover:from-orange-500 hover:to-amber-500 shadow-orange-500/25',
          icon: <Flame className="w-5 h-5 text-orange-400" />
        };
      case 'solitaire_klondike':
        return {
          border: 'border-emerald-500/50 hover:border-emerald-400 shadow-emerald-500/10',
          iconBg: 'bg-emerald-500/20 border-emerald-500/40',
          iconColor: 'text-emerald-400',
          buttonClass:
            'bg-gradient-to-r from-emerald-600 via-teal-600 to-green-600 text-white font-black hover:from-emerald-500 hover:to-teal-500 shadow-emerald-500/25',
          icon: <Sparkles className="w-5 h-5 text-emerald-400" />
        };
      case 'freecell':
        return {
          border: 'border-teal-500/50 hover:border-teal-400 shadow-teal-500/10',
          iconBg: 'bg-teal-500/20 border-teal-500/40',
          iconColor: 'text-teal-400',
          buttonClass:
            'bg-gradient-to-r from-teal-600 via-cyan-600 to-blue-600 text-white font-black hover:from-teal-500 hover:to-cyan-500 shadow-teal-500/25',
          icon: <LayoutGrid className="w-5 h-5 text-teal-400" />
        };
      case 'spider':
        return {
          border: 'border-violet-500/50 hover:border-violet-400 shadow-violet-500/10',
          iconBg: 'bg-violet-500/20 border-violet-500/40',
          iconColor: 'text-violet-400',
          buttonClass:
            'bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600 text-white font-black hover:from-violet-500 hover:to-purple-500 shadow-violet-500/25',
          icon: <Layers className="w-5 h-5 text-violet-400" />
        };
      case 'buraco_canastra':
        return {
          border: 'border-blue-500/50 hover:border-blue-400 shadow-blue-500/10',
          iconBg: 'bg-blue-500/20 border-blue-500/40',
          iconColor: 'text-blue-400',
          buttonClass:
            'bg-gradient-to-r from-blue-600 via-indigo-600 to-sky-600 text-white font-black hover:from-blue-500 hover:to-sky-500 shadow-blue-500/25',
          icon: <Crown className="w-5 h-5 text-blue-400" />
        };
      case 'pife_cacheta':
        return {
          border: 'border-cyan-500/50 hover:border-cyan-400 shadow-cyan-500/10',
          iconBg: 'bg-cyan-500/20 border-cyan-500/40',
          iconColor: 'text-cyan-400',
          buttonClass:
            'bg-gradient-to-r from-cyan-500 via-teal-500 to-emerald-500 text-slate-950 font-black hover:from-cyan-400 hover:to-emerald-400 shadow-cyan-500/25',
          icon: <Zap className="w-5 h-5 text-cyan-400" />
        };
      case 'rummy':
        return {
          border: 'border-fuchsia-500/50 hover:border-fuchsia-400 shadow-fuchsia-500/10',
          iconBg: 'bg-fuchsia-500/20 border-fuchsia-500/40',
          iconColor: 'text-fuchsia-400',
          buttonClass:
            'bg-gradient-to-r from-fuchsia-600 via-pink-600 to-rose-600 text-white font-black hover:from-fuchsia-500 hover:to-pink-500 shadow-fuchsia-500/25',
          icon: <Trophy className="w-5 h-5 text-fuchsia-400" />
        };
      case 'copas':
        return {
          border: 'border-rose-500/50 hover:border-rose-400 shadow-rose-500/10',
          iconBg: 'bg-rose-500/20 border-rose-500/40',
          iconColor: 'text-rose-400',
          buttonClass:
            'bg-gradient-to-r from-rose-600 via-red-600 to-pink-600 text-white font-black hover:from-rose-500 hover:to-red-500 shadow-rose-500/25',
          icon: <Heart className="w-5 h-5 text-rose-400" />
        };
      case 'espadas':
        return {
          border: 'border-sky-500/50 hover:border-sky-400 shadow-sky-500/10',
          iconBg: 'bg-sky-500/20 border-sky-500/40',
          iconColor: 'text-sky-400',
          buttonClass:
            'bg-gradient-to-r from-sky-600 via-blue-600 to-indigo-600 text-white font-black hover:from-sky-500 hover:to-blue-500 shadow-sky-500/25',
          icon: <Sword className="w-5 h-5 text-sky-400" />
        };
      case 'sueca_bisca':
        return {
          border: 'border-yellow-500/50 hover:border-yellow-400 shadow-yellow-500/10',
          iconBg: 'bg-yellow-500/20 border-yellow-500/40',
          iconColor: 'text-yellow-400',
          buttonClass:
            'bg-gradient-to-r from-yellow-500 via-amber-600 to-orange-600 text-slate-950 font-black hover:from-yellow-400 hover:to-orange-500 shadow-yellow-500/25',
          icon: <Shield className="w-5 h-5 text-yellow-400" />
        };
      case 'escopa':
        return {
          border: 'border-indigo-500/50 hover:border-indigo-400 shadow-indigo-500/10',
          iconBg: 'bg-indigo-500/20 border-indigo-500/40',
          iconColor: 'text-indigo-400',
          buttonClass:
            'bg-gradient-to-r from-indigo-600 via-purple-600 to-violet-600 text-white font-black hover:from-indigo-500 hover:to-purple-500 shadow-indigo-500/25',
          icon: <Gem className="w-5 h-5 text-indigo-400" />
        };
      case 'mau_mau_oito_maluco':
        return {
          border: 'border-lime-500/50 hover:border-lime-400 shadow-lime-500/10',
          iconBg: 'bg-lime-500/20 border-lime-500/40',
          iconColor: 'text-lime-400',
          buttonClass:
            'bg-gradient-to-r from-lime-500 via-emerald-600 to-green-600 text-slate-950 font-black hover:from-lime-400 hover:to-green-500 shadow-lime-500/25',
          icon: <Shuffle className="w-5 h-5 text-lime-400" />
        };
      case 'war_batalha':
        return {
          border: 'border-red-600/60 hover:border-red-500 shadow-red-600/15',
          iconBg: 'bg-red-600/20 border-red-600/40',
          iconColor: 'text-red-400',
          buttonClass:
            'bg-gradient-to-r from-red-700 via-red-600 to-orange-600 text-white font-black hover:from-red-600 hover:to-orange-500 shadow-red-600/30',
          icon: <Swords className="w-5 h-5 text-red-400" />
        };
      default:
        return {
          border: 'border-amber-500/40 hover:border-amber-400 shadow-amber-500/10',
          iconBg: 'bg-amber-500/20 border-amber-500/40',
          iconColor: 'text-amber-400',
          buttonClass:
            'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-black hover:from-amber-400 shadow-amber-500/20',
          icon: <Layers className="w-5 h-5 text-amber-400" />
        };
    }
  };

  // Filter games from GAME_RULES_DATABASE
  const filteredGames = useMemo(() => {
    return GAME_RULES_DATABASE.filter((game) => {
      // Category filter
      if (selectedCategory !== 'ALL') {
        if (selectedCategory === 'Cassino' && game.category !== 'Cassino') return false;
        if (selectedCategory === 'Truco' && game.category !== 'Truco') return false;
        if (selectedCategory === 'Paciência' && game.category !== 'Paciência') return false;
        if (
          selectedCategory === 'Vazas' &&
          !['copas', 'espadas', 'sueca_bisca', 'escopa', 'war_batalha'].includes(game.id)
        )
          return false;
        if (
          selectedCategory === 'Combinações' &&
          !['buraco_canastra', 'pife_cacheta', 'rummy', 'mau_mau_oito_maluco'].includes(game.id)
        )
          return false;
      }
      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          game.title.toLowerCase().includes(q) ||
          game.overview.toLowerCase().includes(q) ||
          game.category.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [selectedCategory, searchQuery]);

  // 1. GAME SELECTION HUB / SALÃO DE JOGOS (When no active game is selected)
  if (!activeGame) {
    return (
      <div className="flex-1 min-h-0 flex flex-col overflow-y-auto overflow-x-hidden max-w-7xl mx-auto w-full px-3 sm:px-6 py-4 short:px-2 short:py-2 select-none">
        {/* Hub Header */}
        <div className="shrink-0 mb-4 bg-gradient-to-r from-[#181105] via-[#100b1a] to-[#0c1524] border border-amber-500/30 rounded-3xl short:rounded-2xl p-4 sm:p-6 short:p-3 shadow-2xl flex flex-col md:flex-row short:flex-row short:flex-wrap items-start md:items-center justify-between gap-4 short:gap-2 short:mb-2">
          <div className="min-w-0 flex-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 short:py-0.5 short:text-[10px] rounded-full bg-amber-500/20 text-amber-300 text-xs font-black uppercase tracking-wider mb-2 short:mb-1 border border-amber-500/40">
              <Dices className="w-4 h-4 text-amber-400" />
              <span>Salão Oficial de Jogos de Cartas ({GAME_RULES_DATABASE.length} Modalidades)</span>
            </div>
            <h1 className="text-xl sm:text-2xl md:text-3xl short:text-lg font-black text-amber-100 tracking-tight">
              Escolha seu Jogo & Mesa
            </h1>
            <p className="short:hidden text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl">
              Todos os jogos da Academia de Regras disponíveis com temas visuais exclusivos, IA, multiplayer e regras completas.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 short:gap-1.5">
            {onOpenAcademy && (
              <button
                onClick={onOpenAcademy}
                className="px-4 py-2.5 short:px-3 short:py-1.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-amber-300 hover:text-white font-bold text-xs border border-amber-500/40 flex items-center gap-2 transition-all shadow-md cursor-pointer shrink-0"
              >
                <BookOpen className="w-4 h-4 text-amber-400" />
                <span>Ver Manual de Regras</span>
              </button>
            )}

            <button
              onClick={() => handleLaunchGame('tabletop')}
              className="px-4 py-2.5 short:px-3 short:py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-bold text-xs border border-amber-500/40 flex items-center gap-1.5 transition-all shadow cursor-pointer shrink-0"
            >
              <LayoutGrid className="w-4 h-4" />
              <span>Mesa Sandbox</span>
            </button>
          </div>
        </div>

        {/* Live Online Players Presence & Quick Lobby Register */}
        <div className="shrink-0 mb-4 bg-gradient-to-r from-emerald-950/60 via-slate-900 to-slate-950 p-3 sm:p-4 short:p-2 short:mb-2 rounded-2xl border border-emerald-500/40 shadow-xl flex flex-col md:flex-row short:flex-row items-stretch md:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center shrink-0">
              <Wifi className="w-5 h-5 text-emerald-400 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs sm:text-sm font-black text-white">
                  Jogadores Conectados no Site Agora
                </span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-mono font-black border border-emerald-500/40 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  7 ONLINE
                </span>
              </div>
              <p className="short:hidden text-[11px] text-slate-300">
                Escolha jogar sozinho contra a IA ou crie uma mesa online para jogar com seus amigos!
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto py-1 min-w-0">
            {[
              { name: 'Mineiro_Raiz', avatar: '🤠', status: 'disponivel' },
              { name: 'Zeus_BR', avatar: '⚡', status: 'disponivel' },
              { name: 'Atena', avatar: '🦉', status: 'disponivel' },
              { name: 'Carioca', avatar: '🌊', status: 'disponivel' },
              { name: 'Gaucho', avatar: '🧉', status: 'jogando' }
            ].map((p, idx) => (
              <div
                key={idx}
                className="flex items-center gap-1.5 bg-slate-950/80 border border-slate-800 px-2.5 py-1 rounded-xl text-xs shrink-0"
                title={`${p.name} - ${p.status === 'jogando' ? 'Em Partida' : 'Disponível'}`}
              >
                <span className="text-sm">{p.avatar}</span>
                <span className="text-[11px] font-bold text-slate-200">{p.name}</span>
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    p.status === 'jogando' ? 'bg-amber-400' : 'bg-emerald-400'
                  }`}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Filter Pills & Search */}
        <div className="shrink-0 mb-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 short:mb-2 short:p-1.5 bg-slate-900/90 p-2 sm:p-2.5 rounded-2xl border border-slate-800 shadow">
          {/* Category Tabs */}
          <div className="flex flex-wrap items-center gap-1">
            {[
              { id: 'ALL', label: `Todos (${GAME_RULES_DATABASE.length})` },
              { id: 'Cassino', label: 'Cassino' },
              { id: 'Truco', label: 'Truco' },
              { id: 'Paciência', label: 'Paciência' },
              { id: 'Vazas', label: 'Vazas & Truques' },
              { id: 'Combinações', label: 'Canastra & Descarte' }
            ].map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-1.5 short:px-2 short:py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  selectedCategory === cat.id
                    ? 'bg-amber-500 text-slate-950 font-black shadow-md'
                    : 'bg-slate-950 text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Game Cards Grid - ALL 18 GAMES WITH DISTINCT COLOR THEMES & ICONS */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 pb-8">
          {filteredGames.map((game) => {
            const visual = getGameVisualConfig(game.id);
            const playerConfig = GAME_PLAYER_CONFIGS[game.id];
            const currentCount =
              gamePlayerCounts[game.id] ??
              (playerConfig
                ? playerConfig.options[playerConfig.options.length > 2 ? 2 : playerConfig.options.length - 1]
                : 1);
            const isSolitaire = ['solitaire_klondike', 'freecell', 'spider'].includes(game.id);

            return (
              <div
                key={game.id}
                className={`rounded-2xl bg-gradient-to-b from-slate-900 via-slate-950 to-black border-2 ${visual.border} p-4 short:p-3 shadow-xl flex flex-col justify-between transition-all group`}
              >
                <div className="space-y-3">
                  {/* Top card header */}
                  <div className="flex items-center justify-between">
                    <div
                      className={`w-11 h-11 rounded-xl ${visual.iconBg} border flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform`}
                    >
                      {visual.icon}
                    </div>
                    <span className="text-[10px] font-mono font-bold uppercase px-2.5 py-0.5 rounded-full bg-slate-900 text-slate-300 border border-slate-800">
                      {playerConfig ? `${currentCount} Jogadores` : game.players}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-base font-black text-slate-100 group-hover:text-amber-300 transition-colors">
                      {game.title}
                    </h3>
                    <p className="text-[11px] text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                      {game.overview}
                    </p>
                  </div>

                  {/* Interactive Player Count Selection for Multi-player Games */}
                  {playerConfig ? (
                    <div className="pt-2 border-t border-slate-800/80">
                      <div className="text-[10px] font-bold text-slate-300 flex items-center justify-between mb-1.5">
                        <span className="flex items-center gap-1.5">
                          <Users className="w-3 h-3 text-amber-400" />
                          <span>{playerConfig.title}</span>
                        </span>
                        <span className="text-[10px] font-mono font-bold text-amber-400">
                          {playerConfig.labels?.[currentCount] || `${currentCount} Jogadores`}
                        </span>
                      </div>
                      <div
                        className={`grid gap-1 ${
                          playerConfig.options.length <= 2
                            ? 'grid-cols-2'
                            : playerConfig.options.length === 3
                            ? 'grid-cols-3'
                            : playerConfig.options.length === 4
                            ? 'grid-cols-4'
                            : 'grid-cols-5'
                        }`}
                      >
                        {playerConfig.options.map((num) => {
                          const isSelected = currentCount === num;
                          const label = playerConfig.labels?.[num] ?? `${num}`;
                          return (
                            <button
                              key={num}
                              type="button"
                              onClick={() =>
                                setGamePlayerCounts((prev) => ({ ...prev, [game.id]: num }))
                              }
                              className={`py-1 px-1 rounded-md text-[10px] sm:text-[11px] font-black transition-all cursor-pointer text-center truncate ${
                                isSelected
                                  ? 'bg-amber-500 text-slate-950 font-black shadow-md scale-[1.02]'
                                  : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800 hover:border-slate-700'
                              }`}
                              title={`${label}`}
                            >
                              {label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ) : isSolitaire ? (
                    <div className="pt-2 border-t border-slate-800/80">
                      <div className="text-[10px] font-bold text-slate-400 flex items-center justify-between">
                        <span className="flex items-center gap-1.5 text-emerald-400">
                          <Sparkles className="w-3 h-3" />
                          <span>Modalidade:</span>
                        </span>
                        <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold">
                          1 Jogador (Solitário)
                        </span>
                      </div>
                    </div>
                  ) : null}
                </div>

                {/* Dual Mode Launch Buttons: Solo vs AI OR Online with Friends */}
                {playerConfig ? (
                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <button
                      onClick={() => handleLaunchGame(game.id, 'solo')}
                      className="py-2.5 px-2 rounded-xl font-black text-[11px] sm:text-xs flex items-center justify-center gap-1.5 shadow-md bg-slate-900 hover:bg-slate-800 text-slate-200 hover:text-white border border-slate-700 transition-all cursor-pointer active:scale-95"
                      title={`Jogar ${game.title} sozinho contra IA`}
                    >
                      <Bot className="w-3.5 h-3.5 text-amber-400" />
                      <span>Jogar vs IA</span>
                    </button>

                    <button
                      onClick={() => handleOpenOnlineModal(game.id, game.title, currentCount)}
                      className={`py-2.5 px-2 rounded-xl font-black text-[11px] sm:text-xs flex items-center justify-center gap-1.5 shadow-lg transition-all cursor-pointer active:scale-95 ${visual.buttonClass}`}
                      title={`Jogar ${game.title} online com amigos`}
                    >
                      <Globe className="w-3.5 h-3.5" />
                      <span>Jogar Online</span>
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => handleLaunchGame(game.id, 'solo')}
                    className={`mt-4 w-full py-2.5 rounded-xl font-black text-xs flex items-center justify-center gap-1.5 shadow-lg active:scale-98 transition-all cursor-pointer ${visual.buttonClass}`}
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>Jogar {game.title.split(' ')[0]}</span>
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* Online Room Modal in Hub */}
        {onlineModalConfig && (
          <OnlineRoomModal
            isOpen={onlineModalConfig.isOpen}
            onClose={() => setOnlineModalConfig(null)}
            gameId={onlineModalConfig.gameId}
            gameTitle={onlineModalConfig.gameTitle}
            playerCount={onlineModalConfig.playerCount}
            onStartGame={handleStartFromModal}
          />
        )}
      </div>
    );
  }

  // 2. ACTIVE GAME VIEW (FULL SCREEN WITHOUT HEADER DISTRACTIONS!)
  return (
    <div className="flex-1 min-h-0 flex flex-col overflow-hidden w-full h-full relative">
      {/* Online Room Status Bar when playing Online */}
      {onlineSession?.mode === 'online' && (
        <div className="shrink-0 bg-emerald-950/90 border-b border-emerald-500/40 px-3 py-1.5 flex items-center justify-between text-xs z-30">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span className="font-mono font-black text-emerald-300">
              SALA ONLINE: {onlineSession.roomCode}
            </span>
            <span className="text-[10px] text-slate-400 hidden sm:inline font-mono">
              • Vagas vazias completadas por IA inteligente
            </span>
          </div>
          <span className="text-[10px] font-mono font-bold text-emerald-300 bg-emerald-900/60 px-2 py-0.5 rounded-full border border-emerald-500/30">
            🟢 Conectado (18ms)
          </span>
        </div>
      )}
      <Suspense fallback={<GameLoadingFallback name={activeGame || 'Mesa'} />}>
        {/* POKER */}
        {activeGame === 'poker' && (
          <PokerGame
            playerCount={gamePlayerCounts['poker'] || 6}
            onBack={handleBackToHub}
          />
        )}

        {/* TRUCO (Paulista, Mineiro, Gaúcho, Variações) */}
        {(activeGame === 'truco' || activeGame.startsWith('truco_')) && (
          <TrucoGame
            playerCount={gamePlayerCounts[activeGame] || 4}
            initialVariant={activeGame.includes('mineiro') ? 'mineiro' : 'paulista'}
            onBack={handleBackToHub}
          />
        )}

        {/* BLACKJACK 21 */}
        {activeGame === 'blackjack' && (
          <BlackjackGame
            spotCount={gamePlayerCounts['blackjack'] || 3}
            onBack={handleBackToHub}
          />
        )}

        {/* PACIÊNCIA (Klondike, Freecell, Spider) */}
        {(activeGame === 'solitaire' ||
          activeGame === 'solitaire_klondike' ||
          activeGame === 'freecell' ||
          activeGame === 'spider') && (
          <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
            <div className="shrink-0 p-2 flex items-center justify-between border-b border-slate-800/80 bg-slate-950/80">
              <button
                onClick={handleBackToHub}
                className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Escolher Outro Jogo</span>
              </button>
              <span className="text-xs font-black text-emerald-300">
                {activeGame === 'freecell'
                  ? 'Paciência FreeCell'
                  : activeGame === 'spider'
                  ? 'Paciência Spider'
                  : 'Paciência Klondike'}
              </span>
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto">
              <SolitaireGame />
            </div>
          </div>
        )}

        {/* TABLETOP SANDBOX SIMULATOR */}
        {activeGame === 'tabletop' && (
          <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
            <div className="shrink-0 p-2 flex items-center justify-between border-b border-slate-800/80 bg-slate-950/80">
              <button
                onClick={handleBackToHub}
                className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Escolher Outro Jogo</span>
              </button>
              <span className="text-xs font-black text-sky-300">Mesa Livre Sandbox</span>
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto">
              <TabletopSimulator
                allCards={allCards}
                activeDeck={activeDeck}
                onInspectCard={onInspectCard}
              />
            </div>
          </div>
        )}

        {/* ALL OTHER RULES ACADEMY CARD GAMES (Copas, Espadas, Sueca, Buraco, Pife, Rummy, Escopa, Mau-Mau, War) */}
        {activeGame &&
          activeGame !== 'poker' &&
          !activeGame.startsWith('truco') &&
          activeGame !== 'blackjack' &&
          !activeGame.includes('solitaire') &&
          activeGame !== 'freecell' &&
          activeGame !== 'spider' &&
          activeGame !== 'tabletop' && (
            <GenericCardGameArena
              gameId={activeGame}
              playerCount={gamePlayerCounts[activeGame] || 4}
              onBack={handleBackToHub}
              onOpenRules={onOpenAcademy}
            />
          )}
      </Suspense>
    </div>
  );
};
