import React, { useState } from 'react';
import { CardData, CustomDeck } from '../types/deck';
import { playSound } from '../utils/audio';
import { exportDeckAsZip } from '../utils/exporter';
import {
  FolderPlus,
  Trash2,
  Copy,
  Download,
  Upload,
  Layers,
  Sparkles,
  BarChart3,
  Plus,
  Minus,
  Check,
  Package
} from 'lucide-react';

interface DeckManagerProps {
  allCards: CardData[];
  decks: CustomDeck[];
  activeDeckId: string;
  onSelectDeck: (deckId: string) => void;
  onCreateDeck: (name: string, description: string, tag: string) => void;
  onUpdateDeck: (updated: CustomDeck) => void;
  onDeleteDeck: (deckId: string) => void;
  onInspectCard: (card: CardData) => void;
  onUpdateDeckCardCount: (card: CardData, delta: number) => void;
}

export const DeckManager: React.FC<DeckManagerProps> = ({
  allCards,
  decks,
  activeDeckId,
  onSelectDeck,
  onCreateDeck,
  onUpdateDeck,
  onDeleteDeck,
  onInspectCard,
  onUpdateDeckCardCount
}) => {
  const [showNewModal, setShowNewModal] = useState(false);
  const [newDeckName, setNewDeckName] = useState('');
  const [newDeckDesc, setNewDeckDesc] = useState('');
  const [newDeckTag, setNewDeckTag] = useState('Personalizado');
  const [isExportingZip, setIsExportingZip] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportStatus, setExportStatus] = useState('');

  const activeDeck = decks.find((d) => d.id === activeDeckId) || decks[0];

  // Calculate deck stats
  const totalCount = activeDeck.cards.reduce((sum, item) => sum + item.count, 0);

  const suitCounts: Record<string, number> = { S: 0, H: 0, D: 0, C: 0, X: 0 };
  const rankCurve: Record<string, number> = {};

  activeDeck.cards.forEach((entry) => {
    const card = allCards.find((c) => c.id === entry.cardId);
    if (!card) return;
    suitCounts[card.suitCode] = (suitCounts[card.suitCode] || 0) + entry.count;
    const rankLabel = ['J', 'Q', 'K'].includes(card.rank) ? card.rank : card.rank === 'A' ? 'Ás' : card.rank === 'JOKER' ? '★' : card.rank;
    rankCurve[rankLabel] = (rankCurve[rankLabel] || 0) + entry.count;
  });

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDeckName.trim()) return;
    playSound('chime');
    onCreateDeck(newDeckName.trim(), newDeckDesc.trim(), newDeckTag);
    setNewDeckName('');
    setNewDeckDesc('');
    setShowNewModal(false);
  };

  const handleDuplicate = (deck: CustomDeck) => {
    playSound('click');
    const dup: CustomDeck = {
      ...deck,
      id: 'deck_' + Date.now(),
      name: `${deck.name} (Cópia)`,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    onUpdateDeck(dup);
    onSelectDeck(dup.id);
  };

  const handleExportZip = async () => {
    playSound('click');
    setIsExportingZip(true);
    setExportProgress(5);
    setExportStatus('Iniciando exportação...');

    const cardsToExport = activeDeck.cards
      .map((entry) => {
        const c = allCards.find((card) => card.id === entry.cardId);
        return c ? { card: c, count: entry.count } : null;
      })
      .filter(Boolean) as { card: CardData; count: number }[];

    try {
      await exportDeckAsZip(
        activeDeck.name,
        cardsToExport,
        '2x',
        (pct, status) => {
          setExportProgress(pct);
          setExportStatus(status);
        }
      );
      playSound('chime');
    } finally {
      setIsExportingZip(false);
    }
  };

  const handleExportJson = () => {
    playSound('click');
    const jsonStr = JSON.stringify(activeDeck, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `deck_${activeDeck.name.replace(/\s+/g, '_')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (parsed.name && Array.isArray(parsed.cards)) {
          const newDeck: CustomDeck = {
            ...parsed,
            id: 'deck_' + Date.now(),
            createdAt: Date.now(),
            updatedAt: Date.now()
          };
          onUpdateDeck(newDeck);
          onSelectDeck(newDeck.id);
          playSound('chime');
        }
      } catch {
        // Invalid json
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Deck Selector */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-950 to-amber-950/40 border border-amber-500/30 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-mono uppercase bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold">
              {activeDeck.tag}
            </span>
            <span className="text-xs text-slate-400 font-mono">
              {totalCount} cartas no deck
            </span>
          </div>
          <h2 className="text-2xl font-black text-amber-100 tracking-tight flex items-center gap-2">
            <Package className="w-6 h-6 text-amber-400" />
            <span>{activeDeck.name}</span>
          </h2>
          <p className="text-sm text-slate-400 max-w-xl">
            {activeDeck.description || 'Monte, personalize e exporte seu baralho com as figuras dos Deuses Sombrios.'}
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => {
              playSound('click');
              setShowNewModal(true);
            }}
            className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-sm flex items-center gap-2 shadow-lg shadow-amber-500/20 transition-all active:scale-95"
          >
            <FolderPlus className="w-4 h-4" />
            <span>Criar Novo Deck</span>
          </button>

          <label
            title="Importar Deck (JSON)"
            className="p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
          >
            <Upload className="w-4 h-4" />
            <input
              type="file"
              accept=".json"
              onChange={handleImportJson}
              className="hidden"
            />
          </label>
        </div>
      </div>

      {/* Export progress bar if exporting */}
      {isExportingZip && (
        <div className="p-4 rounded-xl bg-amber-950/40 border border-amber-500/40 space-y-2">
          <div className="flex justify-between text-xs font-mono text-amber-200">
            <span>{exportStatus}</span>
            <span>{exportProgress}%</span>
          </div>
          <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden">
            <div
              className="bg-amber-500 h-full transition-all duration-300"
              style={{ width: `${exportProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* Decks Switcher Carousel / Grid */}
      <div className="space-y-2">
        <div className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
          <Layers className="w-4 h-4 text-amber-400" />
          <span>Seus Decks Salvos ({decks.length})</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          {decks.map((deck) => {
            const count = deck.cards.reduce((sum, c) => sum + c.count, 0);
            const isSelected = deck.id === activeDeckId;

            return (
              <div
                key={deck.id}
                onClick={() => {
                  playSound('click');
                  onSelectDeck(deck.id);
                }}
                className={`p-4 rounded-xl border text-left cursor-pointer transition-all relative ${
                  isSelected
                    ? 'bg-amber-500/10 border-amber-400 shadow-lg shadow-amber-500/10'
                    : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 hover:bg-slate-900'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="text-xs font-mono px-2 py-0.5 rounded bg-slate-800 text-amber-300 font-bold">
                    {deck.tag}
                  </div>
                  {isSelected && (
                    <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                  )}
                </div>

                <div className="mt-2 font-bold text-amber-100 text-sm truncate">
                  {deck.name}
                </div>
                <div className="text-xs text-slate-400 font-mono mt-0.5">
                  {count} cartas
                </div>

                {/* Sub controls */}
                <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDuplicate(deck);
                    }}
                    title="Duplicar Deck"
                    className="hover:text-amber-300 p-1"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>

                  {decks.length > 1 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        playSound('click');
                        onDeleteDeck(deck.id);
                      }}
                      title="Excluir Deck"
                      className="hover:text-red-400 p-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Deck Analytics: Suit Breakdown & Power Distribution */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Suit Breakdown */}
        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-3">
          <div className="text-xs font-bold uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
            <BarChart3 className="w-4 h-4 text-amber-400" />
            <span>Distribuição de Naipes</span>
          </div>

          <div className="grid grid-cols-5 gap-2 text-center">
            {[
              { code: 'S', name: 'Espadas', sym: '♠', color: '#00f2fe' },
              { code: 'H', name: 'Copas', sym: '♥', color: '#ff3366' },
              { code: 'D', name: 'Ouros', sym: '♦', color: '#3b82f6' },
              { code: 'C', name: 'Paus', sym: '♣', color: '#22c55e' },
              { code: 'X', name: 'Jokers', sym: '★', color: '#ecc13b' }
            ].map((s) => {
              const count = suitCounts[s.code] || 0;
              const pct = totalCount > 0 ? Math.round((count / totalCount) * 100) : 0;
              return (
                <div key={s.code} className="p-2 rounded-lg bg-slate-950/80 border border-slate-800">
                  <div style={{ color: s.color }} className="text-xl font-black">
                    {s.sym}
                  </div>
                  <div className="text-xs font-bold text-slate-200 mt-1">
                    {count}x
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono">
                    {pct}%
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Value Curve */}
        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-3">
          <div className="text-xs font-bold uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>Curva de Poder / Ranks</span>
          </div>

          <div className="flex items-end justify-between h-20 pt-2 px-1 gap-1">
            {['Ás', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', '★'].map((rk) => {
              const count = rankCurve[rk] || 0;
              const maxCount = Math.max(...Object.values(rankCurve), 4);
              const heightPct = Math.max((count / maxCount) * 100, 10);

              return (
                <div key={rk} className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
                  <span className="text-[10px] text-amber-300 font-mono font-bold">
                    {count > 0 ? count : ''}
                  </span>
                  <div
                    style={{ height: `${heightPct}%` }}
                    className={`w-full rounded-t transition-all ${
                      count > 0 ? 'bg-amber-400' : 'bg-slate-800'
                    }`}
                  />
                  <span className="text-[10px] text-slate-400 font-mono">
                    {rk}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Cards inside active deck */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="text-sm font-bold text-amber-200 flex items-center gap-2">
            <span>Cartas no Deck</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono">
              {activeDeck.cards.length} cartas distintas • {totalCount} total
            </span>
          </div>
        </div>

        {activeDeck.cards.length === 0 ? (
          <div className="p-12 text-center rounded-2xl bg-slate-900/40 border border-dashed border-slate-800 text-slate-400 space-y-2">
            <Package className="w-10 h-10 mx-auto text-slate-600" />
            <div className="text-base font-bold text-slate-300">Este deck está vazio</div>
            <div className="text-xs">
              Vá para a aba "Catálogo de Cartas" e clique em "+" em qualquer carta para adicioná-la a este deck.
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {activeDeck.cards.map((entry) => {
              const card = allCards.find((c) => c.id === entry.cardId);
              if (!card) return null;

              return (
                <div
                  key={card.id}
                  className="group relative rounded-xl bg-slate-900/80 border border-amber-500/20 hover:border-amber-400/60 p-2 transition-all flex flex-col items-center"
                >
                  <div
                    onClick={() => onInspectCard(card)}
                    className="cursor-pointer w-full aspect-[640/1120] rounded-lg overflow-hidden relative shadow-md"
                  >
                    <img
                      src={`/assets/deck/thumb/${card.file.replace('.png', '.webp')}`}
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = `/assets/deck/${card.file}`;
                      }}
                      alt={card.name}
                      className="w-full h-full object-cover rendering-pixelated"
                      loading="lazy"
                    />
                  </div>

                  <div className="mt-2 text-center w-full px-1">
                    <div className="text-xs font-bold text-amber-200 truncate flex items-center justify-center gap-1">
                      <span style={{ color: card.color }}>{card.suitSymbol}</span>
                      <span>{card.name}</span>
                    </div>
                  </div>

                  {/* Quantity controls */}
                  <div className="mt-2 w-full flex items-center justify-between bg-slate-950 px-2 py-1 rounded-lg border border-slate-800">
                    <button
                      onClick={() => onUpdateDeckCardCount(card, -1)}
                      className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="text-xs font-mono font-bold text-amber-300">
                      {entry.count}x
                    </span>
                    <button
                      onClick={() => onUpdateDeckCardCount(card, 1)}
                      className="p-1 rounded text-amber-400 hover:text-white hover:bg-amber-600"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal: Create New Deck */}
      {showNewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <form
            onSubmit={handleCreateSubmit}
            className="w-full max-w-md bg-slate-950 border border-amber-500/40 rounded-2xl p-6 shadow-2xl space-y-4"
          >
            <h3 className="text-lg font-black text-amber-100 flex items-center gap-2">
              <FolderPlus className="w-5 h-5 text-amber-400" />
              <span>Criar Novo Deck Personalizado</span>
            </h3>

            <div className="space-y-1">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-300">
                Nome do Deck
              </label>
              <input
                type="text"
                required
                value={newDeckName}
                onChange={(e) => setNewDeckName(e.target.value)}
                placeholder="Ex: Olimpo Sombrio 30"
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white focus:border-amber-400 focus:outline-none text-sm"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-300">
                Descrição (Opcional)
              </label>
              <textarea
                rows={2}
                value={newDeckDesc}
                onChange={(e) => setNewDeckDesc(e.target.value)}
                placeholder="Ex: Focado em cartas com alto valor mítico e figuras de combate."
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white focus:border-amber-400 focus:outline-none text-sm resize-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-300">
                Categoria / Tag
              </label>
              <div className="flex flex-wrap gap-2">
                {['Poker', 'Balatro', 'TCG', 'Competitivo', 'Personalizado', 'Temático'].map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setNewDeckTag(t)}
                    className={`px-3 py-1 rounded-lg text-xs font-mono font-bold transition-colors ${
                      newDeckTag === t
                        ? 'bg-amber-500 text-black'
                        : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowNewModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-900 text-slate-300 hover:text-white text-sm font-semibold"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-sm shadow-md shadow-amber-500/20"
              >
                Criar Deck
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
