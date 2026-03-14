#!/bin/bash
# 项目启动脚本

echo "=========================================="
echo "代码托管平台 - 本地开发启动"
echo "=========================================="
echo ""

cd "D:\AI构建\系统\code-hosting-platform"

# 检查依赖
if [ ! -d "node_modules" ]; then
    echo "正在安装依赖..."
    pnpm install
fi

# 等待安装完成
echo "等待依赖安装完成..."
sleep 10

# 生成 Prisma Client
echo "生成 Prisma Client..."
pnpm prisma generate

# 数据库迁移
echo "初始化数据库..."
pnpm prisma migrate dev --name init

# 启动开发服务器
echo ""
echo "=========================================="
echo "启动开发服务器..."
echo "=========================================="
echo ""
echo "前端: http://localhost:3000"
echo "WebSocket: http://localhost:3001"
echo ""

pnpm dev
