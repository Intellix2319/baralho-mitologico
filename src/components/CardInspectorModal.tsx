import React, { useState } from 'react';
import { CardData, ExportResolution } from '../types/deck';
import { playSound } from '../utils/audio';
import { X, RotateCw, Sparkles, Plus, Minus, Layers, ShieldCheck } from 'lucide-react';

interface CardInspectorModalProps {
  card: CardData | null;
  onClose: () => void;
  inDeckCount: number;
  onUpdateDeckCount: (card: CardData, delta: number) => void;
}

export const CardInspectorModal: React.FC<CardInspectorModalProps> = ({
  card,
  onClose,
  inDeckCount,
  onUpdateDeckCount
}) => {
  if (!card) return null;

  const [isFlipped, setIsFlipped] = useState(false);
  const [useFullArt, setUseFullArt] = useState(false);

  const isAce = card.type === 'ace';

  const fullArtMap: Record<string, string> = {
    S: '/assets/aistudio/image_ae13c770.png',
    H: '/assets/aistudio/image_0c8e9bfb.png',
    D: '/assets/aistudio/image_61f2e7ae.png',
    C: '/assets/aistudio/image_c33aaf53.png'
  };

  const currentFrontSrc = useFullArt && isAce
    ? fullArtMap[card.suitCode]
    : `/assets/deck/${card.file}`;

  const handleFlip = () => {
    playSound('flip');
    setIsFlipped(!isFlipped);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl max-h-[92vh] overflow-y-auto bg-slate-950 border border-amber-500/40 rounded-2xl shadow-2xl shadow-amber-950/40 flex flex-col md:flex-row gap-6 p-6 md:p-8">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-lg bg-slate-900/80 hover:bg-slate-800 transition-colors z-20"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Left Column: 3D Card Display */}
        <div className="flex flex-col items-center justify-center md:w-1/2">
          <div
            style={{ perspective: '1200px' }}
            className="w-full max-w-[320px] aspect-[640/1120] relative cursor-pointer"
            onClick={handleFlip}
          >
            <div
              style={{
                transform: `rotateY(${isFlipped ? 180 : 0}deg)`,
                transformStyle: 'preserve-3d',
                transition: 'transform 0.45s cubic-bezier(0.4, 0, 0.2, 1)'
              }}
              className="w-full h-full relative rounded-xl shadow-2xl shadow-black border-2 border-amber-400/50"
            >
              {/* Front */}
              <div
                style={{
                  backfaceVisibility: 'hidden',
                  WebkitBackfaceVisibility: 'hidden',
                  zIndex: isFlipped ? 0 : 2
                }}
                className="absolute inset-0 w-full h-full rounded-xl overflow-hidden bg-[#121024]"
              >
                <img
                  src={currentFrontSrc}
                  alt={card.name}
                  className="w-full h-full object-cover rendering-pixelated"
                />
              </div>

              {/* Back */}
              <div
                style={{
                  transform: 'rotateY(180deg)',
                  backfaceVisibility: 'hidden',
                  WebkitBackfaceVisibility: 'hidden',
                  zIndex: isFlipped ? 2 : 0
                }}
                className="absolute inset-0 w-full h-full rounded-xl overflow-hidden bg-[#121024]"
              >
                <img
                  src="/assets/deck/BACK.png"
                  alt="Verso da Carta"
                  className="w-full h-full object-cover rendering-pixelated"
                />
              </div>
            </div>
          </div>

          {/* Quick Flip Button Under Card */}
          <button
            onClick={handleFlip}
            className="mt-4 px-4 py-2 rounded-xl bg-slate-900 border border-amber-500/30 text-amber-300 hover:bg-amber-500/10 hover:border-amber-400 text-sm font-semibold flex items-center gap-2 transition-all shadow-md"
          >
            <RotateCw className="w-4 h-4" />
            <span>Virar Carta ({isFlipped ? 'Mostrando Verso' : 'Mostrando Frente'})</span>
          </button>

          {/* Ace Full Art Toggle */}
          {isAce && (
            <div className="mt-3 flex items-center gap-2 bg-slate-900/80 px-3 py-1.5 rounded-lg border border-slate-800 text-xs text-slate-300">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Modo de Exibição:</span>
              <button
                onClick={() => setUseFullArt(!useFullArt)}
                className={`px-2 py-0.5 rounded font-medium transition-colors ${
                  useFullArt
                    ? 'bg-amber-500 text-black font-bold'
                    : 'bg-slate-800 text-slate-300 hover:text-white'
                }`}
              >
                {useFullArt ? 'Arte Quadrada 1600px' : 'Carta Padrão'}
              </button>
            </div>
          )}
        </div>

        {/* Right Column: Card Details & Export System */}
        <div className="flex flex-col justify-between md:w-1/2 space-y-5">
          {/* Header Info */}
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span
                style={{ color: card.color }}
                className="text-2xl font-black"
              >
                {card.suitSymbol}
              </span>
              <span className="text-xs font-mono uppercase tracking-widest text-slate-400">
                {card.suit} • Rank {card.rank}
              </span>
              <span className="ml-auto text-xs px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-mono border border-amber-500/30">
                Poder: {card.rankValue}
              </span>
            </div>

            <h2 className="text-2xl font-black text-amber-100 tracking-tight">
              {card.name}
            </h2>
            <h3 className="text-sm font-medium text-amber-400/90 font-mono">
              {card.title}
            </h3>
          </div>

          {/* Description & Lore */}
          <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800 space-y-2">
            <div className="text-xs text-amber-300/80 font-bold uppercase tracking-wider flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
              <span>Mitologia & Entidade</span>
            </div>
            <p className="text-sm text-slate-300 leading-relaxed">
              {card.description}
            </p>
            {card.role && (
              <div className="text-xs text-slate-400 pt-1 border-t border-slate-800 flex items-center gap-1">
                <span className="text-amber-400/80">Função Real:</span>
                <span>{card.role}</span>
              </div>
            )}
          </div>

          {/* Custom Deck Quantity Controls */}
          <div className="p-4 rounded-xl bg-amber-950/20 border border-amber-500/30 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-amber-400" />
              <div>
                <div className="text-xs font-bold text-amber-200">No Deck Personalizado</div>
                <div className="text-[11px] text-amber-400/70">Quantidade de cópias da carta</div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  playSound('click');
                  onUpdateDeckCount(card, -1);
                }}
                disabled={inDeckCount <= 0}
                className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-white disabled:opacity-30 disabled:hover:bg-slate-800 flex items-center justify-center font-bold"
              >
                <Minus className="w-4 h-4" />
              </button>
              <span className="w-8 text-center font-mono font-bold text-lg text-amber-300">
                {inDeckCount}
              </span>
              <button
                onClick={() => {
                  playSound('click');
                  onUpdateDeckCount(card, 1);
                }}
                className="w-8 h-8 rounded-lg bg-amber-500 hover:bg-amber-400 text-black flex items-center justify-center font-bold"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-800 flex justify-end">
            <button
              onClick={onClose}
              className="py-2.5 px-6 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 font-bold text-sm transition-colors"
            >
              Fechar Visualização
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
