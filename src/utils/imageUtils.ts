/**
 * 图片处理工具函数
 * 实现刻纸风格转换效果
 */

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

export function cropImage(
  canvas: HTMLCanvasElement,
  cropX: number,
  cropY: number,
  cropWidth: number,
  cropHeight: number
): HTMLCanvasElement {
  const croppedCanvas = document.createElement('canvas');
  croppedCanvas.width = cropWidth;
  croppedCanvas.height = cropHeight;
  const ctx = croppedCanvas.getContext('2d')!;
  ctx.drawImage(canvas, cropX, cropY, cropWidth, cropHeight, 0, 0, cropWidth, cropHeight);
  return croppedCanvas;
}

/**
 * 应用刻纸风格效果
 * 1. 灰度化
 * 2. 边缘检测 + 二值化
 * 3. 应用中国红主题色
 * 4. 添加纸张纹理
 */
export function applyPaperCutEffect(
  canvas: HTMLCanvasElement,
  colorTheme: 'red' | 'gold' = 'red'
): HTMLCanvasElement {
  const ctx = canvas.getContext('2d')!;
  const width = canvas.width;
  const height = canvas.height;
  
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;
  const grayData = new Uint8ClampedArray(width * height);
  
  // 1. 灰度化
  for (let i = 0; i < data.length; i += 4) {
    const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
    grayData[i / 4] = gray;
    data[i] = data[i + 1] = data[i + 2] = gray;
  }
  
  // 2. 边缘检测 (Sobel简化版) + 二值化
  const threshold = 30;
  const edgeData = new Uint8ClampedArray(width * height);
  
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = y * width + x;
      
      // Sobel 算子
      const gx = 
        -1 * grayData[(y - 1) * width + (x - 1)] +
        1 * grayData[(y - 1) * width + (x + 1)] +
        -2 * grayData[y * width + (x - 1)] +
        2 * grayData[y * width + (x + 1)] +
        -1 * grayData[(y + 1) * width + (x - 1)] +
        1 * grayData[(y + 1) * width + (x + 1)];
      
      const gy = 
        -1 * grayData[(y - 1) * width + (x - 1)] +
        -2 * grayData[(y - 1) * width + x] +
        -1 * grayData[(y - 1) * width + (x + 1)] +
        1 * grayData[(y + 1) * width + (x - 1)] +
        2 * grayData[(y + 1) * width + x] +
        1 * grayData[(y + 1) * width + (x + 1)];
      
      const magnitude = Math.sqrt(gx * gx + gy * gy);
      edgeData[idx] = magnitude > threshold ? 255 : 0;
    }
  }
  
  // 3. 应用主题色
  const themeColor = colorTheme === 'red' ? { r: 196, g: 30, b: 58 } : { r: 212, g: 165, b: 116 };
  const bgColor = { r: 250, g: 248, b: 242 };
  
  for (let i = 0; i < data.length; i += 4) {
    const idx = i / 4;
    const isEdge = edgeData[idx] > 0;
    const originalGray = grayData[idx];
    
    if (isEdge) {
      // 边缘使用深色
      data[i] = themeColor.r;
      data[i + 1] = themeColor.g;
      data[i + 2] = themeColor.b;
      data[i + 3] = 255;
    } else if (originalGray < 128) {
      // 暗部使用主题色
      const intensity = originalGray / 128;
      data[i] = Math.round(themeColor.r * intensity + bgColor.r * (1 - intensity));
      data[i + 1] = Math.round(themeColor.g * intensity + bgColor.g * (1 - intensity));
      data[i + 2] = Math.round(themeColor.b * intensity + bgColor.b * (1 - intensity));
      data[i + 3] = 255;
    } else {
      // 亮部使用背景色
      data[i] = bgColor.r;
      data[i + 1] = bgColor.g;
      data[i + 2] = bgColor.b;
      data[i + 3] = 255;
    }
  }
  
  ctx.putImageData(imageData, 0, 0);
  
  // 4. 添加细微纹理
  addPaperTexture(ctx, width, height);
  
  return canvas;
}

function addPaperTexture(ctx: CanvasRenderingContext2D, width: number, height: number) {
  ctx.save();
  ctx.globalAlpha = 0.03;
  ctx.fillStyle = '#2C1810';
  
  for (let i = 0; i < width * height * 0.05; i++) {
    const x = Math.random() * width;
    const y = Math.random() * height;
    const size = Math.random() * 2;
    ctx.fillRect(x, y, size, size);
  }
  
  ctx.restore();
}

/**
 * 生成贺卡图片
 */
export async function generateGreetingCard(
  patternImage: string | null,
  greetingText: string,
  fontStyle: string,
  patternSvg: string | null
): Promise<string> {
  const canvas = document.createElement('canvas');
  const width = 800;
  const height = 1200;
  canvas.width = width;
  canvas.height = height;
  
  const ctx = canvas.getContext('2d')!;
  
  // 1. 绘制背景
  ctx.fillStyle = '#FFFEF8';
  ctx.fillRect(0, 0, width, height);
  
  // 2. 绘制边框装饰
  drawPaperCutBorder(ctx, width, height);
  
  // 3. 绘制图案
  if (patternImage) {
    const img = await loadImage(patternImage);
    const imgCanvas = resizeImage(img, 600);
    const processedImg = applyPaperCutEffect(imgCanvas, 'red');
    
    const imgWidth = 500;
    const imgHeight = (processedImg.height / processedImg.width) * imgWidth;
    const imgX = (width - imgWidth) / 2;
    const imgY = 180;
    
    ctx.drawImage(processedImg, imgX, imgY, imgWidth, imgHeight);
  } else if (patternSvg) {
    // 绘制SVG图案
    drawSvgPattern(ctx, patternSvg, width / 2, 380, 300);
  }
  
  // 4. 绘制祝福语
  drawGreetingText(ctx, greetingText, fontStyle, width, height);
  
  // 5. 绘制底部装饰
  drawBottomDecoration(ctx, width, height);
  
  return canvas.toDataURL('image/png', 0.9);
}

function drawPaperCutBorder(ctx: CanvasRenderingContext2D, width: number, height: number) {
  const padding = 30;
  
  ctx.strokeStyle = '#C41E3A';
  ctx.lineWidth = 3;
  
  // 外边框
  ctx.strokeRect(padding, padding, width - padding * 2, height - padding * 2);
  
  // 内边框
  ctx.lineWidth = 1;
  ctx.setLineDash([8, 4]);
  ctx.strokeRect(padding + 10, padding + 10, width - padding * 2 - 20, height - padding * 2 - 20);
  ctx.setLineDash([]);
  
  // 四角装饰
  const cornerSize = 40;
  ctx.lineWidth = 2;
  
  // 左上角
  drawCornerDecoration(ctx, padding + 5, padding + 5, cornerSize, 0);
  // 右上角
  drawCornerDecoration(ctx, width - padding - 5, padding + 5, cornerSize, 90);
  // 右下角
  drawCornerDecoration(ctx, width - padding - 5, height - padding - 5, cornerSize, 180);
  // 左下角
  drawCornerDecoration(ctx, padding + 5, height - padding - 5, cornerSize, 270);
}

function drawCornerDecoration(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  rotation: number
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate((rotation * Math.PI) / 180);
  
  ctx.beginPath();
  ctx.moveTo(0, -size / 2);
  ctx.lineTo(0, 0);
  ctx.lineTo(size / 2, 0);
  ctx.stroke();
  
  // 小花装饰
  ctx.fillStyle = '#C41E3A';
  ctx.beginPath();
  ctx.arc(0, 0, 4, 0, Math.PI * 2);
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
  
  ctx.strokeStyle = '#C41E3A';
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
  ctx.fillStyle = '#C41E3A';
  ctx.beginPath();
  ctx.arc(50, 50, 12, 0, Math.PI * 2);
  ctx.fill();
  
  // 内部花纹
  ctx.strokeStyle = '#D4A574';
  ctx.lineWidth = 1.5;
  for (let i = 0; i < 6; i++) {
    const angle = (i * Math.PI * 2) / 6;
    ctx.beginPath();
    ctx.moveTo(50 + Math.cos(angle) * 15, 50 + Math.sin(angle) * 15);
    ctx.lineTo(50 + Math.cos(angle) * 30, 50 + Math.sin(angle) * 30);
    ctx.stroke();
  }
  
  ctx.restore();
}

function drawGreetingText(
  ctx: CanvasRenderingContext2D,
  text: string,
  fontStyle: string,
  width: number,
  height: number
) {
  const fontFamilies: Record<string, string> = {
    calligraphy: '"Ma Shan Zheng", cursive',
    serif: '"Noto Serif SC", serif',
    sans: '"Noto Sans SC", sans-serif',
    kai: '"KaiTi", "STKaiti", serif',
  };
  
  ctx.fillStyle = '#2C1810';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  
  const lines = text.split('\n');
  const fontSize = Math.min(48, 600 / Math.max(lines.length, 3));
  ctx.font = `${fontSize}px ${fontFamilies[fontStyle] || fontFamilies.calligraphy}`;
  
  const startY = height - 280;
  const lineHeight = fontSize * 1.6;
  
  lines.forEach((line, index) => {
    const y = startY + index * lineHeight;
    
    // 文字阴影
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.08)';
    ctx.fillText(line, width / 2 + 2, y + 2);
    ctx.restore();
    
    ctx.fillStyle = '#2C1810';
    ctx.fillText(line, width / 2, y);
  });
}

function drawBottomDecoration(ctx: CanvasRenderingContext2D, width: number, height: number) {
  const y = height - 80;
  
  ctx.strokeStyle = '#D4A574';
  ctx.lineWidth = 1;
  
  // 横线
  ctx.beginPath();
  ctx.moveTo(width / 2 - 100, y);
  ctx.lineTo(width / 2 + 100, y);
  ctx.stroke();
  
  // 小装饰
  ctx.fillStyle = '#C41E3A';
  ctx.font = '14px "Noto Sans SC"';
  ctx.textAlign = 'center';
  ctx.fillText('温州乐清细纹刻纸', width / 2, y + 25);
  
  ctx.fillStyle = '#D4A574';
  ctx.font = '12px "Noto Sans SC"';
  ctx.fillText('非物质文化遗产', width / 2, y + 45);
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
