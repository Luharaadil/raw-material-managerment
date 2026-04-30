import fs from 'fs';

async function test() {
  try {
    const url = 'https://docs.google.com/spreadsheets/d/1gQN98nrZx0HYfqXE35_HVjxMy0Y7XVXD/export?format=csv&gid=1029866475';
    const response = await fetch(url);
    const text = await response.text();
    const data = [[]]; // ignore first empty
    text.split('\n').forEach(line => {
      data.push(line.split(','));
    });
    
    for (let i = 1; i < 10; i++) {
        if(data[i]) {
            console.log("Expiry string:", String(data[i][20] || '').trim());
        }
    }
  } catch (e) {
    console.error(e);
  }
}
test();
