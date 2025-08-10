# Cura EMR System

## Overview
Cura is a comprehensive multi-tenant Electronic Medical Records (EMR) system by halo group, providing patient management, appointment scheduling, AI-powered clinical insights, telemedicine, and workflow automation. It focuses on healthcare compliance (including GDPR) and aims to streamline operations with advanced technology. Its vision includes enhancing healthcare delivery through AI and efficient digital tools, targeting a broad market of healthcare organizations.

## Recent Changes (August 2025)
- **Fixed appointment creation system**: Resolved critical issues with AI assistant appointment booking where conflict detection was checking against all appointments instead of date-specific appointments
- **Improved date validation**: Enhanced appointment scheduling with proper future date validation (1-minute buffer) to prevent timing edge cases
- **Fixed patient name display**: Appointments now correctly show patient names ("Ifra Khan", "Rashida Yunas") instead of patient IDs in calendar views
- **Enhanced conflict detection**: Updated `getAppointmentsByProvider` to properly filter by date for accurate time slot availability checking
- **Fixed AI date parsing**: Resolved "7th of August" format date parsing in AI assistant by restructuring regex patterns to properly handle ordinal date formats, eliminating confusing responses and ensuring accurate appointment scheduling
- **Resolved AI chatbot repetitive text bug**: Fixed critical issue where AI was generating repetitive responses like "Ali Raza doctor is Ali Raza doctor..." due to overly complex name matching logic
- **Refined context detection**: Enhanced appointment booking conversation flow with improved context parsing for step-by-step booking scenarios
- **Simplified name matching**: Streamlined patient and doctor name recognition to prevent infinite loops and ensure clean responses
- **Fixed appointment time display mismatch**: Resolved critical timing issue where AI chatbot appointments were not displaying at correct suggested times in "All Upcoming Appointments" - appointments now show accurate times matching AI suggestions
- **Enhanced Medical Staff availability filtering**: Medical Staff list now only shows doctors who are actually available (on duty, not on leave/vacation) based on shift schedules and availability status
- **Added doctor availability counter**: Medical Staff section now displays "Medical Staff (X/Y Available)" showing available doctors out of total doctors for better appointment booking visibility
- **Resolved duplicate prescription issue**: Successfully cleaned 386 duplicate prescription records from database and implemented seeding protection to prevent future duplicates
- **Fixed prescriptions page error**: Corrected "providers.forEach is not a function" error by properly handling API response structure (`data.staff` instead of `data`)
- **Fixed voice transcription duplication**: Resolved AI chatbot voice recognition bug where speech-to-text was typing transcribed text twice by fixing the speech recognition result processing logic
- **Fixed schedule editing dialog refresh**: Resolved critical issue where doctor schedule updates were saving to database correctly but dialog wasn't showing updated working hours - now immediately updates selectedDoctor state and shows changes in "Current Schedule" section
- **Fixed schedule update permissions**: Resolved issue where non-admin users couldn't update their own schedules - modified user update endpoint to allow doctors to update their own working hours and working days while maintaining proper security restrictions
- **Fixed User Management schedule editing**: Resolved form state management issue where working hours changes weren't displaying updated values after successful database saves - form now properly updates with server response data
- **Enhanced invoice generation with authentic Cura branding**: Updated invoice PDF generation to create professional HTML invoices featuring the authentic Cura logo (blue gradient spiral design) in the header white box, matching the original design with blue gradient header, proper Cura Medical Practice branding, and comprehensive invoice layout with payment information and service details

## User Preferences
Preferred communication style: Simple, everyday language.

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
- **AI Integration**: OpenAI GPT-4o for risk assessment, drug interaction, treatment suggestions, preventive care. Includes confidence scoring.

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