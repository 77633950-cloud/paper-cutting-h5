import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, Camera, ChevronRight, Sparkles, Scroll, Quote } from 'lucide-react';

const galleryImages = [
  { src: '/cut-1.jpg', title: '金鸡报晓', desc: '中心福字配金鸡，寓意吉祥' },
  { src: '/cut-5.jpg', title: '十二生肖', desc: '骏马奔腾，万字符镇中心' },
  { src: '/cut-2.jpg', title: '双鹤延年', desc: '梅竹双清，鹤寿千年' },
  { src: '/cut-3.jpg', title: '松鹤延年', desc: '八角菱形，福寿双全' },
];

export default function HomePage() {
  const navigate = useNavigate();
  const [activeSlide, setActiveSlide] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % galleryImages.length);
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      const child = scrollRef.current.children[activeSlide] as HTMLElement;
      if (child) {
        child.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
      }
    }
  }, [activeSlide]);

  return (
    <div className="min-h-full flex flex-col animate-fade-in">
      {/* Hero Section with Large Cover Image */}
      <div className="relative">
        {/* Cover Image - Rooster Fortune Paper Cut */}
        <div className="relative w-full aspect-square max-h-[420px] overflow-hidden">
          <img
            src="/cut-1.jpg"
            alt="乐清细纹刻纸《金鸡报晓》"
            className="w-full h-full object-contain bg-[#FFF5F0]"
            loading="eager"
          />
          {/* Gradient overlay for text readability */}
          <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-[var(--color-bg)] to-transparent" />
          {/* Top gradient */}
          <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-[var(--color-bg)]/80 to-transparent" />
        </div>

        {/* Title overlay on image */}
        <div className="absolute bottom-4 left-0 right-0 text-center px-6">
          <div className="inline-block bg-[var(--color-bg)]/90 backdrop-blur-sm rounded-2xl px-6 py-3 shadow-lg">
            <h1 className="font-calligraphy text-3xl text-[var(--color-text)] leading-tight tracking-wide">
              乐清细纹刻纸
            </h1>
            <div className="flex items-center justify-center gap-2 mt-1">
              <div className="h-px w-6 bg-gradient-to-r from-transparent to-[var(--color-secondary)]" />
              <p className="text-[10px] text-[var(--color-primary)] font-medium tracking-[0.15em]">
                国家级非物质文化遗产
              </p>
              <div className="h-px w-6 bg-gradient-to-l from-transparent to-[var(--color-secondary)]" />
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center px-6 py-6 -mt-2 relative z-10">
        {/* Cultural description */}
        <div className="text-center max-w-sm mx-auto mb-6">
          <p className="text-base text-[var(--color-text)] leading-relaxed font-serif-sc mb-2">
            以刀代笔，以纸为媒
          </p>
          <p className="text-sm text-[var(--color-text-light)] leading-relaxed">
            源于乐清民间首饰龙的"龙船花"，历经七百年传承。刀法精妙入微，图案细如发丝，被誉为"中国剪纸的南宗代表"。
          </p>
        </div>

        {/* Feature Cards */}
        <div className="grid grid-cols-2 gap-3 mb-6 w-full max-w-sm">
          <div className="relative bg-[var(--color-paper)] rounded-xl p-4 shadow-sm group">
            <div className="absolute top-0 left-0 w-4 h-4 border-l-2 border-t-2 border-[var(--color-primary)] rounded-tl-lg" />
            <div className="absolute top-0 right-0 w-4 h-4 border-r-2 border-t-2 border-[var(--color-primary)] rounded-tr-lg" />
            <div className="absolute bottom-0 left-0 w-4 h-4 border-l-2 border-b-2 border-[var(--color-primary)] rounded-bl-lg" />
            <div className="absolute bottom-0 right-0 w-4 h-4 border-r-2 border-b-2 border-[var(--color-primary)] rounded-br-lg" />
            <Heart className="w-6 h-6 text-[var(--color-primary)] mx-auto mb-2 group-hover:scale-110 transition-transform" />
            <p className="text-xs text-[var(--color-text)] font-medium">祝福图案</p>
            <p className="text-[10px] text-[var(--color-text-light)] mt-1">八国民俗符号</p>
          </div>

          <div className="relative bg-[var(--color-paper)] rounded-xl p-4 shadow-sm group">
            <div className="absolute top-0 left-0 w-4 h-4 border-l-2 border-t-2 border-[var(--color-primary)] rounded-tl-lg" />
            <div className="absolute top-0 right-0 w-4 h-4 border-r-2 border-t-2 border-[var(--color-primary)] rounded-tr-lg" />
            <div className="absolute bottom-0 left-0 w-4 h-4 border-l-2 border-b-2 border-[var(--color-primary)] rounded-bl-lg" />
            <div className="absolute bottom-0 right-0 w-4 h-4 border-r-2 border-b-2 border-[var(--color-primary)] rounded-br-lg" />
            <Camera className="w-6 h-6 text-[var(--color-primary)] mx-auto mb-2 group-hover:scale-110 transition-transform" />
            <p className="text-xs text-[var(--color-text)] font-medium">手绘上传</p>
            <p className="text-[10px] text-[var(--color-text-light)] mt-1">个性创作转换</p>
          </div>
        </div>

        {/* CTA Buttons */}
        <div className="space-y-3 w-full max-w-sm mb-8">
          <button
            onClick={() => navigate('/select')}
            className="btn-primary w-full py-4 rounded-xl text-base font-medium flex items-center justify-center gap-2 shadow-lg shadow-red-900/20 hover:shadow-red-900/30 transition-shadow"
          >
            <Sparkles className="w-5 h-5" />
            开始制作贺卡
            <ChevronRight className="w-5 h-5" />
          </button>

          <button
            onClick={() => navigate('/upload')}
            className="btn-secondary w-full py-3 rounded-xl text-sm font-medium flex items-center justify-center gap-2"
          >
            <Camera className="w-4 h-4" />
            上传手绘草图
          </button>
        </div>
      </div>

      {/* Classic Works Gallery */}
      <div className="bg-[var(--color-paper)] border-t border-[var(--color-border)] py-6">
        <div className="px-6 max-w-sm mx-auto">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Scroll className="w-4 h-4 text-[var(--color-primary)]" />
              <h2 className="text-sm font-medium text-[var(--color-text)] font-serif-sc">
                经典作品
              </h2>
            </div>
            <div className="flex gap-1.5">
              {galleryImages.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setActiveSlide(idx)}
                  className={`w-2 h-2 rounded-full transition-all ${
                    idx === activeSlide ? 'bg-[var(--color-primary)] w-4' : 'bg-[var(--color-border)]'
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Horizontal scrolling gallery */}
          <div
            ref={scrollRef}
            className="flex gap-3 overflow-x-auto snap-x snap-mandatory scrollbar-hide pb-2 -mx-6 px-6"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {galleryImages.map((img, idx) => (
              <div
                key={idx}
                className={`flex-shrink-0 w-[220px] snap-center rounded-xl overflow-hidden shadow-md transition-all duration-300 ${
                  idx === activeSlide ? 'ring-2 ring-[var(--color-primary)] scale-[1.02]' : 'opacity-80'
                }`}
              >
                <div className="aspect-square bg-[#FFF5F0]">
                  <img
                    src={img.src}
                    alt={img.title}
                    className="w-full h-full object-contain"
                    loading="lazy"
                  />
                </div>
                <div className="bg-white p-3">
                  <p className="text-sm font-medium text-[var(--color-text)]">{img.title}</p>
                  <p className="text-[10px] text-[var(--color-text-light)] mt-0.5">{img.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Master Inheritor Section */}
      <div className="py-6 px-6 border-t border-[var(--color-border)]">
        <div className="max-w-sm mx-auto">
          <div className="flex items-center gap-2 mb-4">
            <Quote className="w-4 h-4 text-[var(--color-primary)]" />
            <h2 className="text-sm font-medium text-[var(--color-text)] font-serif-sc">
              非遗传承人
            </h2>
          </div>

          <div className="bg-[var(--color-paper)] rounded-xl p-4 shadow-sm flex gap-4 items-start">
            <div className="w-20 h-24 rounded-lg overflow-hidden flex-shrink-0 shadow-md">
              <img
                src="/master.jpg"
                alt="林邦栋"
                className="w-full h-full object-cover"
                loading="lazy"
              />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-medium text-[var(--color-text)] mb-1">林邦栋</h3>
              <p className="text-[10px] text-[var(--color-primary)] mb-2">
                国家级非遗代表性传承人
              </p>
              <p className="text-xs text-[var(--color-text-light)] leading-relaxed">
                浙江乐清人，毕生致力于细纹刻纸技艺的传承与创新。刀法精湛，作品被誉为"纸上刺绣"。
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Cultural Heritage Detail Section */}
      <div className="bg-[var(--color-paper)] border-t border-[var(--color-border)] py-6">
        <div className="px-6 max-w-sm mx-auto">
          <div className="flex items-center gap-2 mb-4">
            <Scroll className="w-4 h-4 text-[var(--color-primary)]" />
            <h2 className="text-sm font-medium text-[var(--color-text)] font-serif-sc">
              非遗文化
            </h2>
          </div>

          <div className="space-y-4">
            <div className="flex gap-3">
              <div className="w-1 bg-gradient-to-b from-[var(--color-primary)] to-[var(--color-secondary)] rounded-full shrink-0" />
              <div>
                <h3 className="text-sm font-medium text-[var(--color-text)] mb-1">七百年传承</h3>
                <p className="text-xs text-[var(--color-text-light)] leading-relaxed">
                  元代大德年间已有文字记载，源于乐清民间龙船灯装饰"龙船花"。
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="w-1 bg-gradient-to-b from-[var(--color-primary)] to-[var(--color-secondary)] rounded-full shrink-0" />
              <div>
                <h3 className="text-sm font-medium text-[var(--color-text)] mb-1">细如发丝</h3>
                <p className="text-xs text-[var(--color-text-light)] leading-relaxed">
                  一寸见方可刻52条线条，细线纹阔度仅1毫米，每刀间隔不到半毫米。
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="w-1 bg-gradient-to-b from-[var(--color-primary)] to-[var(--color-secondary)] rounded-full shrink-0" />
              <div>
                <h3 className="text-sm font-medium text-[var(--color-text)] mb-1">南宗代表</h3>
                <p className="text-xs text-[var(--color-text-light)] leading-relaxed">
                  2006年列入首批国家级非遗名录，与北方剪纸对照强烈，尽显江南海滨风神气韵。
                </p>
              </div>
            </div>
          </div>

          {/* Bottom Decorative Element */}
          <div className="mt-6 flex justify-center">
            <svg viewBox="0 0 120 30" className="w-32 h-8 opacity-30">
              <g stroke="#C41E3A" strokeWidth="1" fill="none">
                <path d="M10 15 L20 5 L30 15 L20 25 Z" />
                <path d="M30 15 L40 5 L50 15 L40 25 Z" />
                <path d="M50 15 L60 5 L70 15 L60 25 Z" />
                <path d="M70 15 L80 5 L90 15 L80 25 Z" />
                <path d="M90 15 L100 5 L110 15 L100 25 Z" />
                <circle cx="20" cy="15" r="2" fill="#C41E3A"/>
                <circle cx="40" cy="15" r="2" fill="#C41E3A"/>
                <circle cx="60" cy="15" r="2" fill="#C41E3A"/>
                <circle cx="80" cy="15" r="2" fill="#C41E3A"/>
                <circle cx="100" cy="15" r="2" fill="#C41E3A"/>
              </g>
            </svg>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="py-5 px-6 text-center bg-[var(--color-bg)]">
        <p className="text-[10px] text-[var(--color-text-light)] tracking-wider">
          传承非遗文化 · 创新数字体验 · 让千年技艺焕发新生
        </p>
      </div>
    </div>
  );
}
