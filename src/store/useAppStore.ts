import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { getUserId } from '@/utils/userIdentity';
import { idbStorage } from '@/utils/idbStorage';

export interface Pattern {
  id: string;
  country: string;
  countryCode: string;
  symbol: string;
  symbolName: string;
  svgPath: string;
  description: string;
  /** AIGC 生成的高清刻纸图案（存在时优先于 SVG 渲染） */
  imageUrl?: string;
}

interface AppState {
  /** 素材来源 A：图案选择页的预设图案（与 editedImage 互斥，不会同时存在） */
  selectedPattern: Pattern | null;
  /** 素材来源 B：上传页的原始上传图（与 selectedPattern 互斥，不会同时存在） */
  uploadedImage: string | null;
  /** 素材来源 B：进入贺卡编辑的本地草图 / AI 刻纸成品（与 selectedPattern 互斥） */
  editedImage: string | null;
  /** editedImage 是否已是 AI 刻纸成品（为 true 时不再叠加本地边缘滤镜） */
  aiStyled: boolean;
  greetingText: string;
  fontStyle: string;
  generatedCard: string | null;
  isProcessing: boolean;
  /** 选择预设图案：进入素材来源 A，自动清空上传路径的所有素材 */
  setSelectedPattern: (pattern: Pattern) => void;
  /** 上传草图：进入素材来源 B（传非 null 时自动清空预设图案；传 null 仅为清空上传图） */
  setUploadedImage: (image: string | null) => void;
  /** 确认本地素材进入编辑：进入素材来源 B，自动清空预设图案 */
  setEditedImage: (image: string | null, aiStyled?: boolean) => void;
  setGreetingText: (text: string) => void;
  setFontStyle: (style: string) => void;
  setGeneratedCard: (card: string | null) => void;
  setIsProcessing: (processing: boolean) => void;
  reset: () => void;
}

const initialState = {
  selectedPattern: null,
  uploadedImage: null,
  editedImage: null,
  aiStyled: false,
  greetingText: '祝福您\n万事如意\n全家幸福',
  fontStyle: 'calligraphy',
  generatedCard: null,
  isProcessing: false,
};

/**
 * 每个匿名用户（设备 / 浏览器）使用独立的存储键，数据互不影响。
 * 图片等大字段存 IndexedDB；isProcessing 为临时状态，不落盘。
 * greetingText（祝福语）是每次制作的临时编辑内容，不持久化，
 * 每次重新打开都回到默认语句；fontStyle 作为用户字体偏好保留。
 */
export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
  ...initialState,
  // 素材来源 A（预设图案）：与上传路径互斥，选图案即清空上传素材与旧贺卡
  setSelectedPattern: (pattern) =>
    set({
      selectedPattern: pattern,
      uploadedImage: null,
      editedImage: null,
      aiStyled: false,
      generatedCard: null,
    }),
  // 素材来源 B（上传草图）：传入新图时清空预设图案与旧贺卡；传 null 仅清上传图
  setUploadedImage: (image) =>
    set(
      image
        ? { uploadedImage: image, selectedPattern: null, generatedCard: null }
        : { uploadedImage: image }
    ),
  // 素材来源 B（确认进入编辑）：清空预设图案，保证编辑页只有一个素材来源
  setEditedImage: (image, aiStyled = false) =>
    set({
      editedImage: image,
      aiStyled,
      selectedPattern: null,
      generatedCard: null,
    }),
  setGreetingText: (text) => set({ greetingText: text }),
  setFontStyle: (style) => set({ fontStyle: style }),
  setGeneratedCard: (card) => set({ generatedCard: card }),
  setIsProcessing: (processing) => set({ isProcessing: processing }),
  reset: () => set(initialState),
    }),
    {
      name: `papercut:state:${getUserId()}`,
      storage: createJSONStorage(() => idbStorage),
      version: 2,
      partialize: (state) => ({
        selectedPattern: state.selectedPattern,
        uploadedImage: state.uploadedImage,
        editedImage: state.editedImage,
        aiStyled: state.aiStyled,
        fontStyle: state.fontStyle,
        generatedCard: state.generatedCard,
      }),
      // v1 曾误持久化 greetingText（测试文案会覆盖默认祝福语），
      // 升级到 v2 时丢弃该字段，让其回到 initialState 默认值
      migrate: (persisted) => {
        if (persisted && typeof persisted === 'object') {
          delete (persisted as Record<string, unknown>).greetingText;
        }
        return persisted;
      },
    },
  ),
);
