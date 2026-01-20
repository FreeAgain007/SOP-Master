import React, { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid'; // Using a simple random ID generator usually provided by uuid, but for no-deps I'll make a helper
import { Plus, Printer, Save, FileText, Package, LayoutGrid } from 'lucide-react';
import { SOPStep, SOPDocument } from './types';
import { StepCard } from './components/StepCard';

// Simple ID generator to avoid external dependencies for this specific file request if not needed
const generateId = () => Math.random().toString(36).substr(2, 9);

const App: React.FC = () => {
  const [docInfo, setDocInfo] = useState<SOPDocument>({
    title: '產品包裝標準作業程序 (SOP)',
    author: '',
    date: new Date().toISOString().split('T')[0],
    version: '1.0'
  });

  const [steps, setSteps] = useState<SOPStep[]>([
    { id: generateId(), imageUrl: null, description: '', isAnalyzing: false },
    { id: generateId(), imageUrl: null, description: '', isAnalyzing: false },
    { id: generateId(), imageUrl: null, description: '', isAnalyzing: false },
    { id: generateId(), imageUrl: null, description: '', isAnalyzing: false },
  ]);

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

  const handlePrint = () => {
    // Adding a small timeout ensures any pending renders are complete, though usually not strictly necessary.
    // Basic window.print() is sufficient for most cases.
    window.print();
  };

  return (
    <div className="min-h-screen flex flex-col">
      
      {/* Navbar / Control Panel - Hidden when printing */}
      <nav className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm no-print">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="bg-brand-600 p-2 rounded-lg">
                <Package className="text-white" size={24} />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">SOP Master</h1>
                <p className="text-xs text-gray-500">包裝流程製作工具</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button 
                type="button"
                onClick={handlePrint}
                className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500 transition-colors"
              >
                <Printer size={18} />
                <span>列印 / 另存PDF</span>
              </button>
              <button 
                type="button"
                onClick={addStep}
                className="inline-flex items-center gap-2 px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-brand-600 hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500 transition-colors"
              >
                <Plus size={18} />
                <span>新增步驟</span>
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 print:p-0 print:max-w-none">
        
        {/* Document Header Form */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8 print:shadow-none print:border-none print:mb-4 print:p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 print:grid-cols-2">
            <div className="col-span-1 md:col-span-2">
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1 no-print">SOP 標題</label>
              <input 
                type="text" 
                value={docInfo.title}
                onChange={(e) => setDocInfo({...docInfo, title: e.target.value})}
                className="w-full text-3xl font-bold text-black bg-white border-none p-0 focus:ring-0 placeholder-gray-300 print:text-4xl"
                placeholder="輸入 SOP 標題"
              />
            </div>
            
            <div className="space-y-4">
               <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1 no-print">文件編號 / 版本</label>
                <div className="flex items-center gap-2 text-gray-700">
                  <span className="font-semibold w-16 text-gray-400 no-print">版本:</span>
                  <input 
                    type="text" 
                    value={docInfo.version}
                    onChange={(e) => setDocInfo({...docInfo, version: e.target.value})}
                    className="flex-1 border border-gray-300 rounded px-2 py-1 bg-white text-black focus:ring-2 focus:ring-brand-500 focus:border-transparent print:border-none print:p-0"
                    placeholder="1.0"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1 no-print">製作資訊</label>
                <div className="flex items-center gap-2 text-gray-700">
                  <span className="font-semibold w-16 text-gray-400 no-print">製作人:</span>
                  <input 
                    type="text" 
                    value={docInfo.author}
                    onChange={(e) => setDocInfo({...docInfo, author: e.target.value})}
                    className="flex-1 border border-gray-300 rounded px-2 py-1 bg-white text-black focus:ring-2 focus:ring-brand-500 focus:border-transparent print:border-none print:p-0"
                    placeholder="輸入你的名字"
                  />
                </div>
                <div className="flex items-center gap-2 text-gray-700 mt-2">
                  <span className="font-semibold w-16 text-gray-400 no-print">日期:</span>
                  <input 
                    type="date" 
                    value={docInfo.date}
                    onChange={(e) => setDocInfo({...docInfo, date: e.target.value})}
                    className="flex-1 border border-gray-300 rounded px-2 py-1 bg-white text-black focus:ring-2 focus:ring-brand-500 focus:border-transparent print:border-none print:p-0"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Steps Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 print:grid-cols-2 print:gap-8">
          {steps.map((step, index) => (
            <StepCard 
              key={step.id} 
              step={step} 
              index={index} 
              onUpdate={updateStep} 
              onDelete={deleteStep} 
            />
          ))}
          
          {/* Add Step Card (Visual Placeholder) - Hidden in Print */}
          <button 
            type="button"
            onClick={addStep}
            className="no-print h-full min-h-[300px] border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center text-gray-400 hover:text-brand-600 hover:border-brand-300 hover:bg-brand-50 transition-all cursor-pointer group"
          >
            <div className="p-4 bg-white rounded-full shadow-sm mb-3 group-hover:shadow-md transition-shadow">
               <Plus size={32} />
            </div>
            <span className="font-medium">新增步驟</span>
          </button>
        </div>

        {/* Footer for Print */}
        <div className="hidden print:block fixed bottom-0 left-0 w-full text-center text-xs text-gray-400 p-4 border-t">
          SOP Generated by SOP Master • {new Date().toLocaleDateString()}
        </div>

      </main>
    </div>
  );
};

export default App;