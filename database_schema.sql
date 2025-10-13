-- =====================================================
-- Averox Healthcare Management System - Database Schema
-- Multi-tenant Healthcare Application
-- PostgreSQL Database Schema
-- =====================================================

-- SaaS Platform Tables
-- =====================================================

-- SaaS Owners (Platform Administrators)
CREATE TABLE saas_owners (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    password TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    last_login_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- SaaS Packages
CREATE TABLE saas_packages (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    price DECIMAL(10, 2) NOT NULL,
    billing_cycle VARCHAR(20) NOT NULL DEFAULT 'monthly', -- monthly, yearly
    features JSONB DEFAULT '{}',
    is_active BOOLEAN NOT NULL DEFAULT true,
    show_on_website BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- SaaS Subscriptions
CREATE TABLE saas_subscriptions (
    id SERIAL PRIMARY KEY,
    organization_id INTEGER NOT NULL,
    package_id INTEGER NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'active', -- active, cancelled, suspended, past_due
    current_period_start TIMESTAMP NOT NULL,
    current_period_end TIMESTAMP NOT NULL,
    cancel_at_period_end BOOLEAN NOT NULL DEFAULT false,
    trial_end TIMESTAMP,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- SaaS Payments
CREATE TABLE saas_payments (
    id SERIAL PRIMARY KEY,
    organization_id INTEGER NOT NULL,
    subscription_id INTEGER,
    invoice_number VARCHAR(50) NOT NULL UNIQUE,
    amount DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'GBP',
    payment_method VARCHAR(20) NOT NULL, -- cash, stripe, paypal, bank_transfer
    payment_status VARCHAR(20) NOT NULL DEFAULT 'pending', -- pending, completed, failed, refunded
    payment_date TIMESTAMP,
    due_date TIMESTAMP NOT NULL,
    period_start TIMESTAMP NOT NULL,
    period_end TIMESTAMP NOT NULL,
    payment_provider VARCHAR(50),
    provider_transaction_id TEXT,
    description TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- SaaS Settings
CREATE TABLE saas_settings (
    id SERIAL PRIMARY KEY,
    key VARCHAR(100) NOT NULL UNIQUE,
    value JSONB,
    description TEXT,
    category VARCHAR(50) NOT NULL DEFAULT 'system',
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- SaaS Invoices
CREATE TABLE saas_invoices (
    id SERIAL PRIMARY KEY,
    organization_id INTEGER NOT NULL,
    subscription_id INTEGER NOT NULL,
    invoice_number VARCHAR(50) NOT NULL UNIQUE,
    amount DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'GBP',
    status VARCHAR(20) NOT NULL DEFAULT 'draft', -- draft, sent, paid, overdue, cancelled
    issue_date TIMESTAMP NOT NULL,
    due_date TIMESTAMP NOT NULL,
    paid_date TIMESTAMP,
    period_start TIMESTAMP NOT NULL,
    period_end TIMESTAMP NOT NULL,
    line_items JSONB DEFAULT '[]',
    notes TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Core Organization & User Tables
-- =====================================================

-- Organizations (Tenants)
CREATE TABLE organizations (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    subdomain VARCHAR(50) NOT NULL UNIQUE,
    email TEXT NOT NULL,
    region VARCHAR(10) NOT NULL DEFAULT 'UK', -- UK, EU, ME, SA, US
    brand_name TEXT NOT NULL,
    settings JSONB DEFAULT '{}',
    features JSONB DEFAULT '{}',
    access_level VARCHAR(50) DEFAULT 'full',
    subscription_status VARCHAR(20) NOT NULL DEFAULT 'trial', -- trial, active, suspended, cancelled
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Users
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    organization_id INTEGER NOT NULL,
    email TEXT NOT NULL,
    username TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'doctor', -- admin, doctor, nurse, receptionist, patient, sample_taker
    department TEXT,
    medical_specialty_category TEXT,
    sub_specialty TEXT,
    working_days JSONB DEFAULT '[]',
    working_hours JSONB DEFAULT '{}',
    permissions JSONB DEFAULT '{}',
    is_active BOOLEAN NOT NULL DEFAULT true,
    is_saas_owner BOOLEAN NOT NULL DEFAULT false,
    last_login_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- User Document Preferences
CREATE TABLE user_document_preferences (
    id SERIAL PRIMARY KEY,
    organization_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    clinic_info JSONB DEFAULT '{}',
    header_preferences JSONB DEFAULT '{}',
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    CONSTRAINT unique_user_document_preferences UNIQUE (user_id, organization_id)
);

-- Roles
CREATE TABLE roles (
    id SERIAL PRIMARY KEY,
    organization_id INTEGER NOT NULL,
    name VARCHAR(50) NOT NULL,
    display_name TEXT NOT NULL,
    description TEXT NOT NULL,
    permissions JSONB NOT NULL,
    is_system BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Staff Management
-- =====================================================

-- Staff Shifts and Availability
CREATE TABLE staff_shifts (
    id SERIAL PRIMARY KEY,
    organization_id INTEGER NOT NULL,
    staff_id INTEGER NOT NULL,
    date TIMESTAMP NOT NULL,
    shift_type VARCHAR(20) NOT NULL DEFAULT 'regular', -- regular, overtime, on_call, absent
    start_time VARCHAR(5) NOT NULL,
    end_time VARCHAR(5) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'scheduled', -- scheduled, completed, cancelled, absent
    notes TEXT,
    is_available BOOLEAN NOT NULL DEFAULT true,
    created_by INTEGER,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Doctor Default Shifts
CREATE TABLE doctor_default_shifts (
    id SERIAL PRIMARY KEY,
    organization_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    start_time VARCHAR(5) NOT NULL DEFAULT '09:00',
    end_time VARCHAR(5) NOT NULL DEFAULT '17:00',
    working_days TEXT[] NOT NULL DEFAULT ARRAY['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Patient Management
-- =====================================================

-- Patients
CREATE TABLE patients (
    id SERIAL PRIMARY KEY,
    organization_id INTEGER NOT NULL,
    user_id INTEGER,
    patient_id TEXT NOT NULL,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    date_of_birth DATE,
    gender_at_birth VARCHAR(20),
    email TEXT,
    phone TEXT,
    nhs_number TEXT,
    address JSONB DEFAULT '{}',
    insurance_info JSONB DEFAULT '{}',
    emergency_contact JSONB DEFAULT '{}',
    medical_history JSONB DEFAULT '{}',
    risk_level VARCHAR(10) NOT NULL DEFAULT 'low', -- low, medium, high
    flags TEXT[] DEFAULT '{}',
    communication_preferences JSONB DEFAULT '{}',
    is_active BOOLEAN NOT NULL DEFAULT true,
    is_insured BOOLEAN NOT NULL DEFAULT false,
    created_by INTEGER,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Medical Records
CREATE TABLE medical_records (
    id SERIAL PRIMARY KEY,
    organization_id INTEGER NOT NULL,
    patient_id INTEGER NOT NULL,
    provider_id INTEGER NOT NULL,
    type VARCHAR(20) NOT NULL, -- consultation, prescription, lab_result, imaging
    title TEXT NOT NULL,
    notes TEXT,
    diagnosis TEXT,
    treatment TEXT,
    prescription JSONB DEFAULT '{}',
    attachments JSONB DEFAULT '[]',
    ai_suggestions JSONB DEFAULT '{}',
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Appointments
CREATE TABLE appointments (
    id SERIAL PRIMARY KEY,
    organization_id INTEGER NOT NULL,
    patient_id INTEGER NOT NULL,
    provider_id INTEGER NOT NULL,
    assigned_role VARCHAR(50),
    title TEXT NOT NULL,
    description TEXT,
    scheduled_at TIMESTAMP NOT NULL,
    duration INTEGER NOT NULL DEFAULT 30,
    status VARCHAR(20) NOT NULL DEFAULT 'scheduled', -- scheduled, completed, cancelled, no_show, rescheduled
    type VARCHAR(20) NOT NULL DEFAULT 'consultation', -- consultation, follow_up, procedure, emergency, routine_checkup
    location TEXT,
    is_virtual BOOLEAN NOT NULL DEFAULT false,
    created_by INTEGER,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Billing & Financial Management
-- =====================================================

-- Patient Invoices
CREATE TABLE invoices (
    id SERIAL PRIMARY KEY,
    organization_id INTEGER NOT NULL,
    invoice_number VARCHAR(50) NOT NULL UNIQUE,
    patient_id TEXT NOT NULL,
    patient_name TEXT NOT NULL,
    nhs_number VARCHAR(10),
    date_of_service TIMESTAMP NOT NULL,
    invoice_date TIMESTAMP NOT NULL,
    due_date TIMESTAMP NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'draft', -- draft, sent, paid, overdue, cancelled
    invoice_type VARCHAR(50) NOT NULL DEFAULT 'payment', -- payment, insurance_claim
    subtotal DECIMAL(10, 2) NOT NULL,
    tax DECIMAL(10, 2) NOT NULL DEFAULT 0,
    discount DECIMAL(10, 2) NOT NULL DEFAULT 0,
    total_amount DECIMAL(10, 2) NOT NULL,
    paid_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
    items JSONB NOT NULL,
    insurance JSONB,
    payments JSONB NOT NULL DEFAULT '[]',
    notes TEXT,
    created_by INTEGER,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Payments
CREATE TABLE payments (
    id SERIAL PRIMARY KEY,
    organization_id INTEGER NOT NULL,
    invoice_id INTEGER NOT NULL,
    patient_id TEXT NOT NULL,
    transaction_id TEXT NOT NULL UNIQUE,
    amount DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'GBP',
    payment_method VARCHAR(20) NOT NULL, -- online, cash, card, bank_transfer
    payment_provider VARCHAR(50),
    payment_status VARCHAR(20) NOT NULL DEFAULT 'completed', -- completed, pending, failed, refunded
    payment_date TIMESTAMP NOT NULL DEFAULT NOW(),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Revenue Records
CREATE TABLE revenue_records (
    id SERIAL PRIMARY KEY,
    organization_id INTEGER NOT NULL,
    month VARCHAR(7) NOT NULL, -- YYYY-MM
    revenue DECIMAL(12, 2) NOT NULL,
    expenses DECIMAL(12, 2) NOT NULL,
    profit DECIMAL(12, 2) NOT NULL,
    collections DECIMAL(12, 2) NOT NULL,
    target DECIMAL(12, 2) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Insurance Management
-- =====================================================

-- Insurance Verifications
CREATE TABLE insurance_verifications (
    id SERIAL PRIMARY KEY,
    organization_id INTEGER NOT NULL,
    patient_id INTEGER NOT NULL,
    patient_name TEXT NOT NULL,
    provider TEXT NOT NULL,
    policy_number TEXT NOT NULL,
    group_number TEXT,
    member_number TEXT,
    nhs_number TEXT,
    plan_type TEXT,
    coverage_type VARCHAR(20) NOT NULL DEFAULT 'primary', -- primary, secondary
    status VARCHAR(20) NOT NULL DEFAULT 'active', -- active, inactive, pending, expired
    eligibility_status VARCHAR(20) NOT NULL DEFAULT 'pending', -- verified, pending, invalid
    effective_date DATE,
    expiration_date DATE,
    last_verified DATE,
    benefits JSONB DEFAULT '{}',
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Claims
CREATE TABLE claims (
    id SERIAL PRIMARY KEY,
    organization_id INTEGER NOT NULL,
    patient_id INTEGER NOT NULL,
    invoice_id INTEGER NOT NULL,
    claim_number VARCHAR(50) NOT NULL UNIQUE,
    insurance_provider TEXT NOT NULL,
    total_billed DECIMAL(10, 2) NOT NULL,
    total_approved DECIMAL(10, 2),
    total_paid DECIMAL(10, 2),
    status VARCHAR(20) NOT NULL DEFAULT 'submitted', -- submitted, approved, denied, pending
    submission_date TIMESTAMP NOT NULL,
    response_date TIMESTAMP,
    denial_reason TEXT,
    notes TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Financial Forecasting
-- =====================================================

-- Forecast Models
CREATE TABLE forecast_models (
    id SERIAL PRIMARY KEY,
    organization_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    type VARCHAR(30) NOT NULL, -- revenue, expenses, collections, claims
    algorithm VARCHAR(20) NOT NULL DEFAULT 'linear', -- linear, seasonal, exponential
    parameters JSONB DEFAULT '{}',
    accuracy DECIMAL(5, 2),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Financial Forecasts
CREATE TABLE financial_forecasts (
    id SERIAL PRIMARY KEY,
    organization_id INTEGER NOT NULL,
    category TEXT NOT NULL,
    forecast_period VARCHAR(7) NOT NULL, -- YYYY-MM
    generated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    current_value DECIMAL(12, 2) NOT NULL,
    projected_value DECIMAL(12, 2) NOT NULL,
    variance DECIMAL(12, 2) NOT NULL,
    trend VARCHAR(10) NOT NULL, -- up, down, stable
    confidence INTEGER NOT NULL,
    methodology VARCHAR(30) NOT NULL DEFAULT 'historical_trend',
    key_factors JSONB DEFAULT '[]',
    model_id INTEGER,
    metadata JSONB DEFAULT '{}',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- AI & Clinical Decision Support
-- =====================================================

-- AI Insights
CREATE TABLE ai_insights (
    id SERIAL PRIMARY KEY,
    organization_id INTEGER NOT NULL,
    patient_id INTEGER,
    type VARCHAR(30) NOT NULL, -- risk_alert, drug_interaction, treatment_suggestion, preventive_care
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    severity VARCHAR(10) NOT NULL DEFAULT 'medium', -- low, medium, high, critical
    action_required BOOLEAN NOT NULL DEFAULT false,
    confidence VARCHAR(10),
    metadata JSONB DEFAULT '{}',
    status VARCHAR(20) NOT NULL DEFAULT 'active', -- active, dismissed, resolved
    ai_status VARCHAR(20) DEFAULT 'pending', -- pending, reviewed, implemented, dismissed
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Clinical Procedures
CREATE TABLE clinical_procedures (
    id SERIAL PRIMARY KEY,
    organization_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    category VARCHAR(50) NOT NULL,
    duration TEXT NOT NULL,
    complexity VARCHAR(20) NOT NULL, -- low, medium, high
    prerequisites JSONB DEFAULT '[]',
    steps JSONB DEFAULT '[]',
    complications JSONB DEFAULT '[]',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Emergency Protocols
CREATE TABLE emergency_protocols (
    id SERIAL PRIMARY KEY,
    organization_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    priority VARCHAR(20) NOT NULL, -- low, medium, high, critical
    steps JSONB DEFAULT '[]',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Medications & Drug Interactions
-- =====================================================

-- Medications Database
CREATE TABLE medications_database (
    id SERIAL PRIMARY KEY,
    organization_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    dosage TEXT NOT NULL,
    interactions JSONB DEFAULT '[]',
    warnings JSONB DEFAULT '[]',
    severity VARCHAR(20) NOT NULL, -- low, medium, high
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Patient Drug Interactions
CREATE TABLE patient_drug_interactions (
    id SERIAL PRIMARY KEY,
    organization_id INTEGER NOT NULL,
    patient_id INTEGER NOT NULL,
    medication1_name TEXT NOT NULL,
    medication1_dosage TEXT NOT NULL,
    medication1_frequency TEXT,
    medication2_name TEXT NOT NULL,
    medication2_dosage TEXT NOT NULL,
    medication2_frequency TEXT,
    interaction_type VARCHAR(50), -- drug-drug, drug-food, drug-condition
    severity VARCHAR(20) NOT NULL DEFAULT 'medium', -- low, medium, high
    description TEXT,
    warnings JSONB DEFAULT '[]',
    recommendations JSONB DEFAULT '[]',
    reported_by INTEGER,
    reported_at TIMESTAMP NOT NULL DEFAULT NOW(),
    status VARCHAR(20) NOT NULL DEFAULT 'active', -- active, resolved, dismissed
    notes TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Prescriptions & Lab Results
-- =====================================================

-- Prescriptions
CREATE TABLE prescriptions (
    id SERIAL PRIMARY KEY,
    organization_id INTEGER NOT NULL,
    patient_id INTEGER NOT NULL,
    provider_id INTEGER NOT NULL,
    medication_name TEXT NOT NULL,
    dosage TEXT NOT NULL,
    frequency TEXT NOT NULL,
    duration TEXT NOT NULL,
    instructions TEXT,
    refills INTEGER NOT NULL DEFAULT 0,
    status VARCHAR(20) NOT NULL DEFAULT 'active', -- active, completed, cancelled
    issued_date TIMESTAMP NOT NULL,
    expiry_date TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Lab Results
CREATE TABLE lab_results (
    id SERIAL PRIMARY KEY,
    organization_id INTEGER NOT NULL,
    patient_id INTEGER NOT NULL,
    test_name TEXT NOT NULL,
    test_type VARCHAR(50) NOT NULL,
    result_value TEXT NOT NULL,
    unit TEXT,
    reference_range TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'pending', -- pending, completed, reviewed
    abnormal_flag BOOLEAN NOT NULL DEFAULT false,
    notes TEXT,
    ordered_by INTEGER,
    reviewed_by INTEGER,
    ordered_at TIMESTAMP NOT NULL,
    completed_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Medical Imaging
-- =====================================================

-- Medical Images
CREATE TABLE medical_images (
    id SERIAL PRIMARY KEY,
    organization_id INTEGER NOT NULL,
    patient_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    image_type VARCHAR(50) NOT NULL, -- X-Ray, CT Scan, MRI, Ultrasound
    modality VARCHAR(20) NOT NULL,
    body_part TEXT NOT NULL,
    image_url TEXT NOT NULL,
    thumbnail_url TEXT,
    file_size INTEGER,
    dimensions JSONB,
    dicom_metadata JSONB,
    report JSONB DEFAULT '{}',
    status VARCHAR(20) NOT NULL DEFAULT 'pending', -- pending, reported, reviewed
    ordered_by INTEGER,
    performed_by INTEGER,
    reported_by INTEGER,
    acquired_at TIMESTAMP NOT NULL,
    reported_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Clinical Photos
CREATE TABLE clinical_photos (
    id SERIAL PRIMARY KEY,
    organization_id INTEGER NOT NULL,
    patient_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    body_part TEXT,
    photo_url TEXT NOT NULL,
    thumbnail_url TEXT,
    taken_by INTEGER NOT NULL,
    taken_at TIMESTAMP NOT NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Communications & Messaging
-- =====================================================

-- Patient Communications
CREATE TABLE patient_communications (
    id SERIAL PRIMARY KEY,
    organization_id INTEGER NOT NULL,
    patient_id INTEGER NOT NULL,
    sent_by INTEGER NOT NULL,
    channel VARCHAR(20) NOT NULL, -- email, sms, phone, portal
    message_type VARCHAR(20) NOT NULL, -- appointment_reminder, prescription_ready, test_result, general
    subject TEXT,
    message TEXT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'sent', -- sent, delivered, failed, read
    scheduled_at TIMESTAMP,
    sent_at TIMESTAMP,
    delivered_at TIMESTAMP,
    read_at TIMESTAMP,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Conversations
CREATE TABLE conversations (
    id VARCHAR(50) PRIMARY KEY,
    organization_id INTEGER NOT NULL,
    participants JSONB NOT NULL,
    last_message JSONB,
    unread_count INTEGER NOT NULL DEFAULT 0,
    is_patient_conversation BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Messages
CREATE TABLE messages (
    id VARCHAR(50) PRIMARY KEY,
    organization_id INTEGER NOT NULL,
    conversation_id VARCHAR(50) NOT NULL,
    sender_id INTEGER NOT NULL,
    sender_name TEXT NOT NULL,
    sender_role VARCHAR(20) NOT NULL,
    recipient_id TEXT,
    recipient_name TEXT,
    subject TEXT NOT NULL,
    content TEXT NOT NULL,
    timestamp TIMESTAMP NOT NULL DEFAULT NOW(),
    is_read BOOLEAN NOT NULL DEFAULT false,
    priority VARCHAR(10) NOT NULL DEFAULT 'normal', -- low, normal, high, urgent
    type VARCHAR(20) NOT NULL DEFAULT 'internal', -- internal, patient, broadcast
    is_starred BOOLEAN NOT NULL DEFAULT false,
    phone_number VARCHAR(20),
    message_type VARCHAR(10), -- sms, email, internal
    delivery_status VARCHAR(20) NOT NULL DEFAULT 'pending', -- pending, sent, delivered, failed
    external_message_id TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Notifications
CREATE TABLE notifications (
    id SERIAL PRIMARY KEY,
    organization_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    type VARCHAR(30) NOT NULL, -- appointment, message, alert, reminder
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    priority VARCHAR(10) NOT NULL DEFAULT 'normal', -- low, normal, high, urgent
    action_url TEXT,
    is_read BOOLEAN NOT NULL DEFAULT false,
    read_at TIMESTAMP,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Telehealth & Consultations
-- =====================================================

-- Subscriptions
CREATE TABLE subscriptions (
    id SERIAL PRIMARY KEY,
    organization_id INTEGER NOT NULL,
    patient_id INTEGER NOT NULL,
    plan_name TEXT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'active', -- active, cancelled, expired
    start_date TIMESTAMP NOT NULL,
    end_date TIMESTAMP,
    amount DECIMAL(10, 2) NOT NULL,
    billing_cycle VARCHAR(20) NOT NULL, -- monthly, yearly
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Consultations
CREATE TABLE consultations (
    id SERIAL PRIMARY KEY,
    organization_id INTEGER NOT NULL,
    patient_id INTEGER NOT NULL,
    provider_id INTEGER NOT NULL,
    consultation_type VARCHAR(30) NOT NULL, -- video, phone, in_person
    status VARCHAR(20) NOT NULL DEFAULT 'scheduled', -- scheduled, in_progress, completed, cancelled
    scheduled_at TIMESTAMP NOT NULL,
    started_at TIMESTAMP,
    ended_at TIMESTAMP,
    duration INTEGER,
    notes TEXT,
    diagnosis TEXT,
    prescription JSONB,
    follow_up_required BOOLEAN NOT NULL DEFAULT false,
    follow_up_date TIMESTAMP,
    recording_url TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Symptom Checks
CREATE TABLE symptom_checks (
    id SERIAL PRIMARY KEY,
    organization_id INTEGER NOT NULL,
    patient_id INTEGER,
    symptoms JSONB NOT NULL,
    severity VARCHAR(10) NOT NULL, -- mild, moderate, severe
    ai_assessment TEXT,
    recommendations JSONB DEFAULT '[]',
    urgency_level VARCHAR(20) NOT NULL, -- routine, urgent, emergency
    follow_up_required BOOLEAN NOT NULL DEFAULT false,
    status VARCHAR(20) NOT NULL DEFAULT 'pending', -- pending, reviewed, resolved
    reviewed_by INTEGER,
    reviewed_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- GDPR & Compliance
-- =====================================================

-- GDPR Consents
CREATE TABLE gdpr_consents (
    id SERIAL PRIMARY KEY,
    organization_id INTEGER NOT NULL,
    patient_id INTEGER NOT NULL,
    consent_type VARCHAR(50) NOT NULL, -- data_processing, marketing, research, third_party_sharing
    consent_given BOOLEAN NOT NULL,
    consent_text TEXT NOT NULL,
    consent_version VARCHAR(20) NOT NULL,
    consented_at TIMESTAMP NOT NULL,
    withdrawn_at TIMESTAMP,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- GDPR Data Requests
CREATE TABLE gdpr_data_requests (
    id SERIAL PRIMARY KEY,
    organization_id INTEGER NOT NULL,
    patient_id INTEGER NOT NULL,
    request_type VARCHAR(30) NOT NULL, -- access, erasure, portability, rectification
    status VARCHAR(20) NOT NULL DEFAULT 'pending', -- pending, processing, completed, rejected
    request_details TEXT,
    requested_at TIMESTAMP NOT NULL,
    completed_at TIMESTAMP,
    rejection_reason TEXT,
    processed_by INTEGER,
    data_package_url TEXT,
    notes TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- GDPR Audit Trail
CREATE TABLE gdpr_audit_trail (
    id SERIAL PRIMARY KEY,
    organization_id INTEGER NOT NULL,
    user_id INTEGER,
    patient_id INTEGER,
    action VARCHAR(50) NOT NULL, -- view, create, update, delete, export, share
    resource_type VARCHAR(50) NOT NULL, -- patient, medical_record, prescription, etc.
    resource_id INTEGER,
    ip_address VARCHAR(45),
    user_agent TEXT,
    details JSONB,
    timestamp TIMESTAMP NOT NULL DEFAULT NOW()
);

-- GDPR Processing Activities
CREATE TABLE gdpr_processing_activities (
    id SERIAL PRIMARY KEY,
    organization_id INTEGER NOT NULL,
    activity_name TEXT NOT NULL,
    purpose TEXT NOT NULL,
    legal_basis VARCHAR(50) NOT NULL, -- consent, contract, legal_obligation, vital_interest, public_task, legitimate_interest
    data_categories JSONB NOT NULL,
    recipients JSONB,
    retention_period TEXT NOT NULL,
    security_measures TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Inventory Management
-- =====================================================

-- Inventory Categories
CREATE TABLE inventory_categories (
    id SERIAL PRIMARY KEY,
    organization_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    parent_category_id INTEGER,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Inventory Items
CREATE TABLE inventory_items (
    id SERIAL PRIMARY KEY,
    organization_id INTEGER NOT NULL,
    category_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    sku VARCHAR(100) NOT NULL,
    barcode VARCHAR(100),
    generic_name TEXT,
    brand_name TEXT,
    manufacturer TEXT,
    unit_of_measurement VARCHAR(20) NOT NULL DEFAULT 'pieces',
    pack_size INTEGER NOT NULL DEFAULT 1,
    purchase_price DECIMAL(10, 2) NOT NULL,
    sale_price DECIMAL(10, 2) NOT NULL,
    mrp DECIMAL(10, 2),
    tax_rate DECIMAL(5, 2) NOT NULL DEFAULT 0.00,
    current_stock INTEGER NOT NULL DEFAULT 0,
    minimum_stock INTEGER NOT NULL DEFAULT 10,
    maximum_stock INTEGER NOT NULL DEFAULT 1000,
    reorder_point INTEGER NOT NULL DEFAULT 20,
    expiry_tracking BOOLEAN NOT NULL DEFAULT false,
    batch_tracking BOOLEAN NOT NULL DEFAULT false,
    prescription_required BOOLEAN NOT NULL DEFAULT false,
    storage_conditions TEXT,
    side_effects TEXT,
    contraindications TEXT,
    dosage_instructions TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    is_discontinued BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Inventory Suppliers
CREATE TABLE inventory_suppliers (
    id SERIAL PRIMARY KEY,
    organization_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    contact_person TEXT,
    email TEXT,
    phone VARCHAR(20),
    address TEXT,
    city TEXT,
    country TEXT NOT NULL DEFAULT 'UK',
    tax_id VARCHAR(50),
    payment_terms VARCHAR(100) DEFAULT 'Net 30',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Inventory Purchase Orders
CREATE TABLE inventory_purchase_orders (
    id SERIAL PRIMARY KEY,
    organization_id INTEGER NOT NULL,
    po_number VARCHAR(100) NOT NULL UNIQUE,
    supplier_id INTEGER NOT NULL,
    order_date TIMESTAMP NOT NULL DEFAULT NOW(),
    expected_delivery_date TIMESTAMP,
    status VARCHAR(20) NOT NULL DEFAULT 'pending', -- pending, sent, received, cancelled
    total_amount DECIMAL(12, 2) NOT NULL,
    tax_amount DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    discount_amount DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    notes TEXT,
    created_by INTEGER NOT NULL,
    approved_by INTEGER,
    approved_at TIMESTAMP,
    email_sent BOOLEAN NOT NULL DEFAULT false,
    email_sent_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Inventory Purchase Order Items
CREATE TABLE inventory_purchase_order_items (
    id SERIAL PRIMARY KEY,
    organization_id INTEGER NOT NULL,
    purchase_order_id INTEGER NOT NULL,
    item_id INTEGER NOT NULL,
    quantity INTEGER NOT NULL,
    unit_price DECIMAL(10, 2) NOT NULL,
    total_price DECIMAL(12, 2) NOT NULL,
    received_quantity INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Inventory Batches
CREATE TABLE inventory_batches (
    id SERIAL PRIMARY KEY,
    organization_id INTEGER NOT NULL,
    item_id INTEGER NOT NULL,
    batch_number VARCHAR(100) NOT NULL,
    expiry_date TIMESTAMP,
    manufacture_date TIMESTAMP,
    quantity INTEGER NOT NULL,
    remaining_quantity INTEGER NOT NULL DEFAULT 0,
    purchase_price DECIMAL(10, 2) NOT NULL,
    supplier_id INTEGER,
    received_date TIMESTAMP NOT NULL DEFAULT NOW(),
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    is_expired BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Inventory Sales
CREATE TABLE inventory_sales (
    id SERIAL PRIMARY KEY,
    organization_id INTEGER NOT NULL,
    patient_id INTEGER,
    sale_number VARCHAR(100) NOT NULL UNIQUE,
    sale_date TIMESTAMP NOT NULL DEFAULT NOW(),
    total_amount DECIMAL(12, 2) NOT NULL,
    tax_amount DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    discount_amount DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    payment_method VARCHAR(50) NOT NULL DEFAULT 'cash', -- cash, card, insurance
    payment_status VARCHAR(20) NOT NULL DEFAULT 'paid', -- paid, pending, partial
    prescription_id INTEGER,
    sold_by INTEGER NOT NULL,
    notes TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Inventory Sale Items
CREATE TABLE inventory_sale_items (
    id SERIAL PRIMARY KEY,
    organization_id INTEGER NOT NULL,
    sale_id INTEGER NOT NULL,
    item_id INTEGER NOT NULL,
    batch_id INTEGER,
    quantity INTEGER NOT NULL,
    unit_price DECIMAL(10, 2) NOT NULL,
    total_price DECIMAL(12, 2) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Inventory Stock Movements
CREATE TABLE inventory_stock_movements (
    id SERIAL PRIMARY KEY,
    organization_id INTEGER NOT NULL,
    item_id INTEGER NOT NULL,
    batch_id INTEGER,
    movement_type VARCHAR(20) NOT NULL, -- purchase, sale, adjustment, transfer, expired
    quantity INTEGER NOT NULL,
    previous_stock INTEGER NOT NULL,
    new_stock INTEGER NOT NULL,
    unit_cost DECIMAL(10, 2),
    reference_type VARCHAR(50),
    reference_id INTEGER,
    notes TEXT,
    created_by INTEGER NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Inventory Stock Alerts
CREATE TABLE inventory_stock_alerts (
    id SERIAL PRIMARY KEY,
    organization_id INTEGER NOT NULL,
    item_id INTEGER NOT NULL,
    alert_type VARCHAR(20) NOT NULL, -- low_stock, expired, expiring_soon
    threshold_value INTEGER NOT NULL,
    current_value INTEGER NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'active', -- active, resolved
    message TEXT,
    is_read BOOLEAN NOT NULL DEFAULT false,
    is_resolved BOOLEAN NOT NULL DEFAULT false,
    resolved_by INTEGER,
    resolved_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Documents & Forms
-- =====================================================

-- Documents
CREATE TABLE documents (
    id SERIAL PRIMARY KEY,
    organization_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    type VARCHAR(50) NOT NULL DEFAULT 'medical_form',
    content TEXT NOT NULL,
    metadata JSONB DEFAULT '{}',
    is_template BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Letter Drafts
CREATE TABLE letter_drafts (
    id SERIAL PRIMARY KEY,
    organization_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    patient_id INTEGER,
    letter_type VARCHAR(50) NOT NULL, -- referral, medical_certificate, sick_note, etc.
    subject TEXT,
    recipient TEXT,
    recipient_address TEXT,
    salutation TEXT,
    body TEXT NOT NULL,
    closing TEXT,
    signature_name TEXT,
    signature_title TEXT,
    template_used VARCHAR(50),
    header_type VARCHAR(20),
    status VARCHAR(20) NOT NULL DEFAULT 'draft', -- draft, finalized, sent
    finalized_at TIMESTAMP,
    sent_at TIMESTAMP,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Voice Documentation
-- =====================================================

-- Voice Notes
CREATE TABLE voice_notes (
    id VARCHAR PRIMARY KEY,
    organization_id INTEGER NOT NULL,
    patient_id VARCHAR NOT NULL,
    patient_name TEXT NOT NULL,
    provider_id VARCHAR NOT NULL,
    provider_name TEXT NOT NULL,
    type VARCHAR(50) NOT NULL, -- consultation, procedure_note, clinical_note
    status VARCHAR(20) NOT NULL DEFAULT 'completed',
    recording_duration INTEGER, -- in seconds
    transcript TEXT,
    confidence REAL,
    medical_terms JSONB DEFAULT '[]',
    structured_data JSONB DEFAULT '{}',
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Clinical Analysis
-- =====================================================

-- Muscle Positions (Facial Analysis)
CREATE TABLE muscles_position (
    id SERIAL PRIMARY KEY,
    organization_id INTEGER NOT NULL,
    patient_id INTEGER NOT NULL,
    consultation_id INTEGER,
    position INTEGER NOT NULL, -- 1-15
    value TEXT NOT NULL,
    coordinates JSONB,
    is_detected BOOLEAN NOT NULL DEFAULT false,
    detected_at TIMESTAMP,
    notes TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Chatbot & AI Assistant
-- =====================================================

-- Chatbot Configs
CREATE TABLE chatbot_configs (
    id SERIAL PRIMARY KEY,
    organization_id INTEGER NOT NULL,
    name TEXT NOT NULL DEFAULT 'Healthcare Assistant',
    description TEXT DEFAULT 'AI-powered healthcare assistant',
    is_active BOOLEAN NOT NULL DEFAULT true,
    primary_color TEXT DEFAULT '#4A7DFF',
    welcome_message TEXT DEFAULT 'Hello! I can help with appointments and prescriptions.',
    appointment_booking_enabled BOOLEAN NOT NULL DEFAULT true,
    prescription_requests_enabled BOOLEAN NOT NULL DEFAULT true,
    api_key TEXT NOT NULL,
    embed_code TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Chatbot Sessions
CREATE TABLE chatbot_sessions (
    id SERIAL PRIMARY KEY,
    organization_id INTEGER NOT NULL,
    config_id INTEGER NOT NULL,
    session_id TEXT NOT NULL UNIQUE,
    visitor_id TEXT,
    patient_id INTEGER,
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    current_intent TEXT,
    extracted_patient_name TEXT,
    extracted_phone TEXT,
    extracted_email TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Chatbot Messages
CREATE TABLE chatbot_messages (
    id SERIAL PRIMARY KEY,
    organization_id INTEGER NOT NULL,
    session_id INTEGER NOT NULL,
    message_id TEXT NOT NULL UNIQUE,
    sender VARCHAR(10) NOT NULL,
    message_type VARCHAR(20) NOT NULL DEFAULT 'text',
    content TEXT NOT NULL,
    intent TEXT,
    confidence REAL,
    ai_processed BOOLEAN NOT NULL DEFAULT false,
    is_read BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Chatbot Analytics
CREATE TABLE chatbot_analytics (
    id SERIAL PRIMARY KEY,
    organization_id INTEGER NOT NULL,
    config_id INTEGER NOT NULL,
    date TIMESTAMP NOT NULL,
    total_sessions INTEGER DEFAULT 0,
    completed_sessions INTEGER DEFAULT 0,
    total_messages INTEGER DEFAULT 0,
    appointments_booked INTEGER DEFAULT 0,
    prescription_requests INTEGER DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- QuickBooks Integration
-- =====================================================

-- QuickBooks Connections
CREATE TABLE quickbooks_connections (
    id SERIAL PRIMARY KEY,
    organization_id INTEGER NOT NULL UNIQUE,
    realm_id TEXT NOT NULL,
    access_token TEXT NOT NULL,
    refresh_token TEXT NOT NULL,
    token_expires_at TIMESTAMP NOT NULL,
    refresh_token_expires_at TIMESTAMP NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    last_sync_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- QuickBooks Sync Logs
CREATE TABLE quickbooks_sync_logs (
    id SERIAL PRIMARY KEY,
    organization_id INTEGER NOT NULL,
    sync_type VARCHAR(50) NOT NULL, -- customer, invoice, payment, item
    direction VARCHAR(20) NOT NULL, -- to_quickbooks, from_quickbooks
    status VARCHAR(20) NOT NULL DEFAULT 'pending', -- pending, success, failed
    entity_type VARCHAR(50) NOT NULL,
    entity_id INTEGER,
    quickbooks_id TEXT,
    error_message TEXT,
    request_payload JSONB,
    response_payload JSONB,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- QuickBooks Customer Mappings
CREATE TABLE quickbooks_customer_mappings (
    id SERIAL PRIMARY KEY,
    organization_id INTEGER NOT NULL,
    patient_id INTEGER NOT NULL UNIQUE,
    quickbooks_customer_id TEXT NOT NULL,
    sync_status VARCHAR(20) NOT NULL DEFAULT 'synced', -- synced, pending, error
    last_synced_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- QuickBooks Invoice Mappings
CREATE TABLE quickbooks_invoice_mappings (
    id SERIAL PRIMARY KEY,
    organization_id INTEGER NOT NULL,
    local_invoice_id INTEGER NOT NULL UNIQUE,
    quickbooks_invoice_id TEXT NOT NULL,
    quickbooks_invoice_number TEXT,
    sync_status VARCHAR(20) NOT NULL DEFAULT 'synced',
    last_synced_at TIMESTAMP,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- QuickBooks Payment Mappings
CREATE TABLE quickbooks_payment_mappings (
    id SERIAL PRIMARY KEY,
    organization_id INTEGER NOT NULL,
    local_payment_id INTEGER NOT NULL UNIQUE,
    quickbooks_payment_id TEXT NOT NULL,
    sync_status VARCHAR(20) NOT NULL DEFAULT 'synced',
    last_synced_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- QuickBooks Account Mappings
CREATE TABLE quickbooks_account_mappings (
    id SERIAL PRIMARY KEY,
    organization_id INTEGER NOT NULL,
    account_type VARCHAR(50) NOT NULL, -- revenue, ar, deposit
    local_account_name VARCHAR(100),
    quickbooks_account_id TEXT NOT NULL,
    quickbooks_account_name TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- QuickBooks Item Mappings
CREATE TABLE quickbooks_item_mappings (
    id SERIAL PRIMARY KEY,
    organization_id INTEGER NOT NULL,
    service_code VARCHAR(50) NOT NULL,
    service_description TEXT,
    quickbooks_item_id TEXT NOT NULL,
    quickbooks_item_name TEXT NOT NULL,
    unit_price DECIMAL(10, 2),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- QuickBooks Sync Configs
CREATE TABLE quickbooks_sync_configs (
    id SERIAL PRIMARY KEY,
    organization_id INTEGER NOT NULL UNIQUE,
    auto_sync_enabled BOOLEAN NOT NULL DEFAULT false,
    sync_customers BOOLEAN NOT NULL DEFAULT true,
    sync_invoices BOOLEAN NOT NULL DEFAULT true,
    sync_payments BOOLEAN NOT NULL DEFAULT true,
    default_payment_method VARCHAR(50) DEFAULT 'Cash',
    default_terms VARCHAR(50) DEFAULT 'Due on Receipt',
    invoice_prefix VARCHAR(20),
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- =====================================================
-- Indexes for Performance Optimization
-- =====================================================

-- Organization & User Indexes
CREATE INDEX idx_users_organization_id ON users(organization_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_patients_organization_id ON patients(organization_id);
CREATE INDEX idx_patients_patient_id ON patients(patient_id);

-- Appointment & Medical Record Indexes
CREATE INDEX idx_appointments_organization_id ON appointments(organization_id);
CREATE INDEX idx_appointments_patient_id ON appointments(patient_id);
CREATE INDEX idx_appointments_provider_id ON appointments(provider_id);
CREATE INDEX idx_appointments_scheduled_at ON appointments(scheduled_at);
CREATE INDEX idx_medical_records_organization_id ON medical_records(organization_id);
CREATE INDEX idx_medical_records_patient_id ON medical_records(patient_id);

-- Financial Indexes
CREATE INDEX idx_invoices_organization_id ON invoices(organization_id);
CREATE INDEX idx_invoices_patient_id ON invoices(patient_id);
CREATE INDEX idx_payments_organization_id ON payments(organization_id);
CREATE INDEX idx_payments_invoice_id ON payments(invoice_id);

-- Inventory Indexes
CREATE INDEX idx_inventory_items_organization_id ON inventory_items(organization_id);
CREATE INDEX idx_inventory_items_category_id ON inventory_items(category_id);
CREATE INDEX idx_inventory_sales_organization_id ON inventory_sales(organization_id);
CREATE INDEX idx_inventory_batches_item_id ON inventory_batches(item_id);

-- Messaging Indexes
CREATE INDEX idx_messages_organization_id ON messages(organization_id);
CREATE INDEX idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX idx_conversations_organization_id ON conversations(organization_id);

-- GDPR Indexes
CREATE INDEX idx_gdpr_audit_trail_organization_id ON gdpr_audit_trail(organization_id);
CREATE INDEX idx_gdpr_audit_trail_patient_id ON gdpr_audit_trail(patient_id);
CREATE INDEX idx_gdpr_audit_trail_timestamp ON gdpr_audit_trail(timestamp);

-- =====================================================
-- Foreign Key Constraints (Optional - Add as needed)
-- =====================================================

-- Note: Foreign key constraints can be added based on specific requirements
-- Example:
-- ALTER TABLE users ADD CONSTRAINT fk_users_organization 
--   FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;
-- 
-- ALTER TABLE patients ADD CONSTRAINT fk_patients_organization 
--   FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;

-- =====================================================
-- END OF SCHEMA
-- =====================================================
