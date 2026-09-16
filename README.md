# Clypto — CryptoMarket AI 2.0

Dashboard web para pesquisa e análise técnica de criptomoedas.

## 2.0 — o que foi adicionado
- Scanner automático de 10 ativos: BTC, ETH, SOL, BNB, XRP, ADA, DOGE, AVAX, LINK e DOT.
- Score técnico de 0 a 6 baseado em preço vs. SMA20/SMA50, cruzamento de médias, RSI, MACD e volume.
- Tabela comparativa do scanner.
- Leitura técnica individual com gráfico.
- Interface responsiva para celular.
- Código separado em `index.html`, `css/style.css` e `js/app.js`.
- Branch de desenvolvimento: `v2.0-scanner`.

## Fonte de dados
A versão 2.0 usa a API pública da Binance diretamente no navegador para ticker de 24h e candles. Não há execução de ordens nem custódia de ativos.

## Como executar
Sirva a pasta com um servidor local, por exemplo:

```bash
python -m http.server 8080
```

Abra `http://localhost:8080`.

## Próxima fase
- Backend/Firebase Functions para tarefas agendadas.
- Cache e histórico no Firestore.
- Notícias e classificação de sentimento.
- Alertas personalizados.
- Autenticação e favoritos.
- Relatórios gerados por IA.
- Testes automatizados e tratamento de limites de API.

## Aviso
Indicadores técnicos são ferramentas de análise e não garantem resultados. O Clypto é informativo e não constitui recomendação financeira.
