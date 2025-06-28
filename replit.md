# Averox EMR System

## Overview

Averox EMR is a comprehensive multi-tenant Electronic Medical Records (EMR) system designed for healthcare organizations. It provides patient management, appointment scheduling, AI-powered clinical insights, telemedicine capabilities, and comprehensive workflow automation. The system is built with modern web technologies and follows healthcare compliance standards including GDPR.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript for type safety and modern development patterns
- **Build Tool**: Vite for fast development and optimized production builds
- **UI Library**: Radix UI components with shadcn/ui design system for accessible, customizable components
- **Styling**: Tailwind CSS with custom medical theme variables and CSS custom properties
- **State Management**: TanStack Query for server state management, React Context for global application state
- **Routing**: Wouter for lightweight client-side routing
- **Forms**: React Hook Form with Zod validation for type-safe form handling

### Backend Architecture
- **Runtime**: Node.js with Express.js server
- **Language**: TypeScript with ES modules for modern JavaScript features
- **Database**: PostgreSQL with Drizzle ORM for type-safe database operations
- **Database Provider**: Neon serverless PostgreSQL for scalable cloud database hosting
- **Authentication**: JWT-based authentication with bcrypt password hashing
- **Multi-tenancy**: Subdomain-based tenant isolation with automatic data filtering

### Multi-Tenant Design
- **Tenant Identification**: Extracted from subdomain or X-Tenant-Subdomain header for flexible deployment
- **Data Isolation**: All database queries automatically filtered by organizationId to ensure tenant separation
- **Regional Compliance**: GDPR compliance middleware with configurable data residency controls
- **Subscription Management**: Tiered subscription system with feature flags and usage-based billing

## Key Components

### Database Schema (Drizzle ORM)
- **Organizations**: Tenant configuration with regional settings, branding, and compliance requirements
- **Users**: Role-based access control (admin, doctor, nurse, receptionist) with department assignments
- **Patients**: Comprehensive patient records with medical history, demographics, and emergency contacts
- **Medical Records**: Patient medical data with AI analysis integration and structured clinical notes
- **Appointments**: Advanced scheduling system with provider assignments and automated reminders
- **AI Insights**: Machine learning-generated clinical recommendations and risk alerts
- **Subscriptions**: Billing management with feature access control and usage tracking

### Authentication & Authorization
- **JWT Tokens**: 24-hour expiration with proper issuer/audience validation for security
- **Role-Based Access**: Hierarchical permissions system (admin > doctor > nurse > receptionist)
- **Tenant Isolation**: Automatic organization-level data filtering prevents cross-tenant data access
- **Session Management**: Secure token storage with real-time validation endpoints

### AI Integration
- **Provider**: OpenAI GPT-4o integration for clinical decision support
- **Features**: Risk assessment, drug interaction checking, treatment suggestions, and preventive care recommendations
- **Confidence Scoring**: AI insights include confidence levels and evidence-based recommendations
- **Clinical Decision Support**: Real-time analysis of patient data for diagnostic assistance

## Data Flow

1. **Request Processing**: Tenant middleware extracts organization context from subdomain
2. **Authentication**: JWT validation ensures user access and role permissions
3. **Data Access**: All database queries automatically scoped to tenant organization
4. **AI Processing**: Clinical data processed through OpenAI for intelligent insights
5. **Response Delivery**: Data returned with proper tenant context and security headers

## External Dependencies

### Core Services
- **Neon PostgreSQL**: Serverless database hosting with automatic scaling
- **OpenAI API**: GPT-4o model for AI-powered clinical insights and decision support
- **Replit Infrastructure**: Development and deployment platform with integrated tooling

### Frontend Libraries
- **Radix UI**: Accessible component primitives for complex UI interactions
- **Tailwind CSS**: Utility-first CSS framework for rapid UI development
- **TanStack Query**: Server state synchronization and caching
- **React Hook Form**: Performance-focused form library with validation
- **Zod**: TypeScript-first schema validation

### Backend Libraries
- **Express.js**: Web framework for API routing and middleware
- **Drizzle ORM**: Type-safe SQL query builder and schema management
- **bcrypt**: Password hashing for secure authentication
- **jsonwebtoken**: JWT token generation and validation

## Deployment Strategy

### Development Environment
- **Platform**: Replit with integrated development tools
- **Hot Reload**: Vite development server with instant updates
- **Database**: Neon PostgreSQL with automatic provisioning
- **Port Configuration**: Frontend on port 5000 with Express API integration

### Production Deployment
- **Build Process**: Vite production build with ESBuild bundling for optimal performance
- **Server**: Node.js production server with environment-specific configurations
- **Scaling**: Replit autoscale deployment target for automatic resource management
- **Database**: Neon serverless PostgreSQL with connection pooling

### Configuration Management
- **Environment Variables**: Secure configuration for database URLs, API keys, and JWT secrets
- **Multi-tenant Setup**: Subdomain routing with tenant-specific branding and settings
- **Compliance**: Regional data residency and GDPR compliance controls

## Changelog

**June 28, 2025:**
- Implemented comprehensive notification system with database backend and real-time updates
- Added advanced clinical decision support service with AI-powered drug interaction analysis
- Created patient monitoring service with vital signs analysis and medication adherence tracking
- Built sophisticated appointment scheduler with conflict detection and automated optimization
- Developed prescription management service with safety analysis and automated refill management
- Added health dashboard service for population health analytics and clinical insights
- Implemented audit compliance service with GDPR compliance checks and data retention policies
- Enhanced backend with 6 major clinical services providing enterprise-grade medical functionality
- All services integrated with OpenAI GPT-4o for intelligent clinical analysis and recommendations
- Fixed "View All" button navigation issue in Recent Patients dashboard component - now properly navigates to patients page in all component states (loading, error, empty, and main content)

**June 27, 2025:**
- Fixed dashboard statistics display issue by implementing direct API calls instead of TanStack Query
- Resolved authentication flow to properly display dashboard data (Total Patients: 3, Today's Appointments: 2, AI Suggestions: 0, Revenue: £89,240)
- Updated query client configuration to support multi-tenant headers
- Completed comprehensive EMR system with all 20+ features functional and accessible

**June 26, 2025:**
- Initial setup and implementation of comprehensive EMR features
- Complete rebranding from external provider to Averox Ltd

## User Preferences

Preferred communication style: Simple, everyday language.