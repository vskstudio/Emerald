// Test du mode LIVE : widget carte croupier + badges de totaux (style provider live)
const { JSDOM } = require('jsdom');
const fs = require('fs');
const path = require('path');

const html = `<body>
 <div class="dealer-info"><span class="label">Dealer</span>
   <div class="card-widget"><span>8</span><span>♠</span></div>
 </div>
 <div class="seats">
   <div class="seat"><span class="score">20</span><span class="nick">Trustworthy</span></div>
   <div class="seat"><span class="score">14</span><span class="nick">Quick</span></div>
   <div class="seat"><span class="score">1/11</span><span class="nick">Senpa1</span></div>
   <div class="seat"><span class="bet-amount">25</span></div>
 </div>
</body>`;

const dom = new JSDOM(html);
global.window = dom.window;
global.document = dom.window.document;
global.NodeFilter = dom.window.NodeFilter;
global.MutationObserver = dom.window.MutationObserver;
global.location = { hostname: 'live-provider.example', href: 'https://live-provider.example/game' };

let x = 0;
[...document.querySelectorAll('span')].forEach(el => {
  const w = el.classList.contains('nick') ? 120 : 40;
  el.getBoundingClientRect = () => ({ width: w, height: 28, left: (x += 70), top: el.closest('.dealer-info') ? 40 : 500 });
});
document.querySelector('.card-widget').getBoundingClientRect = () => ({ width: 60, height: 84, left: 900, top: 40 });

eval(fs.readFileSync(path.join(__dirname, '../src/detector.js'), 'utf8'));
const { result } = window.__emeraldDetector.inspect();

const checks = [
  ['mode live', result.mode === 'live'],
  ['croupier = 8', result.dealer[0] === '8'],
  ['3 totaux (mise 25 exclue)', result.totals.length === 3],
  ['total 20 dur', result.totals.some(t => t.total === 20 && !t.soft)],
  ['total 11 soft (1/11)', result.totals.some(t => t.total === 11 && t.soft)],
];
let fail = 0;
for (const [name, ok] of checks) {
  console.log((ok ? 'OK   ' : 'FAIL ') + name);
  if (!ok) fail++;
}
console.log('Résultat :', JSON.stringify(result));
process.exit(fail ? 1 : 0);
