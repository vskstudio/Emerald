// Emerald — Sniffer WebSocket (monde MAIN de la page)
// Les tables live reçoivent l'état du jeu (cartes, scores) en JSON via
// WebSocket. On enveloppe le constructeur pour relayer les messages
// pertinents au content script via window.postMessage.
(() => {
  if (window.__emeraldWS) return;
  window.__emeraldWS = true;

  const INTERESTING = /card|dealer|hand|seat|score|total|blackjack/i;
  const OrigWS = window.WebSocket;
  let opened = 0;

  // Signale que le wrap est en place (diagnostic : socket ouvert avant/après)
  try { window.postMessage({ __emeraldWSMeta: { ready: true, opened } }, '*'); } catch (e) { /* */ }

  function WrappedWS(...args) {
    const ws = new OrigWS(...args);
    opened++;
    try { window.postMessage({ __emeraldWSMeta: { opened, url: String(args[0]).slice(0, 120) } }, '*'); } catch (e) { /* */ }
    ws.addEventListener('message', (e) => {
      try {
        if (typeof e.data === 'string' && e.data.length < 200000 && INTERESTING.test(e.data)) {
          window.postMessage({ __emeraldWS: { url: String(ws.url).slice(0, 120), data: e.data } }, '*');
        }
      } catch (err) { /* ignore */ }
    });
    return ws;
  }
  WrappedWS.prototype = OrigWS.prototype;
  Object.defineProperties(WrappedWS, {
    CONNECTING: { value: OrigWS.CONNECTING },
    OPEN: { value: OrigWS.OPEN },
    CLOSING: { value: OrigWS.CLOSING },
    CLOSED: { value: OrigWS.CLOSED },
  });
  window.WebSocket = WrappedWS;
})();
