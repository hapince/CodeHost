# 宝塔面板完整部署教程（保留线上数据）

> **目标服务器**: 72.62.255.15 / code.hapince.site  
> **部署方式**: PM2 管理 Node.js 应用  
> **数据库**: 本地 MySQL (code_hosting 库)  
> **预期耗时**: 约 15-20 分钟

---

## 第一步：上传代码到服务器

### 1.1 SSH 登录服务器

```bash
# Windows PowerShell / Mac Terminal / Linux
ssh root@72.62.255.15

# 提示输入密码，输入宝塔密码即可
```

### 1.2 进入网站根目录并备份旧代码（可选）

```bash
cd /www/wwwroot

# 可选：备份旧代码
# mv code-hosting-platform code-hosting-platform.backup.$(date +%Y%m%d)

# 如果目录已存在就进入，不存在就创建
mkdir -p code-hosting-platform
cd code-hosting-platform
```

### 1.3 上传代码

**方式 A：用 Git（推荐，如果有 Git 仓库）**

```bash
# 从 GitHub/GitLab 克隆（首次）
git clone https://github.com/yourname/code-hosting-platform.git .

# 或更新代码（已有仓库时）
git pull origin main
```

**方式 B：用 SCP 上传（没有 Git 时）**

在本地电脑打开 PowerShell 或终端：

```bash
# 在本地项目根目录执行
# 先打包项目（排除 node_modules、.next、.env）
tar --exclude='node_modules' --exclude='.next' --exclude='.env.local' \
    -czf code-hosting.tar.gz .

# 上传到服务器
scp code-hosting.tar.gz root@72.62.255.15:/www/wwwroot/code-hosting-platform/

# SSH 登录服务器后解压
cd /www/wwwroot/code-hosting-platform
tar -xzf code-hosting.tar.gz
rm code-hosting.tar.gz
```

---

## 第二步：配置环境变量

在服务器上执行（**必须在 `/www/wwwroot/code-hosting-platform` 目录**）：

```bash
cat > .env << 'EOF'
# 数据库（MySQL）
DATABASE_URL="mysql://code_hosting:Cong313041876!@127.0.0.1:3306/code_hosting"

# 认证
JWT_SECRET="3fb083d5943e39bd47a72807c8b9113b5f9ddc467a6bc9434065df5f6228662b"
NEXTAUTH_URL="http://72.62.255.15"
NEXTAUTH_SECRET="6a183c985e43a653ff8f92fc55fc77af678ca212319e63875398fe12e0382403"

# WebSocket
NEXT_PUBLIC_WS_URL="http://72.62.255.15"
WS_PORT=3001

# 文件存储
FILE_STORAGE_PATH="./storage/projects"

# 客户端
NEXT_PUBLIC_APP_URL="http://code.hapince.site"

# 千问AI
QWEN_API_KEY="your_qwen_api_key_here"
QWEN_API_URL="https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions"
QWEN_MODEL="qwen-max"

# Stripe
STRIPE_SECRET_KEY="your_stripe_secret_key_here"
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="your_stripe_publishable_key_here"
STRIPE_WEBHOOK_SECRET=""

# PayPal
PAYPAL_CLIENT_ID="your_paypal_client_id_here"
PAYPAL_CLIENT_SECRET="your_paypal_client_secret_here"
NEXT_PUBLIC_PAYPAL_CLIENT_ID="your_paypal_client_id_here"
PAYPAL_MODE="sandbox"
NEXT_PUBLIC_PAYPAL_MODE="sandbox"
EOF
```

验证文件：

```bash
cat .env | grep DATABASE_URL
# 应输出：DATABASE_URL="mysql://code_hosting:Cong313041876!@127.0.0.1:3306/code_hosting"
```

---

## 第三步：验证环境和数据库

```bash
# 检查 Node.js 版本（应 >= 18.0.0）
node -v

# 检查 npm 版本
npm -v

# 检查 PM2 版本
pm2 -v

# 验证数据库连接和表结构
mysql -u code_hosting -p'Cong313041876!' -e "USE code_hosting; SHOW TABLES;"
```

**期望输出**：应看到 14+ 个表（user、project、file 等），表示数据库完好。

---

## 第四步：安装依赖

```bash
cd /www/wwwroot/code-hosting-platform

npm install
```

**耗时**: 约 1-2 分钟  
**输出**: 最后会有 warn 关于 deprecated 包，但不影响运行

---

## 第五步：Prisma 准备

### 5.1 生成 Prisma 客户端

```bash
npx prisma generate
```

### 5.2 同步数据库（不会删除数据）

```bash
npx prisma db push
```

**关键**：这会对比 Prisma schema 和实际数据库，仅同步缺少的表/字段，**不会丢失任何现有数据**。

---

## 第六步：修复 TypeScript 编译错误

### 6.1 创建 PayPal 类型声明

```bash
mkdir -p src/types
echo "declare module '@paypal/checkout-server-sdk';" > src/types/paypal.d.ts
```

验证：

```bash
cat src/types/paypal.d.ts
# 应输出：declare module '@paypal/checkout-server-sdk';
```

### 6.2 修复 Suspense 问题（Orders 和 Profile 页面）

这两个页面在构建时会报错 `useSearchParams() not wrapped in Suspense`。修复方式：

#### 修复 Orders 页面

```bash
sed -i "1s/import { useEffect, useState }/import { useEffect, useState, Suspense }/" src/app/orders/page.tsx
```

然后用编辑器打开 `src/app/orders/page.tsx`，找到 `export default function OrdersPage()` 这行，改为：

```tsx
export default function OrdersPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>}>
      <OrdersContent />
    </Suspense>
  );
}

function OrdersContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  // ... 后面的代码保持不变 ...
```

**注意**: 把原来的整个逻辑移到 `OrdersContent()` 函数里，把 `export default function OrdersPage()` 改成简单的包装器。

#### 修复 Profile 页面

同样的操作，打开 `src/app/profile/page.tsx`：

```tsx
export default function ProfilePage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>}>
      <ProfileContent />
    </Suspense>
  );
}

function ProfileContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  // ... 后面的代码保持不变 ...
```

---

## 第七步：构建项目

在服务器执行：

```bash
npm run build
```

**关键检查点**：

1. **成功标志**：最后应输出 `✓ Generating static pages (45/45)`
2. **检查 server/dist 已生成**：
   ```bash
   ls -la server/dist/index.js
   # 应看到文件存在，日期为当前或最近的时间
   ```
3. **检查 .next 已生成**：
   ```bash
   ls -la .next/standalone/
   # 应有 node_modules、package.json 等
   ```

**如果出错**：
- 顺序依次检查：PayPal 类型声明、Suspense 问题、环境变量
- 重新执行：`rm -rf .next && npm run build`

---

## 第八步：配置 PM2（进程管理）

### 8.1 启动应用

```bash
# 先停掉旧进程（如果有的话）
pm2 delete codehost-web codehost-ws 2>/dev/null

# 启动新进程（使用 ecosystem.config.js）
pm2 start ecosystem.config.js
```

### 8.2 验证状态

```bash
pm2 status
```

**期望输出**：

```
┌────┬──────────────┬──────────┬──────┬───────────┬──────────┬──────────┐
│ id │ name         │ mode     │ ↺    │ status    │ cpu      │ memory   │
├────┼──────────────┼──────────┼──────┼───────────┼──────────┼──────────┤
│ 0  │ codehost-web │ fork     │ 0    │ online    │ 0%       │ 50.2M    │
│ 1  │ codehost-ws  │ fork     │ 0    │ online    │ 0%       │ 30.5M    │
└────┴──────────────┴──────────┴──────┴───────────┴──────────┴──────────┘
```

### 8.3 保存 PM2 配置（开机自启）

```bash
pm2 save
pm2 startup

# 按照输出执行提示的命令（通常是一条 sudo 命令）
```

### 8.4 查看日志

```bash
# 查看 Web 应用日志
pm2 logs codehost-web

# 查看 WebSocket 日志
pm2 logs codehost-ws

# 查看所有日志
pm2 logs

# 按 Ctrl+C 退出
```

---

## 第九步：配置 Nginx 反向代理

### 9.1 在宝塔面板创建站点

1. 登录宝塔面板 → **网站**
2. 点击 **添加站点**
3. 填写信息：
   - **域名**: `code.hapince.site` 和 `72.62.255.15`（两个都添加）
   - **PHP 版本**: 选 **纯静态**
   - 其他保持默认

### 9.2 配置 Nginx

1. 点击创建的站点 → **配置文件**（或 **反向代理**）
2. 找到 `server {` 块，全部替换为：

```nginx
server {
    listen 80;
    server_name code.hapince.site 72.62.255.15;
    
    # 上传大小限制
    client_max_body_size 100M;
    
    # Next.js 主应用反向代理
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # 超时设置
        proxy_read_timeout 86400s;
        proxy_send_timeout 86400s;
    }
    
    # WebSocket 反向代理（Socket.IO）
    location /socket.io/ {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # WebSocket 需要长连接
        proxy_read_timeout 86400s;
        proxy_send_timeout 86400s;
    }
    
    # 静态文件缓存
    location /_next/static/ {
        proxy_pass http://127.0.0.1:3000;
        expires 365d;
        add_header Cache-Control "public, immutable";
    }

    # 访问日志
    access_log /www/wwwlogs/code-hosting.log;
    error_log /www/wwwlogs/code-hosting.error.log;
}
```

3. **保存**

### 9.3 测试 Nginx 配置

```bash
# SSH 登录服务器
nginx -t

# 输出应为：
# nginx: the configuration file /etc/nginx/nginx.conf syntax is ok
# nginx: configuration file /etc/nginx/nginx.conf test is successful
```

### 9.4 重载 Nginx

```bash
nginx -s reload
```

---

## 第十步：防火墙配置（可选但推荐）

### 10.1 宝塔面板防火墙

1. 宝塔面板 → **安全** → **防火墙**
2. 确保**开放了**：
   - **80 端口** (HTTP)
   - **443 端口** (HTTPS，如果配了 SSL)

3. **3001 端口的处理**：
   - 如果 `NEXT_PUBLIC_WS_URL="http://72.62.255.15"`（通过 Nginx 的 80 端口代理）→ **不需要**开放 3001
   - 如果配置了 HTTPS，要改成 `NEXT_PUBLIC_WS_URL="https://code.hapince.site"` → **也不需要**开放 3001

---

## 第十一步：配置 SSL（可选但推荐）

### 11.1 在宝塔申请免费 SSL 证书

1. 宝塔面板 → **网站** → 点击 `code.hapince.site` 站点
2. 进入 **SSL** 标签
3. **Let's Encrypt**（免费）→ 申请
4. 勾选 **强制 HTTPS**

### 11.2 更新 .env 配置

如果启用了 HTTPS，修改 `.env`：

```bash
cat > .env << 'EOF'
# 数据库（MySQL）
DATABASE_URL="mysql://code_hosting:Cong313041876!@127.0.0.1:3306/code_hosting"

# 认证（HTTPS）
JWT_SECRET="3fb083d5943e39bd47a72807c8b9113b5f9ddc467a6bc9434065df5f6228662b"
NEXTAUTH_URL="https://code.hapince.site"
NEXTAUTH_SECRET="6a183c985e43a653ff8f92fc55fc77af678ca212319e63875398fe12e0382403"

# WebSocket（HTTPS）
NEXT_PUBLIC_WS_URL="https://code.hapince.site"
WS_PORT=3001

# ... 后面的配置相同 ...
EOF
```

### 11.3 重新构建并重启

```bash
npm run build
pm2 restart all
```

---

## 第十二步：验证部署

### 12.1 测试前端访问

```bash
# 在本地浏览器：
# http://code.hapince.site
# 或 http://72.62.255.15

# 应看到首页，能够：
# - 查看公开项目列表
# - 点击项目详情
# - 注册/登录
```

### 12.2 测试登录

```bash
# 用之前的账号登录，如：
# 邮箱：alice@example.com
# 密码：（之前的密码）

# 应看到个人项目列表
```

### 12.3 测试 WebSocket

```bash
# 进入一个项目的代码编辑器
# 打开浏览器开发者工具（F12） → Console
# 应看到：
# [Socket.IO] CONNECT

# 说明 WebSocket 连接成功
```

### 12.4 检查日志

```bash
# SSH 登录服务器，查看应用日志
pm2 logs codehost-web --lines 50
pm2 logs codehost-ws --lines 50

# 应没有 ERROR 或 FATAL 日志
```

---

## 常见问题排查

### Q1：访问网站显示 502 Bad Gateway

**原因**: PM2 进程未运行或 Nginx 配置错误

**解决**:
```bash
# 检查 PM2 状态
pm2 status

# 重启 PM2
pm2 restart all

# 检查 Nginx 日志
tail -f /www/wwwlogs/code-hosting.error.log
```

### Q2：登录后仍看不到项目

**原因**: 可能是数据库连接问题或 JWT 校验失败

**解决**:
```bash
# 检查数据库连接
mysql -u code_hosting -p'Cong313041876!' code_hosting -e "SELECT COUNT(*) FROM project;"

# 检查应用日志
pm2 logs codehost-web | grep -i error
```

### Q3：WebSocket 连接失败

**原因**: `/socket.io/` 路由配置错误或 3001 端口未响应

**解决**:
```bash
# 检查 codehost-ws 进程是否运行
pm2 status

# 测试 3001 端口是否响应
curl http://127.0.0.1:3001/health

# 应返回 {"status":"ok",...}
```

### Q4：重新部署后数据都没了

**原因**: 执行了 `prisma migrate reset` 或 `DROP DATABASE`

**预防**: 永远使用 `prisma db push`，不要用 `migrate reset`

---

## 日常维护命令

```bash
cd /www/wwwroot/code-hosting-platform

# 查看进程状态
pm2 status

# 重启应用
pm2 restart all

# 更新代码后重新部署
git pull                    # 如果用 Git
npm install                 # 如果有新依赖
npx prisma generate
npx prisma db push
npm run build
pm2 restart all

# 查看实时日志
pm2 logs

# 查看历史日志
pm2 logs codehost-web --lines 100

# 停止应用
pm2 stop all

# 启动应用
pm2 start all
```

---

## 总结

| 步骤 | 命令 | 耗时 |
|------|------|------|
| 1. 上传代码 | `scp` 或 `git clone` | 2-5 分钟 |
| 2. 配置 .env | `cat > .env` | 1 分钟 |
| 3. 验证环境 | `node -v && npm -v` | <1 分钟 |
| 4. 安装依赖 | `npm install` | 1-2 分钟 |
| 5. Prisma 准备 | `prisma generate && db push` | 2 分钟 |
| 6. 修复编译错误 | 创建 paypal.d.ts 和 Suspense | 2 分钟 |
| 7. 构建 | `npm run build` | 2-3 分钟 |
| 8. PM2 启动 | `pm2 start ecosystem.config.js` | <1 分钟 |
| 9. Nginx 配置 | 宝塔面板 + `nginx -s reload` | 2 分钟 |
| 10. SSL（可选） | 宝塔 Let's Encrypt | 3 分钟 |
| 11. 验证 | 浏览器测试 | 2 分钟 |

**总耗时**: 约 15-25 分钟

---

**祝部署顺利！** 🚀

如有问题，查看 PM2 日志：`pm2 logs`
