# Claude Code Prompt：基于现有 Next.js 代码托管平台生成 uni-app 移动端项目

---

## 🎯 任务总述

你是一个高级全栈工程师。你的任务是**阅读现有的 Next.js 全栈代码托管平台项目**，然后基于其 API 接口和业务逻辑，**生成一个全新的 uni-app 跨平台移动端项目**（支持 iOS、Android、微信小程序）。

**关键约束：**
- 移动端项目是纯前端项目，**后端 API 和数据库复用已部署的服务器**
- **阉割掉所有支付、付款、余额、订单相关功能**
- 如果公开项目是付费项目（price > 0），用户点击下载时**弹窗提示"该项目为付费项目，请前往网页端查看和购买"**，不做任何支付逻辑
- **保留核心功能**：代码托管、在线编辑/IDE、项目管理、文件管理、分支管理、提交记录、公开代码库浏览、Star 收藏、评论、通知、用户资料、AI 聊天等
- 样式设计**参照原项目的极简黑白风格**，适配移动端和平板端

---

## 📖 第一步：阅读现有项目

请先完整阅读以下文件，理解项目的全部架构、数据模型、API 接口和业务逻辑：

### 必读文件清单

#### 核心配置
- `package.json` — 了解依赖和脚本
- `.env.production` — **获取服务器地址、API 地址、WebSocket 地址**，作为移动端的 API baseURL
- `prisma/schema.prisma` — **完整数据模型**（14个模型：User, Session, Project, ProjectMember, File, FileVersion, Branch, Commit, Invitation, Comment, Purchase, Star, Notification, Announcement）
- `README.md` — 项目总览和设计系统规范

#### API 路由（全部阅读，理解请求/响应格式）
- `src/app/api/auth/register/route.ts` — 注册
- `src/app/api/auth/login/route.ts` — 登录
- `src/app/api/auth/me/route.ts` — 获取当前用户
- `src/app/api/auth/avatar/route.ts` — 上传头像
- `src/app/api/projects/route.ts` — 项目列表 / 创建项目
- `src/app/api/projects/public/route.ts` — 公开项目列表
- `src/app/api/projects/[id]/route.ts` — 项目详情 / 更新 / 删除
- `src/app/api/projects/by-slug/[slug]/route.ts` — slug 查项目
- `src/app/api/projects/[id]/files/route.ts` — 文件列表 / 创建文件
- `src/app/api/projects/[id]/files/[fileId]/route.ts` — 文件详情 / 更新 / 删除
- `src/app/api/projects/[id]/files/upload/route.ts` — 批量上传
- `src/app/api/projects/[id]/files/public/route.ts` — 公开项目文件
- `src/app/api/projects/[id]/branches/route.ts` — 分支管理
- `src/app/api/projects/[id]/commits/route.ts` — 提交历史
- `src/app/api/projects/[id]/download/route.ts` — 下载项目
- `src/app/api/projects/[id]/members/route.ts` — 成员列表
- `src/app/api/projects/[id]/members/[memberId]/route.ts` — 移除成员
- `src/app/api/projects/[id]/invitations/route.ts` — 项目邀请
- `src/app/api/projects/[id]/star/route.ts` — Star 操作
- `src/app/api/projects/[id]/comments/route.ts` — 评论
- `src/app/api/projects/[id]/purchase/route.ts` — 【仅阅读理解，不实现购买逻辑，仅保留 GET 查询是否已购买】
- `src/app/api/orders/route.ts` — 【不实现，完全跳过】
- `src/app/api/invitations/route.ts` — 用户邀请列表
- `src/app/api/invitations/[id]/route.ts` — 接受/拒绝邀请
- `src/app/api/stars/route.ts` — Star 收藏列表
- `src/app/api/notifications/route.ts` — 通知
- `src/app/api/chat/route.ts` — AI 聊天
- `src/app/api/users/search/route.ts` — 搜索用户
- `src/app/api/users/[userId]/route.ts` — 用户公开资料
- `src/app/api/avatars/[...path]/route.ts` — 头像服务

#### 页面组件（理解 UI 布局和交互设计）
- `src/app/page.tsx` — 首页
- `src/app/dashboard/page.tsx` — 仪表板
- `src/app/explore/page.tsx` — 公开代码库浏览
- `src/app/explore/[slug]/page.tsx` — 公开项目详情
- `src/app/project/[slug]/page.tsx` — 项目主页
- `src/app/project/[slug]/ide/page.tsx` — 在线 IDE（重点阅读）
- `src/app/project/[slug]/branches/page.tsx` — 分支页面
- `src/app/project/[slug]/commits/page.tsx` — 提交页面
- `src/app/project/[slug]/members/page.tsx` — 成员页面
- `src/app/project/[slug]/settings/page.tsx` — 项目设置
- `src/app/stars/page.tsx` — 收藏页面
- `src/app/profile/page.tsx` — 个人资料
- `src/app/settings/page.tsx` — 用户设置
- `src/app/user/[userId]/page.tsx` — 他人主页
- `src/app/login/page.tsx` — 登录
- `src/app/register/page.tsx` — 注册

#### 组件
- `src/components/AiChat.tsx` — AI 聊天组件
- `src/components/ProjectComments.tsx` — 评论组件
- `src/components/ui/` — 所有 UI 组件

#### 状态管理
- `src/stores/auth.ts` — 认证状态
- `src/stores/project.ts` — 项目状态
- `src/stores/index.ts`

#### 工具函数
- `src/lib/auth.ts` — 认证工具
- `src/lib/jwt.ts` — JWT 工具
- `src/lib/utils.ts` — 通用工具

#### WebSocket 服务
- `server/index.ts` — **完整阅读**，理解实时协作的事件机制（join-project, edit-file, cursor-move 等）

---

## 🏗️ 第二步：生成 uni-app 项目

### 项目初始化

使用 **HBuilderX / Vue 3 + TypeScript** 创建 uni-app 项目：

```bash
# 项目名称
codehost-mobile

# 技术栈
- Vue 3 Composition API + <script setup>
- TypeScript
- Pinia（状态管理）
- uni-ui（组件库）
```

### 项目结构

```
codehost-mobile/
├── src/
│   ├── api/                          # API 请求封装
│   │   ├── request.ts                # 统一请求封装（baseURL 从配置读取）
│   │   ├── auth.ts                   # 认证相关 API
│   │   ├── project.ts               # 项目相关 API
│   │   ├── file.ts                   # 文件相关 API
│   │   ├── branch.ts                # 分支 API
│   │   ├── commit.ts                # 提交 API
│   │   ├── member.ts                # 成员 API
│   │   ├── invitation.ts            # 邀请 API
│   │   ├── star.ts                  # Star API
│   │   ├── comment.ts               # 评论 API
│   │   ├── notification.ts          # 通知 API
│   │   ├── chat.ts                  # AI 聊天 API
│   │   └── user.ts                  # 用户 API
│   │
│   ├── components/                   # 公共组件
│   │   ├── NavBar.vue               # 自定义导航栏
│   │   ├── TabBar.vue               # 底部标签栏
│   │   ├── ProjectCard.vue          # 项目卡片
│   │   ├── FileTree.vue             # 文件树组件
│   │   ├── FileTreeItem.vue         # 文件树节点
│   │   ├── CodeEditor.vue           # 代码编辑器（移动端适配）
│   │   ├── CommitItem.vue           # 提交记录条目
│   │   ├── BranchItem.vue           # 分支条目
│   │   ├── MemberItem.vue           # 成员条目
│   │   ├── CommentItem.vue          # 评论条目
│   │   ├── CommentInput.vue         # 评论输入
│   │   ├── NotificationItem.vue     # 通知条目
│   │   ├── AiChat.vue               # AI 聊天悬浮按钮+弹窗
│   │   ├── StarButton.vue           # Star 按钮
│   │   ├── UserAvatar.vue           # 用户头像
│   │   ├── SearchBar.vue            # 搜索栏
│   │   ├── EmptyState.vue           # 空状态占位
│   │   ├── LoadMore.vue             # 加载更多
│   │   └── PaidProjectModal.vue     # 付费项目提示弹窗
│   │
│   ├── pages/                        # 页面
│   │   ├── index/                    # 首页/引导页
│   │   │   └── index.vue
│   │   ├── login/                    # 登录
│   │   │   └── index.vue
│   │   ├── register/                 # 注册
│   │   │   └── index.vue
│   │   ├── dashboard/                # 仪表板（我的项目）
│   │   │   └── index.vue
│   │   ├── explore/                  # 公开代码库浏览
│   │   │   └── index.vue
│   │   ├── explore-detail/           # 公开项目详情
│   │   │   └── index.vue
│   │   ├── project/                  # 项目主页（文件浏览）
│   │   │   └── index.vue
│   │   ├── project-ide/              # 在线 IDE / 代码编辑
│   │   │   └── index.vue
│   │   ├── project-branches/         # 分支管理
│   │   │   └── index.vue
│   │   ├── project-commits/          # 提交历史
│   │   │   └── index.vue
│   │   ├── project-members/          # 成员管理
│   │   │   └── index.vue
│   │   ├── project-settings/         # 项目设置
│   │   │   └── index.vue
│   │   ├── file-editor/              # 单文件编辑器
│   │   │   └── index.vue
│   │   ├── stars/                    # 我的收藏
│   │   │   └── index.vue
│   │   ├── notifications/            # 通知中心
│   │   │   └── index.vue
│   │   ├── profile/                  # 个人资料
│   │   │   └── index.vue
│   │   ├── settings/                 # 用户设置
│   │   │   └── index.vue
│   │   └── user-profile/             # 他人主页
│   │       └── index.vue
│   │
│   ├── stores/                       # Pinia 状态管理
│   │   ├── auth.ts                  # 用户认证状态
│   │   ├── project.ts              # 当前项目状态
│   │   └── app.ts                  # 全局应用状态
│   │
│   ├── utils/                        # 工具函数
│   │   ├── storage.ts               # 本地存储封装
│   │   ├── format.ts                # 格式化工具（日期、文件大小等）
│   │   ├── file.ts                  # 文件类型/图标/语言检测
│   │   └── socket.ts               # WebSocket 连接管理
│   │
│   ├── static/                       # 静态资源
│   │   ├── logo.png
│   │   └── icons/
│   │
│   ├── App.vue                       # 根组件
│   ├── main.ts                       # 入口文件
│   ├── manifest.json                 # uni-app 配置
│   ├── pages.json                    # 页面路由配置
│   └── uni.scss                      # 全局样式变量
│
├── .env.development                  # 开发环境配置（指向本地）
├── .env.production                   # 生产环境配置（指向服务器）
├── tsconfig.json
├── vite.config.ts
└── package.json
```

---

## 📱 第三步：详细功能实现规范

### 3.1 API 请求封装 (`src/api/request.ts`)

```typescript
// 从 .env.production 读取服务器地址
// API baseURL 指向已部署的服务器地址（从原项目的 .env.production 中的 NEXT_PUBLIC_APP_URL 获取）
// WebSocket URL 从 NEXT_PUBLIC_WS_URL 获取

// 统一请求拦截：
// - 请求头自动附加 Authorization: Bearer <token>
// - token 从 uni.getStorageSync('token') 获取
// - 响应拦截处理 401 跳转登录
// - 统一错误提示 uni.showToast

// 注意：所有 API 路径前缀为 /api/... ，与原 Next.js 项目一致
```

### 3.2 认证模块

**登录页 (`pages/login/index.vue`)**
- 邮箱 + 密码表单
- 调用 `POST /api/auth/login`
- 登录成功后将 token 和用户信息存入 `uni.setStorageSync`
- 跳转到 dashboard

**注册页 (`pages/register/index.vue`)**
- 邮箱 + 用户名 + 密码 + 确认密码
- 调用 `POST /api/auth/register`
- 注册成功自动登录跳转 dashboard

**认证状态 (`stores/auth.ts`)**
- 存储 token, user 信息
- 提供 login(), logout(), checkAuth(), updateProfile() 方法
- 应用启动时自动调用 `GET /api/auth/me` 检查登录状态

### 3.3 底部标签栏 (TabBar)

配置 4 个标签页：

| 标签 | 图标 | 页面 | 说明 |
|------|------|------|------|
| 首页 | home | /pages/dashboard/index | 我的项目仪表板 |
| 发现 | compass | /pages/explore/index | 公开代码库浏览 |
| 收藏 | star | /pages/stars/index | Star 收藏列表 |
| 我的 | user | /pages/profile/index | 个人资料 |

### 3.4 仪表板页面 (`pages/dashboard/index.vue`)

- 顶部：用户欢迎语 + 通知铃铛（显示未读数）+ AI 聊天入口
- 项目列表：卡片式布局，每个卡片显示项目名、描述、语言标签、公开/私有标签、Star 数、成员数
- 下拉刷新 + 上拉加载更多（分页）
- 右上角 "+" 按钮：弹出新建项目对话框（名称、描述、语言选择、公开/私有切换）
- 调用 `GET /api/projects` 和 `POST /api/projects`
- **注意：创建项目时不传 price 字段，或固定为 0**

### 3.5 公开代码库浏览 (`pages/explore/index.vue`)

- 顶部搜索栏（搜索项目名称）
- 语言筛选标签（横向滚动）：全部、JavaScript、TypeScript、Python、Java、Go、Rust、C++、C#、PHP、Ruby、Swift、Kotlin、HTML/CSS、SQL、Shell
- 排序切换：最新 / 最多 Star
- 项目卡片列表：显示项目名、描述、所有者、Star 数、语言、价格标签
- **价格标签显示逻辑**：
  - `price === 0`：显示 "免费" 绿色标签
  - `price > 0`：显示 "¥{price}" 橙色标签 + "付费" 标记
- 下拉刷新 + 分页
- 调用 `GET /api/projects/public`

### 3.6 公开项目详情 (`pages/explore-detail/index.vue`)

- 项目名称、描述、所有者信息、Star 数
- Star 按钮（需登录）
- 文件树浏览（只读）— 调用 `GET /api/projects/[id]/files/public`
- 点击文件可查看内容（只读模式）
- 评论区
- **下载按钮逻辑**：
  - 免费项目（price === 0）：直接调用 `GET /api/projects/[id]/download` 下载
  - 付费项目（price > 0）：调用 `GET /api/projects/[id]/purchase` 检查是否已购买
    - 已购买：允许下载
    - 未购买：**弹窗提示 "该项目为付费项目（¥{price}），请前往网页端 {NEXT_PUBLIC_APP_URL} 查看和购买"**，提供复制链接按钮

### 3.7 项目主页 (`pages/project/index.vue`)

- 项目信息头部：名称、描述、语言标签、分支选择器
- 操作栏：IDE 编辑、分支、提交、成员、设置（导航到子页面）
- 文件树：可展开/折叠的目录结构
- 点击文件 → 跳转到文件查看/编辑页面
- 快捷操作：新建文件/文件夹、上传文件
- 调用 `GET /api/projects/by-slug/[slug]` 和 `GET /api/projects/[id]/files`

### 3.8 在线 IDE / 代码编辑 (`pages/project-ide/index.vue`) ⭐重点

这是移动端最核心的功能页面，需要精心设计移动端交互：

**布局方案（适配手机和平板）：**
- **手机端**：文件树以侧滑抽屉形式展示，点击文件后全屏显示编辑器
- **平板端**：左侧文件树（可收起）+ 右侧编辑器，类似 iPad 分栏布局
- 使用 `uni.getSystemInfoSync()` 检测屏幕宽度判断布局模式

**文件树侧边栏：**
- 树形结构，文件夹可展开/折叠
- 文件类型图标（根据扩展名显示不同图标）
- 长按文件/文件夹弹出操作菜单：重命名、删除、新建子文件
- 顶部搜索框快速定位文件
- 新建文件、新建文件夹按钮

**代码编辑器：**
- 移动端代码编辑器方案：
  - 使用 `<web-view>` 嵌入基于 CodeMirror 6 / Monaco Editor 的网页版编辑器
  - 或使用 `<textarea>` + 自定义语法高亮（简化方案）
  - 推荐方案：在项目中包含一个 `hybrid/editor.html`，使用 CodeMirror 6 实现，通过 `postMessage` 与 uni-app 通信
- 支持语法高亮（根据文件扩展名自动选择语言）
- 文件标签页管理（可打开多个文件，横向滚动切换）
- 保存按钮（调用 `PUT /api/projects/[id]/files/[fileId]`）
- 横屏模式适配（代码编辑时建议横屏）

**WebSocket 实时协作：**
- 连接 WebSocket 服务器（地址从配置读取）
- 实现 `join-project`、`open-file`、`edit-file` 事件
- 显示在线协作用户列表
- 实时接收其他用户的编辑内容更新

### 3.9 分支管理 (`pages/project-branches/index.vue`)

- 分支列表：显示分支名称、是否默认分支、创建时间
- 创建新分支按钮（EDITOR 权限以上）
- 调用 `GET/POST /api/projects/[id]/branches`

### 3.10 提交历史 (`pages/project-commits/index.vue`)

- 时间线样式展示提交记录
- 每条显示：提交消息、作者头像和名称、提交哈希（前8位）、时间
- 分支筛选下拉框
- 分页加载
- 调用 `GET /api/projects/[id]/commits`

### 3.11 成员管理 (`pages/project-members/index.vue`)

- 成员列表：头像、用户名、角色标签（Owner/Editor/Viewer）
- 只有 Owner 可以移除成员和发送邀请
- 邀请用户：搜索用户（调用 `GET /api/users/search`）→ 选择角色 → 发送邀请
- 待处理邀请列表
- 调用 `GET/POST /api/projects/[id]/invitations` 和 `DELETE /api/projects/[id]/members/[memberId]`

### 3.12 项目设置 (`pages/project-settings/index.vue`)

- 编辑项目名称、描述
- 切换公开/私有
- 选择语言标签
- **不显示价格设置字段**（已阉割付费功能）
- 归档/取消归档
- 危险区域：删除项目（二次确认）
- 调用 `PATCH/DELETE /api/projects/[id]`

### 3.13 星标收藏 (`pages/stars/index.vue`)

- 我收藏的项目列表
- 项目卡片 + 取消收藏按钮
- 分页加载
- 调用 `GET /api/stars`

### 3.14 通知中心 (`pages/notifications/index.vue`)

- 通知列表：标题、内容、时间、已读/未读状态
- 全部标记已读按钮
- 点击通知跳转到对应页面
- 支持筛选：全部 / 未读
- **过滤掉 ORDER_BOUGHT 和 ORDER_SOLD 类型的通知**（与交易相关）
- 调用 `GET/PATCH /api/notifications`

### 3.15 AI 聊天 (`components/AiChat.vue`)

- 悬浮按钮，点击弹出聊天面板
- 聊天消息列表 + 输入框
- 实现打字机效果（流式输出，如 API 支持）
- 调用 `POST /api/chat`
- 保持与原项目一致的"小瀚" AI 客服角色

### 3.16 个人资料 (`pages/profile/index.vue`)

- 用户头像、名称、邮箱
- 我的项目数量统计
- Star 收藏数统计
- **不显示余额信息**（已阉割）
- **不显示"我的订单"入口**（已阉割）
- 编辑资料入口
- 上传/更换头像
- 退出登录

### 3.17 用户设置 (`pages/settings/index.vue`)

- 修改个人信息（名称、头像）
- 修改密码
- **不显示余额相关设置**
- 关于应用信息

### 3.18 他人主页 (`pages/user-profile/index.vue`)

- 用户公开信息
- 该用户的公开项目列表
- 调用 `GET /api/users/[userId]`

---

## 🎨 第四步：设计规范

### 配色方案（继承原项目极简黑白风格，移动端适配）

```scss
// uni.scss 全局变量
$bg-color: #FFFFFF;
$bg-color-secondary: #F5F5F5;
$text-color: #000000;
$text-color-secondary: #525252;
$text-color-placeholder: #999999;
$border-color: #000000;
$border-color-light: #E5E5E5;
$accent-color: #000000;
$success-color: #22C55E;
$warning-color: #F59E0B;
$error-color: #EF4444;

// 设计原则
// 1. 以黑白色为主色调
// 2. 零圆角或极小圆角（移动端可适当使用 4px-8px 圆角提升体验）
// 3. 2px 边框风格
// 4. 使用系统字体，代码使用等宽字体
// 5. 卡片使用边框而非阴影
```

### 字体

```scss
$font-family-base: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Hiragino Sans GB', sans-serif;
$font-family-mono: 'Menlo', 'Monaco', 'Courier New', monospace;
```

### 移动端交互规范

- 导航使用原生导航栏样式
- 列表页使用下拉刷新 + 上拉加载更多
- 表单使用原生 picker、switch 等组件
- 操作确认使用 `uni.showModal`
- 成功/错误提示使用 `uni.showToast`
- 长列表使用虚拟列表优化
- 适配安全区域（iPhone 刘海屏、底部指示器）
- 暗黑模式保留扩展接口（当前先实现亮色主题）

---

## ⚠️ 第五步：阉割功能清单

以下功能在移动端**完全不实现**：

| 功能 | 说明 |
|------|------|
| 用户余额系统 | 不显示 balance 字段、不显示余额充值/提现入口 |
| 项目定价设置 | 创建项目时不显示 price 字段，不传递 price 参数 |
| 购买项目 | 不实现 `POST /api/projects/[id]/purchase` |
| 订单页面 | 完全不创建 orders 页面 |
| 订单相关 API | 不调用 `GET /api/orders` |
| 管理后台 | 不实现 codeadmin 页面（管理操作在网页端完成） |
| 订单类通知 | 过滤掉 ORDER_BOUGHT / ORDER_SOLD 类型通知 |
| 项目定价显示 | 在项目设置中不显示价格编辑 |
| 交易统计 | 不显示任何交易、收入、支出相关统计 |

### 付费项目处理方式

```typescript
// 当用户在公开项目中点击下载付费项目时
function handleDownload(project: Project) {
  if (project.price > 0) {
    // 先检查是否已购买
    const { purchased } = await api.get(`/api/projects/${project.id}/purchase`)
    if (purchased) {
      // 已购买，允许下载
      await downloadProject(project.id)
    } else {
      // 未购买，弹窗提示
      uni.showModal({
        title: '付费项目',
        content: `该项目为付费项目（¥${project.price}），请前往网页端查看和购买。`,
        confirmText: '复制链接',
        cancelText: '取消',
        success: (res) => {
          if (res.confirm) {
            const url = `${APP_URL}/explore/${project.slug}`
            uni.setClipboardData({ data: url })
            uni.showToast({ title: '链接已复制', icon: 'success' })
          }
        }
      })
    }
  } else {
    // 免费项目，直接下载
    await downloadProject(project.id)
  }
}
```

---

## 🔌 第六步：WebSocket 集成

```typescript
// utils/socket.ts
// 使用 uni-socket.io 或原生 WebSocket 连接服务器

import io from '@hyoga/uni-socket.io'  // uni-app 适配的 socket.io 客户端

class SocketManager {
  private socket: any = null
  
  connect(wsUrl: string, token: string) {
    this.socket = io(wsUrl, {
      transports: ['websocket'],
      query: { token }
    })
  }
  
  joinProject(projectId: string, userId: string, userName: string) {
    this.socket.emit('join-project', { projectId, userId, userName })
  }
  
  openFile(fileId: string, userId: string, userName: string) {
    this.socket.emit('open-file', { fileId, userId, userName })
  }
  
  editFile(fileId: string, content: string, userId: string) {
    this.socket.emit('edit-file', { fileId, content, userId })
  }
  
  onFileUpdated(callback: (data: any) => void) {
    this.socket.on('file-updated', callback)
  }
  
  onOnlineUsers(callback: (users: any[]) => void) {
    this.socket.on('online-users', callback)
  }
  
  disconnect() {
    this.socket?.disconnect()
  }
}

export const socketManager = new SocketManager()
```

---

## 📋 第七步：pages.json 路由配置

```json
{
  "pages": [
    { "path": "pages/dashboard/index", "style": { "navigationBarTitleText": "CodeHost" } },
    { "path": "pages/explore/index", "style": { "navigationBarTitleText": "发现" } },
    { "path": "pages/stars/index", "style": { "navigationBarTitleText": "我的收藏" } },
    { "path": "pages/profile/index", "style": { "navigationBarTitleText": "我的" } },
    { "path": "pages/login/index", "style": { "navigationBarTitleText": "登录" } },
    { "path": "pages/register/index", "style": { "navigationBarTitleText": "注册" } },
    { "path": "pages/explore-detail/index", "style": { "navigationBarTitleText": "项目详情" } },
    { "path": "pages/project/index", "style": { "navigationBarTitleText": "项目" } },
    { "path": "pages/project-ide/index", "style": { "navigationBarTitleText": "编辑器", "pageOrientation": "auto" } },
    { "path": "pages/project-branches/index", "style": { "navigationBarTitleText": "分支管理" } },
    { "path": "pages/project-commits/index", "style": { "navigationBarTitleText": "提交历史" } },
    { "path": "pages/project-members/index", "style": { "navigationBarTitleText": "成员管理" } },
    { "path": "pages/project-settings/index", "style": { "navigationBarTitleText": "项目设置" } },
    { "path": "pages/file-editor/index", "style": { "navigationBarTitleText": "编辑文件", "pageOrientation": "auto" } },
    { "path": "pages/notifications/index", "style": { "navigationBarTitleText": "通知" } },
    { "path": "pages/settings/index", "style": { "navigationBarTitleText": "设置" } },
    { "path": "pages/user-profile/index", "style": { "navigationBarTitleText": "用户主页" } }
  ],
  "tabBar": {
    "color": "#525252",
    "selectedColor": "#000000",
    "backgroundColor": "#FFFFFF",
    "borderStyle": "black",
    "list": [
      { "pagePath": "pages/dashboard/index", "text": "首页", "iconPath": "static/icons/home.png", "selectedIconPath": "static/icons/home-active.png" },
      { "pagePath": "pages/explore/index", "text": "发现", "iconPath": "static/icons/compass.png", "selectedIconPath": "static/icons/compass-active.png" },
      { "pagePath": "pages/stars/index", "text": "收藏", "iconPath": "static/icons/star.png", "selectedIconPath": "static/icons/star-active.png" },
      { "pagePath": "pages/profile/index", "text": "我的", "iconPath": "static/icons/user.png", "selectedIconPath": "static/icons/user-active.png" }
    ]
  },
  "globalStyle": {
    "navigationBarTextStyle": "black",
    "navigationBarTitleText": "CodeHost",
    "navigationBarBackgroundColor": "#FFFFFF",
    "backgroundColor": "#FFFFFF"
  }
}
```

---

## 🔧 第八步：环境配置

```typescript
// .env.development
VITE_API_BASE_URL=http://localhost:3000
VITE_WS_URL=http://localhost:3001
VITE_APP_NAME=CodeHost

// .env.production — 从原项目 .env.production 读取以下值
VITE_API_BASE_URL=<原项目 NEXT_PUBLIC_APP_URL 的值>
VITE_WS_URL=<原项目 NEXT_PUBLIC_WS_URL 的值>
VITE_APP_NAME=CodeHost
```

**请阅读原项目的 `.env.production` 文件**，将其中的 `NEXT_PUBLIC_APP_URL` 值赋给 `VITE_API_BASE_URL`，将 `NEXT_PUBLIC_WS_URL` 值赋给 `VITE_WS_URL`。

---

## 📦 第九步：依赖列表

```json
{
  "dependencies": {
    "vue": "^3.4.0",
    "pinia": "^2.1.0",
    "pinia-plugin-persistedstate": "^3.2.0",
    "@dcloudio/uni-app": "latest",
    "@dcloudio/uni-ui": "latest",
    "@hyoga/uni-socket.io": "^1.0.0",
    "dayjs": "^1.11.0"
  },
  "devDependencies": {
    "typescript": "^5.3.0",
    "vite": "^5.0.0",
    "@dcloudio/vite-plugin-uni": "latest",
    "sass": "^1.69.0"
  }
}
```

---

## ✅ 第十步：实现检查清单

完成所有代码后，请逐项检查：

- [ ] 所有 API 请求都指向服务器地址，非本地
- [ ] Token 认证在所有需要登录的 API 请求中正确传递
- [ ] 404、401、500 等错误状态都有友好的提示
- [ ] 付费项目下载弹窗正确显示
- [ ] 没有任何购买、支付、余额、订单相关的 UI 和逻辑
- [ ] 文件树正确渲染目录层级
- [ ] 代码编辑器在手机和平板上都能正常使用
- [ ] WebSocket 连接正确建立和断开
- [ ] 下拉刷新和分页加载都正常工作
- [ ] 微信小程序兼容性（不使用 DOM 操作，小程序中 web-view 需要业务域名配置）
- [ ] 适配 iPhone 安全区域
- [ ] 暗色导航栏 / 状态栏正确适配
- [ ] 所有页面都有空状态和加载状态
- [ ] 退出登录正确清除所有状态和缓存

---

## 💡 附加说明

1. **关于微信小程序中的代码编辑器**：微信小程序不支持 `<web-view>` 加载本地 HTML（需要配置业务域名），建议在小程序中降级使用 `<textarea>` + 基础语法高亮方案，或使用 `<rich-text>` 实现只读代码高亮
2. **关于文件上传**：移动端上传使用 `uni.chooseFile()`（App）或 `uni.chooseMessageFile()`（小程序），注意不同平台 API 差异
3. **关于下载文件**：App 端使用 `uni.downloadFile()` + `uni.saveFile()`，小程序端下载受限，可只允许在线查看
4. **平板适配**：使用 CSS Grid 或 Flex 布局，根据屏幕宽度 > 768px 切换到双栏/多栏布局
5. **性能优化**：文件树大量节点时使用虚拟列表，大文件编辑时注意内存控制

---

**请现在开始阅读原项目代码，然后按照以上规范生成完整的 uni-app 项目代码。确保所有功能完整可用，所有页面都有实际的 API 对接，不要使用 mock 数据。**
