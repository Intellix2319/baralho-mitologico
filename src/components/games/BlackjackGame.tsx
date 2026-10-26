import React, { useState, useEffect } from 'react';
import rawCardsData from '../../cards_data.json';
import { CardData } from '../../types/deck';
import { playSound } from '../../utils/audio';
import { CasinoChip } from '../CasinoChip';
import confetti from 'canvas-confetti';
import {
  Coins,
  Shield,
  RotateCcw,
  Sparkles,
  Brain,
  User,
  Plus,
  Hand,
  Zap,
  Info,
  Shuffle,
  Bot,
  ArrowLeft,
  Users
} from 'lucide-react';

const allCards: CardData[] = (rawCardsData as CardData[]).filter((c) => c && c.suitCode !== 'X');

interface BlackjackGameProps {
  spotCount?: number;
  onBack?: () => void;
}

export const BlackjackGame: React.FC<BlackjackGameProps> = ({ spotCount = 3, onBack }) => {
  const [bankroll, setBankroll] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('olympus_poker_chips');
      const val = saved ? parseInt(saved, 10) : 10000;
      return Number.isFinite(val) && val >= 0 ? val : 10000;
    } catch {
      return 10000;
    }
  });

  useEffect(() => {
    try {
      if (Number.isFinite(bankroll)) {
        localStorage.setItem('olympus_poker_chips', bankroll.toString());
      }
    } catch (e) {
      console.error(e);
    }
  }, [bankroll]);

  // Sync if chips updated from modal or Poker
  useEffect(() => {
    const handleSync = () => {
      try {
        const saved = localStorage.getItem('olympus_poker_chips');
        if (saved) {
          const val = parseInt(saved, 10);
          if (Number.isFinite(val) && val >= 0) {
            setBankroll((prev) => (prev !== val ? val : prev));
          }
        }
      } catch (e) {
        console.error(e);
      }
    };
    window.addEventListener('olympus_chips_updated', handleSync);
    return () => window.removeEventListener('olympus_chips_updated', handleSync);
  }, []);

  const timeoutsRef = React.useRef<ReturnType<typeof setTimeout>[]>([]);
  const safeTimeout = (cb: () => void, ms: number) => {
    const id = setTimeout(cb, ms);
    timeoutsRef.current.push(id);
    return id;
  };

  useEffect(() => {
    return () => {
      timeoutsRef.current.forEach((t) => clearTimeout(t));
      timeoutsRef.current = [];
    };
  }, []);

  const [bet, setBet] = useState<number>(25);
  const [deck, setDeck] = useState<CardData[]>([]);
  const [playerHand, setPlayerHand] = useState<CardData[]>([]);
  const [dealerHand, setDealerHand] = useState<CardData[]>([]);
  const [gameState, setGameState] = useState<'betting' | 'playing' | 'dealer_turn' | 'game_over'>('betting');
  const [isShuffling, setIsShuffling] = useState<boolean>(false);
  const [message, setMessage] = useState<string>('Escolha sua aposta em fichas e clique em Distribuir!');

  // Deck shuffler (2 decks)
  const shuffleDeck = (): CardData[] => {
    const shuffled = [...allCards, ...allCards];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

  // Safe Card value calculator with Soft Aces
  const calculateScore = (hand: CardData[] = []): { total: number; isSoft: boolean } => {
    let sum = 0;
    let aces = 0;
    (hand || []).forEach((c) => {
      if (!c || !c.rank) return;
      if (c.rank === 'A') {
        sum += 11;
        aces += 1;
      } else if (['K', 'Q', 'J', '10'].includes(c.rank)) {
        sum += 10;
      } else {
        const val = parseInt(c.rank, 10);
        sum += isNaN(val) ? 0 : val;
      }
    });

    while (sum > 21 && aces > 0) {
      sum -= 10;
      aces -= 1;
    }

    return { total: sum, isSoft: aces > 0 && sum <= 21 };
  };

  const playerScore = calculateScore(playerHand);
  const dealerScore = calculateScore(dealerHand);

  // Deal Initial Cards
  const handleDeal = () => {
    if (bankroll < bet) {
      setMessage('Fichas insuficientes! Recarregue gratuitamente no cabeçalho.');
      return;
    }

    setIsShuffling(true);
    playSound('shuffle');
    setMessage('Embaralhando 2 baralhos completos...');

    safeTimeout(() => {
      const newDeck = shuffleDeck();
      const p1 = newDeck.pop() || allCards[0];
      const d1 = newDeck.pop() || allCards[1];
      const p2 = newDeck.pop() || allCards[2];
      const d2 = newDeck.pop() || allCards[3];

      setDeck(newDeck);
      setPlayerHand([p1, p2]);
      setDealerHand([d1, d2]);
      setBankroll((prev) => Math.max(0, (Number.isFinite(prev) ? prev : 10000) - bet));
      setIsShuffling(false);

      const initialPlayerScore = calculateScore([p1, p2]);
      const initialDealerScore = calculateScore([d1, d2]);

      // Check Natural Blackjack
      if (initialPlayerScore.total === 21) {
        if (initialDealerScore.total === 21) {
          // Push
          playSound('click');
          setMessage('Empate de Blackjacks Naturais! Aposta devolvida.');
          setBankroll((prev) => (Number.isFinite(prev) ? prev : 10000) + bet);
          setGameState('game_over');
        } else {
          // Natural Blackjack Pays 3:2
          playSound('chime');
          try {
            confetti({ particleCount: 70, spread: 80 });
          } catch (_) {}
          const payout = Math.floor(bet * 2.5);
          setMessage(`🔥 NATURAL BLACKJACK 21! Pagamento 3:2: faturou $${payout}!`);
          setBankroll((prev) => (Number.isFinite(prev) ? prev : 10000) + payout);
          setGameState('game_over');
        }
      } else {
        setGameState('playing');
        playSound('flip');
        setMessage(`Sua vez: ${initialPlayerScore.total} pontos. Peça carta ou pare.`);
      }
    }, 600);
  };

  // Hit: Draw 1 card
  const handleHit = () => {
    if (gameState !== 'playing') return;
    playSound('flip');

    setDeck((prevDeck) => {
      let curDeck = [...prevDeck];
      if (curDeck.length < 2) curDeck = shuffleDeck();
      const card = curDeck.pop() || allCards[0];

      setPlayerHand((prev) => {
        const nextHand = [...prev, card];
        const sc = calculateScore(nextHand);
        if (sc.total > 21) {
          playSound('click');
          setMessage(`Estourou com ${sc.total} pontos! Dealer recolheu as fichas.`);
          setGameState('game_over');
        } else if (sc.total === 21) {
          setMessage('21 pontos cravados! Finalizando rodada...');
          safeTimeout(() => handleStand(nextHand), 500);
        } else {
          setMessage(`Você tem ${sc.total} pontos. Peça mais ou pare.`);
        }
        return nextHand;
      });

      return curDeck;
    });
  };

  // Double Down
  const handleDoubleDown = () => {
    if (gameState !== 'playing' || playerHand.length !== 2) return;
    if (bankroll < bet) {
      setMessage('Saldo insuficiente para dobrar a aposta!');
      return;
    }

    playSound('click');
    setBankroll((prev) => prev - bet);
    const doubledBet = bet * 2;

    setDeck((prevDeck) => {
      let curDeck = [...prevDeck];
      if (curDeck.length < 2) curDeck = shuffleDeck();
      const card = curDeck.pop() || allCards[0];

      setPlayerHand((prev) => {
        const nextHand = [...prev, card];
        const sc = calculateScore(nextHand);
        if (sc.total > 21) {
          setMessage(`Estourou ao dobrar com ${sc.total} pontos!`);
          setGameState('game_over');
        } else {
          handleStand(nextHand, doubledBet);
        }
        return nextHand;
      });

      return curDeck;
    });
  };

  // Stand: Dealer Plays (Dealer must hit until 17)
  const handleStand = (customPlayerHand?: CardData[], customBet?: number) => {
    const finalHand = customPlayerHand || playerHand;
    const finalBet = customBet || bet;
    const pScore = calculateScore(finalHand).total;

    if (pScore > 21) {
      setGameState('game_over');
      return;
    }

    setGameState('dealer_turn');
    setMessage('Dealer revelando carta oculta...');
    playSound('flip');

    safeTimeout(() => {
      let curDealer = [...dealerHand];
      let curDeck = [...deck];

      const drawNext = () => {
        const dScore = calculateScore(curDealer);
        if (dScore.total < 17) {
          if (curDeck.length < 2) curDeck = shuffleDeck();
          const nextCard = curDeck.pop() || allCards[0];
          curDealer = [...curDealer, nextCard];
          setDealerHand([...curDealer]);
          setDeck([...curDeck]);
          playSound('flip');
          safeTimeout(drawNext, 600);
        } else {
          // Dealer finished
          setGameState('game_over');
          const finalDealerTotal = dScore.total;

          if (finalDealerTotal > 21) {
            playSound('chime');
            try {
              confetti({ particleCount: 60, spread: 70 });
            } catch (_) {}
            setMessage(`Dealer estourou com ${finalDealerTotal}! Você venceu e recebeu $${finalBet * 2}!`);
            setBankroll((prev) => (Number.isFinite(prev) ? prev : 10000) + finalBet * 2);
          } else if (pScore > finalDealerTotal) {
            playSound('chime');
            try {
              confetti({ particleCount: 60, spread: 70 });
            } catch (_) {}
            setMessage(`Você venceu (${pScore} vs ${finalDealerTotal})! Recebeu $${finalBet * 2}!`);
            setBankroll((prev) => (Number.isFinite(prev) ? prev : 10000) + finalBet * 2);
          } else if (pScore < finalDealerTotal) {
            setMessage(`Dealer venceu (${finalDealerTotal} vs ${pScore}). Mais sorte na próxima rodada!`);
          } else {
            setMessage(`Empate técnico (${pScore} vs ${finalDealerTotal})! Aposta devolvida.`);
            setBankroll((prev) => (Number.isFinite(prev) ? prev : 10000) + finalBet);
          }
        }
      };

      drawNext();
    }, 500);
  };

  return (
    <div className="h-full max-h-full short:h-auto short:max-h-none short:min-h-[540px] w-full max-w-6xl mx-auto flex flex-col justify-between p-2 select-none overflow-hidden gap-1.5">
      {/* Sleek Top Bar: Back to Game Hub & Table Info (No redundant Saldo sub-bar) */}
      <div className="h-11 shrink-0 bg-slate-900/95 border border-purple-500/30 rounded-xl px-3 flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              onClick={onBack}
              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-purple-400" />
              <span className="hidden sm:inline">Escolher Outro Jogo</span>
            </button>
          )}

          <div className="flex items-center gap-2">
            <span className="text-xs sm:text-sm font-black text-purple-300">
              Blackjack 21
            </span>
            <span className="text-[11px] font-bold text-slate-400 hidden sm:inline">
              • Mesa Imperial
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-purple-500/20 border border-purple-500/30 text-[11px] font-mono font-bold text-purple-300">
            <Shield className="w-3 h-3 text-purple-400" />
            <span>{spotCount} Posições • Paga 3:2</span>
          </div>
        </div>
      </div>

      {/* Blackjack Table (Flexible height, fits 100% viewport without scrolling) */}
      <div className="flex-1 min-h-0 relative rounded-2xl sm:rounded-3xl bg-gradient-to-b from-[#1a0b2e] via-[#100720] to-[#0a0414] border-2 sm:border-3 border-purple-500/40 p-2 sm:p-3 shadow-2xl flex flex-col justify-between overflow-hidden">
        {/* Arch table lines */}
        <div className="absolute inset-x-6 top-6 bottom-6 border-2 border-dashed border-purple-500/15 rounded-full pointer-events-none" />

        {/* 1. Dealer Section (Top - ENLARGED Cards) */}
        <div className="relative z-10 shrink-0 flex flex-col items-center justify-start">
          <div className="flex items-center gap-2 bg-black/80 border border-purple-500/40 px-3.5 py-0.5 rounded-full text-xs font-bold text-purple-200 shadow-md">
            <Shield className="w-3.5 h-3.5 text-purple-300" />
            <span>Dealer (A Casa) - Para no 17</span>
            {gameState === 'game_over' && (
              <span className="ml-1 text-amber-300 font-mono font-black">({dealerScore.total} pts)</span>
            )}
          </div>

          <div className="flex items-center gap-2 sm:gap-3 mt-1.5">
            {dealerHand.length > 0 ? (
              dealerHand.map((c, i) => (
                <div
                  key={i}
                  className="relative h-32 sm:h-42 md:h-48 aspect-[640/1120] rounded-xl sm:rounded-2xl overflow-hidden border-2 border-amber-400/50 shadow-2xl bg-slate-950"
                >
                  <img
                    src={
                      i === 1 && gameState === 'playing'
                        ? '/assets/deck/thumb/BACK.webp'
                        : `/assets/deck/thumb/${c.file.replace('.png', '.webp')}`
                    }
                    onError={(e) => {
                      (e.target as HTMLImageElement).src =
                        i === 1 && gameState === 'playing' ? '/assets/deck/BACK.png' : `/assets/deck/${c.file}`;
                    }}
                    alt={c.name}
                    className="w-full h-full object-cover rendering-pixelated"
                  />
                  {!(i === 1 && gameState === 'playing') && (
                    <div className="absolute top-1 left-1 bg-black/85 px-1.5 py-0.5 rounded text-[11px] font-black flex items-center gap-0.5 border border-amber-400/40">
                      <span className="text-amber-300">{c.rank}</span>
                      <span style={{ color: c.color }}>{c.suitSymbol}</span>
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="flex gap-2 opacity-30">
                <div className="h-32 sm:h-42 md:h-48 aspect-[640/1120] rounded-xl sm:rounded-2xl border-2 border-dashed border-slate-500" />
                <div className="h-32 sm:h-42 md:h-48 aspect-[640/1120] rounded-xl sm:rounded-2xl border-2 border-dashed border-slate-500" />
              </div>
            )}
          </div>
        </div>

        {/* 2. Center Message & Active Turn */}
        <div className="relative z-10 flex-1 min-h-0 flex flex-col items-center justify-center py-1">
          {/* Active Turn Pill */}
          <div className="h-6 flex items-center justify-center mb-1">
            {gameState === 'playing' && (
              <div className="px-3 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider bg-emerald-500 text-black shadow-lg flex items-center gap-1.5 animate-pulse">
                <Sparkles className="w-3.5 h-3.5 text-black" />
                <span>SUA VEZ DE JOGAR</span>
              </div>
            )}
            {gameState === 'dealer_turn' && (
              <div className="px-3 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider bg-purple-600 text-white shadow-lg flex items-center gap-1.5 animate-pulse">
                <Bot className="w-3.5 h-3.5 text-white" />
                <span>VEZ DO DEALER...</span>
              </div>
            )}
          </div>

          <div className="text-xs sm:text-sm font-black text-amber-200 bg-black/85 px-4 py-1.5 rounded-xl border border-amber-500/40 shadow-lg max-w-lg text-center">
            {message}
          </div>
          <div className="text-[11px] text-amber-400 font-mono mt-1 font-bold">
            Aposta: ${bet} • Blackjack Paga 3:2
          </div>
        </div>

        {/* 3. Player Section (Bottom - ENLARGED Cards with Clear Badges) */}
        <div className="relative z-10 shrink-0 flex flex-col items-center justify-end pb-1">
          <div className="flex items-center gap-2 bg-black/80 border border-amber-500/40 px-3.5 py-0.5 rounded-full text-xs font-bold text-amber-200 shadow-md mb-1.5">
            <User className="w-3.5 h-3.5" />
            <span>Sua Mão: {playerHand.length > 0 ? playerScore.total : 0} pts</span>
            {playerScore.isSoft && <span className="text-[10px] text-amber-400 font-bold">(Soft)</span>}
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {playerHand.length > 0 ? (
              playerHand.map((c, i) => (
                <div
                  key={i}
                  className="relative h-32 sm:h-44 md:h-52 aspect-[640/1120] rounded-xl sm:rounded-2xl overflow-hidden border-2 sm:border-3 border-amber-400 shadow-2xl bg-slate-950 transform hover:-translate-y-2 transition-transform"
                >
                  <img
                    src={`/assets/deck/thumb/${c.file.replace('.png', '.webp')}`}
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = `/assets/deck/${c.file}`;
                    }}
                    alt={c.name}
                    className="w-full h-full object-cover rendering-pixelated"
                  />
                  <div className="absolute top-1 left-1 bg-black/90 px-1.5 py-0.5 rounded text-xs sm:text-sm font-black flex items-center gap-1 shadow-md border border-amber-400/50">
                    <span className="text-amber-300">{c.rank}</span>
                    <span style={{ color: c.color }}>{c.suitSymbol}</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="flex gap-2">
                <div className="h-32 sm:h-44 md:h-52 aspect-[640/1120] rounded-xl border-2 border-dashed border-amber-500/40 flex items-center justify-center text-amber-400/40 font-bold text-lg">
                  ?
                </div>
                <div className="h-32 sm:h-44 md:h-52 aspect-[640/1120] rounded-xl border-2 border-dashed border-amber-500/40 flex items-center justify-center text-amber-400/40 font-bold text-lg">
                  ?
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 4. Action Controls & Bet Chips with Custom Casino Chips */}
      <div className="h-16 shrink-0 bg-slate-900/95 border border-slate-800 rounded-xl px-3 flex items-center justify-between shadow-xl">
        {gameState === 'betting' || gameState === 'game_over' ? (
          <div className="flex items-center justify-between w-full gap-2">
            <div className="flex items-center gap-1.5 sm:gap-2.5">
              <span className="text-[11px] font-bold text-slate-400 hidden sm:inline">Aposta:</span>
              {[1, 5, 25, 100, 500].map((val) => (
                <CasinoChip
                  key={val}
                  value={val}
                  size="sm"
                  selected={bet === val}
                  onClick={() => {
                    playSound('click');
                    setBet(val);
                  }}
                />
              ))}
            </div>

            <button
              onClick={handleDeal}
              disabled={isShuffling}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs sm:text-sm shadow-xl active:scale-95 transition-all ml-auto flex items-center gap-1.5 cursor-pointer"
            >
              <Shuffle className={`w-4 h-4 ${isShuffling ? 'animate-spin' : ''}`} />
              <span>Distribuir (${bet})</span>
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-end w-full gap-2">
            <button
              onClick={handleHit}
              disabled={gameState !== 'playing'}
              className="px-4 sm:px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs sm:text-sm shadow-lg active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Pedir (Hit)</span>
            </button>

            <button
              onClick={() => handleStand()}
              disabled={gameState !== 'playing'}
              className="px-4 sm:px-6 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 font-black text-xs sm:text-sm border border-slate-700 shadow-md active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Hand className="w-4 h-4" />
              <span>Parar (Stand)</span>
            </button>

            {playerHand.length === 2 && bankroll >= bet && (
              <button
                onClick={handleDoubleDown}
                disabled={gameState !== 'playing'}
                className="px-3.5 sm:px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 text-black font-black text-xs sm:text-sm shadow-lg active:scale-95 transition-all flex items-center gap-1 cursor-pointer"
              >
                <Zap className="w-4 h-4" />
                <span>Dobrar (${bet * 2})</span>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
