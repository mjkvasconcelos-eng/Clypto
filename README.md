# Clypto — CryptoMarket AI 2.1

Dashboard web para pesquisa e análise de criptomoedas, agora com **notícias + IA + sentimento + alertas + Firebase**.

## 2.1 — robô de pesquisa
- Mantém o scanner técnico da 2.0 para BTC, ETH, SOL, BNB, XRP, ADA, DOGE, AVAX, LINK e DOT.
- Pesquisa automática de notícias recentes via GDELT.
- Classificação inicial de sentimento por regras, por notícia e agregada por ativo.
- Relatório de pesquisa com IA usando Gemini, executado no backend para não expor a chave no navegador.
- Cache da pesquisa no Firestore.
- `researchScheduler`: atualiza os 10 ativos a cada 15 minutos.
- Alertas personalizados de preço armazenados no Firestore.
- `alertScheduler`: verifica alertas a cada 5 minutos e marca os que foram atingidos.
- Firebase Authentication anônimo para separar alertas por usuário.
- Firebase Hosting com rewrite `/api/**` para a Cloud Function.
- Branch de desenvolvimento: `v2.1-research-bot`.

## Arquitetura

```text
Binance ───────────────┐
GDELT Notícias ────────┼──> Firebase Functions ──> Firestore
Gemini IA ─────────────┘             │
                                     └──> /api/research + /api/alerts
                                               │
                                         Clypto Web App
```

## Configuração Firebase

1. Crie/seleciona um projeto no Firebase.
2. Ative **Authentication > Anonymous**.
3. Crie o **Firestore Database**.
4. Substitua os valores de `js/firebase-init.js` pelos dados do seu Web App Firebase.
5. Instale a Firebase CLI e associe o projeto:

```bash
firebase login
firebase use --add
```

6. Instale as dependências:

```bash
cd functions
npm install
cd ..
```

7. Configure a chave da IA como secret, nunca no frontend:

```bash
firebase functions:secrets:set GEMINI_API_KEY
```

Opcionalmente, defina `GEMINI_MODEL` no ambiente das Functions. O código usa `gemini-2.5-flash` como padrão.

8. Publique:

```bash
firebase deploy
```

## Desenvolvimento local

Para testar somente a interface técnica, continue usando:

```bash
python -m http.server 8080
```

Para testar Firebase Functions/Firestore localmente, use:

```bash
cd functions
npm install
npm run serve
```

Em produção, o Hosting encaminha `/api/**` para a Function `api` na região `southamerica-east1`.

## Segurança

- A chave Gemini fica somente no Secret Manager das Functions.
- Alertas são vinculados ao `uid` autenticado.
- As regras do Firestore impedem escrita direta em `research` pelo cliente.
- O Clypto não executa ordens e não faz custódia de ativos.
- Antes de colocar em produção, recomenda-se adicionar monitoramento de custos, limites de requisição e testes automatizados.

## Aviso

Indicadores técnicos, notícias, sentimento e relatórios de IA são ferramentas informativas. Eles podem estar incompletos, atrasados ou incorretos e não constituem recomendação financeira.
