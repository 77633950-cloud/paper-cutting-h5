import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Download, Share2, RotateCcw, Check, Copy, Home } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { useState, useEffect } from 'react';

export default function ResultPage() {
  const navigate = useNavigate();
  const { generatedCard, reset } = useAppStore();
  const [showCopied, setShowCopied] = useState(false);
  const [shareSupported, setShareSupported] = useState(false);

  useEffect(() => {
    setShareSupported(typeof navigator.share === 'function');
  }, []);

  // Redirect if no generated card
  useEffect(() => {
    if (!generatedCard) {
      navigate('/');
    }
  }, [generatedCard, navigate]);

  const handleSave = () => {
    if (!generatedCard) return;
    
    const link = document.createElement('a');
    link.href = generatedCard;
    link.download = `乐清细纹刻纸贺卡_${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleShare = async () => {
    if (!generatedCard) return;
    
    try {
      if (shareSupported) {
        // Convert base64 to blob for sharing
        const response = await fetch(generatedCard);
        const blob = await response.blob();
        const file = new File([blob], '乐清细纹刻纸贺卡.png', { type: 'image/png' });
        
        await navigator.share({
          title: '乐清细纹刻纸贺卡',
          text: '我用乐清细纹刻纸艺术制作了一张祝福贺卡，快来看看吧！',
          files: [file],
        });
      } else {
        // Fallback: copy to clipboard
        await navigator.clipboard.writeText(window.location.href);
        setShowCopied(true);
        setTimeout(() => setShowCopied(false), 2000);
      }
    } catch (error) {
      console.error('Share failed:', error);
      // Fallback
      try {
        await navigator.clipboard.writeText('我用乐清细纹刻纸艺术制作了一张祝福贺卡！');
        setShowCopied(true);
        setTimeout(() => setShowCopied(false), 2000);
      } catch {
        alert('分享功能暂不可用，请使用保存功能');
      }
    }
  };

  const handleRestart = () => {
    reset();
    navigate('/');
  };

  const handleNewCard = () => {
    reset();
    navigate('/select');
  };

  if (!generatedCard) return null;

  return (
    <div className="min-h-full flex flex-col animate-fade-in">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-[var(--color-bg)]/95 backdrop-blur-sm border-b border-[var(--color-border)]">
        <div className="flex items-center justify-between px-4 py-3">
          <button
            onClick={() => navigate('/editor')}
            className="p-2 -ml-2 rounded-full hover:bg-black/5 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-[var(--color-text)]" />
          </button>
          <h1 className="text-lg font-medium text-[var(--color-text)] font-serif-sc">
            贺卡完成
          </h1>
          <button
            onClick={handleRestart}
            className="p-2 -mr-2 rounded-full hover:bg-black/5 transition-colors"
          >
            <Home className="w-5 h-5 text-[var(--color-text)]" />
          </button>
        </div>
      </header>

      <div className="flex-1 px-4 py-6 max-w-lg mx-auto w-full">
        {/* Success Message */}
        <div className="text-center mb-6">
          <div className="w-12 h-12 mx-auto rounded-full bg-green-100 flex items-center justify-center mb-3">
            <Check className="w-6 h-6 text-green-600" />
          </div>
          <h2 className="text-xl font-medium text-[var(--color-text)] font-calligraphy mb-1">
            贺卡制作完成
          </h2>
          <p className="text-sm text-[var(--color-text-light)]">
            你的乐清细纹刻纸风格贺卡已生成
          </p>
        </div>

        {/* Card Display */}
        <div className="mb-8">
          <div className="bg-[var(--color-paper)] rounded-2xl overflow-hidden border-2 border-[var(--color-secondary)] shadow-xl relative">
            <img
              src={generatedCard}
              alt="生成的贺卡"
              className="w-full h-auto"
            />
            
            {/* Corner decorations */}
            <div className="absolute top-2 left-2 w-6 h-6 border-l-2 border-t-2 border-[var(--color-primary)] rounded-tl" />
            <div className="absolute top-2 right-2 w-6 h-6 border-r-2 border-t-2 border-[var(--color-primary)] rounded-tr" />
            <div className="absolute bottom-2 left-2 w-6 h-6 border-l-2 border-b-2 border-[var(--color-primary)] rounded-bl" />
            <div className="absolute bottom-2 right-2 w-6 h-6 border-r-2 border-b-2 border-[var(--color-primary)] rounded-br" />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          <button
            onClick={handleSave}
            className="btn-primary w-full py-4 rounded-xl text-base font-medium flex items-center justify-center gap-2 shadow-lg"
          >
            <Download className="w-5 h-5" />
            保存到相册
          </button>

          <button
            onClick={handleShare}
            className="btn-secondary w-full py-4 rounded-xl text-base font-medium flex items-center justify-center gap-2"
          >
            {showCopied ? (
              <>
                <Check className="w-5 h-5" />
                已复制
              </>
            ) : (
              <>
                <Share2 className="w-5 h-5" />
                {shareSupported ? '分享贺卡' : '复制链接'}
              </>
            )}
          </button>

          <button
            onClick={handleNewCard}
            className="w-full py-3 rounded-xl text-sm text-[var(--color-text-light)] flex items-center justify-center gap-2 hover:text-[var(--color-primary)] transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            制作新贺卡
          </button>
        </div>

        {/* Cultural Note */}
        <div className="mt-8 text-center">
          <div className="w-12 h-px bg-[var(--color-border)] mx-auto mb-4" />
          <p className="text-xs text-[var(--color-text-light)] leading-relaxed">
            温州乐清细纹刻纸，被誉为"中国剪纸的南宗代表"，
            <br />
            以其刀法精妙、线条细腻著称，2006年列入国家级非遗名录。
          </p>
        </div>
      </div>

      {/* Copied Toast */}
      {showCopied && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 bg-[var(--color-text)] text-white px-4 py-2 rounded-full text-sm animate-fade-in-up shadow-lg z-50">
          <div className="flex items-center gap-2">
            <Copy className="w-3.5 h-3.5" />
            已复制到剪贴板
          </div>
        </div>
      )}
    </div>
  );
}
