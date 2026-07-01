interface PaperCutBorderProps {
  children: React.ReactNode;
  className?: string;
}

export default function PaperCutBorder({ children, className = '' }: PaperCutBorderProps) {
  return (
    <div className={`relative ${className}`}>
      {/* SVG Border Frame */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none"
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id="borderGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#C41E3A" />
            <stop offset="50%" stopColor="#D4A574" />
            <stop offset="100%" stopColor="#C41E3A" />
          </linearGradient>
        </defs>
        <rect
          x="2"
          y="2"
          width="calc(100% - 4px)"
          height="calc(100% - 4px)"
          fill="none"
          stroke="url(#borderGradient)"
          strokeWidth="2"
          rx="12"
        />
      </svg>
      
      {/* Corner Decorations */}
      <div className="absolute top-0 left-0 w-8 h-8 pointer-events-none">
        <svg viewBox="0 0 32 32" className="w-full h-full">
          <path d="M0 12 L0 0 L12 0" fill="none" stroke="#C41E3A" strokeWidth="2" strokeLinecap="round"/>
          <circle cx="6" cy="6" r="2" fill="#C41E3A"/>
        </svg>
      </div>
      <div className="absolute top-0 right-0 w-8 h-8 pointer-events-none transform rotate-90">
        <svg viewBox="0 0 32 32" className="w-full h-full">
          <path d="M0 12 L0 0 L12 0" fill="none" stroke="#C41E3A" strokeWidth="2" strokeLinecap="round"/>
          <circle cx="6" cy="6" r="2" fill="#C41E3A"/>
        </svg>
      </div>
      <div className="absolute bottom-0 right-0 w-8 h-8 pointer-events-none transform rotate-180">
        <svg viewBox="0 0 32 32" className="w-full h-full">
          <path d="M0 12 L0 0 L12 0" fill="none" stroke="#C41E3A" strokeWidth="2" strokeLinecap="round"/>
          <circle cx="6" cy="6" r="2" fill="#C41E3A"/>
        </svg>
      </div>
      <div className="absolute bottom-0 left-0 w-8 h-8 pointer-events-none transform -rotate-90">
        <svg viewBox="0 0 32 32" className="w-full h-full">
          <path d="M0 12 L0 0 L12 0" fill="none" stroke="#C41E3A" strokeWidth="2" strokeLinecap="round"/>
          <circle cx="6" cy="6" r="2" fill="#C41E3A"/>
        </svg>
      </div>
      
      {children}
    </div>
  );
}
