# 代码托管平台 - 本地开发启动脚本

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "代码托建平台 - 本地开发启动" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# 进入项目目录
Set-Location "D:\AI构建\系统\code-hosting-platform"

# 检查依赖
if (-not (Test-Path "node_modules")) {
    Write-Host "正在安装依赖（第一次启动可能需要 3-5 分钟）..." -ForegroundColor Yellow
    pnpm install
    Write-Host "✓ 依赖安装完成" -ForegroundColor Green
} else {
    Write-Host "✓ 依赖已安装" -ForegroundColor Green
}

Write-Host ""
Write-Host "初始化数据库..." -ForegroundColor Yellow

# 生成 Prisma Client  
Write-Host "  1/2 生成 Prisma Client..." -ForegroundColor Gray
& node_modules\.bin\prisma.ps1 generate 2>$null

# 运行数据库迁移
Write-Host "  2/2 创建数据库表..." -ForegroundColor Gray
Write-Host "" | & node_modules\.bin\prisma.ps1 migrate dev --name init 2>$null

Write-Host "✓ 数据库初始化完成" -ForegroundColor Green
Write-Host ""

# 显示启动信息
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "启动开发服务器..." -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "📱 前端应用: http://localhost:3000" -ForegroundColor Cyan
Write-Host "🔌 WebSocket: ws://localhost:3001" -ForegroundColor Cyan
Write-Host ""
Write-Host "默认账号: alice@example.com / password123" -ForegroundColor Yellow
Write-Host "         bob@example.com / password123" -ForegroundColor Yellow
Write-Host ""
Write-Host "按 Ctrl+C 停止服务器" -ForegroundColor Gray
Write-Host ""

# 启动开发服务器
pnpm dev
