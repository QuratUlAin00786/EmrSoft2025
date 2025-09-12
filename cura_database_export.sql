-- CURA APPLICATION DATABASE EXPORT
-- Generated on: 2025-09-12
-- Database: PostgreSQL Development Database
-- Total Tables: 30
-- No Views Found

-- =====================================================
-- SECURITY NOTE:
-- This export was generated from the development database
-- using secure built-in tools, not external credentials.
-- Sensitive data like passwords have been excluded.
-- =====================================================

-- TABLE STRUCTURE AND METADATA
-- =====================================================

-- ORGANIZATIONS TABLE
-- Total Records: 2
CREATE TABLE organizations (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    subdomain VARCHAR(50) NOT NULL UNIQUE,
    region VARCHAR(10) NOT NULL DEFAULT 'UK',
    brand_name TEXT NOT NULL,
    settings JSONB DEFAULT '{}',
    features JSONB DEFAULT '{}',
    access_level VARCHAR(50) DEFAULT 'full',
    subscription_status VARCHAR(20) NOT NULL DEFAULT 'trial',
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);

-- Sample Data:
-- id=0, name='System', subdomain='system', region='UK', brand_name='System', subscription_status='active'
-- id=2, name='Demo Healthcare Clinic', subdomain='demo', region='UK', brand_name='ebc', subscription_status='active'

-- USERS TABLE  
-- Total Records: 13
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    organization_id INTEGER NOT NULL REFERENCES organizations(id),
    email TEXT NOT NULL,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'doctor',
    department TEXT,
    medical_specialty_category TEXT,
    sub_specialty TEXT,
    working_days JSONB DEFAULT '[]',
    working_hours JSONB DEFAULT '{}',
    permissions JSONB,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    is_saas_owner BOOLEAN DEFAULT FALSE,
    last_login_at TIMESTAMP WITHOUT TIME ZONE,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW()
);

-- Sample Data:
-- id=2, organization_id=2, email='admin@cura.com', first_name='Admin', last_name='User', role='admin'
-- id=41, organization_id=2, email='doctor@cura.com', first_name='Dr. John', last_name='Smith', role='doctor', medical_specialty_category='Cardiology', sub_specialty='Interventional Cardiology'
-- id=42, organization_id=2, email='patient@cura.com', first_name='Mary', last_name='Johnson', role='patient'
-- id=43, organization_id=2, email='nurse@cura.com', first_name='Sarah', last_name='Williams', role='nurse'

-- PATIENTS TABLE
-- Total Records: 4
CREATE TABLE patients (
    id SERIAL PRIMARY KEY,
    organization_id INTEGER NOT NULL,
    patient_id VARCHAR(50) NOT NULL,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    date_of_birth DATE,
    email TEXT,
    phone VARCHAR(20),
    nhs_number VARCHAR(50),
    address JSONB,
    insurance_info JSONB,
    emergency_contact JSONB,
    medical_history JSONB DEFAULT '{}',
    risk_level VARCHAR(20) DEFAULT 'low',
    flags JSONB,
    communication_preferences JSONB,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);

-- Sample Data:
-- id=6, patient_id='P000006', first_name='Maryam', last_name=' Khan', email='patel@averoxemr.com', phone='+923173335411', nhs_number='989 877 767'
-- id=8, patient_id='P000004', first_name='Qurat', last_name='Ul Ain', email='patel@averoxemr.com', phone='+923173335411', nhs_number='989 877 767'

-- APPOINTMENTS TABLE
-- Total Records: 8
CREATE TABLE appointments (
    id SERIAL PRIMARY KEY,
    organization_id INTEGER NOT NULL,
    patient_id INTEGER NOT NULL,
    provider_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    scheduled_at TIMESTAMP WITHOUT TIME ZONE NOT NULL,
    duration INTEGER NOT NULL DEFAULT 30,
    status VARCHAR(20) NOT NULL DEFAULT 'scheduled',
    type VARCHAR(20) NOT NULL DEFAULT 'consultation',
    location TEXT,
    is_virtual BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW()
);

-- LAB_RESULTS TABLE
-- Total Records: 10
CREATE TABLE lab_results (
    id SERIAL PRIMARY KEY,
    organization_id INTEGER NOT NULL REFERENCES organizations(id),
    patient_id INTEGER NOT NULL REFERENCES patients(id),
    test_id VARCHAR(50) NOT NULL,
    test_type TEXT NOT NULL,
    ordered_by INTEGER NOT NULL REFERENCES users(id),
    ordered_at TIMESTAMP WITHOUT TIME ZONE NOT NULL,
    collected_at TIMESTAMP WITHOUT TIME ZONE,
    completed_at TIMESTAMP WITHOUT TIME ZONE,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    priority VARCHAR(10) NOT NULL DEFAULT 'routine',
    results JSONB DEFAULT '{}',
    notes TEXT,
    critical_values BOOLEAN NOT NULL DEFAULT FALSE,
    doctor_name TEXT,
    main_specialty TEXT,
    sub_specialty TEXT,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- MEDICAL_RECORDS TABLE
-- Total Records: 70
CREATE TABLE medical_records (
    id SERIAL PRIMARY KEY,
    organization_id INTEGER NOT NULL,
    patient_id INTEGER NOT NULL,
    provider_id INTEGER NOT NULL,
    type VARCHAR(50) NOT NULL DEFAULT 'consultation',
    title TEXT NOT NULL,
    description TEXT,
    diagnosis TEXT,
    treatment JSONB DEFAULT '{}',
    medications JSONB DEFAULT '[]',
    vitals JSONB DEFAULT '{}',
    notes TEXT,
    attachments JSONB DEFAULT '[]',
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    record_date TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);

-- PRESCRIPTIONS TABLE
-- Total Records: 3
CREATE TABLE prescriptions (
    id SERIAL PRIMARY KEY,
    organization_id INTEGER NOT NULL,
    patient_id INTEGER NOT NULL,
    prescriber_id INTEGER NOT NULL,
    medication_name TEXT NOT NULL,
    dosage TEXT NOT NULL,
    frequency TEXT NOT NULL,
    duration TEXT NOT NULL,
    instructions TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    prescribed_date TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
    start_date DATE,
    end_date DATE,
    refills_remaining INTEGER DEFAULT 0,
    pharmacy_info JSONB,
    notes TEXT,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);

-- NOTIFICATIONS TABLE
-- Total Records: 1,363
CREATE TABLE notifications (
    id SERIAL PRIMARY KEY,
    organization_id INTEGER NOT NULL REFERENCES organizations(id),
    user_id INTEGER NOT NULL REFERENCES users(id),
    type VARCHAR(50) NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    data JSONB DEFAULT '{}',
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    priority VARCHAR(10) NOT NULL DEFAULT 'normal',
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
    read_at TIMESTAMP WITHOUT TIME ZONE
);

-- ROLES TABLE
-- Total Records: 3
CREATE TABLE roles (
    id SERIAL PRIMARY KEY,
    organization_id INTEGER NOT NULL REFERENCES organizations(id),
    name TEXT NOT NULL,
    display_name TEXT NOT NULL,
    description TEXT NOT NULL,
    permissions JSONB NOT NULL DEFAULT '{}',
    is_system BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);

-- INVENTORY_ITEMS TABLE
-- Total Records: 10
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
    reorder_level INTEGER NOT NULL DEFAULT 10,
    current_stock INTEGER NOT NULL DEFAULT 0,
    reserved_stock INTEGER NOT NULL DEFAULT 0,
    unit_price NUMERIC,
    selling_price NUMERIC,
    tax_rate NUMERIC NOT NULL DEFAULT 0.00,
    is_prescription_required BOOLEAN NOT NULL DEFAULT FALSE,
    is_controlled_substance BOOLEAN NOT NULL DEFAULT FALSE,
    storage_requirements TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
    purchase_price NUMERIC NOT NULL DEFAULT 0.00,
    sale_price NUMERIC NOT NULL DEFAULT 0.00,
    minimum_stock INTEGER NOT NULL DEFAULT 10,
    maximum_stock INTEGER NOT NULL DEFAULT 1000,
    reorder_point INTEGER NOT NULL DEFAULT 20,
    mrp NUMERIC,
    prescription_required BOOLEAN NOT NULL DEFAULT FALSE,
    pack_size INTEGER NOT NULL DEFAULT 1,
    expiry_tracking BOOLEAN NOT NULL DEFAULT FALSE,
    batch_tracking BOOLEAN NOT NULL DEFAULT FALSE,
    storage_conditions TEXT,
    side_effects TEXT,
    contraindications TEXT,
    dosage_instructions TEXT,
    is_discontinued BOOLEAN NOT NULL DEFAULT FALSE
);

-- AI_INSIGHTS TABLE
CREATE TABLE ai_insights (
    id SERIAL PRIMARY KEY,
    organization_id INTEGER NOT NULL,
    patient_id INTEGER,
    type VARCHAR(30) NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    severity VARCHAR(10) NOT NULL DEFAULT 'medium',
    action_required BOOLEAN NOT NULL DEFAULT FALSE,
    confidence VARCHAR(10),
    metadata JSONB DEFAULT '{}',
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW()
);

-- CHATBOT_CONFIGS TABLE
CREATE TABLE chatbot_configs (
    id SERIAL PRIMARY KEY,
    organization_id INTEGER NOT NULL REFERENCES organizations(id),
    name TEXT NOT NULL DEFAULT 'Healthcare Assistant',
    description TEXT DEFAULT 'AI-powered healthcare assistant',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    primary_color TEXT DEFAULT '#4A7DFF',
    welcome_message TEXT DEFAULT 'Hello! I can help with appointments and prescriptions.',
    appointment_booking_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    prescription_requests_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    api_key TEXT NOT NULL,
    embed_code TEXT,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW()
);

-- CHATBOT_SESSIONS TABLE
CREATE TABLE chatbot_sessions (
    id SERIAL PRIMARY KEY,
    organization_id INTEGER NOT NULL REFERENCES organizations(id),
    config_id INTEGER NOT NULL REFERENCES chatbot_configs(id),
    session_id TEXT NOT NULL UNIQUE,
    visitor_id TEXT,
    patient_id INTEGER,
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    current_intent TEXT,
    extracted_patient_name TEXT,
    extracted_phone TEXT,
    extracted_email TEXT,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW()
);

-- CHATBOT_MESSAGES TABLE
CREATE TABLE chatbot_messages (
    id SERIAL PRIMARY KEY,
    organization_id INTEGER NOT NULL REFERENCES organizations(id),
    session_id INTEGER NOT NULL REFERENCES chatbot_sessions(id),
    message_id TEXT NOT NULL UNIQUE,
    sender VARCHAR(10) NOT NULL,
    message_type VARCHAR(20) NOT NULL DEFAULT 'text',
    content TEXT NOT NULL,
    intent TEXT,
    confidence REAL,
    ai_processed BOOLEAN NOT NULL DEFAULT FALSE,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW()
);

-- CHATBOT_ANALYTICS TABLE
CREATE TABLE chatbot_analytics (
    id SERIAL PRIMARY KEY,
    organization_id INTEGER NOT NULL,
    config_id INTEGER NOT NULL,
    date TIMESTAMP WITHOUT TIME ZONE NOT NULL,
    metrics JSONB DEFAULT '{}',
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW()
);

-- CONSULTATIONS TABLE
CREATE TABLE consultations (
    id SERIAL PRIMARY KEY,
    organization_id INTEGER NOT NULL,
    appointment_id INTEGER,
    patient_id INTEGER NOT NULL,
    provider_id INTEGER NOT NULL,
    consultation_type VARCHAR(20) NOT NULL,
    chief_complaint TEXT,
    history_of_present_illness TEXT,
    vitals JSONB DEFAULT '{}',
    physical_exam TEXT,
    assessment TEXT,
    diagnosis TEXT[],
    treatment_plan TEXT,
    prescriptions TEXT[],
    follow_up_instructions TEXT,
    consultation_notes TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'in_progress',
    start_time TIMESTAMP WITHOUT TIME ZONE NOT NULL,
    end_time TIMESTAMP WITHOUT TIME ZONE,
    duration INTEGER,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW()
);

-- CONVERSATIONS TABLE
CREATE TABLE conversations (
    id VARCHAR(50) PRIMARY KEY,
    organization_id INTEGER NOT NULL,
    participants JSONB NOT NULL,
    last_message JSONB,
    unread_count INTEGER NOT NULL DEFAULT 0,
    is_patient_conversation BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);

-- DOCUMENTS TABLE
CREATE TABLE documents (
    id SERIAL PRIMARY KEY,
    organization_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    type VARCHAR(50) NOT NULL DEFAULT 'medical_form',
    content TEXT NOT NULL,
    metadata JSONB DEFAULT '{}',
    is_template BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- MEDICAL_IMAGES TABLE
CREATE TABLE medical_images (
    id SERIAL PRIMARY KEY,
    organization_id INTEGER NOT NULL REFERENCES organizations(id),
    patient_id INTEGER NOT NULL REFERENCES patients(id),
    uploaded_by INTEGER NOT NULL REFERENCES users(id),
    study_type TEXT NOT NULL,
    modality VARCHAR(50) NOT NULL,
    body_part TEXT,
    indication TEXT,
    priority VARCHAR(20) NOT NULL DEFAULT 'routine',
    file_name TEXT NOT NULL,
    file_size INTEGER NOT NULL
);

-- MESSAGES TABLE
CREATE TABLE messages (
    id SERIAL PRIMARY KEY,
    conversation_id VARCHAR(50) NOT NULL,
    sender_id INTEGER NOT NULL,
    content TEXT NOT NULL,
    message_type VARCHAR(20) NOT NULL DEFAULT 'text',
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW()
);

-- STAFF_SHIFTS TABLE
CREATE TABLE staff_shifts (
    id SERIAL PRIMARY KEY,
    organization_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    shift_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'scheduled',
    notes TEXT,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);

-- SUBSCRIPTIONS TABLE
CREATE TABLE subscriptions (
    id SERIAL PRIMARY KEY,
    organization_id INTEGER NOT NULL,
    plan_type VARCHAR(50) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    current_period_start TIMESTAMP WITHOUT TIME ZONE NOT NULL,
    current_period_end TIMESTAMP WITHOUT TIME ZONE NOT NULL,
    trial_end TIMESTAMP WITHOUT TIME ZONE,
    stripe_subscription_id VARCHAR(100),
    stripe_customer_id VARCHAR(100),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);

-- VOICE_NOTES TABLE
CREATE TABLE voice_notes (
    id SERIAL PRIMARY KEY,
    organization_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    patient_id INTEGER,
    file_path TEXT NOT NULL,
    original_filename TEXT NOT NULL,
    file_size INTEGER NOT NULL,
    duration INTEGER,
    transcription TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'uploaded',
    ai_summary TEXT,
    structured_data JSONB DEFAULT '{}',
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);

-- INVENTORY RELATED TABLES
CREATE TABLE inventory_categories (
    id SERIAL PRIMARY KEY,
    organization_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    parent_category_id INTEGER,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);

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
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);

CREATE TABLE inventory_batches (
    id SERIAL PRIMARY KEY,
    organization_id INTEGER NOT NULL,
    item_id INTEGER NOT NULL,
    batch_number VARCHAR(100) NOT NULL,
    quantity INTEGER NOT NULL,
    remaining_quantity INTEGER NOT NULL,
    expiry_date TIMESTAMP WITHOUT TIME ZONE,
    received_date TIMESTAMP WITHOUT TIME ZONE NOT NULL,
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE inventory_purchase_orders (
    id SERIAL PRIMARY KEY,
    organization_id INTEGER NOT NULL,
    supplier_id INTEGER NOT NULL,
    po_number VARCHAR(100) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    order_date TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
    expected_delivery_date TIMESTAMP WITHOUT TIME ZONE,
    delivery_date TIMESTAMP WITHOUT TIME ZONE,
    total_amount NUMERIC NOT NULL DEFAULT 0.00,
    tax_amount NUMERIC NOT NULL DEFAULT 0.00,
    discount_amount NUMERIC NOT NULL DEFAULT 0.00,
    final_amount NUMERIC NOT NULL DEFAULT 0.00,
    notes TEXT,
    email_sent BOOLEAN NOT NULL DEFAULT FALSE,
    email_sent_at TIMESTAMP WITHOUT TIME ZONE,
    created_by INTEGER NOT NULL DEFAULT 1,
    approved_by INTEGER,
    approved_at TIMESTAMP WITHOUT TIME ZONE,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE inventory_purchase_order_items (
    id SERIAL PRIMARY KEY,
    organization_id INTEGER NOT NULL,
    purchase_order_id INTEGER NOT NULL,
    item_id INTEGER NOT NULL,
    quantity INTEGER NOT NULL,
    unit_price NUMERIC NOT NULL,
    total_price NUMERIC NOT NULL,
    received_quantity INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE inventory_stock_movements (
    id SERIAL PRIMARY KEY,
    organization_id INTEGER NOT NULL,
    item_id INTEGER NOT NULL,
    movement_type VARCHAR(20) NOT NULL,
    quantity INTEGER NOT NULL,
    previous_stock INTEGER NOT NULL,
    new_stock INTEGER NOT NULL,
    unit_cost NUMERIC,
    reference_type VARCHAR(50),
    reference_id INTEGER,
    notes TEXT,
    created_by INTEGER,
    batch_id INTEGER,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE inventory_stock_alerts (
    id SERIAL PRIMARY KEY,
    organization_id INTEGER NOT NULL,
    item_id INTEGER NOT NULL,
    alert_type VARCHAR(20) NOT NULL,
    threshold_value INTEGER NOT NULL,
    current_value INTEGER NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    message TEXT,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    is_resolved BOOLEAN NOT NULL DEFAULT FALSE,
    resolved_by INTEGER,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
    resolved_at TIMESTAMP WITHOUT TIME ZONE
);

-- =====================================================
-- CONSTRAINTS AND RELATIONSHIPS
-- =====================================================

-- PRIMARY KEYS
-- All tables have SERIAL PRIMARY KEY on 'id' column

-- FOREIGN KEYS
-- users.organization_id -> organizations.id
-- lab_results.organization_id -> organizations.id
-- lab_results.patient_id -> patients.id
-- lab_results.ordered_by -> users.id
-- medical_images.organization_id -> organizations.id
-- medical_images.patient_id -> patients.id
-- medical_images.uploaded_by -> users.id
-- notifications.organization_id -> organizations.id
-- notifications.user_id -> users.id
-- roles.organization_id -> organizations.id
-- chatbot_configs.organization_id -> organizations.id
-- chatbot_sessions.organization_id -> organizations.id
-- chatbot_sessions.config_id -> chatbot_configs.id
-- chatbot_messages.organization_id -> organizations.id
-- chatbot_messages.session_id -> chatbot_sessions.id

-- UNIQUE CONSTRAINTS
-- organizations.subdomain
-- users.username
-- chatbot_sessions.session_id
-- chatbot_messages.message_id

-- =====================================================
-- SUMMARY STATISTICS
-- =====================================================
-- Total Tables: 30
-- Total Views: 0
-- Organization Records: 2
-- User Records: 13
-- Patient Records: 4
-- Appointment Records: 8
-- Lab Result Records: 10
-- Medical Record Records: 70
-- Prescription Records: 3
-- Notification Records: 1,363
-- Inventory Item Records: 10
-- Role Records: 3

-- =====================================================
-- MEDICAL SPECIALTIES DATA STRUCTURE
-- (Used in the application for doctor filtering)
-- =====================================================
/*
Medical Specialties Structure:
- General & Primary Care
- Surgical Specialties (General, Orthopedic, Neurosurgeon, Cardiothoracic, Plastic, ENT, Urologist)
- Heart & Circulation (Cardiologist, Vascular Surgeon)
- Women's Health (Gynecologist, Obstetrician, Fertility Specialist)
- Children's Health (Pediatrician, Pediatric Surgeon, Neonatologist)
- Brain & Nervous System (Neurologist, Psychiatrist, Psychologist)
- Skin, Hair & Appearance (Dermatologist, Cosmetologist, Aesthetic Surgeon)
- Eye & Vision (Ophthalmologist, Optometrist)
- Teeth & Mouth (Dentist, Orthodontist, Oral Surgeon, Periodontist, Endodontist)
- Digestive System (Gastroenterologist, Hepatologist, Colorectal Surgeon)
- Kidneys & Urinary Tract (Nephrologist, Urologist)
- Respiratory System (Pulmonologist, Thoracic Surgeon)
- Cancer (Oncologist, Radiation Oncologist, Surgical Oncologist)
- Endocrine & Hormones (Endocrinologist)
- Muscles & Joints (Rheumatologist, Sports Medicine Specialist)
- Blood & Immunity (Hematologist, Immunologist/Allergist)
- Others (Geriatrician, Pathologist, Radiologist, Anesthesiologist, Emergency Medicine, Occupational Medicine)
*/

-- =====================================================
-- END OF DATABASE EXPORT
-- =====================================================