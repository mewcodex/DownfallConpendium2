const state = {
  data: null,
  keywordByLang: {
    en: new Map(),
    zh: new Map(),
  },
  cardByNameLang: {
    en: new Map(),
    zh: new Map(),
  },
  cardByNormNameLang: {
    en: new Map(),
    zh: new Map(),
  },
  cardById: new Map(),
  baseKeywordTerms: {
    en: [],
    zh: [],
  },
  lang: "en",
  showUpgrade: false,
  filters: {
    type: "",
    cost: "",
    rarity: "",
    color: "",
    deprecated: "",
  },
  sort: {
    by: "",
    dir: "asc",
  },
  search: "",
  page: 1,
  pageSize: 24,
  suppressNextCardAnimation: false,
  filteredSorted: [],
  translatorMode: false,
};

const uiText = {
  en: {
    eyebrow: "",
    title: "Slay the Spire: Downfall 2 Card Conpendium",
    subtitle: "WIP",
    toggleUpgrade: "Show Upgraded",
    toggleBase: "Show Base",
    searchLabel: "Search",
    typeLabel: "Type",
    costLabel: "Cost",
    rarityLabel: "Rarity",
    colorLabel: "Color",
    deprecatedLabel: "Deprecated",
    sortByLabel: "Sort by",
    sortDirLabel: "Order",
    sortDefault: "Default",
    sortFieldType: "Type",
    sortFieldCost: "Cost",
    sortFieldRarity: "Rarity",
    sortFieldColor: "Color",
    sortDirAsc: "Ascending",
    sortDirDesc: "Descending",
    pageSizeLabel: "Per page",
    summary: (shown, total) => `${shown} of ${total} cards`,
    noResults: "No cards match the current filters.",
    any: "Any",
    deprecatedOnly: "Only deprecated",
    deprecatedExclude: "Exclude deprecated",
    unplayable: "Unplayable",
    notInPool: "not in the pool",
    searchBtn: "Search",
    clearSearch: "Clear",
    navRelics: "Relics",
  },
  zh: {
    eyebrow: "崩坠 Mod 卡牌展示",
    title: "杀戮尖塔：崩坠2 卡牌图鉴",
    subtitle: "正在施工中",
    toggleUpgrade: "显示升级",
    toggleBase: "显示未升级",
    searchLabel: "搜索",
    typeLabel: "类型",
    costLabel: "费用",
    rarityLabel: "稀有度",
    colorLabel: "颜色",
    deprecatedLabel: "弃用状态",
    sortByLabel: "排序字段",
    sortDirLabel: "排序方向",
    sortDefault: "默认",
    sortFieldType: "类型",
    sortFieldCost: "费用",
    sortFieldRarity: "稀有度",
    sortFieldColor: "颜色",
    sortDirAsc: "正序",
    sortDirDesc: "逆序",
    pageSizeLabel: "每页数量",
    summary: (shown, total) => `显示 ${shown} / ${total} 张`,
    noResults: "没有符合条件的卡牌。",
    any: "全部",
    deprecatedOnly: "仅弃用",
    deprecatedExclude: "排除弃用",
    unplayable: "不可打出",
    notInPool: "不在卡池中",
    searchBtn: "搜索",
    clearSearch: "清除",
    navRelics: "遗物",
  },
};

function isNotInPoolCard(card) {
  return Boolean(card && card.notInPool);
}

function getNotInPoolBadgeText(card) {
  if (card && card.color === "COLLECTIBLE") {
    return state.lang === "zh" ? "无法获得" : "Unobtainable";
  }
  return i18n("notInPool");
}

const elements = {
  langToggle: document.getElementById("langToggle"),
  upgradeToggle: document.getElementById("upgradeToggle"),
  relicsPageLink: document.getElementById("relicsPageLink"),
  searchInput: document.getElementById("searchInput"),
  searchBtn: document.getElementById("searchBtn"),
  clearSearchInlineBtn: document.getElementById("clearSearchInlineBtn"),
  typeFilter: document.getElementById("typeFilter"),
  costFilter: document.getElementById("costFilter"),
  rarityFilter: document.getElementById("rarityFilter"),
  colorFilter: document.getElementById("colorFilter"),
  deprecatedFilter: document.getElementById("deprecatedFilter"),
  sortBy: document.getElementById("sortBy"),
  sortDir: document.getElementById("sortDir"),
  pageSize: document.getElementById("pageSize"),
  summary: document.getElementById("summary"),
  grid: document.getElementById("cardGrid"),
  prevPage: document.getElementById("prevPage"),
  nextPage: document.getElementById("nextPage"),
  pageInfo: document.getElementById("pageInfo"),
  versionInfo: document.getElementById("versionInfo"),
};

function renderVersionInfo() {
  if (!elements.versionInfo || !state.data) return;
  const modVersion = state.data.modVersion || "unknown";
  const translationVersion = state.data.translationVersion || "unknown";
  elements.versionInfo.textContent = state.lang === "zh"
    ? `Mod 版本：${modVersion} | 中文译文版本：${translationVersion}`
    : `Mod version: ${modVersion} | Chinese translation: ${translationVersion}`;
}

function updateCrossPageLinks() {
  const link = elements.relicsPageLink;
  if (!link) return;
  const params = new URLSearchParams();
  if (state.lang !== "en") params.set("lang", state.lang);
  if (state.translatorMode) params.set("translator_mode", "1");
  const query = params.toString();
  link.href = query ? `relics.html?${query}` : "relics.html";
}

function i18n(key) {
  return uiText[state.lang][key];
}

function withTempLang(lang, callback) {
  if (lang !== "en" && lang !== "zh") {
    return callback();
  }
  const prevLang = state.lang;
  state.lang = lang;
  try {
    return callback();
  } finally {
    state.lang = prevLang;
  }
}

function getCardRenderLang(cardNode) {
  return cardNode && cardNode.dataset && cardNode.dataset.renderLang === "zh" ? "zh" : "en";
}

function updateTranslatorEntryLink() {
  const link = document.getElementById("translatorModeEntry");
  if (!link) return;
  const params = new URLSearchParams(window.location.search || "");
  if (state.translatorMode) {
    params.delete("translator_mode");
    link.textContent = "exit translator mode";
  } else {
    params.set("translator_mode", "1");
    link.textContent = "translator mode";
  }
  link.href = `${window.location.pathname}?${params.toString()}`;
}

function updateInlineClearVisibility() {
  const hasValue = Boolean((elements.searchInput.value || "").length);
  elements.clearSearchInlineBtn.classList.toggle("visible", hasValue);
}

function escapeRegExp(text) {
  return (text || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function localizeColor(cardOrColor) {
  if (!cardOrColor) return "";
  const card = typeof cardOrColor === "object" ? cardOrColor : null;
  const color = card ? card.color : cardOrColor;
  if (card && card.colorName && card.colorName[state.lang]) {
    return card.colorName[state.lang];
  }
  if (!color) return "";
  const colorMap = {
    ANCIENT: { en: "Ancient", zh: "先古" },
    BOSS: { en: "Boss", zh: "首领" },
    COLLECTIBLE: { en: "Collectible", zh: "藏品" },
    COLORLESS: { en: "Colorless", zh: "无色" },
    CURSE: { en: "Curse", zh: "诅咒" },
  };
  const mapped = colorMap[color];
  if (mapped) {
    return mapped[state.lang] || color;
  }
  return color.split(/[_-]+/).map((part) => part.charAt(0) + part.slice(1).toLowerCase()).join(" ");
}

function localizeType(type) {
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

function getTypeTagClass(type) {
  if (!type) return "tag";
  if (type === "ATTACK") return "tag tag-type tag-type-attack";
  if (type === "SKILL") return "tag tag-type tag-type-skill";
  if (type === "POWER") return "tag tag-type tag-type-power";
  return "tag";
}

function localizeRarity(rarity) {
  if (!rarity) return "";
  const rarityMap = {
    BASIC: { en: "Basic", zh: "基础" },
    COMMON: { en: "Common", zh: "普通" },
    UNCOMMON: { en: "Uncommon", zh: "罕见" },
    RARE: { en: "Rare", zh: "稀有" },
    SPECIAL: { en: "Special", zh: "特殊" },
    ANCIENT: { en: "Ancient", zh: "先古" },
    CURSE: { en: "Curse", zh: "诅咒" },
  };
  const mapped = rarityMap[rarity];
  if (!mapped) return rarity.split(/[_-]+/).map((part) => part.charAt(0) + part.slice(1).toLowerCase()).join(" ");
  return mapped[state.lang] || rarity;
}

function getRarityTagClass(rarity) {
  if (!rarity) return "tag";
  if (rarity === "UNCOMMON") return "tag tag-rarity-uncommon";
  if (rarity === "RARE") return "tag tag-rarity-rare";
  return "tag";
}

function escapeHtml(text) {
  return (text || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function fillNumericTokens(text, card, useUpgrade = state.showUpgrade) {
  const baseTokenValues = card.tokenValues || {};
  const upgradeTokenValues = card.upgradeTokenValues || baseTokenValues;
  const baseStats = card.stats || {};
  const upgradeStats = card.upgradeStats || baseStats;
  const tokenValues = useUpgrade ? upgradeTokenValues : baseTokenValues;
  const stats = useUpgrade ? upgradeStats : baseStats;
  const wrapFilledValue = (value, changed) => (changed ? `__TVG__${value}__` : `__TV__${value}__`);

  function resolveFromStats(token, statsSource) {
    const upper = token.toUpperCase();
    if (upper === "D") return statsSource.damage;
    if (upper === "B") return statsSource.block;
    if (upper === "M") return statsSource.magic;
    if (upper.endsWith(":M2") || upper.endsWith("SECONDM") || upper.endsWith("M2")) return statsSource.secondMagic;
    if (upper.endsWith(":M3") || upper.endsWith("THIRDM") || upper.endsWith("M3")) return statsSource.thirdMagic;
    if (upper.endsWith(":D2") || upper.endsWith("SECONDD") || upper.endsWith("D2")) return statsSource.secondDamage;
    if (upper.includes("SELFHARM") || upper.includes("SELFDAMAGE")) return statsSource.selfDamage;
    if (upper === "SLIME") return statsSource.slime;
    return null;
  }

  return (text || "").replace(/!([A-Za-z0-9_:]+)!/g, (full, token) => {
    let value = null;
    let baseValue = null;
    if (Object.prototype.hasOwnProperty.call(tokenValues, token)) {
      value = tokenValues[token];
      baseValue = Object.prototype.hasOwnProperty.call(baseTokenValues, token) ? baseTokenValues[token] : value;
    } else {
      value = resolveFromStats(token, stats);
      baseValue = resolveFromStats(token, baseStats);
    }

    if (typeof value === "number") {
      const changed = useUpgrade && typeof baseValue === "number" && value !== baseValue;
      return wrapFilledValue(value, changed);
    }
    return full;
  });
}

function fillSts2DynamicTokens(text, card, useUpgrade = state.showUpgrade) {
  const baseValues = (card && card.dynamicValues) || {};
  const values = useUpgrade ? ((card && card.upgradeDynamicValues) || baseValues) : baseValues;
  const wrapFilledValue = (value, changed) => (changed ? `__TVG__${value}__` : `__TV__${value}__`);
  const normalizedName = (name) => name.toLowerCase().replace(/power$/, "");
  const fillValue = (full, name) => {
    const key = Object.keys(values).find((candidate) => normalizedName(candidate) === normalizedName(name));
    const baseKey = Object.keys(baseValues).find((candidate) => normalizedName(candidate) === normalizedName(name));
    const value = key ? values[key] : null;
    const baseValue = baseKey ? baseValues[baseKey] : value;
    if (typeof value !== "number") return full;
    return wrapFilledValue(value, useUpgrade && typeof baseValue === "number" && value !== baseValue);
  };

  return (text || "")
    .replace(/\{([A-Za-z_]\w*):diff\(\)\}/g, fillValue)
    .replace(/\{([A-Za-z_]\w*)\}/g, fillValue);
}

function finalizeFilledTokenSpacing(text) {
  if (!text) return "";
  if (state.lang === "zh") {
    // In zh mode, remove spaces around filled numeric values.
    return text
      .replace(/\s*__TVG__(-?\d+)__\s*/g, "__TVG__$1__")
      .replace(/\s*__TV__(-?\d+)__\s*/g, "__TV__$1__");
  }
  return text
    .replace(/__TVG__(-?\d+)__/g, "__TVG__$1__")
    .replace(/__TV__(-?\d+)__/g, "__TV__$1__");
}

function renderNumericMarkers(text) {
  if (!text) return "";
  return text
    .replace(/__TVG__(-?\d+)__/g, '<span class="kw-mark-green">$1</span>')
    .replace(/__TV__(-?\d+)__/g, '<span class="kw-mark-blue">$1</span>');
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

function preserveLegacyColorMarkers(text) {
  if (!text) return "";
  return text
    .replace(/#b\s*([^\s<]+)/g, (_full, token) => {
      const split = splitLeadingNumberToken(token);
      return `__BLUE__${split.colored}__${split.rest}`;
    })
    .replace(/#r\s*([^\s<]+)/g, (_full, token) => {
      const split = splitLeadingNumberToken(token);
      return `__RED__${split.colored}__${split.rest}`;
    })
    .replace(/#p\s*([^\s<]+)/g, (_full, token) => {
      const split = splitLeadingNumberToken(token);
      return `__PURPLE__${split.colored}__${split.rest}`;
    });
}

function renderLegacyColorMarkers(text) {
  if (!text) return "";
  return text
    .replace(/__BLUE__([^_<\s][^<\s]*)__/g, '<span class="kw-mark-blue">$1</span>')
    .replace(/__RED__([^_<\s][^<\s]*)__/g, '<span class="kw-mark-red">$1</span>')
    .replace(/__PURPLE__([^_<\s][^<\s]*)__/g, '<span class="kw-mark-purple">$1</span>');
}

function renderBracketColorSyntax(text) {
  if (!text) return "";
  // Parse STS color syntax like [#e087a4]text[] after other highlights,
  // so explicit color wrappers have lower priority.
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

function stripSts2Blocks(text, blockName) {
  const marker = `{${blockName}:`.toLowerCase();
  let output = "";
  let cursor = 0;

  while (cursor < text.length) {
    const start = text.toLowerCase().indexOf(marker, cursor);
    if (start < 0) {
      output += text.slice(cursor);
      break;
    }

    output += text.slice(cursor, start);
    let depth = 0;
    let end = start;
    for (; end < text.length; end += 1) {
      if (text[end] === "{") depth += 1;
      if (text[end] === "}") {
        depth -= 1;
        if (depth === 0) {
          end += 1;
          break;
        }
      }
    }
    cursor = depth === 0 ? end : start + marker.length;
  }

  return output;
}

function renderSts2Markup(text, useUpgrade = state.showUpgrade, card = null) {
  if (!text) return "";
  const colorClasses = {
    gold: "kw-mark-yellow",
    blue: "kw-mark-blue",
    red: "kw-mark-red",
    purple: "kw-mark-purple",
    green: "kw-mark-green",
    aqua: "kw-mark-aqua",
  };
  let rendered = text.replace(/\{IfUpgraded:show:([^{}|]*)\|([^{}]*)\}/g, (_full, upgraded, base) => (
    useUpgrade ? upgraded.replace(/-?\d+/g, (value) => `__TVG__${value}__`) : base
  ));
  rendered = rendered.replace(/\{IfUpgraded:plus\(\)\}/g, useUpgrade ? "+" : "");
  rendered = rendered.replace(/\[(gold|blue|red|purple|green|aqua)\]([\s\S]*?)\[\/\1\]/gi, (_full, color, content) => {
    if (/^__TVG?__-?\d+__$/.test(content)) return content;
    return `<span class="${colorClasses[color.toLowerCase()]}">${content}</span>`;
  });
  rendered = rendered.replace(/\{(?:energyPrefix|Energy):energyIcons\((\d*)\)\}/gi, (_full, amount) => {
    const count = Number(amount || 1);
    return "[E]".repeat(Number.isFinite(count) && count > 0 ? count : 1);
  });
  rendered = rendered.replace(/\{TargetType:choose\((\w+)\):([\s\S]*?)\|\}/g, (_full, target, content) => (
    card && card.target === target ? content : ""
  ));
  rendered = stripSts2Blocks(rendered, "InCombat");
  rendered = stripSts2Blocks(rendered, "IsTargeting");
  rendered = rendered.replace(/\{([A-Za-z_]\w*):plural:([^{}|]*)\|([^{}]*)\}/g, (_full, name, singular, plural) => {
    const valueToken = new RegExp(`__(?:TV|TVG)__(-?\\d+)__`).exec(`${singular}${plural}`);
    const values = useUpgrade ? ((card && card.upgradeDynamicValues) || {}) : ((card && card.dynamicValues) || {});
    const key = Object.keys(values).find((candidate) => candidate.toLowerCase().replace(/power$/, "") === name.toLowerCase().replace(/power$/, ""));
    const value = valueToken ? Number(valueToken[1]) : values[key];
    return value === 1 ? singular : plural;
  });
  rendered = rendered.replace(/\{UpgradeAmount\}/g, () => {
    const values = useUpgrade ? ((card && card.upgradeDynamicValues) || {}) : ((card && card.dynamicValues) || {});
    const value = values.UpgradeAmount;
    return typeof value === "number" && value > 0 ? `+${value}` : "";
  });
  rendered = rendered.replace(/\{Ghostflame\}/g, state.lang === "zh" ? "鬼火" : "Ghostflame");
  rendered = rendered.replace(/\{[A-Za-z_]\w*:cond:\s*([\s\S]*?)\|\}/g, (_full, content) => {
    return content.trim().replace(/^[（(]\s*/, "").replace(/\s*[）)]+$/, "");
  });
  rendered = rendered.replace(/\{(?:[A-Za-z_][\w]*)(?::(?:diff\(\)|plural:[^}]*|cond:[\s\S]*?))?\}/g, (token) => {
    const name = token.slice(1, -1).split(":", 1)[0].replace(/Power$/, "").replace(/([a-z])([A-Z])/g, "$1 $2");
    return name || token;
  });
  return rendered
    .replace(/\{[A-Za-z_]\w*:[^{}]*\}/g, "")
    .replace(/\[\/?(?:sine|jitter|fly_in|shake|fade_in|afterlife)\]/gi, "");
}

function attachAfterlifeHover(text) {
  if (!text) return "";
  let rendered = text;
  // Keep purple highlight, but make Afterlife/阴世 text hoverable via keyword tooltip.
  rendered = rendered.replace(
    /<span class="inline-color" style="color:\s*#e087a4">\s*(阴世)\s*([。.]?)\s*<\/span>/gi,
    (_full, label, punct) => `<span class="inline-color kw" data-kw-alias="阴世" style="color:#e087a4">${label}</span>${punct || ""}`,
  );
  rendered = rendered.replace(
    /<span class="inline-color" style="color:\s*#e087a4">\s*(Afterlife)\s*([。.]?)\s*<\/span>/gi,
    (_full, label, punct) => `<span class="inline-color kw" data-kw-alias="Afterlife" style="color:#e087a4">${label}</span>${punct || ""}`,
  );
  return rendered;
}

function normalizeDescriptionSpacing(text) {
  let normalized = text || "";
  // Remove spaces around energy symbols for all languages.
  normalized = normalized.replace(/\s*\[E\]\s*/g, "[E]");

  if (state.lang === "zh") {
    // Normalize full-width punctuation for zh output.
    normalized = normalized.replace(/,/g, "，").replace(/｡/g, "。");
    // Remove spaces around plain numeric literals in zh descriptions.
    normalized = normalized.replace(/\s*(-?\d+(?:\.\d+)?)\s*/g, "$1");
  }

  return normalized;
}

function hideZhSpacesAfterFormatting(htmlText) {
  if (!htmlText || state.lang !== "zh") return htmlText || "";
  // Remove visible spaces in text segments while preserving HTML tags/attributes.
  return htmlText
    .split(/(<[^>]+>)/g)
    .map((segment) => (segment.startsWith("<") ? segment : segment.replace(/[ \u3000]+/g, "")))
    .join("");
}

function stripRemoveSpaceMarkers(htmlText) {
  if (!htmlText) return htmlText || "";
  // Remove marker and neighboring spaces in plain-text segments only.
  return htmlText
    .split(/(<[^>]+>)/g)
    .map((segment) => (segment.startsWith("<") ? segment : segment.replace(/\s*\[REMOVE_SPACE\]\s*/gi, "")))
    .join("");
}

function renderEnergyToken(text, card) {
  if (!text) return "";
  const icon = card && card.energyIcon;
  const iconHtml = icon
    ? `<span class="energy-token"><img src="${icon}" alt="E" loading="lazy"></span>`
    : '<span class="energy-token energy-token-fallback" aria-label="Energy">E</span>';
  return text.replace(/\[E\]/g, iconHtml);
}

function highlightSocketPlaceholders(text) {
  if (!text) return "";
  if (state.lang === "zh") {
    return text.replace(/\[孔位\]/g, '<span class="kw" data-kw-alias="镶嵌">[孔位]</span>');
  }
  return text.replace(/\[\s*Socket\s*\]/gi, '<span class="kw" data-kw-alias="Socket">[ Socket ]</span>');
}

function stripResidualStarPrefixes(text) {
  if (!text) return "";
  // Clean unresolved "*term" prefixes while keeping punctuation and spacing intact.
  // Use a broader non-word boundary so cases like "*小刀" / "*虚空" are consistently handled.
  return text.replace(/(^|[^0-9A-Za-z_\u4e00-\u9fff])\*\s*(?=[A-Za-z\u4e00-\u9fff])/g, "$1");
}

function buildCardNameIndex() {
  ["en", "zh"].forEach((lang) => {
    const map = new Map();
    const normMap = new Map();
    (state.data.cards || []).forEach((card) => {
      const name = ((card.name || {})[lang] || "").trim();
      if (!name) return;
      if (!map.has(name)) {
        map.set(name, []);
      }
      map.get(name).push(card);

      const norm = normalizeCardRefName(name);
      if (!normMap.has(norm)) {
        normMap.set(norm, []);
      }
      normMap.get(norm).push(card);
    });
    state.cardByNameLang[lang] = map;
    state.cardByNormNameLang[lang] = normMap;
  });

  state.cardById = new Map((state.data.cards || []).map((card) => [card.id, card]));
}

function normalizeCardRefName(text) {
  return (text || "")
    .trim()
    .replace(/[+＋]+$/g, "")
    .replace(/[\s\u3000]/g, "")
    .replace(/[，。｡,\.！!？?：:；;、\)）\]】\}」』]+$/g, "")
    .toLowerCase();
}

function getCardIdPrefix(cardId) {
  if (!cardId || typeof cardId !== "string") return "";
  const idx = cardId.indexOf(":");
  if (idx <= 0) return "";
  return cardId.slice(0, idx).toLowerCase();
}

function resolveReferencedCard(refName, sourceCardId) {
  const map = state.cardByNameLang[state.lang] || new Map();
  const normMap = state.cardByNormNameLang[state.lang] || new Map();
  const raw = (refName || "").trim();
  if (!raw) return null;

  const candidates = [];
  const seen = new Set();

  function collectByKey(key) {
    if (!key) return;
    const list = map.get(key);
    if (!list) return;
    list.forEach((card) => {
      if (!seen.has(card.id)) {
        seen.add(card.id);
        candidates.push(card);
      }
    });
  }

  collectByKey(raw);
  collectByKey(raw.replace(/[+＋]+$/g, "").trim());

  if (!candidates.length) {
    const norm = normalizeCardRefName(raw);
    const list = normMap.get(norm) || [];
    list.forEach((card) => {
      if (!seen.has(card.id)) {
        seen.add(card.id);
        candidates.push(card);
      }
    });
  }

  if (!candidates.length && state.lang === "en") {
    const lower = raw.toLowerCase();
    for (const [name, list] of map.entries()) {
      if ((name || "").toLowerCase() !== lower) continue;
      list.forEach((card) => {
        if (!seen.has(card.id)) {
          seen.add(card.id);
          candidates.push(card);
        }
      });
    }
  }

  if (!candidates.length) return null;

  const sourcePrefix = getCardIdPrefix(sourceCardId);
  if (!sourcePrefix) return candidates[0];

  const sameMod = candidates.find((card) => getCardIdPrefix(card.id) === sourcePrefix);
  return sameMod || candidates[0];
}

function highlightCardReferences(text, sourceCardId) {
  if (!text) return "";
  const sourceIdSafe = escapeHtml(sourceCardId || "");
  let rendered = text.replace(/(^|[\s>（(【\[「『:：，,。.!！？;；、\-+])\*\s*([A-Za-z0-9_\-+'’/·\.\u4e00-\u9fff+＋]+)/g, (_full, lead, ref) => {
    const refSafe = escapeHtml(ref);
    return `${lead}<span class="card-ref" data-card-ref="${refSafe}" data-source-id="${sourceIdSafe}">${refSafe}</span>`;
  });

  if (state.lang === "zh") {
    rendered = rendered.replace(/\s*(<span class="card-ref"[^>]*>[^<]+<\/span>)\s*/g, "$1");
  }

  return rendered;
}

function highlightCardReferencesNoHover(text) {
  if (!text) return "";
  let rendered = text.replace(/(^|[\s>（(【\[「『:：，,。.!！？;；、\-+])\*\s*([A-Za-z0-9_\-+'’/·\.\u4e00-\u9fff+＋]+)/g, (_full, lead, ref) => {
    const refSafe = escapeHtml(ref);
    return `${lead}<span class="card-name-ref">${refSafe}</span>`;
  });

  if (state.lang === "zh") {
    rendered = rendered.replace(/\s*(<span class="card-name-ref"[^>]*>[^<]+<\/span>)\s*/g, "$1");
  }

  return rendered;
}

function withProtectedCardNameRefs(text, transform) {
  if (!text) return "";
  const stash = [];
  const protectedText = text.replace(/<span class="(?:card-name-ref|kw|card-ref)"[^>]*>[\s\S]*?<\/span>/g, (match) => {
    const token = `@@CARDREF_${stash.length}@@`;
    stash.push(match);
    return token;
  });

  let output = transform(protectedText);
  stash.forEach((html, index) => {
    output = output.replaceAll(`@@CARDREF_${index}@@`, html);
  });
  return output;
}

function highlightReferencedCardNamesByMetadata(text, sourceCard) {
  if (!text || !sourceCard) return text || "";

  const refIds = [];
  const seen = new Set();
  const pushId = (id) => {
    if (!id || seen.has(id)) return;
    seen.add(id);
    refIds.push(id);
  };

  (sourceCard.previewReferences || []).forEach((item) => {
    if (item && typeof item === "object") pushId(item.id);
  });
  (sourceCard.references || []).forEach((item) => {
    if (item && typeof item === "object") {
      pushId(item.id);
      return;
    }
    pushId(item);
  });

  const refNames = refIds
    .map((id) => {
      const card = state.cardById.get(id);
      return card ? ((card.name || {})[state.lang] || "").trim() : "";
    })
    .filter(Boolean)
    .sort((a, b) => b.length - a.length);

  if (!refNames.length) return text;

  return withProtectedCardNameRefs(text, (input) => {
    let rendered = input;
    refNames.forEach((name) => {
      const escaped = escapeRegExp(name);
      if (!escaped) return;
      const reg = new RegExp(`(^|[\\s>（(【\\[「『:：，,。.!！？;；、\\-+])(${escaped}(?:\\+)?)`, "g");
      rendered = rendered.replace(reg, (_full, lead, matched) => `${lead}<span class="card-name-ref">${matched}</span>`);
    });
    return rendered;
  });
}

function buildKeywordZhIndex() {
  ["en", "zh"].forEach((lang) => {
    const map = new Map();
    const entries = (state.data && state.data.keywords && state.data.keywords[lang]) || [];
    entries.forEach((entry) => {
      const aliases = entry.aliases || [];
      aliases.forEach((alias) => {
        if (alias && !map.has(alias)) {
          map.set(alias, entry);
        }
      });
      if (entry.name && !map.has(entry.name)) {
        map.set(entry.name, entry);
      }
    });
    state.keywordByLang[lang] = map;
  });
}

function buildBaseKeywordIndex() {
  const baseKeywords = (state.data && state.data.baseKeywords) || [];
  const enTerms = new Set();
  const zhTerms = new Set();

  baseKeywords.forEach((entry) => {
    const enAliases = (((entry || {}).en || {}).aliases || []).filter((v) => typeof v === "string" && v.trim());
    const zhAliases = (((entry || {}).zh || {}).aliases || []).filter((v) => typeof v === "string" && v.trim());
    enAliases.forEach((alias) => {
      const raw = alias.trim();
      if (!raw) return;
      enTerms.add(raw);
      const underscored = raw.replace(/\s+/g, "_");
      const spaced = raw.replace(/_/g, " ").replace(/\s+/g, " ").trim();
      if (underscored) enTerms.add(underscored);
      if (spaced) enTerms.add(spaced);
    });
    zhAliases.forEach((alias) => zhTerms.add(alias.trim()));
  });

  // Include keyword aliases that differ by spaces/underscores (e.g. Temporary HP/Temporary_HP)
  // so text variants remain highlightable.
  const enKeywordMap = state.keywordByLang.en || new Map();
  for (const alias of enKeywordMap.keys()) {
    const raw = String(alias || "").trim();
    if (!raw) continue;
    if (!raw.includes(" ") && !raw.includes("_")) continue;
    enTerms.add(raw);
    const underscored = raw.replace(/\s+/g, "_");
    const spaced = raw.replace(/_/g, " ").replace(/\s+/g, " ").trim();
    if (underscored) enTerms.add(underscored);
    if (spaced) enTerms.add(spaced);
  }

  state.baseKeywordTerms.en = [...enTerms].sort((a, b) => b.length - a.length);
  state.baseKeywordTerms.zh = [...zhTerms].sort((a, b) => b.length - a.length);
}

function renderKeywordSpan(label, alias = null) {
  const rawLabel = label || "";
  const displayLabel = rawLabel.replace(/_/g, " ");
  const text = escapeHtml(displayLabel);
  const aliasValue = alias || rawLabel;
  const aliasAttr = aliasValue ? ` data-kw-alias="${escapeHtml(aliasValue)}"` : "";
  return `<span class="kw"${aliasAttr}>${text}</span>`;
}

function findKeywordEntry(label) {
  if (!label) return null;
  const map = state.keywordByLang[state.lang];
  if (!map) return null;

  if (map.has(label)) {
    return map.get(label);
  }

  if (state.lang === "en") {
    const lower = label.toLowerCase();
    for (const [alias, entry] of map.entries()) {
      if ((alias || "").toLowerCase() === lower) {
        return entry;
      }
    }
  }

  return null;
}

function getHardcodedKeywordEntry(label) {
  if (!label) return null;
  if (state.lang === "zh" && label === "镶嵌") {
    return {
      name: "镶嵌",
      description: " #y宝石 能够被 #y镶嵌 进有 #y孔位 的牌上，使其效果附加于牌。",
    };
  }
  return null;
}

function getKeywordTooltip() {
  let tip = document.querySelector(".kw-tooltip");
  if (tip) return tip;
  tip = document.createElement("div");
  tip.className = "kw-tooltip";
  document.body.appendChild(tip);
  return tip;
}

function formatTooltipDescriptionText(rawText, cardContext) {
  let text = normalizeDescriptionSpacing(rawText || "");
  if (cardContext) {
    text = fillNumericTokens(text, cardContext, state.showUpgrade);
    text = fillSts2DynamicTokens(text, cardContext, state.showUpgrade);
    text = finalizeFilledTokenSpacing(text);
  }
  text = escapeHtml(text).replace(/\\n|\r?\n|NL/g, "<br>");
  text = renderSts2Markup(text, state.showUpgrade, cardContext);
  text = renderEnergyToken(text, cardContext || null);
  text = highlightCardReferencesNoHover(text);
  text = stripResidualStarPrefixes(text);
  text = highlightSocketPlaceholders(text);
  text = renderNumericMarkers(text);
  text = text.replace(/#([ybrp])\s*([^\s<]+)/g, (_full, colorToken, word) => {
    const split = splitLeadingNumberToken(word);
    const cls = colorToken === "y"
      ? "kw-mark-yellow"
      : colorToken === "b"
        ? "kw-mark-blue"
        : colorToken === "r"
          ? "kw-mark-red"
          : "kw-mark-purple";
    return `<span class="${cls}">${split.colored}</span>${split.rest}`;
  });
  text = renderBracketColorSyntax(text);
  text = attachAfterlifeHover(text);
  text = hideZhSpacesAfterFormatting(text);
  text = stripRemoveSpaceMarkers(text);
  return text;
}

function showKeywordTooltip(entry, anchorRect, cardContext, langOverride = null) {
  if (!entry || !entry.description) return;
  const tip = getKeywordTooltip();
  const name = withTempLang(langOverride, () => escapeHtml(entry.name || ""));
  const desc = withTempLang(langOverride, () => formatTooltipDescriptionText(entry.description || "", cardContext));

  tip.innerHTML = `
    <div class="kw-tip-name">${name}</div>
    <div class="kw-tip-desc">${desc}</div>
  `;
  tip.classList.add("show");

  const margin = 10;
  const rect = anchorRect;
  const tipRect = tip.getBoundingClientRect();
  let left = rect.left + window.scrollX;
  let top = rect.bottom + window.scrollY + 8;

  const maxLeft = window.scrollX + window.innerWidth - tipRect.width - margin;
  if (left > maxLeft) {
    left = Math.max(window.scrollX + margin, maxLeft);
  }

  const maxTop = window.scrollY + window.innerHeight - tipRect.height - margin;
  if (top > maxTop) {
    top = rect.top + window.scrollY - tipRect.height - 8;
  }

  tip.style.left = `${Math.max(window.scrollX + margin, left)}px`;
  tip.style.top = `${Math.max(window.scrollY + margin, top)}px`;
}

function hideKeywordTooltip() {
  const tip = document.querySelector(".kw-tooltip");
  if (!tip) return;
  tip.classList.remove("show");
}

function getCardPreviewTooltip() {
  let tip = document.querySelector(".card-mini-preview");
  if (tip) return tip;
  tip = document.createElement("div");
  tip.className = "card-mini-preview";
  document.body.appendChild(tip);
  return tip;
}

function showCardPreviewTooltip(card, anchorRect, langOverride = null) {
  if (!card) return;
  const tip = getCardPreviewTooltip();
  tip.classList.remove("refs-panel");
  tip.classList.remove("preview-left", "preview-right");
  const previewCardEl = langOverride ? buildCardElementInLang(card, langOverride, true, true) : buildCardElement(card, true, true);
  tip.innerHTML = "";
  tip.appendChild(previewCardEl);

  tip.classList.add("show");

  const margin = 10;
  const rect = anchorRect;
  const tipRect = tip.getBoundingClientRect();
  let left = rect.right + window.scrollX + 10;
  let top = rect.top + window.scrollY;

  const maxLeft = window.scrollX + window.innerWidth - tipRect.width - margin;
  if (left > maxLeft) {
    left = rect.left + window.scrollX - tipRect.width - 10;
  }

  const maxTop = window.scrollY + window.innerHeight - tipRect.height - margin;
  if (top > maxTop) {
    top = maxTop;
  }

  tip.style.left = `${Math.max(window.scrollX + margin, left)}px`;
  tip.style.top = `${Math.max(window.scrollY + margin, top)}px`;
}

function showCardReferencePreview(refEntries, anchorRect, langOverride = null) {
  if (!refEntries || !refEntries.length) return;
  const tip = getCardPreviewTooltip();
  tip.classList.add("refs-panel");
  tip.classList.remove("preview-left", "preview-right");
  tip.innerHTML = "";
  refEntries.forEach((entry) => {
    const card = entry && typeof entry === "object" ? entry.card : entry;
    const upgraded = Boolean(entry && typeof entry === "object" && entry.upgraded);
    const descSuffix = (entry && typeof entry === "object" && entry.descriptionSuffix)
      ? (entry.descriptionSuffix[langOverride || state.lang] || null)
      : null;
    if (!card) return;
    if (langOverride) {
      tip.appendChild(buildCardElementInLang(card, langOverride, true, true, { forceUpgrade: upgraded, descriptionSuffix: descSuffix }));
    } else {
      tip.appendChild(buildCardElement(card, true, true, { forceUpgrade: upgraded, descriptionSuffix: descSuffix }));
    }
  });

  tip.classList.add("show");

  const margin = 10;
  const rect = anchorRect;
  const tipRect = tip.getBoundingClientRect();
  let left = rect.right + window.scrollX + 10;
  let top = rect.top + window.scrollY;
  let placedLeftOfAnchor = false;

  const maxLeft = window.scrollX + window.innerWidth - tipRect.width - margin;
  if (left > maxLeft) {
    left = rect.left + window.scrollX - tipRect.width - 10;
    placedLeftOfAnchor = true;
  }

  tip.classList.add(placedLeftOfAnchor ? "preview-left" : "preview-right");

  const maxTop = window.scrollY + window.innerHeight - tipRect.height - margin;
  if (top > maxTop) {
    top = maxTop;
  }

  tip.style.left = `${Math.max(window.scrollX + margin, left)}px`;
  tip.style.top = `${Math.max(window.scrollY + margin, top)}px`;
}

function hideCardPreviewTooltip() {
  const tip = document.querySelector(".card-mini-preview");
  if (!tip) return;
  tip.classList.remove("refs-panel");
  tip.classList.remove("preview-left", "preview-right");
  tip.classList.remove("show");
}

function getCardAttachmentTooltip() {
  let tip = document.querySelector(".card-hover-attachments");
  if (tip) return tip;
  tip = document.createElement("div");
  tip.className = "card-hover-attachments";
  document.body.appendChild(tip);
  return tip;
}

function showCardAttachmentTooltip(card, anchorRect, langOverride = null) {
  if (!card) return;
  const language = langOverride || state.lang;
  const textTips = (card.attachedTips || []).filter((tip) => tip && tip.name && tip.description && tip.name[language] && tip.description[language]);
  const parentUpgraded = state.showUpgrade && hasCardUpgradeableVariant(card);
  const cardTips = (card.attachedCardTips || [])
    .map((entry) => ({
      card: state.cardById.get(entry.id || ""),
      upgraded: Boolean(entry.upgraded || (entry.upgradeWithParent && parentUpgraded)),
    }))
    .filter((entry) => entry.card);
  if (!textTips.length && !cardTips.length) {
    hideCardAttachmentTooltip();
    return;
  }

  const tip = getCardAttachmentTooltip();
  tip.innerHTML = "";
  textTips.forEach((entry) => {
    const sourceValue = entry.sourceValueKey && card.dynamicValues ? card.dynamicValues[entry.sourceValueKey] : null;
    const sourceUpgradeValue = entry.sourceValueKey && card.upgradeDynamicValues ? card.upgradeDynamicValues[entry.sourceValueKey] : sourceValue;
    const tipContext = Object.assign({}, card, {
      dynamicValues: Object.assign({}, card.dynamicValues || {}, entry.dynamicValues || {}, typeof sourceValue === "number" ? { Amount: sourceValue } : {}),
      upgradeDynamicValues: Object.assign({}, card.upgradeDynamicValues || {}, entry.dynamicValues || {}, typeof sourceUpgradeValue === "number" ? { Amount: sourceUpgradeValue } : {}),
    });
    const panel = document.createElement("section");
    panel.className = "card-attached-tip";
    panel.innerHTML = `
      <div class="kw-tip-name">${withTempLang(language, () => hideZhSpacesAfterFormatting(escapeHtml(entry.name[language])))}</div>
      <div class="kw-tip-desc">${withTempLang(language, () => formatTooltipDescriptionText(entry.description[language], tipContext))}</div>
    `;
    tip.appendChild(panel);
  });
  if (cardTips.length) {
    const previews = document.createElement("div");
    previews.className = "card-attached-previews";
    cardTips.forEach((entry) => {
      previews.appendChild(langOverride
        ? buildCardElementInLang(entry.card, language, true, true, { forceUpgrade: entry.upgraded })
        : buildCardElement(entry.card, true, true, { forceUpgrade: entry.upgraded }));
    });
    tip.appendChild(previews);
  }

  tip.classList.add("show");
  const margin = 10;
  const rect = anchorRect;
  const tipRect = tip.getBoundingClientRect();
  let left = rect.right + window.scrollX + 10;
  let top = rect.top + window.scrollY;
  if (left + tipRect.width > window.scrollX + window.innerWidth - margin) {
    left = rect.left + window.scrollX - tipRect.width - 10;
  }
  top = Math.min(top, window.scrollY + window.innerHeight - tipRect.height - margin);
  tip.style.left = `${Math.max(window.scrollX + margin, left)}px`;
  tip.style.top = `${Math.max(window.scrollY + margin, top)}px`;
}

function hideCardAttachmentTooltip() {
  const tip = document.querySelector(".card-hover-attachments");
  if (tip) tip.classList.remove("show");
}

function bindAttachedHoverEvents() {
  elements.grid.addEventListener("mouseover", (event) => {
    const cardNode = event.target.closest("article.card[data-card-id]");
    if (!cardNode || !elements.grid.contains(cardNode)) return;
    const card = state.cardById.get(cardNode.dataset.cardId || "");
    if (!card) return;
    showCardAttachmentTooltip(card, cardNode.getBoundingClientRect(), getCardRenderLang(cardNode));
  });

  elements.grid.addEventListener("mouseout", (event) => {
    const cardNode = event.target.closest("article.card[data-card-id]");
    if (!cardNode || !elements.grid.contains(cardNode)) return;
    if (event.relatedTarget && cardNode.contains(event.relatedTarget)) return;
    hideCardAttachmentTooltip();
  });

  window.addEventListener("scroll", hideCardAttachmentTooltip, { passive: true });
}

function bindKeywordTooltipEvents() {
  elements.grid.addEventListener("mouseover", (event) => {
    const kw = event.target.closest(".kw");
    if (!kw || !elements.grid.contains(kw)) {
      return;
    }
    const alias = (kw.dataset.kwAlias || "").trim();
    const label = alias || (kw.textContent || "").trim();
    const cardNode = kw.closest("article.card[data-card-id]");
    const renderLang = getCardRenderLang(cardNode);
    const entry = withTempLang(renderLang, () => {
      let found = findKeywordEntry(label) || getHardcodedKeywordEntry(label);
      if (!found && label.includes(":")) {
        const local = label.split(":").pop().trim();
        if (local) {
          found = findKeywordEntry(local) || getHardcodedKeywordEntry(local);
        }
      }
      return found;
    });
    if (!entry || !entry.description) {
      hideKeywordTooltip();
      return;
    }
    const cardContext = cardNode ? state.cardById.get(cardNode.dataset.cardId || "") : null;
    showKeywordTooltip(entry, kw.getBoundingClientRect(), cardContext || null, renderLang);
  });

  elements.grid.addEventListener("mouseout", (event) => {
    const kw = event.target.closest(".kw");
    if (!kw || !elements.grid.contains(kw)) {
      return;
    }
    const to = event.relatedTarget;
    if (to && kw.contains(to)) {
      return;
    }
    hideKeywordTooltip();
  });

  window.addEventListener("scroll", hideKeywordTooltip, { passive: true });
}

function bindCardReferencePreviewEvents() {
  elements.grid.addEventListener("mouseover", (event) => {
    const cardNode = event.target.closest("article.card[data-card-id]");
    if (!cardNode || !elements.grid.contains(cardNode)) {
      return;
    }
    const card = state.cardById.get(cardNode.dataset.cardId || "");
    const renderLang = getCardRenderLang(cardNode);
    if (!card) {
      hideCardPreviewTooltip();
      return;
    }
    const sourceCardUpgradedInView = Boolean(state.showUpgrade && hasCardUpgradeableVariant(card));
    const previewRefEntries = (card.previewReferences || [])
      .map((item) => {
        if (!item || typeof item !== "object") return null;
        const refCard = state.cardById.get(item.id || "");
        if (!refCard) return null;
        return {
          card: refCard,
          upgraded: Boolean(item.upgraded) && sourceCardUpgradedInView,
        };
      })
      .filter(Boolean);

    const refEntries = previewRefEntries.length
      ? previewRefEntries
      : (card.references || [])
          .map((item) => {
            const isObjectEntry = item && typeof item === "object";
            const refCard = state.cardById.get(isObjectEntry ? (item.id || "") : item);
            if (!refCard) return null;
            return {
              card: refCard,
              upgraded: Boolean(isObjectEntry && item.upgraded) && sourceCardUpgradedInView,
              descriptionSuffix: isObjectEntry ? (item.descriptionSuffix || null) : null,
            };
          })
          .filter(Boolean);

    if (!refEntries.length) {
      hideCardPreviewTooltip();
      return;
    }
    showCardReferencePreview(refEntries, cardNode.getBoundingClientRect(), renderLang);
  });

  elements.grid.addEventListener("mouseout", (event) => {
    const cardNode = event.target.closest("article.card[data-card-id]");
    if (!cardNode || !elements.grid.contains(cardNode)) {
      return;
    }
    const to = event.relatedTarget;
    if (to && cardNode.contains(to)) {
      return;
    }
    hideCardPreviewTooltip();
  });

  window.addEventListener("scroll", hideCardPreviewTooltip, { passive: true });
}

function shouldHighlightPrefixedNoun(noun, hasKeywordEntry) {
  if (!noun || noun.length < 2) return false;
  if (hasKeywordEntry) return true;
  return true;
}

function findPrefixedKeyword(prefix, noun) {
  if (!noun) return null;
  const candidates = [
    noun,
    `${prefix}:${noun}`,
    `${String(prefix || "").toLowerCase()}:${noun}`,
  ];

  for (const alias of candidates) {
    const entry = findKeywordEntry(alias);
    if (entry) {
      return { entry, alias, matchedLabel: noun, rest: "" };
    }
  }

  if (state.lang === "zh") {
    const localEntry = findKeywordEntry(noun);
    if (localEntry) {
      return { entry: localEntry, alias: `${prefix}:${noun}`, matchedLabel: noun, rest: "" };
    }
  }

  // Compact zh descriptions may concatenate text after a namespaced keyword.
  // Match the longest known alias prefix under the same namespace.
  const map = state.keywordByLang[state.lang] || new Map();
  let best = null;
  const normalizedPrefix = String(prefix || "").toLowerCase();
  for (const [alias, entry] of map.entries()) {
    if (!alias || !entry) continue;
    const aliasText = String(alias);
    const colon = aliasText.indexOf(":");
    if (colon < 0) continue;
    const aliasPrefix = aliasText.slice(0, colon).toLowerCase();
    if (aliasPrefix !== normalizedPrefix) continue;
    const local = aliasText.slice(colon + 1);
    if (!local || !noun.startsWith(local)) continue;
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
  return withProtectedCardNameRefs(text, (input) => {
    const prefixedPattern = /([A-Za-z_][\w]*):([^\s<>{}\[\]，。｡,.!！？:：;；]+)/g;
    let rendered = input.replace(prefixedPattern, (_full, prefix, noun) => {
      const matched = findPrefixedKeyword(prefix, noun);
      if (!matched) {
        if (!shouldHighlightPrefixedNoun(noun, false)) {
          return _full;
        }
        return renderKeywordSpan(noun, `${prefix}:${noun}`);
      }
      if (!shouldHighlightPrefixedNoun(noun, Boolean(matched.entry))) {
        return _full;
      }
      return `${renderKeywordSpan(matched.matchedLabel, matched.alias)}${escapeHtml(matched.rest || "")}`;
    });
    if (state.lang === "zh") {
      // Remove spaces around highlighted keyword in zh mode.
      rendered = rendered.replace(/\s*(<span class="kw"[^>]*>[^<]+<\/span>)\s*/g, "$1");
    }
    return rendered;
  });
}

function highlightBaseKeywords(text) {
  if (!text) return "";
  return withProtectedCardNameRefs(text, (input) => {
    let rendered = input;

    if (state.lang === "zh") {
      state.baseKeywordTerms.zh.forEach((term) => {
        const escaped = escapeRegExp(term);
        if (!escaped) return;
        // zh rule: only highlight terms surrounded by whitespace.
        const reg = new RegExp(`(^|\\s)(${escaped})(?=\\s|$)`, "g");
        rendered = rendered.replace(reg, (_full, lead, match) => `${lead}${renderKeywordSpan(match)}`);
      });
      return rendered;
    }

    state.baseKeywordTerms.en.forEach((term) => {
      const escaped = escapeRegExp(term);
      if (!escaped) return;
      const reg = new RegExp(`\\b(${escaped})\\b`, "gi");
      rendered = rendered.replace(reg, (_full, match) => renderKeywordSpan(match));
    });
    return rendered;
  });
}

function applyI18n() {
  document.documentElement.lang = state.lang === "zh" ? "zh-CN" : "en";

  document.querySelectorAll("[data-i18n]").forEach((node) => {
    const key = node.dataset.i18n;
    const value = i18n(key);
    if (value !== undefined) {
      node.textContent = value;
    }
  });

  elements.langToggle.textContent = state.translatorMode ? "translator mode" : state.lang.toUpperCase();
  elements.langToggle.style.display = "";
  elements.langToggle.disabled = Boolean(state.translatorMode);
  elements.langToggle.classList.toggle("translator-mode-pill", Boolean(state.translatorMode));
  renderVersionInfo();
  elements.upgradeToggle.textContent = state.showUpgrade ? i18n("toggleBase") : i18n("toggleUpgrade");
  elements.searchInput.placeholder = state.lang === "zh" ? "卡名或描述" : "Card name or description";
}

function buildSelect(select, options) {
  select.innerHTML = "";
  options.forEach((option) => {
    const el = document.createElement("option");
    el.value = option.value;
    el.textContent = option.label;
    select.appendChild(el);
  });
}

function formatCost(cost) {
  if (cost === -1) return "X";
  if (cost === -2) return "-";
  if (cost === null || cost === undefined) return "?";
  return String(cost);
}

function normalizeSearchText(text) {
  let normalized = (text || "").toLowerCase();
  normalized = normalized.replace(/\[#(?:[0-9a-f]{3}|[0-9a-f]{6})\]/gi, "");
  normalized = normalized.replace(/\[\]/g, "");
  normalized = normalized.replace(/__TVG__|__TV__/g, "");
  normalized = normalized.replace(/\bNL\b/g, " ");
  normalized = normalized.replace(/\s+([.,!?;:，。！？；：、])/g, "$1");
  normalized = normalized.replace(/[\s_]+/g, "");
  return normalized;
}

function getDisplayDescriptionByMode(card, useUpgrade = state.showUpgrade) {
  const base = card.description[state.lang] || "";
  if (!useUpgrade) return base;
  if (card.usesUpgradeDescription === false) return base;
  return card.upgradeDescription[state.lang] || base;
}

function hasAnyNumericStatChange(card) {
  const base = card.stats || {};
  const upgraded = card.upgradeStats || base;
  const keys = ["damage", "block", "magic", "secondMagic", "thirdMagic", "secondDamage", "selfDamage", "slime"];
  return keys.some((key) => {
    const a = base[key];
    const b = upgraded[key];
    return typeof a === "number" && typeof b === "number" && a !== b;
  });
}

function hasAnyDynamicValueChange(card) {
  const base = card.dynamicValues || {};
  const upgraded = card.upgradeDynamicValues || base;
  return Object.keys(base).some((key) => (
    typeof base[key] === "number"
    && typeof upgraded[key] === "number"
    && base[key] !== upgraded[key]
  ));
}

function hasCardUpgradeableVariant(card) {
  if (!card) return false;
  if (card.canUpgrade === false) return false;
  if (card.canUpgrade === true) return true;
  if (typeof card.cost === "number" && typeof card.upgradeCost === "number" && card.cost !== card.upgradeCost) {
    return true;
  }
  if (hasAnyNumericStatChange(card)) {
    return true;
  }
  if (hasAnyDynamicValueChange(card)) {
    return true;
  }
  const baseDesc = ((card.description || {})[state.lang] || "").trim();
  const upDesc = ((card.upgradeDescription || {})[state.lang] || "").trim();
  if (upDesc && upDesc !== baseDesc) {
    return true;
  }
  return false;
}

function buildSearchableDescription(card) {
  let text = resolveCardBaseDescription(card);
  text = normalizeDescriptionSpacing(text);
  text = fillNumericTokens(text, card);
  text = finalizeFilledTokenSpacing(text);
  text = text.replace(/__TVG__(-?\d+)__/g, "$1").replace(/__TV__(-?\d+)__/g, "$1");
  text = stripResidualStarPrefixes(text);
  text = hideZhSpacesAfterFormatting(text);
  text = stripRemoveSpaceMarkers(text);
  return text;
}

function buildSearchableDescriptionForLang(card, lang) {
  const prevLang = state.lang;
  state.lang = lang;
  try {
    return buildSearchableDescription(card);
  } finally {
    state.lang = prevLang;
  }
}

function matchesSearch(card) {
  if (!state.search) return true;
  const search = normalizeSearchText(state.search);
  const id = normalizeSearchText(card.id || "");

  if (state.translatorMode) {
    const nameEn = normalizeSearchText((card.name || {}).en || "");
    const nameZh = normalizeSearchText((card.name || {}).zh || "");
    const descEn = normalizeSearchText(buildSearchableDescriptionForLang(card, "en"));
    const descZh = normalizeSearchText(buildSearchableDescriptionForLang(card, "zh"));
    return id.includes(search) || nameEn.includes(search) || nameZh.includes(search) || descEn.includes(search) || descZh.includes(search);
  }

  const name = normalizeSearchText(card.name[state.lang] || "");
  const desc = normalizeSearchText(buildSearchableDescription(card));
  return name.includes(search) || id.includes(search) || desc.includes(search);
}

function matchesFilter(value, filterValue) {
  if (!filterValue) return true;
  return value === filterValue;
}

function matchesCost(cardCost) {
  if (!state.filters.cost) return true;
  if (state.filters.cost === "X") return cardCost === -1;
  if (state.filters.cost === "UNPLAYABLE") return cardCost === -2;
  if (state.filters.cost === "6+") return typeof cardCost === "number" && cardCost >= 6;
  return cardCost === Number(state.filters.cost);
}

function matchesDeprecated(card) {
  if (!state.filters.deprecated) return true;
  if (state.filters.deprecated === "ONLY") return Boolean(card.deprecated);
  if (state.filters.deprecated === "EXCLUDE") return !card.deprecated;
  return true;
}

const raritySortRank = {
  BASIC: 0,
  COMMON: 1,
  UNCOMMON: 2,
  RARE: 3,
  CURSE: 4,
  SPECIAL: 5,
};

function compareMaybeString(a, b) {
  return (a || "").localeCompare((b || ""), state.lang === "zh" ? "zh" : "en");
}

function costSortValue(card) {
  const cost = getDisplayCost(card);
  if (cost === -2) return 1001;
  if (cost === -1) return 1000;
  if (typeof cost === "number") return cost;
  return 1002;
}

function compareCardsBySort(a, b) {
  const dir = state.sort.dir === "desc" ? -1 : 1;
  const by = state.sort.by || "";

  if (!by) {
    return compareMaybeString(a.id, b.id);
  }

  let cmp = 0;
  if (by === "type") {
    cmp = compareMaybeString(localizeType(a.type), localizeType(b.type));
  } else if (by === "cost") {
    cmp = costSortValue(a) - costSortValue(b);
  } else if (by === "rarity") {
    const ar = raritySortRank[a.rarity] ?? 999;
    const br = raritySortRank[b.rarity] ?? 999;
    cmp = ar - br;
  } else if (by === "color") {
    cmp = compareMaybeString(localizeColor(a), localizeColor(b));
  }

  if (cmp === 0) {
    cmp = compareMaybeString(a.name[state.lang], b.name[state.lang]);
  }
  if (cmp === 0) {
    cmp = compareMaybeString(a.id, b.id);
  }
  return cmp * dir;
}

function shouldRenderAfterlifeExtended(card, text) {
  if (card && card.isAfterlifeCard === true) return true;
  if (card && card.isAfterlifeCard === false) return false;
  const t = text || "";
  if (!t) return false;
  if (/\[#e087a4\][^\[]*(阴世|Afterlife)(?:[。.]|\s)*\[\]/i.test(t)) return true;
  return false;
}

function colorizeAfterlifeExtended(text) {
  const words = (text || "").split(" ");
  return words
    .map((word) => {
      if (word === "" || word === "!D!" || word === "!B!" || word === "!M!" || word === "!burny!" || word === "NL") {
        return word;
      }
      return `[#e087a4]${word}[]`;
    })
    .join(" ");
}

function resolveCardBaseDescription(card, useUpgrade = state.showUpgrade) {
  const base = getDisplayDescriptionByMode(card, useUpgrade);
  const finisherSuffix = card && card.isFinisher && card.finisherLabel && card.finisherLabel[state.lang]
    ? `\n${card.finisherLabel[state.lang]}`
    : "";
  const keywordIsActive = (entry) => entry && (
    entry.mode === "always"
    || (entry.mode === "add" && useUpgrade)
    || (entry.mode === "remove" && !useUpgrade)
  );
  const formatKeywords = (entries) => (entries || [])
    .filter(keywordIsActive)
    .map((entry) => `[gold]${(entry.label || {})[state.lang] || ""}[/gold]`)
    .filter(Boolean);
  const prefix = formatKeywords(card.descriptionKeywordPrefix).join("\n");
  const suffix = formatKeywords(card.descriptionKeywordSuffix);
  const dynamicLines = (card.dynamicDescriptionLines || [])
    .map((entry) => entry && entry[state.lang])
    .filter(Boolean);
  const decorate = (description) => [prefix, description, ...dynamicLines, ...suffix, finisherSuffix.trim()]
    .filter(Boolean)
    .join("\n");

  if (!shouldRenderAfterlifeExtended(card, base)) {
    return decorate(base);
  }

  const extList = ((card.extendedDescription || {})[state.lang] || []);
  if (!extList.length || !extList[0]) {
    return decorate(base);
  }

  return decorate(`${base}${colorizeAfterlifeExtended(extList[0])}`);
}

function renderDescription(card, options = {}) {
  const useUpgrade = options.forceUpgrade ?? state.showUpgrade;
  let text = resolveCardBaseDescription(card, useUpgrade);
  text = normalizeDescriptionSpacing(text);
  text = fillNumericTokens(text, card, useUpgrade);
  text = fillSts2DynamicTokens(text, card, useUpgrade);
  text = finalizeFilledTokenSpacing(text);
  text = preserveLegacyColorMarkers(text);
  text = escapeHtml(text).replace(/\\n|\r?\n|NL/g, "<br>");
  text = renderSts2Markup(text, useUpgrade, card);
  text = renderEnergyToken(text, card);
  text = highlightCardReferencesNoHover(text);
  text = stripResidualStarPrefixes(text);
  text = highlightReferencedCardNamesByMetadata(text, card);
  text = highlightSocketPlaceholders(text);
  text = highlightPrefixedKeywords(text);
  text = highlightBaseKeywords(text);
  text = renderLegacyColorMarkers(text);
  text = renderNumericMarkers(text);
  text = renderBracketColorSyntax(text);
  text = attachAfterlifeHover(text);
  text = hideZhSpacesAfterFormatting(text);
  text = stripRemoveSpaceMarkers(text);
  return text;
}

function renderDescriptionForPreview(card, options = {}) {
  const useUpgrade = options.forceUpgrade ?? state.showUpgrade;
  let text = resolveCardBaseDescription(card, useUpgrade);
  if (options.descriptionSuffix) {
    text = text + options.descriptionSuffix;
  }
  text = normalizeDescriptionSpacing(text);
  text = fillNumericTokens(text, card, useUpgrade);
  text = fillSts2DynamicTokens(text, card, useUpgrade);
  text = finalizeFilledTokenSpacing(text);
  text = preserveLegacyColorMarkers(text);
  text = escapeHtml(text).replace(/\\n|\r?\n|NL/g, "<br>");
  text = renderSts2Markup(text, useUpgrade, card);
  text = renderEnergyToken(text, card);
  text = highlightCardReferencesNoHover(text);
  text = stripResidualStarPrefixes(text);
  text = highlightReferencedCardNamesByMetadata(text, card);
  text = highlightSocketPlaceholders(text);
  // Keep preview non-interactive but preserve visual keyword formatting.
  text = highlightPrefixedKeywords(text);
  text = highlightBaseKeywords(text);
  text = renderLegacyColorMarkers(text);
  text = renderNumericMarkers(text);
  text = renderBracketColorSyntax(text);
  text = attachAfterlifeHover(text);
  text = hideZhSpacesAfterFormatting(text);
  text = stripRemoveSpaceMarkers(text);
  return text;
}

function buildCardInnerHtml(card, descriptionHtml, options = {}) {
  const useUpgrade = options.forceUpgrade ?? state.showUpgrade;
  const baseName = card.name[state.lang] || card.id;
  const shouldShowPlus = useUpgrade && hasCardUpgradeableVariant(card);
  const name = shouldShowPlus ? `${baseName}+` : baseName;
  const cardId = escapeHtml(card.id || "");
  const cost = formatCost(getDisplayCost(card, useUpgrade));
  const costClass = isCostUpgraded(card, useUpgrade) ? "card-cost-value upgraded" : "card-cost-value";
  const energyIcon = card.color === "AUTOMATON" ? "assets/card-ui/energy-automaton.png" : card.energyIcon;
  const costIcon = energyIcon
    ? `<img class="card-cost-icon" src="${energyIcon}" alt="cost orb" loading="lazy">`
    : `<span class="card-cost-fallback-orb" aria-hidden="true"></span>`;
  const cardHeadingHtml = `
    <div class="card-face-title">
      <h3>${name}</h3>
      <div class="card-id">${cardId}</div>
    </div>
    <div class="card-face-cost" title="${i18n("costLabel")}">
      ${costIcon}
      <span class="${costClass}">${cost}</span>
    </div>`;
  const img = card.img
    ? `<div class="card-visual card-visual-${String(card.type || "skill").toLowerCase()}">
        <img class="card-portrait" src="${card.img}" alt="${name}" loading="lazy">
        <span class="card-portrait-border" aria-hidden="true"></span>
        <span class="card-frame" aria-hidden="true"></span>
        <span class="card-banner" aria-hidden="true"></span>
        ${cardHeadingHtml}
        <span class="card-face-type">${localizeType(card.type)}</span>
      </div>`
    : `<div class="card-visual card-visual-missing"><div class="placeholder"></div></div>`;
  const typeTagHtml = card.type
    ? `<span class="${getTypeTagClass(card.type)}"><span class="tag-label">${localizeType(card.type)}</span></span>`
    : "";
  const colorTagStyleVars = [];
  if (card.colorPillBg) colorTagStyleVars.push(`--pill-bg:${card.colorPillBg}`);
  if (card.colorPillFg) colorTagStyleVars.push(`--pill-fg:${card.colorPillFg}`);
  const colorTagStyle = colorTagStyleVars.length ? ` style="${colorTagStyleVars.join(";")}"` : "";
  const dynamicValues = useUpgrade ? (card.upgradeDynamicValues || {}) : (card.dynamicValues || {});
  const gemSlots = dynamicValues.GemSlots;
  const finisherTagHtml = card.isFinisher && card.finisherLabel && card.finisherLabel[state.lang]
    ? `<span class="tag tag-feature">${escapeHtml(card.finisherLabel[state.lang])}</span>`
    : "";
  const gemSlotsTagHtml = typeof gemSlots === "number" && gemSlots > 0 && card.gemSlotLabel && card.gemSlotLabel[state.lang]
    ? `<span class="tag tag-feature">${gemSlots} ${escapeHtml(card.gemSlotLabel[state.lang])}</span>`
    : "";
  const metaTagsHtml = card.type === "CURSE"
    ? ""
    : `${card.rarity ? `<span class="${getRarityTagClass(card.rarity)}">${localizeRarity(card.rarity)}</span>` : ""}
        ${card.color ? `<span class="tag tag-color"${colorTagStyle}>${localizeColor(card)}</span>` : ""}
        ${finisherTagHtml}
        ${gemSlotsTagHtml}`;
  const notInPoolBadge = isNotInPoolCard(card)
    ? `<span class="card-flag-not-in-pool">${getNotInPoolBadgeText(card)}</span>`
    : "";

  return `
    ${img}
    <div class="card-body">
      <div class="card-meta">
        ${metaTagsHtml}
      </div>
      <div class="card-desc"><div class="card-desc-content">${descriptionHtml}</div></div>
      ${notInPoolBadge}
    </div>
  `;
}

function buildCardElement(card, suppressAnimation = false, previewMode = false, options = {}) {
  const cardEl = document.createElement("article");
  const classes = ["card"];
  if (suppressAnimation) classes.push("no-enter");
  if (previewMode) classes.push("mini-cloned-card");
  if (card.deprecated) classes.push("card-deprecated");
  if (card.rarity === "ANCIENT" && card.img) classes.push("card-ancient");
  if (card.color) classes.push(`card-color-${String(card.color).toLowerCase()}`);
  if (card.rarity) classes.push(`card-rarity-${String(card.rarity).toLowerCase()}`);
  cardEl.className = classes.join(" ");
  const rarityKey = { BASIC: "common", COMMON: "common", TOKEN: "common", UNCOMMON: "uncommon", RARE: "rare", CURSE: "curse", STATUS: "status", QUEST: "quest", EVENT: "event", ANCIENT: "ancient" }[card.rarity] || "common";
  const borderType = card.type === "ATTACK" ? "attack" : card.type === "POWER" ? "power" : "skill";
  cardEl.style.setProperty("--rarity-banner-image", `url("assets/card-ui/rarity/${rarityKey}-banner.png")`);
  cardEl.style.setProperty("--rarity-plaque-image", `url("assets/card-ui/rarity/${rarityKey}-type-plaque.png")`);
  cardEl.style.setProperty("--rarity-portrait-border-image", `url("assets/card-ui/rarity/${rarityKey}-portrait-border-${borderType}.png")`);
  const frameByRarity = {
    UNCOMMON: "rgba(108, 176, 232, 0.32)",
    RARE: "rgba(220, 178, 67, 0.36)",
  };
  const glowByRarity = {
    UNCOMMON: "rgba(108, 176, 232, 0.32)",
    RARE: "rgba(220, 178, 67, 0.34)",
  };
  const rarityFrame = frameByRarity[card.rarity];
  const rarityGlow = glowByRarity[card.rarity];
  if (rarityFrame) {
    cardEl.style.setProperty("--rarity-frame", rarityFrame);
  }
  if (rarityGlow) {
    cardEl.style.setProperty("--rarity-glow", rarityGlow);
  }
  cardEl.dataset.cardId = card.id;
  cardEl.dataset.renderLang = state.lang;
  if (card.rarity === "ANCIENT" && card.img) {
    cardEl.style.setProperty("--ancient-card-art", `url("${card.img}")`);
  }
  const desc = previewMode ? renderDescriptionForPreview(card, options) : renderDescription(card, options);
  cardEl.innerHTML = buildCardInnerHtml(card, desc, options);
  return cardEl;
}

function fitGameCardText(cardEl) {
  if (!cardEl || !cardEl.matches("[data-card-id]")) return;
  const fit = (selector, minimum, axis, step = 0.5) => {
    const node = cardEl.querySelector(selector);
    if (!node) return;
    node.style.fontSize = "";
    let size = parseFloat(getComputedStyle(node).fontSize);
    if (!Number.isFinite(size)) return;
    const overflows = () => axis === "width"
      ? node.scrollWidth > node.clientWidth + 1
      : node.scrollHeight > node.clientHeight + 3;
    while (overflows() && size > minimum) {
      size = Math.max(minimum, size - step);
      node.style.fontSize = `${size}px`;
    }
  };
  const run = () => {
    fit(".card-face-title h3", 16, "width");
    fit(".card-face-type", 10, "width");
    fit(".card-face-cost .card-cost-value", 22, "width");
    fit(".card-desc", 12, "height");
  };
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(run);
  } else {
    requestAnimationFrame(run);
  }
}

function getDisplayCost(card, useUpgrade = state.showUpgrade) {
  if (!useUpgrade) return card.cost;
  if (typeof card.upgradeCost === "number") return card.upgradeCost;
  return card.cost;
}

function isCostUpgraded(card, useUpgrade = state.showUpgrade) {
  if (!useUpgrade) return false;
  if (typeof card.cost !== "number" || typeof card.upgradeCost !== "number") return false;
  return card.cost !== card.upgradeCost;
}

function buildOptions() {
  const anyLabel = i18n("any");
  const typeOptions = [{ value: "", label: anyLabel }];
  const costOptions = [
    { value: "", label: anyLabel },
    { value: "0", label: "0" },
    { value: "1", label: "1" },
    { value: "2", label: "2" },
    { value: "3", label: "3" },
    { value: "4", label: "4" },
    { value: "5", label: "5" },
    { value: "6+", label: "6+" },
    { value: "X", label: "X" },
    { value: "UNPLAYABLE", label: i18n("unplayable") },
  ];

  const rarityOptions = [{ value: "", label: anyLabel }];
  const colorOptions = [{ value: "", label: anyLabel }];
  const deprecatedOptions = [
    { value: "", label: anyLabel },
    { value: "ONLY", label: i18n("deprecatedOnly") },
    { value: "EXCLUDE", label: i18n("deprecatedExclude") },
  ];

  const types = new Set();
  const rarities = new Set();
  const colors = new Set();
  state.data.cards.forEach((card) => {
    if (card.type) types.add(card.type);
    if (card.rarity) rarities.add(card.rarity);
    if (card.color) colors.add(card.color);
  });

  [...types]
    .sort((a, b) => localizeType(a).localeCompare(localizeType(b), state.lang === "zh" ? "zh" : "en"))
    .forEach((type) => typeOptions.push({ value: type, label: localizeType(type) }));
  [...rarities]
    .sort((a, b) => localizeRarity(a).localeCompare(localizeRarity(b), state.lang === "zh" ? "zh" : "en"))
    .forEach((rarity) => rarityOptions.push({ value: rarity, label: localizeRarity(rarity) }));
  const colorLabelMap = new Map();
  state.data.cards.forEach((card) => {
    if (card.color && !colorLabelMap.has(card.color)) {
      colorLabelMap.set(card.color, localizeColor(card));
    }
  });

  [...colors]
    .sort((a, b) => (colorLabelMap.get(a) || a).localeCompare(colorLabelMap.get(b) || b, state.lang === "zh" ? "zh" : "en"))
    .forEach((color) => colorOptions.push({ value: color, label: colorLabelMap.get(color) || color }));

  buildSelect(elements.typeFilter, typeOptions);
  buildSelect(elements.costFilter, costOptions);
  buildSelect(elements.rarityFilter, rarityOptions);
  buildSelect(elements.colorFilter, colorOptions);
  buildSelect(elements.deprecatedFilter, deprecatedOptions);
  buildSelect(elements.sortBy, [
    { value: "", label: i18n("sortDefault") },
    { value: "type", label: i18n("sortFieldType") },
    { value: "cost", label: i18n("sortFieldCost") },
    { value: "rarity", label: i18n("sortFieldRarity") },
    { value: "color", label: i18n("sortFieldColor") },
  ]);
  buildSelect(elements.sortDir, [
    { value: "asc", label: i18n("sortDirAsc") },
    { value: "desc", label: i18n("sortDirDesc") },
  ]);
  buildSelect(elements.pageSize, [
    { value: "12", label: "12" },
    { value: "24", label: "24" },
    { value: "48", label: "48" },
    { value: "96", label: "96" },
  ]);

  elements.typeFilter.value = state.filters.type;
  elements.costFilter.value = state.filters.cost;
  elements.rarityFilter.value = state.filters.rarity;
  elements.colorFilter.value = state.filters.color;
  elements.deprecatedFilter.value = state.filters.deprecated;
  elements.sortBy.value = state.sort.by;
  elements.sortDir.value = state.sort.dir;
  elements.pageSize.value = String(state.pageSize);

  // Normalize invalid URL/restored values against actual option lists.
  state.filters.type = elements.typeFilter.value;
  state.filters.cost = elements.costFilter.value;
  state.filters.rarity = elements.rarityFilter.value;
  state.filters.color = elements.colorFilter.value;
  state.filters.deprecated = elements.deprecatedFilter.value;
  state.sort.by = elements.sortBy.value;
  state.sort.dir = elements.sortDir.value || "asc";
  state.pageSize = Number(elements.pageSize.value) || 24;
}

function readStateFromUrl() {
  const params = new URLSearchParams(window.location.search || "");
  const lang = params.get("lang");
  const upgraded = params.get("upgraded");
  const q = params.get("q");
  const type = params.get("type");
  const cost = params.get("cost");
  const rarity = params.get("rarity");
  const color = params.get("color");
  const deprecated = params.get("deprecated");
  const sortBy = params.get("sortBy");
  const sortDir = params.get("sortDir");
  const size = params.get("size");
  const page = params.get("page");
  const translatorMode = params.get("translator_mode");

  if (lang === "zh" || lang === "en") {
    state.lang = lang;
  }
  if (upgraded !== null) {
    state.showUpgrade = upgraded === "1" || upgraded === "true";
  }
  if (translatorMode !== null) {
    const normalized = String(translatorMode).toLowerCase();
    state.translatorMode = normalized === "1" || normalized === "true" || normalized === "yes";
  }

  state.search = (q || "").trim();
  state.filters.type = (type || "").trim();
  state.filters.cost = (cost || "").trim();
  state.filters.rarity = (rarity || "").trim();
  state.filters.color = (color || "").trim();
  state.filters.deprecated = (deprecated || "").trim();
  state.sort.by = (sortBy || "").trim();
  state.sort.dir = sortDir === "desc" ? "desc" : "asc";

  const parsedSize = Number(size);
  state.pageSize = Number.isFinite(parsedSize) && parsedSize > 0 ? parsedSize : state.pageSize;

  const parsedPage = Number(page);
  state.page = Number.isFinite(parsedPage) && parsedPage > 0 ? parsedPage : 1;
}

function syncControlsFromState() {
  elements.searchInput.value = state.search;
  updateInlineClearVisibility();
  elements.upgradeToggle.classList.toggle("active", state.showUpgrade);
}

function writeStateToUrl() {
  const params = new URLSearchParams();

  if (state.lang !== "en") params.set("lang", state.lang);
  if (state.showUpgrade) params.set("upgraded", "1");
  if (state.search) params.set("q", state.search);
  if (state.filters.type) params.set("type", state.filters.type);
  if (state.filters.cost) params.set("cost", state.filters.cost);
  if (state.filters.rarity) params.set("rarity", state.filters.rarity);
  if (state.filters.color) params.set("color", state.filters.color);
  if (state.filters.deprecated) params.set("deprecated", state.filters.deprecated);
  if (state.sort.by) params.set("sortBy", state.sort.by);
  if (state.sort.dir === "desc") params.set("sortDir", "desc");
  if (state.translatorMode) params.set("translator_mode", "1");
  if (state.pageSize !== 24) params.set("size", String(state.pageSize));
  if (state.page > 1) params.set("page", String(state.page));

  const query = params.toString();
  const nextUrl = query ? `${window.location.pathname}?${query}` : window.location.pathname;
  const currentUrl = `${window.location.pathname}${window.location.search}`;
  if (nextUrl !== currentUrl) {
    window.history.replaceState(null, "", nextUrl);
  }
  updateTranslatorEntryLink();
  updateCrossPageLinks();
}

function updateSummary(shown, total) {
  elements.summary.textContent = i18n("summary")(shown, total);
}

function updatePagination(totalPages) {
  elements.pageInfo.textContent = `${state.page} / ${totalPages || 1}`;
  elements.prevPage.disabled = state.page <= 1;
  elements.nextPage.disabled = state.page >= totalPages;
}

function buildCardElementInLang(card, lang, suppressAnimation = false, previewMode = false, options = {}) {
  const prevLang = state.lang;
  state.lang = lang;
  try {
    const el = buildCardElement(card, suppressAnimation, previewMode, options);
    el.dataset.renderLang = lang;
    return el;
  } finally {
    state.lang = prevLang;
  }
}

function appendCardElements(slice, suppressAnimation) {
  if (!state.translatorMode) {
    slice.forEach((card) => {
      const cardEl = buildCardElement(card, suppressAnimation, false);
      elements.grid.appendChild(cardEl);
      fitGameCardText(cardEl);
    });
    return;
  }

  slice.forEach((card) => {
    const enEl = buildCardElementInLang(card, "en", suppressAnimation, false);
    const zhEl = buildCardElementInLang(card, "zh", suppressAnimation, false);
    elements.grid.appendChild(enEl);
    elements.grid.appendChild(zhEl);
    fitGameCardText(enEl);
    fitGameCardText(zhEl);
  });
}

function renderCards() {
  if (!state.data) return;
  hideKeywordTooltip();
  hideCardPreviewTooltip();
  const suppressAnimation = state.suppressNextCardAnimation;
  state.suppressNextCardAnimation = false;

  const filtered = state.data.cards
    .filter((card) => matchesSearch(card))
    .filter((card) => matchesFilter(card.type, state.filters.type))
    .filter((card) => matchesFilter(card.rarity, state.filters.rarity))
    .filter((card) => matchesFilter(card.color, state.filters.color))
    .filter((card) => matchesCost(card.cost))
    .filter((card) => matchesDeprecated(card))
    .sort(compareCardsBySort);

  state.filteredSorted = filtered;

  const total = filtered.length;
  const totalPages = Math.ceil(total / state.pageSize) || 1;
  if (state.page > totalPages) state.page = totalPages;

  const start = (state.page - 1) * state.pageSize;
  const slice = filtered.slice(start, start + state.pageSize);

  elements.grid.innerHTML = "";

  if (!slice.length) {
    elements.grid.innerHTML = `<div class="card">\n      <div class="card-body">${i18n("noResults")}</div>\n    </div>`;
  } else {
    appendCardElements(slice, suppressAnimation);
  }

  updateSummary(slice.length, total);
  updatePagination(totalPages);
  writeStateToUrl();
}

function renderCurrentPage() {
  if (!state.data) return;
  hideKeywordTooltip();
  hideCardPreviewTooltip();
  const suppressAnimation = state.suppressNextCardAnimation;
  state.suppressNextCardAnimation = false;

  const filtered = state.filteredSorted;
  const total = filtered.length;
  const totalPages = Math.ceil(total / state.pageSize) || 1;
  if (state.page > totalPages) state.page = totalPages;

  const start = (state.page - 1) * state.pageSize;
  const slice = filtered.slice(start, start + state.pageSize);

  elements.grid.innerHTML = "";

  if (!slice.length) {
    elements.grid.innerHTML = `<div class="card">\n      <div class="card-body">${i18n("noResults")}</div>\n    </div>`;
  } else {
    appendCardElements(slice, suppressAnimation);
  }

  updateSummary(slice.length, total);
  updatePagination(totalPages);
  writeStateToUrl();
}

function triggerSearch() {
  state.search = elements.searchInput.value.trim();
  state.page = 1;
  renderCards();
}

function bindEvents() {
  if (!state.translatorMode) {
    elements.langToggle.addEventListener("click", () => {
      state.lang = state.lang === "en" ? "zh" : "en";
      state.suppressNextCardAnimation = true;
      applyI18n();
      buildOptions();
      renderCurrentPage();
    });
  }

  elements.upgradeToggle.addEventListener("click", () => {
    state.showUpgrade = !state.showUpgrade;
    state.suppressNextCardAnimation = true;
    elements.upgradeToggle.classList.toggle("active", state.showUpgrade);
    applyI18n();
    renderCards();
  });

  elements.searchBtn.addEventListener("click", () => {
    triggerSearch();
  });

  elements.searchInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") triggerSearch();
  });

  elements.searchInput.addEventListener("input", () => {
    updateInlineClearVisibility();
  });

  elements.clearSearchInlineBtn.addEventListener("click", () => {
    elements.searchInput.value = "";
    state.search = "";
    updateInlineClearVisibility();
    state.page = 1;
    renderCards();
    elements.searchInput.focus();
  });

  elements.typeFilter.addEventListener("change", (event) => {
    state.filters.type = event.target.value;
    state.page = 1;
    renderCards();
  });

  elements.costFilter.addEventListener("change", (event) => {
    state.filters.cost = event.target.value;
    state.page = 1;
    renderCards();
  });

  elements.rarityFilter.addEventListener("change", (event) => {
    state.filters.rarity = event.target.value;
    state.page = 1;
    renderCards();
  });

  elements.colorFilter.addEventListener("change", (event) => {
    state.filters.color = event.target.value;
    state.page = 1;
    renderCards();
  });

  elements.deprecatedFilter.addEventListener("change", (event) => {
    state.filters.deprecated = event.target.value;
    state.page = 1;
    renderCards();
  });

  elements.sortBy.addEventListener("change", (event) => {
    state.sort.by = event.target.value;
    state.page = 1;
    renderCards();
  });

  elements.sortDir.addEventListener("change", (event) => {
    state.sort.dir = event.target.value === "desc" ? "desc" : "asc";
    state.page = 1;
    renderCards();
  });

  elements.pageSize.addEventListener("change", (event) => {
    state.pageSize = Number(event.target.value);
    state.page = 1;
    renderCards();
  });

  elements.prevPage.addEventListener("click", () => {
    state.page = Math.max(1, state.page - 1);
    renderCards();
  });

  elements.nextPage.addEventListener("click", () => {
    state.page += 1;
    renderCards();
  });

  bindAttachedHoverEvents();

  window.addEventListener("popstate", () => {
    readStateFromUrl();
    applyI18n();
    buildOptions();
    syncControlsFromState();
    renderCards();
  });

}

async function init() {
  const response = await fetch("data/cards.json");
  if (!response.ok) {
    elements.summary.textContent = "Missing data/cards.json. Run the pipeline first.";
    return;
  }
  state.data = await response.json();
  readStateFromUrl();
  buildKeywordZhIndex();
  buildBaseKeywordIndex();
  buildCardNameIndex();
  applyI18n();
  buildOptions();
  syncControlsFromState();
  updateTranslatorEntryLink();
  updateCrossPageLinks();
  renderCards();
  bindEvents();
}

init();
