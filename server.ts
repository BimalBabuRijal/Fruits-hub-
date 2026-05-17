import express from "express";
import path from "path";
import fs from "fs/promises";
import { createServer as createViteServer } from "vite";

const app = express();
const PORT = 3000;

app.use(express.json());

// Helper to handle data file paths
const DATA_PATHS = {
  fruits: path.join(process.cwd(), 'public/data/fruits.json'),
  rewards: path.join(process.cwd(), 'public/data/rewards.json'),
  vouchers: path.join(process.cwd(), 'public/data/vouchers.json'),
  fitness_plans: path.join(process.cwd(), 'public/data/fitness_plans.json'),
  checkup_packages: path.join(process.cwd(), 'public/data/checkup_packages.json'),
  subscription_plans: path.join(process.cwd(), 'public/data/subscription_plans.json'),
};

// API routes for data persistence
app.get("/api/data/:type", async (req, res) => {
  const { type } = req.params;
  const filePath = DATA_PATHS[type as keyof typeof DATA_PATHS];
  
  if (!filePath) {
    return res.status(404).json({ error: "Data type not found" });
  }

  try {
    const data = await fs.readFile(filePath, "utf-8");
    res.json(JSON.parse(data));
  } catch (error) {
    console.error(`Error reading ${type} data:`, error);
    res.status(500).json({ error: "Failed to read data" });
  }
});

app.post("/api/data/:type", async (req, res) => {
  const { type } = req.params;
  const filePath = DATA_PATHS[type as keyof typeof DATA_PATHS];
  
  if (!filePath) {
    return res.status(404).json({ error: "Data type not found" });
  }

  try {
    await fs.writeFile(filePath, JSON.stringify(req.body, null, 2), "utf-8");
    res.json({ success: true });
  } catch (error) {
    console.error(`Error writing ${type} data:`, error);
    res.status(500).json({ error: "Failed to save data" });
  }
});

app.post("/api/notify-company", (req, res) => {
  const { type, details } = req.body;
  console.log(`[COMPANY NOTIFICATION] New ${type} received!`);
  console.log(`Details:`, JSON.stringify(details, null, 2));
  
  // In a real app, you'd use something like nodemailer or SendGrid here
  // const transporter = nodemailer.createTransport(...);
  // transporter.sendMail({ to: 'kopitebbr@gmail.com', ... });

  res.json({ success: true, message: "Company notified successfully" });
});

async function startServer() {
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
