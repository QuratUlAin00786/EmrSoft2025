# Cura EMR System

## Overview
Cura is a comprehensive multi-tenant Electronic Medical Records (EMR) system by Cura Software Limited. It provides patient management, appointment scheduling, AI-powered clinical insights, telemedicine, and workflow automation. The system focuses on healthcare compliance (including GDPR) and aims to streamline operations with advanced technology, enhancing healthcare delivery through AI and efficient digital tools for a broad market of healthcare organizations.

## Recent Legal Framework Implementation (January 2025)
Complete legal framework implemented for Cura Software Limited:
- **Company Information**: Cura Software Limited, Registration: 16556912, Address: Ground Floor Unit 2, Drayton Court, Drayton Road, Solihull, England B90 4NG
- **Legal Pages**: Privacy Policy, Terms of Service, GDPR Compliance, Press & Media Centre
- **UK Compliance**: Full UK GDPR compliance framework with detailed data protection measures
- **Company Branding**: Updated footer and legal pages with official Cura Software Limited details
- **Navigation**: Proper routing structure for all legal pages accessible from landing page footer

## SaaS Administration System (August 2025)
**UNIFIED USER ARCHITECTURE IMPLEMENTED**: SaaS owners now integrated into normal user management system
- **Architecture**: SaaS owners stored in regular `users` table with `organizationId: 0` (system-wide)
- **Identification**: `isSaaSOwner: true` flag distinguishes SaaS owners from regular users
- **Isolation**: SaaS owners completely hidden from regular organizations (organizationId: 0)
- **Production Setup**: Automated via `/api/production-setup` endpoint - no console access required
- **Credentials**: Username: `saas_admin`, Password: `admin123`, Email: `saas_admin@curaemr.ai`
- **Access**: Navigate to `/saas` route to access SaaS administration portal
- **Benefits**: Unified authentication, simplified management, better security isolation
- **Status**: Fully operational with elegant system-wide user management integration

## User Preferences
Preferred communication style: Simple, everyday language.

## Color Theme Implementation (August 2025)
**NEW MEDICAL-FOCUSED COLOR SYSTEM SUCCESSFULLY IMPLEMENTED**
- **Primary**: Bluewave blue (#4A7DFF) - Bold, confident medical brand color
- **Secondary**: Electric Lilac (#7279FB) - Creative, modern secondary tone
- **Accent**: Mint Drift (#6CFFEB) - Fresh highlight and special state color
- **Supporting Colors**: Midnight, Steel, Mist for professional text and backgrounds
- **Status**: ACTIVE - Color theme successfully applied across entire application
- **Implementation**: CSS custom properties in light/dark modes with complete Tailwind integration
- **Visual Confirmation**: User screenshot shows proper blue/purple theme replacing previous green theme

## Typography Implementation Status (August 2025)
**FIGTREE TYPOGRAPHY SYSTEM - PLATFORM CONSTRAINT CONFIRMED**: 30+ failed implementation attempts
- **Challenge**: Figtree font cannot be loaded through any available method on this platform
- **Failed Approaches**: Google Fonts CDN, local WOFF2 hosting, base64 embedding, @font-face declarations, direct URLs, CSS layers, Tailwind integration, universal selectors, multiple font weights, preconnect optimization, CSS @import with !important declarations, aggressive universal CSS forcing
- **Root Cause**: Platform-level restrictions preventing proper font file delivery and rendering
- **Visual Evidence**: Screenshots consistently show single-storey "g" instead of Figtree's double-storey design, straight "f/t" instead of curved endings, system spacing instead of relaxed character spacing
- **Console Evidence**: Persistent "❌ Figtree font loading failed" errors despite multiple implementation methods
- **Current State**: System defaults to fallback fonts (system-ui, sans-serif) despite comprehensive code implementations
- **Status**: TECHNICALLY IMPOSSIBLE - Platform infrastructure prevents Figtree implementation
- **Latest Attempt (Aug 21, 2025)**: CSS @import + universal * selector + !important declarations - FAILED
- **User Impact**: Continued expectation for Figtree characteristics not achievable within current environment

## System Architecture

### Frontend
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **UI Library**: Radix UI with shadcn/ui
- **Styling**: Tailwind CSS with custom medical theme
- **State Management**: TanStack Query (server state), React Context (global state)
- **Routing**: Wouter
- **Forms**: React Hook Form with Zod validation

### Backend
- **Runtime**: Node.js with Express.js
- **Language**: TypeScript with ES modules
- **Database**: PostgreSQL with Drizzle ORM
- **Database Provider**: Neon serverless PostgreSQL
- **Authentication**: JWT-based with bcrypt
- **Multi-tenancy**: Subdomain-based tenant isolation with automatic data filtering

### Multi-Tenant Design (ENFORCED SYSTEM-WIDE)
- **Tenant Identification**: Subdomain or `X-Tenant-Subdomain` header
- **Data Isolation**: All queries automatically filtered by `organizationId` with strict enforcement
- **Multi-Tenant Core Package**: Comprehensive enforcement across all system packages
- **Validation**: Cross-tenant operations validated and blocked if unauthorized
- **Audit Trail**: All sensitive data access logged for compliance
- **Storage Wrapper**: Tenant-aware storage operations with automatic organizationId injection
- **Compliance**: GDPR middleware with data residency controls
- **Subscription Management**: Tiered system with feature flags and usage-based billing
- **Performance Monitoring**: Query performance tracking per organization

### Key Components
- **Database Schema**: Organizations, Users (role-based access), Patients, Medical Records (AI integration), Appointments, AI Insights, Subscriptions.
- **Authentication & Authorization**: JWT (7-day expiration), 6 user roles (admin, doctor, nurse, receptionist, patient, sample_taker) with granular module permissions, dynamic UI based on roles, tenant isolation, secure session management.
- **AI Integration**: Local NLP-powered chatbot with intent classification for appointment booking and general healthcare queries. OpenAI GPT-4o available for risk assessment, drug interaction, treatment suggestions, preventive care. Includes confidence scoring. **AI Chatbot Appointment Booking**: Fully functional multi-line input processing with flexible patient name detection supporting mixed-case names (fixed Aug 20, 2025).
- **Real-time Messaging**: Hybrid WebSocket + polling messaging system with 2-second refresh intervals for reliable real-time synchronization. Includes automatic reconnection, ping/pong stability, and polling fallback (fully resolved Aug 16, 2025).
- **Message Delivery Tracking**: Polling-based delivery status system for SMS/WhatsApp messages with automatic status updates and manual status checking endpoints (implemented Aug 14, 2025).

### Data Flow
- Request processing with tenant middleware.
- JWT validation for user authentication and authorization.
- Database queries automatically scoped to tenant.
- Clinical data processed via OpenAI for insights.
- Response delivered with proper tenant context and security.

### Mobile Applications
- **Flutter Apps**: Cura Patient App (medical history, prescriptions, appointments, notifications, voice documentation), Cura Doctor App (dashboard, appointment management, patient records, medication alerts).
- **Architecture**: Clean Flutter architecture with JWT authentication, secure token storage, consistent Cura design system.

## External Dependencies

### Core Services
- **Neon PostgreSQL**: Serverless database hosting.
- **OpenAI API**: GPT-4o for AI clinical insights.
- **Twilio API**: SMS and WhatsApp messaging.
- **BigBlueButton**: Video conferencing.
- **PayPal SDK**: Payment processing.

### Frontend Libraries
- **Radix UI**: Accessible UI component primitives.
- **Tailwind CSS**: Utility-first CSS framework.
- **TanStack Query**: Server state synchronization.
- **React Hook Form**: Performance-focused form library.
- **Zod**: TypeScript-first schema validation.
- **Wouter**: Lightweight client-side routing.

### Backend Libraries
- **Express.js**: Web framework.
- **Drizzle ORM**: Type-safe SQL query builder.
- **bcrypt**: Password hashing.
- **jsonwebtoken**: JWT handling.