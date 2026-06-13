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

  // --- Mode LIVE (tables avec croupière vidéo) ---
  // Les cartes sont dans le flux vidéo, mais le provider affiche en DOM :
  // un widget carte croupier (ex: "8" + "♠") et des badges de totaux par
  // siège ("20", "14", "1/11" = soft, "21"). On lit ces totaux.
  const TOTAL_RE = /^(\d{1,2})(?:\s*\/\s*(\d{1,2}))?$/;

  function findLiveTotals() {
    const totals = [];
    const seen = new Set();
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    let node;
    while ((node = walker.nextNode())) {
      const txt = node.textContent.trim();
      const m = TOTAL_RE.exec(txt);
      if (!m) continue;
      const lo = parseInt(m[1], 10);
      const hi = m[2] ? parseInt(m[2], 10) : null;
      // Un total plausible : 4..26 ; un soft "x/y" avec y = x+10
      if (hi !== null && hi !== lo + 10) continue;
      const val = hi || lo;
      if (val < 4 || val > 26) continue;
      const el = node.parentElement;
      if (!el || el.closest('#emerald-overlay')) continue;
      const rect = el.getBoundingClientRect();
      // Badge compact (pas un montant de mise, pas un gros bloc)
      if (rect.width < 8 || rect.width > 90 || rect.height < 8 || rect.height > 60) continue;
      const sig = collectAncestorSig(el);
      // Exclut mises, soldes, horloges… et les rangs affichés dans une carte
      if (/bet|stake|balance|chip|amount|currency|timer|clock|history|card/i.test(sig)) continue;
      const key = `${txt}@${Math.round(rect.left)},${Math.round(rect.top)}`;
      if (seen.has(key)) continue;
      seen.add(key);
      totals.push({ total: val, soft: hi !== null, rect, el, sig });
    }
    totals.sort((a, b) => a.rect.left - b.rect.left);
    return totals;
  }

  function collectAncestorSig(el, depth = 8) {
    let sig = '';
    let a = el;
    for (let i = 0; i < depth && a; i++) {
      sig += ` ${a.className || ''} ${a.id || ''} ${a.getAttribute?.('data-role') || ''} ${a.getAttribute?.('data-testid') || ''}`;
      a = a.parentElement;
    }
    return sig;
  }

  // Carte croupier en mode live : carte DOM détectée dans une zone "dealer",
  // ou à défaut la carte la plus haute / la plus isolée de l'écran.
  function liveDealerCard(cards) {
    if (!cards.length) return null;
    const tagged = cards.find(c => {
      const sig = collectAncestorSig(c.el);
      return DEALER_HINT.test(sig);
    });
    if (tagged) return tagged.rank;
    // Repli : carte la plus haute à l'écran
    return cards.slice().sort((a, b) => a.rect.top - b.rect.top)[0].rank;
  }

  function buildResult() {
    const cards = findCardElements();
    const classic = classify(cards);
    // Mode classique : on a des mains complètes en cartes
    if (classic && classic.hands.flat().length >= 2) return { mode: 'cards', ...classic };
    // Mode live : carte croupier + totaux
    const totals = findLiveTotals();
    if (cards.length || totals.length) {
      return {
        mode: 'live',
        dealer: cards.length ? [liveDealerCard(cards)] : (classic?.dealer ?? []),
        hands: [],
        totals: totals.map(t => ({ total: t.total, soft: t.soft })),
      };
    }
    return classic;
  }

  let observer = null;
  let debounce = null;
  let onUpdate = null;
  let lastSnapshot = '';

  function scan() {
    const result = buildResult();
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

  // Mode calibration : surligne cartes (vert) et totaux (orange) 3 s, log le détail
  function inspect() {
    const cards = findCardElements();
    const totals = findLiveTotals();
    for (const c of cards) {
      c.el.style.outline = '3px solid #4ade80';
      c.el.style.outlineOffset = '2px';
      setTimeout(() => { c.el.style.outline = ''; }, 3000);
    }
    for (const t of totals) {
      t.el.style.outline = '3px solid #f59e0b';
      setTimeout(() => { t.el.style.outline = ''; }, 3000);
    }
    const result = buildResult();
    console.log(`[Emerald] frame=${(location.href || '').slice(0, 80)}`,
      '\ncartes :', cards.map(c => ({ rank: c.rank, zone: c.zone || 'position', class: c.el.className?.toString().slice(0, 80) })),
      '\ntotaux :', totals.map(t => ({ total: t.total, soft: t.soft, sig: t.sig.trim().slice(0, 80) })),
      '\n→', result);
    return { count: cards.length + totals.length, result };
  }

  window.__emeraldDetector = {
    start, stop, scan, inspect,
    supported: true, // injecté à la demande -> actif partout où on le charge
    isTopFrame: window === window.top,
  };

  // Frames enfants (le jeu live tourne dans une iframe cross-origin) :
  // on détecte ici et on relaie les résultats à la page principale.
  if (window !== window.top) {
    start(result => {
      try { window.top.postMessage({ __emerald: true, result }, '*'); } catch (e) { /* ignore */ }
    });
    // Le scanner peut être déclenché depuis la frame principale
    window.addEventListener('message', e => {
      if (e.data?.__emeraldCmd === 'inspect') {
        const { count } = inspect();
        try { window.top.postMessage({ __emerald: true, inspectCount: count }, '*'); } catch (err) { /* ignore */ }
      }
    });
  }
})();
