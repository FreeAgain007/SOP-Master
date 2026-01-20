import React, { useRef } from 'react';
import { SOPStep, StepActionHandler, StepUpdateHandler } from '../types';
import { generateStepDescription } from '../services/geminiService';
import { Trash2, Upload, Sparkles, Loader2, GripVertical, ImagePlus } from 'lucide-react';

interface StepCardProps {
  step: SOPStep;
  index: number;
  onUpdate: StepUpdateHandler;
  onDelete: StepActionHandler;
}

export const StepCard: React.FC<StepCardProps> = ({ step, index, onUpdate, onDelete }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const imageUrl = URL.createObjectURL(file);
      onUpdate(step.id, { imageUrl, isAnalyzing: true });

      // Automatically trigger AI description
      try {
        const description = await generateStepDescription(file);
        onUpdate(step.id, { description, isAnalyzing: false });
      } catch (error) {
        onUpdate(step.id, { isAnalyzing: false });
      }
    }
  };

  const handleRegenerateDescription = async () => {
    if (!step.imageUrl) return;
    
    // We need the original file to re-upload to Gemini. 
    // Since we are using object URLs, we can't easily get the File object back without storing it.
    // However, for this simplified demo, we assume the user just uploaded it or we accept that re-generation 
    // might require re-uploading if we don't persist the File object. 
    // To keep it robust, let's just use the current image URL if it's a blob URL, fetch it to get blob.
    
    try {
      onUpdate(step.id, { isAnalyzing: true });
      const response = await fetch(step.imageUrl);
      const blob = await response.blob();
      const file = new File([blob], "image.jpg", { type: blob.type });
      
      const description = await generateStepDescription(file);
      onUpdate(step.id, { description, isAnalyzing: false });
    } catch (e) {
      console.error("Failed to regenerate", e);
      onUpdate(step.id, { isAnalyzing: false });
    }
  };

  return (
    <div className="group relative bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-all duration-200 flex flex-col page-break-inside-avoid print:border-gray-300 print:shadow-none print:break-inside-avoid">
      {/* Header / Numbering */}
      <div className="flex items-center justify-between p-3 border-b border-gray-100 bg-gray-50 rounded-t-lg print:bg-gray-100 print:border-gray-300">
        <div className="flex items-center gap-2">
          <span className="flex items-center justify-center w-8 h-8 rounded-full bg-brand-600 text-white font-bold text-sm print:bg-black print:text-white">
            {index + 1}
          </span>
          <span className="text-sm font-medium text-gray-500 print:text-black">步驟 {index + 1}</span>
        </div>
        
        {/* Actions - Hidden in Print */}
        <div className="flex items-center gap-1 no-print opacity-0 group-hover:opacity-100 transition-opacity">
          <button 
            type="button"
            onClick={() => onDelete(step.id)}
            className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors"
            title="刪除步驟"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      {/* Image Area */}
      <div className="relative aspect-[4/3] w-full bg-gray-100 border-b border-gray-100 overflow-hidden flex items-center justify-center print:border-gray-300">
        {step.imageUrl ? (
          <>
            <img 
              src={step.imageUrl} 
              alt={`Step ${index + 1}`} 
              className="w-full h-full object-cover"
            />
            {/* Overlay Actions for Image - Hidden in Print */}
            <div className="absolute inset-0 bg-black/0 hover:bg-black/10 transition-colors flex items-center justify-center gap-2 no-print group/image">
               <button 
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="opacity-0 group-hover/image:opacity-100 bg-white/90 text-gray-700 px-3 py-1.5 rounded-full text-xs font-medium shadow-sm hover:bg-white flex items-center gap-1.5 transform translate-y-2 group-hover/image:translate-y-0 transition-all"
              >
                <ImagePlus size={14} />
                更換圖片
              </button>
            </div>
          </>
        ) : (
          <div 
            onClick={() => fileInputRef.current?.click()}
            className="w-full h-full flex flex-col items-center justify-center cursor-pointer hover:bg-gray-200 transition-colors text-gray-400 hover:text-gray-500 gap-2"
          >
            <Upload size={32} />
            <span className="text-sm">點擊上傳圖片</span>
          </div>
        )}
        <input 
          type="file" 
          ref={fileInputRef}
          onChange={handleFileChange}
          accept="image/*"
          className="hidden" 
        />
        
        {/* Loading Overlay */}
        {step.isAnalyzing && (
          <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center z-10">
            <Loader2 className="animate-spin text-brand-600 mb-2" size={32} />
            <span className="text-xs font-medium text-brand-600 animate-pulse">AI 分析中...</span>
          </div>
        )}
      </div>

      {/* Description Area */}
      <div className="p-3 flex-1 flex flex-col">
        <div className="flex justify-between items-center mb-1 no-print">
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">操作說明</label>
          {step.imageUrl && (
            <button 
              type="button"
              onClick={handleRegenerateDescription}
              disabled={step.isAnalyzing}
              className="text-xs flex items-center gap-1 text-brand-600 hover:text-brand-700 hover:bg-brand-50 px-2 py-1 rounded transition-colors disabled:opacity-50"
              title="使用 AI 重新生成描述"
            >
              <Sparkles size={12} />
              AI 寫作
            </button>
          )}
        </div>
        <textarea
          value={step.description}
          onChange={(e) => onUpdate(step.id, { description: e.target.value })}
          placeholder={step.imageUrl ? "請輸入此步驟的具體操作說明..." : "請先上傳圖片..."}
          className="w-full h-full min-h-[80px] text-sm text-black p-2 border border-gray-200 rounded focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none resize-none bg-white print:border-none print:p-0 print:resize-none print:text-black"
        />
      </div>
    </div>
  );
};