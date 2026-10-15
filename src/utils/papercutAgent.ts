/**
 * 细纹刻纸图生图智能体（内置豆包 Seedream 大模型）
 *
 * 唯一职责：接收用户上传的手绘草图 / 照片 / 简笔画，
 * 调用火山方舟 Seedream 图生图接口，直接产出红色乐清细纹刻纸成品稿。
 */

import { getUserId } from './userIdentity';

const ARK_ENDPOINT = 'https://ark.cn-beijing.volces.com/api/v3/images/generations';
const DEFAULT_MODEL = 'doubao-seedream-4-0-250828';

/** 智能体设置按匿名用户隔离存储（保留旧版全局键作为读取兜底） */
const LEGACY_KEY_KEY = 'pc_ark_api_key';
const LEGACY_KEY_MODEL = 'pc_ark_model';
const userKey = (suffix: string) => `papercut:${getUserId()}:${suffix}`;

/* ------------------------------------------------------------------ */
/* 刻纸提示词体系：5 类正向模板 + 1 套负向约束（固化，用户无需描述） */
/* ------------------------------------------------------------------ */

export type PapercutCategory = 'general' | 'flower' | 'leaf' | 'animal' | 'dragon';

export const PAPERCUT_CATEGORIES: { id: PapercutCategory; label: string; hint: string }[] = [
  { id: 'general', label: '通用', hint: '不限题材，自动取舍构图' },
  { id: 'flower', label: '花卉', hint: '花朵、花瓣、枝叶类' },
  { id: 'leaf', label: '叶片', hint: '叶片、叶脉、叶缘类' },
  { id: 'animal', label: '动物', hint: '鸟兽、鱼虫、人物类' },
  { id: 'dragon', label: '祥龙纹样', hint: '龙纹、祥云等传统纹样' },
];

/** A. 通用红色细纹刻纸成品稿 */
const POSITIVE_PROMPTS: Record<PapercutCategory, string> = {
  general:
    '红色乐清细纹刻纸成品稿，传统中国红或朱砂红单色效果，浅色宣纸底，镂空区域呈纸底留白质感，' +
    '以刀代笔，线条细如发丝，衔接自然无断痕，刻工精细，线条纤巧，疏密有致，刀法严谨，轮廓清晰，' +
    '镂空分区合理，大面积留白，层次分明，圆如秋月，尖如麦芒，方如青砖，缺如锯齿，细如胡须，' +
    '具有手工刀刻质感，整体精致典雅。',

  // B. 花卉类专用
  flower:
    '将参考花卉转换为红色乐清细纹刻纸成品稿，保留花朵主体轮廓、花瓣层次、叶片和枝干结构。' +
    '传统中国红单色效果，浅色宣纸底，镂空区域呈纸底留白质感。花瓣边缘圆润流畅，脉络纤细清晰，' +
    '内层纹理较密，外层留白增多，花瓣之间以极细白线或浅色纸底分隔，避免粘连。' +
    '线条细如发丝，衔接自然无断痕，疏密有致，具有手工刀刻质感。',

  // C. 叶片类专用
  leaf:
    '将参考叶片转换为红色乐清细纹刻纸成品稿，保留叶片外形、裂片、叶缘和叶脉结构。' +
    '传统中国红单色效果，浅色宣纸底，镂空区域呈纸底留白质感。主脉较粗，侧脉清晰，细脉细密但不凌乱，' +
    '叶缘锯齿均匀，叶肉区域保留大面积留白。线条细如发丝，衔接自然无断痕，刀法严谨，轮廓清楚。',

  // D. 动物类专用
  animal:
    '将参考动物转换为红色乐清细纹刻纸成品稿，保留动物主体轮廓、姿态和比例。' +
    '传统中国红单色效果，浅色宣纸底，镂空区域呈纸底留白质感。羽毛或毛发采用分区细密线条，' +
    '主体结构转折处纹理较密，外围区域适度留白；轮廓线条刚柔并济，细节精致但不碎乱。' +
    '线条细如发丝，衔接自然无断痕，具有手工刀刻质感。',

  // E. 祥龙 / 传统纹样专用
  dragon:
    '将参考龙纹或传统纹样转换为红色乐清细纹刻纸成品稿，保留主体走势、鳞片、龙须、龙爪和云纹结构。' +
    '传统中国红单色效果，浅色宣纸底，镂空区域呈纸底留白质感。鳞片细密整齐，龙须飘逸流畅，' +
    '龙爪刚劲有力，背景云纹疏朗，整体形成中心密、四周疏的节奏。线条细如发丝，衔接自然无断痕，' +
    '层次清晰，具有手工刀刻质感。',
};

/** 负向 Prompt：Seedream 4.0 无独立负向字段，统一以自然语言拼入 prompt 尾部 */
const NEGATIVE_PROMPT =
  '画面中必须避免出现：白底黑线，黑色线稿，灰度图，彩色渐变，多色效果，阴影，照片质感，' +
  '3D渲染，水彩，油画，手绘笔触，模糊，断线，碎线，杂乱线条，大面积黑色块，脏污纹理，' +
  '纸张纤维纹理过重，光影效果，立体浮雕，金属质感，塑料质感，水印，无关文字，' +
  '主体变形，主体丢失，结构错乱。';

/** 参考强度说明：Seedream 4.0 无独立参考强度字段（推荐 0.65-0.75），通过"保留主体结构"类提示词表达 */
export function buildPapercutPrompt(category: PapercutCategory = 'general'): string {
  return `${POSITIVE_PROMPTS[category] || POSITIVE_PROMPTS.general}${NEGATIVE_PROMPT}`;
}

export interface AgentSettings {
  apiKey: string;
  model: string;
}

export function getAgentSettings(): AgentSettings {
  let apiKey = '';
  let model = '';
  try {
    apiKey =
      localStorage.getItem(userKey('ark_api_key')) ||
      localStorage.getItem(LEGACY_KEY_KEY) ||
      '';
    model =
      localStorage.getItem(userKey('ark_model')) ||
      localStorage.getItem(LEGACY_KEY_MODEL) ||
      '';
  } catch {
    /* 隐私模式下忽略 */
  }
  const env = (import.meta as unknown as { env?: Record<string, string> }).env;
  return {
    apiKey: apiKey || env?.VITE_ARK_API_KEY || '',
    model: model || env?.VITE_ARK_MODEL || DEFAULT_MODEL,
  };
}

export function saveAgentSettings(settings: AgentSettings) {
  try {
    localStorage.setItem(userKey('ark_api_key'), settings.apiKey.trim());
    localStorage.setItem(userKey('ark_model'), settings.model.trim() || DEFAULT_MODEL);
  } catch {
    /* ignore */
  }
}

export interface ComplexityResult {
  /** 边缘密集度 0~1，越大越复杂细碎 */
  score: number;
  /** 是否复杂到建议先简化轮廓（对应智能体工艺原则第 5 条） */
  tooComplex: boolean;
}

/**
 * 参考图复杂度预检：缩至 256px 灰度 → Sobel 边缘密集度。
 * 过于细碎的图不利于细纹刻制，需先提醒用户简化轮廓。
 */
export async function analyzeImageComplexity(dataUrl: string): Promise<ComplexityResult> {
  const img = await loadHtmlImage(dataUrl);
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(img, 0, 0, size, size);

  // 与本地刻纸管线一致：Sobel 前先做 0.7px 高斯降噪，避免纸纹 / 颗粒被计入边缘比例
  const filterSupported =
    typeof (ctx as CanvasRenderingContext2D & { filter?: string }).filter === 'string';
  if (filterSupported) {
    const tmp = document.createElement('canvas');
    tmp.width = size;
    tmp.height = size;
    const tctx = tmp.getContext('2d')!;
    tctx.filter = 'blur(0.7px)';
    tctx.drawImage(canvas, 0, 0);
    ctx.clearRect(0, 0, size, size);
    ctx.drawImage(tmp, 0, 0);
  }
  const { data } = ctx.getImageData(0, 0, size, size);

  let gray = new Float32Array(size * size);
  for (let i = 0; i < data.length; i += 4) {
    gray[i / 4] = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
  }
  if (!filterSupported) {
    gray = separableBlur3(gray, size, size);
  }

  let edgePixels = 0;
  const threshold = 60;
  for (let y = 1; y < size - 1; y++) {
    for (let x = 1; x < size - 1; x++) {
      const i = y * size + x;
      const gx =
        -gray[i - size - 1] + gray[i - size + 1] -
        2 * gray[i - 1] + 2 * gray[i + 1] -
        gray[i + size - 1] + gray[i + size + 1];
      const gy =
        -gray[i - size - 1] - 2 * gray[i - size] - gray[i - size + 1] +
        gray[i + size - 1] + 2 * gray[i + size] + gray[i + size + 1];
      if (Math.hypot(gx, gy) > threshold) edgePixels++;
    }
  }

  const score = edgePixels / ((size - 2) * (size - 2));
  return { score, tooComplex: score > 0.2 };
}

function loadHtmlImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('参考图读取失败'));
    img.src = src;
  });
}

/** 不支持 Canvas filter 时的兜底：可分离 3-tap 高斯 [1,2,1]/4 两遍 */
function separableBlur3(src: Float32Array, width: number, height: number): Float32Array {
  const tmp = new Float32Array(width * height);
  const out = new Float32Array(width * height);
  for (let y = 0; y < height; y++) {
    const row = y * width;
    for (let x = 0; x < width; x++) {
      const p = row + x;
      const l = x > 0 ? src[p - 1] : src[p];
      const r = x < width - 1 ? src[p + 1] : src[p];
      tmp[p] = (l + 2 * src[p] + r) / 4;
    }
  }
  for (let y = 0; y < height; y++) {
    const row = y * width;
    for (let x = 0; x < width; x++) {
      const p = row + x;
      const t = y > 0 ? tmp[p - width] : tmp[p];
      const b = y < height - 1 ? tmp[p + width] : tmp[p];
      out[p] = (t + 2 * tmp[p] + b) / 4;
    }
  }
  return out;
}

/** Seedream 4.0 官方推荐的输出像素（方式 2：具体宽高） */
const OUTPUT_SIZE_PRESETS: { size: string; ratio: number }[] = [
  { size: '2048x2048', ratio: 1 },      // 1:1
  { size: '2304x1728', ratio: 4 / 3 },  // 4:3
  { size: '1728x2304', ratio: 3 / 4 },  // 3:4
  { size: '2560x1440', ratio: 16 / 9 }, // 16:9
  { size: '1440x2560', ratio: 9 / 16 }, // 9:16
  { size: '2496x1664', ratio: 3 / 2 },  // 3:2
  { size: '1664x2496', ratio: 2 / 3 },  // 2:3
  { size: '3024x1296', ratio: 21 / 9 }, // 21:9
];

/** 按参考图宽高比就近选择输出尺寸（即"1:1 或根据上传图自适应"） */
function pickOutputSize(width: number, height: number): string {
  const ratio = width / height;
  let best = OUTPUT_SIZE_PRESETS[0];
  let bestDiff = Infinity;
  for (const preset of OUTPUT_SIZE_PRESETS) {
    const diff = Math.abs(Math.log(ratio) - Math.log(preset.ratio));
    if (diff < bestDiff) {
      bestDiff = diff;
      best = preset;
    }
  }
  return best.size;
}

/** 将参考图压缩为 1024px JPEG data URI，减小请求体，同时返回压缩后尺寸 */
async function prepareReference(
  dataUrl: string
): Promise<{ dataUrl: string; width: number; height: number }> {
  const img = await loadHtmlImage(dataUrl);
  const max = 1024;
  let w = img.naturalWidth;
  let h = img.naturalHeight;
  if (Math.max(w, h) > max) {
    if (w >= h) {
      h = Math.round((h / w) * max);
      w = max;
    } else {
      w = Math.round((w / h) * max);
      h = max;
    }
  }
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  canvas.getContext('2d')!.drawImage(img, 0, 0, w, h);
  return { dataUrl: canvas.toDataURL('image/jpeg', 0.9), width: w, height: h };
}

async function urlToDataUrl(url: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`成品图下载失败（HTTP ${res.status}）`);
  const blob = await res.blob();
  return await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * 图生图：参考图 → 红色细纹刻纸成品稿
 * @param referenceDataUrl 用户上传的草图 / 照片 / 简笔画
 * @param category 题材类别（通用 / 花卉 / 叶片 / 动物 / 祥龙纹样），决定正向提示词模板
 * @returns 成品图 dataURL（可直接存入本地、绘制 Canvas，无跨域污染问题）
 */
export async function convertToPaperCut(
  referenceDataUrl: string,
  category: PapercutCategory = 'general',
  onStatus?: (message: string) => void
): Promise<string> {
  const { apiKey, model } = getAgentSettings();
  if (!apiKey) {
    throw new AgentError('未配置豆包 API Key，请先在"智能体设置"中填写火山方舟 API Key', 'NO_API_KEY');
  }

  onStatus?.('正在整理参考草图…');
  const reference = await prepareReference(referenceDataUrl);
  const outputSize = pickOutputSize(reference.width, reference.height);

  onStatus?.('智能体正在操刀刻制，请稍候（约 20-60 秒）…');
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), 180000);

  let res: Response;
  try {
    res = await fetch(ARK_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: model || DEFAULT_MODEL,
        prompt: buildPapercutPrompt(category),
        image: [reference.dataUrl],
        size: outputSize,
        sequential_image_generation: 'disabled',
        response_format: 'b64_json',
        watermark: false,
      }),
      signal: controller.signal,
    });
  } catch (err) {
    window.clearTimeout(timer);
    if ((err as Error).name === 'AbortError') {
      throw new AgentError('生成超时，请缩小图片或稍后重试', 'TIMEOUT');
    }
    throw new AgentError(
      '网络无法连接豆包服务，请检查网络（如在国内网络环境使用）',
      'NETWORK'
    );
  }
  window.clearTimeout(timer);

  const payload = await res.json().catch(() => null);

  if (!res.ok || payload?.error) {
    throw mapApiError(res.status, payload);
  }

  const item = payload?.data?.[0];
  if (item?.b64_json) {
    return `data:image/jpeg;base64,${item.b64_json}`;
  }
  if (item?.url) {
    onStatus?.('正在取回成品稿…');
    return await urlToDataUrl(item.url);
  }
  throw new AgentError('模型未返回有效图片，请重试一次', 'EMPTY_RESULT');
}

export class AgentError extends Error {
  code: string;
  constructor(message: string, code: string) {
    super(message);
    this.name = 'AgentError';
    this.code = code;
  }
}

function mapApiError(status: number, payload: { error?: { code?: string; message?: string } } | null): AgentError {
  const code = payload?.error?.code || '';
  const msg = payload?.error?.message || '';
  if (status === 401 || /authentication|api.?key/i.test(code)) {
    return new AgentError('API Key 无效或已过期，请检查后重新填写', 'AUTH');
  }
  if (status === 404 || /model|not.?found/i.test(code)) {
    return new AgentError(`模型不可用（${getAgentSettings().model}），请在设置中更换为你已开通的 Seedream 模型 ID`, 'MODEL');
  }
  if (status === 429 || /rate.?limit|quota|balance/i.test(code + msg)) {
    return new AgentError('调用额度不足或触发限流，请检查火山方舟账户余额后重试', 'QUOTA');
  }
  return new AgentError(`豆包服务返回错误（${status}）：${msg || code || '未知错误'}`, 'API');
}
