import React, { useRef, useState } from 'react';
import { SOPStep, StepActionHandler, StepUpdateHandler } from '../types';
import { generateStepDescription } from '../services/geminiService';
import { Trash2, Upload, Sparkles, Loader2, GripVertical, ImagePlus, AlertCircle, XCircle } from 'lucide-react';

interface StepCardProps {
  step: SOPStep;
  index: number;
  onUpdate: StepUpdateHandler;
  onDelete: StepActionHandler;
}

export const StepCard: React.FC<StepCardProps> = ({ step, index, onUpdate, onDelete }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const processFile = async (file: File) => {
    setUploadError(null);
    
    // Validate file type
    if (!file.type.startsWith('image/')) {
      setUploadError("Unsupported file type. Please upload an image (JPG, PNG, etc).");
      return;
    }

    // Validate file size (e.g. 10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      setUploadError("Image too large. Please use a file smaller than 10MB.");
      return;
    }

    const imageUrl = URL.createObjectURL(file);
    onUpdate(step.id, { imageUrl, isAnalyzing: true });

    // Automatically trigger AI description
    try {
      const description = await generateStepDescription(file);
      onUpdate(step.id, { description, isAnalyzing: false });
    } catch (error) {
      onUpdate(step.id, { isAnalyzing: false });
      setUploadError("AI Analysis failed. Please check connection.");
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
    // Reset input value to allow selecting the same file again
    e.target.value = '';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!step.isAnalyzing) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Check if we're actually leaving the container (and not just entering a child element)
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    if (step.isAnalyzing) return;

    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleRegenerateDescription = async () => {
    if (!step.imageUrl) return;
    setUploadError(null);
    
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
      setUploadError("Failed to regenerate description. Please try again later.");
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
          <span className="text-sm font-medium text-gray-500 print:text-black">Step {index + 1}</span>
        </div>
        
        {/* Actions - Hidden in Print */}
        <div className="flex items-center gap-1 no-print opacity-0 group-hover:opacity-100 transition-opacity">
          <button 
            type="button"
            onClick={() => onDelete(step.id)}
            className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors"
            title="Delete Step"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      {/* Image Area with Drag & Drop */}
      <div 
        className={`relative aspect-[4/3] w-full overflow-hidden flex items-center justify-center transition-all duration-200
          ${isDragging 
            ? 'bg-brand-50 border-2 border-dashed border-brand-400 z-10' 
            : 'bg-gray-100 border-b border-gray-100 print:border-gray-300'
          }
        `}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {step.imageUrl ? (
          <>
            <img 
              src={step.imageUrl} 
              alt={`Step ${index + 1}`} 
              className={`w-full h-full object-cover transition-opacity duration-200 ${isDragging ? 'opacity-40' : 'opacity-100'}`}
            />
            {/* Overlay Actions for Image - Hidden in Print */}
            {!isDragging && (
              <div className="absolute inset-0 bg-black/0 hover:bg-black/10 transition-colors flex items-center justify-center gap-2 no-print group/image">
                <button 
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="opacity-0 group-hover/image:opacity-100 bg-white/90 text-gray-700 px-3 py-1.5 rounded-full text-xs font-medium shadow-sm hover:bg-white flex items-center gap-1.5 transform translate-y-2 group-hover/image:translate-y-0 transition-all"
                >
                  <ImagePlus size={14} />
                  Change Image
                </button>
              </div>
            )}
          </>
        ) : (
          <div 
            onClick={() => fileInputRef.current?.click()}
            className="w-full h-full flex flex-col items-center justify-center cursor-pointer text-gray-400 hover:text-brand-500 gap-3 p-4 text-center transition-colors"
          >
            {isDragging ? (
              <>
                <div className="p-3 bg-brand-100 text-brand-600 rounded-full animate-bounce">
                  <Upload size={32} />
                </div>
                <span className="text-sm font-medium text-brand-600">Drop to upload</span>
              </>
            ) : (
              <>
                <div className="p-3 bg-white rounded-full shadow-sm group-hover:scale-110 transition-transform">
                  <Upload size={24} />
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-sm font-medium text-gray-600">Click or Drag Image</span>
                  <span className="text-xs text-gray-400">JPG, PNG supported</span>
                </div>
              </>
            )}
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
          <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center z-20">
            <Loader2 className="animate-spin text-brand-600 mb-2" size={32} />
            <span className="text-xs font-medium text-brand-600 animate-pulse">AI Analyzing...</span>
          </div>
        )}

        {/* Error Feedback Overlay */}
        {uploadError && (
          <div className="absolute inset-x-4 bottom-4 z-30 animate-in slide-in-from-bottom-2 fade-in">
            <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-xs flex items-center justify-between shadow-sm">
               <div className="flex items-center gap-2">
                 <AlertCircle size={14} className="shrink-0" />
                 <span>{uploadError}</span>
               </div>
               <button 
                 type="button"
                 onClick={(e) => { e.stopPropagation(); setUploadError(null); }} 
                 className="text-red-500 hover:text-red-700 p-1 hover:bg-red-100 rounded"
               >
                 <XCircle size={14} />
               </button>
            </div>
          </div>
        )}
      </div>

      {/* Description Area */}
      <div className="p-3 flex-1 flex flex-col">
        <div className="flex justify-between items-center mb-1 no-print">
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Description</label>
          {step.imageUrl && (
            <button 
              type="button"
              onClick={handleRegenerateDescription}
              disabled={step.isAnalyzing}
              className="text-xs flex items-center gap-1 text-brand-600 hover:text-brand-700 hover:bg-brand-50 px-2 py-1 rounded transition-colors disabled:opacity-50"
              title="Regenerate with AI"
            >
              <Sparkles size={12} />
              AI Write
            </button>
          )}
        </div>
        <textarea
          value={step.description}
          onChange={(e) => onUpdate(step.id, { description: e.target.value })}
          placeholder={step.imageUrl ? "Enter specific operation instructions..." : "Please upload an image first..."}
          className="w-full h-full min-h-[80px] text-sm text-black p-2 border border-gray-200 rounded focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none resize-none bg-white print:border-none print:p-0 print:resize-none print:text-black"
        />
      </div>
    </div>
  );
};