import React, { useState, useEffect, useRef } from 'react';
import rawCardsData from '../../cards_data.json';
import { CardData, AIDifficulty } from '../../types/deck';
import { playSound } from '../../utils/audio';
import confetti from 'canvas-confetti';
import {
  Flame,
  Swords,
  RotateCcw,
  Sparkles,
  Trophy,
  Brain,
  Bot,
  User,
  ShieldAlert,
  Shuffle,
  Volume2,
  CheckCircle2,
  AlertTriangle,
  ArrowLeft,
  Users,
  Shield,
  Crown
} from 'lucide-react';

const allDeckCards: CardData[] = rawCardsData as CardData[];

// Filter cards for Truco (40 cards: 4, 5, 6, 7, Q, J, K, A, 2, 3)
const TRUCO_RANKS = ['4', '5', '6', '7', 'Q', 'J', 'K', 'A', '2', '3'];
const trucoDeck = allDeckCards.filter((c) => TRUCO_RANKS.includes(c.rank) && c.suitCode !== 'X');

export type TrucoVariant = 'paulista' | 'mineiro';

export interface TrucoPlayer {
  id: string;
  name: string;
  team: 'nos' | 'eles';
  isHuman: boolean;
  hand: CardData[];
  avatar: string;
}

export interface VazaCardPlay {
  playerIndex: number;
  playerName: string;
  team: 'nos' | 'eles';
  card: CardData;
  power: number;
}

export interface TableVaza {
  plays: VazaCardPlay[];
  winnerTeam?: 'nos' | 'eles' | 'draw';
  winningPlay?: VazaCardPlay;
}

interface TrucoGameProps {
  playerCount?: number; // 2 (1v1), 4 (2v2), or 6 (3v3)
  initialVariant?: TrucoVariant;
  onBack?: () => void;
}

export const TrucoGame: React.FC<TrucoGameProps> = ({
  playerCount = 4,
  initialVariant = 'paulista',
  onBack
}) => {
  // Ensure valid count: 2, 4 or 6
  const totalPlayers = [2, 4, 6].includes(playerCount) ? playerCount : 4;
  const [variant, setVariant] = useState<TrucoVariant>(initialVariant);

  // Scores (Match to 12 points)
  const [nosScore, setNosScore] = useState<number>(0);
  const [elesScore, setElesScore] = useState<number>(0);

  // Round / Hand State
  const [isShuffling, setIsShuffling] = useState<boolean>(false);
  const [roundStarterIndex, setRoundStarterIndex] = useState<number>(0);
  const [activeTurnIndex, setActiveTurnIndex] = useState<number>(0);
  const [viraCard, setViraCard] = useState<CardData | null>(null);

  // All active players around the table
  const [players, setPlayers] = useState<TrucoPlayer[]>(() => initPlayers(totalPlayers));

  // Vazas (Tricks)
  const [tableVazas, setTableVazas] = useState<TableVaza[]>([]);
  const [currentVazaIndex, setCurrentVazaIndex] = useState<number>(0);
  const [vazaWinners, setVazaWinners] = useState<('nos' | 'eles' | 'draw')[]>([]);

  // Truco stakes & challenges
  const [roundPoints, setRoundPoints] = useState<number>(1);
  const [trucoChallenger, setTrucoChallenger] = useState<'nos' | 'eles' | null>(null);
  const [lastTrucoRaiser, setLastTrucoRaiser] = useState<'nos' | 'eles' | null>(null);
  const [pendingStake, setPendingStake] = useState<number>(3);
  const [speechBubble, setSpeechBubble] = useState<{ sender: string; text: string } | null>(null);
  const [statusMessage, setStatusMessage] = useState<string>(
    'Clique em Embaralhar & Distribuir para começar a partida de Truco!'
  );
  const [roundEnded, setRoundEnded] = useState<boolean>(true);
  const [matchWinner, setMatchWinner] = useState<'nos' | 'eles' | null>(null);
  const [selectedCardIdx, setSelectedCardIdx] = useState<number | null>(null);

  // Helper ref to avoid race conditions with timers
  const stateRef = useRef({
    players,
    viraCard,
    currentVazaIndex,
    tableVazas,
    vazaWinners,
    activeTurnIndex,
    roundPoints,
    roundEnded,
    variant
  });
  useEffect(() => {
    stateRef.current = {
      players,
      viraCard,
      currentVazaIndex,
      tableVazas,
      vazaWinners,
      activeTurnIndex,
      roundPoints,
      roundEnded,
      variant
    };
  });

  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);
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

  // Re-initialize players when player count changes
  useEffect(() => {
    setPlayers(initPlayers(totalPlayers));
    handleResetMatch();
  }, [totalPlayers]);

  function initPlayers(count: number): TrucoPlayer[] {
    if (count === 2) {
      return [
        { id: 'p0', name: 'Você', team: 'nos', isHuman: true, hand: [], avatar: '👤' },
        { id: 'p1', name: 'Poseidon', team: 'eles', isHuman: false, hand: [], avatar: '🔱' }
      ];
    } else if (count === 4) {
      return [
        { id: 'p0', name: 'Você', team: 'nos', isHuman: true, hand: [], avatar: '👤' },
        { id: 'p1', name: 'Hera', team: 'eles', isHuman: false, hand: [], avatar: '👑' },
        { id: 'p2', name: 'Poseidon (Parceiro)', team: 'nos', isHuman: false, hand: [], avatar: '🔱' },
        { id: 'p3', name: 'Hefesto', team: 'eles', isHuman: false, hand: [], avatar: '🔨' }
      ];
    } else {
      return [
        { id: 'p0', name: 'Você', team: 'nos', isHuman: true, hand: [], avatar: '👤' },
        { id: 'p1', name: 'Hefesto', team: 'eles', isHuman: false, hand: [], avatar: '🔨' },
        { id: 'p2', name: 'Poseidon (Parceiro)', team: 'nos', isHuman: false, hand: [], avatar: '🔱' },
        { id: 'p3', name: 'Ártemis', team: 'eles', isHuman: false, hand: [], avatar: '🏹' },
        { id: 'p4', name: 'Hera (Parceira)', team: 'nos', isHuman: false, hand: [], avatar: '👑' },
        { id: 'p5', name: 'Apolo', team: 'eles', isHuman: false, hand: [], avatar: '☀️' }
      ];
    }
  }

  // Speech bubble helper
  const shout = (sender: string, text: string) => {
    playSound('chime');
    setSpeechBubble({ sender, text });
    safeTimeout(() => {
      setSpeechBubble((prev) => (prev?.text === text ? null : prev));
    }, 2800);
  };

  // Determine manilha rank for Truco Paulista
  const getManilhaRankPaulista = (vira: CardData) => {
    const order = ['4', '5', '6', '7', 'Q', 'J', 'K', 'A', '2', '3'];
    const idx = order.indexOf(vira.rank);
    return order[(idx + 1) % order.length];
  };

  // Card power comparison
  const getCardPower = (card: CardData, vira: CardData | null) => {
    const suitBonus: Record<string, number> = { D: 1, S: 2, H: 3, C: 4 };

    if (variant === 'paulista' && vira) {
      const manilhaRank = getManilhaRankPaulista(vira);
      if (card.rank === manilhaRank) {
        return 100 + (suitBonus[card.suitCode] || 0); // Manilhas dominate (101 to 104)
      }
    } else if (variant === 'mineiro') {
      if (card.rank === '4' && card.suitCode === 'C') return 104; // Zap
      if (card.rank === '7' && card.suitCode === 'H') return 103; // Copeta
      if (card.rank === 'A' && card.suitCode === 'S') return 102; // Espadilha
      if (card.rank === '7' && card.suitCode === 'D') return 101; // Picafumo
    }

    const normalOrder: Record<string, number> = {
      '4': 1,
      '5': 2,
      '6': 3,
      '7': 4,
      Q: 5,
      J: 6,
      K: 7,
      A: 8,
      '2': 9,
      '3': 10
    };
    return normalOrder[card.rank] || 0;
  };

  // Helper to describe the card and manilha type clearly for the user
  const getTrucoCardLabel = (card: CardData, power: number): string => {
    if (power >= 100) {
      if (variant === 'mineiro') {
        if (power === 104) return 'Zap (4♣)';
        if (power === 103) return 'Copeta (7♥)';
        if (power === 102) return 'Espadilha (A♠)';
        if (power === 101) return 'Picafumo (7♦)';
        return `${card.rank} de ${card.suit} (Manilha)`;
      } else {
        if (card.suitCode === 'C') return `Zap (${card.rank}♣)`;
        if (card.suitCode === 'H') return `Copeta (${card.rank}♥)`;
        if (card.suitCode === 'S') return `Espadilha (${card.rank}♠)`;
        if (card.suitCode === 'D') return `${card.rank} de ${card.suit} (Picafumo)`;
        return `${card.rank} de ${card.suit} (Manilha)`;
      }
    }
    return `${card.rank} de ${card.suit}`;
  };

  // Helper to determine points won when a team refuses/folds on a challenge:
  // Run on 3 -> 1 pt; Run on 6 -> 3 pts; Run on 9 -> 6 pts; Run on 12 -> 9 pts
  const getPointsOnFold = (refusedStake: number): number => {
    if (refusedStake === 3) return 1;
    if (refusedStake === 6) return 3;
    if (refusedStake === 9) return 6;
    if (refusedStake === 12) return 9;
    return 1;
  };

  const getVazaStrongestPlay = (vaza: TableVaza) => {
    if (!vaza.plays || vaza.plays.length === 0) return null;
    const sorted = [...vaza.plays].sort((a, b) => b.power - a.power);
    const best = sorted[0];

    // Check if there is a tie between opposing teams at top power
    const topPowers = sorted.filter((p) => p.power === best.power);
    const hasNos = topPowers.some((p) => p.team === 'nos');
    const hasEles = topPowers.some((p) => p.team === 'eles');
    const isDraw = vaza.winnerTeam === 'draw' || (hasNos && hasEles);

    const cardLabel = getTrucoCardLabel(best.card, best.power);
    const teamLabel = best.team === 'nos' ? 'Nós' : 'Eles';
    return {
      best,
      cardLabel,
      teamLabel,
      playerName: best.playerName,
      isDraw,
      tiedRank: best.card.rank
    };
  };

  // Cryptographic Fisher-Yates shuffle
  const shuffleDeck = () => {
    const deck = [...trucoDeck];
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    return deck;
  };

  // Deal New Round
  const handleDealNewRound = () => {
    if (matchWinner) {
      handleResetMatch();
      return;
    }

    setIsShuffling(true);
    playSound('shuffle');
    setStatusMessage(`Embaralhando o maço para ${totalPlayers} jogadores...`);

    safeTimeout(() => {
      const deck = shuffleDeck();

      // Deal 3 cards to each player
      const updatedPlayers = players.map((p) => {
        const h = [deck.pop()!, deck.pop()!, deck.pop()!];
        return { ...p, hand: h };
      });

      // Draw Vira for Paulista
      const vira = variant === 'paulista' ? deck.pop()! : null;

      // Rotate round starter
      const nextStarter = (roundStarterIndex + 1) % totalPlayers;
      setRoundStarterIndex(nextStarter);
      setActiveTurnIndex(nextStarter);

      setPlayers(updatedPlayers);
      setViraCard(vira);
      setTableVazas([{ plays: [] }]);
      setCurrentVazaIndex(0);
      setVazaWinners([]);
      setRoundPoints(1);
      setTrucoChallenger(null);
      setLastTrucoRaiser(null);
      setRoundEnded(false);
      setIsShuffling(false);

      playSound('flip');
      const starter = updatedPlayers[nextStarter];
      setStatusMessage(
        starter.isHuman
          ? 'Você é a mão da rodada! Jogue sua primeira carta.'
          : `${starter.name} é a mão da rodada e inicia a 1ª vaza.`
      );

      // If AI starts, trigger AI play
      if (!starter.isHuman) {
        safeTimeout(() => {
          executeAiTurn(nextStarter, updatedPlayers, vira, 0, [{ plays: [] }]);
        }, 800);
      }
    }, 600);
  };

  // AI executes a card play
  const executeAiTurn = (
    aiIdx: number,
    currentPlayers: TrucoPlayer[],
    currentVira: CardData | null,
    vazaIdx: number,
    curVazas: TableVaza[]
  ) => {
    const aiPlayer = currentPlayers[aiIdx];
    if (!aiPlayer || aiPlayer.hand.length === 0) return;

    // AI Check for Truco raise if situation is favorable (only opponent team challenges)
    const hasZap = aiPlayer.hand.some((c) => getCardPower(c, currentVira) >= 103);
    if (
      aiPlayer.team === 'eles' &&
      roundPoints === 1 &&
      hasZap &&
      Math.random() > 0.65 &&
      trucoChallenger === null &&
      lastTrucoRaiser !== 'eles'
    ) {
      handleAiAskTruco(aiPlayer.name, 3);
      return;
    }

    // Pick a card: check cards already played in this vaza
    const curVaza = curVazas[vazaIdx] || { plays: [] };
    const plays = curVaza.plays || [];

    // Best play in trick so far
    const highestOpponentPlay = plays
      .filter((p) => p.team !== aiPlayer.team)
      .sort((a, b) => b.power - a.power)[0];

    let chosenCard: CardData;
    let cardIdx = 0;

    if (highestOpponentPlay) {
      // Find lowest card that beats opponent's best
      const winningCards = aiPlayer.hand
        .map((c, idx) => ({ card: c, idx, power: getCardPower(c, currentVira) }))
        .filter((item) => item.power > highestOpponentPlay.power)
        .sort((a, b) => a.power - b.power);

      if (winningCards.length > 0) {
        chosenCard = winningCards[0].card;
        cardIdx = winningCards[0].idx;
      } else {
        // Play lowest card
        const sorted = aiPlayer.hand
          .map((c, idx) => ({ card: c, idx, power: getCardPower(c, currentVira) }))
          .sort((a, b) => a.power - b.power);
        chosenCard = sorted[0].card;
        cardIdx = sorted[0].idx;
      }
    } else {
      // Leading trick: play median card
      cardIdx = Math.floor(aiPlayer.hand.length / 2);
      chosenCard = aiPlayer.hand[cardIdx];
    }

    // Play card
    playSound('flip');
    const updatedHand = aiPlayer.hand.filter((_, i) => i !== cardIdx);
    const updatedPlayers = currentPlayers.map((p, idx) =>
      idx === aiIdx ? { ...p, hand: updatedHand } : p
    );
    setPlayers(updatedPlayers);

    const play: VazaCardPlay = {
      playerIndex: aiIdx,
      playerName: aiPlayer.name,
      team: aiPlayer.team,
      card: chosenCard,
      power: getCardPower(chosenCard, currentVira)
    };

    const nextVazas = [...curVazas];
    if (!nextVazas[vazaIdx]) nextVazas[vazaIdx] = { plays: [] };
    nextVazas[vazaIdx].plays = [...nextVazas[vazaIdx].plays, play];
    setTableVazas(nextVazas);

    // Proceed to next player or resolve trick
    advanceTrickOrTurn(aiIdx, updatedPlayers, currentVira, vazaIdx, nextVazas);
  };

  // Human player plays a card
  const handlePlayCard = (card: CardData, index: number) => {
    if (roundEnded || activeTurnIndex !== 0 || trucoChallenger !== null) return;

    setSelectedCardIdx(null);
    playSound('flip');
    const curPlayer = players[0];
    const updatedHand = curPlayer.hand.filter((_, i) => i !== index);
    const updatedPlayers = players.map((p, idx) =>
      idx === 0 ? { ...p, hand: updatedHand } : p
    );
    setPlayers(updatedPlayers);

    const play: VazaCardPlay = {
      playerIndex: 0,
      playerName: 'Você',
      team: 'nos',
      card,
      power: getCardPower(card, viraCard)
    };

    const nextVazas = [...tableVazas];
    if (!nextVazas[currentVazaIndex]) nextVazas[currentVazaIndex] = { plays: [] };
    nextVazas[currentVazaIndex].plays = [...nextVazas[currentVazaIndex].plays, play];
    setTableVazas(nextVazas);

    advanceTrickOrTurn(0, updatedPlayers, viraCard, currentVazaIndex, nextVazas);
  };

  // Advances to next player in trick, or resolves trick if all players played
  const advanceTrickOrTurn = (
    justPlayedIndex: number,
    curPlayers: TrucoPlayer[],
    curVira: CardData | null,
    vazaIdx: number,
    curVazas: TableVaza[]
  ) => {
    const curVaza = curVazas[vazaIdx];
    const playsCount = curVaza.plays.length;

    // Have all players played in this vaza?
    if (playsCount >= totalPlayers) {
      resolveCompleteVaza(vazaIdx, curVazas, curPlayers, curVira);
    } else {
      // Next player's turn clockwise
      const nextTurn = (justPlayedIndex + 1) % totalPlayers;
      setActiveTurnIndex(nextTurn);
      const nextPlayer = curPlayers[nextTurn];

      setStatusMessage(
        nextPlayer.isHuman
          ? 'Sua vez de jogar uma carta!'
          : `Vez de ${nextPlayer.name} [${nextPlayer.team === 'nos' ? 'Nós' : 'Eles'}] jogar.`
      );

      if (!nextPlayer.isHuman) {
        safeTimeout(() => {
          executeAiTurn(nextTurn, curPlayers, curVira, vazaIdx, curVazas);
        }, 700);
      }
    }
  };

  // Resolve a vaza when all players have put their card on the table
  const resolveCompleteVaza = (
    vazaIdx: number,
    curVazas: TableVaza[],
    curPlayers: TrucoPlayer[],
    curVira: CardData | null
  ) => {
    const curVaza = curVazas[vazaIdx];
    const plays = curVaza.plays;

    // Find highest power play
    const sortedPlays = [...plays].sort((a, b) => b.power - a.power);
    const highestPlay = sortedPlays[0];

    // Check tie between different teams
    const topPowers = sortedPlays.filter((p) => p.power === highestPlay.power);
    const hasNos = topPowers.some((p) => p.team === 'nos');
    const hasEles = topPowers.some((p) => p.team === 'eles');
    const isDraw = hasNos && hasEles;

    const winnerTeam: 'nos' | 'eles' | 'draw' = isDraw ? 'draw' : highestPlay.team;

    curVaza.winnerTeam = winnerTeam;
    curVaza.winningPlay = highestPlay;
    setTableVazas([...curVazas]);

    const newHistory = [...vazaWinners, winnerTeam];
    setVazaWinners(newHistory);

    // Check round victory
    const nosWins = newHistory.filter((w) => w === 'nos').length;
    const elesWins = newHistory.filter((w) => w === 'eles').length;

    let roundVictor: 'nos' | 'eles' | null = null;

    if (nosWins === 2) roundVictor = 'nos';
    else if (elesWins === 2) roundVictor = 'eles';
    else if (newHistory.length === 3) {
      if (nosWins > elesWins) roundVictor = 'nos';
      else if (elesWins > nosWins) roundVictor = 'eles';
      else {
        // Tied in 3rd: 1st vaza winner decides
        roundVictor = newHistory[0] !== 'draw' ? newHistory[0] : 'nos';
      }
    } else if (newHistory.length === 2 && newHistory[0] === 'draw') {
      if (newHistory[1] !== 'draw') roundVictor = newHistory[1];
    }

    if (roundVictor) {
      setRoundEnded(true);
      const pointsWon = roundPoints;

      if (roundVictor === 'nos') {
        playSound('chime');
        const nextScore = nosScore + pointsWon;
        setNosScore(nextScore);
        setStatusMessage(
          `🎉 Nós vencemos a mão e faturamos +${pointsWon} ponto${pointsWon > 1 ? 's' : ''}! (${highestPlay.playerName} jogou a maior carta).`
        );
        if (nextScore >= 12) {
          try {
            confetti({ particleCount: 85, spread: 85 });
          } catch (_) {}
          setMatchWinner('nos');
        }
      } else {
        playSound('click');
        const nextScore = elesScore + pointsWon;
        setElesScore(nextScore);
        setStatusMessage(
          `🏛️ Oponentes venceram a mão e levaram +${pointsWon} ponto${pointsWon > 1 ? 's' : ''} (${highestPlay.playerName} jogou ${highestPlay.card.rank}${highestPlay.card.suitSymbol}).`
        );
        if (nextScore >= 12) {
          setMatchWinner('eles');
        }
      }
    } else {
      // Advance to next Vaza
      const nextVazaIdx = vazaIdx + 1;
      setCurrentVazaIndex(nextVazaIdx);
      const nextVazasList = [...curVazas, { plays: [] }];
      setTableVazas(nextVazasList);

      // In Truco, whoever played the highest card in previous vaza starts the next vaza
      const nextStarter = isDraw ? activeTurnIndex : highestPlay.playerIndex;
      setActiveTurnIndex(nextStarter);
      const nextPlayer = curPlayers[nextStarter];

      setStatusMessage(
        isDraw
          ? 'EMPATOU (CANGOU) a vaza! Quem jogou primeiro joga de novo.'
          : `${winnerTeam === 'nos' ? 'Nós' : 'Eles'} levamos a Vaza ${vazaIdx + 1}! Vez de ${nextPlayer.name} iniciar a Vaza ${nextVazaIdx + 1}.`
      );

      if (!nextPlayer.isHuman) {
        safeTimeout(() => {
          executeAiTurn(nextStarter, curPlayers, curVira, nextVazaIdx, nextVazasList);
        }, 800);
      }
    }
  };

  // AI asks Truco / Counter-raise
  const handleAiAskTruco = (aiName: string, stake: number) => {
    playSound('chime');
    shout(
      aiName,
      stake === 3 ? 'TRUCO, LADRÃO!' : stake === 6 ? 'SEIS NESSA MÃO!' : stake === 9 ? 'NOVE!' : 'DOZE!'
    );
    setPendingStake(stake);
    setTrucoChallenger('eles');
    setLastTrucoRaiser('eles');
    setStatusMessage(`${aiName} pediu ${stake} pontos! O que você decide?`);
  };

  // Player asks Truco / 6 / 9 / 12
  const handlePlayerShoutTruco = () => {
    if (roundEnded || trucoChallenger !== null || lastTrucoRaiser === 'nos') return;
    const nextStake = roundPoints === 1 ? 3 : roundPoints === 3 ? 6 : roundPoints === 6 ? 9 : 12;
    shout('Você', nextStake === 3 ? 'TRUCO, MARRECO!' : nextStake === 6 ? 'SEIS!!' : nextStake === 9 ? 'NOVE!!' : 'DOZE!!');
    setTrucoChallenger('nos');
    setLastTrucoRaiser('nos');
    setStatusMessage(`Você pediu ${nextStake} pontos! Oponentes decidindo...`);

    safeTimeout(() => {
      // Pick opponent (team eles) to respond - partner never answers player!
      const opponentList = players.filter((p) => p.team === 'eles');
      const opponentName = opponentList[Math.floor(Math.random() * opponentList.length)]?.name || 'Hera';

      const rand = Math.random();
      // AI response: run (25%), counter-raise (25% if stake < 12), accept (50%)
      if (rand < 0.25) {
        // AI Folds: challenger wins points based on previous stake (e.g. run on 3 -> 1pt, run on 6 -> 3pts, run on 9 -> 6pts, run on 12 -> 9pts)
        playSound('click');
        shout(opponentName, 'ESSA CORREMOS...');
        setRoundEnded(true);
        setTrucoChallenger(null);
        const foldPoints = getPointsOnFold(nextStake);
        const nextScore = nosScore + foldPoints;
        setNosScore(nextScore);
        setStatusMessage(`${opponentName} e os oponentes correram! Você faturou +${foldPoints} ponto${foldPoints > 1 ? 's' : ''}!`);
        if (nextScore >= 12) setMatchWinner('nos');
      } else if (rand > 0.75 && nextStake < 12) {
        // AI Counter-raises: only opponents raise!
        const aiRaise = nextStake === 3 ? 6 : nextStake === 6 ? 9 : 12;
        handleAiAskTruco(opponentName, aiRaise);
      } else {
        // AI Accepts
        playSound('chime');
        shout(opponentName, 'DESCE QUE EU QUERO VER!');
        setRoundPoints(nextStake);
        setTrucoChallenger(null);
        setStatusMessage(`${opponentName} e oponentes aceitaram! A mão agora vale ${nextStake} pontos.`);

        // RESUME GAMEPLAY IMMEDIATELY - NO FREEZE!
        resumeActiveTurn();
      }
    }, 1200);
  };

  // Player answers AI challenge: Accept
  const handlePlayerAcceptChallenge = () => {
    playSound('chime');
    shout('Você', 'ACEITO! VEM PRA CIMA!');
    setRoundPoints(pendingStake);
    setTrucoChallenger(null);
    setStatusMessage(`Você aceitou! A rodada agora vale ${pendingStake} pontos.`);

    // RESUME GAMEPLAY IMMEDIATELY - NO FREEZE!
    resumeActiveTurn();
  };

  // Player answers AI challenge: Run
  const handlePlayerRunChallenge = () => {
    playSound('click');
    shout('Você', 'ESSA EU CORRO...');
    setRoundEnded(true);
    setTrucoChallenger(null);
    // Opponents win previous stake before this challenge
    const foldPoints = getPointsOnFold(pendingStake);
    const nextScore = elesScore + foldPoints;
    setElesScore(nextScore);
    setStatusMessage(`Você correu. Oponentes levaram +${foldPoints} ponto${foldPoints > 1 ? 's' : ''}.`);
    if (nextScore >= 12) setMatchWinner('eles');
  };

  // Player answers AI challenge: Counter-raise
  const handlePlayerCounterRaise = (raiseTo: number) => {
    shout('Você', raiseTo === 6 ? 'SEIS!!' : raiseTo === 9 ? 'NOVE!!' : 'DOZE!!');
    setPendingStake(raiseTo);
    setTrucoChallenger('nos');
    setLastTrucoRaiser('nos');
    setStatusMessage(`Você aumentou para ${raiseTo} pontos! Oponentes decidindo...`);

    safeTimeout(() => {
      const opponentList = players.filter((p) => p.team === 'eles');
      const opponentName = opponentList[Math.floor(Math.random() * opponentList.length)]?.name || 'Hera';
      const accepts = Math.random() > 0.35;
      if (accepts) {
        playSound('chime');
        shout(opponentName, 'DESCE PRO JOGO!');
        setRoundPoints(raiseTo);
        setTrucoChallenger(null);
        setStatusMessage(`${opponentName} e oponentes aceitaram! A mão agora vale ${raiseTo} pontos.`);

        // RESUME GAMEPLAY IMMEDIATELY - NO FREEZE!
        resumeActiveTurn();
      } else {
        playSound('click');
        shout(opponentName, 'ESSA PASSOU...');
        setRoundEnded(true);
        setTrucoChallenger(null);
        // Opponents ran from raiseTo -> challenger wins stake before raiseTo
        const foldPoints = getPointsOnFold(raiseTo);
        const nextScore = nosScore + foldPoints;
        setNosScore(nextScore);
        setStatusMessage(`${opponentName} e os oponentes correram! Você levou +${foldPoints} ponto${foldPoints > 1 ? 's' : ''}!`);
        if (nextScore >= 12) setMatchWinner('nos');
      }
    }, 1200);
  };

  // Resume turn cleanly after any challenge is accepted (fixes the freeze bug!)
  const resumeActiveTurn = () => {
    const curP = stateRef.current.players;
    const curTurn = stateRef.current.activeTurnIndex;
    const curVaza = stateRef.current.currentVazaIndex;
    const curVazas = stateRef.current.tableVazas;
    const curVira = stateRef.current.viraCard;

    const p = curP[curTurn];
    if (!p) return;

    if (!p.isHuman) {
      safeTimeout(() => {
        executeAiTurn(curTurn, curP, curVira, curVaza, curVazas);
      }, 700);
    } else {
      setStatusMessage('Desafio aceito! É a sua vez de jogar uma carta.');
    }
  };

  // Reset entire match
  const handleResetMatch = () => {
    playSound('click');
    setNosScore(0);
    setElesScore(0);
    setMatchWinner(null);
    setRoundEnded(true);
    setTableVazas([]);
    setViraCard(null);
    setLastTrucoRaiser(null);
    setPlayers(initPlayers(totalPlayers));
    setStatusMessage('Placar zerado! Clique em Embaralhar & Distribuir.');
  };

  const teamLabel =
    totalPlayers === 2
      ? '1 vs 1'
      : totalPlayers === 4
      ? '2 vs 2 (Duplas)'
      : '3 vs 3 (Trios)';

  const nextPlayerRaise = roundPoints === 1 ? 3 : roundPoints === 3 ? 6 : roundPoints === 6 ? 9 : 12;
  const canPlayerRaise =
    !roundEnded &&
    trucoChallenger === null &&
    lastTrucoRaiser !== 'nos' &&
    roundPoints < 12 &&
    nosScore < 11 &&
    elesScore < 11;

  const humanHand = players[0]?.hand || [];

  return (
    <div className="h-full max-h-full flex flex-col justify-between overflow-hidden select-none max-w-7xl mx-auto w-full px-1 sm:px-2 py-1 gap-1.5">
      {/* Placar & Header with Back Button */}
      <div className="shrink-0 bg-slate-900/95 border border-amber-500/30 rounded-2xl px-3 py-1.5 shadow-xl flex items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              onClick={onBack}
              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">Escolher Outro Jogo</span>
            </button>
          )}

          <div className="flex items-center gap-2">
            <span className="text-xs sm:text-sm font-black text-amber-300">
              Truco {variant === 'paulista' ? 'Paulista' : 'Mineiro'}
            </span>
            <span className="px-2.5 py-0.5 rounded-full bg-red-500/20 text-red-300 border border-red-500/30 text-[10px] font-mono font-bold flex items-center gap-1">
              <Users className="w-3 h-3 text-red-400" />
              <span>{teamLabel}</span>
            </span>
          </div>
        </div>

        {/* Placar */}
        <div className="flex items-center gap-3 font-mono text-sm sm:text-base font-black">
          <span className="text-emerald-400">Nós: {nosScore}</span>
          <span className="text-slate-500">×</span>
          <span className="text-red-400">Eles: {elesScore}</span>

          <div className="flex items-center gap-1 text-xs font-bold bg-amber-500/20 text-amber-300 px-2.5 py-0.5 rounded-lg border border-amber-500/30">
            <Flame className="w-3.5 h-3.5 text-amber-400" />
            <span>{roundPoints} pt{roundPoints > 1 ? 's' : ''}</span>
          </div>

          <button
            onClick={handleResetMatch}
            title="Reiniciar Placar da Partida"
            className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Truco Felt Arena (Flexible height, fits viewport without scrolling) */}
      <div className="flex-1 min-h-0 relative rounded-2xl sm:rounded-3xl bg-gradient-to-b from-[#1a0f05] via-[#241306] to-[#0f0702] border-2 sm:border-3 border-amber-500/40 p-2 sm:p-3 shadow-2xl flex flex-col justify-between overflow-hidden">
        {/* Emblem Watermark */}
        <div className="absolute inset-0 flex items-center justify-center opacity-10 pointer-events-none">
          <Swords className="w-64 h-64 text-amber-500" />
        </div>

        {/* TOP STATUS BAR: Active Turn & Clean Status Message (Never overlaps cards) */}
        <div className="relative z-10 shrink-0 flex items-center justify-between gap-2 px-2">
          {/* Active Turn Banner */}
          <div className="h-6 flex items-center">
            {!roundEnded ? (
              <div
                className={`px-3 py-0.5 rounded-full text-[11px] font-black tracking-wide uppercase flex items-center gap-1.5 shadow-md ${
                  players[activeTurnIndex]?.isHuman
                    ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-black border border-emerald-300 animate-pulse'
                    : 'bg-slate-900 text-amber-400 border border-amber-500/40'
                }`}
              >
                {players[activeTurnIndex]?.isHuman ? (
                  <>
                    <Sparkles className="w-3.5 h-3.5 text-black" />
                    <span>SUA VEZ DE JOGAR</span>
                  </>
                ) : (
                  <>
                    <Bot className="w-3.5 h-3.5 text-amber-400" />
                    <span>VEZ DE {players[activeTurnIndex]?.name.toUpperCase()}...</span>
                  </>
                )}
              </div>
            ) : (
              <div className="px-3 py-0.5 rounded-full bg-slate-950/80 border border-slate-700 text-[11px] font-bold text-slate-400">
                Aguardando Início
              </div>
            )}
          </div>

          {/* Central Message Box (Clear of all cards) */}
          <div className="text-[11px] sm:text-xs font-bold text-amber-200 bg-black/85 px-3.5 py-0.5 rounded-full border border-amber-500/40 shadow-lg max-w-md truncate text-center">
            {statusMessage}
          </div>

          {/* Truco Stakes Status Indicator */}
          <div className="text-[10px] font-mono font-bold text-amber-400 bg-black/70 px-2.5 py-0.5 rounded-full border border-amber-500/30 hidden sm:block">
            {lastTrucoRaiser === 'nos' ? 'Nós pedimos último' : lastTrucoRaiser === 'eles' ? 'Eles pediram último' : 'Valendo inicial'}
          </div>
        </div>

        {/* SEATS DISPLAY (Top & Opponents/Partners with active turn highlight) */}
        <div className="relative z-10 shrink-0 flex items-center justify-around gap-2 px-1 pt-1">
          {players
            .filter((p) => !p.isHuman)
            .map((p, idx) => {
              const actualIdx = players.findIndex((pl) => pl.id === p.id);
              const isHisTurn = actualIdx === activeTurnIndex && !roundEnded;
              const isPartner = p.team === 'nos';

              return (
                <div
                  key={p.id}
                  className={`flex flex-col items-center transition-all ${
                    isHisTurn ? 'scale-105' : 'opacity-85'
                  }`}
                >
                  <div
                    className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold shadow-md border ${
                      isHisTurn
                        ? 'bg-amber-500 text-black border-amber-300 ring-2 ring-amber-400/60'
                        : isPartner
                        ? 'bg-emerald-950/80 text-emerald-200 border-emerald-500/40'
                        : 'bg-red-950/80 text-red-200 border-red-500/40'
                    }`}
                  >
                    <span>{p.avatar}</span>
                    <span className="truncate max-w-[110px]">{p.name}</span>
                    <span className="text-[9px] font-black uppercase">
                      [{isPartner ? 'Nós' : 'Eles'}]
                    </span>
                  </div>

                  <div className="flex gap-1 sm:gap-1.5 mt-1">
                    {p.hand.map((_, cIdx) => (
                      <div
                        key={cIdx}
                        className="h-16 sm:h-22 md:h-26 aspect-[640/1120] rounded-lg sm:rounded-xl overflow-hidden border-2 border-amber-500/50 bg-slate-950 shadow-md"
                      >
                        <img
                          src="/assets/deck/thumb/BACK.webp"
                          alt="Verso"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ))}
                    {p.hand.length === 0 && (
                      <span className="text-[9px] text-slate-500 font-mono font-bold">Sem cartas</span>
                    )}
                  </div>
                </div>
              );
            })}

          {/* AI / Opponents Speech Bubble */}
          {speechBubble && speechBubble.sender !== 'Você' && (
            <div className="absolute top-16 bg-gradient-to-r from-red-600 to-amber-600 text-white font-black text-xs sm:text-sm px-4 py-1.5 rounded-2xl rounded-tl-none shadow-2xl border-2 border-white animate-bounce z-40 flex items-center gap-1.5 pointer-events-none">
              <span className="text-amber-200 font-black">💥 {speechBubble.sender}:</span>
              <span>"{speechBubble.text}"</span>
            </div>
          )}
        </div>

        {/* MIDDLE FELT: REAL MULTI-PLAYER VAZAS & MANILHAS DISPLAY */}
        <div className="relative z-10 flex-1 min-h-0 flex flex-col items-center justify-center py-0.5">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-6 w-full">
            {/* Manilhas / Vira Display */}
            {variant === 'mineiro' ? (
              <div className="flex flex-col items-center bg-black/85 p-2 sm:p-2.5 rounded-2xl border-2 border-amber-500/60 shadow-2xl shrink-0">
                <div className="text-[11px] sm:text-xs font-black tracking-wider uppercase text-amber-300 flex items-center gap-1.5 mb-2">
                  <Shield className="w-3.5 h-3.5 text-amber-400" />
                  <span>4 Manilhas Fixas do Mineiro</span>
                </div>
                <div className="flex items-center gap-2 sm:gap-3">
                  {[
                    { name: '4 de Paus (Zap)', file: '4C.png', thumb: '4C.webp' },
                    { name: '7 de Copas (Copeta)', file: '7H.png', thumb: '7H.webp' },
                    { name: 'Ás de Espadas (Espadilha)', file: 'SA.png', thumb: 'SA.webp' },
                    { name: '7 de Ouros (Picafumo)', file: '7D.png', thumb: '7D.webp' }
                  ].map((m, idx) => (
                    <div
                      key={idx}
                      className="relative h-[25dvh] min-h-[110px] max-h-[155px] sm:h-32 md:h-40 lg:h-44 aspect-[640/1120] rounded-xl overflow-hidden border-2 border-amber-400 shadow-2xl ring-2 ring-black/50 bg-slate-900 transition-transform hover:scale-105"
                      title={m.name}
                    >
                      <img
                        src={`/assets/deck/${m.file}`}
                        srcSet={`/assets/deck/thumb/${m.thumb} 320w, /assets/deck/${m.file} 640w`}
                        sizes="(max-width: 640px) 90px, 140px"
                        alt={m.name}
                        className="w-full h-full object-cover select-none pointer-events-none"
                        loading="eager"
                        decoding="async"
                      />
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              viraCard && (
                <div className="flex flex-col items-center gap-1 bg-black/85 p-2 sm:p-2.5 rounded-2xl border-2 border-amber-500/60 shadow-2xl shrink-0">
                  <span className="text-[10px] sm:text-xs font-black tracking-wider uppercase text-amber-300 bg-amber-500/20 px-2.5 py-0.5 rounded-full border border-amber-500/40 shadow">
                    Manilha = {getManilhaRankPaulista(viraCard)}
                  </span>
                  <div
                    className="relative h-[25dvh] min-h-[110px] max-h-[155px] sm:h-32 md:h-40 lg:h-44 aspect-[640/1120] rounded-xl overflow-hidden border-2 border-amber-400 shadow-2xl ring-2 ring-black/50 bg-slate-900"
                    title={`Vira: ${viraCard.name}`}
                  >
                    <img
                      src={`/assets/deck/${viraCard.file}`}
                      alt={viraCard.name}
                      className="w-full h-full object-cover select-none pointer-events-none"
                      loading="eager"
                      decoding="async"
                    />
                  </div>
                </div>
              )
            )}

            {/* REAL MULTI-PLAYER TABLE VAZAS (1, 2, 3) */}
            <div className="flex items-center gap-2 sm:gap-4 overflow-x-auto max-w-full py-1">
              {[0, 1, 2].map((vIdx) => {
                const vaza = tableVazas[vIdx] || { plays: [] };
                const plays = vaza.plays || [];
                const strongest = getVazaStrongestPlay(vaza);

                return (
                  <div
                    key={vIdx}
                    className="flex flex-col items-center gap-1.5 bg-black/85 p-2 sm:p-2.5 rounded-2xl border border-amber-500/40 min-w-[130px] sm:min-w-[170px] shadow-2xl"
                  >
                    {/* Vaza Header with Winner Badge */}
                    <div className="flex items-center justify-between w-full px-1">
                      <span className="text-[10px] sm:text-[11px] font-black text-amber-300 uppercase tracking-wide">
                        Vaza {vIdx + 1}
                      </span>
                      {vaza.winnerTeam ? (
                        <span
                          className={`text-[9px] font-black px-1.5 py-0.5 rounded shadow ${
                            vaza.winnerTeam === 'nos'
                              ? 'bg-emerald-500 text-black'
                              : vaza.winnerTeam === 'eles'
                              ? 'bg-red-500 text-white'
                              : 'bg-amber-500 text-black'
                          }`}
                        >
                          {vaza.winnerTeam === 'nos'
                            ? 'Nós'
                            : vaza.winnerTeam === 'eles'
                            ? 'Eles'
                            : 'Empate'}
                        </span>
                      ) : plays.length > 0 ? (
                        <span className="text-[8px] font-mono font-bold text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/30">
                          {plays.length}/{totalPlayers}
                        </span>
                      ) : null}
                    </div>

                    {/* Bloquinho Informativo: [Carta Mais Forte] ou Amarrou / Empatou */}
                    {strongest ? (
                      strongest.isDraw ? (
                        <div
                          className="w-full px-1.5 py-0.5 rounded-md text-[9px] sm:text-[10px] font-black border flex items-center justify-center gap-1 text-center shadow-sm bg-amber-950/90 border-amber-500/60 text-amber-300"
                          title={`Empatou / Amarrou em ${strongest.cardLabel}`}
                        >
                          <span className="text-amber-400">🤝</span>
                          <span className="truncate">
                            <strong className="text-amber-200">Amarrou / Empate</strong> ({strongest.cardLabel})
                          </span>
                        </div>
                      ) : (
                        <div
                          className={`w-full px-1.5 py-0.5 rounded-md text-[9px] sm:text-[10px] font-black border flex items-center justify-center gap-1 text-center shadow-sm ${
                            strongest.best.team === 'nos'
                              ? 'bg-emerald-950/90 border-emerald-500/60 text-emerald-300'
                              : 'bg-red-950/90 border-red-500/60 text-red-300'
                          }`}
                          title={`${strongest.cardLabel} jogada por ${strongest.playerName} (${strongest.teamLabel})`}
                        >
                          <Crown className="w-2.5 h-2.5 text-amber-400 shrink-0" />
                          <span className="truncate">
                            <strong className="text-white">{strongest.cardLabel}</strong> • {strongest.playerName} ({strongest.teamLabel})
                          </span>
                        </div>
                      )
                    ) : (
                      <div className="w-full text-center text-[9px] text-slate-500 font-mono py-0.5">
                        Aguardando cartas...
                      </div>
                    )}

                    {/* Cards played: 3 em cima e 3 embaixo for 6 players (or 2x2 for 4 players) */}
                    {plays.length > 0 ? (
                      <div
                        className={`grid ${
                          totalPlayers === 6
                            ? 'grid-cols-3'
                            : totalPlayers === 4
                            ? 'grid-cols-2'
                            : 'grid-cols-1'
                        } gap-1 sm:gap-1.5 justify-items-center items-center py-1 min-h-[70px] sm:min-h-[90px]`}
                      >
                        {plays.map((play, pIdx) => {
                          const isTiedTop =
                            strongest?.isDraw && play.power === strongest.best.power;
                          const isHighest =
                            !strongest?.isDraw &&
                            strongest?.best.playerIndex === play.playerIndex &&
                            strongest?.best.power === play.power;

                          return (
                            <div key={pIdx} className="flex flex-col items-center">
                              <div
                                className={`relative h-16 sm:h-20 md:h-24 aspect-[640/1120] rounded-lg sm:rounded-xl overflow-hidden border shadow-md transition-all ${
                                  isHighest
                                    ? 'ring-2 ring-amber-400 border-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.7)] scale-105 z-10'
                                    : isTiedTop
                                    ? 'ring-2 ring-amber-500/80 border-amber-400 shadow-[0_0_10px_rgba(245,158,11,0.5)] scale-102 z-10'
                                    : play.team === 'nos'
                                    ? 'border-emerald-400/80 ring-1 ring-emerald-500/40'
                                    : 'border-red-400/80 ring-1 ring-red-500/40'
                                }`}
                              >
                                <img
                                  src={`/assets/deck/thumb/${play.card.file.replace('.png', '.webp')}`}
                                  alt={play.card.name}
                                  className="w-full h-full object-cover"
                                />
                                <div className="absolute top-0.5 left-0.5 bg-black/90 px-1 py-0.2 rounded text-[8px] font-black flex items-center gap-0.5">
                                  <span className="text-amber-300">{play.card.rank}</span>
                                  <span style={{ color: play.card.color }}>{play.card.suitSymbol}</span>
                                </div>
                                {isHighest && (
                                  <div className="absolute bottom-0 inset-x-0 bg-amber-500 text-slate-950 text-[7px] font-black text-center py-0.2 uppercase tracking-tighter">
                                    ★ LÍDER
                                  </div>
                                )}
                                {isTiedTop && (
                                  <div className="absolute bottom-0 inset-x-0 bg-amber-600 text-white text-[7px] font-black text-center py-0.2 uppercase tracking-tighter">
                                    🤝 AMARROU
                                  </div>
                                )}
                              </div>
                              <span
                                className={`text-[8px] font-bold mt-0.5 truncate max-w-[50px] ${
                                  play.team === 'nos' ? 'text-emerald-300' : 'text-red-300'
                                }`}
                              >
                                {play.playerName}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="h-14 sm:h-18 aspect-[640/1120] rounded-lg border-2 border-dashed border-slate-700/80 flex items-center justify-center text-[10px] text-slate-600 font-mono my-2">
                        Mesa
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* BOTTOM: HUMAN PLAYER HAND & ACTION CONTROLS */}
        <div className="relative z-10 shrink-0 flex flex-col items-center justify-end gap-2 pb-1">
          {/* Player Speech Bubble - Displayed directly at player's side */}
          {speechBubble && speechBubble.sender === 'Você' && (
            <div className="absolute -top-11 z-50 bg-gradient-to-r from-emerald-600 to-green-600 text-white font-black text-xs sm:text-sm px-4 py-1.5 rounded-2xl rounded-br-none shadow-2xl border-2 border-white animate-bounce flex items-center gap-1.5 pointer-events-none">
              <span className="text-amber-300 font-black">🗣️ Você:</span>
              <span>"{speechBubble.text}"</span>
            </div>
          )}

          {/* Pending Challenge Popup from AI */}
          {trucoChallenger === 'eles' && (
            <div className="bg-red-950 border-2 border-red-500 rounded-2xl p-3 shadow-2xl flex flex-wrap items-center justify-center gap-2.5 animate-in fade-in z-30 max-w-xl">
              <span className="text-xs font-black text-red-200">
                Oponentes pediram {pendingStake} pontos! O que faz?
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={handlePlayerAcceptChallenge}
                  className="px-3.5 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-black font-black text-xs rounded-xl shadow cursor-pointer"
                >
                  Aceitar ({pendingStake} pts)
                </button>
                <button
                  onClick={handlePlayerRunChallenge}
                  className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-red-400 font-bold text-xs rounded-xl border border-red-500/40 cursor-pointer"
                >
                  Correr (Fugir)
                </button>
                {pendingStake < 12 && (
                  <button
                    onClick={() => handlePlayerCounterRaise(pendingStake === 3 ? 6 : pendingStake === 6 ? 9 : 12)}
                    className="px-3.5 py-1.5 bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 text-white font-black text-xs rounded-xl shadow cursor-pointer"
                  >
                    Pedir {pendingStake === 3 ? 'SEIS! (6)' : pendingStake === 6 ? 'NOVE! (9)' : 'DOZE! (12)'}
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Player Hand Cards */}
          <div className="flex items-center justify-center gap-2.5 sm:gap-4 relative pt-4">
            {humanHand.map((card, i) => {
              const canPlay = !roundEnded && activeTurnIndex === 0 && trucoChallenger === null;
              const isSelected = selectedCardIdx === i;

              return (
                <div key={card.id} className="relative flex flex-col items-center">
                  {isSelected && canPlay && (
                    <div className="absolute -top-7 z-40 bg-amber-400 text-black text-[10px] sm:text-xs font-black px-2.5 py-0.5 rounded-full shadow-lg border border-amber-300 animate-bounce whitespace-nowrap flex items-center gap-1 pointer-events-none">
                      <span>Toque p/ Jogar!</span>
                    </div>
                  )}

                  <button
                    onClick={() => {
                      if (!canPlay) return;
                      if (isSelected) {
                        handlePlayCard(card, i);
                        setSelectedCardIdx(null);
                      } else {
                        setSelectedCardIdx(i);
                      }
                    }}
                    disabled={!canPlay}
                    className={`relative group h-[20dvh] min-h-[75px] max-h-[135px] sm:h-34 md:h-40 aspect-[640/1120] rounded-xl sm:rounded-2xl overflow-hidden shadow-2xl transition-all ${
                      isSelected && canPlay
                        ? '-translate-y-4 scale-105 border-3 sm:border-4 border-amber-300 ring-4 ring-amber-400/80 shadow-[0_0_25px_rgba(245,158,11,0.7)] z-30 cursor-pointer'
                        : canPlay
                        ? 'hover:-translate-y-2 hover:scale-102 border-2 sm:border-3 border-amber-400/80 cursor-pointer shadow-amber-500/30'
                        : 'opacity-65 cursor-not-allowed border border-slate-700'
                    }`}
                  >
                    <img
                      src={`/assets/deck/thumb/${card.file.replace('.png', '.webp')}`}
                      alt={card.name}
                      className="w-full h-full object-cover rendering-pixelated"
                    />
                    {/* High visibility rank & suit badge */}
                    <div className="absolute top-1 left-1 bg-black/90 px-1.5 py-0.5 rounded text-xs sm:text-sm font-black flex items-center gap-1 shadow-md border border-amber-400/50">
                      <span className="text-amber-300">{card.rank}</span>
                      <span style={{ color: card.color }}>{card.suitSymbol}</span>
                    </div>
                    <div className="absolute inset-x-0 bottom-0 bg-black/85 py-0.5 text-[9px] sm:text-[10px] font-bold text-amber-300 text-center truncate px-1">
                      {card.name}
                    </div>
                  </button>
                </div>
              );
            })}
          </div>

          {/* Action Buttons Toolbar */}
          <div className="flex items-center justify-center gap-2 pt-1">
            {roundEnded ? (
              <button
                onClick={() => {
                  setSelectedCardIdx(null);
                  handleDealNewRound();
                }}
                disabled={isShuffling}
                className="min-h-[44px] px-6 py-2.5 rounded-2xl bg-gradient-to-r from-amber-500 via-amber-400 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-black text-xs sm:text-sm flex items-center gap-2 shadow-xl shadow-amber-500/30 active:scale-95 transition-all cursor-pointer"
              >
                <Shuffle className={`w-4 h-4 ${isShuffling ? 'animate-spin' : ''}`} />
                <span>{matchWinner ? 'Nova Partida (Zerar)' : 'Embaralhar & Distribuir'}</span>
              </button>
            ) : (
              <>
                {canPlayerRaise ? (
                  <button
                    onClick={handlePlayerShoutTruco}
                    className="min-h-[44px] px-5 py-2 rounded-xl bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white font-black text-xs sm:text-sm flex items-center gap-1.5 shadow-lg shadow-red-600/30 transition-all active:scale-95 cursor-pointer"
                  >
                    <Flame className="w-4 h-4 text-amber-300 animate-pulse" />
                    <span>
                      {nextPlayerRaise === 3
                        ? 'Gritar TRUCO! (3 pts)'
                        : nextPlayerRaise === 6
                        ? 'Pedir SEIS! (6 pts)'
                        : nextPlayerRaise === 9
                        ? 'Pedir NOVE! (9 pts)'
                        : 'Pedir DOZE! (12 pts)'}
                    </span>
                  </button>
                ) : lastTrucoRaiser === 'nos' ? (
                  <div className="min-h-[44px] px-4 py-2 rounded-xl bg-slate-900 border border-amber-500/30 text-amber-300/80 font-bold text-xs flex items-center">
                    Você já aumentou para {roundPoints} pts (Aguardando oponente)
                  </div>
                ) : null}

                <button
                  onClick={handlePlayerRunChallenge}
                  disabled={trucoChallenger !== null}
                  className="min-h-[44px] px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white font-bold text-xs transition-colors cursor-pointer flex items-center"
                >
                  Correr da Mão
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
