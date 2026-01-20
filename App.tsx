import React, { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid'; // Using a simple random ID generator usually provided by uuid, but for no-deps I'll make a helper
import { Plus, Printer, Save, FileText, Package, LayoutGrid, HelpCircle, X, FileDown } from 'lucide-react';
import { SOPStep, SOPDocument } from './types';
import { StepCard } from './components/StepCard';

// Simple ID generator to avoid external dependencies for this specific file request if not needed
const generateId = () => Math.random().toString(36).substr(2, 9);

const App: React.FC = () => {
  const [docInfo, setDocInfo] = useState<SOPDocument>({
    title: 'Product Packaging SOP',
    designer: '',
    date: new Date().toISOString().split('T')[0],
    version: '1.0',
    model: ''
  });

  const [steps, setSteps] = useState<SOPStep[]>([
    { id: generateId(), imageUrl: null, description: '', isAnalyzing: false },
    { id: generateId(), imageUrl: null, description: '', isAnalyzing: false },
    { id: generateId(), imageUrl: null, description: '', isAnalyzing: false },
    { id: generateId(), imageUrl: null, description: '', isAnalyzing: false },
  ]);

  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const addStep = () => {
    setSteps(prev => [...prev, { id: generateId(), imageUrl: null, description: '', isAnalyzing: false }]);
  };

  const updateStep = (id: string, updates: Partial<SOPStep>) => {
    setSteps(prev => prev.map(step => step.id === id ? { ...step, ...updates } : step));
  };

  const deleteStep = (id: string) => {
    if (window.confirm('Are you sure you want to delete this step?')) {
      setSteps(prev => prev.filter(step => step.id !== id));
    }
  };

  const handlePrint = () => {
    // Adding a small timeout ensures any pending renders are complete, though usually not strictly necessary.
    // Basic window.print() is sufficient for most cases.
    window.print();
  };

  // Helper function to crop image to 4:3 ratio for Word export
  const cropImageTo4by3 = (imageUrl: string): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = "Anonymous";
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const targetWidth = 800;
        const targetHeight = 600; // 4:3 ratio
        canvas.width = targetWidth;
        canvas.height = targetHeight;
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          resolve('');
          return;
        }

        // Calculate source rectangle for cover effect
        let sx, sy, sWidth, sHeight;
        const imgRatio = img.width / img.height;
        const targetRatio = targetWidth / targetHeight;

        if (imgRatio > targetRatio) {
          // Image is wider
          sHeight = img.height;
          sWidth = img.height * targetRatio;
          sy = 0;
          sx = (img.width - sWidth) / 2;
        } else {
          // Image is taller
          sWidth = img.width;
          sHeight = img.width / targetRatio;
          sx = 0;
          sy = (img.height - sHeight) / 2;
        }

        // Draw cropped image to canvas
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, targetWidth, targetHeight);
        ctx.drawImage(img, sx, sy, sWidth, sHeight, 0, 0, targetWidth, targetHeight);
        
        resolve(canvas.toDataURL('image/jpeg', 0.85));
      };
      img.onerror = () => resolve('');
      img.src = imageUrl;
    });
  };

  const handleExportWord = async () => {
    if (isExporting) return;
    setIsExporting(true);

    try {
      // 1. Process images (crop to 4:3 and convert to Base64)
      const stepsData = await Promise.all(steps.map(async (step, index) => {
        let imgBase64 = '';
        if (step.imageUrl) {
          try {
            imgBase64 = await cropImageTo4by3(step.imageUrl);
          } catch (e) {
            console.error('Error converting image for export', e);
          }
        }
        return { ...step, imgBase64, index: index + 1 };
      }));

      // 2. Group into rows of 2
      const tableRows = stepsData.reduce((acc, step, index) => {
        if (index % 2 === 0) {
          acc.push([step]);
        } else {
          acc[acc.length - 1].push(step);
        }
        return acc;
      }, [] as (typeof stepsData)[]);

      // 3. Construct HTML with A4 page size and "Card" layout style
      const htmlContent = `
        <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
        <head>
          <meta charset="utf-8">
          <title>${docInfo.title}</title>
          <!--[if gte mso 9]>
          <xml>
            <w:WordDocument>
              <w:View>Print</w:View>
              <w:Zoom>100</w:Zoom>
              <w:DoNotOptimizeForBrowser/>
            </w:WordDocument>
          </xml>
          <![endif]-->
          <style>
            @page {
              size: 21cm 29.7cm;
              margin: 1.5cm 1.5cm 1.5cm 1.5cm;
              mso-page-orientation: portrait;
            }
            body {
              font-family: Arial, sans-serif;
              font-size: 11pt;
            }
            /* Main Layout Table - Simulating Grid Gap */
            table.layout-grid {
              width: 100%;
              border-collapse: separate;
              border-spacing: 15px; /* Simulates gap-6 */
              table-layout: fixed;
            }
            td.step-cell {
              width: 50%;
              vertical-align: top;
              border: 1px solid #d1d5db; /* Gray-300 border like card */
              background-color: #ffffff;
              padding: 0;
            }
            /* Inner Card Styling */
            .card-header {
              background-color: #f9fafb; /* Gray-50 */
              border-bottom: 1px solid #e5e7eb; /* Gray-200 */
              padding: 10px;
              color: #374151;
            }
            .step-badge {
              display: inline-block;
              background-color: #0284c7; /* Brand-600 */
              color: #ffffff;
              width: 24px;
              height: 24px;
              border-radius: 12px;
              text-align: center;
              line-height: 24px;
              font-weight: bold;
              font-size: 10pt;
              margin-right: 8px;
            }
            .step-label {
              font-weight: bold;
              font-size: 11pt;
            }
            .image-container {
              padding: 0;
              text-align: center;
              background-color: #e5e7eb;
              border-bottom: 1px solid #e5e7eb;
            }
            img {
              width: 100%;
              height: auto;
              display: block;
            }
            .desc-container {
              padding: 12px;
              min-height: 50px;
            }
            .desc-label {
              font-size: 8pt;
              color: #6b7280;
              text-transform: uppercase;
              font-weight: bold;
              margin-bottom: 4px;
              display: block;
            }
            .desc-text {
              font-size: 11pt;
              color: #111;
              white-space: pre-wrap;
            }
            /* Document Header */
            .doc-header {
              text-align: center;
              margin-bottom: 20px;
              border-bottom: 2px solid #0284c7;
              padding-bottom: 15px;
            }
            .doc-title {
              font-size: 24pt;
              font-weight: bold;
              color: #111;
              margin-bottom: 10px;
            }
            .meta-row {
              text-align: center;
              color: #4b5563;
              font-size: 10pt;
              margin-bottom: 5px;
            }
            .meta-item {
              display: inline-block;
              margin: 0 15px;
            }
          </style>
        </head>
        <body>
          <div class="doc-header">
            <div class="doc-title">${docInfo.title}</div>
            <div class="meta-row">
              <span class="meta-item"><strong>Version:</strong> ${docInfo.version}</span>
              <span class="meta-item"><strong>Model:</strong> ${docInfo.model}</span>
            </div>
            <div class="meta-row">
              <span class="meta-item"><strong>Designer:</strong> ${docInfo.designer}</span>
              <span class="meta-item"><strong>Date:</strong> ${docInfo.date}</span>
            </div>
          </div>
          
          <table class="layout-grid">
            ${tableRows.map(row => `
              <tr>
                ${row.map(step => `
                  <td class="step-cell">
                    <div class="card-header">
                      <span class="step-badge">${step.index}</span>
                      <span class="step-label">Step ${step.index}</span>
                    </div>
                    <div class="image-container">
                      ${step.imgBase64 
                        ? `<img src="${step.imgBase64}" />` 
                        : '<div style="height:200px; line-height:200px; text-align:center; color:#999;">No Image</div>'}
                    </div>
                    <div class="desc-container">
                      <span class="desc-label">Description</span>
                      <div class="desc-text">${step.description ? step.description.replace(/\n/g, '<br/>') : ''}</div>
                    </div>
                  </td>
                `).join('')}
                ${row.length === 1 ? '<td style="border:none;"></td>' : ''}
              </tr>
            `).join('')}
          </table>
          
          <div style="margin-top: 30px; text-align: center; font-size: 9pt; color: #9ca3af; border-top: 1px solid #e5e7eb; padding-top: 10px;">
            SOP Generated by SOP Master
          </div>
        </body>
        </html>
      `;

      // 4. Download as .doc
      const blob = new Blob(['\ufeff', htmlContent], { type: 'application/msword' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${docInfo.title.replace(/[^a-z0-9]/gi, '_').toLowerCase() || 'sop'}.doc`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Export failed", error);
      alert("Failed to export Word document.");
    } finally {
      setIsExporting(false);
    }
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
                <p className="text-xs text-gray-500">Packaging SOP Tool</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button 
                type="button"
                onClick={() => setIsHelpOpen(true)}
                className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-500 hover:text-brand-600 hover:bg-brand-50 rounded-md transition-colors"
                title="Help"
              >
                <HelpCircle size={18} />
                <span className="hidden sm:inline">Help</span>
              </button>

              <div className="h-6 w-px bg-gray-300 mx-1"></div>

              <button 
                type="button"
                onClick={handlePrint}
                className="inline-flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500 transition-colors"
                title="Save as PDF via Print"
              >
                <Printer size={18} />
                <span className="hidden md:inline">Export PDF</span>
              </button>

              <button 
                type="button"
                onClick={handleExportWord}
                disabled={isExporting}
                className="inline-flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500 transition-colors disabled:opacity-50"
                title="Download as Word Doc"
              >
                <FileText size={18} />
                <span className="hidden md:inline">{isExporting ? 'Exporting...' : 'Export Word'}</span>
              </button>

              <button 
                type="button"
                onClick={addStep}
                className="ml-2 inline-flex items-center gap-2 px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-brand-600 hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500 transition-colors"
              >
                <Plus size={18} />
                <span className="hidden sm:inline">Add Step</span>
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
            <div className="col-span-1 md:col-span-2 text-center">
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1 no-print">SOP TITLE</label>
              <input 
                type="text" 
                value={docInfo.title}
                onChange={(e) => setDocInfo({...docInfo, title: e.target.value})}
                className="w-full text-3xl font-bold text-black bg-white border-none p-0 focus:ring-0 placeholder-gray-300 print:text-4xl text-center"
                placeholder="Enter SOP Title"
              />
            </div>
            
            <div className="space-y-4">
               <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1 no-print">DOCUMENT INFO</label>
                <div className="flex items-center gap-2 text-gray-700 mb-2">
                  <span className="font-semibold w-16 text-gray-400 no-print">Version:</span>
                  <input 
                    type="text" 
                    value={docInfo.version}
                    onChange={(e) => setDocInfo({...docInfo, version: e.target.value})}
                    className="flex-1 border border-gray-300 rounded px-2 py-1 bg-white text-black focus:ring-2 focus:ring-brand-500 focus:border-transparent print:border-none print:p-0"
                    placeholder="1.0"
                  />
                </div>
                {/* Model Field */}
                <div className="flex items-center gap-2 text-gray-700">
                  <span className="font-semibold w-16 text-gray-400 no-print">Model:</span>
                  <input 
                    type="text" 
                    value={docInfo.model}
                    onChange={(e) => setDocInfo({...docInfo, model: e.target.value})}
                    className="flex-1 border border-gray-300 rounded px-2 py-1 bg-white text-black focus:ring-2 focus:ring-brand-500 focus:border-transparent print:border-none print:p-0"
                    placeholder="e.g. iPhone 16"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1 no-print">DESIGNER INFO</label>
                <div className="flex items-center gap-2 text-gray-700">
                  <span className="font-semibold w-20 text-gray-400 no-print">Designer:</span>
                  <input 
                    type="text" 
                    value={docInfo.designer}
                    onChange={(e) => setDocInfo({...docInfo, designer: e.target.value})}
                    className="flex-1 border border-gray-300 rounded px-2 py-1 bg-white text-black focus:ring-2 focus:ring-brand-500 focus:border-transparent print:border-none print:p-0"
                    placeholder="Enter designer name"
                  />
                </div>
                <div className="flex items-center gap-2 text-gray-700 mt-2">
                  <span className="font-semibold w-20 text-gray-400 no-print">Date:</span>
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
            <span className="font-medium">Add Step</span>
          </button>
        </div>

        {/* Footer for Print */}
        <div className="hidden print:block fixed bottom-0 left-0 w-full text-center text-xs text-gray-400 p-4 border-t">
          SOP Generated by SOP Master • {new Date().toLocaleDateString()}
        </div>
      </main>

      {/* Help Modal */}
      {isHelpOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm no-print animate-in fade-in duration-200">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto relative">
            <button
              onClick={() => setIsHelpOpen(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 p-1 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X size={20} />
            </button>

            <div className="p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <HelpCircle className="text-brand-600" />
                User Guide
              </h2>

              <div className="space-y-4 text-sm text-gray-600">
                <section>
                  <h3 className="font-semibold text-gray-900 mb-1">1. Add Steps</h3>
                  <p>Click the "Add Step" button at the bottom right to add new operation steps. Each step includes an image and a text description area.</p>
                </section>

                <section>
                  <h3 className="font-semibold text-gray-900 mb-1">2. Upload Image & AI Description</h3>
                  <p>Click the image area or drag and drop an image to upload. The system will automatically use Gemini AI to analyze the image content and generate professional SOP step instructions. You can also click the "AI Write" button to regenerate the text.</p>
                </section>

                <section>
                  <h3 className="font-semibold text-gray-900 mb-1">3. Edit Content</h3>
                  <p>You can freely edit the AI-generated text or fill in the SOP title, version number, model, and designer information. Click the trash can icon to delete unwanted steps.</p>
                </section>

                <section>
                  <h3 className="font-semibold text-gray-900 mb-1">4. Export Options</h3>
                  <p>Use the buttons in the top toolbar to export your SOP:</p>
                  <ul className="list-disc pl-5 mt-1 space-y-1">
                    <li><strong>Export PDF:</strong> Opens the print dialog. Select "Save as PDF" to save the document as a high-quality PDF file.</li>
                    <li><strong>Export Word:</strong> Downloads a .doc file that opens in Microsoft Word, allowing for further editing of text and layout. Images are automatically cropped to a 4:3 ratio to match the preview.</li>
                  </ul>
                </section>
              </div>

              <div className="mt-8 pt-4 border-t border-gray-100 flex justify-end">
                <button
                  onClick={() => setIsHelpOpen(false)}
                  className="px-4 py-2 bg-brand-600 text-white rounded-md hover:bg-brand-700 transition-colors text-sm font-medium"
                >
                  Got it
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;