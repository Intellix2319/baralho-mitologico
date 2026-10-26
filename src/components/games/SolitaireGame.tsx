import React, { useState, useEffect } from 'react';
import rawCardsData from '../../cards_data.json';
import { CardData } from '../../types/deck';
import { playSound } from '../../utils/audio';
import confetti from 'canvas-confetti';
import {
  RotateCcw,
  Sparkles,
  Trophy,
  Timer,
  Layers,
  CheckCircle2,
  HelpCircle
} from 'lucide-react';

const allDeckCards: CardData[] = (rawCardsData as CardData[]).filter((c) => c.suitCode !== 'X');

interface SolitaireCard {
  card: CardData;
  faceUp: boolean;
}

export const SolitaireGame: React.FC = () => {
  const [stock, setStock] = useState<CardData[]>([]);
  const [waste, setWaste] = useState<CardData[]>([]);
  const [foundations, setFoundations] = useState<CardData[][]>([[], [], [], []]);
  const [tableau, setTableau] = useState<SolitaireCard[][]>([[], [], [], [], [], [], []]);
  const [moves, setMoves] = useState<number>(0);
  const [seconds, setSeconds] = useState<number>(0);
  const [isWon, setIsWon] = useState<boolean>(false);

  // Timer
  useEffect(() => {
    if (isWon) return;
    const interval = setInterval(() => {
      setSeconds((s) => s + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [isWon]);

  // Init New Solitaire Game
  const initGame = () => {
    playSound('flip');
    const shuffled = [...allDeckCards].sort(() => Math.random() - 0.5);

    const newTableau: SolitaireCard[][] = [[], [], [], [], [], [], []];
    for (let col = 0; col < 7; col++) {
      for (let row = 0; row <= col; row++) {
        const card = shuffled.pop()!;
        newTableau[col].push({
          card,
          faceUp: row === col // only top card is face-up
        });
      }
    }

    setStock(shuffled);
    setWaste([]);
    setFoundations([[], [], [], []]);
    setTableau(newTableau);
    setMoves(0);
    setSeconds(0);
    setIsWon(false);
  };

  useEffect(() => {
    initGame();
  }, []);

  // Stock click
  const handleStockClick = () => {
    playSound('flip');
    setMoves((m) => m + 1);
    if (stock.length === 0) {
      // Recycle waste back to stock
      setStock([...waste].reverse());
      setWaste([]);
    } else {
      const curStock = [...stock];
      const card = curStock.pop()!;
      setStock(curStock);
      setWaste((w) => [...w, card]);
    }
  };

  // Card is Red suit (Copas / Ouros) or Black suit (Espadas / Paus)
  const isRed = (card: CardData) => card.suitCode === 'H' || card.suitCode === 'D';

  // Check foundation valid move
  const tryMoveToFoundation = (card: CardData): boolean => {
    // 0: Spades, 1: Hearts, 2: Diamonds, 3: Clubs
    const suitIndexMap: Record<string, number> = { S: 0, H: 1, D: 2, C: 3 };
    const fIdx = suitIndexMap[card.suitCode];
    if (fIdx === undefined) return false;

    const pile = foundations[fIdx];
    const targetValue = pile.length === 0 ? 1 : pile[pile.length - 1].rankValue === 14 ? 1 : pile[pile.length - 1].rankValue;

    // Card Rank value check
    const cVal = card.rank === 'A' ? 1 : card.rankValue;
    const requiredVal = pile.length === 0 ? 1 : pile.length + 1;

    if (cVal === requiredVal) {
      const newFoundations = [...foundations];
      newFoundations[fIdx] = [...pile, card];
      setFoundations(newFoundations);
      playSound('chime');
      setMoves((m) => m + 1);

      // Check win
      const totalInFoundations = newFoundations.reduce((sum, p) => sum + p.length, 0);
      if (totalInFoundations === 52) {
        setIsWon(true);
        confetti({ particleCount: 100, spread: 100 });
      }
      return true;
    }
    return false;
  };

  // Click on Waste card
  const handleWasteClick = () => {
    if (waste.length === 0) return;
    const topCard = waste[waste.length - 1];

    // Try foundation first
    if (tryMoveToFoundation(topCard)) {
      setWaste((w) => w.slice(0, -1));
      return;
    }

    // Try move to tableau
    for (let c = 0; c < 7; c++) {
      const col = tableau[c];
      if (col.length === 0) {
        if (topCard.rank === 'K') {
          // King on empty column
          const newTab = [...tableau];
          newTab[c] = [{ card: topCard, faceUp: true }];
          setTableau(newTab);
          setWaste((w) => w.slice(0, -1));
          playSound('click');
          setMoves((m) => m + 1);
          return;
        }
      } else {
        const target = col[col.length - 1];
        if (target.faceUp && isRed(topCard) !== isRed(target.card)) {
          const topVal = topCard.rank === 'A' ? 1 : topCard.rankValue;
          const targetVal = target.card.rank === 'A' ? 1 : target.card.rankValue;
          if (topVal === targetVal - 1) {
            const newTab = [...tableau];
            newTab[c] = [...col, { card: topCard, faceUp: true }];
            setTableau(newTab);
            setWaste((w) => w.slice(0, -1));
            playSound('click');
            setMoves((m) => m + 1);
            return;
          }
        }
      }
    }
  };

  // Click on Tableau card
  const handleTableauClick = (colIdx: number, cardIdx: number) => {
    const col = tableau[colIdx];
    const item = col[cardIdx];
    if (!item.faceUp) return;

    // If it's top card in column, try foundation first
    if (cardIdx === col.length - 1) {
      if (tryMoveToFoundation(item.card)) {
        const newTab = [...tableau];
        const newCol = col.slice(0, -1);
        if (newCol.length > 0) {
          newCol[newCol.length - 1].faceUp = true; // reveal previous
        }
        newTab[colIdx] = newCol;
        setTableau(newTab);
        return;
      }
    }

    // Move stack to another tableau column
    const movingStack = col.slice(cardIdx);
    const movingBase = movingStack[0].card;
    const movingVal = movingBase.rank === 'A' ? 1 : movingBase.rankValue;

    for (let targetCol = 0; targetCol < 7; targetCol++) {
      if (targetCol === colIdx) continue;
      const targetPile = tableau[targetCol];

      if (targetPile.length === 0) {
        if (movingBase.rank === 'K') {
          const newTab = [...tableau];
          const newSourceCol = col.slice(0, cardIdx);
          if (newSourceCol.length > 0) {
            newSourceCol[newSourceCol.length - 1].faceUp = true;
          }
          newTab[colIdx] = newSourceCol;
          newTab[targetCol] = movingStack;
          setTableau(newTab);
          playSound('click');
          setMoves((m) => m + 1);
          return;
        }
      } else {
        const targetCard = targetPile[targetPile.length - 1].card;
        const targetVal = targetCard.rank === 'A' ? 1 : targetCard.rankValue;
        if (isRed(movingBase) !== isRed(targetCard) && movingVal === targetVal - 1) {
          const newTab = [...tableau];
          const newSourceCol = col.slice(0, cardIdx);
          if (newSourceCol.length > 0) {
            newSourceCol[newSourceCol.length - 1].faceUp = true;
          }
          newTab[colIdx] = newSourceCol;
          newTab[targetCol] = [...targetPile, ...movingStack];
          setTableau(newTab);
          playSound('click');
          setMoves((m) => m + 1);
          return;
        }
      }
    }
  };

  const formatTime = (s: number) => {
    const min = Math.floor(s / 60);
    const sec = s % 60;
    return `${min}:${sec < 10 ? '0' : ''}${sec}`;
  };

  return (
    <div className="max-w-6xl mx-auto px-3 sm:px-6 py-4 space-y-4 select-none">
      {/* Top Header Bar */}
      <div className="bg-slate-900/90 border border-amber-500/30 rounded-2xl p-4 shadow-xl flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Timer className="w-4 h-4 text-amber-400" />
            <span className="font-mono text-xs sm:text-sm font-bold text-slate-200">
              {formatTime(seconds)}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-sky-400" />
            <span className="font-mono text-xs sm:text-sm font-bold text-slate-200">
              Movimentos: {moves}
            </span>
          </div>
        </div>

        <button
          onClick={initGame}
          className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-black text-xs sm:text-sm flex items-center gap-2 shadow-md transition-colors"
        >
          <RotateCcw className="w-4 h-4" />
          <span>Novo Jogo</span>
        </button>
      </div>

      {/* Solitaire Arena */}
      <div className="rounded-3xl bg-gradient-to-b from-[#0b1b14] via-[#07130e] to-[#040906] border-4 border-amber-500/40 p-4 sm:p-6 shadow-2xl min-h-[580px] flex flex-col gap-6">
        {/* Top Row: Stock + Waste on Left, 4 Foundations on Right */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-emerald-900/40 pb-5">
          {/* Stock & Waste */}
          <div className="flex items-center gap-3">
            {/* Stock Pile */}
            <div
              onClick={handleStockClick}
              className="w-16 sm:w-20 aspect-[640/1120] rounded-xl border-2 border-amber-500/40 bg-slate-950 overflow-hidden cursor-pointer shadow-lg hover:border-amber-400 transition-colors flex items-center justify-center relative"
            >
              {stock.length > 0 ? (
                <img
                  src="/assets/deck/thumb/BACK.webp"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '/assets/deck/BACK.png';
                  }}
                  alt="Monte"
                  className="w-full h-full object-cover rendering-pixelated"
                />
              ) : (
                <RotateCcw className="w-6 h-6 text-emerald-600/60" />
              )}
              {stock.length > 0 && (
                <span className="absolute bottom-1 right-1 text-[10px] font-mono font-bold bg-black/80 px-1 rounded text-amber-300">
                  {stock.length}
                </span>
              )}
            </div>

            {/* Waste Pile */}
            <div
              onClick={handleWasteClick}
              className="w-16 sm:w-20 aspect-[640/1120] rounded-xl border-2 border-dashed border-emerald-800/80 bg-slate-950/40 overflow-hidden cursor-pointer shadow-lg flex items-center justify-center relative"
            >
              {waste.length > 0 ? (
                <img
                  src={`/assets/deck/thumb/${waste[waste.length - 1].file.replace('.png', '.webp')}`}
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = `/assets/deck/${waste[waste.length - 1].file}`;
                  }}
                  alt="Descarte"
                  className="w-full h-full object-cover rendering-pixelated animate-fadeIn"
                />
              ) : (
                <span className="text-[10px] text-emerald-800 font-bold">DESCARTE</span>
              )}
            </div>
          </div>

          {/* 4 Foundation Piles (Spades, Hearts, Diamonds, Clubs) */}
          <div className="flex items-center gap-2 sm:gap-3">
            {['♠', '♥', '♦', '♣'].map((symbol, idx) => {
              const pile = foundations[idx];
              const topCard = pile[pile.length - 1];
              return (
                <div
                  key={idx}
                  className="w-16 sm:w-20 aspect-[640/1120] rounded-xl border-2 border-amber-500/50 bg-slate-950/60 overflow-hidden shadow-lg flex items-center justify-center relative"
                >
                  {topCard ? (
                    <img
                      src={`/assets/deck/thumb/${topCard.file.replace('.png', '.webp')}`}
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = `/assets/deck/${topCard.file}`;
                      }}
                      alt={topCard.name}
                      className="w-full h-full object-cover rendering-pixelated"
                    />
                  ) : (
                    <span
                      className={`text-2xl font-black ${
                        idx === 1 || idx === 2 ? 'text-red-500/40' : 'text-slate-400/40'
                      }`}
                    >
                      {symbol}
                    </span>
                  )}
                  {pile.length > 0 && (
                    <span className="absolute bottom-1 right-1 text-[10px] font-mono font-bold bg-black/80 px-1 rounded text-amber-300">
                      {pile.length}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* 7 Tableau Columns */}
        <div className="grid grid-cols-7 gap-1.5 sm:gap-3 items-start min-h-[360px]">
          {tableau.map((column, colIdx) => (
            <div
              key={colIdx}
              className="flex flex-col items-center min-h-[140px] rounded-xl border border-emerald-900/30 p-0.5 sm:p-1 relative"
            >
              {column.length === 0 ? (
                <div className="w-full aspect-[640/1120] rounded-xl border-2 border-dashed border-emerald-900/40 flex items-center justify-center text-[10px] text-emerald-700/50 font-bold">
                  K
                </div>
              ) : (
                <div className="relative w-full">
                  {column.map((item, rowIdx) => (
                    <div
                      key={item.card.id}
                      onClick={() => handleTableauClick(colIdx, rowIdx)}
                      style={{
                        marginTop: rowIdx === 0 ? 0 : -50
                      }}
                      className="w-full aspect-[640/1120] rounded-lg sm:rounded-xl overflow-hidden border border-amber-400/30 bg-slate-950 shadow-md cursor-pointer hover:border-amber-400 transition-colors relative z-10"
                    >
                      {item.faceUp ? (
                        <img
                          src={`/assets/deck/thumb/${item.card.file.replace('.png', '.webp')}`}
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = `/assets/deck/${item.card.file}`;
                          }}
                          alt={item.card.name}
                          className="w-full h-full object-cover rendering-pixelated"
                          loading="lazy"
                          decoding="async"
                        />
                      ) : (
                        <img
                          src="/assets/deck/thumb/BACK.webp"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = '/assets/deck/BACK.png';
                          }}
                          alt="Verso"
                          className="w-full h-full object-cover rendering-pixelated"
                          loading="lazy"
                          decoding="async"
                        />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
