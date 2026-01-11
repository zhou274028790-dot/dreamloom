
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
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-4xl font-header font-bold" style={{ color: 'var(--text-main)' }}>我的梦想图书馆</h2>
          <p className="opacity-50 font-medium">这里收藏了你所有的独特冒险。</p>
        </div>
        <button
          onClick={onNewProject}
          className="btn-candy px-6 py-3 text-white rounded-2xl font-bold transition-all flex items-center gap-2"
        >
          <i className="fas fa-plus"></i>
          制作新绘本
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
        {history.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)).map((book) => (
          <div 
            key={book.id} 
            className="card-dynamic rounded-[2.5rem] overflow-hidden group hover:-translate-y-2 flex flex-col"
          >
            <div 
              className="relative aspect-[3/4] bg-[var(--text-main)]/5 cursor-pointer overflow-hidden"
              onClick={() => onSelect({ ...book, currentStep: 'press' })}
            >
              {book.pages[0]?.imageUrl ? (
                <img 
                  src={book.pages[0].imageUrl} 
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" 
                  alt={book.title} 
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center opacity-10 text-6xl italic font-header">
                   {book.title?.charAt(0) || "梦"}
                </div>
              )}
              
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-8">
                <button className="w-full py-3 bg-white text-orange-600 rounded-xl font-bold shadow-lg">
                  打开绘本
                </button>
              </div>

              <div className="absolute top-4 right-4 flex gap-2">
                <button 
                  onClick={(e) => { e.stopPropagation(); if(confirm("确定要删除这本绘本吗？")) onDelete(book.id); }}
                  className="w-10 h-10 bg-[var(--card-bg)]/90 backdrop-blur rounded-full flex items-center justify-center text-red-500 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500 hover:text-white"
                >
                  <i className="fas fa-trash-alt"></i>
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div className="space-y-1">
                <h3 className="text-xl font-bold font-header line-clamp-1" style={{ color: 'var(--text-main)' }}>{book.title || "未命名故事"}</h3>
                <div className="flex items-center gap-2 text-xs font-bold text-[#EA6F23] uppercase tracking-widest">
                  <i className="fas fa-magic text-[10px]"></i>
                  {book.visualStyle?.split(' ')[0] || "艺术"} • {book.pages?.length || 0} 页
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                 <button 
                  onClick={() => onSelect({ ...book, currentStep: 'director' })}
                  className="py-2.5 text-xs font-bold bg-blue-500/10 text-blue-500 rounded-xl hover:bg-blue-500 hover:text-white transition-all flex flex-col items-center gap-1"
                >
                  <i className="fas fa-edit"></i>
                  编辑
                </button>
                 <button 
                  onClick={() => onSelect({ ...book, currentStep: 'press' })}
                  className="py-2.5 text-xs font-bold bg-[#EA6F23]/10 text-[#EA6F23] rounded-xl hover:bg-[#EA6F23] hover:text-white transition-all flex flex-col items-center gap-1"
                >
                  <i className="fas fa-eye"></i>
                  阅读
                </button>
                <button 
                  onClick={() => onSelect({ ...book, currentStep: 'press' })}
                  className="py-2.5 text-xs font-bold bg-green-500/10 text-green-500 rounded-xl hover:bg-green-500 hover:text-white transition-all flex flex-col items-center gap-1"
                >
                  <i className="fas fa-print"></i>
                  订购
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default BookLibrary;
