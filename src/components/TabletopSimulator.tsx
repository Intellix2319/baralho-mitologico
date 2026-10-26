import React, { useState, useEffect } from 'react';
import { CardData, CustomDeck } from '../types/deck';
import { playSound } from '../utils/audio';
import { RotateCw, Shuffle, Hand, Trash2, Eye, Plus, Sparkles } from 'lucide-react';

interface TabletopCard {
  uid: string;
  card: CardData;
  x: number;
  y: number;
  isFlipped: boolean;
  zIndex: number;
}

interface TabletopSimulatorProps {
  allCards: CardData[];
  activeDeck: CustomDeck;
  onInspectCard: (card: CardData) => void;
}

export const TabletopSimulator: React.FC<TabletopSimulatorProps> = ({
  allCards,
  activeDeck,
  onInspectCard
}) => {
  const [deckPile, setDeckPile] = useState<CardData[]>([]);
  const [tableCards, setTableCards] = useState<TabletopCard[]>([]);
  const [draggingCardUid, setDraggingCardUid] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [topZ, setTopZ] = useState(10);
  const [isShuffling, setIsShuffling] = useState(false);

  // Initialize deck pile from active deck
  const resetDeck = () => {
    const list: CardData[] = [];
    activeDeck.cards.forEach((entry) => {
      const card = allCards.find((c) => c.id === entry.cardId);
      if (card) {
        for (let i = 0; i < entry.count; i++) {
          list.push(card);
        }
      }
    });
    // Shuffle array (Fisher-Yates)
    for (let i = list.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [list[i], list[j]] = [list[j], list[i]];
    }
    setDeckPile(list);
    setTableCards([]);
  };

  useEffect(() => {
    resetDeck();
  }, [activeDeck.id]);

  const handleShuffle = () => {
    playSound('shuffle');
    setIsShuffling(true);
    setTimeout(() => {
      setDeckPile((prev) => {
        const next = [...prev];
        for (let i = next.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [next[i], next[j]] = [next[j], next[i]];
        }
        return next;
      });
      setIsShuffling(false);
    }, 450);
  };

  const handleDrawOne = () => {
    if (deckPile.length === 0) return;
    playSound('deal');
    const nextCard = deckPile[0];
    setDeckPile(deckPile.slice(1));

    // Place card with slight random offset in central table area
    const newUid = 'tcard_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
    const newZ = topZ + 1;
    setTopZ(newZ);

    setTableCards((prev) => [
      ...prev,
      {
        uid: newUid,
        card: nextCard,
        x: 280 + (Math.random() * 80 - 40),
        y: 120 + (Math.random() * 60 - 30),
        isFlipped: false, // Face up
        zIndex: newZ
      }
    ]);
  };

  const handleDealHand = (count = 5) => {
    if (deckPile.length === 0) return;
    playSound('shuffle');
    const toDraw = Math.min(count, deckPile.length);
    const drawn = deckPile.slice(0, toDraw);
    setDeckPile(deckPile.slice(toDraw));

    let curZ = topZ;
    const newTableCards: TabletopCard[] = drawn.map((card, i) => {
      curZ += 1;
      return {
        uid: 'tcard_' + Date.now() + '_' + i,
        card,
        x: 100 + i * 115,
        y: 220,
        isFlipped: false,
        zIndex: curZ
      };
    });

    setTopZ(curZ);
    setTableCards((prev) => [...prev, ...newTableCards]);
  };

  const handleFlipCard = (uid: string, e: React.MouseEvent) => {
    e.stopPropagation();
    playSound('flip');
    setTableCards((prev) =>
      prev.map((c) => (c.uid === uid ? { ...c, isFlipped: !c.isFlipped } : c))
    );
  };

  const handleCardMouseDown = (uid: string, e: React.MouseEvent) => {
    const card = tableCards.find((c) => c.uid === uid);
    if (!card) return;
    playSound('click');
    const newZ = topZ + 1;
    setTopZ(newZ);

    setTableCards((prev) =>
      prev.map((c) => (c.uid === uid ? { ...c, zIndex: newZ } : c))
    );

    setDraggingCardUid(uid);
    setDragOffset({
      x: e.clientX - card.x,
      y: e.clientY - card.y
    });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!draggingCardUid) return;
    setTableCards((prev) =>
      prev.map((c) => {
        if (c.uid === draggingCardUid) {
          return {
            ...c,
            x: Math.max(10, Math.min(e.clientX - dragOffset.x, 900)),
            y: Math.max(10, Math.min(e.clientY - dragOffset.y, 450))
          };
        }
        return c;
      })
    );
  };

  const handleMouseUp = () => {
    if (draggingCardUid) {
      playSound('slide');
      setDraggingCardUid(null);
    }
  };

  const handleClearTable = () => {
    playSound('shuffle');
    resetDeck();
  };

  return (
    <div
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      className="space-y-4 select-none"
    >
      {/* Tabletop Control Bar */}
      <div className="p-4 rounded-xl bg-slate-900 border border-amber-500/30 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="text-sm font-bold text-amber-200">
            Mesa de Jogo • <span className="text-amber-400">{activeDeck.name}</span>
          </div>
          <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono">
            {deckPile.length} no monte • {tableCards.length} na mesa
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleShuffle}
            disabled={deckPile.length === 0 || isShuffling}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 font-bold text-xs flex items-center gap-1.5 transition-colors disabled:opacity-40"
          >
            <Shuffle className={`w-3.5 h-3.5 ${isShuffling ? 'animate-spin' : ''}`} />
            <span>Embaralhar</span>
          </button>

          <button
            onClick={handleDrawOne}
            disabled={deckPile.length === 0}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-sky-300 font-bold text-xs flex items-center gap-1.5 transition-colors disabled:opacity-40"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Comprar 1</span>
          </button>

          <button
            onClick={() => handleDealHand(5)}
            disabled={deckPile.length < 5}
            className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-xs flex items-center gap-1.5 transition-all shadow-md active:scale-95 disabled:opacity-40"
          >
            <Hand className="w-3.5 h-3.5" />
            <span>Distribuir Mão (5)</span>
          </button>

          <button
            onClick={handleClearTable}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-red-950 text-slate-400 hover:text-red-300 font-bold text-xs flex items-center gap-1.5 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Recolher Tudo</span>
          </button>
        </div>
      </div>

      {/* Velvet Felt Card Mat */}
      <div
        className="relative w-full h-[580px] rounded-3xl overflow-hidden shadow-2xl border-4 border-amber-600/40"
        style={{
          background: 'radial-gradient(ellipse at center, #0e291e 0%, #071710 70%, #030b07 100%)'
        }}
      >
        {/* Felt Texture & Greek Meander Border Stamp */}
        <div className="absolute inset-4 rounded-2xl border border-amber-500/20 pointer-events-none flex items-center justify-center">
          <div className="text-center opacity-10">
            <Sparkles className="w-32 h-32 mx-auto text-amber-300" />
            <div className="text-2xl font-black font-serif tracking-widest text-amber-200 mt-2">
              DEUSES SOMBRIOS
            </div>
          </div>
        </div>

        {/* Deck Pile (Draw Pile) on the Left */}
        <div className="absolute top-8 left-8 flex flex-col items-center">
          <div
            onClick={handleDrawOne}
            title={deckPile.length > 0 ? 'Clique para comprar uma carta' : 'Monte vazio'}
            className={`relative w-[100px] aspect-[640/1120] rounded-xl cursor-pointer transition-transform ${
              deckPile.length > 0 ? 'hover:scale-105 active:scale-95' : 'opacity-40'
            }`}
          >
            {/* Multiple card stack depth illusion */}
            {deckPile.length > 2 && (
              <div className="absolute -top-2 -left-2 w-full h-full rounded-xl bg-slate-900 border border-amber-500/30" />
            )}
            {deckPile.length > 1 && (
              <div className="absolute -top-1 -left-1 w-full h-full rounded-xl bg-slate-900 border border-amber-500/30" />
            )}

            <div className="relative w-full h-full rounded-xl overflow-hidden shadow-2xl border-2 border-amber-500/50 bg-[#121024]">
              <img
                src="/assets/deck/BACK.png"
                alt="Monte de Compra"
                className="w-full h-full object-cover rendering-pixelated"
              />
            </div>
          </div>

          <div className="mt-2 text-[11px] font-mono font-bold text-amber-300 bg-black/60 px-2 py-0.5 rounded-full border border-amber-500/30">
            {deckPile.length} cartas
          </div>
        </div>

        {/* Table Cards Floating on the Felt */}
        {tableCards.map((tc) => (
          <div
            key={tc.uid}
            onMouseDown={(e) => handleCardMouseDown(tc.uid, e)}
            style={{
              position: 'absolute',
              left: `${tc.x}px`,
              top: `${tc.y}px`,
              zIndex: tc.zIndex,
              width: '110px',
              cursor: draggingCardUid === tc.uid ? 'grabbing' : 'grab'
            }}
            className="aspect-[640/1120] transition-shadow select-none group"
          >
            <div
              style={{
                perspective: '800px'
              }}
              className="w-full h-full relative"
            >
              <div
                style={{
                  transform: `rotateY(${tc.isFlipped ? 180 : 0}deg)`,
                  transformStyle: 'preserve-3d',
                  transition: 'transform 0.35s cubic-bezier(0.4, 0, 0.2, 1)'
                }}
                className="w-full h-full relative rounded-xl shadow-2xl border-2 border-amber-400/50"
              >
                {/* Front */}
                <div
                  style={{
                    backfaceVisibility: 'hidden',
                    WebkitBackfaceVisibility: 'hidden',
                    zIndex: tc.isFlipped ? 0 : 2
                  }}
                  className="absolute inset-0 w-full h-full rounded-xl overflow-hidden bg-[#121024]"
                >
                  <img
                    src={`/assets/deck/thumb/${tc.card.file.replace('.png', '.webp')}`}
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = `/assets/deck/${tc.card.file}`;
                    }}
                    alt={tc.card.name}
                    className="w-full h-full object-cover rendering-pixelated pointer-events-none"
                  />
                </div>

                {/* Back */}
                <div
                  style={{
                    transform: 'rotateY(180deg)',
                    backfaceVisibility: 'hidden',
                    WebkitBackfaceVisibility: 'hidden',
                    zIndex: tc.isFlipped ? 2 : 0
                  }}
                  className="absolute inset-0 w-full h-full rounded-xl overflow-hidden bg-[#121024]"
                >
                  <img
                    src="/assets/deck/thumb/BACK.webp"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = '/assets/deck/BACK.png';
                    }}
                    alt="Verso"
                    className="w-full h-full object-cover rendering-pixelated pointer-events-none"
                  />
                </div>
              </div>

              {/* Hover actions */}
              <div className="absolute -top-3 -right-3 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-30">
                <button
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={(e) => handleFlipCard(tc.uid, e)}
                  title="Virar Carta"
                  className="p-1.5 rounded-full bg-slate-900 text-amber-300 hover:bg-amber-500 hover:text-black shadow-lg border border-amber-500/40"
                >
                  <RotateCw className="w-3 h-3" />
                </button>
                <button
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={(e) => {
                    e.stopPropagation();
                    onInspectCard(tc.card);
                  }}
                  title="Inspecionar"
                  className="p-1.5 rounded-full bg-slate-900 text-sky-300 hover:bg-sky-500 hover:text-black shadow-lg border border-sky-500/40"
                >
                  <Eye className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="text-xs text-slate-400 text-center font-mono">
        Arraste as cartas pelo feltro • Clique no ícone de giro para virar • Clique no monte para comprar
      </div>
    </div>
  );
};
