import React, { useEffect, useState } from 'react';
import confetti from 'canvas-confetti';
import { useOnlineGame } from '../../online/engine';
import { pokerEngine } from '../../online/engines/poker';
import { OnlineGameFrame } from './OnlineGameFrame';
import { CardBack, CardFace, CardSlot } from './OnlineCards';
import { playSound } from '../../utils/audio';
import { Coins, Trophy, RotateCcw } from 'lucide-react';

const STREET_NAME: Record<string, string> = { preflop: 'Pré-flop', flop: 'Flop', turn: 'Turn', river: 'River' };

export const PokerOnline: React.FC = () => {
  const { view, dispatch, isHost } = useOnlineGame(pokerEngine);
  const [raiseTo, setRaiseTo] = useState(0);

  const minTo = view?.minRaiseTo ?? 0;
  const counter = view?.counter ?? -1;
  useEffect(() => {
    setRaiseTo(minTo);
  }, [counter, minTo]);

  const phase = view?.phase;
  useEffect(() => {
    if (phase === 'handDone' || phase === 'matchDone') playSound('chime');
  }, [phase, counter]);
  useEffect(() => {
    if (view && view.matchWinner === view.mySeat) {
      try {
        confetti({ particleCount: 90, spread: 85 });
      } catch {}
    }
  }, [view?.matchWinner]);

  const n = view ? view.seats.length : 0;
  const others = view ? Array.from({ length: n - 1 }, (_, i) => (view.mySeat + 1 + i) % n) : [];
  const me = view ? view.seats[view.mySeat] : null;
  const clamp = (v: number) => (view ? Math.max(view.minRaiseTo, Math.min(view.maxRaiseTo, v)) : v);
  const raiseValue = clamp(raiseTo || minTo);
  const isAllIn = view ? raiseValue >= view.maxRaiseTo : false;

  const right = view && (
    <>
      <span className="text-[10px] font-bold text-slate-300 whitespace-nowrap">
        Mão {view.handNo} • Blinds {view.sb}/{view.bb}
      </span>
      <span className="px-2 py-0.5 rounded-lg bg-amber-500/20 border border-amber-500/50 text-amber-300 text-[11px] font-black whitespace-nowrap flex items-center gap-1">
        <Coins className="w-3 h-3" /> {view.pot}
      </span>
    </>
  );

  return (
    <OnlineGameFrame title="Poker Texas Hold'em" ready={!!view} right={right}>
      {view && me && (
        <div className="h-full flex flex-col gap-1.5 short:gap-1 p-2 short:p-1.5 overflow-hidden select-none relative">
          {/* Outros jogadores */}
          <div className="shrink-0 flex items-start justify-center gap-1.5 flex-wrap">
            {others.map((seat) => {
              const p = view.seats[seat];
              return (
                <div
                  key={seat}
                  className={`flex flex-col items-center gap-0.5 px-2 py-1 rounded-xl border text-[10px] min-w-[84px] ${
                    p.turn
                      ? 'border-amber-400 bg-amber-500/15 shadow-lg shadow-amber-500/20'
                      : 'border-slate-800 bg-slate-900/70'
                  } ${p.folded || p.out ? 'opacity-50' : ''}`}
                >
                  <div className="flex items-center gap-1 font-bold max-w-[100px]">
                    <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${p.human ? 'bg-emerald-400' : 'bg-slate-500'}`} />
                    <span className="truncate text-slate-100">{p.name}</span>
                    {p.dealer && <span className="px-1 rounded-full bg-white text-black text-[8px] font-black">D</span>}
                  </div>
                  <div className="flex gap-0.5 h-9 short:h-7">
                    {p.out ? (
                      <span className="text-red-400 font-mono self-center">fora</span>
                    ) : p.hole ? (
                      p.hole.map((c) => <CardFace key={c} id={c} className="h-full !border" />)
                    ) : p.cards > 0 && !p.folded ? (
                      [0, 1].map((i) => <CardBack key={i} className="h-full !border" />)
                    ) : (
                      <span className="text-slate-600 font-mono self-center">—</span>
                    )}
                  </div>
                  <div className="font-mono font-black text-emerald-300">{p.stack}</div>
                  <div className="h-3 text-[9px] font-bold text-amber-300 truncate max-w-[100px]">
                    {p.lastAction || (p.allIn ? 'All-in' : '')}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Mesa */}
          <div className="flex-1 min-h-0 flex flex-col items-center justify-center gap-1">
            <div className="flex items-center gap-1.5">
              {[0, 1, 2, 3, 4].map((i) =>
                view.board[i] ? (
                  <CardFace key={i} id={view.board[i]} className="h-[17dvh] min-h-[56px] max-h-[110px]" />
                ) : (
                  <CardSlot key={i} className="h-[17dvh] min-h-[56px] max-h-[110px]" />
                )
              )}
            </div>
            <div className="text-[11px] font-bold text-slate-200 bg-slate-900/80 border border-slate-800 rounded-lg px-3 py-1 text-center max-w-full">
              <span className="text-amber-300 font-black">{STREET_NAME[view.street]}</span> • {view.message}
            </div>
          </div>

          {/* Minhas cartas e ações */}
          <div className="shrink-0 flex items-end justify-center gap-3 flex-wrap">
            <div className={`flex flex-col items-center gap-0.5 ${me.folded ? 'opacity-50' : ''}`}>
              <div className="flex gap-1.5">
                {view.myHole.length ? (
                  view.myHole.map((c) => (
                    <CardFace key={c} id={c} className={`h-[21dvh] min-h-[70px] max-h-[125px] ${view.myTurn ? '!border-amber-300' : ''}`} />
                  ))
                ) : (
                  <span className="text-[11px] text-slate-500 font-mono pb-6">Sem cartas</span>
                )}
              </div>
              <div className="text-[10px] font-bold flex items-center gap-2">
                <span className="text-emerald-300 font-mono font-black">{me.stack} fichas</span>
                {me.bet > 0 && <span className="text-amber-300">aposta {me.bet}</span>}
                {view.myHandName && <span className="text-slate-300">{view.myHandName}</span>}
              </div>
            </div>

            {view.myTurn ? (
              <div className="flex flex-col gap-1.5 min-w-[170px]">
                <div className="flex gap-1.5">
                  <button
                    onClick={() => dispatch({ type: 'fold' })}
                    className="flex-1 px-3 py-2 short:py-1.5 rounded-xl bg-slate-800 border border-red-500/50 text-red-300 text-xs font-black cursor-pointer active:scale-95"
                  >
                    Desistir
                  </button>
                  {view.canCheck ? (
                    <button
                      onClick={() => dispatch({ type: 'check' })}
                      className="flex-1 px-3 py-2 short:py-1.5 rounded-xl bg-emerald-600 text-white text-xs font-black cursor-pointer active:scale-95"
                    >
                      Passar
                    </button>
                  ) : (
                    <button
                      onClick={() => dispatch({ type: 'call' })}
                      className="flex-1 px-3 py-2 short:py-1.5 rounded-xl bg-emerald-600 text-white text-xs font-black cursor-pointer active:scale-95"
                    >
                      Pagar {Math.min(view.toCall, me.stack)}
                    </button>
                  )}
                </div>
                {view.canRaise && (
                  <>
                    {view.maxRaiseTo > view.minRaiseTo && (
                      <input
                        type="range"
                        min={view.minRaiseTo}
                        max={view.maxRaiseTo}
                        step={Math.max(1, Math.min(view.bb, view.maxRaiseTo - view.minRaiseTo))}
                        value={raiseValue}
                        onChange={(e) => setRaiseTo(Number(e.target.value))}
                        className="w-full accent-amber-400"
                      />
                    )}
                    <div className="flex gap-1">
                      {[
                        { l: '½ pote', v: view.currentBet + Math.round(view.pot / 2) },
                        { l: 'Pote', v: view.currentBet + view.pot },
                        { l: 'All-in', v: view.maxRaiseTo }
                      ].map((b) => (
                        <button
                          key={b.l}
                          onClick={() => setRaiseTo(clamp(b.v))}
                          className="flex-1 py-1 rounded-lg bg-slate-900 border border-slate-700 text-[10px] font-bold text-slate-300 cursor-pointer"
                        >
                          {b.l}
                        </button>
                      ))}
                    </div>
                    <button
                      onClick={() => dispatch({ type: 'raise', to: raiseValue })}
                      className="px-3 py-2 short:py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 text-xs font-black cursor-pointer active:scale-95"
                    >
                      {isAllIn ? `All-in ${raiseValue}` : view.currentBet === 0 ? `Apostar ${raiseValue}` : `Aumentar para ${raiseValue}`}
                    </button>
                  </>
                )}
              </div>
            ) : (
              <div className="text-[11px] text-slate-400 font-bold pb-6 min-w-[120px] text-center">
                {view.phase === 'betting' ? 'Aguardando os outros jogadores...' : ''}
              </div>
            )}
          </div>

          {/* Resultado da mão */}
          {view.phase === 'handDone' && view.winnings.length > 0 && (
            <div className="absolute top-12 left-1/2 -translate-x-1/2 z-20 bg-black/85 border-2 border-amber-500/60 rounded-2xl px-4 py-2 text-center max-w-[90%] pointer-events-none">
              {view.winnings.map((w) => (
                <div key={w.seat} className="text-xs font-black text-amber-200">
                  🏆 {view.seats[w.seat].name} +{w.amount}
                  {w.handName ? ` — ${w.handName}` : ''}
                </div>
              ))}
            </div>
          )}

          {/* Fim da partida */}
          {view.phase === 'matchDone' && (
            <div className="absolute inset-0 z-30 bg-black/75 flex items-center justify-center p-4">
              <div className="bg-slate-900 border-2 border-amber-500/60 rounded-2xl p-5 text-center space-y-3 max-w-xs">
                <Trophy className="w-9 h-9 text-amber-400 mx-auto" />
                <h3 className="text-lg font-black text-amber-200">
                  {view.matchWinner === view.mySeat
                    ? 'Você levou todas as fichas!'
                    : `${view.seats[view.matchWinner ?? 0].name} levou todas as fichas.`}
                </h3>
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
