import React from 'react';
import { CasinoChip, CHIP_PRESETS } from './CasinoChip';
import { playSound } from '../utils/audio';
import confetti from 'canvas-confetti';
import { X, Sparkles, Coins, Gift, Zap, ShieldCheck } from 'lucide-react';

interface ChipsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentChips: number;
  onAddChips: (amount: number) => void;
}

export const ChipsModal: React.FC<ChipsModalProps> = ({
  isOpen,
  onClose,
  currentChips,
  onAddChips
}) => {
  if (!isOpen) return null;

  const handleClaim = (amount: number, label: string) => {
    playSound('chime');
    confetti({
      particleCount: 60,
      spread: 70,
      origin: { y: 0.6 }
    });
    onAddChips(amount);
  };

  const PACKAGES = [
    {
      amount: 1000,
      title: 'Bênção de Hermes',
      desc: 'Ficha Branca #1 • Pacote inicial rápido',
      chipValue: 1,
      badge: 'Ficha 1 (Branca/Ouro)',
      buttonBg: 'from-slate-600 to-slate-800'
    },
    {
      amount: 5000,
      title: 'Fúria de Ares',
      desc: 'Ficha Vermelha #5 • Apostas dinâmicas',
      chipValue: 5,
      badge: 'Ficha 5 (Vermelha/Ouro)',
      buttonBg: 'from-red-600 to-red-800'
    },
    {
      amount: 25000,
      title: 'Tributo de Atena',
      desc: 'Ficha Verde #25 • Mais popular no Poker & 21',
      chipValue: 25,
      badge: 'Ficha 25 (Verde/Ouro)',
      popular: true,
      buttonBg: 'from-emerald-600 to-teal-800'
    },
    {
      amount: 100000,
      title: 'Tesouro de Zeus',
      desc: 'Ficha Negra #100 • Mesas de grandes apostas',
      chipValue: 100,
      badge: 'Ficha 100 (Negra/Ouro)',
      buttonBg: 'from-amber-600 to-amber-800'
    },
    {
      amount: 500000,
      title: 'Arca Sagrada de Midas',
      desc: 'Ficha Púrpura #500 • Saldo VIP sem limites',
      chipValue: 500,
      badge: 'Ficha 500 (Púrpura/Ouro)',
      buttonBg: 'from-purple-600 to-pink-700'
    }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-gradient-to-b from-[#13112a] to-[#0a0817] border-2 border-amber-500/40 rounded-3xl p-5 sm:p-7 shadow-2xl shadow-amber-500/20 text-white space-y-5 my-auto">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="text-center space-y-1.5">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-400/40 text-amber-300 text-xs font-bold">
            <Gift className="w-4 h-4" />
            <span>Tesouro Sagrado dos Deuses • 100% Grátis</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black bg-gradient-to-r from-amber-200 via-amber-400 to-amber-500 bg-clip-text text-transparent">
            Pegar Fichas de Jogo
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 max-w-md mx-auto">
            Todas as 5 fichas sagradas são 100% gratuitas. Pegue quantas vezes quiser para apostar no Poker, Blackjack ou Truco!
          </p>
        </div>

        {/* Current Balance Card with All 5 Chips */}
        <div className="flex flex-col sm:flex-row items-center justify-between p-3.5 sm:p-4 rounded-2xl bg-slate-950/80 border border-amber-500/30 shadow-inner gap-3">
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center shrink-0">
              <Coins className="w-6 h-6 text-amber-400" />
            </div>
            <div>
              <div className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">
                Seu Saldo Atual
              </div>
              <div className="text-2xl font-black text-amber-300 font-mono">
                {currentChips.toLocaleString()} <span className="text-xs text-amber-400/80 font-sans">FICHAS</span>
              </div>
            </div>
          </div>

          {/* All 5 Distinct Chips Preview */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            <CasinoChip value={1} size="sm" />
            <CasinoChip value={5} size="sm" />
            <CasinoChip value={25} size="sm" />
            <CasinoChip value={100} size="sm" />
            <CasinoChip value={500} size="sm" />
          </div>
        </div>

        {/* Free Packages List - All 5 Tiers */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {PACKAGES.map((pkg, idx) => (
            <div
              key={pkg.amount}
              className={`relative p-3.5 rounded-2xl bg-slate-900/90 border transition-all duration-200 hover:border-amber-400/70 flex flex-col justify-between gap-3 ${
                pkg.popular
                  ? 'border-amber-400/60 shadow-lg shadow-amber-500/20 ring-1 ring-amber-400/30'
                  : 'border-slate-800'
              } ${idx === 4 ? 'sm:col-span-2 lg:col-span-1' : ''}`}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30 uppercase">
                    {pkg.badge}
                  </span>
                  <h3 className="text-sm font-black text-slate-100 mt-1.5">{pkg.title}</h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">{pkg.desc}</p>
                </div>
                <CasinoChip value={pkg.chipValue} size="sm" />
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
                <span className="text-sm font-black text-amber-300 font-mono">
                  +{pkg.amount.toLocaleString()}
                </span>
                <button
                  onClick={() => handleClaim(pkg.amount, pkg.title)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black text-white bg-gradient-to-r ${pkg.buttonBg} hover:opacity-90 shadow-md active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer`}
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                  <span>Pegar Grátis</span>
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Footer info */}
        <div className="text-center text-[11px] text-slate-400 flex items-center justify-center gap-1.5">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>Fichas 100% de entretenimento livre e gratuito. Recargas instantâneas e sem limite.</span>
        </div>
      </div>
    </div>
  );
};
