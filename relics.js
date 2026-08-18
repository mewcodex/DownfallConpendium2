const state = {
  lang: "en",
  translatorMode: false,
  useEnglishFontStyle: false,
  relicData: null,
  cardsData: null,
  relics: [],
  filtered: [],
  page: 1,
  pageSize: 20,
  search: "",
  keywordByLang: { en: new Map(), zh: new Map() },
  baseKeywordTerms: { en: [], zh: [] },
  cardById: new Map(),
  cardByNameLang: { en: new Map(), zh: new Map() },
};

const uiText = {
  en: {
    eyebrow: "",
    title: "Slay the Spire: Downfall 2 Relic Conpendium",
    subtitle: "Browse relics by character and rarity with keyword tooltip and card reference preview.",
    rarityLabel: "Rarity",
    colorLabel: "Color",
    deprecatedLabel: "Deprecated",
    sortByLabel: "Sort by",
    sortDirLabel: "Order",
    pageSizeLabel: "Per page",
    searchLabel: "Search",
    searchBtn: "Search",
    any: "Any",
    deprecatedOnly: "Only",
    deprecatedExclude: "Exclude",
    sortName: "Name",
    sortId: "ID",
    sortRarity: "Rarity",
    sortColor: "Color",
    asc: "Ascending",
    desc: "Descending",
    pageInfo: "Page {page} / {total}",
    summary: "{shown} relics shown ({total} total)",
    searchPlaceholder: "Relic name / id / description",
    noDescription: "No description",
    navCards: "Cards",
    fontStyleToggle: "Use English-style font",
  },
  zh: {
    eyebrow: "",
    title: "杀戮尖塔：崩坠2 遗物图鉴",
    subtitle: "按角色和稀有度浏览遗物，并支持关键词悬浮与引用卡牌预览。",
    rarityLabel: "稀有度",
    colorLabel: "颜色",
    deprecatedLabel: "弃用",
    sortByLabel: "排序",
    sortDirLabel: "顺序",
    pageSizeLabel: "每页",
    searchLabel: "搜索",
    searchBtn: "搜索",
    any: "全部",
    deprecatedOnly: "仅弃用",
    deprecatedExclude: "排除弃用",
    sortName: "名称",
    sortId: "ID",
    sortRarity: "稀有度",
    sortColor: "颜色",
    asc: "升序",
    desc: "降序",
    pageInfo: "第 {page} / {total} 页",
    summary: "显示 {shown} 个遗物（总计 {total}）",
    searchPlaceholder: "遗物名 / 代码名 / 描述",
    noDescription: "无描述",
    navCards: "卡牌",
    fontStyleToggle: "替换中文字体",
  },
};

const rarityLabelMap = {
  en: {
    COMMON: "Common",
    UNCOMMON: "Uncommon",
    RARE: "Rare",
    SHOP: "Shop",
    BOSS: "Boss",
    STARTER: "Starter",
    SPECIAL: "Special",
    ANCIENT: "Ancient",
    DEPRECATED: "Deprecated",
  },
  zh: {
    COMMON: "普通",
    UNCOMMON: "罕见",
    RARE: "稀有",
    SHOP: "商店",
    BOSS: "首领",
    STARTER: "初始",
    SPECIAL: "特殊",
    ANCIENT: "先古",
    DEPRECATED: "弃用",
  },
};

const elements = {
  grid: document.getElementById("relicGrid"),
  summary: document.getElementById("summary"),
  rarityFilter: document.getElementById("rarityFilter"),
  colorFilter: document.getElementById("colorFilter"),
  deprecatedFilter: document.getElementById("deprecatedFilter"),
  sortBy: document.getElementById("sortBy"),
  sortDir: document.getElementById("sortDir"),
  pageSize: document.getElementById("pageSize"),
  searchInput: document.getElementById("searchInput"),
  clearSearchInlineBtn: document.getElementById("clearSearchInlineBtn"),
  searchBtn: document.getElementById("searchBtn"),
  prevPage: document.getElementById("prevPage"),
  nextPage: document.getElementById("nextPage"),
  pageInfo: document.getElementById("pageInfo"),
  langToggle: document.getElementById("langToggle"),
  fontStyleToggle: document.getElementById("fontStyleToggle"),
  cardsPageLink: document.getElementById("cardsPageLink"),
  versionInfo: document.getElementById("versionInfo"),
};

function renderVersionInfo() {
  if (!elements.versionInfo || !state.relicData) return;
  const modVersion = state.relicData.modVersion || "unknown";
  const translationVersion = state.relicData.translationVersion || "unknown";
  elements.versionInfo.textContent = state.lang === "zh"
    ? `Mod 版本：${modVersion} | 中文译文版本：${translationVersion}`
    : `Mod version: ${modVersion} | Chinese translation: ${translationVersion}`;
}

function updateCrossPageLinks() {
  const link = elements.cardsPageLink;
  if (!link) return;
  const params = new URLSearchParams();
  if (state.lang !== "en") params.set("lang", state.lang);
  if (state.translatorMode) params.set("translator_mode", "1");
  const query = params.toString();
  link.href = query ? `index.html?${query}` : "index.html";
}

function t(key) {
  return (uiText[state.lang] || uiText.en)[key] || key;
}

function humanizeCode(value) {
  return String(value || "")
    .split(/[_-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0) + part.slice(1).toLowerCase())
    .join(" ");
}

function renderSts2Markup(text) {
  if (!text) return "";
  const colorClasses = { gold: "kw-mark-yellow", blue: "kw-mark-blue", red: "kw-mark-red", purple: "kw-mark-purple", green: "kw-mark-green", aqua: "kw-mark-aqua" };
  let rendered = text.replace(/\[(gold|blue|red|purple|green|aqua)\]([\s\S]*?)\[\/\1\]/gi, (_full, color, content) => `<span class="${colorClasses[color.toLowerCase()]}">${content}</span>`);
  rendered = rendered.replace(/\{(?:energyPrefix|Energy):energyIcons\((\d*)\)\}/gi, (_full, amount) => "[E]".repeat(Math.max(1, Number(amount || 1))));
  rendered = rendered.replace(/\{InCombat:cond:\s*[\s\S]*?\|\}/gi, "");
  rendered = rendered.replace(/\{[A-Za-z_]\w*:cond:\s*([\s\S]*?)\|\}/g, (_full, content) => content.trim().replace(/^[（(]\s*/, "").replace(/\s*[）)]+$/, ""));
  rendered = rendered.replace(/\{(?:[A-Za-z_][\w]*)(?::(?:diff\(\)|plural:[^}]*|cond:[\s\S]*?))?\}/g, (token) => token.slice(1, -1).split(":", 1)[0].replace(/Power$/, "").replace(/([a-z])([A-Z])/g, "$1 $2"));
  return rendered
    .replace(/\{[A-Za-z_]\w*:[^{}]*\}/g, "")
    .replace(/\[\/?(?:sine|jitter|fly_in|shake)\]/gi, "");
}

function fillSts2DynamicTokens(text, relic) {
  const values = (relic && relic.dynamicValues) || {};
  const wrapValue = (value) => `__TV__${value}__`;
  const findValue = (name) => {
    const normalized = name.toLowerCase().replace(/power$/, "");
    const key = Object.keys(values).find((candidate) => candidate.toLowerCase().replace(/power$/, "") === normalized);
    return key && typeof values[key] === "number" ? values[key] : null;
  };

  return (text || "")
    .replace(/\{([A-Za-z_]\w*):plural:([^|{}]*)\|([^{}]*)\}/g, (full, name, singular, plural) => {
      const value = findValue(name);
      if (typeof value !== "number") return full;
      return (value === 1 ? singular : plural).replace(/\{\}/g, wrapValue(value));
    })
    .replace(/\{([A-Za-z_]\w*):diff\(\)\}/g, (full, name) => {
      const value = findValue(name);
      return typeof value === "number" ? wrapValue(value) : full;
    })
    .replace(/\{([A-Za-z_]\w*)\}/g, (full, name) => {
      const value = findValue(name);
      return typeof value === "number" ? wrapValue(value) : full;
    });
}

function renderNumericMarkers(text) {
  return (text || "").replace(/__TV__(-?\d+)__/g, '<span class="kw-mark-blue">$1</span>');
}

function applyI18nText() {
  document.documentElement.lang = state.lang === "zh" ? "zh-CN" : "en";
  document.documentElement.classList.toggle("font-english-style", state.useEnglishFontStyle);
  document.querySelectorAll("[data-i18n]").forEach((node) => {
    const key = node.dataset.i18n;
    node.textContent = t(key);
  });
  elements.searchInput.placeholder = t("searchPlaceholder");
  elements.langToggle.textContent = state.translatorMode ? "translator mode" : state.lang.toUpperCase();
  elements.langToggle.disabled = Boolean(state.translatorMode);
  elements.langToggle.classList.toggle("translator-mode-pill", Boolean(state.translatorMode));
  elements.fontStyleToggle.classList.toggle("active", state.useEnglishFontStyle);
  elements.fontStyleToggle.setAttribute("aria-pressed", String(state.useEnglishFontStyle));
  renderVersionInfo();
}

function parseUrlState() {
  const params = new URLSearchParams(window.location.search || "");
  const lang = params.get("lang");
  const translatorMode = params.get("translator_mode");
  if (lang === "en" || lang === "zh") state.lang = lang;
  if (translatorMode !== null) {
    const normalized = String(translatorMode).toLowerCase();
    state.translatorMode = normalized === "1" || normalized === "true" || normalized === "yes";
  }
}

function syncUrlState() {
  const params = new URLSearchParams();
  if (state.lang !== "en") params.set("lang", state.lang);
  if (state.translatorMode) params.set("translator_mode", "1");

  if (elements.searchInput.value.trim()) params.set("q", elements.searchInput.value.trim());
  if (elements.rarityFilter.value) params.set("rarity", elements.rarityFilter.value);
  if (elements.colorFilter.value) params.set("color", elements.colorFilter.value);
  if (elements.deprecatedFilter.value) params.set("deprecated", elements.deprecatedFilter.value);

  const qs = params.toString();
  const next = qs ? `?${qs}` : "";
  if (next !== window.location.search) {
    history.replaceState(null, "", `${window.location.pathname}${next}`);
  }
  updateCrossPageLinks();
}

function updateTranslatorEntryLink() {
  const link = document.getElementById("translatorModeEntry");
  if (!link) return;
  const params = new URLSearchParams(window.location.search || "");
  if (state.translatorMode) {
    params.delete("translator_mode");
    link.textContent = "normal mode";
  } else {
    params.set("translator_mode", "1");
    link.textContent = "translator mode";
  }
  if (state.lang !== "en") params.set("lang", state.lang);
  link.href = `${window.location.pathname}?${params.toString()}`;
}

function escapeHtml(text) {
  return (text || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function splitLeadingNumberToken(token) {
  const raw = String(token || "");
  const match = /^(-?\d+(?:\.\d+)?)(.*)$/.exec(raw);
  if (!match) {
    return { colored: raw, rest: "" };
  }
  return {
    colored: match[1] || "",
    rest: match[2] || "",
  };
}

function normalizeDescText(text) {
  const normalized = (text || "")
    .replace(/\s*\[REMOVE_SPACE\]\s*/g, "")
    .replace(/#b\s*([^\s]+)/g, (_full, token) => {
      const split = splitLeadingNumberToken(token);
      return `[[BLUE:${split.colored}]]${split.rest}`;
    })
    .replace(/#r\s*([^\s]+)/g, (_full, token) => {
      const split = splitLeadingNumberToken(token);
      return `[[RED:${split.colored}]]${split.rest}`;
    })
    .replace(/#[ygp]/g, "")
    .replace(/\s+/g, " ")
    .trim();

  if (state.lang === "zh") {
    return normalized
      .replace(/,/g, "，")
      .replace(/｡/g, "。");
  }

  return normalized;
}

function renderLegacyBlueMarkers(text) {
  if (!text) return "";
  const renderColoredToken = (token, cls) => {
    const raw = String(token || "").trim();
    const namespaced = /^([A-Za-z_]\w*):(.+)$/.exec(raw);
    if (namespaced) {
      const alias = raw;
      const label = (namespaced[2] || "").replace(/_/g, " ").trim() || raw;
      return `<span class="kw ${cls}" data-kw-alias="${escapeHtml(alias)}">${escapeHtml(label)}</span>`;
    }
    return `<span class="${cls}">${raw}</span>`;
  };

  return text
    .replace(/\[\[BLUE:([^\]]+)\]\]/g, (_full, token) => renderColoredToken(token, "kw-mark-blue"))
    .replace(/\[\[RED:([^\]]+)\]\]/g, (_full, token) => renderColoredToken(token, "kw-mark-red"));
}

function renderEnergyToken(text, energyIcon) {
  if (!text) return "";
  const iconHtml = energyIcon
    ? `<span class="energy-token"><img src="${escapeHtml(energyIcon)}" alt="E" loading="lazy"></span>`
    : '<span class="energy-token energy-token-fallback" aria-label="Energy">E</span>';
  return text.replace(/\[E\]/g, iconHtml);
}

function renderBracketColorSyntax(text) {
  if (!text) return "";
  const tokenRe = /\[#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})\]|\[\]/g;
  let out = "";
  let last = 0;
  let openCount = 0;
  let match;

  while ((match = tokenRe.exec(text)) !== null) {
    out += text.slice(last, match.index);
    if (match[1]) {
      out += `<span class="inline-color" style="color:#${match[1]}">`;
      openCount += 1;
    } else if (openCount > 0) {
      out += "</span>".repeat(openCount);
      openCount = 0;
    }
    last = tokenRe.lastIndex;
  }

  out += text.slice(last);
  if (openCount > 0) {
    out += "</span>".repeat(openCount);
  }
  return out;
}

function finalizeZhHtmlSpacing(html) {
  return html || "";
}

function normalizeSearchText(text) {
  return (text || "").toLowerCase().replace(/\s+/g, " ").trim();
}

function compareMaybeString(a, b) {
  return (a || "").localeCompare((b || ""), state.lang === "zh" ? "zh" : "en");
}

function localizeRarity(rarity) {
  return (rarityLabelMap[state.lang] || {})[rarity] || humanizeCode(rarity);
}

function localizeColor(relic) {
  if (relic && relic.colorName && relic.colorName[state.lang]) return relic.colorName[state.lang];
  const color = relic && relic.color;
  if (!color) return "";
  const colorMap = {
    BOSS: { en: "Boss", zh: "首领" },
    COLLECTIBLE: { en: "Collectible", zh: "藏品" },
    COLORLESS: { en: "Colorless", zh: "无色" },
    CURSE: { en: "Curse", zh: "诅咒" },
    DOWNFALL: { en: "Downfall", zh: "崩坠" },
  };
  const mapped = colorMap[color];
  if (mapped) return mapped[state.lang] || humanizeCode(color);
  return humanizeCode(color);
}

function localizeCardType(type) {
  if (!type) return "";
  const typeMap = {
    ATTACK: { en: "Attack", zh: "攻击" },
    SKILL: { en: "Skill", zh: "技能" },
    POWER: { en: "Power", zh: "能力" },
    STATUS: { en: "Status", zh: "状态" },
    CURSE: { en: "Curse", zh: "诅咒" },
  };
  const mapped = typeMap[type];
  if (!mapped) return type;
  return mapped[state.lang] || type;
}

function getRarityTagClass(rarity) {
  if (!rarity) return "tag";
  return `tag tag-rarity-${String(rarity).toLowerCase()}`;
}

function buildCardNameIndex(cards) {
  state.cardById = new Map();
  state.cardByNameLang = { en: new Map(), zh: new Map() };

  cards.forEach((card) => {
    state.cardById.set(card.id, card);
    ["en", "zh"].forEach((lang) => {
      const name = ((card.name || {})[lang] || "").trim();
      if (!name) return;
      if (!state.cardByNameLang[lang].has(name)) {
        state.cardByNameLang[lang].set(name, card.id);
      }
    });
  });
}

function buildKeywordIndex() {
  const keywordData = (state.relicData && state.relicData.keywords) || {};
  ["en", "zh"].forEach((lang) => {
    const entries = keywordData[lang] || [];
    const map = new Map();
    entries.forEach((entry) => {
      if (!entry || !entry.name) return;
      map.set(entry.name, entry);
      (entry.aliases || []).forEach((alias) => {
        if (alias && !map.has(alias)) map.set(alias, entry);
      });
    });
    state.keywordByLang[lang] = map;
  });

  const base = (state.relicData && state.relicData.baseKeywords) || [];
  const terms = { en: new Set(), zh: new Set() };
  base.forEach((entry) => {
    if (entry && entry.en && entry.en.aliases) {
      entry.en.aliases.forEach((k) => {
        if (!k) return;
        const raw = String(k).trim();
        if (!raw) return;
        terms.en.add(raw);
        const underscored = raw.replace(/\s+/g, "_");
        const spaced = raw.replace(/_/g, " ").replace(/\s+/g, " ").trim();
        if (underscored) terms.en.add(underscored);
        if (spaced) terms.en.add(spaced);
      });
    }
    if (entry && entry.zh && entry.zh.aliases) entry.zh.aliases.forEach((k) => k && terms.zh.add(k));
  });

  // Include keyword aliases that differ by spaces/underscores (e.g. Temporary HP/Temporary_HP)
  // so localized text that uses underscores can still be highlighted.
  const enKeywordMap = state.keywordByLang.en || new Map();
  for (const alias of enKeywordMap.keys()) {
    const raw = String(alias || "").trim();
    if (!raw) continue;
    if (!raw.includes(" ") && !raw.includes("_")) continue;
    terms.en.add(raw);
    const underscored = raw.replace(/\s+/g, "_");
    const spaced = raw.replace(/_/g, " ").replace(/\s+/g, " ").trim();
    if (underscored) terms.en.add(underscored);
    if (spaced) terms.en.add(spaced);
  }

  state.baseKeywordTerms.en = [...terms.en].sort((a, b) => b.length - a.length);
  state.baseKeywordTerms.zh = [...terms.zh].sort((a, b) => b.length - a.length);
}

function renderKeywordSpan(label, alias = null) {
  const rawLabel = label || "";
  const displayLabel = rawLabel.replace(/_/g, " ");
  const safeLabel = escapeHtml(displayLabel);
  const safeAlias = escapeHtml(alias || rawLabel);
  return `<span class="kw" data-kw-alias="${safeAlias}">${safeLabel}</span>`;
}

function findKeywordEntry(label, lang = state.lang) {
  if (!label) return null;
  const map = state.keywordByLang[lang] || new Map();
  if (map.has(label)) return map.get(label);
  if (lang === "en") {
    const lower = label.toLowerCase();
    for (const [alias, entry] of map.entries()) {
      if ((alias || "").toLowerCase() === lower) return entry;
    }
  }
  return null;
}

function findPrefixedKeyword(prefix, noun, lang = state.lang) {
  if (!noun) return null;
  const candidates = [
    noun,
    `${prefix}:${noun}`,
    `${String(prefix || "").toLowerCase()}:${noun}`,
  ];
  for (const alias of candidates) {
    const entry = findKeywordEntry(alias, lang);
    if (entry) {
      return { entry, alias, matchedLabel: noun, rest: "" };
    }
  }

  // In zh mode description spaces are compacted, e.g. "bronze:队列为空".
  // Match the longest known alias prefix and keep the remainder as plain text.
  const map = state.keywordByLang[lang] || new Map();
  let best = null;
  for (const [alias, entry] of map.entries()) {
    if (!alias || !entry) continue;
    const aliasText = String(alias);
    let local = aliasText;
    const colon = aliasText.indexOf(":");
    if (colon >= 0) {
      const ns = aliasText.slice(0, colon).toLowerCase();
      if (ns !== String(prefix || "").toLowerCase()) continue;
      local = aliasText.slice(colon + 1);
    }
    if (!local) continue;
    if (!noun.startsWith(local)) continue;
    if (!best || local.length > best.matchedLabel.length) {
      best = {
        entry,
        alias: aliasText,
        matchedLabel: local,
        rest: noun.slice(local.length),
      };
    }
  }
  if (best) return best;
  return null;
}

function highlightPrefixedKeywords(text) {
  if (!text) return "";
  const prefixedPattern = /([A-Za-z_][\w]*):([^\s<>{}\[\]，。｡,.!！？:：;；]+)/g;
  return text.replace(prefixedPattern, (_full, prefix, noun) => {
    const matched = findPrefixedKeyword(prefix, noun);
    if (!matched) {
      if (!noun || noun.length < 2) return _full;
      return renderKeywordSpan(noun, `${prefix}:${noun}`);
    }
    return `${renderKeywordSpan(matched.matchedLabel, matched.alias)}${escapeHtml(matched.rest || "")}`;
  });
}

function highlightBaseKeywords(text) {
  if (!text) return "";
  let rendered = text;
  const terms = state.baseKeywordTerms[state.lang] || [];
  terms.forEach((term) => {
    if (!term) return;
    const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const reg = state.lang === "zh"
      ? new RegExp(`(^|\\s)(${escaped})(?=\\s|$)`, "g")
      : new RegExp(`\\b(${escaped})\\b`, "gi");
    if (state.lang === "zh") {
      rendered = rendered.replace(reg, (_m, lead, p1) => `${lead}${renderKeywordSpan(p1)}`);
    } else {
      rendered = rendered.replace(reg, (_m, p1) => renderKeywordSpan(p1));
    }
  });
  return rendered;
}

function normalizeCardRefLabel(text) {
  return (text || "")
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function extractExplicitCardRefNames(rawText) {
  const text = String(rawText || "");
  const set = new Set();

  // Explicit colored card names, e.g. "#yFine #yTuning+" -> "Fine Tuning+"
  const colorChunks = text.match(/#y[^\s]+(?:\s+#y[^\s]+)*/g) || [];
  colorChunks.forEach((chunk) => {
    const label = chunk
      .replace(/#y/g, "")
      .replace(/[，。｡,.!！？:：;；、]+$/g, "")
      .replace(/\s+/g, " ")
      .trim();
    const key = normalizeCardRefLabel(label);
    if (key) set.add(key);
  });

  // Namespaced names, e.g. "hermit:Dead_On" -> "Dead On"
  const nsRegex = /[A-Za-z_][\w]*:([A-Za-z0-9_+'’\-]+)/g;
  let match;
  while ((match = nsRegex.exec(text)) !== null) {
    const key = normalizeCardRefLabel(match[1]);
    if (key) set.add(key);
  }

  return set;
}

function highlightCardRefs(text, explicitRefSet = null) {
  if (!text) return "";
  const map = state.cardByNameLang[state.lang] || new Map();
  if (!map.size) return text;

  let names = [...map.keys()];
  if (explicitRefSet instanceof Set) {
    names = names.filter((name) => explicitRefSet.has(normalizeCardRefLabel(name)));
  }
  if (!names.length) return text;

  names.sort((a, b) => b.length - a.length);
  const escaped = names.map((name) => name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  if (!escaped.length) return text;

  if (state.lang === "zh") {
    const reg = new RegExp(`(^|\\s)(${escaped.join("|")})(?=\\s|$)`, "g");
    return text
      .split(/(<[^>]+>)/g)
      .map((segment) => {
        if (segment.startsWith("<")) return segment;
        return segment.replace(reg, (_full, lead, name) => {
          const id = map.get(name) || "";
          if (!id) return _full;
          return `${lead}<span class="card-ref" data-card-id="${escapeHtml(id)}">${escapeHtml(name)}</span>`;
        });
      })
      .join("");
  }

  const reg = new RegExp(`\\b(${escaped.join("|")})\\b`, "gi");
  return text
    .split(/(<[^>]+>)/g)
    .map((segment) => {
      if (segment.startsWith("<")) return segment;
      return segment.replace(reg, (full, name) => {
        const id = map.get(name) || map.get(full) || "";
        if (!id) return full;
        return `<span class="card-ref" data-card-id="${escapeHtml(id)}">${escapeHtml(full)}</span>`;
      });
    })
    .join("");
}

function renderRelicDescription(relic) {
  const sourceDesc = ((relic.description || {})[state.lang] || "");
  const explicitRefSet = extractExplicitCardRefNames(sourceDesc);
  const raw = normalizeDescText(fillSts2DynamicTokens(sourceDesc, relic));
  if (!raw) return `<span class="muted">${escapeHtml(t("noDescription"))}</span>`;

  let text = escapeHtml(raw).replace(/NL/g, "<br>");
  text = renderSts2Markup(text);
  text = renderEnergyToken(text, relic && relic.energyIcon);
  text = highlightPrefixedKeywords(text);
  text = highlightBaseKeywords(text);
  text = highlightCardRefs(text, explicitRefSet);
  text = renderLegacyBlueMarkers(text);
  text = renderBracketColorSyntax(text);
  text = renderNumericMarkers(text);
  return finalizeZhHtmlSpacing(text);
}

function fillCardTokens(text, card) {
  if (!text) return "";
  const tokenValues = (card && card.tokenValues) || {};
  return text.replace(/!([A-Za-z0-9_:]+)!/g, (_full, token) => {
    const val = tokenValues[token];
    return typeof val === "number" ? String(val) : _full;
  });
}

function renderCardPreviewDescription(card, lang) {
  const base = (((card || {}).description || {})[lang] || "").trim();
  const prevLang = state.lang;
  state.lang = lang;
  const raw = normalizeDescText(fillCardTokens(base, card));
  let text = escapeHtml(raw).replace(/NL/g, "<br>");
  text = renderSts2Markup(text);
  text = renderEnergyToken(text, card && card.energyIcon);
  text = highlightPrefixedKeywords(text);
  text = highlightBaseKeywords(text);
  text = renderLegacyBlueMarkers(text);
  text = renderBracketColorSyntax(text);
  text = finalizeZhHtmlSpacing(text);
  state.lang = prevLang;
  return text;
}

function buildRelicElement(relic, langOverride = null) {
  const lang = langOverride || state.lang;
  const prevLang = state.lang;
  state.lang = lang;
  try {
    const el = document.createElement("article");
    const deprecatedByRarity = String(relic.rarity || "").toUpperCase() === "DEPRECATED";
    el.className = `card ${(relic.deprecated || deprecatedByRarity) ? "card-deprecated" : ""}`.trim();
    el.dataset.relicId = relic.id;
    el.dataset.renderLang = lang;

    const frameByRarity = {
      UNCOMMON: "rgba(108, 176, 232, 0.32)",
      RARE: "rgba(220, 178, 67, 0.36)",
    };
    const glowByRarity = {
      UNCOMMON: "rgba(108, 176, 232, 0.32)",
      RARE: "rgba(220, 178, 67, 0.34)",
    };
    const rarityFrame = frameByRarity[relic.rarity];
    const rarityGlow = glowByRarity[relic.rarity];
    if (rarityFrame) {
      el.style.setProperty("--rarity-frame", rarityFrame);
    }
    if (rarityGlow) {
      el.style.setProperty("--rarity-glow", rarityGlow);
    }

    const name = ((relic.name || {})[lang] || relic.id || "").trim();
    const desc = renderRelicDescription(relic);
    const img = relic.img
      ? `<img src="${relic.img}" alt="${escapeHtml(name)}" loading="lazy">`
      : `<div class="placeholder"></div>`;

    const colorTagStyleVars = [];
    if (relic.colorPillBg) colorTagStyleVars.push(`--pill-bg:${relic.colorPillBg}`);
    if (relic.colorPillFg) colorTagStyleVars.push(`--pill-fg:${relic.colorPillFg}`);
    const colorTagStyle = colorTagStyleVars.length ? ` style="${colorTagStyleVars.join(";")}"` : "";

    const meta = [
      localizeColor(relic) ? `<span class="tag tag-color"${colorTagStyle}>${escapeHtml(localizeColor(relic))}</span>` : "",
      relic.rarity ? `<span class="${getRarityTagClass(relic.rarity)}">${escapeHtml(localizeRarity(relic.rarity))}</span>` : "",
    ].filter(Boolean).join(" ");

    el.innerHTML = `
      ${img}
      <div class="card-body">
        <div class="card-title">
          <div class="card-title-main">
            <h3>${escapeHtml(name)}</h3>
            <div class="card-id">${escapeHtml(relic.id || "")}</div>
          </div>
        </div>
        <div class="card-meta">${meta}</div>
        <div class="card-desc">${desc}</div>
      </div>
    `;
    return el;
  } finally {
    state.lang = prevLang;
  }
}

function buildCardMiniElement(card, langOverride = null) {
  const lang = langOverride || state.lang;
  const name = ((card.name || {})[lang] || card.id || "").trim();
  const desc = renderCardPreviewDescription(card, lang);
  const type = escapeHtml(localizeCardType(card.type || ""));
  const rarity = escapeHtml(localizeRarity(card.rarity));
  const color = escapeHtml(localizeColor(card));

  const el = document.createElement("article");
  el.className = "card mini-cloned-card";
  el.innerHTML = `
    ${card.img ? `<img src="${card.img}" alt="${escapeHtml(name)}" loading="lazy">` : `<div class="placeholder"></div>`}
    <div class="card-body">
      <div class="card-title">
        <div class="card-title-main">
          <h3>${escapeHtml(name)}</h3>
          <div class="card-id">${escapeHtml(card.id || "")}</div>
        </div>
      </div>
      <div class="card-meta">
        ${type ? `<span class="tag">${type}</span>` : ""}
        ${rarity ? `<span class="tag">${rarity}</span>` : ""}
        ${color ? `<span class="tag">${color}</span>` : ""}
      </div>
      <div class="card-desc">${desc}</div>
    </div>
  `;
  return el;
}

function getKeywordTooltip() {
  let tip = document.getElementById("kwTooltip");
  if (!tip) {
    tip = document.createElement("div");
    tip.id = "kwTooltip";
    tip.className = "kw-tooltip";
    document.body.appendChild(tip);
  }
  return tip;
}

function hideKeywordTooltip() {
  const tip = document.getElementById("kwTooltip");
  if (!tip) return;
  tip.classList.remove("show");
  tip.innerHTML = "";
}

function showKeywordTooltip(entry, anchorRect, langOverride = null, energyIcon = null) {
  const lang = langOverride || state.lang;
  const tip = getKeywordTooltip();
  const prevLang = state.lang;
  state.lang = lang;
  const name = escapeHtml(normalizeDescText(entry.name || ""));
  const descRaw = normalizeDescText(entry.description || "");
  let desc = escapeHtml(descRaw).replace(/NL/g, "<br>");
  desc = renderSts2Markup(desc);
  desc = renderEnergyToken(desc, energyIcon);
  desc = highlightCardRefs(desc);
  desc = renderLegacyBlueMarkers(desc);
  desc = renderBracketColorSyntax(desc);
  desc = finalizeZhHtmlSpacing(desc);
  state.lang = prevLang;

  tip.innerHTML = `<div class="kw-tip-name">${name}</div><div class="kw-tip-desc">${desc}</div>`;
  tip.classList.add("show");

  const margin = 10;
  const tipRect = tip.getBoundingClientRect();
  let left = anchorRect.left + window.scrollX;
  let top = anchorRect.bottom + window.scrollY + 8;
  const maxLeft = window.scrollX + window.innerWidth - tipRect.width - margin;
  if (left > maxLeft) left = maxLeft;
  const maxTop = window.scrollY + window.innerHeight - tipRect.height - margin;
  if (top > maxTop) top = anchorRect.top + window.scrollY - tipRect.height - 8;

  tip.style.left = `${Math.max(window.scrollX + margin, left)}px`;
  tip.style.top = `${Math.max(window.scrollY + margin, top)}px`;
}

function getCardPreviewTooltip() {
  let tip = document.getElementById("cardPreviewTooltip");
  if (!tip) {
    tip = document.createElement("div");
    tip.id = "cardPreviewTooltip";
    tip.className = "card-mini-preview";
    document.body.appendChild(tip);
  }
  return tip;
}

function hideCardPreviewTooltip() {
  const tip = document.getElementById("cardPreviewTooltip");
  if (!tip) return;
  tip.classList.remove("show", "preview-left", "preview-right");
  tip.innerHTML = "";
}

function getRelicAttachmentTooltip() {
  let tip = document.querySelector(".card-hover-attachments");
  if (tip) return tip;
  tip = document.createElement("div");
  tip.className = "card-hover-attachments";
  document.body.appendChild(tip);
  return tip;
}

function hideRelicAttachmentTooltip() {
  const tip = document.querySelector(".card-hover-attachments");
  if (tip) tip.classList.remove("show");
}

function renderRelicAttachmentDescription(description, relic, language) {
  const previousLanguage = state.lang;
  state.lang = language;
  try {
    let text = escapeHtml(normalizeDescText(fillSts2DynamicTokens(description, relic))).replace(/NL/g, "<br>");
    text = renderSts2Markup(text);
    text = renderEnergyToken(text, relic && relic.energyIcon);
    text = renderLegacyBlueMarkers(text);
    text = renderBracketColorSyntax(text);
    text = renderNumericMarkers(text);
    return finalizeZhHtmlSpacing(text);
  } finally {
    state.lang = previousLanguage;
  }
}

function showRelicAttachmentTooltip(relic, anchorRect, language) {
  const identity = {
    name: { en: relic.codeName || relic.id, zh: relic.codeName || relic.id },
    description: { en: relic.id, zh: relic.id },
    dynamicValues: {},
    sourceValueKey: null,
  };
  const textTips = [identity, ...(relic.attachedTips || [])]
    .filter((tip) => tip && tip.name && tip.description && tip.name[language] && tip.description[language]);
  const cardTips = (relic.attachedCardTips || [])
    .map((entry) => ({ card: state.cardById.get(entry.id || ""), upgraded: Boolean(entry.upgraded) }))
    .filter((entry) => entry.card);
  if (!textTips.length && !cardTips.length) {
    hideRelicAttachmentTooltip();
    return;
  }

  const tip = getRelicAttachmentTooltip();
  tip.innerHTML = "";
  textTips.forEach((entry) => {
    const sourceValue = entry.sourceValueKey && relic.dynamicValues ? relic.dynamicValues[entry.sourceValueKey] : null;
    const tipRelic = Object.assign({}, relic, {
      dynamicValues: Object.assign({}, relic.dynamicValues || {}, typeof sourceValue === "number" ? { Amount: sourceValue } : {}),
    });
    const panel = document.createElement("section");
    panel.className = "card-attached-tip";
    panel.innerHTML = `<div class="kw-tip-name">${escapeHtml(entry.name[language])}</div><div class="kw-tip-desc">${renderRelicAttachmentDescription(entry.description[language], tipRelic, language)}</div>`;
    tip.appendChild(panel);
  });
  if (cardTips.length) {
    const previews = document.createElement("div");
    previews.className = "card-attached-previews";
    cardTips.forEach((entry) => previews.appendChild(buildCardMiniElement(entry.card, language)));
    tip.appendChild(previews);
  }

  tip.classList.add("show");
  const margin = 10;
  const tipRect = tip.getBoundingClientRect();
  let left = anchorRect.right + window.scrollX + 10;
  if (left + tipRect.width > window.scrollX + window.innerWidth - margin) {
    left = anchorRect.left + window.scrollX - tipRect.width - 10;
  }
  const top = Math.min(anchorRect.top + window.scrollY, window.scrollY + window.innerHeight - tipRect.height - margin);
  tip.style.left = `${Math.max(window.scrollX + margin, left)}px`;
  tip.style.top = `${Math.max(window.scrollY + margin, top)}px`;
}

function bindRelicAttachmentHoverEvents() {
  elements.grid.addEventListener("mouseover", (event) => {
    if (event.target.closest(".kw, .card-ref")) return;
    const relicNode = event.target.closest("article.card[data-relic-id]");
    if (!relicNode || !elements.grid.contains(relicNode)) return;
    const relic = state.relics.find((entry) => entry.id === relicNode.dataset.relicId);
    if (!relic) return;
    showRelicAttachmentTooltip(relic, relicNode.getBoundingClientRect(), relicNode.dataset.renderLang || state.lang);
  });
  elements.grid.addEventListener("mouseout", (event) => {
    const relicNode = event.target.closest("article.card[data-relic-id]");
    if (!relicNode || !elements.grid.contains(relicNode) || relicNode.contains(event.relatedTarget)) return;
    hideRelicAttachmentTooltip();
  });
  window.addEventListener("scroll", hideRelicAttachmentTooltip, { passive: true });
}

function showCardPreviewTooltip(card, anchorRect, langOverride = null) {
  const tip = getCardPreviewTooltip();
  tip.innerHTML = "";
  tip.classList.remove("refs-panel", "preview-left", "preview-right");
  tip.appendChild(buildCardMiniElement(card, langOverride));
  tip.classList.add("show");

  const margin = 10;
  const tipRect = tip.getBoundingClientRect();
  let left = anchorRect.right + window.scrollX + 10;
  let top = anchorRect.top + window.scrollY;
  if (left + tipRect.width > window.scrollX + window.innerWidth - margin) {
    left = anchorRect.left + window.scrollX - tipRect.width - 10;
    tip.classList.add("preview-left");
  } else {
    tip.classList.add("preview-right");
  }
  const maxTop = window.scrollY + window.innerHeight - tipRect.height - margin;
  if (top > maxTop) top = maxTop;

  tip.style.left = `${Math.max(window.scrollX + margin, left)}px`;
  tip.style.top = `${Math.max(window.scrollY + margin, top)}px`;
}

function bindTooltipEvents() {
  elements.grid.addEventListener("mouseover", (event) => {
    const kw = event.target.closest(".kw");
    if (kw && elements.grid.contains(kw)) {
      const cardNode = kw.closest("article.card[data-relic-id]");
      const renderLang = cardNode && cardNode.dataset && cardNode.dataset.renderLang === "zh" ? "zh" : "en";
      const relicId = cardNode && cardNode.dataset ? cardNode.dataset.relicId : null;
      const relic = relicId ? state.relics.find((r) => r.id === relicId) : null;
      const label = (kw.dataset.kwAlias || kw.textContent || "").trim();
      let entry = findKeywordEntry(label, renderLang);
      if (!entry && label.includes(":")) {
        const local = label.split(":").pop().trim();
        if (local) {
          entry = findKeywordEntry(local, renderLang);
        }
      }
      if (!entry) {
        hideKeywordTooltip();
      } else {
        showKeywordTooltip(entry, kw.getBoundingClientRect(), renderLang, relic && relic.energyIcon ? relic.energyIcon : null);
      }
      return;
    }

    const ref = event.target.closest(".card-ref[data-card-id]");
    if (!ref || !elements.grid.contains(ref)) return;
    const cardId = ref.dataset.cardId || "";
    const card = state.cardById.get(cardId);
    if (!card) {
      hideCardPreviewTooltip();
      return;
    }
    const cardNode = ref.closest("article.card[data-relic-id]");
    const renderLang = cardNode && cardNode.dataset && cardNode.dataset.renderLang === "zh" ? "zh" : "en";
    showCardPreviewTooltip(card, ref.getBoundingClientRect(), renderLang);
  });

  elements.grid.addEventListener("mouseout", (event) => {
    const kw = event.target.closest(".kw");
    if (kw && elements.grid.contains(kw)) {
      const to = event.relatedTarget;
      if (to && kw.contains(to)) return;
      hideKeywordTooltip();
      return;
    }

    const ref = event.target.closest(".card-ref[data-card-id]");
    if (!ref || !elements.grid.contains(ref)) return;
    const to = event.relatedTarget;
    if (to && ref.contains(to)) return;
    hideCardPreviewTooltip();
  });

  window.addEventListener("scroll", () => {
    hideKeywordTooltip();
    hideCardPreviewTooltip();
  }, { passive: true });
}

function buildOptions() {
  const prevValues = {
    rarity: elements.rarityFilter.value,
    color: elements.colorFilter.value,
    deprecated: elements.deprecatedFilter.value,
    sortBy: elements.sortBy.value,
    sortDir: elements.sortDir.value,
    pageSize: elements.pageSize.value,
  };

  const anyLabel = t("any");

  elements.rarityFilter.innerHTML = "";
  elements.colorFilter.innerHTML = "";
  elements.deprecatedFilter.innerHTML = "";
  elements.sortBy.innerHTML = "";
  elements.sortDir.innerHTML = "";
  elements.pageSize.innerHTML = "";

  const raritySet = new Set();
  const colorSet = new Set();

  state.relics.forEach((r) => {
    if (r.rarity) raritySet.add(r.rarity);
    if (r.color) colorSet.add(r.color);
  });

  const option = (value, label) => {
    const o = document.createElement("option");
    o.value = value;
    o.textContent = label;
    return o;
  };

  elements.rarityFilter.appendChild(option("", anyLabel));
  [...raritySet].sort((a, b) => compareMaybeString(localizeRarity(a), localizeRarity(b))).forEach((v) => {
    elements.rarityFilter.appendChild(option(v, localizeRarity(v)));
  });

  elements.colorFilter.appendChild(option("", anyLabel));
  [...colorSet].sort((a, b) => compareMaybeString(a, b)).forEach((v) => {
    const sample = state.relics.find((r) => r.color === v);
    elements.colorFilter.appendChild(option(v, localizeColor(sample || { color: v })));
  });

  elements.deprecatedFilter.appendChild(option("", anyLabel));
  elements.deprecatedFilter.appendChild(option("ONLY", t("deprecatedOnly")));
  elements.deprecatedFilter.appendChild(option("EXCLUDE", t("deprecatedExclude")));

  [
    ["NAME", t("sortName")],
    ["ID", t("sortId")],
    ["RARITY", t("sortRarity")],
    ["COLOR", t("sortColor")],
  ].forEach(([value, label]) => elements.sortBy.appendChild(option(value, label)));

  [["ASC", t("asc")], ["DESC", t("desc")]].forEach(([value, label]) => elements.sortDir.appendChild(option(value, label)));
  [20, 30, 50, 100].forEach((size) => elements.pageSize.appendChild(option(String(size), String(size))));

  if (prevValues.rarity) elements.rarityFilter.value = prevValues.rarity;
  if (prevValues.color) elements.colorFilter.value = prevValues.color;
  if (prevValues.deprecated) elements.deprecatedFilter.value = prevValues.deprecated;
  if (prevValues.sortBy) elements.sortBy.value = prevValues.sortBy;
  if (prevValues.sortDir) elements.sortDir.value = prevValues.sortDir;
  if (prevValues.pageSize) elements.pageSize.value = prevValues.pageSize;

  // Normalize invalid values to what's available in option lists.
  elements.rarityFilter.value = elements.rarityFilter.value;
  elements.colorFilter.value = elements.colorFilter.value;
  elements.deprecatedFilter.value = elements.deprecatedFilter.value;
  elements.sortBy.value = elements.sortBy.value;
  elements.sortDir.value = elements.sortDir.value || "ASC";
  elements.pageSize.value = elements.pageSize.value || String(state.pageSize || 20);
}

function filterAndSort() {
  const q = normalizeSearchText(state.search);
  const rarity = elements.rarityFilter.value;
  const color = elements.colorFilter.value;
  const deprecatedMode = elements.deprecatedFilter.value;

  let rows = state.relics.filter((r) => {
    if (rarity && r.rarity !== rarity) return false;
    if (color && r.color !== color) return false;
    if (deprecatedMode === "ONLY" && !r.deprecated) return false;
    if (deprecatedMode === "EXCLUDE" && r.deprecated) return false;

    if (!q) return true;
    if (state.translatorMode) {
      const en = normalizeSearchText(`${(r.name.en || "")} ${(r.description.en || "")} ${r.id || ""} ${(r.codeName || "")}`);
      const zh = normalizeSearchText(`${(r.name.zh || "")} ${(r.description.zh || "")} ${r.id || ""} ${(r.codeName || "")}`);
      return en.includes(q) || zh.includes(q);
    }

    const text = normalizeSearchText(`${(r.name[state.lang] || "")} ${(r.description[state.lang] || "")} ${r.id || ""} ${(r.codeName || "")}`);
    return text.includes(q);
  });

  const sortBy = elements.sortBy.value;
  const desc = elements.sortDir.value === "DESC";

  rows.sort((a, b) => {
    let cmp = 0;
    if (sortBy === "NAME") cmp = compareMaybeString((a.name || {})[state.lang], (b.name || {})[state.lang]);
    else if (sortBy === "ID") cmp = compareMaybeString(a.id, b.id);
    else if (sortBy === "RARITY") cmp = compareMaybeString(localizeRarity(a.rarity), localizeRarity(b.rarity));
    else if (sortBy === "COLOR") cmp = compareMaybeString(localizeColor(a), localizeColor(b));
    if (cmp === 0) cmp = compareMaybeString(a.id, b.id);
    return desc ? -cmp : cmp;
  });

  state.filtered = rows;
}

function fitRelicDescriptions() {
  const fit = () => {
    document.querySelectorAll(".relic-page #relicGrid > .card .card-desc").forEach((node) => {
      node.style.fontSize = "";
      let size = parseFloat(getComputedStyle(node).fontSize);
      while (node.scrollHeight > node.clientHeight + 1 && size > 9) {
        size = Math.max(9, size - 0.5);
        node.style.fontSize = `${size}px`;
      }
    });
  };
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(fit);
  } else {
    requestAnimationFrame(fit);
  }
}

function syncRelicTranslatorGridLayout() {
  const minCardWidth = 196;
  const columnGap = 28;
  let columns = Math.floor((elements.grid.clientWidth + columnGap) / (minCardWidth + columnGap));
  columns = Math.max(1, columns);
  if (state.translatorMode) columns = Math.max(2, columns - (columns % 2));
  if (state.translatorMode) {
    elements.grid.style.gridTemplateColumns = `repeat(${columns}, minmax(0, 208px))`;
    elements.grid.style.justifyContent = "center";
  } else {
    elements.grid.style.removeProperty("grid-template-columns");
  }
  return columns;
}

function syncRelicPageCapacity() {
  const columns = syncRelicTranslatorGridLayout();
  state.pageSize = columns * 6;
  elements.pageSize.value = String(state.pageSize);
}

function render() {
  filterAndSort();
  syncRelicPageCapacity();

  const total = state.filtered.length;
  state.pageSize = Number(elements.pageSize.value || state.pageSize || 20);
  const pageCount = Math.max(1, Math.ceil(total / state.pageSize));
  state.page = Math.min(Math.max(1, state.page), pageCount);

  const start = (state.page - 1) * state.pageSize;
  const slice = state.filtered.slice(start, start + state.pageSize);

  elements.grid.innerHTML = "";
  if (!state.translatorMode) {
    slice.forEach((relic) => elements.grid.appendChild(buildRelicElement(relic)));
  } else {
    slice.forEach((relic) => {
      elements.grid.appendChild(buildRelicElement(relic, "en"));
      elements.grid.appendChild(buildRelicElement(relic, "zh"));
    });
  }
  fitRelicDescriptions();

  elements.summary.textContent = t("summary")
    .replace("{shown}", String(slice.length))
    .replace("{total}", String(total));

  elements.pageInfo.textContent = t("pageInfo")
    .replace("{page}", String(state.page))
    .replace("{total}", String(pageCount));

  elements.prevPage.disabled = state.page <= 1;
  elements.nextPage.disabled = state.page >= pageCount;

  const showClear = (elements.searchInput.value || "").trim().length > 0;
  elements.clearSearchInlineBtn.classList.toggle("visible", showClear);

  syncUrlState();
}

function renderCurrentPage() {
  syncRelicPageCapacity();
  const total = state.filtered.length;
  state.pageSize = Number(elements.pageSize.value || state.pageSize || 20);
  const pageCount = Math.max(1, Math.ceil(total / state.pageSize));
  state.page = Math.min(Math.max(1, state.page), pageCount);

  const start = (state.page - 1) * state.pageSize;
  const slice = state.filtered.slice(start, start + state.pageSize);

  elements.grid.innerHTML = "";
  if (!state.translatorMode) {
    slice.forEach((relic) => elements.grid.appendChild(buildRelicElement(relic)));
  } else {
    slice.forEach((relic) => {
      elements.grid.appendChild(buildRelicElement(relic, "en"));
      elements.grid.appendChild(buildRelicElement(relic, "zh"));
    });
  }
  fitRelicDescriptions();

  elements.summary.textContent = t("summary")
    .replace("{shown}", String(slice.length))
    .replace("{total}", String(total));

  elements.pageInfo.textContent = t("pageInfo")
    .replace("{page}", String(state.page))
    .replace("{total}", String(pageCount));

  elements.prevPage.disabled = state.page <= 1;
  elements.nextPage.disabled = state.page >= pageCount;

  const showClear = (elements.searchInput.value || "").trim().length > 0;
  elements.clearSearchInlineBtn.classList.toggle("visible", showClear);

  syncUrlState();
}

function bindControls() {
  const rerender = () => {
    state.page = 1;
    state.search = elements.searchInput.value || "";
    render();
  };

  [elements.rarityFilter, elements.colorFilter, elements.deprecatedFilter, elements.sortBy, elements.sortDir, elements.pageSize].forEach((el) => {
    el.addEventListener("change", rerender);
  });

  elements.searchBtn.addEventListener("click", rerender);
  elements.searchInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") rerender();
  });
  elements.searchInput.addEventListener("input", () => {
    const showClear = (elements.searchInput.value || "").trim().length > 0;
    elements.clearSearchInlineBtn.classList.toggle("visible", showClear);
  });
  elements.clearSearchInlineBtn.addEventListener("click", () => {
    elements.searchInput.value = "";
    state.search = "";
    state.page = 1;
    render();
  });

  elements.prevPage.addEventListener("click", () => {
    if (state.page > 1) {
      state.page -= 1;
      render();
    }
  });

  elements.nextPage.addEventListener("click", () => {
    const pageCount = Math.max(1, Math.ceil(state.filtered.length / state.pageSize));
    if (state.page < pageCount) {
      state.page += 1;
      render();
    }
  });

  elements.langToggle.addEventListener("click", () => {
    if (state.translatorMode) return;
    state.lang = state.lang === "en" ? "zh" : "en";
    applyI18nText();
    buildOptions();
    renderCurrentPage();
    updateTranslatorEntryLink();
  });

  window.addEventListener("resize", () => {
    const previousPageSize = state.pageSize;
    syncRelicPageCapacity();
    if (state.pageSize !== previousPageSize) {
      state.page = 1;
      render();
    }
  });

  elements.fontStyleToggle.addEventListener("click", () => {
    state.useEnglishFontStyle = !state.useEnglishFontStyle;
    window.localStorage.setItem("downfall-english-font-style", state.useEnglishFontStyle ? "1" : "0");
    applyI18nText();
    renderCurrentPage();
  });
}

async function init() {
  parseUrlState();
  state.useEnglishFontStyle = window.localStorage.getItem("downfall-english-font-style") === "1";
  applyI18nText();

  const [relicRes, cardRes] = await Promise.all([
    fetch("data/relics.json"),
    fetch("data/cards.json"),
  ]);

  if (!relicRes.ok) throw new Error(`Failed to load relic data: ${relicRes.status}`);
  if (!cardRes.ok) throw new Error(`Failed to load card data: ${cardRes.status}`);

  state.relicData = await relicRes.json();
  elements.pageSize.closest("label").hidden = true;
  elements.deprecatedFilter.closest("label").hidden = true;
  state.cardsData = await cardRes.json();
  state.relics = (state.relicData && state.relicData.relics) || [];

  buildCardNameIndex((state.cardsData && state.cardsData.cards) || []);
  buildKeywordIndex();

  buildOptions();
  bindControls();
  bindTooltipEvents();
  bindRelicAttachmentHoverEvents();
  updateTranslatorEntryLink();
  updateCrossPageLinks();

  elements.sortBy.value = "NAME";
  elements.sortDir.value = "ASC";
  elements.pageSize.value = String(state.pageSize);

  state.search = elements.searchInput.value || "";
  render();
}

init().catch((err) => {
  console.error(err);
  elements.summary.textContent = String(err && err.message ? err.message : err);
});
