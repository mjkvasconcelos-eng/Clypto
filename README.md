# CryptoMarket AI

MVP de um robô de pesquisa e análise técnica de criptomoedas.

## O que já funciona
- Preço e variação de 24h
- Volume
- Histórico de candles
- Gráfico
- SMA 20 e SMA 50
- RSI 14
- MACD
- Volatilidade
- Leitura automática de tendência
- Interface responsiva para celular

## Como executar
Abra `index.html` em um navegador moderno. Para evitar restrições de CORS em alguns ambientes, prefira servir a pasta com um servidor local, por exemplo:

`python -m http.server 8080`

Depois acesse `http://localhost:8080`.

## Próxima etapa: pesquisa de mercado com IA
Para transformar este MVP em um robô completo, adicione um backend (Firebase Functions, Node.js ou similar) para:
1. coletar notícias;
2. normalizar fontes;
3. classificar sentimento;
4. armazenar histórico;
5. criar alertas;
6. gerar relatórios com IA;
7. autenticar usuários.

## Firebase
O projeto ainda não coloca chaves Firebase no código. Isso é intencional: as credenciais devem ser configuradas no seu próprio projeto e as regras do Firestore devem ser definidas antes de armazenar dados de usuários.

## Aviso
Dados de mercado podem atrasar, falhar ou sofrer alterações. Indicadores técnicos não garantem resultados. O aplicativo é uma ferramenta informativa e não substitui aconselhamento financeiro profissional.
