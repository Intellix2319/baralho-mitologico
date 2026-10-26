import React, { useState, useEffect, useMemo } from 'react';
import rawCardsData from '../../cards_data.json';
import { CardData, AIDifficulty } from '../../types/deck';
import { playSound } from '../../utils/audio';
import { CasinoChip } from '../CasinoChip';
import confetti from 'canvas-confetti';
import {
  Coins,
  Shield,
  RotateCcw,
  Sparkles,
  HelpCircle,
  Brain,
  Trophy,
  User,
  Bot,
  Zap,
  Info,
  Shuffle,
  ArrowLeft,
  Users
} from 'lucide-react';

const allCards: CardData[] = (rawCardsData as CardData[]).filter((c) => c && c.suitCode !== 'X');

export type PokerRound = 'preflop' | 'flop' | 'turn' | 'river' | 'showdown';

interface HandEvaluation {
  rankName: string;
  category: number;
  score: number;
  description: string;
}

interface AIPlayerState {
  id: string;
  name: string;
  title: string;
  avatar: string;
  color: string;
  chips: number;
  hand: CardData[];
  currentBet: number;
  folded: boolean;
  lastAction?: string;
}

const AI_ROSTER = [
  { id: 'poseidon', name: 'Poseidon', title: 'Rei dos Mares', avatar: '🔱', color: 'text-teal-400' },
  { id: 'hera', name: 'Hera', title: 'Rainha do Olimpo', avatar: '👑', color: 'text-purple-400' },
  { id: 'hefesto', name: 'Hefesto', title: 'Ferreiro Divino', avatar: '🔨', color: 'text-orange-400' },
  { id: 'artemis', name: 'Ártemis', title: 'Deusa da Caça', avatar: '🏹', color: 'text-emerald-400' },
  { id: 'apolo', name: 'Apolo', title: 'Deus do Sol', avatar: '☀️', color: 'text-amber-400' }
];

interface PokerGameProps {
  playerCount?: number; // 2 to 6 total players
  onBack?: () => void;
}

export const PokerGame: React.FC<PokerGameProps> = ({ playerCount = 6, onBack }) => {
  // Safe bounded player count between 2 and 6
  const totalSeats = Math.min(6, Math.max(2, playerCount));
  const aiCount = totalSeats - 1;

  // Table Stakes
  const [tableStakes] = useState<{ name: string; small: number; big: number }>({
    name: 'Mesa Olimpo',
    small: 25,
    big: 50
  });

  // Global persistent chips
  const [playerBankroll, setPlayerBankroll] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('olympus_poker_chips');
      const parsed = saved ? parseInt(saved, 10) : 10000;
      return Number.isFinite(parsed) && parsed >= 0 ? parsed : 10000;
    } catch {
      return 10000;
    }
  });

  // Sync bankroll to localStorage
  useEffect(() => {
    try {
      if (Number.isFinite(playerBankroll)) {
        localStorage.setItem('olympus_poker_chips', playerBankroll.toString());
      }
    } catch (e) {
      console.error(e);
    }
  }, [playerBankroll]);

  // Synchronize if chips claimed in header modal
  useEffect(() => {
    const handleSync = () => {
      try {
        const saved = localStorage.getItem('olympus_poker_chips');
        if (saved) {
          const val = parseInt(saved, 10);
          if (Number.isFinite(val) && val >= 0) {
            setPlayerBankroll((prev) => (prev !== val ? val : prev));
          }
        }
      } catch (e) {
        console.error(e);
      }
    };
    window.addEventListener('olympus_chips_updated', handleSync);
    return () => window.removeEventListener('olympus_chips_updated', handleSync);
  }, []);

  // AI Opponents
  const [aiPlayers, setAiPlayers] = useState<AIPlayerState[]>(() => {
    return AI_ROSTER.slice(0, aiCount).map((r) => ({
      ...r,
      chips: 10000,
      hand: [],
      currentBet: 0,
      folded: false,
      lastAction: undefined
    }));
  });

  // Keep AI players count in sync if prop changes
  useEffect(() => {
    setAiPlayers((prev) => {
      return AI_ROSTER.slice(0, aiCount).map((r, idx) => {
        const existing = prev[idx];
        return {
          ...r,
          chips: existing ? existing.chips : 10000,
          hand: existing ? existing.hand : [],
          currentBet: existing ? existing.currentBet : 0,
          folded: existing ? existing.folded : false,
          lastAction: existing ? existing.lastAction : undefined
        };
      });
    });
  }, [aiCount]);

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

  // Table state
  const [isShuffling, setIsShuffling] = useState<boolean>(false);
  const [isAiThinking, setIsAiThinking] = useState<boolean>(false);
  const [deck, setDeck] = useState<CardData[]>([]);
  const [playerHand, setPlayerHand] = useState<CardData[]>([]);
  const [communityCards, setCommunityCards] = useState<CardData[]>([]);
  const [round, setRound] = useState<PokerRound>('preflop');
  const [pot, setPot] = useState<number>(0);
  const [currentBet, setCurrentBet] = useState<number>(0);
  const [playerCurrentBet, setPlayerCurrentBet] = useState<number>(0);
  const [playerFolded, setPlayerFolded] = useState<boolean>(false);
  const [gameMessage, setGameMessage] = useState<string>('Clique em Iniciar Mão para começar!');
  const [winnerMessage, setWinnerMessage] = useState<string | null>(null);

  // Helper to shuffle cards using Fisher-Yates
  const shuffleDeck = (): CardData[] => {
    const shuffled = [...allCards];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

  // Safe Rank to Number converter
  const rankToNum = (rank: string): number => {
    if (!rank) return 0;
    if (rank === 'A') return 14;
    if (rank === 'K') return 13;
    if (rank === 'Q') return 12;
    if (rank === 'J') return 11;
    const n = parseInt(rank, 10);
    return isNaN(n) ? 0 : n;
  };

  // Rock-solid bulletproof 7-card evaluator
  const evaluateHand = (holeCards: CardData[] = [], tableCards: CardData[] = []): HandEvaluation => {
    try {
      const validHole = (holeCards || []).filter((c) => c && c.rank);
      const validTable = (tableCards || []).filter((c) => c && c.rank);
      const combined = [...validHole, ...validTable];

      if (combined.length === 0) {
        return { rankName: 'Aguardando cartas', category: 0, score: 0, description: 'Mesa vazia.' };
      }

      const cardVals = combined.map((c) => ({
        val: rankToNum(c.rank),
        suit: c.suitCode || 'S',
        card: c
      }));

      // Group by rank
      const rankCounts: Record<number, number> = {};
      const suitCards: Record<string, number[]> = { S: [], H: [], D: [], C: [] };

      cardVals.forEach((c) => {
        rankCounts[c.val] = (rankCounts[c.val] || 0) + 1;
        if (!suitCards[c.suit]) suitCards[c.suit] = [];
        suitCards[c.suit].push(c.val);
      });

      // Check Flush
      let flushSuit: string | null = null;
      for (const [s, vals] of Object.entries(suitCards)) {
        if (vals && vals.length >= 5) {
          flushSuit = s;
          vals.sort((a, b) => b - a);
          break;
        }
      }

      const findStraight = (values: number[]): number | null => {
        const unique = Array.from(new Set(values)).sort((a, b) => b - a);
        if (unique.includes(14)) unique.push(1); // Ace-low wheel

        for (let i = 0; i <= unique.length - 5; i++) {
          if (
            unique[i] - unique[i + 1] === 1 &&
            unique[i + 1] - unique[i + 2] === 1 &&
            unique[i + 2] - unique[i + 3] === 1 &&
            unique[i + 3] - unique[i + 4] === 1
          ) {
            return unique[i];
          }
        }
        return null;
      };

      // 1. Straight Flush / Royal Flush
      if (flushSuit && suitCards[flushSuit]) {
        const fVals = suitCards[flushSuit];
        const sfHigh = findStraight(fVals);
        if (sfHigh) {
          if (sfHigh === 14) {
            return {
              rankName: 'Royal Flush',
              category: 10,
              score: 10000000 + sfHigh,
              description: 'A mão suprema do Olimpo!'
            };
          }
          return {
            rankName: `Straight Flush (${sfHigh} Alto)`,
            category: 9,
            score: 9000000 + sfHigh,
            description: 'Sequência perfeita do mesmo naipe!'
          };
        }
      }

      // Sort rank groups by frequency, then by value
      const sortedRanks = Object.entries(rankCounts)
        .map(([valStr, count]) => ({ val: parseInt(valStr, 10), count }))
        .sort((a, b) => b.count - a.count || b.val - a.val);

      // 2. Four of a Kind (Quadra)
      if (sortedRanks[0]?.count === 4) {
        const quadVal = sortedRanks[0].val;
        const kicker = sortedRanks.find((r) => r.val !== quadVal)?.val || 0;
        return {
          rankName: `Quadra de ${quadVal === 14 ? 'Ás' : quadVal}`,
          category: 8,
          score: 8000000 + quadVal * 100 + kicker,
          description: 'Quatro cartas do mesmo valor!'
        };
      }

      // 3. Full House
      if (sortedRanks[0]?.count === 3 && sortedRanks[1]?.count >= 2) {
        const tripVal = sortedRanks[0].val;
        const pairVal = sortedRanks[1].val;
        return {
          rankName: `Full House (${tripVal === 14 ? 'Áses' : tripVal} com ${pairVal === 14 ? 'Áses' : pairVal})`,
          category: 7,
          score: 7000000 + tripVal * 100 + pairVal,
          description: 'Trinca combinada com um par!'
        };
      }

      // 4. Flush
      if (flushSuit && suitCards[flushSuit]) {
        const fVals = suitCards[flushSuit];
        const fScore = fVals.slice(0, 5).reduce((acc, v, idx) => acc + v * Math.pow(10, 4 - idx), 0);
        return {
          rankName: `Flush ao ${fVals[0] === 14 ? 'Ás' : fVals[0]}`,
          category: 6,
          score: 6000000 + fScore,
          description: 'Cinco cartas do mesmo naipe.'
        };
      }

      // 5. Straight
      const allVals = cardVals.map((c) => c.val);
      const straightHigh = findStraight(allVals);
      if (straightHigh) {
        return {
          rankName: `Sequência ao ${straightHigh === 14 ? 'Ás' : straightHigh}`,
          category: 5,
          score: 5000000 + straightHigh,
          description: 'Cinco cartas em ordem consecutiva!'
        };
      }

      // 6. Three of a Kind (Trinca)
      if (sortedRanks[0]?.count === 3) {
        const tripVal = sortedRanks[0].val;
        const kickers = sortedRanks.filter((r) => r.val !== tripVal).slice(0, 2);
        const kScore = (kickers[0]?.val || 0) * 10 + (kickers[1]?.val || 0);
        return {
          rankName: `Trinca de ${tripVal === 14 ? 'Ás' : tripVal}`,
          category: 4,
          score: 4000000 + tripVal * 100 + kScore,
          description: 'Três cartas de mesmo valor!'
        };
      }

      // 7. Two Pair (Dois Pares)
      if (sortedRanks[0]?.count >= 2 && sortedRanks[1]?.count >= 2) {
        const highPair = Math.max(sortedRanks[0].val, sortedRanks[1].val);
        const lowPair = Math.min(sortedRanks[0].val, sortedRanks[1].val);
        const kicker = sortedRanks.find((r) => r.val !== highPair && r.val !== lowPair)?.val || 0;
        return {
          rankName: `Dois Pares (${highPair === 14 ? 'Ás' : highPair} e ${lowPair === 14 ? 'Ás' : lowPair})`,
          category: 3,
          score: 3000000 + highPair * 1000 + lowPair * 10 + kicker,
          description: 'Dois pares de valores diferentes.'
        };
      }

      // 8. One Pair (Um Par)
      if (sortedRanks[0]?.count === 2) {
        const pairVal = sortedRanks[0].val;
        const kickers = sortedRanks.filter((r) => r.val !== pairVal).slice(0, 3);
        const kScore = (kickers[0]?.val || 0) * 100 + (kickers[1]?.val || 0) * 10 + (kickers[2]?.val || 0);
        return {
          rankName: `Par de ${pairVal === 14 ? 'Ás' : pairVal === 13 ? 'Rei' : pairVal === 12 ? 'Dama' : pairVal === 11 ? 'Valete' : pairVal}`,
          category: 2,
          score: 2000000 + pairVal * 1000 + kScore,
          description: 'Duas cartas de mesmo valor.'
        };
      }

      // 9. High Card
      const sortedSingles = allVals.sort((a, b) => b - a).slice(0, 5);
      const highVal = sortedSingles[0] || 0;
      const hScore = sortedSingles.reduce((acc, v, idx) => acc + v * Math.pow(10, 4 - idx), 0);
      return {
        rankName: `Carta Alta (${highVal === 14 ? 'Ás' : highVal === 13 ? 'Rei' : highVal === 12 ? 'Dama' : highVal === 11 ? 'Valete' : highVal})`,
        category: 1,
        score: 1000000 + hScore,
        description: 'Sem par. Vale a carta de maior valor.'
      };
    } catch (e) {
      console.error('Error evaluating poker hand:', e);
      return { rankName: 'Carta Alta', category: 1, score: 1000000, description: 'Mão padrão.' };
    }
  };

  const playerEval = useMemo(() => {
    return evaluateHand(playerHand, communityCards);
  }, [playerHand, communityCards]);

  // Start new hand
  const startNewHand = () => {
    if (playerBankroll < tableStakes.big) {
      setGameMessage('Fichas insuficientes! Recarregue gratuitamente no cabeçalho.');
      return;
    }

    setIsShuffling(true);
    playSound('shuffle');
    setGameMessage('Embaralhando o baralho de 52 cartas...');

    safeTimeout(() => {
      const newDeck = shuffleDeck();

      // Deal 2 hole cards to player
      const p1 = newDeck.pop() || allCards[0];
      const p2 = newDeck.pop() || allCards[1];
      setPlayerHand([p1, p2]);
      setPlayerFolded(false);

      // Deal 2 hole cards to each AI
      const updatedAi: AIPlayerState[] = aiPlayers.map((ai) => {
        const c1 = newDeck.pop() || allCards[2];
        const c2 = newDeck.pop() || allCards[3];
        return {
          ...ai,
          hand: [c1, c2],
          folded: false,
          currentBet: 0,
          lastAction: undefined
        };
      });

      setDeck(newDeck);
      setCommunityCards([]);
      setRound('preflop');
      setWinnerMessage(null);
      setIsShuffling(false);
      setIsAiThinking(false);

      // Post Blinds: Small Blind (Player), Big Blind (AI 0)
      const sb = tableStakes.small;
      const bb = tableStakes.big;

      setPlayerBankroll((prev) => Math.max(0, (Number.isFinite(prev) ? prev : 10000) - sb));
      setPlayerCurrentBet(sb);

      let initialPot = sb;

      // First AI posts Big Blind
      if (updatedAi.length > 0) {
        updatedAi[0].chips = Math.max(0, updatedAi[0].chips - bb);
        updatedAi[0].currentBet = bb;
        updatedAi[0].lastAction = `BB $${bb}`;
        initialPot += bb;
      }

      // Other AIs in preflop match BB or fold
      for (let i = 1; i < updatedAi.length; i++) {
        updatedAi[i].chips = Math.max(0, updatedAi[i].chips - bb);
        updatedAi[i].currentBet = bb;
        updatedAi[i].lastAction = `Entrou $${bb}`;
        initialPot += bb;
      }

      setAiPlayers(updatedAi);
      setPot(initialPot);
      setCurrentBet(bb);

      playSound('flip');
      setGameMessage(`Cartas na mesa! Blinds: $${sb}/$${bb}. É a sua vez de agir.`);
    }, 600);
  };

  // Safe Next round dealer advance
  const advanceToNextRound = () => {
    try {
      playSound('flip');
      setDeck((prevDeck) => {
        let curDeck = [...(prevDeck || [])];
        if (curDeck.length < 5) {
          curDeck = shuffleDeck();
        }

        setRound((prevRound) => {
          if (prevRound === 'preflop') {
            const c1 = curDeck.pop() || allCards[0];
            const c2 = curDeck.pop() || allCards[1];
            const c3 = curDeck.pop() || allCards[2];
            setCommunityCards([c1, c2, c3]);
            setCurrentBet(0);
            setPlayerCurrentBet(0);
            setAiPlayers((prev) => prev.map((a) => ({ ...a, currentBet: 0, lastAction: undefined })));
            setGameMessage('Flop na mesa! Sua vez de agir.');
            return 'flop';
          } else if (prevRound === 'flop') {
            const c4 = curDeck.pop() || allCards[3];
            setCommunityCards((prev) => [...(prev || []), c4]);
            setCurrentBet(0);
            setPlayerCurrentBet(0);
            setAiPlayers((prev) => prev.map((a) => ({ ...a, currentBet: 0, lastAction: undefined })));
            setGameMessage('Turn revelado! Sua vez de agir.');
            return 'turn';
          } else if (prevRound === 'turn') {
            const c5 = curDeck.pop() || allCards[4];
            setCommunityCards((prev) => [...(prev || []), c5]);
            setCurrentBet(0);
            setPlayerCurrentBet(0);
            setAiPlayers((prev) => prev.map((a) => ({ ...a, currentBet: 0, lastAction: undefined })));
            setGameMessage('River revelado! Última rodada de apostas antes do Showdown.');
            return 'river';
          } else if (prevRound === 'river') {
            // Showdown evaluation among all non-folded players
            handleShowdown();
            return 'showdown';
          }
          return prevRound;
        });

        return curDeck;
      });
    } catch (e) {
      console.error('Error advancing poker round:', e);
      setRound('showdown');
    }
  };

  const handleShowdown = () => {
    // Evaluate player
    const candidates: { name: string; score: number; rankName: string; isPlayer: boolean; aiIndex?: number }[] = [];

    if (!playerFolded) {
      candidates.push({
        name: 'Você',
        score: playerEval.score,
        rankName: playerEval.rankName,
        isPlayer: true
      });
    }

    aiPlayers.forEach((ai, idx) => {
      if (!ai.folded && ai.hand.length === 2) {
        const ev = evaluateHand(ai.hand, communityCards);
        candidates.push({
          name: ai.name,
          score: ev.score,
          rankName: ev.rankName,
          isPlayer: false,
          aiIndex: idx
        });
      }
    });

    if (candidates.length === 0) {
      setWinnerMessage('Todos desistiram.');
      return;
    }

    // Sort by best score descending
    candidates.sort((a, b) => b.score - a.score);
    const winner = candidates[0];
    const curPot = pot || 0;

    if (winner.isPlayer) {
      playSound('chime');
      try {
        confetti({ particleCount: 75, spread: 85, origin: { y: 0.6 } });
      } catch (_) {}
      setWinnerMessage(`🏆 VOCÊ VENCEU com ${winner.rankName}! Faturou o pote de $${curPot.toLocaleString()}!`);
      setPlayerBankroll((prev) => (Number.isFinite(prev) ? prev : 10000) + curPot);
    } else {
      playSound('click');
      setWinnerMessage(`🏛️ ${winner.name} venceu com ${winner.rankName}!`);
      if (winner.aiIndex !== undefined) {
        setAiPlayers((prev) => {
          const updated = [...prev];
          updated[winner.aiIndex!].chips += curPot;
          return updated;
        });
      }
    }
  };

  // AI Tactical Profiles for Bluffing, Value-Raising & Folds
  const AI_PERSONALITIES: Record<string, { aggression: number; bluffRate: number; foldTendency: number }> = {
    poseidon: { aggression: 0.85, bluffRate: 0.28, foldTendency: 0.35 },
    hera: { aggression: 0.72, bluffRate: 0.08, foldTendency: 0.65 },
    hefesto: { aggression: 0.50, bluffRate: 0.12, foldTendency: 0.45 },
    artemis: { aggression: 0.65, bluffRate: 0.22, foldTendency: 0.40 },
    apolo: { aggression: 0.80, bluffRate: 0.26, foldTendency: 0.38 }
  };

  // Helper to rate pre-flop 2-card hand strength
  const getPreflopScore = (cards: CardData[]): number => {
    if (!cards || cards.length < 2) return 50;
    const v1 = rankToNum(cards[0].rank);
    const v2 = rankToNum(cards[1].rank);
    const isPair = v1 === v2;
    const isSuited = cards[0].suitCode === cards[1].suitCode;
    const high = Math.max(v1, v2);
    const low = Math.min(v1, v2);

    if (isPair) {
      if (high >= 10) return 96; // AA, KK, QQ, JJ, TT
      if (high >= 7) return 80;  // 77, 88, 99
      return 68;                 // 22-66
    }
    if (high === 14) {
      if (low >= 10) return isSuited ? 92 : 86; // AK, AQ, AJ, AT
      if (low >= 7) return isSuited ? 74 : 64;
      return isSuited ? 62 : 48;
    }
    if (high === 13) {
      if (low >= 10) return isSuited ? 82 : 75; // KQ, KJ, KT
      return isSuited ? 60 : 45;
    }
    if (isSuited && high - low === 1 && high >= 7) return 72; // Suited connectors (JT, T9, 98, 87)
    if (high >= 11 && low >= 9) return 60;
    if (high <= 8 && !isSuited) return 20; // 72o, 83o, etc.
    return 42;
  };

  // AI Tactical Moves after player acts
  const handleAIsTurn = (onComplete?: () => void) => {
    setIsAiThinking(true);
    setGameMessage('🤖 Oponentes da mesa estão calculando as probabilidades...');

    safeTimeout(() => {
      setIsAiThinking(false);

      let highestBetOnTable = currentBet || 0;
      let potAddition = 0;
      let someoneRaised = false;
      let raiserName = '';
      let raiseAmount = 0;
      const roundActions: string[] = [];

      setAiPlayers((prev) => {
        const updated = prev.map((ai) => {
          if (ai.folded) return ai;

          const toCall = Math.max(0, highestBetOnTable - (ai.currentBet || 0));
          const ev = evaluateHand(ai.hand, communityCards);
          const personality = AI_PERSONALITIES[ai.id] || {
            aggression: 0.6,
            bluffRate: 0.18,
            foldTendency: 0.45
          };

          const preScore = getPreflopScore(ai.hand);
          const isPostFlop = communityCards.length >= 3;
          const handCategory = ev.category; // 0: High Card, 1: Pair, 2: Two Pair, etc.

          // 1. EVALUATE FOLD: Folds weak hands when facing bets
          if (toCall > 0) {
            let shouldFold = false;

            if (!isPostFlop) {
              if (toCall >= tableStakes.big * 2 && preScore < 45 && Math.random() < personality.foldTendency) {
                shouldFold = true;
              } else if (toCall >= tableStakes.big * 4 && preScore < 70) {
                shouldFold = true;
              }
            } else {
              // Postflop: Weak high-card with no draw facing bet
              if (handCategory === 0 && toCall >= tableStakes.big && Math.random() < personality.foldTendency + 0.25) {
                shouldFold = true;
              } else if (handCategory === 1 && toCall > tableStakes.big * 2 && Math.random() < personality.foldTendency * 0.7) {
                shouldFold = true;
              }
            }

            if (shouldFold && ai.chips >= 0) {
              roundActions.push(`${ai.name.split(' ')[0]} desistiu (Fold)`);
              return { ...ai, folded: true, lastAction: 'Desistiu (Fold)' };
            }
          }

          // 2. EVALUATE RAISE OR BLUFF
          let shouldRaise = false;
          let isBluffing = false;

          if (!someoneRaised && ai.chips > toCall + tableStakes.big) {
            if (!isPostFlop) {
              // Monster hand preflop
              if (preScore >= 80 && Math.random() < personality.aggression) {
                shouldRaise = true;
              } else if (Math.random() < personality.bluffRate * 0.5) {
                shouldRaise = true;
                isBluffing = true;
              }
            } else {
              // Strong made hand postflop (Two Pair, Trips, Straight, Flush)
              if (handCategory >= 2 && Math.random() < personality.aggression) {
                shouldRaise = true;
              } else if (handCategory === 1 && Math.random() < personality.aggression * 0.4) {
                shouldRaise = true;
              } else if (handCategory === 0 && Math.random() < personality.bluffRate) {
                // Tactical pure bluff
                shouldRaise = true;
                isBluffing = true;
              }
            }
          }

          if (shouldRaise) {
            someoneRaised = true;
            raiserName = ai.name.split(' ')[0];
            raiseAmount = tableStakes.big;
            const totalBet = toCall + raiseAmount;
            const actualBet = Math.min(ai.chips, totalBet);
            potAddition += actualBet;
            highestBetOnTable = Math.max(highestBetOnTable, (ai.currentBet || 0) + actualBet);

            const actionLabel = isBluffing
              ? `Aumentou +$${raiseAmount} (Blefe)`
              : `Aumentou +$${raiseAmount}`;

            roundActions.push(`${ai.name.split(' ')[0]} aumentou +$${raiseAmount}!`);

            return {
              ...ai,
              chips: ai.chips - actualBet,
              currentBet: (ai.currentBet || 0) + actualBet,
              lastAction: actionLabel
            };
          }

          // 3. EVALUATE CALL OR CHECK
          if (toCall > 0) {
            const actualCall = Math.min(ai.chips, toCall);
            potAddition += actualCall;
            roundActions.push(`${ai.name.split(' ')[0]} pagou $${actualCall}`);
            return {
              ...ai,
              chips: ai.chips - actualCall,
              currentBet: (ai.currentBet || 0) + actualCall,
              lastAction: `Pagou $${actualCall}`
            };
          }

          // Check
          roundActions.push(`${ai.name.split(' ')[0]} deu mesa`);
          return { ...ai, lastAction: 'Mesa (Check)' };
        });

        if (potAddition > 0) {
          setPot((p) => (Number.isFinite(p) ? p : 0) + potAddition);
        }

        if (highestBetOnTable > (currentBet || 0)) {
          setCurrentBet(highestBetOnTable);
        }

        return updated;
      });

      // Post-action evaluation
      safeTimeout(() => {
        setAiPlayers((currentAis) => {
          const activeAis = currentAis.filter((a) => !a.folded);
          if (activeAis.length === 0) {
            // All AIs folded! Player sweeps the pot!
            playSound('chime');
            setWinnerMessage('🎉 Todos os oponentes desistiram (Fold)! Você levou o pote!');
            setGameMessage('Você venceu a rodada por desistência dos adversários!');
            setPlayerBankroll((prev) => (Number.isFinite(prev) ? prev : 10000) + pot + potAddition);
            setRound('showdown');
            return currentAis;
          }

          if (someoneRaised) {
            playSound('chime');
            setGameMessage(`💥 ${raiserName} aumentou a aposta para $${highestBetOnTable}! É a sua vez de pagar, aumentar ou desistir.`);
          } else {
            if (roundActions.length > 0) {
              setGameMessage(roundActions.slice(-2).join(' • ') + '. Rodada concluída.');
            }
            if (onComplete) onComplete();
          }

          return currentAis;
        });
      }, 350);
    }, 700);
  };

  // Player action: Check
  const handleCheck = () => {
    if (isAiThinking || isShuffling || round === 'showdown') return;
    playSound('click');
    setGameMessage('Você deu Mesa (Check). Vez dos oponentes.');
    handleAIsTurn(() => advanceToNextRound());
  };

  // Player action: Call
  const handleCall = () => {
    if (isAiThinking || isShuffling || round === 'showdown') return;
    playSound('click');
    const diff = Math.max(0, (currentBet || 0) - (playerCurrentBet || 0));
    if ((playerBankroll || 0) < diff) {
      setGameMessage('Saldo insuficiente para pagar!');
      return;
    }
    setPlayerBankroll((prev) => Math.max(0, (Number.isFinite(prev) ? prev : 10000) - diff));
    setPlayerCurrentBet(currentBet || 0);
    setPot((prev) => (Number.isFinite(prev) ? prev : 0) + diff);
    setGameMessage(`Você pagou $${diff} e igualou a aposta.`);
    // Bets are settled on this street, dealer advances to next street
    advanceToNextRound();
  };

  // Player action: Bet or Raise
  const handleBetOrRaise = (customRaise = tableStakes.big) => {
    if (isAiThinking || isShuffling || round === 'showdown') return;
    playSound('click');
    const safeRaise = Number.isFinite(customRaise) && customRaise > 0 ? customRaise : tableStakes.big;
    const callDiff = Math.max(0, (currentBet || 0) - (playerCurrentBet || 0));
    const totalNeeded = callDiff + safeRaise;

    if ((playerBankroll || 0) < totalNeeded) {
      setGameMessage('Saldo de fichas insuficiente para aumentar!');
      return;
    }

    setPlayerBankroll((prev) => Math.max(0, (Number.isFinite(prev) ? prev : 10000) - totalNeeded));
    const nextCurrentBet = (currentBet || 0) + safeRaise;
    setPlayerCurrentBet(nextCurrentBet);
    setCurrentBet(nextCurrentBet);
    setPot((prev) => (Number.isFinite(prev) ? prev : 0) + totalNeeded);
    setGameMessage(`Você apostou +$${safeRaise}!`);
    handleAIsTurn(() => advanceToNextRound());
  };

  // Player action: Fold
  const handleFold = () => {
    if (isAiThinking || isShuffling || round === 'showdown') return;
    playSound('flip');
    setPlayerFolded(true);
    setRound('showdown');
    setWinnerMessage('Você desistiu da mão (Fold).');
    setGameMessage('Mão encerrada.');
    handleShowdown();
  };

  const toCall = Math.max(0, (currentBet || 0) - (playerCurrentBet || 0));

  return (
    <div className="h-full max-h-full w-full max-w-7xl mx-auto flex flex-col justify-between p-2 short:p-1 select-none overflow-hidden gap-1.5 short:gap-1">
      {/* Sleek Top Bar: Back to Game Hub & Table Info (No redundant Saldo sub-bar) */}
      <div className="h-11 short:h-8 tiny:h-7 shrink-0 bg-slate-900/95 border border-amber-500/30 rounded-xl px-3 flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              onClick={onBack}
              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors shadow-sm"
              title="Voltar ao Salão de Jogos"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">Escolher Outro Jogo</span>
            </button>
          )}

          <div className="flex items-center gap-2">
            <span className="text-xs sm:text-sm font-black text-amber-300">
              Poker Texas Hold'em
            </span>
            <span className="text-[11px] font-bold text-slate-400 hidden md:inline">
              • Mesa Olimpo
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-[11px] font-mono font-bold text-amber-300">
            <Users className="w-3 h-3 text-amber-400" />
            <span>{totalSeats} Jogadores</span>
          </div>

          <div className="text-[11px] font-mono text-slate-400 hidden sm:block">
            Blinds: <span className="text-slate-200 font-bold">${tableStakes.small}/${tableStakes.big}</span>
          </div>
        </div>
      </div>

      {/* Main Poker Felt Table (Flexible height, fits 100% viewport without scrolling) */}
      <div className="flex-1 min-h-0 relative rounded-2xl sm:rounded-3xl bg-gradient-to-b from-[#0c2e1f] via-[#082015] to-[#04120c] border-2 sm:border-3 border-amber-500/40 p-2 sm:p-3 short:p-1.5 shadow-2xl flex flex-col justify-between short:flex-row short:items-center short:gap-2 overflow-hidden">
        {/* Table Felt Inner Oval Ring */}
        <div className="absolute inset-x-4 top-3 bottom-3 short:inset-x-2 short:top-1.5 short:bottom-1.5 border-2 border-dashed border-emerald-500/15 rounded-full pointer-events-none" />

        {/* 1. Opponents Section (Arranged across the top of the table) */}
        <div className="relative z-10 shrink-0 flex items-center justify-around gap-2 px-1 short:flex-wrap short:content-center short:justify-center short:gap-x-1.5 short:gap-y-3 tiny:gap-y-2 short:px-0 short:w-[40%] tiny:w-[50%]">
          {aiPlayers.map((ai, index) => {
            const isFolded = ai.folded;
            return (
              <div
                key={ai.id}
                className={`flex flex-col items-center transition-all ${
                  isFolded ? 'opacity-40 grayscale' : 'opacity-100'
                }`}
              >
                {/* AI Header Badge */}
                <div className="flex items-center gap-1.5 bg-black/80 border border-emerald-500/40 px-2 py-0.5 short:px-1.5 short:py-0 rounded-full text-[10px] sm:text-[11px] short:text-[9px] font-bold text-emerald-200 shadow-md">
                  <span className="text-xs">{ai.avatar}</span>
                  <span className="truncate max-w-[70px] sm:max-w-[100px] short:max-w-[56px]">{ai.name.split(' ')[0]}</span>
                  <span className="text-amber-400 font-mono hidden sm:inline tiny:hidden">
                    ${ai.chips.toLocaleString()}
                  </span>
                </div>

                {/* AI Cards & Bet Badge */}
                <div className="relative flex items-center gap-1 sm:gap-1.5 mt-1 short:mt-0.5">
                  {ai.hand.length > 0 ? (
                    ai.hand.map((c, i) => (
                      <div
                        key={i}
                        className="relative h-18 sm:h-24 md:h-28 lg:h-32 short:h-[14dvh] tiny:h-[11dvh] aspect-[640/1120] rounded-lg sm:rounded-xl overflow-hidden border-2 border-emerald-500/60 shadow-xl bg-slate-950 transition-transform hover:scale-105"
                      >
                        <img
                          src={
                            round === 'showdown' && c && c.file
                              ? `/assets/deck/thumb/${c.file.replace('.png', '.webp')}`
                              : '/assets/deck/thumb/BACK.webp'
                          }
                          onError={(e) => {
                            (e.target as HTMLImageElement).src =
                              round === 'showdown' && c && c.file ? `/assets/deck/${c.file}` : '/assets/deck/BACK.png';
                          }}
                          alt="Carta IA"
                          className="w-full h-full object-cover rendering-pixelated"
                        />
                        {/* Showdown Rank & Suit Indicator for Immediate Readability */}
                        {round === 'showdown' && c && (
                          <div className="absolute top-0.5 left-0.5 bg-black/90 px-1.5 py-0.5 rounded text-[10px] sm:text-xs font-black flex items-center gap-0.5 border border-amber-400/50 shadow">
                            <span className="text-amber-300">{c.rank}</span>
                            <span style={{ color: c.color }}>{c.suitSymbol}</span>
                          </div>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="flex gap-1 opacity-25">
                      <div className="h-18 sm:h-24 md:h-28 lg:h-32 short:h-[14dvh] tiny:h-[11dvh] aspect-[640/1120] rounded-lg sm:rounded-xl border-2 border-dashed border-emerald-500" />
                      <div className="h-18 sm:h-24 md:h-28 lg:h-32 short:h-[14dvh] tiny:h-[11dvh] aspect-[640/1120] rounded-lg sm:rounded-xl border-2 border-dashed border-emerald-500" />
                    </div>
                  )}

                  {/* AI Status / Action Pill */}
                  {ai.lastAction && (
                    <div className="absolute -bottom-2.5 short:-bottom-1.5 bg-slate-950/95 border border-amber-400/80 text-amber-300 px-2 py-0.5 short:px-1 short:py-0 rounded text-[9px] sm:text-[10px] short:text-[8px] font-black uppercase shadow-lg tracking-wider whitespace-nowrap z-20">
                      {ai.lastAction}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* 2. Center Felt: Turn Banner, Message, Pot & ENLARGED Community Cards */}
        <div className="relative z-10 flex-1 min-h-0 min-w-0 flex flex-col items-center justify-center py-0.5 short:flex-row short:flex-wrap short:content-center short:justify-center short:gap-x-2 short:gap-y-1">
          {/* Active Turn Pill */}
          <div className="h-6 flex items-center justify-center mb-1 short:h-5 short:mb-0 short:order-1">
            {playerHand.length > 0 && round !== 'showdown' && (
              <div
                className={`px-3 py-0.5 rounded-full text-[11px] font-black tracking-wide uppercase flex items-center gap-1.5 shadow-md ${
                  !isAiThinking
                    ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-black border border-emerald-300 animate-pulse'
                    : 'bg-slate-900 text-amber-400 border border-amber-500/40'
                }`}
              >
                {!isAiThinking ? (
                  <>
                    <Sparkles className="w-3 h-3 text-black" />
                    <span>SUA VEZ DE JOGAR</span>
                  </>
                ) : (
                  <>
                    <Bot className="w-3 h-3 text-amber-400" />
                    <span>IA PENSANDO...</span>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Top Status & Message Box (Safely above cards, never covered by player hand) */}
          <div className="h-6 mb-1.5 flex items-center justify-center short:h-5 short:mb-0 short:order-3 short:basis-full min-w-0">
            <div className="text-[11px] sm:text-xs font-bold text-slate-100 bg-black/90 px-3.5 py-0.5 rounded-full border border-slate-700 shadow-lg max-w-lg text-center truncate short:text-[10px] short:px-2 short:py-0 short:max-w-full">
              {winnerMessage ? (
                <span className="text-amber-300 font-black animate-pulse">{winnerMessage}</span>
              ) : (
                gameMessage
              )}
            </div>
          </div>

          {/* Pot Display */}
          <div className="flex items-center gap-2 bg-black/85 border border-amber-400/70 px-4 py-0.5 rounded-full text-amber-300 font-mono font-black text-xs sm:text-sm shadow-xl mb-2 short:mb-0 short:py-0 short:px-2.5 short:text-[11px] short:order-2">
            <Coins className="w-4 h-4 text-amber-400" />
            <span>Pote: ${(pot || 0).toLocaleString()}</span>
          </div>

          {/* ENLARGED Community Cards with Clear Rank & Suit Indicators */}
          <div className="flex items-center gap-2 sm:gap-3 md:gap-3.5 short:gap-1 short:order-4 short:basis-full short:justify-center">
            {[0, 1, 2, 3, 4].map((idx) => {
              const card = communityCards[idx];
              return (
                <div
                  key={idx}
                  className="relative h-28 sm:h-36 md:h-44 short:h-[32dvh] tiny:h-[27dvh] aspect-[640/1120] rounded-xl border-2 sm:border-3 border-amber-500/60 bg-slate-950/95 shadow-2xl overflow-hidden flex items-center justify-center transform transition-transform hover:scale-102"
                >
                  {card && card.file ? (
                    <>
                      <img
                        src={`/assets/deck/thumb/${card.file.replace('.png', '.webp')}`}
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = `/assets/deck/${card.file}`;
                        }}
                        alt={card.name}
                        className="w-full h-full object-cover rendering-pixelated"
                      />
                      {/* Prominent Corner Overlay Badge for Crystal Clarity */}
                      <div className="absolute top-1 left-1 short:top-0.5 short:left-0.5 bg-black/85 px-1.5 py-0.5 short:px-1 short:py-0 rounded text-[11px] short:text-[9px] font-black flex items-center gap-1 shadow-md border border-amber-500/40">
                        <span className="text-amber-300">{card.rank}</span>
                        <span style={{ color: card.color }}>{card.suitSymbol}</span>
                      </div>
                    </>
                  ) : (
                    <div className="w-full h-full border-2 border-dashed border-emerald-900/60 rounded-xl flex items-center justify-center">
                      <span className="text-[10px] sm:text-xs text-emerald-600/70 font-mono font-bold uppercase tracking-wider">
                        {idx < 3 ? 'FLOP' : idx === 3 ? 'TURN' : 'RIVER'}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* 3. Player Section (Bottom - ENLARGED Hole Cards & Subtle Clean Hand Badge) */}
        <div className="relative z-10 shrink-0 flex items-center justify-center pb-1 gap-4 sm:gap-6 short:pb-0 short:gap-2">
          {/* ENLARGED Player Hole Cards */}
          <div className="flex items-center gap-2 sm:gap-3">
            {playerHand.length > 0 ? (
              playerHand.map((c, i) => (
                <div
                  key={i}
                  className="relative h-32 sm:h-44 md:h-52 short:h-[32dvh] tiny:h-[27dvh] aspect-[640/1120] rounded-xl sm:rounded-2xl overflow-hidden border-2 sm:border-3 border-amber-400 shadow-2xl bg-slate-950 transform hover:-translate-y-2 transition-transform"
                >
                  {c && c.file ? (
                    <>
                      <img
                        src={`/assets/deck/thumb/${c.file.replace('.png', '.webp')}`}
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = `/assets/deck/${c.file}`;
                        }}
                        alt={c.name}
                        className="w-full h-full object-cover rendering-pixelated"
                      />
                      {/* High-visibility corner badge */}
                      <div className="absolute top-1 left-1 short:top-0.5 short:left-0.5 bg-black/90 px-1.5 py-0.5 short:px-1 short:py-0 rounded text-xs sm:text-sm short:text-[10px] font-black flex items-center gap-1 shadow-md border border-amber-400/50">
                        <span className="text-amber-300">{c.rank}</span>
                        <span style={{ color: c.color }}>{c.suitSymbol}</span>
                      </div>
                    </>
                  ) : null}
                </div>
              ))
            ) : (
              <div className="flex gap-2">
                <div className="h-32 sm:h-44 md:h-52 short:h-[32dvh] tiny:h-[27dvh] aspect-[640/1120] rounded-xl border-2 border-dashed border-amber-500/40 flex items-center justify-center text-amber-500/40 text-base font-bold">
                  ?
                </div>
                <div className="h-32 sm:h-44 md:h-52 short:h-[32dvh] tiny:h-[27dvh] aspect-[640/1120] rounded-xl border-2 border-dashed border-amber-500/40 flex items-center justify-center text-amber-500/40 text-base font-bold">
                  ?
                </div>
              </div>
            )}
          </div>

          {/* Subtle, Non-Overlapping Hand Strength Badge */}
          {playerHand.length > 0 && playerEval && (
            <div className="hidden sm:flex short:hidden flex-col justify-center bg-slate-950/90 border border-amber-500/40 px-3.5 py-2 rounded-2xl shadow-xl max-w-[200px]">
              <div className="text-[10px] text-amber-400/80 font-bold uppercase tracking-wider flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-amber-400" />
                <span>Sua Combinação</span>
              </div>
              <div className="text-xs sm:text-sm font-black text-amber-200 mt-0.5 leading-snug">
                {playerEval.rankName}
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5 line-clamp-2">
                {playerEval.description}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 4. Interactive Betting & Action Bar (Comfortable h-16 for enlarged chips) */}
      <div className="h-16 short:h-12 tiny:h-10 shrink-0 bg-slate-900/95 border border-slate-800 rounded-xl px-3 flex items-center justify-between shadow-xl">
        {playerHand.length === 0 || round === 'showdown' ? (
          <div className="flex items-center justify-between w-full">
            <div className="text-xs text-slate-400 hidden sm:block">
              Mesa com {totalSeats} jogadores. Blinds automáticos: ${tableStakes.small} / ${tableStakes.big}.
            </div>
            <button
              onClick={startNewHand}
              disabled={isShuffling}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-xl shadow-amber-500/20 active:scale-95 transition-all ml-auto cursor-pointer"
            >
              <Shuffle className={`w-4 h-4 ${isShuffling ? 'animate-spin' : ''}`} />
              <span>{round === 'showdown' ? 'Embaralhar & Nova Mão' : 'Iniciar Mão de Poker'}</span>
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between w-full gap-2">
            {/* Quick Chip Betting Presets with authentic chips (All 5) */}
            <div className="hidden sm:flex items-center gap-1.5 md:gap-2">
              <span className="text-[11px] text-slate-400 font-bold hidden lg:inline">Apostar:</span>
              <CasinoChip value={1} size="sm" onClick={() => handleBetOrRaise(1)} />
              <CasinoChip value={5} size="sm" onClick={() => handleBetOrRaise(5)} />
              <CasinoChip value={25} size="sm" onClick={() => handleBetOrRaise(25)} />
              <CasinoChip value={100} size="sm" onClick={() => handleBetOrRaise(100)} />
              <CasinoChip value={500} size="sm" onClick={() => handleBetOrRaise(500)} />
            </div>

            {/* Mobile combination display if hidden on table */}
            <div className="sm:hidden short:block text-xs font-bold text-amber-300 truncate max-w-[120px]">
              {playerEval?.rankName}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-1.5 sm:gap-2 ml-auto">
              <button
                onClick={handleFold}
                disabled={isAiThinking}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-red-300 font-bold text-xs whitespace-nowrap short:px-2.5 short:text-[11px] border border-slate-700 transition-colors disabled:opacity-50 cursor-pointer"
              >
                Desistir (Fold)
              </button>

              {toCall === 0 ? (
                <button
                  onClick={handleCheck}
                  disabled={isAiThinking}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-100 font-bold text-xs whitespace-nowrap short:px-2.5 short:text-[11px] border border-slate-700 transition-colors disabled:opacity-50 cursor-pointer"
                >
                  Mesa (Check)
                </button>
              ) : (
                <button
                  onClick={handleCall}
                  disabled={isAiThinking}
                  className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs whitespace-nowrap short:px-2.5 short:text-[11px] shadow-md transition-colors disabled:opacity-50 cursor-pointer"
                >
                  Pagar ${toCall} (Call)
                </button>
              )}

              <button
                onClick={() => handleBetOrRaise(tableStakes.big)}
                disabled={isAiThinking}
                className="px-4 py-1.5 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs sm:text-sm shadow-lg whitespace-nowrap short:px-2.5 short:text-[11px] shadow-amber-500/20 transition-all disabled:opacity-50 cursor-pointer"
              >
                Apostar +${tableStakes.big}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
