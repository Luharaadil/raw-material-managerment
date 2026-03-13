import * as XLSX from 'xlsx';

async function test() {
  const r = await fetch('https://docs.google.com/spreadsheets/d/1gQN98nrZx0HYfqXE35_HVjxMy0Y7XVXD/export?format=csv&gid=1963391384');
  const text = await r.text();
  const wb = XLSX.read(text, { type: 'string' });
  const data = XLSX.utils.sheet_to_json<any[]>(wb.Sheets[wb.SheetNames[0]], { header: 1 });

  for (let i = 0; i < Math.min(10, data.length); i++) {
    console.log(`Row ${i}:`, data[i]);
  }
}
test();
