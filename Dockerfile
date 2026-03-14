# 基础镜像
FROM node:20-alpine AS base

# 安装 pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# 依赖阶段
FROM base AS deps
WORKDIR /app

COPY package.json pnpm-lock.yaml* ./
RUN pnpm install --frozen-lockfile

# 构建阶段
FROM base AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# 生成 Prisma 客户端
RUN pnpm prisma:generate

# 构建应用
RUN pnpm build

# 生产阶段
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

# 创建非 root 用户
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/prisma ./prisma

USER nextjs

EXPOSE 3000

ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

CMD ["node", "server.js"]
