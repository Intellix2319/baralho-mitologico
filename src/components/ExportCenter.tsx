import React, { useState } from 'react';
import { CardData, CustomDeck, ExportResolution } from '../types/deck';
import { playSound } from '../utils/audio';
import { exportDeckAsZip, downloadPrintSheet, downloadCardBack } from '../utils/exporter';
import {
  Download,
  Printer,
  Archive,
  Sparkles,
  FileText,
  CheckCircle2,
  Package,
  Image as ImageIcon
} from 'lucide-react';

interface ExportCenterProps {
  allCards: CardData[];
  activeDeck: CustomDeck;
}

export const ExportCenter: React.FC<ExportCenterProps> = ({
  allCards,
  activeDeck
}) => {
  const [resolution, setResolution] = useState<ExportResolution>('2x');
  const [isExportingAll, setIsExportingAll] = useState(false);
  const [isExportingActive, setIsExportingActive] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportStatus, setExportStatus] = useState('');
  const [isGeneratingSheet, setIsGeneratingSheet] = useState(false);
  const [selectedSheetPage, setSelectedSheetPage] = useState(1);

  const totalPages = Math.ceil(allCards.length / 9); // 6 pages of 9 cards

  const handleExportFullDeckZip = async () => {
    playSound('click');
    setIsExportingAll(true);
    setExportProgress(0);
    setExportStatus('Iniciando exportação do baralho completo...');

    const cardsToExport = allCards.map((c) => ({ card: c, count: 1 }));

    try {
      await exportDeckAsZip(
        'Baralho_Completo_Deuses_Sombrios',
        cardsToExport,
        resolution,
        (pct, status) => {
          setExportProgress(pct);
          setExportStatus(status);
        }
      );
      playSound('chime');
    } finally {
      setIsExportingAll(false);
    }
  };

  const handleExportActiveDeckZip = async () => {
    playSound('click');
    setIsExportingActive(true);
    setExportProgress(0);
    setExportStatus(`Exportando deck "${activeDeck.name}"...`);

    const cardsToExport = activeDeck.cards
      .map((entry) => {
        const c = allCards.find((card) => card.id === entry.cardId);
        return c ? { card: c, count: entry.count } : null;
      })
      .filter(Boolean) as { card: CardData; count: number }[];

    try {
      await exportDeckAsZip(
        activeDeck.name,
        cardsToExport,
        resolution,
        (pct, status) => {
          setExportProgress(pct);
          setExportStatus(status);
        }
      );
      playSound('chime');
    } finally {
      setIsExportingActive(false);
    }
  };

  const handleExportSheet = async (page: number) => {
    playSound('click');
    setIsGeneratingSheet(true);
    try {
      await downloadPrintSheet(allCards, page);
      playSound('chime');
    } finally {
      setIsGeneratingSheet(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header Banner */}
      <div className="p-8 rounded-3xl bg-gradient-to-br from-slate-900 via-amber-950/20 to-slate-950 border border-amber-500/30 shadow-2xl relative overflow-hidden">
        <div className="relative z-10 space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-mono font-bold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Exportação em Alta Resolução 300 DPI</span>
          </div>

          <h2 className="text-3xl font-black text-amber-100 tracking-tight">
            Central de Exportação e Impressão
          </h2>

          <p className="text-slate-300 text-sm max-w-2xl leading-relaxed">
            Exporte as cartas individualmente, baixe pacotes compactados (.ZIP) com todas as 54 cartas ou gere folhas de impressão prontas para recorte em tamanho padrão de cartas de baralho.
          </p>

          {/* Resolution Selector */}
          <div className="pt-4 flex flex-wrap items-center gap-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
              Qualidade de Exportação:
            </span>
            {(['1x', '2x', '4x'] as ExportResolution[]).map((res) => (
              <button
                key={res}
                onClick={() => {
                  playSound('click');
                  setResolution(res);
                }}
                className={`px-4 py-2 rounded-xl text-xs font-mono font-bold transition-all ${
                  resolution === res
                    ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/20 scale-105'
                    : 'bg-slate-900 text-slate-300 hover:text-white border border-slate-800'
                }`}
              >
                {res === '1x'
                  ? 'Padrão (640 x 1120 px)'
                  : res === '2x'
                  ? 'Alta Resolução 2K (1280 x 2240 px)'
                  : 'Ultra 4K Print-Ready (2560 x 4480 px • 300 DPI)'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Progress notification if exporting */}
      {(isExportingAll || isExportingActive) && (
        <div className="p-5 rounded-2xl bg-amber-950/40 border border-amber-500/50 space-y-3 animate-in fade-in">
          <div className="flex justify-between text-sm font-mono text-amber-200 font-bold">
            <span>{exportStatus}</span>
            <span>{exportProgress}%</span>
          </div>
          <div className="w-full bg-slate-900 h-3 rounded-full overflow-hidden p-0.5 border border-amber-500/30">
            <div
              className="bg-gradient-to-r from-amber-500 to-amber-300 h-full rounded-full transition-all duration-200"
              style={{ width: `${exportProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* Main Export Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Card 1: Complete 54-Card ZIP */}
        <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-amber-500/40 transition-all space-y-4 flex flex-col justify-between">
          <div className="space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Archive className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-amber-100">
              Baralho Completo (.ZIP)
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Arquivo ZIP contendo todos os 4 naipes (Ás ao Rei), os 2 Coringas Míticos e a carta do Verso com o relâmpago de Zeus.
            </p>
            <div className="flex items-center gap-3 text-xs font-mono text-amber-300/80 pt-1">
              <span>• 54 cartas frontais</span>
              <span>• 1 verso oficial</span>
              <span>• Manifesto JSON</span>
            </div>
          </div>

          <button
            onClick={handleExportFullDeckZip}
            disabled={isExportingAll}
            className="w-full py-3.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-sm flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 transition-all active:scale-98 disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            <span>{isExportingAll ? 'Processando Arquivo...' : 'Baixar Todas as 54 Cartas (.ZIP)'}</span>
          </button>
        </div>

        {/* Card 2: Custom Deck ZIP */}
        <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-amber-500/40 transition-all space-y-4 flex flex-col justify-between">
          <div className="space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400">
              <Package className="w-6 h-6 text-amber-400" />
            </div>
            <h3 className="text-xl font-bold text-amber-100">
              Deck Ativo Personalizado (.ZIP)
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Exporta apenas as cartas configuradas no seu deck atual: <strong className="text-amber-300">"{activeDeck.name}"</strong>, incluindo multiplicadores de cópias e o verso.
            </p>
            <div className="flex items-center gap-3 text-xs font-mono text-amber-300/80 pt-1">
              <span>• {activeDeck.cards.length} cartas distintas</span>
              <span>• {activeDeck.cards.reduce((acc, c) => acc + c.count, 0)} no total</span>
            </div>
          </div>

          <button
            onClick={handleExportActiveDeckZip}
            disabled={isExportingActive || activeDeck.cards.length === 0}
            className="w-full py-3.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 border border-amber-500/40 text-amber-300 font-bold text-sm flex items-center justify-center gap-2 transition-all active:scale-98 disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            <span>{isExportingActive ? 'Processando Deck...' : `Baixar "${activeDeck.name}" (.ZIP)`}</span>
          </button>
        </div>

        {/* Card 3: Printable A4 Sheets (3x3 Grid) */}
        <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-amber-500/40 transition-all space-y-4 flex flex-col justify-between md:col-span-2">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Printer className="w-5 h-5 text-amber-400" />
                <h3 className="text-lg font-bold text-amber-100">
                  Folhas de Impressão A4 (Prontas para Recorte)
                </h3>
              </div>
              <p className="text-xs text-slate-400">
                Gera imagens A4 de altíssima resolução (300 DPI) com 9 cartas por folha organizadas em grade 3x3 e guias de corte.
              </p>
            </div>

            {/* Page Selector */}
            <div className="flex items-center gap-2 bg-slate-950 p-1.5 rounded-xl border border-slate-800">
              <span className="text-xs text-slate-400 px-2 font-mono">Página:</span>
              {Array.from({ length: totalPages }).map((_, i) => (
                <button
                  key={i + 1}
                  onClick={() => setSelectedSheetPage(i + 1)}
                  className={`w-8 h-8 rounded-lg text-xs font-mono font-bold transition-colors ${
                    selectedSheetPage === i + 1
                      ? 'bg-amber-500 text-black'
                      : 'bg-slate-900 text-slate-300 hover:text-white'
                  }`}
                >
                  {i + 1}
                </button>
              ))}
            </div>
          </div>

          <div className="pt-2 flex flex-wrap items-center justify-between gap-4">
            <div className="text-xs font-mono text-slate-400">
              Página {selectedSheetPage} contém as cartas {(selectedSheetPage - 1) * 9 + 1} até{' '}
              {Math.min(selectedSheetPage * 9, allCards.length)}
            </div>

            <button
              onClick={() => handleExportSheet(selectedSheetPage)}
              disabled={isGeneratingSheet}
              className="py-2.5 px-6 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-sm flex items-center gap-2 shadow-md"
            >
              <Printer className="w-4 h-4" />
              <span>{isGeneratingSheet ? 'Gerando Folha...' : `Baixar Folha A4 (Página ${selectedSheetPage})`}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Printing Tips & Spec Guide */}
      <div className="p-6 rounded-2xl bg-slate-950 border border-slate-800/80 space-y-3">
        <div className="flex items-center gap-2 text-sm font-bold text-amber-300">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>Guia de Impressão e Corte Físico</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs text-slate-400">
          <div className="p-3 rounded-xl bg-slate-900/50 border border-slate-800">
            <div className="font-bold text-slate-200 mb-1">Papel Recomendado</div>
            <div>Papel Couché 300g/m² ou Papel Linho para baralhos com acabamento fosco.</div>
          </div>
          <div className="p-3 rounded-xl bg-slate-900/50 border border-slate-800">
            <div className="font-bold text-slate-200 mb-1">Proporção e Resolução</div>
            <div>Arquivos criados na proporção clássica de cartas, com 300 DPI em escala 4K.</div>
          </div>
          <div className="p-3 rounded-xl bg-slate-900/50 border border-slate-800">
            <div className="font-bold text-slate-200 mb-1">Proteção e Sleeves</div>
            <div>Compatível com protetores (sleeves) padrão Standard / Tarot.</div>
          </div>
        </div>
      </div>
    </div>
  );
};
