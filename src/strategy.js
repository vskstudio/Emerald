// Emerald — Moteur de stratégie Blackjack
// Encodage exact du tableau "Stratégie Blackjack" (T=Tirer, D=Doubler, R=Rester, P=Partager)
// Colonnes croupier : 2,3,4,5,6,7,8,9,10,A

const DEALER_COLS = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'A'];

// Totaux durs (joueur 5 à 17+)
const HARD = {
  17: ['R','R','R','R','R','R','R','R','R','R'],
  16: ['R','R','R','R','T','T','T','T','T','T'],
  15: ['R','R','R','R','T','T','T','T','T','T'],
  14: ['R','R','R','R','T','T','T','T','T','T'],
  13: ['R','R','R','R','T','T','T','T','T','T'],
  12: ['T','T','R','R','T','T','T','T','T','T'],
  11: ['D','D','D','D','D','D','D','T','T','T'],
  10: ['D','D','D','D','D','D','D','T','T','T'],
  9:  ['T','D','D','D','D','T','T','T','T','T'],
  8:  ['T','T','T','T','T','T','T','T','T','T'],
  7:  ['T','T','T','T','T','T','T','T','T','T'],
  6:  ['T','T','T','T','T','T','T','T','T','T'],
  5:  ['T','T','T','T','T','T','T','T','T','T'],
};

// Paires (clé = valeur d'une carte de la paire)
const PAIRS = {
  'A':  ['P','P','P','P','P','P','P','P','P','P'],
  '10': ['R','R','R','R','R','R','R','R','R','R'],
  '9':  ['P','P','P','P','P','P','P','P','P','P'],
  '8':  ['P','P','P','P','P','P','P','P','P','P'],
  '7':  ['P','P','P','P','P','P','P','P','P','P'],
  '6':  ['P','P','P','P','P','T','T','T','T','T'],
  '5':  ['D','D','D','D','D','D','D','T','T','T'],
  '4':  ['T','T','T','T','P','T','T','T','T','T'],
  '3':  ['P','P','P','P','P','T','T','T','T','T'],
  '2':  ['P','P','P','P','P','T','T','T','T','T'],
};

// Mains souples (A + carte)
const SOFT = {
  10: ['R','R','R','R','R','R','R','R','R','R'], // A-10 (Blackjack)
  9:  ['R','R','R','R','R','R','R','R','R','R'], // A-9
  8:  ['R','R','R','R','R','R','R','R','R','R'], // A-8
  7:  ['D','D','D','D','D','R','T','T','T','T'], // A-7
  6:  ['T','D','D','D','D','T','T','T','T','T'], // A-6
  5:  ['T','D','D','D','D','T','T','T','T','T'], // A-5
  4:  ['T','D','D','D','D','T','T','T','T','T'], // A-4
  3:  ['T','T','T','D','D','T','T','T','T','T'], // A-3
  2:  ['T','T','T','D','D','T','T','T','T','T'], // A-2
};

const ACTION_LABELS = {
  T: { label: 'TIRER', en: 'Hit', color: '#2e9e4f' },
  D: { label: 'DOUBLER', en: 'Double', color: '#2b5fb8' },
  R: { label: 'RESTER', en: 'Stay', color: '#d0392e' },
  P: { label: 'PARTAGER', en: 'Split', color: '#8a8f98' },
};

// Valeur numérique d'une carte ('2'..'10','J','Q','K','A')
function cardValue(card) {
  if (card === 'A') return 11;
  if (card === 'J' || card === 'Q' || card === 'K') return 10;
  return parseInt(card, 10);
}

// Normalise figures -> '10' pour l'indexation du tableau
function rankKey(card) {
  return (card === 'J' || card === 'Q' || card === 'K') ? '10' : card;
}

// Évalue une main : { total, soft, pair, blackjack, bust }
function evaluateHand(cards) {
  let total = 0, aces = 0;
  for (const c of cards) {
    total += cardValue(c);
    if (c === 'A') aces++;
  }
  while (total > 21 && aces > 0) { total -= 10; aces--; }
  const soft = aces > 0;
  const pair = cards.length === 2 && rankKey(cards[0]) === rankKey(cards[1]);
  const blackjack = cards.length === 2 && total === 21;
  return { total, soft, pair, blackjack, bust: total > 21 };
}

// Décision selon le tableau. dealerCard: '2'..'10' ou 'A' (figures normalisées)
function decide(cards, dealerCard) {
  const dealerIdx = DEALER_COLS.indexOf(rankKey(dealerCard));
  if (dealerIdx === -1 || cards.length < 2) return null;
  const hand = evaluateHand(cards);
  if (hand.bust) return { code: 'BUST', hand };
  if (hand.blackjack) return { code: 'BJ', hand };

  let code;
  if (hand.pair) {
    code = PAIRS[rankKey(cards[0])][dealerIdx];
  } else if (hand.soft && hand.total < 21 && cards.length >= 2) {
    const other = hand.total - 11; // valeur à côté de l'As
    if (other >= 2 && other <= 10 && SOFT[other]) {
      code = SOFT[other][dealerIdx];
    }
  }
  if (!code) {
    const t = Math.min(Math.max(hand.total, 5), 17);
    code = HARD[t][dealerIdx];
  }
  // Doubler impossible après 2 cartes -> Tirer (sauf soft 18 A-7 vs 2-6 -> Rester serait débattu; on suit D->T, D soft->T)
  if (code === 'D' && cards.length > 2) code = 'T';
  return { code, hand };
}

// Décision à partir d'un simple total (mode live : on ne voit que les totaux).
// softLow = affichage type "1/11" (As compté 1 ou 11).
function decideFromTotal(total, soft, dealerCard) {
  const dealerIdx = DEALER_COLS.indexOf(rankKey(dealerCard));
  if (dealerIdx === -1 || !total) return null;
  if (total > 21) return { code: 'BUST', hand: { total, soft } };
  if (total === 21) return { code: 'R', hand: { total, soft } };
  let code;
  if (soft) {
    const other = total - 11;
    if (other >= 2 && other <= 10 && SOFT[other]) code = SOFT[other][dealerIdx];
  }
  if (!code) {
    const t = Math.min(Math.max(total, 5), 17);
    code = HARD[t][dealerIdx];
  }
  return { code, hand: { total, soft } };
}

// --- Probabilités (modèle deck infini : chaque rang 1/13, le 10 compte 4/13) ---
const RANK_PROBS = [
  ['A', 1 / 13], ['2', 1 / 13], ['3', 1 / 13], ['4', 1 / 13], ['5', 1 / 13],
  ['6', 1 / 13], ['7', 1 / 13], ['8', 1 / 13], ['9', 1 / 13], ['10', 4 / 13],
];

// Distribution finale du croupier (tire jusqu'à 17, soft 17 reste) : {17,18,19,20,21,BJ,bust}
const dealerCache = {};
function dealerOutcomes(upcard) {
  const key = rankKey(upcard);
  if (dealerCache[key]) return dealerCache[key];
  const dist = { 17: 0, 18: 0, 19: 0, 20: 0, 21: 0, BJ: 0, bust: 0 };

  function recurse(total, soft, nCards, p) {
    if (total > 21) {
      if (soft) { recurse(total - 10, false, nCards, p); return; }
      dist.bust += p; return;
    }
    if (total >= 17) {
      if (total === 21 && nCards === 2) dist.BJ += p;
      else dist[total] += p;
      return;
    }
    for (const [r, rp] of RANK_PROBS) {
      const v = r === 'A' ? 11 : (r === '10' ? 10 : parseInt(r, 10));
      recurse(total + v, soft || r === 'A', nCards + 1, p * rp);
    }
  }
  const up = key === 'A' ? 11 : (key === '10' ? 10 : parseInt(key, 10));
  recurse(up, key === 'A', 1, 1);
  dealerCache[key] = dist;
  return dist;
}

// Probabilité de sauter si le joueur tire une carte
function playerBustOnHit(cards) {
  const { total, soft } = Array.isArray(cards) ? evaluateHand(cards) : cards;
  if (total >= 21) return 1;
  let bust = 0;
  for (const [r, rp] of RANK_PROBS) {
    const v = r === 'A' ? 11 : (r === '10' ? 10 : parseInt(r, 10));
    let t = total + v, isSoft = soft || r === 'A';
    while (t > 21 && isSoft) { t -= 10; isSoft = false; }
    if (t > 21) bust += rp;
  }
  return bust;
}

// Probabilité de gagner en restant (le croupier doit sauter ou finir sous notre total)
function standOutcome(cards, dealerCard) {
  const { total } = Array.isArray(cards) ? evaluateHand(cards) : cards;
  const d = dealerOutcomes(dealerCard);
  let win = d.bust, push = 0, lose = d.BJ;
  for (const t of [17, 18, 19, 20, 21]) {
    if (total > t) win += d[t];
    else if (total === t) push += d[t];
    else lose += d[t];
  }
  if (total === 21) { /* BJ géré côté décision */ }
  return { win, push, lose };
}

const EmeraldStrategy = {
  DEALER_COLS, ACTION_LABELS, cardValue, rankKey, evaluateHand,
  decide, decideFromTotal, dealerOutcomes, playerBustOnHit, standOutcome,
};
if (typeof window !== 'undefined') window.EmeraldStrategy = EmeraldStrategy;
