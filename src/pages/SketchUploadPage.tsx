import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Camera, ImageIcon, RotateCw, Check, X, Upload,
  Sparkles, Settings, RefreshCw, Wand2, AlertTriangle, Loader2, ExternalLink,
} from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { fileToBase64, loadImage, resizeImage, rotateImage } from '@/utils/imageUtils';
import {
  analyzeImageComplexity,
  convertToPaperCut,
  getAgentSettings,
  saveAgentSettings,
  AgentError,
  PAPERCUT_CATEGORIES,
  type PapercutCategory,
} from '@/utils/papercutAgent';
import { useState, useRef, useCallback, useEffect } from 'react';

type AgentStatus = 'idle' | 'working' | 'done' | 'error';

export default function SketchUploadPage() {
  const navigate = useNavigate();
  const { setUploadedImage, setEditedImage } = useAppStore();
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [canvasRef, setCanvasRef] = useState<HTMLCanvasElement | null>(null);
  const [rotation, setRotation] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // AI 智能体状态
  const [showSettings, setShowSettings] = useState(false);
  const [showComplexWarning, setShowComplexWarning] = useState(false);
  const [agentStatus, setAgentStatus] = useState<AgentStatus>('idle');
  const [statusText, setStatusText] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [agentResult, setAgentResult] = useState<string | null>(null);
  const [compareMode, setCompareMode] = useState<'result' | 'original'>('result');
  const [category, setCategory] = useState<PapercutCategory>('general');
  const pendingConvertRef = useRef(false);

  const processImage = useCallback(async (file: File) => {
    try {
      const base64 = await fileToBase64(file);
      setUploadedImage(base64);

      const img = await loadImage(base64);
      const canvas = resizeImage(img, 1200);
      setCanvasRef(canvas);
      setPreviewImage(canvas.toDataURL('image/jpeg', 0.9));
      setRotation(0);
      // 新图：重置智能体状态
      setAgentStatus('idle');
      setAgentResult(null);
      setErrorMsg('');
      setCompareMode('result');
    } catch (error) {
      console.error('Image processing error:', error);
      alert('图片处理失败，请重试');
    }
  }, [setUploadedImage]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processImage(file);
  };

  const handleRotate = () => {
    if (!canvasRef) return;
    const newRotation = (rotation + 90) % 360;
    setRotation(newRotation);

    const rotated = rotateImage(canvasRef, 90);
    setCanvasRef(rotated);
    setPreviewImage(rotated.toDataURL('image/jpeg', 0.9));
    // 旋转原图后，AI 成品失效需重新生成
    setAgentStatus('idle');
    setAgentResult(null);
  };

  const runConvert = useCallback(async () => {
    if (!previewImage) return;
    setAgentStatus('working');
    setErrorMsg('');
    setCompareMode('result');
    try {
      const result = await convertToPaperCut(previewImage, category, setStatusText);
      setAgentResult(result);
      setAgentStatus('done');
    } catch (err) {
      const message =
        err instanceof AgentError ? err.message : '生成失败，请稍后重试';
      setErrorMsg(message);
      setAgentStatus('error');
    }
  }, [previewImage, category]);

  /** 一键生成：先做复杂度预检，过于细碎时先提醒简化轮廓 */
  const handleAiConvert = useCallback(async () => {
    if (!previewImage) return;
    if (!getAgentSettings().apiKey) {
      setShowSettings(true);
      return;
    }
    if (agentStatus === 'working') return;

    try {
      setStatusText('正在分析草图复杂度…');
      setAgentStatus('working');
      const { tooComplex } = await analyzeImageComplexity(previewImage);
      if (tooComplex) {
        pendingConvertRef.current = true;
        setShowComplexWarning(true);
        setAgentStatus('idle');
        return;
      }
    } catch {
      /* 预检失败不阻塞主流程 */
    }
    await runConvert();
  }, [previewImage, agentStatus, runConvert]);

  const handleConfirmOriginal = () => {
    if (previewImage) {
      setEditedImage(previewImage, false);
      navigate('/editor');
    }
  };

  const handleUseAiResult = () => {
    if (agentResult) {
      setEditedImage(agentResult, true);
      navigate('/editor');
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      processImage(file);
    }
  }, [processImage]);

  const clearImage = () => {
    setPreviewImage(null);
    setCanvasRef(null);
    setRotation(0);
    setUploadedImage(null);
    setAgentStatus('idle');
    setAgentResult(null);
    setErrorMsg('');
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (cameraInputRef.current) cameraInputRef.current.value = '';
  };

  return (
    <div className="min-h-full flex flex-col animate-fade-in-up">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-[var(--color-bg)]/95 backdrop-blur-sm border-b border-[var(--color-border)]">
        <div className="flex items-center justify-between px-4 pb-3 pt-[calc(env(safe-area-inset-top)_+_0.75rem)]">
          <button
            onClick={() => navigate('/')}
            aria-label="返回首页"
            className="p-3.5 -ml-3.5 rounded-full hover:bg-black/5 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-[var(--color-text)]" />
          </button>
          <h1 className="text-lg font-medium text-[var(--color-text)] font-serif-sc">
            上传手绘草图
          </h1>
          <button
            onClick={() => setShowSettings(true)}
            className="p-3.5 -mr-3.5 rounded-full hover:bg-black/5 transition-colors"
            title="智能体设置"
            aria-label="智能体设置"
          >
            <Settings className="w-5 h-5 text-[var(--color-text-light)]" />
          </button>
        </div>
      </header>

      <div className="flex-1 px-4 py-6">
        {!previewImage ? (
          /* Upload Area */
          <div className="max-w-sm mx-auto">
            <div className="text-center mb-6">
              <div className="w-16 h-16 mx-auto rounded-full bg-[var(--color-primary)]/10 flex items-center justify-center mb-4">
                <Upload className="w-8 h-8 text-[var(--color-primary)]" />
              </div>
              <h2 className="text-lg font-medium text-[var(--color-text)] mb-2">
                上传你的手绘草图
              </h2>
              <p className="text-sm text-[var(--color-text-light)]">
                支持 JPG、PNG 格式，建议上传清晰的线稿图
              </p>
            </div>

            {/* Drag & Drop Zone */}
            <div
              className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all ${
                isDragging
                  ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/5'
                  : 'border-[var(--color-border)] bg-[var(--color-paper)]'
              }`}
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
            >
              <div className="space-y-4">
                <div className="flex justify-center gap-4">
                  <button
                    onClick={() => cameraInputRef.current?.click()}
                    className="flex flex-col items-center gap-2 p-4 rounded-xl bg-[var(--color-bg)] hover:bg-[var(--color-bg-dark)] transition-colors"
                  >
                    <Camera className="w-6 h-6 text-[var(--color-primary)]" />
                    <span className="text-xs text-[var(--color-text)]">拍照</span>
                  </button>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="flex flex-col items-center gap-2 p-4 rounded-xl bg-[var(--color-bg)] hover:bg-[var(--color-bg-dark)] transition-colors"
                  >
                    <ImageIcon className="w-6 h-6 text-[var(--color-primary)]" />
                    <span className="text-xs text-[var(--color-text)]">相册</span>
                  </button>
                </div>
                <p className="text-xs text-[var(--color-text-light)]">
                  或将图片拖拽到此处
                </p>
              </div>
            </div>

            {/* AI Agent intro */}
            <div className="mt-4 rounded-2xl p-4 border border-[var(--color-secondary)]/40 bg-gradient-to-br from-[#7A1F23] to-[#5C171B] text-white shadow-md">
              <div className="flex items-center gap-2 mb-1.5">
                <Sparkles className="w-4 h-4 text-[var(--color-secondary)]" />
                <span className="text-sm font-medium">AI 智能刻纸师</span>
              </div>
              <p className="text-xs leading-relaxed text-white/80">
                上传草图或照片后，由内置智能体直接转换为红色乐清细纹刻纸成品稿——细如发丝、疏密有致，无需手动描述。
              </p>
            </div>

            {/* Tips */}
            <div className="mt-4 bg-[var(--color-paper)] rounded-xl p-4 border border-[var(--color-border)]">
              <h3 className="text-sm font-medium text-[var(--color-text)] mb-2">
                上传小贴士
              </h3>
              <ul className="space-y-1.5 text-xs text-[var(--color-text-light)]">
                <li className="flex items-start gap-2">
                  <span className="w-1 h-1 rounded-full bg-[var(--color-secondary)] mt-1.5 shrink-0" />
                  清晰的线条更容易获得好的刻纸效果
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-1 h-1 rounded-full bg-[var(--color-secondary)] mt-1.5 shrink-0" />
                  避免过于复杂细碎的图案，简单主体效果最佳
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-1 h-1 rounded-full bg-[var(--color-secondary)] mt-1.5 shrink-0" />
                  图片过大将自动压缩，不影响最终效果
                </li>
              </ul>
            </div>
          </div>
        ) : (
          /* Image Editor + AI Agent */
          <div className="max-w-sm mx-auto">
            {/* Preview */}
            <div className="relative bg-[var(--color-paper)] rounded-2xl overflow-hidden border border-[var(--color-border)] shadow-sm">
              <img
                src={agentStatus === 'done' && compareMode === 'result' && agentResult ? agentResult : previewImage}
                alt="Preview"
                className="w-full h-auto max-h-[52vh] object-contain mx-auto"
                style={{ transform: compareMode === 'original' ? `rotate(${rotation}deg)` : 'none' }}
              />

              {/* Result badge */}
              {agentStatus === 'done' && compareMode === 'result' && (
                <div className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-[#7A1F23] text-white text-[11px] flex items-center gap-1 shadow">
                  <Sparkles className="w-3 h-3 text-[var(--color-secondary)]" />
                  AI 刻纸成品
                </div>
              )}

              <button
                onClick={clearImage}
                aria-label="移除图片"
                className="absolute top-3 right-3 w-12 h-12 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Before / After switch */}
            {agentStatus === 'done' && (
              <div className="mt-3 flex justify-center">
                <div className="inline-flex rounded-full bg-[var(--color-paper)] border border-[var(--color-border)] p-0.5 text-xs">
                  <button
                    onClick={() => setCompareMode('result')}
                    className={`px-5 py-3.5 leading-5 rounded-full transition-colors ${
                      compareMode === 'result'
                        ? 'bg-[#7A1F23] text-white'
                        : 'text-[var(--color-text-light)]'
                    }`}
                  >
                    AI 成品
                  </button>
                  <button
                    onClick={() => setCompareMode('original')}
                    className={`px-5 py-3.5 leading-5 rounded-full transition-colors ${
                      compareMode === 'original'
                        ? 'bg-[#7A1F23] text-white'
                        : 'text-[var(--color-text-light)]'
                    }`}
                  >
                    原始草图
                  </button>
                </div>
              </div>
            )}

            {/* Editor Tools */}
            <div className="flex justify-center gap-3 mt-4">
              <button
                onClick={handleRotate}
                disabled={agentStatus === 'working'}
                className="flex items-center gap-2 px-5 py-3.5 rounded-xl bg-[var(--color-paper)] border border-[var(--color-border)] text-sm text-[var(--color-text)] hover:border-[var(--color-primary)] transition-colors disabled:opacity-40"
              >
                <RotateCw className="w-4 h-4" />
                旋转
              </button>
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={agentStatus === 'working'}
                className="flex items-center gap-2 px-5 py-3.5 rounded-xl bg-[var(--color-paper)] border border-[var(--color-border)] text-sm text-[var(--color-text)] hover:border-[var(--color-primary)] transition-colors disabled:opacity-40"
              >
                <ImageIcon className="w-4 h-4" />
                重新选择
              </button>
            </div>

            {/* ===== AI Agent Panel ===== */}
            <div className="mt-5 rounded-2xl border border-[var(--color-secondary)]/40 overflow-hidden shadow-md">
              <div className="px-4 py-3 bg-gradient-to-r from-[#7A1F23] to-[#5C171B] text-white flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[var(--color-secondary)]" />
                  <p className="text-sm font-medium leading-tight">AI 智能刻纸师</p>
                </div>
                <button
                  onClick={() => setShowSettings(true)}
                  className="hit-area p-2.5 rounded-full hover:bg-white/10 transition-colors"
                  title="智能体设置"
                  aria-label="智能体设置"
                >
                  <Settings className="w-4 h-4 text-white/80" />
                </button>
              </div>

              <div className="p-4 bg-[var(--color-paper)]">
                {/* 题材类别：决定智能体使用的刻纸提示词模板 */}
                <div className={agentStatus === 'working' ? 'opacity-50 pointer-events-none' : ''}>
                  <p className="text-xs font-medium text-[var(--color-text)] mb-2">
                    草图题材
                  </p>
                  <div className="flex flex-wrap gap-2 mb-1">
                    {PAPERCUT_CATEGORIES.map((c) => (
                      <button
                        key={c.id}
                        onClick={() => setCategory(c.id)}
                        title={c.hint}
                        className={`px-4 py-3.5 leading-5 rounded-full text-xs border transition-colors ${
                          category === c.id
                            ? 'bg-[#7A1F23] text-white border-[#7A1F23]'
                            : 'bg-[var(--color-bg)] text-[var(--color-text-light)] border-[var(--color-border)] hover:border-[#7A1F23]/50'
                        }`}
                      >
                        {c.label}
                      </button>
                    ))}
                  </div>
                  <p className="text-[11px] text-[var(--color-text-light)] mb-3.5">
                    {PAPERCUT_CATEGORIES.find((c) => c.id === category)?.hint}
                  </p>
                </div>

                {agentStatus === 'idle' && (
                  <button
                    onClick={handleAiConvert}
                    className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#8E2F28] to-[#6E2020] text-white text-sm font-medium flex items-center justify-center gap-2 shadow hover:opacity-95 active:scale-[0.99] transition"
                  >
                    <Wand2 className="w-4 h-4 text-[var(--color-secondary)]" />
                    一键生成红色细纹刻纸
                  </button>
                )}

                {agentStatus === 'working' && (
                  <div className="flex flex-col items-center py-3 gap-3">
                    <Loader2 className="w-7 h-7 text-[#7A1F23] animate-spin" />
                    <p className="text-xs text-[var(--color-text-light)] text-center leading-relaxed">
                      {statusText || '智能体正在操刀刻制…'}
                    </p>
                  </div>
                )}

                {agentStatus === 'error' && (
                  <div>
                    <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 border border-red-200 mb-3">
                      <AlertTriangle className="w-4 h-4 text-[#7A1F23] mt-0.5 shrink-0" />
                      <p className="text-xs text-[#7A1F23] leading-relaxed">{errorMsg}</p>
                    </div>
                    <button
                      onClick={handleAiConvert}
                      className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#8E2F28] to-[#6E2020] text-white text-sm font-medium flex items-center justify-center gap-2"
                    >
                      <RefreshCw className="w-4 h-4" />
                      重新生成
                    </button>
                  </div>
                )}

                {agentStatus === 'done' && (
                  <div className="space-y-2.5">
                    <button
                      onClick={handleUseAiResult}
                      className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#8E2F28] to-[#6E2020] text-white text-sm font-medium flex items-center justify-center gap-2 shadow"
                    >
                      <Check className="w-4 h-4" />
                      使用 AI 成品制作贺卡
                    </button>
                    <button
                      onClick={handleAiConvert}
                      className="w-full py-3.5 rounded-xl border border-[var(--color-border)] text-xs text-[var(--color-text-light)] flex items-center justify-center gap-1.5 hover:border-[#7A1F23]/50"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      不满意，重新生成一版
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* 本地路径（不走 AI） */}
            <button
              onClick={handleConfirmOriginal}
              disabled={agentStatus === 'working'}
              className="w-full py-3.5 mt-4 rounded-xl text-sm text-[var(--color-text-light)] border border-dashed border-[var(--color-border)] hover:border-[#7A1F23]/40 transition-colors disabled:opacity-40"
            >
              不使用 AI，用本地刻纸效果继续
            </button>
          </div>
        )}
      </div>

      {/* ===== 复杂度提醒弹窗（工艺原则第 5 条） ===== */}
      {showComplexWarning && (
        <Modal onClose={() => { setShowComplexWarning(false); pendingConvertRef.current = false; }}>
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-5 h-5 text-amber-600" />
            <h3 className="text-base font-medium text-[var(--color-text)]">草图可能过于复杂</h3>
          </div>
          <p className="text-sm text-[var(--color-text-light)] leading-relaxed mb-5">
            检测到参考图线条较为细碎密集。细纹刻纸讲究"中心密、四周疏"，
            过于复杂的图案不利于刻制，成品可能出现碎线。建议先简化主体轮廓后再生成；
            也可以让智能体尝试一次，自动帮你取舍构图。
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => { setShowComplexWarning(false); pendingConvertRef.current = false; }}
              className="flex-1 py-3.5 rounded-lg border border-[var(--color-border)] text-sm text-[var(--color-text)]"
            >
              我去简化一下
            </button>
            <button
              onClick={async () => {
                setShowComplexWarning(false);
                if (pendingConvertRef.current) {
                  pendingConvertRef.current = false;
                  await runConvert();
                }
              }}
              className="flex-1 py-3.5 rounded-lg bg-[#7A1F23] text-white text-sm"
            >
              仍然生成
            </button>
          </div>
        </Modal>
      )}

      {/* ===== 智能体设置弹窗 ===== */}
      <SettingsModal
        open={showSettings && !showComplexWarning}
        onClose={() => setShowSettings(false)}
        onSaved={() => {
          setShowSettings(false);
          // 保存后若已有图片，自动发起一次生成
          if (previewImage) setTimeout(handleAiConvert, 100);
        }}
      />

      {/* Hidden Inputs */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/jpg"
        onChange={handleFileSelect}
        className="hidden"
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileSelect}
        className="hidden"
      />
    </div>
  );
}

/* ---------- 通用弹窗 ---------- */
function Modal({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-[100] bg-black/45 flex items-center justify-center p-6 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-[var(--color-paper)] rounded-2xl p-5 w-full max-w-sm shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}

/* ---------- 智能体设置：火山方舟 API Key / 模型 ---------- */
function SettingsModal({ open, onClose, onSaved }: {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState('');

  // 每次打开时读取已保存配置
  useEffect(() => {
    if (open) {
      const s = getAgentSettings();
      setApiKey(s.apiKey);
      setModel(s.model);
    }
  }, [open]);

  if (!open) return null;

  const handleSave = () => {
    saveAgentSettings({ apiKey, model });
    onSaved();
  };

  return (
    <Modal onClose={onClose}>
      <div className="flex items-center gap-2 mb-1">
        <Settings className="w-5 h-5 text-[#7A1F23]" />
        <h3 className="text-base font-medium text-[var(--color-text)]">智能体设置</h3>
      </div>
      <p className="text-xs text-[var(--color-text-light)] mb-4 leading-relaxed">
        图生图由豆包 Seedream 大模型驱动，需要填写你在火山方舟控制台创建的 API Key，仅保存在本机浏览器中。
      </p>

      <label className="block text-xs font-medium text-[var(--color-text)] mb-1.5">
        火山方舟 API Key
      </label>
      <input
        type="password"
        value={apiKey}
        onChange={(e) => setApiKey(e.target.value)}
        placeholder="粘贴以 xxxxxxxx 开头的 API Key"
        className="w-full px-3 py-2.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] text-sm text-[var(--color-text)] mb-3"
      />

      <label className="block text-xs font-medium text-[var(--color-text)] mb-1.5">
        模型 ID（需已开通图生图能力）
      </label>
      <input
        type="text"
        value={model}
        onChange={(e) => setModel(e.target.value)}
        placeholder="doubao-seedream-4-0-250828"
        list="ark-models"
        className="w-full px-3 py-2.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] text-sm text-[var(--color-text)] mb-3"
      />
      <datalist id="ark-models">
        <option value="doubao-seedream-4-0-250828" />
        <option value="doubao-seedream-4-5-251128" />
        <option value="doubao-seededit-3-0-i2i-250628" />
      </datalist>

      <a
        href="https://console.volcengine.com/ark/region:ark+cn-beijing/apiKey"
        target="_blank"
        rel="noreferrer"
        className="hit-area inline-flex items-center gap-1 py-1.5 text-xs text-[#7A1F23] hover:underline mb-3"
      >
        前往火山方舟控制台获取 API Key
        <ExternalLink className="w-3 h-3" />
      </a>

      <button
        onClick={handleSave}
        disabled={!apiKey.trim()}
        className="w-full py-3.5 rounded-lg bg-[#7A1F23] text-white text-sm font-medium disabled:opacity-40"
      >
        保存并开始生成
      </button>
    </Modal>
  );
}
