# Painel Financeiro & DRE (Demonstrativo do Resultado do Exercício)

Sistema financeiro completo desenvolvido para operar diretamente com as tabelas `pagar` e `planocontas` em servidor MariaDB local, com suporte a **Regime de Competência** e **Regime de Caixa**.

---

## 🎯 Recursos Principais

1. **Design Fiel ao Layout de Referência**:
   - Barra superior com status da conexão em tempo real, botão de configuração MariaDB, alternância rápida de regime e perfil.
   - Bloco de **Filtros de Análise** com seleção de Filial, datas (inicial/final) e campo de busca rápida com botão de limpar.
   - **4 Cards KPI Superiores**:
     - **Card 1 (Azul)**: Total de Despesas / Faturamento, valor do documento, descontos totais e ticket médio.
     - **Card 2 (Verde)**: Despesas Pagas (Realizado), percentual do total, descontos e quantidade de títulos.
     - **Card 3 (Azul Claro)**: Contas a Pagar (Pendente), títulos vencidos, a vencer e em aberto.
     - **Card 4 (Roxo)**: Encargos, Juros & Taxas de Boletos / Despesas acessórias.

2. **DRE Completo com Dois Regimes**:
   - **Regime de Competência**: Considera os títulos por data de competência (`dt_competencia` / `dt_emissao`), apresentando as despesas incorridas no período.
   - **Regime de Caixa**: Considera estritamente os títulos efetivamente pagos (`dt_pgto`) e os valores desembolsados (`valor_pago`).
   - Visão agrupada por níveis do Plano de Contas com subtotais, cálculo de percentual de representatividade (`% DRE`) e botões para expandir/recolher grupos.
   - Exportação direta do DRE para planilha Excel (`.xlsx`).

3. **Gráficos e Análise Visual**:
   - Gráfico de linha/área temporal com volume de despesas por data/período.
   - Ranking por categoria do plano de contas com barras de participação percentual.

4. **Auditoria e Detalhamento de Lançamentos**:
   - Tabela analítica com paginação contendo todos os dados da tabela `pagar` com cruzamento de campos da tabela `planocontas` (Filial, NF, Histórico, Fornecedor/Cedente, Vencimento, Pagamento, Competência, Status Pago/Aberto/Vencido).

5. **Configuração Dinâmica do MariaDB**:
   - Modal com campos para Host, Porta, Banco de Dados, Usuário e Senha.
   - Teste de conexão em tempo real com validação das tabelas `pagar` e `planocontas`.
   - Botão para criar e popular tabelas de teste caso o banco esteja novo.

---

## 🚀 Como Executar

### Pré-requisitos
- Node.js instalado (v18 ou superior).
- Servidor MariaDB rodando (local ou remoto).

### Instalação das Dependências
```bash
npm install
```

### Inicialização do Sistema
Para rodar em modo de desenvolvimento com hot-reload:
```bash
npm run dev
```

Para rodar em modo de produção:
```bash
npm start
```
O sistema estará disponível em: **`http://localhost:3001`** (ou `http://localhost:5173` no modo dev do Vite).

---

## 🐳 Deploy com Docker

### 1. Construir e Rodar com Dockerfile
```bash
# Construir a imagem
docker build -t dre-financeiro .

# Rodar o container expondo a porta 3001
docker run -d -p 3001:3001 --name dre_financeiro dre-financeiro
```

### 2. Rodar com Docker Compose
```bash
docker compose up -d --build
```
Acesse em: `http://localhost:3001`

---

## 🗄️ Estrutura das Tabelas MariaDB Suportadas

### Tabela `pagar`
- `filial_id`, `pagar_id`, `dt_emissao`, `dtvenc`, `NF`, `fornece_id`, `historico`, `valor`, `valor_pago`, `dt_pgto`, `dt_competencia`, `planocontas_id`, `despesas`, `acrescimos`, `descontos`, `valor_doc`, `taxa_boleto`, `nome_razao_cedente`, `apagado`.

### Tabela `planocontas`
- `planocontas_id`, `codigo`, `descricao`, `totalizador`, `operacao`, `opdesp`, `apagado`.

