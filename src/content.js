// Emerald — Overlay calculateur de stratégie Blackjack
(() => {
  if (window.__emeraldLoaded) return;
  window.__emeraldLoaded = true;

  const S = window.EmeraldStrategy;
  const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

  const state = {
    dealer: null,          // carte visible du croupier
    hands: [{ cards: [] }],
    activeHand: 0,
    visible: false,
    auto: false,           // détection automatique (duel.com)
    autoStatus: '',
  };

  const detector = window.__emeraldDetector;

  function applyDetection(result) {
    state.dealer = result.dealer[0] || null;
    state.hands = result.hands.length ? result.hands.map(cards => ({ cards })) : [{ cards: [] }];
    state.activeHand = 0;
    state.autoStatus = result.dealer.length + result.hands.flat().length
      ? `${result.hands.length} main(s) · croupier : ${result.dealer.join(' ') || '?'}`
      : 'En attente de cartes…';
    render();
  }

  function setAuto(on) {
    state.auto = on;
    if (on && detector) {
      state.autoStatus = 'Scan en cours…';
      detector.start(applyDetection);
    } else {
      detector?.stop();
      state.autoStatus = '';
    }
    render();
  }

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

  function cardPicker(onPick, selected) {
    const row = document.createElement('div');
    row.className = 'em-cards-row';
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

    // --- Mode auto (détection duel.com) ---
    if (detector?.supported) {
      const autoBar = document.createElement('div');
      autoBar.className = 'em-actions';
      autoBar.style.marginBottom = '10px';
      const autoBtn = document.createElement('button');
      autoBtn.className = 'em-btn' + (state.auto ? '' : ' em-danger');
      autoBtn.textContent = state.auto ? '🟢 AUTO activé' : '⚪ AUTO désactivé';
      autoBtn.addEventListener('click', () => setAuto(!state.auto));
      const scanBtn = document.createElement('button');
      scanBtn.className = 'em-btn';
      scanBtn.textContent = '🔍 Scanner';
      scanBtn.title = 'Surligne les cartes détectées (3 s) et log les détails dans la console';
      scanBtn.addEventListener('click', () => {
        const { count } = detector.inspect();
        state.autoStatus = `${count} carte(s) trouvée(s) — détail dans la console (F12)`;
        render();
      });
      autoBar.appendChild(autoBtn);
      autoBar.appendChild(scanBtn);
      body.appendChild(autoBar);
      if (state.autoStatus) {
        const st = document.createElement('p');
        st.className = 'em-section-label';
        st.style.color = '#4ade80';
        st.textContent = state.autoStatus;
        body.appendChild(st);
      }
    }

    // --- Croupier ---
    const dl = document.createElement('p');
    dl.className = 'em-section-label';
    dl.textContent = 'Carte du croupier';
    body.appendChild(dl);
    body.appendChild(cardPicker(r => { state.dealer = state.dealer === r ? null : r; render(); }, state.dealer));

    // --- Mains ---
    state.hands.forEach((hand, i) => {
      const div = document.createElement('div');
      div.className = 'em-hand' + (i === state.activeHand ? ' em-active' : '');

      const top = document.createElement('div');
      top.className = 'em-hand-top';
      const name = document.createElement('span');
      name.className = 'em-hand-name';
      name.textContent = state.hands.length > 1 ? `Main ${i + 1}` : 'Ma main';
      name.addEventListener('click', () => { state.activeHand = i; render(); });
      top.appendChild(name);

      const ev = hand.cards.length ? S.evaluateHand(hand.cards) : null;
      if (ev) {
        const tot = document.createElement('span');
        tot.className = 'em-total';
        tot.textContent = `Total : ${ev.total}${ev.soft && !ev.bust ? ' (soft)' : ''}`;
        top.appendChild(tot);
      }
      if (state.hands.length > 1) {
        const del = document.createElement('button');
        del.className = 'em-btn-icon';
        del.textContent = '✕';
        del.title = 'Supprimer cette main';
        del.addEventListener('click', () => {
          state.hands.splice(i, 1);
          state.activeHand = Math.min(state.activeHand, state.hands.length - 1);
          render();
        });
        top.appendChild(del);
      }
      div.appendChild(top);

      const cardsRow = document.createElement('div');
      cardsRow.className = 'em-hand-cards';
      hand.cards.forEach((c, ci) => {
        const chip = document.createElement('span');
        chip.className = 'em-chip';
        chip.textContent = c;
        chip.title = 'Cliquer pour retirer';
        chip.addEventListener('click', () => { hand.cards.splice(ci, 1); render(); });
        cardsRow.appendChild(chip);
      });
      div.appendChild(cardsRow);

      if (i === state.activeHand) {
        div.appendChild(cardPicker(r => { hand.cards.push(r); render(); }));
      }

      // Recommandation + probabilités
      if (hand.cards.length >= 2 && state.dealer) {
        const res = S.decide(hand.cards, state.dealer);
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
          const stand = S.standOutcome(hand.cards, state.dealer);
          const bustHit = S.playerBustOnHit(hand.cards);
          const probs = document.createElement('div');
          probs.className = 'em-probs';
          const rows = [
            ['Croupier saute', d.bust, '#2e9e4f'],
            ['Gain si je reste', stand.win, '#4ade80'],
            ['Égalité si je reste', stand.push, '#8a8f98'],
            ['Je saute si je tire', bustHit, '#d0392e'],
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
      }
      body.appendChild(div);
    });

    // --- Actions ---
    const actions = document.createElement('div');
    actions.className = 'em-actions';
    const addHand = document.createElement('button');
    addHand.className = 'em-btn';
    addHand.textContent = '+ Ajouter une main';
    addHand.addEventListener('click', () => {
      state.hands.push({ cards: [] });
      state.activeHand = state.hands.length - 1;
      render();
    });
    const reset = document.createElement('button');
    reset.className = 'em-btn em-danger';
    reset.textContent = 'Nouvelle donne';
    reset.addEventListener('click', () => {
      state.dealer = null;
      state.hands = [{ cards: [] }];
      state.activeHand = 0;
      render();
    });
    actions.appendChild(addHand);
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
      e.preventDefault();
    });
    window.addEventListener('mousemove', e => {
      if (!dragging) return;
      el.style.left = (ox + e.clientX - sx) + 'px';
      el.style.top = (oy + e.clientY - sy) + 'px';
      el.style.right = 'auto';
    });
    window.addEventListener('mouseup', () => { dragging = false; });
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
