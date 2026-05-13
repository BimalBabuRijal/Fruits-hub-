import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";

const app = express();
const PORT = 3000;

app.use(express.json());

// API routes
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
