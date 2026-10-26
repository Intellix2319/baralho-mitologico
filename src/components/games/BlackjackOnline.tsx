import React, { useEffect, useState } from 'react';
import { useOnlineGame } from '../../online/engine';
import { blackjackEngine, MIN_BET, type BjResult } from '../../online/engines/blackjack';
import { OnlineGameFrame } from './OnlineGameFrame';
import { CardBack, CardFace } from './OnlineCards';
import { playSound } from '../../utils/audio';
import { Trophy, RotateCcw } from 'lucide-react';

const CHIPS = [10, 25, 50, 100, 500];
const RESULT_LABEL: Record<BjResult, { text: string; cls: string }> = {
  blackjack: { text: 'BLACKJACK!', cls: 'bg-amber-500 text-black' },
  win: { text: 'Ganhou', cls: 'bg-emerald-600 text-white' },
  push: { text: 'Empate', cls: 'bg-slate-600 text-white' },
  lose: { text: 'Perdeu', cls: 'bg-red-700 text-white' },
  bust: { text: 'Estourou', cls: 'bg-red-700 text-white' },
  left: { text: 'Saiu', cls: 'bg-slate-700 text-slate-300' }
};

export const BlackjackOnline: React.FC = () => {
  const { view, dispatch, isHost } = useOnlineGame(blackjackEngine);
  const [bet, setBet] = useState(0);

  const counter = view?.counter ?? -1;
  const phase = view?.phase;
  useEffect(() => {
    if (phase === 'betting') setBet(0);
  }, [phase, view?.round]);
  useEffect(() => {
    if (counter >= 0) playSound('flip');
  }, [counter]);

  const me = view ? view.seats[view.mySeat] : null;
  const maxBet = view?.maxBet ?? 0;
  const addChip = (v: number) => {
    playSound('click');
    setBet((b) => Math.min(maxBet, b + v));
  };

  return (
    <OnlineGameFrame
      title="Blackjack 21"
      ready={!!view}
      right={me && <span className="text-[11px] font-mono font-black text-emerald-300 whitespace-nowrap">{me.stack} fichas</span>}
    >
      {view && me && (
        <div className="h-full flex flex-col gap-1.5 short:gap-1 p-2 short:p-1.5 overflow-hidden select-none relative">
          {/* Banca */}
          <div className="shrink-0 flex flex-col items-center gap-0.5">
            <div className="text-[10px] font-black uppercase text-amber-300">
              Banca {view.dealerTotal !== null ? `• ${view.dealerTotal}` : ''}
            </div>
            <div className="flex gap-1.5 h-[17dvh] min-h-[56px] max-h-[100px]">
              {view.dealer.length ? (
                view.dealer.map((c, i) =>
                  c ? <CardFace key={i} id={c} className="h-full" /> : <CardBack key={i} className="h-full" />
                )
              ) : (
                <span className="text-[11px] text-slate-500 font-mono self-center">Aguardando apostas</span>
              )}
            </div>
          </div>

          <div className="shrink-0 text-center text-[11px] font-bold text-slate-200 bg-slate-900/80 border border-slate-800 rounded-lg px-2 py-1">
            {view.myTurn ? 'Sua vez! Pedir carta, parar ou dobrar.' : view.message}
          </div>

          {/* Jogadores */}
          <div className="flex-1 min-h-0 flex items-center justify-center gap-2 flex-wrap overflow-y-auto">
            {view.seats.map((p, i) => (
              <div
                key={i}
                className={`flex flex-col items-center gap-0.5 px-2 py-1 rounded-xl border text-[10px] min-w-[96px] ${
                  p.turn ? 'border-amber-400 bg-amber-500/15 shadow-lg shadow-amber-500/20' : 'border-slate-800 bg-slate-900/70'
                } ${p.gone ? 'opacity-40' : ''} ${i === view.mySeat ? 'ring-1 ring-emerald-500/50' : ''}`}
              >
                <div className="flex items-center gap-1 font-bold max-w-[110px]">
                  <span className="truncate text-slate-100">{p.name}</span>
                  {i === view.mySeat && <span className="text-slate-400">(você)</span>}
                </div>
                <div className="flex gap-0.5 h-[14dvh] min-h-[48px] max-h-[84px]">
                  {p.hand.length ? (
                    p.hand.map((c) => <CardFace key={c} id={c} className="h-full !border" />)
                  ) : (
                    <span className="text-slate-600 font-mono self-center">{p.ready ? '...' : p.broke ? 'sem fichas' : 'sem aposta'}</span>
                  )}
                </div>
                <div className="flex items-center gap-1.5 font-mono font-bold">
                  {p.hand.length > 0 && <span className="text-slate-200">{p.total}{p.soft && p.total <= 21 ? '*' : ''}</span>}
                  {p.bet > 0 && <span className="text-amber-300">aposta {p.bet}</span>}
                </div>
                <div className="h-4">
                  {p.result ? (
                    <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-black ${RESULT_LABEL[p.result].cls}`}>
                      {RESULT_LABEL[p.result].text} {p.payout > 0 ? `+${p.payout}` : p.payout < 0 ? p.payout : ''}
                    </span>
                  ) : p.done && p.hand.length ? (
                    <span className="text-[9px] text-slate-400 font-bold">parou</span>
                  ) : null}
                </div>
              </div>
            ))}
          </div>

          {/* Controles */}
          <div className="shrink-0 flex items-center justify-center gap-2 flex-wrap min-h-[44px]">
            {view.canBet ? (
              <>
                <div className="flex gap-1.5">
                  {CHIPS.filter((c) => c <= maxBet).map((c) => (
                    <button
                      key={c}
                      onClick={() => addChip(c)}
                      className="w-10 h-10 rounded-full bg-gradient-to-b from-amber-400 to-amber-700 border-2 border-white/70 text-[11px] font-black text-slate-950 shadow-lg cursor-pointer active:scale-90"
                    >
                      {c}
                    </button>
                  ))}
                  <button
                    onClick={() => setBet(maxBet)}
                    className="px-2 h-10 rounded-full bg-slate-800 border border-slate-600 text-[10px] font-black text-slate-200 cursor-pointer"
                  >
                    Tudo
                  </button>
                </div>
                <button
                  onClick={() => setBet(0)}
                  className="px-3 py-2 rounded-xl bg-slate-800 border border-slate-600 text-[11px] font-bold text-slate-300 cursor-pointer"
                >
                  Limpar
                </button>
                <button
                  disabled={bet < MIN_BET}
                  onClick={() => dispatch({ type: 'bet', amount: bet })}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 disabled:from-slate-800 disabled:to-slate-800 disabled:text-slate-500 text-white text-xs font-black cursor-pointer disabled:cursor-not-allowed active:scale-95"
                >
                  Apostar {bet}
                </button>
              </>
            ) : view.myTurn ? (
              <>
                <button
                  onClick={() => dispatch({ type: 'hit' })}
                  className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-black cursor-pointer active:scale-95"
                >
                  Pedir carta
                </button>
                <button
                  onClick={() => dispatch({ type: 'stand' })}
                  className="px-4 py-2 rounded-xl bg-slate-800 border border-amber-500/50 text-amber-300 text-xs font-black cursor-pointer active:scale-95"
                >
                  Parar
                </button>
                {view.canDouble && (
                  <button
                    onClick={() => dispatch({ type: 'double' })}
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 text-xs font-black cursor-pointer active:scale-95"
                  >
                    Dobrar
                  </button>
                )}
              </>
            ) : view.phase === 'betting' && me.ready ? (
              <span className="text-[11px] text-slate-400 font-bold">Aposta feita. Aguardando os outros...</span>
            ) : view.phase === 'betting' && me.broke ? (
              <span className="text-[11px] text-red-300 font-bold">Você ficou sem fichas. Assista a mesa.</span>
            ) : null}
          </div>

          {view.phase === 'matchDone' && (
            <div className="absolute inset-0 z-30 bg-black/75 flex items-center justify-center p-4">
              <div className="bg-slate-900 border-2 border-amber-500/60 rounded-2xl p-5 text-center space-y-3 max-w-xs">
                <Trophy className="w-9 h-9 text-amber-400 mx-auto" />
                <h3 className="text-lg font-black text-amber-200">A mesa ficou sem fichas</h3>
                {isHost ? (
                  <button
                    onClick={() => dispatch({ type: 'rematch' })}
                    className="w-full py-2 rounded-xl bg-emerald-600 text-white text-xs font-black flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <RotateCcw className="w-4 h-4" /> Jogar de novo
                  </button>
                ) : (
                  <p className="text-[11px] text-slate-400">Aguardando o anfitrião...</p>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </OnlineGameFrame>
  );
};
