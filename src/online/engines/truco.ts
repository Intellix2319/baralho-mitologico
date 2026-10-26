/**
 * Motor do Truco (Paulista e Mineiro) para 2, 4 ou 6 jogadores. Só funções puras.
 * Lugares pares = "Nós", ímpares = "Eles".
 */
import rawCards from '../../cards_data.json';
import { fillSeats, turnIntoAI, type OnlineEngine, type Seat, type Step } from '../engine';

export type Variant = 'paulista' | 'mineiro';
export type Team = 'nos' | 'eles';
export type Phase = 'idle' | 'playing' | 'raise' | 'vazaDone' | 'handDone' | 'matchDone';

const CARDS = rawCards as any[];
const RANKS = ['4', '5', '6', '7', 'Q', 'J', 'K', 'A', '2', '3'];
const DECK_IDS: string[] = CARDS.filter((c) => RANKS.includes(c.rank) && c.suitCode !== 'X').map((c) => c.id);
const CARD: Record<string, any> = Object.fromEntries(CARDS.map((c) => [c.id, c]));
const SUIT_BONUS: Record<string, number> = { D: 1, S: 2, H: 3, C: 4 };
const ORDER: Record<string, number> = { '4': 1, '5': 2, '6': 3, '7': 4, Q: 5, J: 6, K: 7, A: 8, '2': 9, '3': 10 };
const WIN_SCORE = 12;

export const teamOf = (seat: number): Team => (seat % 2 === 0 ? 'nos' : 'eles');
const other = (t: Team): Team => (t === 'nos' ? 'eles' : 'nos');
const nextStake = (st: number) => (st === 1 ? 3 : st === 3 ? 6 : st === 6 ? 9 : 12);
const foldPoints = (refused: number) => (refused === 3 ? 1 : refused === 6 ? 3 : refused === 9 ? 6 : 9);
const STAKE_WORD: Record<number, string> = { 3: 'TRUCO!', 6: 'SEIS!', 9: 'NOVE!', 12: 'DOZE!' };

// Nas mensagens, o time vira "Seu time" / "O time adversário" conforme quem está olhando.
const T = (t: Team) => `⟦${t}⟧`;
const persp = (text: string, seat: number) => {
  const mine = teamOf(seat);
  return text
    .replace(/⟦nos⟧/g, mine === 'nos' ? 'Seu time' : 'O time adversário')
    .replace(/⟦eles⟧/g, mine === 'eles' ? 'Seu time' : 'O time adversário');
};

export const manilhaRank = (vira: string | null): string | null => {
  if (!vira) return null;
  return RANKS[(RANKS.indexOf(CARD[vira].rank) + 1) % RANKS.length];
};

export function power(variant: Variant, vira: string | null, id: string): number {
  const c = CARD[id];
  if (variant === 'paulista') {
    if (vira && c.rank === manilhaRank(vira)) return 100 + (SUIT_BONUS[c.suitCode] || 0);
  } else {
    if (c.rank === '4' && c.suitCode === 'C') return 104; // Zap
    if (c.rank === '7' && c.suitCode === 'H') return 103; // Copeta
    if (c.rank === 'A' && c.suitCode === 'S') return 102; // Espadilha
    if (c.rank === '7' && c.suitCode === 'D') return 101; // Picafumo
  }
  return ORDER[c.rank] || 0;
}

export interface Play {
  seat: number;
  card: string;
  power: number;
}
export interface Vaza {
  plays: Play[];
  winner?: Team | 'draw';
  winSeat?: number;
}

export interface TrucoState {
  seats: Seat[];
  variant: Variant;
  phase: Phase;
  scores: Record<Team, number>;
  hands: string[][];
  vira: string | null;
  starter: number; // quem abre a mão
  turn: number;
  vazas: Vaza[];
  nextLeader: number;
  stake: number;
  raise: null | { by: number; team: Team; to: number };
  raiseHolder: Team | null; // time que fez o último aumento (só o outro pode aumentar)
  message: string;
  shout: null | { seat: number; text: string; n: number };
  matchWinner: Team | null;
  handWinner: Team | null;
  counter: number;
}

export type TrucoAction =
  | { type: 'play'; card: string }
  | { type: 'truco' }
  | { type: 'accept' }
  | { type: 'run' }
  | { type: 'reraise' }
  | { type: 'rematch' }
  | { type: 'leave' }
  | { type: 'sys_deal' }
  | { type: 'sys_next' };

export interface TrucoView {
  mySeat: number;
  variant: Variant;
  phase: Phase;
  seats: { name: string; human: boolean; team: Team; cards: number }[];
  myHand: string[];
  vira: string | null;
  scores: Record<Team, number>;
  turn: number;
  vazas: Vaza[];
  stake: number;
  raise: null | { byName: string; team: Team; to: number };
  canTruco: boolean;
  trucoLabel: string;
  canRespond: boolean;
  canReraise: boolean;
  reraiseLabel: string;
  message: string;
  shout: null | { name: string; text: string; n: number };
  matchWinner: Team | null;
  handWinner: Team | null;
  starter: number;
  counter: number;
}

function shuffle(ids: string[]): string[] {
  const d = ids.slice();
  for (let i = d.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [d[i], d[j]] = [d[j], d[i]];
  }
  return d;
}

function canRaiseNow(s: TrucoState, team: Team): boolean {
  return s.phase === 'playing' && !s.raise && s.stake < 12 && s.raiseHolder !== team;
}

/** Quem venceu a mão, dado o histórico de vazas (null = ainda não decidiu). */
function handVictor(results: (Team | 'draw')[], starterTeam: Team): Team | null {
  const nos = results.filter((r) => r === 'nos').length;
  const eles = results.filter((r) => r === 'eles').length;
  if (nos >= 2) return 'nos';
  if (eles >= 2) return 'eles';
  if (results.length === 2) {
    if (results[0] === 'draw' && results[1] !== 'draw') return results[1] as Team;
    if (results[0] !== 'draw' && results[1] === 'draw') return results[0] as Team;
  }
  if (results.length === 3) {
    if (nos > eles) return 'nos';
    if (eles > nos) return 'eles';
    if (results[0] !== 'draw') return results[0] as Team;
    return starterTeam; // tudo empatado: vale para quem abriu a mão
  }
  return null;
}

function awardHand(s: TrucoState, winner: Team, points: number, why: string): TrucoState {
  const scores = { ...s.scores, [winner]: s.scores[winner] + points };
  const over = scores[winner] >= WIN_SCORE;
  return {
    ...s,
    scores,
    phase: over ? 'matchDone' : 'handDone',
    handWinner: winner,
    matchWinner: over ? winner : null,
    raise: null,
    message: `${T(winner)} ganhou ${points} ponto${points > 1 ? 's' : ''}! ${why}`.trim(),
    counter: s.counter + 1
  };
}

function deal(s: TrucoState): TrucoState {
  const n = s.seats.length;
  const deck = shuffle(DECK_IDS);
  const hands = s.seats.map(() => [deck.pop()!, deck.pop()!, deck.pop()!]);
  const vira = s.variant === 'paulista' ? deck.pop()! : null;
  const starter = (s.starter + 1) % n;
  return {
    ...s,
    phase: 'playing',
    hands,
    vira,
    starter,
    turn: starter,
    vazas: [{ plays: [] }],
    nextLeader: starter,
    stake: 1,
    raise: null,
    raiseHolder: null,
    handWinner: null,
    shout: null,
    message: `${s.seats[starter].name} abre a mão.`,
    counter: s.counter + 1
  };
}

function resolveVaza(s: TrucoState): TrucoState {
  const vazas = s.vazas.map((v) => ({ ...v, plays: [...v.plays] }));
  const vaza = vazas[vazas.length - 1];
  const top = Math.max(...vaza.plays.map((p) => p.power));
  const tops = vaza.plays.filter((p) => p.power === top);
  const crossTie = tops.some((p) => teamOf(p.seat) === 'nos') && tops.some((p) => teamOf(p.seat) === 'eles');
  const first = tops[0];
  vaza.winner = crossTie ? 'draw' : teamOf(first.seat);
  vaza.winSeat = crossTie ? undefined : first.seat;
  const results = vazas.map((v) => v.winner!) as (Team | 'draw')[];
  const base = { ...s, vazas, counter: s.counter + 1 };
  const victor = handVictor(results, teamOf(s.starter));
  const leaderOfVaza = vaza.plays[0].seat;
  if (victor) {
    const who = vaza.winSeat !== undefined ? ` ${s.seats[vaza.winSeat].name} jogou a maior carta.` : '';
    return awardHand(base, victor, s.stake, who.trim());
  }
  const next = crossTie ? leaderOfVaza : vaza.winSeat!;
  return {
    ...base,
    phase: 'vazaDone',
    nextLeader: next,
    message: crossTie
      ? 'EMPATOU a vaza! Quem abriu joga de novo.'
      : `${T(vaza.winner as Team)} levou a ${vazas.length}ª vaza (${s.seats[vaza.winSeat!].name}).`
  };
}

export const trucoEngine: OnlineEngine<TrucoState, TrucoAction, TrucoView> & { variant: Variant } = {
  variant: 'paulista',

  buildSeats(humans) {
    const n = humans.length <= 2 ? 2 : humans.length <= 4 ? 4 : 6;
    return fillSeats(humans, n);
  },

  init(seats) {
    return {
      seats,
      variant: this.variant,
      phase: 'idle',
      scores: { nos: 0, eles: 0 },
      hands: seats.map(() => []),
      vira: null,
      starter: seats.length - 1,
      turn: 0,
      vazas: [],
      nextLeader: 0,
      stake: 1,
      raise: null,
      raiseHolder: null,
      message: 'Embaralhando...',
      shout: null,
      matchWinner: null,
      handWinner: null,
      counter: 0
    };
  },

  reduce(s, a, seat) {
    const n = s.seats.length;
    const team = teamOf(seat);
    switch (a.type) {
      case 'leave': {
        const st = s.seats[seat];
        if (!st || !st.human) return s;
        const seats = s.seats.map((x, i) => (i === seat ? turnIntoAI(x) : x));
        return { ...s, seats, message: `${st.name} saiu. Uma IA assumiu o lugar.`, counter: s.counter + 1 };
      }
      case 'sys_deal':
        if (s.phase !== 'idle' && s.phase !== 'handDone') return s;
        return deal(s);
      case 'sys_next': {
        if (s.phase !== 'vazaDone') return s;
        return {
          ...s,
          phase: 'playing',
          vazas: [...s.vazas, { plays: [] }],
          turn: s.nextLeader,
          message: `${s.seats[s.nextLeader].name} abre a vaza.`,
          counter: s.counter + 1
        };
      }
      case 'rematch': {
        if (seat !== 0 || s.phase !== 'matchDone') return s;
        return { ...this.init(s.seats), variant: s.variant };
      }
      case 'play': {
        if (s.phase !== 'playing' || s.turn !== seat) return s;
        if (!s.hands[seat].includes(a.card)) return s;
        const hands = s.hands.map((h, i) => (i === seat ? h.filter((c) => c !== a.card) : h));
        const vazas = s.vazas.map((v) => ({ ...v, plays: [...v.plays] }));
        vazas[vazas.length - 1].plays.push({ seat, card: a.card, power: power(s.variant, s.vira, a.card) });
        const moved: TrucoState = { ...s, hands, vazas, shout: null, counter: s.counter + 1 };
        if (vazas[vazas.length - 1].plays.length >= n) return resolveVaza(moved);
        const turn = (seat + 1) % n;
        return { ...moved, turn, message: `Vez de ${s.seats[turn].name}.` };
      }
      case 'truco': {
        if (s.turn !== seat || !canRaiseNow(s, team)) return s;
        const to = nextStake(s.stake);
        return {
          ...s,
          phase: 'raise',
          raise: { by: seat, team, to },
          shout: { seat, text: STAKE_WORD[to], n: s.counter + 1 },
          message: `${s.seats[seat].name} pediu ${STAKE_WORD[to]}`,
          counter: s.counter + 1
        };
      }
      case 'accept': {
        if (s.phase !== 'raise' || !s.raise || team === s.raise.team) return s;
        return {
          ...s,
          phase: 'playing',
          stake: s.raise.to,
          raiseHolder: s.raise.team,
          raise: null,
          shout: { seat, text: 'ACEITO!', n: s.counter + 1 },
          message: `${s.seats[seat].name} aceitou! A mão vale ${s.raise.to}.`,
          counter: s.counter + 1
        };
      }
      case 'run': {
        if (s.phase !== 'raise' || !s.raise || team === s.raise.team) return s;
        const pts = foldPoints(s.raise.to);
        return awardHand(
          { ...s, shout: { seat, text: 'CORRI!', n: s.counter + 1 } },
          s.raise.team,
          pts,
          `${s.seats[seat].name} correu.`
        );
      }
      case 'reraise': {
        if (s.phase !== 'raise' || !s.raise || team === s.raise.team || s.raise.to >= 12) return s;
        const to = nextStake(s.raise.to);
        return {
          ...s,
          stake: s.raise.to, // aceitou o aumento anterior ao subir
          raise: { by: seat, team, to },
          shout: { seat, text: STAKE_WORD[to], n: s.counter + 1 },
          message: `${s.seats[seat].name} aumentou: ${STAKE_WORD[to]}`,
          counter: s.counter + 1
        };
      }
      default:
        return s;
    }
  },

  view(s, seat): TrucoView {
    const canTurn = s.phase === 'playing' && s.turn === seat && s.seats[seat]?.human;
    const myTeam = teamOf(seat);
    const responding = s.phase === 'raise' && !!s.raise && s.raise.team !== myTeam;
    const to = nextStake(s.stake);
    return {
      mySeat: seat,
      variant: s.variant,
      phase: s.phase,
      seats: s.seats.map((x, i) => ({ name: x.name, human: x.human, team: teamOf(i), cards: s.hands[i].length })),
      myHand: s.hands[seat] || [],
      vira: s.vira,
      scores: s.scores,
      turn: s.turn,
      vazas: s.vazas,
      stake: s.stake,
      raise: s.raise ? { byName: s.seats[s.raise.by].name, team: s.raise.team, to: s.raise.to } : null,
      canTruco: !!canTurn && canRaiseNow(s, myTeam),
      trucoLabel: STAKE_WORD[to] ? STAKE_WORD[to].replace('!', '') : '',
      canRespond: responding,
      canReraise: responding && s.raise!.to < 12,
      reraiseLabel: responding && s.raise!.to < 12 ? STAKE_WORD[nextStake(s.raise!.to)].replace('!', '') : '',
      message: persp(s.message, seat),
      shout: s.shout ? { name: s.seats[s.shout.seat].name, text: s.shout.text, n: s.shout.n } : null,
      matchWinner: s.matchWinner,
      handWinner: s.handWinner,
      starter: s.starter,
      counter: s.counter
    };
  },

  next(s): Step<TrucoAction> | null {
    if (s.phase === 'matchDone') return null;
    if (s.phase === 'idle') return { seat: 0, action: { type: 'sys_deal' }, delay: 900 };
    if (s.phase === 'handDone') return { seat: 0, action: { type: 'sys_deal' }, delay: 3200 };
    if (s.phase === 'vazaDone') return { seat: 0, action: { type: 'sys_next' }, delay: 1700 };

    if (s.phase === 'raise' && s.raise) {
      const responders = s.seats.map((_, i) => i).filter((i) => teamOf(i) !== s.raise!.team);
      if (responders.some((i) => s.seats[i].human)) return null; // espera um humano responder
      const seat = responders[0];
      return { seat, action: aiRespond(s, seat), delay: 1500 };
    }

    if (s.phase === 'playing') {
      const seat = s.turn;
      if (s.seats[seat].human) return null;
      const team = teamOf(seat);
      const hand = s.hands[seat];
      if (canRaiseNow(s, team)) {
        const pw = hand.map((c) => power(s.variant, s.vira, c));
        const hasManilha = pw.some((p) => p >= 101);
        const strong = pw.filter((p) => p >= 9).length;
        const chance = hasManilha ? 0.35 : strong >= 2 ? 0.2 : 0.03;
        if (Math.random() < chance) return { seat, action: { type: 'truco' }, delay: 1100 };
      }
      return { seat, action: { type: 'play', card: aiPickCard(s, seat) }, delay: 1000 };
    }
    return null;
  }
};

function handScore(s: TrucoState, seat: number): number {
  return s.hands[seat].reduce((sum, c) => {
    const p = power(s.variant, s.vira, c);
    return sum + (p >= 100 ? 3 + (p - 100) / 4 : p >= 9 ? 2 : p >= 7 ? 1 : 0.3);
  }, 0);
}

function aiRespond(s: TrucoState, seat: number): TrucoAction {
  const to = s.raise!.to;
  const thr = to === 3 ? 3.0 : to === 6 ? 3.8 : to === 9 ? 4.5 : 5.2;
  const sc = handScore(s, seat) + Math.random() * 1.5 - 0.5;
  if (sc >= thr + 2 && to < 12 && Math.random() < 0.3) return { type: 'reraise' };
  if (sc >= thr || Math.random() < 0.15) return { type: 'accept' };
  return { type: 'run' };
}

function aiPickCard(s: TrucoState, seat: number): string {
  const hand = s.hands[seat];
  const team = teamOf(seat);
  const vaza = s.vazas[s.vazas.length - 1];
  const withP = hand.map((c) => ({ c, p: power(s.variant, s.vira, c) })).sort((a, b) => a.p - b.p);
  const bestOpp = Math.max(0, ...vaza.plays.filter((p) => teamOf(p.seat) !== team).map((p) => p.power));
  const bestMine = Math.max(0, ...vaza.plays.filter((p) => teamOf(p.seat) === team).map((p) => p.power));
  if (vaza.plays.length === 0) {
    // abrindo a vaza: carta do meio na 1ª, a mais forte nas seguintes
    return s.vazas.length === 1 ? withP[Math.floor(withP.length / 2)].c : withP[withP.length - 1].c;
  }
  if (bestMine > bestOpp) return withP[0].c; // parceiro já está ganhando
  const winners = withP.filter((x) => x.p > bestOpp);
  if (winners.length) return winners[0].c;
  return withP[0].c;
}

/** Um motor por variante (cada um guarda a sua). */
export const trucoEngines: Record<Variant, typeof trucoEngine> = {
  paulista: { ...trucoEngine, variant: 'paulista' },
  mineiro: { ...trucoEngine, variant: 'mineiro' }
};
