
export enum StoryTemplate {
  HERO_JOURNEY = 'Hero\'s Journey',
  SEARCH_AND_FIND = 'Search & Find',
  BEDTIME_HEALING = 'Bedtime Healing',
  WACKY_ADVENTURE = 'Wacky Adventure'
}

export enum VisualStyle {
  WATERCOLOR = 'Soft Watercolor',
  CRAYON = 'Hand-drawn Crayon',
  PIXAR_3D = 'Disney Style',
  PAPER_CUT = 'Paper-cut Collage',
  OIL_PAINTING = 'Classic Oil Painting',
  GHIBLI = 'Ghibli Studio Anime',
  VINTAGE = 'Vintage Retro',
  FLAT_ART = 'Artistic Flat',
  CUSTOM = 'Custom Style'
}

export type PageType = 'cover' | 'story' | 'back';

export interface StoryPage {
  id: string;
  type: PageType;
  pageNumber: number;
  text: string;
  visualPrompt: string;
  imageUrl?: string;
  image?: string; // 新增：支持多种图片字段格式
  isGenerating?: boolean;
}

export interface BookProject {
  id: string;
  title: string;
  originalIdea: string;
  template: StoryTemplate;
  pages: StoryPage[];
  characterDescription: string;
  characterReferenceImage?: string; 
  characterSeedImage?: string; 
  visualStyle: VisualStyle;
  styleReferenceImage?: string; 
  styleDescription?: string;    
  extractionCode?: string;
  coverUrl?: string;    // 新增：支持根级封面
  cover_url?: string;   // 新增：支持数据库常见命名
  isPaid?: boolean;
  currentStep: 'idea' | 'character' | 'director' | 'press';
  createdAt?: number;
  author?: string;
  ownerId?: string; // 添加 ownerId 以匹配 Firebase 数据
}

export interface User {
  isLoggedIn: boolean;
  username: string;
  coins: number;
  isFirstRecharge: boolean;
}

export type AppView = 'login' | 'studio' | 'library' | 'plaza' | 'brand' | 'profile';
export type Language = 'zh' | 'en';
