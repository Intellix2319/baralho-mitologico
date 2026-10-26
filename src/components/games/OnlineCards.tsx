import React from 'react';
import { BACK_THUMB, cardInfo, cardThumb } from '../../online/cards';

export const CardFace: React.FC<{ id: string; className?: string }> = ({ id, className = '' }) => (
  <img
    src={cardThumb(id)}
    alt={cardInfo(id)?.name || id}
    draggable={false}
    className={`aspect-[640/1120] rounded-lg border-2 border-slate-500 object-cover shadow-xl bg-slate-900 ${className}`}
  />
);

export const CardBack: React.FC<{ className?: string }> = ({ className = '' }) => (
  <img
    src={BACK_THUMB}
    alt="Carta virada"
    draggable={false}
    className={`aspect-[640/1120] rounded-lg border-2 border-amber-500/50 object-cover shadow-md bg-slate-950 ${className}`}
  />
);

/** Espaço vazio onde a carta vai aparecer. */
export const CardSlot: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`aspect-[640/1120] rounded-lg border-2 border-dashed border-slate-700/70 bg-slate-900/40 ${className}`} />
);
