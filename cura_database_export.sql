--
-- PostgreSQL database dump
--

-- Dumped from database version 16.9 (63f4182)
-- Dumped by pg_dump version 16.9

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

DROP DATABASE IF EXISTS neondb;
--
-- Name: neondb; Type: DATABASE; Schema: -; Owner: neondb_owner
--

CREATE DATABASE neondb WITH TEMPLATE = template0 ENCODING = 'UTF8' LOCALE_PROVIDER = libc LOCALE = 'C.UTF-8';


ALTER DATABASE neondb OWNER TO neondb_owner;

\connect neondb

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: ai_insights; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.ai_insights (
    id integer NOT NULL,
    organization_id integer NOT NULL,
    patient_id integer,
    type character varying(30) NOT NULL,
    title text NOT NULL,
    description text NOT NULL,
    severity character varying(10) DEFAULT 'medium'::character varying NOT NULL,
    action_required boolean DEFAULT false NOT NULL,
    confidence character varying(10),
    metadata jsonb DEFAULT '{}'::jsonb,
    status character varying(20) DEFAULT 'active'::character varying NOT NULL,
    ai_status character varying(20) DEFAULT 'pending'::character varying,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.ai_insights OWNER TO neondb_owner;

--
-- Name: ai_insights_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.ai_insights_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.ai_insights_id_seq OWNER TO neondb_owner;

--
-- Name: ai_insights_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.ai_insights_id_seq OWNED BY public.ai_insights.id;


--
-- Name: appointments; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.appointments (
    id integer NOT NULL,
    organization_id integer NOT NULL,
    patient_id integer NOT NULL,
    provider_id integer NOT NULL,
    title text NOT NULL,
    description text,
    scheduled_at timestamp without time zone NOT NULL,
    duration integer DEFAULT 30 NOT NULL,
    status character varying(20) DEFAULT 'scheduled'::character varying NOT NULL,
    type character varying(20) DEFAULT 'consultation'::character varying NOT NULL,
    location text,
    is_virtual boolean DEFAULT false NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    assigned_role character varying(50),
    created_by integer
);


ALTER TABLE public.appointments OWNER TO neondb_owner;

--
-- Name: appointments_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.appointments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.appointments_id_seq OWNER TO neondb_owner;

--
-- Name: appointments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.appointments_id_seq OWNED BY public.appointments.id;


--
-- Name: chatbot_analytics; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.chatbot_analytics (
    id integer NOT NULL,
    organization_id integer NOT NULL,
    config_id integer NOT NULL,
    date timestamp without time zone NOT NULL,
    total_sessions integer DEFAULT 0,
    completed_sessions integer DEFAULT 0,
    total_messages integer DEFAULT 0,
    appointments_booked integer DEFAULT 0,
    prescription_requests integer DEFAULT 0,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.chatbot_analytics OWNER TO neondb_owner;

--
-- Name: chatbot_analytics_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.chatbot_analytics_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.chatbot_analytics_id_seq OWNER TO neondb_owner;

--
-- Name: chatbot_analytics_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.chatbot_analytics_id_seq OWNED BY public.chatbot_analytics.id;


--
-- Name: chatbot_configs; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.chatbot_configs (
    id integer NOT NULL,
    organization_id integer NOT NULL,
    name text DEFAULT 'Healthcare Assistant'::text NOT NULL,
    description text DEFAULT 'AI-powered healthcare assistant'::text,
    is_active boolean DEFAULT true NOT NULL,
    primary_color text DEFAULT '#4A7DFF'::text,
    welcome_message text DEFAULT 'Hello! I can help with appointments and prescriptions.'::text,
    appointment_booking_enabled boolean DEFAULT true NOT NULL,
    prescription_requests_enabled boolean DEFAULT true NOT NULL,
    api_key text NOT NULL,
    embed_code text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.chatbot_configs OWNER TO neondb_owner;

--
-- Name: chatbot_configs_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.chatbot_configs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.chatbot_configs_id_seq OWNER TO neondb_owner;

--
-- Name: chatbot_configs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.chatbot_configs_id_seq OWNED BY public.chatbot_configs.id;


--
-- Name: chatbot_messages; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.chatbot_messages (
    id integer NOT NULL,
    organization_id integer NOT NULL,
    session_id integer NOT NULL,
    message_id text NOT NULL,
    sender character varying(10) NOT NULL,
    message_type character varying(20) DEFAULT 'text'::character varying NOT NULL,
    content text NOT NULL,
    intent text,
    confidence real,
    ai_processed boolean DEFAULT false NOT NULL,
    is_read boolean DEFAULT false NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.chatbot_messages OWNER TO neondb_owner;

--
-- Name: chatbot_messages_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.chatbot_messages_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.chatbot_messages_id_seq OWNER TO neondb_owner;

--
-- Name: chatbot_messages_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.chatbot_messages_id_seq OWNED BY public.chatbot_messages.id;


--
-- Name: chatbot_sessions; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.chatbot_sessions (
    id integer NOT NULL,
    organization_id integer NOT NULL,
    config_id integer NOT NULL,
    session_id text NOT NULL,
    visitor_id text,
    patient_id integer,
    status character varying(20) DEFAULT 'active'::character varying NOT NULL,
    current_intent text,
    extracted_patient_name text,
    extracted_phone text,
    extracted_email text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.chatbot_sessions OWNER TO neondb_owner;

--
-- Name: chatbot_sessions_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.chatbot_sessions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.chatbot_sessions_id_seq OWNER TO neondb_owner;

--
-- Name: chatbot_sessions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.chatbot_sessions_id_seq OWNED BY public.chatbot_sessions.id;


--
-- Name: claims; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.claims (
    id integer NOT NULL,
    organization_id integer NOT NULL,
    patient_id integer NOT NULL,
    claim_number character varying(50) NOT NULL,
    service_date timestamp without time zone NOT NULL,
    submission_date timestamp without time zone NOT NULL,
    amount numeric(10,2) NOT NULL,
    status character varying(20) DEFAULT 'pending'::character varying NOT NULL,
    payment_amount numeric(10,2),
    payment_date timestamp without time zone,
    denial_reason text,
    insurance_provider text NOT NULL,
    procedures jsonb DEFAULT '[]'::jsonb,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.claims OWNER TO neondb_owner;

--
-- Name: claims_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.claims_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.claims_id_seq OWNER TO neondb_owner;

--
-- Name: claims_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.claims_id_seq OWNED BY public.claims.id;


--
-- Name: clinical_photos; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.clinical_photos (
    id integer NOT NULL,
    organization_id integer NOT NULL,
    patient_id integer NOT NULL,
    captured_by integer NOT NULL,
    type character varying(50) NOT NULL,
    description text NOT NULL,
    file_name text NOT NULL,
    file_path text NOT NULL,
    file_size integer NOT NULL,
    mime_type character varying(100) DEFAULT 'image/png'::character varying NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb,
    ai_analysis jsonb,
    status character varying(20) DEFAULT 'active'::character varying NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.clinical_photos OWNER TO neondb_owner;

--
-- Name: clinical_photos_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.clinical_photos_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.clinical_photos_id_seq OWNER TO neondb_owner;

--
-- Name: clinical_photos_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.clinical_photos_id_seq OWNED BY public.clinical_photos.id;


--
-- Name: clinical_procedures; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.clinical_procedures (
    id integer NOT NULL,
    organization_id integer NOT NULL,
    name text NOT NULL,
    category character varying(50) NOT NULL,
    duration text NOT NULL,
    complexity character varying(20) NOT NULL,
    prerequisites jsonb DEFAULT '[]'::jsonb,
    steps jsonb DEFAULT '[]'::jsonb,
    complications jsonb DEFAULT '[]'::jsonb,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.clinical_procedures OWNER TO neondb_owner;

--
-- Name: clinical_procedures_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.clinical_procedures_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.clinical_procedures_id_seq OWNER TO neondb_owner;

--
-- Name: clinical_procedures_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.clinical_procedures_id_seq OWNED BY public.clinical_procedures.id;


--
-- Name: consultations; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.consultations (
    id integer NOT NULL,
    organization_id integer NOT NULL,
    appointment_id integer,
    patient_id integer NOT NULL,
    provider_id integer NOT NULL,
    consultation_type character varying(20) NOT NULL,
    chief_complaint text,
    history_of_present_illness text,
    vitals jsonb DEFAULT '{}'::jsonb,
    physical_exam text,
    assessment text,
    diagnosis text[],
    treatment_plan text,
    prescriptions text[],
    follow_up_instructions text,
    consultation_notes text,
    status character varying(20) DEFAULT 'in_progress'::character varying NOT NULL,
    start_time timestamp without time zone NOT NULL,
    end_time timestamp without time zone,
    duration integer,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.consultations OWNER TO neondb_owner;

--
-- Name: consultations_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.consultations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.consultations_id_seq OWNER TO neondb_owner;

--
-- Name: consultations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.consultations_id_seq OWNED BY public.consultations.id;


--
-- Name: conversations; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.conversations (
    id character varying(50) NOT NULL,
    organization_id integer NOT NULL,
    participants jsonb NOT NULL,
    last_message jsonb,
    unread_count integer DEFAULT 0 NOT NULL,
    is_patient_conversation boolean DEFAULT false NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.conversations OWNER TO neondb_owner;

--
-- Name: documents; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.documents (
    id integer NOT NULL,
    organization_id integer NOT NULL,
    user_id integer NOT NULL,
    name text NOT NULL,
    type character varying(50) DEFAULT 'medical_form'::character varying NOT NULL,
    content text NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb,
    is_template boolean DEFAULT false NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.documents OWNER TO neondb_owner;

--
-- Name: documents_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.documents_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.documents_id_seq OWNER TO neondb_owner;

--
-- Name: documents_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.documents_id_seq OWNED BY public.documents.id;


--
-- Name: emergency_protocols; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.emergency_protocols (
    id integer NOT NULL,
    organization_id integer NOT NULL,
    title text NOT NULL,
    priority character varying(20) NOT NULL,
    steps jsonb DEFAULT '[]'::jsonb,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.emergency_protocols OWNER TO neondb_owner;

--
-- Name: emergency_protocols_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.emergency_protocols_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.emergency_protocols_id_seq OWNER TO neondb_owner;

--
-- Name: emergency_protocols_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.emergency_protocols_id_seq OWNED BY public.emergency_protocols.id;


--
-- Name: financial_forecasts; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.financial_forecasts (
    id integer NOT NULL,
    organization_id integer NOT NULL,
    category text NOT NULL,
    forecast_period character varying(7) NOT NULL,
    generated_at timestamp without time zone DEFAULT now() NOT NULL,
    current_value numeric(12,2) NOT NULL,
    projected_value numeric(12,2) NOT NULL,
    variance numeric(12,2) NOT NULL,
    trend character varying(10) NOT NULL,
    confidence integer NOT NULL,
    methodology character varying(30) DEFAULT 'historical_trend'::character varying NOT NULL,
    key_factors jsonb DEFAULT '[]'::jsonb,
    model_id integer,
    metadata jsonb DEFAULT '{}'::jsonb,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.financial_forecasts OWNER TO neondb_owner;

--
-- Name: financial_forecasts_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.financial_forecasts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.financial_forecasts_id_seq OWNER TO neondb_owner;

--
-- Name: financial_forecasts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.financial_forecasts_id_seq OWNED BY public.financial_forecasts.id;


--
-- Name: forecast_models; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.forecast_models (
    id integer NOT NULL,
    organization_id integer NOT NULL,
    name text NOT NULL,
    type character varying(30) NOT NULL,
    algorithm character varying(20) DEFAULT 'linear'::character varying NOT NULL,
    parameters jsonb DEFAULT '{}'::jsonb,
    accuracy numeric(5,2),
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.forecast_models OWNER TO neondb_owner;

--
-- Name: forecast_models_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.forecast_models_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.forecast_models_id_seq OWNER TO neondb_owner;

--
-- Name: forecast_models_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.forecast_models_id_seq OWNED BY public.forecast_models.id;


--
-- Name: gdpr_audit_trail; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.gdpr_audit_trail (
    id integer NOT NULL,
    organization_id integer NOT NULL,
    user_id integer,
    patient_id integer,
    action character varying(50) NOT NULL,
    resource_type character varying(30) NOT NULL,
    resource_id integer,
    data_categories jsonb DEFAULT '[]'::jsonb,
    legal_basis character varying(50),
    purpose text,
    changes jsonb DEFAULT '[]'::jsonb,
    ip_address character varying(45),
    user_agent text,
    session_id character varying(100),
    "timestamp" timestamp without time zone DEFAULT now() NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb
);


ALTER TABLE public.gdpr_audit_trail OWNER TO neondb_owner;

--
-- Name: gdpr_audit_trail_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.gdpr_audit_trail_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.gdpr_audit_trail_id_seq OWNER TO neondb_owner;

--
-- Name: gdpr_audit_trail_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.gdpr_audit_trail_id_seq OWNED BY public.gdpr_audit_trail.id;


--
-- Name: gdpr_consents; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.gdpr_consents (
    id integer NOT NULL,
    organization_id integer NOT NULL,
    patient_id integer NOT NULL,
    consent_type character varying(50) NOT NULL,
    status character varying(20) DEFAULT 'pending'::character varying NOT NULL,
    granted_at timestamp without time zone,
    withdrawn_at timestamp without time zone,
    expires_at timestamp without time zone,
    purpose text NOT NULL,
    legal_basis character varying(50) NOT NULL,
    data_categories jsonb DEFAULT '[]'::jsonb,
    retention_period integer,
    ip_address character varying(45),
    user_agent text,
    consent_method character varying(30) DEFAULT 'digital'::character varying NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.gdpr_consents OWNER TO neondb_owner;

--
-- Name: gdpr_consents_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.gdpr_consents_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.gdpr_consents_id_seq OWNER TO neondb_owner;

--
-- Name: gdpr_consents_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.gdpr_consents_id_seq OWNED BY public.gdpr_consents.id;


--
-- Name: gdpr_data_requests; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.gdpr_data_requests (
    id integer NOT NULL,
    organization_id integer NOT NULL,
    patient_id integer NOT NULL,
    request_type character varying(30) NOT NULL,
    status character varying(20) DEFAULT 'pending'::character varying NOT NULL,
    request_reason text,
    identity_verified boolean DEFAULT false NOT NULL,
    processed_by integer,
    requested_at timestamp without time zone DEFAULT now() NOT NULL,
    completed_at timestamp without time zone,
    due_date timestamp without time zone NOT NULL,
    response_data jsonb DEFAULT '{}'::jsonb,
    rejection_reason text,
    communication_log jsonb DEFAULT '[]'::jsonb,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.gdpr_data_requests OWNER TO neondb_owner;

--
-- Name: gdpr_data_requests_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.gdpr_data_requests_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.gdpr_data_requests_id_seq OWNER TO neondb_owner;

--
-- Name: gdpr_data_requests_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.gdpr_data_requests_id_seq OWNED BY public.gdpr_data_requests.id;


--
-- Name: gdpr_processing_activities; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.gdpr_processing_activities (
    id integer NOT NULL,
    organization_id integer NOT NULL,
    activity_name text NOT NULL,
    purpose text NOT NULL,
    legal_basis character varying(50) NOT NULL,
    data_categories jsonb DEFAULT '[]'::jsonb,
    data_subjects jsonb DEFAULT '[]'::jsonb,
    recipients jsonb DEFAULT '[]'::jsonb,
    international_transfers jsonb DEFAULT '[]'::jsonb,
    retention_period integer,
    security_measures jsonb DEFAULT '[]'::jsonb,
    dpia_required boolean DEFAULT false NOT NULL,
    status character varying(20) DEFAULT 'active'::character varying NOT NULL,
    review_date timestamp without time zone,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.gdpr_processing_activities OWNER TO neondb_owner;

--
-- Name: gdpr_processing_activities_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.gdpr_processing_activities_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.gdpr_processing_activities_id_seq OWNER TO neondb_owner;

--
-- Name: gdpr_processing_activities_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.gdpr_processing_activities_id_seq OWNED BY public.gdpr_processing_activities.id;


--
-- Name: insurance_verifications; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.insurance_verifications (
    id integer NOT NULL,
    organization_id integer NOT NULL,
    patient_id integer NOT NULL,
    patient_name text NOT NULL,
    provider text NOT NULL,
    policy_number text NOT NULL,
    group_number text,
    member_number text,
    nhs_number text,
    plan_type text,
    coverage_type character varying(20) DEFAULT 'primary'::character varying NOT NULL,
    status character varying(20) DEFAULT 'active'::character varying NOT NULL,
    eligibility_status character varying(20) DEFAULT 'pending'::character varying NOT NULL,
    effective_date date,
    expiration_date date,
    last_verified date,
    benefits jsonb DEFAULT '{}'::jsonb,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.insurance_verifications OWNER TO neondb_owner;

--
-- Name: insurance_verifications_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.insurance_verifications_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.insurance_verifications_id_seq OWNER TO neondb_owner;

--
-- Name: insurance_verifications_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.insurance_verifications_id_seq OWNED BY public.insurance_verifications.id;


--
-- Name: inventory_batches; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.inventory_batches (
    id integer NOT NULL,
    organization_id integer NOT NULL,
    item_id integer NOT NULL,
    batch_number character varying(100) NOT NULL,
    expiry_date timestamp without time zone,
    manufacture_date timestamp without time zone,
    quantity integer NOT NULL,
    remaining_quantity integer DEFAULT 0 NOT NULL,
    purchase_price numeric(10,2) NOT NULL,
    supplier_id integer,
    received_date timestamp without time zone DEFAULT now() NOT NULL,
    status character varying(20) DEFAULT 'active'::character varying NOT NULL,
    is_expired boolean DEFAULT false NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.inventory_batches OWNER TO neondb_owner;

--
-- Name: inventory_batches_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.inventory_batches_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.inventory_batches_id_seq OWNER TO neondb_owner;

--
-- Name: inventory_batches_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.inventory_batches_id_seq OWNED BY public.inventory_batches.id;


--
-- Name: inventory_categories; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.inventory_categories (
    id integer NOT NULL,
    organization_id integer NOT NULL,
    name text NOT NULL,
    description text,
    parent_category_id integer,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.inventory_categories OWNER TO neondb_owner;

--
-- Name: inventory_categories_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.inventory_categories_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.inventory_categories_id_seq OWNER TO neondb_owner;

--
-- Name: inventory_categories_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.inventory_categories_id_seq OWNED BY public.inventory_categories.id;


--
-- Name: inventory_items; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.inventory_items (
    id integer NOT NULL,
    organization_id integer NOT NULL,
    category_id integer NOT NULL,
    name text NOT NULL,
    description text,
    sku character varying(100) NOT NULL,
    barcode character varying(100),
    generic_name text,
    brand_name text,
    manufacturer text,
    unit_of_measurement character varying(20) DEFAULT 'pieces'::character varying NOT NULL,
    pack_size integer DEFAULT 1 NOT NULL,
    purchase_price numeric(10,2) NOT NULL,
    sale_price numeric(10,2) NOT NULL,
    mrp numeric(10,2),
    tax_rate numeric(5,2) DEFAULT 0.00 NOT NULL,
    current_stock integer DEFAULT 0 NOT NULL,
    minimum_stock integer DEFAULT 10 NOT NULL,
    maximum_stock integer DEFAULT 1000 NOT NULL,
    reorder_point integer DEFAULT 20 NOT NULL,
    expiry_tracking boolean DEFAULT false NOT NULL,
    batch_tracking boolean DEFAULT false NOT NULL,
    prescription_required boolean DEFAULT false NOT NULL,
    storage_conditions text,
    side_effects text,
    contraindications text,
    dosage_instructions text,
    is_active boolean DEFAULT true NOT NULL,
    is_discontinued boolean DEFAULT false NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.inventory_items OWNER TO neondb_owner;

--
-- Name: inventory_items_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.inventory_items_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.inventory_items_id_seq OWNER TO neondb_owner;

--
-- Name: inventory_items_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.inventory_items_id_seq OWNED BY public.inventory_items.id;


--
-- Name: inventory_purchase_order_items; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.inventory_purchase_order_items (
    id integer NOT NULL,
    organization_id integer NOT NULL,
    purchase_order_id integer NOT NULL,
    item_id integer NOT NULL,
    quantity integer NOT NULL,
    unit_price numeric(10,2) NOT NULL,
    total_price numeric(12,2) NOT NULL,
    received_quantity integer DEFAULT 0 NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.inventory_purchase_order_items OWNER TO neondb_owner;

--
-- Name: inventory_purchase_order_items_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.inventory_purchase_order_items_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.inventory_purchase_order_items_id_seq OWNER TO neondb_owner;

--
-- Name: inventory_purchase_order_items_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.inventory_purchase_order_items_id_seq OWNED BY public.inventory_purchase_order_items.id;


--
-- Name: inventory_purchase_orders; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.inventory_purchase_orders (
    id integer NOT NULL,
    organization_id integer NOT NULL,
    po_number character varying(100) NOT NULL,
    supplier_id integer NOT NULL,
    order_date timestamp without time zone DEFAULT now() NOT NULL,
    expected_delivery_date timestamp without time zone,
    status character varying(20) DEFAULT 'pending'::character varying NOT NULL,
    total_amount numeric(12,2) NOT NULL,
    tax_amount numeric(10,2) DEFAULT 0.00 NOT NULL,
    discount_amount numeric(10,2) DEFAULT 0.00 NOT NULL,
    notes text,
    created_by integer NOT NULL,
    approved_by integer,
    approved_at timestamp without time zone,
    email_sent boolean DEFAULT false NOT NULL,
    email_sent_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.inventory_purchase_orders OWNER TO neondb_owner;

--
-- Name: inventory_purchase_orders_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.inventory_purchase_orders_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.inventory_purchase_orders_id_seq OWNER TO neondb_owner;

--
-- Name: inventory_purchase_orders_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.inventory_purchase_orders_id_seq OWNED BY public.inventory_purchase_orders.id;


--
-- Name: inventory_sale_items; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.inventory_sale_items (
    id integer NOT NULL,
    organization_id integer NOT NULL,
    sale_id integer NOT NULL,
    item_id integer NOT NULL,
    batch_id integer,
    quantity integer NOT NULL,
    unit_price numeric(10,2) NOT NULL,
    total_price numeric(12,2) NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.inventory_sale_items OWNER TO neondb_owner;

--
-- Name: inventory_sale_items_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.inventory_sale_items_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.inventory_sale_items_id_seq OWNER TO neondb_owner;

--
-- Name: inventory_sale_items_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.inventory_sale_items_id_seq OWNED BY public.inventory_sale_items.id;


--
-- Name: inventory_sales; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.inventory_sales (
    id integer NOT NULL,
    organization_id integer NOT NULL,
    patient_id integer,
    sale_number character varying(100) NOT NULL,
    sale_date timestamp without time zone DEFAULT now() NOT NULL,
    total_amount numeric(12,2) NOT NULL,
    tax_amount numeric(10,2) DEFAULT 0.00 NOT NULL,
    discount_amount numeric(10,2) DEFAULT 0.00 NOT NULL,
    payment_method character varying(50) DEFAULT 'cash'::character varying NOT NULL,
    payment_status character varying(20) DEFAULT 'paid'::character varying NOT NULL,
    prescription_id integer,
    sold_by integer NOT NULL,
    notes text,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.inventory_sales OWNER TO neondb_owner;

--
-- Name: inventory_sales_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.inventory_sales_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.inventory_sales_id_seq OWNER TO neondb_owner;

--
-- Name: inventory_sales_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.inventory_sales_id_seq OWNED BY public.inventory_sales.id;


--
-- Name: inventory_stock_alerts; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.inventory_stock_alerts (
    id integer NOT NULL,
    organization_id integer NOT NULL,
    item_id integer NOT NULL,
    alert_type character varying(20) NOT NULL,
    threshold_value integer NOT NULL,
    current_value integer NOT NULL,
    status character varying(20) DEFAULT 'active'::character varying NOT NULL,
    message text,
    is_read boolean DEFAULT false NOT NULL,
    is_resolved boolean DEFAULT false NOT NULL,
    resolved_by integer,
    resolved_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.inventory_stock_alerts OWNER TO neondb_owner;

--
-- Name: inventory_stock_alerts_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.inventory_stock_alerts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.inventory_stock_alerts_id_seq OWNER TO neondb_owner;

--
-- Name: inventory_stock_alerts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.inventory_stock_alerts_id_seq OWNED BY public.inventory_stock_alerts.id;


--
-- Name: inventory_stock_movements; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.inventory_stock_movements (
    id integer NOT NULL,
    organization_id integer NOT NULL,
    item_id integer NOT NULL,
    batch_id integer,
    movement_type character varying(20) NOT NULL,
    quantity integer NOT NULL,
    previous_stock integer NOT NULL,
    new_stock integer NOT NULL,
    unit_cost numeric(10,2),
    reference_type character varying(50),
    reference_id integer,
    notes text,
    created_by integer NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.inventory_stock_movements OWNER TO neondb_owner;

--
-- Name: inventory_stock_movements_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.inventory_stock_movements_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.inventory_stock_movements_id_seq OWNER TO neondb_owner;

--
-- Name: inventory_stock_movements_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.inventory_stock_movements_id_seq OWNED BY public.inventory_stock_movements.id;


--
-- Name: inventory_suppliers; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.inventory_suppliers (
    id integer NOT NULL,
    organization_id integer NOT NULL,
    name text NOT NULL,
    contact_person text,
    email text,
    phone character varying(20),
    address text,
    city text,
    country text DEFAULT 'UK'::text NOT NULL,
    tax_id character varying(50),
    payment_terms character varying(100) DEFAULT 'Net 30'::character varying,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.inventory_suppliers OWNER TO neondb_owner;

--
-- Name: inventory_suppliers_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.inventory_suppliers_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.inventory_suppliers_id_seq OWNER TO neondb_owner;

--
-- Name: inventory_suppliers_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.inventory_suppliers_id_seq OWNED BY public.inventory_suppliers.id;


--
-- Name: lab_results; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.lab_results (
    id integer NOT NULL,
    organization_id integer NOT NULL,
    patient_id integer NOT NULL,
    test_id character varying(50) NOT NULL,
    test_type text NOT NULL,
    ordered_by integer NOT NULL,
    doctor_name text,
    main_specialty text,
    sub_specialty text,
    priority character varying(20) DEFAULT 'routine'::character varying,
    ordered_at timestamp without time zone NOT NULL,
    collected_at timestamp without time zone,
    completed_at timestamp without time zone,
    status character varying(20) DEFAULT 'pending'::character varying NOT NULL,
    results jsonb DEFAULT '[]'::jsonb,
    critical_values boolean DEFAULT false NOT NULL,
    notes text,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.lab_results OWNER TO neondb_owner;

--
-- Name: lab_results_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.lab_results_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.lab_results_id_seq OWNER TO neondb_owner;

--
-- Name: lab_results_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.lab_results_id_seq OWNED BY public.lab_results.id;


--
-- Name: letter_drafts; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.letter_drafts (
    id integer NOT NULL,
    organization_id integer NOT NULL,
    user_id integer NOT NULL,
    subject text NOT NULL,
    recipient text NOT NULL,
    doctor_email text,
    location text,
    copied_recipients text,
    header text,
    document_content text NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.letter_drafts OWNER TO neondb_owner;

--
-- Name: letter_drafts_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.letter_drafts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.letter_drafts_id_seq OWNER TO neondb_owner;

--
-- Name: letter_drafts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.letter_drafts_id_seq OWNED BY public.letter_drafts.id;


--
-- Name: medical_images; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.medical_images (
    id integer NOT NULL,
    organization_id integer NOT NULL,
    patient_id integer NOT NULL,
    uploaded_by integer NOT NULL,
    study_type text NOT NULL,
    modality character varying(50) NOT NULL,
    body_part text,
    indication text,
    priority character varying(20) DEFAULT 'routine'::character varying NOT NULL,
    file_name text NOT NULL,
    file_size integer NOT NULL,
    mime_type character varying(100) NOT NULL,
    image_data text,
    status character varying(20) DEFAULT 'uploaded'::character varying NOT NULL,
    findings text,
    impression text,
    radiologist text,
    report_file_name text,
    report_file_path text,
    metadata jsonb DEFAULT '{}'::jsonb,
    scheduled_at timestamp without time zone,
    performed_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.medical_images OWNER TO neondb_owner;

--
-- Name: medical_images_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.medical_images_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.medical_images_id_seq OWNER TO neondb_owner;

--
-- Name: medical_images_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.medical_images_id_seq OWNED BY public.medical_images.id;


--
-- Name: medical_records; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.medical_records (
    id integer NOT NULL,
    organization_id integer NOT NULL,
    patient_id integer NOT NULL,
    provider_id integer NOT NULL,
    type character varying(20) NOT NULL,
    title text NOT NULL,
    notes text,
    diagnosis text,
    treatment text,
    prescription jsonb DEFAULT '{}'::jsonb,
    attachments jsonb DEFAULT '[]'::jsonb,
    ai_suggestions jsonb DEFAULT '{}'::jsonb,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.medical_records OWNER TO neondb_owner;

--
-- Name: medical_records_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.medical_records_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.medical_records_id_seq OWNER TO neondb_owner;

--
-- Name: medical_records_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.medical_records_id_seq OWNED BY public.medical_records.id;


--
-- Name: medications_database; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.medications_database (
    id integer NOT NULL,
    organization_id integer NOT NULL,
    name text NOT NULL,
    category text NOT NULL,
    dosage text NOT NULL,
    interactions jsonb DEFAULT '[]'::jsonb,
    warnings jsonb DEFAULT '[]'::jsonb,
    severity character varying(20) NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.medications_database OWNER TO neondb_owner;

--
-- Name: medications_database_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.medications_database_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.medications_database_id_seq OWNER TO neondb_owner;

--
-- Name: medications_database_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.medications_database_id_seq OWNED BY public.medications_database.id;


--
-- Name: messages; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.messages (
    id character varying(50) NOT NULL,
    organization_id integer NOT NULL,
    conversation_id character varying(50) NOT NULL,
    sender_id integer NOT NULL,
    sender_name text NOT NULL,
    sender_role character varying(20) NOT NULL,
    recipient_id text,
    recipient_name text,
    subject text NOT NULL,
    content text NOT NULL,
    "timestamp" timestamp without time zone DEFAULT now() NOT NULL,
    is_read boolean DEFAULT false NOT NULL,
    priority character varying(10) DEFAULT 'normal'::character varying NOT NULL,
    type character varying(20) DEFAULT 'internal'::character varying NOT NULL,
    is_starred boolean DEFAULT false NOT NULL,
    phone_number character varying(20),
    message_type character varying(10),
    delivery_status character varying(20) DEFAULT 'pending'::character varying NOT NULL,
    external_message_id text,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.messages OWNER TO neondb_owner;

--
-- Name: muscles_position; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.muscles_position (
    id integer NOT NULL,
    organization_id integer NOT NULL,
    patient_id integer NOT NULL,
    consultation_id integer,
    "position" integer NOT NULL,
    value text NOT NULL,
    coordinates jsonb,
    is_detected boolean DEFAULT false NOT NULL,
    detected_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.muscles_position OWNER TO neondb_owner;

--
-- Name: muscles_position_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.muscles_position_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.muscles_position_id_seq OWNER TO neondb_owner;

--
-- Name: muscles_position_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.muscles_position_id_seq OWNED BY public.muscles_position.id;


--
-- Name: notifications; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.notifications (
    id integer NOT NULL,
    organization_id integer NOT NULL,
    user_id integer NOT NULL,
    title text NOT NULL,
    message text NOT NULL,
    type character varying(50) NOT NULL,
    priority character varying(20) DEFAULT 'normal'::character varying NOT NULL,
    status character varying(20) DEFAULT 'unread'::character varying NOT NULL,
    related_entity_type character varying(50),
    related_entity_id integer,
    action_url text,
    is_actionable boolean DEFAULT false NOT NULL,
    scheduled_for timestamp without time zone,
    expires_at timestamp without time zone,
    metadata jsonb DEFAULT '{}'::jsonb,
    read_at timestamp without time zone,
    dismissed_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.notifications OWNER TO neondb_owner;

--
-- Name: notifications_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.notifications_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.notifications_id_seq OWNER TO neondb_owner;

--
-- Name: notifications_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.notifications_id_seq OWNED BY public.notifications.id;


--
-- Name: organizations; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.organizations (
    id integer NOT NULL,
    name text NOT NULL,
    subdomain character varying(50) NOT NULL,
    email text NOT NULL,
    region character varying(10) DEFAULT 'UK'::character varying NOT NULL,
    brand_name text NOT NULL,
    settings jsonb DEFAULT '{}'::jsonb,
    features jsonb DEFAULT '{}'::jsonb,
    access_level character varying(50) DEFAULT 'full'::character varying,
    subscription_status character varying(20) DEFAULT 'trial'::character varying NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.organizations OWNER TO neondb_owner;

--
-- Name: organizations_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.organizations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.organizations_id_seq OWNER TO neondb_owner;

--
-- Name: organizations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.organizations_id_seq OWNED BY public.organizations.id;


--
-- Name: patient_communications; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.patient_communications (
    id integer NOT NULL,
    organization_id integer NOT NULL,
    patient_id integer NOT NULL,
    sent_by integer NOT NULL,
    type character varying(50) NOT NULL,
    method character varying(20) NOT NULL,
    status character varying(20) DEFAULT 'pending'::character varying NOT NULL,
    message text NOT NULL,
    scheduled_for timestamp without time zone,
    sent_at timestamp without time zone,
    delivered_at timestamp without time zone,
    error_message text,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.patient_communications OWNER TO neondb_owner;

--
-- Name: patient_communications_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.patient_communications_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.patient_communications_id_seq OWNER TO neondb_owner;

--
-- Name: patient_communications_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.patient_communications_id_seq OWNED BY public.patient_communications.id;


--
-- Name: patient_drug_interactions; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.patient_drug_interactions (
    id integer NOT NULL,
    organization_id integer NOT NULL,
    patient_id integer NOT NULL,
    medication1_name text NOT NULL,
    medication1_dosage text NOT NULL,
    medication1_frequency text,
    medication2_name text NOT NULL,
    medication2_dosage text NOT NULL,
    medication2_frequency text,
    interaction_type character varying(50),
    severity character varying(20) DEFAULT 'medium'::character varying NOT NULL,
    description text,
    warnings jsonb DEFAULT '[]'::jsonb,
    recommendations jsonb DEFAULT '[]'::jsonb,
    reported_by integer,
    reported_at timestamp without time zone DEFAULT now() NOT NULL,
    status character varying(20) DEFAULT 'active'::character varying NOT NULL,
    notes text,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.patient_drug_interactions OWNER TO neondb_owner;

--
-- Name: patient_drug_interactions_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.patient_drug_interactions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.patient_drug_interactions_id_seq OWNER TO neondb_owner;

--
-- Name: patient_drug_interactions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.patient_drug_interactions_id_seq OWNED BY public.patient_drug_interactions.id;


--
-- Name: patients; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.patients (
    id integer NOT NULL,
    organization_id integer NOT NULL,
    patient_id text NOT NULL,
    first_name text NOT NULL,
    last_name text NOT NULL,
    date_of_birth date,
    email text,
    phone text,
    nhs_number text,
    address jsonb DEFAULT '{}'::jsonb,
    insurance_info jsonb DEFAULT '{}'::jsonb,
    emergency_contact jsonb DEFAULT '{}'::jsonb,
    medical_history jsonb DEFAULT '{}'::jsonb,
    risk_level character varying(10) DEFAULT 'low'::character varying NOT NULL,
    flags text[] DEFAULT '{}'::text[],
    communication_preferences jsonb DEFAULT '{}'::jsonb,
    is_active boolean DEFAULT true NOT NULL,
    is_insured boolean DEFAULT false NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    gender_at_birth character varying(20)
);


ALTER TABLE public.patients OWNER TO neondb_owner;

--
-- Name: patients_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.patients_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.patients_id_seq OWNER TO neondb_owner;

--
-- Name: patients_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.patients_id_seq OWNED BY public.patients.id;


--
-- Name: prescriptions; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.prescriptions (
    id integer NOT NULL,
    organization_id integer NOT NULL,
    patient_id integer NOT NULL,
    doctor_id integer NOT NULL,
    consultation_id integer,
    prescription_number character varying(50),
    status text DEFAULT 'active'::text NOT NULL,
    diagnosis text,
    medication_name text NOT NULL,
    dosage text,
    frequency text,
    duration text,
    instructions text,
    issued_date timestamp without time zone DEFAULT now(),
    medications jsonb DEFAULT '[]'::jsonb,
    pharmacy jsonb DEFAULT '{}'::jsonb,
    prescribed_at timestamp without time zone DEFAULT now(),
    valid_until timestamp without time zone,
    notes text,
    is_electronic boolean DEFAULT true NOT NULL,
    interactions jsonb DEFAULT '[]'::jsonb,
    signature jsonb DEFAULT '{}'::jsonb,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.prescriptions OWNER TO neondb_owner;

--
-- Name: prescriptions_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.prescriptions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.prescriptions_id_seq OWNER TO neondb_owner;

--
-- Name: prescriptions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.prescriptions_id_seq OWNED BY public.prescriptions.id;


--
-- Name: quickbooks_account_mappings; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.quickbooks_account_mappings (
    id integer NOT NULL,
    organization_id integer NOT NULL,
    connection_id integer NOT NULL,
    emr_account_type character varying(50) NOT NULL,
    emr_account_name text NOT NULL,
    quickbooks_account_id text NOT NULL,
    quickbooks_account_name text NOT NULL,
    account_type character varying(50) NOT NULL,
    account_sub_type character varying(50),
    is_active boolean DEFAULT true NOT NULL,
    sync_status character varying(20) DEFAULT 'synced'::character varying NOT NULL,
    last_sync_at timestamp without time zone,
    error_message text,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.quickbooks_account_mappings OWNER TO neondb_owner;

--
-- Name: quickbooks_account_mappings_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.quickbooks_account_mappings_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.quickbooks_account_mappings_id_seq OWNER TO neondb_owner;

--
-- Name: quickbooks_account_mappings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.quickbooks_account_mappings_id_seq OWNED BY public.quickbooks_account_mappings.id;


--
-- Name: quickbooks_connections; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.quickbooks_connections (
    id integer NOT NULL,
    organization_id integer NOT NULL,
    company_id text NOT NULL,
    company_name text NOT NULL,
    access_token text NOT NULL,
    refresh_token text NOT NULL,
    token_expiry timestamp without time zone NOT NULL,
    realm_id text NOT NULL,
    base_url text NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    last_sync_at timestamp without time zone,
    sync_settings jsonb DEFAULT '{}'::jsonb,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.quickbooks_connections OWNER TO neondb_owner;

--
-- Name: quickbooks_connections_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.quickbooks_connections_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.quickbooks_connections_id_seq OWNER TO neondb_owner;

--
-- Name: quickbooks_connections_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.quickbooks_connections_id_seq OWNED BY public.quickbooks_connections.id;


--
-- Name: quickbooks_customer_mappings; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.quickbooks_customer_mappings (
    id integer NOT NULL,
    organization_id integer NOT NULL,
    connection_id integer NOT NULL,
    patient_id integer NOT NULL,
    quickbooks_customer_id text NOT NULL,
    quickbooks_display_name text,
    sync_status character varying(20) DEFAULT 'synced'::character varying NOT NULL,
    last_sync_at timestamp without time zone,
    error_message text,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.quickbooks_customer_mappings OWNER TO neondb_owner;

--
-- Name: quickbooks_customer_mappings_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.quickbooks_customer_mappings_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.quickbooks_customer_mappings_id_seq OWNER TO neondb_owner;

--
-- Name: quickbooks_customer_mappings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.quickbooks_customer_mappings_id_seq OWNED BY public.quickbooks_customer_mappings.id;


--
-- Name: quickbooks_invoice_mappings; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.quickbooks_invoice_mappings (
    id integer NOT NULL,
    organization_id integer NOT NULL,
    connection_id integer NOT NULL,
    emr_invoice_id text NOT NULL,
    quickbooks_invoice_id text NOT NULL,
    quickbooks_invoice_number text,
    patient_id integer NOT NULL,
    customer_id integer,
    amount numeric(10,2) NOT NULL,
    status character varying(20) NOT NULL,
    sync_status character varying(20) DEFAULT 'synced'::character varying NOT NULL,
    last_sync_at timestamp without time zone,
    error_message text,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.quickbooks_invoice_mappings OWNER TO neondb_owner;

--
-- Name: quickbooks_invoice_mappings_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.quickbooks_invoice_mappings_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.quickbooks_invoice_mappings_id_seq OWNER TO neondb_owner;

--
-- Name: quickbooks_invoice_mappings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.quickbooks_invoice_mappings_id_seq OWNED BY public.quickbooks_invoice_mappings.id;


--
-- Name: quickbooks_item_mappings; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.quickbooks_item_mappings (
    id integer NOT NULL,
    organization_id integer NOT NULL,
    connection_id integer NOT NULL,
    emr_item_type character varying(50) NOT NULL,
    emr_item_id text NOT NULL,
    emr_item_name text NOT NULL,
    quickbooks_item_id text NOT NULL,
    quickbooks_item_name text NOT NULL,
    item_type character varying(20) NOT NULL,
    unit_price numeric(10,2),
    description text,
    income_account_id text,
    expense_account_id text,
    is_active boolean DEFAULT true NOT NULL,
    sync_status character varying(20) DEFAULT 'synced'::character varying NOT NULL,
    last_sync_at timestamp without time zone,
    error_message text,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.quickbooks_item_mappings OWNER TO neondb_owner;

--
-- Name: quickbooks_item_mappings_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.quickbooks_item_mappings_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.quickbooks_item_mappings_id_seq OWNER TO neondb_owner;

--
-- Name: quickbooks_item_mappings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.quickbooks_item_mappings_id_seq OWNED BY public.quickbooks_item_mappings.id;


--
-- Name: quickbooks_payment_mappings; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.quickbooks_payment_mappings (
    id integer NOT NULL,
    organization_id integer NOT NULL,
    connection_id integer NOT NULL,
    emr_payment_id text NOT NULL,
    quickbooks_payment_id text NOT NULL,
    invoice_mapping_id integer,
    amount numeric(10,2) NOT NULL,
    payment_method character varying(50) NOT NULL,
    payment_date timestamp without time zone NOT NULL,
    sync_status character varying(20) DEFAULT 'synced'::character varying NOT NULL,
    last_sync_at timestamp without time zone,
    error_message text,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.quickbooks_payment_mappings OWNER TO neondb_owner;

--
-- Name: quickbooks_payment_mappings_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.quickbooks_payment_mappings_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.quickbooks_payment_mappings_id_seq OWNER TO neondb_owner;

--
-- Name: quickbooks_payment_mappings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.quickbooks_payment_mappings_id_seq OWNED BY public.quickbooks_payment_mappings.id;


--
-- Name: quickbooks_sync_configs; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.quickbooks_sync_configs (
    id integer NOT NULL,
    organization_id integer NOT NULL,
    connection_id integer NOT NULL,
    config_type character varying(50) NOT NULL,
    config_name text NOT NULL,
    config_value jsonb NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    description text,
    created_by integer NOT NULL,
    updated_by integer,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.quickbooks_sync_configs OWNER TO neondb_owner;

--
-- Name: quickbooks_sync_configs_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.quickbooks_sync_configs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.quickbooks_sync_configs_id_seq OWNER TO neondb_owner;

--
-- Name: quickbooks_sync_configs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.quickbooks_sync_configs_id_seq OWNED BY public.quickbooks_sync_configs.id;


--
-- Name: quickbooks_sync_logs; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.quickbooks_sync_logs (
    id integer NOT NULL,
    organization_id integer NOT NULL,
    connection_id integer NOT NULL,
    sync_type character varying(50) NOT NULL,
    operation character varying(20) NOT NULL,
    status character varying(20) DEFAULT 'pending'::character varying NOT NULL,
    records_processed integer DEFAULT 0,
    records_successful integer DEFAULT 0,
    records_failed integer DEFAULT 0,
    start_time timestamp without time zone NOT NULL,
    end_time timestamp without time zone,
    error_message text,
    error_details jsonb,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.quickbooks_sync_logs OWNER TO neondb_owner;

--
-- Name: quickbooks_sync_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.quickbooks_sync_logs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.quickbooks_sync_logs_id_seq OWNER TO neondb_owner;

--
-- Name: quickbooks_sync_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.quickbooks_sync_logs_id_seq OWNED BY public.quickbooks_sync_logs.id;


--
-- Name: revenue_records; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.revenue_records (
    id integer NOT NULL,
    organization_id integer NOT NULL,
    month character varying(7) NOT NULL,
    revenue numeric(12,2) NOT NULL,
    expenses numeric(12,2) NOT NULL,
    profit numeric(12,2) NOT NULL,
    collections numeric(12,2) NOT NULL,
    target numeric(12,2) NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.revenue_records OWNER TO neondb_owner;

--
-- Name: revenue_records_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.revenue_records_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.revenue_records_id_seq OWNER TO neondb_owner;

--
-- Name: revenue_records_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.revenue_records_id_seq OWNED BY public.revenue_records.id;


--
-- Name: roles; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.roles (
    id integer NOT NULL,
    organization_id integer NOT NULL,
    name character varying(50) NOT NULL,
    display_name text NOT NULL,
    description text NOT NULL,
    permissions jsonb NOT NULL,
    is_system boolean DEFAULT false NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.roles OWNER TO neondb_owner;

--
-- Name: roles_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.roles_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.roles_id_seq OWNER TO neondb_owner;

--
-- Name: roles_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.roles_id_seq OWNED BY public.roles.id;


--
-- Name: saas_invoices; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.saas_invoices (
    id integer NOT NULL,
    organization_id integer NOT NULL,
    subscription_id integer NOT NULL,
    invoice_number character varying(50) NOT NULL,
    amount numeric(10,2) NOT NULL,
    currency character varying(3) DEFAULT 'GBP'::character varying NOT NULL,
    status character varying(20) DEFAULT 'draft'::character varying NOT NULL,
    issue_date timestamp without time zone NOT NULL,
    due_date timestamp without time zone NOT NULL,
    paid_date timestamp without time zone,
    period_start timestamp without time zone NOT NULL,
    period_end timestamp without time zone NOT NULL,
    line_items jsonb DEFAULT '[]'::jsonb,
    notes text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.saas_invoices OWNER TO neondb_owner;

--
-- Name: saas_invoices_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.saas_invoices_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.saas_invoices_id_seq OWNER TO neondb_owner;

--
-- Name: saas_invoices_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.saas_invoices_id_seq OWNED BY public.saas_invoices.id;


--
-- Name: saas_owners; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.saas_owners (
    id integer NOT NULL,
    username character varying(50) NOT NULL,
    password text NOT NULL,
    email text NOT NULL,
    first_name text NOT NULL,
    last_name text NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    last_login_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.saas_owners OWNER TO neondb_owner;

--
-- Name: saas_owners_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.saas_owners_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.saas_owners_id_seq OWNER TO neondb_owner;

--
-- Name: saas_owners_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.saas_owners_id_seq OWNED BY public.saas_owners.id;


--
-- Name: saas_packages; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.saas_packages (
    id integer NOT NULL,
    name text NOT NULL,
    description text,
    price numeric(10,2) NOT NULL,
    billing_cycle character varying(20) DEFAULT 'monthly'::character varying NOT NULL,
    features jsonb DEFAULT '{}'::jsonb,
    is_active boolean DEFAULT true NOT NULL,
    show_on_website boolean DEFAULT false NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.saas_packages OWNER TO neondb_owner;

--
-- Name: saas_packages_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.saas_packages_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.saas_packages_id_seq OWNER TO neondb_owner;

--
-- Name: saas_packages_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.saas_packages_id_seq OWNED BY public.saas_packages.id;


--
-- Name: saas_payments; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.saas_payments (
    id integer NOT NULL,
    organization_id integer NOT NULL,
    subscription_id integer,
    invoice_number character varying(50) NOT NULL,
    amount numeric(10,2) NOT NULL,
    currency character varying(3) DEFAULT 'GBP'::character varying NOT NULL,
    payment_method character varying(20) NOT NULL,
    payment_status character varying(20) DEFAULT 'pending'::character varying NOT NULL,
    payment_date timestamp without time zone,
    due_date timestamp without time zone NOT NULL,
    period_start timestamp without time zone NOT NULL,
    period_end timestamp without time zone NOT NULL,
    payment_provider character varying(50),
    provider_transaction_id text,
    description text,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.saas_payments OWNER TO neondb_owner;

--
-- Name: saas_payments_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.saas_payments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.saas_payments_id_seq OWNER TO neondb_owner;

--
-- Name: saas_payments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.saas_payments_id_seq OWNED BY public.saas_payments.id;


--
-- Name: saas_settings; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.saas_settings (
    id integer NOT NULL,
    key character varying(100) NOT NULL,
    value jsonb,
    description text,
    category character varying(50) DEFAULT 'system'::character varying NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.saas_settings OWNER TO neondb_owner;

--
-- Name: saas_settings_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.saas_settings_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.saas_settings_id_seq OWNER TO neondb_owner;

--
-- Name: saas_settings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.saas_settings_id_seq OWNED BY public.saas_settings.id;


--
-- Name: saas_subscriptions; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.saas_subscriptions (
    id integer NOT NULL,
    organization_id integer NOT NULL,
    package_id integer NOT NULL,
    status character varying(20) DEFAULT 'active'::character varying NOT NULL,
    current_period_start timestamp without time zone NOT NULL,
    current_period_end timestamp without time zone NOT NULL,
    cancel_at_period_end boolean DEFAULT false NOT NULL,
    trial_end timestamp without time zone,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.saas_subscriptions OWNER TO neondb_owner;

--
-- Name: saas_subscriptions_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.saas_subscriptions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.saas_subscriptions_id_seq OWNER TO neondb_owner;

--
-- Name: saas_subscriptions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.saas_subscriptions_id_seq OWNED BY public.saas_subscriptions.id;


--
-- Name: staff_shifts; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.staff_shifts (
    id integer NOT NULL,
    organization_id integer NOT NULL,
    staff_id integer NOT NULL,
    date timestamp without time zone NOT NULL,
    shift_type character varying(20) DEFAULT 'regular'::character varying NOT NULL,
    start_time character varying(5) NOT NULL,
    end_time character varying(5) NOT NULL,
    status character varying(20) DEFAULT 'scheduled'::character varying NOT NULL,
    notes text,
    is_available boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.staff_shifts OWNER TO neondb_owner;

--
-- Name: staff_shifts_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.staff_shifts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.staff_shifts_id_seq OWNER TO neondb_owner;

--
-- Name: staff_shifts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.staff_shifts_id_seq OWNED BY public.staff_shifts.id;


--
-- Name: subscriptions; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.subscriptions (
    id integer NOT NULL,
    organization_id integer NOT NULL,
    plan_name text NOT NULL,
    plan character varying(20),
    status character varying(20) DEFAULT 'trial'::character varying NOT NULL,
    user_limit integer DEFAULT 5 NOT NULL,
    current_users integer DEFAULT 0 NOT NULL,
    monthly_price numeric(10,2),
    trial_ends_at timestamp without time zone,
    next_billing_at timestamp without time zone,
    features jsonb DEFAULT '{}'::jsonb,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.subscriptions OWNER TO neondb_owner;

--
-- Name: subscriptions_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.subscriptions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.subscriptions_id_seq OWNER TO neondb_owner;

--
-- Name: subscriptions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.subscriptions_id_seq OWNED BY public.subscriptions.id;


--
-- Name: user_document_preferences; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.user_document_preferences (
    id integer NOT NULL,
    organization_id integer NOT NULL,
    user_id integer NOT NULL,
    clinic_info jsonb DEFAULT '{}'::jsonb,
    header_preferences jsonb DEFAULT '{}'::jsonb,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.user_document_preferences OWNER TO neondb_owner;

--
-- Name: user_document_preferences_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.user_document_preferences_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.user_document_preferences_id_seq OWNER TO neondb_owner;

--
-- Name: user_document_preferences_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.user_document_preferences_id_seq OWNED BY public.user_document_preferences.id;


--
-- Name: users; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.users (
    id integer NOT NULL,
    organization_id integer NOT NULL,
    email text NOT NULL,
    username text NOT NULL,
    password_hash text NOT NULL,
    first_name text NOT NULL,
    last_name text NOT NULL,
    role character varying(20) DEFAULT 'doctor'::character varying NOT NULL,
    department text,
    medical_specialty_category text,
    sub_specialty text,
    working_days jsonb DEFAULT '[]'::jsonb,
    working_hours jsonb DEFAULT '{}'::jsonb,
    permissions jsonb DEFAULT '{}'::jsonb,
    is_active boolean DEFAULT true NOT NULL,
    is_saas_owner boolean DEFAULT false NOT NULL,
    last_login_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.users OWNER TO neondb_owner;

--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.users_id_seq OWNER TO neondb_owner;

--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- Name: voice_notes; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.voice_notes (
    id character varying NOT NULL,
    organization_id integer NOT NULL,
    patient_id character varying NOT NULL,
    patient_name text NOT NULL,
    provider_id character varying NOT NULL,
    provider_name text NOT NULL,
    type character varying(50) NOT NULL,
    status character varying(20) DEFAULT 'completed'::character varying NOT NULL,
    recording_duration integer,
    transcript text,
    confidence real,
    medical_terms jsonb DEFAULT '[]'::jsonb,
    structured_data jsonb DEFAULT '{}'::jsonb,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.voice_notes OWNER TO neondb_owner;

--
-- Name: ai_insights id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.ai_insights ALTER COLUMN id SET DEFAULT nextval('public.ai_insights_id_seq'::regclass);


--
-- Name: appointments id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.appointments ALTER COLUMN id SET DEFAULT nextval('public.appointments_id_seq'::regclass);


--
-- Name: chatbot_analytics id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.chatbot_analytics ALTER COLUMN id SET DEFAULT nextval('public.chatbot_analytics_id_seq'::regclass);


--
-- Name: chatbot_configs id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.chatbot_configs ALTER COLUMN id SET DEFAULT nextval('public.chatbot_configs_id_seq'::regclass);


--
-- Name: chatbot_messages id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.chatbot_messages ALTER COLUMN id SET DEFAULT nextval('public.chatbot_messages_id_seq'::regclass);


--
-- Name: chatbot_sessions id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.chatbot_sessions ALTER COLUMN id SET DEFAULT nextval('public.chatbot_sessions_id_seq'::regclass);


--
-- Name: claims id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.claims ALTER COLUMN id SET DEFAULT nextval('public.claims_id_seq'::regclass);


--
-- Name: clinical_photos id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.clinical_photos ALTER COLUMN id SET DEFAULT nextval('public.clinical_photos_id_seq'::regclass);


--
-- Name: clinical_procedures id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.clinical_procedures ALTER COLUMN id SET DEFAULT nextval('public.clinical_procedures_id_seq'::regclass);


--
-- Name: consultations id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.consultations ALTER COLUMN id SET DEFAULT nextval('public.consultations_id_seq'::regclass);


--
-- Name: documents id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.documents ALTER COLUMN id SET DEFAULT nextval('public.documents_id_seq'::regclass);


--
-- Name: emergency_protocols id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.emergency_protocols ALTER COLUMN id SET DEFAULT nextval('public.emergency_protocols_id_seq'::regclass);


--
-- Name: financial_forecasts id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.financial_forecasts ALTER COLUMN id SET DEFAULT nextval('public.financial_forecasts_id_seq'::regclass);


--
-- Name: forecast_models id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.forecast_models ALTER COLUMN id SET DEFAULT nextval('public.forecast_models_id_seq'::regclass);


--
-- Name: gdpr_audit_trail id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.gdpr_audit_trail ALTER COLUMN id SET DEFAULT nextval('public.gdpr_audit_trail_id_seq'::regclass);


--
-- Name: gdpr_consents id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.gdpr_consents ALTER COLUMN id SET DEFAULT nextval('public.gdpr_consents_id_seq'::regclass);


--
-- Name: gdpr_data_requests id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.gdpr_data_requests ALTER COLUMN id SET DEFAULT nextval('public.gdpr_data_requests_id_seq'::regclass);


--
-- Name: gdpr_processing_activities id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.gdpr_processing_activities ALTER COLUMN id SET DEFAULT nextval('public.gdpr_processing_activities_id_seq'::regclass);


--
-- Name: insurance_verifications id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.insurance_verifications ALTER COLUMN id SET DEFAULT nextval('public.insurance_verifications_id_seq'::regclass);


--
-- Name: inventory_batches id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.inventory_batches ALTER COLUMN id SET DEFAULT nextval('public.inventory_batches_id_seq'::regclass);


--
-- Name: inventory_categories id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.inventory_categories ALTER COLUMN id SET DEFAULT nextval('public.inventory_categories_id_seq'::regclass);


--
-- Name: inventory_items id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.inventory_items ALTER COLUMN id SET DEFAULT nextval('public.inventory_items_id_seq'::regclass);


--
-- Name: inventory_purchase_order_items id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.inventory_purchase_order_items ALTER COLUMN id SET DEFAULT nextval('public.inventory_purchase_order_items_id_seq'::regclass);


--
-- Name: inventory_purchase_orders id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.inventory_purchase_orders ALTER COLUMN id SET DEFAULT nextval('public.inventory_purchase_orders_id_seq'::regclass);


--
-- Name: inventory_sale_items id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.inventory_sale_items ALTER COLUMN id SET DEFAULT nextval('public.inventory_sale_items_id_seq'::regclass);


--
-- Name: inventory_sales id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.inventory_sales ALTER COLUMN id SET DEFAULT nextval('public.inventory_sales_id_seq'::regclass);


--
-- Name: inventory_stock_alerts id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.inventory_stock_alerts ALTER COLUMN id SET DEFAULT nextval('public.inventory_stock_alerts_id_seq'::regclass);


--
-- Name: inventory_stock_movements id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.inventory_stock_movements ALTER COLUMN id SET DEFAULT nextval('public.inventory_stock_movements_id_seq'::regclass);


--
-- Name: inventory_suppliers id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.inventory_suppliers ALTER COLUMN id SET DEFAULT nextval('public.inventory_suppliers_id_seq'::regclass);


--
-- Name: lab_results id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.lab_results ALTER COLUMN id SET DEFAULT nextval('public.lab_results_id_seq'::regclass);


--
-- Name: letter_drafts id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.letter_drafts ALTER COLUMN id SET DEFAULT nextval('public.letter_drafts_id_seq'::regclass);


--
-- Name: medical_images id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.medical_images ALTER COLUMN id SET DEFAULT nextval('public.medical_images_id_seq'::regclass);


--
-- Name: medical_records id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.medical_records ALTER COLUMN id SET DEFAULT nextval('public.medical_records_id_seq'::regclass);


--
-- Name: medications_database id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.medications_database ALTER COLUMN id SET DEFAULT nextval('public.medications_database_id_seq'::regclass);


--
-- Name: muscles_position id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.muscles_position ALTER COLUMN id SET DEFAULT nextval('public.muscles_position_id_seq'::regclass);


--
-- Name: notifications id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.notifications ALTER COLUMN id SET DEFAULT nextval('public.notifications_id_seq'::regclass);


--
-- Name: organizations id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.organizations ALTER COLUMN id SET DEFAULT nextval('public.organizations_id_seq'::regclass);


--
-- Name: patient_communications id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.patient_communications ALTER COLUMN id SET DEFAULT nextval('public.patient_communications_id_seq'::regclass);


--
-- Name: patient_drug_interactions id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.patient_drug_interactions ALTER COLUMN id SET DEFAULT nextval('public.patient_drug_interactions_id_seq'::regclass);


--
-- Name: patients id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.patients ALTER COLUMN id SET DEFAULT nextval('public.patients_id_seq'::regclass);


--
-- Name: prescriptions id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.prescriptions ALTER COLUMN id SET DEFAULT nextval('public.prescriptions_id_seq'::regclass);


--
-- Name: quickbooks_account_mappings id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.quickbooks_account_mappings ALTER COLUMN id SET DEFAULT nextval('public.quickbooks_account_mappings_id_seq'::regclass);


--
-- Name: quickbooks_connections id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.quickbooks_connections ALTER COLUMN id SET DEFAULT nextval('public.quickbooks_connections_id_seq'::regclass);


--
-- Name: quickbooks_customer_mappings id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.quickbooks_customer_mappings ALTER COLUMN id SET DEFAULT nextval('public.quickbooks_customer_mappings_id_seq'::regclass);


--
-- Name: quickbooks_invoice_mappings id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.quickbooks_invoice_mappings ALTER COLUMN id SET DEFAULT nextval('public.quickbooks_invoice_mappings_id_seq'::regclass);


--
-- Name: quickbooks_item_mappings id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.quickbooks_item_mappings ALTER COLUMN id SET DEFAULT nextval('public.quickbooks_item_mappings_id_seq'::regclass);


--
-- Name: quickbooks_payment_mappings id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.quickbooks_payment_mappings ALTER COLUMN id SET DEFAULT nextval('public.quickbooks_payment_mappings_id_seq'::regclass);


--
-- Name: quickbooks_sync_configs id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.quickbooks_sync_configs ALTER COLUMN id SET DEFAULT nextval('public.quickbooks_sync_configs_id_seq'::regclass);


--
-- Name: quickbooks_sync_logs id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.quickbooks_sync_logs ALTER COLUMN id SET DEFAULT nextval('public.quickbooks_sync_logs_id_seq'::regclass);


--
-- Name: revenue_records id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.revenue_records ALTER COLUMN id SET DEFAULT nextval('public.revenue_records_id_seq'::regclass);


--
-- Name: roles id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.roles ALTER COLUMN id SET DEFAULT nextval('public.roles_id_seq'::regclass);


--
-- Name: saas_invoices id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.saas_invoices ALTER COLUMN id SET DEFAULT nextval('public.saas_invoices_id_seq'::regclass);


--
-- Name: saas_owners id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.saas_owners ALTER COLUMN id SET DEFAULT nextval('public.saas_owners_id_seq'::regclass);


--
-- Name: saas_packages id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.saas_packages ALTER COLUMN id SET DEFAULT nextval('public.saas_packages_id_seq'::regclass);


--
-- Name: saas_payments id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.saas_payments ALTER COLUMN id SET DEFAULT nextval('public.saas_payments_id_seq'::regclass);


--
-- Name: saas_settings id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.saas_settings ALTER COLUMN id SET DEFAULT nextval('public.saas_settings_id_seq'::regclass);


--
-- Name: saas_subscriptions id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.saas_subscriptions ALTER COLUMN id SET DEFAULT nextval('public.saas_subscriptions_id_seq'::regclass);


--
-- Name: staff_shifts id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.staff_shifts ALTER COLUMN id SET DEFAULT nextval('public.staff_shifts_id_seq'::regclass);


--
-- Name: subscriptions id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.subscriptions ALTER COLUMN id SET DEFAULT nextval('public.subscriptions_id_seq'::regclass);


--
-- Name: user_document_preferences id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.user_document_preferences ALTER COLUMN id SET DEFAULT nextval('public.user_document_preferences_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Data for Name: ai_insights; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.ai_insights (id, organization_id, patient_id, type, title, description, severity, action_required, confidence, metadata, status, ai_status, created_at) FROM stdin;
1	2	1	risk_alert	Cardiovascular Risk Assessment	Based on recent blood pressure readings and family history, patient shows elevated cardiovascular risk factors. Consider lifestyle modifications and medication review.	medium	t	0.85	{"references": ["AHA Guidelines 2023", "ESC Guidelines"], "suggestedActions": ["Diet consultation", "Exercise program", "Medication review"], "relatedConditions": ["Hypertension", "Family History CVD"]}	active	pending	2025-10-02 11:52:28.419113
2	2	2	drug_interaction	Potential Drug Interaction Alert	Interaction detected between Metformin and newly prescribed medication. Monitor glucose levels closely and consider dosage adjustment.	high	t	0.92	{"references": ["Drug Interaction Database", "FDA Guidelines"], "suggestedActions": ["Monitor blood glucose", "Review medication timing", "Patient education"], "relatedConditions": ["Type 2 Diabetes", "Drug Interaction"]}	active	pending	2025-10-02 11:52:28.419113
3	2	1	treatment_suggestion	Hypertension Management Optimization	Current treatment plan shows good response. Consider adding lifestyle interventions to potentially reduce medication dependency.	low	f	0.78	{"references": ["JNC 8 Guidelines", "AHA Lifestyle Guidelines"], "suggestedActions": ["DASH diet counseling", "Regular exercise program", "Weight management"], "relatedConditions": ["Hypertension", "ACE Inhibitor Therapy"]}	active	pending	2025-10-02 11:52:28.419113
4	2	2	preventive_care	Diabetic Screening Recommendations	Patient due for annual diabetic complications screening. Schedule eye exam, foot examination, and kidney function tests.	medium	t	0.95	{"references": ["ADA Standards of Care", "Diabetic Complications Guidelines"], "suggestedActions": ["Ophthalmology referral", "Podiatry consultation", "Lab work: HbA1c, microalbumin"], "relatedConditions": ["Type 2 Diabetes", "Preventive Care"]}	active	pending	2025-10-02 11:52:28.419113
5	2	1	risk_alert	Medication Adherence Concern	AI analysis of prescription refill patterns suggests potential adherence issues. Patient may benefit from medication management support.	medium	t	0.73	{"references": ["Medication Adherence Guidelines", "Patient Education Resources"], "suggestedActions": ["Adherence counseling", "Pill organizer", "Follow-up call"], "relatedConditions": ["Medication Adherence", "Hypertension"]}	active	pending	2025-10-02 11:52:28.419113
6	2	1	risk_alert	Cardiovascular Risk Assessment	Based on recent blood pressure readings and family history, patient shows elevated cardiovascular risk factors. Consider lifestyle modifications and medication review.	medium	t	0.85	{"references": ["AHA Guidelines 2023", "ESC Guidelines"], "suggestedActions": ["Diet consultation", "Exercise program", "Medication review"], "relatedConditions": ["Hypertension", "Family History CVD"]}	active	pending	2025-10-02 11:56:09.399563
7	2	2	drug_interaction	Potential Drug Interaction Alert	Interaction detected between Metformin and newly prescribed medication. Monitor glucose levels closely and consider dosage adjustment.	high	t	0.92	{"references": ["Drug Interaction Database", "FDA Guidelines"], "suggestedActions": ["Monitor blood glucose", "Review medication timing", "Patient education"], "relatedConditions": ["Type 2 Diabetes", "Drug Interaction"]}	active	pending	2025-10-02 11:56:09.399563
8	2	1	treatment_suggestion	Hypertension Management Optimization	Current treatment plan shows good response. Consider adding lifestyle interventions to potentially reduce medication dependency.	low	f	0.78	{"references": ["JNC 8 Guidelines", "AHA Lifestyle Guidelines"], "suggestedActions": ["DASH diet counseling", "Regular exercise program", "Weight management"], "relatedConditions": ["Hypertension", "ACE Inhibitor Therapy"]}	active	pending	2025-10-02 11:56:09.399563
9	2	2	preventive_care	Diabetic Screening Recommendations	Patient due for annual diabetic complications screening. Schedule eye exam, foot examination, and kidney function tests.	medium	t	0.95	{"references": ["ADA Standards of Care", "Diabetic Complications Guidelines"], "suggestedActions": ["Ophthalmology referral", "Podiatry consultation", "Lab work: HbA1c, microalbumin"], "relatedConditions": ["Type 2 Diabetes", "Preventive Care"]}	active	pending	2025-10-02 11:56:09.399563
10	2	1	risk_alert	Medication Adherence Concern	AI analysis of prescription refill patterns suggests potential adherence issues. Patient may benefit from medication management support.	medium	t	0.73	{"references": ["Medication Adherence Guidelines", "Patient Education Resources"], "suggestedActions": ["Adherence counseling", "Pill organizer", "Follow-up call"], "relatedConditions": ["Medication Adherence", "Hypertension"]}	active	pending	2025-10-02 11:56:09.399563
11	2	1	risk_alert	Cardiovascular Risk Assessment	Based on recent blood pressure readings and family history, patient shows elevated cardiovascular risk factors. Consider lifestyle modifications and medication review.	medium	t	0.85	{"references": ["AHA Guidelines 2023", "ESC Guidelines"], "suggestedActions": ["Diet consultation", "Exercise program", "Medication review"], "relatedConditions": ["Hypertension", "Family History CVD"]}	active	pending	2025-10-02 11:57:44.315857
12	2	2	drug_interaction	Potential Drug Interaction Alert	Interaction detected between Metformin and newly prescribed medication. Monitor glucose levels closely and consider dosage adjustment.	high	t	0.92	{"references": ["Drug Interaction Database", "FDA Guidelines"], "suggestedActions": ["Monitor blood glucose", "Review medication timing", "Patient education"], "relatedConditions": ["Type 2 Diabetes", "Drug Interaction"]}	active	pending	2025-10-02 11:57:44.315857
13	2	1	treatment_suggestion	Hypertension Management Optimization	Current treatment plan shows good response. Consider adding lifestyle interventions to potentially reduce medication dependency.	low	f	0.78	{"references": ["JNC 8 Guidelines", "AHA Lifestyle Guidelines"], "suggestedActions": ["DASH diet counseling", "Regular exercise program", "Weight management"], "relatedConditions": ["Hypertension", "ACE Inhibitor Therapy"]}	active	pending	2025-10-02 11:57:44.315857
14	2	2	preventive_care	Diabetic Screening Recommendations	Patient due for annual diabetic complications screening. Schedule eye exam, foot examination, and kidney function tests.	medium	t	0.95	{"references": ["ADA Standards of Care", "Diabetic Complications Guidelines"], "suggestedActions": ["Ophthalmology referral", "Podiatry consultation", "Lab work: HbA1c, microalbumin"], "relatedConditions": ["Type 2 Diabetes", "Preventive Care"]}	active	pending	2025-10-02 11:57:44.315857
15	2	1	risk_alert	Medication Adherence Concern	AI analysis of prescription refill patterns suggests potential adherence issues. Patient may benefit from medication management support.	medium	t	0.73	{"references": ["Medication Adherence Guidelines", "Patient Education Resources"], "suggestedActions": ["Adherence counseling", "Pill organizer", "Follow-up call"], "relatedConditions": ["Medication Adherence", "Hypertension"]}	active	pending	2025-10-02 11:57:44.315857
16	2	1	risk_alert	Cardiovascular Risk Assessment	Based on recent blood pressure readings and family history, patient shows elevated cardiovascular risk factors. Consider lifestyle modifications and medication review.	medium	t	0.85	{"references": ["AHA Guidelines 2023", "ESC Guidelines"], "suggestedActions": ["Diet consultation", "Exercise program", "Medication review"], "relatedConditions": ["Hypertension", "Family History CVD"]}	active	pending	2025-10-02 12:59:28.140627
17	2	2	drug_interaction	Potential Drug Interaction Alert	Interaction detected between Metformin and newly prescribed medication. Monitor glucose levels closely and consider dosage adjustment.	high	t	0.92	{"references": ["Drug Interaction Database", "FDA Guidelines"], "suggestedActions": ["Monitor blood glucose", "Review medication timing", "Patient education"], "relatedConditions": ["Type 2 Diabetes", "Drug Interaction"]}	active	pending	2025-10-02 12:59:28.140627
18	2	1	treatment_suggestion	Hypertension Management Optimization	Current treatment plan shows good response. Consider adding lifestyle interventions to potentially reduce medication dependency.	low	f	0.78	{"references": ["JNC 8 Guidelines", "AHA Lifestyle Guidelines"], "suggestedActions": ["DASH diet counseling", "Regular exercise program", "Weight management"], "relatedConditions": ["Hypertension", "ACE Inhibitor Therapy"]}	active	pending	2025-10-02 12:59:28.140627
19	2	2	preventive_care	Diabetic Screening Recommendations	Patient due for annual diabetic complications screening. Schedule eye exam, foot examination, and kidney function tests.	medium	t	0.95	{"references": ["ADA Standards of Care", "Diabetic Complications Guidelines"], "suggestedActions": ["Ophthalmology referral", "Podiatry consultation", "Lab work: HbA1c, microalbumin"], "relatedConditions": ["Type 2 Diabetes", "Preventive Care"]}	active	pending	2025-10-02 12:59:28.140627
20	2	1	risk_alert	Medication Adherence Concern	AI analysis of prescription refill patterns suggests potential adherence issues. Patient may benefit from medication management support.	medium	t	0.73	{"references": ["Medication Adherence Guidelines", "Patient Education Resources"], "suggestedActions": ["Adherence counseling", "Pill organizer", "Follow-up call"], "relatedConditions": ["Medication Adherence", "Hypertension"]}	active	pending	2025-10-02 12:59:28.140627
21	2	1	risk_alert	Cardiovascular Risk Assessment	Based on recent blood pressure readings and family history, patient shows elevated cardiovascular risk factors. Consider lifestyle modifications and medication review.	medium	t	0.85	{"references": ["AHA Guidelines 2023", "ESC Guidelines"], "suggestedActions": ["Diet consultation", "Exercise program", "Medication review"], "relatedConditions": ["Hypertension", "Family History CVD"]}	active	pending	2025-10-02 13:38:45.322669
22	2	2	drug_interaction	Potential Drug Interaction Alert	Interaction detected between Metformin and newly prescribed medication. Monitor glucose levels closely and consider dosage adjustment.	high	t	0.92	{"references": ["Drug Interaction Database", "FDA Guidelines"], "suggestedActions": ["Monitor blood glucose", "Review medication timing", "Patient education"], "relatedConditions": ["Type 2 Diabetes", "Drug Interaction"]}	active	pending	2025-10-02 13:38:45.322669
23	2	1	treatment_suggestion	Hypertension Management Optimization	Current treatment plan shows good response. Consider adding lifestyle interventions to potentially reduce medication dependency.	low	f	0.78	{"references": ["JNC 8 Guidelines", "AHA Lifestyle Guidelines"], "suggestedActions": ["DASH diet counseling", "Regular exercise program", "Weight management"], "relatedConditions": ["Hypertension", "ACE Inhibitor Therapy"]}	active	pending	2025-10-02 13:38:45.322669
24	2	2	preventive_care	Diabetic Screening Recommendations	Patient due for annual diabetic complications screening. Schedule eye exam, foot examination, and kidney function tests.	medium	t	0.95	{"references": ["ADA Standards of Care", "Diabetic Complications Guidelines"], "suggestedActions": ["Ophthalmology referral", "Podiatry consultation", "Lab work: HbA1c, microalbumin"], "relatedConditions": ["Type 2 Diabetes", "Preventive Care"]}	active	pending	2025-10-02 13:38:45.322669
25	2	1	risk_alert	Medication Adherence Concern	AI analysis of prescription refill patterns suggests potential adherence issues. Patient may benefit from medication management support.	medium	t	0.73	{"references": ["Medication Adherence Guidelines", "Patient Education Resources"], "suggestedActions": ["Adherence counseling", "Pill organizer", "Follow-up call"], "relatedConditions": ["Medication Adherence", "Hypertension"]}	active	pending	2025-10-02 13:38:45.322669
26	2	1	risk_alert	Cardiovascular Risk Assessment	Based on recent blood pressure readings and family history, patient shows elevated cardiovascular risk factors. Consider lifestyle modifications and medication review.	medium	t	0.85	{"references": ["AHA Guidelines 2023", "ESC Guidelines"], "suggestedActions": ["Diet consultation", "Exercise program", "Medication review"], "relatedConditions": ["Hypertension", "Family History CVD"]}	active	pending	2025-10-02 13:39:43.208571
27	2	2	drug_interaction	Potential Drug Interaction Alert	Interaction detected between Metformin and newly prescribed medication. Monitor glucose levels closely and consider dosage adjustment.	high	t	0.92	{"references": ["Drug Interaction Database", "FDA Guidelines"], "suggestedActions": ["Monitor blood glucose", "Review medication timing", "Patient education"], "relatedConditions": ["Type 2 Diabetes", "Drug Interaction"]}	active	pending	2025-10-02 13:39:43.208571
28	2	1	treatment_suggestion	Hypertension Management Optimization	Current treatment plan shows good response. Consider adding lifestyle interventions to potentially reduce medication dependency.	low	f	0.78	{"references": ["JNC 8 Guidelines", "AHA Lifestyle Guidelines"], "suggestedActions": ["DASH diet counseling", "Regular exercise program", "Weight management"], "relatedConditions": ["Hypertension", "ACE Inhibitor Therapy"]}	active	pending	2025-10-02 13:39:43.208571
29	2	2	preventive_care	Diabetic Screening Recommendations	Patient due for annual diabetic complications screening. Schedule eye exam, foot examination, and kidney function tests.	medium	t	0.95	{"references": ["ADA Standards of Care", "Diabetic Complications Guidelines"], "suggestedActions": ["Ophthalmology referral", "Podiatry consultation", "Lab work: HbA1c, microalbumin"], "relatedConditions": ["Type 2 Diabetes", "Preventive Care"]}	active	pending	2025-10-02 13:39:43.208571
30	2	1	risk_alert	Medication Adherence Concern	AI analysis of prescription refill patterns suggests potential adherence issues. Patient may benefit from medication management support.	medium	t	0.73	{"references": ["Medication Adherence Guidelines", "Patient Education Resources"], "suggestedActions": ["Adherence counseling", "Pill organizer", "Follow-up call"], "relatedConditions": ["Medication Adherence", "Hypertension"]}	active	pending	2025-10-02 13:39:43.208571
31	2	1	risk_alert	Cardiovascular Risk Assessment	Based on recent blood pressure readings and family history, patient shows elevated cardiovascular risk factors. Consider lifestyle modifications and medication review.	medium	t	0.85	{"references": ["AHA Guidelines 2023", "ESC Guidelines"], "suggestedActions": ["Diet consultation", "Exercise program", "Medication review"], "relatedConditions": ["Hypertension", "Family History CVD"]}	active	pending	2025-10-02 13:46:45.445222
32	2	2	drug_interaction	Potential Drug Interaction Alert	Interaction detected between Metformin and newly prescribed medication. Monitor glucose levels closely and consider dosage adjustment.	high	t	0.92	{"references": ["Drug Interaction Database", "FDA Guidelines"], "suggestedActions": ["Monitor blood glucose", "Review medication timing", "Patient education"], "relatedConditions": ["Type 2 Diabetes", "Drug Interaction"]}	active	pending	2025-10-02 13:46:45.445222
33	2	1	treatment_suggestion	Hypertension Management Optimization	Current treatment plan shows good response. Consider adding lifestyle interventions to potentially reduce medication dependency.	low	f	0.78	{"references": ["JNC 8 Guidelines", "AHA Lifestyle Guidelines"], "suggestedActions": ["DASH diet counseling", "Regular exercise program", "Weight management"], "relatedConditions": ["Hypertension", "ACE Inhibitor Therapy"]}	active	pending	2025-10-02 13:46:45.445222
34	2	2	preventive_care	Diabetic Screening Recommendations	Patient due for annual diabetic complications screening. Schedule eye exam, foot examination, and kidney function tests.	medium	t	0.95	{"references": ["ADA Standards of Care", "Diabetic Complications Guidelines"], "suggestedActions": ["Ophthalmology referral", "Podiatry consultation", "Lab work: HbA1c, microalbumin"], "relatedConditions": ["Type 2 Diabetes", "Preventive Care"]}	active	pending	2025-10-02 13:46:45.445222
35	2	1	risk_alert	Medication Adherence Concern	AI analysis of prescription refill patterns suggests potential adherence issues. Patient may benefit from medication management support.	medium	t	0.73	{"references": ["Medication Adherence Guidelines", "Patient Education Resources"], "suggestedActions": ["Adherence counseling", "Pill organizer", "Follow-up call"], "relatedConditions": ["Medication Adherence", "Hypertension"]}	active	pending	2025-10-02 13:46:45.445222
36	2	1	risk_alert	Cardiovascular Risk Assessment	Based on recent blood pressure readings and family history, patient shows elevated cardiovascular risk factors. Consider lifestyle modifications and medication review.	medium	t	0.85	{"references": ["AHA Guidelines 2023", "ESC Guidelines"], "suggestedActions": ["Diet consultation", "Exercise program", "Medication review"], "relatedConditions": ["Hypertension", "Family History CVD"]}	active	pending	2025-10-02 13:48:21.569573
37	2	2	drug_interaction	Potential Drug Interaction Alert	Interaction detected between Metformin and newly prescribed medication. Monitor glucose levels closely and consider dosage adjustment.	high	t	0.92	{"references": ["Drug Interaction Database", "FDA Guidelines"], "suggestedActions": ["Monitor blood glucose", "Review medication timing", "Patient education"], "relatedConditions": ["Type 2 Diabetes", "Drug Interaction"]}	active	pending	2025-10-02 13:48:21.569573
38	2	1	treatment_suggestion	Hypertension Management Optimization	Current treatment plan shows good response. Consider adding lifestyle interventions to potentially reduce medication dependency.	low	f	0.78	{"references": ["JNC 8 Guidelines", "AHA Lifestyle Guidelines"], "suggestedActions": ["DASH diet counseling", "Regular exercise program", "Weight management"], "relatedConditions": ["Hypertension", "ACE Inhibitor Therapy"]}	active	pending	2025-10-02 13:48:21.569573
39	2	2	preventive_care	Diabetic Screening Recommendations	Patient due for annual diabetic complications screening. Schedule eye exam, foot examination, and kidney function tests.	medium	t	0.95	{"references": ["ADA Standards of Care", "Diabetic Complications Guidelines"], "suggestedActions": ["Ophthalmology referral", "Podiatry consultation", "Lab work: HbA1c, microalbumin"], "relatedConditions": ["Type 2 Diabetes", "Preventive Care"]}	active	pending	2025-10-02 13:48:21.569573
40	2	1	risk_alert	Medication Adherence Concern	AI analysis of prescription refill patterns suggests potential adherence issues. Patient may benefit from medication management support.	medium	t	0.73	{"references": ["Medication Adherence Guidelines", "Patient Education Resources"], "suggestedActions": ["Adherence counseling", "Pill organizer", "Follow-up call"], "relatedConditions": ["Medication Adherence", "Hypertension"]}	active	pending	2025-10-02 13:48:21.569573
41	2	1	risk_alert	Cardiovascular Risk Assessment	Based on recent blood pressure readings and family history, patient shows elevated cardiovascular risk factors. Consider lifestyle modifications and medication review.	medium	t	0.85	{"references": ["AHA Guidelines 2023", "ESC Guidelines"], "suggestedActions": ["Diet consultation", "Exercise program", "Medication review"], "relatedConditions": ["Hypertension", "Family History CVD"]}	active	pending	2025-10-02 14:23:07.364269
42	2	2	drug_interaction	Potential Drug Interaction Alert	Interaction detected between Metformin and newly prescribed medication. Monitor glucose levels closely and consider dosage adjustment.	high	t	0.92	{"references": ["Drug Interaction Database", "FDA Guidelines"], "suggestedActions": ["Monitor blood glucose", "Review medication timing", "Patient education"], "relatedConditions": ["Type 2 Diabetes", "Drug Interaction"]}	active	pending	2025-10-02 14:23:07.364269
43	2	1	treatment_suggestion	Hypertension Management Optimization	Current treatment plan shows good response. Consider adding lifestyle interventions to potentially reduce medication dependency.	low	f	0.78	{"references": ["JNC 8 Guidelines", "AHA Lifestyle Guidelines"], "suggestedActions": ["DASH diet counseling", "Regular exercise program", "Weight management"], "relatedConditions": ["Hypertension", "ACE Inhibitor Therapy"]}	active	pending	2025-10-02 14:23:07.364269
44	2	2	preventive_care	Diabetic Screening Recommendations	Patient due for annual diabetic complications screening. Schedule eye exam, foot examination, and kidney function tests.	medium	t	0.95	{"references": ["ADA Standards of Care", "Diabetic Complications Guidelines"], "suggestedActions": ["Ophthalmology referral", "Podiatry consultation", "Lab work: HbA1c, microalbumin"], "relatedConditions": ["Type 2 Diabetes", "Preventive Care"]}	active	pending	2025-10-02 14:23:07.364269
45	2	1	risk_alert	Medication Adherence Concern	AI analysis of prescription refill patterns suggests potential adherence issues. Patient may benefit from medication management support.	medium	t	0.73	{"references": ["Medication Adherence Guidelines", "Patient Education Resources"], "suggestedActions": ["Adherence counseling", "Pill organizer", "Follow-up call"], "relatedConditions": ["Medication Adherence", "Hypertension"]}	active	pending	2025-10-02 14:23:07.364269
46	2	1	risk_alert	Cardiovascular Risk Assessment	Based on recent blood pressure readings and family history, patient shows elevated cardiovascular risk factors. Consider lifestyle modifications and medication review.	medium	t	0.85	{"references": ["AHA Guidelines 2023", "ESC Guidelines"], "suggestedActions": ["Diet consultation", "Exercise program", "Medication review"], "relatedConditions": ["Hypertension", "Family History CVD"]}	active	pending	2025-10-02 14:51:47.376972
47	2	2	drug_interaction	Potential Drug Interaction Alert	Interaction detected between Metformin and newly prescribed medication. Monitor glucose levels closely and consider dosage adjustment.	high	t	0.92	{"references": ["Drug Interaction Database", "FDA Guidelines"], "suggestedActions": ["Monitor blood glucose", "Review medication timing", "Patient education"], "relatedConditions": ["Type 2 Diabetes", "Drug Interaction"]}	active	pending	2025-10-02 14:51:47.376972
48	2	1	treatment_suggestion	Hypertension Management Optimization	Current treatment plan shows good response. Consider adding lifestyle interventions to potentially reduce medication dependency.	low	f	0.78	{"references": ["JNC 8 Guidelines", "AHA Lifestyle Guidelines"], "suggestedActions": ["DASH diet counseling", "Regular exercise program", "Weight management"], "relatedConditions": ["Hypertension", "ACE Inhibitor Therapy"]}	active	pending	2025-10-02 14:51:47.376972
49	2	2	preventive_care	Diabetic Screening Recommendations	Patient due for annual diabetic complications screening. Schedule eye exam, foot examination, and kidney function tests.	medium	t	0.95	{"references": ["ADA Standards of Care", "Diabetic Complications Guidelines"], "suggestedActions": ["Ophthalmology referral", "Podiatry consultation", "Lab work: HbA1c, microalbumin"], "relatedConditions": ["Type 2 Diabetes", "Preventive Care"]}	active	pending	2025-10-02 14:51:47.376972
50	2	1	risk_alert	Medication Adherence Concern	AI analysis of prescription refill patterns suggests potential adherence issues. Patient may benefit from medication management support.	medium	t	0.73	{"references": ["Medication Adherence Guidelines", "Patient Education Resources"], "suggestedActions": ["Adherence counseling", "Pill organizer", "Follow-up call"], "relatedConditions": ["Medication Adherence", "Hypertension"]}	active	pending	2025-10-02 14:51:47.376972
51	2	1	risk_alert	Cardiovascular Risk Assessment	Based on recent blood pressure readings and family history, patient shows elevated cardiovascular risk factors. Consider lifestyle modifications and medication review.	medium	t	0.85	{"references": ["AHA Guidelines 2023", "ESC Guidelines"], "suggestedActions": ["Diet consultation", "Exercise program", "Medication review"], "relatedConditions": ["Hypertension", "Family History CVD"]}	active	pending	2025-10-02 15:06:04.392
52	2	2	drug_interaction	Potential Drug Interaction Alert	Interaction detected between Metformin and newly prescribed medication. Monitor glucose levels closely and consider dosage adjustment.	high	t	0.92	{"references": ["Drug Interaction Database", "FDA Guidelines"], "suggestedActions": ["Monitor blood glucose", "Review medication timing", "Patient education"], "relatedConditions": ["Type 2 Diabetes", "Drug Interaction"]}	active	pending	2025-10-02 15:06:04.392
53	2	1	treatment_suggestion	Hypertension Management Optimization	Current treatment plan shows good response. Consider adding lifestyle interventions to potentially reduce medication dependency.	low	f	0.78	{"references": ["JNC 8 Guidelines", "AHA Lifestyle Guidelines"], "suggestedActions": ["DASH diet counseling", "Regular exercise program", "Weight management"], "relatedConditions": ["Hypertension", "ACE Inhibitor Therapy"]}	active	pending	2025-10-02 15:06:04.392
54	2	2	preventive_care	Diabetic Screening Recommendations	Patient due for annual diabetic complications screening. Schedule eye exam, foot examination, and kidney function tests.	medium	t	0.95	{"references": ["ADA Standards of Care", "Diabetic Complications Guidelines"], "suggestedActions": ["Ophthalmology referral", "Podiatry consultation", "Lab work: HbA1c, microalbumin"], "relatedConditions": ["Type 2 Diabetes", "Preventive Care"]}	active	pending	2025-10-02 15:06:04.392
55	2	1	risk_alert	Medication Adherence Concern	AI analysis of prescription refill patterns suggests potential adherence issues. Patient may benefit from medication management support.	medium	t	0.73	{"references": ["Medication Adherence Guidelines", "Patient Education Resources"], "suggestedActions": ["Adherence counseling", "Pill organizer", "Follow-up call"], "relatedConditions": ["Medication Adherence", "Hypertension"]}	active	pending	2025-10-02 15:06:04.392
56	2	1	risk_alert	Cardiovascular Risk Assessment	Based on recent blood pressure readings and family history, patient shows elevated cardiovascular risk factors. Consider lifestyle modifications and medication review.	medium	t	0.85	{"references": ["AHA Guidelines 2023", "ESC Guidelines"], "suggestedActions": ["Diet consultation", "Exercise program", "Medication review"], "relatedConditions": ["Hypertension", "Family History CVD"]}	active	pending	2025-10-02 15:17:32.128153
57	2	2	drug_interaction	Potential Drug Interaction Alert	Interaction detected between Metformin and newly prescribed medication. Monitor glucose levels closely and consider dosage adjustment.	high	t	0.92	{"references": ["Drug Interaction Database", "FDA Guidelines"], "suggestedActions": ["Monitor blood glucose", "Review medication timing", "Patient education"], "relatedConditions": ["Type 2 Diabetes", "Drug Interaction"]}	active	pending	2025-10-02 15:17:32.128153
58	2	1	treatment_suggestion	Hypertension Management Optimization	Current treatment plan shows good response. Consider adding lifestyle interventions to potentially reduce medication dependency.	low	f	0.78	{"references": ["JNC 8 Guidelines", "AHA Lifestyle Guidelines"], "suggestedActions": ["DASH diet counseling", "Regular exercise program", "Weight management"], "relatedConditions": ["Hypertension", "ACE Inhibitor Therapy"]}	active	pending	2025-10-02 15:17:32.128153
59	2	2	preventive_care	Diabetic Screening Recommendations	Patient due for annual diabetic complications screening. Schedule eye exam, foot examination, and kidney function tests.	medium	t	0.95	{"references": ["ADA Standards of Care", "Diabetic Complications Guidelines"], "suggestedActions": ["Ophthalmology referral", "Podiatry consultation", "Lab work: HbA1c, microalbumin"], "relatedConditions": ["Type 2 Diabetes", "Preventive Care"]}	active	pending	2025-10-02 15:17:32.128153
60	2	1	risk_alert	Medication Adherence Concern	AI analysis of prescription refill patterns suggests potential adherence issues. Patient may benefit from medication management support.	medium	t	0.73	{"references": ["Medication Adherence Guidelines", "Patient Education Resources"], "suggestedActions": ["Adherence counseling", "Pill organizer", "Follow-up call"], "relatedConditions": ["Medication Adherence", "Hypertension"]}	active	pending	2025-10-02 15:17:32.128153
61	2	1	risk_alert	Cardiovascular Risk Assessment	Based on recent blood pressure readings and family history, patient shows elevated cardiovascular risk factors. Consider lifestyle modifications and medication review.	medium	t	0.85	{"references": ["AHA Guidelines 2023", "ESC Guidelines"], "suggestedActions": ["Diet consultation", "Exercise program", "Medication review"], "relatedConditions": ["Hypertension", "Family History CVD"]}	active	pending	2025-10-03 03:18:55.254328
62	2	2	drug_interaction	Potential Drug Interaction Alert	Interaction detected between Metformin and newly prescribed medication. Monitor glucose levels closely and consider dosage adjustment.	high	t	0.92	{"references": ["Drug Interaction Database", "FDA Guidelines"], "suggestedActions": ["Monitor blood glucose", "Review medication timing", "Patient education"], "relatedConditions": ["Type 2 Diabetes", "Drug Interaction"]}	active	pending	2025-10-03 03:18:55.254328
63	2	1	treatment_suggestion	Hypertension Management Optimization	Current treatment plan shows good response. Consider adding lifestyle interventions to potentially reduce medication dependency.	low	f	0.78	{"references": ["JNC 8 Guidelines", "AHA Lifestyle Guidelines"], "suggestedActions": ["DASH diet counseling", "Regular exercise program", "Weight management"], "relatedConditions": ["Hypertension", "ACE Inhibitor Therapy"]}	active	pending	2025-10-03 03:18:55.254328
64	2	2	preventive_care	Diabetic Screening Recommendations	Patient due for annual diabetic complications screening. Schedule eye exam, foot examination, and kidney function tests.	medium	t	0.95	{"references": ["ADA Standards of Care", "Diabetic Complications Guidelines"], "suggestedActions": ["Ophthalmology referral", "Podiatry consultation", "Lab work: HbA1c, microalbumin"], "relatedConditions": ["Type 2 Diabetes", "Preventive Care"]}	active	pending	2025-10-03 03:18:55.254328
65	2	1	risk_alert	Medication Adherence Concern	AI analysis of prescription refill patterns suggests potential adherence issues. Patient may benefit from medication management support.	medium	t	0.73	{"references": ["Medication Adherence Guidelines", "Patient Education Resources"], "suggestedActions": ["Adherence counseling", "Pill organizer", "Follow-up call"], "relatedConditions": ["Medication Adherence", "Hypertension"]}	active	pending	2025-10-03 03:18:55.254328
66	2	1	risk_alert	Cardiovascular Risk Assessment	Based on recent blood pressure readings and family history, patient shows elevated cardiovascular risk factors. Consider lifestyle modifications and medication review.	medium	t	0.85	{"references": ["AHA Guidelines 2023", "ESC Guidelines"], "suggestedActions": ["Diet consultation", "Exercise program", "Medication review"], "relatedConditions": ["Hypertension", "Family History CVD"]}	active	pending	2025-10-03 03:50:28.102982
67	2	2	drug_interaction	Potential Drug Interaction Alert	Interaction detected between Metformin and newly prescribed medication. Monitor glucose levels closely and consider dosage adjustment.	high	t	0.92	{"references": ["Drug Interaction Database", "FDA Guidelines"], "suggestedActions": ["Monitor blood glucose", "Review medication timing", "Patient education"], "relatedConditions": ["Type 2 Diabetes", "Drug Interaction"]}	active	pending	2025-10-03 03:50:28.102982
68	2	1	treatment_suggestion	Hypertension Management Optimization	Current treatment plan shows good response. Consider adding lifestyle interventions to potentially reduce medication dependency.	low	f	0.78	{"references": ["JNC 8 Guidelines", "AHA Lifestyle Guidelines"], "suggestedActions": ["DASH diet counseling", "Regular exercise program", "Weight management"], "relatedConditions": ["Hypertension", "ACE Inhibitor Therapy"]}	active	pending	2025-10-03 03:50:28.102982
69	2	2	preventive_care	Diabetic Screening Recommendations	Patient due for annual diabetic complications screening. Schedule eye exam, foot examination, and kidney function tests.	medium	t	0.95	{"references": ["ADA Standards of Care", "Diabetic Complications Guidelines"], "suggestedActions": ["Ophthalmology referral", "Podiatry consultation", "Lab work: HbA1c, microalbumin"], "relatedConditions": ["Type 2 Diabetes", "Preventive Care"]}	active	pending	2025-10-03 03:50:28.102982
70	2	1	risk_alert	Medication Adherence Concern	AI analysis of prescription refill patterns suggests potential adherence issues. Patient may benefit from medication management support.	medium	t	0.73	{"references": ["Medication Adherence Guidelines", "Patient Education Resources"], "suggestedActions": ["Adherence counseling", "Pill organizer", "Follow-up call"], "relatedConditions": ["Medication Adherence", "Hypertension"]}	active	pending	2025-10-03 03:50:28.102982
71	2	1	risk_alert	Cardiovascular Risk Assessment	Based on recent blood pressure readings and family history, patient shows elevated cardiovascular risk factors. Consider lifestyle modifications and medication review.	medium	t	0.85	{"references": ["AHA Guidelines 2023", "ESC Guidelines"], "suggestedActions": ["Diet consultation", "Exercise program", "Medication review"], "relatedConditions": ["Hypertension", "Family History CVD"]}	active	pending	2025-10-03 04:19:27.805569
72	2	2	drug_interaction	Potential Drug Interaction Alert	Interaction detected between Metformin and newly prescribed medication. Monitor glucose levels closely and consider dosage adjustment.	high	t	0.92	{"references": ["Drug Interaction Database", "FDA Guidelines"], "suggestedActions": ["Monitor blood glucose", "Review medication timing", "Patient education"], "relatedConditions": ["Type 2 Diabetes", "Drug Interaction"]}	active	pending	2025-10-03 04:19:27.805569
73	2	1	treatment_suggestion	Hypertension Management Optimization	Current treatment plan shows good response. Consider adding lifestyle interventions to potentially reduce medication dependency.	low	f	0.78	{"references": ["JNC 8 Guidelines", "AHA Lifestyle Guidelines"], "suggestedActions": ["DASH diet counseling", "Regular exercise program", "Weight management"], "relatedConditions": ["Hypertension", "ACE Inhibitor Therapy"]}	active	pending	2025-10-03 04:19:27.805569
74	2	2	preventive_care	Diabetic Screening Recommendations	Patient due for annual diabetic complications screening. Schedule eye exam, foot examination, and kidney function tests.	medium	t	0.95	{"references": ["ADA Standards of Care", "Diabetic Complications Guidelines"], "suggestedActions": ["Ophthalmology referral", "Podiatry consultation", "Lab work: HbA1c, microalbumin"], "relatedConditions": ["Type 2 Diabetes", "Preventive Care"]}	active	pending	2025-10-03 04:19:27.805569
75	2	1	risk_alert	Medication Adherence Concern	AI analysis of prescription refill patterns suggests potential adherence issues. Patient may benefit from medication management support.	medium	t	0.73	{"references": ["Medication Adherence Guidelines", "Patient Education Resources"], "suggestedActions": ["Adherence counseling", "Pill organizer", "Follow-up call"], "relatedConditions": ["Medication Adherence", "Hypertension"]}	active	pending	2025-10-03 04:19:27.805569
76	2	1	risk_alert	Cardiovascular Risk Assessment	Based on recent blood pressure readings and family history, patient shows elevated cardiovascular risk factors. Consider lifestyle modifications and medication review.	medium	t	0.85	{"references": ["AHA Guidelines 2023", "ESC Guidelines"], "suggestedActions": ["Diet consultation", "Exercise program", "Medication review"], "relatedConditions": ["Hypertension", "Family History CVD"]}	active	pending	2025-10-03 04:50:15.743675
77	2	2	drug_interaction	Potential Drug Interaction Alert	Interaction detected between Metformin and newly prescribed medication. Monitor glucose levels closely and consider dosage adjustment.	high	t	0.92	{"references": ["Drug Interaction Database", "FDA Guidelines"], "suggestedActions": ["Monitor blood glucose", "Review medication timing", "Patient education"], "relatedConditions": ["Type 2 Diabetes", "Drug Interaction"]}	active	pending	2025-10-03 04:50:15.743675
78	2	1	treatment_suggestion	Hypertension Management Optimization	Current treatment plan shows good response. Consider adding lifestyle interventions to potentially reduce medication dependency.	low	f	0.78	{"references": ["JNC 8 Guidelines", "AHA Lifestyle Guidelines"], "suggestedActions": ["DASH diet counseling", "Regular exercise program", "Weight management"], "relatedConditions": ["Hypertension", "ACE Inhibitor Therapy"]}	active	pending	2025-10-03 04:50:15.743675
79	2	2	preventive_care	Diabetic Screening Recommendations	Patient due for annual diabetic complications screening. Schedule eye exam, foot examination, and kidney function tests.	medium	t	0.95	{"references": ["ADA Standards of Care", "Diabetic Complications Guidelines"], "suggestedActions": ["Ophthalmology referral", "Podiatry consultation", "Lab work: HbA1c, microalbumin"], "relatedConditions": ["Type 2 Diabetes", "Preventive Care"]}	active	pending	2025-10-03 04:50:15.743675
80	2	1	risk_alert	Medication Adherence Concern	AI analysis of prescription refill patterns suggests potential adherence issues. Patient may benefit from medication management support.	medium	t	0.73	{"references": ["Medication Adherence Guidelines", "Patient Education Resources"], "suggestedActions": ["Adherence counseling", "Pill organizer", "Follow-up call"], "relatedConditions": ["Medication Adherence", "Hypertension"]}	active	pending	2025-10-03 04:50:15.743675
81	2	1	risk_alert	Cardiovascular Risk Assessment	Based on recent blood pressure readings and family history, patient shows elevated cardiovascular risk factors. Consider lifestyle modifications and medication review.	medium	t	0.85	{"references": ["AHA Guidelines 2023", "ESC Guidelines"], "suggestedActions": ["Diet consultation", "Exercise program", "Medication review"], "relatedConditions": ["Hypertension", "Family History CVD"]}	active	pending	2025-10-03 05:08:55.485509
82	2	2	drug_interaction	Potential Drug Interaction Alert	Interaction detected between Metformin and newly prescribed medication. Monitor glucose levels closely and consider dosage adjustment.	high	t	0.92	{"references": ["Drug Interaction Database", "FDA Guidelines"], "suggestedActions": ["Monitor blood glucose", "Review medication timing", "Patient education"], "relatedConditions": ["Type 2 Diabetes", "Drug Interaction"]}	active	pending	2025-10-03 05:08:55.485509
83	2	1	treatment_suggestion	Hypertension Management Optimization	Current treatment plan shows good response. Consider adding lifestyle interventions to potentially reduce medication dependency.	low	f	0.78	{"references": ["JNC 8 Guidelines", "AHA Lifestyle Guidelines"], "suggestedActions": ["DASH diet counseling", "Regular exercise program", "Weight management"], "relatedConditions": ["Hypertension", "ACE Inhibitor Therapy"]}	active	pending	2025-10-03 05:08:55.485509
84	2	2	preventive_care	Diabetic Screening Recommendations	Patient due for annual diabetic complications screening. Schedule eye exam, foot examination, and kidney function tests.	medium	t	0.95	{"references": ["ADA Standards of Care", "Diabetic Complications Guidelines"], "suggestedActions": ["Ophthalmology referral", "Podiatry consultation", "Lab work: HbA1c, microalbumin"], "relatedConditions": ["Type 2 Diabetes", "Preventive Care"]}	active	pending	2025-10-03 05:08:55.485509
85	2	1	risk_alert	Medication Adherence Concern	AI analysis of prescription refill patterns suggests potential adherence issues. Patient may benefit from medication management support.	medium	t	0.73	{"references": ["Medication Adherence Guidelines", "Patient Education Resources"], "suggestedActions": ["Adherence counseling", "Pill organizer", "Follow-up call"], "relatedConditions": ["Medication Adherence", "Hypertension"]}	active	pending	2025-10-03 05:08:55.485509
86	2	1	risk_alert	Cardiovascular Risk Assessment	Based on recent blood pressure readings and family history, patient shows elevated cardiovascular risk factors. Consider lifestyle modifications and medication review.	medium	t	0.85	{"references": ["AHA Guidelines 2023", "ESC Guidelines"], "suggestedActions": ["Diet consultation", "Exercise program", "Medication review"], "relatedConditions": ["Hypertension", "Family History CVD"]}	active	pending	2025-10-03 05:14:32.012809
87	2	2	drug_interaction	Potential Drug Interaction Alert	Interaction detected between Metformin and newly prescribed medication. Monitor glucose levels closely and consider dosage adjustment.	high	t	0.92	{"references": ["Drug Interaction Database", "FDA Guidelines"], "suggestedActions": ["Monitor blood glucose", "Review medication timing", "Patient education"], "relatedConditions": ["Type 2 Diabetes", "Drug Interaction"]}	active	pending	2025-10-03 05:14:32.012809
88	2	1	treatment_suggestion	Hypertension Management Optimization	Current treatment plan shows good response. Consider adding lifestyle interventions to potentially reduce medication dependency.	low	f	0.78	{"references": ["JNC 8 Guidelines", "AHA Lifestyle Guidelines"], "suggestedActions": ["DASH diet counseling", "Regular exercise program", "Weight management"], "relatedConditions": ["Hypertension", "ACE Inhibitor Therapy"]}	active	pending	2025-10-03 05:14:32.012809
89	2	2	preventive_care	Diabetic Screening Recommendations	Patient due for annual diabetic complications screening. Schedule eye exam, foot examination, and kidney function tests.	medium	t	0.95	{"references": ["ADA Standards of Care", "Diabetic Complications Guidelines"], "suggestedActions": ["Ophthalmology referral", "Podiatry consultation", "Lab work: HbA1c, microalbumin"], "relatedConditions": ["Type 2 Diabetes", "Preventive Care"]}	active	pending	2025-10-03 05:14:32.012809
90	2	1	risk_alert	Medication Adherence Concern	AI analysis of prescription refill patterns suggests potential adherence issues. Patient may benefit from medication management support.	medium	t	0.73	{"references": ["Medication Adherence Guidelines", "Patient Education Resources"], "suggestedActions": ["Adherence counseling", "Pill organizer", "Follow-up call"], "relatedConditions": ["Medication Adherence", "Hypertension"]}	active	pending	2025-10-03 05:14:32.012809
91	2	1	risk_alert	Cardiovascular Risk Assessment	Based on recent blood pressure readings and family history, patient shows elevated cardiovascular risk factors. Consider lifestyle modifications and medication review.	medium	t	0.85	{"references": ["AHA Guidelines 2023", "ESC Guidelines"], "suggestedActions": ["Diet consultation", "Exercise program", "Medication review"], "relatedConditions": ["Hypertension", "Family History CVD"]}	active	pending	2025-10-03 05:30:34.905999
92	2	2	drug_interaction	Potential Drug Interaction Alert	Interaction detected between Metformin and newly prescribed medication. Monitor glucose levels closely and consider dosage adjustment.	high	t	0.92	{"references": ["Drug Interaction Database", "FDA Guidelines"], "suggestedActions": ["Monitor blood glucose", "Review medication timing", "Patient education"], "relatedConditions": ["Type 2 Diabetes", "Drug Interaction"]}	active	pending	2025-10-03 05:30:34.905999
93	2	1	treatment_suggestion	Hypertension Management Optimization	Current treatment plan shows good response. Consider adding lifestyle interventions to potentially reduce medication dependency.	low	f	0.78	{"references": ["JNC 8 Guidelines", "AHA Lifestyle Guidelines"], "suggestedActions": ["DASH diet counseling", "Regular exercise program", "Weight management"], "relatedConditions": ["Hypertension", "ACE Inhibitor Therapy"]}	active	pending	2025-10-03 05:30:34.905999
94	2	2	preventive_care	Diabetic Screening Recommendations	Patient due for annual diabetic complications screening. Schedule eye exam, foot examination, and kidney function tests.	medium	t	0.95	{"references": ["ADA Standards of Care", "Diabetic Complications Guidelines"], "suggestedActions": ["Ophthalmology referral", "Podiatry consultation", "Lab work: HbA1c, microalbumin"], "relatedConditions": ["Type 2 Diabetes", "Preventive Care"]}	active	pending	2025-10-03 05:30:34.905999
95	2	1	risk_alert	Medication Adherence Concern	AI analysis of prescription refill patterns suggests potential adherence issues. Patient may benefit from medication management support.	medium	t	0.73	{"references": ["Medication Adherence Guidelines", "Patient Education Resources"], "suggestedActions": ["Adherence counseling", "Pill organizer", "Follow-up call"], "relatedConditions": ["Medication Adherence", "Hypertension"]}	active	pending	2025-10-03 05:30:34.905999
96	2	1	risk_alert	Cardiovascular Risk Assessment	Based on recent blood pressure readings and family history, patient shows elevated cardiovascular risk factors. Consider lifestyle modifications and medication review.	medium	t	0.85	{"references": ["AHA Guidelines 2023", "ESC Guidelines"], "suggestedActions": ["Diet consultation", "Exercise program", "Medication review"], "relatedConditions": ["Hypertension", "Family History CVD"]}	active	pending	2025-10-03 05:31:40.74996
97	2	2	drug_interaction	Potential Drug Interaction Alert	Interaction detected between Metformin and newly prescribed medication. Monitor glucose levels closely and consider dosage adjustment.	high	t	0.92	{"references": ["Drug Interaction Database", "FDA Guidelines"], "suggestedActions": ["Monitor blood glucose", "Review medication timing", "Patient education"], "relatedConditions": ["Type 2 Diabetes", "Drug Interaction"]}	active	pending	2025-10-03 05:31:40.74996
98	2	1	treatment_suggestion	Hypertension Management Optimization	Current treatment plan shows good response. Consider adding lifestyle interventions to potentially reduce medication dependency.	low	f	0.78	{"references": ["JNC 8 Guidelines", "AHA Lifestyle Guidelines"], "suggestedActions": ["DASH diet counseling", "Regular exercise program", "Weight management"], "relatedConditions": ["Hypertension", "ACE Inhibitor Therapy"]}	active	pending	2025-10-03 05:31:40.74996
99	2	2	preventive_care	Diabetic Screening Recommendations	Patient due for annual diabetic complications screening. Schedule eye exam, foot examination, and kidney function tests.	medium	t	0.95	{"references": ["ADA Standards of Care", "Diabetic Complications Guidelines"], "suggestedActions": ["Ophthalmology referral", "Podiatry consultation", "Lab work: HbA1c, microalbumin"], "relatedConditions": ["Type 2 Diabetes", "Preventive Care"]}	active	pending	2025-10-03 05:31:40.74996
100	2	1	risk_alert	Medication Adherence Concern	AI analysis of prescription refill patterns suggests potential adherence issues. Patient may benefit from medication management support.	medium	t	0.73	{"references": ["Medication Adherence Guidelines", "Patient Education Resources"], "suggestedActions": ["Adherence counseling", "Pill organizer", "Follow-up call"], "relatedConditions": ["Medication Adherence", "Hypertension"]}	active	pending	2025-10-03 05:31:40.74996
101	2	1	risk_alert	Cardiovascular Risk Assessment	Based on recent blood pressure readings and family history, patient shows elevated cardiovascular risk factors. Consider lifestyle modifications and medication review.	medium	t	0.85	{"references": ["AHA Guidelines 2023", "ESC Guidelines"], "suggestedActions": ["Diet consultation", "Exercise program", "Medication review"], "relatedConditions": ["Hypertension", "Family History CVD"]}	active	pending	2025-10-03 05:41:17.137818
102	2	2	drug_interaction	Potential Drug Interaction Alert	Interaction detected between Metformin and newly prescribed medication. Monitor glucose levels closely and consider dosage adjustment.	high	t	0.92	{"references": ["Drug Interaction Database", "FDA Guidelines"], "suggestedActions": ["Monitor blood glucose", "Review medication timing", "Patient education"], "relatedConditions": ["Type 2 Diabetes", "Drug Interaction"]}	active	pending	2025-10-03 05:41:17.137818
103	2	1	treatment_suggestion	Hypertension Management Optimization	Current treatment plan shows good response. Consider adding lifestyle interventions to potentially reduce medication dependency.	low	f	0.78	{"references": ["JNC 8 Guidelines", "AHA Lifestyle Guidelines"], "suggestedActions": ["DASH diet counseling", "Regular exercise program", "Weight management"], "relatedConditions": ["Hypertension", "ACE Inhibitor Therapy"]}	active	pending	2025-10-03 05:41:17.137818
104	2	2	preventive_care	Diabetic Screening Recommendations	Patient due for annual diabetic complications screening. Schedule eye exam, foot examination, and kidney function tests.	medium	t	0.95	{"references": ["ADA Standards of Care", "Diabetic Complications Guidelines"], "suggestedActions": ["Ophthalmology referral", "Podiatry consultation", "Lab work: HbA1c, microalbumin"], "relatedConditions": ["Type 2 Diabetes", "Preventive Care"]}	active	pending	2025-10-03 05:41:17.137818
105	2	1	risk_alert	Medication Adherence Concern	AI analysis of prescription refill patterns suggests potential adherence issues. Patient may benefit from medication management support.	medium	t	0.73	{"references": ["Medication Adherence Guidelines", "Patient Education Resources"], "suggestedActions": ["Adherence counseling", "Pill organizer", "Follow-up call"], "relatedConditions": ["Medication Adherence", "Hypertension"]}	active	pending	2025-10-03 05:41:17.137818
106	2	1	risk_alert	Cardiovascular Risk Assessment	Based on recent blood pressure readings and family history, patient shows elevated cardiovascular risk factors. Consider lifestyle modifications and medication review.	medium	t	0.85	{"references": ["AHA Guidelines 2023", "ESC Guidelines"], "suggestedActions": ["Diet consultation", "Exercise program", "Medication review"], "relatedConditions": ["Hypertension", "Family History CVD"]}	active	pending	2025-10-03 05:50:39.757606
107	2	2	drug_interaction	Potential Drug Interaction Alert	Interaction detected between Metformin and newly prescribed medication. Monitor glucose levels closely and consider dosage adjustment.	high	t	0.92	{"references": ["Drug Interaction Database", "FDA Guidelines"], "suggestedActions": ["Monitor blood glucose", "Review medication timing", "Patient education"], "relatedConditions": ["Type 2 Diabetes", "Drug Interaction"]}	active	pending	2025-10-03 05:50:39.757606
108	2	1	treatment_suggestion	Hypertension Management Optimization	Current treatment plan shows good response. Consider adding lifestyle interventions to potentially reduce medication dependency.	low	f	0.78	{"references": ["JNC 8 Guidelines", "AHA Lifestyle Guidelines"], "suggestedActions": ["DASH diet counseling", "Regular exercise program", "Weight management"], "relatedConditions": ["Hypertension", "ACE Inhibitor Therapy"]}	active	pending	2025-10-03 05:50:39.757606
109	2	2	preventive_care	Diabetic Screening Recommendations	Patient due for annual diabetic complications screening. Schedule eye exam, foot examination, and kidney function tests.	medium	t	0.95	{"references": ["ADA Standards of Care", "Diabetic Complications Guidelines"], "suggestedActions": ["Ophthalmology referral", "Podiatry consultation", "Lab work: HbA1c, microalbumin"], "relatedConditions": ["Type 2 Diabetes", "Preventive Care"]}	active	pending	2025-10-03 05:50:39.757606
110	2	1	risk_alert	Medication Adherence Concern	AI analysis of prescription refill patterns suggests potential adherence issues. Patient may benefit from medication management support.	medium	t	0.73	{"references": ["Medication Adherence Guidelines", "Patient Education Resources"], "suggestedActions": ["Adherence counseling", "Pill organizer", "Follow-up call"], "relatedConditions": ["Medication Adherence", "Hypertension"]}	active	pending	2025-10-03 05:50:39.757606
111	2	1	risk_alert	Cardiovascular Risk Assessment	Based on recent blood pressure readings and family history, patient shows elevated cardiovascular risk factors. Consider lifestyle modifications and medication review.	medium	t	0.85	{"references": ["AHA Guidelines 2023", "ESC Guidelines"], "suggestedActions": ["Diet consultation", "Exercise program", "Medication review"], "relatedConditions": ["Hypertension", "Family History CVD"]}	active	pending	2025-10-03 05:57:37.240446
112	2	2	drug_interaction	Potential Drug Interaction Alert	Interaction detected between Metformin and newly prescribed medication. Monitor glucose levels closely and consider dosage adjustment.	high	t	0.92	{"references": ["Drug Interaction Database", "FDA Guidelines"], "suggestedActions": ["Monitor blood glucose", "Review medication timing", "Patient education"], "relatedConditions": ["Type 2 Diabetes", "Drug Interaction"]}	active	pending	2025-10-03 05:57:37.240446
113	2	1	treatment_suggestion	Hypertension Management Optimization	Current treatment plan shows good response. Consider adding lifestyle interventions to potentially reduce medication dependency.	low	f	0.78	{"references": ["JNC 8 Guidelines", "AHA Lifestyle Guidelines"], "suggestedActions": ["DASH diet counseling", "Regular exercise program", "Weight management"], "relatedConditions": ["Hypertension", "ACE Inhibitor Therapy"]}	active	pending	2025-10-03 05:57:37.240446
114	2	2	preventive_care	Diabetic Screening Recommendations	Patient due for annual diabetic complications screening. Schedule eye exam, foot examination, and kidney function tests.	medium	t	0.95	{"references": ["ADA Standards of Care", "Diabetic Complications Guidelines"], "suggestedActions": ["Ophthalmology referral", "Podiatry consultation", "Lab work: HbA1c, microalbumin"], "relatedConditions": ["Type 2 Diabetes", "Preventive Care"]}	active	pending	2025-10-03 05:57:37.240446
115	2	1	risk_alert	Medication Adherence Concern	AI analysis of prescription refill patterns suggests potential adherence issues. Patient may benefit from medication management support.	medium	t	0.73	{"references": ["Medication Adherence Guidelines", "Patient Education Resources"], "suggestedActions": ["Adherence counseling", "Pill organizer", "Follow-up call"], "relatedConditions": ["Medication Adherence", "Hypertension"]}	active	pending	2025-10-03 05:57:37.240446
116	2	1	risk_alert	Cardiovascular Risk Assessment	Based on recent blood pressure readings and family history, patient shows elevated cardiovascular risk factors. Consider lifestyle modifications and medication review.	medium	t	0.85	{"references": ["AHA Guidelines 2023", "ESC Guidelines"], "suggestedActions": ["Diet consultation", "Exercise program", "Medication review"], "relatedConditions": ["Hypertension", "Family History CVD"]}	active	pending	2025-10-03 06:09:43.260175
117	2	2	drug_interaction	Potential Drug Interaction Alert	Interaction detected between Metformin and newly prescribed medication. Monitor glucose levels closely and consider dosage adjustment.	high	t	0.92	{"references": ["Drug Interaction Database", "FDA Guidelines"], "suggestedActions": ["Monitor blood glucose", "Review medication timing", "Patient education"], "relatedConditions": ["Type 2 Diabetes", "Drug Interaction"]}	active	pending	2025-10-03 06:09:43.260175
118	2	1	treatment_suggestion	Hypertension Management Optimization	Current treatment plan shows good response. Consider adding lifestyle interventions to potentially reduce medication dependency.	low	f	0.78	{"references": ["JNC 8 Guidelines", "AHA Lifestyle Guidelines"], "suggestedActions": ["DASH diet counseling", "Regular exercise program", "Weight management"], "relatedConditions": ["Hypertension", "ACE Inhibitor Therapy"]}	active	pending	2025-10-03 06:09:43.260175
119	2	2	preventive_care	Diabetic Screening Recommendations	Patient due for annual diabetic complications screening. Schedule eye exam, foot examination, and kidney function tests.	medium	t	0.95	{"references": ["ADA Standards of Care", "Diabetic Complications Guidelines"], "suggestedActions": ["Ophthalmology referral", "Podiatry consultation", "Lab work: HbA1c, microalbumin"], "relatedConditions": ["Type 2 Diabetes", "Preventive Care"]}	active	pending	2025-10-03 06:09:43.260175
120	2	1	risk_alert	Medication Adherence Concern	AI analysis of prescription refill patterns suggests potential adherence issues. Patient may benefit from medication management support.	medium	t	0.73	{"references": ["Medication Adherence Guidelines", "Patient Education Resources"], "suggestedActions": ["Adherence counseling", "Pill organizer", "Follow-up call"], "relatedConditions": ["Medication Adherence", "Hypertension"]}	active	pending	2025-10-03 06:09:43.260175
121	2	1	risk_alert	Cardiovascular Risk Assessment	Based on recent blood pressure readings and family history, patient shows elevated cardiovascular risk factors. Consider lifestyle modifications and medication review.	medium	t	0.85	{"references": ["AHA Guidelines 2023", "ESC Guidelines"], "suggestedActions": ["Diet consultation", "Exercise program", "Medication review"], "relatedConditions": ["Hypertension", "Family History CVD"]}	active	pending	2025-10-03 06:19:23.627211
122	2	2	drug_interaction	Potential Drug Interaction Alert	Interaction detected between Metformin and newly prescribed medication. Monitor glucose levels closely and consider dosage adjustment.	high	t	0.92	{"references": ["Drug Interaction Database", "FDA Guidelines"], "suggestedActions": ["Monitor blood glucose", "Review medication timing", "Patient education"], "relatedConditions": ["Type 2 Diabetes", "Drug Interaction"]}	active	pending	2025-10-03 06:19:23.627211
123	2	1	treatment_suggestion	Hypertension Management Optimization	Current treatment plan shows good response. Consider adding lifestyle interventions to potentially reduce medication dependency.	low	f	0.78	{"references": ["JNC 8 Guidelines", "AHA Lifestyle Guidelines"], "suggestedActions": ["DASH diet counseling", "Regular exercise program", "Weight management"], "relatedConditions": ["Hypertension", "ACE Inhibitor Therapy"]}	active	pending	2025-10-03 06:19:23.627211
124	2	2	preventive_care	Diabetic Screening Recommendations	Patient due for annual diabetic complications screening. Schedule eye exam, foot examination, and kidney function tests.	medium	t	0.95	{"references": ["ADA Standards of Care", "Diabetic Complications Guidelines"], "suggestedActions": ["Ophthalmology referral", "Podiatry consultation", "Lab work: HbA1c, microalbumin"], "relatedConditions": ["Type 2 Diabetes", "Preventive Care"]}	active	pending	2025-10-03 06:19:23.627211
125	2	1	risk_alert	Medication Adherence Concern	AI analysis of prescription refill patterns suggests potential adherence issues. Patient may benefit from medication management support.	medium	t	0.73	{"references": ["Medication Adherence Guidelines", "Patient Education Resources"], "suggestedActions": ["Adherence counseling", "Pill organizer", "Follow-up call"], "relatedConditions": ["Medication Adherence", "Hypertension"]}	active	pending	2025-10-03 06:19:23.627211
126	2	1	risk_alert	Cardiovascular Risk Assessment	Based on recent blood pressure readings and family history, patient shows elevated cardiovascular risk factors. Consider lifestyle modifications and medication review.	medium	t	0.85	{"references": ["AHA Guidelines 2023", "ESC Guidelines"], "suggestedActions": ["Diet consultation", "Exercise program", "Medication review"], "relatedConditions": ["Hypertension", "Family History CVD"]}	active	pending	2025-10-03 06:32:20.88584
127	2	2	drug_interaction	Potential Drug Interaction Alert	Interaction detected between Metformin and newly prescribed medication. Monitor glucose levels closely and consider dosage adjustment.	high	t	0.92	{"references": ["Drug Interaction Database", "FDA Guidelines"], "suggestedActions": ["Monitor blood glucose", "Review medication timing", "Patient education"], "relatedConditions": ["Type 2 Diabetes", "Drug Interaction"]}	active	pending	2025-10-03 06:32:20.88584
128	2	1	treatment_suggestion	Hypertension Management Optimization	Current treatment plan shows good response. Consider adding lifestyle interventions to potentially reduce medication dependency.	low	f	0.78	{"references": ["JNC 8 Guidelines", "AHA Lifestyle Guidelines"], "suggestedActions": ["DASH diet counseling", "Regular exercise program", "Weight management"], "relatedConditions": ["Hypertension", "ACE Inhibitor Therapy"]}	active	pending	2025-10-03 06:32:20.88584
129	2	2	preventive_care	Diabetic Screening Recommendations	Patient due for annual diabetic complications screening. Schedule eye exam, foot examination, and kidney function tests.	medium	t	0.95	{"references": ["ADA Standards of Care", "Diabetic Complications Guidelines"], "suggestedActions": ["Ophthalmology referral", "Podiatry consultation", "Lab work: HbA1c, microalbumin"], "relatedConditions": ["Type 2 Diabetes", "Preventive Care"]}	active	pending	2025-10-03 06:32:20.88584
130	2	1	risk_alert	Medication Adherence Concern	AI analysis of prescription refill patterns suggests potential adherence issues. Patient may benefit from medication management support.	medium	t	0.73	{"references": ["Medication Adherence Guidelines", "Patient Education Resources"], "suggestedActions": ["Adherence counseling", "Pill organizer", "Follow-up call"], "relatedConditions": ["Medication Adherence", "Hypertension"]}	active	pending	2025-10-03 06:32:20.88584
131	2	1	risk_alert	Cardiovascular Risk Assessment	Based on recent blood pressure readings and family history, patient shows elevated cardiovascular risk factors. Consider lifestyle modifications and medication review.	medium	t	0.85	{"references": ["AHA Guidelines 2023", "ESC Guidelines"], "suggestedActions": ["Diet consultation", "Exercise program", "Medication review"], "relatedConditions": ["Hypertension", "Family History CVD"]}	active	pending	2025-10-03 07:02:27.752583
132	2	2	drug_interaction	Potential Drug Interaction Alert	Interaction detected between Metformin and newly prescribed medication. Monitor glucose levels closely and consider dosage adjustment.	high	t	0.92	{"references": ["Drug Interaction Database", "FDA Guidelines"], "suggestedActions": ["Monitor blood glucose", "Review medication timing", "Patient education"], "relatedConditions": ["Type 2 Diabetes", "Drug Interaction"]}	active	pending	2025-10-03 07:02:27.752583
133	2	1	treatment_suggestion	Hypertension Management Optimization	Current treatment plan shows good response. Consider adding lifestyle interventions to potentially reduce medication dependency.	low	f	0.78	{"references": ["JNC 8 Guidelines", "AHA Lifestyle Guidelines"], "suggestedActions": ["DASH diet counseling", "Regular exercise program", "Weight management"], "relatedConditions": ["Hypertension", "ACE Inhibitor Therapy"]}	active	pending	2025-10-03 07:02:27.752583
134	2	2	preventive_care	Diabetic Screening Recommendations	Patient due for annual diabetic complications screening. Schedule eye exam, foot examination, and kidney function tests.	medium	t	0.95	{"references": ["ADA Standards of Care", "Diabetic Complications Guidelines"], "suggestedActions": ["Ophthalmology referral", "Podiatry consultation", "Lab work: HbA1c, microalbumin"], "relatedConditions": ["Type 2 Diabetes", "Preventive Care"]}	active	pending	2025-10-03 07:02:27.752583
135	2	1	risk_alert	Medication Adherence Concern	AI analysis of prescription refill patterns suggests potential adherence issues. Patient may benefit from medication management support.	medium	t	0.73	{"references": ["Medication Adherence Guidelines", "Patient Education Resources"], "suggestedActions": ["Adherence counseling", "Pill organizer", "Follow-up call"], "relatedConditions": ["Medication Adherence", "Hypertension"]}	active	pending	2025-10-03 07:02:27.752583
136	2	1	risk_alert	Cardiovascular Risk Assessment	Based on recent blood pressure readings and family history, patient shows elevated cardiovascular risk factors. Consider lifestyle modifications and medication review.	medium	t	0.85	{"references": ["AHA Guidelines 2023", "ESC Guidelines"], "suggestedActions": ["Diet consultation", "Exercise program", "Medication review"], "relatedConditions": ["Hypertension", "Family History CVD"]}	active	pending	2025-10-03 07:17:25.133425
137	2	2	drug_interaction	Potential Drug Interaction Alert	Interaction detected between Metformin and newly prescribed medication. Monitor glucose levels closely and consider dosage adjustment.	high	t	0.92	{"references": ["Drug Interaction Database", "FDA Guidelines"], "suggestedActions": ["Monitor blood glucose", "Review medication timing", "Patient education"], "relatedConditions": ["Type 2 Diabetes", "Drug Interaction"]}	active	pending	2025-10-03 07:17:25.133425
138	2	1	treatment_suggestion	Hypertension Management Optimization	Current treatment plan shows good response. Consider adding lifestyle interventions to potentially reduce medication dependency.	low	f	0.78	{"references": ["JNC 8 Guidelines", "AHA Lifestyle Guidelines"], "suggestedActions": ["DASH diet counseling", "Regular exercise program", "Weight management"], "relatedConditions": ["Hypertension", "ACE Inhibitor Therapy"]}	active	pending	2025-10-03 07:17:25.133425
139	2	2	preventive_care	Diabetic Screening Recommendations	Patient due for annual diabetic complications screening. Schedule eye exam, foot examination, and kidney function tests.	medium	t	0.95	{"references": ["ADA Standards of Care", "Diabetic Complications Guidelines"], "suggestedActions": ["Ophthalmology referral", "Podiatry consultation", "Lab work: HbA1c, microalbumin"], "relatedConditions": ["Type 2 Diabetes", "Preventive Care"]}	active	pending	2025-10-03 07:17:25.133425
140	2	1	risk_alert	Medication Adherence Concern	AI analysis of prescription refill patterns suggests potential adherence issues. Patient may benefit from medication management support.	medium	t	0.73	{"references": ["Medication Adherence Guidelines", "Patient Education Resources"], "suggestedActions": ["Adherence counseling", "Pill organizer", "Follow-up call"], "relatedConditions": ["Medication Adherence", "Hypertension"]}	active	pending	2025-10-03 07:17:25.133425
141	2	1	risk_alert	Cardiovascular Risk Assessment	Based on recent blood pressure readings and family history, patient shows elevated cardiovascular risk factors. Consider lifestyle modifications and medication review.	medium	t	0.85	{"references": ["AHA Guidelines 2023", "ESC Guidelines"], "suggestedActions": ["Diet consultation", "Exercise program", "Medication review"], "relatedConditions": ["Hypertension", "Family History CVD"]}	active	pending	2025-10-03 07:38:41.265963
142	2	2	drug_interaction	Potential Drug Interaction Alert	Interaction detected between Metformin and newly prescribed medication. Monitor glucose levels closely and consider dosage adjustment.	high	t	0.92	{"references": ["Drug Interaction Database", "FDA Guidelines"], "suggestedActions": ["Monitor blood glucose", "Review medication timing", "Patient education"], "relatedConditions": ["Type 2 Diabetes", "Drug Interaction"]}	active	pending	2025-10-03 07:38:41.265963
143	2	1	treatment_suggestion	Hypertension Management Optimization	Current treatment plan shows good response. Consider adding lifestyle interventions to potentially reduce medication dependency.	low	f	0.78	{"references": ["JNC 8 Guidelines", "AHA Lifestyle Guidelines"], "suggestedActions": ["DASH diet counseling", "Regular exercise program", "Weight management"], "relatedConditions": ["Hypertension", "ACE Inhibitor Therapy"]}	active	pending	2025-10-03 07:38:41.265963
144	2	2	preventive_care	Diabetic Screening Recommendations	Patient due for annual diabetic complications screening. Schedule eye exam, foot examination, and kidney function tests.	medium	t	0.95	{"references": ["ADA Standards of Care", "Diabetic Complications Guidelines"], "suggestedActions": ["Ophthalmology referral", "Podiatry consultation", "Lab work: HbA1c, microalbumin"], "relatedConditions": ["Type 2 Diabetes", "Preventive Care"]}	active	pending	2025-10-03 07:38:41.265963
145	2	1	risk_alert	Medication Adherence Concern	AI analysis of prescription refill patterns suggests potential adherence issues. Patient may benefit from medication management support.	medium	t	0.73	{"references": ["Medication Adherence Guidelines", "Patient Education Resources"], "suggestedActions": ["Adherence counseling", "Pill organizer", "Follow-up call"], "relatedConditions": ["Medication Adherence", "Hypertension"]}	active	pending	2025-10-03 07:38:41.265963
146	2	1	risk_alert	Cardiovascular Risk Assessment	Based on recent blood pressure readings and family history, patient shows elevated cardiovascular risk factors. Consider lifestyle modifications and medication review.	medium	t	0.85	{"references": ["AHA Guidelines 2023", "ESC Guidelines"], "suggestedActions": ["Diet consultation", "Exercise program", "Medication review"], "relatedConditions": ["Hypertension", "Family History CVD"]}	active	pending	2025-10-03 07:52:09.17724
147	2	2	drug_interaction	Potential Drug Interaction Alert	Interaction detected between Metformin and newly prescribed medication. Monitor glucose levels closely and consider dosage adjustment.	high	t	0.92	{"references": ["Drug Interaction Database", "FDA Guidelines"], "suggestedActions": ["Monitor blood glucose", "Review medication timing", "Patient education"], "relatedConditions": ["Type 2 Diabetes", "Drug Interaction"]}	active	pending	2025-10-03 07:52:09.17724
148	2	1	treatment_suggestion	Hypertension Management Optimization	Current treatment plan shows good response. Consider adding lifestyle interventions to potentially reduce medication dependency.	low	f	0.78	{"references": ["JNC 8 Guidelines", "AHA Lifestyle Guidelines"], "suggestedActions": ["DASH diet counseling", "Regular exercise program", "Weight management"], "relatedConditions": ["Hypertension", "ACE Inhibitor Therapy"]}	active	pending	2025-10-03 07:52:09.17724
149	2	2	preventive_care	Diabetic Screening Recommendations	Patient due for annual diabetic complications screening. Schedule eye exam, foot examination, and kidney function tests.	medium	t	0.95	{"references": ["ADA Standards of Care", "Diabetic Complications Guidelines"], "suggestedActions": ["Ophthalmology referral", "Podiatry consultation", "Lab work: HbA1c, microalbumin"], "relatedConditions": ["Type 2 Diabetes", "Preventive Care"]}	active	pending	2025-10-03 07:52:09.17724
150	2	1	risk_alert	Medication Adherence Concern	AI analysis of prescription refill patterns suggests potential adherence issues. Patient may benefit from medication management support.	medium	t	0.73	{"references": ["Medication Adherence Guidelines", "Patient Education Resources"], "suggestedActions": ["Adherence counseling", "Pill organizer", "Follow-up call"], "relatedConditions": ["Medication Adherence", "Hypertension"]}	active	pending	2025-10-03 07:52:09.17724
151	2	2	risk_alert	Cardiovascular Risk Assessment	Based on recent blood pressure readings and family history, patient shows elevated cardiovascular risk factors. Consider lifestyle modifications and medication review.	medium	t	0.85	{"references": ["AHA Guidelines 2023", "ESC Guidelines"], "suggestedActions": ["Diet consultation", "Exercise program", "Medication review"], "relatedConditions": ["Hypertension", "Family History CVD"]}	active	pending	2025-10-03 08:01:19.241685
152	2	3	drug_interaction	Potential Drug Interaction Alert	Interaction detected between Metformin and newly prescribed medication. Monitor glucose levels closely and consider dosage adjustment.	high	t	0.92	{"references": ["Drug Interaction Database", "FDA Guidelines"], "suggestedActions": ["Monitor blood glucose", "Review medication timing", "Patient education"], "relatedConditions": ["Type 2 Diabetes", "Drug Interaction"]}	active	pending	2025-10-03 08:01:19.241685
153	2	2	treatment_suggestion	Hypertension Management Optimization	Current treatment plan shows good response. Consider adding lifestyle interventions to potentially reduce medication dependency.	low	f	0.78	{"references": ["JNC 8 Guidelines", "AHA Lifestyle Guidelines"], "suggestedActions": ["DASH diet counseling", "Regular exercise program", "Weight management"], "relatedConditions": ["Hypertension", "ACE Inhibitor Therapy"]}	active	pending	2025-10-03 08:01:19.241685
154	2	3	preventive_care	Diabetic Screening Recommendations	Patient due for annual diabetic complications screening. Schedule eye exam, foot examination, and kidney function tests.	medium	t	0.95	{"references": ["ADA Standards of Care", "Diabetic Complications Guidelines"], "suggestedActions": ["Ophthalmology referral", "Podiatry consultation", "Lab work: HbA1c, microalbumin"], "relatedConditions": ["Type 2 Diabetes", "Preventive Care"]}	active	pending	2025-10-03 08:01:19.241685
155	2	2	risk_alert	Medication Adherence Concern	AI analysis of prescription refill patterns suggests potential adherence issues. Patient may benefit from medication management support.	medium	t	0.73	{"references": ["Medication Adherence Guidelines", "Patient Education Resources"], "suggestedActions": ["Adherence counseling", "Pill organizer", "Follow-up call"], "relatedConditions": ["Medication Adherence", "Hypertension"]}	active	pending	2025-10-03 08:01:19.241685
156	2	2	risk_alert	Cardiovascular Risk Assessment	Based on recent blood pressure readings and family history, patient shows elevated cardiovascular risk factors. Consider lifestyle modifications and medication review.	medium	t	0.85	{"references": ["AHA Guidelines 2023", "ESC Guidelines"], "suggestedActions": ["Diet consultation", "Exercise program", "Medication review"], "relatedConditions": ["Hypertension", "Family History CVD"]}	active	pending	2025-10-03 08:02:51.166025
157	2	3	drug_interaction	Potential Drug Interaction Alert	Interaction detected between Metformin and newly prescribed medication. Monitor glucose levels closely and consider dosage adjustment.	high	t	0.92	{"references": ["Drug Interaction Database", "FDA Guidelines"], "suggestedActions": ["Monitor blood glucose", "Review medication timing", "Patient education"], "relatedConditions": ["Type 2 Diabetes", "Drug Interaction"]}	active	pending	2025-10-03 08:02:51.166025
158	2	2	treatment_suggestion	Hypertension Management Optimization	Current treatment plan shows good response. Consider adding lifestyle interventions to potentially reduce medication dependency.	low	f	0.78	{"references": ["JNC 8 Guidelines", "AHA Lifestyle Guidelines"], "suggestedActions": ["DASH diet counseling", "Regular exercise program", "Weight management"], "relatedConditions": ["Hypertension", "ACE Inhibitor Therapy"]}	active	pending	2025-10-03 08:02:51.166025
159	2	3	preventive_care	Diabetic Screening Recommendations	Patient due for annual diabetic complications screening. Schedule eye exam, foot examination, and kidney function tests.	medium	t	0.95	{"references": ["ADA Standards of Care", "Diabetic Complications Guidelines"], "suggestedActions": ["Ophthalmology referral", "Podiatry consultation", "Lab work: HbA1c, microalbumin"], "relatedConditions": ["Type 2 Diabetes", "Preventive Care"]}	active	pending	2025-10-03 08:02:51.166025
160	2	2	risk_alert	Medication Adherence Concern	AI analysis of prescription refill patterns suggests potential adherence issues. Patient may benefit from medication management support.	medium	t	0.73	{"references": ["Medication Adherence Guidelines", "Patient Education Resources"], "suggestedActions": ["Adherence counseling", "Pill organizer", "Follow-up call"], "relatedConditions": ["Medication Adherence", "Hypertension"]}	active	pending	2025-10-03 08:02:51.166025
161	2	2	risk_alert	Cardiovascular Risk Assessment	Based on recent blood pressure readings and family history, patient shows elevated cardiovascular risk factors. Consider lifestyle modifications and medication review.	medium	t	0.85	{"references": ["AHA Guidelines 2023", "ESC Guidelines"], "suggestedActions": ["Diet consultation", "Exercise program", "Medication review"], "relatedConditions": ["Hypertension", "Family History CVD"]}	active	pending	2025-10-03 08:23:01.547048
162	2	3	drug_interaction	Potential Drug Interaction Alert	Interaction detected between Metformin and newly prescribed medication. Monitor glucose levels closely and consider dosage adjustment.	high	t	0.92	{"references": ["Drug Interaction Database", "FDA Guidelines"], "suggestedActions": ["Monitor blood glucose", "Review medication timing", "Patient education"], "relatedConditions": ["Type 2 Diabetes", "Drug Interaction"]}	active	pending	2025-10-03 08:23:01.547048
163	2	2	treatment_suggestion	Hypertension Management Optimization	Current treatment plan shows good response. Consider adding lifestyle interventions to potentially reduce medication dependency.	low	f	0.78	{"references": ["JNC 8 Guidelines", "AHA Lifestyle Guidelines"], "suggestedActions": ["DASH diet counseling", "Regular exercise program", "Weight management"], "relatedConditions": ["Hypertension", "ACE Inhibitor Therapy"]}	active	pending	2025-10-03 08:23:01.547048
164	2	3	preventive_care	Diabetic Screening Recommendations	Patient due for annual diabetic complications screening. Schedule eye exam, foot examination, and kidney function tests.	medium	t	0.95	{"references": ["ADA Standards of Care", "Diabetic Complications Guidelines"], "suggestedActions": ["Ophthalmology referral", "Podiatry consultation", "Lab work: HbA1c, microalbumin"], "relatedConditions": ["Type 2 Diabetes", "Preventive Care"]}	active	pending	2025-10-03 08:23:01.547048
165	2	2	risk_alert	Medication Adherence Concern	AI analysis of prescription refill patterns suggests potential adherence issues. Patient may benefit from medication management support.	medium	t	0.73	{"references": ["Medication Adherence Guidelines", "Patient Education Resources"], "suggestedActions": ["Adherence counseling", "Pill organizer", "Follow-up call"], "relatedConditions": ["Medication Adherence", "Hypertension"]}	active	pending	2025-10-03 08:23:01.547048
166	2	2	risk_alert	Cardiovascular Risk Assessment	Based on recent blood pressure readings and family history, patient shows elevated cardiovascular risk factors. Consider lifestyle modifications and medication review.	medium	t	0.85	{"references": ["AHA Guidelines 2023", "ESC Guidelines"], "suggestedActions": ["Diet consultation", "Exercise program", "Medication review"], "relatedConditions": ["Hypertension", "Family History CVD"]}	active	pending	2025-10-03 08:24:39.401929
167	2	3	drug_interaction	Potential Drug Interaction Alert	Interaction detected between Metformin and newly prescribed medication. Monitor glucose levels closely and consider dosage adjustment.	high	t	0.92	{"references": ["Drug Interaction Database", "FDA Guidelines"], "suggestedActions": ["Monitor blood glucose", "Review medication timing", "Patient education"], "relatedConditions": ["Type 2 Diabetes", "Drug Interaction"]}	active	pending	2025-10-03 08:24:39.401929
168	2	2	treatment_suggestion	Hypertension Management Optimization	Current treatment plan shows good response. Consider adding lifestyle interventions to potentially reduce medication dependency.	low	f	0.78	{"references": ["JNC 8 Guidelines", "AHA Lifestyle Guidelines"], "suggestedActions": ["DASH diet counseling", "Regular exercise program", "Weight management"], "relatedConditions": ["Hypertension", "ACE Inhibitor Therapy"]}	active	pending	2025-10-03 08:24:39.401929
169	2	3	preventive_care	Diabetic Screening Recommendations	Patient due for annual diabetic complications screening. Schedule eye exam, foot examination, and kidney function tests.	medium	t	0.95	{"references": ["ADA Standards of Care", "Diabetic Complications Guidelines"], "suggestedActions": ["Ophthalmology referral", "Podiatry consultation", "Lab work: HbA1c, microalbumin"], "relatedConditions": ["Type 2 Diabetes", "Preventive Care"]}	active	pending	2025-10-03 08:24:39.401929
170	2	2	risk_alert	Medication Adherence Concern	AI analysis of prescription refill patterns suggests potential adherence issues. Patient may benefit from medication management support.	medium	t	0.73	{"references": ["Medication Adherence Guidelines", "Patient Education Resources"], "suggestedActions": ["Adherence counseling", "Pill organizer", "Follow-up call"], "relatedConditions": ["Medication Adherence", "Hypertension"]}	active	pending	2025-10-03 08:24:39.401929
171	2	2	risk_alert	Cardiovascular Risk Assessment	Based on recent blood pressure readings and family history, patient shows elevated cardiovascular risk factors. Consider lifestyle modifications and medication review.	medium	t	0.85	{"references": ["AHA Guidelines 2023", "ESC Guidelines"], "suggestedActions": ["Diet consultation", "Exercise program", "Medication review"], "relatedConditions": ["Hypertension", "Family History CVD"]}	active	pending	2025-10-03 08:26:16.213344
172	2	3	drug_interaction	Potential Drug Interaction Alert	Interaction detected between Metformin and newly prescribed medication. Monitor glucose levels closely and consider dosage adjustment.	high	t	0.92	{"references": ["Drug Interaction Database", "FDA Guidelines"], "suggestedActions": ["Monitor blood glucose", "Review medication timing", "Patient education"], "relatedConditions": ["Type 2 Diabetes", "Drug Interaction"]}	active	pending	2025-10-03 08:26:16.213344
173	2	2	treatment_suggestion	Hypertension Management Optimization	Current treatment plan shows good response. Consider adding lifestyle interventions to potentially reduce medication dependency.	low	f	0.78	{"references": ["JNC 8 Guidelines", "AHA Lifestyle Guidelines"], "suggestedActions": ["DASH diet counseling", "Regular exercise program", "Weight management"], "relatedConditions": ["Hypertension", "ACE Inhibitor Therapy"]}	active	pending	2025-10-03 08:26:16.213344
174	2	3	preventive_care	Diabetic Screening Recommendations	Patient due for annual diabetic complications screening. Schedule eye exam, foot examination, and kidney function tests.	medium	t	0.95	{"references": ["ADA Standards of Care", "Diabetic Complications Guidelines"], "suggestedActions": ["Ophthalmology referral", "Podiatry consultation", "Lab work: HbA1c, microalbumin"], "relatedConditions": ["Type 2 Diabetes", "Preventive Care"]}	active	pending	2025-10-03 08:26:16.213344
175	2	2	risk_alert	Medication Adherence Concern	AI analysis of prescription refill patterns suggests potential adherence issues. Patient may benefit from medication management support.	medium	t	0.73	{"references": ["Medication Adherence Guidelines", "Patient Education Resources"], "suggestedActions": ["Adherence counseling", "Pill organizer", "Follow-up call"], "relatedConditions": ["Medication Adherence", "Hypertension"]}	active	pending	2025-10-03 08:26:16.213344
176	2	2	risk_alert	Cardiovascular Risk Assessment	Based on recent blood pressure readings and family history, patient shows elevated cardiovascular risk factors. Consider lifestyle modifications and medication review.	medium	t	0.85	{"references": ["AHA Guidelines 2023", "ESC Guidelines"], "suggestedActions": ["Diet consultation", "Exercise program", "Medication review"], "relatedConditions": ["Hypertension", "Family History CVD"]}	active	pending	2025-10-03 08:35:30.810924
177	2	3	drug_interaction	Potential Drug Interaction Alert	Interaction detected between Metformin and newly prescribed medication. Monitor glucose levels closely and consider dosage adjustment.	high	t	0.92	{"references": ["Drug Interaction Database", "FDA Guidelines"], "suggestedActions": ["Monitor blood glucose", "Review medication timing", "Patient education"], "relatedConditions": ["Type 2 Diabetes", "Drug Interaction"]}	active	pending	2025-10-03 08:35:30.810924
178	2	2	treatment_suggestion	Hypertension Management Optimization	Current treatment plan shows good response. Consider adding lifestyle interventions to potentially reduce medication dependency.	low	f	0.78	{"references": ["JNC 8 Guidelines", "AHA Lifestyle Guidelines"], "suggestedActions": ["DASH diet counseling", "Regular exercise program", "Weight management"], "relatedConditions": ["Hypertension", "ACE Inhibitor Therapy"]}	active	pending	2025-10-03 08:35:30.810924
179	2	3	preventive_care	Diabetic Screening Recommendations	Patient due for annual diabetic complications screening. Schedule eye exam, foot examination, and kidney function tests.	medium	t	0.95	{"references": ["ADA Standards of Care", "Diabetic Complications Guidelines"], "suggestedActions": ["Ophthalmology referral", "Podiatry consultation", "Lab work: HbA1c, microalbumin"], "relatedConditions": ["Type 2 Diabetes", "Preventive Care"]}	active	pending	2025-10-03 08:35:30.810924
180	2	2	risk_alert	Medication Adherence Concern	AI analysis of prescription refill patterns suggests potential adherence issues. Patient may benefit from medication management support.	medium	t	0.73	{"references": ["Medication Adherence Guidelines", "Patient Education Resources"], "suggestedActions": ["Adherence counseling", "Pill organizer", "Follow-up call"], "relatedConditions": ["Medication Adherence", "Hypertension"]}	active	pending	2025-10-03 08:35:30.810924
181	2	2	risk_alert	Cardiovascular Risk Assessment	Based on recent blood pressure readings and family history, patient shows elevated cardiovascular risk factors. Consider lifestyle modifications and medication review.	medium	t	0.85	{"references": ["AHA Guidelines 2023", "ESC Guidelines"], "suggestedActions": ["Diet consultation", "Exercise program", "Medication review"], "relatedConditions": ["Hypertension", "Family History CVD"]}	active	pending	2025-10-03 08:43:40.580168
182	2	3	drug_interaction	Potential Drug Interaction Alert	Interaction detected between Metformin and newly prescribed medication. Monitor glucose levels closely and consider dosage adjustment.	high	t	0.92	{"references": ["Drug Interaction Database", "FDA Guidelines"], "suggestedActions": ["Monitor blood glucose", "Review medication timing", "Patient education"], "relatedConditions": ["Type 2 Diabetes", "Drug Interaction"]}	active	pending	2025-10-03 08:43:40.580168
183	2	2	treatment_suggestion	Hypertension Management Optimization	Current treatment plan shows good response. Consider adding lifestyle interventions to potentially reduce medication dependency.	low	f	0.78	{"references": ["JNC 8 Guidelines", "AHA Lifestyle Guidelines"], "suggestedActions": ["DASH diet counseling", "Regular exercise program", "Weight management"], "relatedConditions": ["Hypertension", "ACE Inhibitor Therapy"]}	active	pending	2025-10-03 08:43:40.580168
184	2	3	preventive_care	Diabetic Screening Recommendations	Patient due for annual diabetic complications screening. Schedule eye exam, foot examination, and kidney function tests.	medium	t	0.95	{"references": ["ADA Standards of Care", "Diabetic Complications Guidelines"], "suggestedActions": ["Ophthalmology referral", "Podiatry consultation", "Lab work: HbA1c, microalbumin"], "relatedConditions": ["Type 2 Diabetes", "Preventive Care"]}	active	pending	2025-10-03 08:43:40.580168
185	2	2	risk_alert	Medication Adherence Concern	AI analysis of prescription refill patterns suggests potential adherence issues. Patient may benefit from medication management support.	medium	t	0.73	{"references": ["Medication Adherence Guidelines", "Patient Education Resources"], "suggestedActions": ["Adherence counseling", "Pill organizer", "Follow-up call"], "relatedConditions": ["Medication Adherence", "Hypertension"]}	active	pending	2025-10-03 08:43:40.580168
186	2	2	risk_alert	Cardiovascular Risk Assessment	Based on recent blood pressure readings and family history, patient shows elevated cardiovascular risk factors. Consider lifestyle modifications and medication review.	medium	t	0.85	{"references": ["AHA Guidelines 2023", "ESC Guidelines"], "suggestedActions": ["Diet consultation", "Exercise program", "Medication review"], "relatedConditions": ["Hypertension", "Family History CVD"]}	active	pending	2025-10-03 09:03:15.060563
187	2	3	drug_interaction	Potential Drug Interaction Alert	Interaction detected between Metformin and newly prescribed medication. Monitor glucose levels closely and consider dosage adjustment.	high	t	0.92	{"references": ["Drug Interaction Database", "FDA Guidelines"], "suggestedActions": ["Monitor blood glucose", "Review medication timing", "Patient education"], "relatedConditions": ["Type 2 Diabetes", "Drug Interaction"]}	active	pending	2025-10-03 09:03:15.060563
188	2	2	treatment_suggestion	Hypertension Management Optimization	Current treatment plan shows good response. Consider adding lifestyle interventions to potentially reduce medication dependency.	low	f	0.78	{"references": ["JNC 8 Guidelines", "AHA Lifestyle Guidelines"], "suggestedActions": ["DASH diet counseling", "Regular exercise program", "Weight management"], "relatedConditions": ["Hypertension", "ACE Inhibitor Therapy"]}	active	pending	2025-10-03 09:03:15.060563
189	2	3	preventive_care	Diabetic Screening Recommendations	Patient due for annual diabetic complications screening. Schedule eye exam, foot examination, and kidney function tests.	medium	t	0.95	{"references": ["ADA Standards of Care", "Diabetic Complications Guidelines"], "suggestedActions": ["Ophthalmology referral", "Podiatry consultation", "Lab work: HbA1c, microalbumin"], "relatedConditions": ["Type 2 Diabetes", "Preventive Care"]}	active	pending	2025-10-03 09:03:15.060563
190	2	2	risk_alert	Medication Adherence Concern	AI analysis of prescription refill patterns suggests potential adherence issues. Patient may benefit from medication management support.	medium	t	0.73	{"references": ["Medication Adherence Guidelines", "Patient Education Resources"], "suggestedActions": ["Adherence counseling", "Pill organizer", "Follow-up call"], "relatedConditions": ["Medication Adherence", "Hypertension"]}	active	pending	2025-10-03 09:03:15.060563
191	2	2	risk_alert	Cardiovascular Risk Assessment	Based on recent blood pressure readings and family history, patient shows elevated cardiovascular risk factors. Consider lifestyle modifications and medication review.	medium	t	0.85	{"references": ["AHA Guidelines 2023", "ESC Guidelines"], "suggestedActions": ["Diet consultation", "Exercise program", "Medication review"], "relatedConditions": ["Hypertension", "Family History CVD"]}	active	pending	2025-10-03 09:44:50.718413
192	2	3	drug_interaction	Potential Drug Interaction Alert	Interaction detected between Metformin and newly prescribed medication. Monitor glucose levels closely and consider dosage adjustment.	high	t	0.92	{"references": ["Drug Interaction Database", "FDA Guidelines"], "suggestedActions": ["Monitor blood glucose", "Review medication timing", "Patient education"], "relatedConditions": ["Type 2 Diabetes", "Drug Interaction"]}	active	pending	2025-10-03 09:44:50.718413
193	2	2	treatment_suggestion	Hypertension Management Optimization	Current treatment plan shows good response. Consider adding lifestyle interventions to potentially reduce medication dependency.	low	f	0.78	{"references": ["JNC 8 Guidelines", "AHA Lifestyle Guidelines"], "suggestedActions": ["DASH diet counseling", "Regular exercise program", "Weight management"], "relatedConditions": ["Hypertension", "ACE Inhibitor Therapy"]}	active	pending	2025-10-03 09:44:50.718413
194	2	3	preventive_care	Diabetic Screening Recommendations	Patient due for annual diabetic complications screening. Schedule eye exam, foot examination, and kidney function tests.	medium	t	0.95	{"references": ["ADA Standards of Care", "Diabetic Complications Guidelines"], "suggestedActions": ["Ophthalmology referral", "Podiatry consultation", "Lab work: HbA1c, microalbumin"], "relatedConditions": ["Type 2 Diabetes", "Preventive Care"]}	active	pending	2025-10-03 09:44:50.718413
195	2	2	risk_alert	Medication Adherence Concern	AI analysis of prescription refill patterns suggests potential adherence issues. Patient may benefit from medication management support.	medium	t	0.73	{"references": ["Medication Adherence Guidelines", "Patient Education Resources"], "suggestedActions": ["Adherence counseling", "Pill organizer", "Follow-up call"], "relatedConditions": ["Medication Adherence", "Hypertension"]}	active	pending	2025-10-03 09:44:50.718413
196	2	2	risk_alert	Cardiovascular Risk Assessment	Based on recent blood pressure readings and family history, patient shows elevated cardiovascular risk factors. Consider lifestyle modifications and medication review.	medium	t	0.85	{"references": ["AHA Guidelines 2023", "ESC Guidelines"], "suggestedActions": ["Diet consultation", "Exercise program", "Medication review"], "relatedConditions": ["Hypertension", "Family History CVD"]}	active	pending	2025-10-03 09:45:36.819019
197	2	3	drug_interaction	Potential Drug Interaction Alert	Interaction detected between Metformin and newly prescribed medication. Monitor glucose levels closely and consider dosage adjustment.	high	t	0.92	{"references": ["Drug Interaction Database", "FDA Guidelines"], "suggestedActions": ["Monitor blood glucose", "Review medication timing", "Patient education"], "relatedConditions": ["Type 2 Diabetes", "Drug Interaction"]}	active	pending	2025-10-03 09:45:36.819019
198	2	2	treatment_suggestion	Hypertension Management Optimization	Current treatment plan shows good response. Consider adding lifestyle interventions to potentially reduce medication dependency.	low	f	0.78	{"references": ["JNC 8 Guidelines", "AHA Lifestyle Guidelines"], "suggestedActions": ["DASH diet counseling", "Regular exercise program", "Weight management"], "relatedConditions": ["Hypertension", "ACE Inhibitor Therapy"]}	active	pending	2025-10-03 09:45:36.819019
199	2	3	preventive_care	Diabetic Screening Recommendations	Patient due for annual diabetic complications screening. Schedule eye exam, foot examination, and kidney function tests.	medium	t	0.95	{"references": ["ADA Standards of Care", "Diabetic Complications Guidelines"], "suggestedActions": ["Ophthalmology referral", "Podiatry consultation", "Lab work: HbA1c, microalbumin"], "relatedConditions": ["Type 2 Diabetes", "Preventive Care"]}	active	pending	2025-10-03 09:45:36.819019
200	2	2	risk_alert	Medication Adherence Concern	AI analysis of prescription refill patterns suggests potential adherence issues. Patient may benefit from medication management support.	medium	t	0.73	{"references": ["Medication Adherence Guidelines", "Patient Education Resources"], "suggestedActions": ["Adherence counseling", "Pill organizer", "Follow-up call"], "relatedConditions": ["Medication Adherence", "Hypertension"]}	active	pending	2025-10-03 09:45:36.819019
201	2	2	risk_alert	Cardiovascular Risk Assessment	Based on recent blood pressure readings and family history, patient shows elevated cardiovascular risk factors. Consider lifestyle modifications and medication review.	medium	t	0.85	{"references": ["AHA Guidelines 2023", "ESC Guidelines"], "suggestedActions": ["Diet consultation", "Exercise program", "Medication review"], "relatedConditions": ["Hypertension", "Family History CVD"]}	active	pending	2025-10-03 10:09:16.577891
202	2	3	drug_interaction	Potential Drug Interaction Alert	Interaction detected between Metformin and newly prescribed medication. Monitor glucose levels closely and consider dosage adjustment.	high	t	0.92	{"references": ["Drug Interaction Database", "FDA Guidelines"], "suggestedActions": ["Monitor blood glucose", "Review medication timing", "Patient education"], "relatedConditions": ["Type 2 Diabetes", "Drug Interaction"]}	active	pending	2025-10-03 10:09:16.577891
203	2	2	treatment_suggestion	Hypertension Management Optimization	Current treatment plan shows good response. Consider adding lifestyle interventions to potentially reduce medication dependency.	low	f	0.78	{"references": ["JNC 8 Guidelines", "AHA Lifestyle Guidelines"], "suggestedActions": ["DASH diet counseling", "Regular exercise program", "Weight management"], "relatedConditions": ["Hypertension", "ACE Inhibitor Therapy"]}	active	pending	2025-10-03 10:09:16.577891
204	2	3	preventive_care	Diabetic Screening Recommendations	Patient due for annual diabetic complications screening. Schedule eye exam, foot examination, and kidney function tests.	medium	t	0.95	{"references": ["ADA Standards of Care", "Diabetic Complications Guidelines"], "suggestedActions": ["Ophthalmology referral", "Podiatry consultation", "Lab work: HbA1c, microalbumin"], "relatedConditions": ["Type 2 Diabetes", "Preventive Care"]}	active	pending	2025-10-03 10:09:16.577891
205	2	2	risk_alert	Medication Adherence Concern	AI analysis of prescription refill patterns suggests potential adherence issues. Patient may benefit from medication management support.	medium	t	0.73	{"references": ["Medication Adherence Guidelines", "Patient Education Resources"], "suggestedActions": ["Adherence counseling", "Pill organizer", "Follow-up call"], "relatedConditions": ["Medication Adherence", "Hypertension"]}	active	pending	2025-10-03 10:09:16.577891
206	2	2	risk_alert	Cardiovascular Risk Assessment	Based on recent blood pressure readings and family history, patient shows elevated cardiovascular risk factors. Consider lifestyle modifications and medication review.	medium	t	0.85	{"references": ["AHA Guidelines 2023", "ESC Guidelines"], "suggestedActions": ["Diet consultation", "Exercise program", "Medication review"], "relatedConditions": ["Hypertension", "Family History CVD"]}	active	pending	2025-10-03 10:19:14.453223
207	2	3	drug_interaction	Potential Drug Interaction Alert	Interaction detected between Metformin and newly prescribed medication. Monitor glucose levels closely and consider dosage adjustment.	high	t	0.92	{"references": ["Drug Interaction Database", "FDA Guidelines"], "suggestedActions": ["Monitor blood glucose", "Review medication timing", "Patient education"], "relatedConditions": ["Type 2 Diabetes", "Drug Interaction"]}	active	pending	2025-10-03 10:19:14.453223
208	2	2	treatment_suggestion	Hypertension Management Optimization	Current treatment plan shows good response. Consider adding lifestyle interventions to potentially reduce medication dependency.	low	f	0.78	{"references": ["JNC 8 Guidelines", "AHA Lifestyle Guidelines"], "suggestedActions": ["DASH diet counseling", "Regular exercise program", "Weight management"], "relatedConditions": ["Hypertension", "ACE Inhibitor Therapy"]}	active	pending	2025-10-03 10:19:14.453223
209	2	3	preventive_care	Diabetic Screening Recommendations	Patient due for annual diabetic complications screening. Schedule eye exam, foot examination, and kidney function tests.	medium	t	0.95	{"references": ["ADA Standards of Care", "Diabetic Complications Guidelines"], "suggestedActions": ["Ophthalmology referral", "Podiatry consultation", "Lab work: HbA1c, microalbumin"], "relatedConditions": ["Type 2 Diabetes", "Preventive Care"]}	active	pending	2025-10-03 10:19:14.453223
210	2	2	risk_alert	Medication Adherence Concern	AI analysis of prescription refill patterns suggests potential adherence issues. Patient may benefit from medication management support.	medium	t	0.73	{"references": ["Medication Adherence Guidelines", "Patient Education Resources"], "suggestedActions": ["Adherence counseling", "Pill organizer", "Follow-up call"], "relatedConditions": ["Medication Adherence", "Hypertension"]}	active	pending	2025-10-03 10:19:14.453223
211	2	2	risk_alert	Cardiovascular Risk Assessment	Based on recent blood pressure readings and family history, patient shows elevated cardiovascular risk factors. Consider lifestyle modifications and medication review.	medium	t	0.85	{"references": ["AHA Guidelines 2023", "ESC Guidelines"], "suggestedActions": ["Diet consultation", "Exercise program", "Medication review"], "relatedConditions": ["Hypertension", "Family History CVD"]}	active	pending	2025-10-03 10:37:34.185609
212	2	3	drug_interaction	Potential Drug Interaction Alert	Interaction detected between Metformin and newly prescribed medication. Monitor glucose levels closely and consider dosage adjustment.	high	t	0.92	{"references": ["Drug Interaction Database", "FDA Guidelines"], "suggestedActions": ["Monitor blood glucose", "Review medication timing", "Patient education"], "relatedConditions": ["Type 2 Diabetes", "Drug Interaction"]}	active	pending	2025-10-03 10:37:34.185609
213	2	2	treatment_suggestion	Hypertension Management Optimization	Current treatment plan shows good response. Consider adding lifestyle interventions to potentially reduce medication dependency.	low	f	0.78	{"references": ["JNC 8 Guidelines", "AHA Lifestyle Guidelines"], "suggestedActions": ["DASH diet counseling", "Regular exercise program", "Weight management"], "relatedConditions": ["Hypertension", "ACE Inhibitor Therapy"]}	active	pending	2025-10-03 10:37:34.185609
214	2	3	preventive_care	Diabetic Screening Recommendations	Patient due for annual diabetic complications screening. Schedule eye exam, foot examination, and kidney function tests.	medium	t	0.95	{"references": ["ADA Standards of Care", "Diabetic Complications Guidelines"], "suggestedActions": ["Ophthalmology referral", "Podiatry consultation", "Lab work: HbA1c, microalbumin"], "relatedConditions": ["Type 2 Diabetes", "Preventive Care"]}	active	pending	2025-10-03 10:37:34.185609
215	2	2	risk_alert	Medication Adherence Concern	AI analysis of prescription refill patterns suggests potential adherence issues. Patient may benefit from medication management support.	medium	t	0.73	{"references": ["Medication Adherence Guidelines", "Patient Education Resources"], "suggestedActions": ["Adherence counseling", "Pill organizer", "Follow-up call"], "relatedConditions": ["Medication Adherence", "Hypertension"]}	active	pending	2025-10-03 10:37:34.185609
216	2	2	risk_alert	Cardiovascular Risk Assessment	Based on recent blood pressure readings and family history, patient shows elevated cardiovascular risk factors. Consider lifestyle modifications and medication review.	medium	t	0.85	{"references": ["AHA Guidelines 2023", "ESC Guidelines"], "suggestedActions": ["Diet consultation", "Exercise program", "Medication review"], "relatedConditions": ["Hypertension", "Family History CVD"]}	active	pending	2025-10-03 10:46:58.034428
217	2	3	drug_interaction	Potential Drug Interaction Alert	Interaction detected between Metformin and newly prescribed medication. Monitor glucose levels closely and consider dosage adjustment.	high	t	0.92	{"references": ["Drug Interaction Database", "FDA Guidelines"], "suggestedActions": ["Monitor blood glucose", "Review medication timing", "Patient education"], "relatedConditions": ["Type 2 Diabetes", "Drug Interaction"]}	active	pending	2025-10-03 10:46:58.034428
218	2	2	treatment_suggestion	Hypertension Management Optimization	Current treatment plan shows good response. Consider adding lifestyle interventions to potentially reduce medication dependency.	low	f	0.78	{"references": ["JNC 8 Guidelines", "AHA Lifestyle Guidelines"], "suggestedActions": ["DASH diet counseling", "Regular exercise program", "Weight management"], "relatedConditions": ["Hypertension", "ACE Inhibitor Therapy"]}	active	pending	2025-10-03 10:46:58.034428
219	2	3	preventive_care	Diabetic Screening Recommendations	Patient due for annual diabetic complications screening. Schedule eye exam, foot examination, and kidney function tests.	medium	t	0.95	{"references": ["ADA Standards of Care", "Diabetic Complications Guidelines"], "suggestedActions": ["Ophthalmology referral", "Podiatry consultation", "Lab work: HbA1c, microalbumin"], "relatedConditions": ["Type 2 Diabetes", "Preventive Care"]}	active	pending	2025-10-03 10:46:58.034428
220	2	2	risk_alert	Medication Adherence Concern	AI analysis of prescription refill patterns suggests potential adherence issues. Patient may benefit from medication management support.	medium	t	0.73	{"references": ["Medication Adherence Guidelines", "Patient Education Resources"], "suggestedActions": ["Adherence counseling", "Pill organizer", "Follow-up call"], "relatedConditions": ["Medication Adherence", "Hypertension"]}	active	pending	2025-10-03 10:46:58.034428
221	2	2	risk_alert	Cardiovascular Risk Assessment	Based on recent blood pressure readings and family history, patient shows elevated cardiovascular risk factors. Consider lifestyle modifications and medication review.	medium	t	0.85	{"references": ["AHA Guidelines 2023", "ESC Guidelines"], "suggestedActions": ["Diet consultation", "Exercise program", "Medication review"], "relatedConditions": ["Hypertension", "Family History CVD"]}	active	pending	2025-10-03 10:54:41.004741
222	2	3	drug_interaction	Potential Drug Interaction Alert	Interaction detected between Metformin and newly prescribed medication. Monitor glucose levels closely and consider dosage adjustment.	high	t	0.92	{"references": ["Drug Interaction Database", "FDA Guidelines"], "suggestedActions": ["Monitor blood glucose", "Review medication timing", "Patient education"], "relatedConditions": ["Type 2 Diabetes", "Drug Interaction"]}	active	pending	2025-10-03 10:54:41.004741
223	2	2	treatment_suggestion	Hypertension Management Optimization	Current treatment plan shows good response. Consider adding lifestyle interventions to potentially reduce medication dependency.	low	f	0.78	{"references": ["JNC 8 Guidelines", "AHA Lifestyle Guidelines"], "suggestedActions": ["DASH diet counseling", "Regular exercise program", "Weight management"], "relatedConditions": ["Hypertension", "ACE Inhibitor Therapy"]}	active	pending	2025-10-03 10:54:41.004741
224	2	3	preventive_care	Diabetic Screening Recommendations	Patient due for annual diabetic complications screening. Schedule eye exam, foot examination, and kidney function tests.	medium	t	0.95	{"references": ["ADA Standards of Care", "Diabetic Complications Guidelines"], "suggestedActions": ["Ophthalmology referral", "Podiatry consultation", "Lab work: HbA1c, microalbumin"], "relatedConditions": ["Type 2 Diabetes", "Preventive Care"]}	active	pending	2025-10-03 10:54:41.004741
225	2	2	risk_alert	Medication Adherence Concern	AI analysis of prescription refill patterns suggests potential adherence issues. Patient may benefit from medication management support.	medium	t	0.73	{"references": ["Medication Adherence Guidelines", "Patient Education Resources"], "suggestedActions": ["Adherence counseling", "Pill organizer", "Follow-up call"], "relatedConditions": ["Medication Adherence", "Hypertension"]}	active	pending	2025-10-03 10:54:41.004741
226	2	2	risk_alert	Cardiovascular Risk Assessment	Based on recent blood pressure readings and family history, patient shows elevated cardiovascular risk factors. Consider lifestyle modifications and medication review.	medium	t	0.85	{"references": ["AHA Guidelines 2023", "ESC Guidelines"], "suggestedActions": ["Diet consultation", "Exercise program", "Medication review"], "relatedConditions": ["Hypertension", "Family History CVD"]}	active	pending	2025-10-03 11:41:08.963505
227	2	3	drug_interaction	Potential Drug Interaction Alert	Interaction detected between Metformin and newly prescribed medication. Monitor glucose levels closely and consider dosage adjustment.	high	t	0.92	{"references": ["Drug Interaction Database", "FDA Guidelines"], "suggestedActions": ["Monitor blood glucose", "Review medication timing", "Patient education"], "relatedConditions": ["Type 2 Diabetes", "Drug Interaction"]}	active	pending	2025-10-03 11:41:08.963505
228	2	2	treatment_suggestion	Hypertension Management Optimization	Current treatment plan shows good response. Consider adding lifestyle interventions to potentially reduce medication dependency.	low	f	0.78	{"references": ["JNC 8 Guidelines", "AHA Lifestyle Guidelines"], "suggestedActions": ["DASH diet counseling", "Regular exercise program", "Weight management"], "relatedConditions": ["Hypertension", "ACE Inhibitor Therapy"]}	active	pending	2025-10-03 11:41:08.963505
229	2	3	preventive_care	Diabetic Screening Recommendations	Patient due for annual diabetic complications screening. Schedule eye exam, foot examination, and kidney function tests.	medium	t	0.95	{"references": ["ADA Standards of Care", "Diabetic Complications Guidelines"], "suggestedActions": ["Ophthalmology referral", "Podiatry consultation", "Lab work: HbA1c, microalbumin"], "relatedConditions": ["Type 2 Diabetes", "Preventive Care"]}	active	pending	2025-10-03 11:41:08.963505
230	2	2	risk_alert	Medication Adherence Concern	AI analysis of prescription refill patterns suggests potential adherence issues. Patient may benefit from medication management support.	medium	t	0.73	{"references": ["Medication Adherence Guidelines", "Patient Education Resources"], "suggestedActions": ["Adherence counseling", "Pill organizer", "Follow-up call"], "relatedConditions": ["Medication Adherence", "Hypertension"]}	active	pending	2025-10-03 11:41:08.963505
231	2	2	risk_alert	Cardiovascular Risk Assessment	Based on recent blood pressure readings and family history, patient shows elevated cardiovascular risk factors. Consider lifestyle modifications and medication review.	medium	t	0.85	{"references": ["AHA Guidelines 2023", "ESC Guidelines"], "suggestedActions": ["Diet consultation", "Exercise program", "Medication review"], "relatedConditions": ["Hypertension", "Family History CVD"]}	active	pending	2025-10-03 11:54:17.158023
232	2	3	drug_interaction	Potential Drug Interaction Alert	Interaction detected between Metformin and newly prescribed medication. Monitor glucose levels closely and consider dosage adjustment.	high	t	0.92	{"references": ["Drug Interaction Database", "FDA Guidelines"], "suggestedActions": ["Monitor blood glucose", "Review medication timing", "Patient education"], "relatedConditions": ["Type 2 Diabetes", "Drug Interaction"]}	active	pending	2025-10-03 11:54:17.158023
233	2	2	treatment_suggestion	Hypertension Management Optimization	Current treatment plan shows good response. Consider adding lifestyle interventions to potentially reduce medication dependency.	low	f	0.78	{"references": ["JNC 8 Guidelines", "AHA Lifestyle Guidelines"], "suggestedActions": ["DASH diet counseling", "Regular exercise program", "Weight management"], "relatedConditions": ["Hypertension", "ACE Inhibitor Therapy"]}	active	pending	2025-10-03 11:54:17.158023
234	2	3	preventive_care	Diabetic Screening Recommendations	Patient due for annual diabetic complications screening. Schedule eye exam, foot examination, and kidney function tests.	medium	t	0.95	{"references": ["ADA Standards of Care", "Diabetic Complications Guidelines"], "suggestedActions": ["Ophthalmology referral", "Podiatry consultation", "Lab work: HbA1c, microalbumin"], "relatedConditions": ["Type 2 Diabetes", "Preventive Care"]}	active	pending	2025-10-03 11:54:17.158023
235	2	2	risk_alert	Medication Adherence Concern	AI analysis of prescription refill patterns suggests potential adherence issues. Patient may benefit from medication management support.	medium	t	0.73	{"references": ["Medication Adherence Guidelines", "Patient Education Resources"], "suggestedActions": ["Adherence counseling", "Pill organizer", "Follow-up call"], "relatedConditions": ["Medication Adherence", "Hypertension"]}	active	pending	2025-10-03 11:54:17.158023
236	2	2	risk_alert	Cardiovascular Risk Assessment	Based on recent blood pressure readings and family history, patient shows elevated cardiovascular risk factors. Consider lifestyle modifications and medication review.	medium	t	0.85	{"references": ["AHA Guidelines 2023", "ESC Guidelines"], "suggestedActions": ["Diet consultation", "Exercise program", "Medication review"], "relatedConditions": ["Hypertension", "Family History CVD"]}	active	pending	2025-10-03 12:38:21.090061
237	2	3	drug_interaction	Potential Drug Interaction Alert	Interaction detected between Metformin and newly prescribed medication. Monitor glucose levels closely and consider dosage adjustment.	high	t	0.92	{"references": ["Drug Interaction Database", "FDA Guidelines"], "suggestedActions": ["Monitor blood glucose", "Review medication timing", "Patient education"], "relatedConditions": ["Type 2 Diabetes", "Drug Interaction"]}	active	pending	2025-10-03 12:38:21.090061
238	2	2	treatment_suggestion	Hypertension Management Optimization	Current treatment plan shows good response. Consider adding lifestyle interventions to potentially reduce medication dependency.	low	f	0.78	{"references": ["JNC 8 Guidelines", "AHA Lifestyle Guidelines"], "suggestedActions": ["DASH diet counseling", "Regular exercise program", "Weight management"], "relatedConditions": ["Hypertension", "ACE Inhibitor Therapy"]}	active	pending	2025-10-03 12:38:21.090061
239	2	3	preventive_care	Diabetic Screening Recommendations	Patient due for annual diabetic complications screening. Schedule eye exam, foot examination, and kidney function tests.	medium	t	0.95	{"references": ["ADA Standards of Care", "Diabetic Complications Guidelines"], "suggestedActions": ["Ophthalmology referral", "Podiatry consultation", "Lab work: HbA1c, microalbumin"], "relatedConditions": ["Type 2 Diabetes", "Preventive Care"]}	active	pending	2025-10-03 12:38:21.090061
240	2	2	risk_alert	Medication Adherence Concern	AI analysis of prescription refill patterns suggests potential adherence issues. Patient may benefit from medication management support.	medium	t	0.73	{"references": ["Medication Adherence Guidelines", "Patient Education Resources"], "suggestedActions": ["Adherence counseling", "Pill organizer", "Follow-up call"], "relatedConditions": ["Medication Adherence", "Hypertension"]}	active	pending	2025-10-03 12:38:21.090061
241	2	2	risk_alert	Cardiovascular Risk Assessment	Based on recent blood pressure readings and family history, patient shows elevated cardiovascular risk factors. Consider lifestyle modifications and medication review.	medium	t	0.85	{"references": ["AHA Guidelines 2023", "ESC Guidelines"], "suggestedActions": ["Diet consultation", "Exercise program", "Medication review"], "relatedConditions": ["Hypertension", "Family History CVD"]}	active	pending	2025-10-03 12:44:22.66466
242	2	3	drug_interaction	Potential Drug Interaction Alert	Interaction detected between Metformin and newly prescribed medication. Monitor glucose levels closely and consider dosage adjustment.	high	t	0.92	{"references": ["Drug Interaction Database", "FDA Guidelines"], "suggestedActions": ["Monitor blood glucose", "Review medication timing", "Patient education"], "relatedConditions": ["Type 2 Diabetes", "Drug Interaction"]}	active	pending	2025-10-03 12:44:22.66466
243	2	2	treatment_suggestion	Hypertension Management Optimization	Current treatment plan shows good response. Consider adding lifestyle interventions to potentially reduce medication dependency.	low	f	0.78	{"references": ["JNC 8 Guidelines", "AHA Lifestyle Guidelines"], "suggestedActions": ["DASH diet counseling", "Regular exercise program", "Weight management"], "relatedConditions": ["Hypertension", "ACE Inhibitor Therapy"]}	active	pending	2025-10-03 12:44:22.66466
244	2	3	preventive_care	Diabetic Screening Recommendations	Patient due for annual diabetic complications screening. Schedule eye exam, foot examination, and kidney function tests.	medium	t	0.95	{"references": ["ADA Standards of Care", "Diabetic Complications Guidelines"], "suggestedActions": ["Ophthalmology referral", "Podiatry consultation", "Lab work: HbA1c, microalbumin"], "relatedConditions": ["Type 2 Diabetes", "Preventive Care"]}	active	pending	2025-10-03 12:44:22.66466
245	2	2	risk_alert	Medication Adherence Concern	AI analysis of prescription refill patterns suggests potential adherence issues. Patient may benefit from medication management support.	medium	t	0.73	{"references": ["Medication Adherence Guidelines", "Patient Education Resources"], "suggestedActions": ["Adherence counseling", "Pill organizer", "Follow-up call"], "relatedConditions": ["Medication Adherence", "Hypertension"]}	active	pending	2025-10-03 12:44:22.66466
\.


--
-- Data for Name: appointments; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.appointments (id, organization_id, patient_id, provider_id, title, description, scheduled_at, duration, status, type, location, is_virtual, created_at, assigned_role, created_by) FROM stdin;
1	2	6	3	ANN		2025-10-03 07:00:00	30	scheduled	follow_up		f	2025-10-03 05:16:46.128626	nurse	\N
2	2	6	3	n		2025-10-04 11:00:00	30	scheduled	consultation		f	2025-10-03 05:17:38.47428	nurse	\N
3	2	4	3	kafia - Nurse Appointment		2025-10-03 09:00:00	15	scheduled	consultation		f	2025-10-03 05:43:20.994018	nurse	\N
4	2	6	3	ANN - Nurse Appointment		2025-10-03 09:15:00	15	scheduled	consultation		f	2025-10-03 05:45:00.685144	nurse	\N
5	2	3	3	ANN - Nurse Appointment		2025-10-03 09:30:00	15	scheduled	consultation		f	2025-10-03 06:25:22.424954	nurse	\N
6	2	2	3	Robert - Nurse Appointment		2025-10-03 09:45:00	60	scheduled	consultation		f	2025-10-03 06:26:40.239268	nurse	\N
7	2	1	3	Alice - Nurse Appointment		2025-10-03 10:45:00	15	scheduled	consultation		f	2025-10-03 06:34:38.360253	nurse	\N
8	2	1	3	Alice - Nurse Appointment		2025-10-03 11:00:00	60	scheduled	consultation		f	2025-10-03 07:05:10.314009	nurse	\N
9	2	3	3	ANN - Nurse Appointment		2025-10-03 12:00:00	30	scheduled	consultation		f	2025-10-03 07:07:18.21391	nurse	\N
10	2	2	3	Robert - Nurse Appointment		2025-10-03 14:00:00	15	scheduled	consultation		f	2025-10-03 07:08:04.443026	nurse	\N
11	2	4	3	kafia - Nurse Appointment		2025-10-03 14:15:00	30	scheduled	consultation		f	2025-10-03 07:08:49.735433	nurse	\N
12	2	3	3	ANN - Nurse Appointment		2025-10-03 15:30:00	30	scheduled	consultation		f	2025-10-03 07:09:47.77961	nurse	\N
13	2	3	3	ANN - Nurse Appointment		2025-10-03 16:00:00	30	scheduled	consultation		f	2025-10-03 07:11:23.956554	nurse	\N
14	2	3	3	ANN - Nurse Appointment		2025-10-03 17:00:00	30	scheduled	consultation		f	2025-10-03 07:12:12.25985	nurse	\N
15	2	3	3	ANN - Nurse Appointment		2025-10-03 12:30:00	60	scheduled	consultation		f	2025-10-03 07:27:12.760115	nurse	\N
16	2	1	3	Alice - Nurse Appointment		2025-10-03 16:30:00	30	scheduled	consultation		f	2025-10-03 07:55:57.374322	nurse	\N
17	2	4	3	kafia - Nurse Appointment		2025-10-03 15:00:00	15	scheduled	consultation		f	2025-10-03 08:05:03.466642	nurse	\N
18	2	1	7	Alice - Doctor Appointment		2025-10-10 12:15:00	30	scheduled	consultation		f	2025-10-03 08:10:31.351799	doctor	\N
19	2	2	3	Robert - Nurse Appointment		2025-10-04 07:00:00	60	scheduled	consultation		f	2025-10-03 08:15:32.217545	nurse	\N
20	2	3	3	ANN - Nurse Appointment		2025-10-03 15:15:00	15	scheduled	consultation		f	2025-10-03 08:27:56.708709	nurse	\N
21	2	1	3	Alice - Nurse Appointment		2025-10-03 13:30:00	30	scheduled	consultation		f	2025-10-03 08:39:22.620617	nurse	1
22	2	4	3	kafia - Nurse Appointment		2025-10-03 14:45:00	15	scheduled	consultation		f	2025-10-03 08:46:19.397344	nurse	1
23	2	1	3	Alice - Nurse Appointment		2025-10-05 00:00:00	15	scheduled	consultation		f	2025-10-03 09:21:11.007099	nurse	1
24	2	6	3	ANN - Nurse Appointment		2025-10-04 10:30:00	30	scheduled	consultation		f	2025-10-03 09:24:15.476049	nurse	1
25	2	4	3	kafia - Nurse Appointment		2025-10-04 00:00:00	15	scheduled	consultation		f	2025-10-03 09:52:41.731554	nurse	1
26	2	2	7	Robert - Doctor Appointment		2025-10-03 00:00:00	30	scheduled	consultation		f	2025-10-03 11:08:59.912014	doctor	1
27	2	3	7	ANN - Doctor Appointment		2025-10-03 00:30:00	15	scheduled	consultation		f	2025-10-03 11:09:44.492595	doctor	1
28	2	4	7	kafia - Doctor Appointment		2025-10-03 11:00:00	15	scheduled	consultation		f	2025-10-03 11:11:53.409743	doctor	1
29	2	3	7	ANN - Doctor Appointment		2025-10-03 00:45:00	15	scheduled	consultation		f	2025-10-03 11:12:24.538477	doctor	1
30	2	3	7	ANN - Doctor Appointment		2025-10-03 01:00:00	15	scheduled	consultation		f	2025-10-03 11:12:55.362732	doctor	1
\.


--
-- Data for Name: chatbot_analytics; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.chatbot_analytics (id, organization_id, config_id, date, total_sessions, completed_sessions, total_messages, appointments_booked, prescription_requests, created_at) FROM stdin;
\.


--
-- Data for Name: chatbot_configs; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.chatbot_configs (id, organization_id, name, description, is_active, primary_color, welcome_message, appointment_booking_enabled, prescription_requests_enabled, api_key, embed_code, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: chatbot_messages; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.chatbot_messages (id, organization_id, session_id, message_id, sender, message_type, content, intent, confidence, ai_processed, is_read, created_at) FROM stdin;
\.


--
-- Data for Name: chatbot_sessions; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.chatbot_sessions (id, organization_id, config_id, session_id, visitor_id, patient_id, status, current_intent, extracted_patient_name, extracted_phone, extracted_email, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: claims; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.claims (id, organization_id, patient_id, claim_number, service_date, submission_date, amount, status, payment_amount, payment_date, denial_reason, insurance_provider, procedures, created_at) FROM stdin;
\.


--
-- Data for Name: clinical_photos; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.clinical_photos (id, organization_id, patient_id, captured_by, type, description, file_name, file_path, file_size, mime_type, metadata, ai_analysis, status, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: clinical_procedures; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.clinical_procedures (id, organization_id, name, category, duration, complexity, prerequisites, steps, complications, is_active, created_at) FROM stdin;
\.


--
-- Data for Name: consultations; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.consultations (id, organization_id, appointment_id, patient_id, provider_id, consultation_type, chief_complaint, history_of_present_illness, vitals, physical_exam, assessment, diagnosis, treatment_plan, prescriptions, follow_up_instructions, consultation_notes, status, start_time, end_time, duration, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: conversations; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.conversations (id, organization_id, participants, last_message, unread_count, is_patient_conversation, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: documents; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.documents (id, organization_id, user_id, name, type, content, metadata, is_template, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: emergency_protocols; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.emergency_protocols (id, organization_id, title, priority, steps, is_active, created_at) FROM stdin;
\.


--
-- Data for Name: financial_forecasts; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.financial_forecasts (id, organization_id, category, forecast_period, generated_at, current_value, projected_value, variance, trend, confidence, methodology, key_factors, model_id, metadata, is_active, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: forecast_models; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.forecast_models (id, organization_id, name, type, algorithm, parameters, accuracy, is_active, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: gdpr_audit_trail; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.gdpr_audit_trail (id, organization_id, user_id, patient_id, action, resource_type, resource_id, data_categories, legal_basis, purpose, changes, ip_address, user_agent, session_id, "timestamp", metadata) FROM stdin;
\.


--
-- Data for Name: gdpr_consents; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.gdpr_consents (id, organization_id, patient_id, consent_type, status, granted_at, withdrawn_at, expires_at, purpose, legal_basis, data_categories, retention_period, ip_address, user_agent, consent_method, metadata, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: gdpr_data_requests; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.gdpr_data_requests (id, organization_id, patient_id, request_type, status, request_reason, identity_verified, processed_by, requested_at, completed_at, due_date, response_data, rejection_reason, communication_log, metadata, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: gdpr_processing_activities; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.gdpr_processing_activities (id, organization_id, activity_name, purpose, legal_basis, data_categories, data_subjects, recipients, international_transfers, retention_period, security_measures, dpia_required, status, review_date, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: insurance_verifications; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.insurance_verifications (id, organization_id, patient_id, patient_name, provider, policy_number, group_number, member_number, nhs_number, plan_type, coverage_type, status, eligibility_status, effective_date, expiration_date, last_verified, benefits, created_at, updated_at) FROM stdin;
1	2	1	Alice Williams	Vitality Health	3131313	qweqwe	1312313	131 231 2312	basic	primary	active	pending	2025-10-17	\N	2025-10-03	{"copay": 231313, "deductible": 23, "coinsurance": 31, "deductibleMet": 3, "outOfPocketMax": 0, "outOfPocketMet": 33}	2025-10-03 07:57:40.495402	2025-10-03 07:57:40.495402
\.


--
-- Data for Name: inventory_batches; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.inventory_batches (id, organization_id, item_id, batch_number, expiry_date, manufacture_date, quantity, remaining_quantity, purchase_price, supplier_id, received_date, status, is_expired, created_at) FROM stdin;
\.


--
-- Data for Name: inventory_categories; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.inventory_categories (id, organization_id, name, description, parent_category_id, is_active, created_at, updated_at) FROM stdin;
1	2	Tablets	Oral solid dosage forms including tablets and capsules	\N	t	2025-10-02 11:56:13.758086	2025-10-02 11:56:13.758086
2	2	Syrups	Liquid medications in syrup form	\N	t	2025-10-02 11:56:13.758086	2025-10-02 11:56:13.758086
3	2	Pharmaceuticals	General pharmaceutical products	\N	t	2025-10-02 11:56:13.758086	2025-10-02 11:56:13.758086
4	2	Beauty Products	Cosmetic and beauty care items	\N	t	2025-10-02 11:56:13.758086	2025-10-02 11:56:13.758086
5	2	Vitamins	Vitamin supplements and nutritional products	\N	t	2025-10-02 11:56:13.758086	2025-10-02 11:56:13.758086
6	2	Minerals	Mineral supplements and health products	\N	t	2025-10-02 11:56:13.758086	2025-10-02 11:56:13.758086
7	2	Medical Supplies	General medical supplies and equipment	\N	t	2025-10-02 11:56:13.758086	2025-10-02 11:56:13.758086
8	2	First Aid	First aid supplies and emergency medications	\N	t	2025-10-02 11:56:13.758086	2025-10-02 11:56:13.758086
9	2	Injections	Injectable medications and vaccines	\N	t	2025-10-02 11:56:13.758086	2025-10-02 11:56:13.758086
10	2	Topical	Creams, ointments, and topical applications	\N	t	2025-10-02 11:56:13.758086	2025-10-02 11:56:13.758086
\.


--
-- Data for Name: inventory_items; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.inventory_items (id, organization_id, category_id, name, description, sku, barcode, generic_name, brand_name, manufacturer, unit_of_measurement, pack_size, purchase_price, sale_price, mrp, tax_rate, current_stock, minimum_stock, maximum_stock, reorder_point, expiry_tracking, batch_tracking, prescription_required, storage_conditions, side_effects, contraindications, dosage_instructions, is_active, is_discontinued, created_at, updated_at) FROM stdin;
1	2	1	Paracetamol 500mg	Pain relief and fever reducer	TAB-PARA500-001	1234567890123	Paracetamol	Panadol	GSK	tablets	100	15.50	22.99	25.99	20.00	500	50	2000	100	f	f	f	Store in cool, dry place	\N	\N	1-2 tablets every 4-6 hours as needed	t	f	2025-10-02 11:56:14.258282	2025-10-02 11:56:14.258282
2	2	1	Ibuprofen 400mg	Anti-inflammatory pain relief	TAB-IBU400-002	2345678901234	Ibuprofen	Nurofen	Reckitt Benckiser	tablets	84	12.75	18.99	21.99	20.00	300	30	1500	75	f	f	f	Store below 25°C	\N	\N	1 tablet every 4-6 hours with food	t	f	2025-10-02 11:56:14.258282	2025-10-02 11:56:14.258282
3	2	2	Children's Paracetamol Suspension	Liquid paracetamol for children	SYR-CHPARA-003	3456789012345	Paracetamol	Calpol	Johnson & Johnson	bottles	1	8.25	12.49	14.99	20.00	150	20	500	40	f	f	f	Store below 25°C, do not freeze	\N	\N	As per age and weight guidelines	t	f	2025-10-02 11:56:14.258282	2025-10-02 11:56:14.258282
4	2	5	Vitamin D3 1000IU	Vitamin D supplement	VIT-D3-1000-004	4567890123456	Cholecalciferol	VitaD3	Holland & Barrett	tablets	60	9.99	15.99	18.99	20.00	200	25	800	50	f	f	f	Store in cool, dry place	\N	\N	1 tablet daily with food	t	f	2025-10-02 11:56:14.258282	2025-10-02 11:56:14.258282
5	2	7	Digital Thermometer	Digital oral/axillary thermometer	MED-THERM-005	5678901234567	\N	OmniTemp	Medical Devices Ltd	pieces	1	12.50	19.99	24.99	20.00	75	10	200	25	f	f	f	Store at room temperature	\N	\N	\N	t	f	2025-10-02 11:56:14.258282	2025-10-02 11:56:14.258282
6	2	7	Disposable Gloves (Nitrile)	Powder-free nitrile examination gloves	MED-GLOVE-006	6789012345678	\N	SafeGuard	MedProtect	boxes	100	18.75	28.99	32.99	20.00	50	10	300	20	f	f	f	Store in cool, dry place away from direct sunlight	\N	\N	\N	t	f	2025-10-02 11:56:14.258282	2025-10-02 11:56:14.258282
\.


--
-- Data for Name: inventory_purchase_order_items; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.inventory_purchase_order_items (id, organization_id, purchase_order_id, item_id, quantity, unit_price, total_price, received_quantity, created_at) FROM stdin;
\.


--
-- Data for Name: inventory_purchase_orders; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.inventory_purchase_orders (id, organization_id, po_number, supplier_id, order_date, expected_delivery_date, status, total_amount, tax_amount, discount_amount, notes, created_by, approved_by, approved_at, email_sent, email_sent_at, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: inventory_sale_items; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.inventory_sale_items (id, organization_id, sale_id, item_id, batch_id, quantity, unit_price, total_price, created_at) FROM stdin;
\.


--
-- Data for Name: inventory_sales; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.inventory_sales (id, organization_id, patient_id, sale_number, sale_date, total_amount, tax_amount, discount_amount, payment_method, payment_status, prescription_id, sold_by, notes, created_at) FROM stdin;
\.


--
-- Data for Name: inventory_stock_alerts; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.inventory_stock_alerts (id, organization_id, item_id, alert_type, threshold_value, current_value, status, message, is_read, is_resolved, resolved_by, resolved_at, created_at) FROM stdin;
\.


--
-- Data for Name: inventory_stock_movements; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.inventory_stock_movements (id, organization_id, item_id, batch_id, movement_type, quantity, previous_stock, new_stock, unit_cost, reference_type, reference_id, notes, created_by, created_at) FROM stdin;
\.


--
-- Data for Name: inventory_suppliers; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.inventory_suppliers (id, organization_id, name, contact_person, email, phone, address, city, country, tax_id, payment_terms, is_active, created_at, updated_at) FROM stdin;
1	2	Halo Pharmacy	David Wilson	orders@halopharmacy.co.uk	+44 20 7946 0958	123 Health Street	London	UK	GB123456789	Net 30	t	2025-10-02 11:56:14.003997	2025-10-02 11:56:14.003997
2	2	MedSupply UK	Sarah Johnson	procurement@medsupplyuk.com	+44 161 234 5678	456 Medical Ave	Manchester	UK	GB987654321	Net 30	t	2025-10-02 11:56:14.003997	2025-10-02 11:56:14.003997
3	2	Healthcare Direct	Michael Brown	orders@healthcaredirect.co.uk	+44 121 345 6789	789 Pharma Road	Birmingham	UK	GB456789123	Net 15	t	2025-10-02 11:56:14.003997	2025-10-02 11:56:14.003997
\.


--
-- Data for Name: lab_results; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.lab_results (id, organization_id, patient_id, test_id, test_type, ordered_by, doctor_name, main_specialty, sub_specialty, priority, ordered_at, collected_at, completed_at, status, results, critical_values, notes, created_at) FROM stdin;
1	2	1	CBC001	Complete Blood Count (CBC)	2	\N	\N	\N	routine	2025-09-30 11:56:10.767	2025-09-30 13:56:10.767	2025-10-01 11:56:10.767	completed	[{"name": "White Blood Cell Count", "unit": "×10³/µL", "value": "7.2", "status": "normal", "referenceRange": "4.0-11.0"}, {"name": "Red Blood Cell Count", "unit": "×10⁶/µL", "value": "4.5", "status": "normal", "referenceRange": "4.2-5.4"}, {"name": "Hemoglobin", "unit": "g/dL", "value": "14.2", "status": "normal", "referenceRange": "12.0-16.0"}]	f	All values within normal limits	2025-10-02 11:56:10.895566
2	2	2	GLU002	Blood Glucose	2	\N	\N	\N	routine	2025-10-01 11:56:10.767	2025-10-01 12:56:10.767	2025-10-01 23:56:10.767	completed	[{"flag": "HIGH", "name": "Glucose", "unit": "mg/dL", "value": "245", "status": "abnormal_high", "referenceRange": "70-99"}]	t	High glucose levels - follow up required, critical value	2025-10-02 11:56:11.141718
3	2	1	LIP003	Lipid Panel	6	\N	\N	\N	routine	2025-10-02 11:56:10.767	\N	\N	pending	[]	f	Fasting required	2025-10-02 11:56:11.383922
4	2	1	A1C004	Hemoglobin A1C	2	\N	\N	\N	routine	2025-09-29 11:56:10.767	2025-09-29 12:26:10.767	2025-09-30 11:56:10.767	completed	[{"flag": "HIGH", "name": "Hemoglobin A1C", "unit": "%", "value": "8.5", "status": "abnormal_high", "referenceRange": "< 7.0"}]	t	Elevated A1C indicates poor diabetes control	2025-10-02 11:56:11.628654
\.


--
-- Data for Name: letter_drafts; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.letter_drafts (id, organization_id, user_id, subject, recipient, doctor_email, location, copied_recipients, header, document_content, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: medical_images; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.medical_images (id, organization_id, patient_id, uploaded_by, study_type, modality, body_part, indication, priority, file_name, file_size, mime_type, image_data, status, findings, impression, radiologist, report_file_name, report_file_path, metadata, scheduled_at, performed_at, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: medical_records; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.medical_records (id, organization_id, patient_id, provider_id, type, title, notes, diagnosis, treatment, prescription, attachments, ai_suggestions, created_at) FROM stdin;
1	2	1	2	consultation	Initial Cardiac Assessment	Patient presents with mild chest discomfort. ECG shows normal sinus rhythm. Blood pressure elevated at 150/95. Recommended lifestyle modifications and continued antihypertensive therapy.	Essential Hypertension (I10)	Continue current medication, dietary consultation recommended	{"medications": [{"name": "Lisinopril", "dosage": "10mg", "duration": "30 days", "frequency": "Once daily"}]}	[]	{"riskAssessment": "Moderate cardiovascular risk", "recommendations": ["Monitor BP weekly", "Reduce sodium intake", "Regular exercise"], "drugInteractions": []}	2025-10-02 11:52:26.984571
2	2	1	2	consultation	Initial Cardiac Assessment	Patient presents with mild chest discomfort. ECG shows normal sinus rhythm. Blood pressure elevated at 150/95. Recommended lifestyle modifications and continued antihypertensive therapy.	Essential Hypertension (I10)	Continue current medication, dietary consultation recommended	{"medications": [{"name": "Lisinopril", "dosage": "10mg", "duration": "30 days", "frequency": "Once daily"}]}	[]	{"riskAssessment": "Moderate cardiovascular risk", "recommendations": ["Monitor BP weekly", "Reduce sodium intake", "Regular exercise"], "drugInteractions": []}	2025-10-02 11:56:08.435806
3	2	1	2	consultation	Initial Cardiac Assessment	Patient presents with mild chest discomfort. ECG shows normal sinus rhythm. Blood pressure elevated at 150/95. Recommended lifestyle modifications and continued antihypertensive therapy.	Essential Hypertension (I10)	Continue current medication, dietary consultation recommended	{"medications": [{"name": "Lisinopril", "dosage": "10mg", "duration": "30 days", "frequency": "Once daily"}]}	[]	{"riskAssessment": "Moderate cardiovascular risk", "recommendations": ["Monitor BP weekly", "Reduce sodium intake", "Regular exercise"], "drugInteractions": []}	2025-10-02 11:57:42.784196
4	2	1	9	consultation	Initial Cardiac Assessment	Patient presents with mild chest discomfort. ECG shows normal sinus rhythm. Blood pressure elevated at 150/95. Recommended lifestyle modifications and continued antihypertensive therapy.	Essential Hypertension (I10)	Continue current medication, dietary consultation recommended	{"medications": [{"name": "Lisinopril", "dosage": "10mg", "duration": "30 days", "frequency": "Once daily"}]}	[]	{"riskAssessment": "Moderate cardiovascular risk", "recommendations": ["Monitor BP weekly", "Reduce sodium intake", "Regular exercise"], "drugInteractions": []}	2025-10-02 12:59:27.415282
5	2	1	9	consultation	Initial Cardiac Assessment	Patient presents with mild chest discomfort. ECG shows normal sinus rhythm. Blood pressure elevated at 150/95. Recommended lifestyle modifications and continued antihypertensive therapy.	Essential Hypertension (I10)	Continue current medication, dietary consultation recommended	{"medications": [{"name": "Lisinopril", "dosage": "10mg", "duration": "30 days", "frequency": "Once daily"}]}	[]	{"riskAssessment": "Moderate cardiovascular risk", "recommendations": ["Monitor BP weekly", "Reduce sodium intake", "Regular exercise"], "drugInteractions": []}	2025-10-02 13:38:44.586534
6	2	1	10	consultation	Initial Cardiac Assessment	Patient presents with mild chest discomfort. ECG shows normal sinus rhythm. Blood pressure elevated at 150/95. Recommended lifestyle modifications and continued antihypertensive therapy.	Essential Hypertension (I10)	Continue current medication, dietary consultation recommended	{"medications": [{"name": "Lisinopril", "dosage": "10mg", "duration": "30 days", "frequency": "Once daily"}]}	[]	{"riskAssessment": "Moderate cardiovascular risk", "recommendations": ["Monitor BP weekly", "Reduce sodium intake", "Regular exercise"], "drugInteractions": []}	2025-10-02 13:39:42.437451
7	2	1	5	consultation	Initial Cardiac Assessment	Patient presents with mild chest discomfort. ECG shows normal sinus rhythm. Blood pressure elevated at 150/95. Recommended lifestyle modifications and continued antihypertensive therapy.	Essential Hypertension (I10)	Continue current medication, dietary consultation recommended	{"medications": [{"name": "Lisinopril", "dosage": "10mg", "duration": "30 days", "frequency": "Once daily"}]}	[]	{"riskAssessment": "Moderate cardiovascular risk", "recommendations": ["Monitor BP weekly", "Reduce sodium intake", "Regular exercise"], "drugInteractions": []}	2025-10-02 13:46:44.656023
8	2	1	4	consultation	Initial Cardiac Assessment	Patient presents with mild chest discomfort. ECG shows normal sinus rhythm. Blood pressure elevated at 150/95. Recommended lifestyle modifications and continued antihypertensive therapy.	Essential Hypertension (I10)	Continue current medication, dietary consultation recommended	{"medications": [{"name": "Lisinopril", "dosage": "10mg", "duration": "30 days", "frequency": "Once daily"}]}	[]	{"riskAssessment": "Moderate cardiovascular risk", "recommendations": ["Monitor BP weekly", "Reduce sodium intake", "Regular exercise"], "drugInteractions": []}	2025-10-02 13:48:20.796963
9	2	1	4	consultation	Initial Cardiac Assessment	Patient presents with mild chest discomfort. ECG shows normal sinus rhythm. Blood pressure elevated at 150/95. Recommended lifestyle modifications and continued antihypertensive therapy.	Essential Hypertension (I10)	Continue current medication, dietary consultation recommended	{"medications": [{"name": "Lisinopril", "dosage": "10mg", "duration": "30 days", "frequency": "Once daily"}]}	[]	{"riskAssessment": "Moderate cardiovascular risk", "recommendations": ["Monitor BP weekly", "Reduce sodium intake", "Regular exercise"], "drugInteractions": []}	2025-10-02 14:23:06.226446
10	2	1	7	consultation	Initial Cardiac Assessment	Patient presents with mild chest discomfort. ECG shows normal sinus rhythm. Blood pressure elevated at 150/95. Recommended lifestyle modifications and continued antihypertensive therapy.	Essential Hypertension (I10)	Continue current medication, dietary consultation recommended	{"medications": [{"name": "Lisinopril", "dosage": "10mg", "duration": "30 days", "frequency": "Once daily"}]}	[]	{"riskAssessment": "Moderate cardiovascular risk", "recommendations": ["Monitor BP weekly", "Reduce sodium intake", "Regular exercise"], "drugInteractions": []}	2025-10-02 14:51:40.846191
11	2	1	1	consultation	Initial Cardiac Assessment	Patient presents with mild chest discomfort. ECG shows normal sinus rhythm. Blood pressure elevated at 150/95. Recommended lifestyle modifications and continued antihypertensive therapy.	Essential Hypertension (I10)	Continue current medication, dietary consultation recommended	{"medications": [{"name": "Lisinopril", "dosage": "10mg", "duration": "30 days", "frequency": "Once daily"}]}	[]	{"riskAssessment": "Moderate cardiovascular risk", "recommendations": ["Monitor BP weekly", "Reduce sodium intake", "Regular exercise"], "drugInteractions": []}	2025-10-02 15:06:03.663944
12	2	1	14	consultation	Initial Cardiac Assessment	Patient presents with mild chest discomfort. ECG shows normal sinus rhythm. Blood pressure elevated at 150/95. Recommended lifestyle modifications and continued antihypertensive therapy.	Essential Hypertension (I10)	Continue current medication, dietary consultation recommended	{"medications": [{"name": "Lisinopril", "dosage": "10mg", "duration": "30 days", "frequency": "Once daily"}]}	[]	{"riskAssessment": "Moderate cardiovascular risk", "recommendations": ["Monitor BP weekly", "Reduce sodium intake", "Regular exercise"], "drugInteractions": []}	2025-10-02 15:17:31.376071
13	2	1	3	consultation	Initial Cardiac Assessment	Patient presents with mild chest discomfort. ECG shows normal sinus rhythm. Blood pressure elevated at 150/95. Recommended lifestyle modifications and continued antihypertensive therapy.	Essential Hypertension (I10)	Continue current medication, dietary consultation recommended	{"medications": [{"name": "Lisinopril", "dosage": "10mg", "duration": "30 days", "frequency": "Once daily"}]}	[]	{"riskAssessment": "Moderate cardiovascular risk", "recommendations": ["Monitor BP weekly", "Reduce sodium intake", "Regular exercise"], "drugInteractions": []}	2025-10-03 03:18:54.538473
14	2	1	3	consultation	Initial Cardiac Assessment	Patient presents with mild chest discomfort. ECG shows normal sinus rhythm. Blood pressure elevated at 150/95. Recommended lifestyle modifications and continued antihypertensive therapy.	Essential Hypertension (I10)	Continue current medication, dietary consultation recommended	{"medications": [{"name": "Lisinopril", "dosage": "10mg", "duration": "30 days", "frequency": "Once daily"}]}	[]	{"riskAssessment": "Moderate cardiovascular risk", "recommendations": ["Monitor BP weekly", "Reduce sodium intake", "Regular exercise"], "drugInteractions": []}	2025-10-03 03:50:27.347608
15	2	1	3	consultation	Initial Cardiac Assessment	Patient presents with mild chest discomfort. ECG shows normal sinus rhythm. Blood pressure elevated at 150/95. Recommended lifestyle modifications and continued antihypertensive therapy.	Essential Hypertension (I10)	Continue current medication, dietary consultation recommended	{"medications": [{"name": "Lisinopril", "dosage": "10mg", "duration": "30 days", "frequency": "Once daily"}]}	[]	{"riskAssessment": "Moderate cardiovascular risk", "recommendations": ["Monitor BP weekly", "Reduce sodium intake", "Regular exercise"], "drugInteractions": []}	2025-10-03 04:19:27.078487
16	2	1	3	consultation	Initial Cardiac Assessment	Patient presents with mild chest discomfort. ECG shows normal sinus rhythm. Blood pressure elevated at 150/95. Recommended lifestyle modifications and continued antihypertensive therapy.	Essential Hypertension (I10)	Continue current medication, dietary consultation recommended	{"medications": [{"name": "Lisinopril", "dosage": "10mg", "duration": "30 days", "frequency": "Once daily"}]}	[]	{"riskAssessment": "Moderate cardiovascular risk", "recommendations": ["Monitor BP weekly", "Reduce sodium intake", "Regular exercise"], "drugInteractions": []}	2025-10-03 04:50:14.98821
17	2	1	3	consultation	Initial Cardiac Assessment	Patient presents with mild chest discomfort. ECG shows normal sinus rhythm. Blood pressure elevated at 150/95. Recommended lifestyle modifications and continued antihypertensive therapy.	Essential Hypertension (I10)	Continue current medication, dietary consultation recommended	{"medications": [{"name": "Lisinopril", "dosage": "10mg", "duration": "30 days", "frequency": "Once daily"}]}	[]	{"riskAssessment": "Moderate cardiovascular risk", "recommendations": ["Monitor BP weekly", "Reduce sodium intake", "Regular exercise"], "drugInteractions": []}	2025-10-03 05:08:54.740732
18	2	1	3	consultation	Initial Cardiac Assessment	Patient presents with mild chest discomfort. ECG shows normal sinus rhythm. Blood pressure elevated at 150/95. Recommended lifestyle modifications and continued antihypertensive therapy.	Essential Hypertension (I10)	Continue current medication, dietary consultation recommended	{"medications": [{"name": "Lisinopril", "dosage": "10mg", "duration": "30 days", "frequency": "Once daily"}]}	[]	{"riskAssessment": "Moderate cardiovascular risk", "recommendations": ["Monitor BP weekly", "Reduce sodium intake", "Regular exercise"], "drugInteractions": []}	2025-10-03 05:14:31.187922
19	2	1	3	consultation	Initial Cardiac Assessment	Patient presents with mild chest discomfort. ECG shows normal sinus rhythm. Blood pressure elevated at 150/95. Recommended lifestyle modifications and continued antihypertensive therapy.	Essential Hypertension (I10)	Continue current medication, dietary consultation recommended	{"medications": [{"name": "Lisinopril", "dosage": "10mg", "duration": "30 days", "frequency": "Once daily"}]}	[]	{"riskAssessment": "Moderate cardiovascular risk", "recommendations": ["Monitor BP weekly", "Reduce sodium intake", "Regular exercise"], "drugInteractions": []}	2025-10-03 05:30:34.18213
20	2	1	9	consultation	Initial Cardiac Assessment	Patient presents with mild chest discomfort. ECG shows normal sinus rhythm. Blood pressure elevated at 150/95. Recommended lifestyle modifications and continued antihypertensive therapy.	Essential Hypertension (I10)	Continue current medication, dietary consultation recommended	{"medications": [{"name": "Lisinopril", "dosage": "10mg", "duration": "30 days", "frequency": "Once daily"}]}	[]	{"riskAssessment": "Moderate cardiovascular risk", "recommendations": ["Monitor BP weekly", "Reduce sodium intake", "Regular exercise"], "drugInteractions": []}	2025-10-03 05:31:40.040811
21	2	1	7	consultation	Initial Cardiac Assessment	Patient presents with mild chest discomfort. ECG shows normal sinus rhythm. Blood pressure elevated at 150/95. Recommended lifestyle modifications and continued antihypertensive therapy.	Essential Hypertension (I10)	Continue current medication, dietary consultation recommended	{"medications": [{"name": "Lisinopril", "dosage": "10mg", "duration": "30 days", "frequency": "Once daily"}]}	[]	{"riskAssessment": "Moderate cardiovascular risk", "recommendations": ["Monitor BP weekly", "Reduce sodium intake", "Regular exercise"], "drugInteractions": []}	2025-10-03 05:41:16.351253
22	2	1	5	consultation	Initial Cardiac Assessment	Patient presents with mild chest discomfort. ECG shows normal sinus rhythm. Blood pressure elevated at 150/95. Recommended lifestyle modifications and continued antihypertensive therapy.	Essential Hypertension (I10)	Continue current medication, dietary consultation recommended	{"medications": [{"name": "Lisinopril", "dosage": "10mg", "duration": "30 days", "frequency": "Once daily"}]}	[]	{"riskAssessment": "Moderate cardiovascular risk", "recommendations": ["Monitor BP weekly", "Reduce sodium intake", "Regular exercise"], "drugInteractions": []}	2025-10-03 05:50:38.264667
23	2	1	4	consultation	Initial Cardiac Assessment	Patient presents with mild chest discomfort. ECG shows normal sinus rhythm. Blood pressure elevated at 150/95. Recommended lifestyle modifications and continued antihypertensive therapy.	Essential Hypertension (I10)	Continue current medication, dietary consultation recommended	{"medications": [{"name": "Lisinopril", "dosage": "10mg", "duration": "30 days", "frequency": "Once daily"}]}	[]	{"riskAssessment": "Moderate cardiovascular risk", "recommendations": ["Monitor BP weekly", "Reduce sodium intake", "Regular exercise"], "drugInteractions": []}	2025-10-03 05:57:34.230469
24	2	1	3	consultation	Initial Cardiac Assessment	Patient presents with mild chest discomfort. ECG shows normal sinus rhythm. Blood pressure elevated at 150/95. Recommended lifestyle modifications and continued antihypertensive therapy.	Essential Hypertension (I10)	Continue current medication, dietary consultation recommended	{"medications": [{"name": "Lisinopril", "dosage": "10mg", "duration": "30 days", "frequency": "Once daily"}]}	[]	{"riskAssessment": "Moderate cardiovascular risk", "recommendations": ["Monitor BP weekly", "Reduce sodium intake", "Regular exercise"], "drugInteractions": []}	2025-10-03 06:09:42.075377
25	2	1	10	consultation	Initial Cardiac Assessment	Patient presents with mild chest discomfort. ECG shows normal sinus rhythm. Blood pressure elevated at 150/95. Recommended lifestyle modifications and continued antihypertensive therapy.	Essential Hypertension (I10)	Continue current medication, dietary consultation recommended	{"medications": [{"name": "Lisinopril", "dosage": "10mg", "duration": "30 days", "frequency": "Once daily"}]}	[]	{"riskAssessment": "Moderate cardiovascular risk", "recommendations": ["Monitor BP weekly", "Reduce sodium intake", "Regular exercise"], "drugInteractions": []}	2025-10-03 06:19:21.541034
26	2	1	8	consultation	Initial Cardiac Assessment	Patient presents with mild chest discomfort. ECG shows normal sinus rhythm. Blood pressure elevated at 150/95. Recommended lifestyle modifications and continued antihypertensive therapy.	Essential Hypertension (I10)	Continue current medication, dietary consultation recommended	{"medications": [{"name": "Lisinopril", "dosage": "10mg", "duration": "30 days", "frequency": "Once daily"}]}	[]	{"riskAssessment": "Moderate cardiovascular risk", "recommendations": ["Monitor BP weekly", "Reduce sodium intake", "Regular exercise"], "drugInteractions": []}	2025-10-03 06:32:18.839468
27	2	1	12	consultation	Initial Cardiac Assessment	Patient presents with mild chest discomfort. ECG shows normal sinus rhythm. Blood pressure elevated at 150/95. Recommended lifestyle modifications and continued antihypertensive therapy.	Essential Hypertension (I10)	Continue current medication, dietary consultation recommended	{"medications": [{"name": "Lisinopril", "dosage": "10mg", "duration": "30 days", "frequency": "Once daily"}]}	[]	{"riskAssessment": "Moderate cardiovascular risk", "recommendations": ["Monitor BP weekly", "Reduce sodium intake", "Regular exercise"], "drugInteractions": []}	2025-10-03 07:02:26.998542
28	2	1	7	consultation	Initial Cardiac Assessment	Patient presents with mild chest discomfort. ECG shows normal sinus rhythm. Blood pressure elevated at 150/95. Recommended lifestyle modifications and continued antihypertensive therapy.	Essential Hypertension (I10)	Continue current medication, dietary consultation recommended	{"medications": [{"name": "Lisinopril", "dosage": "10mg", "duration": "30 days", "frequency": "Once daily"}]}	[]	{"riskAssessment": "Moderate cardiovascular risk", "recommendations": ["Monitor BP weekly", "Reduce sodium intake", "Regular exercise"], "drugInteractions": []}	2025-10-03 07:17:23.980337
29	2	1	6	consultation	Initial Cardiac Assessment	Patient presents with mild chest discomfort. ECG shows normal sinus rhythm. Blood pressure elevated at 150/95. Recommended lifestyle modifications and continued antihypertensive therapy.	Essential Hypertension (I10)	Continue current medication, dietary consultation recommended	{"medications": [{"name": "Lisinopril", "dosage": "10mg", "duration": "30 days", "frequency": "Once daily"}]}	[]	{"riskAssessment": "Moderate cardiovascular risk", "recommendations": ["Monitor BP weekly", "Reduce sodium intake", "Regular exercise"], "drugInteractions": []}	2025-10-03 07:38:40.432686
30	2	1	6	consultation	Initial Cardiac Assessment	Patient presents with mild chest discomfort. ECG shows normal sinus rhythm. Blood pressure elevated at 150/95. Recommended lifestyle modifications and continued antihypertensive therapy.	Essential Hypertension (I10)	Continue current medication, dietary consultation recommended	{"medications": [{"name": "Lisinopril", "dosage": "10mg", "duration": "30 days", "frequency": "Once daily"}]}	[]	{"riskAssessment": "Moderate cardiovascular risk", "recommendations": ["Monitor BP weekly", "Reduce sodium intake", "Regular exercise"], "drugInteractions": []}	2025-10-03 07:52:08.420734
31	2	2	6	consultation	Initial Cardiac Assessment	Patient presents with mild chest discomfort. ECG shows normal sinus rhythm. Blood pressure elevated at 150/95. Recommended lifestyle modifications and continued antihypertensive therapy.	Essential Hypertension (I10)	Continue current medication, dietary consultation recommended	{"medications": [{"name": "Lisinopril", "dosage": "10mg", "duration": "30 days", "frequency": "Once daily"}]}	[]	{"riskAssessment": "Moderate cardiovascular risk", "recommendations": ["Monitor BP weekly", "Reduce sodium intake", "Regular exercise"], "drugInteractions": []}	2025-10-03 08:01:18.519412
32	2	2	6	consultation	Anatomical Analysis - Orbicularis Oris	FACIAL MUSCLE ANALYSIS REPORT\n\nPatient: Robert Davis\nDate: August 25, 2025\n\nANALYSIS DETAILS:\n• Target Muscle Group: Orbicularis Oris\n• Analysis Type: Nerve Function\n• Primary Treatment: Botox Injection\n\nCLINICAL OBSERVATIONS:\n- Comprehensive anatomical assessment completed\n- Interactive muscle group identification performed\n- Professional analysis methodology applied\n\n\nTREATMENT PLAN:\n\nCOMPREHENSIVE FACIAL MUSCLE TREATMENT PLAN\n\nPatient: Robert Davis\nDate: August 25, 2025\n\nTARGET ANALYSIS:\n• Muscle Group: Orbicularis Oris\n• Analysis Type: Nerve Function\n• Primary Treatment: Botox Injection\n\nTREATMENT PROTOCOL:\n1. Initial Assessment & Baseline Documentation\n2. Pre-treatment Preparation & Patient Consultation\n3. Botox Injection Implementation\n4. Post-treatment Monitoring & Assessment\n5. Follow-up Care & Progress Evaluation\n\nEXPECTED OUTCOMES:\n• Improved muscle function and symmetry\n• Reduced symptoms and enhanced patient comfort\n• Optimized aesthetic and functional results\n• Long-term maintenance planning\n\nNEXT STEPS:\n• Schedule follow-up appointment in 1-2 weeks\n• Monitor patient response and adjust treatment as needed\n• Document progress with photographic evidence\n• Review treatment effectiveness and make modifications if required\n\nGenerated on: Aug 25, 2025, 1:17:04 PM\n\n\nAnalysis completed on: Aug 25, 2025, 1:17:24 PM	Anatomical analysis of orbicularis oris - nerve function	Botox Injection	{}	[]	{}	2025-10-03 08:01:22.783512
33	2	2	6	consultation	Initial Cardiac Assessment	Patient presents with mild chest discomfort. ECG shows normal sinus rhythm. Blood pressure elevated at 150/95. Recommended lifestyle modifications and continued antihypertensive therapy.	Essential Hypertension (I10)	Continue current medication, dietary consultation recommended	{"medications": [{"name": "Lisinopril", "dosage": "10mg", "duration": "30 days", "frequency": "Once daily"}]}	[]	{"riskAssessment": "Moderate cardiovascular risk", "recommendations": ["Monitor BP weekly", "Reduce sodium intake", "Regular exercise"], "drugInteractions": []}	2025-10-03 08:02:47.794168
34	2	2	6	consultation	Initial Cardiac Assessment	Patient presents with mild chest discomfort. ECG shows normal sinus rhythm. Blood pressure elevated at 150/95. Recommended lifestyle modifications and continued antihypertensive therapy.	Essential Hypertension (I10)	Continue current medication, dietary consultation recommended	{"medications": [{"name": "Lisinopril", "dosage": "10mg", "duration": "30 days", "frequency": "Once daily"}]}	[]	{"riskAssessment": "Moderate cardiovascular risk", "recommendations": ["Monitor BP weekly", "Reduce sodium intake", "Regular exercise"], "drugInteractions": []}	2025-10-03 08:22:58.509778
35	2	2	6	consultation	Initial Cardiac Assessment	Patient presents with mild chest discomfort. ECG shows normal sinus rhythm. Blood pressure elevated at 150/95. Recommended lifestyle modifications and continued antihypertensive therapy.	Essential Hypertension (I10)	Continue current medication, dietary consultation recommended	{"medications": [{"name": "Lisinopril", "dosage": "10mg", "duration": "30 days", "frequency": "Once daily"}]}	[]	{"riskAssessment": "Moderate cardiovascular risk", "recommendations": ["Monitor BP weekly", "Reduce sodium intake", "Regular exercise"], "drugInteractions": []}	2025-10-03 08:24:38.684092
36	2	2	6	consultation	Initial Cardiac Assessment	Patient presents with mild chest discomfort. ECG shows normal sinus rhythm. Blood pressure elevated at 150/95. Recommended lifestyle modifications and continued antihypertensive therapy.	Essential Hypertension (I10)	Continue current medication, dietary consultation recommended	{"medications": [{"name": "Lisinopril", "dosage": "10mg", "duration": "30 days", "frequency": "Once daily"}]}	[]	{"riskAssessment": "Moderate cardiovascular risk", "recommendations": ["Monitor BP weekly", "Reduce sodium intake", "Regular exercise"], "drugInteractions": []}	2025-10-03 08:26:12.612643
37	2	2	6	consultation	Initial Cardiac Assessment	Patient presents with mild chest discomfort. ECG shows normal sinus rhythm. Blood pressure elevated at 150/95. Recommended lifestyle modifications and continued antihypertensive therapy.	Essential Hypertension (I10)	Continue current medication, dietary consultation recommended	{"medications": [{"name": "Lisinopril", "dosage": "10mg", "duration": "30 days", "frequency": "Once daily"}]}	[]	{"riskAssessment": "Moderate cardiovascular risk", "recommendations": ["Monitor BP weekly", "Reduce sodium intake", "Regular exercise"], "drugInteractions": []}	2025-10-03 08:35:29.485021
38	2	2	6	consultation	Initial Cardiac Assessment	Patient presents with mild chest discomfort. ECG shows normal sinus rhythm. Blood pressure elevated at 150/95. Recommended lifestyle modifications and continued antihypertensive therapy.	Essential Hypertension (I10)	Continue current medication, dietary consultation recommended	{"medications": [{"name": "Lisinopril", "dosage": "10mg", "duration": "30 days", "frequency": "Once daily"}]}	[]	{"riskAssessment": "Moderate cardiovascular risk", "recommendations": ["Monitor BP weekly", "Reduce sodium intake", "Regular exercise"], "drugInteractions": []}	2025-10-03 08:43:38.144892
39	2	2	6	consultation	Initial Cardiac Assessment	Patient presents with mild chest discomfort. ECG shows normal sinus rhythm. Blood pressure elevated at 150/95. Recommended lifestyle modifications and continued antihypertensive therapy.	Essential Hypertension (I10)	Continue current medication, dietary consultation recommended	{"medications": [{"name": "Lisinopril", "dosage": "10mg", "duration": "30 days", "frequency": "Once daily"}]}	[]	{"riskAssessment": "Moderate cardiovascular risk", "recommendations": ["Monitor BP weekly", "Reduce sodium intake", "Regular exercise"], "drugInteractions": []}	2025-10-03 09:03:14.33662
40	2	2	6	consultation	Initial Cardiac Assessment	Patient presents with mild chest discomfort. ECG shows normal sinus rhythm. Blood pressure elevated at 150/95. Recommended lifestyle modifications and continued antihypertensive therapy.	Essential Hypertension (I10)	Continue current medication, dietary consultation recommended	{"medications": [{"name": "Lisinopril", "dosage": "10mg", "duration": "30 days", "frequency": "Once daily"}]}	[]	{"riskAssessment": "Moderate cardiovascular risk", "recommendations": ["Monitor BP weekly", "Reduce sodium intake", "Regular exercise"], "drugInteractions": []}	2025-10-03 09:44:49.98247
41	2	2	6	consultation	Initial Cardiac Assessment	Patient presents with mild chest discomfort. ECG shows normal sinus rhythm. Blood pressure elevated at 150/95. Recommended lifestyle modifications and continued antihypertensive therapy.	Essential Hypertension (I10)	Continue current medication, dietary consultation recommended	{"medications": [{"name": "Lisinopril", "dosage": "10mg", "duration": "30 days", "frequency": "Once daily"}]}	[]	{"riskAssessment": "Moderate cardiovascular risk", "recommendations": ["Monitor BP weekly", "Reduce sodium intake", "Regular exercise"], "drugInteractions": []}	2025-10-03 09:45:36.107042
42	2	2	6	consultation	Initial Cardiac Assessment	Patient presents with mild chest discomfort. ECG shows normal sinus rhythm. Blood pressure elevated at 150/95. Recommended lifestyle modifications and continued antihypertensive therapy.	Essential Hypertension (I10)	Continue current medication, dietary consultation recommended	{"medications": [{"name": "Lisinopril", "dosage": "10mg", "duration": "30 days", "frequency": "Once daily"}]}	[]	{"riskAssessment": "Moderate cardiovascular risk", "recommendations": ["Monitor BP weekly", "Reduce sodium intake", "Regular exercise"], "drugInteractions": []}	2025-10-03 10:09:15.746638
43	2	2	6	consultation	Initial Cardiac Assessment	Patient presents with mild chest discomfort. ECG shows normal sinus rhythm. Blood pressure elevated at 150/95. Recommended lifestyle modifications and continued antihypertensive therapy.	Essential Hypertension (I10)	Continue current medication, dietary consultation recommended	{"medications": [{"name": "Lisinopril", "dosage": "10mg", "duration": "30 days", "frequency": "Once daily"}]}	[]	{"riskAssessment": "Moderate cardiovascular risk", "recommendations": ["Monitor BP weekly", "Reduce sodium intake", "Regular exercise"], "drugInteractions": []}	2025-10-03 10:19:13.718585
44	2	2	6	consultation	Initial Cardiac Assessment	Patient presents with mild chest discomfort. ECG shows normal sinus rhythm. Blood pressure elevated at 150/95. Recommended lifestyle modifications and continued antihypertensive therapy.	Essential Hypertension (I10)	Continue current medication, dietary consultation recommended	{"medications": [{"name": "Lisinopril", "dosage": "10mg", "duration": "30 days", "frequency": "Once daily"}]}	[]	{"riskAssessment": "Moderate cardiovascular risk", "recommendations": ["Monitor BP weekly", "Reduce sodium intake", "Regular exercise"], "drugInteractions": []}	2025-10-03 10:37:33.436291
45	2	2	6	consultation	Initial Cardiac Assessment	Patient presents with mild chest discomfort. ECG shows normal sinus rhythm. Blood pressure elevated at 150/95. Recommended lifestyle modifications and continued antihypertensive therapy.	Essential Hypertension (I10)	Continue current medication, dietary consultation recommended	{"medications": [{"name": "Lisinopril", "dosage": "10mg", "duration": "30 days", "frequency": "Once daily"}]}	[]	{"riskAssessment": "Moderate cardiovascular risk", "recommendations": ["Monitor BP weekly", "Reduce sodium intake", "Regular exercise"], "drugInteractions": []}	2025-10-03 10:46:57.282389
46	2	2	6	consultation	Initial Cardiac Assessment	Patient presents with mild chest discomfort. ECG shows normal sinus rhythm. Blood pressure elevated at 150/95. Recommended lifestyle modifications and continued antihypertensive therapy.	Essential Hypertension (I10)	Continue current medication, dietary consultation recommended	{"medications": [{"name": "Lisinopril", "dosage": "10mg", "duration": "30 days", "frequency": "Once daily"}]}	[]	{"riskAssessment": "Moderate cardiovascular risk", "recommendations": ["Monitor BP weekly", "Reduce sodium intake", "Regular exercise"], "drugInteractions": []}	2025-10-03 10:54:40.237328
47	2	2	6	consultation	Initial Cardiac Assessment	Patient presents with mild chest discomfort. ECG shows normal sinus rhythm. Blood pressure elevated at 150/95. Recommended lifestyle modifications and continued antihypertensive therapy.	Essential Hypertension (I10)	Continue current medication, dietary consultation recommended	{"medications": [{"name": "Lisinopril", "dosage": "10mg", "duration": "30 days", "frequency": "Once daily"}]}	[]	{"riskAssessment": "Moderate cardiovascular risk", "recommendations": ["Monitor BP weekly", "Reduce sodium intake", "Regular exercise"], "drugInteractions": []}	2025-10-03 11:41:08.213722
48	2	2	6	consultation	Initial Cardiac Assessment	Patient presents with mild chest discomfort. ECG shows normal sinus rhythm. Blood pressure elevated at 150/95. Recommended lifestyle modifications and continued antihypertensive therapy.	Essential Hypertension (I10)	Continue current medication, dietary consultation recommended	{"medications": [{"name": "Lisinopril", "dosage": "10mg", "duration": "30 days", "frequency": "Once daily"}]}	[]	{"riskAssessment": "Moderate cardiovascular risk", "recommendations": ["Monitor BP weekly", "Reduce sodium intake", "Regular exercise"], "drugInteractions": []}	2025-10-03 11:54:15.576096
49	2	2	6	consultation	Initial Cardiac Assessment	Patient presents with mild chest discomfort. ECG shows normal sinus rhythm. Blood pressure elevated at 150/95. Recommended lifestyle modifications and continued antihypertensive therapy.	Essential Hypertension (I10)	Continue current medication, dietary consultation recommended	{"medications": [{"name": "Lisinopril", "dosage": "10mg", "duration": "30 days", "frequency": "Once daily"}]}	[]	{"riskAssessment": "Moderate cardiovascular risk", "recommendations": ["Monitor BP weekly", "Reduce sodium intake", "Regular exercise"], "drugInteractions": []}	2025-10-03 12:38:20.355437
50	2	2	6	consultation	Initial Cardiac Assessment	Patient presents with mild chest discomfort. ECG shows normal sinus rhythm. Blood pressure elevated at 150/95. Recommended lifestyle modifications and continued antihypertensive therapy.	Essential Hypertension (I10)	Continue current medication, dietary consultation recommended	{"medications": [{"name": "Lisinopril", "dosage": "10mg", "duration": "30 days", "frequency": "Once daily"}]}	[]	{"riskAssessment": "Moderate cardiovascular risk", "recommendations": ["Monitor BP weekly", "Reduce sodium intake", "Regular exercise"], "drugInteractions": []}	2025-10-03 12:44:21.887762
\.


--
-- Data for Name: medications_database; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.medications_database (id, organization_id, name, category, dosage, interactions, warnings, severity, is_active, created_at) FROM stdin;
\.


--
-- Data for Name: messages; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.messages (id, organization_id, conversation_id, sender_id, sender_name, sender_role, recipient_id, recipient_name, subject, content, "timestamp", is_read, priority, type, is_starred, phone_number, message_type, delivery_status, external_message_id, created_at) FROM stdin;
\.


--
-- Data for Name: muscles_position; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.muscles_position (id, organization_id, patient_id, consultation_id, "position", value, coordinates, is_detected, detected_at, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: notifications; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.notifications (id, organization_id, user_id, title, message, type, priority, status, related_entity_type, related_entity_id, action_url, is_actionable, scheduled_for, expires_at, metadata, read_at, dismissed_at, created_at, updated_at) FROM stdin;
1	2	2	Lab Results Available	Blood work results for Sarah Johnson are now available for review.	lab_result	normal	unread	patient	1	/patients/1/lab-results	t	\N	\N	{"icon": "Activity", "color": "blue", "urgency": "medium", "patientId": 1, "department": "Laboratory", "patientName": "Sarah Johnson"}	\N	\N	2025-10-02 11:52:27.246777	2025-10-02 11:52:27.246777
2	2	2	Appointment Reminder	Upcoming appointment with Sarah Johnson tomorrow at 10:00 AM.	appointment_reminder	high	unread	appointment	912	/calendar	t	\N	\N	{"icon": "Calendar", "color": "orange", "urgency": "high", "patientId": 1, "department": "Cardiology", "patientName": "Sarah Johnson", "appointmentId": 912}	\N	\N	2025-10-02 11:52:27.246777	2025-10-02 11:52:27.246777
3	2	1	Critical Drug Interaction Alert	Potential interaction detected between Warfarin and Aspirin for patient Robert Davis.	prescription_alert	critical	unread	patient	2	/patients/2/prescriptions	t	\N	\N	{"icon": "AlertTriangle", "color": "red", "urgency": "critical", "patientId": 2, "department": "Pharmacy", "patientName": "Robert Davis", "requiresResponse": true}	\N	\N	2025-10-02 11:52:27.246777	2025-10-02 11:52:27.246777
4	2	3	Patient Message	Sarah Johnson has sent a message regarding her medication side effects.	message	normal	read	patient	1	/messaging/conversations/1	t	\N	\N	{"icon": "MessageSquare", "color": "green", "urgency": "medium", "patientId": 1, "department": "General", "patientName": "Sarah Johnson"}	2025-10-02 09:52:27.131	\N	2025-10-02 11:52:27.246777	2025-10-02 11:52:27.246777
5	2	2	System Maintenance Alert	Scheduled system maintenance will occur tonight from 2:00 AM - 4:00 AM.	system_alert	low	unread	\N	\N	\N	f	\N	\N	{"icon": "Settings", "color": "gray", "urgency": "low", "department": "IT", "autoMarkAsRead": true}	\N	\N	2025-10-02 11:52:27.246777	2025-10-02 11:52:27.246777
6	2	2	Lab Results Available	Blood work results for Sarah Johnson are now available for review.	lab_result	normal	unread	patient	1	/patients/1/lab-results	t	\N	\N	{"icon": "Activity", "color": "blue", "urgency": "medium", "patientId": 1, "department": "Laboratory", "patientName": "Sarah Johnson"}	\N	\N	2025-10-02 11:56:08.89176	2025-10-02 11:56:08.89176
7	2	2	Appointment Reminder	Upcoming appointment with Sarah Johnson tomorrow at 10:00 AM.	appointment_reminder	high	unread	appointment	912	/calendar	t	\N	\N	{"icon": "Calendar", "color": "orange", "urgency": "high", "patientId": 1, "department": "Cardiology", "patientName": "Sarah Johnson", "appointmentId": 912}	\N	\N	2025-10-02 11:56:08.89176	2025-10-02 11:56:08.89176
8	2	1	Critical Drug Interaction Alert	Potential interaction detected between Warfarin and Aspirin for patient Robert Davis.	prescription_alert	critical	unread	patient	2	/patients/2/prescriptions	t	\N	\N	{"icon": "AlertTriangle", "color": "red", "urgency": "critical", "patientId": 2, "department": "Pharmacy", "patientName": "Robert Davis", "requiresResponse": true}	\N	\N	2025-10-02 11:56:08.89176	2025-10-02 11:56:08.89176
9	2	3	Patient Message	Sarah Johnson has sent a message regarding her medication side effects.	message	normal	read	patient	1	/messaging/conversations/1	t	\N	\N	{"icon": "MessageSquare", "color": "green", "urgency": "medium", "patientId": 1, "department": "General", "patientName": "Sarah Johnson"}	2025-10-02 09:56:08.676	\N	2025-10-02 11:56:08.89176	2025-10-02 11:56:08.89176
10	2	2	System Maintenance Alert	Scheduled system maintenance will occur tonight from 2:00 AM - 4:00 AM.	system_alert	low	unread	\N	\N	\N	f	\N	\N	{"icon": "Settings", "color": "gray", "urgency": "low", "department": "IT", "autoMarkAsRead": true}	\N	\N	2025-10-02 11:56:08.89176	2025-10-02 11:56:08.89176
11	2	2	Lab Results Available	Blood work results for Sarah Johnson are now available for review.	lab_result	normal	unread	patient	1	/patients/1/lab-results	t	\N	\N	{"icon": "Activity", "color": "blue", "urgency": "medium", "patientId": 1, "department": "Laboratory", "patientName": "Sarah Johnson"}	\N	\N	2025-10-02 11:57:43.709312	2025-10-02 11:57:43.709312
12	2	2	Appointment Reminder	Upcoming appointment with Sarah Johnson tomorrow at 10:00 AM.	appointment_reminder	high	unread	appointment	912	/calendar	t	\N	\N	{"icon": "Calendar", "color": "orange", "urgency": "high", "patientId": 1, "department": "Cardiology", "patientName": "Sarah Johnson", "appointmentId": 912}	\N	\N	2025-10-02 11:57:43.709312	2025-10-02 11:57:43.709312
13	2	1	Critical Drug Interaction Alert	Potential interaction detected between Warfarin and Aspirin for patient Robert Davis.	prescription_alert	critical	unread	patient	2	/patients/2/prescriptions	t	\N	\N	{"icon": "AlertTriangle", "color": "red", "urgency": "critical", "patientId": 2, "department": "Pharmacy", "patientName": "Robert Davis", "requiresResponse": true}	\N	\N	2025-10-02 11:57:43.709312	2025-10-02 11:57:43.709312
14	2	3	Patient Message	Sarah Johnson has sent a message regarding her medication side effects.	message	normal	read	patient	1	/messaging/conversations/1	t	\N	\N	{"icon": "MessageSquare", "color": "green", "urgency": "medium", "patientId": 1, "department": "General", "patientName": "Sarah Johnson"}	2025-10-02 09:57:43.574	\N	2025-10-02 11:57:43.709312	2025-10-02 11:57:43.709312
15	2	2	System Maintenance Alert	Scheduled system maintenance will occur tonight from 2:00 AM - 4:00 AM.	system_alert	low	unread	\N	\N	\N	f	\N	\N	{"icon": "Settings", "color": "gray", "urgency": "low", "department": "IT", "autoMarkAsRead": true}	\N	\N	2025-10-02 11:57:43.709312	2025-10-02 11:57:43.709312
16	2	9	Lab Results Available	Blood work results for Sarah Johnson are now available for review.	lab_result	normal	unread	patient	1	/patients/1/lab-results	t	\N	\N	{"icon": "Activity", "color": "blue", "urgency": "medium", "patientId": 1, "department": "Laboratory", "patientName": "Sarah Johnson"}	\N	\N	2025-10-02 12:59:27.663197	2025-10-02 12:59:27.663197
17	2	9	Appointment Reminder	Upcoming appointment with Sarah Johnson tomorrow at 10:00 AM.	appointment_reminder	high	unread	appointment	912	/calendar	t	\N	\N	{"icon": "Calendar", "color": "orange", "urgency": "high", "patientId": 1, "department": "Cardiology", "patientName": "Sarah Johnson", "appointmentId": 912}	\N	\N	2025-10-02 12:59:27.663197	2025-10-02 12:59:27.663197
18	2	8	Critical Drug Interaction Alert	Potential interaction detected between Warfarin and Aspirin for patient Robert Davis.	prescription_alert	critical	unread	patient	2	/patients/2/prescriptions	t	\N	\N	{"icon": "AlertTriangle", "color": "red", "urgency": "critical", "patientId": 2, "department": "Pharmacy", "patientName": "Robert Davis", "requiresResponse": true}	\N	\N	2025-10-02 12:59:27.663197	2025-10-02 12:59:27.663197
19	2	10	Patient Message	Sarah Johnson has sent a message regarding her medication side effects.	message	normal	read	patient	1	/messaging/conversations/1	t	\N	\N	{"icon": "MessageSquare", "color": "green", "urgency": "medium", "patientId": 1, "department": "General", "patientName": "Sarah Johnson"}	2025-10-02 10:59:27.545	\N	2025-10-02 12:59:27.663197	2025-10-02 12:59:27.663197
20	2	9	System Maintenance Alert	Scheduled system maintenance will occur tonight from 2:00 AM - 4:00 AM.	system_alert	low	unread	\N	\N	\N	f	\N	\N	{"icon": "Settings", "color": "gray", "urgency": "low", "department": "IT", "autoMarkAsRead": true}	\N	\N	2025-10-02 12:59:27.663197	2025-10-02 12:59:27.663197
21	2	9	Lab Results Available	Blood work results for Sarah Johnson are now available for review.	lab_result	normal	unread	patient	1	/patients/1/lab-results	t	\N	\N	{"icon": "Activity", "color": "blue", "urgency": "medium", "patientId": 1, "department": "Laboratory", "patientName": "Sarah Johnson"}	\N	\N	2025-10-02 13:38:44.832102	2025-10-02 13:38:44.832102
22	2	9	Appointment Reminder	Upcoming appointment with Sarah Johnson tomorrow at 10:00 AM.	appointment_reminder	high	unread	appointment	912	/calendar	t	\N	\N	{"icon": "Calendar", "color": "orange", "urgency": "high", "patientId": 1, "department": "Cardiology", "patientName": "Sarah Johnson", "appointmentId": 912}	\N	\N	2025-10-02 13:38:44.832102	2025-10-02 13:38:44.832102
23	2	8	Critical Drug Interaction Alert	Potential interaction detected between Warfarin and Aspirin for patient Robert Davis.	prescription_alert	critical	unread	patient	2	/patients/2/prescriptions	t	\N	\N	{"icon": "AlertTriangle", "color": "red", "urgency": "critical", "patientId": 2, "department": "Pharmacy", "patientName": "Robert Davis", "requiresResponse": true}	\N	\N	2025-10-02 13:38:44.832102	2025-10-02 13:38:44.832102
24	2	10	Patient Message	Sarah Johnson has sent a message regarding her medication side effects.	message	normal	read	patient	1	/messaging/conversations/1	t	\N	\N	{"icon": "MessageSquare", "color": "green", "urgency": "medium", "patientId": 1, "department": "General", "patientName": "Sarah Johnson"}	2025-10-02 11:38:44.711	\N	2025-10-02 13:38:44.832102	2025-10-02 13:38:44.832102
25	2	9	System Maintenance Alert	Scheduled system maintenance will occur tonight from 2:00 AM - 4:00 AM.	system_alert	low	unread	\N	\N	\N	f	\N	\N	{"icon": "Settings", "color": "gray", "urgency": "low", "department": "IT", "autoMarkAsRead": true}	\N	\N	2025-10-02 13:38:44.832102	2025-10-02 13:38:44.832102
26	2	10	Lab Results Available	Blood work results for Sarah Johnson are now available for review.	lab_result	normal	unread	patient	1	/patients/1/lab-results	t	\N	\N	{"icon": "Activity", "color": "blue", "urgency": "medium", "patientId": 1, "department": "Laboratory", "patientName": "Sarah Johnson"}	\N	\N	2025-10-02 13:39:42.690211	2025-10-02 13:39:42.690211
27	2	10	Appointment Reminder	Upcoming appointment with Sarah Johnson tomorrow at 10:00 AM.	appointment_reminder	high	unread	appointment	912	/calendar	t	\N	\N	{"icon": "Calendar", "color": "orange", "urgency": "high", "patientId": 1, "department": "Cardiology", "patientName": "Sarah Johnson", "appointmentId": 912}	\N	\N	2025-10-02 13:39:42.690211	2025-10-02 13:39:42.690211
28	2	9	Critical Drug Interaction Alert	Potential interaction detected between Warfarin and Aspirin for patient Robert Davis.	prescription_alert	critical	unread	patient	2	/patients/2/prescriptions	t	\N	\N	{"icon": "AlertTriangle", "color": "red", "urgency": "critical", "patientId": 2, "department": "Pharmacy", "patientName": "Robert Davis", "requiresResponse": true}	\N	\N	2025-10-02 13:39:42.690211	2025-10-02 13:39:42.690211
29	2	1	Patient Message	Sarah Johnson has sent a message regarding her medication side effects.	message	normal	read	patient	1	/messaging/conversations/1	t	\N	\N	{"icon": "MessageSquare", "color": "green", "urgency": "medium", "patientId": 1, "department": "General", "patientName": "Sarah Johnson"}	2025-10-02 11:39:42.562	\N	2025-10-02 13:39:42.690211	2025-10-02 13:39:42.690211
30	2	10	System Maintenance Alert	Scheduled system maintenance will occur tonight from 2:00 AM - 4:00 AM.	system_alert	low	unread	\N	\N	\N	f	\N	\N	{"icon": "Settings", "color": "gray", "urgency": "low", "department": "IT", "autoMarkAsRead": true}	\N	\N	2025-10-02 13:39:42.690211	2025-10-02 13:39:42.690211
31	2	5	Lab Results Available	Blood work results for Sarah Johnson are now available for review.	lab_result	normal	unread	patient	1	/patients/1/lab-results	t	\N	\N	{"icon": "Activity", "color": "blue", "urgency": "medium", "patientId": 1, "department": "Laboratory", "patientName": "Sarah Johnson"}	\N	\N	2025-10-02 13:46:44.928372	2025-10-02 13:46:44.928372
32	2	5	Appointment Reminder	Upcoming appointment with Sarah Johnson tomorrow at 10:00 AM.	appointment_reminder	high	unread	appointment	912	/calendar	t	\N	\N	{"icon": "Calendar", "color": "orange", "urgency": "high", "patientId": 1, "department": "Cardiology", "patientName": "Sarah Johnson", "appointmentId": 912}	\N	\N	2025-10-02 13:46:44.928372	2025-10-02 13:46:44.928372
33	2	4	Critical Drug Interaction Alert	Potential interaction detected between Warfarin and Aspirin for patient Robert Davis.	prescription_alert	critical	unread	patient	2	/patients/2/prescriptions	t	\N	\N	{"icon": "AlertTriangle", "color": "red", "urgency": "critical", "patientId": 2, "department": "Pharmacy", "patientName": "Robert Davis", "requiresResponse": true}	\N	\N	2025-10-02 13:46:44.928372	2025-10-02 13:46:44.928372
34	2	6	Patient Message	Sarah Johnson has sent a message regarding her medication side effects.	message	normal	read	patient	1	/messaging/conversations/1	t	\N	\N	{"icon": "MessageSquare", "color": "green", "urgency": "medium", "patientId": 1, "department": "General", "patientName": "Sarah Johnson"}	2025-10-02 11:46:44.792	\N	2025-10-02 13:46:44.928372	2025-10-02 13:46:44.928372
35	2	5	System Maintenance Alert	Scheduled system maintenance will occur tonight from 2:00 AM - 4:00 AM.	system_alert	low	unread	\N	\N	\N	f	\N	\N	{"icon": "Settings", "color": "gray", "urgency": "low", "department": "IT", "autoMarkAsRead": true}	\N	\N	2025-10-02 13:46:44.928372	2025-10-02 13:46:44.928372
36	2	4	Lab Results Available	Blood work results for Sarah Johnson are now available for review.	lab_result	normal	unread	patient	1	/patients/1/lab-results	t	\N	\N	{"icon": "Activity", "color": "blue", "urgency": "medium", "patientId": 1, "department": "Laboratory", "patientName": "Sarah Johnson"}	\N	\N	2025-10-02 13:48:21.060902	2025-10-02 13:48:21.060902
37	2	4	Appointment Reminder	Upcoming appointment with Sarah Johnson tomorrow at 10:00 AM.	appointment_reminder	high	unread	appointment	912	/calendar	t	\N	\N	{"icon": "Calendar", "color": "orange", "urgency": "high", "patientId": 1, "department": "Cardiology", "patientName": "Sarah Johnson", "appointmentId": 912}	\N	\N	2025-10-02 13:48:21.060902	2025-10-02 13:48:21.060902
38	2	3	Critical Drug Interaction Alert	Potential interaction detected between Warfarin and Aspirin for patient Robert Davis.	prescription_alert	critical	unread	patient	2	/patients/2/prescriptions	t	\N	\N	{"icon": "AlertTriangle", "color": "red", "urgency": "critical", "patientId": 2, "department": "Pharmacy", "patientName": "Robert Davis", "requiresResponse": true}	\N	\N	2025-10-02 13:48:21.060902	2025-10-02 13:48:21.060902
39	2	5	Patient Message	Sarah Johnson has sent a message regarding her medication side effects.	message	normal	read	patient	1	/messaging/conversations/1	t	\N	\N	{"icon": "MessageSquare", "color": "green", "urgency": "medium", "patientId": 1, "department": "General", "patientName": "Sarah Johnson"}	2025-10-02 11:48:20.932	\N	2025-10-02 13:48:21.060902	2025-10-02 13:48:21.060902
40	2	4	System Maintenance Alert	Scheduled system maintenance will occur tonight from 2:00 AM - 4:00 AM.	system_alert	low	unread	\N	\N	\N	f	\N	\N	{"icon": "Settings", "color": "gray", "urgency": "low", "department": "IT", "autoMarkAsRead": true}	\N	\N	2025-10-02 13:48:21.060902	2025-10-02 13:48:21.060902
41	2	4	Lab Results Available	Blood work results for Sarah Johnson are now available for review.	lab_result	normal	unread	patient	1	/patients/1/lab-results	t	\N	\N	{"icon": "Activity", "color": "blue", "urgency": "medium", "patientId": 1, "department": "Laboratory", "patientName": "Sarah Johnson"}	\N	\N	2025-10-02 14:23:06.656334	2025-10-02 14:23:06.656334
42	2	4	Appointment Reminder	Upcoming appointment with Sarah Johnson tomorrow at 10:00 AM.	appointment_reminder	high	unread	appointment	912	/calendar	t	\N	\N	{"icon": "Calendar", "color": "orange", "urgency": "high", "patientId": 1, "department": "Cardiology", "patientName": "Sarah Johnson", "appointmentId": 912}	\N	\N	2025-10-02 14:23:06.656334	2025-10-02 14:23:06.656334
43	2	3	Critical Drug Interaction Alert	Potential interaction detected between Warfarin and Aspirin for patient Robert Davis.	prescription_alert	critical	unread	patient	2	/patients/2/prescriptions	t	\N	\N	{"icon": "AlertTriangle", "color": "red", "urgency": "critical", "patientId": 2, "department": "Pharmacy", "patientName": "Robert Davis", "requiresResponse": true}	\N	\N	2025-10-02 14:23:06.656334	2025-10-02 14:23:06.656334
44	2	5	Patient Message	Sarah Johnson has sent a message regarding her medication side effects.	message	normal	read	patient	1	/messaging/conversations/1	t	\N	\N	{"icon": "MessageSquare", "color": "green", "urgency": "medium", "patientId": 1, "department": "General", "patientName": "Sarah Johnson"}	2025-10-02 12:23:06.468	\N	2025-10-02 14:23:06.656334	2025-10-02 14:23:06.656334
45	2	4	System Maintenance Alert	Scheduled system maintenance will occur tonight from 2:00 AM - 4:00 AM.	system_alert	low	unread	\N	\N	\N	f	\N	\N	{"icon": "Settings", "color": "gray", "urgency": "low", "department": "IT", "autoMarkAsRead": true}	\N	\N	2025-10-02 14:23:06.656334	2025-10-02 14:23:06.656334
46	2	7	Lab Results Available	Blood work results for Sarah Johnson are now available for review.	lab_result	normal	unread	patient	1	/patients/1/lab-results	t	\N	\N	{"icon": "Activity", "color": "blue", "urgency": "medium", "patientId": 1, "department": "Laboratory", "patientName": "Sarah Johnson"}	\N	\N	2025-10-02 14:51:46.249618	2025-10-02 14:51:46.249618
47	2	7	Appointment Reminder	Upcoming appointment with Sarah Johnson tomorrow at 10:00 AM.	appointment_reminder	high	unread	appointment	912	/calendar	t	\N	\N	{"icon": "Calendar", "color": "orange", "urgency": "high", "patientId": 1, "department": "Cardiology", "patientName": "Sarah Johnson", "appointmentId": 912}	\N	\N	2025-10-02 14:51:46.249618	2025-10-02 14:51:46.249618
48	2	6	Critical Drug Interaction Alert	Potential interaction detected between Warfarin and Aspirin for patient Robert Davis.	prescription_alert	critical	unread	patient	2	/patients/2/prescriptions	t	\N	\N	{"icon": "AlertTriangle", "color": "red", "urgency": "critical", "patientId": 2, "department": "Pharmacy", "patientName": "Robert Davis", "requiresResponse": true}	\N	\N	2025-10-02 14:51:46.249618	2025-10-02 14:51:46.249618
49	2	12	Patient Message	Sarah Johnson has sent a message regarding her medication side effects.	message	normal	read	patient	1	/messaging/conversations/1	t	\N	\N	{"icon": "MessageSquare", "color": "green", "urgency": "medium", "patientId": 1, "department": "General", "patientName": "Sarah Johnson"}	2025-10-02 12:51:46.017	\N	2025-10-02 14:51:46.249618	2025-10-02 14:51:46.249618
50	2	7	System Maintenance Alert	Scheduled system maintenance will occur tonight from 2:00 AM - 4:00 AM.	system_alert	low	unread	\N	\N	\N	f	\N	\N	{"icon": "Settings", "color": "gray", "urgency": "low", "department": "IT", "autoMarkAsRead": true}	\N	\N	2025-10-02 14:51:46.249618	2025-10-02 14:51:46.249618
51	2	1	Lab Results Available	Blood work results for Sarah Johnson are now available for review.	lab_result	normal	unread	patient	1	/patients/1/lab-results	t	\N	\N	{"icon": "Activity", "color": "blue", "urgency": "medium", "patientId": 1, "department": "Laboratory", "patientName": "Sarah Johnson"}	\N	\N	2025-10-02 15:06:03.911265	2025-10-02 15:06:03.911265
52	2	1	Appointment Reminder	Upcoming appointment with Sarah Johnson tomorrow at 10:00 AM.	appointment_reminder	high	unread	appointment	912	/calendar	t	\N	\N	{"icon": "Calendar", "color": "orange", "urgency": "high", "patientId": 1, "department": "Cardiology", "patientName": "Sarah Johnson", "appointmentId": 912}	\N	\N	2025-10-02 15:06:03.911265	2025-10-02 15:06:03.911265
53	2	4	Critical Drug Interaction Alert	Potential interaction detected between Warfarin and Aspirin for patient Robert Davis.	prescription_alert	critical	unread	patient	2	/patients/2/prescriptions	t	\N	\N	{"icon": "AlertTriangle", "color": "red", "urgency": "critical", "patientId": 2, "department": "Pharmacy", "patientName": "Robert Davis", "requiresResponse": true}	\N	\N	2025-10-02 15:06:03.911265	2025-10-02 15:06:03.911265
54	2	2	Patient Message	Sarah Johnson has sent a message regarding her medication side effects.	message	normal	read	patient	1	/messaging/conversations/1	t	\N	\N	{"icon": "MessageSquare", "color": "green", "urgency": "medium", "patientId": 1, "department": "General", "patientName": "Sarah Johnson"}	2025-10-02 13:06:03.791	\N	2025-10-02 15:06:03.911265	2025-10-02 15:06:03.911265
55	2	1	System Maintenance Alert	Scheduled system maintenance will occur tonight from 2:00 AM - 4:00 AM.	system_alert	low	unread	\N	\N	\N	f	\N	\N	{"icon": "Settings", "color": "gray", "urgency": "low", "department": "IT", "autoMarkAsRead": true}	\N	\N	2025-10-02 15:06:03.911265	2025-10-02 15:06:03.911265
56	2	14	Lab Results Available	Blood work results for Sarah Johnson are now available for review.	lab_result	normal	unread	patient	1	/patients/1/lab-results	t	\N	\N	{"icon": "Activity", "color": "blue", "urgency": "medium", "patientId": 1, "department": "Laboratory", "patientName": "Sarah Johnson"}	\N	\N	2025-10-02 15:17:31.637683	2025-10-02 15:17:31.637683
57	2	14	Appointment Reminder	Upcoming appointment with Sarah Johnson tomorrow at 10:00 AM.	appointment_reminder	high	unread	appointment	912	/calendar	t	\N	\N	{"icon": "Calendar", "color": "orange", "urgency": "high", "patientId": 1, "department": "Cardiology", "patientName": "Sarah Johnson", "appointmentId": 912}	\N	\N	2025-10-02 15:17:31.637683	2025-10-02 15:17:31.637683
58	2	3	Critical Drug Interaction Alert	Potential interaction detected between Warfarin and Aspirin for patient Robert Davis.	prescription_alert	critical	unread	patient	2	/patients/2/prescriptions	t	\N	\N	{"icon": "AlertTriangle", "color": "red", "urgency": "critical", "patientId": 2, "department": "Pharmacy", "patientName": "Robert Davis", "requiresResponse": true}	\N	\N	2025-10-02 15:17:31.637683	2025-10-02 15:17:31.637683
59	2	4	Patient Message	Sarah Johnson has sent a message regarding her medication side effects.	message	normal	read	patient	1	/messaging/conversations/1	t	\N	\N	{"icon": "MessageSquare", "color": "green", "urgency": "medium", "patientId": 1, "department": "General", "patientName": "Sarah Johnson"}	2025-10-02 13:17:31.519	\N	2025-10-02 15:17:31.637683	2025-10-02 15:17:31.637683
60	2	14	System Maintenance Alert	Scheduled system maintenance will occur tonight from 2:00 AM - 4:00 AM.	system_alert	low	unread	\N	\N	\N	f	\N	\N	{"icon": "Settings", "color": "gray", "urgency": "low", "department": "IT", "autoMarkAsRead": true}	\N	\N	2025-10-02 15:17:31.637683	2025-10-02 15:17:31.637683
61	2	3	Lab Results Available	Blood work results for Sarah Johnson are now available for review.	lab_result	normal	unread	patient	1	/patients/1/lab-results	t	\N	\N	{"icon": "Activity", "color": "blue", "urgency": "medium", "patientId": 1, "department": "Laboratory", "patientName": "Sarah Johnson"}	\N	\N	2025-10-03 03:18:54.778868	2025-10-03 03:18:54.778868
62	2	3	Appointment Reminder	Upcoming appointment with Sarah Johnson tomorrow at 10:00 AM.	appointment_reminder	high	unread	appointment	912	/calendar	t	\N	\N	{"icon": "Calendar", "color": "orange", "urgency": "high", "patientId": 1, "department": "Cardiology", "patientName": "Sarah Johnson", "appointmentId": 912}	\N	\N	2025-10-03 03:18:54.778868	2025-10-03 03:18:54.778868
63	2	15	Critical Drug Interaction Alert	Potential interaction detected between Warfarin and Aspirin for patient Robert Davis.	prescription_alert	critical	unread	patient	2	/patients/2/prescriptions	t	\N	\N	{"icon": "AlertTriangle", "color": "red", "urgency": "critical", "patientId": 2, "department": "Pharmacy", "patientName": "Robert Davis", "requiresResponse": true}	\N	\N	2025-10-03 03:18:54.778868	2025-10-03 03:18:54.778868
64	2	14	Patient Message	Sarah Johnson has sent a message regarding her medication side effects.	message	normal	read	patient	1	/messaging/conversations/1	t	\N	\N	{"icon": "MessageSquare", "color": "green", "urgency": "medium", "patientId": 1, "department": "General", "patientName": "Sarah Johnson"}	2025-10-03 01:18:54.661	\N	2025-10-03 03:18:54.778868	2025-10-03 03:18:54.778868
65	2	3	System Maintenance Alert	Scheduled system maintenance will occur tonight from 2:00 AM - 4:00 AM.	system_alert	low	unread	\N	\N	\N	f	\N	\N	{"icon": "Settings", "color": "gray", "urgency": "low", "department": "IT", "autoMarkAsRead": true}	\N	\N	2025-10-03 03:18:54.778868	2025-10-03 03:18:54.778868
66	2	3	Lab Results Available	Blood work results for Sarah Johnson are now available for review.	lab_result	normal	unread	patient	1	/patients/1/lab-results	t	\N	\N	{"icon": "Activity", "color": "blue", "urgency": "medium", "patientId": 1, "department": "Laboratory", "patientName": "Sarah Johnson"}	\N	\N	2025-10-03 03:50:27.610269	2025-10-03 03:50:27.610269
67	2	3	Appointment Reminder	Upcoming appointment with Sarah Johnson tomorrow at 10:00 AM.	appointment_reminder	high	unread	appointment	912	/calendar	t	\N	\N	{"icon": "Calendar", "color": "orange", "urgency": "high", "patientId": 1, "department": "Cardiology", "patientName": "Sarah Johnson", "appointmentId": 912}	\N	\N	2025-10-03 03:50:27.610269	2025-10-03 03:50:27.610269
68	2	15	Critical Drug Interaction Alert	Potential interaction detected between Warfarin and Aspirin for patient Robert Davis.	prescription_alert	critical	unread	patient	2	/patients/2/prescriptions	t	\N	\N	{"icon": "AlertTriangle", "color": "red", "urgency": "critical", "patientId": 2, "department": "Pharmacy", "patientName": "Robert Davis", "requiresResponse": true}	\N	\N	2025-10-03 03:50:27.610269	2025-10-03 03:50:27.610269
69	2	14	Patient Message	Sarah Johnson has sent a message regarding her medication side effects.	message	normal	read	patient	1	/messaging/conversations/1	t	\N	\N	{"icon": "MessageSquare", "color": "green", "urgency": "medium", "patientId": 1, "department": "General", "patientName": "Sarah Johnson"}	2025-10-03 01:50:27.486	\N	2025-10-03 03:50:27.610269	2025-10-03 03:50:27.610269
70	2	3	System Maintenance Alert	Scheduled system maintenance will occur tonight from 2:00 AM - 4:00 AM.	system_alert	low	unread	\N	\N	\N	f	\N	\N	{"icon": "Settings", "color": "gray", "urgency": "low", "department": "IT", "autoMarkAsRead": true}	\N	\N	2025-10-03 03:50:27.610269	2025-10-03 03:50:27.610269
71	2	3	Lab Results Available	Blood work results for Sarah Johnson are now available for review.	lab_result	normal	unread	patient	1	/patients/1/lab-results	t	\N	\N	{"icon": "Activity", "color": "blue", "urgency": "medium", "patientId": 1, "department": "Laboratory", "patientName": "Sarah Johnson"}	\N	\N	2025-10-03 04:19:27.325905	2025-10-03 04:19:27.325905
72	2	3	Appointment Reminder	Upcoming appointment with Sarah Johnson tomorrow at 10:00 AM.	appointment_reminder	high	unread	appointment	912	/calendar	t	\N	\N	{"icon": "Calendar", "color": "orange", "urgency": "high", "patientId": 1, "department": "Cardiology", "patientName": "Sarah Johnson", "appointmentId": 912}	\N	\N	2025-10-03 04:19:27.325905	2025-10-03 04:19:27.325905
73	2	15	Critical Drug Interaction Alert	Potential interaction detected between Warfarin and Aspirin for patient Robert Davis.	prescription_alert	critical	unread	patient	2	/patients/2/prescriptions	t	\N	\N	{"icon": "AlertTriangle", "color": "red", "urgency": "critical", "patientId": 2, "department": "Pharmacy", "patientName": "Robert Davis", "requiresResponse": true}	\N	\N	2025-10-03 04:19:27.325905	2025-10-03 04:19:27.325905
74	2	14	Patient Message	Sarah Johnson has sent a message regarding her medication side effects.	message	normal	read	patient	1	/messaging/conversations/1	t	\N	\N	{"icon": "MessageSquare", "color": "green", "urgency": "medium", "patientId": 1, "department": "General", "patientName": "Sarah Johnson"}	2025-10-03 02:19:27.208	\N	2025-10-03 04:19:27.325905	2025-10-03 04:19:27.325905
75	2	3	System Maintenance Alert	Scheduled system maintenance will occur tonight from 2:00 AM - 4:00 AM.	system_alert	low	unread	\N	\N	\N	f	\N	\N	{"icon": "Settings", "color": "gray", "urgency": "low", "department": "IT", "autoMarkAsRead": true}	\N	\N	2025-10-03 04:19:27.325905	2025-10-03 04:19:27.325905
76	2	3	Lab Results Available	Blood work results for Sarah Johnson are now available for review.	lab_result	normal	unread	patient	1	/patients/1/lab-results	t	\N	\N	{"icon": "Activity", "color": "blue", "urgency": "medium", "patientId": 1, "department": "Laboratory", "patientName": "Sarah Johnson"}	\N	\N	2025-10-03 04:50:15.243812	2025-10-03 04:50:15.243812
77	2	3	Appointment Reminder	Upcoming appointment with Sarah Johnson tomorrow at 10:00 AM.	appointment_reminder	high	unread	appointment	912	/calendar	t	\N	\N	{"icon": "Calendar", "color": "orange", "urgency": "high", "patientId": 1, "department": "Cardiology", "patientName": "Sarah Johnson", "appointmentId": 912}	\N	\N	2025-10-03 04:50:15.243812	2025-10-03 04:50:15.243812
78	2	15	Critical Drug Interaction Alert	Potential interaction detected between Warfarin and Aspirin for patient Robert Davis.	prescription_alert	critical	unread	patient	2	/patients/2/prescriptions	t	\N	\N	{"icon": "AlertTriangle", "color": "red", "urgency": "critical", "patientId": 2, "department": "Pharmacy", "patientName": "Robert Davis", "requiresResponse": true}	\N	\N	2025-10-03 04:50:15.243812	2025-10-03 04:50:15.243812
79	2	14	Patient Message	Sarah Johnson has sent a message regarding her medication side effects.	message	normal	read	patient	1	/messaging/conversations/1	t	\N	\N	{"icon": "MessageSquare", "color": "green", "urgency": "medium", "patientId": 1, "department": "General", "patientName": "Sarah Johnson"}	2025-10-03 02:50:15.123	\N	2025-10-03 04:50:15.243812	2025-10-03 04:50:15.243812
80	2	3	System Maintenance Alert	Scheduled system maintenance will occur tonight from 2:00 AM - 4:00 AM.	system_alert	low	unread	\N	\N	\N	f	\N	\N	{"icon": "Settings", "color": "gray", "urgency": "low", "department": "IT", "autoMarkAsRead": true}	\N	\N	2025-10-03 04:50:15.243812	2025-10-03 04:50:15.243812
81	2	3	Lab Results Available	Blood work results for Sarah Johnson are now available for review.	lab_result	normal	unread	patient	1	/patients/1/lab-results	t	\N	\N	{"icon": "Activity", "color": "blue", "urgency": "medium", "patientId": 1, "department": "Laboratory", "patientName": "Sarah Johnson"}	\N	\N	2025-10-03 05:08:54.994402	2025-10-03 05:08:54.994402
82	2	3	Appointment Reminder	Upcoming appointment with Sarah Johnson tomorrow at 10:00 AM.	appointment_reminder	high	unread	appointment	912	/calendar	t	\N	\N	{"icon": "Calendar", "color": "orange", "urgency": "high", "patientId": 1, "department": "Cardiology", "patientName": "Sarah Johnson", "appointmentId": 912}	\N	\N	2025-10-03 05:08:54.994402	2025-10-03 05:08:54.994402
83	2	15	Critical Drug Interaction Alert	Potential interaction detected between Warfarin and Aspirin for patient Robert Davis.	prescription_alert	critical	unread	patient	2	/patients/2/prescriptions	t	\N	\N	{"icon": "AlertTriangle", "color": "red", "urgency": "critical", "patientId": 2, "department": "Pharmacy", "patientName": "Robert Davis", "requiresResponse": true}	\N	\N	2025-10-03 05:08:54.994402	2025-10-03 05:08:54.994402
84	2	14	Patient Message	Sarah Johnson has sent a message regarding her medication side effects.	message	normal	read	patient	1	/messaging/conversations/1	t	\N	\N	{"icon": "MessageSquare", "color": "green", "urgency": "medium", "patientId": 1, "department": "General", "patientName": "Sarah Johnson"}	2025-10-03 03:08:54.877	\N	2025-10-03 05:08:54.994402	2025-10-03 05:08:54.994402
85	2	3	System Maintenance Alert	Scheduled system maintenance will occur tonight from 2:00 AM - 4:00 AM.	system_alert	low	unread	\N	\N	\N	f	\N	\N	{"icon": "Settings", "color": "gray", "urgency": "low", "department": "IT", "autoMarkAsRead": true}	\N	\N	2025-10-03 05:08:54.994402	2025-10-03 05:08:54.994402
86	2	3	Lab Results Available	Blood work results for Sarah Johnson are now available for review.	lab_result	normal	unread	patient	1	/patients/1/lab-results	t	\N	\N	{"icon": "Activity", "color": "blue", "urgency": "medium", "patientId": 1, "department": "Laboratory", "patientName": "Sarah Johnson"}	\N	\N	2025-10-03 05:14:31.52577	2025-10-03 05:14:31.52577
87	2	3	Appointment Reminder	Upcoming appointment with Sarah Johnson tomorrow at 10:00 AM.	appointment_reminder	high	unread	appointment	912	/calendar	t	\N	\N	{"icon": "Calendar", "color": "orange", "urgency": "high", "patientId": 1, "department": "Cardiology", "patientName": "Sarah Johnson", "appointmentId": 912}	\N	\N	2025-10-03 05:14:31.52577	2025-10-03 05:14:31.52577
88	2	15	Critical Drug Interaction Alert	Potential interaction detected between Warfarin and Aspirin for patient Robert Davis.	prescription_alert	critical	unread	patient	2	/patients/2/prescriptions	t	\N	\N	{"icon": "AlertTriangle", "color": "red", "urgency": "critical", "patientId": 2, "department": "Pharmacy", "patientName": "Robert Davis", "requiresResponse": true}	\N	\N	2025-10-03 05:14:31.52577	2025-10-03 05:14:31.52577
89	2	14	Patient Message	Sarah Johnson has sent a message regarding her medication side effects.	message	normal	read	patient	1	/messaging/conversations/1	t	\N	\N	{"icon": "MessageSquare", "color": "green", "urgency": "medium", "patientId": 1, "department": "General", "patientName": "Sarah Johnson"}	2025-10-03 03:14:31.406	\N	2025-10-03 05:14:31.52577	2025-10-03 05:14:31.52577
90	2	3	System Maintenance Alert	Scheduled system maintenance will occur tonight from 2:00 AM - 4:00 AM.	system_alert	low	unread	\N	\N	\N	f	\N	\N	{"icon": "Settings", "color": "gray", "urgency": "low", "department": "IT", "autoMarkAsRead": true}	\N	\N	2025-10-03 05:14:31.52577	2025-10-03 05:14:31.52577
91	2	3	Lab Results Available	Blood work results for Sarah Johnson are now available for review.	lab_result	normal	unread	patient	1	/patients/1/lab-results	t	\N	\N	{"icon": "Activity", "color": "blue", "urgency": "medium", "patientId": 1, "department": "Laboratory", "patientName": "Sarah Johnson"}	\N	\N	2025-10-03 05:30:34.427825	2025-10-03 05:30:34.427825
92	2	3	Appointment Reminder	Upcoming appointment with Sarah Johnson tomorrow at 10:00 AM.	appointment_reminder	high	unread	appointment	912	/calendar	t	\N	\N	{"icon": "Calendar", "color": "orange", "urgency": "high", "patientId": 1, "department": "Cardiology", "patientName": "Sarah Johnson", "appointmentId": 912}	\N	\N	2025-10-03 05:30:34.427825	2025-10-03 05:30:34.427825
93	2	15	Critical Drug Interaction Alert	Potential interaction detected between Warfarin and Aspirin for patient Robert Davis.	prescription_alert	critical	unread	patient	2	/patients/2/prescriptions	t	\N	\N	{"icon": "AlertTriangle", "color": "red", "urgency": "critical", "patientId": 2, "department": "Pharmacy", "patientName": "Robert Davis", "requiresResponse": true}	\N	\N	2025-10-03 05:30:34.427825	2025-10-03 05:30:34.427825
94	2	14	Patient Message	Sarah Johnson has sent a message regarding her medication side effects.	message	normal	read	patient	1	/messaging/conversations/1	t	\N	\N	{"icon": "MessageSquare", "color": "green", "urgency": "medium", "patientId": 1, "department": "General", "patientName": "Sarah Johnson"}	2025-10-03 03:30:34.31	\N	2025-10-03 05:30:34.427825	2025-10-03 05:30:34.427825
95	2	3	System Maintenance Alert	Scheduled system maintenance will occur tonight from 2:00 AM - 4:00 AM.	system_alert	low	unread	\N	\N	\N	f	\N	\N	{"icon": "Settings", "color": "gray", "urgency": "low", "department": "IT", "autoMarkAsRead": true}	\N	\N	2025-10-03 05:30:34.427825	2025-10-03 05:30:34.427825
96	2	9	Lab Results Available	Blood work results for Sarah Johnson are now available for review.	lab_result	normal	unread	patient	1	/patients/1/lab-results	t	\N	\N	{"icon": "Activity", "color": "blue", "urgency": "medium", "patientId": 1, "department": "Laboratory", "patientName": "Sarah Johnson"}	\N	\N	2025-10-03 05:31:40.277086	2025-10-03 05:31:40.277086
97	2	9	Appointment Reminder	Upcoming appointment with Sarah Johnson tomorrow at 10:00 AM.	appointment_reminder	high	unread	appointment	912	/calendar	t	\N	\N	{"icon": "Calendar", "color": "orange", "urgency": "high", "patientId": 1, "department": "Cardiology", "patientName": "Sarah Johnson", "appointmentId": 912}	\N	\N	2025-10-03 05:31:40.277086	2025-10-03 05:31:40.277086
98	2	8	Critical Drug Interaction Alert	Potential interaction detected between Warfarin and Aspirin for patient Robert Davis.	prescription_alert	critical	unread	patient	2	/patients/2/prescriptions	t	\N	\N	{"icon": "AlertTriangle", "color": "red", "urgency": "critical", "patientId": 2, "department": "Pharmacy", "patientName": "Robert Davis", "requiresResponse": true}	\N	\N	2025-10-03 05:31:40.277086	2025-10-03 05:31:40.277086
99	2	10	Patient Message	Sarah Johnson has sent a message regarding her medication side effects.	message	normal	read	patient	1	/messaging/conversations/1	t	\N	\N	{"icon": "MessageSquare", "color": "green", "urgency": "medium", "patientId": 1, "department": "General", "patientName": "Sarah Johnson"}	2025-10-03 03:31:40.158	\N	2025-10-03 05:31:40.277086	2025-10-03 05:31:40.277086
100	2	9	System Maintenance Alert	Scheduled system maintenance will occur tonight from 2:00 AM - 4:00 AM.	system_alert	low	unread	\N	\N	\N	f	\N	\N	{"icon": "Settings", "color": "gray", "urgency": "low", "department": "IT", "autoMarkAsRead": true}	\N	\N	2025-10-03 05:31:40.277086	2025-10-03 05:31:40.277086
101	2	7	Lab Results Available	Blood work results for Sarah Johnson are now available for review.	lab_result	normal	unread	patient	1	/patients/1/lab-results	t	\N	\N	{"icon": "Activity", "color": "blue", "urgency": "medium", "patientId": 1, "department": "Laboratory", "patientName": "Sarah Johnson"}	\N	\N	2025-10-03 05:41:16.638865	2025-10-03 05:41:16.638865
102	2	7	Appointment Reminder	Upcoming appointment with Sarah Johnson tomorrow at 10:00 AM.	appointment_reminder	high	unread	appointment	912	/calendar	t	\N	\N	{"icon": "Calendar", "color": "orange", "urgency": "high", "patientId": 1, "department": "Cardiology", "patientName": "Sarah Johnson", "appointmentId": 912}	\N	\N	2025-10-03 05:41:16.638865	2025-10-03 05:41:16.638865
103	2	6	Critical Drug Interaction Alert	Potential interaction detected between Warfarin and Aspirin for patient Robert Davis.	prescription_alert	critical	unread	patient	2	/patients/2/prescriptions	t	\N	\N	{"icon": "AlertTriangle", "color": "red", "urgency": "critical", "patientId": 2, "department": "Pharmacy", "patientName": "Robert Davis", "requiresResponse": true}	\N	\N	2025-10-03 05:41:16.638865	2025-10-03 05:41:16.638865
104	2	12	Patient Message	Sarah Johnson has sent a message regarding her medication side effects.	message	normal	read	patient	1	/messaging/conversations/1	t	\N	\N	{"icon": "MessageSquare", "color": "green", "urgency": "medium", "patientId": 1, "department": "General", "patientName": "Sarah Johnson"}	2025-10-03 03:41:16.51	\N	2025-10-03 05:41:16.638865	2025-10-03 05:41:16.638865
105	2	7	System Maintenance Alert	Scheduled system maintenance will occur tonight from 2:00 AM - 4:00 AM.	system_alert	low	unread	\N	\N	\N	f	\N	\N	{"icon": "Settings", "color": "gray", "urgency": "low", "department": "IT", "autoMarkAsRead": true}	\N	\N	2025-10-03 05:41:16.638865	2025-10-03 05:41:16.638865
190	2	6	System Maintenance Alert	Scheduled system maintenance will occur tonight from 2:00 AM - 4:00 AM.	system_alert	low	unread	\N	\N	\N	f	\N	\N	{"icon": "Settings", "color": "gray", "urgency": "low", "department": "IT", "autoMarkAsRead": true}	\N	\N	2025-10-03 09:03:14.576987	2025-10-03 09:03:14.576987
106	2	5	Lab Results Available	Blood work results for Sarah Johnson are now available for review.	lab_result	normal	unread	patient	1	/patients/1/lab-results	t	\N	\N	{"icon": "Activity", "color": "blue", "urgency": "medium", "patientId": 1, "department": "Laboratory", "patientName": "Sarah Johnson"}	\N	\N	2025-10-03 05:50:38.590036	2025-10-03 05:50:38.590036
107	2	5	Appointment Reminder	Upcoming appointment with Sarah Johnson tomorrow at 10:00 AM.	appointment_reminder	high	unread	appointment	912	/calendar	t	\N	\N	{"icon": "Calendar", "color": "orange", "urgency": "high", "patientId": 1, "department": "Cardiology", "patientName": "Sarah Johnson", "appointmentId": 912}	\N	\N	2025-10-03 05:50:38.590036	2025-10-03 05:50:38.590036
108	2	2	Critical Drug Interaction Alert	Potential interaction detected between Warfarin and Aspirin for patient Robert Davis.	prescription_alert	critical	unread	patient	2	/patients/2/prescriptions	t	\N	\N	{"icon": "AlertTriangle", "color": "red", "urgency": "critical", "patientId": 2, "department": "Pharmacy", "patientName": "Robert Davis", "requiresResponse": true}	\N	\N	2025-10-03 05:50:38.590036	2025-10-03 05:50:38.590036
109	2	13	Patient Message	Sarah Johnson has sent a message regarding her medication side effects.	message	normal	read	patient	1	/messaging/conversations/1	t	\N	\N	{"icon": "MessageSquare", "color": "green", "urgency": "medium", "patientId": 1, "department": "General", "patientName": "Sarah Johnson"}	2025-10-03 03:50:38.47	\N	2025-10-03 05:50:38.590036	2025-10-03 05:50:38.590036
110	2	5	System Maintenance Alert	Scheduled system maintenance will occur tonight from 2:00 AM - 4:00 AM.	system_alert	low	unread	\N	\N	\N	f	\N	\N	{"icon": "Settings", "color": "gray", "urgency": "low", "department": "IT", "autoMarkAsRead": true}	\N	\N	2025-10-03 05:50:38.590036	2025-10-03 05:50:38.590036
111	2	4	Lab Results Available	Blood work results for Sarah Johnson are now available for review.	lab_result	normal	unread	patient	1	/patients/1/lab-results	t	\N	\N	{"icon": "Activity", "color": "blue", "urgency": "medium", "patientId": 1, "department": "Laboratory", "patientName": "Sarah Johnson"}	\N	\N	2025-10-03 05:57:35.701643	2025-10-03 05:57:35.701643
112	2	4	Appointment Reminder	Upcoming appointment with Sarah Johnson tomorrow at 10:00 AM.	appointment_reminder	high	unread	appointment	912	/calendar	t	\N	\N	{"icon": "Calendar", "color": "orange", "urgency": "high", "patientId": 1, "department": "Cardiology", "patientName": "Sarah Johnson", "appointmentId": 912}	\N	\N	2025-10-03 05:57:35.701643	2025-10-03 05:57:35.701643
113	2	14	Critical Drug Interaction Alert	Potential interaction detected between Warfarin and Aspirin for patient Robert Davis.	prescription_alert	critical	unread	patient	2	/patients/2/prescriptions	t	\N	\N	{"icon": "AlertTriangle", "color": "red", "urgency": "critical", "patientId": 2, "department": "Pharmacy", "patientName": "Robert Davis", "requiresResponse": true}	\N	\N	2025-10-03 05:57:35.701643	2025-10-03 05:57:35.701643
114	2	1	Patient Message	Sarah Johnson has sent a message regarding her medication side effects.	message	normal	read	patient	1	/messaging/conversations/1	t	\N	\N	{"icon": "MessageSquare", "color": "green", "urgency": "medium", "patientId": 1, "department": "General", "patientName": "Sarah Johnson"}	2025-10-03 03:57:35.582	\N	2025-10-03 05:57:35.701643	2025-10-03 05:57:35.701643
115	2	4	System Maintenance Alert	Scheduled system maintenance will occur tonight from 2:00 AM - 4:00 AM.	system_alert	low	unread	\N	\N	\N	f	\N	\N	{"icon": "Settings", "color": "gray", "urgency": "low", "department": "IT", "autoMarkAsRead": true}	\N	\N	2025-10-03 05:57:35.701643	2025-10-03 05:57:35.701643
116	2	3	Lab Results Available	Blood work results for Sarah Johnson are now available for review.	lab_result	normal	unread	patient	1	/patients/1/lab-results	t	\N	\N	{"icon": "Activity", "color": "blue", "urgency": "medium", "patientId": 1, "department": "Laboratory", "patientName": "Sarah Johnson"}	\N	\N	2025-10-03 06:09:42.757232	2025-10-03 06:09:42.757232
117	2	3	Appointment Reminder	Upcoming appointment with Sarah Johnson tomorrow at 10:00 AM.	appointment_reminder	high	unread	appointment	912	/calendar	t	\N	\N	{"icon": "Calendar", "color": "orange", "urgency": "high", "patientId": 1, "department": "Cardiology", "patientName": "Sarah Johnson", "appointmentId": 912}	\N	\N	2025-10-03 06:09:42.757232	2025-10-03 06:09:42.757232
118	2	15	Critical Drug Interaction Alert	Potential interaction detected between Warfarin and Aspirin for patient Robert Davis.	prescription_alert	critical	unread	patient	2	/patients/2/prescriptions	t	\N	\N	{"icon": "AlertTriangle", "color": "red", "urgency": "critical", "patientId": 2, "department": "Pharmacy", "patientName": "Robert Davis", "requiresResponse": true}	\N	\N	2025-10-03 06:09:42.757232	2025-10-03 06:09:42.757232
119	2	14	Patient Message	Sarah Johnson has sent a message regarding her medication side effects.	message	normal	read	patient	1	/messaging/conversations/1	t	\N	\N	{"icon": "MessageSquare", "color": "green", "urgency": "medium", "patientId": 1, "department": "General", "patientName": "Sarah Johnson"}	2025-10-03 04:09:42.636	\N	2025-10-03 06:09:42.757232	2025-10-03 06:09:42.757232
120	2	3	System Maintenance Alert	Scheduled system maintenance will occur tonight from 2:00 AM - 4:00 AM.	system_alert	low	unread	\N	\N	\N	f	\N	\N	{"icon": "Settings", "color": "gray", "urgency": "low", "department": "IT", "autoMarkAsRead": true}	\N	\N	2025-10-03 06:09:42.757232	2025-10-03 06:09:42.757232
121	2	10	Lab Results Available	Blood work results for Sarah Johnson are now available for review.	lab_result	normal	unread	patient	1	/patients/1/lab-results	t	\N	\N	{"icon": "Activity", "color": "blue", "urgency": "medium", "patientId": 1, "department": "Laboratory", "patientName": "Sarah Johnson"}	\N	\N	2025-10-03 06:19:21.961482	2025-10-03 06:19:21.961482
122	2	10	Appointment Reminder	Upcoming appointment with Sarah Johnson tomorrow at 10:00 AM.	appointment_reminder	high	unread	appointment	912	/calendar	t	\N	\N	{"icon": "Calendar", "color": "orange", "urgency": "high", "patientId": 1, "department": "Cardiology", "patientName": "Sarah Johnson", "appointmentId": 912}	\N	\N	2025-10-03 06:19:21.961482	2025-10-03 06:19:21.961482
123	2	9	Critical Drug Interaction Alert	Potential interaction detected between Warfarin and Aspirin for patient Robert Davis.	prescription_alert	critical	unread	patient	2	/patients/2/prescriptions	t	\N	\N	{"icon": "AlertTriangle", "color": "red", "urgency": "critical", "patientId": 2, "department": "Pharmacy", "patientName": "Robert Davis", "requiresResponse": true}	\N	\N	2025-10-03 06:19:21.961482	2025-10-03 06:19:21.961482
124	2	15	Patient Message	Sarah Johnson has sent a message regarding her medication side effects.	message	normal	read	patient	1	/messaging/conversations/1	t	\N	\N	{"icon": "MessageSquare", "color": "green", "urgency": "medium", "patientId": 1, "department": "General", "patientName": "Sarah Johnson"}	2025-10-03 04:19:21.83	\N	2025-10-03 06:19:21.961482	2025-10-03 06:19:21.961482
125	2	10	System Maintenance Alert	Scheduled system maintenance will occur tonight from 2:00 AM - 4:00 AM.	system_alert	low	unread	\N	\N	\N	f	\N	\N	{"icon": "Settings", "color": "gray", "urgency": "low", "department": "IT", "autoMarkAsRead": true}	\N	\N	2025-10-03 06:19:21.961482	2025-10-03 06:19:21.961482
126	2	8	Lab Results Available	Blood work results for Sarah Johnson are now available for review.	lab_result	normal	unread	patient	1	/patients/1/lab-results	t	\N	\N	{"icon": "Activity", "color": "blue", "urgency": "medium", "patientId": 1, "department": "Laboratory", "patientName": "Sarah Johnson"}	\N	\N	2025-10-03 06:32:19.494533	2025-10-03 06:32:19.494533
127	2	8	Appointment Reminder	Upcoming appointment with Sarah Johnson tomorrow at 10:00 AM.	appointment_reminder	high	unread	appointment	912	/calendar	t	\N	\N	{"icon": "Calendar", "color": "orange", "urgency": "high", "patientId": 1, "department": "Cardiology", "patientName": "Sarah Johnson", "appointmentId": 912}	\N	\N	2025-10-03 06:32:19.494533	2025-10-03 06:32:19.494533
128	2	12	Critical Drug Interaction Alert	Potential interaction detected between Warfarin and Aspirin for patient Robert Davis.	prescription_alert	critical	unread	patient	2	/patients/2/prescriptions	t	\N	\N	{"icon": "AlertTriangle", "color": "red", "urgency": "critical", "patientId": 2, "department": "Pharmacy", "patientName": "Robert Davis", "requiresResponse": true}	\N	\N	2025-10-03 06:32:19.494533	2025-10-03 06:32:19.494533
129	2	9	Patient Message	Sarah Johnson has sent a message regarding her medication side effects.	message	normal	read	patient	1	/messaging/conversations/1	t	\N	\N	{"icon": "MessageSquare", "color": "green", "urgency": "medium", "patientId": 1, "department": "General", "patientName": "Sarah Johnson"}	2025-10-03 04:32:19.373	\N	2025-10-03 06:32:19.494533	2025-10-03 06:32:19.494533
130	2	8	System Maintenance Alert	Scheduled system maintenance will occur tonight from 2:00 AM - 4:00 AM.	system_alert	low	unread	\N	\N	\N	f	\N	\N	{"icon": "Settings", "color": "gray", "urgency": "low", "department": "IT", "autoMarkAsRead": true}	\N	\N	2025-10-03 06:32:19.494533	2025-10-03 06:32:19.494533
131	2	12	Lab Results Available	Blood work results for Sarah Johnson are now available for review.	lab_result	normal	unread	patient	1	/patients/1/lab-results	t	\N	\N	{"icon": "Activity", "color": "blue", "urgency": "medium", "patientId": 1, "department": "Laboratory", "patientName": "Sarah Johnson"}	\N	\N	2025-10-03 07:02:27.25918	2025-10-03 07:02:27.25918
132	2	12	Appointment Reminder	Upcoming appointment with Sarah Johnson tomorrow at 10:00 AM.	appointment_reminder	high	unread	appointment	912	/calendar	t	\N	\N	{"icon": "Calendar", "color": "orange", "urgency": "high", "patientId": 1, "department": "Cardiology", "patientName": "Sarah Johnson", "appointmentId": 912}	\N	\N	2025-10-03 07:02:27.25918	2025-10-03 07:02:27.25918
133	2	7	Critical Drug Interaction Alert	Potential interaction detected between Warfarin and Aspirin for patient Robert Davis.	prescription_alert	critical	unread	patient	2	/patients/2/prescriptions	t	\N	\N	{"icon": "AlertTriangle", "color": "red", "urgency": "critical", "patientId": 2, "department": "Pharmacy", "patientName": "Robert Davis", "requiresResponse": true}	\N	\N	2025-10-03 07:02:27.25918	2025-10-03 07:02:27.25918
134	2	8	Patient Message	Sarah Johnson has sent a message regarding her medication side effects.	message	normal	read	patient	1	/messaging/conversations/1	t	\N	\N	{"icon": "MessageSquare", "color": "green", "urgency": "medium", "patientId": 1, "department": "General", "patientName": "Sarah Johnson"}	2025-10-03 05:02:27.137	\N	2025-10-03 07:02:27.25918	2025-10-03 07:02:27.25918
135	2	12	System Maintenance Alert	Scheduled system maintenance will occur tonight from 2:00 AM - 4:00 AM.	system_alert	low	unread	\N	\N	\N	f	\N	\N	{"icon": "Settings", "color": "gray", "urgency": "low", "department": "IT", "autoMarkAsRead": true}	\N	\N	2025-10-03 07:02:27.25918	2025-10-03 07:02:27.25918
136	2	7	Lab Results Available	Blood work results for Sarah Johnson are now available for review.	lab_result	normal	unread	patient	1	/patients/1/lab-results	t	\N	\N	{"icon": "Activity", "color": "blue", "urgency": "medium", "patientId": 1, "department": "Laboratory", "patientName": "Sarah Johnson"}	\N	\N	2025-10-03 07:17:24.626416	2025-10-03 07:17:24.626416
137	2	7	Appointment Reminder	Upcoming appointment with Sarah Johnson tomorrow at 10:00 AM.	appointment_reminder	high	unread	appointment	912	/calendar	t	\N	\N	{"icon": "Calendar", "color": "orange", "urgency": "high", "patientId": 1, "department": "Cardiology", "patientName": "Sarah Johnson", "appointmentId": 912}	\N	\N	2025-10-03 07:17:24.626416	2025-10-03 07:17:24.626416
138	2	6	Critical Drug Interaction Alert	Potential interaction detected between Warfarin and Aspirin for patient Robert Davis.	prescription_alert	critical	unread	patient	2	/patients/2/prescriptions	t	\N	\N	{"icon": "AlertTriangle", "color": "red", "urgency": "critical", "patientId": 2, "department": "Pharmacy", "patientName": "Robert Davis", "requiresResponse": true}	\N	\N	2025-10-03 07:17:24.626416	2025-10-03 07:17:24.626416
139	2	12	Patient Message	Sarah Johnson has sent a message regarding her medication side effects.	message	normal	read	patient	1	/messaging/conversations/1	t	\N	\N	{"icon": "MessageSquare", "color": "green", "urgency": "medium", "patientId": 1, "department": "General", "patientName": "Sarah Johnson"}	2025-10-03 05:17:24.497	\N	2025-10-03 07:17:24.626416	2025-10-03 07:17:24.626416
140	2	7	System Maintenance Alert	Scheduled system maintenance will occur tonight from 2:00 AM - 4:00 AM.	system_alert	low	unread	\N	\N	\N	f	\N	\N	{"icon": "Settings", "color": "gray", "urgency": "low", "department": "IT", "autoMarkAsRead": true}	\N	\N	2025-10-03 07:17:24.626416	2025-10-03 07:17:24.626416
141	2	6	Lab Results Available	Blood work results for Sarah Johnson are now available for review.	lab_result	normal	unread	patient	1	/patients/1/lab-results	t	\N	\N	{"icon": "Activity", "color": "blue", "urgency": "medium", "patientId": 1, "department": "Laboratory", "patientName": "Sarah Johnson"}	\N	\N	2025-10-03 07:38:40.751195	2025-10-03 07:38:40.751195
142	2	6	Appointment Reminder	Upcoming appointment with Sarah Johnson tomorrow at 10:00 AM.	appointment_reminder	high	unread	appointment	912	/calendar	t	\N	\N	{"icon": "Calendar", "color": "orange", "urgency": "high", "patientId": 1, "department": "Cardiology", "patientName": "Sarah Johnson", "appointmentId": 912}	\N	\N	2025-10-03 07:38:40.751195	2025-10-03 07:38:40.751195
143	2	13	Critical Drug Interaction Alert	Potential interaction detected between Warfarin and Aspirin for patient Robert Davis.	prescription_alert	critical	unread	patient	2	/patients/2/prescriptions	t	\N	\N	{"icon": "AlertTriangle", "color": "red", "urgency": "critical", "patientId": 2, "department": "Pharmacy", "patientName": "Robert Davis", "requiresResponse": true}	\N	\N	2025-10-03 07:38:40.751195	2025-10-03 07:38:40.751195
144	2	7	Patient Message	Sarah Johnson has sent a message regarding her medication side effects.	message	normal	read	patient	1	/messaging/conversations/1	t	\N	\N	{"icon": "MessageSquare", "color": "green", "urgency": "medium", "patientId": 1, "department": "General", "patientName": "Sarah Johnson"}	2025-10-03 05:38:40.59	\N	2025-10-03 07:38:40.751195	2025-10-03 07:38:40.751195
145	2	6	System Maintenance Alert	Scheduled system maintenance will occur tonight from 2:00 AM - 4:00 AM.	system_alert	low	unread	\N	\N	\N	f	\N	\N	{"icon": "Settings", "color": "gray", "urgency": "low", "department": "IT", "autoMarkAsRead": true}	\N	\N	2025-10-03 07:38:40.751195	2025-10-03 07:38:40.751195
146	2	6	Lab Results Available	Blood work results for Sarah Johnson are now available for review.	lab_result	normal	unread	patient	1	/patients/1/lab-results	t	\N	\N	{"icon": "Activity", "color": "blue", "urgency": "medium", "patientId": 1, "department": "Laboratory", "patientName": "Sarah Johnson"}	\N	\N	2025-10-03 07:52:08.677737	2025-10-03 07:52:08.677737
147	2	6	Appointment Reminder	Upcoming appointment with Sarah Johnson tomorrow at 10:00 AM.	appointment_reminder	high	unread	appointment	912	/calendar	t	\N	\N	{"icon": "Calendar", "color": "orange", "urgency": "high", "patientId": 1, "department": "Cardiology", "patientName": "Sarah Johnson", "appointmentId": 912}	\N	\N	2025-10-03 07:52:08.677737	2025-10-03 07:52:08.677737
148	2	13	Critical Drug Interaction Alert	Potential interaction detected between Warfarin and Aspirin for patient Robert Davis.	prescription_alert	critical	unread	patient	2	/patients/2/prescriptions	t	\N	\N	{"icon": "AlertTriangle", "color": "red", "urgency": "critical", "patientId": 2, "department": "Pharmacy", "patientName": "Robert Davis", "requiresResponse": true}	\N	\N	2025-10-03 07:52:08.677737	2025-10-03 07:52:08.677737
149	2	7	Patient Message	Sarah Johnson has sent a message regarding her medication side effects.	message	normal	read	patient	1	/messaging/conversations/1	t	\N	\N	{"icon": "MessageSquare", "color": "green", "urgency": "medium", "patientId": 1, "department": "General", "patientName": "Sarah Johnson"}	2025-10-03 05:52:08.559	\N	2025-10-03 07:52:08.677737	2025-10-03 07:52:08.677737
150	2	6	System Maintenance Alert	Scheduled system maintenance will occur tonight from 2:00 AM - 4:00 AM.	system_alert	low	unread	\N	\N	\N	f	\N	\N	{"icon": "Settings", "color": "gray", "urgency": "low", "department": "IT", "autoMarkAsRead": true}	\N	\N	2025-10-03 07:52:08.677737	2025-10-03 07:52:08.677737
151	2	6	Lab Results Available	Blood work results for Sarah Johnson are now available for review.	lab_result	normal	unread	patient	2	/patients/1/lab-results	t	\N	\N	{"icon": "Activity", "color": "blue", "urgency": "medium", "patientId": 2, "department": "Laboratory", "patientName": "Sarah Johnson"}	\N	\N	2025-10-03 08:01:18.756341	2025-10-03 08:01:18.756341
152	2	6	Appointment Reminder	Upcoming appointment with Sarah Johnson tomorrow at 10:00 AM.	appointment_reminder	high	unread	appointment	912	/calendar	t	\N	\N	{"icon": "Calendar", "color": "orange", "urgency": "high", "patientId": 2, "department": "Cardiology", "patientName": "Sarah Johnson", "appointmentId": 912}	\N	\N	2025-10-03 08:01:18.756341	2025-10-03 08:01:18.756341
153	2	13	Critical Drug Interaction Alert	Potential interaction detected between Warfarin and Aspirin for patient Robert Davis.	prescription_alert	critical	unread	patient	3	/patients/2/prescriptions	t	\N	\N	{"icon": "AlertTriangle", "color": "red", "urgency": "critical", "patientId": 3, "department": "Pharmacy", "patientName": "Robert Davis", "requiresResponse": true}	\N	\N	2025-10-03 08:01:18.756341	2025-10-03 08:01:18.756341
154	2	7	Patient Message	Sarah Johnson has sent a message regarding her medication side effects.	message	normal	read	patient	2	/messaging/conversations/1	t	\N	\N	{"icon": "MessageSquare", "color": "green", "urgency": "medium", "patientId": 2, "department": "General", "patientName": "Sarah Johnson"}	2025-10-03 06:01:18.64	\N	2025-10-03 08:01:18.756341	2025-10-03 08:01:18.756341
155	2	6	System Maintenance Alert	Scheduled system maintenance will occur tonight from 2:00 AM - 4:00 AM.	system_alert	low	unread	\N	\N	\N	f	\N	\N	{"icon": "Settings", "color": "gray", "urgency": "low", "department": "IT", "autoMarkAsRead": true}	\N	\N	2025-10-03 08:01:18.756341	2025-10-03 08:01:18.756341
156	2	6	Lab Results Available	Blood work results for Sarah Johnson are now available for review.	lab_result	normal	unread	patient	2	/patients/1/lab-results	t	\N	\N	{"icon": "Activity", "color": "blue", "urgency": "medium", "patientId": 2, "department": "Laboratory", "patientName": "Sarah Johnson"}	\N	\N	2025-10-03 08:02:48.566306	2025-10-03 08:02:48.566306
157	2	6	Appointment Reminder	Upcoming appointment with Sarah Johnson tomorrow at 10:00 AM.	appointment_reminder	high	unread	appointment	912	/calendar	t	\N	\N	{"icon": "Calendar", "color": "orange", "urgency": "high", "patientId": 2, "department": "Cardiology", "patientName": "Sarah Johnson", "appointmentId": 912}	\N	\N	2025-10-03 08:02:48.566306	2025-10-03 08:02:48.566306
158	2	13	Critical Drug Interaction Alert	Potential interaction detected between Warfarin and Aspirin for patient Robert Davis.	prescription_alert	critical	unread	patient	3	/patients/2/prescriptions	t	\N	\N	{"icon": "AlertTriangle", "color": "red", "urgency": "critical", "patientId": 3, "department": "Pharmacy", "patientName": "Robert Davis", "requiresResponse": true}	\N	\N	2025-10-03 08:02:48.566306	2025-10-03 08:02:48.566306
159	2	7	Patient Message	Sarah Johnson has sent a message regarding her medication side effects.	message	normal	read	patient	2	/messaging/conversations/1	t	\N	\N	{"icon": "MessageSquare", "color": "green", "urgency": "medium", "patientId": 2, "department": "General", "patientName": "Sarah Johnson"}	2025-10-03 06:02:48.438	\N	2025-10-03 08:02:48.566306	2025-10-03 08:02:48.566306
160	2	6	System Maintenance Alert	Scheduled system maintenance will occur tonight from 2:00 AM - 4:00 AM.	system_alert	low	unread	\N	\N	\N	f	\N	\N	{"icon": "Settings", "color": "gray", "urgency": "low", "department": "IT", "autoMarkAsRead": true}	\N	\N	2025-10-03 08:02:48.566306	2025-10-03 08:02:48.566306
161	2	6	Lab Results Available	Blood work results for Sarah Johnson are now available for review.	lab_result	normal	unread	patient	2	/patients/1/lab-results	t	\N	\N	{"icon": "Activity", "color": "blue", "urgency": "medium", "patientId": 2, "department": "Laboratory", "patientName": "Sarah Johnson"}	\N	\N	2025-10-03 08:22:59.109841	2025-10-03 08:22:59.109841
162	2	6	Appointment Reminder	Upcoming appointment with Sarah Johnson tomorrow at 10:00 AM.	appointment_reminder	high	unread	appointment	912	/calendar	t	\N	\N	{"icon": "Calendar", "color": "orange", "urgency": "high", "patientId": 2, "department": "Cardiology", "patientName": "Sarah Johnson", "appointmentId": 912}	\N	\N	2025-10-03 08:22:59.109841	2025-10-03 08:22:59.109841
163	2	13	Critical Drug Interaction Alert	Potential interaction detected between Warfarin and Aspirin for patient Robert Davis.	prescription_alert	critical	unread	patient	3	/patients/2/prescriptions	t	\N	\N	{"icon": "AlertTriangle", "color": "red", "urgency": "critical", "patientId": 3, "department": "Pharmacy", "patientName": "Robert Davis", "requiresResponse": true}	\N	\N	2025-10-03 08:22:59.109841	2025-10-03 08:22:59.109841
164	2	7	Patient Message	Sarah Johnson has sent a message regarding her medication side effects.	message	normal	read	patient	2	/messaging/conversations/1	t	\N	\N	{"icon": "MessageSquare", "color": "green", "urgency": "medium", "patientId": 2, "department": "General", "patientName": "Sarah Johnson"}	2025-10-03 06:22:58.812	\N	2025-10-03 08:22:59.109841	2025-10-03 08:22:59.109841
165	2	6	System Maintenance Alert	Scheduled system maintenance will occur tonight from 2:00 AM - 4:00 AM.	system_alert	low	unread	\N	\N	\N	f	\N	\N	{"icon": "Settings", "color": "gray", "urgency": "low", "department": "IT", "autoMarkAsRead": true}	\N	\N	2025-10-03 08:22:59.109841	2025-10-03 08:22:59.109841
166	2	6	Lab Results Available	Blood work results for Sarah Johnson are now available for review.	lab_result	normal	unread	patient	2	/patients/1/lab-results	t	\N	\N	{"icon": "Activity", "color": "blue", "urgency": "medium", "patientId": 2, "department": "Laboratory", "patientName": "Sarah Johnson"}	\N	\N	2025-10-03 08:24:38.923989	2025-10-03 08:24:38.923989
167	2	6	Appointment Reminder	Upcoming appointment with Sarah Johnson tomorrow at 10:00 AM.	appointment_reminder	high	unread	appointment	912	/calendar	t	\N	\N	{"icon": "Calendar", "color": "orange", "urgency": "high", "patientId": 2, "department": "Cardiology", "patientName": "Sarah Johnson", "appointmentId": 912}	\N	\N	2025-10-03 08:24:38.923989	2025-10-03 08:24:38.923989
168	2	13	Critical Drug Interaction Alert	Potential interaction detected between Warfarin and Aspirin for patient Robert Davis.	prescription_alert	critical	unread	patient	3	/patients/2/prescriptions	t	\N	\N	{"icon": "AlertTriangle", "color": "red", "urgency": "critical", "patientId": 3, "department": "Pharmacy", "patientName": "Robert Davis", "requiresResponse": true}	\N	\N	2025-10-03 08:24:38.923989	2025-10-03 08:24:38.923989
169	2	7	Patient Message	Sarah Johnson has sent a message regarding her medication side effects.	message	normal	read	patient	2	/messaging/conversations/1	t	\N	\N	{"icon": "MessageSquare", "color": "green", "urgency": "medium", "patientId": 2, "department": "General", "patientName": "Sarah Johnson"}	2025-10-03 06:24:38.807	\N	2025-10-03 08:24:38.923989	2025-10-03 08:24:38.923989
170	2	6	System Maintenance Alert	Scheduled system maintenance will occur tonight from 2:00 AM - 4:00 AM.	system_alert	low	unread	\N	\N	\N	f	\N	\N	{"icon": "Settings", "color": "gray", "urgency": "low", "department": "IT", "autoMarkAsRead": true}	\N	\N	2025-10-03 08:24:38.923989	2025-10-03 08:24:38.923989
171	2	6	Lab Results Available	Blood work results for Sarah Johnson are now available for review.	lab_result	normal	unread	patient	2	/patients/1/lab-results	t	\N	\N	{"icon": "Activity", "color": "blue", "urgency": "medium", "patientId": 2, "department": "Laboratory", "patientName": "Sarah Johnson"}	\N	\N	2025-10-03 08:26:14.123636	2025-10-03 08:26:14.123636
172	2	6	Appointment Reminder	Upcoming appointment with Sarah Johnson tomorrow at 10:00 AM.	appointment_reminder	high	unread	appointment	912	/calendar	t	\N	\N	{"icon": "Calendar", "color": "orange", "urgency": "high", "patientId": 2, "department": "Cardiology", "patientName": "Sarah Johnson", "appointmentId": 912}	\N	\N	2025-10-03 08:26:14.123636	2025-10-03 08:26:14.123636
173	2	13	Critical Drug Interaction Alert	Potential interaction detected between Warfarin and Aspirin for patient Robert Davis.	prescription_alert	critical	unread	patient	3	/patients/2/prescriptions	t	\N	\N	{"icon": "AlertTriangle", "color": "red", "urgency": "critical", "patientId": 3, "department": "Pharmacy", "patientName": "Robert Davis", "requiresResponse": true}	\N	\N	2025-10-03 08:26:14.123636	2025-10-03 08:26:14.123636
174	2	7	Patient Message	Sarah Johnson has sent a message regarding her medication side effects.	message	normal	read	patient	2	/messaging/conversations/1	t	\N	\N	{"icon": "MessageSquare", "color": "green", "urgency": "medium", "patientId": 2, "department": "General", "patientName": "Sarah Johnson"}	2025-10-03 06:26:13.984	\N	2025-10-03 08:26:14.123636	2025-10-03 08:26:14.123636
175	2	6	System Maintenance Alert	Scheduled system maintenance will occur tonight from 2:00 AM - 4:00 AM.	system_alert	low	unread	\N	\N	\N	f	\N	\N	{"icon": "Settings", "color": "gray", "urgency": "low", "department": "IT", "autoMarkAsRead": true}	\N	\N	2025-10-03 08:26:14.123636	2025-10-03 08:26:14.123636
176	2	6	Lab Results Available	Blood work results for Sarah Johnson are now available for review.	lab_result	normal	unread	patient	2	/patients/1/lab-results	t	\N	\N	{"icon": "Activity", "color": "blue", "urgency": "medium", "patientId": 2, "department": "Laboratory", "patientName": "Sarah Johnson"}	\N	\N	2025-10-03 08:35:29.827286	2025-10-03 08:35:29.827286
177	2	6	Appointment Reminder	Upcoming appointment with Sarah Johnson tomorrow at 10:00 AM.	appointment_reminder	high	unread	appointment	912	/calendar	t	\N	\N	{"icon": "Calendar", "color": "orange", "urgency": "high", "patientId": 2, "department": "Cardiology", "patientName": "Sarah Johnson", "appointmentId": 912}	\N	\N	2025-10-03 08:35:29.827286	2025-10-03 08:35:29.827286
178	2	13	Critical Drug Interaction Alert	Potential interaction detected between Warfarin and Aspirin for patient Robert Davis.	prescription_alert	critical	unread	patient	3	/patients/2/prescriptions	t	\N	\N	{"icon": "AlertTriangle", "color": "red", "urgency": "critical", "patientId": 3, "department": "Pharmacy", "patientName": "Robert Davis", "requiresResponse": true}	\N	\N	2025-10-03 08:35:29.827286	2025-10-03 08:35:29.827286
179	2	7	Patient Message	Sarah Johnson has sent a message regarding her medication side effects.	message	normal	read	patient	2	/messaging/conversations/1	t	\N	\N	{"icon": "MessageSquare", "color": "green", "urgency": "medium", "patientId": 2, "department": "General", "patientName": "Sarah Johnson"}	2025-10-03 06:35:29.706	\N	2025-10-03 08:35:29.827286	2025-10-03 08:35:29.827286
180	2	6	System Maintenance Alert	Scheduled system maintenance will occur tonight from 2:00 AM - 4:00 AM.	system_alert	low	unread	\N	\N	\N	f	\N	\N	{"icon": "Settings", "color": "gray", "urgency": "low", "department": "IT", "autoMarkAsRead": true}	\N	\N	2025-10-03 08:35:29.827286	2025-10-03 08:35:29.827286
181	2	6	Lab Results Available	Blood work results for Sarah Johnson are now available for review.	lab_result	normal	unread	patient	2	/patients/1/lab-results	t	\N	\N	{"icon": "Activity", "color": "blue", "urgency": "medium", "patientId": 2, "department": "Laboratory", "patientName": "Sarah Johnson"}	\N	\N	2025-10-03 08:43:38.570176	2025-10-03 08:43:38.570176
182	2	6	Appointment Reminder	Upcoming appointment with Sarah Johnson tomorrow at 10:00 AM.	appointment_reminder	high	unread	appointment	912	/calendar	t	\N	\N	{"icon": "Calendar", "color": "orange", "urgency": "high", "patientId": 2, "department": "Cardiology", "patientName": "Sarah Johnson", "appointmentId": 912}	\N	\N	2025-10-03 08:43:38.570176	2025-10-03 08:43:38.570176
183	2	13	Critical Drug Interaction Alert	Potential interaction detected between Warfarin and Aspirin for patient Robert Davis.	prescription_alert	critical	unread	patient	3	/patients/2/prescriptions	t	\N	\N	{"icon": "AlertTriangle", "color": "red", "urgency": "critical", "patientId": 3, "department": "Pharmacy", "patientName": "Robert Davis", "requiresResponse": true}	\N	\N	2025-10-03 08:43:38.570176	2025-10-03 08:43:38.570176
184	2	7	Patient Message	Sarah Johnson has sent a message regarding her medication side effects.	message	normal	read	patient	2	/messaging/conversations/1	t	\N	\N	{"icon": "MessageSquare", "color": "green", "urgency": "medium", "patientId": 2, "department": "General", "patientName": "Sarah Johnson"}	2025-10-03 06:43:38.451	\N	2025-10-03 08:43:38.570176	2025-10-03 08:43:38.570176
185	2	6	System Maintenance Alert	Scheduled system maintenance will occur tonight from 2:00 AM - 4:00 AM.	system_alert	low	unread	\N	\N	\N	f	\N	\N	{"icon": "Settings", "color": "gray", "urgency": "low", "department": "IT", "autoMarkAsRead": true}	\N	\N	2025-10-03 08:43:38.570176	2025-10-03 08:43:38.570176
186	2	6	Lab Results Available	Blood work results for Sarah Johnson are now available for review.	lab_result	normal	unread	patient	2	/patients/1/lab-results	t	\N	\N	{"icon": "Activity", "color": "blue", "urgency": "medium", "patientId": 2, "department": "Laboratory", "patientName": "Sarah Johnson"}	\N	\N	2025-10-03 09:03:14.576987	2025-10-03 09:03:14.576987
187	2	6	Appointment Reminder	Upcoming appointment with Sarah Johnson tomorrow at 10:00 AM.	appointment_reminder	high	unread	appointment	912	/calendar	t	\N	\N	{"icon": "Calendar", "color": "orange", "urgency": "high", "patientId": 2, "department": "Cardiology", "patientName": "Sarah Johnson", "appointmentId": 912}	\N	\N	2025-10-03 09:03:14.576987	2025-10-03 09:03:14.576987
188	2	13	Critical Drug Interaction Alert	Potential interaction detected between Warfarin and Aspirin for patient Robert Davis.	prescription_alert	critical	unread	patient	3	/patients/2/prescriptions	t	\N	\N	{"icon": "AlertTriangle", "color": "red", "urgency": "critical", "patientId": 3, "department": "Pharmacy", "patientName": "Robert Davis", "requiresResponse": true}	\N	\N	2025-10-03 09:03:14.576987	2025-10-03 09:03:14.576987
189	2	7	Patient Message	Sarah Johnson has sent a message regarding her medication side effects.	message	normal	read	patient	2	/messaging/conversations/1	t	\N	\N	{"icon": "MessageSquare", "color": "green", "urgency": "medium", "patientId": 2, "department": "General", "patientName": "Sarah Johnson"}	2025-10-03 07:03:14.46	\N	2025-10-03 09:03:14.576987	2025-10-03 09:03:14.576987
191	2	6	Lab Results Available	Blood work results for Sarah Johnson are now available for review.	lab_result	normal	unread	patient	2	/patients/1/lab-results	t	\N	\N	{"icon": "Activity", "color": "blue", "urgency": "medium", "patientId": 2, "department": "Laboratory", "patientName": "Sarah Johnson"}	\N	\N	2025-10-03 09:44:50.236852	2025-10-03 09:44:50.236852
192	2	6	Appointment Reminder	Upcoming appointment with Sarah Johnson tomorrow at 10:00 AM.	appointment_reminder	high	unread	appointment	912	/calendar	t	\N	\N	{"icon": "Calendar", "color": "orange", "urgency": "high", "patientId": 2, "department": "Cardiology", "patientName": "Sarah Johnson", "appointmentId": 912}	\N	\N	2025-10-03 09:44:50.236852	2025-10-03 09:44:50.236852
193	2	13	Critical Drug Interaction Alert	Potential interaction detected between Warfarin and Aspirin for patient Robert Davis.	prescription_alert	critical	unread	patient	3	/patients/2/prescriptions	t	\N	\N	{"icon": "AlertTriangle", "color": "red", "urgency": "critical", "patientId": 3, "department": "Pharmacy", "patientName": "Robert Davis", "requiresResponse": true}	\N	\N	2025-10-03 09:44:50.236852	2025-10-03 09:44:50.236852
194	2	7	Patient Message	Sarah Johnson has sent a message regarding her medication side effects.	message	normal	read	patient	2	/messaging/conversations/1	t	\N	\N	{"icon": "MessageSquare", "color": "green", "urgency": "medium", "patientId": 2, "department": "General", "patientName": "Sarah Johnson"}	2025-10-03 07:44:50.119	\N	2025-10-03 09:44:50.236852	2025-10-03 09:44:50.236852
195	2	6	System Maintenance Alert	Scheduled system maintenance will occur tonight from 2:00 AM - 4:00 AM.	system_alert	low	unread	\N	\N	\N	f	\N	\N	{"icon": "Settings", "color": "gray", "urgency": "low", "department": "IT", "autoMarkAsRead": true}	\N	\N	2025-10-03 09:44:50.236852	2025-10-03 09:44:50.236852
196	2	6	Lab Results Available	Blood work results for Sarah Johnson are now available for review.	lab_result	normal	unread	patient	2	/patients/1/lab-results	t	\N	\N	{"icon": "Activity", "color": "blue", "urgency": "medium", "patientId": 2, "department": "Laboratory", "patientName": "Sarah Johnson"}	\N	\N	2025-10-03 09:45:36.344883	2025-10-03 09:45:36.344883
197	2	6	Appointment Reminder	Upcoming appointment with Sarah Johnson tomorrow at 10:00 AM.	appointment_reminder	high	unread	appointment	912	/calendar	t	\N	\N	{"icon": "Calendar", "color": "orange", "urgency": "high", "patientId": 2, "department": "Cardiology", "patientName": "Sarah Johnson", "appointmentId": 912}	\N	\N	2025-10-03 09:45:36.344883	2025-10-03 09:45:36.344883
198	2	13	Critical Drug Interaction Alert	Potential interaction detected between Warfarin and Aspirin for patient Robert Davis.	prescription_alert	critical	unread	patient	3	/patients/2/prescriptions	t	\N	\N	{"icon": "AlertTriangle", "color": "red", "urgency": "critical", "patientId": 3, "department": "Pharmacy", "patientName": "Robert Davis", "requiresResponse": true}	\N	\N	2025-10-03 09:45:36.344883	2025-10-03 09:45:36.344883
199	2	7	Patient Message	Sarah Johnson has sent a message regarding her medication side effects.	message	normal	read	patient	2	/messaging/conversations/1	t	\N	\N	{"icon": "MessageSquare", "color": "green", "urgency": "medium", "patientId": 2, "department": "General", "patientName": "Sarah Johnson"}	2025-10-03 07:45:36.227	\N	2025-10-03 09:45:36.344883	2025-10-03 09:45:36.344883
200	2	6	System Maintenance Alert	Scheduled system maintenance will occur tonight from 2:00 AM - 4:00 AM.	system_alert	low	unread	\N	\N	\N	f	\N	\N	{"icon": "Settings", "color": "gray", "urgency": "low", "department": "IT", "autoMarkAsRead": true}	\N	\N	2025-10-03 09:45:36.344883	2025-10-03 09:45:36.344883
201	2	6	Lab Results Available	Blood work results for Sarah Johnson are now available for review.	lab_result	normal	unread	patient	2	/patients/1/lab-results	t	\N	\N	{"icon": "Activity", "color": "blue", "urgency": "medium", "patientId": 2, "department": "Laboratory", "patientName": "Sarah Johnson"}	\N	\N	2025-10-03 10:09:16.026957	2025-10-03 10:09:16.026957
202	2	6	Appointment Reminder	Upcoming appointment with Sarah Johnson tomorrow at 10:00 AM.	appointment_reminder	high	unread	appointment	912	/calendar	t	\N	\N	{"icon": "Calendar", "color": "orange", "urgency": "high", "patientId": 2, "department": "Cardiology", "patientName": "Sarah Johnson", "appointmentId": 912}	\N	\N	2025-10-03 10:09:16.026957	2025-10-03 10:09:16.026957
203	2	13	Critical Drug Interaction Alert	Potential interaction detected between Warfarin and Aspirin for patient Robert Davis.	prescription_alert	critical	unread	patient	3	/patients/2/prescriptions	t	\N	\N	{"icon": "AlertTriangle", "color": "red", "urgency": "critical", "patientId": 3, "department": "Pharmacy", "patientName": "Robert Davis", "requiresResponse": true}	\N	\N	2025-10-03 10:09:16.026957	2025-10-03 10:09:16.026957
204	2	7	Patient Message	Sarah Johnson has sent a message regarding her medication side effects.	message	normal	read	patient	2	/messaging/conversations/1	t	\N	\N	{"icon": "MessageSquare", "color": "green", "urgency": "medium", "patientId": 2, "department": "General", "patientName": "Sarah Johnson"}	2025-10-03 08:09:15.89	\N	2025-10-03 10:09:16.026957	2025-10-03 10:09:16.026957
205	2	6	System Maintenance Alert	Scheduled system maintenance will occur tonight from 2:00 AM - 4:00 AM.	system_alert	low	unread	\N	\N	\N	f	\N	\N	{"icon": "Settings", "color": "gray", "urgency": "low", "department": "IT", "autoMarkAsRead": true}	\N	\N	2025-10-03 10:09:16.026957	2025-10-03 10:09:16.026957
206	2	6	Lab Results Available	Blood work results for Sarah Johnson are now available for review.	lab_result	normal	unread	patient	2	/patients/1/lab-results	t	\N	\N	{"icon": "Activity", "color": "blue", "urgency": "medium", "patientId": 2, "department": "Laboratory", "patientName": "Sarah Johnson"}	\N	\N	2025-10-03 10:19:13.974339	2025-10-03 10:19:13.974339
207	2	6	Appointment Reminder	Upcoming appointment with Sarah Johnson tomorrow at 10:00 AM.	appointment_reminder	high	unread	appointment	912	/calendar	t	\N	\N	{"icon": "Calendar", "color": "orange", "urgency": "high", "patientId": 2, "department": "Cardiology", "patientName": "Sarah Johnson", "appointmentId": 912}	\N	\N	2025-10-03 10:19:13.974339	2025-10-03 10:19:13.974339
208	2	13	Critical Drug Interaction Alert	Potential interaction detected between Warfarin and Aspirin for patient Robert Davis.	prescription_alert	critical	unread	patient	3	/patients/2/prescriptions	t	\N	\N	{"icon": "AlertTriangle", "color": "red", "urgency": "critical", "patientId": 3, "department": "Pharmacy", "patientName": "Robert Davis", "requiresResponse": true}	\N	\N	2025-10-03 10:19:13.974339	2025-10-03 10:19:13.974339
209	2	7	Patient Message	Sarah Johnson has sent a message regarding her medication side effects.	message	normal	read	patient	2	/messaging/conversations/1	t	\N	\N	{"icon": "MessageSquare", "color": "green", "urgency": "medium", "patientId": 2, "department": "General", "patientName": "Sarah Johnson"}	2025-10-03 08:19:13.855	\N	2025-10-03 10:19:13.974339	2025-10-03 10:19:13.974339
210	2	6	System Maintenance Alert	Scheduled system maintenance will occur tonight from 2:00 AM - 4:00 AM.	system_alert	low	unread	\N	\N	\N	f	\N	\N	{"icon": "Settings", "color": "gray", "urgency": "low", "department": "IT", "autoMarkAsRead": true}	\N	\N	2025-10-03 10:19:13.974339	2025-10-03 10:19:13.974339
211	2	6	Lab Results Available	Blood work results for Sarah Johnson are now available for review.	lab_result	normal	unread	patient	2	/patients/1/lab-results	t	\N	\N	{"icon": "Activity", "color": "blue", "urgency": "medium", "patientId": 2, "department": "Laboratory", "patientName": "Sarah Johnson"}	\N	\N	2025-10-03 10:37:33.688819	2025-10-03 10:37:33.688819
212	2	6	Appointment Reminder	Upcoming appointment with Sarah Johnson tomorrow at 10:00 AM.	appointment_reminder	high	unread	appointment	912	/calendar	t	\N	\N	{"icon": "Calendar", "color": "orange", "urgency": "high", "patientId": 2, "department": "Cardiology", "patientName": "Sarah Johnson", "appointmentId": 912}	\N	\N	2025-10-03 10:37:33.688819	2025-10-03 10:37:33.688819
213	2	13	Critical Drug Interaction Alert	Potential interaction detected between Warfarin and Aspirin for patient Robert Davis.	prescription_alert	critical	unread	patient	3	/patients/2/prescriptions	t	\N	\N	{"icon": "AlertTriangle", "color": "red", "urgency": "critical", "patientId": 3, "department": "Pharmacy", "patientName": "Robert Davis", "requiresResponse": true}	\N	\N	2025-10-03 10:37:33.688819	2025-10-03 10:37:33.688819
214	2	7	Patient Message	Sarah Johnson has sent a message regarding her medication side effects.	message	normal	read	patient	2	/messaging/conversations/1	t	\N	\N	{"icon": "MessageSquare", "color": "green", "urgency": "medium", "patientId": 2, "department": "General", "patientName": "Sarah Johnson"}	2025-10-03 08:37:33.568	\N	2025-10-03 10:37:33.688819	2025-10-03 10:37:33.688819
215	2	6	System Maintenance Alert	Scheduled system maintenance will occur tonight from 2:00 AM - 4:00 AM.	system_alert	low	unread	\N	\N	\N	f	\N	\N	{"icon": "Settings", "color": "gray", "urgency": "low", "department": "IT", "autoMarkAsRead": true}	\N	\N	2025-10-03 10:37:33.688819	2025-10-03 10:37:33.688819
216	2	6	Lab Results Available	Blood work results for Sarah Johnson are now available for review.	lab_result	normal	unread	patient	2	/patients/1/lab-results	t	\N	\N	{"icon": "Activity", "color": "blue", "urgency": "medium", "patientId": 2, "department": "Laboratory", "patientName": "Sarah Johnson"}	\N	\N	2025-10-03 10:46:57.537318	2025-10-03 10:46:57.537318
217	2	6	Appointment Reminder	Upcoming appointment with Sarah Johnson tomorrow at 10:00 AM.	appointment_reminder	high	unread	appointment	912	/calendar	t	\N	\N	{"icon": "Calendar", "color": "orange", "urgency": "high", "patientId": 2, "department": "Cardiology", "patientName": "Sarah Johnson", "appointmentId": 912}	\N	\N	2025-10-03 10:46:57.537318	2025-10-03 10:46:57.537318
218	2	13	Critical Drug Interaction Alert	Potential interaction detected between Warfarin and Aspirin for patient Robert Davis.	prescription_alert	critical	unread	patient	3	/patients/2/prescriptions	t	\N	\N	{"icon": "AlertTriangle", "color": "red", "urgency": "critical", "patientId": 3, "department": "Pharmacy", "patientName": "Robert Davis", "requiresResponse": true}	\N	\N	2025-10-03 10:46:57.537318	2025-10-03 10:46:57.537318
219	2	7	Patient Message	Sarah Johnson has sent a message regarding her medication side effects.	message	normal	read	patient	2	/messaging/conversations/1	t	\N	\N	{"icon": "MessageSquare", "color": "green", "urgency": "medium", "patientId": 2, "department": "General", "patientName": "Sarah Johnson"}	2025-10-03 08:46:57.419	\N	2025-10-03 10:46:57.537318	2025-10-03 10:46:57.537318
220	2	6	System Maintenance Alert	Scheduled system maintenance will occur tonight from 2:00 AM - 4:00 AM.	system_alert	low	unread	\N	\N	\N	f	\N	\N	{"icon": "Settings", "color": "gray", "urgency": "low", "department": "IT", "autoMarkAsRead": true}	\N	\N	2025-10-03 10:46:57.537318	2025-10-03 10:46:57.537318
221	2	6	Lab Results Available	Blood work results for Sarah Johnson are now available for review.	lab_result	normal	unread	patient	2	/patients/1/lab-results	t	\N	\N	{"icon": "Activity", "color": "blue", "urgency": "medium", "patientId": 2, "department": "Laboratory", "patientName": "Sarah Johnson"}	\N	\N	2025-10-03 10:54:40.506761	2025-10-03 10:54:40.506761
222	2	6	Appointment Reminder	Upcoming appointment with Sarah Johnson tomorrow at 10:00 AM.	appointment_reminder	high	unread	appointment	912	/calendar	t	\N	\N	{"icon": "Calendar", "color": "orange", "urgency": "high", "patientId": 2, "department": "Cardiology", "patientName": "Sarah Johnson", "appointmentId": 912}	\N	\N	2025-10-03 10:54:40.506761	2025-10-03 10:54:40.506761
223	2	13	Critical Drug Interaction Alert	Potential interaction detected between Warfarin and Aspirin for patient Robert Davis.	prescription_alert	critical	unread	patient	3	/patients/2/prescriptions	t	\N	\N	{"icon": "AlertTriangle", "color": "red", "urgency": "critical", "patientId": 3, "department": "Pharmacy", "patientName": "Robert Davis", "requiresResponse": true}	\N	\N	2025-10-03 10:54:40.506761	2025-10-03 10:54:40.506761
224	2	7	Patient Message	Sarah Johnson has sent a message regarding her medication side effects.	message	normal	read	patient	2	/messaging/conversations/1	t	\N	\N	{"icon": "MessageSquare", "color": "green", "urgency": "medium", "patientId": 2, "department": "General", "patientName": "Sarah Johnson"}	2025-10-03 08:54:40.373	\N	2025-10-03 10:54:40.506761	2025-10-03 10:54:40.506761
225	2	6	System Maintenance Alert	Scheduled system maintenance will occur tonight from 2:00 AM - 4:00 AM.	system_alert	low	unread	\N	\N	\N	f	\N	\N	{"icon": "Settings", "color": "gray", "urgency": "low", "department": "IT", "autoMarkAsRead": true}	\N	\N	2025-10-03 10:54:40.506761	2025-10-03 10:54:40.506761
226	2	6	Lab Results Available	Blood work results for Sarah Johnson are now available for review.	lab_result	normal	unread	patient	2	/patients/1/lab-results	t	\N	\N	{"icon": "Activity", "color": "blue", "urgency": "medium", "patientId": 2, "department": "Laboratory", "patientName": "Sarah Johnson"}	\N	\N	2025-10-03 11:41:08.47079	2025-10-03 11:41:08.47079
227	2	6	Appointment Reminder	Upcoming appointment with Sarah Johnson tomorrow at 10:00 AM.	appointment_reminder	high	unread	appointment	912	/calendar	t	\N	\N	{"icon": "Calendar", "color": "orange", "urgency": "high", "patientId": 2, "department": "Cardiology", "patientName": "Sarah Johnson", "appointmentId": 912}	\N	\N	2025-10-03 11:41:08.47079	2025-10-03 11:41:08.47079
228	2	13	Critical Drug Interaction Alert	Potential interaction detected between Warfarin and Aspirin for patient Robert Davis.	prescription_alert	critical	unread	patient	3	/patients/2/prescriptions	t	\N	\N	{"icon": "AlertTriangle", "color": "red", "urgency": "critical", "patientId": 3, "department": "Pharmacy", "patientName": "Robert Davis", "requiresResponse": true}	\N	\N	2025-10-03 11:41:08.47079	2025-10-03 11:41:08.47079
229	2	7	Patient Message	Sarah Johnson has sent a message regarding her medication side effects.	message	normal	read	patient	2	/messaging/conversations/1	t	\N	\N	{"icon": "MessageSquare", "color": "green", "urgency": "medium", "patientId": 2, "department": "General", "patientName": "Sarah Johnson"}	2025-10-03 09:41:08.353	\N	2025-10-03 11:41:08.47079	2025-10-03 11:41:08.47079
230	2	6	System Maintenance Alert	Scheduled system maintenance will occur tonight from 2:00 AM - 4:00 AM.	system_alert	low	unread	\N	\N	\N	f	\N	\N	{"icon": "Settings", "color": "gray", "urgency": "low", "department": "IT", "autoMarkAsRead": true}	\N	\N	2025-10-03 11:41:08.47079	2025-10-03 11:41:08.47079
231	2	6	Lab Results Available	Blood work results for Sarah Johnson are now available for review.	lab_result	normal	unread	patient	2	/patients/1/lab-results	t	\N	\N	{"icon": "Activity", "color": "blue", "urgency": "medium", "patientId": 2, "department": "Laboratory", "patientName": "Sarah Johnson"}	\N	\N	2025-10-03 11:54:15.926619	2025-10-03 11:54:15.926619
232	2	6	Appointment Reminder	Upcoming appointment with Sarah Johnson tomorrow at 10:00 AM.	appointment_reminder	high	unread	appointment	912	/calendar	t	\N	\N	{"icon": "Calendar", "color": "orange", "urgency": "high", "patientId": 2, "department": "Cardiology", "patientName": "Sarah Johnson", "appointmentId": 912}	\N	\N	2025-10-03 11:54:15.926619	2025-10-03 11:54:15.926619
233	2	13	Critical Drug Interaction Alert	Potential interaction detected between Warfarin and Aspirin for patient Robert Davis.	prescription_alert	critical	unread	patient	3	/patients/2/prescriptions	t	\N	\N	{"icon": "AlertTriangle", "color": "red", "urgency": "critical", "patientId": 3, "department": "Pharmacy", "patientName": "Robert Davis", "requiresResponse": true}	\N	\N	2025-10-03 11:54:15.926619	2025-10-03 11:54:15.926619
234	2	7	Patient Message	Sarah Johnson has sent a message regarding her medication side effects.	message	normal	read	patient	2	/messaging/conversations/1	t	\N	\N	{"icon": "MessageSquare", "color": "green", "urgency": "medium", "patientId": 2, "department": "General", "patientName": "Sarah Johnson"}	2025-10-03 09:54:15.808	\N	2025-10-03 11:54:15.926619	2025-10-03 11:54:15.926619
235	2	6	System Maintenance Alert	Scheduled system maintenance will occur tonight from 2:00 AM - 4:00 AM.	system_alert	low	unread	\N	\N	\N	f	\N	\N	{"icon": "Settings", "color": "gray", "urgency": "low", "department": "IT", "autoMarkAsRead": true}	\N	\N	2025-10-03 11:54:15.926619	2025-10-03 11:54:15.926619
236	2	6	Lab Results Available	Blood work results for Sarah Johnson are now available for review.	lab_result	normal	unread	patient	2	/patients/1/lab-results	t	\N	\N	{"icon": "Activity", "color": "blue", "urgency": "medium", "patientId": 2, "department": "Laboratory", "patientName": "Sarah Johnson"}	\N	\N	2025-10-03 12:38:20.601903	2025-10-03 12:38:20.601903
237	2	6	Appointment Reminder	Upcoming appointment with Sarah Johnson tomorrow at 10:00 AM.	appointment_reminder	high	unread	appointment	912	/calendar	t	\N	\N	{"icon": "Calendar", "color": "orange", "urgency": "high", "patientId": 2, "department": "Cardiology", "patientName": "Sarah Johnson", "appointmentId": 912}	\N	\N	2025-10-03 12:38:20.601903	2025-10-03 12:38:20.601903
238	2	13	Critical Drug Interaction Alert	Potential interaction detected between Warfarin and Aspirin for patient Robert Davis.	prescription_alert	critical	unread	patient	3	/patients/2/prescriptions	t	\N	\N	{"icon": "AlertTriangle", "color": "red", "urgency": "critical", "patientId": 3, "department": "Pharmacy", "patientName": "Robert Davis", "requiresResponse": true}	\N	\N	2025-10-03 12:38:20.601903	2025-10-03 12:38:20.601903
239	2	7	Patient Message	Sarah Johnson has sent a message regarding her medication side effects.	message	normal	read	patient	2	/messaging/conversations/1	t	\N	\N	{"icon": "MessageSquare", "color": "green", "urgency": "medium", "patientId": 2, "department": "General", "patientName": "Sarah Johnson"}	2025-10-03 10:38:20.483	\N	2025-10-03 12:38:20.601903	2025-10-03 12:38:20.601903
240	2	6	System Maintenance Alert	Scheduled system maintenance will occur tonight from 2:00 AM - 4:00 AM.	system_alert	low	unread	\N	\N	\N	f	\N	\N	{"icon": "Settings", "color": "gray", "urgency": "low", "department": "IT", "autoMarkAsRead": true}	\N	\N	2025-10-03 12:38:20.601903	2025-10-03 12:38:20.601903
241	2	6	Lab Results Available	Blood work results for Sarah Johnson are now available for review.	lab_result	normal	unread	patient	2	/patients/1/lab-results	t	\N	\N	{"icon": "Activity", "color": "blue", "urgency": "medium", "patientId": 2, "department": "Laboratory", "patientName": "Sarah Johnson"}	\N	\N	2025-10-03 12:44:22.154344	2025-10-03 12:44:22.154344
242	2	6	Appointment Reminder	Upcoming appointment with Sarah Johnson tomorrow at 10:00 AM.	appointment_reminder	high	unread	appointment	912	/calendar	t	\N	\N	{"icon": "Calendar", "color": "orange", "urgency": "high", "patientId": 2, "department": "Cardiology", "patientName": "Sarah Johnson", "appointmentId": 912}	\N	\N	2025-10-03 12:44:22.154344	2025-10-03 12:44:22.154344
243	2	13	Critical Drug Interaction Alert	Potential interaction detected between Warfarin and Aspirin for patient Robert Davis.	prescription_alert	critical	unread	patient	3	/patients/2/prescriptions	t	\N	\N	{"icon": "AlertTriangle", "color": "red", "urgency": "critical", "patientId": 3, "department": "Pharmacy", "patientName": "Robert Davis", "requiresResponse": true}	\N	\N	2025-10-03 12:44:22.154344	2025-10-03 12:44:22.154344
244	2	7	Patient Message	Sarah Johnson has sent a message regarding her medication side effects.	message	normal	read	patient	2	/messaging/conversations/1	t	\N	\N	{"icon": "MessageSquare", "color": "green", "urgency": "medium", "patientId": 2, "department": "General", "patientName": "Sarah Johnson"}	2025-10-03 10:44:22.027	\N	2025-10-03 12:44:22.154344	2025-10-03 12:44:22.154344
245	2	6	System Maintenance Alert	Scheduled system maintenance will occur tonight from 2:00 AM - 4:00 AM.	system_alert	low	unread	\N	\N	\N	f	\N	\N	{"icon": "Settings", "color": "gray", "urgency": "low", "department": "IT", "autoMarkAsRead": true}	\N	\N	2025-10-03 12:44:22.154344	2025-10-03 12:44:22.154344
\.


--
-- Data for Name: organizations; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.organizations (id, name, subdomain, email, region, brand_name, settings, features, access_level, subscription_status, created_at, updated_at) FROM stdin;
2	Averox Healthcare	demo	admin@averox-healthcare.com	UK	MediCore Demo	{"theme": {"logoUrl": "", "primaryColor": "#3b82f6"}, "features": {"aiEnabled": true, "billingEnabled": true}, "compliance": {"gdprEnabled": true, "dataResidency": "UK"}}	{}	full	active	2025-10-02 11:52:21.227868	2025-10-02 11:52:21.227868
\.


--
-- Data for Name: patient_communications; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.patient_communications (id, organization_id, patient_id, sent_by, type, method, status, message, scheduled_for, sent_at, delivered_at, error_message, metadata, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: patient_drug_interactions; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.patient_drug_interactions (id, organization_id, patient_id, medication1_name, medication1_dosage, medication1_frequency, medication2_name, medication2_dosage, medication2_frequency, interaction_type, severity, description, warnings, recommendations, reported_by, reported_at, status, notes, is_active, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: patients; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.patients (id, organization_id, patient_id, first_name, last_name, date_of_birth, email, phone, nhs_number, address, insurance_info, emergency_contact, medical_history, risk_level, flags, communication_preferences, is_active, is_insured, created_at, updated_at, gender_at_birth) FROM stdin;
2	2	P002	Robert	Davis	1970-07-22	robert.davis@email.com	+44 7700 900125	234 567 8901	{"city": "Manchester", "state": "Greater Manchester", "street": "456 Oak Avenue", "country": "UK", "postcode": "M1 1AA"}	{}	{"name": "Susan Davis", "phone": "+44 7700 900126", "relationship": "Spouse"}	{"allergies": ["Shellfish"], "medications": ["Metformin 500mg", "Simvastatin 20mg"], "chronicConditions": ["Diabetes Type 2", "High Cholesterol"]}	high	{}	{}	t	f	2025-10-02 11:52:26.365879	2025-10-02 11:52:26.365879	\N
3	2	P003	ANN	ANN	1900-01-01	quratulain009911@outlook.com	\N	\N	{}	{}	{}	{}	low	{}	{}	t	f	2025-10-02 13:38:43.220725	2025-10-02 13:38:43.220725	\N
4	2	P000004	kafia	khan	1900-01-01	kabila@gmail.com	\N	\N	\N	{}	{}	\N	low	{}	\N	t	f	2025-10-02 14:53:10.258543	2025-10-02 14:53:10.258543	\N
1	2	P001	Alice	Williams	1985-03-15	alice.williams@email.com	+44 7700 900123	123 456 7890	{"city": "London", "state": "Greater London", "street": "123 Main Street", "country": "UK", "postcode": "SW1A 1AA"}	{}	{"name": "Bob Williams", "phone": "+44 7700 900124", "relationship": "Spouse"}	{"allergies": ["Penicillin", "Nuts"], "medications": ["Lisinopril 10mg"], "chronicConditions": ["Hypertension"]}	medium	{}	{}	t	t	2025-10-02 11:52:26.365879	2025-10-03 07:57:40.625	\N
6	2	P000005	ANN	ANN	\N	qain4414@gmail.com	\N	\N	\N	{}	{}	\N	low	{}	\N	f	f	2025-10-02 15:25:34.652749	2025-10-03 07:58:42.854	\N
7	2	P000006	ANN	ANN	1995-07-03	qain44142@gmail.com	+923115459791		{"city": "guyg", "street": "uygy", "country": "United Kingdom", "postcode": "bubb"}	{}	{"name": "taiyba", "phone": "0311 5459791", "relationship": "friend"}	{"allergies": [], "medications": [], "familyHistory": {"father": [], "mother": [], "siblings": [], "grandparents": []}, "immunizations": [], "socialHistory": {"drugs": {"status": "never"}, "alcohol": {"status": "never"}, "smoking": {"status": "never"}, "exercise": {"frequency": "none"}, "education": "", "occupation": "", "maritalStatus": "single"}, "chronicConditions": []}	low	{}	\N	t	f	2025-10-03 09:10:57.100047	2025-10-03 09:10:57.100047	Female
\.


--
-- Data for Name: prescriptions; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.prescriptions (id, organization_id, patient_id, doctor_id, consultation_id, prescription_number, status, diagnosis, medication_name, dosage, frequency, duration, instructions, issued_date, medications, pharmacy, prescribed_at, valid_until, notes, is_electronic, interactions, signature, created_at, updated_at) FROM stdin;
1	2	1	2	\N	RX-1759405948031-001	active	Hypertension	Lisinopril	10mg	Once daily	30 days	Take with or without food. Monitor blood pressure.	2025-10-02 11:52:28.146888	[{"name": "Lisinopril", "dosage": "10mg", "refills": 5, "duration": "30 days", "quantity": 30, "frequency": "Once daily", "instructions": "Take with or without food. Monitor blood pressure.", "genericAllowed": true}]	{"name": "City Pharmacy", "phone": "+44 20 7946 0958", "address": "123 Main St, London"}	2025-10-02 11:52:28.146888	\N	Patient tolerates ACE inhibitors well	t	[]	{}	2025-10-02 11:52:28.146888	2025-10-02 11:52:28.146888
2	2	2	2	\N	RX-1759405948031-002	active	Type 2 Diabetes	Metformin	500mg	Twice daily with meals	90 days	Take with breakfast and dinner	2025-10-02 11:52:28.146888	[{"name": "Metformin", "dosage": "500mg", "refills": 3, "duration": "90 days", "quantity": 180, "frequency": "Twice daily with meals", "instructions": "Take with breakfast and dinner", "genericAllowed": true}]	{"name": "Local Pharmacy", "phone": "+44 20 7946 0959", "address": "456 High St, London"}	2025-10-02 11:52:28.146888	\N	Monitor blood glucose levels	t	[]	{}	2025-10-02 11:52:28.146888	2025-10-02 11:52:28.146888
3	2	4	7	\N	RX-1759473868712-7u3p	active	diabties	e	e	Twice daily	30 days	none	2025-10-03 06:44:28.830869	[{"name": "e", "dosage": "e", "refills": 3, "duration": "30 days", "quantity": 3, "frequency": "Twice daily", "instructions": "none"}]	{"name": "Halo Health", "email": "pharmacy@halohealth.co.uk", "phone": "+44(0)121 827 5531", "address": "Unit 2 Drayton Court, Solihull, B90 4NG"}	2025-10-03 06:44:28.830869	\N	\N	t	[]	{}	2025-10-03 06:44:28.830869	2025-10-03 06:44:28.830869
\.


--
-- Data for Name: quickbooks_account_mappings; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.quickbooks_account_mappings (id, organization_id, connection_id, emr_account_type, emr_account_name, quickbooks_account_id, quickbooks_account_name, account_type, account_sub_type, is_active, sync_status, last_sync_at, error_message, metadata, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: quickbooks_connections; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.quickbooks_connections (id, organization_id, company_id, company_name, access_token, refresh_token, token_expiry, realm_id, base_url, is_active, last_sync_at, sync_settings, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: quickbooks_customer_mappings; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.quickbooks_customer_mappings (id, organization_id, connection_id, patient_id, quickbooks_customer_id, quickbooks_display_name, sync_status, last_sync_at, error_message, metadata, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: quickbooks_invoice_mappings; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.quickbooks_invoice_mappings (id, organization_id, connection_id, emr_invoice_id, quickbooks_invoice_id, quickbooks_invoice_number, patient_id, customer_id, amount, status, sync_status, last_sync_at, error_message, metadata, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: quickbooks_item_mappings; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.quickbooks_item_mappings (id, organization_id, connection_id, emr_item_type, emr_item_id, emr_item_name, quickbooks_item_id, quickbooks_item_name, item_type, unit_price, description, income_account_id, expense_account_id, is_active, sync_status, last_sync_at, error_message, metadata, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: quickbooks_payment_mappings; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.quickbooks_payment_mappings (id, organization_id, connection_id, emr_payment_id, quickbooks_payment_id, invoice_mapping_id, amount, payment_method, payment_date, sync_status, last_sync_at, error_message, metadata, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: quickbooks_sync_configs; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.quickbooks_sync_configs (id, organization_id, connection_id, config_type, config_name, config_value, is_active, description, created_by, updated_by, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: quickbooks_sync_logs; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.quickbooks_sync_logs (id, organization_id, connection_id, sync_type, operation, status, records_processed, records_successful, records_failed, start_time, end_time, error_message, error_details, metadata, created_at) FROM stdin;
\.


--
-- Data for Name: revenue_records; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.revenue_records (id, organization_id, month, revenue, expenses, profit, collections, target, created_at) FROM stdin;
\.


--
-- Data for Name: roles; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.roles (id, organization_id, name, display_name, description, permissions, is_system, created_at, updated_at) FROM stdin;
1	2	administrator	Administrator	Full system access with all permissions	{"fields": {"financialData": {"edit": true, "view": true}, "medicalHistory": {"edit": true, "view": true}, "patientSensitiveInfo": {"edit": true, "view": true}}, "modules": {"billing": {"edit": true, "view": true, "create": true, "delete": true}, "patients": {"edit": true, "view": true, "create": true, "delete": true}, "settings": {"edit": true, "view": true, "create": true, "delete": true}, "analytics": {"edit": true, "view": true, "create": true, "delete": true}, "appointments": {"edit": true, "view": true, "create": true, "delete": true}, "prescriptions": {"edit": true, "view": true, "create": true, "delete": true}, "medicalRecords": {"edit": true, "view": true, "create": true, "delete": true}, "userManagement": {"edit": true, "view": true, "create": true, "delete": true}}}	t	2025-10-02 11:56:12.120111	2025-10-02 11:56:12.120111
2	2	physician	Physician	Medical professional with clinical access	{"fields": {"financialData": {"edit": false, "view": true}, "medicalHistory": {"edit": true, "view": true}, "patientSensitiveInfo": {"edit": true, "view": true}}, "modules": {"billing": {"edit": false, "view": true, "create": false, "delete": false}, "patients": {"edit": true, "view": true, "create": true, "delete": false}, "settings": {"edit": false, "view": false, "create": false, "delete": false}, "analytics": {"edit": false, "view": true, "create": false, "delete": false}, "appointments": {"edit": true, "view": true, "create": true, "delete": false}, "prescriptions": {"edit": true, "view": true, "create": true, "delete": false}, "medicalRecords": {"edit": true, "view": true, "create": true, "delete": false}, "userManagement": {"edit": false, "view": false, "create": false, "delete": false}}}	t	2025-10-02 11:56:12.120111	2025-10-02 11:56:12.120111
3	2	nurse	Nurse	Nursing staff with patient care access	{"fields": {"financialData": {"edit": false, "view": false}, "medicalHistory": {"edit": false, "view": true}, "patientSensitiveInfo": {"edit": false, "view": true}}, "modules": {"billing": {"edit": false, "view": false, "create": false, "delete": false}, "patients": {"edit": true, "view": true, "create": false, "delete": false}, "settings": {"edit": false, "view": false, "create": false, "delete": false}, "analytics": {"edit": false, "view": false, "create": false, "delete": false}, "appointments": {"edit": true, "view": true, "create": true, "delete": false}, "prescriptions": {"edit": false, "view": true, "create": false, "delete": false}, "medicalRecords": {"edit": false, "view": true, "create": true, "delete": false}, "userManagement": {"edit": false, "view": false, "create": false, "delete": false}}}	t	2025-10-02 11:56:12.120111	2025-10-02 11:56:12.120111
5	2	patient	Patient	Patient with access to own records	{"fields": {"financialData": {"edit": false, "view": true}, "medicalHistory": {"edit": false, "view": true}, "patientSensitiveInfo": {"edit": false, "view": true}}, "modules": {"billing": {"edit": false, "view": true, "create": false, "delete": false}, "patients": {"edit": false, "view": false, "create": false, "delete": false}, "settings": {"edit": false, "view": false, "create": false, "delete": false}, "analytics": {"edit": false, "view": false, "create": false, "delete": false}, "appointments": {"edit": true, "view": true, "create": true, "delete": false}, "prescriptions": {"edit": false, "view": true, "create": false, "delete": false}, "medicalRecords": {"edit": false, "view": true, "create": false, "delete": false}, "userManagement": {"edit": false, "view": false, "create": false, "delete": false}}}	t	2025-10-02 13:10:03.159706	2025-10-02 13:10:03.159706
6	2	lab_technician	Lab Technician	Laboratory technician with lab results access	{"fields": {"financialData": {"edit": false, "view": false}, "medicalHistory": {"edit": false, "view": true}, "patientSensitiveInfo": {"edit": false, "view": false}}, "modules": {"billing": {"edit": false, "view": false, "create": false, "delete": false}, "patients": {"edit": false, "view": true, "create": false, "delete": false}, "settings": {"edit": false, "view": false, "create": false, "delete": false}, "analytics": {"edit": false, "view": false, "create": false, "delete": false}, "appointments": {"edit": false, "view": true, "create": false, "delete": false}, "prescriptions": {"edit": false, "view": false, "create": false, "delete": false}, "medicalRecords": {"edit": true, "view": true, "create": true, "delete": false}, "userManagement": {"edit": false, "view": false, "create": false, "delete": false}}}	t	2025-10-02 13:10:03.159706	2025-10-02 13:10:03.159706
7	2	pharmacist	Pharmacist	Pharmacist with prescription access	{"fields": {"financialData": {"edit": false, "view": false}, "medicalHistory": {"edit": false, "view": true}, "patientSensitiveInfo": {"edit": false, "view": false}}, "modules": {"billing": {"edit": false, "view": false, "create": false, "delete": false}, "patients": {"edit": false, "view": true, "create": false, "delete": false}, "settings": {"edit": false, "view": false, "create": false, "delete": false}, "analytics": {"edit": false, "view": false, "create": false, "delete": false}, "appointments": {"edit": false, "view": true, "create": false, "delete": false}, "prescriptions": {"edit": true, "view": true, "create": false, "delete": false}, "medicalRecords": {"edit": false, "view": true, "create": false, "delete": false}, "userManagement": {"edit": false, "view": false, "create": false, "delete": false}}}	t	2025-10-02 13:10:03.159706	2025-10-02 13:10:03.159706
8	2	dentist	Dentist	Dental professional with clinical access	{"fields": {"financialData": {"edit": false, "view": true}, "medicalHistory": {"edit": true, "view": true}, "patientSensitiveInfo": {"edit": true, "view": true}}, "modules": {"billing": {"edit": false, "view": true, "create": false, "delete": false}, "patients": {"edit": true, "view": true, "create": true, "delete": false}, "settings": {"edit": false, "view": false, "create": false, "delete": false}, "analytics": {"edit": false, "view": true, "create": false, "delete": false}, "appointments": {"edit": true, "view": true, "create": true, "delete": false}, "prescriptions": {"edit": true, "view": true, "create": true, "delete": false}, "medicalRecords": {"edit": true, "view": true, "create": true, "delete": false}, "userManagement": {"edit": false, "view": false, "create": false, "delete": false}}}	t	2025-10-02 13:10:03.159706	2025-10-02 13:10:03.159706
9	2	dental_nurse	Dental Nurse	Dental nursing staff with patient care access	{"fields": {"financialData": {"edit": false, "view": false}, "medicalHistory": {"edit": false, "view": true}, "patientSensitiveInfo": {"edit": false, "view": true}}, "modules": {"billing": {"edit": false, "view": false, "create": false, "delete": false}, "patients": {"edit": true, "view": true, "create": false, "delete": false}, "settings": {"edit": false, "view": false, "create": false, "delete": false}, "analytics": {"edit": false, "view": false, "create": false, "delete": false}, "appointments": {"edit": true, "view": true, "create": true, "delete": false}, "prescriptions": {"edit": false, "view": true, "create": false, "delete": false}, "medicalRecords": {"edit": false, "view": true, "create": true, "delete": false}, "userManagement": {"edit": false, "view": false, "create": false, "delete": false}}}	t	2025-10-02 13:10:03.159706	2025-10-02 13:10:03.159706
10	2	phlebotomist	Phlebotomist	Blood collection specialist	{"fields": {"financialData": {"edit": false, "view": false}, "medicalHistory": {"edit": false, "view": true}, "patientSensitiveInfo": {"edit": false, "view": false}}, "modules": {"billing": {"edit": false, "view": false, "create": false, "delete": false}, "patients": {"edit": false, "view": true, "create": false, "delete": false}, "settings": {"edit": false, "view": false, "create": false, "delete": false}, "analytics": {"edit": false, "view": false, "create": false, "delete": false}, "appointments": {"edit": false, "view": true, "create": false, "delete": false}, "prescriptions": {"edit": false, "view": false, "create": false, "delete": false}, "medicalRecords": {"edit": false, "view": true, "create": false, "delete": false}, "userManagement": {"edit": false, "view": false, "create": false, "delete": false}}}	t	2025-10-02 13:10:03.159706	2025-10-02 13:10:03.159706
11	2	aesthetician	Aesthetician	Aesthetic treatment specialist	{"fields": {"financialData": {"edit": false, "view": false}, "medicalHistory": {"edit": false, "view": true}, "patientSensitiveInfo": {"edit": false, "view": false}}, "modules": {"billing": {"edit": false, "view": true, "create": false, "delete": false}, "patients": {"edit": true, "view": true, "create": false, "delete": false}, "settings": {"edit": false, "view": false, "create": false, "delete": false}, "analytics": {"edit": false, "view": false, "create": false, "delete": false}, "appointments": {"edit": true, "view": true, "create": true, "delete": false}, "prescriptions": {"edit": false, "view": false, "create": false, "delete": false}, "medicalRecords": {"edit": false, "view": true, "create": true, "delete": false}, "userManagement": {"edit": false, "view": false, "create": false, "delete": false}}}	t	2025-10-02 13:10:03.159706	2025-10-02 13:10:03.159706
12	2	podiatrist	Podiatrist	Foot and ankle specialist	{"fields": {"financialData": {"edit": false, "view": true}, "medicalHistory": {"edit": true, "view": true}, "patientSensitiveInfo": {"edit": true, "view": true}}, "modules": {"billing": {"edit": false, "view": true, "create": false, "delete": false}, "patients": {"edit": true, "view": true, "create": true, "delete": false}, "settings": {"edit": false, "view": false, "create": false, "delete": false}, "analytics": {"edit": false, "view": true, "create": false, "delete": false}, "appointments": {"edit": true, "view": true, "create": true, "delete": false}, "prescriptions": {"edit": true, "view": true, "create": true, "delete": false}, "medicalRecords": {"edit": true, "view": true, "create": true, "delete": false}, "userManagement": {"edit": false, "view": false, "create": false, "delete": false}}}	t	2025-10-02 13:10:03.159706	2025-10-02 13:10:03.159706
16	2	other	Other	Generic role for other healthcare professionals	{"fields": {"financialData": {"edit": false, "view": false}, "medicalHistory": {"edit": false, "view": true}, "patientSensitiveInfo": {"edit": false, "view": false}}, "modules": {"billing": {"edit": false, "view": false, "create": false, "delete": false}, "patients": {"edit": false, "view": true, "create": false, "delete": false}, "settings": {"edit": false, "view": false, "create": false, "delete": false}, "analytics": {"edit": false, "view": false, "create": false, "delete": false}, "appointments": {"edit": true, "view": true, "create": true, "delete": false}, "prescriptions": {"edit": false, "view": true, "create": false, "delete": false}, "medicalRecords": {"edit": false, "view": true, "create": false, "delete": false}, "userManagement": {"edit": false, "view": false, "create": false, "delete": false}}}	t	2025-10-02 13:10:03.159706	2025-10-02 13:10:03.159706
13	2	physiotherapist	Physiotherapist	Physical therapy specialist	{"fields": {"financialData": {"edit": false, "view": true}, "medicalHistory": {"edit": true, "view": true}, "patientSensitiveInfo": {"edit": false, "view": true}}, "modules": {"billing": {"edit": false, "view": true, "create": false, "delete": false}, "patients": {"edit": true, "view": false, "create": true, "delete": false}, "settings": {"edit": false, "view": false, "create": false, "delete": false}, "analytics": {"edit": false, "view": true, "create": false, "delete": false}, "appointments": {"edit": true, "view": false, "create": true, "delete": false}, "prescriptions": {"edit": false, "view": true, "create": false, "delete": false}, "medicalRecords": {"edit": true, "view": false, "create": true, "delete": false}, "userManagement": {"edit": false, "view": false, "create": false, "delete": false}}}	t	2025-10-02 13:10:03.159706	2025-10-03 03:40:29.968
15	2	paramedic	Paramedic	Emergency medical services professional	{"fields": {"financialData": {"edit": false, "view": false}, "medicalHistory": {"edit": true, "view": true}, "patientSensitiveInfo": {"edit": false, "view": true}}, "modules": {"billing": {"edit": false, "view": false, "create": false, "delete": false}, "patients": {"edit": true, "view": true, "create": true, "delete": false}, "settings": {"edit": false, "view": false, "create": false, "delete": false}, "analytics": {"edit": false, "view": false, "create": false, "delete": false}, "appointments": {"edit": true, "view": true, "create": true, "delete": false}, "prescriptions": {"edit": false, "view": false, "create": false, "delete": false}, "medicalRecords": {"edit": true, "view": false, "create": true, "delete": false}, "userManagement": {"edit": false, "view": false, "create": false, "delete": false}}}	t	2025-10-02 13:10:03.159706	2025-10-03 03:42:59.867
14	2	optician	Optician	Eye care and vision specialist	{"fields": {"financialData": {"edit": false, "view": true}, "medicalHistory": {"edit": true, "view": true}, "patientSensitiveInfo": {"edit": false, "view": true}}, "modules": {"billing": {"edit": false, "view": true, "create": false, "delete": false}, "patients": {"edit": false, "view": true, "create": false, "delete": false}, "settings": {"edit": false, "view": false, "create": false, "delete": false}, "analytics": {"edit": false, "view": false, "create": false, "delete": false}, "appointments": {"edit": false, "view": true, "create": false, "delete": false}, "prescriptions": {"edit": false, "view": true, "create": false, "delete": false}, "medicalRecords": {"edit": false, "view": true, "create": false, "delete": false}, "userManagement": {"edit": false, "view": false, "create": false, "delete": false}}}	t	2025-10-02 13:10:03.159706	2025-10-03 03:40:13.894
4	2	doctor	Doctor	Medical doctor with full clinical access	{"fields": {"financialData": {"edit": false, "view": true}, "medicalHistory": {"edit": true, "view": true}, "patientSensitiveInfo": {"edit": true, "view": true}}, "modules": {"billing": {"edit": false, "view": true, "create": false, "delete": false}, "patients": {"edit": true, "view": false, "create": true, "delete": false}, "settings": {"edit": false, "view": false, "create": false, "delete": false}, "analytics": {"edit": false, "view": true, "create": false, "delete": false}, "appointments": {"edit": true, "view": false, "create": true, "delete": false}, "prescriptions": {"edit": true, "view": true, "create": true, "delete": false}, "medicalRecords": {"edit": true, "view": false, "create": true, "delete": false}, "userManagement": {"edit": false, "view": false, "create": false, "delete": false}}}	t	2025-10-02 13:10:03.159706	2025-10-03 08:00:18.5
\.


--
-- Data for Name: saas_invoices; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.saas_invoices (id, organization_id, subscription_id, invoice_number, amount, currency, status, issue_date, due_date, paid_date, period_start, period_end, line_items, notes, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: saas_owners; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.saas_owners (id, username, password, email, first_name, last_name, is_active, last_login_at, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: saas_packages; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.saas_packages (id, name, description, price, billing_cycle, features, is_active, show_on_website, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: saas_payments; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.saas_payments (id, organization_id, subscription_id, invoice_number, amount, currency, payment_method, payment_status, payment_date, due_date, period_start, period_end, payment_provider, provider_transaction_id, description, metadata, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: saas_settings; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.saas_settings (id, key, value, description, category, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: saas_subscriptions; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.saas_subscriptions (id, organization_id, package_id, status, current_period_start, current_period_end, cancel_at_period_end, trial_end, metadata, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: staff_shifts; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.staff_shifts (id, organization_id, staff_id, date, shift_type, start_time, end_time, status, notes, is_available, created_at, updated_at) FROM stdin;
1	2	2	2025-10-03 00:00:00	regular	10:00	23:00	scheduled	Scheduled 10:00 - 23:00 via shift management calendar	t	2025-10-03 04:10:27.822981	2025-10-03 04:10:27.822981
6	2	3	2025-10-03 00:00:00	regular	09:00	17:00	scheduled	Scheduled 09:00 - 17:00 via shift management calendar	t	2025-10-03 05:27:27.401413	2025-10-03 05:27:27.401413
8	2	3	2025-10-05 00:00:00	regular	22:00	23:00	scheduled	Scheduled 22:00 - 23:00 via shift management calendar	t	2025-10-03 09:19:43.384211	2025-10-03 09:19:43.384211
9	2	3	2025-10-05 00:00:00	regular	00:00	01:00	scheduled	Scheduled 00:00 - 01:00 via shift management calendar	t	2025-10-03 09:22:03.972447	2025-10-03 09:22:03.972447
10	2	3	2025-10-08 00:00:00	absent	00:00	23:59	absent	Marked absent for entire day via shift management	f	2025-10-03 09:32:59.700747	2025-10-03 09:32:59.700747
11	2	3	2025-10-04 00:00:00	regular	00:00	01:00	scheduled	Scheduled 00:00 - 01:00 via shift management calendar	t	2025-10-03 09:36:42.840512	2025-10-03 09:36:42.840512
12	2	3	2025-10-04 00:00:00	regular	22:00	23:00	scheduled	Scheduled 22:00 - 23:00 via shift management calendar	t	2025-10-03 09:36:51.305222	2025-10-03 09:36:51.305222
13	2	3	2025-10-04 00:00:00	regular	10:00	15:00	scheduled	Scheduled 10:00 - 15:00 via shift management calendar	t	2025-10-03 10:37:36.393025	2025-10-03 10:37:36.393025
14	2	3	2025-10-04 00:00:00	regular	05:00	09:00	scheduled	Scheduled 05:00 - 09:00 via shift management calendar	t	2025-10-03 10:37:45.914926	2025-10-03 10:37:45.914926
15	2	3	2025-10-04 00:00:00	regular	00:00	01:00	scheduled	Scheduled 00:00 - 01:00 via shift management calendar	t	2025-10-03 10:37:56.533171	2025-10-03 10:37:56.533171
16	2	7	2025-10-03 00:00:00	regular	00:00	11:00	scheduled	Scheduled 00:00 - 11:00 via shift management calendar	t	2025-10-03 11:07:34.796066	2025-10-03 11:07:34.796066
17	2	3	2025-10-03 00:00:00	regular	00:00	07:00	scheduled	Scheduled 00:00 - 07:00 via shift management calendar	t	2025-10-03 11:30:10.184024	2025-10-03 11:30:10.184024
18	2	3	2025-10-03 00:00:00	regular	00:00	03:00	scheduled	Scheduled 00:00 - 03:00 via shift management calendar	t	2025-10-03 11:30:15.524931	2025-10-03 11:30:15.524931
19	2	3	2025-10-03 00:00:00	regular	00:00	03:00	scheduled	Scheduled 00:00 - 03:00 via shift management calendar	t	2025-10-03 11:30:25.374856	2025-10-03 11:30:25.374856
20	2	3	2025-10-03 00:00:00	regular	00:00	03:00	scheduled	Scheduled 00:00 - 03:00 via shift management calendar	t	2025-10-03 11:30:38.038464	2025-10-03 11:30:38.038464
21	2	3	2025-10-03 00:00:00	regular	00:00	05:00	scheduled	Scheduled 00:00 - 05:00 via shift management calendar	t	2025-10-03 11:34:32.335237	2025-10-03 11:34:32.335237
22	2	3	2025-10-03 00:00:00	regular	00:00	05:00	scheduled	Scheduled 00:00 - 05:00 via shift management calendar	t	2025-10-03 11:34:33.694757	2025-10-03 11:34:33.694757
23	2	3	2025-10-03 00:00:00	regular	10:00	13:00	scheduled	Scheduled 10:00 - 13:00 via shift management calendar	t	2025-10-03 11:38:27.314922	2025-10-03 11:38:27.314922
24	2	3	2025-10-03 00:00:00	regular	10:00	13:00	scheduled	Scheduled 10:00 - 13:00 via shift management calendar	t	2025-10-03 11:38:29.387508	2025-10-03 11:38:29.387508
\.


--
-- Data for Name: subscriptions; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.subscriptions (id, organization_id, plan_name, plan, status, user_limit, current_users, monthly_price, trial_ends_at, next_billing_at, features, created_at, updated_at) FROM stdin;
2	2	Professional Plan	professional	active	25	3	79.00	\N	2025-11-01 11:56:09.777	{"apiAccess": true, "aiInsights": true, "whiteLabel": false, "advancedReporting": true}	2025-10-02 11:56:09.905408	2025-10-02 11:56:09.905408
\.


--
-- Data for Name: user_document_preferences; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.user_document_preferences (id, organization_id, user_id, clinic_info, header_preferences, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.users (id, organization_id, email, username, password_hash, first_name, last_name, role, department, medical_specialty_category, sub_specialty, working_days, working_hours, permissions, is_active, is_saas_owner, last_login_at, created_at) FROM stdin;
11	0	saas_admin@curaemr.ai	saas_admin	$2b$12$aNZ..JlFwVJaey.5YRClD.vTozZYmE2Sb3pih8ZDadXS1Fn4XDQnS	SaaS	Administrator	admin	\N	\N	\N	[]	{}	{}	t	t	\N	2025-10-02 11:56:12.974199
13	2	kabila@gmail.com	kabila	$2b$12$zMp7SFLxgIVXXgrWu8JeU.r7Iz4m2TuOqSnlbmiq1jRpBy1sIcpxG	kafia	khan	patient	\N	\N	\N	[]	{}	{}	t	f	\N	2025-10-02 14:53:09.776428
6	2	doctor2@cura.com	doctor2	$2b$12$lCRyub8izufjPiHTfzxDvejLVnXUKJ7aYmTqrO6c8yxg2TbKbTeZ.	Michael	Johnson	doctor	Neurology	\N	\N	["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]	{"end": "18:00", "start": "09:00"}	{}	t	f	\N	2025-10-02 11:52:25.124842
7	2	doctor3@cura.com	doctor3	$2b$12$lCRyub8izufjPiHTfzxDvejLVnXUKJ7aYmTqrO6c8yxg2TbKbTeZ.	David	Wilson	doctor	Orthopedics	\N	\N	["Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]	{"end": "16:30", "start": "08:30"}	{}	t	f	\N	2025-10-02 11:52:25.124842
12	2	quratulain009911@outlook.com	goldsmith@cura.ai	$2b$12$zMp7SFLxgIVXXgrWu8JeU.r7Iz4m2TuOqSnlbmiq1jRpBy1sIcpxG	ANN	ANN	patient	\N	\N	\N	[]	{}	{}	t	f	\N	2025-10-02 13:26:22.582526
8	2	doctor4@cura.com	doctor4	$2b$12$lCRyub8izufjPiHTfzxDvejLVnXUKJ7aYmTqrO6c8yxg2TbKbTeZ.	Lisa	Anderson	doctor	Pediatrics	\N	\N	["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]	{"end": "16:00", "start": "08:00"}	{}	t	f	\N	2025-10-02 11:52:25.124842
9	2	doctor5@cura.com	doctor5	$2b$12$lCRyub8izufjPiHTfzxDvejLVnXUKJ7aYmTqrO6c8yxg2TbKbTeZ.	Robert	Brown	doctor	Dermatology	\N	\N	["Monday", "Wednesday", "Friday"]	{"end": "18:00", "start": "10:00"}	{}	t	f	\N	2025-10-02 11:52:25.124842
10	2	receptionist@cura.com	receptionist	$2b$12$WP4ACf5V1Y/nxPSrita75etIzXIjd8LI37mraaS3/TLLm8Ya7lmHq	Jane	Thompson	receptionist	Front Desk	\N	\N	["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]	{"end": "17:00", "start": "08:00"}	{}	t	f	\N	2025-10-02 11:52:25.124842
15	2	qain4414@gmail.com	qain4414@gmail.com	$2b$12$zMp7SFLxgIVXXgrWu8JeU.r7Iz4m2TuOqSnlbmiq1jRpBy1sIcpxG	ANN	ANN	patient	\N	\N	\N	[]	{}	{}	t	f	\N	2025-10-02 15:25:34.159958
3	2	nurse@cura.com	nurse	$2b$12$cOC97pEJGt3Z6MKEC5XGXem30PUYeyLMmOcuHw3ooYroS7GwMncbi	Emily	Johnson	nurse	General Medicine	\N	\N	["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]	{"end": "19:00", "start": "07:00"}	{}	t	f	\N	2025-10-02 11:52:25.124842
14	2	001quratulain@gmail.com	001quratulain@gmail.com	$2b$12$zMp7SFLxgIVXXgrWu8JeU.r7Iz4m2TuOqSnlbmiq1jRpBy1sIcpxG	ANN	ANN	patient	\N	\N	\N	[]	{}	{}	t	f	\N	2025-10-02 15:13:30.535339
4	2	patient@cura.com	patient	$2b$12$zMp7SFLxgIVXXgrWu8JeU.r7Iz4m2TuOqSnlbmiq1jRpBy1sIcpxG	Michael	Patient	patient	\N	\N	\N	[]	{}	{}	t	f	\N	2025-10-02 11:52:25.124842
1	2	admin@cura.com	admin	$2b$12$is/8Th0SrDgTCj8o2C1T.eXR3qmB0dKaUae4uyyWk1ELm43HIaukq	John	Administrator	admin	Administration	\N	\N	["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]	{"end": "17:00", "start": "09:00"}	{}	t	f	\N	2025-10-02 11:52:25.124842
2	2	doctor@cura.com	doctor	$2b$12$lCRyub8izufjPiHTfzxDvejLVnXUKJ7aYmTqrO6c8yxg2TbKbTeZ.	Sarah	Smith	doctor	Cardiology	\N	\N	["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]	{"end": "17:00", "start": "08:00"}	{}	t	f	\N	2025-10-02 11:52:25.124842
5	2	labtech@cura.com	labtech	$2b$12$WP4ACf5V1Y/nxPSrita75etIzXIjd8LI37mraaS3/TLLm8Ya7lmHq	Maria	Rodriguez	lab_technician	Laboratory	\N	\N	["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]	{"end": "14:00", "start": "06:00"}	{}	t	f	\N	2025-10-02 11:52:25.124842
\.


--
-- Data for Name: voice_notes; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.voice_notes (id, organization_id, patient_id, patient_name, provider_id, provider_name, type, status, recording_duration, transcript, confidence, medical_terms, structured_data, created_at, updated_at) FROM stdin;
\.


--
-- Name: ai_insights_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.ai_insights_id_seq', 245, true);


--
-- Name: appointments_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.appointments_id_seq', 30, true);


--
-- Name: chatbot_analytics_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.chatbot_analytics_id_seq', 1, false);


--
-- Name: chatbot_configs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.chatbot_configs_id_seq', 1, false);


--
-- Name: chatbot_messages_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.chatbot_messages_id_seq', 1, false);


--
-- Name: chatbot_sessions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.chatbot_sessions_id_seq', 1, false);


--
-- Name: claims_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.claims_id_seq', 1, false);


--
-- Name: clinical_photos_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.clinical_photos_id_seq', 1, false);


--
-- Name: clinical_procedures_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.clinical_procedures_id_seq', 1, false);


--
-- Name: consultations_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.consultations_id_seq', 1, false);


--
-- Name: documents_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.documents_id_seq', 1, false);


--
-- Name: emergency_protocols_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.emergency_protocols_id_seq', 1, false);


--
-- Name: financial_forecasts_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.financial_forecasts_id_seq', 1, false);


--
-- Name: forecast_models_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.forecast_models_id_seq', 1, false);


--
-- Name: gdpr_audit_trail_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.gdpr_audit_trail_id_seq', 1, false);


--
-- Name: gdpr_consents_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.gdpr_consents_id_seq', 1, false);


--
-- Name: gdpr_data_requests_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.gdpr_data_requests_id_seq', 1, false);


--
-- Name: gdpr_processing_activities_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.gdpr_processing_activities_id_seq', 1, false);


--
-- Name: insurance_verifications_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.insurance_verifications_id_seq', 1, true);


--
-- Name: inventory_batches_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.inventory_batches_id_seq', 1, false);


--
-- Name: inventory_categories_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.inventory_categories_id_seq', 10, true);


--
-- Name: inventory_items_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.inventory_items_id_seq', 6, true);


--
-- Name: inventory_purchase_order_items_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.inventory_purchase_order_items_id_seq', 1, false);


--
-- Name: inventory_purchase_orders_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.inventory_purchase_orders_id_seq', 1, false);


--
-- Name: inventory_sale_items_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.inventory_sale_items_id_seq', 1, false);


--
-- Name: inventory_sales_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.inventory_sales_id_seq', 1, false);


--
-- Name: inventory_stock_alerts_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.inventory_stock_alerts_id_seq', 1, false);


--
-- Name: inventory_stock_movements_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.inventory_stock_movements_id_seq', 1, false);


--
-- Name: inventory_suppliers_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.inventory_suppliers_id_seq', 3, true);


--
-- Name: lab_results_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.lab_results_id_seq', 4, true);


--
-- Name: letter_drafts_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.letter_drafts_id_seq', 1, false);


--
-- Name: medical_images_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.medical_images_id_seq', 1, false);


--
-- Name: medical_records_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.medical_records_id_seq', 50, true);


--
-- Name: medications_database_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.medications_database_id_seq', 1, false);


--
-- Name: muscles_position_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.muscles_position_id_seq', 1, false);


--
-- Name: notifications_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.notifications_id_seq', 245, true);


--
-- Name: organizations_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.organizations_id_seq', 2, true);


--
-- Name: patient_communications_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.patient_communications_id_seq', 1, false);


--
-- Name: patient_drug_interactions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.patient_drug_interactions_id_seq', 1, false);


--
-- Name: patients_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.patients_id_seq', 7, true);


--
-- Name: prescriptions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.prescriptions_id_seq', 3, true);


--
-- Name: quickbooks_account_mappings_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.quickbooks_account_mappings_id_seq', 1, false);


--
-- Name: quickbooks_connections_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.quickbooks_connections_id_seq', 1, false);


--
-- Name: quickbooks_customer_mappings_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.quickbooks_customer_mappings_id_seq', 1, false);


--
-- Name: quickbooks_invoice_mappings_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.quickbooks_invoice_mappings_id_seq', 1, false);


--
-- Name: quickbooks_item_mappings_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.quickbooks_item_mappings_id_seq', 1, false);


--
-- Name: quickbooks_payment_mappings_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.quickbooks_payment_mappings_id_seq', 1, false);


--
-- Name: quickbooks_sync_configs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.quickbooks_sync_configs_id_seq', 1, false);


--
-- Name: quickbooks_sync_logs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.quickbooks_sync_logs_id_seq', 1, false);


--
-- Name: revenue_records_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.revenue_records_id_seq', 1, false);


--
-- Name: roles_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.roles_id_seq', 16, true);


--
-- Name: saas_invoices_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.saas_invoices_id_seq', 1, false);


--
-- Name: saas_owners_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.saas_owners_id_seq', 1, false);


--
-- Name: saas_packages_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.saas_packages_id_seq', 1, false);


--
-- Name: saas_payments_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.saas_payments_id_seq', 1, false);


--
-- Name: saas_settings_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.saas_settings_id_seq', 1, false);


--
-- Name: saas_subscriptions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.saas_subscriptions_id_seq', 1, false);


--
-- Name: staff_shifts_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.staff_shifts_id_seq', 24, true);


--
-- Name: subscriptions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.subscriptions_id_seq', 2, true);


--
-- Name: user_document_preferences_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.user_document_preferences_id_seq', 1, false);


--
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.users_id_seq', 15, true);


--
-- Name: ai_insights ai_insights_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.ai_insights
    ADD CONSTRAINT ai_insights_pkey PRIMARY KEY (id);


--
-- Name: appointments appointments_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.appointments
    ADD CONSTRAINT appointments_pkey PRIMARY KEY (id);


--
-- Name: chatbot_analytics chatbot_analytics_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.chatbot_analytics
    ADD CONSTRAINT chatbot_analytics_pkey PRIMARY KEY (id);


--
-- Name: chatbot_configs chatbot_configs_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.chatbot_configs
    ADD CONSTRAINT chatbot_configs_pkey PRIMARY KEY (id);


--
-- Name: chatbot_messages chatbot_messages_message_id_unique; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.chatbot_messages
    ADD CONSTRAINT chatbot_messages_message_id_unique UNIQUE (message_id);


--
-- Name: chatbot_messages chatbot_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.chatbot_messages
    ADD CONSTRAINT chatbot_messages_pkey PRIMARY KEY (id);


--
-- Name: chatbot_sessions chatbot_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.chatbot_sessions
    ADD CONSTRAINT chatbot_sessions_pkey PRIMARY KEY (id);


--
-- Name: chatbot_sessions chatbot_sessions_session_id_unique; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.chatbot_sessions
    ADD CONSTRAINT chatbot_sessions_session_id_unique UNIQUE (session_id);


--
-- Name: claims claims_claim_number_unique; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.claims
    ADD CONSTRAINT claims_claim_number_unique UNIQUE (claim_number);


--
-- Name: claims claims_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.claims
    ADD CONSTRAINT claims_pkey PRIMARY KEY (id);


--
-- Name: clinical_photos clinical_photos_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.clinical_photos
    ADD CONSTRAINT clinical_photos_pkey PRIMARY KEY (id);


--
-- Name: clinical_procedures clinical_procedures_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.clinical_procedures
    ADD CONSTRAINT clinical_procedures_pkey PRIMARY KEY (id);


--
-- Name: consultations consultations_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.consultations
    ADD CONSTRAINT consultations_pkey PRIMARY KEY (id);


--
-- Name: conversations conversations_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.conversations
    ADD CONSTRAINT conversations_pkey PRIMARY KEY (id);


--
-- Name: documents documents_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT documents_pkey PRIMARY KEY (id);


--
-- Name: emergency_protocols emergency_protocols_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.emergency_protocols
    ADD CONSTRAINT emergency_protocols_pkey PRIMARY KEY (id);


--
-- Name: financial_forecasts financial_forecasts_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.financial_forecasts
    ADD CONSTRAINT financial_forecasts_pkey PRIMARY KEY (id);


--
-- Name: forecast_models forecast_models_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.forecast_models
    ADD CONSTRAINT forecast_models_pkey PRIMARY KEY (id);


--
-- Name: gdpr_audit_trail gdpr_audit_trail_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.gdpr_audit_trail
    ADD CONSTRAINT gdpr_audit_trail_pkey PRIMARY KEY (id);


--
-- Name: gdpr_consents gdpr_consents_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.gdpr_consents
    ADD CONSTRAINT gdpr_consents_pkey PRIMARY KEY (id);


--
-- Name: gdpr_data_requests gdpr_data_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.gdpr_data_requests
    ADD CONSTRAINT gdpr_data_requests_pkey PRIMARY KEY (id);


--
-- Name: gdpr_processing_activities gdpr_processing_activities_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.gdpr_processing_activities
    ADD CONSTRAINT gdpr_processing_activities_pkey PRIMARY KEY (id);


--
-- Name: insurance_verifications insurance_verifications_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.insurance_verifications
    ADD CONSTRAINT insurance_verifications_pkey PRIMARY KEY (id);


--
-- Name: inventory_batches inventory_batches_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.inventory_batches
    ADD CONSTRAINT inventory_batches_pkey PRIMARY KEY (id);


--
-- Name: inventory_categories inventory_categories_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.inventory_categories
    ADD CONSTRAINT inventory_categories_pkey PRIMARY KEY (id);


--
-- Name: inventory_items inventory_items_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.inventory_items
    ADD CONSTRAINT inventory_items_pkey PRIMARY KEY (id);


--
-- Name: inventory_purchase_order_items inventory_purchase_order_items_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.inventory_purchase_order_items
    ADD CONSTRAINT inventory_purchase_order_items_pkey PRIMARY KEY (id);


--
-- Name: inventory_purchase_orders inventory_purchase_orders_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.inventory_purchase_orders
    ADD CONSTRAINT inventory_purchase_orders_pkey PRIMARY KEY (id);


--
-- Name: inventory_purchase_orders inventory_purchase_orders_po_number_unique; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.inventory_purchase_orders
    ADD CONSTRAINT inventory_purchase_orders_po_number_unique UNIQUE (po_number);


--
-- Name: inventory_sale_items inventory_sale_items_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.inventory_sale_items
    ADD CONSTRAINT inventory_sale_items_pkey PRIMARY KEY (id);


--
-- Name: inventory_sales inventory_sales_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.inventory_sales
    ADD CONSTRAINT inventory_sales_pkey PRIMARY KEY (id);


--
-- Name: inventory_sales inventory_sales_sale_number_unique; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.inventory_sales
    ADD CONSTRAINT inventory_sales_sale_number_unique UNIQUE (sale_number);


--
-- Name: inventory_stock_alerts inventory_stock_alerts_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.inventory_stock_alerts
    ADD CONSTRAINT inventory_stock_alerts_pkey PRIMARY KEY (id);


--
-- Name: inventory_stock_movements inventory_stock_movements_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.inventory_stock_movements
    ADD CONSTRAINT inventory_stock_movements_pkey PRIMARY KEY (id);


--
-- Name: inventory_suppliers inventory_suppliers_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.inventory_suppliers
    ADD CONSTRAINT inventory_suppliers_pkey PRIMARY KEY (id);


--
-- Name: lab_results lab_results_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.lab_results
    ADD CONSTRAINT lab_results_pkey PRIMARY KEY (id);


--
-- Name: letter_drafts letter_drafts_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.letter_drafts
    ADD CONSTRAINT letter_drafts_pkey PRIMARY KEY (id);


--
-- Name: medical_images medical_images_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.medical_images
    ADD CONSTRAINT medical_images_pkey PRIMARY KEY (id);


--
-- Name: medical_records medical_records_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.medical_records
    ADD CONSTRAINT medical_records_pkey PRIMARY KEY (id);


--
-- Name: medications_database medications_database_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.medications_database
    ADD CONSTRAINT medications_database_pkey PRIMARY KEY (id);


--
-- Name: messages messages_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_pkey PRIMARY KEY (id);


--
-- Name: muscles_position muscles_position_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.muscles_position
    ADD CONSTRAINT muscles_position_pkey PRIMARY KEY (id);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- Name: organizations organizations_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.organizations
    ADD CONSTRAINT organizations_pkey PRIMARY KEY (id);


--
-- Name: organizations organizations_subdomain_unique; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.organizations
    ADD CONSTRAINT organizations_subdomain_unique UNIQUE (subdomain);


--
-- Name: patient_communications patient_communications_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.patient_communications
    ADD CONSTRAINT patient_communications_pkey PRIMARY KEY (id);


--
-- Name: patient_drug_interactions patient_drug_interactions_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.patient_drug_interactions
    ADD CONSTRAINT patient_drug_interactions_pkey PRIMARY KEY (id);


--
-- Name: patients patients_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.patients
    ADD CONSTRAINT patients_pkey PRIMARY KEY (id);


--
-- Name: prescriptions prescriptions_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.prescriptions
    ADD CONSTRAINT prescriptions_pkey PRIMARY KEY (id);


--
-- Name: quickbooks_account_mappings quickbooks_account_mappings_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.quickbooks_account_mappings
    ADD CONSTRAINT quickbooks_account_mappings_pkey PRIMARY KEY (id);


--
-- Name: quickbooks_connections quickbooks_connections_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.quickbooks_connections
    ADD CONSTRAINT quickbooks_connections_pkey PRIMARY KEY (id);


--
-- Name: quickbooks_customer_mappings quickbooks_customer_mappings_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.quickbooks_customer_mappings
    ADD CONSTRAINT quickbooks_customer_mappings_pkey PRIMARY KEY (id);


--
-- Name: quickbooks_invoice_mappings quickbooks_invoice_mappings_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.quickbooks_invoice_mappings
    ADD CONSTRAINT quickbooks_invoice_mappings_pkey PRIMARY KEY (id);


--
-- Name: quickbooks_item_mappings quickbooks_item_mappings_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.quickbooks_item_mappings
    ADD CONSTRAINT quickbooks_item_mappings_pkey PRIMARY KEY (id);


--
-- Name: quickbooks_payment_mappings quickbooks_payment_mappings_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.quickbooks_payment_mappings
    ADD CONSTRAINT quickbooks_payment_mappings_pkey PRIMARY KEY (id);


--
-- Name: quickbooks_sync_configs quickbooks_sync_configs_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.quickbooks_sync_configs
    ADD CONSTRAINT quickbooks_sync_configs_pkey PRIMARY KEY (id);


--
-- Name: quickbooks_sync_logs quickbooks_sync_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.quickbooks_sync_logs
    ADD CONSTRAINT quickbooks_sync_logs_pkey PRIMARY KEY (id);


--
-- Name: revenue_records revenue_records_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.revenue_records
    ADD CONSTRAINT revenue_records_pkey PRIMARY KEY (id);


--
-- Name: roles roles_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_pkey PRIMARY KEY (id);


--
-- Name: saas_invoices saas_invoices_invoice_number_unique; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.saas_invoices
    ADD CONSTRAINT saas_invoices_invoice_number_unique UNIQUE (invoice_number);


--
-- Name: saas_invoices saas_invoices_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.saas_invoices
    ADD CONSTRAINT saas_invoices_pkey PRIMARY KEY (id);


--
-- Name: saas_owners saas_owners_email_unique; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.saas_owners
    ADD CONSTRAINT saas_owners_email_unique UNIQUE (email);


--
-- Name: saas_owners saas_owners_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.saas_owners
    ADD CONSTRAINT saas_owners_pkey PRIMARY KEY (id);


--
-- Name: saas_owners saas_owners_username_unique; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.saas_owners
    ADD CONSTRAINT saas_owners_username_unique UNIQUE (username);


--
-- Name: saas_packages saas_packages_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.saas_packages
    ADD CONSTRAINT saas_packages_pkey PRIMARY KEY (id);


--
-- Name: saas_payments saas_payments_invoice_number_unique; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.saas_payments
    ADD CONSTRAINT saas_payments_invoice_number_unique UNIQUE (invoice_number);


--
-- Name: saas_payments saas_payments_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.saas_payments
    ADD CONSTRAINT saas_payments_pkey PRIMARY KEY (id);


--
-- Name: saas_settings saas_settings_key_unique; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.saas_settings
    ADD CONSTRAINT saas_settings_key_unique UNIQUE (key);


--
-- Name: saas_settings saas_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.saas_settings
    ADD CONSTRAINT saas_settings_pkey PRIMARY KEY (id);


--
-- Name: saas_subscriptions saas_subscriptions_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.saas_subscriptions
    ADD CONSTRAINT saas_subscriptions_pkey PRIMARY KEY (id);


--
-- Name: staff_shifts staff_shifts_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.staff_shifts
    ADD CONSTRAINT staff_shifts_pkey PRIMARY KEY (id);


--
-- Name: subscriptions subscriptions_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.subscriptions
    ADD CONSTRAINT subscriptions_pkey PRIMARY KEY (id);


--
-- Name: user_document_preferences user_document_preferences_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.user_document_preferences
    ADD CONSTRAINT user_document_preferences_pkey PRIMARY KEY (id);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: voice_notes voice_notes_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.voice_notes
    ADD CONSTRAINT voice_notes_pkey PRIMARY KEY (id);


--
-- Name: unique_user_document_preferences; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE UNIQUE INDEX unique_user_document_preferences ON public.user_document_preferences USING btree (user_id, organization_id);


--
-- Name: chatbot_analytics chatbot_analytics_config_id_chatbot_configs_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.chatbot_analytics
    ADD CONSTRAINT chatbot_analytics_config_id_chatbot_configs_id_fk FOREIGN KEY (config_id) REFERENCES public.chatbot_configs(id);


--
-- Name: chatbot_analytics chatbot_analytics_organization_id_organizations_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.chatbot_analytics
    ADD CONSTRAINT chatbot_analytics_organization_id_organizations_id_fk FOREIGN KEY (organization_id) REFERENCES public.organizations(id);


--
-- Name: chatbot_configs chatbot_configs_organization_id_organizations_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.chatbot_configs
    ADD CONSTRAINT chatbot_configs_organization_id_organizations_id_fk FOREIGN KEY (organization_id) REFERENCES public.organizations(id);


--
-- Name: chatbot_messages chatbot_messages_organization_id_organizations_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.chatbot_messages
    ADD CONSTRAINT chatbot_messages_organization_id_organizations_id_fk FOREIGN KEY (organization_id) REFERENCES public.organizations(id);


--
-- Name: chatbot_messages chatbot_messages_session_id_chatbot_sessions_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.chatbot_messages
    ADD CONSTRAINT chatbot_messages_session_id_chatbot_sessions_id_fk FOREIGN KEY (session_id) REFERENCES public.chatbot_sessions(id);


--
-- Name: chatbot_sessions chatbot_sessions_config_id_chatbot_configs_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.chatbot_sessions
    ADD CONSTRAINT chatbot_sessions_config_id_chatbot_configs_id_fk FOREIGN KEY (config_id) REFERENCES public.chatbot_configs(id);


--
-- Name: chatbot_sessions chatbot_sessions_organization_id_organizations_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.chatbot_sessions
    ADD CONSTRAINT chatbot_sessions_organization_id_organizations_id_fk FOREIGN KEY (organization_id) REFERENCES public.organizations(id);


--
-- Name: chatbot_sessions chatbot_sessions_patient_id_patients_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.chatbot_sessions
    ADD CONSTRAINT chatbot_sessions_patient_id_patients_id_fk FOREIGN KEY (patient_id) REFERENCES public.patients(id);


--
-- Name: claims claims_organization_id_organizations_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.claims
    ADD CONSTRAINT claims_organization_id_organizations_id_fk FOREIGN KEY (organization_id) REFERENCES public.organizations(id);


--
-- Name: claims claims_patient_id_patients_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.claims
    ADD CONSTRAINT claims_patient_id_patients_id_fk FOREIGN KEY (patient_id) REFERENCES public.patients(id);


--
-- Name: clinical_photos clinical_photos_captured_by_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.clinical_photos
    ADD CONSTRAINT clinical_photos_captured_by_users_id_fk FOREIGN KEY (captured_by) REFERENCES public.users(id);


--
-- Name: clinical_photos clinical_photos_organization_id_organizations_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.clinical_photos
    ADD CONSTRAINT clinical_photos_organization_id_organizations_id_fk FOREIGN KEY (organization_id) REFERENCES public.organizations(id);


--
-- Name: clinical_photos clinical_photos_patient_id_patients_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.clinical_photos
    ADD CONSTRAINT clinical_photos_patient_id_patients_id_fk FOREIGN KEY (patient_id) REFERENCES public.patients(id);


--
-- Name: clinical_procedures clinical_procedures_organization_id_organizations_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.clinical_procedures
    ADD CONSTRAINT clinical_procedures_organization_id_organizations_id_fk FOREIGN KEY (organization_id) REFERENCES public.organizations(id);


--
-- Name: emergency_protocols emergency_protocols_organization_id_organizations_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.emergency_protocols
    ADD CONSTRAINT emergency_protocols_organization_id_organizations_id_fk FOREIGN KEY (organization_id) REFERENCES public.organizations(id);


--
-- Name: financial_forecasts financial_forecasts_model_id_forecast_models_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.financial_forecasts
    ADD CONSTRAINT financial_forecasts_model_id_forecast_models_id_fk FOREIGN KEY (model_id) REFERENCES public.forecast_models(id);


--
-- Name: financial_forecasts financial_forecasts_organization_id_organizations_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.financial_forecasts
    ADD CONSTRAINT financial_forecasts_organization_id_organizations_id_fk FOREIGN KEY (organization_id) REFERENCES public.organizations(id);


--
-- Name: forecast_models forecast_models_organization_id_organizations_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.forecast_models
    ADD CONSTRAINT forecast_models_organization_id_organizations_id_fk FOREIGN KEY (organization_id) REFERENCES public.organizations(id);


--
-- Name: gdpr_audit_trail gdpr_audit_trail_organization_id_organizations_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.gdpr_audit_trail
    ADD CONSTRAINT gdpr_audit_trail_organization_id_organizations_id_fk FOREIGN KEY (organization_id) REFERENCES public.organizations(id);


--
-- Name: gdpr_audit_trail gdpr_audit_trail_patient_id_patients_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.gdpr_audit_trail
    ADD CONSTRAINT gdpr_audit_trail_patient_id_patients_id_fk FOREIGN KEY (patient_id) REFERENCES public.patients(id);


--
-- Name: gdpr_audit_trail gdpr_audit_trail_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.gdpr_audit_trail
    ADD CONSTRAINT gdpr_audit_trail_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: gdpr_consents gdpr_consents_organization_id_organizations_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.gdpr_consents
    ADD CONSTRAINT gdpr_consents_organization_id_organizations_id_fk FOREIGN KEY (organization_id) REFERENCES public.organizations(id);


--
-- Name: gdpr_consents gdpr_consents_patient_id_patients_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.gdpr_consents
    ADD CONSTRAINT gdpr_consents_patient_id_patients_id_fk FOREIGN KEY (patient_id) REFERENCES public.patients(id);


--
-- Name: gdpr_data_requests gdpr_data_requests_organization_id_organizations_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.gdpr_data_requests
    ADD CONSTRAINT gdpr_data_requests_organization_id_organizations_id_fk FOREIGN KEY (organization_id) REFERENCES public.organizations(id);


--
-- Name: gdpr_data_requests gdpr_data_requests_patient_id_patients_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.gdpr_data_requests
    ADD CONSTRAINT gdpr_data_requests_patient_id_patients_id_fk FOREIGN KEY (patient_id) REFERENCES public.patients(id);


--
-- Name: gdpr_data_requests gdpr_data_requests_processed_by_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.gdpr_data_requests
    ADD CONSTRAINT gdpr_data_requests_processed_by_users_id_fk FOREIGN KEY (processed_by) REFERENCES public.users(id);


--
-- Name: gdpr_processing_activities gdpr_processing_activities_organization_id_organizations_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.gdpr_processing_activities
    ADD CONSTRAINT gdpr_processing_activities_organization_id_organizations_id_fk FOREIGN KEY (organization_id) REFERENCES public.organizations(id);


--
-- Name: insurance_verifications insurance_verifications_organization_id_organizations_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.insurance_verifications
    ADD CONSTRAINT insurance_verifications_organization_id_organizations_id_fk FOREIGN KEY (organization_id) REFERENCES public.organizations(id);


--
-- Name: insurance_verifications insurance_verifications_patient_id_patients_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.insurance_verifications
    ADD CONSTRAINT insurance_verifications_patient_id_patients_id_fk FOREIGN KEY (patient_id) REFERENCES public.patients(id);


--
-- Name: lab_results lab_results_ordered_by_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.lab_results
    ADD CONSTRAINT lab_results_ordered_by_users_id_fk FOREIGN KEY (ordered_by) REFERENCES public.users(id);


--
-- Name: lab_results lab_results_organization_id_organizations_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.lab_results
    ADD CONSTRAINT lab_results_organization_id_organizations_id_fk FOREIGN KEY (organization_id) REFERENCES public.organizations(id);


--
-- Name: lab_results lab_results_patient_id_patients_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.lab_results
    ADD CONSTRAINT lab_results_patient_id_patients_id_fk FOREIGN KEY (patient_id) REFERENCES public.patients(id);


--
-- Name: medical_images medical_images_organization_id_organizations_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.medical_images
    ADD CONSTRAINT medical_images_organization_id_organizations_id_fk FOREIGN KEY (organization_id) REFERENCES public.organizations(id);


--
-- Name: medical_images medical_images_patient_id_patients_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.medical_images
    ADD CONSTRAINT medical_images_patient_id_patients_id_fk FOREIGN KEY (patient_id) REFERENCES public.patients(id);


--
-- Name: medical_images medical_images_uploaded_by_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.medical_images
    ADD CONSTRAINT medical_images_uploaded_by_users_id_fk FOREIGN KEY (uploaded_by) REFERENCES public.users(id);


--
-- Name: medications_database medications_database_organization_id_organizations_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.medications_database
    ADD CONSTRAINT medications_database_organization_id_organizations_id_fk FOREIGN KEY (organization_id) REFERENCES public.organizations(id);


--
-- Name: notifications notifications_organization_id_organizations_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_organization_id_organizations_id_fk FOREIGN KEY (organization_id) REFERENCES public.organizations(id);


--
-- Name: notifications notifications_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: patient_communications patient_communications_organization_id_organizations_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.patient_communications
    ADD CONSTRAINT patient_communications_organization_id_organizations_id_fk FOREIGN KEY (organization_id) REFERENCES public.organizations(id);


--
-- Name: patient_communications patient_communications_patient_id_patients_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.patient_communications
    ADD CONSTRAINT patient_communications_patient_id_patients_id_fk FOREIGN KEY (patient_id) REFERENCES public.patients(id);


--
-- Name: patient_communications patient_communications_sent_by_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.patient_communications
    ADD CONSTRAINT patient_communications_sent_by_users_id_fk FOREIGN KEY (sent_by) REFERENCES public.users(id);


--
-- Name: patient_drug_interactions patient_drug_interactions_organization_id_organizations_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.patient_drug_interactions
    ADD CONSTRAINT patient_drug_interactions_organization_id_organizations_id_fk FOREIGN KEY (organization_id) REFERENCES public.organizations(id);


--
-- Name: patient_drug_interactions patient_drug_interactions_patient_id_patients_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.patient_drug_interactions
    ADD CONSTRAINT patient_drug_interactions_patient_id_patients_id_fk FOREIGN KEY (patient_id) REFERENCES public.patients(id);


--
-- Name: patient_drug_interactions patient_drug_interactions_reported_by_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.patient_drug_interactions
    ADD CONSTRAINT patient_drug_interactions_reported_by_users_id_fk FOREIGN KEY (reported_by) REFERENCES public.users(id);


--
-- Name: prescriptions prescriptions_consultation_id_consultations_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.prescriptions
    ADD CONSTRAINT prescriptions_consultation_id_consultations_id_fk FOREIGN KEY (consultation_id) REFERENCES public.consultations(id);


--
-- Name: prescriptions prescriptions_doctor_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.prescriptions
    ADD CONSTRAINT prescriptions_doctor_id_users_id_fk FOREIGN KEY (doctor_id) REFERENCES public.users(id);


--
-- Name: prescriptions prescriptions_organization_id_organizations_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.prescriptions
    ADD CONSTRAINT prescriptions_organization_id_organizations_id_fk FOREIGN KEY (organization_id) REFERENCES public.organizations(id);


--
-- Name: prescriptions prescriptions_patient_id_patients_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.prescriptions
    ADD CONSTRAINT prescriptions_patient_id_patients_id_fk FOREIGN KEY (patient_id) REFERENCES public.patients(id);


--
-- Name: revenue_records revenue_records_organization_id_organizations_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.revenue_records
    ADD CONSTRAINT revenue_records_organization_id_organizations_id_fk FOREIGN KEY (organization_id) REFERENCES public.organizations(id);


--
-- Name: DATABASE neondb; Type: ACL; Schema: -; Owner: neondb_owner
--

GRANT ALL ON DATABASE neondb TO neon_superuser;


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: cloud_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE cloud_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO neon_superuser WITH GRANT OPTION;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: cloud_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE cloud_admin IN SCHEMA public GRANT ALL ON TABLES TO neon_superuser WITH GRANT OPTION;


--
-- PostgreSQL database dump complete
--

