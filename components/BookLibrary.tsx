
import React from 'react';
import { BookProject } from '../types';

interface Props {
  history: BookProject[];
  onSelect: (book: BookProject) => void;
  onDelete: (id: string) => void;
  onNewProject: () => void;
}

const BookLibrary: React.FC<Props> = ({ history, onSelect, onDelete, onNewProject }) => {
  
  if (history.length === 0) {
    return (
      <div className="max-w-4xl mx-auto py-20 text-center space-y-8 animate-in fade-in zoom-in-95 duration-700">
        <div className="w-40 h-40 bg-[#EA6F23]/10 rounded-full flex items-center justify-center mx-auto text-[#EA6F23]/40 text-6xl">
          <i className="fas fa-book-open"></i>
        </div>
        <div className="space-y-4">
          <h2 className="text-4xl font-header font-bold" style={{ color: 'var(--text-main)' }}>你的图书馆空空如也</h2>
          <p className="text-lg opacity-60 max-w-md mx-auto">你还没有编织过任何梦想！今天就开始你的第一段神奇旅程吧。</p>
        </div>
        <button
          onClick={onNewProject}
          className="btn-candy px-12 py-5 text-white rounded-3xl font-header font-bold text-xl transition-all hover:-translate-y-1 flex items-center gap-3 mx-auto"
        >
          开始新故事
          <i className="fas fa-plus"></i>
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-12 animate-in fade-in duration-500">
      <div className="flex justify-between items-center px-2">
        <div>
          <h2 className="text-3xl md:text-4xl font-header font-bold" style={{ color: 'var(--text-main)' }}>我的梦想图书馆</h2>
          <p className="opacity-50 font-medium text-sm">这里收藏了你所有的独特冒险。</p>
        </div>
        <button
          onClick={onNewProject}
          className="btn-candy px-6 py-3 text-white rounded-2xl font-bold transition-all flex items-center gap-2 shadow-lg hover:scale-105 active:scale-95"
        >
          <i className="fas fa-plus"></i>
          制作新绘本
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 pb-20">
        {history.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)).map((book) => {
          return (
            <div 
              key={book.id} 
              className="card-dynamic rounded-[3rem] overflow-hidden group hover:-translate-y-2 flex flex-col transition-all duration-300"
            >
              {/* 封面区域：强制 1:1 比例 */}
              <div 
                className="relative aspect-square bg-[#F5F1E9] cursor-pointer overflow-hidden"
                onClick={() => onSelect({ ...book, currentStep: 'press' })}
              >
                {book.pages[0]?.imageUrl ? (
                  <img 
                    src={book.pages[0].imageUrl} 
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" 
                    alt={book.title} 
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center p-8 bg-gradient-to-br from-[#F5F1E9] to-white/20">
                     <div className="w-20 h-20 bg-white/80 rounded-full flex items-center justify-center shadow-sm mb-4">
                        <i className="fas fa-star text-[#EA6F23] text-3xl animate-pulse"></i>
                     </div>
                     <p className="text-[#EA6F23] font-bold text-sm tracking-widest opacity-40">正在编织梦境...</p>
                  </div>
                )}
                
                {/* 删除按钮 - 位于原右上角草稿标签位置 */}
                <button 
                   onClick={(e) => { e.stopPropagation(); if(confirm("确定要删除这本绘本吗？")) onDelete(book.id); }}
                   className="absolute top-5 right-5 w-10 h-10 bg-white/30 backdrop-blur-md text-red-500 rounded-full flex items-center justify-center shadow-xl border border-white/20 z-20 hover:bg-red-500 hover:text-white transition-all transform hover:scale-110 active:scale-90"
                   title="删除作品"
                >
                   <i className="fas fa-trash-alt text-sm"></i>
                </button>

                <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
              </div>

              {/* 信息与操作区 */}
              <div className="p-8 space-y-6 bg-white">
                <div className="space-y-1">
                  <h3 className="text-2xl font-bold font-header line-clamp-1" style={{ color: 'var(--text-main)' }}>{book.title || "未命名故事"}</h3>
                  <div className="flex items-center gap-2 text-xs font-bold text-[#EA6F23] uppercase tracking-widest opacity-60">
                    <i className="fas fa-magic text-[10px]"></i>
                    {book.visualStyle?.split(' ')[0] || "艺术"} • {book.pages?.length || 0} 页
                  </div>
                </div>

                {/* 底部按钮重构为三等分对称布局 */}
                <div className="grid grid-cols-3 gap-3">
                  {/* 编辑 */}
                  <button 
                    onClick={() => onSelect({ ...book, currentStep: 'director' })}
                    className="py-4 bg-gray-50 text-gray-400 rounded-2xl hover:bg-gray-100 transition-all flex flex-col items-center justify-center gap-1.5 border border-gray-100"
                  >
                    <i className="fas fa-pen text-xs"></i>
                    <span className="text-[10px] font-black tracking-widest">编辑</span>
                  </button>

                  {/* 阅读 */}
                  <button 
                    onClick={() => onSelect({ ...book, currentStep: 'press' })}
                    className="py-4 bg-[#EA6F23] text-white rounded-2xl shadow-lg hover:bg-[#EA6F23]/90 hover:-translate-y-0.5 transition-all flex flex-col items-center justify-center gap-1.5"
                  >
                    <i className="fas fa-eye text-xs"></i>
                    <span className="text-[10px] font-black tracking-widest">阅读</span>
                  </button>

                  {/* 订购 */}
                  <button 
                    onClick={() => onSelect({ ...book, currentStep: 'press' })}
                    className="py-4 bg-yellow-400 text-yellow-900 rounded-2xl shadow-xl border-2 border-yellow-200 hover:bg-yellow-300 hover:-translate-y-0.5 transition-all flex flex-col items-center justify-center gap-1.5"
                  >
                    <i className="fas fa-gift text-xs"></i>
                    <span className="text-[10px] font-black tracking-widest">订购</span>
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default BookLibrary;
