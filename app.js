const pontos = {
  quente: {
    titulo: "Ovo quente",
    tempos: [3, 4],
    aviso: "Retire o ovo com uma escumadeira e sirva enquanto está quente.",
  },
  duro: {
    titulo: "Ovo duro",
    tempos: [6, 7, 8, 9, 10],
    aviso: "Retire o ovo da panela e mergulhe em água fria antes de descascar.",
  },
};

const telas = document.querySelectorAll(".painel > section");
const duracao = document.getElementById("duracao");
const contagem = document.getElementById("contagem");
const progresso = document.getElementById("progresso");
const som = document.getElementById("som");
let ponto;
let fim = 0;
let intervalo;
let audio;
let pontoId;
let inicioPreparo;
let preparoConcluido;
const chaveHistorico = "ovinho.historico.v1";
const ajustes = { "no-ponto": 0, "mais-passado": -30, "menos-passado": 30 };

function lerHistorico() {
  const dados = JSON.parse(localStorage.getItem(chaveHistorico) || "[]");
  if (!Array.isArray(dados) || !dados.every(registro =>
    typeof registro.id === "string" &&
    Object.hasOwn(pontos, registro.ponto) &&
    Number.isFinite(registro.segundos) && registro.segundos > 0 &&
    Object.hasOwn(ajustes, registro.avaliacao) &&
    typeof registro.data === "string"
  )) throw new Error("Histórico inválido");
  return dados;
}

function tempoSugerido(registro) {
  const tempos = pontos[registro.ponto].tempos;
  return Math.max(tempos[0] * 60, Math.min(
    tempos[tempos.length - 1] * 60,
    registro.segundos + ajustes[registro.avaliacao]
  ));
}

function formatarDuracao(segundos) {
  const minutos = Math.floor(segundos / 60);
  const resto = segundos % 60;
  return minutos + " min" + (resto ? " " + resto + " s" : "");
}

function mostrarTela(id) {
  for (const tela of telas) tela.hidden = tela.id !== id;
  document.getElementById(id).querySelector("h1, h2").focus();
}

function prepararPonto(id) {
  pontoId = id;
  ponto = pontos[id];
  document.getElementById("ponto-escolhido").textContent = ponto.titulo;
  duracao.replaceChildren(...ponto.tempos.map(minutos => new Option(minutos + " min", minutos)));
  duracao.selectedIndex = ponto.tempos.length - 1;
  const sugestao = document.getElementById("sugestao-tempo");
  sugestao.textContent = "Você pode ajustar o tempo antes de continuar.";
  try {
    const historico = lerHistorico();
    const ultimo = historico.filter(registro => registro.ponto === id).at(-1);
    if (!ultimo) return;
    const segundos = tempoSugerido(ultimo);
    if (!ponto.tempos.includes(segundos / 60)) {
      duracao.add(new Option(formatarDuracao(segundos), segundos / 60));
    }
    duracao.value = String(segundos / 60);
    sugestao.textContent = "Sugestão para você: " + formatarDuracao(segundos) +
      ", com base na sua última avaliação deste ponto. Você pode ajustar.";
  } catch {
    sugestao.textContent = "Não foi possível ler seu histórico. Escolha o tempo para este preparo.";
  }
}

function pararContagem() {
  clearInterval(intervalo);
  fim = 0;
}

function prepararAudio() {
  const Audio = window.AudioContext || window.webkitAudioContext;
  if (!som.checked || !Audio) return;
  try {
    audio ??= new Audio();
    audio.resume().catch(() => {});
  } catch {
    // O aviso visual continua disponível se o áudio estiver bloqueado.
  }
}

function tocarAviso() {
  if (!som.checked || audio?.state !== "running") return;
  const inicio = audio.currentTime;
  for (const [indice, frequencia] of [660, 880, 1046].entries()) {
    const nota = audio.createOscillator();
    const volume = audio.createGain();
    const quando = inicio + indice * 0.23;
    nota.frequency.value = frequencia;
    volume.gain.setValueAtTime(0.001, quando);
    volume.gain.exponentialRampToValueAtTime(0.16, quando + 0.03);
    volume.gain.exponentialRampToValueAtTime(0.001, quando + 0.21);
    nota.connect(volume).connect(audio.destination);
    nota.start(quando);
    nota.stop(quando + 0.22);
  }
}

function atualizarContagem() {
  if (!fim) return;

  const restante = Math.max(0, Math.ceil((fim - Date.now()) / 1000));
  const minutos = String(Math.floor(restante / 60)).padStart(2, "0");
  const segundos = String(restante % 60).padStart(2, "0");
  contagem.textContent = minutos + ":" + segundos;
  progresso.value = progresso.max - restante;

  if (restante === 0) {
    preparoConcluido = {
      id: crypto.randomUUID(),
      ponto: pontoId,
      segundos: Math.round((fim - inicioPreparo) / 1000),
      data: new Date().toISOString(),
    };
    pararContagem();
    document.getElementById("avaliacao").disabled = false;
    document.getElementById("retorno-avaliacao").textContent = "";
    document.getElementById("outro-ovo").hidden = true;
    document.getElementById("orientacao-final").textContent = ponto.aviso;
    mostrarTela("pronto");
    tocarAviso();
  }
}

function iniciarContagem() {
  pararContagem();
  prepararAudio();
  const minutos = Number(duracao.value);
  progresso.max = minutos * 60;
  fim = Date.now() + progresso.max * 1000;
  intervalo = setInterval(atualizarContagem, 250);
  atualizarContagem();
}

document.getElementById("coloquei").addEventListener("click", () => {
  inicioPreparo = Date.now();
  document.getElementById("modo-temporizador").textContent = ponto.titulo + " · " + formatarDuracao(Number(duracao.value) * 60);
  iniciarContagem();
  mostrarTela("temporizador");
});

document.getElementById("reiniciar").addEventListener("click", iniciarContagem);

document.getElementById("avaliacao").addEventListener("click", evento => {
  const botao = evento.target.closest("[data-avaliacao]");
  if (!botao || !preparoConcluido || evento.currentTarget.disabled) return;
  const retorno = document.getElementById("retorno-avaliacao");
  try {
    const historico = lerHistorico();
    const registro = { ...preparoConcluido, avaliacao: botao.dataset.avaliacao };
    if (!historico.some(item => item.id === registro.id)) {
      historico.push(registro);
      localStorage.setItem(chaveHistorico, JSON.stringify(historico));
    }
    evento.currentTarget.disabled = true;
    retorno.textContent = "Avaliação salva! No próximo preparo deste ponto, vou sugerir " +
      formatarDuracao(tempoSugerido(registro)) + ".";
  } catch {
    retorno.textContent = "Não foi possível salvar neste navegador. Tente avaliar novamente ou prepare outro ovo.";
  }
  document.getElementById("outro-ovo").hidden = false;
});
document.addEventListener("visibilitychange", atualizarContagem);
document.addEventListener("click", evento => {
  const botao = evento.target.closest("[data-target]");
  if (!botao) return;

  pararContagem();
  if (botao.dataset.ponto) prepararPonto(botao.dataset.ponto);
  mostrarTela(botao.dataset.target);
});
