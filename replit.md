# MediCore EMR System

## Overview

MediCore EMR is a multi-tenant Electronic Medical Records (EMR) system designed for healthcare organizations. It provides comprehensive patient management, appointment scheduling, AI-powered insights, and secure multi-tenant architecture with region-specific data compliance.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite for fast development and optimized builds
- **UI Library**: Radix UI components with shadcn/ui styling system
- **Styling**: Tailwind CSS with custom medical theme variables
- **State Management**: TanStack Query for server state, React Context for global state
- **Routing**: Wouter for lightweight client-side routing
- **Forms**: React Hook Form with Zod validation

### Backend Architecture
- **Runtime**: Node.js with Express.js server
- **Language**: TypeScript with ES modules
- **Database**: PostgreSQL with Drizzle ORM
- **Database Provider**: Neon serverless PostgreSQL
- **Authentication**: JWT-based with bcrypt password hashing
- **Multi-tenancy**: Subdomain-based tenant isolation

### Multi-Tenant Design
- **Tenant Identification**: Extracted from subdomain or X-Tenant-Subdomain header
- **Data Isolation**: All database queries filtered by organizationId
- **Regional Compliance**: GDPR compliance middleware with data residency controls
- **Subscription Management**: Tiered subscription system with feature flags

## Key Components

### Database Schema (Drizzle ORM)
- **Organizations**: Tenant configuration with regional and compliance settings
- **Users**: Role-based access (admin, doctor, nurse, receptionist)
- **Patients**: Comprehensive patient records with medical history
- **Medical Records**: Patient medical data with AI analysis
- **Appointments**: Scheduling system with provider assignments
- **AI Insights**: Machine learning-generated recommendations and alerts
- **Subscriptions**: Billing and feature access management

### Authentication & Authorization
- **JWT Tokens**: 24-hour expiration with issuer/audience validation
- **Role-Based Access**: Hierarchical permissions (admin > doctor > nurse > receptionist)
- **Tenant Isolation**: Automatic organization-level data filtering
- **Session Management**: Secure token storage with validation endpoints

### AI Integration
- **Provider**: OpenAI GPT-4o integration
- **Capabilities**: Risk assessment, drug interaction analysis, treatment suggestions
- **Data Processing**: Patient history analysis with confidence scoring
- **Insights Storage**: Structured AI recommendations with metadata

### UI/UX Framework
- **Design System**: shadcn/ui with medical-themed customizations
- **Responsive Design**: Mobile-first approach with breakpoint management
- **Accessibility**: ARIA compliance and keyboard navigation
- **Theme Support**: Light/dark mode with custom medical color palette

## Data Flow

### Request Processing
1. **Tenant Middleware**: Extracts and validates organization from subdomain
2. **GDPR Compliance**: Applies regional data protection rules
3. **Authentication**: Validates JWT tokens and user permissions
4. **Role Authorization**: Enforces role-based access controls
5. **Data Filtering**: Automatic organization-level data isolation

### AI Workflow
1. **Data Collection**: Aggregates patient medical history and current records
2. **Analysis**: Sends structured data to OpenAI for risk assessment
3. **Processing**: Parses AI responses into structured insights
4. **Storage**: Saves insights with confidence scores and metadata
5. **Presentation**: Displays actionable recommendations in dashboard

### Patient Management
1. **Registration**: Captures comprehensive patient demographics and medical history
2. **Record Creation**: Structured medical record entry with validation
3. **AI Analysis**: Automatic risk assessment and treatment suggestions
4. **Appointment Integration**: Seamless scheduling with provider assignment

## External Dependencies

### Core Services
- **Database**: Neon PostgreSQL for serverless scaling
- **AI Provider**: OpenAI API for medical insights generation
- **Authentication**: JWT for stateless session management

### Development Tools
- **Database Management**: Drizzle Kit for schema migrations
- **Type Safety**: TypeScript with strict configuration
- **Code Quality**: ESLint and Prettier integration
- **Development Server**: Vite with HMR and error overlay

### UI Libraries
- **Component System**: Radix UI primitives with shadcn/ui wrappers
- **Styling**: Tailwind CSS with PostCSS processing
- **Icons**: Lucide React icon library
- **Forms**: React Hook Form with Zod schema validation

## Deployment Strategy

### Production Build
- **Frontend**: Vite builds optimized React bundle to `dist/public`
- **Backend**: esbuild bundles Node.js server to `dist/index.js`
- **Static Assets**: Served directly from built frontend

### Environment Configuration
- **Development**: Hot reload with Vite middleware integration
- **Production**: Optimized builds with caching strategies
- **Database**: Environment-based connection string configuration

### Scaling Architecture
- **Autoscale Deployment**: Configured for horizontal scaling
- **Database**: Serverless PostgreSQL with connection pooling
- **Multi-Region**: Tenant-based regional data residency

### Security Considerations
- **Data Encryption**: Bcrypt password hashing with high salt rounds
- **CORS Configuration**: Tenant-specific origin validation
- **Input Validation**: Zod schema validation on all endpoints
- **SQL Injection Prevention**: Parameterized queries through Drizzle ORM

## Changelog
- June 25, 2025: Comprehensive patient management system completed:
  - **Advanced Patient Search**: Search by name, postcode, phone, NHS number, email with filters
  - **UK Postcode Auto-lookup**: Real-time address completion using postcodes.io API
  - **Enhanced Patient Forms**: Auto-formatting phone numbers, comprehensive insurance tracking
  - **Real Action Buttons**: Functional view/book/remind/flag/records buttons with backend integration
  - **Patient Workflow Automation**: Task management system with automated reminders and alerts
  - **Multi-criteria Filtering**: Insurance provider, risk level, last visit date filtering
  - **Smart Phone Formatting**: Auto-format UK numbers (0 to +44 conversion)
  - **Professional UI Enhancements**: Risk level badges, condition color coding, alert systems
  - **Backend API Expansion**: Patient search, reminder system, task management endpoints
  - **Full Database Integration**: All buttons, menus, dropdowns now database-driven
  - **Complete Clinical Modules**: Prescriptions, Lab Results, Imaging, Billing fully implemented
  - **NHS-Compliant System**: Full UK healthcare standards with insurance provider integration
  - **Authentication Fix**: Development mode authentication bypass for easier testing
- Previous: appointment calendar, consultation notes, patient history, localization, AI insights
- June 24, 2025: Initial setup

## User Preferences

Preferred communication style: Simple, everyday language.
Requested features: semble.io-style custom forms, surveys, questionnaires, advanced form builder, analytics, compliance tools, automation features, integration capabilities.
Logo preferences: Enlarged logo size with "EMR, UK Healthcare" subtitle only (no brand name), removed from dashboard header, kept above sidebar menu and at login screen.
Patient form requirements: Comprehensive health insurance section with UK insurance providers dropdown, fully functional view/book buttons for appointment scheduling.