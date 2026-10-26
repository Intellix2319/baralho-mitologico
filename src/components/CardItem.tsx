import React, { useState, useRef } from 'react';
import { CardData } from '../types/deck';
import { playSound } from '../utils/audio';

interface CardItemProps {
  card: CardData;
  onInspect?: (card: CardData) => void;
  onAddToDeck?: (card: CardData) => void;
  inDeckCount?: number;
  showFoil?: boolean;
}

export const CardItem: React.FC<CardItemProps> = React.memo(({ card }) => {
  const [isFlipped, setIsFlipped] = useState(false);
  const [rotateX, setRotateX] = useState(0);
  const [rotateY, setRotateY] = useState(0);
  const cardRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    // Skip 3D tilt calculations on touch/mobile devices or low power
    if (window.matchMedia('(pointer: coarse)').matches) return;
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const rotX = ((y - centerY) / centerY) * -8;
    const rotY = ((x - centerX) / centerX) * 8;

    setRotateX(rotX);
    setRotateY(rotY);
  };

  const handleMouseLeave = () => {
    setRotateX(0);
    setRotateY(0);
  };

  const handleClick = () => {
    playSound('flip');
    setIsFlipped((prev) => !prev);
  };

  // Thumbnail URLs for fast loading with fallback
  const frontThumb = `/assets/deck/thumb/${card.file.replace('.png', '.webp')}`;
  const backThumb = '/assets/deck/thumb/BACK.webp';

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
      style={{
        perspective: '1000px'
      }}
      className="group relative cursor-pointer select-none transition-transform duration-150 hover:-translate-y-1"
      title="Clique para virar a carta"
    >
      {/* 3D Card Flipper */}
      <div
        style={{
          transform: `rotateX(${rotateX}deg) rotateY(${rotateY + (isFlipped ? 180 : 0)}deg)`,
          transformStyle: 'preserve-3d',
          transition: 'transform 0.35s cubic-bezier(0.2, 0.8, 0.2, 1)'
        }}
        className="relative w-full aspect-[640/1120] rounded-xl shadow-lg border border-amber-500/30 group-hover:border-amber-400 group-hover:shadow-amber-500/20 transition-all duration-150"
      >
        {/* Front of Card */}
        <div
          style={{
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden',
            zIndex: isFlipped ? 0 : 2
          }}
          className="absolute inset-0 w-full h-full rounded-xl overflow-hidden bg-[#121024]"
        >
          <img
            src={frontThumb}
            onError={(e) => {
              (e.target as HTMLImageElement).src = `/assets/deck/${card.file}`;
            }}
            alt={card.name}
            className="w-full h-full object-cover rendering-pixelated"
            loading="lazy"
            decoding="async"
          />
        </div>

        {/* Back of Card (Full bleed Greek Meander Laurel Thunderbolt) */}
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
            src={backThumb}
            onError={(e) => {
              (e.target as HTMLImageElement).src = '/assets/deck/BACK.png';
            }}
            alt="Verso Oficial da Carta"
            className="w-full h-full object-cover rendering-pixelated"
            loading="lazy"
            decoding="async"
          />
        </div>
      </div>

      {/* Card Label */}
      <div className="mt-2 text-center">
        <div className="text-xs font-bold text-amber-200/90 truncate flex items-center justify-center gap-1">
          <span style={{ color: card.color }}>{card.suitSymbol}</span>
          <span>{card.name}</span>
        </div>
        <div className="text-[11px] text-slate-400 truncate font-mono">
          {card.character.split(' ')[0]}
        </div>
      </div>
    </div>
  );
});
