import React, { useRef, useState } from 'react';
import { SOPStep, StepActionHandler, StepUpdateHandler } from '../types.ts';
import { generateStepDescription } from '../services/geminiService.ts';
import { Trash2, Upload, Sparkles, Loader2, ImagePlus, AlertCircle, XCircle } from 'lucide-react';

interface StepCardProps {
  step: SOPStep;
  index: number;
  onUpdate: StepUpdateHandler;
  onDelete: StepActionHandler;
  isAIEnabled: boolean;
}

export const StepCard: React.FC<StepCardProps> = ({ step, index, onUpdate, onDelete, isAIEnabled }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const processFile = async (file: File) => {
    setUploadError(null);
    
    if (!file.type.startsWith('image/')) {
      setUploadError("不支援的文件類型。請上傳圖片。");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setUploadError("圖片太大。請選擇小於 10MB 的檔案。");
      return;
    }

    const imageUrl = URL.createObjectURL(file);
    onUpdate(step.id, { imageUrl, isAnalyzing: isAIEnabled });

    if (isAIEnabled) {
      try {
        const description = await generateStepDescription(file);
        onUpdate(step.id, { description, isAnalyzing: false });
      } catch (error) {
        onUpdate(step.id, { isAnalyzing: false });
        setUploadError("AI 分析失敗。請檢查網路或手動輸入。");
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    e.target.value = '';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!step.isAnalyzing) setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (step.isAnalyzing) return;
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  const handleRegenerateDescription = async () => {
    if (!step.imageUrl || !isAIEnabled) return;
    setUploadError(null);
    try {
      onUpdate(step.id, { isAnalyzing: true });
      const response = await fetch(step.imageUrl);
      const blob = await response.blob();
      const file = new File([blob], "image.jpg", { type: blob.type });
      const description = await generateStepDescription(file);
      onUpdate(step.id, { description, isAnalyzing: false });
    } catch (e) {
      onUpdate(step.id, { isAnalyzing: false });
      setUploadError("重新生成失敗。請檢查網路。");
    }
  };

  return (
    <div className="group relative bg-white border border-slate-200 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 flex flex-col page-break-inside-avoid break-inside-avoid print:border-gray-300 print:shadow-none">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-slate-100 bg-slate-50/80 rounded-t-xl print:bg-gray-100 print:border-gray-300 print:p-2">
        <div className="flex items-center gap-2">
          <span className="flex items-center justify-center w-7 h-7 rounded-full bg-brand-600 text-white font-bold text-xs">
            {index + 1}
          </span>
          <span className="text-sm font-semibold text-slate-600">Step {index + 1}</span>
        </div>
        <div className="flex items-center gap-1 no-print opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={() => onDelete(step.id)} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg" title="刪除步驟">
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      {/* Image Area */}
      <div 
        className={`relative w-full overflow-hidden flex items-center justify-center transition-all duration-200 aspect-[4/3]
          ${isDragging ? 'bg-brand-50 border-2 border-dashed border-brand-300' : 'bg-slate-100'}
        `}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {step.imageUrl ? (
          <>
            <img src={step.imageUrl} className="w-full h-full object-cover print:w-[9cm] print:h-auto print:mx-auto" />
            <div className="absolute inset-0 bg-black/0 hover:bg-black/10 transition-colors flex items-center justify-center no-print group/image">
              <button onClick={() => fileInputRef.current?.click()} className="opacity-0 group-hover/image:opacity-100 bg-white/95 text-slate-700 px-4 py-2 rounded-full text-xs font-bold shadow-lg hover:bg-white flex items-center gap-2 transform translate-y-2 group-hover/image:translate-y-0 transition-all">
                <ImagePlus size={14} /> 更換圖片
              </button>
            </div>
          </>
        ) : (
          <div onClick={() => fileInputRef.current?.click()} className="w-full h-full flex flex-col items-center justify-center cursor-pointer text-slate-400 hover:text-brand-600 gap-3 p-4 transition-colors">
            <div className="p-4 bg-white rounded-full shadow-sm group-hover:scale-110 transition-transform"><Upload size={24} /></div>
            <div className="text-center">
              <p className="text-sm font-bold">點擊或拖放圖片</p>
              <p className="text-[10px] uppercase mt-1">Supports JPG, PNG</p>
            </div>
          </div>
        )}
        <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />
        
        {step.isAnalyzing && (
          <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center z-20">
            <Loader2 className="animate-spin text-brand-600 mb-2" size={32} />
            <span className="text-xs font-bold text-brand-600">AI 分析中...</span>
          </div>
        )}
      </div>

      {/* Description */}
      <div className="p-3 flex-1 flex flex-col gap-2">
        <div className="flex justify-between items-center no-print">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">操作說明</label>
          {isAIEnabled && step.imageUrl && (
            <button onClick={handleRegenerateDescription} disabled={step.isAnalyzing} className="text-xs flex items-center gap-1 text-brand-600 hover:bg-brand-50 px-2 py-1 rounded-lg font-bold transition-all">
              <Sparkles size={12} /> AI 寫作
            </button>
          )}
        </div>
        
        <textarea
          value={step.description}
          onChange={(e) => onUpdate(step.id, { description: e.target.value })}
          placeholder={isAIEnabled ? "上傳圖片後 AI 將自動生成說明..." : "手動輸入操作步驟說明..."}
          className="w-full flex-1 min-h-[100px] text-sm text-slate-800 p-3 border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none resize-none transition-all print:hidden"
        />
        <div className="hidden print:block text-sm text-black whitespace-pre-wrap leading-relaxed px-1">
          {step.description || "尚未輸入說明。"}
        </div>
      </div>

      {uploadError && (
        <div className="absolute bottom-2 left-2 right-2 z-30 animate-in fade-in slide-in-from-bottom-2">
          <div className="bg-red-50 border border-red-100 text-red-600 px-3 py-2 rounded-lg text-xs flex items-center justify-between shadow-lg">
            <div className="flex items-center gap-2 font-medium">
              <AlertCircle size={14} /> {uploadError}
            </div>
            <button onClick={() => setUploadError(null)} className="text-red-400 hover:text-red-600 p-1"><XCircle size={14} /></button>
          </div>
        </div>
      )}
    </div>
  );
};