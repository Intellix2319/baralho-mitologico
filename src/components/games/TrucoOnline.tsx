import React, { useEffect, useRef, useState } from 'react';
import confetti from 'canvas-confetti';
import { useOnlineGame } from '../../online/engine';
import { trucoEngines, teamOf, manilhaRank, power, type Variant } from '../../online/engines/truco';
import { cardInfo, cardThumb, BACK_THUMB } from '../../online/cards';
import { OnlineGameFrame } from './OnlineGameFrame';
import { playSound } from '../../utils/audio';
import { Flame, Check, Flag, TrendingUp, Trophy, RotateCcw } from 'lucide-react';

interface Props {
  variant: Variant;
}

export const TrucoOnline: React.FC<Props> = ({ variant }) => {
  const engine = trucoEngines[variant];
  const { view, dispatch, isHost } = useOnlineGame(engine);
  const [selected, setSelected] = useState<string | null>(null);
  const [shout, setShout] = useState<{ name: string; text: string } | null>(null);
  const lastCounter = useRef(-1);

  const shoutN = view?.shout?.n;
  useEffect(() => {
    if (!view?.shout) return;
    setShout({ name: view.shout.name, text: view.shout.text });
    playSound('chime');
    const t = setTimeout(() => setShout(null), 2600);
    return () => clearTimeout(t);
  }, [shoutN]);

  const counter = view?.counter ?? -1;
  useEffect(() => {
    if (counter < 0) return;
    if (lastCounter.current >= 0 && counter !== lastCounter.current) playSound('flip');
    lastCounter.current = counter;
    setSelected(null);
  }, [counter]);

  const matchWinner = view?.matchWinner ?? null;
  useEffect(() => {
    if (matchWinner && view && matchWinner === teamOf(view.mySeat)) {
      try {
        confetti({ particleCount: 90, spread: 85 });
      } catch {}
    }
  }, [matchWinner]);

  const myTeam = view ? teamOf(view.mySeat) : 'nos';
  const n = view ? view.seats.length : 0;
  const myTurn = !!view && view.phase === 'playing' && view.turn === view.mySeat;

  const playCard = (id: string) => {
    if (!view || !myTurn) return;
    if (selected === id) {
      dispatch({ type: 'play', card: id });
      setSelected(null);
    } else {
      playSound('click');
      setSelected(id);
    }
  };

  const others = view ? Array.from({ length: n - 1 }, (_, i) => (view.mySeat + 1 + i) % n) : [];
  const vaza = view && view.vazas.length ? view.vazas[view.vazas.length - 1] : null;
  const manilha = view ? manilhaRank(view.vira) : null;
  const wordTeam = (t: string) => (t === myTeam ? 'Seu time' : 'Adversários');

  const header = view && (
    <>
      <div className="flex items-center gap-1.5 text-[11px] font-black">
        <span className="px-2 py-0.5 rounded-lg bg-emerald-600/30 border border-emerald-500/40 text-emerald-200">
          Nós {view.scores[myTeam]}
        </span>
        <span className="text-slate-500">x</span>
        <span className="px-2 py-0.5 rounded-lg bg-red-600/30 border border-red-500/40 text-red-200">
          Eles {view.scores[myTeam === 'nos' ? 'eles' : 'nos']}
        </span>
      </div>
      <span className="px-2 py-0.5 rounded-lg bg-amber-500/20 border border-amber-500/50 text-amber-300 text-[11px] font-black whitespace-nowrap">
        Vale {view.stake}
      </span>
    </>
  );

  return (
    <OnlineGameFrame
      title={variant === 'paulista' ? 'Truco Paulista' : 'Truco Mineiro'}
      ready={!!view}
      right={header}
    >
      {view && (
        <div className="h-full flex flex-col gap-1.5 short:gap-1 p-2 short:p-1.5 overflow-hidden select-none">
          {/* Adversários e parceiros */}
          <div className="shrink-0 flex items-start justify-center gap-2 flex-wrap">
            {others.map((seat) => {
              const p = view.seats[seat];
              const mine = p.team === myTeam;
              const turn = view.turn === seat && view.phase === 'playing';
              return (
                <div
                  key={seat}
                  className={`flex flex-col items-center gap-0.5 px-2 py-1 rounded-xl border text-[10px] ${
                    turn ? 'border-amber-400 bg-amber-500/15 shadow-lg shadow-amber-500/20' : 'border-slate-800 bg-slate-900/70'
                  }`}
                >
                  <div className="flex items-center gap-1 font-bold">
                    <span className={`w-1.5 h-1.5 rounded-full ${p.human ? 'bg-emerald-400' : 'bg-slate-500'}`} />
                    <span className="truncate max-w-[90px] text-slate-100">{p.name}</span>
                    <span className={`font-black uppercase ${mine ? 'text-emerald-300' : 'text-red-300'}`}>
                      {mine ? 'Nós' : 'Eles'}
                    </span>
                  </div>
                  <div className="flex gap-0.5 h-8 short:h-6">
                    {Array.from({ length: p.cards }).map((_, i) => (
                      <img key={i} src={BACK_THUMB} alt="" className="h-full aspect-[640/1120] rounded-[3px] border border-amber-500/40 object-cover" />
                    ))}
                    {p.cards === 0 && <span className="text-slate-600 font-mono self-center">—</span>}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Mesa */}
          <div className="flex-1 min-h-0 flex items-center justify-center gap-3 relative">
            {view.variant === 'paulista' && view.vira && (
              <div className="shrink-0 flex flex-col items-center gap-0.5">
                <span className="text-[9px] font-black uppercase text-amber-300 bg-amber-500/15 border border-amber-500/40 rounded-full px-2">
                  Manilha: {manilha}
                </span>
                <img
                  src={cardThumb(view.vira)}
                  alt="Vira"
                  className="h-[16dvh] min-h-[56px] max-h-[110px] aspect-[640/1120] rounded-lg border-2 border-amber-400 object-cover"
                />
              </div>
            )}
            {view.variant === 'mineiro' && (
              <span className="shrink-0 text-[9px] font-black uppercase text-amber-300 bg-amber-500/15 border border-amber-500/40 rounded-xl px-2 py-1 text-center leading-tight">
                Manilhas fixas
                <br />4♣ 7♥ A♠ 7♦
              </span>
            )}

            <div className="flex items-end justify-center gap-2 flex-wrap">
              {vaza && vaza.plays.length > 0 ? (
                vaza.plays.map((pl) => {
                  const winning = vaza.winSeat === pl.seat;
                  return (
                    <div key={pl.seat} className="flex flex-col items-center gap-0.5">
                      <img
                        src={cardThumb(pl.card)}
                        alt={cardInfo(pl.card).name}
                        className={`h-[18dvh] min-h-[60px] max-h-[120px] aspect-[640/1120] rounded-lg border-2 object-cover shadow-xl ${
                          winning ? 'border-emerald-400 ring-2 ring-emerald-400/50' : 'border-slate-500'
                        }`}
                      />
                      <span className="text-[9px] font-bold text-slate-300 max-w-[70px] truncate">
                        {view.seats[pl.seat].name}
                      </span>
                    </div>
                  );
                })
              ) : (
                <span className="text-xs text-slate-500 font-mono">Mesa vazia</span>
              )}
            </div>

            {/* resultado das vazas anteriores */}
            <div className="shrink-0 flex flex-col gap-1">
              {view.vazas.map((v, i) =>
                v.winner ? (
                  <span
                    key={i}
                    className={`text-[9px] font-black px-1.5 py-0.5 rounded-md border whitespace-nowrap ${
                      v.winner === 'draw'
                        ? 'border-slate-600 text-slate-300'
                        : v.winner === myTeam
                        ? 'border-emerald-500/50 text-emerald-300 bg-emerald-500/10'
                        : 'border-red-500/50 text-red-300 bg-red-500/10'
                    }`}
                  >
                    {i + 1}ª: {v.winner === 'draw' ? 'Empate' : wordTeam(v.winner)}
                  </span>
                ) : null
              )}
            </div>

            {shout && (
              <div className="absolute top-1 left-1/2 -translate-x-1/2 z-20 bg-gradient-to-r from-red-600 to-amber-600 text-white font-black text-sm px-4 py-1.5 rounded-2xl border-2 border-white shadow-2xl animate-bounce pointer-events-none whitespace-nowrap">
                💥 {shout.name}: {shout.text}
              </div>
            )}
          </div>

          {/* Mensagem */}
          <div className="shrink-0 text-center text-[11px] font-bold text-slate-200 bg-slate-900/80 border border-slate-800 rounded-lg px-2 py-1">
            {view.phase === 'raise' && view.raise
              ? view.canRespond
                ? `${view.raise.byName} pediu ${view.raise.to === 3 ? 'TRUCO' : view.raise.to}! Aceita?`
                : `${view.raise.byName} pediu ${view.raise.to === 3 ? 'TRUCO' : view.raise.to}. Aguardando resposta...`
              : myTurn
              ? `Sua vez! Toque numa carta para escolher e de novo para jogar. ${view.message}`
              : view.message}
          </div>

          {/* Minha mão + ações */}
          <div className="shrink-0 flex items-end justify-center gap-3 flex-wrap">
            <div className="flex items-end gap-1.5">
              {view.myHand.map((id) => {
                const isManilha = power(view.variant, view.vira, id) >= 100;
                const sel = selected === id;
                return (
                  <button
                    key={id}
                    onClick={() => playCard(id)}
                    disabled={!myTurn}
                    className={`relative transition-transform ${sel ? '-translate-y-2' : ''} ${
                      myTurn ? 'cursor-pointer active:scale-95' : 'opacity-70 cursor-default'
                    }`}
                  >
                    <img
                      src={cardThumb(id)}
                      alt={cardInfo(id).name}
                      className={`h-[22dvh] min-h-[72px] max-h-[130px] aspect-[640/1120] rounded-lg border-2 object-cover shadow-xl ${
                        sel ? 'border-amber-300 ring-2 ring-amber-300/60' : isManilha ? 'border-amber-500' : 'border-slate-600'
                      }`}
                    />
                    {isManilha && (
                      <span className="absolute -top-1.5 -right-1.5 text-[8px] font-black bg-amber-500 text-black rounded-full px-1">
                        ★
                      </span>
                    )}
                  </button>
                );
              })}
              {view.myHand.length === 0 && <span className="text-[11px] text-slate-500 font-mono pb-6">Sem cartas</span>}
            </div>

            <div className="flex flex-col gap-1.5 min-w-[110px]">
              {view.canTruco && (
                <button
                  onClick={() => dispatch({ type: 'truco' })}
                  className="px-3 py-2 short:py-1.5 rounded-xl bg-gradient-to-r from-red-600 to-orange-500 text-white text-xs font-black flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
                >
                  <Flame className="w-4 h-4" />
                  {view.trucoLabel}!
                </button>
              )}
              {view.canRespond && (
                <>
                  <button
                    onClick={() => dispatch({ type: 'accept' })}
                    className="px-3 py-2 short:py-1.5 rounded-xl bg-emerald-600 text-white text-xs font-black flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
                  >
                    <Check className="w-4 h-4" /> Aceitar
                  </button>
                  {view.canReraise && (
                    <button
                      onClick={() => dispatch({ type: 'reraise' })}
                      className="px-3 py-2 short:py-1.5 rounded-xl bg-amber-500 text-slate-950 text-xs font-black flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
                    >
                      <TrendingUp className="w-4 h-4" /> {view.reraiseLabel}!
                    </button>
                  )}
                  <button
                    onClick={() => dispatch({ type: 'run' })}
                    className="px-3 py-2 short:py-1.5 rounded-xl bg-slate-800 border border-red-500/50 text-red-300 text-xs font-black flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
                  >
                    <Flag className="w-4 h-4" /> Correr
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Fim da partida */}
          {view.phase === 'matchDone' && view.matchWinner && (
            <div className="absolute inset-0 z-30 bg-black/75 flex items-center justify-center p-4">
              <div className="bg-slate-900 border-2 border-amber-500/60 rounded-2xl p-5 text-center space-y-3 max-w-xs">
                <Trophy className="w-9 h-9 text-amber-400 mx-auto" />
                <h3 className="text-lg font-black text-amber-200">
                  {view.matchWinner === myTeam ? 'Vitória do seu time!' : 'O time adversário venceu.'}
                </h3>
                <p className="text-xs text-slate-300">
                  {view.scores[myTeam]} x {view.scores[myTeam === 'nos' ? 'eles' : 'nos']}
                </p>
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
