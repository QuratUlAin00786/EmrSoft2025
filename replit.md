# Cura EMR System

## Overview
Cura is a comprehensive multi-tenant Electronic Medical Records (EMR) system by halo group. It provides patient management, appointment scheduling, AI-powered clinical insights, telemedicine, and workflow automation. The system focuses on healthcare compliance (including GDPR) and aims to streamline operations with advanced technology, enhancing healthcare delivery through AI and efficient digital tools for a broad market of healthcare organizations.

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
- **AI Integration**: Local NLP-powered chatbot with intent classification for appointment booking and general healthcare queries. OpenAI GPT-4o available for risk assessment, drug interaction, treatment suggestions, preventive care. Includes confidence scoring.

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