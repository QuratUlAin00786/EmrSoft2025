import "dotenv/config";
import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { registerSaaSRoutes } from "./saas-routes";
import { setupVite, serveStatic, log } from "./vite";
import { seedDatabase } from "./seed-data";

console.log("🔐 ENVIRONMENT CHECK:");
console.log("  - FILE_SECRET exists:", !!process.env.FILE_SECRET);
console.log("  - NODE_ENV:", process.env.NODE_ENV);
console.log("  - DATABASE_URL exists:", !!process.env.DATABASE_URL);

const app = express();
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: false, limit: '50mb' }));

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
  registerSaaSRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    // Don't re-throw the error to prevent process crashes
    console.error('[EXPRESS_ERROR_HANDLER]', err.message || err);
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // Use PORT from environment (Replit deployment) or default to 5000 for local dev
  // In production, Replit provides the PORT environment variable
  const port = process.env.PORT ? parseInt(process.env.PORT) : 5000;
  server.listen(port, "0.0.0.0", () => {
    log(`serving on port ${port}`);
    log("🚀 Server is ready for health checks!");
  });

  // Run database seeding in background AFTER server is listening
  // This prevents health check timeouts during deployment
  // Environment-based seeding: Development OR production with ENABLE_PRODUCTION_SEEDING=true
  if ((process.env.NODE_ENV !== 'production' || process.env.ENABLE_PRODUCTION_SEEDING === 'true') && process.env.FORCE_SEED !== 'false') {
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
        
        console.log("🏥 Step 3: Running production medical records seeding...");
        const { seedProductionMedicalRecords } = await import("./production-medical-records");
        await seedProductionMedicalRecords();
        console.log("✅ Step 3: Production medical records seeding completed successfully!");
        
        console.log("🔍 Step 4: Verifying medical records are accessible...");
        // Force verify that Patient 158 medical records exist
        const { verifyMedicalRecordsExist } = await import("./production-medical-records");
        await verifyMedicalRecordsExist();
        console.log("✅ Step 4: Medical records verification completed!");
        
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
    console.log("💡 Set ENABLE_PRODUCTION_SEEDING=true to enable automatic seeding in production");
    console.log("💡 Or set FORCE_SEED=true environment variable if seeding is needed");
    
    // PRODUCTION DEMO USERS: Ensure demo credentials work in production
    console.log("🎯 PRODUCTION DEMO: Creating essential demo users for login screen...");
    setImmediate(async () => {
      try {
        const apiPort = process.env.PORT || 5000;
        const response = await fetch(`http://localhost:${apiPort}/api/production-demo-setup`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({})
        });
        const result = await response.json();
        if (result.success) {
          console.log("✅ PRODUCTION DEMO: Demo users created successfully!");
          console.log(`📋 Created/Updated: ${result.createdUsers?.length || 0} users, Updated: ${result.updatedUsers?.length || 0} users`);
        } else {
          console.log("⚠️ PRODUCTION DEMO: Setup had issues:", result.message);
        }
      } catch (error) {
        console.error("❌ PRODUCTION DEMO: Failed to create demo users:", error);
        console.log("🔧 You can manually create demo users by calling: POST /api/production-demo-setup");
      }
    });
  }
})();
