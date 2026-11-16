// ===== Música de fundo do convite (usada em todas as telas) =====
// Os navegadores só liberam som depois que a pessoa interage com o site. Então tentamos tocar
// assim que a tela abre e, se for bloqueado, a música começa no primeiro toque/clique.
// Ao trocar de tela, a música continua do ponto em que parou.
(function () {
  const VOLUME = 0.2;
  const CHAVE_MUDO = 'mr15-mudo';
  const CHAVE_POSICAO = 'mr15-musica-pos';

  const ler = (k) => { try { return sessionStorage.getItem(k); } catch { return null; } };
  const gravar = (k, v) => { try { sessionStorage.setItem(k, v); } catch {} };

  const stage = document.querySelector('.stage');
  if (!stage) return;

  // Botão discreto de ligar/desligar
  const btnSom = document.createElement('button');
  btnSom.className = 'som';
  btnSom.type = 'button';
  btnSom.innerHTML =
    '<svg class="ic-on" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true">' +
      '<path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor" stroke="none"/>' +
      '<path d="M16.5 8.5a5 5 0 0 1 0 7"/><path d="M19 6a8.5 8.5 0 0 1 0 12"/></svg>' +
    '<svg class="ic-off" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true">' +
      '<path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor" stroke="none"/>' +
      '<path d="M17 9.5l5 5M22 9.5l-5 5"/></svg>';
  document.body.appendChild(btnSom);

  const musica = new Audio('/assets/musica.m4a?v=2');
  musica.loop = true;
  musica.preload = 'auto';
  musica.volume = VOLUME;

  let tocando = false;
  let ctx = null;
  let mudo = ler(CHAVE_MUDO) === '1';

  // Continua de onde parou na tela anterior
  const posicao = parseFloat(ler(CHAVE_POSICAO));
  if (posicao > 0) {
    const irPara = () => {
      try { musica.currentTime = isFinite(musica.duration) ? posicao % musica.duration : posicao; } catch {}
    };
    if (musica.readyState >= 1) irPara();
    else musica.addEventListener('loadedmetadata', irPara, { once: true });
  }
  const salvarPosicao = () => { if (musica.currentTime > 0) gravar(CHAVE_POSICAO, String(musica.currentTime)); };
  window.addEventListener('pagehide', salvarPosicao);

  // No iPhone o volume do <audio> é ignorado; passando pelo Web Audio dá para controlar.
  function rotearVolume() {
    if (ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    try {
      ctx = new AC();
      const ganho = ctx.createGain();
      ganho.gain.value = VOLUME;
      ctx.createMediaElementSource(musica).connect(ganho).connect(ctx.destination);
      musica.volume = 1; // o volume agora é controlado pelo ganho
    } catch { ctx = null; musica.volume = VOLUME; }
  }

  // "Mudo" = pausar. No celular (principalmente iPhone) a propriedade muted não silencia
  // o áudio que passa pelo Web Audio, mas pausar funciona em qualquer navegador.
  function aplicarMudo() {
    btnSom.classList.toggle('mudo', mudo);
    btnSom.setAttribute('aria-pressed', String(mudo));
    btnSom.setAttribute('aria-label', mudo ? 'Ligar música' : 'Desligar música');
  }

  function tocar(comInteracao) {
    if (mudo) return;
    if (comInteracao) {
      rotearVolume();
      if (ctx && ctx.state === 'suspended') ctx.resume();
    }
    const p = musica.play();
    if (p && p.then) p.then(() => { tocando = true; pararDeEsperar(); }).catch(() => {});
    else tocando = true;
  }

  const eventosInteracao = ['pointerdown', 'touchend', 'click', 'keydown'];
  function aoInteragir(e) {
    if (e.target.closest && e.target.closest('.som')) return; // o botão de som cuida de si
    if (!tocando && !mudo) tocar(true);
  }
  function pararDeEsperar() {
    eventosInteracao.forEach((ev) => document.removeEventListener(ev, aoInteragir, true));
  }
  eventosInteracao.forEach((ev) => document.addEventListener(ev, aoInteragir, true));

  btnSom.addEventListener('click', (e) => {
    e.stopPropagation();
    mudo = !mudo;
    gravar(CHAVE_MUDO, mudo ? '1' : '0');
    aplicarMudo();
    if (mudo) {
      musica.pause();
      tocando = false;
    } else {
      tocar(true);
    }
  });

  // Pausa quando a aba fica em segundo plano e retoma ao voltar
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { salvarPosicao(); musica.pause(); }
    else if (tocando && !mudo) musica.play().catch(() => {});
  });
  // Página restaurada do cache do navegador (botão voltar)
  window.addEventListener('pageshow', (e) => {
    if (e.persisted && tocando && !mudo) musica.play().catch(() => {});
  });

  aplicarMudo();

  // Tenta tocar sozinha: 2s depois de entrar no site na primeira vez, e na hora nas telas seguintes.
  // Se o navegador bloquear (som sem interação), ela começa no primeiro toque/clique (acima).
  const primeiraVez = ler(CHAVE_POSICAO) === null;
  setTimeout(() => { if (!tocando) tocar(false); }, primeiraVez ? 2000 : 0);
})();
