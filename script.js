// =============================
// JOGO DA MEMÓRIA CORPORATIVO
// =============================
// Arquivo: script.js
// Objetivo: Controlar fluxo de telas, lógica de pareamento, cronômetro e reinício.
// Dependências: Nenhuma (JS puro) - pronto para rodar offline.

// ---- Referências de elementos principais ----
const startScreen = document.getElementById('start-screen');
const gameScreen = document.getElementById('game-screen');
const endScreen = document.getElementById('end-screen');
const gameBoard = document.getElementById('game-board');
const timerElement = document.getElementById('timer');
const endMessage = document.getElementById('end-message');
const startBtn = document.getElementById('start-btn');
const restartBtn = document.getElementById('restart-btn');
const pairsStatus = document.getElementById('pairs-status');
const finalStats = document.getElementById('final-stats');
const overlay = document.getElementById('transition-overlay');
const loadingScreen = document.getElementById('loading-screen');
// Extensões alternativas para tentar quando a imagem não carregar na extensão informada
const EXT_VARIANTS = ['.png', '.jpg', '.jpeg', '.webp'];

// ---- Configuração do jogo ----
const CONFIG = {
  tempoTotal: 45,        // segundos (45s)
  colunas: 4,            // 4 colunas x 3 linhas = 12 cartas
  linhas: 3,             // referência
  embaralharSeed: null,  // reservado para futura seed
  caminhoImagens: 'img/',
  // 6 imagens únicas => 6 pares => 12 cartas
  imagens: [
    'img1.png','img2.png','img3.png','img4.png','img5.png','img6.png'
  ]
};

// Vetor expandido (pares) será construído dinamicamente.
let deck = [];

// Estado de jogo
let primeiro = null;      // {el, id}
let segundo = null;       // {el, id}
let bloqueado = false;    // trava enquanto anima
let paresEncontrados = 0; // contador de pares
let tempoRestante = CONFIG.tempoTotal;
let intervaloTempo = null;
let inicioTimestamp = null;

// ---- Funções Utilitárias ----
function shuffle(array) {
  // Implementação Fisher-Yates para embaralhamento uniforme
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

function formatarSegundos(seg) {
  return String(seg).padStart(2,'0');
}

function atualizarTimerVisual() {
  timerElement.textContent = 'Tempo: ' + formatarSegundos(tempoRestante);
  if (tempoRestante <= 10) {
    timerElement.style.color = '#ff4d4d';
  } else if (tempoRestante <= 20) {
    timerElement.style.color = '#ffce3a';
  } else {
    timerElement.style.color = '#fff';
  }
}

function atualizarParesStatus() {
  const total = deck.length / 2;
  pairsStatus.textContent = `${paresEncontrados}/${total} pares`;
}

function criarCarta(idImagem, idxGlobal) {
  const carta = document.createElement('div');
  carta.className = 'card';
  carta.setAttribute('role','button');
  carta.setAttribute('aria-label','Carta escondida');
  carta.tabIndex = 0;
  carta.dataset.img = idImagem;
  carta.dataset.index = idxGlobal;
  carta.innerHTML = `
    <div class="card-inner">
      <div class="card-face card-front"></div>
  <div class="card-face card-back"><img src="${CONFIG.caminhoImagens + idImagem}" alt="Imagem corporativa" draggable="false" onerror="this.dataset.err=1;this.style.opacity=.1;this.parentElement.style.background='linear-gradient(145deg,#082541,#0f3f66)';this.parentElement.style.display='flex';this.parentElement.style.alignItems='center';this.parentElement.style.justifyContent='center';this.parentElement.style.fontWeight='600';this.parentElement.style.letterSpacing='1px';this.parentElement.style.color='#3ad4ff';this.parentElement.textContent='IMG';" /></div>
    </div>
  `;
  carta.addEventListener('click', () => virarCarta(carta));
  carta.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); virarCarta(carta);} 
  });
  return carta;
}

// ---- Fluxo Principal ----
function iniciarJogo() {
  mostrarTela(gameScreen); // prepara tela
  reiniciarEstado();
  // Exibe loading enquanto garante as imagens prontas
  mostrarLoading(true);
  prepararImagens()
    .then(() => {
      construirDeck();
      renderizarTabuleiro();
      iniciarCronometro();
    })
    .catch(err => {
      console.error('Falha ao carregar imagens:', err);
      finalStats.innerHTML = '<span style="color:#ff4d4d">Erro ao carregar imagens. Verifique nomes.</span>';
    })
    .finally(() => {
      mostrarLoading(false);
    });
}

function reiniciarEstado() {
  primeiro = null;
  segundo = null;
  bloqueado = false;
  paresEncontrados = 0;
  tempoRestante = CONFIG.tempoTotal;
  atualizarTimerVisual();
  atualizarParesStatus();
  finalStats.textContent = '';
  endMessage.textContent = '';
  clearInterval(intervaloTempo);
}

function construirDeck() {
  // Duplicar a lista base para criar pares
  const base = [...CONFIG.imagens];
  deck = shuffle([...base, ...base]);
}

function renderizarTabuleiro() {
  gameBoard.innerHTML = '';
  // Ajusta a variável CSS de colunas se desejar seguir CONFIG
  gameBoard.style.setProperty('--cols', CONFIG.colunas);
  deck.forEach((img, i) => {
    const el = criarCarta(img, i);
    gameBoard.appendChild(el);
  });
}

function iniciarCronometro() {
  inicioTimestamp = performance.now();
  intervaloTempo = setInterval(() => {
    tempoRestante--;
    atualizarTimerVisual();
    if (tempoRestante <= 0) {
      tempoRestante = 0;
      atualizarTimerVisual();
      encerrarJogo(false);
    }
  }, 1000);
}

// ---- Lógica de cartas ----
function virarCarta(carta) {
  if (bloqueado) return;
  if (carta.classList.contains('flipped') || carta.classList.contains('matched')) return;

  carta.classList.add('flipped');

  if (!primeiro) {
    primeiro = carta;
    return;
  }

  segundo = carta;
  verificarPar();
}

function verificarPar() {
  const ehPar = primeiro.dataset.img === segundo.dataset.img;
  if (ehPar) {
    marcarPar(primeiro, segundo);
    resetSelecao();
    paresEncontrados++;
    atualizarParesStatus();
    if (paresEncontrados === deck.length / 2) {
      encerrarJogo(true);
    }
  } else {
    bloqueado = true;
    setTimeout(() => {
      primeiro.classList.remove('flipped');
      segundo.classList.remove('flipped');
      resetSelecao();
    }, 950);
  }
}

function marcarPar(a, b) {
  a.classList.add('matched');
  b.classList.add('matched');
  a.setAttribute('aria-label','Carta combinada');
  b.setAttribute('aria-label','Carta combinada');
}

function resetSelecao() {
  primeiro = null; segundo = null; bloqueado = false;
}

// ---- Encerramento ----
function encerrarJogo(venceu) {
  clearInterval(intervaloTempo);
  // Delay curto para permitir finalizar animações de flip
  setTimeout(() => {
  mostrarTela(endScreen);
    if (venceu) {
      endMessage.textContent = '🎉 Parabéns! Você concluiu em menos de 1 minuto!';
    } else {
      endMessage.textContent = '😅 Tente novamente!';
    }
    const usados = CONFIG.tempoTotal - tempoRestante;
    const segundosFormat = usados + 's';
    finalStats.innerHTML = `Tempo usado: <strong>${segundosFormat}</strong><br>Pares encontrados: <strong>${paresEncontrados}/${deck.length/2}</strong>`;
  }, 400);
}

// ---- Transição de telas ----
function mostrarTela(target) {
  [startScreen, gameScreen, endScreen].forEach(sc => sc.classList.remove('active'));
  target.classList.add('active');
}

// ---- Eventos ----
startBtn.addEventListener('click', iniciarJogo);
restartBtn.addEventListener('click', iniciarJogo);

// Permite reiniciar automaticamente após inatividade na tela final (kiosk opcional)
let idleTimeout = null;
function resetIdle() {
  clearTimeout(idleTimeout);
  idleTimeout = setTimeout(() => {
    if (endScreen.classList.contains('active')) iniciarJogo();
  }, 60000); // 1 min de espera
}
['click','touchstart'].forEach(evt => document.addEventListener(evt, resetIdle, {passive:true}));
resetIdle();

// ---- Pré-carregamento de imagens ----
function prepararImagens() {
  const lista = [...CONFIG.imagens];

  function tentarCarregar(nomeOriginal) {
    const temExt = /\.[a-zA-Z0-9]{2,5}$/.test(nomeOriginal);
    const base = temExt ? nomeOriginal.replace(/\.[^.]+$/, '') : nomeOriginal;
    const primeiraExt = temExt ? nomeOriginal.substring(nomeOriginal.lastIndexOf('.')) : null;
    const variantes = temExt ? [primeiraExt, ...EXT_VARIANTS.filter(e => e !== primeiraExt)] : [...EXT_VARIANTS];

    return new Promise((resolve) => {
      let idx = 0;
      function tenta() {
        if (idx >= variantes.length) {
          return resolve({ nomeOriginal, resultado: null });
        }
        const ext = variantes[idx++];
        const candidato = base + ext;
        const img = new Image();
        img.onload = () => resolve({ nomeOriginal, resultado: candidato });
        img.onerror = () => tenta();
        img.src = CONFIG.caminhoImagens + candidato;
      }
      tenta();
    });
  }

  return Promise.all(lista.map(tentarCarregar)).then(res => {
    CONFIG.imagens = res.map(r => r.resultado || 'placeholder.png');
  });
}

function mostrarLoading(flag) {
  if (!loadingScreen) return;
  loadingScreen.classList.toggle('hidden', !flag);
}

// Foco inicial para acessibilidade
window.addEventListener('load', () => startBtn.focus());

// Ajuste de viewport para navegadores móveis que escondem barra ao rolar
function aplicarViewportDinamica() {
  const vh = window.innerHeight * 0.01;
  document.documentElement.style.setProperty('--vh', `${vh}px`);
}
aplicarViewportDinamica();
window.addEventListener('resize', aplicarViewportDinamica);

// Garante reposicionamento do topo ao iniciar jogo (evita ficar sob barra)
function scrollTopoSeguro() {
  window.scrollTo({ top: 0, behavior: 'instant' });
}
startBtn.addEventListener('click', scrollTopoSeguro);
restartBtn.addEventListener('click', scrollTopoSeguro);
