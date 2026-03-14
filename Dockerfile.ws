# WebSocket 服务器 Dockerfile
FROM node:20-alpine

# 安装 pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# 复制依赖文件
COPY package.json pnpm-lock.yaml* ./
COPY server/package.json ./server/

# 安装依赖
RUN pnpm install --frozen-lockfile

# 复制服务器代码
COPY server ./server

# 构建服务器
RUN pnpm --filter server build || cd server && npx tsc

EXPOSE 3001

CMD ["node", "server/dist/index.js"]
