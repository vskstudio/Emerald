// Emerald — Overlay calculateur de stratégie Blackjack (saisie manuelle, une main)
(() => {
  if (window.__emeraldLoaded) return;
  window.__emeraldLoaded = true;
  if (window !== window.top) return;

  const S = window.EmeraldStrategy;
  const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

  const state = {
    dealer: null,   // carte visible du croupier
    cards: [],      // ma main
    visible: false,
  };

  let root = null;

  function pct(x) { return (x * 100).toFixed(1) + '%'; }

  function buildOverlay() {
    root = document.createElement('div');
    root.id = 'emerald-overlay';
    root.innerHTML = `
      <div class="em-header">
        <img src="${chrome.runtime.getURL('icons/icon48.png')}" alt="">
        <span class="em-title">EMERALD</span>
        <button class="em-btn-icon" data-act="collapse" title="Réduire">—</button>
        <button class="em-btn-icon" data-act="close" title="Fermer">✕</button>
      </div>
      <div class="em-body"></div>
      <div class="em-footer">Stratégie de base — deck infini · Aucune garantie de gain · Jouez responsable</div>
    `;
    document.documentElement.appendChild(root);
    makeDraggable(root, root.querySelector('.em-header'));
    root.querySelector('[data-act="close"]').addEventListener('click', () => setVisible(false));
    root.querySelector('[data-act="collapse"]').addEventListener('click', () => root.classList.toggle('em-collapsed'));
    render();
  }

  function cardPicker(onPick, selected, variant) {
    const row = document.createElement('div');
    row.className = 'em-cards-row' + (variant ? ' ' + variant : '');
    for (const r of RANKS) {
      const b = document.createElement('button');
      b.className = 'em-card-btn' + (selected === r ? ' em-selected' : '');
      b.textContent = r;
      b.addEventListener('click', () => onPick(r));
      row.appendChild(b);
    }
    return row;
  }

  function render() {
    if (!root) return;
    const body = root.querySelector('.em-body');
    body.innerHTML = '';

    // --- Croupier ---
    const dl = document.createElement('p');
    dl.className = 'em-section-label';
    dl.textContent = 'Carte du croupier';
    body.appendChild(dl);
    body.appendChild(cardPicker(r => { state.dealer = state.dealer === r ? null : r; render(); }, state.dealer, 'em-cards-dealer'));

    // --- Ma main ---
    const div = document.createElement('div');
    div.className = 'em-hand em-active';

    const top = document.createElement('div');
    top.className = 'em-hand-top';
    const name = document.createElement('span');
    name.className = 'em-hand-name';
    name.textContent = 'Ma main';
    top.appendChild(name);

    if (state.cards.length) {
      const ev = S.evaluateHand(state.cards);
      const tot = document.createElement('span');
      tot.className = 'em-total';
      tot.textContent = `Total : ${ev.total}${ev.soft && !ev.bust ? ' (soft)' : ''}`;
      top.appendChild(tot);
    }
    div.appendChild(top);

    const cardsRow = document.createElement('div');
    cardsRow.className = 'em-hand-cards';
    state.cards.forEach((c, ci) => {
      const chip = document.createElement('span');
      chip.className = 'em-chip';
      chip.textContent = c;
      chip.title = 'Cliquer pour retirer';
      chip.addEventListener('click', () => { state.cards.splice(ci, 1); render(); });
      cardsRow.appendChild(chip);
    });
    div.appendChild(cardsRow);
    div.appendChild(cardPicker(r => { state.cards.push(r); render(); }));

    // --- Recommandation + probabilités ---
    if (state.cards.length >= 2 && state.dealer) {
      const res = S.decide(state.cards, state.dealer);
      const reco = document.createElement('div');
      reco.className = 'em-reco';
      if (res.code === 'BJ') {
        reco.classList.add('em-bj');
        reco.textContent = '★ BLACKJACK ★';
      } else if (res.code === 'BUST') {
        reco.classList.add('em-bust');
        reco.textContent = 'SAUTÉ (' + res.hand.total + ')';
      } else {
        const a = S.ACTION_LABELS[res.code];
        reco.style.background = a.color;
        reco.textContent = `${a.label} (${a.en})`;
      }
      div.appendChild(reco);

      if (res.code !== 'BJ' && res.code !== 'BUST') {
        const d = S.dealerOutcomes(state.dealer);
        const stand = S.standOutcome(state.cards, state.dealer);
        const bustHit = S.playerBustOnHit(state.cards);
        const probs = document.createElement('div');
        probs.className = 'em-probs';
        const rows = [
          ['Croupier saute', d.bust, '#2e9e4f'],
          ['Gain si je reste', stand.win, '#4ade80'],
          ['Égalité si je reste', stand.push, '#8a8f98'],
          ['Je saute si je tire', bustHit, '#e07b39'],
        ];
        for (const [label, val, color] of rows) {
          const r = document.createElement('div');
          r.className = 'em-prob-row';
          r.innerHTML = `<span class="em-prob-label">${label}</span>
            <span class="em-prob-bar"><span class="em-prob-fill" style="width:${val * 100}%;background:${color}"></span></span>
            <span class="em-prob-val">${pct(val)}</span>`;
          probs.appendChild(r);
        }
        div.appendChild(probs);
      }
    } else {
      const hint = document.createElement('div');
      hint.className = 'em-hint';
      if (!state.dealer && state.cards.length < 2) {
        hint.textContent = 'Choisis la carte du croupier, puis ajoute au moins 2 cartes à ta main.';
      } else if (!state.dealer) {
        hint.textContent = 'Choisis la carte visible du croupier pour obtenir la recommandation.';
      } else {
        hint.textContent = 'Ajoute au moins 2 cartes à ta main pour obtenir la recommandation.';
      }
      div.appendChild(hint);
    }
    body.appendChild(div);

    // --- Actions ---
    const actions = document.createElement('div');
    actions.className = 'em-actions';
    const reset = document.createElement('button');
    reset.className = 'em-btn em-danger';
    reset.textContent = 'Nouvelle donne';
    reset.addEventListener('click', () => {
      state.dealer = null;
      state.cards = [];
      render();
    });
    actions.appendChild(reset);
    body.appendChild(actions);
  }

  function makeDraggable(el, handle) {
    let sx, sy, ox, oy, dragging = false;
    handle.addEventListener('mousedown', e => {
      dragging = true;
      sx = e.clientX; sy = e.clientY;
      const r = el.getBoundingClientRect();
      ox = r.left; oy = r.top;
      handle.classList.add('em-dragging');
      e.preventDefault();
    });
    window.addEventListener('mousemove', e => {
      if (!dragging) return;
      const r = el.getBoundingClientRect();
      const maxX = window.innerWidth - r.width;
      const maxY = window.innerHeight - r.height;
      const x = Math.min(Math.max(ox + e.clientX - sx, 0), Math.max(maxX, 0));
      const y = Math.min(Math.max(oy + e.clientY - sy, 0), Math.max(maxY, 0));
      el.style.left = x + 'px';
      el.style.top = y + 'px';
      el.style.right = 'auto';
    });
    window.addEventListener('mouseup', () => {
      if (!dragging) return;
      dragging = false;
      handle.classList.remove('em-dragging');
    });
  }

  function setVisible(v) {
    state.visible = v;
    if (v && !root) buildOverlay();
    if (root) root.style.display = v ? '' : 'none';
    chrome.storage?.local?.set({ emeraldVisible: v });
  }

  chrome.runtime.onMessage.addListener(msg => {
    if (msg?.type === 'emerald-toggle') setVisible(!state.visible);
  });

  chrome.storage?.local?.get('emeraldVisible', res => {
    if (res?.emeraldVisible) setVisible(true);
  });
})();
