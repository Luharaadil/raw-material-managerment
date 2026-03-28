import React, { useState, useRef, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { Upload, FileSpreadsheet, Calculator, Download, AlertCircle, Settings2, ChevronDown, ChevronUp, Link as LinkIcon, X, LayoutDashboard, BarChart3, Copy, Check, Languages, Search } from 'lucide-react';
import { toBlob } from 'html-to-image';

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
  underQA: number;
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
  materialName?: string;
  countryOfOrigin: string;
  category: string;
  materialGroup: string;
}

interface InventoryData {
  materialName: string;
  warehouseInventory: number;
  sectionInventory: number;
  underQA: number;
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
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [showDetailedSummaryModal, setShowDetailedSummaryModal] = useState(false);
  const [indiaDays, setIndiaDays] = useState(7);
  const [otherDays, setOtherDays] = useState(30);
  const [isCopying, setIsCopying] = useState(false);
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1200);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMaterialDetails, setSelectedMaterialDetails] = useState<ConsumptionResult | null>(null);
  const [lang, setLang] = useState<'en' | 'zh'>('en');

  const t = {
    en: {
      title: 'MRI Raw material management',
      subtitle: '原料管理',
      settings: 'Settings',
      summary: 'Summary',
      detailedSummary: 'Detailed Summary',
      exportCsv: 'Export CSV',
      allCategories: 'All Categories',
      fetching: 'Fetching data and calculating consumption...',
      waitMessage: 'This may take a few seconds depending on the sheet size.',
      warehouseInv: 'Warehouse Inventory',
      sectionInv: 'Section Inventory',
      totalInv: 'Total Inventory',
      invDays: 'Inv. Days',
      usage: 'Usage',
      materialCode: 'Material Code',
      materialName: 'Material Name',
      country: 'Country',
      category: 'Category',
      originSummary: 'Detailed Origin Summary (Imported vs Local)',
      imported: 'Imported',
      local: 'Local',
      total: 'Total',
      days: 'Days',
      india: 'India',
      others: 'Others',
      config: 'Configuration',
      googleSheets: 'Google Sheets URLs',
      inventoryDays: 'Inventory Days Calculation',
      save: 'Save Configuration',
      close: 'Close',
      matUsage: 'Material Usage (kg)',
      groupTotalInv: 'Group Total Inv.',
      stdInv: 'Std. Inv.',
      status: 'Status',
      surplus: 'Surplus',
      shortage: 'Shortage',
      ok: 'OK',
      unknown: 'Unknown',
      uncategorized: 'Uncategorized',
      infoConsolidation: 'Information consolidation',
      whRawMaterialSummary: 'WH Raw Material Daily Usage/Inventory Days Summary',
      rawMaterialCat: 'Raw material category name',
      whInventoryTons: 'WH inventory (tons)',
      dailyUsageTons: 'Daily usage (tons)',
      usageRatio: 'Usage ratio',
      avgInvDays: 'Current average inventory days',
      copyAsImage: 'Copy as Image',
      copying: 'Copying...',
      stdInvSettings: 'Standard Inventory Settings',
      indiaDays: 'INDIA (Days)',
      otherDays: 'OTHER (Days)',
      matUsageInventory: 'Raw Material Usage & Inventory Level Summary',
      stdInventoryTons: 'Standard inventory (tons)',
      inventoryLevelRate: 'Inventory level rate',
      warehouse: 'Warehouse',
      section: 'Section',
      inv: 'Inv.',
      materialDetails: 'Material Details',
      materialGroup: 'Material Group'
    },
    zh: {
      title: 'MRI 原料管理',
      subtitle: '原料管理',
      settings: '設置',
      summary: '摘要',
      detailedSummary: '詳細摘要',
      exportCsv: '導出 CSV',
      allCategories: '所有類別',
      fetching: '正在獲取數據並計算消耗...',
      waitMessage: '這可能需要幾秒鐘，具體取決於表格大小。',
      warehouseInv: '倉庫庫存',
      sectionInv: '部門庫存',
      totalInv: '總庫存',
      invDays: '庫存天數',
      usage: '用量',
      materialCode: '物料代碼',
      materialName: '物料名稱',
      country: '國家',
      category: '類別',
      originSummary: '詳細來源摘要 (進口 vs 本地)',
      imported: '進口',
      local: '本地',
      total: '總計',
      days: '天',
      india: '印度',
      others: '其他',
      config: '配置',
      googleSheets: 'Google 表格 URL',
      inventoryDays: '庫存天數計算',
      save: '保存配置',
      close: '關閉',
      matUsage: '物料用量 (kg)',
      groupTotalInv: '分組總庫存',
      stdInv: '標準庫存',
      status: '狀態',
      surplus: '盈餘',
      shortage: '短缺',
      ok: '正常',
      unknown: '未知',
      uncategorized: '未分類',
      infoConsolidation: '信息整合',
      whRawMaterialSummary: '倉庫原材料每日用量/庫存天數摘要',
      rawMaterialCat: '原材料類別名稱',
      whInventoryTons: '倉庫庫存 (噸)',
      dailyUsageTons: '每日用量 (噸)',
      usageRatio: '用量比例',
      avgInvDays: '當前平均庫存天數',
      copyAsImage: '複製為圖片',
      copying: '正在複製...',
      stdInvSettings: '標準庫存設置',
      indiaDays: '印度 (天)',
      otherDays: '其他 (天)',
      matUsageInventory: '原材料用量及庫存水平摘要',
      stdInventoryTons: '標準庫存 (噸)',
      inventoryLevelRate: '庫存水平率',
      warehouse: '倉庫',
      section: '部門',
      inv: '庫存',
      materialDetails: '物料詳情',
      materialGroup: '物料組'
    }
  }[lang];

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    handleCalculate();
  }, []);

  const summaryRef = useRef<HTMLDivElement>(null);
  const detailedSummaryRef = useRef<HTMLDivElement>(null);

  const copyAsImage = async (ref: React.RefObject<HTMLDivElement>) => {
    if (!ref.current) return;
    
    setIsCopying(true);
    try {
      // Create a temporary clone for capture to ensure it's always desktop-sized
      const blob = await toBlob(ref.current, {
        backgroundColor: '#ffffff',
        pixelRatio: 3,
        width: 1400,
        style: {
          margin: '0',
          padding: '40px',
          transform: 'none',
          width: '1400px',
          display: 'block',
          zoom: '1'
        }
      });
      
      if (blob) {
        await navigator.clipboard.write([
          new ClipboardItem({
            [blob.type]: blob
          })
        ]);
        alert('Dashboard copied to clipboard as image! You can now paste it in WhatsApp, Excel, etc.');
      }
    } catch (err) {
      console.error('Failed to copy image:', err);
      alert('Failed to copy image. Please try again. Note: This feature may require a modern browser.');
    } finally {
      setIsCopying(false);
    }
  };

  const fetchGoogleSheet = async (url: string): Promise<any[][]> => {
    try {
      // Extract ID and GID from the URL
      const idMatch = url.match(/\/d\/([a-zA-Z0-9-_]+)/);
      if (!idMatch) {
        throw new Error("Invalid Google Sheets URL. Please make sure it contains /d/SPREADSHEET_ID");
      }
      const id = idMatch[1];
      
      const gidMatch = url.match(/[?&]gid=([0-9]+)/);
      const gid = gidMatch ? gidMatch[1] : '0';
      
      const exportUrl = `https://docs.google.com/spreadsheets/d/${id}/export?format=csv&gid=${gid}`;

      const response = await fetch(exportUrl);
      
      // Check if the response is HTML (which usually means a login redirect)
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('text/html')) {
        throw new Error('The Google Sheet is not public. Please set sharing to "Anyone with the link can view" in Google Sheets.');
      }

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          throw new Error(`Access Denied (Status ${response.status}). Please ensure the Google Sheet sharing settings are set to "Anyone with the link can view".`);
        }
        throw new Error(`Failed to fetch sheet from Google. Status: ${response.status}`);
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
    if (!matRow) throw new Error(`Material codes row (Row ${parsedConfig.matRow}) not found in Spec Database.`);
    
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
      
      if (!inventory[matCode]) {
        inventory[matCode] = {
          materialName: matName,
          warehouseInventory: 0,
          sectionInventory: 0,
          underQA: 0
        };
      }
      
      // Unrestricted and Quality depend on storage location
      const locationQty = unrestricted + quality;
      if (storageLocation === '1001') {
        inventory[matCode].warehouseInventory += locationQty;
      } else {
        inventory[matCode].sectionInventory += locationQty;
      }
      
      // Track QA testing data separately (Column H)
      inventory[matCode].underQA += quality;
      
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
        materialName: String(row[1] || '').trim(),
        countryOfOrigin: String(row[2] || '').trim(),
        category: String(row[3] || '').trim() || 'Uncategorized',
        materialGroup: String(row[4] || '').trim() || matCode
      };
    }
    return db;
  };

  const parseExtraUsage = (data: any[][]): Record<string, number> => {
    const extraUsage: Record<string, number> = {};
    const matCodeCol = colToIndex('I');
    const usageCol = colToIndex('K');

    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (!row) continue;
      
      const matCode = String(row[matCodeCol] || '').trim();
      const usage = parseFloat(row[usageCol]);
      
      if (matCode && !isNaN(usage) && usage > 0) {
        extraUsage[matCode] = (extraUsage[matCode] || 0) + usage;
      }
    }
    return extraUsage;
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
      const extraUsageMap = parseExtraUsage(dbData);

      if (specs.length === 0) throw new Error('No active specs (marked with "V") found in Spec Database.');
      if (planned.length === 0) throw new Error('No valid production batches found in Production Plan.');

      const consumption: Record<string, number> = {};
      
      // Add extra usage from database sheet
      for (const [matCode, usage] of Object.entries(extraUsageMap)) {
        consumption[matCode] = (consumption[matCode] || 0) + usage;
      }
      
      for (const plan of planned) {
        const baseCode = plan.rubberName.substring(0, 4);
        
        const matchingSpecs = specs.filter(s => {
          const isPlanExact = plan.rubberName === '0751NPT' || plan.rubberName === '7331NPT';
          const isSpecExact = s.rubberName === '0751NPT' || s.rubberName === '7331NPT';
          
          if (isPlanExact || isSpecExact) {
            return s.rubberName === plan.rubberName;
          }
          
          return s.baseCode === baseCode;
        });
        
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
          const inv = inventory[materialCode] || { materialName: 'Unknown', warehouseInventory: 0, sectionInventory: 0, underQA: 0 };
          const dbInfo = database[materialCode] || { countryOfOrigin: '', category: 'Uncategorized', materialGroup: materialCode };
          const totalInventory = inv.warehouseInventory + inv.sectionInventory;
          
          let category = dbInfo.category;
          const normalizedCat = category.trim().toUpperCase();
          if (normalizedCat === 'BEAD WIRE' || normalizedCat === 'PLY CORD') {
            category = 'Bead wire & PLY CORD';
          }

          // Skip if there's no usage AND no warehouse inventory
          if (totalKg === 0 && inv.warehouseInventory === 0) return null;

          // Skip if material starts with "DF" and has no material name in the database sheet
          if (materialCode.startsWith('DF') && (!database[materialCode] || !database[materialCode].materialName)) {
            return null;
          }

          // Skip specific uncategorized items that are not actual usage materials
          if (category === 'Uncategorized') {
            const searchStr = `${inv.materialName} ${materialCode}`.toUpperCase();
            if (
              searchStr.includes('RUBBER COMPOUND') || 
              searchStr.includes('SAP CODE') || 
              searchStr.includes('RECYCLE RUBBER')
            ) {
              return null;
            }
          }

          const inventoryDays = totalKg > 0 ? totalInventory / totalKg : 0;
          
          return {
            materialCode,
            materialName: inv.materialName,
            totalKg,
            warehouseInventory: inv.warehouseInventory,
            sectionInventory: inv.sectionInventory,
            totalInventory,
            underQA: inv.underQA || 0,
            inventoryDays,
            countryOfOrigin: dbInfo.countryOfOrigin,
            category,
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
      (items as ConsumptionResult[]).forEach(r => {
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
        
        <div className="flex flex-col items-center gap-6 mb-8">
          <header className="text-center space-y-2">
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">
              {t.title} {t.subtitle}
            </h1>
          </header>
          <div className="flex flex-wrap justify-center gap-3">
            <button 
              onClick={() => setLang(lang === 'en' ? 'zh' : 'en')}
              className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-xl shadow-sm hover:bg-slate-50 text-slate-600 transition-all hover:shadow-md"
              title={lang === 'en' ? 'Switch to Chinese' : '切換至英文'}
            >
              <Languages className="w-5 h-5" />
              <span className="hidden sm:inline text-sm font-medium">{lang === 'en' ? 'Chinese' : 'English'}</span>
            </button>
            <button 
              onClick={() => setShowSettings(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-xl shadow-sm hover:bg-slate-50 text-slate-600 transition-all hover:shadow-md"
              title={t.settings}
            >
              <Settings2 className="w-5 h-5" />
              <span className="hidden sm:inline text-sm font-medium">{t.settings}</span>
            </button>
            <button 
              onClick={() => setShowSummaryModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-xl shadow-sm hover:bg-slate-50 text-indigo-600 transition-all hover:shadow-md"
              title={t.summary}
            >
              <LayoutDashboard className="w-5 h-5" />
              <span className="hidden sm:inline text-sm font-medium">{t.summary}</span>
            </button>
            <button 
              onClick={() => setShowDetailedSummaryModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-xl shadow-sm hover:bg-slate-50 text-emerald-600 transition-all hover:shadow-md"
              title={t.detailedSummary}
            >
              <BarChart3 className="w-5 h-5" />
              <span className="hidden sm:inline text-sm font-medium">{t.detailedSummary}</span>
            </button>
            {Object.keys(categorizedResults).length > 0 && (
              <button
                onClick={exportToCSV}
                className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-xl shadow-sm hover:bg-slate-50 text-amber-600 transition-all hover:shadow-md"
                title={t.exportCsv}
              >
                <Download className="w-5 h-5" />
                <span className="hidden sm:inline text-sm font-medium">{t.exportCsv}</span>
              </button>
            )}
          </div>
        </div>

        {showDetailedSummaryModal && (
          <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-7xl max-h-[90vh] overflow-hidden flex flex-col">
              <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                <h3 className="text-lg font-semibold text-slate-900">{t.originSummary}</h3>
                <button onClick={() => setShowDetailedSummaryModal(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-2 md:p-6 overflow-auto bg-slate-100 flex flex-col items-center">
                <div 
                  ref={detailedSummaryRef} 
                  className="bg-white shadow-sm origin-top transition-transform" 
                  style={{ 
                    width: '1300px',
                    ...({
                      zoom: windowWidth < 1300 ? (windowWidth - 40) / 1300 : 1
                    } as any)
                  }}
                >
                  {Object.keys(categorizedResults).length === 0 ? (
                    <div className="text-center py-12 text-slate-500 bg-white w-full">
                      Please calculate consumption first to see the detailed summary.
                    </div>
                  ) : (() => {
                    const detailedSummary: Record<string, {
                      totalInv: number;
                      imported: { inv: number; setting: number; usage: number };
                      local: { inv: number; setting: number; usage: number };
                    }> = {};

                    Object.entries(categorizedResults).forEach(([category, items]) => {
                      let totalInv = 0;
                      const imported = { inv: 0, setting: 0, usage: 0 };
                      const local = { inv: 0, setting: 0, usage: 0 };

                      (items as ConsumptionResult[]).forEach(item => {
                        const isLocal = item.countryOfOrigin.toUpperCase() === 'INDIA';
                        const stdDays = isLocal ? indiaDays : otherDays;
                        const setting = item.totalKg * stdDays;
                        
                        totalInv += item.warehouseInventory;
                        if (isLocal) {
                          local.inv += item.warehouseInventory;
                          local.setting += setting;
                          local.usage += item.totalKg;
                        } else {
                          imported.inv += item.warehouseInventory;
                          imported.setting += setting;
                          imported.usage += item.totalKg;
                        }
                      });

                      detailedSummary[category] = { totalInv, imported, local };
                    });

                    const grandTotalInv = Object.values(detailedSummary).reduce((sum, d) => sum + d.totalInv, 0);
                    const grandTotalUsage = Object.values(detailedSummary).reduce((sum, d) => sum + (d.imported.usage + d.local.usage), 0);
                    const grandTotalSetting = Object.values(detailedSummary).reduce((sum, d) => sum + (d.imported.setting + d.local.setting), 0);
                    
                    const totalImportedInv = Object.values(detailedSummary).reduce((sum, d) => sum + d.imported.inv, 0);
                    const totalLocalInv = Object.values(detailedSummary).reduce((sum, d) => sum + d.local.inv, 0);

                    const today = new Date().toLocaleDateString('en-GB').replace(/\//g, '-');

                    return (
                      <div className="space-y-6 p-4">
                        <div className="bg-[#fff2cc] p-4 rounded-t-xl border-x border-t border-slate-300 flex justify-between items-center">
                          <span className="text-xl font-bold">{today}</span>
                          <h2 className="text-2xl font-bold text-center flex-1">{t.whRawMaterialSummary}</h2>
                        </div>
                        <div className="overflow-hidden border border-slate-300 rounded-b-xl">
                          <table className="w-full text-[13px] text-left border-collapse bg-white">
                            <thead>
                              <tr className="bg-[#a9d18e] border-b border-slate-300 text-slate-900 font-bold">
                                <th className="px-2 py-3 border-r border-slate-300 text-center">{t.rawMaterialCat}</th>
                                <th className="px-2 py-3 border-r border-slate-300 text-center">{t.whInventoryTons}</th>
                                <th className="px-2 py-3 border-r border-slate-300 text-center bg-[#ffd966]">{t.origin}</th>
                                <th className="px-2 py-3 border-r border-slate-300 text-center bg-[#ffd966]">{t.usageRatio}</th>
                                <th className="px-2 py-3 border-r border-slate-300 text-center bg-[#ffd966]">{t.whInventoryTons}</th>
                                <th className="px-2 py-3 border-r border-slate-300 text-center bg-[#00b0f0] text-white">{t.stdInventoryTons}</th>
                                <th className="px-2 py-3 border-r border-slate-300 text-center bg-[#00b0f0] text-white">{t.inventoryLevelRate}</th>
                                <th className="px-2 py-3 border-r border-slate-300 text-center bg-[#92d050]">{t.dailyUsageTons}</th>
                                <th className="px-2 py-3 text-center bg-[#ffcc00]">{t.avgInvDays}</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-300">
                              {Object.entries(detailedSummary).map(([cat, data]) => {
                                const catUsage = data.imported.usage + data.local.usage;
                                const catInvDays = catUsage > 0 ? data.totalInv / catUsage : 0;
                                
                                return (
                                  <React.Fragment key={cat}>
                                    <tr className="border-b border-slate-300">
                                      <td rowSpan={2} className="px-2 py-4 border-r border-slate-300 text-center font-bold text-slate-900">{cat}</td>
                                      <td rowSpan={2} className="px-2 py-4 border-r border-slate-300 text-center font-bold text-3xl bg-[#f2f2f2]">{(data.totalInv / 1000).toFixed(0)}</td>
                                      <td className="px-2 py-2 border-r border-slate-300 text-center text-xs">{t.imported}<br/><span className="italic">Imported materials</span></td>
                                      <td className="px-2 py-2 border-r border-slate-300 text-center font-bold">{(grandTotalInv > 0 ? (data.imported.inv / grandTotalInv) * 100 : 0).toFixed(1)}%</td>
                                      <td className="px-2 py-2 border-r border-slate-300 text-center font-bold">{(data.imported.inv / 1000).toFixed(0)}</td>
                                      <td className="px-2 py-2 border-r border-slate-300 text-center font-bold">{(data.imported.setting / 1000).toFixed(0)}</td>
                                      <td className="px-2 py-2 border-r border-slate-300 text-center font-bold">{(data.imported.setting > 0 ? (data.imported.inv / data.imported.setting) * 100 : 0).toFixed(0)}%</td>
                                      <td className="px-2 py-2 border-r border-slate-300 text-center font-bold">{(data.imported.usage / 1000).toFixed(1)}</td>
                                      <td rowSpan={2} className="px-2 py-4 text-center font-bold text-4xl bg-[#fff2cc]">{catInvDays.toFixed(0)}</td>
                                    </tr>
                                    <tr className="border-b border-slate-300">
                                      <td className="px-2 py-2 border-r border-slate-300 text-center text-xs">{t.local}<br/><span className="italic">Local materials</span></td>
                                      <td className="px-2 py-2 border-r border-slate-300 text-center font-bold">{(grandTotalInv > 0 ? (data.local.inv / grandTotalInv) * 100 : 0).toFixed(1)}%</td>
                                      <td className="px-2 py-2 border-r border-slate-300 text-center font-bold">{(data.local.inv / 1000).toFixed(0)}</td>
                                      <td className="px-2 py-2 border-r border-slate-300 text-center font-bold">{(data.local.setting / 1000).toFixed(0)}</td>
                                      <td className="px-2 py-2 border-r border-slate-300 text-center font-bold">{(data.local.setting > 0 ? (data.local.inv / data.local.setting) * 100 : 0).toFixed(0)}%</td>
                                      <td className="px-2 py-2 border-r border-slate-300 text-center font-bold">{(data.local.usage / 1000).toFixed(1)}</td>
                                    </tr>
                                  </React.Fragment>
                                );
                              })}
                              <tr className="bg-[#a9d18e] text-slate-900 font-bold border-t-2 border-slate-400">
                                <td className="px-2 py-4 border-r border-slate-300 text-center">{t.dailyUsageTons}</td>
                                <td className="px-2 py-4 border-r border-slate-300 text-center text-3xl">{(grandTotalUsage / 1000).toFixed(1)}</td>
                                <td className="px-2 py-4 border-r border-slate-300 text-center bg-[#ffd966]">{t.whInventoryTons}</td>
                                <td className="px-2 py-4 border-r border-slate-300 text-center text-3xl bg-[#f2f2f2]">{ (grandTotalInv / 1000).toFixed(0) }</td>
                                <td className="px-2 py-4 border-r border-slate-300 text-center bg-[#00b0f0] text-white">{t.stdInventoryTons}</td>
                                <td className="px-2 py-4 border-r border-slate-300 text-center text-3xl bg-[#f2f2f2]">{(grandTotalSetting / 1000).toFixed(0)}</td>
                                <td className="px-2 py-4 border-r border-slate-300 text-center bg-[#92d050]">{t.invDays}</td>
                                <td colSpan={2} className="px-2 py-4 text-center text-4xl bg-[#f2f2f2]">{grandTotalUsage > 0 ? (grandTotalInv / grandTotalUsage).toFixed(0) : 0}</td>
                              </tr>
                            </tbody>
                          </table>
                        </div>

                        <div className="w-full border-2 border-slate-400 rounded-xl overflow-hidden">
                          <table className="w-full text-2xl text-left border-collapse bg-white">
                            <tbody className="divide-y divide-slate-300">
                              <tr>
                                <td className="px-6 py-4 font-bold text-slate-900 border-r border-slate-300">{t.imported} (tons)</td>
                                <td className="px-6 py-4 text-center font-bold border-r border-slate-300">{(totalImportedInv / 1000).toFixed(0)}</td>
                                <td className="px-6 py-4 text-center font-bold text-slate-900">{(grandTotalInv > 0 ? (totalImportedInv / grandTotalInv) * 100 : 0).toFixed(1)}%</td>
                              </tr>
                              <tr>
                                <td className="px-6 py-4 font-bold text-slate-900 border-r border-slate-300">{t.local} (tons)</td>
                                <td className="px-6 py-4 text-center font-bold border-r border-slate-300">{(totalLocalInv / 1000).toFixed(0)}</td>
                                <td className="px-6 py-4 text-center font-bold text-slate-900">{(grandTotalInv > 0 ? (totalLocalInv / grandTotalInv) * 100 : 0).toFixed(1)}%</td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>
              <div className="px-6 py-4 border-t border-slate-100 flex justify-between items-center bg-slate-50">
                <button 
                  onClick={() => copyAsImage(detailedSummaryRef)}
                  disabled={isCopying || Object.keys(categorizedResults).length === 0}
                  className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-700 rounded-xl font-medium hover:bg-emerald-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isCopying ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  {isCopying ? 'Copying...' : 'Copy as Image'}
                </button>
                <button 
                  onClick={() => setShowDetailedSummaryModal(false)} 
                  className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-colors shadow-sm"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {showSummaryModal && (
          <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
              <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                <h3 className="text-lg font-semibold text-slate-900">{t.summary}</h3>
                <button onClick={() => setShowSummaryModal(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-2 md:p-6 overflow-auto bg-slate-100 flex flex-col items-center">
                <div 
                  ref={summaryRef} 
                  className="bg-white shadow-sm origin-top p-8 space-y-8 transition-transform" 
                  style={{ 
                    width: '1200px',
                    ...({
                      zoom: windowWidth < 1200 ? (windowWidth - 40) / 1200 : 1
                    } as any)
                  }}
                >
                  {Object.keys(categorizedResults).length === 0 ? (
                    <div className="text-center py-12 text-slate-500 bg-white w-full">
                      Please calculate consumption first to see the summary dashboard.
                    </div>
                  ) : (() => {
                    const summary: Record<string, { whInventory: number; invSetting: number; dailyUsage: number }> = {};
                    Object.entries(categorizedResults).forEach(([category, items]) => {
                      let whInventory = 0;
                      let invSetting = 0;
                      let dailyUsage = 0;
                      (items as ConsumptionResult[]).forEach(item => {
                        whInventory += item.warehouseInventory;
                        const stdDays = item.countryOfOrigin.toUpperCase() === 'INDIA' ? indiaDays : otherDays;
                        invSetting += item.totalKg * stdDays;
                        dailyUsage += item.totalKg;
                      });
                      summary[category] = { whInventory, invSetting, dailyUsage };
                    });

                    const totalWh = Object.values(summary).reduce((sum, d) => sum + d.whInventory, 0);
                    const totalSetting = Object.values(summary).reduce((sum, d) => sum + d.invSetting, 0);
                    const totalUsage = Object.values(summary).reduce((sum, d) => sum + d.dailyUsage, 0);

                    return (
                      <>
                        <div className="space-y-4">
                          <h4 className="text-sm font-bold uppercase tracking-wider text-slate-500">{t.matUsageInventory}</h4>
                          <div className="overflow-hidden border border-slate-300 rounded-xl shadow-sm">
                            <table className="w-full text-sm text-left border-collapse">
                              <thead>
                                <tr className="bg-[#f8fafc] border-b border-slate-300">
                                  <th className="px-4 py-3 font-bold text-slate-700 bg-slate-100 border-r border-slate-300">{t.rawMaterialCat}</th>
                                  <th className="px-4 py-3 font-bold text-slate-700 text-right border-r border-slate-300">{t.whInventoryTons}</th>
                                  <th className="px-4 py-3 font-bold text-white text-right bg-[#00b0f0] border-r border-slate-300">{t.stdInventoryTons}</th>
                                  <th className="px-4 py-3 font-bold text-slate-700 text-right bg-[#ffd966] border-r border-slate-300">{t.usageRatio}</th>
                                  <th className="px-4 py-3 font-bold text-white text-right bg-[#00b0f0]">{t.inventoryLevelRate}</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-200">
                                {Object.entries(summary).map(([cat, data]) => {
                                  const ratio = totalWh > 0 ? (data.whInventory / totalWh) * 100 : 0;
                                  const levelRate = data.invSetting > 0 ? (data.whInventory / data.invSetting) * 100 : 0;
                                  return (
                                    <tr key={cat} className="hover:bg-slate-50 transition-colors">
                                      <td className="px-4 py-3 text-slate-900 font-medium border-r border-slate-200">{cat}</td>
                                      <td className="px-4 py-3 text-right font-bold text-slate-700 border-r border-slate-200">{(data.whInventory / 1000).toFixed(0)}</td>
                                      <td className="px-4 py-3 text-right font-bold text-slate-700 border-r border-slate-200">{(data.invSetting / 1000).toFixed(0)}</td>
                                      <td className="px-4 py-3 text-right font-bold text-slate-700 border-r border-slate-200 bg-[#fff9db]">{ratio.toFixed(1)}%</td>
                                      <td className="px-4 py-3 text-right font-bold text-slate-700 bg-[#e0f2fe]">{levelRate.toFixed(1)}%</td>
                                    </tr>
                                  );
                                })}
                                <tr className="bg-[#22c55e] text-white font-bold text-lg">
                                  <td className="px-4 py-4 border-r border-green-600">{t.infoConsolidation}</td>
                                  <td className="px-4 py-4 text-right border-r border-green-600">{(totalWh / 1000).toFixed(0)}</td>
                                  <td className="px-4 py-4 text-right border-r border-green-600">{(totalSetting / 1000).toFixed(0)}</td>
                                  <td className="px-4 py-4 text-right border-r border-green-600">100%</td>
                                  <td className="px-4 py-4 text-right">{totalSetting > 0 ? ((totalWh / totalSetting) * 100).toFixed(0) : 0}%</td>
                                </tr>
                              </tbody>
                            </table>
                          </div>
                        </div>

                        {/* Table 2 */}
                        <div className="space-y-4">
                          <div className="flex justify-between items-end">
                            <h4 className="text-sm font-bold uppercase tracking-wider text-slate-500">{t.whRawMaterialSummary}</h4>
                            <span className="text-xs font-mono text-slate-400">{new Date().toLocaleDateString()}</span>
                          </div>
                          <div className="overflow-hidden border border-slate-300 rounded-xl shadow-sm">
                            <table className="w-full text-sm text-left border-collapse">
                              <thead>
                                <tr className="bg-[#f8fafc] border-b border-slate-300">
                                  <th className="px-4 py-3 font-bold text-slate-700 bg-slate-100 border-r border-slate-300">{t.rawMaterialCat}</th>
                                  <th className="px-4 py-3 font-bold text-slate-700 text-right border-r border-slate-300">{t.whInventoryTons}</th>
                                  <th className="px-4 py-3 font-bold text-slate-700 text-right bg-[#92d050] border-r border-slate-300">{t.dailyUsageTons}</th>
                                  <th className="px-4 py-3 font-bold text-slate-700 text-right bg-[#ffd966] border-r border-slate-300">{t.usageRatio}</th>
                                  <th className="px-4 py-3 font-bold text-slate-900 text-right bg-[#ffcc00]">{t.avgInvDays}</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-200">
                                {Object.entries(summary).map(([cat, data]) => {
                                  const usageRatio = totalUsage > 0 ? (data.dailyUsage / totalUsage) * 100 : 0;
                                  const invDays = data.dailyUsage > 0 ? data.whInventory / data.dailyUsage : 0;
                                  return (
                                    <tr key={cat} className="hover:bg-slate-50 transition-colors">
                                      <td className="px-4 py-3 text-slate-900 font-medium border-r border-slate-200">{cat}</td>
                                      <td className="px-4 py-3 text-right font-bold text-slate-700 border-r border-slate-200">{(data.whInventory / 1000).toFixed(0)}</td>
                                      <td className="px-4 py-3 text-right font-bold text-slate-700 border-r border-slate-200 bg-[#f0fdf4]">{(data.dailyUsage / 1000).toFixed(1)}</td>
                                      <td className="px-4 py-3 text-right font-bold text-slate-700 border-r border-slate-200 bg-[#fff9db]">{usageRatio.toFixed(1)}%</td>
                                      <td className="px-4 py-3 text-right font-bold text-slate-900 bg-[#fffbeb]">{invDays.toFixed(0)}</td>
                                    </tr>
                                  );
                                })}
                                <tr className="bg-[#22c55e] text-white font-bold text-lg">
                                  <td className="px-4 py-4 border-r border-green-600">{t.infoConsolidation}</td>
                                  <td className="px-4 py-4 text-right border-r border-green-600">{(totalWh / 1000).toFixed(0)}</td>
                                  <td className="px-4 py-4 text-right border-r border-green-600">{(totalUsage / 1000).toFixed(0)}</td>
                                  <td className="px-4 py-4 text-right border-r border-green-600">100%</td>
                                  <td className="px-4 py-4 text-right">{totalUsage > 0 ? (totalWh / totalUsage).toFixed(0) : 0}</td>
                                </tr>
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>
              <div className="px-6 py-4 border-t border-slate-100 flex justify-between items-center bg-slate-50">
                <button 
                  onClick={() => copyAsImage(summaryRef)}
                  disabled={isCopying || Object.keys(categorizedResults).length === 0}
                  className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-700 rounded-xl font-medium hover:bg-emerald-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isCopying ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  {isCopying ? t.copying : t.copyAsImage}
                </button>
                <button 
                  onClick={() => setShowSummaryModal(false)} 
                  className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-colors shadow-sm"
                >
                  {t.close}
                </button>
              </div>
            </div>
          </div>
        )}

        {showSettings && (
          <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                <h3 className="text-lg font-semibold text-slate-900">{t.stdInvSettings}</h3>
                <button onClick={() => setShowSettings(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-6 space-y-5">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">{t.indiaDays}</label>
                  <input 
                    type="number" 
                    value={indiaDays} 
                    onChange={e => setIndiaDays(Number(e.target.value))} 
                    className="w-full px-4 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-shadow" 
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">{t.otherDays}</label>
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
                  {t.close}
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

        {/* Loading State */}
        {isCalculating && Object.keys(categorizedResults).length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl shadow-sm border border-slate-200">
            <div className="w-12 h-12 border-4 border-indigo-600/30 border-t-indigo-600 rounded-full animate-spin mb-4" />
            <p className="text-slate-600 font-medium">{t.fetching}</p>
            <p className="text-slate-400 text-sm mt-2">{t.waitMessage}</p>
          </div>
        )}

        {/* Filters and Search */}
        {Object.keys(categorizedResults).length > 0 && (
          <div className="mb-6 flex flex-col sm:flex-row items-center justify-center gap-4">
            {/* Category Filter Dropdown */}
            <div className="w-full sm:w-64">
              <div className="relative">
                <select
                  value={selectedCategory || ''}
                  onChange={(e) => setSelectedCategory(e.target.value || null)}
                  className="w-full appearance-none bg-white border border-slate-200 text-slate-700 py-2.5 px-4 pr-10 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all font-medium text-sm"
                >
                  <option value="">{t.allCategories}</option>
                  {Object.keys(categorizedResults).sort().map(cat => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-500">
                  <ChevronDown className="h-4 w-4" />
                </div>
              </div>
            </div>

            {/* Search Bar */}
            <div className="w-full sm:w-64 bg-white px-4 py-2.5 rounded-xl shadow-sm border border-slate-200 flex items-center gap-3">
              <Search className="w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search material..."
                className="flex-1 bg-transparent border-none focus:ring-0 text-slate-900 placeholder:text-slate-400 outline-none text-sm"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        )}

        {Object.entries(categorizedResults)
          .filter(([category]) => !selectedCategory || category === selectedCategory)
          .map(([category, items]) => {
            const catItems = (items as ConsumptionResult[]).filter(item => 
              item.materialCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
              item.materialName.toLowerCase().includes(searchTerm.toLowerCase())
            );

            if (catItems.length === 0) return null;

            const totalInv = catItems.reduce((sum, item) => sum + item.totalInventory, 0);
            const totalWarehouseInv = catItems.reduce((sum, item) => sum + item.warehouseInventory, 0);
            const totalSectionInv = catItems.reduce((sum, item) => sum + item.sectionInventory, 0);
            const totalUsage = catItems.reduce((sum, item) => sum + item.totalKg, 0);
            const avgInvDays = totalUsage > 0 ? totalInv / totalUsage : 0;
            const stdInv = catItems.reduce((sum, item) => sum + (item.totalKg * (item.countryOfOrigin.toUpperCase() === 'INDIA' ? indiaDays : otherDays)), 0);

            return (
          <div key={category} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="px-6 py-5 border-b border-slate-200 flex flex-col xl:flex-row xl:items-center justify-between bg-slate-50/50 gap-4">
              <h2 className="text-lg font-semibold text-slate-900 min-w-[200px]">{category}</h2>
              <div className="flex flex-wrap gap-6 text-sm bg-white px-4 py-2 rounded-lg border border-slate-200 shadow-sm xl:ml-auto">
                <div className="flex flex-col">
                  <span className="text-slate-500 text-xs font-medium uppercase tracking-wider">Total Inv</span>
                  <span className="font-semibold text-slate-900 font-mono">{totalInv.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-slate-500 text-xs font-medium uppercase tracking-wider">Warehouse Inv</span>
                  <span className="font-semibold text-slate-900 font-mono">{totalWarehouseInv.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-slate-500 text-xs font-medium uppercase tracking-wider">Section Inv</span>
                  <span className="font-semibold text-slate-900 font-mono">{totalSectionInv.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-slate-500 text-xs font-medium uppercase tracking-wider">Total Usage</span>
                  <span className="font-semibold text-slate-900 font-mono">{totalUsage.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-slate-500 text-xs font-medium uppercase tracking-wider">Avg Inv Days</span>
                  <span className="font-semibold text-slate-900 font-mono">{avgInvDays.toLocaleString(undefined, { maximumFractionDigits: 1 })}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-slate-500 text-xs font-medium uppercase tracking-wider">Std Inv</span>
                  <span className="font-semibold text-slate-900 font-mono">{stdInv.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                </div>
              </div>
            </div>
            
            <div className="overflow-x-auto overflow-y-auto max-h-[500px] border-t border-slate-100 flex flex-col items-center">
              <div 
                className="origin-top transition-transform"
                style={{
                  width: '1200px',
                  ...({
                    zoom: windowWidth < 1200 ? (windowWidth - 32) / 1200 : 1
                  } as any)
                }}
              >
                <table className="w-full text-sm text-left border-collapse">
                  <thead className="sticky top-0 z-10">
                    <tr className="bg-slate-800 border-b border-slate-700">
                      <th className="px-6 py-3 text-xs font-semibold text-slate-200 uppercase tracking-wider">{t.materialCode}</th>
                      <th className="px-6 py-3 text-xs font-semibold text-slate-200 uppercase tracking-wider">{t.materialName}</th>
                      <th className="px-6 py-3 text-xs font-semibold text-slate-200 uppercase tracking-wider text-right">{t.usage} (kg)</th>
                      <th className="px-6 py-3 text-xs font-semibold text-slate-200 uppercase tracking-wider text-right">{t.warehouse} {t.inv}</th>
                      <th className="px-6 py-3 text-xs font-semibold text-slate-200 uppercase tracking-wider text-right">{t.section} {t.inv}</th>
                      <th className="px-6 py-3 text-xs font-semibold text-slate-200 uppercase tracking-wider text-right">{t.total} {t.inv}</th>
                      <th className="px-6 py-3 text-xs font-semibold text-slate-200 uppercase tracking-wider text-right">{t.invDays}</th>
                      <th className="px-6 py-3 text-xs font-semibold text-slate-200 uppercase tracking-wider text-right border-l border-slate-600">{t.groupInvDays || 'Grp Days'}</th>
                      <th className="px-6 py-3 text-xs font-semibold text-slate-200 uppercase tracking-wider text-right border-l border-slate-600">{t.groupTotalInv}</th>
                      <th className="px-6 py-3 text-xs font-semibold text-slate-200 uppercase tracking-wider text-right">{t.stdInv}</th>
                      <th className="px-6 py-3 text-xs font-semibold text-slate-200 uppercase tracking-wider">{t.country || 'Origin'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {catItems.map((result, idx) => {
                      const stdDays = result.countryOfOrigin.toUpperCase() === 'INDIA' ? indiaDays : otherDays;
                      const standardInventory = result.totalKg * stdDays;
                      
                      return (
                      <tr 
                        key={idx} 
                        className="hover:bg-indigo-50/50 transition-colors even:bg-slate-50 cursor-pointer"
                        onDoubleClick={() => setSelectedMaterialDetails(result)}
                        title="Double click to view details"
                      >
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
          </div>
          );
        })}

        {selectedMaterialDetails && (
          <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col">
              <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                <h3 className="text-lg font-semibold text-slate-900">{t.materialDetails}</h3>
                <button onClick={() => setSelectedMaterialDetails(null)} className="text-slate-400 hover:text-slate-600 transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-6 overflow-y-auto max-h-[70vh]">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-slate-500">{t.materialCode}</p>
                    <p className="text-base font-semibold text-slate-900 font-mono">{selectedMaterialDetails.materialCode}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-slate-500">{t.materialName}</p>
                    <p className="text-base font-semibold text-slate-900">{selectedMaterialDetails.materialName}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-slate-500">{t.category}</p>
                    <p className="text-base font-semibold text-slate-900">{selectedMaterialDetails.category}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-slate-500">{t.materialGroup}</p>
                    <p className="text-base font-semibold text-slate-900">{selectedMaterialDetails.materialGroup}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-slate-500">{t.country}</p>
                    <p className="text-base font-semibold text-slate-900">{selectedMaterialDetails.countryOfOrigin || t.unknown}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-slate-500">{t.usage} (kg)</p>
                    <p className="text-base font-semibold text-slate-900 font-mono">{selectedMaterialDetails.totalKg.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-slate-500">{t.warehouseInv}</p>
                    <p className="text-base font-semibold text-slate-900 font-mono">{selectedMaterialDetails.warehouseInventory.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-slate-500">{t.sectionInv}</p>
                    <p className="text-base font-semibold text-slate-900 font-mono">{selectedMaterialDetails.sectionInventory.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-slate-500">{t.totalInv}</p>
                    <p className="text-base font-semibold text-slate-900 font-mono">{selectedMaterialDetails.totalInventory.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</p>
                  </div>
                  {selectedMaterialDetails.underQA > 0 && (
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-amber-600">Under QA Testing</p>
                      <p className="text-base font-semibold text-amber-700 font-mono">{selectedMaterialDetails.underQA.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</p>
                    </div>
                  )}
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-slate-500">{t.invDays}</p>
                    <p className="text-base font-semibold text-slate-900 font-mono">{selectedMaterialDetails.totalKg > 0 ? selectedMaterialDetails.inventoryDays.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 }) : '-'}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-slate-500">{t.stdInv}</p>
                    <p className="text-base font-semibold text-slate-900 font-mono">{(selectedMaterialDetails.totalKg * (selectedMaterialDetails.countryOfOrigin.toUpperCase() === 'INDIA' ? indiaDays : otherDays)).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-slate-500">{t.groupTotalInv}</p>
                    <p className="text-base font-semibold text-slate-900 font-mono">{selectedMaterialDetails.groupTotalInventory?.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 }) || '-'}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-slate-500">{t.groupInvDays || 'Grp Days'}</p>
                    <p className="text-base font-semibold text-slate-900 font-mono">{selectedMaterialDetails.groupTotalUsage! > 0 ? selectedMaterialDetails.groupTotalInvDays?.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 }) : '-'}</p>
                  </div>
                </div>
              </div>
              <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-end">
                <button
                  onClick={() => setSelectedMaterialDetails(null)}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors font-medium"
                >
                  {t.close}
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
