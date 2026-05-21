# 产品诊断与搜索策略 V2

## V2 增强点

相比 V1，新增：
- **自动产品分析**：通过 OpenCLI 抓取亚马逊商品页面，自动提取产品信息
- **竞品对比分析**：基于提取的竞品信息，生成更精准的搜索策略
- **产品画像生成**：自动生成产品卖点摘要，用于开发信个性化

---

## 产品信息收集

### 模式一：自动提取（推荐）

当用户提供亚马逊链接时，优先使用 OpenCLI 自动提取：

```bash
npx @jackwener/opencli@latest amazon product <商品链接>
```

**支持的市场**：
- Amazon.com / Amazon.co.uk / Amazon.de
- Amazon.sg / Amazon.com.my / Amazon.co.id / Amazon.ph
- Amazon.com.au / Amazon.ca / Amazon.fr / Amazon.it / Amazon.es / Amazon.nl

**提取字段**：
| 字段 | 示例 |
|------|------|
| 产品名称 | "KANGVAPE Evolv Bar 2000 Puffs disposable" |
| 品牌 | "KANGVAPE" |
| 评分 | 4.2 |
| 评论数 | 12,847 |
| 品类 | "Health & Household > Smoking Cessation" |
| 价格 | $12.99 |
| 卖点 | "2000 Puffs, 5% Nicotine, 8ml Tank, 1500mAh Battery" |
| 竞品（相关推荐） | "ELF BAR", "Puff Bar", "Mr. Fog" |

**方式一：OpenCLI 自动抓取（推荐）**
```bash
npx @jackwener/opencli@latest amazon product <商品链接>
```
- 检查是否可用：`npx @jackwener/opencli@latest --version`
- 如果正常运行，直接使用 npx 方式执行
- 执行成功后自动提取：品牌、产品名称、评分、评论数、品类、卖点

**OpenCLI 失败时的降级方案**：

如果 OpenCLI 无法获取，自动切换到手动输入模式，询问用户：
> 请提供：产品名称、品牌、品类、目标市场、主要卖点（2-3个）、竞品品牌（可选）

---

### 模式二：手动输入（备选）

如果用户不想安装 OpenCLI，直接收集以下信息：

| 字段 | 必要性 | 推断规则 |
|------|--------|---------|
| 产品名称 | 必填 | — |
| 产品品类 | 必填 | 可从产品名推断 |
| 目标市场 | 必填 | 默认美国 |
| 目标人群 | 重要 | 可从品类+价格推断 |
| 核心卖点 | 重要 | 可从产品描述提取 |
| 价格区间 | 可选 | 影响红人层级选择 |
| 竞品品牌 | 可选 | 有则加竞品词维度 |

---

## 输出：产品诊断卡

自动提取或手动输入完成后，输出标准格式：

```
📦 产品诊断卡 V2
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
产品：KANGVAPE Evolv Bar 2000 Puffs
品牌：KANGVAPE
品类：Health & Household > 一次性电子烟
市场：美国 / 英国 / 德国
价格：$12.99
评分：4.2（12,847条评论）
评论关键词：["smooth hit", "great flavor", "long lasting", "leakage"]

🔍 竞品监测：
- ELF BAR 2500 — 评分 4.4，评论 15,000+
- Puff Bar — 评分 4.1，评论 8,000+
- Mr. Fog — 评分 4.0，评论 5,000+

💡 卖点提炼：
1. 2000 Puffs 超长寿命（竞品普遍 1500）
2. 5% Nicotine 强劲体验
3. 1500mAh 大容量电池

👥 目标人群：
- 现有电子烟用户（寻求方便携带）
- 25-45岁男性为主
- 寻求替代传统烟草产品
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## 搜索策略：四维关键词模型 V2

### 维度一：品类词

直接搜产品品类相关内容，找已经在做该品类内容的博主。

- 核心品类名 + review / haul / unboxing / tutorial
- 细分品类名 + 内容类型

**电子烟品类词示例**：
- `vape review` / `disposable vape review`
- `best flavors` / `vape flavors`
- `vape unboxing` / `new vape`

### 维度二：场景词

搜目标人群的使用场景，找与人群重合度高的博主。

- 使用场景 + vlog / routine / day in my life
- 生活方式关键词

**电子烟场景词示例**：
- `vape on the go` / `daily vape routine`
- `smoking alternative` / `quit smoking`
- `vape lifestyle` / `cloud chasing`

### 维度三：竞品词

搜已经在推竞品的博主，这些博主品类兴趣已验证、转化可能性最高。

- 竞品品牌名 + review / vs / comparison / alternative
- 仅在用户提供了竞品信息时使用

**电子烟竞品词示例**：
- `ELF BAR review` / `ELF BAR 2500`
- `Puff Bar flavors`
- `Mr. Fog review`

### 维度四：人群词

搜目标人群聚集的泛内容，扩大漏斗。

- 人群身份标签 + essentials / favorites / must have
- 人群活动场景

**电子烟人群词示例**：
- `vaper essentials` / `must have vapes`
- `smoker life` / `替代烟草`

---

## 品类搜索策略模板

### 美妆护肤

| 维度 | 关键词示例 |
|------|-----------|
| 品类词 | `skincare routine`, `foundation review`, `{product} tutorial` |
| 场景词 | `get ready with me`, `morning routine`, `night skincare` |
| 竞品词 | `{competitor} review`, `{competitor} vs`, `{competitor} dupe` |
| 人群词 | `beauty favorites`, `holy grail products`, `drugstore makeup` |

### 3C 电子

| 维度 | 关键词示例 |
|------|-----------|
| 品类词 | `{category} unboxing`, `{category} review`, `tech haul` |
| 场景词 | `desk setup`, `work from home setup`, `gaming setup` |
| 竞品词 | `{competitor} review`, `{competitor} vs {competitor}` |
| 人群词 | `tech essentials`, `best gadgets`, `student tech` |

### 食品饮料

| 维度 | 关键词示例 |
|------|-----------|
| 品类词 | `{category} taste test`, `{category} review`, `trying {product}` |
| 场景词 | `what I eat in a day`, `meal prep`, `healthy recipes` |
| 竞品词 | `{competitor} review`, `{competitor} taste test` |
| 人群词 | `healthy snacks`, `fitness nutrition`, `vegan food` |

### 电子烟（新增）

| 维度 | 关键词示例 |
|------|-----------|
| 品类词 | `vape review`, `disposable vape`, `vape flavors`, `best vape 2024` |
| 场景词 | `daily vape routine`, `vape on the go`, `cloud chasing`, `smoking alternative` |
| 竞品词 | `ELF BAR review`, `Puff Bar`, `{competitor} vs` |
| 人群词 | `vaper essentials`, `smoker life`, `quit smoking journey` |

### 健身运动

| 维度 | 关键词示例 |
|------|-----------|
| 品类词 | `{category} review`, `gym equipment review`, `{product} test` |
| 场景词 | `workout routine`, `gym vlog`, `fitness journey` |
| 竞品词 | `{competitor} review`, `{competitor} vs` |
| 人群词 | `fitness essentials`, `gym must haves`, `home workout` |

---

## 目标市场对搜索语言的影响

| 市场 | 搜索语言 | 注意事项 |
|------|---------|---------|
| 美国/英国/澳洲 | 英文 | 默认语言 |
| 日本 | 日文 | 用日文关键词，如「スキンケア」「開封」 |
| 韩国 | 韩文 | 用韩文，如「리뷰」「하울」 |
| 东南亚 | 英文 + 当地语言 | 印尼/泰国/越南分别处理 |
| 拉美 | 西班牙文 | 如 `reseña`, `rutina de skincare` |
| 中东 | 阿拉伯文/英文 | 部分博主用英文内容 |

---

## 输出格式

产品诊断完成后，输出搜索策略建议，格式：

```
📋 产品诊断摘要
- 产品：{name} ({category})
- 市场：{markets}
- 人群：{audience}
- 卖点：{usp}
- 竞品：{competitors}

🔍 推荐搜索关键词（共 {n} 组）

品类词：
  1. "{keyword}" — 搜已经在做{category}内容的博主
  2. "{keyword}" — ...

场景词：
  3. "{keyword}" — 搜{audience}常看的内容场景
  4. "{keyword}" — ...

竞品词：
  5. "{keyword}" — 搜已经在推{competitor}的博主，转化潜力最高

人群词：
  6. "{keyword}" — 扩大漏斗，触达泛{audience}群体

建议每组抓取 {n} 条，合计约 {total} 位博主（去重后预计 {estimated}）

确认这些关键词可以吗？想增减或调整哪些？
```