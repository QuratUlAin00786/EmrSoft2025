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
- June 25, 2025: Complete system audit and functionality overhaul:
  - **Full Database Integration**: All buttons, menus, dropdowns now database-driven
  - **Backend API Routes**: Complete REST API for prescriptions, lab results, imaging, billing, forms
  - **Interactive UI Components**: All dashboard widgets, patient lists, and forms fully functional
  - **NHS-Compliant Consultations**: Full UK NHS-standard consultation interface with structured note-taking
  - **Patient Management Automation**: Intelligent alerts for repeat prescriptions, lab follow-ups, chronic disease reviews
  - **Clinical Decision Support**: Automated reminders for medication reviews, overdue appointments, test results
  - **Complete Clinical Modules**: Prescriptions, Lab Results, Imaging, Billing fully implemented and connected
  - **Enhanced Navigation**: All navigation links and buttons working with proper routing
  - **New Appointment Creation**: Functional appointment booking with patient selection
  - **Patient Insurance Details**: Comprehensive health insurance tracking (NHS, Private, Self-Pay)
  - **Custom Forms & Surveys**: Advanced semble.io-style form builder with 17+ field types
  - **Advanced Form Features**: AI validation, webhooks, conditional logic, HIPAA/GDPR compliance
  - **Medical Form Types**: Pain scales, symptom checkers, vital signs, signature pads
  - **Response Analytics**: Detailed analytics, export capabilities, demographic breakdowns
  - **Authentication Fix**: Development mode authentication bypass for easier testing
  - **Complete EMR Coverage**: All essential medical sections now functional with real data flow
- Previous: appointment calendar, consultation notes, patient history, localization, AI insights
- June 24, 2025: Initial setup

## User Preferences

Preferred communication style: Simple, everyday language.
Requested features: semble.io-style custom forms, surveys, questionnaires, advanced form builder, analytics, compliance tools, automation features, integration capabilities.