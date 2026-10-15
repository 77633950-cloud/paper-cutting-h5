/**
 * 图片处理工具函数
 * 实现刻纸风格转换效果
 */

import { fontStyles } from './patternData';

/** 按字体 id 获取 Canvas 可用的字体栈（与选择器保持一致，含缺字回退） */
function getFontStack(fontStyleId: string): string {
  return fontStyles.find((f) => f.id === fontStyleId)?.fontFamily || fontStyles[0].fontFamily;
}

/**
 * 在 Canvas 绘制前确保所选字体（含 unicode-range 分片字体）已加载完成。
 * 用祝福文字 + 常用字作为样本触发对应分片下载。
 */
export async function ensureCardFontLoaded(fontStyleId: string, text: string): Promise<void> {
  if (typeof document === 'undefined' || !('fonts' in document) || !document.fonts?.load) return;
  const stack = getFontStack(fontStyleId);
  const sample = `${text || ''}祝福您万事如意阖家幸福新年快乐恭喜发财身体健康`;
  try {
    await Promise.allSettled([
      document.fonts.load(`48px ${stack}`, sample),
      document.fonts.load(`16px ${stack}`, sample),
    ]);
    await document.fonts.ready;
  } catch {
    /* 字体加载失败时静默回退到字体栈中的系统字体 */
  }
}


export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

export function resizeImage(img: HTMLImageElement, maxSize: number = 1200): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  let { width, height } = img;
  
  if (width > maxSize || height > maxSize) {
    if (width > height) {
      height = (height / width) * maxSize;
      width = maxSize;
    } else {
      width = (width / height) * maxSize;
      height = maxSize;
    }
  }
  
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(img, 0, 0, width, height);
  return canvas;
}

export function rotateImage(canvas: HTMLCanvasElement, degrees: number): HTMLCanvasElement {
  const rotatedCanvas = document.createElement('canvas');
  const ctx = rotatedCanvas.getContext('2d')!;
  
  if (degrees === 90 || degrees === 270) {
    rotatedCanvas.width = canvas.height;
    rotatedCanvas.height = canvas.width;
  } else {
    rotatedCanvas.width = canvas.width;
    rotatedCanvas.height = canvas.height;
  }
  
  ctx.translate(rotatedCanvas.width / 2, rotatedCanvas.height / 2);
  ctx.rotate((degrees * Math.PI) / 180);
  ctx.drawImage(canvas, -canvas.width / 2, -canvas.height / 2);
  
  return rotatedCanvas;
}

/**
 * 本地细纹刻纸效果（纯前端 Canvas 像素管线，离线、零依赖、即时渲染）
 * 仅用于「上传/截图草图 → 本地刻纸效果」路径；AI 成品与预设高清刻纸图不进入本管线。
 * 工艺标准：线条细、断痕少、色块净、疏密匀
 * 1. 灰度化（心理学亮度公式）
 * 2. 0.7px 高斯模糊：压制笔触颗粒 / 纸纹等高频噪点
 * 3. Sobel 梯度 → 非极大值抑制（1px 细线化，模拟刀锋）
 *    → 空间加权双阈值边缘连接（中心密四周疏，孤立弱噪点过滤）
 *    → 形态学闭运算（3×3 膨胀+腐蚀，连接微小断线）
 *    → 连通域小岛过滤（剔除闭运算后仍孤立的强噪点碎块）
 * 4. 红白二元着色（无灰度过渡；强边缘主刀痕加深加粗）
 *    + 极淡确定性宣纸肌理（仅米白区域，透明度 ≤ 0.02）
 */
function applyPaperCutEffect(
  canvas: HTMLCanvasElement,
  colorTheme: 'red' | 'gold' = 'red'
): HTMLCanvasElement {
  const ctx = canvas.getContext('2d')!;
  const width = canvas.width;
  const height = canvas.height;
  const total = width * height;

  // 色板：线条=暗酒红（金色主题保留古金），非线条=暖米白宣纸底
  const line = colorTheme === 'gold' ? [176, 141, 78] : [122, 28, 32];
  // 主刀痕色：在线条色基础上偏暗约 10%
  const strongLine = line.map((v) => Math.round(v * 0.9));
  const paper = [246, 239, 225];
  // 宣纸肌理的深米色偏移目标
  const paperTint = [214, 192, 158];

  const imageData = ctx.getImageData(0, 0, width, height);
  const out = imageData.data;

  // 1. 灰度化
  const gray = new Float32Array(total);
  for (let p = 0, i = 0; p < total; p++, i += 4) {
    const g = out[i] * 0.299 + out[i + 1] * 0.587 + out[i + 2] * 0.114;
    gray[p] = g;
    out[i] = out[i + 1] = out[i + 2] = g;
  }

  // 2. 0.7px 高斯模糊降噪（Canvas 原生 filter，不支持时退化为 JS 3-tap 高斯）
  const smooth = blurGray(ctx, imageData, gray, width, height, 0.7);

  // 3. Sobel 梯度
  const gxArr = new Float32Array(total);
  const gyArr = new Float32Array(total);
  const mag = new Float32Array(total);
  for (let y = 1; y < height - 1; y++) {
    const row = y * width;
    for (let x = 1; x < width - 1; x++) {
      const p = row + x;
      const tl = smooth[p - width - 1];
      const tc = smooth[p - width];
      const tr = smooth[p - width + 1];
      const ml = smooth[p - 1];
      const mr = smooth[p + 1];
      const bl = smooth[p + width - 1];
      const bc = smooth[p + width];
      const br = smooth[p + width + 1];
      const gx = -tl + tr - 2 * ml + 2 * mr - bl + br;
      const gy = -tl - 2 * tc - tr + bl + 2 * bc + br;
      gxArr[p] = gx;
      gyArr[p] = gy;
      mag[p] = Math.sqrt(gx * gx + gy * gy);
    }
  }

  // 4. 非极大值抑制（插值版）：粗边缘细化至 1px，模拟刻纸刀锋
  const nms = new Float32Array(total);
  for (let y = 1; y < height - 1; y++) {
    const row = y * width;
    for (let x = 1; x < width - 1; x++) {
      const p = row + x;
      const m = mag[p];
      if (m === 0) continue;
      const gx = gxArr[p];
      const gy = gyArr[p];
      let ahead: number;
      let behind: number;
      if (Math.abs(gx) >= Math.abs(gy)) {
        const k = Math.abs(gy) / (Math.abs(gx) || 1);
        const sx = gx >= 0 ? 1 : -1;
        const sy = gy >= 0 ? 1 : -1;
        ahead = (1 - k) * mag[p + sx] + k * mag[p + sx + sy * width];
        behind = (1 - k) * mag[p - sx] + k * mag[p - sx - sy * width];
      } else {
        const k = Math.abs(gx) / (Math.abs(gy) || 1);
        const sx = gx >= 0 ? 1 : -1;
        const sy = gy >= 0 ? 1 : -1;
        ahead = (1 - k) * mag[p + sy * width] + k * mag[p + sy * width + sx];
        behind = (1 - k) * mag[p - sy * width] + k * mag[p - sy * width - sx];
      }
      if (m >= ahead && m >= behind) nms[p] = m;
    }
  }

  // 5. 空间加权双阈值：中心降阈值保留细纹，外围升阈值过滤碎线（中心密、四周疏）
  //   高阈值 40 主轮廓；低阈值 15 弱边缘仅在与强边缘 8 连通时保留
  const HIGH = 40;
  const LOW = 15;
  const cx = width / 2;
  const cy = height / 2;
  const maxRadius = Math.sqrt(cx * cx + cy * cy);
  // label: 0 背景 / 1 弱边缘 / 2 强边缘（含后续连接提升的弱边缘）
  const label = new Uint8Array(total);
  const origStrong = new Uint8Array(total);
  for (let y = 0; y < height; y++) {
    const row = y * width;
    for (let x = 0; x < width; x++) {
      const p = row + x;
      if (nms[p] === 0) continue;
      const r = Math.sqrt((x - cx) * (x - cx) + (y - cy) * (y - cy)) / maxRadius;
      const factor = 0.8 + 0.5 * r; // 中心 0.8 → 对角 1.3
      if (nms[p] >= HIGH * factor) {
        label[p] = 2;
        origStrong[p] = 1;
      } else if (nms[p] >= LOW * factor) {
        label[p] = 1;
      }
    }
  }

  // 双阈值滞后连接：从强边缘出发，8 连通的弱边缘提升为边缘，孤立弱噪点丢弃
  const stack = new Int32Array(total);
  let sp = 0;
  for (let p = 0; p < total; p++) {
    if (label[p] === 2) stack[sp++] = p;
  }
  while (sp > 0) {
    const p = stack[--sp];
    const px = p % width;
    const py = (p / width) | 0;
    const y0 = py > 0 ? py - 1 : 0;
    const y1 = py < height - 1 ? py + 1 : height - 1;
    const x0 = px > 0 ? px - 1 : 0;
    const x1 = px < width - 1 ? px + 1 : width - 1;
    for (let ny = y0; ny <= y1; ny++) {
      for (let nx = x0; nx <= x1; nx++) {
        const q = ny * width + nx;
        if (label[q] === 1) {
          label[q] = 2;
          stack[sp++] = q;
        }
      }
    }
  }

  // 6. 形态学闭运算（3×3 全结构元：先膨胀后腐蚀），连接微小断线
  const dilated = new Uint8Array(total);
  morph(label, dilated, width, height, (v) => v > 0, true);
  const closed = new Uint8Array(total);
  morph(dilated, closed, width, height, (v) => v === 1, false);

  // 6.5 连通域小岛过滤：闭运算后仍孤立的碎点 / 短划（强阈值噪点残留）按面积剔除。
  //     细纹刀路均为与主体相连的长线，600px 下 <20px 的孤立块不承载有效图案。
  const MIN_ISLAND = 20;
  const compLabel = new Int32Array(total);
  const compSize: number[] = [0];
  const compStack = new Int32Array(total);
  for (let s = 0; s < total; s++) {
    if (!closed[s] || compLabel[s] !== 0) continue;
    const id = compSize.length;
    compSize.push(0);
    let cp = 0;
    compStack[cp++] = s;
    compLabel[s] = id;
    while (cp > 0) {
      const p = compStack[--cp];
      compSize[id]++;
      const px = p % width;
      const py = (p / width) | 0;
      const y0 = py > 0 ? py - 1 : 0;
      const y1 = py < height - 1 ? py + 1 : height - 1;
      const x0 = px > 0 ? px - 1 : 0;
      const x1 = px < width - 1 ? px + 1 : width - 1;
      for (let ny = y0; ny <= y1; ny++) {
        for (let nx = x0; nx <= x1; nx++) {
          const q = ny * width + nx;
          if (closed[q] && compLabel[q] === 0) {
            compLabel[q] = id;
            compStack[cp++] = q;
          }
        }
      }
    }
  }
  for (let p = 0; p < total; p++) {
    const id = compLabel[p];
    if (id !== 0 && compSize[id] < MIN_ISLAND) closed[p] = 0;
  }

  // 主刀痕：原始强边缘十字膨胀 1px（外轮廓约 2px、颜色更深），其余细纹保持 1px
  const strongDilated = new Uint8Array(total);
  for (let y = 0; y < height; y++) {
    const row = y * width;
    for (let x = 0; x < width; x++) {
      const p = row + x;
      if (
        origStrong[p] ||
        (x > 0 && origStrong[p - 1]) ||
        (x < width - 1 && origStrong[p + 1]) ||
        (y > 0 && origStrong[p - width]) ||
        (y < height - 1 && origStrong[p + width])
      ) {
        strongDilated[p] = 1;
      }
    }
  }

  // 7. 红白二元着色（全程无灰度过渡）+ 米白区域极淡宣纸肌理
  for (let p = 0, i = 0; p < total; p++, i += 4) {
    if (closed[p]) {
      const c = strongDilated[p] ? strongLine : line;
      out[i] = c[0];
      out[i + 1] = c[1];
      out[i + 2] = c[2];
    } else {
      // 16px 分块确定性低频偏移，透明度 0~0.02，红色线条区域不叠加
      const bx = (p % width) >> 4;
      const by = ((p / width) | 0) >> 4;
      const h = Math.abs(Math.sin(bx * 127.1 + by * 311.7) * 43758.5453) % 1;
      const a = h * 0.02;
      out[i] = paper[0] * (1 - a) + paperTint[0] * a;
      out[i + 1] = paper[1] * (1 - a) + paperTint[1] * a;
      out[i + 2] = paper[2] * (1 - a) + paperTint[2] * a;
    }
    out[i + 3] = 255;
  }

  ctx.putImageData(imageData, 0, 0);
  return canvas;
}

/**
 * 灰度图轻量高斯降噪。
 * 优先使用 Canvas 原生 filter（blur 0.6~0.8px）；不支持时退化为
 * 可分离 3-tap 高斯 [1,2,1]/4 两遍，保证离线可用。
 */
function blurGray(
  ctx: CanvasRenderingContext2D,
  grayImageData: ImageData,
  gray: Float32Array,
  width: number,
  height: number,
  radius: number
): Float32Array {
  ctx.putImageData(grayImageData, 0, 0);
  const supported =
    typeof (ctx as CanvasRenderingContext2D & { filter?: string }).filter === 'string';
  if (supported) {
    const tmp = document.createElement('canvas');
    tmp.width = width;
    tmp.height = height;
    const tctx = tmp.getContext('2d')!;
    tctx.filter = `blur(${radius}px)`;
    tctx.drawImage(ctx.canvas, 0, 0);
    const blurred = tctx.getImageData(0, 0, width, height).data;
    const result = new Float32Array(width * height);
    for (let p = 0, i = 0; p < result.length; p++, i += 4) result[p] = blurred[i];
    return result;
  }
  // JS 兜底：横向 + 纵向两遍 [1,2,1]/4
  const tmp = new Float32Array(width * height);
  const out = new Float32Array(width * height);
  for (let y = 0; y < height; y++) {
    const row = y * width;
    for (let x = 0; x < width; x++) {
      const p = row + x;
      const l = x > 0 ? gray[p - 1] : gray[p];
      const r = x < width - 1 ? gray[p + 1] : gray[p];
      tmp[p] = (l + 2 * gray[p] + r) / 4;
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

/** 3×3 形态学：dilate=true 膨胀（邻域任一为真），false 腐蚀（邻域全为真） */
function morph(
  src: Uint8Array,
  dst: Uint8Array,
  width: number,
  height: number,
  isSet: (v: number) => boolean,
  dilate: boolean
): void {
  for (let y = 0; y < height; y++) {
    const y0 = y > 0 ? y - 1 : 0;
    const y1 = y < height - 1 ? y + 1 : height - 1;
    for (let x = 0; x < width; x++) {
      const x0 = x > 0 ? x - 1 : 0;
      const x1 = x < width - 1 ? x + 1 : width - 1;
      let hit = dilate ? false : true;
      for (let ny = y0; ny <= y1 && (dilate ? !hit : hit); ny++) {
        for (let nx = x0; nx <= x1; nx++) {
          const v = isSet(src[ny * width + nx]) ? 1 : 0;
          if (dilate) {
            if (v) {
              hit = true;
              break;
            }
          } else if (!v) {
            hit = false;
            break;
          }
        }
      }
      dst[y * width + x] = hit ? 1 : 0;
    }
  }
}

/**
 * 贺卡配色（克制的暗红烫金体系，避免亮正红）
 */
const CARD = {
  paper: '#F5EEE0',      // 底纸：暖米白
  paperEdge: '#EBE2D0',  // 底纸边缘微深
  darkRed: '#7A1F23',    // 主色：暗酒红
  gold: '#B08D4E',       // 主色：哑光古金
  goldLight: '#C6AB73',  // 浅金（角纹）
  ink: '#2B2420',        // 祝福文字：暖墨黑
};

/**
 * 生成贺卡图片。素材两条来源互斥（由 store 保证，不会同时传值）：
 * - 来源 B（用户上传）：patternImage 有值；patternSvg/patternImageUrl 必为 null。
 *   patternPreStyled=false → 走本地刻纸像素管线；true → AI 成品直接金边装裱。
 * - 来源 A（图案库预设）：patternImage 为 null；使用 patternImageUrl（高清图，优先于 SVG）或 patternSvg。
 * @param patternImage 来源 B：用户上传草图 / AI 刻纸成品 dataURL
 * @param patternSvg 来源 A：图案库内置 SVG path
 * @param patternImageUrl 来源 A：图案库高清刻纸图地址（优先于 SVG）
 * @param patternPreStyled 来源 B 的 patternImage 是否已是 AI 成品（跳过本地滤镜）
 */
export async function generateGreetingCard(
  patternImage: string | null,
  greetingText: string,
  fontStyle: string,
  patternSvg: string | null,
  patternImageUrl?: string | null,
  patternPreStyled: boolean = false
): Promise<string> {
  const canvas = document.createElement('canvas');
  const width = 800;
  const height = 1200;
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d')!;

  // 1. 米白底纸（带极轻微的纸面层次）
  ctx.fillStyle = CARD.paper;
  ctx.fillRect(0, 0, width, height);
  const vignette = ctx.createLinearGradient(0, 0, 0, height);
  vignette.addColorStop(0, 'rgba(122, 31, 35, 0.025)');
  vignette.addColorStop(0.5, 'rgba(0, 0, 0, 0)');
  vignette.addColorStop(1, 'rgba(122, 31, 35, 0.035)');
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, width, height);

  // 2. 极细外框 + 金色角纹（第三视觉层级）
  drawCardFrame(ctx, width, height);

  // 3. 绘制图案（第一视觉层级）
  const frameSize = 520;
  const frameX = (width - frameSize) / 2;
  const frameY = 158;

  if (patternImage) {
    const img = await loadImage(patternImage);

    // AI 智能体产出的已是红色刻纸成品稿：直接金边装裱，不再走边缘滤镜
    if (patternPreStyled) {
      const maxSize = frameSize;
      const ratio = img.naturalWidth / img.naturalHeight || 1;
      let dw = maxSize;
      let dh = maxSize;
      if (ratio >= 1) dh = maxSize / ratio;
      else dw = maxSize * ratio;
      const dx = (width - dw) / 2;
      const dy = frameY + (frameSize - dh) / 2;

      ctx.save();
      roundRectPath(ctx, dx, dy, dw, dh, 10);
      ctx.clip();
      ctx.drawImage(img, dx, dy, dw, dh);
      ctx.restore();
      drawGoldFrame(ctx, dx, dy, dw, dh, 10);
    } else {
      const imgCanvas = resizeImage(img, 600);
      const processedImg = applyPaperCutEffect(imgCanvas, 'red');

      const imgWidth = frameSize;
      const imgHeight = (processedImg.height / processedImg.width) * imgWidth;
      const imgX = (width - imgWidth) / 2;
      const imgY = frameY + (frameSize - Math.min(imgHeight, frameSize)) / 2;

      ctx.save();
      roundRectPath(ctx, imgX, imgY, imgWidth, Math.min(imgHeight, frameSize), 10);
      ctx.clip();
      ctx.drawImage(processedImg, imgX, imgY, imgWidth, Math.min(imgHeight, frameSize));
      ctx.restore();

      drawGoldFrame(ctx, imgX, imgY, imgWidth, Math.min(imgHeight, frameSize), 10);
    }
  } else if (patternImageUrl) {
    // AIGC 高清刻纸图案：保留红底方形框，边框改为细金线
    const img = await loadImage(patternImageUrl);

    ctx.save();
    roundRectPath(ctx, frameX, frameY, frameSize, frameSize, 10);
    ctx.clip();
    ctx.drawImage(img, frameX, frameY, frameSize, frameSize);
    ctx.restore();

    drawGoldFrame(ctx, frameX, frameY, frameSize, frameSize, 10);
  } else if (patternSvg) {
    drawSvgPattern(ctx, patternSvg, width / 2, frameY + frameSize / 2, 360);
  }

  // 4. 绘制祝福语（第二视觉层级）
  drawGreetingText(ctx, greetingText, fontStyle, width, height);

  // 5. 底部极简落款
  drawBottomDecoration(ctx, width, height);

  return canvas.toDataURL('image/png', 0.92);
}

function roundRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** 图案红底方形框上的细金边（双线，外暗金内亮金，精致克制） */
function drawGoldFrame(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.save();
  ctx.lineWidth = 2;
  ctx.strokeStyle = CARD.gold;
  roundRectPath(ctx, x + 1, y + 1, w - 2, h - 2, r);
  ctx.stroke();

  ctx.lineWidth = 0.75;
  ctx.strokeStyle = `rgba(198, 171, 115, 0.85)`;
  roundRectPath(ctx, x + 7, y + 7, w - 14, h - 14, Math.max(r - 4, 2));
  ctx.stroke();
  ctx.restore();
}

/** 贺卡外框：极细暗红单线 + 四角细小金角纹，不加中间花纹 */
function drawCardFrame(ctx: CanvasRenderingContext2D, width: number, height: number) {
  const inset = 40;

  ctx.save();
  // 极细外框（暗红，细而不跳）
  ctx.strokeStyle = 'rgba(122, 31, 35, 0.55)';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(inset, inset, width - inset * 2, height - inset * 2);

  // 内侧紧贴一条发丝金线，增加精致感
  ctx.strokeStyle = 'rgba(176, 141, 78, 0.5)';
  ctx.lineWidth = 0.75;
  ctx.strokeRect(inset + 7, inset + 7, width - (inset + 7) * 2, height - (inset + 7) * 2);

  // 四角细小金色角纹
  const c = inset;
  const s = 30;
  drawGoldCorner(ctx, c, c, s, 0);
  drawGoldCorner(ctx, width - c, c, s, 90);
  drawGoldCorner(ctx, width - c, height - c, s, 180);
  drawGoldCorner(ctx, c, height - c, s, 270);
  ctx.restore();
}

/** 细金角纹：两条短折线 + 一个小点，低调压角 */
function drawGoldCorner(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  rotation: number
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate((rotation * Math.PI) / 180);
  ctx.strokeStyle = CARD.goldLight;
  ctx.fillStyle = CARD.goldLight;
  ctx.lineWidth = 1.6;
  ctx.lineCap = 'round';

  // 外侧 L 线
  ctx.beginPath();
  ctx.moveTo(0, -size);
  ctx.lineTo(0, 0);
  ctx.lineTo(size, 0);
  ctx.stroke();

  // 内侧短折线
  ctx.lineWidth = 1;
  ctx.globalAlpha = 0.7;
  ctx.beginPath();
  ctx.moveTo(7, -(size - 8));
  ctx.lineTo(7, -7);
  ctx.lineTo(size - 8, -7);
  ctx.stroke();

  // 角心小圆点
  ctx.globalAlpha = 1;
  ctx.beginPath();
  ctx.arc(0, 0, 1.8, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function drawSvgPattern(
  ctx: CanvasRenderingContext2D,
  svgPath: string,
  centerX: number,
  centerY: number,
  size: number
) {
  ctx.save();
  ctx.translate(centerX, centerY);
  ctx.scale(size / 100, size / 100);
  ctx.translate(-50, -50);

  ctx.strokeStyle = CARD.darkRed;
  ctx.lineWidth = 2.5;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // 简化的图案绘制 - 绘制一个花朵形状
  ctx.beginPath();
  for (let i = 0; i < 8; i++) {
    const angle = (i * Math.PI * 2) / 8;
    const r = i % 2 === 0 ? 40 : 25;
    const x = 50 + Math.cos(angle) * r;
    const y = 50 + Math.sin(angle) * r;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.stroke();

  // 中心圆
  ctx.fillStyle = CARD.darkRed;
  ctx.beginPath();
  ctx.arc(50, 50, 12, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

/** 逐字绘制，手动拉开字距，保证中文排版疏朗 */
function drawSpacedLine(
  ctx: CanvasRenderingContext2D,
  line: string,
  centerX: number,
  y: number,
  spacing: number
) {
  const chars = Array.from(line);
  const widths = chars.map((ch) => ctx.measureText(ch).width);
  const total = widths.reduce((sum, w) => sum + w, 0) + spacing * (chars.length - 1);

  let cursor = centerX - total / 2;
  chars.forEach((ch, i) => {
    ctx.fillText(ch, cursor + widths[i] / 2, y);
    cursor += widths[i] + spacing;
  });
}

function drawGreetingText(
  ctx: CanvasRenderingContext2D,
  text: string,
  fontStyle: string,
  width: number,
  height: number
) {
  const fontStack = getFontStack(fontStyle);

  const lines = text.split('\n').filter((l) => l.trim().length > 0);
  if (lines.length === 0) return;

  const maxLen = Math.max(...lines.map((l) => Array.from(l).length));
  const fontSize = Math.min(52, Math.floor(560 / Math.max(maxLen, 3)));

  ctx.font = `${fontSize}px ${fontStack}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = CARD.ink;

  const lineHeight = fontSize * 1.75;
  const blockHeight = (lines.length - 1) * lineHeight;
  const startY = height - 330;
  // 字距：约为字号的 12%，疏朗不拥挤
  const spacing = fontSize * 0.12;

  lines.forEach((line, index) => {
    drawSpacedLine(ctx, line, width / 2, startY - blockHeight / 2 + index * lineHeight, spacing);
  });
}

function drawBottomDecoration(ctx: CanvasRenderingContext2D, width: number, height: number) {
  const y = height - 118;

  ctx.save();
  // 居中短金线（左右各一段，中间留白，比单条横线更克制）
  ctx.strokeStyle = 'rgba(176, 141, 78, 0.8)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(width / 2 - 92, y);
  ctx.lineTo(width / 2 - 16, y);
  ctx.moveTo(width / 2 + 16, y);
  ctx.lineTo(width / 2 + 92, y);
  ctx.stroke();

  // 线中间一个小菱点
  ctx.fillStyle = CARD.gold;
  ctx.beginPath();
  ctx.moveTo(width / 2, y - 4);
  ctx.lineTo(width / 2 + 4, y);
  ctx.lineTo(width / 2, y + 4);
  ctx.lineTo(width / 2 - 4, y);
  ctx.closePath();
  ctx.fill();

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = CARD.darkRed;
  ctx.font = '15px "Noto Serif SC", serif';
  ctx.fillText('温州乐清细纹刻纸', width / 2, y + 26);

  ctx.fillStyle = 'rgba(122, 31, 35, 0.55)';
  ctx.font = '11px "Noto Serif SC", serif';
  ctx.fillText('国家级非物质文化遗产', width / 2, y + 48);
  ctx.restore();
}

/**
 * 生成SVG图案的刻纸风格预览
 */
export function generatePatternPreview(pattern: { svgPath: string; symbolName: string }): string {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="200" height="200">
      <defs>
        <filter id="paperCut">
          <feTurbulence type="fractalNoise" baseFrequency="0.05" numOctaves="2" result="noise"/>
          <feDisplacementMap in="SourceGraphic" in2="noise" scale="2"/>
        </filter>
      </defs>
      <rect width="100" height="100" fill="#FFFEF8"/>
      <g stroke="#C41E3A" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round" filter="url(#paperCut)">
        <path d="${pattern.svgPath}"/>
      </g>
      <circle cx="50" cy="50" r="35" stroke="#D4A574" stroke-width="0.5" fill="none" stroke-dasharray="4,4"/>
      <circle cx="50" cy="50" r="45" stroke="#C41E3A" stroke-width="1" fill="none"/>
    </svg>
  `;
  try {
    const encoded = encodeURIComponent(svg);
    const base64 = window.btoa(decodeURIComponent(encoded));
    return `data:image/svg+xml;base64,${base64}`;
  } catch {
    return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
  }
}
