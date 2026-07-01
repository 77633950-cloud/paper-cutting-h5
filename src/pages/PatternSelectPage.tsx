import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Check, Globe, Sparkles } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { patterns } from '@/utils/patternData';
import { generatePatternPreview } from '@/utils/imageUtils';
import { useState } from 'react';

export default function PatternSelectPage() {
  const navigate = useNavigate();
  const { selectedPattern, setSelectedPattern } = useAppStore();
  const [previewPattern, setPreviewPattern] = useState<string | null>(null);

  const handleSelect = (pattern: typeof patterns[0]) => {
    setSelectedPattern(pattern);
    setPreviewPattern(generatePatternPreview(pattern));
  };

  const handleConfirm = () => {
    if (selectedPattern) {
      navigate('/editor');
    }
  };

  return (
    <div className="min-h-full flex flex-col animate-fade-in-up">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-[var(--color-bg)]/95 backdrop-blur-sm border-b border-[var(--color-border)]">
        <div className="flex items-center justify-between px-4 py-3">
          <button
            onClick={() => navigate('/')}
            className="p-2 -ml-2 rounded-full hover:bg-black/5 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-[var(--color-text)]" />
          </button>
          <h1 className="text-lg font-medium text-[var(--color-text)] font-serif-sc">
            选择祝福图案
          </h1>
          <div className="w-9" />
        </div>
      </header>

      {/* Theme Banner */}
      <div className="px-6 py-6 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[var(--color-primary)]/10 mb-4">
          <Globe className="w-4 h-4 text-[var(--color-primary)]" />
          <span className="text-sm text-[var(--color-primary)] font-medium">
            为你的家乡选个祝福图案
          </span>
        </div>
        <p className="text-sm text-[var(--color-text-light)]">
          每个图案都融入了乐清细纹刻纸的艺术风格
        </p>
      </div>

      {/* Pattern Grid */}
      <div className="flex-1 px-4 pb-24">
        <div className="grid grid-cols-2 gap-3">
          {patterns.map((pattern, index) => (
            <div
              key={pattern.id}
              className={`pattern-card bg-[var(--color-paper)] rounded-xl overflow-hidden cursor-pointer ${
                selectedPattern?.id === pattern.id ? 'selected' : ''
              }`}
              onClick={() => handleSelect(pattern)}
              style={{ animationDelay: `${index * 0.05}s` }}
            >
              {/* Pattern Preview */}
              <div className="aspect-square relative bg-gradient-to-br from-[var(--color-bg)] to-[var(--color-bg-dark)] flex items-center justify-center p-4">
                <svg viewBox="0 0 100 100" className="w-full h-full max-w-[120px]">
                  <defs>
                    <filter id={`noise-${pattern.id}`}>
                      <feTurbulence type="fractalNoise" baseFrequency="0.05" numOctaves="2" result="noise"/>
                      <feDisplacementMap in="SourceGraphic" in2="noise" scale="1"/>
                    </filter>
                  </defs>
                  <rect width="100" height="100" fill="#FFFEF8" rx="8"/>
                  <g 
                    stroke="#C41E3A" 
                    strokeWidth="2" 
                    fill="none" 
                    strokeLinecap="round" 
                    strokeLinejoin="round"
                    filter={`url(#noise-${pattern.id})`}
                  >
                    <path d={pattern.svgPath}/>
                  </g>
                  <circle cx="50" cy="50" r="38" stroke="#D4A574" strokeWidth="0.5" fill="none" strokeDasharray="3,3" opacity="0.6"/>
                </svg>
                
                {/* Selected indicator */}
                {selectedPattern?.id === pattern.id && (
                  <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-[var(--color-primary)] flex items-center justify-center">
                    <Check className="w-4 h-4 text-white" />
                  </div>
                )}
              </div>

              {/* Pattern Info */}
              <div className="p-3">
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--color-primary)]/10 text-[var(--color-primary)] font-medium">
                    {pattern.countryCode}
                  </span>
                  <span className="text-sm font-medium text-[var(--color-text)]">
                    {pattern.country}
                  </span>
                </div>
                <p className="text-xs text-[var(--color-text-light)]">
                  {pattern.symbolName} · {pattern.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom Action */}
      {selectedPattern && (
        <div className="fixed bottom-0 left-0 right-0 bg-[var(--color-bg)]/95 backdrop-blur-sm border-t border-[var(--color-border)] p-4 safe-bottom animate-fade-in-up">
          <button
            onClick={handleConfirm}
            className="btn-primary w-full py-3.5 rounded-xl text-base font-medium flex items-center justify-center gap-2 shadow-lg"
          >
            <Sparkles className="w-5 h-5" />
            确认选择：{selectedPattern.country} · {selectedPattern.symbolName}
          </button>
        </div>
      )}

      {/* Preview Modal */}
      {previewPattern && selectedPattern && (
        <div 
          className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center p-6 animate-fade-in"
          onClick={() => setPreviewPattern(null)}
        >
          <div 
            className="bg-[var(--color-paper)] rounded-2xl p-6 max-w-sm w-full animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="aspect-square bg-gradient-to-br from-[var(--color-bg)] to-[var(--color-bg-dark)] rounded-xl flex items-center justify-center mb-4">
              <img src={previewPattern} alt={selectedPattern.symbolName} className="w-4/5 h-4/5 object-contain" />
            </div>
            <h3 className="text-lg font-medium text-[var(--color-text)] text-center mb-1">
              {selectedPattern.country} · {selectedPattern.symbolName}
            </h3>
            <p className="text-sm text-[var(--color-text-light)] text-center mb-4">
              {selectedPattern.description}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setPreviewPattern(null)}
                className="btn-secondary flex-1 py-3 rounded-xl text-sm font-medium"
              >
                重新选择
              </button>
              <button
                onClick={handleConfirm}
                className="btn-primary flex-1 py-3 rounded-xl text-sm font-medium"
              >
                确认使用
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
