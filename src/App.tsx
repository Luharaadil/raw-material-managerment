import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { Upload, FileSpreadsheet, Calculator, Download, AlertCircle, Settings2, ChevronDown, ChevronUp, Link as LinkIcon, X } from 'lucide-react';

interface Spec {
  rubberName: string;
  baseCode: string;
  ratio: number;
  materials: Record<string, number>;
}

interface PlannedRubber {
  rubberName: string;
  batches: number;
}

interface ConsumptionResult {
  materialCode: string;
  materialName: string;
  totalKg: number;
  warehouseInventory: number;
  sectionInventory: number;
  totalInventory: number;
  inventoryDays: number;
  countryOfOrigin: string;
  category: string;
  materialGroup: string;
  groupTotalInvDays?: number;
  groupTotalUsage?: number;
  groupTotalInventory?: number;
  rowSpan?: number;
  isFirstInGroup?: boolean;
}

interface DatabaseInfo {
  countryOfOrigin: string;
  category: string;
  materialGroup: string;
}

interface InventoryData {
  materialName: string;
  warehouseInventory: number;
  sectionInventory: number;
}

const colToIndex = (col: string) => {
  let index = 0;
  for (let i = 0; i < col.length; i++) {
    index = index * 26 + col.charCodeAt(i) - 64;
  }
  return index - 1;
};

export default function App() {
  // Hardcoded Google Sheets URLs
  const specUrl = 'https://docs.google.com/spreadsheets/d/1_SqDVFnw1xRDCH4MhiWg5ZxUcE1UmryuJ4q-0I23x2s/edit?gid=0#gid=0';
  const prodUrl = 'https://docs.google.com/spreadsheets/d/1m79DT6yZNg_qJLzMikzVXIV84pFRq6NkItMDA-Wd6P8/edit?gid=1995297640#gid=1995297640';
  const inventoryUrl = 'https://docs.google.com/spreadsheets/d/1gQN98nrZx0HYfqXE35_HVjxMy0Y7XVXD/edit?gid=1963391384#gid=1963391384';
  const databaseUrl = 'https://docs.google.com/spreadsheets/d/1gQN98nrZx0HYfqXE35_HVjxMy0Y7XVXD/edit?gid=1369074018#gid=1369074018';
  
  const [categorizedResults, setCategorizedResults] = useState<Record<string, ConsumptionResult[]>>({});
  const [error, setError] = useState<string | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [indiaDays, setIndiaDays] = useState(7);
  const [otherDays, setOtherDays] = useState(30);

  const fetchGoogleSheet = async (url: string): Promise<any[][]> => {
    try {
      const response = await fetch(`/api/fetch-sheet?url=${encodeURIComponent(url)}`);
      if (!response.ok) {
        let errorMsg = `Failed to fetch sheet. Status: ${response.status}`;
        try {
          const errorData = await response.json();
          if (errorData.error) errorMsg = errorData.error;
        } catch (e) {
          // Ignore JSON parse error
        }
        throw new Error(errorMsg);
      }
      const text = await response.text();
      const workbook = XLSX.read(text, { type: 'string' });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      return XLSX.utils.sheet_to_json<any[]>(worksheet, { header: 1 });
    } catch (err: any) {
      throw new Error(`Error fetching Google Sheet: ${err.message}`);
    }
  };

  const parseSpec = (data: any[][], parsedConfig: any): Spec[] => {
    const specs: Spec[] = [];
    const matRow = data[parsedConfig.matRow];
    if (!matRow) throw new Error(`Material codes row (Row ${config.specMatRow}) not found in Spec Database.`);
    
    const materialCodes = matRow.slice(parsedConfig.matStartCol);
    
    for (let i = parsedConfig.matRow + 1; i < data.length; i++) {
      const row = data[i];
      if (!row) continue;
      
      const vMark = String(row[parsedConfig.vCol] || '').trim().toUpperCase();
      if (vMark === 'V' || vMark === 'Ⅴ') {
        const rubberName = String(row[parsedConfig.rubberCol] || '').trim();
        const ratio = parseFloat(row[parsedConfig.ratioCol]);
        
        if (rubberName && !isNaN(ratio)) {
          const baseCode = rubberName.substring(0, 4);
          const materials: Record<string, number> = {};
          
          for (let j = parsedConfig.matStartCol; j < row.length; j++) {
            const val = parseFloat(row[j]);
            if (!isNaN(val) && val > 0) {
              const matCode = String(materialCodes[j - parsedConfig.matStartCol] || '').trim();
              if (matCode) {
                materials[matCode] = val;
              }
            }
          }
          
          specs.push({ rubberName, baseCode, ratio, materials });
        }
      }
    }
    return specs;
  };

  const parseProd = (data: any[][], parsedConfig: any): PlannedRubber[] => {
    const plannedRubbers: PlannedRubber[] = [];
    const seen = new Set<string>();
    
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      if (!row) continue;
      
      const rubberName = String(row[parsedConfig.prodRubberCol] || '').trim();
      const batches = parseFloat(row[parsedConfig.prodBatchCol]);
      
      if (rubberName && !isNaN(batches) && batches > 0) {
        if (!seen.has(rubberName)) {
          plannedRubbers.push({ rubberName, batches });
          seen.add(rubberName);
        }
      }
    }
    return plannedRubbers;
  };

  const parseInventory = (data: any[][]): Record<string, InventoryData> => {
    const inventory: Record<string, InventoryData> = {};
    
    // Skip header row (index 0)
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (!row) continue;
      
      const matCode = String(row[0] || '').trim();
      if (!matCode) continue;
      
      const matName = String(row[1] || '').trim();
      const storageLocation = String(row[3] || '').trim();
      
      const unrestricted = parseFloat(row[5]) || 0;
      const transit = parseFloat(row[6]) || 0;
      const quality = parseFloat(row[7]) || 0;
      
      const totalQty = unrestricted + transit + quality;
      
      if (!inventory[matCode]) {
        inventory[matCode] = {
          materialName: matName,
          warehouseInventory: 0,
          sectionInventory: 0
        };
      }
      
      if (storageLocation === '1001') {
        inventory[matCode].warehouseInventory += totalQty;
      } else {
        inventory[matCode].sectionInventory += totalQty;
      }
      
      // Update name if it was empty before
      if (!inventory[matCode].materialName && matName) {
        inventory[matCode].materialName = matName;
      }
    }
    
    return inventory;
  };

  const parseDatabase = (data: any[][]): Record<string, DatabaseInfo> => {
    const db: Record<string, DatabaseInfo> = {};
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (!row) continue;
      const matCode = String(row[0] || '').trim();
      if (!matCode) continue;
      
      db[matCode] = {
        countryOfOrigin: String(row[2] || '').trim(),
        category: String(row[3] || '').trim() || 'Uncategorized',
        materialGroup: String(row[4] || '').trim() || matCode
      };
    }
    return db;
  };

  const handleCalculate = async () => {
    setIsCalculating(true);
    setError(null);

    try {
      const parsedConfig = {
        vCol: colToIndex('A'),
        rubberCol: colToIndex('C'),
        ratioCol: colToIndex('D'),
        matRow: 2, // 0-based index for row 3
        matStartCol: colToIndex('E'),
        prodRubberCol: colToIndex('O'),
        prodBatchCol: colToIndex('T')
      };

      const specData = await fetchGoogleSheet(specUrl);
      const prodData = await fetchGoogleSheet(prodUrl);
      const inventoryData = await fetchGoogleSheet(inventoryUrl);
      const dbData = await fetchGoogleSheet(databaseUrl);

      const specs = parseSpec(specData, parsedConfig);
      const planned = parseProd(prodData, parsedConfig);
      const inventory = parseInventory(inventoryData);
      const database = parseDatabase(dbData);

      if (specs.length === 0) throw new Error('No active specs (marked with "V") found in Spec Database.');
      if (planned.length === 0) throw new Error('No valid production batches found in Production Plan.');

      const consumption: Record<string, number> = {};
      
      for (const plan of planned) {
        const baseCode = plan.rubberName.substring(0, 4);
        const matchingSpecs = specs.filter(s => s.baseCode === baseCode);
        
        for (const spec of matchingSpecs) {
          for (const [matCode, usage] of Object.entries(spec.materials)) {
            const total = plan.batches * spec.ratio * usage;
            consumption[matCode] = (consumption[matCode] || 0) + total;
          }
        }
      }
      
      const allMaterialCodes = new Set([
        ...Object.keys(consumption),
        ...Object.keys(inventory)
      ]);
      
      let rawResults: ConsumptionResult[] = Array.from(allMaterialCodes)
        .map(materialCode => {
          const totalKg = consumption[materialCode] || 0;
          const inv = inventory[materialCode] || { materialName: 'Unknown', warehouseInventory: 0, sectionInventory: 0 };
          const dbInfo = database[materialCode] || { countryOfOrigin: '', category: 'Uncategorized', materialGroup: materialCode };
          const totalInventory = inv.warehouseInventory + inv.sectionInventory;
          
          // Skip if there's no usage AND no warehouse inventory
          if (totalKg === 0 && inv.warehouseInventory === 0) return null;

          const inventoryDays = totalKg > 0 ? totalInventory / totalKg : 0;
          
          return {
            materialCode,
            materialName: inv.materialName,
            totalKg,
            warehouseInventory: inv.warehouseInventory,
            sectionInventory: inv.sectionInventory,
            totalInventory,
            inventoryDays,
            countryOfOrigin: dbInfo.countryOfOrigin,
            category: dbInfo.category,
            materialGroup: dbInfo.materialGroup
          };
        })
        .filter((r): r is ConsumptionResult => r !== null);

      if (rawResults.length === 0) {
        throw new Error('No materials consumption calculated. Please check if the planned rubber base codes match the active specs.');
      }

      // Group by category
      const categories = Array.from(new Set(rawResults.map(r => r.category))).sort();
      const finalCategorized: Record<string, ConsumptionResult[]> = {};

      categories.forEach(cat => {
        const catItems = rawResults.filter(r => r.category === cat);
        
        // Group by materialGroup within the category
        const groups: Record<string, ConsumptionResult[]> = {};
        catItems.forEach(item => {
          if (!groups[item.materialGroup]) groups[item.materialGroup] = [];
          groups[item.materialGroup].push(item);
        });
        
        const processedCatItems: ConsumptionResult[] = [];
        
        // Sort groups by total usage descending
        const sortedGroupKeys = Object.keys(groups).sort((a, b) => {
          const usageA = groups[a].reduce((sum, item) => sum + item.totalKg, 0);
          const usageB = groups[b].reduce((sum, item) => sum + item.totalKg, 0);
          return usageB - usageA || groups[b][0].totalInventory - groups[a][0].totalInventory;
        });
        
        sortedGroupKeys.forEach(gKey => {
          const groupItems = groups[gKey].sort((a, b) => b.totalKg - a.totalKg || b.totalInventory - a.totalInventory);
          
          const groupTotalUsage = groupItems.reduce((sum, item) => sum + item.totalKg, 0);
          const groupTotalInvDays = groupItems.reduce((sum, item) => sum + item.inventoryDays, 0);
          const groupTotalInventory = groupItems.reduce((sum, item) => sum + item.totalInventory, 0);
          
          groupItems.forEach((item, index) => {
            processedCatItems.push({
              ...item,
              groupTotalInvDays,
              groupTotalUsage,
              groupTotalInventory,
              isFirstInGroup: index === 0,
              rowSpan: index === 0 ? groupItems.length : 1
            });
          });
        });
        
        finalCategorized[cat] = processedCatItems;
      });

      setCategorizedResults(finalCategorized);
    } catch (err: any) {
      setError(err.message || 'An error occurred during calculation.');
      console.error(err);
    } finally {
      setIsCalculating(false);
    }
  };

  const exportToCSV = () => {
    if (Object.keys(categorizedResults).length === 0) return;
    
    const header = [
      'Category',
      'Material Code', 
      'Material Name', 
      'Material Usage (kg)', 
      'Warehouse Inventory', 
      'Section Inventory', 
      'Total Inventory', 
      'Inv. Days',
      'Total Inv. Days',
      'Group Total Inv.',
      'Std. Inv.',
      'Country of Origin'
    ];
    
    const rows: string[][] = [];
    
    Object.entries(categorizedResults).forEach(([category, items]) => {
      items.forEach(r => {
        const stdDays = r.countryOfOrigin.toUpperCase() === 'INDIA' ? indiaDays : otherDays;
        const standardInventory = r.totalKg * stdDays;

        rows.push([
          `"${category.replace(/"/g, '""')}"`,
          r.materialCode,
          `"${r.materialName.replace(/"/g, '""')}"`,
          r.totalKg.toFixed(0),
          r.warehouseInventory.toFixed(0),
          r.sectionInventory.toFixed(0),
          r.totalInventory.toFixed(0),
          r.totalKg > 0 ? r.inventoryDays.toFixed(1) : '-',
          r.isFirstInGroup && r.groupTotalUsage! > 0 ? r.groupTotalInvDays!.toFixed(1) : (r.isFirstInGroup ? '-' : ''),
          r.isFirstInGroup ? r.groupTotalInventory!.toFixed(0) : '',
          standardInventory.toFixed(0),
          `"${r.countryOfOrigin.replace(/"/g, '""')}"`
        ]);
      });
    });
    
    const csvContent = [
      header.join(','),
      ...rows.map(e => e.join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'material_consumption.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans p-4 md:p-6">
      <div className="w-full mx-auto space-y-8">
        
        <div className="flex justify-between items-start">
          <header className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-3">
              <Calculator className="w-8 h-8 text-indigo-600" />
              MRI Raw material management 原料管理
            </h1>
            <p className="text-slate-500 max-w-2xl">
             
            </p>
          </header>
          <button 
            onClick={() => setShowSettings(true)}
            className="p-2.5 bg-white border border-slate-200 rounded-xl shadow-sm hover:bg-slate-50 text-slate-600 transition-colors"
            title="Settings"
          >
            <Settings2 className="w-5 h-5" />
          </button>
        </div>

        {showSettings && (
          <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                <h3 className="text-lg font-semibold text-slate-900">Standard Inventory Settings</h3>
                <button onClick={() => setShowSettings(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-6 space-y-5">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">INDIA (Days)</label>
                  <input 
                    type="number" 
                    value={indiaDays} 
                    onChange={e => setIndiaDays(Number(e.target.value))} 
                    className="w-full px-4 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-shadow" 
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Other Countries (Days)</label>
                  <input 
                    type="number" 
                    value={otherDays} 
                    onChange={e => setOtherDays(Number(e.target.value))} 
                    className="w-full px-4 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-shadow" 
                  />
                </div>
              </div>
              <div className="px-6 py-4 border-t border-slate-100 flex justify-end">
                <button 
                  onClick={() => setShowSettings(false)} 
                  className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-colors shadow-sm"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl flex items-start gap-3">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <p className="text-sm font-medium">{error}</p>
          </div>
        )}

        {/* Action Button */}
        <div className="flex justify-start">
          <button
            onClick={handleCalculate}
            disabled={isCalculating}
            className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white px-8 py-3 rounded-xl font-medium shadow-sm transition-colors flex items-center gap-2"
          >
            {isCalculating ? (
              <span className="flex items-center gap-2">
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Fetching & Calculating...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Calculator className="w-5 h-5" />
                Calculate Consumption
              </span>
            )}
          </button>
        </div>

        {/* Global Export Button */}
        {Object.keys(categorizedResults).length > 0 && (
          <div className="flex justify-end">
            <button
              onClick={exportToCSV}
              className="flex items-center gap-2 text-sm font-medium text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-4 py-2 rounded-lg transition-colors"
            >
              <Download className="w-4 h-4" />
              Export All to CSV
            </button>
          </div>
        )}

        {/* Results */}
        {Object.entries(categorizedResults).map(([category, items]) => (
          <div key={category} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="px-6 py-5 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
              <h2 className="text-lg font-semibold text-slate-900">{category}</h2>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-800 border-b border-slate-700">
                    <th className="px-6 py-3 text-xs font-semibold text-slate-200 uppercase tracking-wider">Material Code</th>
                    <th className="px-6 py-3 text-xs font-semibold text-slate-200 uppercase tracking-wider">Material Name</th>
                    <th className="px-6 py-3 text-xs font-semibold text-slate-200 uppercase tracking-wider text-right">Material Usage (kg)</th>
                    <th className="px-6 py-3 text-xs font-semibold text-slate-200 uppercase tracking-wider text-right">Warehouse Inv.</th>
                    <th className="px-6 py-3 text-xs font-semibold text-slate-200 uppercase tracking-wider text-right">Section Inv.</th>
                    <th className="px-6 py-3 text-xs font-semibold text-slate-200 uppercase tracking-wider text-right">Total Inv.</th>
                    <th className="px-6 py-3 text-xs font-semibold text-slate-200 uppercase tracking-wider text-right">Inv. Days</th>
                    <th className="px-6 py-3 text-xs font-semibold text-slate-200 uppercase tracking-wider text-right border-l border-slate-600">Total Inv. Days</th>
                    <th className="px-6 py-3 text-xs font-semibold text-slate-200 uppercase tracking-wider text-right border-l border-slate-600">Group Total Inv.</th>
                    <th className="px-6 py-3 text-xs font-semibold text-slate-200 uppercase tracking-wider text-right">Std. Inv.</th>
                    <th className="px-6 py-3 text-xs font-semibold text-slate-200 uppercase tracking-wider">Country of Origin</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {items.map((result, idx) => {
                    const stdDays = result.countryOfOrigin.toUpperCase() === 'INDIA' ? indiaDays : otherDays;
                    const standardInventory = result.totalKg * stdDays;
                    
                    return (
                    <tr key={idx} className="hover:bg-indigo-50/50 transition-colors even:bg-slate-50">
                      <td className="px-6 py-4 text-sm font-medium text-slate-900 font-mono">
                        {result.materialCode}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-700">
                        {result.materialName}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-700 text-right font-mono">
                        {result.totalKg.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-700 text-right font-mono">
                        {result.warehouseInventory.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-700 text-right font-mono">
                        {result.sectionInventory.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-700 text-right font-mono font-medium">
                        {result.totalInventory.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-700 text-right font-mono">
                        {result.totalKg > 0 
                          ? result.inventoryDays.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })
                          : '-'}
                      </td>
                      {result.isFirstInGroup && (
                        <td rowSpan={result.rowSpan} className="px-6 py-4 text-sm text-slate-900 text-right font-mono font-bold border-l border-slate-200 align-middle bg-slate-100/50">
                          {result.groupTotalUsage! > 0 
                            ? result.groupTotalInvDays!.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 }) 
                            : '-'}
                        </td>
                      )}
                      {result.isFirstInGroup && (
                        <td rowSpan={result.rowSpan} className="px-6 py-4 text-sm text-slate-900 text-right font-mono font-bold border-l border-slate-200 align-middle bg-slate-100/50">
                          {result.groupTotalInventory!.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                        </td>
                      )}
                      <td className="px-6 py-4 text-sm text-slate-700 text-right font-mono">
                        {standardInventory.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-700">
                        {result.countryOfOrigin}
                      </td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ))}

      </div>
    </div>
  );
}
