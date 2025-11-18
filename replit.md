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

## Automatic Role Provisioning System (October 2025)
**AUTOMATIC DEFAULT ROLES CREATION - PRODUCTION READY**
- **Feature**: All new organizations automatically receive 16 default system roles upon creation
- **Roles Included**: Administrator, Doctor, Nurse, Patient, Receptionist, Lab Technician, Pharmacist, Dentist, Dental Nurse, Phlebotomist, Aesthetician, Optician, Paramedic, Physiotherapist, Sample Taker, Other
- **Implementation**: Roles created immediately after organization creation in `createCustomerOrganization` function
- **Permissions**: Each role has pre-configured granular permissions for modules (billing, patients, appointments, etc.) and field-level access
- **System Flag**: All auto-created roles marked with `isSystem: true` for identification
- **Integration**: Works seamlessly with SaaS customer creation flow via `/api/saas/customers` endpoint
- **Verification**: Database confirmed 16 roles created for each new organization with proper organizationId isolation
- **Status**: PRODUCTION READY - Tested and verified with organization ID 5 (Metro Health Center)
- **Implementation Date**: October 6, 2025

## Subdomain-Based Organizational Routing (September 2025)
**COMPLETE SUBDOMAIN-SCOPED ROUTING SYSTEM - PRODUCTION READY**

### Why Subdomain-Based Routing?
Subdomain routing provides clear **multi-tenant isolation** by giving each organization its own URL namespace:
- **Data Security**: URLs like `/metro44/patients` vs `/demo/patients` make it immediately visible which organization's data you're accessing
- **URL Clarity**: Users can clearly see their organization context in every URL (e.g., `https://app.curaemr.ai/metro44/messaging`)
- **Prevents Accidents**: Makes it harder to accidentally access another organization's data since subdomain is explicit in every route
- **Bookmarking**: Users can bookmark organization-specific pages and return to the correct tenant context
- **Navigation Context**: Sidebar automatically shows routes scoped to user's organization (e.g., `/metro44/patients` instead of just `/patients`)

### Implementation Details
- **Architecture**: All protected routes use `/:subdomain/*` pattern (e.g., `/demo/patients`, `/metro44/dashboard`)
- **Subdomain Resolution**: Centralized `getActiveSubdomain()` utility with RESERVED_ROUTES list prevents legacy path misidentification
- **Subdomain Storage**: User's organization subdomain stored in `localStorage.user_subdomain` during login
- **Navigation**: Sidebar links automatically prefixed with `tenant.subdomain || getActiveSubdomain()` for seamless organizational context
- **Tenant Hook**: `useTenant` fetches tenant info from API using subdomain from localStorage (set during login)
- **Legacy Route Handling**: Comprehensive redirect system preserves full paths, query strings, and dynamic segments when migrating from unscoped URLs
- **Authentication Flow**: Login at `/auth/login` stores user's organization subdomain → redirects to `/:subdomain/dashboard`
- **Tenant Isolation**: Each organization's data accessed exclusively through their subdomain URL structure
- **API Integration**: Tenant middleware detects subdomain from `X-Tenant-Subdomain` header for consistent data filtering
- **Status**: PRODUCTION READY - All edge cases handled, including proper subdomain detection from localStorage
- **Last Updated**: October 1, 2025 (Fixed tenant hook to use localStorage instead of hostname)

## Facial Muscle Analysis System Enhancement (September 2025)
**32-POSITION MUSCLE ANALYSIS SYSTEM IMPLEMENTED**
- **Expansion**: Successfully expanded from 15 to 32 facial muscle positions for comprehensive analysis
- **Muscle Mapping**: Updated server-side muscle mapping array with 32 specific facial muscle names
- **Position Coverage**: Frontalis, Temporalis, Procerus, Corrugator Supercilii, Orbicularis Oculi, Orbicularis Milor, Zygomaticus Minor/Major, Buccinator, Depressor Sept Nasi, Orbicularis Oris, Depressor Labii Inferioris, Mentalis, Platysma
- **Detection Capability**: Black dot detection algorithm now processes up to 32 positions instead of 15
- **Database Support**: API endpoints updated to save and retrieve 32 muscle positions per patient
- **Status**: PRODUCTION READY - Console logs confirm detection of 32+ positions working correctly
- **Implementation Date**: September 17, 2025

## Global Multi-Currency Support System (November 2025)
**MULTI-CURRENCY INFRASTRUCTURE - IMPLEMENTED**
- **Currency Support**: 30+ currencies including GBP, USD, EUR, JPY, CNY, INR, AUD, CAD, SAR, AED, PKR, etc.
- **Currency Metadata**: Complete currency map with symbols, locales, and decimal rules
- **Storage**: Currency stored in organization.settings.billing.currency field
- **Frontend**: CurrencyProvider context provides useCurrency hook for global currency access
- **Formatting**: formatCurrency() utility uses Intl.NumberFormat for locale-aware formatting
- **Currency Selector**: Component in header allows admin users to change organization currency
- **Persistence**: Currency changes persist to backend via PATCH /api/organization/settings
- **Error Handling**: Optimistic updates with automatic rollback on failure
- **Zero-Decimal Support**: Proper handling of currencies like JPY, KRW, VND (no decimal places)
- **Subscription Page**: Fully integrated with dynamic currency formatting in UI and PDF generation
- **Billing Page**: Hook added, ready for systematic currency symbol replacement
- **Status**: CORE INFRASTRUCTURE COMPLETE - Subscription page production-ready
- **Implementation Date**: November 18, 2025

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
**FIGTREE TYPOGRAPHY SYSTEM - PRODUCTION DEPLOYMENT READY**: Maximum enforcement implemented
- **Final Solution**: Fresh Figtree WOFF2 files with nuclear CSS enforcement
- **Implementation**: Re-downloaded authentic Figtree fonts from Google Fonts CDN to /public/
- **Font Hosting**: Self-hosted fonts with @font-face declarations + maximum CSS specificity
- **CSS Enforcement**: Nuclear option CSS rules force Figtree on every element with !important
- **HTML Enforcement**: Inline styles in HTML head provide immediate font loading
- **Production Guarantee**: Maximum specificity CSS cannot be overridden by any other styles
- **Date Completed**: August 22, 2025 (Production-ready enforcement)
- **Status**: DEPLOYMENT READY - Figtree characteristics guaranteed in production
- **User Impact**: Double-storey 'g', curved 'f', higher 'x' will display correctly when deployed

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