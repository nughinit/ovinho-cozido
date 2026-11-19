# Ovinho Cozido

Um guia interativo que acompanha o preparo de um ovo cozido. A pessoa escolhe o ponto pela aparência da gema, ferve a água, adiciona o ovo e recebe um aviso ao fim do cozimento.

## Decisões de interface

- **Ponto ilustrado.** Os desenhos e os rótulos “gema mole” e “gema firme” ajudam a entender o resultado antes de escolher.
- **Preparo em etapas.** “Ferveu” e “Coloquei” ligam o fluxo do app a ações na cozinha. A confirmação “Coloquei” inicia a contagem.
- **Tempo à vista.** A contagem usa um horário de término para se atualizar ao voltar à aba. O aviso visual indica como finalizar cada ponto, com um som opcional quando o navegador permite.
- **Preferência aprendida.** Depois de provar, a pessoa avalia se ficou no ponto, mais passado ou menos passado do que gosta. O próximo preparo do mesmo ponto mantém o tempo ou ajusta 30 segundos, dentro da faixa disponível.

O histórico é salvo no navegador em `localStorage`, na chave `ovinho.historico.v1`. Cada registro contém um identificador de preparo, ponto escolhido, segundos contados, data de conclusão e avaliação. Reiniciar a contagem soma o período já contado ao tempo registrado. Limpar os dados do navegador apaga esse histórico. A sugestão usa a avaliação mais recente de cada ponto.

As faixas de tempo vieram da página “Como cozinhar ovos”, do Le Cordon Bleu, usada como referência de preparo. Neste fluxo, a contagem começa com a confirmação de que o ovo entrou na água.

## Como testar

Abra [home.html](home.html) no navegador. O app foi feito em HTML, CSS, SVG e JavaScript, sem instalação de dependências.
