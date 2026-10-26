import React from 'react';
import { ArrowLeft, Loader2, WifiOff } from 'lucide-react';
import { onlineRoom, useOnlineRoom } from '../../online/room';
import { playSound } from '../../utils/audio';

interface Props {
  title: string;
  /** a mesa já chegou (convidado) / foi criada (anfitrião) */
  ready: boolean;
  /** conteúdo à direita da barra (placar, apostas...) */
  right?: React.ReactNode;
  children: React.ReactNode;
}

/** Moldura comum dos jogos online: barra de cima, sair, sala encerrada e carregando. */
export const OnlineGameFrame: React.FC<Props> = ({ title, ready, right, children }) => {
  const room = useOnlineRoom();
  const isHost = room.role === 'host';
  const alive = room.status === 'lobby';

  const exit = () => {
    playSound('click');
    if (isHost) {
      if (window.confirm('Encerrar a partida para todos e voltar para a sala?')) onlineRoom.endGame();
    } else if (window.confirm('Sair da sala?')) {
      onlineRoom.leave();
    }
  };

  return (
    <div className="flex-1 min-h-0 flex flex-col overflow-hidden w-full h-full bg-gradient-to-b from-slate-950 via-emerald-950/30 to-slate-950">
      <div className="shrink-0 flex items-center gap-2 px-2 py-1.5 short:py-1 border-b border-slate-800 bg-slate-950/90">
        <button
          onClick={exit}
          className="shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 short:py-1 rounded-lg bg-slate-900 hover:bg-red-950 border border-slate-700 hover:border-red-500/60 text-slate-300 hover:text-red-300 text-[11px] font-bold cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>{isHost ? 'Encerrar' : 'Sair'}</span>
        </button>
        <div className="min-w-0 flex items-center gap-2">
          <span className="text-[11px] sm:text-xs font-black text-amber-300 truncate">{title}</span>
          {room.info && (
            <span className="hidden sm:inline text-[10px] font-mono font-bold text-emerald-300 bg-emerald-900/50 border border-emerald-500/30 px-1.5 py-0.5 rounded-full">
              SALA {room.info.code}
            </span>
          )}
        </div>
        <div className="ml-auto flex items-center gap-2 min-w-0">{right}</div>
      </div>

      <div className="flex-1 min-h-0 overflow-hidden relative">
        {!alive ? (
          <div className="h-full flex flex-col items-center justify-center gap-3 p-6 text-center">
            <WifiOff className="w-8 h-8 text-red-400" />
            <p className="text-sm font-bold text-slate-200">{room.error || 'A sala foi encerrada.'}</p>
          </div>
        ) : !ready ? (
          <div className="h-full flex flex-col items-center justify-center gap-3 p-6 text-center">
            <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
            <p className="text-sm font-bold text-slate-200">Carregando a mesa...</p>
          </div>
        ) : (
          children
        )}
      </div>
    </div>
  );
};
