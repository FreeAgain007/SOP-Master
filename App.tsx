import React, { useState, useEffect, useRef } from 'react';
import { Plus, Printer, FileText, Package, HelpCircle, X, Trash2, Wifi, WifiOff, RotateCcw, Cpu, Download, FileJson, Trash } from 'lucide-react';
import { SOPStep, SOPDocument, PartInfo } from './types.ts';
import { StepCard } from './components/StepCard.tsx';

const generateId = () => Math.random().toString(36).substr(2, 9);

const App: React.FC = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [useAI, setUseAI] = useState(() => {
    const saved = localStorage.getItem('sop_use_ai');
    return saved ? JSON.parse(saved) : true;
  });

  const [docInfo, setDocInfo] = useState<SOPDocument>(() => {
    const saved = localStorage.getItem('sop_doc_info');
    return saved ? JSON.parse(saved) : {
      title: 'Product Packaging SOP',
      designer: '',
      date: new Date().toISOString().split('T')[0],
      version: '1.0',
      model: '',
      projectName: '',
      pm: '',
      productLine: '',
      parts: [{ id: generateId(), partNumber: '', partName: '', partDescription: '', quantity: '1' }]
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

  useEffect(() => {
    localStorage.setItem('sop_doc_info', JSON.stringify(docInfo));
    localStorage.setItem('sop_steps', JSON.stringify(steps));
    localStorage.setItem('sop_use_ai', JSON.stringify(useAI));
  }, [docInfo, steps, useAI]);

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

  const addStep = () => setSteps(prev => [...prev, { id: generateId(), imageUrl: null, description: '', isAnalyzing: false }]);
  const updateStep = (id: string, updates: Partial<SOPStep>) => setSteps(prev => prev.map(step => step.id === id ? { ...step, ...updates } : step));
  const deleteStep = (id: string) => { if (window.confirm('確定刪除此步驟？ Delete this step?')) setSteps(prev => prev.filter(step => step.id !== id)); };

  const addPart = () => {
    setDocInfo(prev => ({
      ...prev,
      parts: [...prev.parts, { id: generateId(), partNumber: '', partName: '', partDescription: '', quantity: '1' }]
    }));
  };

  const updatePart = (id: string, updates: Partial<PartInfo>) => {
    setDocInfo(prev => ({
      ...prev,
      parts: prev.parts.map(p => p.id === id ? { ...p, ...updates } : p)
    }));
  };

  const removePart = (id: string) => {
    if (docInfo.parts.length <= 1) return;
    setDocInfo(prev => ({
      ...prev,
      parts: prev.parts.filter(p => p.id !== id)
    }));
  };

  const handleExportJSON = async () => {
    const projectData = {
      docInfo,
      steps: await Promise.all(steps.map(async (step) => {
        if (step.imageUrl && step.imageUrl.startsWith('blob:')) {
          const response = await fetch(step.imageUrl);
          const blob = await response.blob();
          return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve({ ...step, imageData: reader.result });
            reader.readAsDataURL(blob);
          });
        }
        return step;
      }))
    };
    const blob = new Blob([JSON.stringify(projectData)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${docInfo.title || 'sop_project'}.json`;
    link.click();
  };

  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        if (data.docInfo) setDocInfo(data.docInfo);
        if (data.steps) {
          const restoredSteps = data.steps.map((s: any) => {
            if (s.imageData) {
              const byteString = atob(s.imageData.split(',')[1]);
              const mimeString = s.imageData.split(',')[0].split(':')[1].split(';')[0];
              const ab = new ArrayBuffer(byteString.length);
              const ia = new Uint8Array(ab);
              for (let i = 0; i < byteString.length; i++) ia[i] = byteString.charCodeAt(i);
              const blob = new Blob([ab], { type: mimeString });
              return { ...s, imageUrl: URL.createObjectURL(blob), imageData: undefined };
            }
            return s;
          });
          setSteps(restoredSteps);
        }
      } catch (err) { alert('導入失敗，請檢查檔案格式。 Import failed.'); }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handlePrint = () => { window.print(); };

  const handleExportWord = async () => {
    if (isExporting) return;
    setIsExporting(true);
    try {
      const stepsData = await Promise.all(steps.map(async (step, index) => {
        let imgBase64 = '';
        if (step.imageUrl) {
          const res = await fetch(step.imageUrl);
          const blob = await res.blob();
          imgBase64 = await new Promise(r => {
            const rd = new FileReader();
            rd.onloadend = () => r(rd.result as string);
            rd.readAsDataURL(blob);
          });
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
            @page { size: 21cm 29.7cm; margin: 1cm; }
            body { font-family: 'Segoe UI', Arial; font-size: 10pt; color: #333; }
            h1 { color: #0284c7; text-align: center; font-size: 18pt; margin-bottom: 5px; }
            .meta-table { width: 100%; border-collapse: collapse; margin-bottom: 15px; font-size: 8.5pt; border: 1px solid #e2e8f0; }
            .meta-table td { padding: 4px 8px; border: 1px solid #e2e8f0; }
            .label { font-weight: bold; background: #f8fafc; color: #64748b; width: 18%; }
            .steps-table { width: 100%; border-collapse: collapse; table-layout: fixed; margin-top: 10px; }
            .steps-table td { vertical-align: top; width: 50%; padding: 8px; border: 1px solid #e2e8f0; background: #ffffff; }
            .step-header { font-weight: bold; background: #f8fafc; padding: 5px; border-bottom: 1px solid #e2e8f0; color: #0369a1; }
            .step-num { color: #fff; background: #0284c7; display: inline-block; width: 18px; height: 18px; text-align: center; border-radius: 50%; margin-right: 5px; }
            .img-box { text-align: center; padding: 10px 0; }
            .desc { font-size: 9.5pt; line-height: 1.4; white-space: pre-wrap; margin-top: 8px; color: #1e293b; }
        </style></head>
        <body>
          <h1>${docInfo.title}</h1>
          <table class="meta-table">
            <tr>
              <td class="label">Model (型號)</td><td>${docInfo.model}</td>
              <td class="label">Designer (設計者)</td><td>${docInfo.designer}</td>
            </tr>
            <tr>
              <td class="label">Effective Date (日期)</td><td>${docInfo.date}</td>
              <td class="label">Version (版本)</td><td>${docInfo.version}</td>
            </tr>
            <tr>
              <td class="label">Project Name (項目名稱)</td><td>${docInfo.projectName}</td>
              <td class="label">PM (項目經理)</td><td>${docInfo.pm}</td>
            </tr>
            <tr>
              <td class="label">Product Line (產品線)</td><td colspan="3">${docInfo.productLine}</td>
            </tr>
          </table>
          
          <table class="meta-table">
            <tr style="background:#f1f5f9; font-weight:bold; text-align:center;">
              <td style="width:25%">Part Number (料號)</td>
              <td style="width:30%">Part Name (品名)</td>
              <td style="width:35%">Description (描述)</td>
              <td style="width:10%">Qty (數量)</td>
            </tr>
            ${docInfo.parts.map(p => `
            <tr>
              <td>${p.partNumber}</td>
              <td>${p.partName}</td>
              <td>${p.partDescription}</td>
              <td style="text-align:center">${p.quantity}</td>
            </tr>
            `).join('')}
          </table>

          <table class="steps-table">
            ${tableRows.map(row => `
              <tr>
                ${row.map(step => `
                  <td>
                    <div class="step-header"><span class="step-num">${step.index}</span> STEP ${step.index}</div>
                    <div class="img-box">${step.imgBase64 ? `<img src="${step.imgBase64}" width="310" />` : '[No Image]'}</div>
                    <div class="desc">${step.description || ''}</div>
                  </td>
                `).join('')}
                ${row.length === 1 ? '<td></td>' : ''}
              </tr>
            `).join('')}
          </table>
        </body></html>
      `;
      const blob = new Blob(['\ufeff', htmlContent], { type: 'application/msword' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${docInfo.title}.doc`;
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
                <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">SOP Master</h1>
                <p className="text-[10px] text-gray-400 font-mono uppercase tracking-widest">Professional SOP Builder</p>
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-4">
              <div className="hidden md:flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-full border border-slate-200">
                <Cpu size={16} className={useAI ? "text-brand-600" : "text-slate-400"} />
                <button onClick={() => setUseAI(!useAI)} className={`relative inline-flex h-5 w-10 cursor-pointer rounded-full border-2 border-transparent transition-colors ${useAI ? 'bg-brand-600' : 'bg-slate-300'}`}>
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${useAI ? 'translate-x-5' : 'translate-x-0'}`} />
                </button>
              </div>

              <div className="h-6 w-px bg-gray-200"></div>
              
              <div className="flex items-center gap-1 sm:gap-2">
                <button onClick={() => setIsHelpOpen(true)} className="p-2 text-slate-400 hover:text-brand-600 rounded-md transition-colors"><HelpCircle size={20} /></button>
                <button onClick={() => fileInputRef.current?.click()} className="p-2 text-slate-400 hover:text-brand-600 rounded-md transition-colors" title="Import Project (JSON)"><FileJson size={20} /></button>
                <button onClick={handleExportJSON} className="p-2 text-slate-400 hover:text-brand-600 rounded-md transition-colors" title="Export Project (JSON)"><Download size={20} /></button>
                <button onClick={handlePrint} className="p-2 text-slate-400 hover:text-brand-600 rounded-md transition-colors" title="Print to PDF"><Printer size={20} /></button>
                <button onClick={handleExportWord} disabled={isExporting} className="p-2 text-slate-400 hover:text-brand-600 rounded-md disabled:opacity-30 transition-colors" title="Export as Word"><FileText size={20} /></button>
                <button onClick={addStep} className="ml-2 bg-brand-600 text-white px-4 py-2 rounded-md text-sm font-bold flex items-center gap-2 hover:bg-brand-700 transition-colors shadow-sm shadow-brand-100"><Plus size={18} /><span className="hidden sm:inline">Add Step</span></button>
              </div>
            </div>
          </div>
        </div>
        <input type="file" ref={fileInputRef} onChange={handleImportJSON} accept=".json" className="hidden" />
      </nav>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 print:p-0">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 mb-8 print:border-none print:shadow-none print:p-0">
          <div className="flex flex-col items-center mb-8">
            <input 
              type="text" value={docInfo.title} 
              onChange={(e) => setDocInfo({...docInfo, title: e.target.value})} 
              className="w-full text-4xl font-black text-slate-900 border-none bg-slate-50/50 rounded-xl p-4 focus:bg-white text-center transition-all placeholder:text-slate-300" 
              placeholder="SOP Document Title" 
            />
            <div className="w-24 h-1 bg-brand-600 mt-4 rounded-full"></div>
          </div>

          <div className="space-y-8">
            {/* Metadata Row: 2-column grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Model (型號)</label>
                <input type="text" value={docInfo.model} onChange={(e) => setDocInfo({...docInfo, model: e.target.value})} className="border border-slate-200 rounded-lg px-4 py-2 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-brand-500 transition-all print:bg-transparent" placeholder="e.g. iPhone 15 Pro" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Designer (設計者)</label>
                <input type="text" value={docInfo.designer} onChange={(e) => setDocInfo({...docInfo, designer: e.target.value})} className="border border-slate-200 rounded-lg px-4 py-2 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-brand-500 transition-all print:bg-transparent" placeholder="Name" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Effective Date (日期)</label>
                <input type="date" value={docInfo.date} onChange={(e) => setDocInfo({...docInfo, date: e.target.value})} className="border border-slate-200 rounded-lg px-4 py-2 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-brand-500 transition-all print:bg-transparent" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Version (版本)</label>
                <input type="text" value={docInfo.version} onChange={(e) => setDocInfo({...docInfo, version: e.target.value})} className="border border-slate-200 rounded-lg px-4 py-2 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-brand-500 transition-all print:bg-transparent" placeholder="1.0" />
              </div>
            </div>

            {/* Project Row: 3 columns */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-slate-100">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Project Name (項目名稱)</label>
                <input type="text" value={docInfo.projectName} onChange={(e) => setDocInfo({...docInfo, projectName: e.target.value})} className="border border-slate-200 rounded-lg px-4 py-2 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-brand-500 transition-all print:bg-transparent" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">PM (項目經理)</label>
                <input type="text" value={docInfo.pm} onChange={(e) => setDocInfo({...docInfo, pm: e.target.value})} className="border border-slate-200 rounded-lg px-4 py-2 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-brand-500 transition-all print:bg-transparent" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Product Line (產品線)</label>
                <input type="text" value={docInfo.productLine} onChange={(e) => setDocInfo({...docInfo, productLine: e.target.value})} className="border border-slate-200 rounded-lg px-4 py-2 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-brand-500 transition-all print:bg-transparent" />
              </div>
            </div>

            {/* Dynamic Part Rows */}
            <div className="space-y-4 pt-4 border-t border-slate-100">
              <div className="flex items-center justify-between px-1">
                <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest">Part List (料號清單)</h3>
                <button onClick={addPart} className="no-print text-xs flex items-center gap-1 text-brand-600 hover:bg-brand-50 px-2 py-1 rounded-md font-bold transition-all">
                  <Plus size={14} /> Add Part (新增料號)
                </button>
              </div>
              
              <div className="space-y-3">
                {docInfo.parts.map((part, index) => (
                  <div key={part.id} className="grid grid-cols-1 md:grid-cols-12 gap-3 bg-slate-50/30 p-3 rounded-xl border border-slate-100 relative group/part transition-colors hover:border-slate-200">
                    <div className="md:col-span-3 flex flex-col gap-1">
                      <label className="text-[9px] font-bold text-slate-400 uppercase px-1">PN (料號) {index + 1}</label>
                      <input type="text" value={part.partNumber} onChange={(e) => updatePart(part.id, { partNumber: e.target.value })} className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:bg-white focus:ring-2 focus:ring-brand-500 transition-all" placeholder="P/N-001" />
                    </div>
                    <div className="md:col-span-3 flex flex-col gap-1">
                      <label className="text-[9px] font-bold text-slate-400 uppercase px-1">Part Name (品名)</label>
                      <input type="text" value={part.partName} onChange={(e) => updatePart(part.id, { partName: e.target.value })} className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:bg-white focus:ring-2 focus:ring-brand-500 transition-all" placeholder="Carton Box" />
                    </div>
                    <div className="md:col-span-4 flex flex-col gap-1">
                      <label className="text-[9px] font-bold text-slate-400 uppercase px-1">Description (描述)</label>
                      <input type="text" value={part.partDescription} onChange={(e) => updatePart(part.id, { partDescription: e.target.value })} className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:bg-white focus:ring-2 focus:ring-brand-500 transition-all" placeholder="Corrugated Paper, Brown" />
                    </div>
                    <div className="md:col-span-1 flex flex-col gap-1">
                      <label className="text-[9px] font-bold text-slate-400 uppercase px-1">Qty (數量)</label>
                      <input type="text" value={part.quantity} onChange={(e) => updatePart(part.id, { quantity: e.target.value })} className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:bg-white focus:ring-2 focus:ring-brand-500 transition-all text-center" placeholder="1" />
                    </div>
                    <div className="md:col-span-1 flex items-end justify-center pb-1">
                      <button 
                        onClick={() => removePart(part.id)} 
                        disabled={docInfo.parts.length <= 1}
                        className="p-2 text-slate-300 hover:text-red-500 disabled:opacity-0 transition-all no-print"
                        title="Remove Part"
                      >
                        <Trash size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 print:grid-cols-2 print:gap-4">
          {steps.map((step, index) => (
            <StepCard key={step.id} step={step} index={index} onUpdate={updateStep} onDelete={deleteStep} isAIEnabled={useAI && isOnline} />
          ))}
          <button onClick={addStep} className="no-print min-h-[400px] border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center text-slate-300 hover:text-brand-600 hover:border-brand-300 hover:bg-brand-50 transition-all group">
            <div className="w-16 h-16 bg-white rounded-full shadow-sm flex items-center justify-center mb-4 group-hover:scale-110 transition-transform"><Plus size={32} /></div>
            <span className="font-black text-lg">Add New Step (新增步驟)</span>
          </button>
        </div>
      </main>

      {isHelpOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm no-print">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-8 relative">
            <button onClick={() => setIsHelpOpen(false)} className="absolute top-6 right-6 text-slate-400 hover:text-slate-600"><X size={24} /></button>
            <h2 className="text-2xl font-black mb-6 flex items-center gap-2"><HelpCircle className="text-brand-600" /> Help & Instructions</h2>
            <div className="space-y-6 text-slate-600">
              <div className="flex gap-4">
                <div className="bg-brand-100 text-brand-700 w-8 h-8 rounded-full flex items-center justify-center shrink-0 font-bold">1</div>
                <div>
                  <p className="font-bold">Offline Saving (專案存檔)</p>
                  <p className="text-sm">Use <Download size={14} className="inline" /> Export Project to save your work as a <b>.json</b> file. Use <FileJson size={14} className="inline" /> Import to load it back later.</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="bg-brand-100 text-brand-700 w-8 h-8 rounded-full flex items-center justify-center shrink-0 font-bold">2</div>
                <div>
                  <p className="font-bold">Offline Running (脫機使用)</p>
                  <p className="text-sm">The app works offline once cached. If downloading files, run them using a local server (like <code>npx serve</code>) for full functionality.</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="bg-brand-100 text-brand-700 w-8 h-8 rounded-full flex items-center justify-center shrink-0 font-bold">3</div>
                <div>
                  <p className="font-bold">Export Options (導出選項)</p>
                  <p className="text-sm">Export to Word for documentation or Print to PDF for physical SOP manuals. Both preserve image data.</p>
                </div>
              </div>
            </div>
            <button onClick={() => setIsHelpOpen(false)} className="mt-8 w-full py-4 bg-brand-600 text-white font-bold rounded-xl hover:bg-brand-700 transition-colors shadow-lg shadow-brand-200">Start Building</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;