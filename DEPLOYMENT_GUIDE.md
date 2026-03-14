# CodeHost 本地部署指南

## 📋 系统要求

- Node.js >= 18.0.0 ✓ (已安装 v20.13.1)
- PostgreSQL >= 14 ❌ (需要安装)
- pnpm 或 npm ✓ (已有 npm 10.5.2)

## 🔧 部署步骤

### 第1步：安装 PostgreSQL

#### Windows 用户 (推荐使用 Docker)

**选项 A: 使用 Docker Compose (推荐，最简单)**

```powershell
# 确保 Docker Desktop 已安装
docker --version

# 使用 Docker Compose 启动 PostgreSQL
docker-compose up -d postgres
```

**选项 B: 直接安装 PostgreSQL**

1. 访问 https://www.postgresql.org/download/windows/
2. 下载最新版本的 PostgreSQL
3. 安装时记住：
   - 超级用户密码：`codehost_password`
   - 端口：5432

4. 验证安装：
```powershell
psql --version
```

---

### 第2步：安装项目依赖

```powershell
cd "D:\AI构建\系统\code-hosting-platform"

# 安装 pnpm (推荐)
npm install -g pnpm

# 安装项目依赖
pnpm install

# 或使用 npm
npm install
```

---

### 第3步：配置环境变量

```powershell
# 复制环境变量示例文件
Copy-Item .env.example .env

# 编辑 .env 文件 (使用记事本或你喜欢的编辑器)
notepad .env
```

编辑后的 `.env` 应该看起来像这样：

```env
# 数据库 (如果使用 Docker)
DATABASE_URL="postgresql://codehost:codehost_password@localhost:5432/code_hosting"

# 或者如果直接安装了 PostgreSQL，使用你的凭据
# DATABASE_URL="postgresql://postgres:your_password@localhost:5432/code_hosting"

# 认证
JWT_SECRET="your-super-secret-jwt-key-12345"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-nextauth-secret-67890"

# WebSocket
NEXT_PUBLIC_WS_URL="http://localhost:3001"
WS_PORT=3001

# 客户端
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

---

### 第4步：初始化数据库

```powershell
# 生成 Prisma 客户端
pnpm prisma:generate

# 运行数据库迁移 (创建表结构)
pnpm prisma:migrate

# 播种示例数据 (可选)
pnpm prisma:seed
```

---

### 第5步：启动开发服务器

```powershell
# 同时启动 Next.js 和 WebSocket 服务器
pnpm dev
```

你应该会看到：
```
▲ Next.js 14.x
  - Local: http://localhost:3000
  - Environments: .env.local

🚀 WebSocket 服务器运行在 http://localhost:3001
```

---

## 🧪 测试应用

1. **访问应用**：打开浏览器访问 http://localhost:3000

2. **创建账户**：
   - 点击「开始使用」按钮
   - 填写邮箱、密码、名称
   - 注册新账户

3. **或使用示例账户**（如果运行了 seed 脚本）：
   - 邮箱：alice@example.com
   - 密码：password123

4. **创建项目**：
   - 点击「新建项目」
   - 填写项目信息
   - 创建完成

---

## 🐳 使用 Docker Compose 部署 (完整方案)

```powershell
# 一键启动完整应用（数据库 + 应用 + WebSocket）
docker-compose up -d

# 查看日志
docker-compose logs -f

# 停止应用
docker-compose down
```

---

## 📊 数据库管理

### 使用 Prisma Studio (推荐)

```powershell
pnpm prisma:studio
```

这会打开一个可视化界面来管理数据库，网址：http://localhost:5555

### 使用 pgAdmin (Web 界面)

如果使用 Docker Compose，可以添加 pgAdmin：

```yaml
# 在 docker-compose.yml 中添加
pgadmin:
  image: dpage/pgadmin4
  environment:
    PGADMIN_DEFAULT_EMAIL: admin@example.com
    PGADMIN_DEFAULT_PASSWORD: admin
  ports:
    - "5050:80"
  depends_on:
    - postgres
```

然后访问 http://localhost:5050

---

## 🆘 故障排查

### 问题 1: PostgreSQL 连接失败

**错误信息**: `Error: connect ECONNREFUSED 127.0.0.1:5432`

**解决方案**：
```powershell
# 如果使用本地安装，检查 PostgreSQL 是否在运行
# Windows: 检查服务管理器中是否有 "PostgreSQL" 服务运行

# 如果使用 Docker:
docker ps | grep postgres
docker-compose up -d postgres
```

### 问题 2: 端口已被占用

**错误信息**: `Error: listen EADDRINUSE :::3000`

**解决方案**：
```powershell
# 查找占用端口 3000 的进程
netstat -ano | findstr :3000

# 杀死该进程 (替换 PID)
taskkill /PID <PID> /F
```

### 问题 3: Node modules 问题

```powershell
# 删除 node_modules 和 lock 文件后重新安装
rm -r node_modules
rm pnpm-lock.yaml  # 或 package-lock.json

pnpm install
```

### 问题 4: 数据库迁移失败

```powershell
# 重置数据库
pnpm prisma migrate reset

# 或手动删除表后重新迁移
# 连接到数据库后运行 DROP DATABASE code_hosting;
```

---

## 📝 项目结构快速参考

```
code-hosting-platform/
├── src/app/             # Next.js 页面和 API 路由
│   ├── api/            # 后端 API
│   ├── login/          # 登录页
│   ├── register/       # 注册页
│   ├── dashboard/      # 项目仪表盘
│   └── project/        # 项目详情和编辑器
├── prisma/             # 数据库配置
│   ├── schema.prisma   # 数据模型
│   └── seed.ts         # 示例数据
├── server/             # WebSocket 服务器
├── .env                # 环境变量 (自动生成)
└── package.json        # 项目配置
```

---

## ✅ 部署检查清单

- [ ] Node.js 已安装 (>= 18.0.0)
- [ ] PostgreSQL 已安装或 Docker 已启动
- [ ] 依赖已安装 (`pnpm install` 完成)
- [ ] `.env` 文件已配置
- [ ] 数据库迁移已完成 (`pnpm prisma:migrate`)
- [ ] 可以访问 http://localhost:3000
- [ ] 可以注册和登录账户
- [ ] 可以创建项目

---

## 🚀 生产部署

### 构建生产版本

```powershell
pnpm build
pnpm start
```

### 使用 Docker

```powershell
docker build -t codehost-app .
docker run -p 3000:3000 codehost-app
```

### 部署到云服务

- **Vercel** (推荐): `vercel deploy`
- **Railway**: 连接 GitHub 自动部署
- **Render**: 支持 Docker 部署

---

## 📞 获取帮助

- 查看 README.md: 项目文档
- 检查 API 文档: src/app/api/
- 查看错误日志: 终端输出

祝部署顺利！🎉
