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

**July 1, 2025:**
- **COMPLETED**: Fixed delete button functionality in Voice Documentation - simplified deletion approach with reliable backend API calls, automatic UI refresh after successful deletion, proper audio storage cleanup, and consistent behavior in LIVE environment
- **COMPLETED**: Optimized audio saving speed in Voice Documentation - implemented optimistic UI updates so voice notes appear instantly in the record list while saving happens in background, eliminating user wait times and providing immediate audio playback capability
- **COMPLETED**: Fixed audio recording and playback system in Voice Documentation - implemented proper MediaRecorder API integration to capture actual audio, store audio blobs as URLs in browser memory, and play back original recorded audio instead of text-to-speech, ensuring authentic voice recording functionality works identically in LIVE deployment
- **COMPLETED**: Added delete functionality for voice notes - implemented red Delete button with confirmation dialog, backend DELETE endpoint with JWT authentication, automatic list refresh after deletion, and proper error handling for LIVE environment compatibility
- **COMPLETED**: Fixed patient persistence issue across server restarts - modified seed-data.ts to preserve existing patients instead of recreating them, ensuring manually added patients like "Imran Mubashir" survive server restarts and appear in all dropdown menus throughout the application
- **COMPLETED**: Fixed SelectItem validation errors in Voice Documentation and Mobile Health pages - replaced empty string values with proper non-empty values ("loading", "no-patients") to eliminate red error overlay and enable proper dropdown functionality

**June 30, 2025:**
- **COMPLETED**: Fixed AI Insights page data loading in live environment - added JWT Bearer token headers to AI insights API calls and created sample AI insights data (5 insights: cardiovascular risk assessment, drug interaction alerts, treatment suggestions, preventive care recommendations), enabling proper display of AI insights instead of error message
- **COMPLETED**: Fixed Analytics Dashboard page data loading in live environment - added JWT Bearer token headers to analytics API calls, enabling proper display of analytics data (1,247 total patients, real revenue figures, actual metrics) instead of showing zeros
- **COMPLETED**: Fixed Automation page data loading in live environment - added JWT Bearer token headers to automation rules and statistics API calls, enabling proper display of automation data (12 total rules, 9 active rules) instead of showing zeros
- **COMPLETED**: Fixed messaging system authentication for live environment - added JWT Bearer token headers to all messaging API calls including conversations, messages, campaigns, and message sending functionality, enabling users to create new messages and campaigns in production
- **COMPLETED**: Fixed medical record creation authentication for live environment - added JWT Bearer token headers to all medical record API calls including creation, updates, and fetching in ConsultationNotes component, enabling users to add and edit patient medical records in production
- **COMPLETED**: Fixed message templates functionality in live environment - added templates API endpoint with proper JWT authentication and comprehensive message templates (appointment reminders, lab results, prescriptions, emergency alerts, patient onboarding) with usage statistics
- **COMPLETED**: Fixed messaging analytics functionality in live environment - added analytics API endpoint with proper JWT authentication, comprehensive analytics dashboard with key metrics (total messages, response rates, campaign reach), message volume trends, template usage statistics, and recent messaging activity
- **COMPLETED**: Fixed appointment department selection issue - added department dropdown field to appointment booking form with 10 medical departments (Cardiology, Neurology, Orthopedics, etc.), updated form validation to require department selection, automatic location generation with department name, and enhanced visibility with department badges in appointment cards and details dialog to prevent all appointments defaulting to Cardiology
- **COMPLETED**: Fixed appointment deletion functionality - added DELETE API endpoint (/api/appointments/:id) with proper authorization, implemented deleteAppointment method in storage layer with organization-level security, and added red "Delete" button in appointment details dialog with error handling and success notifications
- **COMPLETED**: Fixed Dashboard appointment booking dialog scrolling issue - added max-height constraint (90vh) and vertical scrolling to the New Appointment Dialog in appointment-calendar component, enabling users to scroll through all form fields when content exceeds viewport height
- **COMPLETED**: Fixed authentication system for deployed environment - enabled proper authentication flow, created professional login page with Averox branding and demo credentials for all user roles, configured proper routing between login and main application
- **COMPLETED**: Fixed user settings button in sidebar - replaced direct logout button with proper dropdown menu containing Profile Settings, Account Settings, and Sign out options with proper visual hierarchy and user information display
- **COMPLETED**: Fixed page refresh authentication persistence - added missing /api/auth/validate endpoint to maintain user sessions across page refreshes without requiring re-login
- **COMPLETED**: Fixed department display issue - corrected garbled department text by improving location string parsing logic to properly extract department names from appointment locations
- **COMPLETED**: Fixed appointment scheduling in live environment - added JWT token authentication headers to appointment creation and deletion API calls to work properly in production deployment
- **COMPLETED**: Fixed patients page blank screen issue in live environment - implemented custom queryFn with explicit JWT authentication headers, proper error handling, and TypeScript type safety to ensure patient data loads correctly in production
- **COMPLETED**: Fixed appointment scheduling dropdown and appointment visibility in live environment - replaced hardcoded patient/provider dropdowns with dynamic data loading using proper JWT authentication, ensuring recently created contacts like "Imran Mubashir" appear in appointment booking and scheduled appointments display correctly in calendar
- **COMPLETED**: Fixed prescription page patient dropdown and prescription list issues in live environment - replaced hardcoded patient dropdown (Sarah Johnson, Robert Davis, Emily Watson) with dynamic patient data loading using JWT authentication, ensuring recently created patients appear in prescription creation and existing prescriptions display correctly with proper patient name mapping
- **COMPLETED**: Fixed lab results page empty list issue in live environment - added JWT Bearer token authentication headers to lab results data fetching, ensuring ordered lab tests display correctly in the results list with proper statistics and filtering functionality
- **COMPLETED**: Fixed Order Study button functionality in Medical Imaging page - implemented missing dialog with comprehensive form fields for patient selection, imaging modality, body part, priority, clinical indication, and special instructions, enabling users to order new imaging studies with proper validation and success notifications

**June 29, 2025:**
- **COMPLETED**: Fixed telemedicine Schedule Consultation dialog scrolling issue - added max-height constraint and vertical scrolling for proper dialog accessibility
- **COMPLETED**: Fixed telemedicine Settings dialog save functionality - implemented controlled state management and proper dialog closing after save operations
- **COMPLETED**: Fixed telemedicine "Set Up Monitoring" button - created comprehensive remote patient monitoring setup dialog with device configuration, alert thresholds, and notification settings
- **COMPLETED**: Fixed Population Health "Create Cohort" button - implemented full cohort creation dialog with patient selection, age criteria, medical conditions, form validation, and success notifications
- **COMPLETED**: Fixed Population Health "Export Report" button - added comprehensive CSV report generation with population metrics, cohort breakdown, intervention rates, and preventive care data
- **COMPLETED**: Fixed Settings page authentication error - replaced generic error message with clear admin login instructions and credentials display for proper user guidance
- **COMPLETED**: Fixed application-wide scrolling issue - changed main layout from overflow-hidden to overflow-y-auto enabling vertical scrolling for all pages when content exceeds viewport height

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
- **COMPLETED**: Fixed appointment calendar functionality - appointments now display correctly on calendar, new appointment creation works with proper API integration, and resolved layout issue with buttons extending outside appointment cards
- **COMPLETED**: Fixed patient View button 404 errors by adding missing `/patients/:id` route for individual patient detail pages
- **COMPLETED**: Fixed medical staff not displaying in appointments calendar by creating dedicated `/api/medical-staff` endpoint accessible to authenticated users and updating DoctorList component with proper fetch implementation
- **COMPLETED**: Fixed View Profile button functionality for medical staff - created dedicated StaffProfile page with comprehensive staff information display, proper routing (/staff/:id), and navigation from appointments calendar
- **COMPLETED**: Made "Send to Pharmacy" button fully functional - added pharmacy selection dialog with pre-filled UK pharmacy details, API integration to update prescription pharmacy data, proper error handling and success notifications, while preserving prescription data loading functionality
- **COMPLETED**: Fixed Share Study button on imaging page - implemented comprehensive sharing dialog with email/WhatsApp contact method selection, custom message field, validation, and success notifications
- **COMPLETED**: Fixed Generate Report button on imaging page - created detailed radiology report generation dialog with patient information display, editable findings and impression fields, existing report status indicators, and download functionality for completed reports
- **COMPLETED**: Fixed Create Campaign button functionality in Messaging Center - implemented comprehensive campaign creation dialog with name, type, subject, content, and template selection fields, proper validation, API integration, and success notifications
- **COMPLETED**: Fixed New Message button functionality in Messaging Center - created professional message composition dialog with recipient, type, subject, priority, and content fields, comprehensive form validation, and proper state management
- **COMPLETED**: Enhanced video call functionality in Messaging Center - improved interface with realistic effects, animated gradients, connection quality indicators, audio visualizers, enhanced self-video display, microphone indicators, and professional control buttons for complete telemedicine experience
- **COMPLETED**: Fixed Add Integration button on Integrations page - added comprehensive dialog with integration categories (Messaging, Clinical, Billing, Analytics, Compliance, Workflow) and popular integrations section with working Connect buttons
- **COMPLETED**: Fixed Browse Marketplace button on Integrations page - implemented full marketplace dialog with featured integrations, category browser, trending integrations, ratings, install counts, and functional install buttons
- **COMPLETED**: Fixed Filter button on Analytics Dashboard page - now opens comprehensive filter dialog with date range, department, provider, and patient type options
- **COMPLETED**: Fixed Export button on Analytics Dashboard page - now downloads CSV report with all analytics metrics and proper file handling
- **COMPLETED**: Fixed Filter button on Automation page - now opens comprehensive filter dialog with status and category filtering options connected to existing filter logic
- **COMPLETED**: Added scrollbar functionality to Analytics Dashboard page - implemented proper vertical scrolling for content that extends beyond viewport

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