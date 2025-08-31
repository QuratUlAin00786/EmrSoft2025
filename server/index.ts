import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { seedDatabase } from "./seed-data";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Font serving no longer needed - using Google Fonts direct

// Force deployment refresh  
console.log("🚀 FULL CASCADE DELETE - v20 - deleting ALL related data (notifications, prescriptions, appointments)");

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // Move database seeding to background to avoid blocking health checks
  // This ensures the server starts quickly for deployment health checks
  setTimeout(async () => {
    console.log("🚀 BACKGROUND SEEDING: Starting database seeding process...");
    console.log(`Environment: ${process.env.NODE_ENV}`);
    
    try {
      console.log("📊 Step 1: Running seedDatabase()...");
      await seedDatabase();
      console.log("✅ Step 1: seedDatabase() completed successfully!");
      
      console.log("📦 Step 2: Running inventory seeding...");
      const { seedAllOrganizations } = await import("./seed-inventory");
      await seedAllOrganizations();
      console.log("✅ Step 2: Inventory seeding completed successfully!");
      
      console.log("🎉 DATABASE SEEDING COMPLETED - ALL PATIENT DATA AVAILABLE!");
    } catch (error: any) {
      console.error("❌ SEEDING FAILED - This will cause problems:");
      console.error("Error details:", error);
      console.error("Stack trace:", error.stack);
      console.log("⚠️  Database seeding failed but server is running");
    }
  }, 1000); // Start seeding 1 second after server startup

  // CRITICAL: Health check endpoints MUST come BEFORE Vite/static middleware
  // to ensure they're not overridden by catch-all routes
  app.get('/', (req, res) => {
    res.status(200).json({ 
      status: 'OK', 
      message: 'Cura EMR System is running',
      timestamp: new Date().toISOString(),
      version: '1.0.0'
    });
  });

  app.get('/health', (req, res) => {
    res.status(200).json({ 
      status: 'healthy', 
      uptime: process.uptime(),
      timestamp: new Date().toISOString()
    });
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on port 5000
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = 5000;
  server.listen(port, "0.0.0.0", () => {
    log(`serving on port ${port}`);
  });
})();
