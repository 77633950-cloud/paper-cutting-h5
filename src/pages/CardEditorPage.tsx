import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Wand2, Type, RefreshCw, ChevronRight } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { fontStyles } from '@/utils/patternData';
import { generateGreetingCard, applyPaperCutEffect, loadImage, resizeImage } from '@/utils/imageUtils';
import { useState, useEffect, useCallback, useRef } from 'react';

export default function CardEditorPage() {
  const navigate = useNavigate();
  const {
    selectedPattern,
    editedImage,
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
      let processedImage = null;
      
      if (editedImage) {
        const img = await loadImage(editedImage);
        const canvas = resizeImage(img, 600);
        const processed = applyPaperCutEffect(canvas, 'red');
        processedImage = processed.toDataURL('image/png');
      }
      
      const card = await generateGreetingCard(
        processedImage,
        localText,
        fontStyle,
        selectedPattern?.svgPath || null
      );
      
      setPreviewCard(card);
    } catch (error) {
      console.error('Preview generation error:', error);
    } finally {
      setIsProcessing(false);
      isGeneratingRef.current = false;
    }
  }, [selectedPattern, editedImage, localText, fontStyle]);

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
        <div className="flex items-center justify-between px-4 py-3">
          <button
            onClick={() => navigate(-1)}
            className="p-2 -ml-2 rounded-full hover:bg-black/5 transition-colors"
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
          <div className="bg-[var(--color-paper)] rounded-2xl overflow-hidden border-2 border-[var(--color-border)] shadow-lg relative">
            {isProcessing ? (
              <div className="aspect-[2/3] flex flex-col items-center justify-center bg-[var(--color-bg)]">
                <div className="loading-cut mb-4" />
                <p className="text-sm text-[var(--color-text-light)]">正在生成刻纸效果...</p>
              </div>
            ) : previewCard ? (
              <img
                src={previewCard}
                alt="贺卡预览"
                className="w-full h-auto"
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
                className="text-xs text-[var(--color-primary)] hover:underline"
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
                    className={`py-3 px-3 rounded-lg border text-sm transition-all ${
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

          {/* Pattern/Image Info */}
          <div className="bg-[var(--color-primary)]/5 rounded-xl p-4 border border-[var(--color-primary)]/20">
            <div className="flex items-center gap-2 mb-1">
              <RefreshCw className="w-3.5 h-3.5 text-[var(--color-primary)]" />
              <span className="text-xs font-medium text-[var(--color-primary)]">
                当前素材
              </span>
            </div>
            <p className="text-sm text-[var(--color-text)]">
              {selectedPattern 
                ? `${selectedPattern.country} · ${selectedPattern.symbolName}`
                : editedImage 
                  ? '自定义手绘草图'
                  : '无素材'
              }
            </p>
          </div>
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
