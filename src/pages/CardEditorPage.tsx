import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Wand2, Type, ChevronRight, ImageIcon } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { fontStyles } from '@/utils/patternData';
import { generateGreetingCard, ensureCardFontLoaded } from '@/utils/imageUtils';
import { useState, useEffect, useCallback, useRef } from 'react';

export default function CardEditorPage() {
  const navigate = useNavigate();
  const {
    // 素材来源 A：预设图案；素材来源 B：本地上传草图 / AI 成品。store 保证二者互斥。
    selectedPattern,
    editedImage,
    aiStyled,
    greetingText,
    fontStyle,
    setGreetingText,
    setFontStyle,
    setGeneratedCard,
  } = useAppStore();

  const [previewCard, setPreviewCard] = useState<string | null>(null);
  const [localText, setLocalText] = useState(greetingText);
  const [showFontSelector, setShowFontSelector] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const isGeneratingRef = useRef(false);

  // Generate preview when dependencies change
  const generatePreview = useCallback(async () => {
    if (!selectedPattern && !editedImage) return;
    if (isGeneratingRef.current) return;

    isGeneratingRef.current = true;
    setIsProcessing(true);

    try {
      // 先确保所选书法字体（分片 woff2）加载完成，避免 Canvas 回退成系统字体
      await ensureCardFontLoaded(fontStyle, localText);

      // 按素材来源显式分组传参，两条路径互不串联：
      //  来源 B（editedImage）：本地草图走本地刻纸管线；AI 成品（aiStyled）直接金边装裱
      //  来源 A（selectedPattern）：预设高清刻纸图 / 内置 SVG
      const card = await generateGreetingCard(
        editedImage,
        localText,
        fontStyle,
        selectedPattern?.svgPath ?? null,
        selectedPattern?.imageUrl ?? null,
        aiStyled
      );

      setPreviewCard(card);
    } catch (error) {
      console.error('Preview generation error:', error);
    } finally {
      setIsProcessing(false);
      isGeneratingRef.current = false;
    }
  }, [selectedPattern, editedImage, aiStyled, localText, fontStyle]);

  // Debounced preview generation
  useEffect(() => {
    const timer = setTimeout(() => {
      generatePreview();
    }, 600);
    return () => clearTimeout(timer);
  }, [generatePreview]);

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setLocalText(e.target.value);
  };

  const handleFontSelect = (fontId: string) => {
    setFontStyle(fontId);
    setShowFontSelector(false);
  };

  const handleGenerate = async () => {
    setGreetingText(localText);
    if (previewCard) {
      setGeneratedCard(previewCard);
      navigate('/result');
    }
  };

  const currentFont = fontStyles.find(f => f.id === fontStyle);

  return (
    <div className="min-h-full flex flex-col animate-fade-in-up">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-[var(--color-bg)]/95 backdrop-blur-sm border-b border-[var(--color-border)]">
        <div className="flex items-center justify-between px-4 pb-3 pt-[calc(env(safe-area-inset-top)_+_0.75rem)]">
          <button
            onClick={() => navigate(-1)}
            aria-label="返回上一页"
            className="p-3.5 -ml-3.5 rounded-full hover:bg-black/5 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-[var(--color-text)]" />
          </button>
          <h1 className="text-lg font-medium text-[var(--color-text)] font-serif-sc">
            编辑贺卡
          </h1>
          <div className="w-9" />
        </div>
      </header>

      <div className="flex-1 px-4 py-6 max-w-lg mx-auto w-full">
        {/* Card Preview */}
        <div className="mb-6">
          <div className="rounded-xl overflow-hidden shadow-xl relative ring-1 ring-black/5">
            {isProcessing ? (
              <div className="aspect-[2/3] flex flex-col items-center justify-center bg-[var(--color-bg)]">
                <div className="loading-cut mb-4" />
                <p className="text-sm text-[var(--color-text-light)]">正在生成刻纸效果...</p>
              </div>
            ) : previewCard ? (
              <img
                src={previewCard}
                alt="贺卡预览"
                className="w-full h-auto block"
              />
            ) : (
              <div className="aspect-[2/3] flex flex-col items-center justify-center bg-[var(--color-bg)]">
                <Wand2 className="w-12 h-12 text-[var(--color-border)] mb-3" />
                <p className="text-sm text-[var(--color-text-light)]">正在准备预览...</p>
              </div>
            )}
          </div>
        </div>

        {/* Editor Controls */}
        <div className="space-y-4">
          {/* Greeting Text */}
          <div className="bg-[var(--color-paper)] rounded-xl p-4 border border-[var(--color-border)]">
            <div className="flex items-center gap-2 mb-3">
              <Type className="w-4 h-4 text-[var(--color-primary)]" />
              <label className="text-sm font-medium text-[var(--color-text)]">
                祝福语
              </label>
            </div>
            <textarea
              value={localText}
              onChange={handleTextChange}
              placeholder="输入你的祝福..."
              rows={3}
              className="w-full px-3 py-2.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text)] text-sm resize-none transition-all"
              style={{ fontFamily: currentFont?.fontFamily }}
            />
            <p className="text-[10px] text-[var(--color-text-light)] mt-1.5">
              提示：使用换行符可排版为多行文字
            </p>
          </div>

          {/* Font Style Selector */}
          <div className="bg-[var(--color-paper)] rounded-xl p-4 border border-[var(--color-border)]">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-[var(--color-text)]">
                字体风格
              </span>
              <button
                onClick={() => setShowFontSelector(!showFontSelector)}
                className="hit-area px-2 py-1.5 -my-1 text-xs text-[var(--color-primary)] hover:underline"
              >
                {showFontSelector ? '收起' : '更换'}
              </button>
            </div>
            
            {showFontSelector ? (
              <div className="grid grid-cols-2 gap-2 animate-fade-in">
                {fontStyles.map((font) => (
                  <button
                    key={font.id}
                    onClick={() => handleFontSelect(font.id)}
                    className={`py-3.5 px-3 rounded-lg border text-sm transition-all ${
                      fontStyle === font.id
                        ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/5 text-[var(--color-primary)]'
                        : 'border-[var(--color-border)] text-[var(--color-text)] hover:border-[var(--color-primary)]/50'
                    }`}
                    style={{ fontFamily: font.fontFamily }}
                  >
                    {font.name}
                  </button>
                ))}
              </div>
            ) : (
              <div 
                className="py-2 px-3 rounded-lg bg-[var(--color-bg)] border border-[var(--color-border)] text-sm text-[var(--color-text)]"
                style={{ fontFamily: currentFont?.fontFamily }}
              >
                {currentFont?.name}
              </div>
            )}
          </div>

          {/* 当前素材：仅素材来源 A（图案库预设图案）显示；
              素材来源 B（本地上传 / AI 成品）不展示此卡片，避免两条路径信息串联 */}
          {selectedPattern && (
            <div className="bg-[var(--color-primary)]/5 rounded-xl p-4 border border-[var(--color-primary)]/20">
              <div className="flex items-center gap-2 mb-1">
                <ImageIcon className="w-3.5 h-3.5 text-[var(--color-primary)]" />
                <span className="text-xs font-medium text-[var(--color-primary)]">
                  当前素材
                </span>
              </div>
              <p className="text-sm text-[var(--color-text)]">
                {`${selectedPattern.country} · ${selectedPattern.symbolName}`}
              </p>
            </div>
          )}
        </div>

        {/* Generate Button */}
        <button
          onClick={handleGenerate}
          disabled={isProcessing || !previewCard}
          className="btn-primary w-full py-4 rounded-xl text-base font-medium mt-6 flex items-center justify-center gap-2 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Wand2 className="w-5 h-5" />
          生成贺卡
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
