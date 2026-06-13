// Test du détecteur sur un DOM simulé (structure type casino "Originals")
const { JSDOM } = require('jsdom');
const fs = require('fs');
const path = require('path');

const html = `<body>
 <div class="game">
  <div class="dealer-area">
    <div class="card"><span>K</span><span>♠</span></div>
  </div>
  <div class="player-seats">
   <div class="hand" data-testid="player-hand-0">
     <div class="card"><span>10</span><span>♥</span></div>
     <div class="card"><span>6</span><span>♦</span></div>
   </div>
   <div class="hand" data-testid="player-hand-1">
     <div class="card"><span>A</span><span>♣</span></div>
     <div class="card"><span>7</span><span>♠</span></div>
   </div>
  </div>
 </div></body>`;

const dom = new JSDOM(html);
global.window = dom.window;
global.document = dom.window.document;
global.NodeFilter = dom.window.NodeFilter;
global.MutationObserver = dom.window.MutationObserver;
global.location = { hostname: 'duel.com' };

// jsdom rend des rects à 0 -> positions plausibles mockées
[...document.querySelectorAll('.card')].forEach(el => {
  const inDealer = !!el.closest('.dealer-area');
  const hand1 = !!el.closest('[data-testid="player-hand-1"]');
  const idx = [...el.parentElement.children].indexOf(el);
  const left = idx * 60 + (hand1 ? 300 : 0);
  el.getBoundingClientRect = () => ({ width: 50, height: 70, left, top: inDealer ? 50 : 400 });
});

eval(fs.readFileSync(path.join(__dirname, '../src/detector.js'), 'utf8'));
const { result, count } = window.__emeraldDetector.inspect();

const expected = { dealer: ['K'], hands: [['10', '6'], ['A', '7']] };
const ok = JSON.stringify(result) === JSON.stringify(expected);
console.log(`Cartes détectées : ${count}`);
console.log('Résultat :', JSON.stringify(result));
console.log(ok ? 'OK — détection conforme' : 'FAIL — attendu ' + JSON.stringify(expected));
process.exit(ok ? 0 : 1);
