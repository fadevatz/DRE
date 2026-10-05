# ==========================================
# Estágio 1: Build do Frontend (Vite + React)
# ==========================================
FROM node:20-alpine AS builder

WORKDIR /app

# Copia arquivos de dependência
COPY package*.json ./

# Instala todas as dependências necessárias para o build
RUN npm install

# Copia todo o código fonte
COPY . .

# Compila o frontend para a pasta dist/
RUN npm run build

# ==========================================
# Estágio 2: Runtime de Produção (Express Server)
# ==========================================
FROM node:20-alpine AS runner

WORKDIR /app

# Variáveis de ambiente padrão
ENV NODE_ENV=production
ENV PORT=3001

# Copia package.json para instalar apenas dependências de produção
COPY package*.json ./
RUN npm install --omit=dev

# Copia o backend
COPY server/ ./server/

# Copia o build estático gerado no estágio anterior
COPY --from=builder /app/dist ./dist

# Cria usuário não-root para segurança
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
RUN chown -R appuser:appgroup /app
USER appuser

# Expõe a porta do servidor
EXPOSE 3001

# Comando de inicialização
CMD ["node", "server/index.js"]

