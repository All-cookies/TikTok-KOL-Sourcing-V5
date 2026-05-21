# 建联优先级评分与博主分层 V2

## V2 增强点

相比 V1，新增：
- **互动率维度**：新增 engagement_rate 评分项
- **内容类型推断**：根据 bio 和视频 desc 推断内容类型
- **国家/地区推断**：支持按国家筛选

---

## 评分维度

| 维度 | 分值 | 说明 |
|------|------|------|
| 有邮箱 | +30 | bio 中能提取到有效邮箱，可直接发开发信 |
| 粉丝量在目标区间 | +20 | 在设定的 FOLLOWER_MIN ~ FOLLOWER_MAX 之间 |
| bio 品类匹配 | +15 | bio 中包含品类关键词，说明博主定位契合 |
| 竞品词来源 | +15 | 从竞品关键词搜索到的博主，品类兴趣已验证 |
| 活跃创作者 | +10 | 视频数 > 30，说明持续在创作 |
| 场景词来源 | +10 | 从场景关键词搜索到，人群重合度高 |
| 建联信号词 | +10 | bio 含 PR/collab/business/partner/brand/sponsor/email/contact 等 |
| **互动率 > 5%** | +10 | V2 新增：粉丝粘性高 |
| **内容类型匹配** | +5 | V2 新增：内容类型与产品相关 |

**满分**: 125 分（实际很难全满，60+ 就是高质量线索）

---

## 博主分层

| 层级 | 分数 | 含义 | 建联策略 |
|------|------|------|---------|
| A 级 | ≥ 60 | 优先建联 | 直接发开发信或 DM，准备好产品介绍和报价 |
| B 级 | 40-59 | 值得联系 | 可以先互动（评论、点赞），再发建联信 |
| C 级 | < 40 | 备选观察 | 先加入观察列表，等后续有更多信息再决定 |

---

## 粉丝量区间参考

不同层级的红人适合不同阶段和预算：

| 层级 | 粉丝量 | 特点 | 适用场景 |
|------|--------|------|---------|
| 纳米红人 | 1k - 10k | 互动率高、成本低、真实感强 | 种子期、UGC 素材收集 |
| 微型红人 | 10k - 100k | 性价比最优、品类垂直 | 日常推广、建立口碑 |
| 中型红人 | 100k - 500k | 有一定影响力、粉丝忠诚 | 新品发布、品牌背书 |
| 大型红人 | 500k+ | 曝光量大、品牌效应强 | 大型 campaign、品牌合作 |

**默认推荐**: 微型 + 中型（10k-500k），性价比最优且合作意愿高。

---

## V2 新增：互动率分级

### 计算公式
```
engagement_rate = (best_video_likes + best_video_comments) / follower_count × 100%
```

### 分级标准

| 等级 | 互动率 | 说明 |
|------|--------|------|
| 高互动 | > 5% | 粉丝粘性高，互动积极 |
| 中互动 | 2% - 5% | 正常水平，活跃度良好 |
| 低互动 | < 2% | 可能存在刷量嫌疑或粉丝质量低 |

### 互动率评分

| 互动率 | 评分 |
|--------|------|
| > 10% | +10 |
| 5% - 10% | +5 |
| 2% - 5% | 0（正常） |
| < 2% | -5（可疑） |

---

## Bio 建联信号词

以下词出现在 bio 中，说明博主对品牌合作持开放态度：

### 高意愿信号
- `business inquiries` / `business email`
- `PR friendly` / `PR welcome`
- `collab` / `collaboration`
- `brand partnerships`
- `sponsor` / `sponsored`
- `contact` / `reach out`
- `management` / `mgmt`（有经纪人）

### 中等信号
- `email` / `📧` / `✉️`（放了联系方式）
- `link in bio`（有落地页）
- `ambassador`（已有品牌合作经验）

### 弱信号
- `creator` / `content creator`
- `influencer`
- `blogger` / `vlogger`

---

## V2 新增：内容类型推断

从 bio 和视频 desc 中推断内容类型：

| 类型 | 关键词/信号 | 示例 |
|------|------------|------|
| 测评 | "review", "测评", "评测", "honest opinion" | "skincare review" |
| 开箱 | "unboxing", "开箱", "包装" | "new product unboxing" |
| 教程 | "tutorial", "how to", "教程", "教学" | "how to apply makeup" |
| 生活方式 | "vlog", "routine", "day in my life", "日常" | "morning routine" |
| 搞笑 | "comedy", "funny", "搞笑" | "comedy sketch" |
| 美妆 | "beauty", "makeup", "美妆" | "makeup tutorial" |
| 健身 | "fitness", "workout", "健身" | "gym workout" |
| 3C | "tech", "gadget", "电子" | "tech review" |

**内容类型评分**：
- 内容类型与产品相关：+5
- 内容类型与产品无关：0
- 内容类型高度匹配（如测评类配测评产品）：+10

---

## 品类评分微调 V2

### 美妆护肤
- bio 匹配额外看：`skincare`, `beauty`, `makeup`, `mua`, `esthetician`
- 粉丝量区间建议偏小（5k-200k），美妆小博主互动率更高
- 内容类型优先：测评、美妆、生活方式

### 3C 电子
- bio 匹配额外看：`tech`, `gadget`, `reviewer`, `unboxing`
- 粉丝量区间可偏大（50k-1M），3C 需要曝光
- 内容类型优先：测评、开箱、教程

### 食品饮料
- bio 匹配额外看：`foodie`, `recipe`, `cook`, `nutrition`, `fitness`
- 场景词来源加分可提高到 +15（食品和生活方式强关联）
- 内容类型优先：教程、生活方式、测评

### 服饰时尚
- bio 匹配额外看：`fashion`, `style`, `outfit`, `haul`
- 竞品词加分更重要（时尚品类品牌忠诚度影响大）
- 内容类型优先：开箱、生活方式、测评

### 文具办公
- bio 匹配额外看：`stationery`, `study`, `planner`, `journaling`, `student`
- 纳米红人也很有价值（文具社区很垂直）
- 内容类型优先：教程、生活方式

### 电子烟（V2 新增）
- bio 匹配额外看：`vape`, `vaping`, `vaper`, `smoke`, `cigarette alternative`
- 粉丝量区间建议（10k-500k）
- 内容类型优先：测评、生活方式、搞笑
- 注意：电子烟内容在部分国家有推广限制

---

## 建联建议输出 V2

采集完成后，Claude 应在摘要中给出可操作的建联建议，包括：

1. **从哪开始**: 先联系 A 级中有邮箱的博主
2. **哪类博主转化率高**: 竞品词搜出的博主 > 品类词 > 场景词 > 人群词
3. **特殊发现**: bio 中有合作信号词的博主数量、有经纪人的博主
4. **互动率分析**: 高互动率博主占比、平均互动率
5. **内容类型分布**: 主要内容类型、最适合产品推广的类型
6. **注意事项**: 如果某关键词搜出的博主和产品不够匹配，提醒用户
7. **下一步**: 建议用户接下来可以做什么（写开发信、准备 media kit 等）

---

## V2 评分计算示例

```
博主数据：
- unique_id: @vape_review_pro
- follower_count: 85,000
- video_count: 156
- bio: "Vape reviewer | Tech geek | PR friendly"
- search_keyword: "ELF BAR review"
- best_video_likes: 12,500
- best_video_comments: 890

评分计算：
- 有邮箱: 0（bio中无邮箱）
- 粉丝量在区间: +20（85K在10K-500K区间）
- bio品类匹配: +15（"vape", "reviewer"）
- 竞品词来源: +15（"ELF BAR"是竞品词）
- 活跃创作者: +10（156 > 30）
- 场景词来源: 0（不是场景词搜索）
- 建联信号词: +10（"PR friendly"）
- 互动率: +5（85K粉丝，13.4K互动 = 15.8%，>10%所以+10...这里纠正一下）
  实际互动率 = (12500 + 890) / 85000 = 15.8% > 10%，所以 +10

总分: 30 + 20 + 15 + 15 + 10 + 10 + 10 = 110分 → A级

但如果没有邮箱，只有 80 分 → B级
```

---

## 输出格式

### CSV 列（V2 新增）

```
priority_score, tier, username, nickname, follower_count, video_count,
bio, email, profile_url, search_keyword, has_email, bio_category_match,
engagement_rate, country, content_type, bio_link
```

V2 新增字段：
- `engagement_rate`：互动率百分比
- `country`：推断的国家（可能为空）
- `content_type`：推断的内容类型

### 评分摘要格式

```
📊 评分摘要
━━━━━━━━━━━━━━━━━━━━━━━━━━
总博主数：{total}
A/B/C 级分布：{aCount}A / {bCount}B / {cCount}C
有邮箱：{emailCount}（{emailRate}%）
平均互动率：{avgEngagement}%
平均粉丝：{avgFollower}K

📈 互动率分布：
- 高互动（>5%）：{highEngagement}位
- 中互动（2-5%）：{midEngagement}位
- 低互动（<2%）：{lowEngagement}位

📋 内容类型分布：
- 测评：{reviewCount}位
- 开箱：{unboxingCount}位
- 教程：{tutorialCount}位
- 生活方式：{lifestyleCount}位
- 其他：{otherCount}位
━━━━━━━━━━━━━━━━━━━━━━━━━━
```