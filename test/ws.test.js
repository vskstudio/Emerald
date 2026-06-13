// Test de wsExtract sur des payloads type provider live
const { JSDOM } = require('jsdom');
const fs = require('fs');
const path = require('path');

const dom = new JSDOM('<body></body>');
global.window = dom.window;
global.document = dom.window.document;
global.NodeFilter = dom.window.NodeFilter;
global.MutationObserver = dom.window.MutationObserver;
global.location = { hostname: 'duel.com', href: 'https://duel.com/game' };

eval(fs.readFileSync(path.join(__dirname, '../src/detector.js'), 'utf8'));

// On capture les résultats émis par le listener WS du détecteur
const results = [];
window.__emeraldDetector.start(r => results.push(r));

function feed(payload) {
  // simule le sniffer (e.source === window obligatoire)
  dom.window.postMessage({ __emeraldWS: { url: 'wss://live.example/ws', data: JSON.stringify(payload) } }, '*');
}

// Style Evolution : cartes en chaînes "QH", "10S"
feed({
  type: 'blackjack.state',
  dealer: { cards: ['QH'], score: 10 },
  seats: {
    s1: { hand: { cards: ['10S', '6D'], score: 16 } },
    s2: { hand: { cards: ['AS', '7C'], score: 18 } },
    s3: { hand: { cards: ['KH', 'KD'], score: 20 } },
  },
});

// Style objets {rank, suit}
feed({
  game: {
    dealerHand: { cards: [{ rank: 'A', suit: 'h' }] },
    players: [{ cards: [{ rank: '8', suit: 's' }, { rank: '8', suit: 'd' }], total: 16 }],
  },
});

// Message sans cartes -> ignoré
feed({ type: 'chat', message: 'dealer says hi, total nonsense 21' });

setTimeout(() => {
  const checks = [
    ['2 états extraits', results.length === 2],
    ['payload 1 : croupier Q', results[0]?.dealer[0] === 'Q'],
    ['payload 1 : 3 mains', results[0]?.hands.length === 3],
    ['payload 1 : main 1 = 10,6', JSON.stringify(results[0]?.hands[0]) === '["10","6"]'],
    ['payload 2 : croupier A', results[1]?.dealer[0] === 'A'],
    ['payload 2 : paire 8,8', JSON.stringify(results[1]?.hands[0]) === '["8","8"]'],
  ];
  let fail = 0;
  for (const [name, ok] of checks) {
    console.log((ok ? 'OK   ' : 'FAIL ') + name);
    if (!ok) fail++;
  }
  console.log('Résultats :', JSON.stringify(results));
  process.exit(fail ? 1 : 0);
}, 50);
