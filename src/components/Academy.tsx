import React, { useState, useMemo } from 'react';
import { GAME_RULES_DATABASE } from '../data/gameRulesData';
import { GameRuleInfo } from '../types/deck';
import {
  BookOpen,
  Search,
  Sparkles,
  Trophy,
  Brain,
  PlayCircle,
  CheckCircle2,
  Zap,
  Flame,
  Shield,
  HelpCircle
} from 'lucide-react';
import { playSound } from '../utils/audio';

interface AcademyProps {
  onSelectGameToPlay: (gameId: string) => void;
}

export const Academy: React.FC<AcademyProps> = ({ onSelectGameToPlay }) => {
  const [selectedGameId, setSelectedGameId] = useState<string>('poker');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const filteredGames = useMemo(() => {
    return GAME_RULES_DATABASE.filter((g) => {
      if (selectedCategory !== 'ALL' && g.category !== selectedCategory) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          g.title.toLowerCase().includes(q) ||
          g.overview.toLowerCase().includes(q) ||
          g.category.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [selectedCategory, searchQuery]);

  const activeGame: GameRuleInfo = useMemo(() => {
    return GAME_RULES_DATABASE.find((g) => g.id === selectedGameId) || GAME_RULES_DATABASE[0];
  }, [selectedGameId]);

  const handleSelectGame = (id: string) => {
    playSound('click');
    setSelectedGameId(id);
  };

  return (
    <div className="h-full max-h-full flex flex-col overflow-y-auto overscroll-contain md:overflow-hidden max-w-7xl mx-auto w-full px-2 sm:px-6 py-2 sm:py-3 short:py-1 select-none">
      {/* Top Banner: Direct & Clean (shrink-0) */}
      <div className="shrink-0 mb-3 short:hidden rounded-2xl bg-gradient-to-r from-[#1a1202] via-[#0d0918] to-[#120a21] border border-amber-500/30 p-3 sm:p-4 short:p-2 shadow-xl flex flex-col md:flex-row short:flex-row items-start md:items-center justify-between gap-3 short:gap-2">
        <div>
          <div className="short:hidden inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-black uppercase tracking-wider mb-1">
            <BookOpen className="w-3 h-3" />
            <span>Guia Rápido & Prático de Regras</span>
          </div>
          <h1 className="text-base sm:text-xl font-black text-amber-100">
            Aprenda as Regras em Menos de 1 Minuto
          </h1>
          <p className="short:hidden text-[11px] sm:text-xs text-slate-300 mt-0.5 max-w-xl line-clamp-1 sm:line-clamp-none">
            Sem termos complicados: veja como ganhar, a ordem das cartas mais fortes e as jogadas fundamentais de cada modalidade.
          </p>
        </div>

        <button
          onClick={() => onSelectGameToPlay(activeGame.id)}
          className="px-4 sm:px-6 py-2 sm:py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs sm:text-sm shadow-xl shadow-amber-500/20 active:scale-95 transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer shrink-0"
        >
          <PlayCircle className="w-4 sm:w-5 h-4 sm:h-5" />
          <span>Jogar {activeGame.title.split(' ')[0]} Agora</span>
        </button>
      </div>

      {/* Main Grid: Game Selection Bar + Practical Content */}
      <div className="shrink-0 md:shrink md:flex-1 md:min-h-0 grid grid-cols-1 md:grid-cols-12 gap-3 sm:gap-4 short:gap-2 md:overflow-hidden">
        {/* Left Column: Quick Game List */}
        <div className="md:col-span-4 flex flex-col min-h-0 max-h-60 md:max-h-none overflow-hidden bg-slate-900/90 border border-slate-800 rounded-2xl p-2.5 sm:p-3 shadow-lg">
          <div className="shrink-0 space-y-2 mb-2">
            {/* Search */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar jogo (Poker, Truco, 21)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-slate-950 border border-slate-700/80 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
              />
            </div>

            {/* Category Pills */}
            <div className="flex flex-wrap gap-1">
              {['ALL', 'Cassino', 'Truco', 'Paciência'].map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`text-[10px] sm:text-[11px] font-bold px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg transition-colors cursor-pointer ${
                    selectedCategory === cat
                      ? 'bg-amber-500 text-black shadow-md font-black'
                      : 'bg-slate-800 text-slate-300 hover:text-white'
                  }`}
                >
                  {cat === 'ALL' ? 'Todos' : cat}
                </button>
              ))}
            </div>
          </div>

          {/* Games list cards - Independent scrolling */}
          <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain touch-pan-y pr-1 space-y-1.5">
            {filteredGames.map((game) => {
              const isSelected = game.id === activeGame.id;
              return (
                <button
                  key={game.id}
                  onClick={() => handleSelectGame(game.id)}
                  className={`w-full text-left p-2.5 sm:p-3 rounded-xl border transition-all flex items-center justify-between gap-3 cursor-pointer ${
                    isSelected
                      ? 'bg-amber-500/20 border-amber-400 shadow-lg shadow-amber-500/10'
                      : 'bg-slate-900/60 border-slate-800 hover:bg-slate-800/80 text-slate-300'
                  }`}
                >
                  <div>
                    <div className="text-xs font-black text-slate-100 flex items-center gap-1.5">
                      <span className={isSelected ? 'text-amber-400' : 'text-slate-400'}>
                        {game.category === 'Truco' ? '🔥' : game.category === 'Cassino' ? '🪙' : '🃏'}
                      </span>
                      <span>{game.title}</span>
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5 line-clamp-1">
                      {game.players} • {game.category}
                    </div>
                  </div>
                  {isSelected && (
                    <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Column: Visual Rule Sheet with INTERNAL SCROLL ONLY on explanation */}
        <div className="md:col-span-8 flex flex-col md:min-h-0 md:overflow-hidden bg-slate-900/95 border-2 border-amber-500/40 rounded-2xl shadow-2xl">
          {/* Header of Active Game (shrink-0) */}
          <div className="shrink-0 p-3 sm:p-4 short:p-2 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2 bg-slate-950/60">
            <div>
              <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold">
                {activeGame.category}
              </span>
              <h2 className="text-base sm:text-lg font-black text-amber-200 mt-1">
                {activeGame.title}
              </h2>
            </div>

            <div className="text-xs text-slate-400 font-medium short:hidden">
              {activeGame.deckType}
            </div>
            <button
              onClick={() => onSelectGameToPlay(activeGame.id)}
              className="hidden short:flex px-3 py-1.5 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-black text-xs items-center gap-1.5 whitespace-nowrap cursor-pointer shrink-0 active:scale-95"
            >
              <PlayCircle className="w-4 h-4" />
              <span>Jogar {activeGame.title.split(' ')[0]}</span>
            </button>
          </div>

          {/* DEDICATED SCROLLABLE EXPLANATION CONTENT AREA */}
          <div className="md:flex-1 md:min-h-0 md:overflow-y-auto md:overscroll-contain md:touch-pan-y p-3.5 sm:p-5 short:p-2.5 space-y-4 short:space-y-2.5">
            {/* Objective in 1 clean box */}
            <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-400/30 flex items-start gap-3">
              <Zap className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <div className="text-xs font-black text-amber-300 uppercase tracking-wider">
                  Como Ganhar (Objetivo Rápido)
                </div>
                <div className="text-xs sm:text-sm text-slate-200 font-medium mt-0.5">
                  {activeGame.objective}
                </div>
              </div>
            </div>

            {/* Visual Ranking of Hands / Cards */}
            {(activeGame.combinations || []).length > 0 && (
              <div>
                <div className="text-xs font-black text-slate-300 uppercase tracking-wider flex items-center gap-2 mb-2">
                  <Trophy className="w-4 h-4 text-amber-400" />
                  <span>Força das Cartas & Combinações (Da Mais Forte para a Menor)</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {(activeGame.combinations || []).map((comb, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-between gap-2 hover:border-amber-500/40 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-md bg-amber-500/20 text-amber-300 text-[10px] font-mono font-black flex items-center justify-center shrink-0">
                          {idx + 1}
                        </span>
                        <div>
                          <div className="text-xs font-black text-slate-100">{comb.name}</div>
                          <div className="text-[11px] text-slate-400">{comb.description}</div>
                        </div>
                      </div>
                      <span className="text-[10px] font-bold text-amber-400/90 whitespace-nowrap">
                        {comb.payoutOrPoints}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Step-by-Step Gameplay (Simplified) */}
            <div>
              <div className="text-xs font-black text-slate-300 uppercase tracking-wider flex items-center gap-2 mb-2">
                <Sparkles className="w-4 h-4 text-emerald-400" />
                <span>Passo a Passo da Partida</span>
              </div>

              <div className="space-y-1.5">
                {activeGame.rules.map((rule, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded-xl bg-slate-950/50 border border-slate-800/80 flex items-start gap-2.5 text-xs text-slate-300"
                  >
                    <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-black flex items-center justify-center shrink-0 mt-0.5">
                      {idx + 1}
                    </span>
                    <span>{rule}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Master Tip */}
            {activeGame.tactics.length > 0 && (
              <div className="p-3 rounded-xl bg-purple-950/40 border border-purple-500/30 flex items-start gap-3">
                <Brain className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
                <div>
                  <div className="text-[11px] font-bold text-purple-300 uppercase tracking-wider">
                    Dica de Ouro do Mestre
                  </div>
                  <div className="text-xs text-slate-300 mt-0.5">
                    {activeGame.tactics[0]}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
