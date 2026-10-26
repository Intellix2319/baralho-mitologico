import React, { useState, useEffect, useMemo, useRef, Suspense } from 'react';
import { useOnlineRoom } from './online/room';
import rawCardsData from './cards_data.json';
import { CardData, CustomDeck, ViewTab, MultiplayerRoom } from './types/deck';
import { CardItem } from './components/CardItem';
import { playSound } from './utils/audio';
import {
  Sparkles,
  Layers,
  Archive,
  Search,
  SlidersHorizontal,
  Flame,
  Volume2,
  VolumeX,
  Dices,
  RotateCcw,
  Gamepad2,
  BookOpen,
  Users,
  Coins,
  Shield,
  Share2,
  Plus,
  Maximize2,
  Minimize2,
  Smartphone,
  Zap,
  Shuffle
} from 'lucide-react';

// Lazy loaded views and heavy modals for maximum mobile performance and low memory footprint
const Academy = React.lazy(() =>
  import('./components/Academy').then((m) => ({ default: m.Academy }))
);
const PlayArena = React.lazy(() =>
  import('./components/PlayArena').then((m) => ({ default: m.PlayArena }))
);
const MultiplayerLobby = React.lazy(() =>
  import('./components/MultiplayerLobby').then((m) => ({ default: m.MultiplayerLobby }))
);
const DeckManager = React.lazy(() =>
  import('./components/DeckManager').then((m) => ({ default: m.DeckManager }))
);
const TabletopSimulator = React.lazy(() =>
  import('./components/TabletopSimulator').then((m) => ({ default: m.TabletopSimulator }))
);
const ChipsModal = React.lazy(() =>
  import('./components/ChipsModal').then((m) => ({ default: m.ChipsModal }))
);

const ViewLoadingFallback = ({ text = 'Carregando' }: { text?: string }) => (
  <div className="flex-1 min-h-0 flex flex-col items-center justify-center p-8 text-center select-none">
    <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-400/40 flex items-center justify-center shadow-xl mb-3">
      <Shuffle className="w-6 h-6 text-amber-400 animate-spin" />
    </div>
    <span className="text-sm font-black text-amber-300">{text}...</span>
  </div>
);

const allCards: CardData[] = rawCardsData as CardData[];

const INITIAL_DECKS: CustomDeck[] = [
  {
    id: 'deck_standard',
    name: 'Baralho Completo Padrão',
    description: 'O conjunto completo das 54 cartas mitológicas em pixel art, com todos os 4 naipes e 2 coringas.',
    tag: 'Completo',
    coverCardId: 'A_S',
    cards: allCards.map((c) => ({ cardId: c.id, count: 1 })),
    createdAt: Date.now(),
    updatedAt: Date.now()
  }
];

// Global Error Boundary to prevent any white-screen crash
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary trapped error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center select-none">
          <div className="bg-slate-900 border border-amber-500/50 rounded-2xl p-6 max-w-md shadow-2xl space-y-3">
            <div className="text-3xl">🏛️</div>
            <h2 className="text-base sm:text-lg font-black text-amber-300">Mesa dos Deuses Reiniciada</h2>
            <p className="text-xs text-slate-300">
              A partida foi estabilizada com sucesso. Suas fichas foram salvas integralmente.
            </p>
            <button
              onClick={() => {
                this.setState({ hasError: false, error: null });
                window.location.reload();
              }}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs shadow-lg transition-all cursor-pointer"
            >
              Retomar Mesa
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  const [activeTab, setActiveTab] = useState<ViewTab>('play');
  const [selectedGameForPlay, setSelectedGameForPlay] = useState<string | null>(null);
  const [isGameActive, setIsGameActive] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSuit, setSelectedSuit] = useState<string>('ALL');
  const [selectedType, setSelectedType] = useState<string>('ALL');

  // Chips Modal & Wallet
  const [isChipsModalOpen, setIsChipsModalOpen] = useState(false);
  const [chipsBalance, setChipsBalance] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('olympus_poker_chips');
      return saved ? parseInt(saved, 10) : 10000;
    } catch {
      return 10000;
    }
  });

  // Lê o saldo guardado (fonte da verdade) e atualiza a tela
  const readStoredChips = (): number | null => {
    try {
      const saved = localStorage.getItem('olympus_poker_chips');
      const val = saved ? parseInt(saved, 10) : NaN;
      return Number.isFinite(val) && val >= 0 ? val : null;
    } catch {
      return null;
    }
  };

  useEffect(() => {
    const handleSync = () => {
      const val = readStoredChips();
      if (val !== null) setChipsBalance(val);
    };
    window.addEventListener('olympus_chips_updated', handleSync);
    window.addEventListener('storage', handleSync); // outra aba mudou o saldo
    window.addEventListener('focus', handleSync); // voltou para esta aba
    return () => {
      window.removeEventListener('olympus_chips_updated', handleSync);
      window.removeEventListener('storage', handleSync);
      window.removeEventListener('focus', handleSync);
    };
  }, []);

  const handleAddChips = (amount: number) => {
    // Soma em cima do saldo guardado (e não do valor da tela, que pode estar atrasado)
    const base = readStoredChips() ?? chipsBalance;
    const next = base + amount;
    setChipsBalance(next);
    try {
      localStorage.setItem('olympus_poker_chips', next.toString());
    } catch (e) {
      console.error(e);
    }
    window.dispatchEvent(new Event('olympus_chips_updated'));
  };

  // Custom Decks state loaded from localStorage
  const [decks, setDecks] = useState<CustomDeck[]>(() => {
    try {
      const saved = localStorage.getItem('pixel_decks_store');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // Fallback
    }
    return INITIAL_DECKS;
  });

  const [activeDeckId, setActiveDeckId] = useState<string>(() => {
    return decks[0]?.id || 'deck_standard';
  });

  useEffect(() => {
    try {
      localStorage.setItem('pixel_decks_store', JSON.stringify(decks));
    } catch (e) {
      console.error(e);
    }
  }, [decks]);

  const activeDeck = useMemo(() => {
    return decks.find((d) => d.id === activeDeckId) || decks[0];
  }, [decks, activeDeckId]);

  // Filtered cards in catalog
  const filteredCards = useMemo(() => {
    return allCards.filter((card) => {
      // Suit filter
      if (selectedSuit !== 'ALL' && card.suitCode !== selectedSuit) return false;
      // Type filter
      if (selectedType !== 'ALL' && card.type !== selectedType) return false;
      // Search
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesName = card.name.toLowerCase().includes(query);
        const matchesTitle = card.title.toLowerCase().includes(query);
        const matchesSuit = card.suit.toLowerCase().includes(query);
        const matchesRank = card.rank.toLowerCase().includes(query);
        return matchesName || matchesTitle || matchesSuit || matchesRank;
      }
      return true;
    });
  }, [selectedSuit, selectedType, searchQuery]);

  // Lightweight Pagination controls
  const [currentPage, setCurrentPage] = useState(1);
  const [showAllInCatalog, setShowAllInCatalog] = useState(true);
  const pageSize = 18;
  const totalPages = Math.ceil(filteredCards.length / pageSize);

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedSuit, selectedType, searchQuery]);

  const paginatedCards = useMemo(() => {
    if (showAllInCatalog || selectedSuit !== 'ALL') return filteredCards;
    const start = (currentPage - 1) * pageSize;
    return filteredCards.slice(start, start + pageSize);
  }, [filteredCards, currentPage, showAllInCatalog, selectedSuit]);

  const handleSelectGameToPlay = (gameId: string) => {
    setSelectedGameForPlay(gameId);
    setActiveTab('play');
    setIsGameActive(true);
  };

  // Sala online: link de convite (?sala=CODIGO) e jogo escolhido no salão
  const [joinCodeFromLink, setJoinCodeFromLink] = useState<string | null>(null);
  const [onlinePreset, setOnlinePreset] = useState<{ gameId: string; playerCount: number } | null>(null);

  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const code = params.get('sala');
      if (code) {
        setJoinCodeFromLink(code);
        setActiveTab('multiplayer');
        window.history.replaceState({}, '', window.location.pathname);
      }
    } catch {}
  }, []);

  // Quando a partida online termina (anfitrião encerrou, saiu ou a sala caiu), volta para a sala
  const onlineRoomState = useOnlineRoom();
  const wasGameActive = useRef(false);
  useEffect(() => {
    if (wasGameActive.current && !onlineRoomState.gameActive) {
      setSelectedGameForPlay(null);
      setActiveTab('multiplayer');
    }
    wasGameActive.current = onlineRoomState.gameActive;
  }, [onlineRoomState.gameActive]);

  const handleOpenOnlineRoom = (gameId: string, playerCount: number) => {
    setOnlinePreset({ gameId, playerCount });
    setActiveTab('multiplayer');
  };

  const handleStartOnlineGame = (gameId: string, _playerCount: number) => {
    setSelectedGameForPlay(gameId);
    setActiveTab('play');
  };

  // Low power mode auto-detection for weaker devices (<= 4 CPU threads)
  const isWeakDevice = typeof navigator !== 'undefined' && (navigator.hardwareConcurrency || 4) <= 4;
  const [isLowPowerMode, setIsLowPowerMode] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('low_power_mode');
      if (saved !== null) return saved === 'true';
      return isWeakDevice;
    } catch {
      return isWeakDevice;
    }
  });

  const toggleLowPowerMode = () => {
    playSound('click');
    setIsLowPowerMode((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('low_power_mode', String(next));
      } catch {}
      return next;
    });
  };

  // Fullscreen API toggle
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  const toggleFullscreen = () => {
    playSound('click');
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
    }
  };

  return (
    <div
      className={`h-[100dvh] w-screen bg-[#070611] text-slate-100 flex flex-col font-sans selection:bg-amber-500 selection:text-black overflow-hidden safe-area-pad ${
        isLowPowerMode ? 'low-power-mode' : ''
      }`}
    >
      {/* Background Star Texture - disabled in low power mode */}
      {!isLowPowerMode && (
        <div
          className="sparkles-bg fixed inset-0 pointer-events-none opacity-20 z-0"
          style={{
            backgroundImage:
              'radial-gradient(1px 1px at 20px 30px, #ffffff, rgba(0,0,0,0)), radial-gradient(1px 1px at 60px 120px, #ffd700, rgba(0,0,0,0)), radial-gradient(1px 1px at 150px 220px, #00f2fe, rgba(0,0,0,0))',
            backgroundSize: '200px 200px'
          }}
        />
      )}

      {/* Top Header (shrink-0) - Hidden during gameplay to give maximum space to the table */}
      {(!isGameActive || activeTab !== 'play') && (
        <header className="shrink-0 z-40 border-b border-amber-500/30 bg-[#0c0a1a]/95 backdrop-blur-md px-3 sm:px-6 lg:px-8 py-2 sm:py-2.5 short:px-2 short:py-1 shadow-2xl">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row short:flex-row items-center justify-between gap-3 short:gap-2">
          {/* Logo & Platform Brand */}
          <div className="flex items-center gap-3 short:gap-2 min-w-0 cursor-pointer select-none" onClick={() => setActiveTab('play')}>
            <div className="relative group">
              <div className="w-10 h-10 short:w-8 short:h-8 short:text-base rounded-2xl bg-gradient-to-br from-amber-300 via-amber-500 to-amber-700 flex items-center justify-center text-slate-950 shadow-lg shadow-amber-500/30 font-black text-xl border-2 border-amber-300 transform group-hover:scale-105 transition-transform">
                ⚡
              </div>
              <div className="absolute -inset-1 rounded-2xl bg-amber-400/20 blur-sm -z-10 group-hover:bg-amber-400/40 transition-colors" />
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="whitespace-nowrap truncate text-sm sm:text-base short:text-xs font-black tracking-tight bg-gradient-to-r from-amber-200 via-amber-300 to-amber-500 bg-clip-text text-transparent">
                  BARALHO DOS DEUSES SOMBRIOS
                </h1>
                <span className="short:hidden text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold uppercase tracking-wider">
                  ARENA OFICIAL
                </span>
              </div>
            </div>
          </div>

          {/* Desktop Navigation Tabs & Free Chips Button */}
          <div className="flex items-center gap-2.5 short:gap-1.5 shrink-0">
            <nav className="hidden sm:flex items-center gap-1.5 short:gap-1 bg-slate-950/90 p-1.5 short:p-1 rounded-2xl border border-amber-500/20 shadow-inner">
              <button
                onClick={() => {
                  playSound('click');
                  setSelectedGameForPlay(null);
                  setActiveTab('play');
                }}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                  activeTab === 'play'
                    ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 shadow-md shadow-amber-500/20 scale-102 font-black'
                    : 'text-slate-400 hover:text-white hover:bg-slate-900/60'
                }`}
              >
                <Gamepad2 className="w-3.5 h-3.5" />
                <span className={activeTab === 'play' ? '' : 'short:hidden'}>Jogar Arena</span>
              </button>

              <button
                onClick={() => {
                  playSound('click');
                  setActiveTab('academy');
                }}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                  activeTab === 'academy'
                    ? 'bg-gradient-to-r from-purple-600 to-purple-700 text-white shadow-md shadow-purple-600/30 scale-102 font-black'
                    : 'text-slate-400 hover:text-white hover:bg-slate-900/60'
                }`}
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span className={activeTab === 'academy' ? '' : 'short:hidden'}>Academia de Regras</span>
              </button>

              <button
                onClick={() => {
                  playSound('click');
                  setActiveTab('multiplayer');
                }}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                  activeTab === 'multiplayer'
                    ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-md shadow-blue-600/30 scale-102 font-black'
                    : 'text-slate-400 hover:text-white hover:bg-slate-900/60'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span className={activeTab === 'multiplayer' ? '' : 'short:hidden'}>Multijogador</span>
              </button>

              <button
                onClick={() => {
                  playSound('click');
                  setActiveTab('catalog');
                }}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                  activeTab === 'catalog'
                    ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20 scale-102 font-black'
                    : 'text-slate-400 hover:text-white hover:bg-slate-900/60'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span className={activeTab === 'catalog' ? '' : 'short:hidden'}>Coleção ({allCards.length})</span>
              </button>
            </nav>

            {/* Modo Leve (Low Power) Toggle Button */}
            <button
              onClick={toggleLowPowerMode}
              className={`min-h-[44px] min-w-[44px] short:min-h-[36px] short:min-w-[36px] px-2.5 py-1.5 rounded-xl border flex items-center gap-1.5 text-xs font-bold transition-all cursor-pointer shadow-md active:scale-95 shrink-0 ${
                isLowPowerMode
                  ? 'bg-emerald-500/25 border-emerald-400/80 text-emerald-300'
                  : 'bg-slate-950/90 hover:bg-slate-900 border-amber-500/30 text-slate-400 hover:text-white'
              }`}
              title={
                isLowPowerMode
                  ? 'Modo Leve ATIVADO (Mais rápido em celulares)'
                  : 'Ativar Modo Leve (Para economizar bateria e rodar super liso)'
              }
            >
              <Zap className={`w-3.5 h-3.5 ${isLowPowerMode ? 'text-emerald-400' : 'text-amber-400'}`} />
              <span className="hidden md:inline">{isLowPowerMode ? 'Modo Leve' : 'Leve'}</span>
            </button>

            {/* Interactive Virtual Chips Button (Opens Free Chips Modal) */}
            <button
              onClick={() => {
                playSound('click');
                setIsChipsModalOpen(true);
              }}
              className="min-h-[44px] short:min-h-[36px] short:px-2 short:gap-1 flex items-center gap-2 bg-gradient-to-r from-amber-500/20 to-amber-600/30 hover:from-amber-500/30 hover:to-amber-600/40 border border-amber-500/50 px-3.5 py-1.5 rounded-xl text-xs font-bold text-amber-300 shadow-lg active:scale-95 transition-all cursor-pointer"
              title="Clique para pegar fichas 100% grátis"
            >
              <Coins className="w-4 h-4 text-amber-400 animate-pulse" />
              <span>{chipsBalance.toLocaleString()}<span className="short:hidden"> Fichas</span></span>
              <span className="short:hidden bg-amber-500 text-black px-1.5 py-0.2 rounded text-[10px] font-black uppercase">
                +Grátis
              </span>
            </button>

            {/* Fullscreen API Toggle Button for Mobile & Desktop */}
            <button
              onClick={toggleFullscreen}
              className="w-9 h-9 min-w-[44px] min-h-[44px] short:min-w-[36px] short:min-h-[36px] short:w-8 short:h-8 sm:w-10 sm:h-10 rounded-xl bg-slate-950/90 hover:bg-slate-900 border border-amber-500/30 text-amber-300 flex items-center justify-center transition-all cursor-pointer shadow-md active:scale-95 shrink-0"
              title={isFullscreen ? 'Sair da Tela Cheia' : 'Entrar em Tela Cheia (Ocultar navegador)'}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </header>
      )}

      {/* Main Content View Switcher */}
      <main className="flex-1 min-h-0 flex flex-col overflow-hidden z-10">
        <ErrorBoundary>
          <Suspense fallback={<ViewLoadingFallback text="Carregando" />}>
            {/* TAB 1: PLAY ARENA */}
            {activeTab === 'play' && (
              <PlayArena
                initialGame={selectedGameForPlay}
                onGameActiveChange={setIsGameActive}
                onOpenAcademy={() => {
                  playSound('click');
                  setActiveTab('academy');
                }}
                onOpenOnlineRoom={handleOpenOnlineRoom}
              />
            )}

            {/* TAB 2: ACADEMY & RULES ENCYCLOPEDIA */}
            {activeTab === 'academy' && (
              <Academy onSelectGameToPlay={handleSelectGameToPlay} />
            )}

            {/* TAB 3: MULTIPLAYER LOBBY */}
            {activeTab === 'multiplayer' && (
              <div className="flex-1 min-h-0 overflow-y-auto">
                <MultiplayerLobby
                  initialJoinCode={joinCodeFromLink}
                  presetGame={onlinePreset}
                  onStartOnlineGame={handleStartOnlineGame}
                />
              </div>
            )}

          {/* TAB 4: DECK CATALOG */}
          {activeTab === 'catalog' && (
            <div className="flex-1 min-h-0 overflow-y-auto">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
            {/* Catalog Filter Controls */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl space-y-4">
              <div className="flex flex-col sm:flex-row gap-3 justify-between items-start sm:items-center">
                {/* Suit Pills */}
                <div className="flex flex-wrap items-center gap-1.5 w-full">
                  <button
                    onClick={() => {
                      playSound('click');
                      setSelectedSuit('ALL');
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      selectedSuit === 'ALL'
                        ? 'bg-amber-500 text-black shadow-md'
                        : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                    }`}
                  >
                    Todos Naipes
                  </button>

                  {[
                    { code: 'S', symbol: '♠', name: 'Espadas', color: '#00f2fe' },
                    { code: 'H', symbol: '♥', name: 'Copas', color: '#ff3366' },
                    { code: 'D', symbol: '♦', name: 'Ouros Dourado', color: '#f59e0b' },
                    { code: 'C', symbol: '♣', name: 'Paus Ossos', color: '#22c55e' },
                    { code: 'X', symbol: '★', name: 'Coringas', color: '#ecc13b' }
                  ].map((s) => (
                    <button
                      key={s.code}
                      onClick={() => {
                        playSound('click');
                        setSelectedSuit(s.code);
                      }}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                        selectedSuit === s.code
                          ? 'bg-amber-500 text-black shadow-md'
                          : 'bg-slate-950 text-slate-300 hover:text-white border border-slate-800'
                      }`}
                    >
                      <span style={{ color: selectedSuit === s.code ? '#000' : s.color }}>
                        {s.symbol}
                      </span>
                      <span>{s.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Secondary filters: Type Only (No foil clutter) */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-800/80 text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-slate-400 font-bold">Tipo:</span>
                  {['ALL', 'ace', 'court', 'number', 'joker'].map((t) => (
                    <button
                      key={t}
                      onClick={() => {
                        playSound('click');
                        setSelectedType(t);
                      }}
                      className={`px-2.5 py-1 rounded-lg font-bold capitalize transition-colors ${
                        selectedType === t
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {t === 'ALL'
                        ? 'Todos'
                        : t === 'ace'
                        ? 'Áses'
                        : t === 'court'
                        ? 'Corte (J, Q, K)'
                        : t === 'number'
                        ? 'Números (2-10)'
                        : 'Coringas'}
                    </button>
                  ))}
                </div>

                <div className="text-xs text-slate-400">
                  <span>Dica: Clique em qualquer carta para virar 3D</span>
                </div>
              </div>
            </div>

            {/* Cards Grid: Clicking flips the card smoothly! */}
            {paginatedCards.length === 0 ? (
              <div className="p-16 text-center rounded-2xl bg-slate-950/40 border border-dashed border-slate-800 text-slate-400 space-y-2">
                <Search className="w-10 h-10 mx-auto text-slate-600" />
                <div className="text-base font-bold text-slate-300">Nenhuma carta encontrada</div>
                <div className="text-xs">Tente ajustar seus filtros ou termo de busca.</div>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {paginatedCards.map((card) => (
                  <CardItem
                    key={card.id}
                    card={card}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Footer inside catalog view where scrolling is natural */}
          <footer className="mt-12 border-t border-slate-900 bg-black/60 px-6 py-6 text-center text-xs text-slate-500 font-mono">
            <div>Baralho dos Deuses Sombrios • Plataforma Completa de Jogos Tradicionais de Cartas</div>
            <div className="text-[11px] text-slate-600 mt-1">
              Gratuito, sem comerciais, otimizado para celulares e desktops • Pixel Art Mitológico Exclusivo
            </div>
          </footer>
        </div>
      )}
          </Suspense>
        </ErrorBoundary>
      </main>

      {/* Free Chips Claiming Modal (Mounted only when active) */}
      {isChipsModalOpen && (
        <Suspense fallback={null}>
          <ChipsModal
            isOpen={isChipsModalOpen}
            onClose={() => setIsChipsModalOpen(false)}
            currentChips={chipsBalance}
            onAddChips={handleAddChips}
          />
        </Suspense>
      )}

      {/* Mobile Sticky Bottom Navigation (shrink-0, fits within flex column) */}
      <div className="sm:hidden shrink-0 bg-slate-950/95 border-t border-slate-800 px-4 py-1.5 flex items-center justify-around z-40 backdrop-blur-md">
        <button
          onClick={() => {
            playSound('click');
            setActiveTab('play');
          }}
          className={`flex flex-col items-center py-1 px-3 rounded-xl transition-all cursor-pointer ${
            activeTab === 'play' ? 'text-amber-400 font-bold scale-105' : 'text-slate-400'
          }`}
        >
          <Gamepad2 className="w-5 h-5" />
          <span className="text-[10px] mt-0.5">Jogar</span>
        </button>

        <button
          onClick={() => {
            playSound('click');
            setActiveTab('academy');
          }}
          className={`flex flex-col items-center py-1 px-3 rounded-xl transition-all cursor-pointer ${
            activeTab === 'academy' ? 'text-purple-400 font-bold scale-105' : 'text-slate-400'
          }`}
        >
          <BookOpen className="w-5 h-5" />
          <span className="text-[10px] mt-0.5">Regras</span>
        </button>

        <button
          onClick={() => {
            playSound('click');
            setIsChipsModalOpen(true);
          }}
          className="flex flex-col items-center py-1 px-3 rounded-xl text-amber-400 font-bold cursor-pointer"
        >
          <Coins className="w-5 h-5" />
          <span className="text-[10px] mt-0.5">Fichas</span>
        </button>

        <button
          onClick={() => {
            playSound('click');
            setActiveTab('catalog');
          }}
          className={`flex flex-col items-center py-1 px-3 rounded-xl transition-all cursor-pointer ${
            activeTab === 'catalog' ? 'text-amber-400 font-bold scale-105' : 'text-slate-400'
          }`}
        >
          <Sparkles className="w-5 h-5" />
          <span className="text-[10px] mt-0.5">Baralho</span>
        </button>
      </div>

      {/* Mobile Portrait Orientation Prompt (Shows only on mobile when in portrait mode) */}
      <div className="rotate-device-overlay fixed inset-0 z-[9999] bg-[#070611]/98 backdrop-blur-xl flex flex-col items-center justify-center p-6 text-center select-none text-white">
        <div className="relative mb-6">
          <div className="w-24 h-24 rounded-3xl bg-amber-500/10 border-2 border-amber-400/50 flex items-center justify-center shadow-2xl shadow-amber-500/30">
            <Smartphone className="w-12 h-12 text-amber-400 animate-rotate-phone" />
          </div>
          <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center font-black text-sm shadow">
            ↻
          </div>
        </div>

        <h2 className="text-2xl font-black text-amber-300 tracking-tight mb-2">
          Gire o Celular para Jogar
        </h2>
        <p className="text-sm text-slate-300 max-w-xs mb-6 leading-relaxed">
          Para ver a mesa completa, adversários e suas cartas com máxima nitidez, utilize a orientação horizontal (paisagem).
        </p>

        <div className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-slate-900 border border-amber-500/40 text-xs font-mono font-bold text-amber-400 shadow-inner">
          <span>Orientação Paisagem Obrigatória</span>
        </div>
      </div>
    </div>
  );
}
