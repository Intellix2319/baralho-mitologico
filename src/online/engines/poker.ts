/**
 * Motor do Poker Texas Hold'em (sem limite) para 2 a 6 jogadores. Só funções puras.
 * Cada jogador começa com 1000 fichas. Os blinds sobem a cada 6 mãos.
 */
import rawCards from '../../cards_data.json';
import { fillSeats, turnIntoAI, type OnlineEngine, type Seat, type Step } from '../engine';

const CARDS = (rawCards as any[]).filter((c) => c.suitCode !== 'X');
const DECK_IDS: string[] = CARDS.map((c) => c.id);
const INFO: Record<string, any> = Object.fromEntries(CARDS.map((c) => [c.id, c]));
const START_STACK = 1000;
const HANDS_PER_LEVEL = 6;

export type Street = 'preflop' | 'flop' | 'turn' | 'river';
export type PokerPhase = 'idle' | 'betting' | 'runout' | 'handDone' | 'matchDone';

// ---------------------------------------------------------------- avaliador de mãos
const rankNum = (id: string): number => {
  const r = INFO[id].rank;
  if (r === 'A') return 14;
  if (r === 'K') return 13;
  if (r === 'Q') return 12;
  if (r === 'J') return 11;
  return parseInt(r, 10);
};
const CATEGORY_NAMES = [
  'Carta Alta',
  'Par',
  'Dois Pares',
  'Trinca',
  'Sequência',
  'Flush',
  'Full House',
  'Quadra',
  'Straight Flush',
  'Royal Flush'
];
const RANK_WORD = (v: number) =>
  v === 14 ? 'Ás' : v === 13 ? 'Rei' : v === 12 ? 'Dama' : v === 11 ? 'Valete' : String(v);

/** Pontuação de exatamente 5 cartas: categoria e desempates em ordem (comparação por número). */
function scoreFive(ids: string[]): { score: number; category: number; tb: number[] } {
  const vals = ids.map(rankNum).sort((a, b) => b - a);
  const flush = new Set(ids.map((i) => INFO[i].suitCode)).size === 1;
  const uniq = Array.from(new Set(vals));
  let straightHigh = 0;
  if (uniq.length === 5) {
    if (uniq[0] - uniq[4] === 4) straightHigh = uniq[0];
    else if (uniq[0] === 14 && uniq[1] === 5 && uniq[4] === 2) straightHigh = 5; // A-2-3-4-5
  }
  const counts: Record<number, number> = {};
  vals.forEach((v) => (counts[v] = (counts[v] || 0) + 1));
  const groups = Object.entries(counts)
    .map(([v, c]) => ({ v: Number(v), c }))
    .sort((a, b) => b.c - a.c || b.v - a.v);
  let category = 0;
  let tb: number[] = vals;
  if (straightHigh && flush) {
    category = straightHigh === 14 ? 9 : 8;
    tb = [straightHigh];
  } else if (groups[0].c === 4) {
    category = 7;
    tb = [groups[0].v, groups[1].v];
  } else if (groups[0].c === 3 && groups[1]?.c === 2) {
    category = 6;
    tb = [groups[0].v, groups[1].v];
  } else if (flush) {
    category = 5;
    tb = vals;
  } else if (straightHigh) {
    category = 4;
    tb = [straightHigh];
  } else if (groups[0].c === 3) {
    category = 3;
    tb = groups.map((g) => g.v);
  } else if (groups[0].c === 2 && groups[1]?.c === 2) {
    category = 2;
    tb = groups.map((g) => g.v);
  } else if (groups[0].c === 2) {
    category = 1;
    tb = groups.map((g) => g.v);
  } else {
    category = 0;
    tb = vals;
  }
  let score = category;
  for (let i = 0; i < 5; i++) score = score * 15 + (tb[i] || 0);
  return { score, category, tb };
}

export interface BestHand {
  score: number;
  category: number;
  name: string;
}

export function bestHand(ids: string[]): BestHand {
  const n = ids.length;
  let best: { score: number; category: number; tb: number[] } | null = null;
  if (n < 5) {
    // menos de 5 cartas (pré-flop/flop incompleto): só agrupa por pares para dar um nome
    const vals = ids.map(rankNum).sort((a, b) => b - a);
    const pair = vals.length >= 2 && vals[0] === vals[1];
    return { score: 0, category: pair ? 1 : 0, name: pair ? `Par de ${RANK_WORD(vals[0])}` : `Carta Alta (${RANK_WORD(vals[0] || 0)})` };
  }
  for (let a = 0; a < n - 4; a++)
    for (let b = a + 1; b < n - 3; b++)
      for (let c = b + 1; c < n - 2; c++)
        for (let d = c + 1; d < n - 1; d++)
          for (let e = d + 1; e < n; e++) {
            const r = scoreFive([ids[a], ids[b], ids[c], ids[d], ids[e]]);
            if (!best || r.score > best.score) best = r;
          }
  const b5 = best!;
  let name = CATEGORY_NAMES[b5.category];
  if (b5.category === 0) name = `Carta Alta (${RANK_WORD(b5.tb[0])})`;
  else if (b5.category === 1) name = `Par de ${RANK_WORD(b5.tb[0])}`;
  else if (b5.category === 2) name = `Dois Pares (${RANK_WORD(b5.tb[0])} e ${RANK_WORD(b5.tb[1])})`;
  else if (b5.category === 3) name = `Trinca de ${RANK_WORD(b5.tb[0])}`;
  else if (b5.category === 4) name = `Sequência ao ${RANK_WORD(b5.tb[0])}`;
  else if (b5.category === 5) name = `Flush ao ${RANK_WORD(b5.tb[0])}`;
  else if (b5.category === 6) name = `Full House (${RANK_WORD(b5.tb[0])} com ${RANK_WORD(b5.tb[1])})`;
  else if (b5.category === 7) name = `Quadra de ${RANK_WORD(b5.tb[0])}`;
  return { score: b5.score, category: b5.category, name };
}

// ---------------------------------------------------------------- estado
export interface PokerState {
  seats: Seat[];
  phase: PokerPhase;
  street: Street;
  stacks: number[];
  hands: string[][];
  board: string[];
  deck: string[];
  dealer: number;
  bets: number[]; // fichas colocadas nesta rodada de apostas
  totals: number[]; // fichas colocadas nesta mão
  folded: boolean[];
  allIn: boolean[];
  out: boolean[]; // sem fichas: fora da partida
  acted: boolean[];
  toAct: number;
  currentBet: number;
  minRaise: number;
  sb: number;
  bb: number;
  handNo: number;
  lastAction: (string | null)[];
  reveal: boolean[];
  winnings: { seat: number; amount: number; handName: string | null }[];
  matchWinner: number | null;
  message: string;
  counter: number;
}

export type PokerAction =
  | { type: 'fold' }
  | { type: 'check' }
  | { type: 'call' }
  | { type: 'raise'; to: number }
  | { type: 'rematch' }
  | { type: 'leave' }
  | { type: 'sys_deal' }
  | { type: 'sys_next' };

export interface PokerView {
  mySeat: number;
  phase: PokerPhase;
  street: Street;
  seats: {
    name: string;
    human: boolean;
    stack: number;
    bet: number;
    folded: boolean;
    allIn: boolean;
    out: boolean;
    dealer: boolean;
    cards: number;
    hole: string[] | null;
    lastAction: string | null;
    turn: boolean;
  }[];
  myHole: string[];
  board: string[];
  pot: number;
  currentBet: number;
  toCall: number;
  myTurn: boolean;
  canCheck: boolean;
  canRaise: boolean;
  minRaiseTo: number;
  maxRaiseTo: number;
  sb: number;
  bb: number;
  handNo: number;
  message: string;
  winnings: { seat: number; amount: number; handName: string | null }[];
  myHandName: string | null;
  matchWinner: number | null;
  counter: number;
}

const ids = (n: number) => Array.from({ length: n }, (_, i) => i);

function shuffle(a: string[]): string[] {
  const d = a.slice();
  for (let i = d.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [d[i], d[j]] = [d[j], d[i]];
  }
  return d;
}

const inHand = (s: PokerState) => ids(s.seats.length).filter((i) => !s.out[i] && !s.folded[i]);
const able = (s: PokerState) => inHand(s).filter((i) => !s.allIn[i]);
/** Esse jogador ainda precisa agir nesta rodada de apostas? */
const needsAction = (s: PokerState, i: number) => {
  if (s.out[i] || s.folded[i] || s.allIn[i]) return false;
  if (s.bets[i] < s.currentBet) return true; // deve pagar
  return !s.acted[i] && able(s).length >= 2; // sozinho contra all-ins não há o que apostar
};

/** Próximo lugar depois de `from` (sentido horário) que cumpre o teste. -1 se ninguém. */
function after(s: PokerState, from: number, test: (i: number) => boolean): number {
  const n = s.seats.length;
  for (let k = 1; k <= n; k++) {
    const i = (from + k) % n;
    if (test(i)) return i;
  }
  return -1;
}

function put(s: PokerState, i: number, amount: number): PokerState {
  const amt = Math.max(0, Math.min(amount, s.stacks[i]));
  const stacks = s.stacks.slice();
  const bets = s.bets.slice();
  const totals = s.totals.slice();
  const allIn = s.allIn.slice();
  stacks[i] -= amt;
  bets[i] += amt;
  totals[i] += amt;
  if (stacks[i] === 0) allIn[i] = true;
  return { ...s, stacks, bets, totals, allIn };
}

function setLast(s: PokerState, i: number, text: string | null): PokerState {
  const lastAction = s.lastAction.slice();
  lastAction[i] = text;
  return { ...s, lastAction };
}

// ---------------------------------------------------------------- fluxo da mão
function startHand(s: PokerState): PokerState {
  const n = s.seats.length;
  const out = s.stacks.map((x) => x <= 0);
  const alive = ids(n).filter((i) => !out[i]);
  if (alive.length < 2) {
    return { ...s, out, phase: 'matchDone', matchWinner: alive[0] ?? 0, message: 'Fim de jogo!', counter: s.counter + 1 };
  }
  const level = Math.min(4, Math.floor(s.handNo / HANDS_PER_LEVEL));
  const sb = 10 * 2 ** level;
  const bb = sb * 2;
  let st: PokerState = {
    ...s,
    out,
    sb,
    bb,
    handNo: s.handNo + 1,
    street: 'preflop',
    board: [],
    deck: shuffle(DECK_IDS),
    hands: ids(n).map(() => []),
    bets: ids(n).map(() => 0),
    totals: ids(n).map(() => 0),
    folded: out.slice(),
    allIn: ids(n).map(() => false),
    acted: ids(n).map(() => false),
    lastAction: ids(n).map(() => null),
    reveal: ids(n).map(() => false),
    winnings: [],
    currentBet: 0,
    minRaise: bb
  };
  // quem joga esta mão: folded começa true para quem está fora, false para os demais
  st.folded = out.slice();
  const dealer = after({ ...st }, s.dealer, (i) => !out[i]);
  st.dealer = dealer;
  const deck = st.deck.slice();
  st.hands = ids(n).map((i) => (out[i] ? [] : [deck.pop()!, deck.pop()!]));
  st.deck = deck;

  const headsUp = alive.length === 2;
  const sbSeat = headsUp ? dealer : after(st, dealer, (i) => !out[i]);
  const bbSeat = after(st, sbSeat, (i) => !out[i]);
  st = put(st, sbSeat, sb);
  st = put(st, bbSeat, bb);
  st.currentBet = Math.max(st.bets[sbSeat], st.bets[bbSeat]);
  st = setLast(st, sbSeat, `Small blind ${st.bets[sbSeat]}`);
  st = setLast(st, bbSeat, `Big blind ${st.bets[bbSeat]}`);
  st.message = `Mão ${st.handNo}. Blinds ${sb}/${bb}.`;
  st.counter = s.counter + 1;

  if (ids(n).some((i) => needsAction(st, i))) {
    st.phase = 'betting';
    const first = headsUp ? sbSeat : after(st, bbSeat, (i) => !st.folded[i] && !st.allIn[i]);
    st.toAct = needsAction(st, first) ? first : after(st, first, (i) => needsAction(st, i));
    return st;
  }
  // todos (ou todos menos um) já estão all-in pelos blinds
  return afterBetting(st);
}

export function awardPots(s: PokerState, showdown: boolean): PokerState {
  const n = s.seats.length;
  const stacks = s.stacks.slice();
  const winnings: Record<number, { amount: number; name: string | null }> = {};
  const live = inHand(s);
  const best: Record<number, BestHand> = {};
  if (showdown) live.forEach((i) => (best[i] = bestHand([...s.hands[i], ...s.board])));

  // potes (principal e laterais)
  const levels = Array.from(new Set(s.totals.filter((t) => t > 0))).sort((a, b) => a - b);
  let prev = 0;
  const pots: { amount: number; eligible: number[] }[] = [];
  for (const lvl of levels) {
    const contributors = ids(n).filter((i) => s.totals[i] >= lvl);
    const amount = (lvl - prev) * contributors.length;
    const eligible = contributors.filter((i) => !s.folded[i]);
    if (eligible.length === 0 && pots.length) pots[pots.length - 1].amount += amount;
    else pots.push({ amount, eligible });
    prev = lvl;
  }
  pots.forEach((pot) => {
    if (pot.amount <= 0 || pot.eligible.length === 0) return;
    let winners = pot.eligible;
    if (showdown && winners.length > 1) {
      const top = Math.max(...winners.map((i) => best[i].score));
      winners = winners.filter((i) => best[i].score === top);
    }
    const share = Math.floor(pot.amount / winners.length);
    let rest = pot.amount - share * winners.length;
    // fichas que sobram: para quem está mais perto do botão
    const order: number[] = [];
    for (let k = 1; k <= n; k++) {
      const i = (s.dealer + k) % n;
      if (winners.includes(i)) order.push(i);
    }
    order.forEach((i) => {
      const extra = rest > 0 ? 1 : 0;
      rest -= extra;
      stacks[i] += share + extra;
      winnings[i] = {
        amount: (winnings[i]?.amount || 0) + share + extra,
        name: showdown ? best[i].name : null
      };
    });
  });

  const reveal = s.reveal.slice();
  if (showdown) live.forEach((i) => (reveal[i] = true));
  const list = Object.entries(winnings).map(([seat, w]) => ({ seat: Number(seat), amount: w.amount, handName: w.name }));
  const names = list.map((w) => s.seats[w.seat].name).join(' e ');
  const remaining = ids(n).filter((i) => stacks[i] > 0);
  const over = remaining.length <= 1;
  return {
    ...s,
    stacks,
    totals: ids(n).map(() => 0),
    bets: ids(n).map(() => 0),
    reveal,
    winnings: list,
    phase: over ? 'matchDone' : 'handDone',
    matchWinner: over ? remaining[0] ?? list[0]?.seat ?? 0 : null,
    toAct: -1,
    message: showdown
      ? `${names} ganhou${list.length > 1 ? 'ram' : ''} ${list.reduce((a, w) => a + w.amount, 0)} fichas${list.length === 1 && list[0].handName ? ` com ${list[0].handName}` : ''}.`
      : `${names} levou o pote (todos desistiram).`,
    counter: s.counter + 1
  };
}

/** Rodada de apostas acabou (ou ninguém pode agir): próxima rua, runout ou showdown. */
function afterBetting(s: PokerState): PokerState {
  const contenders = inHand(s);
  if (contenders.length === 1) return awardPots(s, false);
  if (s.street === 'river') return awardPots(s, true);
  return advanceStreet(s);
}

function advanceStreet(s: PokerState): PokerState {
  const n = s.seats.length;
  const deck = s.deck.slice();
  const board = s.board.slice();
  let street: Street = s.street;
  if (s.street === 'preflop') {
    board.push(deck.pop()!, deck.pop()!, deck.pop()!);
    street = 'flop';
  } else if (s.street === 'flop') {
    board.push(deck.pop()!);
    street = 'turn';
  } else {
    board.push(deck.pop()!);
    street = 'river';
  }
  let st: PokerState = {
    ...s,
    deck,
    board,
    street,
    bets: ids(n).map(() => 0),
    acted: ids(n).map(() => false),
    currentBet: 0,
    minRaise: s.bb,
    lastAction: s.lastAction.map(() => null),
    counter: s.counter + 1
  };
  if (able(st).length >= 2) {
    st.phase = 'betting';
    st.toAct = after(st, st.dealer, (i) => !st.folded[i] && !st.allIn[i]);
    st.message = street === 'flop' ? 'Flop!' : street === 'turn' ? 'Turn!' : 'River!';
  } else {
    st.phase = 'runout';
    st.toAct = -1;
    st.message = 'Todos all-in! Abrindo as cartas...';
  }
  return st;
}

function afterAction(s: PokerState, actor: number): PokerState {
  if (inHand(s).length === 1) return awardPots(s, false);
  const n = s.seats.length;
  if (ids(n).some((i) => needsAction(s, i))) {
    return { ...s, toAct: after(s, actor, (i) => needsAction(s, i)), counter: s.counter + 1 };
  }
  return afterBetting(s);
}

// ---------------------------------------------------------------- motor
export const pokerEngine: OnlineEngine<PokerState, PokerAction, PokerView> = {
  buildSeats(humans) {
    const total = Math.min(6, Math.max(4, humans.length));
    return fillSeats(humans, total);
  },

  init(seats) {
    const n = seats.length;
    return {
      seats,
      phase: 'idle',
      street: 'preflop',
      stacks: ids(n).map(() => START_STACK),
      hands: ids(n).map(() => []),
      board: [],
      deck: [],
      dealer: n - 1,
      bets: ids(n).map(() => 0),
      totals: ids(n).map(() => 0),
      folded: ids(n).map(() => false),
      allIn: ids(n).map(() => false),
      out: ids(n).map(() => false),
      acted: ids(n).map(() => false),
      toAct: -1,
      currentBet: 0,
      minRaise: 20,
      sb: 10,
      bb: 20,
      handNo: 0,
      lastAction: ids(n).map(() => null),
      reveal: ids(n).map(() => false),
      winnings: [],
      matchWinner: null,
      message: 'Embaralhando...',
      counter: 0
    };
  },

  reduce(s, a, seat) {
    switch (a.type) {
      case 'leave': {
        const st = s.seats[seat];
        if (!st || !st.human) return s;
        return {
          ...s,
          seats: s.seats.map((x, i) => (i === seat ? turnIntoAI(x) : x)),
          message: `${st.name} saiu. Uma IA assumiu o lugar.`,
          counter: s.counter + 1
        };
      }
      case 'sys_deal':
        if (s.phase !== 'idle' && s.phase !== 'handDone') return s;
        return startHand(s);
      case 'sys_next':
        if (s.phase !== 'runout') return s;
        return s.street === 'river' ? awardPots(s, true) : advanceStreet(s);
      case 'rematch': {
        if (seat !== 0 || s.phase !== 'matchDone') return s;
        return pokerEngine.init(s.seats);
      }
      case 'fold': {
        if (s.phase !== 'betting' || s.toAct !== seat) return s;
        let st: PokerState = { ...s, folded: s.folded.map((f, i) => (i === seat ? true : f)) };
        st = setLast(st, seat, 'Desistiu');
        return afterAction(st, seat);
      }
      case 'check': {
        if (s.phase !== 'betting' || s.toAct !== seat || s.bets[seat] < s.currentBet) return s;
        let st: PokerState = { ...s, acted: s.acted.map((x, i) => (i === seat ? true : x)) };
        st = setLast(st, seat, 'Passou');
        return afterAction(st, seat);
      }
      case 'call': {
        if (s.phase !== 'betting' || s.toAct !== seat) return s;
        const need = s.currentBet - s.bets[seat];
        if (need <= 0) return s;
        let st = put(s, seat, need);
        st = { ...st, acted: st.acted.map((x, i) => (i === seat ? true : x)) };
        st = setLast(st, seat, st.allIn[seat] ? `All-in ${st.bets[seat]}` : `Pagou ${need}`);
        return afterAction(st, seat);
      }
      case 'raise': {
        if (s.phase !== 'betting' || s.toAct !== seat) return s;
        const maxTo = s.bets[seat] + s.stacks[seat];
        const to = Math.floor(Number(a.to));
        if (!Number.isFinite(to) || to <= s.currentBet || to > maxTo) return s;
        if (able(s).filter((i) => i !== seat).length < 1) return s; // ninguém pode responder
        const size = to - s.currentBet;
        const isAllIn = to === maxTo;
        if (size < s.minRaise && !isAllIn) return s;
        let st = put(s, seat, to - s.bets[seat]);
        const full = size >= s.minRaise;
        const acted = st.acted.map((x, i) => (i === seat ? true : full ? false : x));
        acted[seat] = true;
        st = { ...st, acted, currentBet: to, minRaise: full ? size : s.minRaise };
        st = setLast(st, seat, st.allIn[seat] ? `All-in ${to}` : s.currentBet === 0 ? `Apostou ${to}` : `Aumentou para ${to}`);
        return afterAction(st, seat);
      }
      default:
        return s;
    }
  },

  view(s, seat): PokerView {
    const my = seat;
    const myTurn = s.phase === 'betting' && s.toAct === my && !!s.seats[my]?.human;
    const toCall = Math.max(0, s.currentBet - (s.bets[my] ?? 0));
    const maxRaiseTo = (s.bets[my] ?? 0) + (s.stacks[my] ?? 0);
    const others = able(s).filter((i) => i !== my).length;
    const canRaise = myTurn && maxRaiseTo > s.currentBet && others >= 1;
    const minRaiseTo = Math.min(maxRaiseTo, s.currentBet + s.minRaise);
    const myHole = s.hands[my] || [];
    const myHandName =
      myHole.length === 2 && !s.folded[my] && s.board.length >= 3 ? bestHand([...myHole, ...s.board]).name : null;
    return {
      mySeat: my,
      phase: s.phase,
      street: s.street,
      seats: s.seats.map((x, i) => ({
        name: x.name,
        human: x.human,
        stack: s.stacks[i],
        bet: s.bets[i],
        folded: s.folded[i],
        allIn: s.allIn[i],
        out: s.out[i],
        dealer: s.dealer === i && s.handNo > 0,
        cards: s.hands[i].length,
        hole: s.reveal[i] ? s.hands[i] : null,
        lastAction: s.lastAction[i],
        turn: s.phase === 'betting' && s.toAct === i
      })),
      myHole,
      board: s.board,
      pot: s.totals.reduce((a, b) => a + b, 0),
      currentBet: s.currentBet,
      toCall,
      myTurn,
      canCheck: myTurn && toCall === 0,
      canRaise,
      minRaiseTo,
      maxRaiseTo,
      sb: s.sb,
      bb: s.bb,
      handNo: s.handNo,
      message: s.message,
      winnings: s.winnings,
      myHandName,
      matchWinner: s.matchWinner,
      counter: s.counter
    };
  },

  next(s): Step<PokerAction> | null {
    if (s.phase === 'matchDone') return null;
    if (s.phase === 'idle') return { seat: 0, action: { type: 'sys_deal' }, delay: 1000 };
    if (s.phase === 'handDone') return { seat: 0, action: { type: 'sys_deal' }, delay: 5200 };
    if (s.phase === 'runout') return { seat: 0, action: { type: 'sys_next' }, delay: 1500 };
    if (s.phase === 'betting') {
      const seat = s.toAct;
      if (seat < 0 || s.seats[seat].human) return null;
      return { seat, action: aiDecide(s, seat), delay: 900 + Math.floor(Math.random() * 900) };
    }
    return null;
  }
};

// ---------------------------------------------------------------- IA
function preflopStrength(h: string[]): number {
  const [a, b] = h.map(rankNum).sort((x, y) => y - x);
  const suited = INFO[h[0]].suitCode === INFO[h[1]].suitCode;
  if (a === b) return 0.5 + (0.5 * (a - 2)) / 12;
  return Math.min(
    0.85,
    ((a - 2) / 12) * 0.45 + ((b - 2) / 12) * 0.25 + (suited ? 0.07 : 0) + (a - b <= 2 ? 0.04 : 0)
  );
}

function strengthOf(s: PokerState, seat: number): number {
  const hole = s.hands[seat];
  if (s.board.length < 3) return preflopStrength(hole);
  const bh = bestHand([...hole, ...s.board]);
  const base = [0.12, 0.36, 0.62, 0.72, 0.8, 0.85, 0.93, 0.98, 0.99, 1][bh.category];
  // par só da mesa não conta como mão forte
  if (bh.category <= 1 && !hole.some((c) => s.board.some((b) => rankNum(b) === rankNum(c)))) {
    const hi = Math.max(...hole.map(rankNum));
    return 0.1 + hi / 100;
  }
  return base;
}

function aiDecide(s: PokerState, seat: number): PokerAction {
  const strength = strengthOf(s, seat);
  const toCall = s.currentBet - s.bets[seat];
  const stack = s.stacks[seat];
  const pot = s.totals.reduce((a, b) => a + b, 0);
  const maxTo = s.bets[seat] + stack;
  const othersCanAct = able(s).filter((i) => i !== seat).length >= 1;

  const raiseTo = (frac: number): PokerAction | null => {
    if (!othersCanAct || maxTo <= s.currentBet) return null;
    const want = s.currentBet + Math.max(s.minRaise, Math.round((pot * frac) / s.bb) * s.bb);
    const to = Math.min(maxTo, want);
    if (to <= s.currentBet) return null;
    if (to - s.currentBet < s.minRaise && to !== maxTo) return null;
    return { type: 'raise', to };
  };

  const r = Math.random();
  if (toCall <= 0) {
    if (strength >= 0.7 && r < 0.7) return raiseTo(0.6) ?? { type: 'check' };
    if (strength >= 0.45 && r < 0.35) return raiseTo(0.4) ?? { type: 'check' };
    if (r < 0.06) return raiseTo(0.5) ?? { type: 'check' };
    return { type: 'check' };
  }
  const costFrac = toCall / Math.max(1, stack);
  if (strength >= 0.85) return (r < 0.6 ? raiseTo(0.8) : null) ?? { type: 'call' };
  if (strength >= 0.65) return (r < 0.3 ? raiseTo(0.6) : null) ?? { type: 'call' };
  if (strength >= 0.4) return costFrac <= 0.25 || r < 0.25 ? { type: 'call' } : { type: 'fold' };
  if (toCall <= s.bb && r < 0.45) return { type: 'call' };
  return r < 0.05 ? { type: 'call' } : { type: 'fold' };
}
