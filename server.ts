import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // API routes FIRST
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  app.get("/api/fetch-sheet", async (req, res) => {
    try {
      const { url } = req.query;
      if (!url || typeof url !== 'string') {
        return res.status(400).json({ error: "Missing or invalid url parameter" });
      }

      const idMatch = url.match(/\/d\/([a-zA-Z0-9-_]+)/);
      if (!idMatch) {
        return res.status(400).json({ error: "Invalid Google Sheets URL. Please make sure it contains /d/SPREADSHEET_ID" });
      }
      const id = idMatch[1];
      
      const gidMatch = url.match(/[?&]gid=([0-9]+)/);
      const gid = gidMatch ? gidMatch[1] : '0';
      
      const exportUrl = `https://docs.google.com/spreadsheets/d/${id}/export?format=csv&gid=${gid}`;
      
      const response = await fetch(exportUrl);
      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          return res.status(response.status).json({ 
            error: `Access Denied (Status ${response.status}). Please ensure the Google Sheet sharing settings are set to "Anyone with the link can view".` 
          });
        }
        return res.status(response.status).json({ error: `Failed to fetch sheet from Google. Status: ${response.status}` });
      }
      
      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.send(buffer);
    } catch (error: any) {
      console.error("Error fetching sheet:", error);
      res.status(500).json({ error: error.message || "Internal server error" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
