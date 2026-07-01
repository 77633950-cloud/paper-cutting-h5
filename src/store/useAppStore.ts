import { create } from 'zustand';

export interface Pattern {
  id: string;
  country: string;
  countryCode: string;
  symbol: string;
  symbolName: string;
  svgPath: string;
  description: string;
}

interface AppState {
  selectedPattern: Pattern | null;
  uploadedImage: string | null;
  editedImage: string | null;
  greetingText: string;
  fontStyle: string;
  generatedCard: string | null;
  isProcessing: boolean;
  setSelectedPattern: (pattern: Pattern) => void;
  setUploadedImage: (image: string | null) => void;
  setEditedImage: (image: string | null) => void;
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
  greetingText: '祝福您\n万事如意\n阖家幸福',
  fontStyle: 'calligraphy',
  generatedCard: null,
  isProcessing: false,
};

export const useAppStore = create<AppState>((set) => ({
  ...initialState,
  setSelectedPattern: (pattern) => set({ selectedPattern: pattern }),
  setUploadedImage: (image) => set({ uploadedImage: image }),
  setEditedImage: (image) => set({ editedImage: image }),
  setGreetingText: (text) => set({ greetingText: text }),
  setFontStyle: (style) => set({ fontStyle: style }),
  setGeneratedCard: (card) => set({ generatedCard: card }),
  setIsProcessing: (processing) => set({ isProcessing: processing }),
  reset: () => set(initialState),
}));
