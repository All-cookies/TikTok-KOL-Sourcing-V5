# 多维筛选规则

## 概述

V2 版本新增多维筛选功能，支持按互动率、国家、内容类型、粉丝区间等多维度筛选红人。

---

## 筛选维度

### 维度一：互动率（Engagement Rate）

**计算公式**：
```
互动率 = (点赞数 + 评论数) / 粉丝数 × 100%
```

**分级标准**：

| 等级 | 互动率范围 | 说明 |
|------|-----------|------|
| 高互动 | > 5% | 粉丝粘性高，互动积极 |
| 中互动 | 2% - 5% | 正常水平，活跃度良好 |
| 低互动 | < 2% | 可能存在刷量嫌疑或粉丝质量低 |

**筛选语法**：
```
engagement_rate > 5%
engagement_rate >= 2% AND engagement_rate <= 5%
engagement_rate < 2%
```

---

### 维度二：粉丝数量

**分级标准**：

| 等级 | 粉丝范围 | 说明 |
|------|---------|------|
| 纳米红人 | 1K - 10K | 互动率高、成本低、真实感强 |
| 微型红人 | 10K - 100K | 性价比最优、品类垂直 |
| 中型红人 | 100K - 500K | 有一定影响力、粉丝忠诚 |
| 大型红人 | 500K+ | 曝光量大、品牌效应强 |

**筛选语法**：
```
follower_count >= 10000 AND follower_count <= 100000
follower_count > 500000
follower_count < 10000
```

---

### 维度三：国家/地区

**常用国家代码**：

| 代码 | 国家 | 说明 |
|------|------|------|
| US | 美国 | 最大市场 |
| UK | 英国 | 欧洲市场入口 |
| ID | 印度尼西亚 | 东南亚最大市场 |
| MY | 马来西亚 | 东南亚成熟市场 |
| PH | 菲律宾 | 东南亚增长市场 |
| TH | 泰国 | 东南亚新兴市场 |
| VN | 越南 | 东南亚增长市场 |
| BR | 巴西 | 南美最大市场 |
| MX | 墨西哥 | 拉美成熟市场 |
| KR | 韩国 | 东亚市场 |
| JP | 日本 | 东亚成熟市场 |

**注意**：TikHub API 返回的地理位置数据有限，可能需要从 bio/内容中推断

**筛选语法**：
```
country = US
country IN (US, UK, AU)
country != CN
```

---

### 维度四：内容类型

从红人的 bio 和近期视频 desc 中推断内容类型：

| 类型 | 关键词/信号 | 说明 |
|------|------------|------|
| 测评 | "review", "测评", "评测", "honest" | 产品体验分享 |
| 开箱 | "unboxing", "开箱", "包装" | 新品展示 |
| 教程 | "tutorial", "how to", "教程", "教学" | 技能分享 |
| 生活方式 | "vlog", "routine", "day in my life", "日常" | 日常分享 |
| 搞笑 | "comedy", "funny", "搞笑", "meme" | 娱乐内容 |
| 美妆 | "beauty", "makeup", "美妆", "skincare" | 美容相关 |
| 健身 | "fitness", "workout", "健身", "gym" | 运动健康 |
| 3C | "tech", "gadget", "3C", "电子" | 科技数码 |

**筛选语法**：
```
content_type = 测评
content_type IN (测评, 开箱)
content_type != 搞笑
```

---

### 维度五：邮箱可用性

| 状态 | 说明 |
|------|------|
| 有邮箱 | bio 中提取到有效邮箱，可直接建联 |
| 无邮箱 | 无法直接邮件联系 |

**筛选语法**：
```
has_email = true
has_email = false
```

---

### 维度六：Bio 信号词

**高意愿信号**：
- `business inquiries` / `business email`
- `PR friendly` / `PR welcome`
- `collab` / `collaboration`
- `brand partnerships`
- `sponsor` / `sponsored`
- `contact` / `reach out`
- `management` / `mgmt`

**中意愿信号**：
- `email` / `📧` / `✉️`
- `link in bio`
- `ambassador`

**筛选语法**：
```
bio_signal = high    # 含高意愿信号
bio_signal = medium   # 含中意愿信号
bio_signal = none     # 无明显信号
```

---

### 维度七：建联评分等级

| 等级 | 分数范围 | 说明 |
|------|---------|------|
| A 级 | ≥ 60 | 优先建联 |
| B 级 | 40-59 | 值得联系 |
| C 级 | < 40 | 备选观察 |

**筛选语法**：
```
tier = A
tier IN (A, B)
tier != C
```

---

## 组合筛选语法

支持多条件组合，使用 `AND` / `OR` 逻辑：

### 示例

**示例 1：高互动美国博主**
```
engagement_rate > 3% AND country = US AND has_email = true
```

**示例 2：微型测评博主，有合作意向**
```
follower_count >= 10000 AND follower_count <= 100000
AND content_type = 测评
AND bio_signal = high
```

**示例 3：A/B级有邮箱博主**
```
tier IN (A, B) AND has_email = true
```

**示例 4：排除低互动和C级**
```
engagement_rate >= 2% AND tier != C
```

---

## 筛选结果输出

### 输出格式

筛选完成后，输出结果摘要：

```
🎯 筛选结果

📊 筛选条件：
- 互动率 > 3%
- 国家 = US
- 有邮箱 = true

📈 筛选统计：
- 原始数据：{total} 位
- 符合条件：{filtered} 位（{rate}%）
- A 级：{aCount} 位
- B 级：{bCount} 位
- 有邮箱：{emailCount} 位

📋 Top 10（按评分排序）：
  1. @{username} | {tier}级 | {follower_count}粉丝 | 互动率{engagement_rate}%
  ...

📁 筛选结果已保存：
- CSV: output/kol-filtered-{timestamp}.csv
- 报告: output/kol-filtered-{timestamp}.html
```

---

## 筛选操作流程

### 步骤 1：展示当前数据统计

```
📊 当前数据概览
━━━━━━━━━━━━━━━━━━━━
总博主数：{total}
A/B/C 级分布：{aCount}A / {bCount}B / {cCount}C
有邮箱：{emailCount}（{emailRate}%）
平均互动率：{avgEngagement}%
━━━━━━━━━━━━━━━━━━━━
```

### 步骤 2：询问筛选偏好

```
你想从哪个维度筛选？（输入数字或多选）
1. 互动率（高/中/低）
2. 粉丝区间
3. 国家
4. 内容类型
5. 邮箱可用性
6. 组合筛选（多条件）

或者直接用自然语言描述你的需求，例如：
"帮我筛选美国的高互动测评博主"
```

### 步骤 3：执行筛选

根据用户选择，执行筛选逻辑，输出结果。

### 步骤 4：保存筛选结果

将筛选结果保存为新的 CSV + HTML 报告。

---

## 注意事项

1. **数据精度**：TikHub 返回的数据中，国家/地区字段可能不完整，需要从 bio 中推断
2. **互动率计算**：使用 `best_video` 的数据计算，非平均数据
3. **筛选结果排序**：默认按 `priority_score` 降序排列
4. **历史筛选**：每次筛选生成新文件，不覆盖原始数据

---

## 快速筛选模板

### 模板一：找 A 级有邮箱博主
```
tier = A AND has_email = true
```
→ 输出：可直接发送开发信的博主列表

### 模板二：找高互动微型博主
```
follower_count >= 10000 AND follower_count <= 100000 AND engagement_rate > 5%
```
→ 输出：高性价比博主（互动高+成本适中）

### 模板三：找美国市场博主
```
country = US AND (tier = A OR tier = B) AND has_email = true
```
→ 输出：美国市场优先建联名单

### 模板四：找竞品词来源博主
```
search_keyword CONTAINS (竞品品牌名) AND tier IN (A, B)
```
→ 输出：已验证的竞品受众转化目标