/**
 * Motor do Blackjack (21) para 1 a 5 jogadores contra a banca. Só funções puras.
 * Cada jogador começa com 1000 fichas. Blackjack paga 3:2, banca para no 17.
 */
import rawCards from '../../cards_data.json';
import { type OnlineEngine, type Seat, type Step } from '../engine';

const CARDS = (rawCards as any[]).filter((c) => c.suitCode !== 'X');
const DECK_IDS: string[] = CARDS.map((c) => c.id);
const INFO: Record<string, any> = Object.fromEntries(CARDS.map((c) => [c.id, c]));
const START_STACK = 1000;
export const MIN_BET = 10;

export type BjPhase = 'betting' | 'playing' | 'dealer' | 'settled' | 'matchDone';
export type BjResult = 'blackjack' | 'win' | 'push' | 'lose' | 'bust' | 'left';

export function handTotal(hand: string[]): { total: number; soft: boolean } {
  let total = 0;
  let aces = 0;
  for (const id of hand) {
    const r = INFO[id].rank;
    if (r === 'A') {
      aces++;
      total += 11;
    } else if (r === 'K' || r === 'Q' || r === 'J' || r === '10') total += 10;
    else total += parseInt(r, 10);
  }
  while (total > 21 && aces > 0) {
    total -= 10;
    aces--;
  }
  return { total, soft: aces > 0 };
}
const isBlackjack = (h: string[]) => h.length === 2 && handTotal(h).total === 21;

export interface BjState {
  seats: Seat[];
  phase: BjPhase;
  stacks: number[];
  bets: number[];
  ready: boolean[]; // já apostou nesta rodada
  hands: string[][];
  dealer: string[];
  dealerHidden: boolean;
  done: boolean[];
  gone: boolean[]; // saiu da sala
  results: (BjResult | null)[];
  payouts: number[]; // quanto cada um ganhou/perdeu na rodada (líquido)
  turn: number;
  deck: string[];
  round: number;
  matchWinner: number | null; // sem uso: o jogo termina quando todos quebram
  message: string;
  counter: number;
}

export type BjAction =
  | { type: 'bet'; amount: number }
  | { type: 'hit' }
  | { type: 'stand' }
  | { type: 'double' }
  | { type: 'rematch' }
  | { type: 'leave' }
  | { type: 'sys_dealer' }
  | { type: 'sys_round' };

export interface BjView {
  mySeat: number;
  phase: BjPhase;
  seats: {
    name: string;
    human: boolean;
    stack: number;
    bet: number;
    ready: boolean;
    hand: string[];
    total: number;
    soft: boolean;
    done: boolean;
    gone: boolean;
    result: BjResult | null;
    payout: number;
    turn: boolean;
    broke: boolean;
  }[];
  dealer: (string | null)[];
  dealerTotal: number | null;
  myTurn: boolean;
  canDouble: boolean;
  canBet: boolean;
  maxBet: number;
  message: string;
  round: number;
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

const playersIn = (s: BjState) => ids(s.seats.length).filter((i) => s.ready[i] && !s.gone[i]);

function newRound(s: BjState): BjState {
  const n = s.seats.length;
  const alive = ids(n).filter((i) => !s.gone[i] && s.stacks[i] >= MIN_BET);
  if (alive.length === 0) {
    return { ...s, phase: 'matchDone', message: 'Ninguém tem fichas para continuar.', counter: s.counter + 1 };
  }
  return {
    ...s,
    phase: 'betting',
    round: s.round + 1,
    bets: ids(n).map(() => 0),
    ready: ids(n).map(() => false),
    hands: ids(n).map(() => []),
    dealer: [],
    dealerHidden: true,
    done: ids(n).map(() => false),
    results: ids(n).map(() => null),
    payouts: ids(n).map(() => 0),
    turn: -1,
    message: 'Façam suas apostas!',
    counter: s.counter + 1
  };
}

function settle(s: BjState): BjState {
  const dealerT = handTotal(s.dealer).total;
  const dealerBJ = isBlackjack(s.dealer);
  const stacks = s.stacks.slice();
  const results = s.results.slice();
  const payouts = s.payouts.slice();
  for (const i of playersIn(s)) {
    if (results[i] === 'left') continue;
    const h = s.hands[i];
    const t = handTotal(h).total;
    let res: BjResult;
    let back = 0; // fichas devolvidas
    if (t > 21) res = 'bust';
    else if (isBlackjack(h) && !dealerBJ) {
      res = 'blackjack';
      back = Math.floor(s.bets[i] * 2.5);
    } else if (dealerBJ && !isBlackjack(h)) res = 'lose';
    else if (isBlackjack(h) && dealerBJ) {
      res = 'push';
      back = s.bets[i];
    } else if (dealerT > 21 || t > dealerT) {
      res = 'win';
      back = s.bets[i] * 2;
    } else if (t === dealerT) {
      res = 'push';
      back = s.bets[i];
    } else res = 'lose';
    stacks[i] += back;
    results[i] = res;
    payouts[i] = back - s.bets[i];
  }
  return {
    ...s,
    stacks,
    results,
    payouts,
    dealerHidden: false,
    phase: 'settled',
    turn: -1,
    message: dealerT > 21 ? `A banca estourou com ${dealerT}!` : `A banca fechou com ${dealerT}.`,
    counter: s.counter + 1
  };
}

function toDealer(s: BjState): BjState {
  // se ninguém está "vivo" (todos estouraram/saíram), a banca nem precisa comprar
  return { ...s, phase: 'dealer', turn: -1, message: 'Vez da banca...', counter: s.counter + 1 };
}

function nextPlayer(s: BjState, from: number): BjState {
  const n = s.seats.length;
  for (let k = 1; k <= n; k++) {
    const i = from + k;
    if (i >= n) break;
    if (s.ready[i] && !s.done[i] && !s.gone[i]) {
      return { ...s, turn: i, message: `Vez de ${s.seats[i].name}.`, counter: s.counter + 1 };
    }
  }
  return toDealer(s);
}

function dealRound(s: BjState): BjState {
  const n = s.seats.length;
  const deck = shuffle(DECK_IDS);
  const hands = ids(n).map((i) => (s.ready[i] ? [deck.pop()!, deck.pop()!] : []));
  const dealer = [deck.pop()!, deck.pop()!];
  const done = ids(n).map((i) => (s.ready[i] ? isBlackjack(hands[i]) : true));
  let st: BjState = { ...s, deck, hands, dealer, dealerHidden: true, done, phase: 'playing', counter: s.counter + 1 };
  const up = INFO[dealer[0]].rank;
  const peek = (up === 'A' || ['10', 'J', 'Q', 'K'].includes(up)) && isBlackjack(dealer);
  if (peek) return settle({ ...st, message: 'A banca tem Blackjack!' });
  return nextPlayer({ ...st, turn: -1 }, -1);
}

export const blackjackEngine: OnlineEngine<BjState, BjAction, BjView> = {
  buildSeats(humans) {
    const list = humans.slice(0, 5);
    return list.map((h) => ({ playerId: h.id, name: h.name, human: true }));
  },

  init(seats) {
    const n = seats.length;
    return newRound({
      seats,
      phase: 'betting',
      stacks: ids(n).map(() => START_STACK),
      bets: [],
      ready: [],
      hands: [],
      dealer: [],
      dealerHidden: true,
      done: [],
      gone: ids(n).map(() => false),
      results: [],
      payouts: [],
      turn: -1,
      deck: [],
      round: 0,
      matchWinner: null,
      message: '',
      counter: 0
    });
  },

  reduce(s, a, seat) {
    const n = s.seats.length;
    switch (a.type) {
      case 'leave': {
        const st = s.seats[seat];
        if (!st || s.gone[seat]) return s;
        const gone = s.gone.map((g, i) => (i === seat ? true : g));
        let nx: BjState = { ...s, gone, message: `${st.name} saiu da mesa.`, counter: s.counter + 1 };
        if (s.phase === 'betting') {
          const ready = nx.ready.map((r, i) => (i === seat ? false : r));
          nx = { ...nx, ready };
          const waiting = ids(n).filter((i) => !gone[i] && s.stacks[i] >= MIN_BET && !ready[i]);
          if (waiting.length === 0 && ready.some(Boolean)) return dealRound(nx);
          if (ids(n).every((i) => gone[i])) return nx;
          return nx;
        }
        if (s.phase === 'playing' && s.ready[seat] && !s.done[seat]) {
          const done = nx.done.map((d, i) => (i === seat ? true : d));
          const results = nx.results.map((r, i) => (i === seat ? ('left' as BjResult) : r));
          nx = { ...nx, done, results };
          return s.turn === seat ? nextPlayer(nx, seat) : nx;
        }
        return nx;
      }
      case 'rematch': {
        if (seat !== 0 || s.phase !== 'matchDone') return s;
        return blackjackEngine.init(s.seats.map((x, i) => (s.gone[i] ? { ...x, human: false } : x)));
      }
      case 'bet': {
        if (s.phase !== 'betting' || s.ready[seat] || s.gone[seat]) return s;
        const amount = Math.floor(Number(a.amount));
        if (!Number.isFinite(amount) || amount < MIN_BET || amount > s.stacks[seat]) return s;
        const stacks = s.stacks.map((x, i) => (i === seat ? x - amount : x));
        const bets = s.bets.map((x, i) => (i === seat ? amount : x));
        const ready = s.ready.map((x, i) => (i === seat ? true : x));
        const st: BjState = { ...s, stacks, bets, ready, message: `${s.seats[seat].name} apostou ${amount}.`, counter: s.counter + 1 };
        const waiting = ids(n).filter((i) => !st.gone[i] && st.stacks[i] + st.bets[i] >= MIN_BET && !st.ready[i]);
        return waiting.length === 0 ? dealRound(st) : st;
      }
      case 'hit': {
        if (s.phase !== 'playing' || s.turn !== seat) return s;
        const deck = s.deck.slice();
        const card = deck.pop()!;
        const hands = s.hands.map((h, i) => (i === seat ? [...h, card] : h));
        const t = handTotal(hands[seat]).total;
        let st: BjState = { ...s, deck, hands, counter: s.counter + 1 };
        if (t >= 21) {
          st = { ...st, done: st.done.map((d, i) => (i === seat ? true : d)) };
          return nextPlayer(st, seat);
        }
        return st;
      }
      case 'stand': {
        if (s.phase !== 'playing' || s.turn !== seat) return s;
        const st = { ...s, done: s.done.map((d, i) => (i === seat ? true : d)), counter: s.counter + 1 };
        return nextPlayer(st, seat);
      }
      case 'double': {
        if (s.phase !== 'playing' || s.turn !== seat) return s;
        if (s.hands[seat].length !== 2 || s.stacks[seat] < s.bets[seat]) return s;
        const deck = s.deck.slice();
        const card = deck.pop()!;
        const hands = s.hands.map((h, i) => (i === seat ? [...h, card] : h));
        const stacks = s.stacks.map((x, i) => (i === seat ? x - s.bets[seat] : x));
        const bets = s.bets.map((x, i) => (i === seat ? x * 2 : x));
        const st: BjState = {
          ...s,
          deck,
          hands,
          stacks,
          bets,
          done: s.done.map((d, i) => (i === seat ? true : d)),
          counter: s.counter + 1
        };
        return nextPlayer(st, seat);
      }
      case 'sys_dealer': {
        if (s.phase !== 'dealer') return s;
        // ninguém na disputa (todos estouraram): só revela e fecha
        const contested = playersIn(s).some((i) => s.results[i] !== 'left' && handTotal(s.hands[i]).total <= 21);
        if (s.dealerHidden) return { ...s, dealerHidden: false, counter: s.counter + 1 };
        if (contested && handTotal(s.dealer).total < 17) {
          const deck = s.deck.slice();
          return { ...s, deck, dealer: [...s.dealer, deck.pop()!], counter: s.counter + 1 };
        }
        return settle(s);
      }
      case 'sys_round': {
        if (s.phase !== 'settled') return s;
        return newRound(s);
      }
      default:
        return s;
    }
  },

  view(s, seat): BjView {
    const myTurn = s.phase === 'playing' && s.turn === seat && !s.gone[seat];
    const dealerShown = s.dealerHidden ? [s.dealer[0] ?? null, s.dealer.length > 1 ? null : null] : s.dealer;
    return {
      mySeat: seat,
      phase: s.phase,
      seats: s.seats.map((x, i) => {
        const t = handTotal(s.hands[i] || []);
        return {
          name: x.name,
          human: x.human && !s.gone[i],
          stack: s.stacks[i],
          bet: s.bets[i],
          ready: s.ready[i],
          hand: s.hands[i] || [],
          total: t.total,
          soft: t.soft,
          done: s.done[i],
          gone: s.gone[i],
          result: s.results[i],
          payout: s.payouts[i],
          turn: s.phase === 'playing' && s.turn === i,
          broke: s.stacks[i] < MIN_BET && !s.ready[i]
        };
      }),
      dealer: s.dealer.length ? dealerShown : [],
      dealerTotal: s.dealer.length && !s.dealerHidden ? handTotal(s.dealer).total : null,
      myTurn,
      canDouble: myTurn && (s.hands[seat] || []).length === 2 && s.stacks[seat] >= s.bets[seat],
      canBet: s.phase === 'betting' && !s.ready[seat] && !s.gone[seat] && s.stacks[seat] >= MIN_BET,
      maxBet: s.stacks[seat],
      message: s.message,
      round: s.round,
      counter: s.counter
    };
  },

  next(s): Step<BjAction> | null {
    if (s.phase === 'dealer') return { seat: 0, action: { type: 'sys_dealer' }, delay: 1000 };
    if (s.phase === 'settled') return { seat: 0, action: { type: 'sys_round' }, delay: 5000 };
    return null;
  }
};
