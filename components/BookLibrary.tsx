
import React from 'react';
import { BookProject } from '../types';

interface Props {
  history: BookProject[];
  onSelect: (book: BookProject) => void;
  onDelete: (id: string) => void;
  onNewProject: () => void;
}

const BookLibrary: React.FC<Props> = ({ history, onSelect, onDelete, onNewProject }) => {
  
  const getStatus = (book: BookProject) => {
    if (book.isPaid) return { label: '已购', color: 'bg-yellow-400', icon: 'fa-crown', text: 'text-white' };
    const isComplete = book.pages.length > 0 && book.pages.every(p => !!p.imageUrl);
    if (isComplete) return { label: '已完成', color: 'bg-green-500', icon: 'fa-check', text: 'text-white' };
    return { label: '草稿', color: 'bg-gray-400/80', icon: 'fa-pencil-alt', text: 'text-white' };
  };

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
          <p className="opacity-50 font-medium">这里收藏了你所有的独特冒险。</p>
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
          const status = getStatus(book);
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
                
                {/* 状态胶囊标签 - 仅显示，非按键 */}
                <div className={`absolute top-5 right-5 ${status.color} ${status.text} px-4 py-1.5 rounded-full flex items-center gap-2 shadow-xl backdrop-blur-md z-10 border border-white/20`}>
                   <i className={`fas ${status.icon} text-[10px]`}></i>
                   <span className="text-[10px] font-black uppercase tracking-widest">{status.label}</span>
                </div>

                <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
              </div>

              {/* 信息与操作区 */}
              <div className="p-8 space-y-6">
                <div className="space-y-1">
                  <h3 className="text-2xl font-bold font-header line-clamp-1" style={{ color: 'var(--text-main)' }}>{book.title || "未命名故事"}</h3>
                  <div className="flex items-center gap-2 text-xs font-bold text-[#EA6F23] uppercase tracking-widest opacity-60">
                    <i className="fas fa-magic text-[10px]"></i>
                    {book.visualStyle?.split(' ')[0] || "艺术"} • {book.pages?.length || 0} 页
                  </div>
                </div>

                <div className="grid grid-cols-12 gap-3">
                  {/* 编辑 - 次要操作 */}
                  <div className="col-span-3">
                    <button 
                      onClick={() => onSelect({ ...book, currentStep: 'director' })}
                      className="w-full py-3.5 bg-gray-50 text-gray-400 rounded-2xl hover:bg-gray-100 transition-all flex flex-col items-center justify-center gap-1 border border-gray-100"
                    >
                      <i className="fas fa-pen text-[10px]"></i>
                      <span className="text-[9px] font-black">编辑</span>
                    </button>
                  </div>

                  {/* 删除 - 此处即为原“草稿”按键位，改为垃圾桶 */}
                  <div className="col-span-2">
                    <button 
                      onClick={(e) => { e.stopPropagation(); if(confirm("确定要删除这本绘本吗？")) onDelete(book.id); }}
                      className="w-full h-full bg-red-50 text-red-300 rounded-2xl hover:bg-red-500 hover:text-white transition-all flex items-center justify-center"
                      title="删除作品"
                    >
                      <i className="fas fa-trash-alt text-sm"></i>
                    </button>
                  </div>

                  {/* 阅读 - 核心操作 */}
                  <div className="col-span-3">
                    <button 
                      onClick={() => onSelect({ ...book, currentStep: 'press' })}
                      className="w-full py-3.5 bg-[#EA6F23] text-white rounded-2xl shadow-lg hover:bg-[#EA6F23]/90 hover:-translate-y-0.5 transition-all flex flex-col items-center justify-center gap-1"
                    >
                      <i className="fas fa-eye text-[10px]"></i>
                      <span className="text-[9px] font-black">阅读</span>
                    </button>
                  </div>

                  {/* 订购 - 转化操作 */}
                  <div className="col-span-4">
                    <button 
                      onClick={() => onSelect({ ...book, currentStep: 'press' })}
                      className="w-full py-3.5 bg-yellow-400 text-yellow-900 rounded-2xl shadow-xl border-2 border-yellow-200 hover:bg-yellow-300 hover:-translate-y-0.5 transition-all flex flex-col items-center justify-center gap-1"
                    >
                      <i className="fas fa-gift text-[10px]"></i>
                      <span className="text-[9px] font-black">订购</span>
                    </button>
                  </div>
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
