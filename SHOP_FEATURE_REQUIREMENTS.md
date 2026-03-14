# CodeHost 商城功能需求增量文档

## 1. 功能概览

在 CodeHost 代码托管平台基础上新增 **商城（Shop）** 模块，支持管理员上架实体/数字产品，用户可浏览、加入购物车并下单购买。

---

## 2. 数据模型新增

### 2.1 Product（产品表）
| 字段 | 类型 | 说明 |
|------|------|------|
| id | String (cuid) | 主键 |
| title | String(255) | 产品标题 |
| slug | String(255) unique | URL 友好标识 |
| shortDescription | String(500) | 短描述（列表/卡片展示用） |
| description | Text | 完整描述（富文本/长文本） |
| price | Float | 产品价格 |
| mainImage | String(1000) | 主图路径 |
| status | String(20) | "ACTIVE" \| "INACTIVE"，默认 ACTIVE |
| createdAt | DateTime | 创建时间 |
| updatedAt | DateTime | 更新时间 |

### 2.2 ProductImage（产品图片表，最多6张附图）
| 字段 | 类型 | 说明 |
|------|------|------|
| id | String (cuid) | 主键 |
| url | String(1000) | 图片路径 |
| sortOrder | Int | 排序 |
| productId | FK → Product | 所属产品 |

### 2.3 ProductVariant（产品变体表）
| 字段 | 类型 | 说明 |
|------|------|------|
| id | String (cuid) | 主键 |
| name | String(255) | 变体名称（如 "标准版"、"高级版"） |
| price | Float | 变体价格 |
| stock | Int | 库存（-1 表示无限） |
| productId | FK → Product | 所属产品 |

### 2.4 CartItem（购物车条目表）
| 字段 | 类型 | 说明 |
|------|------|------|
| id | String (cuid) | 主键 |
| quantity | Int | 数量，默认 1 |
| userId | FK → User | 所属用户 |
| productId | FK → Product | 产品 |
| variantId | FK → ProductVariant? | 可选变体 |
| createdAt | DateTime | 添加时间 |

### 2.5 ProductOrder（产品订单表）
| 字段 | 类型 | 说明 |
|------|------|------|
| id | String (cuid) | 主键 |
| orderNo | String(50) unique | 订单号 |
| totalAmount | Float | 订单总金额 |
| status | String(20) | "PENDING" \| "PAID" \| "CANCELLED" |
| userId | FK → User | 下单用户 |
| createdAt | DateTime | 下单时间 |
| updatedAt | DateTime | 更新时间 |

### 2.6 ProductOrderItem（订单明细表）
| 字段 | 类型 | 说明 |
|------|------|------|
| id | String (cuid) | 主键 |
| quantity | Int | 数量 |
| price | Float | 成交单价 |
| orderId | FK → ProductOrder | 所属订单 |
| productId | FK → Product | 产品 |
| variantId | FK → ProductVariant? | 变体 |

---

## 3. API 设计

### 3.1 管理员产品管理 API
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/admin/products | 获取全部产品列表（分页、搜索） |
| POST | /api/admin/products | 创建产品（含主图、附图、变体） |
| PATCH | /api/admin/products/[id] | 编辑产品 |
| DELETE | /api/admin/products/[id] | 删除产品 |
| POST | /api/admin/products/upload | 上传产品图片 |

### 3.2 前台产品浏览 API
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/products | 获取 ACTIVE 产品列表（分页、搜索） |
| GET | /api/products/[id] | 获取单个产品详情 |

### 3.3 购物车 API
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/cart | 获取当前用户购物车 |
| POST | /api/cart | 添加商品到购物车 |
| PATCH | /api/cart/[id] | 修改购物车数量 |
| DELETE | /api/cart/[id] | 删除购物车条目 |

### 3.4 产品订单 API
| 方法 | 路径 | 说明 |
|------|------|------|
| POST | /api/product-orders | 创建订单（从购物车/直接购买） |
| GET | /api/product-orders | 获取当前用户订单列表 |

---

## 4. 前端页面

### 4.1 Shop 页面（/shop）
- 产品网格卡片展示（主图、标题、短描述、价格）
- 搜索和排序
- 分页
- 导航栏与现有页面保持一致

### 4.2 产品详情页（/shop/[slug]）
- 主图 + 附图画廊
- 标题、价格、短描述、完整描述
- 变体选择器
- "Add to Cart" 按钮和 "Buy Now" 按钮
- Buy Now 直接创建订单跳转

### 4.3 购物车页面（/cart）
- 列出用户购物车中所有商品
- 修改数量、删除
- 显示总价
- "Checkout" 按钮，创建订单

### 4.4 后台管理 - Products Tab
- 在 /codeadmin 页面新增 "Products" 选项卡
- 产品列表（表格），支持搜索、分页
- 创建/编辑产品模态窗：标题、slug、短描述、描述、价格、主图上传、附图上传（最多6张）、变体管理（动态增删）
- 删除产品、上下架切换

---

## 5. 仪表盘 & 主页改动

### 5.1 Dashboard 右上角用户下拉菜单
- 新增 "My Cart" 菜单项，使用 ShoppingCart 图标
- "My Orders" 改用 Receipt / ClipboardList 图标（非 ShoppingCart）
- 新增 "Shop" 菜单项

### 5.2 主页（/）
- 在 "Sell your Code" 区块之后新增 "Featured Products" 区块
- 展示最新 6 个 ACTIVE 状态的产品卡片（主图、标题、价格）
- "Browse All Products →" 按钮链接到 /shop

---

## 6. 图片存储
- 产品图片存储在 `public/uploads/products/` 目录
- 通过 API 上传，服务端生成唯一文件名
- 支持 jpg/png/webp 格式

---

## 7. 风格一致性
- 所有新页面使用现有 `texture-lines` 背景 class
- 使用 `border-4 border-foreground` 风格的卡片
- `font-display` 标题字体、`font-mono text-xs tracking-widest uppercase` 标签
- 按钮使用现有 Button 组件
- 保持 `max-w-6xl mx-auto px-6 md:px-8 lg:px-12` 布局限宽
