import "dotenv/config";
import { writeFileSync, mkdirSync, existsSync } from "fs";
import { join } from "path";

// ============================================================
// CUSTOMIZE: AI+塔罗/心理陪伴 采集任务
// ============================================================

const SEARCH_TASKS = [
  // 品类词 - 已经在做这类内容的博主
  { keyword: "tarot reading", dimension: "category" as const },
  { keyword: "astrology tiktok", dimension: "category" as const },
  { keyword: "psychic reading", dimension: "category" as const },
  { keyword: "spiritual guidance", dimension: "category" as const },
  { keyword: "meditationasmr", dimension: "category" as const },
  // 场景词 - 目标用户常看的视频类型
  { keyword: "anxiety relief routine", dimension: "scene" as const },
  { keyword: "manifestation techniques", dimension: "scene" as const },
  { keyword: "witchy routine", dimension: "scene" as const },
  { keyword: "morning spiritual routine", dimension: "scene" as const },
  { keyword: "night meditation routine", dimension: "scene" as const },
  // 竞品词 - 推过相关内容的博主
  { keyword: "AI tarot reading", dimension: "competitor" as const },
  { keyword: "ai oracle app", dimension: "competitor" as const },
  { keyword: "spiritual app review", dimension: "competitor" as const },
  // 人群词 - 覆盖更多潜在人选
  { keyword: "spiritual self care", dimension: "audience" as const },
  { keyword: "gen z wellness", dimension: "audience" as const },
  { keyword: "witchtok", dimension: "audience" as const },
];

const MAX_PAGES = 5;
const TARGET_TOTAL = 50;
const CATEGORY_KEYWORDS = ["tarot", "astrology", "psychic", "spiritual", "meditation", "mindfulness", "manifestation", "witch", "oracle", "zen"];
const COMPETITOR_KEYWORDS = ["ai tarot", "ai oracle", "spiritual app", "fortune telling", "mystical"];
const FOLLOWER_MIN = 5_000;
const FOLLOWER_MAX = 5_000_000;
const OUTPUT_LABEL = "ai-tarot-psychology";

// ============================================================
// Types
// ============================================================

type Dimension = "category" | "scene" | "competitor" | "audience";

interface Creator {
  unique_id: string;
  nickname: string;
  follower_count: number;
  video_count: number;
  bio: string;
  email: string | null;
  bio_link: string | null;
  profile_url: string;
  search_keyword: string;
  dimension: Dimension;
  best_video_plays: number;
  best_video_likes: number;
  best_video_desc: string;
}

interface ScoredCreator extends Creator {
  priority_score: number;
  tier: "A" | "B" | "C";
  has_email: boolean;
  has_bio_link: boolean;
  bio_category_match: boolean;
}

// ============================================================
// TikHub fetch
// ============================================================

function getApiKey(): string {
  const key = process.env.TIKHUB_API_KEY;
  if (!key) {
    console.error("❌ 请在 .env 文件中配置 TIKHUB_API_KEY");
    process.exit(1);
  }
  return key;
}

async function tikhubFetch(
  path: string,
  params: Record<string, string | number>
): Promise<any> {
  const url = new URL(`https://api.tikhub.io${path}`);
  Object.entries(params).forEach(([k, v]) =>
    url.searchParams.set(k, String(v))
  );
  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${getApiKey()}` },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
  return res.json();
}

// ============================================================
// Email extraction
// ============================================================

function extractEmail(text: string): string | null {
  if (!text) return null;
  const normalized = text
    .replace(/\[at\]/gi, "@").replace(/\(at\)/gi, "@").replace(/ at /gi, "@")
    .replace(/\[dot\]/gi, ".").replace(/\(dot\)/gi, ".").replace(/ dot /gi, ".");
  const m = normalized.match(/[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/);
  return m ? m[0].toLowerCase() : null;
}

// ============================================================
// Helpers
// ============================================================

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

// ============================================================
// Phase 1: Video search → extract authors
// ============================================================

async function searchByVideos(): Promise<Map<string, Creator>> {
  const creatorMap = new Map<string, Creator>();

  for (const task of SEARCH_TASKS) {
    console.log(`\n🔍 搜索: "${task.keyword}" (${task.dimension})`);
    let offset = 0;
    let pageCount = 0;

    while (pageCount < MAX_PAGES) {
      try {
        const data = await tikhubFetch(
          "/api/v1/tiktok/app/v3/fetch_general_search_result",
          { keyword: task.keyword, offset, count: 20, search_type: 1 }
        );

        const items: any[] = data?.data?.data || [];
        if (items.length === 0) break;

        let newCount = 0;
        for (const item of items) {
          const aweme = item?.aweme_info;
          if (!aweme) continue;
          const author = aweme.author;
          if (!author?.unique_id) continue;

          const uid = String(author.unique_id);
          const follower = Number(author.follower_count || 0);
          if (follower < FOLLOWER_MIN) continue;

          const plays = Number(aweme.statistics?.play_count || 0);
          const likes = Number(aweme.statistics?.digg_count || 0);
          const desc = String(aweme.desc || "").slice(0, 100);
          const bio = String(author.signature || author.search_user_desc || "");

          const existing = creatorMap.get(uid);
          if (existing) {
            if (plays > existing.best_video_plays) {
              existing.best_video_plays = plays;
              existing.best_video_likes = likes;
              existing.best_video_desc = desc;
            }
          } else {
            creatorMap.set(uid, {
              unique_id: uid,
              nickname: String(author.nickname || ""),
              follower_count: follower,
              video_count: Number(author.aweme_count || 0),
              bio,
              email: extractEmail(bio),
              bio_link: null,
              profile_url: `https://www.tiktok.com/@${uid}`,
              search_keyword: task.keyword,
              dimension: task.dimension,
              best_video_plays: plays,
              best_video_likes: likes,
              best_video_desc: desc,
            });
            newCount++;
          }
        }

        const hasMore = data?.data?.has_more;
        console.log(
          `   页 ${pageCount + 1}: +${newCount} 位新创作者，累计 ${creatorMap.size} 位`
        );

        if (!hasMore) break;
        offset += items.length;
        pageCount++;
        await sleep(1000);
      } catch (err) {
        console.error(`   ❌ 第 ${pageCount + 1} 页出错:`, err instanceof Error ? err.message : err);
        break;
      }
    }
  }

  return creatorMap;
}

// ============================================================
// Phase 2: Profile enrichment
// ============================================================

async function enrichWithProfile(creatorMap: Map<string, Creator>): Promise<void> {
  const creators = Array.from(creatorMap.values());
  console.log(`\n📋 Phase 2: 补全 ${creators.length} 位博主的 Profile...`);

  let enriched = 0;
  let emailFound = 0;
  let bioLinkFound = 0;

  for (let i = 0; i < creators.length; i++) {
    const c = creators[i];
    try {
      const data = await tikhubFetch(
        "/api/v1/tiktok/web/fetch_user_profile",
        { uniqueId: c.unique_id }
      );
      const user = data?.data?.userInfo?.user;
      if (!user) continue;

      const fullBio = String(user.signature || "");
      const email = extractEmail(fullBio);
      const bioLink = user.bioLink?.link ? String(user.bioLink.link) : null;

      c.bio = fullBio || c.bio;
      c.nickname = user.nickname || c.nickname;
      c.follower_count = user.followerCount ?? c.follower_count;
      c.video_count = user.videoCount ?? c.video_count;
      c.bio_link = bioLink;

      if (email && !c.email) {
        c.email = email;
        emailFound++;
      }
      if (bioLink) bioLinkFound++;
      enriched++;

      if ((i + 1) % 10 === 0) {
        process.stdout.write(
          `  进度: ${i + 1}/${creators.length}，邮箱+${emailFound}，链接+${bioLinkFound}\n`
        );
      }
      await sleep(150);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("429") || msg.includes("limit")) {
        console.error(`  ⚠️  触发 API 限速，暂停 10 秒...`);
        await sleep(10_000);
      }
    }
  }
  console.log(
    `  ✅ 补全完成：${enriched} 位，邮箱 ${emailFound} 个，bioLink ${bioLinkFound} 个`
  );
}

// ============================================================
// Outreach scoring
// ============================================================

const PR_SIGNALS = /\b(pr|collab|business|partner|brand|sponsor|email|contact|inquiry|ugc|creator|合作|商务)\b/i;

function scoreCreator(c: Creator): ScoredCreator {
  let score = 0;
  const bioLower = (c.bio || "").toLowerCase();

  if (c.email) score += 30;
  if (c.follower_count >= FOLLOWER_MIN && c.follower_count <= FOLLOWER_MAX) score += 20;

  const bioMatch = CATEGORY_KEYWORDS.some((k) => bioLower.includes(k));
  if (bioMatch) score += 15;

  if (c.dimension === "competitor") score += 15;
  if (c.video_count > 30) score += 10;
  if (c.dimension === "scene") score += 10;
  if (PR_SIGNALS.test(c.bio || "")) score += 10;
  if (c.bio_link) score += 5;
  if (c.best_video_plays > 100_000) score += 5;

  const tier = score >= 60 ? "A" : score >= 40 ? "B" : ("C" as const);

  return {
    ...c,
    priority_score: score,
    tier,
    has_email: !!c.email,
    has_bio_link: !!c.bio_link,
    bio_category_match: bioMatch,
  };
}

// ============================================================
// CSV output
// ============================================================

function esc(v: unknown): string {
  const s = String(v ?? "");
  return s.includes(",") || s.includes('"') || s.includes("\n")
    ? `"${s.replace(/"/g, '""')}"` : s;
}

function toCSV(creators: ScoredCreator[]): string {
  const headers = [
    "priority_score", "tier", "username", "nickname",
    "follower_count", "video_count", "bio", "email", "bio_link", "profile_url",
    "best_video_plays", "best_video_likes", "best_video_desc",
    "search_keyword", "has_email", "has_bio_link", "bio_category_match",
  ];
  const rows = creators.map((c) =>
    [
      c.priority_score, c.tier, "@" + c.unique_id, c.nickname,
      c.follower_count, c.video_count, c.bio, c.email || "", c.bio_link || "",
      c.profile_url, c.best_video_plays, c.best_video_likes,
      c.best_video_desc, c.search_keyword,
      c.has_email ? "Y" : "N", c.has_bio_link ? "Y" : "N", c.bio_category_match ? "Y" : "N",
    ].map(esc).join(",")
  );
  return "﻿" + [headers.join(","), ...rows].join("\n");
}

// ============================================================
// HTML Report
// ============================================================

function escHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function toHTMLReport(
  creators: ScoredCreator[],
  kwStats: Map<string, number>,
  csvPath: string,
  timestamp: string
): string {
  const total = creators.length;
  const tierA = creators.filter((c) => c.tier === "A").length;
  const tierB = creators.filter((c) => c.tier === "B").length;
  const tierC = creators.filter((c) => c.tier === "C").length;
  const withEmail = creators.filter((c) => c.has_email).length;
  const emailRate = total > 0 ? ((withEmail / total) * 100).toFixed(1) : "0";

  const kwEntries = Array.from(kwStats.entries()).sort((a, b) => b[1] - a[1]);
  const maxKwCount = kwEntries.length > 0 ? kwEntries[0][1] : 1;

  const rowsHtml = creators
    .map((c, i) => {
      const plays =
        c.best_video_plays >= 1_000_000
          ? (c.best_video_plays / 1_000_000).toFixed(1) + "M"
          : c.best_video_plays >= 1_000
          ? (c.best_video_plays / 1_000).toFixed(0) + "K"
          : String(c.best_video_plays);
      const tierBg = c.tier === "A" ? "bg-[#e8ece9] border-[#d2d9d4] text-[#526656]" : c.tier === "B" ? "bg-[#fef3c7] border-[#fde68a] text-[#92400e]" : "bg-[#fee2e2] border-[#fecaca] text-[#991b1b]";
      const tierText = c.tier === "A" ? "#526656" : c.tier === "B" ? "#92400e" : "#991b1b";
      const videoUrl = c.best_video_desc.includes("http")
        ? c.best_video_desc.match(/https?:\/\/[^\s]+/)?.[0] || ""
        : "";
      const videoDescClean = c.best_video_desc.replace(/https?:\/\/[^\s]+/g, "").trim();
      return `
      <tr data-keyword="${escHtml(c.search_keyword)}" data-tier="${c.tier}" data-search="${escHtml((c.nickname + " " + c.unique_id + " " + c.bio).toLowerCase())}" class="hover:bg-[#faf9f5] transition-colors border-b-2 border-[#c7c4ba]">
        <td class="px-4 py-4 text-[#aba79e]">${i + 1}</td>
        <td class="px-4 py-4"><span class="font-semibold border px-2 py-0.5 rounded text-[11px] ${tierBg}">${c.tier}</span></td>
        <td class="px-4 py-4">
          <a href="${escHtml(c.profile_url)}" target="_blank" class="text-[#3f3e3a] font-semibold hover:text-[#ac6c56] transition-colors block">@${escHtml(c.unique_id)}</a>
          <div class="text-[#8c8981] text-[11px] mt-0.5">${escHtml(c.nickname)}</div>
        </td>
        <td class="px-4 py-4 font-medium">${(c.follower_count / 1000).toFixed(1)}K</td>
        <td class="px-4 py-4 font-medium text-[#7a7770]">${plays}</td>
        <td class="px-4 py-4">
          ${c.email ? `<a href="mailto:${escHtml(c.email)}" class="text-[#6b8299] hover:text-[#4a5c6d] underline decoration-[#c5ced6] underline-offset-2">Email</a>` : '<span class="text-[#dedbd3]">—</span>'}
          ${c.bio_link ? `<span class="text-[#dedbd3] mx-1">|</span><a href="${escHtml(c.bio_link)}" target="_blank" class="text-[#6b8299] hover:text-[#4a5c6d] underline decoration-[#c5ced6] underline-offset-2">Bio Link</a>` : ''}
        </td>
        <td class="px-4 py-4 hidden sm:table-cell">
          <span class="text-[#7d6978] bg-[#f2edf0] px-2 py-1 rounded-md text-[11px]">${escHtml(c.search_keyword)}</span>
        </td>
      </tr>
      <tr class="bg-[#fdfbf7] border-b-2 border-[#c7c4ba]">
        <td colspan="7" class="px-4 py-3 text-[12px]">
          <div class="text-[#8c8981]">
            <span class="font-medium">Bio：</span>
            <span class="text-[#595751]">${escHtml(c.bio || "-")}</span>
          </div>
        </td>
      </tr>
      <tr class="bg-[#faf9f5] mb-3">
        <td colspan="7" class="px-4 py-3 text-[12px]">
          <div class="text-[#8c8981]">
            <span class="font-medium">matched video：</span>
            <span class="text-[#7a7770] italic">${escHtml(videoDescClean || "-")}</span>
            ${videoUrl ? `<a href="${escHtml(videoUrl)}" target="_blank" class="ml-2 text-[#6b8299] hover:text-[#4a5c6d] underline decoration-[#c5ced6] underline-offset-2">▶ 观看</a>` : ''}
          </div>
        </td>
      </tr>`;
    })
    .join("");

  const kwBarsHtml = kwEntries
    .map(([kw, count]) => {
      const pct = (count / maxKwCount) * 100;
      return `
      <div class="group cursor-default">
        <div class="flex justify-between items-center text-[13px] mb-1.5">
          <span class="text-[#595751]">${escHtml(kw)}</span>
          <span class="text-[#8c8981] font-medium">${count}</span>
        </div>
        <div class="bg-[#f2f0ea] h-2 rounded-full overflow-hidden">
          <div class="bg-[#c4b5a3] h-full rounded-full transition-all group-hover:bg-[#b0a18e]" style="width:${pct}%"></div>
        </div>
      </div>`;
    })
    .join("");

  const scr = "<" + "script>";

  return `<!DOCTYPE html>
<html lang="zh">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>TikTok KOL Report — ${OUTPUT_LABEL}</title>
<script src="https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4"></script>
<style>
::-webkit-scrollbar{width:8px;height:8px}
::-webkit-scrollbar-track{background:#fdfbf7}
::-webkit-scrollbar-thumb{background:#dedbd3;border-radius:10px;border:2px solid #fdfbf7}
::-webkit-scrollbar-thumb:hover{background:#c7c4ba}
::selection{background:#e8e3d5;color:#3f3e3a}
</style>
</head>
<body class="bg-[#fdfbf7] text-[#3f3e3a] font-sans antialiased min-h-screen">
<div class="max-w-[1200px] mx-auto px-6 py-12 md:py-16 space-y-10">

  <header class="space-y-3 pb-4">
    <div class="text-4xl mb-2">🔮</div>
    <h1 class="text-3xl font-bold tracking-tight text-[#2c2b28]">
      KOL 搜集报告
    </h1>
    <p class="text-[13px] text-[#8c8981] font-medium flex items-center gap-3">
      <span class="flex items-center gap-1.5">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
        ${timestamp}
      </span>
      <span>•</span>
      <span class="flex items-center gap-1.5">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4"></path></svg>
        ${OUTPUT_LABEL}
      </span>
    </p>
  </header>

  <div class="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-5">
    <div class="bg-white border border-[#ebe8e0] p-5 rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.02)] transition-shadow hover:shadow-[0_4px_12px_rgba(0,0,0,0.04)]">
      <p class="text-xs font-semibold text-[#8c8981] mb-2 tracking-wide">总博主数</p>
      <p class="text-3xl font-bold text-[#3f3e3a]">${total}</p>
    </div>
    <div class="bg-white border border-[#ebe8e0] p-5 rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.02)] transition-shadow hover:shadow-[0_4px_12px_rgba(0,0,0,0.04)]">
      <p class="text-xs font-semibold text-[#8c8981] mb-2 tracking-wide flex items-center gap-1.5">
        <span class="w-2 h-2 rounded-full bg-[#758a79]"></span> A 级优先
      </p>
      <p class="text-3xl font-bold text-[#526656]">${tierA}</p>
    </div>
    <div class="bg-white border border-[#ebe8e0] p-5 rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.02)] transition-shadow hover:shadow-[0_4px_12px_rgba(0,0,0,0.04)]">
      <p class="text-xs font-semibold text-[#8c8981] mb-2 tracking-wide flex items-center gap-1.5">
        <span class="w-2 h-2 rounded-full bg-[#91818c]"></span> 邮箱获取率
      </p>
      <div class="flex items-baseline gap-2">
        <span class="text-3xl font-bold text-[#7d6978]">${withEmail}</span>
        <span class="text-[11px] text-[#7d6978] font-medium bg-[#f2edf0] px-2 py-0.5 rounded-md">${emailRate}%</span>
      </div>
    </div>
    <div class="bg-white border border-[#ebe8e0] p-5 rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.02)] transition-shadow hover:shadow-[0_4px_12px_rgba(0,0,0,0.04)]">
      <p class="text-xs font-semibold text-[#8c8981] mb-2 tracking-wide flex items-center gap-1.5">
        <span class="w-2 h-2 rounded-full bg-[#c99583]"></span> B/C 级潜力
      </p>
      <p class="text-3xl font-bold text-[#ac6c56]">${tierB + tierC}</p>
    </div>
  </div>

  <section class="bg-white border border-[#ebe8e0] rounded-xl p-6 shadow-[0_2px_8px_rgba(0,0,0,0.02)]">
    <h2 class="text-[15px] font-semibold text-[#3f3e3a] mb-6 flex items-center gap-2">
      🌿 关键词标签画像
    </h2>
    <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
      ${kwBarsHtml}
    </div>
  </section>

  <section class="bg-white border border-[#ebe8e0] rounded-xl overflow-hidden shadow-[0_2px_8px_rgba(0,0,0,0.02)] flex flex-col">
      <div class="p-4 border-b border-[#ebe8e0] flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#faf9f5]">
        <div class="relative w-full sm:w-64">
          <svg class="absolute left-3 top-2.5 w-4 h-4 text-[#aba79e]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
          <input type="text" id="search" placeholder="搜索博主或邮箱..." oninput="filterRows()"
                 class="w-full bg-white text-[13px] text-[#3f3e3a] border border-[#e3dfd5] rounded-lg pl-9 pr-3 py-2 focus:outline-none focus:border-[#c4b5a3] focus:ring-1 focus:ring-[#c4b5a3] placeholder-[#aba79e] transition-shadow">
        </div>
        <div class="flex items-center gap-1 bg-[#f2f0ea] p-1 border border-[#e3dfd5] rounded-lg text-[13px] font-medium text-[#7a7770]">
          <button onclick="filterByTier('', this)" class="px-3 py-1.5 rounded-md transition-all toolbar-btn active-btn bg-white text-[#3f3e3a] shadow-[0_1px_2px_rgba(0,0,0,0.05)]">全部</button>
          <button onclick="filterByTier('A', this)" class="px-3 py-1.5 rounded-md transition-all toolbar-btn hover:text-[#3f3e3a]">A 级</button>
          <button onclick="filterByTier('B', this)" class="px-3 py-1.5 rounded-md transition-all toolbar-btn hover:text-[#3f3e3a]">B 级</button>
          <button onclick="filterByTier('C', this)" class="px-3 py-1.5 rounded-md transition-all toolbar-btn hover:text-[#3f3e3a]">C 级</button>
        </div>
      </div>

      <div class="overflow-x-auto">
        <div class="px-4 py-2 text-[11px] text-[#aba79e] bg-[#faf9f5] border-b border-[#ebe8e0]">
          💡 点击列标题可排序
        </div>
        <table class="w-full text-left border-collapse text-[13px] whitespace-nowrap">
          <thead>
            <tr class="border-b border-[#ebe8e0] bg-white text-[#8c8981] font-medium">
              <th onclick="sortTable(0)" class="px-4 py-3 hover:text-[#3f3e3a] cursor-pointer transition-colors w-12">#</th>
              <th onclick="sortTable(1)" class="px-4 py-3 hover:text-[#3f3e3a] cursor-pointer transition-colors w-16">评级</th>
              <th onclick="sortTable(2)" class="px-4 py-3 hover:text-[#3f3e3a] cursor-pointer transition-colors">博主</th>
              <th onclick="sortTable(3)" class="px-4 py-3 hover:text-[#3f3e3a] cursor-pointer transition-colors">粉丝数</th>
              <th onclick="sortTable(4)" class="px-4 py-3 hover:text-[#3f3e3a] cursor-pointer transition-colors">峰值播放</th>
              <th class="px-4 py-3 text-[#8c8981] cursor-default">联系方式</th>
              <th class="px-4 py-3 text-[#8c8981] cursor-default hidden sm:table-cell">标签来源</th>
            </tr>
          </thead>
          <tbody id="tableBody" class="divide-y divide-[#f2f0ea] text-[#595751]">
            ${rowsHtml}
          </tbody>
        </table>
        <div id="emptyState" class="p-16 text-center text-[#aba79e] text-[13px] hidden bg-white">
          📝 页面空空如也，试试更换关键词
        </div>
      </div>
    </section>

  <footer class="text-center pb-8">
    <p class="text-[12px] text-[#aba79e]">
      数据已导出至 <span class="bg-[#f2f0ea] px-1.5 py-0.5 rounded border border-[#e3dfd5] text-[#8c8981] font-mono">${escHtml(csvPath)}</span>
    </p>
  </footer>
</div>
${scr}
let currentTier = '';
function filterRows(){
  const q = document.getElementById('search').value.toLowerCase();
  const rows = document.querySelectorAll('#tableBody tr');
  let visible = 0;
  rows.forEach(row => {
    const tier = row.getAttribute('data-tier');
    const search = row.getAttribute('data-search').toLowerCase();
    const match = (!currentTier || tier === currentTier) && (!q || search.includes(q));
    row.style.display = match ? '' : 'none';
    if (match) visible++;
  });
  if (visible === 0) {
    document.getElementById('emptyState').classList.remove('hidden');
  } else {
    document.getElementById('emptyState').classList.add('hidden');
  }
}
function filterByTier(tier, btn){
  currentTier = tier;
  const parent = btn.parentElement;
  parent.querySelectorAll('.toolbar-btn').forEach(b => {
    b.classList.remove('active-btn', 'bg-white', 'text-[#3f3e3a]', 'shadow-[0_1px_2px_rgba(0,0,0,0.05)]');
  });
  btn.classList.add('active-btn', 'bg-white', 'text-[#3f3e3a]', 'shadow-[0_1px_2px_rgba(0,0,0,0.05)]');
  filterRows();
}
let sortDir = 1;
function sortTable(col){
  const tbody = document.getElementById('tableBody');
  const rows = Array.from(tbody.querySelectorAll('tr'));
  rows.sort((a,b) => {
    let av = a.cells[col].textContent.trim();
    let bv = b.cells[col].textContent.trim();
    const an = parseFloat(av.replace(/[^0-9.]/g,''));
    const bn = parseFloat(bv.replace(/[^0-9.]/g,''));
    if (!isNaN(an) && !isNaN(bn)) return sortDir * (an - bn);
    return sortDir * av.localeCompare(bv);
  });
  rows.forEach(r => tbody.appendChild(r));
  sortDir *= -1;
}
</script>
</body>
</html>`;
}

function writeMetaJson(csvPath: string, meta: Record<string, unknown>): void {
  const metaPath = csvPath.replace(/\.csv$/, ".meta.json");
  writeFileSync(metaPath, JSON.stringify(meta, null, 2), "utf8");
}

// ============================================================
// Main
// ============================================================

async function main() {
  console.log("🚀 开始 PETKIT 智能猫砂盆红人采集...\n");

  const creatorMap = await searchByVideos();
  console.log(`\n📊 Phase 1 完成：去重后共 ${creatorMap.size} 位博主`);

  await enrichWithProfile(creatorMap);

  const scored = Array.from(creatorMap.values())
    .map(scoreCreator)
    .sort((a, b) => b.priority_score - a.priority_score)
    .slice(0, TARGET_TOTAL);

  const tierA = scored.filter((c) => c.tier === "A").length;
  const tierB = scored.filter((c) => c.tier === "B").length;
  const tierC = scored.filter((c) => c.tier === "C").length;
  const withEmail = scored.filter((c) => c.has_email).length;
  const withBioLink = scored.filter((c) => c.has_bio_link).length;

  const kwStats = new Map<string, number>();
  for (const c of scored) {
    kwStats.set(c.search_keyword, (kwStats.get(c.search_keyword) || 0) + 1);
  }

  if (!existsSync("output")) mkdirSync("output", { recursive: true });
  const now = new Date();
  const ts = now.toISOString().replace(/[-:T]/g, "").slice(0, 14);
  const filename = `output/kol-${OUTPUT_LABEL}-${ts}.csv`;
  writeFileSync(filename, toCSV(scored), "utf-8");

  const htmlFilename = filename.replace(/\.csv$/, ".html");
  writeFileSync(
    htmlFilename,
    toHTMLReport(scored, kwStats, filename, now.toLocaleString("zh-CN")),
    "utf-8"
  );

  writeMetaJson(filename, {
    product: "PETKIT Cat Litter Box",
    timestamp: ts,
    total: scored.length,
    aCount: tierA,
    bCount: tierB,
    cCount: tierC,
    emailCount: withEmail,
    emailRate: scored.length > 0 ? Math.round((withEmail / scored.length) * 100) : 0,
    bioLinkCount: withBioLink,
    csvFile: filename.split("/").pop(),
    htmlFile: htmlFilename.split("/").pop(),
  });

  console.log("\n" + "=".repeat(50));
  console.log("🎯 红人建联名单已生成！\n");
  console.log("📊 采集摘要：");
  for (const [kw, count] of kwStats) {
    console.log(`   "${kw}": ${count} 位博主`);
  }
  console.log(`   合并去重后（Top ${TARGET_TOTAL}）：${scored.length} 位博主\n`);
  console.log("📋 建联分层：");
  console.log(`   A 级（优先建联）: ${tierA} 位`);
  console.log(`   B 级（值得联系）: ${tierB} 位`);
  console.log(`   C 级（备选观察）: ${tierC} 位\n`);
  console.log(`📧 有邮箱：${withEmail} 位（${((withEmail / scored.length) * 100).toFixed(1)}%）`);
  console.log(`📁 CSV：${filename}`);
  console.log(`🌐 报告：${htmlFilename}`);
  console.log("\n📌 Top 10 博主：");
  scored.slice(0, 10).forEach((c, i) => {
    const plays = c.best_video_plays >= 1_000_000
      ? (c.best_video_plays / 1_000_000).toFixed(1) + "M"
      : (c.best_video_plays / 1_000).toFixed(0) + "K";
    const emailStr = c.email ? `✉️  ${c.email}` : "无邮箱";
    console.log(
      `  ${i + 1}. @${c.unique_id} | ${c.tier}级${c.priority_score}分 | ${(c.follower_count / 1_000).toFixed(1)}K粉 | ${plays}播放 | ${emailStr}`
    );
    console.log(`     ${c.best_video_desc.slice(0, 65)}`);
  });
  console.log("=".repeat(50));
}

main().catch((err) => {
  console.error("❌ 执行出错:", err);
  process.exit(1);
});