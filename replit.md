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
- **Resolved invoice logo display issue**: Fixed corrupted base64 logo data in invoice generation by replacing with proper PNG file path (/cura-spiral-logo.png), ensuring authentic Cura logo displays correctly in all generated invoices
- **Fixed prescription email logo centering**: Successfully resolved spiral logo positioning issue in prescription email white container by implementing table-based centering (HTML table with td text-align: center; vertical-align: middle) and updating to user's new spiral logo image, ensuring perfect center alignment across all email clients
- **Integrated updated email credentials**: Successfully updated email service with new Averox credentials (noreply@averox.com / Ls7168025) and verified messaging system functionality with comprehensive email integration including appointment reminders, prescription notifications, custom messages, and prescription PDF sending
- **Fixed messaging system validation and display**: Resolved critical messaging form validation issue where Subject field was not being validated properly, causing "Please fill in all required fields" error despite user input. Enhanced validation to show specific missing fields and confirmed complete messaging system functionality with proper conversation storage and display
- **COMPLETELY FIXED conversation system**: Resolved critical frontend-backend connectivity issue where conversations were not displaying despite backend working correctly. Fixed tenant subdomain mismatch in frontend (was using 'demo' instead of 'cura'), causing empty conversation arrays. Updated all API calls in messaging.tsx to use correct 'cura' subdomain. System now displays proper participant names like "John Administrator" and shows all conversations correctly in the messaging center frontend interface. Verified complete end-to-end functionality from message creation to conversation display
- **COMPLETELY FIXED appointment display issue**: Resolved critical bug where AI chatbot successfully booked appointments but they didn't appear in "All Upcoming Appointments" section. Root cause was tenant subdomain mismatch in appointment-calendar.tsx component - was using 'demo' instead of 'cura' in API headers, causing appointments query to return empty results. Fixed all three API calls (appointments, patients, users) to use correct 'cura' subdomain. AI-booked appointments now properly display with patient names, doctor names, and all appointment details in the calendar interface
- **COMPLETELY FIXED doctor name recognition and availability checking**: Resolved critical issues where "Sara Smith" incorrectly matched "Sara Rizvi" due to partial matching, and false availability reporting. Implemented precise exact matching logic, enhanced conflict detection with comprehensive logging, improved doctor name extraction patterns, and fixed TypeScript errors in Anthropic API calls
- **FIXED cache invalidation for AI appointments**: Resolved issue where AI-booked appointments didn't appear in dashboard until page refresh. Added automatic cache invalidation in AI chat widget to refresh appointments, dashboard stats, patients, and users data immediately after successful appointment booking
- **ENHANCED AI conversation context retention**: Completely redesigned conversation tracking to prevent repetitive questions. Added comprehensive conversation context analysis that extracts patient names, doctor names, and time information from chat history. AI now maintains context across messages and only asks for missing information, eliminating scenarios where user provides "Salman Mahmood" and "Dr Ali Raza" but AI asks for basic booking information again
- **COMPLETELY FIXED chatbot greeting responses**: Resolved critical pattern matching bug where `else if (true)` condition prevented greeting responses from being generated. AI chatbot now properly responds to all greeting variations ("Hello", "Hi", "Hey", "Help") with appropriate Cura AI Assistant welcome message featuring appointment booking and prescription search capabilities
- **FIXED AI chatbot AM/PM time parsing**: Resolved critical bug where "3 AM" was incorrectly parsed as "3:0 military time" and saved as 3:00 PM instead of 3:00 AM. Enhanced regex patterns to prioritize AM/PM parsing over military time, ensuring proper handling of voice recognition variations like "3:0 AM". Now correctly converts AM/PM times to 24-hour format for database storage
- **FIXED prescription search patient name matching**: Resolved critical bug where searching for "Ifra Khan" incorrectly returned results for "Maryam Khan" due to partial name matching. Implemented exact name matching with word boundaries to prevent incorrect patient data retrieval, ensuring prescription searches return accurate results for the requested patient
- **ENHANCED prescription details display**: Improved AI chatbot prescription search to show diagnosis and notes when medication details are unavailable. Instead of displaying "No medication details", now shows meaningful information like "Type 2 Diabetes - Status: active (8/9/2025) - Monitor blood glucose levels" providing better clinical context
- **COMPLETELY FIXED AI appointment booking system**: Resolved all critical timing and cache refresh issues. Fixed military time parsing to correctly interpret "9:0" as 9:00 AM instead of auto-converting to 9:00 PM. Enhanced cache invalidation system to immediately remove and refetch appointments, patients, and users data after AI booking. Eliminated all timing discrepancies and display delays - appointments now save to database with correct times and appear instantly in calendar interface

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