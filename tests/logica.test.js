const test = require("node:test");
const assert = require("node:assert/strict");
const L = require("../logica.js");

function storageFalso(inicial = {}) {
  const dados = new Map(Object.entries(inicial));
  return {
    getItem: chave => (dados.has(chave) ? dados.get(chave) : null),
    setItem: (chave, valor) => dados.set(chave, String(valor)),
  };
}

const registro = (extra = {}) => ({
  id: "a", ponto: "duro", segundos: 480, avaliacao: "no-ponto",
  data: "2026-11-19T12:00:00.000Z", ...extra,
});
const preparo = (extra = {}) => {
  const { avaliacao, ...resto } = registro(extra);
  return resto;
};

test("os três tipos de avaliação ajustam 0, -30 e +30 segundos", () => {
  assert.equal(L.tempoSugerido(registro({ avaliacao: "no-ponto" })), 480);
  assert.equal(L.tempoSugerido(registro({ avaliacao: "mais-passado" })), 450);
  assert.equal(L.tempoSugerido(registro({ avaliacao: "menos-passado" })), 510);
});

test("a sugestão respeita os limites mínimo e máximo de cada ponto", () => {
  assert.equal(L.tempoSugerido(registro({ ponto: "duro", segundos: 360, avaliacao: "mais-passado" })), 360);
  assert.equal(L.tempoSugerido(registro({ ponto: "duro", segundos: 600, avaliacao: "menos-passado" })), 600);
  assert.equal(L.tempoSugerido(registro({ ponto: "quente", segundos: 180, avaliacao: "mais-passado" })), 180);
  assert.equal(L.tempoSugerido(registro({ ponto: "quente", segundos: 240, avaliacao: "menos-passado" })), 240);
  // reinício somado pode passar do limite: a sugestão volta para a faixa
  assert.equal(L.tempoSugerido(registro({ ponto: "quente", segundos: 450 })), 240);
});

test("opções de tempo ficam em ordem numérica, incluindo meio minuto", () => {
  assert.deepEqual(L.opcoesDeTempo(L.pontos.duro, 570), [360, 420, 480, 540, 570, 600]);
  assert.deepEqual(L.opcoesDeTempo(L.pontos.duro, 390), [360, 390, 420, 480, 540, 600]);
  assert.deepEqual(L.opcoesDeTempo(L.pontos.quente, 210), [180, 210, 240]);
  assert.deepEqual(L.opcoesDeTempo(L.pontos.duro, 480), [360, 420, 480, 540, 600]);
  assert.deepEqual(L.opcoesDeTempo(L.pontos.quente), [180, 240]);
  assert.equal(L.formatarDuracao(210), "3 min 30 s");
});

test("histórico ausente devolve lista vazia", () => {
  const h = L.carregarHistorico(storageFalso());
  assert.deepEqual([h.registros, h.descartados, h.ilegivel], [[], 0, false]);
});

test("JSON quebrado ou que não é lista é tratado como ilegível", () => {
  for (const bruto of ["{quebrado", '{"a":1}', "null"]) {
    const h = L.carregarHistorico(storageFalso({ [L.chaveHistorico]: bruto }));
    assert.equal(h.ilegivel, true, bruto);
    assert.deepEqual(h.registros, []);
  }
});

test("registros inválidos são descartados e os válidos preservados", () => {
  const lixo = [null, 7, "x", {}, registro({ id: "b", ponto: "mole" }),
    registro({ id: "c", segundos: -5 }), registro({ id: "d", avaliacao: "otimo" }),
    registro({ id: "e", data: "ontem" }), registro({ id: "a" })];
  const bruto = JSON.stringify([registro(), registro({ id: "f", ponto: "quente", segundos: 200 }), ...lixo]);
  const h = L.carregarHistorico(storageFalso({ [L.chaveHistorico]: bruto }));
  assert.deepEqual(h.registros.map(r => r.id), ["a", "f"]);
  assert.equal(h.descartados, lixo.length);
  assert.equal(h.ilegivel, false);
});

test("salvar sem histórico cria a lista", () => {
  const s = storageFalso();
  assert.equal(L.salvarAvaliacao(s, preparo(), "no-ponto").novo, true);
  assert.equal(JSON.parse(s.getItem(L.chaveHistorico)).length, 1);
});

test("salvar após JSON quebrado funciona e guarda cópia do original", () => {
  const s = storageFalso({ [L.chaveHistorico]: "{quebrado" });
  L.salvarAvaliacao(s, preparo(), "mais-passado");
  assert.deepEqual(JSON.parse(s.getItem(L.chaveHistorico)).map(r => r.avaliacao), ["mais-passado"]);
  assert.equal(s.getItem(L.chaveBackup), "{quebrado");
  // a próxima avaliação continua sendo salva normalmente
  L.salvarAvaliacao(s, preparo({ id: "b" }), "no-ponto");
  assert.equal(JSON.parse(s.getItem(L.chaveHistorico)).length, 2);
});

test("salvar após registro inválido mantém os válidos", () => {
  const bruto = JSON.stringify([registro({ id: "ok" }), { id: 1 }]);
  const s = storageFalso({ [L.chaveHistorico]: bruto });
  L.salvarAvaliacao(s, preparo({ id: "novo" }), "menos-passado");
  assert.deepEqual(JSON.parse(s.getItem(L.chaveHistorico)).map(r => r.id), ["ok", "novo"]);
  assert.equal(s.getItem(L.chaveBackup), bruto);
});

test("a mesma avaliação não é salva duas vezes", () => {
  const s = storageFalso();
  L.salvarAvaliacao(s, preparo(), "no-ponto");
  assert.equal(L.salvarAvaliacao(s, preparo(), "no-ponto").novo, false);
  assert.equal(JSON.parse(s.getItem(L.chaveHistorico)).length, 1);
});
