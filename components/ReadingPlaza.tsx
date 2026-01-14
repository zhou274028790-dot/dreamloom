
import React, { useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../services/firebase';
import { VisualStyle, Language } from '../types';

interface Props {
  lang: Language;
  onUseStyle: (style: VisualStyle) => void;
  onUseIdea: (idea: string) => void;
}

interface PlazaBook {
  id: string;
  title: string;
  author: string;
  likes: number;
  cover_url: string;
  style: VisualStyle;
  idea: string;
  pages: { text: string; image: string }[];
}

const ReadingPlaza: React.FC<Props> = ({ lang, onUseStyle, onUseIdea }) => {
  const [filter, setFilter] = useState<string>('hot');
  const [books, setBooks] = useState<PlazaBook[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedBook, setSelectedBook] = useState<PlazaBook | null>(null);
  const [previewIndex, setPreviewIndex] = useState(0);

  useEffect(() => {
    const fetchPlazaData = async () => {
      setIsLoading(true);
      try {
        const querySnapshot = await getDocs(collection(db, "plaza_stories"));
        const fetchedBooks: PlazaBook[] = querySnapshot.docs.map(doc => {
          const data = doc.data();
          // 深度兼容：提取 pages 并确保 image 字段有效
          const formattedPages = (data.pages || []).map((p: any) => {
            const pageImageUrl = p.image || p.imageUrl || p.url || data.cover_url;
            return {
              text: p.text || '',
              image: pageImageUrl
            };
          });

          return {
            id: doc.id,
            title: data.title || (lang === 'zh' ? '无题' : 'Untitled'),
            author: data.author || 'Anonymous',
            likes: data.likes || 0,
            cover_url: data.cover_url || '',
            style: data.style as VisualStyle || VisualStyle.WATERCOLOR,
            idea: data.idea || '',
            pages: formattedPages
          };
        });
        setBooks(fetchedBooks);
      } catch (error) {
        console.error("Error fetching plaza stories:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPlazaData();
  }, [lang]);

  const t = {
    zh: { 
      title: '阅读广场', 
      subtitle: '在这里寻找灵感，发现全球创作者的奇思妙想。', 
      useStyle: '使用同款画风', 
      useIdea: '写同款故事', 
      hot: '最热', 
      latest: '最新', 
      preview: '开始阅读', 
      close: '退出阅读',
      loading: '正在为您从星空中捕捉灵感...',
      empty: '广场暂时空空如也，快去创作你的第一本绘本吧！'
    },
    en: { 
      title: 'Reading Plaza', 
      subtitle: 'Find inspiration and discover magical ideas from worldwide creators.', 
      useStyle: 'Use Style', 
      useIdea: 'Write Same Story', 
      hot: 'Hot', 
      latest: 'Latest', 
      preview: 'Read Now', 
      close: 'Close',
      loading: 'Gathering inspirations from stars...',
      empty: 'The plaza is quiet. Be the first to publish!'
    }
  }[lang];

  const handleOpenBook = (book: PlazaBook) => {
    if (!book.pages || book.pages.length === 0) return;
    setPreviewIndex(0);
    setSelectedBook(book);
  };

  const sortedBooks = [...books].sort((a, b) => {
    if (filter === 'hot') return b.likes - a.likes;
    return 0;
  });

  return (
    <div className="space-y-6 md:space-y-10 animate-in fade-in duration-500 w-full relative">
      <div className="text-center space-y-2 md:space-y-3">
        <h2 className="text-2xl md:text-4xl font-header font-bold" style={{ color: 'var(--text-main)' }}>{t.title}</h2>
        <p className="opacity-60 max-w-2xl mx-auto font-medium text-sm md:text-base">{t.subtitle}</p>
      </div>

      <div className="flex justify-center gap-4">
        <button onClick={() => setFilter('hot')} className={`px-6 py-2 rounded-full font-bold transition-all text-sm md:text-base ${filter === 'hot' ? 'bg-[#EA6F23] text-white shadow-lg' : 'bg-[var(--card-bg)] text-[var(--text-sub)] border border-[var(--border-color)]'}`}>
          <i className="fas fa-fire mr-2"></i>{t.hot}
        </button>
        <button onClick={() => setFilter('latest')} className={`px-6 py-2 rounded-full font-bold transition-all text-sm md:text-base ${filter === 'latest' ? 'bg-[#EA6F23] text-white shadow-lg' : 'bg-[var(--card-bg)] text-[var(--text-sub)] border border-[var(--border-color)]'}`}>
          <i className="fas fa-clock mr-2"></i>{t.latest}
        </button>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-32 space-y-6 opacity-40">
           <div className="w-12 h-12 border-4 border-[#EA6F23] border-t-transparent rounded-full animate-spin"></div>
           <p className="font-bold text-sm tracking-widest">{t.loading}</p>
        </div>
      ) : sortedBooks.length === 0 ? (
        <div className="text-center py-32 opacity-30 font-bold">
           {t.empty}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8 w-full">
          {sortedBooks.map(book => (
            <div key={book.id} className="card-dynamic rounded-[2.5rem] overflow-hidden group hover:-translate-y-2 flex flex-col shadow-lg border border-[var(--border-color)]">
              <div className="relative aspect-square overflow-hidden cursor-pointer" onClick={() => handleOpenBook(book)}>
                <img src={book.cover_url} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" alt={book.title} />
                <div className="absolute top-4 left-4 bg-white/95 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-bold text-[#EA6F23] flex items-center gap-1 shadow-md z-10">
                  <i className="fas fa-heart text-[10px]"></i> {book.likes}
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-all flex flex-col justify-end p-6 gap-3 z-20">
                   <button onClick={(e) => { e.stopPropagation(); onUseStyle(book.style); }} className="btn-candy w-full py-2.5 text-white rounded-xl font-bold shadow-lg hover:scale-105 transition-transform flex items-center justify-center gap-2 text-xs">
                     <i className="fas fa-palette"></i> {t.useStyle}
                   </button>
                   <button onClick={(e) => { e.stopPropagation(); onUseIdea(book.idea); }} className="w-full py-2.5 bg-white text-[#EA6F23] rounded-xl font-bold shadow-lg hover:scale-105 transition-transform flex items-center justify-center gap-2 text-xs">
                     <i className="fas fa-pen-nib"></i> {t.useIdea}
                   </button>
                </div>
              </div>
              <div className="p-6 flex justify-between items-center bg-[var(--card-bg)]">
                <div>
                  <h3 className="text-lg font-bold font-header line-clamp-1" style={{ color: 'var(--text-main)' }}>{book.title}</h3>
                  <p className="text-[10px] opacity-40 font-bold uppercase tracking-widest mt-1">@ {book.author}</p>
                </div>
                <button onClick={() => handleOpenBook(book)} className="w-10 h-10 rounded-full bg-[#EA6F23]/10 text-[#EA6F23] flex items-center justify-center hover:bg-[#EA6F23] hover:text-white transition-all shadow-sm">
                  <i className="fas fa-book-open text-xs"></i>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 沉浸式巨幕阅读器 - 针对翻页 Bug 与 按钮视觉优化 */}
      {selectedBook && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-0 md:p-4">
          <div className="absolute inset-0 bg-black/98 backdrop-blur-3xl animate-in fade-in" onClick={() => setSelectedBook(null)}></div>
          
          <div className="relative w-full h-full md:max-w-7xl md:max-h-[92vh] bg-black md:rounded-[4rem] overflow-hidden shadow-2xl animate-in zoom-in-95 flex flex-col">
            
            {/* 顶部透明控制栏 */}
            <div className="absolute top-0 inset-x-0 h-24 px-8 flex justify-between items-center z-[130] bg-gradient-to-b from-black/80 via-black/20 to-transparent pointer-events-none">
                <div className="pointer-events-auto">
                   <h3 className="text-white text-xl md:text-2xl font-bold font-header drop-shadow-lg">{selectedBook.title}</h3>
                   <p className="text-white/50 text-[10px] font-black uppercase tracking-[0.3em] mt-1 flex items-center gap-2">
                     <i className="fas fa-feather-pointed"></i> @{selectedBook.author}
                   </p>
                </div>
                <button 
                  onClick={() => setSelectedBook(null)}
                  className="w-12 h-12 rounded-full bg-white/10 backdrop-blur-md text-white flex items-center justify-center pointer-events-auto hover:bg-white/20 transition-all border border-white/10 group shadow-lg"
                >
                  <i className="fas fa-times text-xl group-hover:rotate-90 transition-transform"></i>
                </button>
            </div>

            {/* 巨幕图片核心展示区 */}
            <div className="flex-1 relative flex items-center justify-center overflow-hidden">
              
              {/* 图片层：彻底去除内边距，实现巨幕效果 */}
              <div className="w-full h-full flex items-center justify-center">
                 <img 
                    key={`${selectedBook.id}-p-${previewIndex}`} // 强制刷新 Key
                    src={selectedBook.pages[previewIndex]?.image} 
                    className="w-full h-full object-contain transition-all duration-1000 animate-in fade-in"
                    alt={`Page ${previewIndex + 1}`} 
                 />
              </div>

              {/* 透明导航按钮：不再遮挡画面 */}
              <button 
                onClick={() => setPreviewIndex(p => Math.max(0, p - 1))}
                disabled={previewIndex === 0}
                className="absolute left-0 inset-y-0 w-24 md:w-32 flex items-center justify-center bg-transparent hover:bg-white/5 transition-all group disabled:opacity-0 z-[140]"
              >
                <div className="w-14 h-14 rounded-full flex items-center justify-center text-white/40 group-hover:text-white group-hover:scale-125 transition-all drop-shadow-[0_0_10px_rgba(0,0,0,0.5)]">
                  <i className="fas fa-chevron-left text-3xl"></i>
                </div>
              </button>
              
              <button 
                onClick={() => setPreviewIndex(p => Math.min(selectedBook.pages.length - 1, p + 1))}
                disabled={previewIndex === selectedBook.pages.length - 1}
                className="absolute right-0 inset-y-0 w-24 md:w-32 flex items-center justify-center bg-transparent hover:bg-white/5 transition-all group disabled:opacity-0 z-[140]"
              >
                <div className="w-14 h-14 rounded-full flex items-center justify-center text-white/40 group-hover:text-white group-hover:scale-125 transition-all drop-shadow-[0_0_10px_rgba(0,0,0,0.5)]">
                  <i className="fas fa-chevron-right text-3xl"></i>
                </div>
              </button>

              {/* 底部悬浮文字层：沉浸式设计 */}
              <div className="absolute bottom-20 inset-x-0 px-6 md:px-20 pointer-events-none z-[130]">
                 <div className="max-w-4xl mx-auto p-8 rounded-[3rem] bg-gradient-to-t from-black/80 via-black/40 to-transparent">
                    <p className="text-white text-xl md:text-3xl text-center leading-relaxed font-bold italic drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] animate-in slide-in-from-bottom-2 duration-700">
                      {selectedBook.pages[previewIndex]?.text}
                    </p>
                 </div>
              </div>

              {/* 进度条指示器 */}
              <div className="absolute bottom-10 left-0 right-0 flex justify-center gap-2 z-[140]">
                {selectedBook.pages.map((_, i) => (
                  <button 
                    key={`nav-dot-${i}`} 
                    onClick={() => setPreviewIndex(i)}
                    className={`h-1.5 rounded-full transition-all duration-500 shadow-sm ${i === previewIndex ? 'w-12 bg-[#EA6F23]' : 'w-2 bg-white/20 hover:bg-white/40'}`}
                  ></button>
                ))}
              </div>
            </div>

            {/* 底部精简功能区 */}
            <div className="bg-[#111111] px-10 py-5 flex flex-col md:flex-row items-center justify-between gap-6 border-t border-white/5 z-[150]">
                <div className="flex items-center gap-6">
                  <div className="px-5 py-2.5 bg-white/5 rounded-2xl flex items-center gap-3 border border-white/10 shadow-inner">
                     <i className="fas fa-palette text-[#EA6F23]"></i>
                     <span className="text-xs font-black text-white/80 uppercase tracking-widest">{selectedBook.style}</span>
                  </div>
                  <div className="text-[10px] font-black text-white/30 uppercase tracking-[0.4em]">
                    SLIDE {previewIndex + 1} OF {selectedBook.pages.length}
                  </div>
                </div>
                
                <div className="flex gap-4 w-full md:w-auto">
                  <button onClick={() => onUseIdea(selectedBook.idea)} className="flex-1 md:flex-none px-8 py-3.5 bg-white/5 text-white/70 rounded-2xl font-bold text-sm hover:bg-white/10 hover:text-white transition-all border border-white/10 flex items-center justify-center gap-2">
                    <i className="fas fa-pen-nib text-xs"></i> {t.useIdea}
                  </button>
                  <button onClick={() => onUseStyle(selectedBook.style)} className="flex-1 md:flex-none px-10 py-3.5 btn-candy text-white rounded-2xl font-bold text-sm shadow-2xl hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-3">
                    <i className="fas fa-magic text-xs"></i> {t.useStyle}
                  </button>
                </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReadingPlaza;
