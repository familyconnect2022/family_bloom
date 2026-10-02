const fs = require("fs");
const path = require("path");

const stripMarks = text => String(text ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
const normalize = text => stripMarks(text)
  .toLocaleLowerCase("vi-VN")
  .replace(/đ/g, "d")
  .replace(/&/g, " and ")
  .replace(/[^a-z0-9]+/g, " ")
  .trim()
  .replace(/\s+/g, " ");

const slug = text => normalize(text).replace(/\s+/g, "-").slice(0, 90) || "track";
const candidateId = (title, artists = []) => `${slug(title)}-${slug(artists[0] || "unknown")}`.slice(0, 120);
const candidateKey = (title, artists = []) => `${normalize(title)}|${normalize(artists[0] || "")}`;

const extractArrayLiteral = (source, variableName) => {
  const marker = new RegExp(`(?:export\\s+)?const\\s+${variableName}[^=]*=\\s*\\[`);
  const match = marker.exec(source);
  if (!match) throw new Error(`Cannot find ${variableName}`);
  const start = match.index + match[0].lastIndexOf("[");
  let depth = 0;
  let quote = null;
  let escaped = false;
  for (let i = start; i < source.length; i += 1) {
    const ch = source[i];
    if (quote) {
      if (escaped) escaped = false;
      else if (ch === "\\") escaped = true;
      else if (ch === quote) quote = null;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === "`") { quote = ch; continue; }
    if (ch === "[") depth += 1;
    else if (ch === "]") {
      depth -= 1;
      if (depth === 0) return source.slice(start, i + 1);
    }
  }
  throw new Error(`Unclosed array for ${variableName}`);
};

const evalArrayLiteral = literal => Function(`"use strict"; return (${literal});`)();
const readArrayFromTs = (file, variableName) => evalArrayLiteral(extractArrayLiteral(fs.readFileSync(file, "utf8"), variableName));

const loadCatalog = root => {
  const base = readArrayFromTs(path.join(root, "src/data/vietnameseMusicCatalogV1.ts"), "VIETNAMESE_MUSIC_SEEDS");
  const additions = readArrayFromTs(path.join(root, "src/data/vietnameseMusicCatalogAdditions.generated.ts"), "VERIFIED_VIETNAMESE_MUSIC_ADDITIONS");
  const review = readArrayFromTs(path.join(root, "src/data/vietnameseMusicCatalogAdditions.generated.ts"), "VIETNAMESE_MUSIC_REVIEW_QUEUE");
  const byId = new Map();
  for (const seed of [...base, ...additions]) byId.set(seed.id, seed);
  return { base, additions, review, verified: [...byId.values()] };
};

const VI_MARK_RE = /[ăâêôơưđĂÂÊÔƠƯĐ]|[àáảãạằắẳẵặầấẩẫậèéẻẽẹềếểễệìíỉĩịòóỏõọồốổỗộờớởỡợùúủũụừứửữựỳýỷỹỵ]/;
const VI_WORD_RE = /\b(anh|em|nguoi|người|tinh|tình|yeu|yêu|khong|không|cho|chờ|mot|một|noi|nơi|ngay|ngày|gio|giờ|roi|rồi|co|có|khi|dung|đừng|thuong|thương|nho|nhớ|hoa|hóa|mua|mưa|doi|đời|tim|tìm|ben|bên|vui|buon|buồn)\b/i;
const hasStrongVietnameseTitleSignal = title => VI_MARK_RE.test(String(title || "")) || VI_WORD_RE.test(String(title || ""));

const htmlDecode = text => String(text || "")
  .replace(/&nbsp;/gi, " ")
  .replace(/&amp;/gi, "&")
  .replace(/&quot;/gi, '"')
  .replace(/&#39;|&apos;/gi, "'")
  .replace(/&lt;/gi, "<")
  .replace(/&gt;/gi, ">");

const htmlToTokens = html => htmlDecode(String(html || "")
  .replace(/<script[\s\S]*?<\/script>/gi, "\n")
  .replace(/<style[\s\S]*?<\/style>/gi, "\n")
  .replace(/<!--([\s\S]*?)-->/g, "\n")
  .replace(/<[^>]+>/g, "\n"))
  .split(/\r?\n/)
  .map(item => item.replace(/\s+/g, " ").trim())
  .filter(Boolean)
  .filter(item => !/^image$/i.test(item));

const isPublisher = token => /\b(SONY MUSIC|WARNER|UNIVERSAL|BELIEVE|INGROOVES|ORCHARD|LOOPS MUSIC|VIVI ENM|YIN YANG|DAO|MUSIC GROUP|ENTERTAINMENT|RECORDS?|MEDIA)\b/i.test(token);
const isDuration = token => /^\d{1,2}:\d{2}$/.test(token);
const isNoise = token => /^(Play|Download|Shuffle play|Show more|More|Choose a song to play|#|Title Uploader Artist)$/i.test(token) || isDuration(token);
const isRank = (token, max = 100) => /^\d{1,3}$/.test(token) && Number(token) >= 1 && Number(token) <= max;

const sectionRange = (tokens, startLabel, endLabels = []) => {
  const start = tokens.findIndex(token => token.toLocaleLowerCase("vi-VN") === startLabel.toLocaleLowerCase("vi-VN"));
  if (start < 0) return [];
  let end = tokens.length;
  for (let i = start + 1; i < tokens.length; i += 1) {
    if (endLabels.some(label => tokens[i].toLocaleLowerCase("vi-VN") === label.toLocaleLowerCase("vi-VN"))) { end = i; break; }
  }
  return tokens.slice(start + 1, end);
};

const extractRankedSection = (tokens, startLabel, endLabels, maxCount = 50) => {
  const section = sectionRange(tokens, startLabel, endLabels);
  const rows = [];
  for (let i = 0; i < section.length; i += 1) {
    if (!isRank(section[i], maxCount)) continue;
    const rank = Number(section[i]);
    let j = i + 1;
    while (j < section.length && isNoise(section[j])) j += 1;
    const title = section[j];
    if (!title || isRank(title, maxCount) || isPublisher(title)) continue;
    j += 1;
    const artists = [];
    while (j < section.length && !isRank(section[j], maxCount)) {
      const token = section[j];
      if (isPublisher(token)) { j += 1; break; }
      if (!isNoise(token) && token !== "," && token !== title) artists.push(token);
      j += 1;
    }
    if (title && artists.length) rows.push({ rank, title, artists: Array.from(new Set(artists)).slice(0, 8) });
    i = Math.max(i, j - 1);
  }
  return rows;
};

const extractPublisherTerminatedSection = (tokens, startLabel, endLabels, maxCount = 30) => {
  const section = sectionRange(tokens, startLabel, endLabels);
  const rows = [];
  let buffer = [];
  for (const token of section) {
    if (isNoise(token) || token === ",") continue;
    if (isPublisher(token)) {
      if (buffer.length >= 2) {
        const [title, ...artists] = buffer;
        rows.push({ rank: rows.length + 1, title, artists: Array.from(new Set(artists)).slice(0, 8) });
        if (rows.length >= maxCount) break;
      }
      buffer = [];
      continue;
    }
    buffer.push(token);
    if (buffer.length > 12) buffer = buffer.slice(-12);
  }
  return rows;
};

module.exports = {
  normalize,
  slug,
  candidateId,
  candidateKey,
  readArrayFromTs,
  loadCatalog,
  hasStrongVietnameseTitleSignal,
  htmlToTokens,
  extractRankedSection,
  extractPublisherTerminatedSection,
};
