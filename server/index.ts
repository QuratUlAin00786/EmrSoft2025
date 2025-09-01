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

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on port 5000 FIRST - critical for health checks
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = 5000;
  server.listen(port, "0.0.0.0", () => {
    log(`serving on port ${port}`);
    log("🚀 Server is ready for health checks!");
  });

  // Run database seeding in background AFTER server is listening
  // This prevents health check timeouts during deployment
  // PRODUCTION FIX: Always seed to ensure medical records are available
  if (process.env.NODE_ENV !== 'production' || process.env.FORCE_SEED === 'true' || true) {
    console.log("🚀 BACKGROUND SEEDING: Starting database seeding process...");
    console.log(`Environment: ${process.env.NODE_ENV}`);
    
    // Run seeding in background without blocking the server
    setImmediate(async () => {
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
        // Don't stop the app, but make the error very visible
        console.log("⚠️  App will continue but database may be empty");
      }
    });
  } else {
    console.log("🚀 PRODUCTION MODE: Skipping database seeding for faster startup");
    console.log("💡 Set FORCE_SEED=true environment variable if seeding is needed");
  }
})();
