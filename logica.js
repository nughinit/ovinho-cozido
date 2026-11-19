// Regras do app que não dependem do DOM. Carregado no navegador antes de app.js
// e importável pelos testes (node --test).
(function (raiz) {
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

  const chaveHistorico = "ovinho.historico.v1";
  const chaveBackup = chaveHistorico + ".corrompido";
  const ajustes = { "no-ponto": 0, "mais-passado": -30, "menos-passado": 30 };

  function registroValido(registro) {
    return registro !== null && typeof registro === "object" &&
      typeof registro.id === "string" && registro.id !== "" &&
      Object.hasOwn(pontos, registro.ponto) &&
      Number.isFinite(registro.segundos) && registro.segundos > 0 &&
      Object.hasOwn(ajustes, registro.avaliacao) &&
      typeof registro.data === "string" && Number.isFinite(Date.parse(registro.data));
  }

  // Lê o histórico sem lançar erro por conteúdo inválido. Mantém os registros
  // válidos e informa quantos foram descartados. Erros do próprio storage
  // (acesso bloqueado) continuam sendo lançados.
  function carregarHistorico(storage) {
    const bruto = storage.getItem(chaveHistorico);
    if (bruto === null) return { registros: [], descartados: 0, ilegivel: false, bruto };
    let dados;
    try {
      dados = JSON.parse(bruto);
    } catch {
      return { registros: [], descartados: 0, ilegivel: true, bruto };
    }
    if (!Array.isArray(dados)) return { registros: [], descartados: 0, ilegivel: true, bruto };
    const ids = new Set();
    const registros = dados.filter(registro => {
      if (!registroValido(registro) || ids.has(registro.id)) return false;
      ids.add(registro.id);
      return true;
    });
    return { registros, descartados: dados.length - registros.length, ilegivel: false, bruto };
  }

  function tempoSugerido(registro) {
    const tempos = pontos[registro.ponto].tempos;
    return Math.max(tempos[0] * 60, Math.min(
      tempos[tempos.length - 1] * 60,
      registro.segundos + ajustes[registro.avaliacao]
    ));
  }

  // Salva a avaliação. Se o histórico estava ilegível ou tinha registros
  // inválidos, guarda uma cópia do texto original em outra chave e regrava só
  // os registros válidos, para que novas avaliações possam ser salvas.
  function salvarAvaliacao(storage, preparo, avaliacao) {
    const historico = carregarHistorico(storage);
    const registro = { ...preparo, avaliacao };
    if (!registroValido(registro)) throw new Error("Avaliação inválida");
    if (historico.registros.some(item => item.id === registro.id)) return { registro, novo: false };
    if (historico.ilegivel || historico.descartados) storage.setItem(chaveBackup, historico.bruto);
    storage.setItem(chaveHistorico, JSON.stringify([...historico.registros, registro]));
    return { registro, novo: true };
  }

  function formatarDuracao(segundos) {
    const minutos = Math.floor(segundos / 60);
    const resto = segundos % 60;
    return minutos + " min" + (resto ? " " + resto + " s" : "");
  }

  // Tempos em segundos, em ordem numérica crescente e sem repetição.
  function opcoesDeTempo(ponto, sugestao) {
    const segundos = ponto.tempos.map(minutos => minutos * 60);
    if (sugestao !== undefined) segundos.push(sugestao);
    return [...new Set(segundos)].sort((a, b) => a - b);
  }

  const api = {
    pontos, ajustes, chaveHistorico, chaveBackup,
    registroValido, carregarHistorico, tempoSugerido, salvarAvaliacao,
    formatarDuracao, opcoesDeTempo,
  };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else raiz.Ovinho = api;
})(globalThis);
