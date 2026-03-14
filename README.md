# CodeHost - 代码托管协作平台

<div align="center">
  <h3>Code. Collaborate. Create.</h3>
  <p>极简主义代码托管平台，为注重清晰、精确和实时协作的团队而设计。</p>
</div>

---

## ✨ 特性

- 🎨 **Minimalist Monochrome 设计** - 纯黑白配色，零圆角，优雅的 Serif 字体
- 👥 **实时协作** - 多用户同时编辑，光标位置实时同步
- 📝 **Monaco 编辑器** - VS Code 同款编辑器，支持 50+ 语言语法高亮
- 🔐 **权限控制** - 基于角色的访问控制（Owner / Editor / Viewer）
- 📦 **版本控制** - 内置提交历史，分支管理
- 🚀 **现代技术栈** - Next.js 14, TypeScript, Tailwind CSS, Socket.IO

## 🛠️ 技术栈

### 前端
- **框架**: Next.js 14+ (App Router)
- **语言**: TypeScript
- **样式**: Tailwind CSS
- **UI 组件**: Radix UI
- **状态管理**: Zustand
- **实时通信**: Socket.IO Client
- **代码编辑器**: Monaco Editor

### 后端
- **运行时**: Node.js + Express
- **实时服务**: Socket.IO Server
- **数据库**: PostgreSQL + Prisma ORM
- **认证**: JWT (jose)

## 📋 环境要求

- Node.js >= 18.0.0
- PostgreSQL >= 14
- pnpm (推荐) 或 npm

## 🚀 快速开始

### 1. 克隆项目

```bash
git clone <repository-url>
cd code-hosting-platform
```

### 2. 安装依赖

```bash
pnpm install
```

### 3. 配置环境变量

```bash
cp .env.example .env
```

编辑 `.env` 文件，填入你的配置：

```env
# 数据库
DATABASE_URL="postgresql://user:password@localhost:5432/code_hosting"

# 认证
JWT_SECRET="your-super-secret-jwt-key-change-in-production"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-nextauth-secret-change-in-production"

# WebSocket
NEXT_PUBLIC_WS_URL="http://localhost:3001"
WS_PORT=3001

# 客户端
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

### 4. 初始化数据库

```bash
# 生成 Prisma 客户端
pnpm prisma:generate

# 运行数据库迁移
pnpm prisma:migrate

# (可选) 播种示例数据
pnpm prisma:seed
```

### 5. 启动开发服务器

```bash
pnpm dev
```

这将同时启动：
- Next.js 开发服务器: http://localhost:3000
- WebSocket 服务器: http://localhost:3001

## 📁 项目结构

```
code-hosting-platform/
├── prisma/                 # Prisma 数据库配置
│   ├── schema.prisma       # 数据模型定义
│   └── seed.ts             # 数据库种子脚本
├── server/                 # WebSocket 服务器
│   ├── index.ts            # 服务器入口
│   └── tsconfig.json       # TypeScript 配置
├── src/
│   ├── app/                # Next.js App Router 页面
│   │   ├── api/            # API 路由
│   │   ├── dashboard/      # 仪表盘页面
│   │   ├── login/          # 登录页面
│   │   ├── register/       # 注册页面
│   │   └── project/        # 项目详情页面
│   ├── components/         # React 组件
│   │   └── ui/             # UI 组件库
│   ├── lib/                # 工具函数和配置
│   │   ├── auth.ts         # 认证工具
│   │   ├── jwt.ts          # JWT 工具
│   │   ├── prisma.ts       # Prisma 客户端
│   │   └── utils.ts        # 通用工具函数
│   └── stores/             # Zustand 状态管理
├── .env.example            # 环境变量示例
├── next.config.js          # Next.js 配置
├── tailwind.config.ts      # Tailwind CSS 配置
└── package.json            # 项目配置
```

## 📖 API 文档

### 认证

| 方法 | 端点 | 描述 |
|------|------|------|
| POST | `/api/auth/register` | 用户注册 |
| POST | `/api/auth/login` | 用户登录 |
| GET | `/api/auth/me` | 获取当前用户信息 |

### 项目

| 方法 | 端点 | 描述 |
|------|------|------|
| GET | `/api/projects` | 获取项目列表 |
| POST | `/api/projects` | 创建新项目 |
| GET | `/api/projects/:id` | 获取项目详情 |
| PATCH | `/api/projects/:id` | 更新项目 |
| DELETE | `/api/projects/:id` | 删除项目 |

### 文件

| 方法 | 端点 | 描述 |
|------|------|------|
| GET | `/api/projects/:id/files` | 获取文件列表 |
| POST | `/api/projects/:id/files` | 创建文件 |
| GET | `/api/projects/:id/files/:fileId` | 获取文件内容 |
| PUT | `/api/projects/:id/files/:fileId` | 更新文件内容 |
| DELETE | `/api/projects/:id/files/:fileId` | 删除文件 |

### 提交

| 方法 | 端点 | 描述 |
|------|------|------|
| GET | `/api/projects/:id/commits` | 获取提交历史 |

## 🎨 设计系统

### 颜色

| 名称 | 值 | 用途 |
|------|------|------|
| Background | `#FFFFFF` | 背景色 |
| Foreground | `#000000` | 主要文字色 |
| Muted | `#F5F5F5` | 次要背景色 |
| Muted Foreground | `#525252` | 次要文字色 |
| Border | `#000000` | 边框色 |
| Border Light | `#E5E5E5` | 浅色边框 |

### 字体

| 类型 | 字体 | 用途 |
|------|------|------|
| Display | Playfair Display | 标题 |
| Body | Source Serif 4 | 正文 |
| Mono | JetBrains Mono | 代码 |

### 设计原则

1. **纯黑白配色**: 所有 UI 元素仅使用黑白色
2. **零圆角**: 所有元素 border-radius: 0
3. **悬停反转**: 卡片和按钮悬停时黑白颜色反转
4. **即时过渡**: 动画时长不超过 100ms
5. **重边框**: 使用 2px/4px 边框，不使用阴影

## 🔧 可用脚本

```bash
# 开发
pnpm dev            # 启动开发服务器

# 构建
pnpm build          # 构建生产版本
pnpm start          # 启动生产服务器

# 数据库
pnpm prisma:generate  # 生成 Prisma 客户端
pnpm prisma:migrate   # 运行数据库迁移
pnpm prisma:studio    # 打开 Prisma Studio
pnpm prisma:seed      # 播种数据库

# 代码质量
pnpm lint           # 运行 ESLint
pnpm type-check     # TypeScript 类型检查
pnpm format         # 格式化代码
```

## 📝 示例账户

如果你运行了数据库种子脚本，可以使用以下账户登录：

| 邮箱 | 密码 |
|------|------|
| alice@example.com | password123 |
| bob@example.com | password123 |
| charlie@example.com | password123 |

## 🤝 贡献

欢迎贡献代码！请先 fork 本仓库，然后提交 Pull Request。

## 📄 许可证

MIT License

---

<div align="center">
  <p>Made with ❤️ by Hapince Tech Co.</p>
</div>
