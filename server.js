const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 5000;
const DATA_FILE = path.join(__dirname, 'leaderboard.json');

// Initialize leaderboard file if it doesn't exist
if (!fs.existsSync(DATA_FILE)) {
  fs.writeFileSync(DATA_FILE, '[]');
}

function readLeaderboard() {
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  } catch(e) {
    return [];
  }
}

function writeLeaderboard(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data));
}

const server = http.createServer((req, res) => {
  // CORS headers for all responses
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // Leaderboard API
  if (req.url === '/api/leaderboard') {
    if (req.method === 'GET') {
      const data = readLeaderboard();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(data));
      return;
    }
    
    if (req.method === 'POST' || req.method === 'PUT') {
      let body = '';
      req.on('data', chunk => body += chunk);
      req.on('end', () => {
        try {
          const newData = JSON.parse(body);
          if (Array.isArray(newData)) {
            // Full replacement
            const sorted = newData.sort((a, b) => b.score - a.score).slice(0, 50);
            writeLeaderboard(sorted);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(sorted));
          } else if (newData.name && typeof newData.score === 'number') {
            // Single entry add
            const lb = readLeaderboard();
            lb.push({ name: newData.name.substring(0, 20), score: newData.score, date: Date.now() });
            lb.sort((a, b) => b.score - a.score);
            const trimmed = lb.slice(0, 50);
            writeLeaderboard(trimmed);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(trimmed));
          }
        } catch(e) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Invalid JSON' }));
        }
      });
      return;
    }
  }

  // Serve static files
  let filePath = req.url === '/' ? '/index.html' : req.url;
  filePath = path.join(__dirname, filePath);
  
  const ext = path.extname(filePath);
  const mimeTypes = {
    '.html': 'text/html',
    '.js': 'application/javascript', 
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
  };
  
  fs.readFile(filePath, (err, content) => {
    if (err) {
      res.writeHead(404);
      res.end('Not found');
      return;
    }
    res.writeHead(200, { 'Content-Type': mimeTypes[ext] || 'application/octet-stream' });
    res.end(content);
  });
});

server.listen(PORT, () => {
  console.log(`Primetime Catcher server running on port ${PORT}`);
});
