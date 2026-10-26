import React, { useState, useEffect, useRef } from 'react';
import rawCardsData from '../../cards_data.json';
import { CardData } from '../../types/deck';
import { GameRuleInfo } from '../../types/deck';
import { GAME_RULES_DATABASE } from '../../data/gameRulesData';
import { playSound } from '../../utils/audio';
import confetti from 'canvas-confetti';
import {
  ArrowLeft,
  Users,
  Sparkles,
  Shuffle,
  RotateCcw,
  BookOpen,
  Info,
  Shield,
  Bot,
  User,
  Plus
} from 'lucide-react';

const allDeckCards: CardData[] = (rawCardsData as CardData[]).filter((c) => c && c.suitCode !== 'X');

const ALL_AI_NAMES = ['Poseidon', 'Hera', 'Hefesto', 'Ártemis', 'Apolo'];

interface GenericCardGameArenaProps {
  gameId: string;
  playerCount?: number;
  onBack: () => void;
  onOpenRules?: () => void;
}

export const GenericCardGameArena: React.FC<GenericCardGameArenaProps> = ({
  gameId,
  playerCount = 4,
  onBack,
  onOpenRules
}) => {
  const gameInfo: GameRuleInfo =
    GAME_RULES_DATABASE.find((g) => g.id === gameId) || GAME_RULES_DATABASE[0];

  // Number of cards to deal based on official game rules
  const getHandSize = (id: string): number => {
    switch (id) {
      case 'copas':
      case 'espadas':
        return 13;
      case 'sueca_bisca':
        return playerCount === 2 ? 3 : 10;
      case 'buraco_canastra':
        return 11;
      case 'pife_cacheta':
        return 9;
      case 'rummy':
        return 7;
      case 'mau_mau_oito_maluco':
        return 7;
      case 'escopa':
        return 3;
      case 'war_batalha':
        return 5;
      default:
        return 7;
    }
  };

  const handSize = getHandSize(gameId);

  // Active AI Opponents based on chosen playerCount (playerCount - 1 opponents)
  const oppCount = Math.max(1, Math.min(5, playerCount - 1));
  const activeOpponents = ALL_AI_NAMES.slice(0, oppCount);

  const [playerHand, setPlayerHand] = useState<CardData[]>([]);
  const [opponentsHands, setOpponentsHands] = useState<{ name: string; count: number }[]>([]);
  const [deckCount, setDeckCount] = useState<number>(52);
  const [centerTableCards, setCenterTableCards] = useState<
    { card: CardData; playedBy: string }[]
  >([]);
  const [discardPile, setDiscardPile] = useState<CardData[]>([]);
  const [turn, setTurn] = useState<number>(0); // 0 = Player, 1..N = AIs
  const [selectedCardIdx, setSelectedCardIdx] = useState<number | null>(null);
  const [score, setScore] = useState<{ player: number; opponents: number }>({
    player: 0,
    opponents: 0
  });
  const [message, setMessage] = useState<string>(
    `Mesa de ${gameInfo.title} (${playerCount} Jogadores) pronta. Clique em Distribuir!`
  );

  // Shuffle & Deal
  const handleDeal = () => {
    setSelectedCardIdx(null);
    playSound('shuffle');
    const shuffled = [...allDeckCards].sort(() => Math.random() - 0.5);

    const pH = shuffled.splice(0, handSize);
    setPlayerHand(pH);
    setOpponentsHands(activeOpponents.map((name) => ({ name, count: handSize })));

    // Top card to discard pile for meld/casual games
    const topDiscard = shuffled.pop();
    setDiscardPile(topDiscard ? [topDiscard] : []);
    setCenterTableCards([]);
    setDeckCount(shuffled.length);
    setTurn(0);
    setMessage(
      `Cartas distribuídas (${handSize} por jogador para ${playerCount} participantes). É a sua vez!`
    );
  };

  useEffect(() => {
    handleDeal();
  }, [gameId, playerCount]);

  // Player plays a card to the center table
  const handlePlayCard = (card: CardData, index: number) => {
    if (turn !== 0) return;
    setSelectedCardIdx(null);
    playSound('flip');

    const nextHand = playerHand.filter((_, i) => i !== index);
    setPlayerHand(nextHand);
    setCenterTableCards((prev) => [...prev, { card, playedBy: 'Você' }]);
    setTurn(1);
    setMessage(`Você jogou ${card.name}. Vez de ${activeOpponents[0]}.`);

    // AI Opponents take turns
    simulateAiTurns();
  };

  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const safeTimeout = (cb: () => void, ms: number) => {
    const id = setTimeout(cb, ms);
    timeoutsRef.current.push(id);
    return id;
  };

  useEffect(() => {
    return () => {
      timeoutsRef.current.forEach((id: ReturnType<typeof setTimeout>) => clearTimeout(id));
      timeoutsRef.current = [];
    };
  }, []);

  // Simulate AI Opponents plays in order
  const simulateAiTurns = () => {
    let currentStep = 1;

    const playNextAi = () => {
      if (currentStep > activeOpponents.length) {
        // Round of tricks completed
        safeTimeout(() => {
          playSound('chime');
          setScore((prev) => ({ ...prev, player: prev.player + 1 }));
          setMessage(`Rodada completada! Ponto concedido para sua equipe.`);
          setCenterTableCards([]);
          setTurn(0);
        }, 1000);
        return;
      }

      const aiName = activeOpponents[currentStep - 1];
      playSound('flip');

      // Random card from deck for AI play
      const randomCard = allDeckCards[Math.floor(Math.random() * allDeckCards.length)];
      setCenterTableCards((prev) => [...prev, { card: randomCard, playedBy: aiName }]);
      setOpponentsHands((prev) =>
        prev.map((opp, idx) =>
          idx === currentStep - 1 ? { ...opp, count: Math.max(0, opp.count - 1) } : opp
        )
      );

      currentStep++;
      if (currentStep <= activeOpponents.length) {
        setMessage(`Vez de ${activeOpponents[currentStep - 1]} jogar...`);
        safeTimeout(playNextAi, 700);
      } else {
        safeTimeout(playNextAi, 700);
      }
    };

    safeTimeout(playNextAi, 700);
  };

  // Draw card from deck
  const handleDrawFromDeck = () => {
    if (turn !== 0) return;
    playSound('flip');
    const randomCard = allDeckCards[Math.floor(Math.random() * allDeckCards.length)];
    setPlayerHand((prev) => [...prev, randomCard]);
    setDeckCount((prev) => Math.max(0, prev - 1));
    setMessage(`Você comprou ${randomCard.name} do baralho.`);
  };

  return (
    <div className="h-full max-h-full short:h-auto short:max-h-none short:min-h-[540px] flex flex-col justify-between overflow-hidden select-none max-w-7xl mx-auto w-full px-1 sm:px-2 py-1 gap-1.5">
      {/* Top Header Bar */}
      <div className="shrink-0 bg-slate-900/95 border border-amber-500/30 rounded-2xl px-3 py-1 shadow-xl flex items-center justify-between gap-2 min-h-[44px]">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="min-h-[40px] px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">Escolher Outro Jogo</span>
          </button>

          <div className="flex items-center gap-2">
            <span className="text-xs sm:text-sm font-black text-amber-300">
              {gameInfo.title}
            </span>
            <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-mono font-bold flex items-center gap-1">
              <Users className="w-3 h-3 text-amber-400" />
              <span>{playerCount} Jogadores</span>
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 font-mono text-xs sm:text-sm font-black">
            <span className="text-emerald-400">Você: {score.player} pts</span>
            <span className="text-slate-500">|</span>
            <span className="text-red-400">Mesa: {score.opponents} pts</span>
          </div>

          <button
            onClick={handleDeal}
            title="Redistribuir Cartas"
            className="min-h-[40px] min-w-[40px] p-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer flex items-center justify-center"
          >
            <RotateCcw className="w-4 h-4 text-amber-400" />
          </button>
        </div>
      </div>

      {/* Main Felt Arena */}
      <div className="flex-1 min-h-0 relative rounded-2xl sm:rounded-3xl bg-gradient-to-b from-[#0e1726] via-[#09101c] to-[#040810] border-2 sm:border-3 border-amber-500/40 p-2 sm:p-3 shadow-2xl flex flex-col justify-between overflow-hidden">
        {/* Top Status & Objective */}
        <div className="relative z-10 shrink-0 flex items-center justify-between gap-2 px-2">
          <div className="text-[11px] font-bold text-amber-200 bg-black/80 px-3 py-0.5 rounded-full border border-amber-500/30 truncate max-w-md">
            {message}
          </div>

          <div className="text-[10px] text-slate-400 font-mono hidden md:block">
            {gameInfo.objective.slice(0, 90)}...
          </div>
        </div>

        {/* Opponents Seats (Top - Dynamic based on selected playerCount) */}
        <div className="relative z-10 shrink-0 flex items-center justify-around gap-2 px-1 pt-1">
          {opponentsHands.map((opp, idx) => (
            <div key={idx} className="flex flex-col items-center">
              <div className="flex items-center gap-1.5 bg-black/80 px-2.5 py-0.5 rounded-full text-xs font-bold text-slate-200 border border-slate-700 shadow">
                <Bot className="w-3.5 h-3.5 text-amber-400" />
                <span>{opp.name}</span>
                <span className="text-[10px] text-slate-400 font-mono">({opp.count})</span>
              </div>
              <div className="flex gap-1 mt-1">
                {[...Array(Math.min(5, opp.count))].map((_, i) => (
                  <div
                    key={i}
                    className="h-16 sm:h-22 md:h-26 aspect-[640/1120] rounded-lg sm:rounded-xl overflow-hidden border-2 border-amber-500/40 bg-slate-950 shadow-md"
                  >
                    <img
                      src="/assets/deck/thumb/BACK.webp"
                      alt="Verso"
                      className="w-full h-full object-cover"
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Center Felt: Draw Pile, Discard Pile & Active Table Plays */}
        <div className="relative z-10 flex-1 min-h-0 flex items-center justify-center gap-6 py-1">
          {/* Deck Pile */}
          <div className="flex flex-col items-center">
            <span className="text-[10px] font-bold text-slate-400 uppercase mb-1">
              Baralho ({deckCount})
            </span>
            <button
              onClick={handleDrawFromDeck}
              disabled={turn !== 0}
              className="relative h-20 sm:h-28 aspect-[640/1120] rounded-xl overflow-hidden border-2 border-amber-500/50 shadow-2xl hover:scale-105 transition-all cursor-pointer group"
            >
              <img
                src="/assets/deck/thumb/BACK.webp"
                alt="Comprar"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-xs font-black text-amber-300">
                Comprar
              </div>
            </button>
          </div>

          {/* Center Table Played Cards */}
          <div className="flex flex-col items-center bg-black/60 p-3 rounded-2xl border border-amber-500/30 min-w-[200px] sm:min-w-[280px]">
            <span className="text-[10px] font-bold text-amber-300 uppercase mb-2">
              Cartas em Disputa na Mesa ({centerTableCards.length}/{playerCount})
            </span>
            <div className="flex items-center gap-2">
              {centerTableCards.length > 0 ? (
                centerTableCards.map((play, idx) => (
                  <div key={idx} className="flex flex-col items-center animate-in zoom-in-90">
                    <div className="relative h-20 sm:h-28 aspect-[640/1120] rounded-xl overflow-hidden border-2 border-amber-400 shadow-xl">
                      <img
                        src={`/assets/deck/thumb/${play.card.file.replace('.png', '.webp')}`}
                        alt={play.card.name}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute top-0.5 left-0.5 bg-black/85 px-1 py-0.2 rounded text-[10px] font-black flex items-center gap-0.5">
                        <span className="text-amber-300">{play.card.rank}</span>
                        <span style={{ color: play.card.color }}>{play.card.suitSymbol}</span>
                      </div>
                    </div>
                    <span className="text-[9px] font-bold text-slate-300 mt-1">
                      {play.playedBy}
                    </span>
                  </div>
                ))
              ) : (
                <div className="h-20 sm:h-28 aspect-[640/1120] rounded-xl border-2 border-dashed border-slate-700 flex items-center justify-center text-[10px] text-slate-500 font-mono">
                  Aguardando
                </div>
              )}
            </div>
          </div>

          {/* Discard Pile */}
          {discardPile.length > 0 && (
            <div className="flex flex-col items-center">
              <span className="text-[10px] font-bold text-slate-400 uppercase mb-1">
                Descarte ({discardPile.length})
              </span>
              <div className="relative h-20 sm:h-28 aspect-[640/1120] rounded-xl overflow-hidden border-2 border-slate-600 shadow-xl">
                <img
                  src={`/assets/deck/thumb/${discardPile[discardPile.length - 1].file.replace('.png', '.webp')}`}
                  alt="Descarte"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          )}
        </div>

        {/* Player Hand (Bottom) - Overlapped fan layout prevents cards from overflowing screen */}
        <div className="relative z-10 shrink-0 flex flex-col items-center justify-end gap-1 pb-1 w-full max-w-full">
          <div className="flex items-center gap-2 bg-black/80 px-3 py-0.5 rounded-full text-xs font-bold text-amber-300 border border-amber-500/40">
            <User className="w-3.5 h-3.5" />
            <span>Sua Mão ({playerHand.length} cartas) - Toque para selecionar, toque de novo para jogar</span>
          </div>

          <div className="w-full max-w-full overflow-x-auto overflow-y-visible px-2 sm:px-4 pt-4 pb-1 flex items-center justify-center">
            <div className="inline-flex items-center justify-center max-w-full">
              {playerHand.map((card, i) => {
                const isLargeHand = playerHand.length > 6;
                const isSelected = selectedCardIdx === i;
                const overlapStyle =
                  i > 0 && isLargeHand
                    ? playerHand.length > 10
                      ? { marginLeft: '-1.85rem' }
                      : playerHand.length > 8
                      ? { marginLeft: '-1.4rem' }
                      : { marginLeft: '-0.9rem' }
                    : {};

                return (
                  <div
                    key={card.id + i}
                    style={{ ...overlapStyle, zIndex: isSelected ? 60 : i + 1 }}
                    className="relative shrink-0 flex flex-col items-center"
                  >
                    {isSelected && turn === 0 && (
                      <div className="absolute -top-7 z-40 bg-amber-400 text-black text-[10px] font-black px-2.5 py-0.5 rounded-full shadow-lg border border-amber-300 animate-bounce whitespace-nowrap flex items-center gap-1 pointer-events-none">
                        <span>Toque p/ Jogar!</span>
                      </div>
                    )}

                    <button
                      onClick={() => {
                        if (turn !== 0) return;
                        if (isSelected) {
                          handlePlayCard(card, i);
                          setSelectedCardIdx(null);
                        } else {
                          setSelectedCardIdx(i);
                        }
                      }}
                      disabled={turn !== 0}
                      className={`relative group ${
                        isLargeHand
                          ? 'h-[19dvh] min-h-[66px] max-h-[115px] sm:h-28 md:h-32'
                          : 'h-[20dvh] min-h-[72px] max-h-[125px] sm:h-32 md:h-36'
                      } aspect-[640/1120] rounded-xl overflow-hidden shadow-2xl transition-all duration-150 ${
                        isSelected
                          ? '-translate-y-4 scale-110 !z-50 shadow-[0_0_22px_rgba(245,158,11,0.85)] border-3 border-amber-300 ring-4 ring-amber-400/80 cursor-pointer'
                          : turn === 0
                          ? 'hover:-translate-y-2 hover:scale-105 border-2 border-amber-400 cursor-pointer shadow-amber-500/20'
                          : 'opacity-70 cursor-not-allowed border border-slate-700'
                      }`}
                    >
                      <img
                        src={`/assets/deck/thumb/${card.file.replace('.png', '.webp')}`}
                        alt={card.name}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute top-1 left-1 bg-black/90 px-1.5 py-0.5 rounded text-xs font-black flex items-center gap-0.5 border border-amber-400/50">
                        <span className="text-amber-300">{card.rank}</span>
                        <span style={{ color: card.color }}>{card.suitSymbol}</span>
                      </div>
                      <div className="absolute inset-x-0 bottom-0 bg-black/85 py-0.5 text-[9px] font-bold text-amber-300 text-center truncate px-1">
                        {card.name}
                      </div>
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
