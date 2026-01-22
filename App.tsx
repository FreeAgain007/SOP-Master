import React, { useState, useEffect } from 'react';
import { Plus, Printer, FileText, Package, HelpCircle, X, Trash2, Wifi, WifiOff, RotateCcw, Cpu } from 'lucide-react';
import { SOPStep, SOPDocument } from './types';
import { StepCard } from './components/StepCard';

const generateId = () => Math.random().toString(36).substr(2, 9);

const App: React.FC = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  
  // AI Toggle State (Manual)
  const [useAI, setUseAI] = useState(() => {
    const saved = localStorage.getItem('sop_use_ai');
    return saved ? JSON.parse(saved) : true;
  });

  // Load initial data from LocalStorage
  const [docInfo, setDocInfo] = useState<SOPDocument>(() => {
    const saved = localStorage.getItem('sop_doc_info');
    return saved ? JSON.parse(saved) : {
      title: 'Product Packaging SOP',
      designer: '',
      date: new Date().toISOString().split('T')[0],
      version: '1.0',
      model: ''
    };
  });

  const [steps, setSteps] = useState<SOPStep[]>(() => {
    const saved = localStorage.getItem('sop_steps');
    return saved ? JSON.parse(saved) : [
      { id: generateId(), imageUrl: null, description: '', isAnalyzing: false },
      { id: generateId(), imageUrl: null, description: '', isAnalyzing: false },
    ];
  });

  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // Sync with LocalStorage
  useEffect(() => {
    localStorage.setItem('sop_doc_info', JSON.stringify(docInfo));
  }, [docInfo]);

  useEffect(() => {
    localStorage.setItem('sop_steps', JSON.stringify(steps));
  }, [steps]);

  useEffect(() => {
    localStorage.setItem('sop_use_ai', JSON.stringify(useAI));
  }, [useAI]);

  // Handle real network status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const addStep = () => {
    setSteps(prev => [...prev, { id: generateId(), imageUrl: null, description: '', isAnalyzing: false }]);
  };

  const updateStep = (id: string, updates: Partial<SOPStep>) => {
    setSteps(prev => prev.map(step => step.id === id ? { ...step, ...updates } : step));
  };

  const deleteStep = (id: string) => {
    if (window.confirm('確定要刪除此步驟嗎？')) {
      setSteps(prev => prev.filter(step => step.id !== id));
    }
  };

  const clearAllData = () => {
    if (window.confirm('確定要清空所有資料並開始新文件嗎？')) {
      setDocInfo({
        title: 'New Product SOP',
        designer: '',
        date: new Date().toISOString().split('T')[0],
        version: '1.0',
        model: ''
      });
      setSteps([
        { id: generateId(), imageUrl: null, description: '', isAnalyzing: false },
        { id: generateId(), imageUrl: null, description: '', isAnalyzing: false },
      ]);
      localStorage.removeItem('sop_doc_info');
      localStorage.removeItem('sop_steps');
    }
  };

  const handlePrint = () => {
    const originalTitle = document.title;
    document.title = docInfo.title || 'SOP_Document';
    window.print();
    setTimeout(() => { document.title = originalTitle; }, 500);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'p') {
        e.preventDefault();
        handlePrint();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [docInfo.title]);

  const processImageForExport = (imageUrl: string): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = "Anonymous";
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const targetWidth = 1200;
        const scale = targetWidth / img.width;
        const targetHeight = img.height * scale;
        canvas.width = targetWidth;
        canvas.height = targetHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) { resolve(''); return; }
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, targetWidth, targetHeight);
        ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
        resolve(canvas.toDataURL('image/jpeg', 0.90));
      };
      img.onerror = () => resolve('');
      img.src = imageUrl;
    });
  };

  const handleExportWord = async () => {
    if (isExporting) return;
    setIsExporting(true);
    try {
      const stepsData = await Promise.all(steps.map(async (step, index) => {
        let imgBase64 = '';
        if (step.imageUrl) {
          try { imgBase64 = await processImageForExport(step.imageUrl); } catch (e) { console.error(e); }
        }
        return { ...step, imgBase64, index: index + 1 };
      }));

      const tableRows = stepsData.reduce((acc, step, index) => {
        if (index % 2 === 0) acc.push([step]);
        else acc[acc.length - 1].push(step);
        return acc;
      }, [] as (typeof stepsData)[]);

      const htmlContent = `
        <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
        <head><meta charset="utf-8"><style>
            @page { size: 21cm 29.7cm; margin: 1.27cm; mso-page-orientation: portrait; }
            body { font-family: Arial, sans-serif; font-size: 11pt; }
            table.layout-grid { width: 100%; border-collapse: collapse; table-layout: fixed; }
            td.step-cell { width: 50%; vertical-align: top; padding: 4px; border: 1px solid #ddd; background-color: #ffffff; }
            .card-header { background-color: #f9fafb; border-bottom: 1px solid #eee; padding: 6px; margin-bottom: 6px; }
            .step-badge { display: inline-block; background-color: #0284c7; color: #ffffff; width: 20px; height: 20px; border-radius: 50%; text-align: center; line-height: 20px; font-weight: bold; font-size: 9pt; margin-right: 6px; }
            .image-wrapper { width: 100%; text-align: center; margin-bottom: 8px; border: 1px solid #eee; }
            .desc-text { font-size: 10.5pt; color: #111; line-height: 1.3; white-space: pre-wrap; margin-top: 4px; }
            .doc-header { text-align: center; margin-bottom: 15px; border-bottom: 2px solid #0284c7; padding-bottom: 10px; }
        </style></head>
        <body>
          <div class="doc-header">
            <h1>${docInfo.title}</h1>
            <p>Version: ${docInfo.version} | Model: ${docInfo.model} | Designer: ${docInfo.designer} | Date: ${docInfo.date}</p>
          </div>
          <table class="layout-grid">
            ${tableRows.map(row => `
              <tr>
                ${row.map(step => `
                  <td class="step-cell">
                    <div class="card-header"><span class="step-badge">${step.index}</span> Step ${step.index}</div>
                    <div class="image-wrapper">
                      ${step.imgBase64 ? `<img src="${step.imgBase64}" style="width:9cm; height:auto;" />` : 'No Image'}
                    </div>
                    <div class="desc-text">${step.description ? step.description.replace(/\n/g, '<br/>') : ''}</div>
                  </td>
                `).join('')}
                ${row.length === 1 ? '<td></td>' : ''}
              </tr>
              <tr><td colspan="2" style="height:10px"></td></tr>
            `).join('')}
          </table>
        </body></html>
      `;
      const blob = new Blob(['\ufeff', htmlContent], { type: 'application/msword' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${docInfo.title || 'sop'}.doc`;
      link.click();
    } finally { setIsExporting(false); }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <nav className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm no-print">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="bg-brand-600 p-2 rounded-lg"><Package className="text-white" size={24} /></div>
              <div>
                <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  SOP Master
                  <span className={`inline-flex items-center p-1 rounded-full ${isOnline ? 'bg-green-100' : 'bg-gray-100'}`} title={isOnline ? "真正網路連線中" : "真正網路已斷開"}>
                    {isOnline ? <Wifi size={12} className="text-green-600" /> : <WifiOff size={12} className="text-gray-400" />}
                  </span>
                </h1>
                <p className="text-[10px] text-gray-500 uppercase tracking-tight">{isOnline ? 'Online Ready' : 'System Offline'}</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              {/* AI Assistant Toggle Switch */}
              <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-full border border-slate-200">
                <Cpu size={16} className={useAI ? "text-brand-600" : "text-slate-400"} />
                <span className="text-xs font-semibold text-slate-600 hidden sm:inline">AI 助手</span>
                <button 
                  onClick={() => setUseAI(!useAI)}
                  className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${useAI ? 'bg-brand-600' : 'bg-slate-300'}`}
                >
                  <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${useAI ? 'translate-x-5' : 'translate-x-0'}`} />
                </button>
              </div>

              <div className="h-6 w-px bg-gray-200"></div>
              
              <div className="flex items-center gap-2">
                <button onClick={() => setIsHelpOpen(true)} className="p-2 text-gray-500 hover:text-brand-600 hover:bg-brand-50 rounded-md transition-colors"><HelpCircle size={20} /></button>
                <button onClick={clearAllData} className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors" title="Clear All Data"><RotateCcw size={20} /></button>
                <button onClick={handlePrint} className="inline-flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"><Printer size={18} /><span className="hidden md:inline">Print</span></button>
                <button onClick={handleExportWord} disabled={isExporting} className="inline-flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"><FileText size={18} /><span className="hidden md:inline">{isExporting ? 'Exporting...' : 'Word'}</span></button>
                <button onClick={addStep} className="inline-flex items-center gap-2 px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-brand-600 hover:bg-brand-700"><Plus size={18} /><span className="hidden sm:inline">Add Step</span></button>
              </div>
            </div>
          </div>
        </div>
      </nav>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 print:p-0">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8 print:border-none print:shadow-none print:p-0">
           {useAI && !isOnline && (
             <div className="mb-4 p-2 bg-amber-50 border border-amber-200 rounded text-xs text-amber-800 flex items-center gap-2 no-print">
               <WifiOff size={14} /> AI 助理已開啟，但偵測到實體網路斷開，自動生成功能將暫時無法使用。
             </div>
           )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 print:grid-cols-2">
            <div className="col-span-1 md:col-span-2 text-center">
              <input 
                type="text" 
                value={docInfo.title} 
                onChange={(e) => setDocInfo({...docInfo, title: e.target.value})} 
                className="w-full text-3xl font-bold text-black border border-transparent hover:border-slate-200 focus:border-brand-300 bg-slate-50/50 rounded-lg p-2 focus:ring-0 text-center transition-all" 
                placeholder="SOP Title" 
              />
            </div>
            <div className="space-y-4">
               <div className="flex items-center gap-2">
                 <span className="font-semibold w-16 text-gray-400 no-print">Version:</span>
                 <input 
                   type="text" 
                   value={docInfo.version} 
                   onChange={(e) => setDocInfo({...docInfo, version: e.target.value})} 
                   className="flex-1 border border-slate-200 rounded-lg px-3 py-1.5 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all print:border-none print:bg-transparent" 
                 />
               </div>
               <div className="flex items-center gap-2">
                 <span className="font-semibold w-16 text-gray-400 no-print">Model:</span>
                 <input 
                   type="text" 
                   value={docInfo.model} 
                   onChange={(e) => setDocInfo({...docInfo, model: e.target.value})} 
                   className="flex-1 border border-slate-200 rounded-lg px-3 py-1.5 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all print:border-none print:bg-transparent" 
                 />
               </div>
            </div>
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <span className="font-semibold w-20 text-gray-400 no-print">Designer:</span>
                <input 
                  type="text" 
                  value={docInfo.designer} 
                  onChange={(e) => setDocInfo({...docInfo, designer: e.target.value})} 
                  className="flex-1 border border-slate-200 rounded-lg px-3 py-1.5 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all print:border-none print:bg-transparent" 
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="font-semibold w-20 text-gray-400 no-print">Date:</span>
                <input 
                  type="date" 
                  value={docInfo.date} 
                  onChange={(e) => setDocInfo({...docInfo, date: e.target.value})} 
                  className="flex-1 border border-slate-200 rounded-lg px-3 py-1.5 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all print:border-none print:bg-transparent" 
                />
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 print:grid-cols-2 print:gap-2">
          {steps.map((step, index) => (
            <StepCard 
              key={step.id} 
              step={step} 
              index={index} 
              onUpdate={updateStep} 
              onDelete={deleteStep}
              isAIEnabled={useAI}
            />
          ))}
          <button onClick={addStep} className="no-print min-h-[300px] border-2 border-dashed border-slate-300 rounded-lg flex flex-col items-center justify-center text-slate-400 hover:text-brand-600 hover:bg-brand-50 hover:border-brand-300 transition-all group">
            <div className="p-4 bg-white rounded-full shadow-sm mb-2 group-hover:scale-110 transition-transform">
              <Plus size={32} />
            </div>
            <span className="font-medium">Add Step</span>
          </button>
        </div>
      </main>

      {isHelpOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm no-print">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6 relative">
            <button onClick={() => setIsHelpOpen(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"><X size={20} /></button>
            <h2 className="text-xl font-bold mb-4">使用說明</h2>
            <div className="space-y-4 text-sm text-gray-600">
              <p>1. <b>AI 助手開關：</b>右上角的切換器可控制是否使用 AI 功能。關閉時為純離線模式。</p>
              <p>2. <b>編輯區域：</b>淺藍色背景的框格皆為可編輯區域。點擊標題或版號即可修改。</p>
              <p>3. <b>自動存檔：</b>所有內容即時儲存於瀏覽器，斷網或關閉視窗不會遺失資料。</p>
              <p>4. <b>列印與導出：</b>支援直接列印為 PDF 或導出 Word 檔供後續調整。</p>
            </div>
            <button onClick={() => setIsHelpOpen(false)} className="mt-6 w-full py-2 bg-brand-600 text-white rounded-md">我知道了</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;