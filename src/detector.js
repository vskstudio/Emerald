// Emerald — Détection automatique des cartes (duel.com Blackjack Original)
// Le jeu "Original" de duel.com est rendu en DOM (React), pas en canvas :
// les cartes sont des éléments HTML avec un rang (A,2..10,J,Q,K) et une
// couleur (♠♥♦♣ en texte, SVG ou classe). On scanne le DOM avec des
// heuristiques + un MutationObserver, et on sépare croupier / joueurs
// par position verticale ou par les classes des ancêtres.
//
// ⚠️ Les tables LIVE (Evolution Gaming) sont un flux vidéo : indétectable.
(() => {
  if (window.__emeraldDetector) return;

  const RANK_RE = /^(A|K|Q|J|10|[2-9])$/;
  const SUIT_RE = /[♠♥♦♣]|spade|heart|diamond|club/i;
  const DEALER_HINT = /dealer|croupier|bank/i;
  const PLAYER_HINT = /player|hand|joueur|seat/i;

  // Trouve les éléments "carte" : un nœud court dont le texte est un rang,
  // avec un indice de couleur (suit) dans le même conteneur proche.
  function findCardElements() {
    const cards = [];
    const seen = new Set();
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    let node;
    while ((node = walker.nextNode())) {
      const txt = node.textContent.trim();
      if (!RANK_RE.test(txt)) continue;
      const el = node.parentElement;
      if (!el || el.closest('#emerald-overlay')) continue;
      // Remonte jusqu'à 4 niveaux pour trouver le conteneur de la carte
      // (celui qui contient aussi l'indice de couleur)
      let container = el;
      for (let i = 0; i < 4 && container; i++) {
        const html = container.outerHTML || '';
        if (SUIT_RE.test(container.textContent) || SUIT_RE.test(html) ||
            /card/i.test(container.className?.toString() || '')) {
          break;
        }
        container = container.parentElement;
      }
      if (!container || container === document.body) continue;
      const hasSuit = SUIT_RE.test(container.textContent) ||
        SUIT_RE.test(container.innerHTML || '') ||
        /card/i.test(container.className?.toString() || '');
      if (!hasSuit) continue;
      const rect = container.getBoundingClientRect();
      if (rect.width < 15 || rect.height < 20 || rect.width > 220) continue; // taille plausible d'une carte
      const key = `${txt}@${Math.round(rect.left)},${Math.round(rect.top)}`;
      if (seen.has(key)) continue;
      seen.add(key);
      cards.push({ rank: txt, el: container, rect });
    }
    return cards;
  }

  // Sépare croupier / mains joueur
  function classify(cards) {
    if (!cards.length) return null;
    const dealer = [], players = [];
    for (const c of cards) {
      let zone = null;
      // 1) Indice par classes/attributs des ancêtres (max 8 niveaux)
      let a = c.el;
      for (let i = 0; i < 8 && a && !zone; i++) {
        const sig = `${a.className || ''} ${a.id || ''} ${a.getAttribute?.('data-testid') || ''} ${a.getAttribute?.('aria-label') || ''}`;
        if (DEALER_HINT.test(sig)) zone = 'dealer';
        else if (PLAYER_HINT.test(sig)) zone = 'player';
        a = a.parentElement;
      }
      c.zone = zone;
      (zone === 'dealer' ? dealer : zone === 'player' ? players : null)?.push(c);
    }
    // 2) Repli : séparation par position verticale (croupier en haut)
    const unknown = cards.filter(c => !c.zone);
    if (unknown.length) {
      const ys = cards.map(c => c.rect.top).sort((a, b) => a - b);
      const midY = (ys[0] + ys[ys.length - 1]) / 2;
      for (const c of unknown) (c.rect.top < midY ? dealer : players).push(c);
    }
    // Regroupe les cartes joueur en mains par proximité horizontale
    players.sort((a, b) => a.rect.left - b.rect.left);
    const hands = [];
    let cur = [];
    for (const c of players) {
      if (cur.length && c.rect.left - cur[cur.length - 1].rect.left > 140) {
        hands.push(cur); cur = [];
      }
      cur.push(c);
    }
    if (cur.length) hands.push(cur);
    dealer.sort((a, b) => a.rect.left - b.rect.left);
    return {
      dealer: dealer.map(c => c.rank),
      hands: hands.map(h => h.map(c => c.rank)),
    };
  }

  let observer = null;
  let debounce = null;
  let onUpdate = null;
  let lastSnapshot = '';

  function scan() {
    const cards = findCardElements();
    const result = classify(cards);
    if (!result) return;
    const snap = JSON.stringify(result);
    if (snap === lastSnapshot) return;
    lastSnapshot = snap;
    onUpdate?.(result);
  }

  function start(callback) {
    onUpdate = callback;
    stop();
    observer = new MutationObserver(() => {
      clearTimeout(debounce);
      debounce = setTimeout(scan, 250);
    });
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
    scan();
  }

  function stop() {
    observer?.disconnect();
    observer = null;
    lastSnapshot = '';
  }

  // Mode calibration : surligne les cartes détectées pendant 3 s et log le détail
  function inspect() {
    const cards = findCardElements();
    for (const c of cards) {
      c.el.style.outline = '3px solid #4ade80';
      c.el.style.outlineOffset = '2px';
      setTimeout(() => { c.el.style.outline = ''; }, 3000);
    }
    const result = classify(cards);
    console.log('[Emerald] Cartes détectées :', cards.map(c => ({
      rank: c.rank, zone: c.zone || 'position', class: c.el.className?.toString().slice(0, 80),
    })), '→', result);
    return { count: cards.length, result };
  }

  window.__emeraldDetector = { start, stop, scan, inspect, supported: /(^|\.)duel\.com$/.test(location.hostname) };
})();
