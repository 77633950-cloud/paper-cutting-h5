import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Camera, ImageIcon, RotateCw, Check, X, Upload } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { fileToBase64, loadImage, resizeImage, rotateImage } from '@/utils/imageUtils';
import { useState, useRef, useCallback } from 'react';

export default function SketchUploadPage() {
  const navigate = useNavigate();
  const { setUploadedImage, setEditedImage } = useAppStore();
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [canvasRef, setCanvasRef] = useState<HTMLCanvasElement | null>(null);
  const [rotation, setRotation] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const processImage = useCallback(async (file: File) => {
    try {
      const base64 = await fileToBase64(file);
      setUploadedImage(base64);
      
      const img = await loadImage(base64);
      const canvas = resizeImage(img, 1200);
      setCanvasRef(canvas);
      setPreviewImage(canvas.toDataURL('image/jpeg', 0.9));
      setRotation(0);
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
  };

  const handleConfirm = () => {
    if (previewImage) {
      setEditedImage(previewImage);
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
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (cameraInputRef.current) cameraInputRef.current.value = '';
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
            上传手绘草图
          </h1>
          <div className="w-9" />
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

            {/* Tips */}
            <div className="mt-6 bg-[var(--color-paper)] rounded-xl p-4 border border-[var(--color-border)]">
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
                  避免过于复杂的图案，简单轮廓效果更佳
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-1 h-1 rounded-full bg-[var(--color-secondary)] mt-1.5 shrink-0" />
                  图片过大将自动压缩，不影响最终效果
                </li>
              </ul>
            </div>
          </div>
        ) : (
          /* Image Editor */
          <div className="max-w-sm mx-auto">
            <div className="relative bg-[var(--color-paper)] rounded-2xl overflow-hidden border border-[var(--color-border)] shadow-sm">
              <img
                src={previewImage}
                alt="Preview"
                className="w-full h-auto max-h-[60vh] object-contain"
                style={{ transform: `rotate(${rotation}deg)` }}
              />
              
              {/* Remove button */}
              <button
                onClick={clearImage}
                className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Editor Tools */}
            <div className="flex justify-center gap-3 mt-4">
              <button
                onClick={handleRotate}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[var(--color-paper)] border border-[var(--color-border)] text-sm text-[var(--color-text)] hover:border-[var(--color-primary)] transition-colors"
              >
                <RotateCw className="w-4 h-4" />
                旋转
              </button>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[var(--color-paper)] border border-[var(--color-border)] text-sm text-[var(--color-text)] hover:border-[var(--color-primary)] transition-colors"
              >
                <ImageIcon className="w-4 h-4" />
                重新选择
              </button>
            </div>

            <button
              onClick={handleConfirm}
              className="btn-primary w-full py-4 rounded-xl text-base font-medium mt-6 flex items-center justify-center gap-2 shadow-lg"
            >
              <Check className="w-5 h-5" />
              确认并继续
            </button>
          </div>
        )}
      </div>

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
