import { GameRuleInfo } from '../types/deck';

export const GAME_RULES_DATABASE: GameRuleInfo[] = [
  {
    id: 'poker',
    title: 'Poker Texas Hold\'em',
    category: 'Cassino',
    players: '2 a 10 jogadores',
    deckType: 'Baralho padrão de 52 cartas (sem coringas)',
    objective: 'Construir a melhor combinação de 5 cartas usando suas 2 cartas fechadas e as 5 cartas comunitárias, ou forçar todos os oponentes a desistirem apostando.',
    overview: 'O estilo de Poker mais famoso do mundo. Combina matemática, psicologia, leitura de adversários e gerenciamento de fichas virtuais.',
    rules: [
      'Blinds: Os dois jogadores à esquerda do botão de dealer postam Small Blind e Big Blind.',
      'Pré-Flop: Cada jogador recebe 2 cartas fechadas. Primeira rodada de apostas (Fold, Call, Raise).',
      'Flop: O dealer abre 3 cartas comunitárias no centro. Segunda rodada de apostas.',
      'Turn: O dealer abre a 4ª carta comunitária. Terceira rodada de apostas (apostas dobradas em limite fixo).',
      'River: O dealer abre a 5ª e última comunitária. Última rodada de apostas.',
      'Showdown: Se restarem 2 ou mais jogadores, revelam as cartas. O jogador com a mão de 5 cartas de maior valor vence o pote total.'
    ],
    scoring: [
      'Royal Flush: A, K, Q, J, 10 do mesmo naipe (Imbatível).',
      'Straight Flush: Cinco cartas sequenciais do mesmo naipe (ex: 9, 8, 7, 6, 5 de Copas).',
      'Quadra (Four of a Kind): Quatro cartas de mesmo valor (ex: quatro Reis).',
      'Full House: Uma trinca combinada com um par (ex: três Damas e dois 10).',
      'Flush: Cinco cartas quaisquer do mesmo naipe sem sequência.',
      'Sequência (Straight): Cinco cartas sequenciais de naipes mistos (ex: 8, 7, 6, 5, 4).',
      'Trinca (Three of a Kind): Três cartas de mesmo valor.',
      'Dois Pares (Two Pair): Dois pares distintos (ex: Par de Áses e Par de Valetes).',
      'Par (One Pair): Duas cartas do mesmo valor.',
      'Carta Alta (High Card): Quando ninguém tem par ou combinação, a maior carta decide.'
    ],
    combinations: [
      { name: 'Royal Flush', description: 'A-K-Q-J-10 do mesmo naipe', payoutOrPoints: 'Probabilidade: 1 em 649.740' },
      { name: 'Straight Flush', description: '5 cartas sequenciais do mesmo naipe', payoutOrPoints: 'Probabilidade: 1 em 72.193' },
      { name: 'Quadra', description: '4 cartas idênticas', payoutOrPoints: 'Probabilidade: 1 em 4.165' },
      { name: 'Full House', description: 'Trinca + Par', payoutOrPoints: 'Probabilidade: 1 em 694' },
      { name: 'Flush', description: '5 cartas do mesmo naipe', payoutOrPoints: 'Probabilidade: 1 em 509' },
      { name: 'Sequência', description: '5 cartas em ordem de valor', payoutOrPoints: 'Probabilidade: 1 em 255' },
      { name: 'Trinca', description: '3 cartas de mesmo valor', payoutOrPoints: 'Probabilidade: 1 em 47' },
      { name: 'Dois Pares', description: 'Dois pares distintos', payoutOrPoints: 'Probabilidade: 1 em 21' },
      { name: 'Um Par', description: 'Duas cartas de mesmo valor', payoutOrPoints: 'Probabilidade: 1 em 2.4 (42%)' }
    ],
    tactics: [
      'Posição é poder: jogar por último (no Botão / Dealer) permite ver a ação de todos antes de decidir.',
      'Gerenciamento de fichas (Bankroll): nunca aposte todas as fichas virtuais em mãos marginais.',
      'Blefe com equidade (Semi-blefe): blefe quando ainda tiver chances de formar Flush ou Sequência no Turn/River.',
      'Pot Odds: compare o valor que precisa pagar com o tamanho total do pote para saber se vale o call.'
    ],
    aiAdvice: [
      {
        scenario: 'Você tem Par de Reis (K-K) pré-flop e um oponente agressivo aumenta 3x o Big Blind.',
        recommended: 'Re-aumentar (3-Bet) forte para 9x ou 10x.',
        explanation: 'K-K é a segunda melhor mão inicial de todo o poker. Deixar outros jogadores verem o Flop barato aumenta o risco de um Ás aparecer e te vencer. Isole o oponente com uma aposta agressiva.'
      },
      {
        scenario: 'No Flop você tem 4 cartas de Copas (Flush Draw). O pote tem $200 e o adversário aposta $20.',
        recommended: 'Pagar (Call).',
        explanation: 'Você tem 9 cartas que completam seu Flush (cerca de 35% de chance até o River). Pagar apenas $20 para disputar um pote de $220 oferece pot odds de 11:1, uma decisão matematicamente lucrativa.'
      }
    ]
  },
  {
    id: 'blackjack',
    title: 'Blackjack / 21',
    category: 'Cassino',
    players: '1 a 7 jogadores contra a Casa / Dealer',
    deckType: '1 a 8 baralhos padrão de 52 cartas',
    objective: 'Obter uma pontuação mais próxima de 21 do que o Dealer sem ultrapassar 21 (estourar).',
    overview: 'O jogo de cartas mais jogado em cassinos. Com a estratégia básica correta, a vantagem da casa cai para menos de 0,5%.',
    rules: [
      'Valores: Cartas de 2 a 10 valem seu valor de face. Valete, Dama e Rei valem 10. O Ás vale 1 ou 11 (a critério favorável do jogador).',
      'Início: O jogador faz a aposta. O Dealer entrega 2 cartas para o jogador (abertas) e 2 cartas para si (uma aberta e uma fechada).',
      'Blackjack Natural: Ter um Ás + carta de valor 10 nas 2 primeiras cartas paga 3 para 2 (3:2).',
      'Comandos: Hit (Pedir mais carta), Stand (Parar), Double Down (Dobrar aposta e receber exatamente mais 1 carta), Split (Dividir um par em duas mãos independentes).',
      'Regra do Dealer: O Dealer deve comprar cartas obrigatoriamente até somar pelo menos 17, e parar em 17 ou mais.'
    ],
    scoring: [
      'Blackjack: Ás + 10/J/Q/K (Paga 3:2)',
      'Vitória comum: Mão maior que a do Dealer até 21 (Paga 1:1)',
      'Empate (Push): Mesma pontuação do Dealer (Devolve a aposta)',
      'Derrota: Estourar (ultrapassar 21) ou somar menos que o Dealer'
    ],
    tactics: [
      'Nunca peça carta se você tem 12 ou mais e o Dealer mostra um 4, 5 ou 6 (ele tem altíssima chance de estourar).',
      'Sempre divida (Split) pares de Áses e pares de 8s.',
      'Nunca divida pares de 10s ou 5s (com dois 10s você já tem 20 garantido; com dois 5s, dobre a aposta).',
      'Dobre a aposta (Double Down) sempre que somar 11 contra qualquer carta do dealer que não seja um Ás.'
    ],
    aiAdvice: [
      {
        scenario: 'Sua mão é 16 (10 + 6) e o Dealer mostra um 7.',
        recommended: 'Pedir carta (Hit).',
        explanation: 'O 7 do Dealer o coloca em posição forte (costuma chegar a 17). Ficar no 16 quase sempre perde. Embora pedir arrisque estourar, matematicamente Hit reduz a perda no longo prazo.'
      },
      {
        scenario: 'Sua mão é 12 (8 + 4) e o Dealer mostra um 5.',
        recommended: 'Parar (Stand).',
        explanation: 'Com 5 aberto, o Dealer tem mais de 42% de chance de estourar ao ser obrigado a comprar até 17. Não arrisque sua mão; deixe o dealer estourar.'
      }
    ]
  },
  {
    id: 'truco_paulista',
    title: 'Truco Paulista',
    category: 'Truco',
    players: '2 ou 4 jogadores (duplas)',
    deckType: 'Baralho espanhol ou francês sem 8, 9, 10 e coringas (40 cartas)',
    objective: 'Vencer duas de três vazas por rodada para somar pontos e alcançar primeiro 12 pontos.',
    overview: 'A modalidade de Truco mais popular do Brasil. As manilhas mudam a cada rodada de acordo com a carta Vira!',
    rules: [
      'A Vira: O distribuidor vira uma carta no centro. As manilhas da rodada são a carta imediatamente seguinte na sequência (ex: se vira 7, a manilha é a Dama Q).',
      'Sequência de valores: 4, 5, 6, 7, Q, J, K, A, 2, 3 (a manilha é sempre a carta posterior à vira).',
      'Hierarquia dos Naipes nas Manilhas: Ouros < Espadas < Copas < Paus (Paus/Zap é a mais forte de todas).',
      'Vazas: Jogam-se até 3 vazas. Quem joga a carta mais forte leva a vaza. Quem vencer duas vazas leva a rodada.',
      'Gritos: TRUCO! (vale 3 pontos), SEIS! (vale 6 pontos), NOVE! (vale 9 pontos), DOZE! (vale o jogo todo!).',
      'Mão de 11: Se uma dupla chegar a 11 pontos, podem olhar as cartas um do outro antes de decidir se jogam ou correm (não se grita truco).'
    ],
    scoring: [
      'Rodada normal: 1 ponto',
      'Truco aceito: 3 pontos',
      'Seis aceito: 6 pontos',
      'Nove aceito: 9 pontos',
      'Doze aceito: 12 pontos'
    ],
    tactics: [
      'Fazer a Primeira: Ganhar a primeira vaza dá vantagem crucial, pois em caso de empate (canga), quem fez a primeira vence a rodada.',
      'Esconder a Manilha: Segure sua manilha forte para surpreender o adversário quando ele achar que já venceu.',
      'Blefe tático: Pedir Truco com carta fraca quando o adversário demonstra insegurança pode forçar a desistência dele.'
    ],
    aiAdvice: [
      {
        scenario: 'Você venceu a 1ª vaza, tem um Zap (Paus da manilha) na mão e a 2ª vaza está disputada.',
        recommended: 'Gritar TRUCO!',
        explanation: 'Com a 1ª vaza já ganha e a maior carta do jogo na mão (Zap), você tem 100% de garantia de vitória. Forçar o truco extrai 3 pontos se ele aceitar ou garante 1 ponto se ele correr.'
      }
    ]
  },
  {
    id: 'truco_mineiro',
    title: 'Truco Mineiro',
    category: 'Truco',
    players: '2 ou 4 jogadores',
    deckType: '40 cartas (sem 8, 9, 10)',
    objective: 'Chegar primeiro a 12 pontos através de vazas decididas com manilhas fixas.',
    overview: 'Muito tradicional em Minas Gerais. Diferente do Paulista, as manilhas NUNCA mudam: são sempre as 4 cartas sagradas!',
    rules: [
      'Manilhas Fixas (da mais fraca à mais forte): 7 de Ouros < Ás de Espadas (Espadilha) < 7 de Copas (Manilha) < 4 de Paus (Zap).',
      'Cartas comuns: 3 (maior comum), 2, A, K, J, Q, 7, 6, 5, 4 (menor comum).',
      'Não há carta vira. As 4 manilhas reinam absolutas todas as rodadas.',
      'Gritos: Truco vale 2 ou 3 pontos (dependendo do acordo da mesa), podendo ser repicado para 4, 6, 8, 10 e 12.'
    ],
    scoring: [
      'Rodada simples: 1 ponto',
      'Truco: 2 ou 4 pontos',
      'Queda de 12: vale a partida inteira'
    ],
    tactics: [
      'O 4 de Paus (Zap) é invencível. Guarde-o para a vaza decisiva.',
      'Se você tiver o Zap e a Espadilha, sua mão tem altíssima chance de fazer 2 vazas seguidas.'
    ],
    aiAdvice: [
      {
        scenario: 'Você tem a Espadilha (Ás de Espadas) e o adversário puxou um 3 na primeira vaza.',
        recommended: 'Cobrir com a Espadilha para matar o 3 dele.',
        explanation: 'No Truco Mineiro o 3 é a carta normal mais alta. Matar o 3 dele com a Espadilha anula o maior trunfo comum do adversário e garante a 1ª vaza.'
      }
    ]
  },
  {
    id: 'solitaire_klondike',
    title: 'Paciência Clássica (Klondike)',
    category: 'Paciência',
    players: '1 jogador',
    deckType: '1 baralho de 52 cartas',
    objective: 'Mover todas as 52 cartas para as 4 fundações (do Ás ao Rei por naipe).',
    overview: 'O clássico dos clássicos dos jogos solitários.',
    rules: [
      'Quadro (Tableau): 7 colunas em escada (1 a 7 cartas). As cartas do topo ficam abertas.',
      'Movimentação no Quadro: Sequência decrescente com alternância de cores (ex: 8 Vermelho sobre 9 Preto).',
      'Fundações: 4 pilhas no topo. Começam com o Ás e sobem em ordem crescente do mesmo naipe até o Rei (A, 2, 3... K).',
      'Monte de Compra (Stock): Cartas restantes viradas para baixo. Podem ser viradas de 1 em 1 ou de 3 em 3.',
      'Espaços Vazios: Colunas vazias no quadro só podem ser preenchidas por um Rei (K) ou sequência que inicie com Rei.'
    ],
    scoring: [
      'Carta movida para a Fundação: +10 pontos',
      'Carta virada no quadro: +5 pontos',
      'Completar o jogo: Pontuação máxima baseada no tempo e movimentos'
    ],
    tactics: [
      'Sempre revele cartas fechadas do quadro antes de tirar cartas do monte de compra.',
      'Libere colunas vazias para poder posicionar Reis e organizar longas sequências.'
    ],
    aiAdvice: [
      {
        scenario: 'Você pode mover um 6 Vermelho para um 7 Preto no quadro OU comprar do monte.',
        recommended: 'Mover o 6 no quadro.',
        explanation: 'Sempre priorize destapar cartas ocultas no quadro. Cada carta aberta abre novos caminhos e evita travamento.'
      }
    ]
  },
  {
    id: 'freecell',
    title: 'FreeCell',
    category: 'Paciência',
    players: '1 jogador',
    deckType: '52 cartas abertas',
    objective: 'Construir as 4 fundações de Ás ao Rei utilizando 4 células livres de apoio.',
    overview: '99.9% de todos os jogos de FreeCell são solucionáveis matematicamente! Exige pura estratégia.',
    rules: [
      'Todas as 52 cartas são distribuídas abertas em 8 colunas.',
      'Existem 4 células livres (Free Cells) que podem guardar 1 carta temporária cada.',
      'Movimentação de blocos de cartas depende da quantidade de células livres disponíveis.',
      'Fundações são construídas do Ás ao Rei por naipe.'
    ],
    scoring: ['Pontuação calculada por menor número de movimentos e tempo decorrido.'],
    tactics: ['Mantenha o máximo de células livres desocupadas para conseguir mover blocos maiores.'],
    aiAdvice: [
      {
        scenario: 'Você tem 3 células livres ocupadas e precisa organizar uma coluna.',
        recommended: 'Esvazie as células livres primeiro movendo cartas para fundações.',
        explanation: 'Células ocupadas reduzem seu poder de movimentação. Quanto mais livres, mais cartas você move em conjunto.'
      }
    ]
  },
  {
    id: 'spider',
    title: 'Paciência Spider',
    category: 'Paciência',
    players: '1 jogador',
    deckType: '2 baralhos (104 cartas) em 1, 2 ou 4 naipes',
    objective: 'Formar 8 sequências completas do Rei ao Ás do mesmo naipe para removê-las do jogo.',
    overview: 'Um dos jogos de paciência mais desafiadores e recompensadores.',
    rules: [
      '10 colunas no quadro com cartas viradas e abertas.',
      'Sequências podem ser montadas em qualquer naipe, mas apenas sequências do MESMO naipe podem ser movidas juntas.',
      'Ao completar Rei até Ás do mesmo naipe, a coluna é removida.',
      'Comprar adiciona 1 carta no topo de CADA uma das 10 colunas.'
    ],
    scoring: ['Começa com 500 pontos; cada movimento perde 1 ponto; cada sequência montada ganha 100 pontos.'],
    tactics: ['Tente liberar pelo menos uma coluna inteira para usar como área de transição temporária.'],
    aiAdvice: [
      {
        scenario: 'Você está prestes a clicar no monte para comprar 10 novas cartas.',
        recommended: 'Verifique se não há nenhum movimento ou destapamento pendente nas 10 colunas.',
        explanation: 'Comprar novas cartas cobre todas as colunas com cartas aleatórias. Garanta que todas as opções úteis foram executadas antes de comprar.'
      }
    ]
  },
  {
    id: 'buraco_canastra',
    title: 'Buraco / Canastra',
    category: 'Família',
    players: '2 ou 4 jogadores (duplas)',
    deckType: '2 baralhos com 4 coringas (108 cartas)',
    objective: 'Fazer canastras (jogos de 7 ou mais cartas), pegar o Morto e bater antes dos adversários.',
    overview: 'O jogo de cartas em família mais amado do Brasil. Combina estratégia de descarte e formação de jogos.',
    rules: [
      'Distribuição: 11 cartas para cada jogador e 2 montes de 11 cartas chamados "Mortos".',
      'Tipos de Jogos: Sequências do mesmo naipe (Ás ao Rei). O 2 funciona como coringa.',
      'Canastra Limpa: Jogo de 7 ou mais cartas sem coringa (vale 200 pontos).',
      'Canastra Suja: Jogo de 7 ou mais cartas com coringa (vale 100 pontos).',
      'O Morto: Quando um jogador esgota suas cartas pela primeira vez, pega o Morto.',
      'Batida Final: Para bater e fechar o jogo, é obrigatório ter pelo menos uma Canastra Limpa.'
    ],
    scoring: [
      'Canastra Limpa: +200 pontos',
      'Canastra Suja: +100 pontos',
      'Batida: +100 pontos',
      'Não pegar o Morto: -100 pontos de penalidade'
    ],
    tactics: [
      'Evite descartar cartas que facilitem o adversário pegar a lixeira cheia.',
      'Sempre tente transformar canastras sujas em limpas eliminando o coringa quando possível.'
    ],
    aiAdvice: [
      {
        scenario: 'O lixo tem 8 cartas e você tem uma trinca que permite comprar o lixo.',
        recommended: 'Comprar o lixo!',
        explanation: '8 cartas na mão dão enorme vantagem de matéria-prima para criar novas canastras e aproximar a batida.'
      }
    ]
  },
  {
    id: 'pife_cacheta',
    title: 'Pife / Cacheta',
    category: 'Família',
    players: '2 a 8 jogadores',
    deckType: '2 baralhos de 52 cartas + coringas',
    objective: 'Bater formando 3 trincas ou sequências com as 9 cartas da mão (ou 10 cartas na Cacheta).',
    overview: 'Rápido, dinâmico e tenso. O primeiro a fechar todas as combinações vence a rodada.',
    rules: [
      'Cada jogador recebe 9 cartas.',
      'Na sua vez: compra 1 carta (do monte ou do lixo) e descarta 1 carta.',
      'Jogos válidos: Sequências do mesmo naipe (ex: 4-5-6 de Espadas) ou Trincas de naipes diferentes (ex: 7-7-7).',
      'Bater: Quando as 9 cartas formam 3 jogos de 3 cartas perfeitos.'
    ],
    scoring: ['Quem bate ganha a rodada. Em torneios de pontos, quem acumula menor número de penalidades vence.'],
    tactics: ['Observe o que o jogador anterior descarta para prever que tipo de naipe ele não quer.'],
    aiAdvice: [
      {
        scenario: 'Você tem 8-9 de Ouros e um 7 de Ouros é descartado pelo jogador à sua esquerda.',
        recommended: 'Comprar do lixo!',
        explanation: 'Completar uma sequência aberta garante 1/3 do seu objetivo de vitória.'
      }
    ]
  },
  {
    id: 'rummy',
    title: 'Rummy Tradicional',
    category: 'Família',
    players: '2 a 6 jogadores',
    deckType: '1 ou 2 baralhos de 52 cartas',
    objective: 'Agrupar todas as cartas em combinações de sequências (Runs) e grupos de mesmo valor (Sets).',
    overview: 'O ancestral de jogos como Pife, Buraco e Gin Rummy. Jogado globalmente.',
    rules: [
      'Comprar do monte ou da pilha de descarte.',
      'Baixar combinações na mesa (Runs de mesmo naipe ou Sets de mesmo valor).',
      'Descartar 1 carta para encerrar o turno.'
    ],
    scoring: ['Cartas não combinadas contam pontos contra você quando alguém bate.'],
    tactics: ['Livre-se das cartas de alto valor (A, K, Q) primeiro se não tiver combinações viáveis.'],
    aiAdvice: [
      {
        scenario: 'Você tem um Rei avulso sem conexão e faltam poucas cartas para o oponente bater.',
        recommended: 'Descartar o Rei.',
        explanation: 'Reduz os pontos negativos da sua mão caso o oponente bata no próximo turno.'
      }
    ]
  },
  {
    id: 'copas',
    title: 'Copas (Hearts)',
    category: 'Vazas',
    players: '4 jogadores individuais',
    deckType: '52 cartas',
    objective: 'Evitar acumular cartas de Copas e especialmente a Dama de Espadas (Dama Negra), ou acertar a Lua!',
    overview: 'Jogo de evasão de pontos. Quem tiver a menor pontuação quando alguém atingir 100 vence.',
    rules: [
      'Cada carta de Copas vale 1 ponto de penalidade.',
      'A Dama de Espadas (Q♠) vale terríveis 13 pontos de penalidade.',
      'Obrigatório seguir o naipe puxado se tiver.',
      'Acertar a Lua (Shoot the Moon): Se você conseguir capturar TODAS as cartas de Copas + a Dama de Espadas, você ganha 0 pontos e TODOS os oponentes recebem 26 pontos de penalidade!'
    ],
    scoring: ['13 cartas de Copas = 1 ponto cada. Dama de Espadas = 13 pontos. Total por rodada = 26 pontos.'],
    tactics: ['Livre-se dos Áses e Reis de Espadas cedo para nunca ser forçado a capturar a Dama de Espadas.'],
    aiAdvice: [
      {
        scenario: 'Um jogador puxou Ouros e você não tem Ouros, mas tem a Dama de Espadas na mão.',
        recommended: 'Descartar a Dama de Espadas na vaza!',
        explanation: 'Momento perfeito para descarregar os 13 pontos de penalidade na mão do jogador que ganhar a vaza.'
      }
    ]
  },
  {
    id: 'espadas',
    title: 'Espadas (Spades)',
    category: 'Vazas',
    players: '4 jogadores em 2 duplas',
    deckType: '52 cartas',
    objective: 'Apostar exatamente quantas vazas sua dupla vai fazer e cumprir o contrato.',
    overview: 'Jogo de vazas clássico onde o naipe de Espadas é sempre o trunfo fixo supremo.',
    rules: [
      'Fase de Aposta (Bid): Cada jogador anuncia quantas vazas espera ganhar (de 0 a 13).',
      'Blind Nil / Nil: Apostar 0 vazas dá um bônus gigante de 100 pontos se cumprido, ou -100 se falhar.',
      'Espadas só podem ser jogadas quando "quebradas" (quando alguém não tiver o naipe puxado).'
    ],
    scoring: ['10 pontos por vaza apostada cumprida. Vazas extras (bags) acumulam penalidades a cada 10.'],
    tactics: ['Conte rigorosamente as cartas de Espadas já jogadas para saber quando seu trunfo é o maior.'],
    aiAdvice: [
      {
        scenario: 'Seu parceiro apostou Nil (zero vazas) e jogou uma carta média.',
        recommended: 'Cubra a jogada com uma carta alta para ganhar a vaza e protegê-lo.',
        explanation: 'Seu objetivo primordial é impedir que seu parceiro ganhe qualquer vaza.'
      }
    ]
  },
  {
    id: 'sueca_bisca',
    title: 'Sueca / Bisca',
    category: 'Vazas',
    players: '4 jogadores em duplas (Sueca) ou 2 jogadores (Bisca)',
    deckType: '40 cartas',
    objective: 'Somar mais de 60 pontos capturando cartas valiosas nas vazas.',
    overview: 'O jogo de cartas mais tradicional de Portugal e do Brasil colonial. O valor das cartas não segue a ordem numérica comum!',
    rules: [
      'Valores dos Pontos: Ás vale 11 pontos, 7 (Manilha) vale 10 pontos, Rei vale 4 pontos, Valete vale 3 pontos, Dama vale 2 pontos. Demais valem 0.',
      'Total de pontos no jogo: 120 pontos. Quem fizer 61 ou mais ganha a rodada.',
      'Goleada / Capote: Fazer mais de 90 pontos vale 2 marcas; fazer todos os 120 pontos (Bandeira) vale 4 marcas.'
    ],
    scoring: ['Ás = 11 pts, 7 = 10 pts, K = 4 pts, J = 3 pts, Q = 2 pts. Total: 120 pts.'],
    tactics: ['Puxe trunfos cedo se tiver a maioria para desarmar os adversários de cortar suas cartas de ponto.'],
    aiAdvice: [
      {
        scenario: 'Seu parceiro puxou uma vaza e você tem o Ás do mesmo naipe.',
        recommended: 'Jogar o Ás para garantir os 11 pontos da vaza.',
        explanation: 'O Ás é a carta mais valiosa da Sueca. Garantir a vaza do parceiro pontua diretamente.'
      }
    ]
  },
  {
    id: 'escopa',
    title: 'Escopa de 15',
    category: 'Família',
    players: '2 a 4 jogadores',
    deckType: '40 cartas',
    objective: 'Capturar cartas da mesa cuja soma com a carta jogada seja exatamente 15.',
    overview: 'Jogo tradicional ítalo-brasileiro. Fazer "Escopa" (limpar a mesa toda) dá ponto extra imediato!',
    rules: [
      'Cartas valem seu número; figuras valem: Valete = 8, Dama = 9, Rei = 10.',
      'Se você jogar uma carta e somar 15 com uma ou mais cartas da mesa, você captura todas.',
      'Escopa: Limpar a mesa inteira ao capturar marca 1 ponto imediato (a carta fica virada de lado).',
      'Pontos especiais no final: Maioria de cartas, maioria de Ouros, 7 de Ouros (Sette Bello), Primera (melhores 7s).'
    ],
    scoring: ['Sette Bello (7 de Ouros) = 1 pt, Ouros = 1 pt, Cartas = 1 pt, Primera = 1 pt, Cada Escopa = 1 pt.'],
    tactics: ['Tente nunca deixar a soma das cartas da mesa abaixo de 15 para evitar dar Escopa ao adversário.'],
    aiAdvice: [
      {
        scenario: 'A mesa tem um 8 e você tem um 7 de Ouros na mão.',
        recommended: 'Jogar o 7 de Ouros (8 + 7 = 15) e capturar!',
        explanation: 'Garante o 7 de Ouros (Sette Bello) para sua contagem final e pode fazer Escopa.'
      }
    ]
  },
  {
    id: 'mau_mau_oito_maluco',
    title: 'Mau-Mau / Oito Maluco (Crazy Eights)',
    category: 'Família',
    players: '2 a 8 jogadores',
    deckType: '52 cartas',
    objective: 'Descartar todas as cartas da mão primeiro, combinando naipe ou valor com a carta do topo.',
    overview: 'O precursor direto do jogo UNO. Cheio de cartas de ação e reviravoltas hilárias.',
    rules: [
      'Combinar carta por naipe (ex: Ouros com Ouros) ou por valor (ex: 5 com 5).',
      'Cartas Especiais:',
      '  - 8: Oito Maluco (Muda o naipe para o que o jogador escolher).',
      '  - Valete (J): Pula o próximo jogador.',
      '  - Dama (Q): Inverte o sentido do jogo.',
      '  - 7: Próximo jogador compra 2 cartas (ou acumula se jogar outro 7).',
      '  - Ás (A): Faz o próximo jogador comprar 1 carta ou passar.',
      'Avisar "ÚLTIMA CARTA" ou "MAU-MAU" quando restar apenas 1 carta na mão (senão compra penalidade!).'
    ],
    scoring: ['Quem zerar as cartas vence a rodada.'],
    tactics: ['Guarde os 8s para o final, pois podem ser jogados sobre qualquer carta e garantir sua batida.'],
    aiAdvice: [
      {
        scenario: 'Você só tem duas cartas: um 8 e um 3 de Copas. A mesa está em Espadas.',
        recommended: 'Jogar o 8, mudar o naipe para Copas e cantar "ÚLTIMA CARTA"!',
        explanation: 'Prepara sua mão perfeitamente para bater na próxima rodada com o 3 de Copas.'
      }
    ]
  },
  {
    id: 'war_batalha',
    title: 'War / Guerra de Cartas (Batalha)',
    category: 'Vazas',
    players: '2 jogadores',
    deckType: '52 cartas divididas igualmente (26 para cada)',
    objective: 'Conquistar todas as cartas do baralho vencendo confrontos diretos carta a carta.',
    overview: 'Jogo de ritmo acelerado e pura emoção. Quando duas cartas iguais se chocam, estoura a GUERRA!',
    rules: [
      'Cada jogador vira a carta do topo do seu monte ao mesmo tempo.',
      'A carta de maior valor ganha ambas as cartas e as coloca no fundo do seu monte.',
      'Hierarquia: 2 (mais fraca) até Ás (mais forte).',
      'A GUERRA (Empate): Se as duas cartas tiverem o mesmo valor:',
      '  1. Cada jogador coloca 1 carta virada para baixo (tributo de guerra).',
      '  2. Em seguida, colocam 1 carta virada para cima para a batalha decisiva.',
      '  3. Quem vencer essa batalha leva TODAS as cartas acumuladas na mesa (pelo menos 6 cartas de uma vez!).'
    ],
    scoring: ['Quem capturar todas as 52 cartas vence a partida.'],
    tactics: ['Gerencie o ritmo das cartas e vibre nas guerras decisivas com Áses e Reis.'],
    aiAdvice: [
      {
        scenario: 'Empate de Reis! Guerra declarada.',
        recommended: 'Virar a carta de tributo e preparar a batalha final.',
        explanation: 'Guerras são o momento de virada no jogo, onde um jogador pode virar o placar instantaneamente.'
      }
    ]
  }
];
