import { Scissors } from 'lucide-react';

interface LoadingSpinnerProps {
  text?: string;
}

export default function LoadingSpinner({ text = '正在处理...' }: LoadingSpinnerProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12">
      <div className="relative w-16 h-16 mb-4">
        <div className="absolute inset-0 rounded-full border-3 border-[var(--color-border)]" />
        <div className="absolute inset-0 rounded-full border-3 border-transparent border-t-[var(--color-primary)] animate-rotate-cut" />
        <div className="absolute inset-0 flex items-center justify-center">
          <Scissors className="w-6 h-6 text-[var(--color-primary)]" />
        </div>
      </div>
      <p className="text-sm text-[var(--color-text-light)]">{text}</p>
    </div>
  );
}
