--
-- PostgreSQL database dump
--

-- Dumped from database version 16.9 (415ebe8)
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
    appointment_id text NOT NULL,
    patient_id integer NOT NULL,
    provider_id integer NOT NULL,
    assigned_role character varying(50),
    title text NOT NULL,
    description text,
    scheduled_at timestamp without time zone NOT NULL,
    duration integer DEFAULT 30 NOT NULL,
    status character varying(20) DEFAULT 'scheduled'::character varying NOT NULL,
    type character varying(20) DEFAULT 'consultation'::character varying NOT NULL,
    location text,
    is_virtual boolean DEFAULT false NOT NULL,
    created_by integer,
    created_at timestamp without time zone DEFAULT now() NOT NULL
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
-- Name: clinic_footers; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.clinic_footers (
    id integer NOT NULL,
    organization_id integer NOT NULL,
    footer_text text NOT NULL,
    background_color character varying(7) DEFAULT '#4A7DFF'::character varying NOT NULL,
    text_color character varying(7) DEFAULT '#FFFFFF'::character varying NOT NULL,
    show_social boolean DEFAULT false NOT NULL,
    facebook text,
    twitter text,
    linkedin text,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.clinic_footers OWNER TO neondb_owner;

--
-- Name: clinic_footers_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.clinic_footers_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.clinic_footers_id_seq OWNER TO neondb_owner;

--
-- Name: clinic_footers_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.clinic_footers_id_seq OWNED BY public.clinic_footers.id;


--
-- Name: clinic_headers; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.clinic_headers (
    id integer NOT NULL,
    organization_id integer NOT NULL,
    logo_base64 text,
    logo_position character varying(20) DEFAULT 'center'::character varying NOT NULL,
    clinic_name text NOT NULL,
    address text,
    phone character varying(50),
    email text,
    website text,
    clinic_name_font_size character varying(20) DEFAULT '24pt'::character varying NOT NULL,
    font_size character varying(20) DEFAULT '12pt'::character varying NOT NULL,
    font_family character varying(50) DEFAULT 'verdana'::character varying NOT NULL,
    font_weight character varying(20) DEFAULT 'normal'::character varying NOT NULL,
    font_style character varying(20) DEFAULT 'normal'::character varying NOT NULL,
    text_decoration character varying(20) DEFAULT 'none'::character varying NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.clinic_headers OWNER TO neondb_owner;

--
-- Name: clinic_headers_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.clinic_headers_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.clinic_headers_id_seq OWNER TO neondb_owner;

--
-- Name: clinic_headers_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.clinic_headers_id_seq OWNED BY public.clinic_headers.id;


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
-- Name: doctor_default_shifts; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.doctor_default_shifts (
    id integer NOT NULL,
    organization_id integer NOT NULL,
    user_id integer NOT NULL,
    start_time character varying(5) DEFAULT '09:00'::character varying NOT NULL,
    end_time character varying(5) DEFAULT '17:00'::character varying NOT NULL,
    working_days text[] DEFAULT '{Monday,Tuesday,Wednesday,Thursday,Friday}'::text[] NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.doctor_default_shifts OWNER TO neondb_owner;

--
-- Name: doctor_default_shifts_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.doctor_default_shifts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.doctor_default_shifts_id_seq OWNER TO neondb_owner;

--
-- Name: doctor_default_shifts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.doctor_default_shifts_id_seq OWNED BY public.doctor_default_shifts.id;


--
-- Name: doctors_fee; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.doctors_fee (
    id integer NOT NULL,
    organization_id integer NOT NULL,
    doctor_id integer,
    doctor_name text,
    doctor_role character varying(50),
    service_name text NOT NULL,
    service_code character varying(50),
    category character varying(100),
    base_price numeric(10,2) NOT NULL,
    currency character varying(3) DEFAULT 'GBP'::character varying NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    effective_date timestamp without time zone DEFAULT now() NOT NULL,
    expiry_date timestamp without time zone,
    is_active boolean DEFAULT true NOT NULL,
    created_by integer NOT NULL,
    notes text,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.doctors_fee OWNER TO neondb_owner;

--
-- Name: doctors_fee_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.doctors_fee_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.doctors_fee_id_seq OWNER TO neondb_owner;

--
-- Name: doctors_fee_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.doctors_fee_id_seq OWNED BY public.doctors_fee.id;


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
-- Name: imaging_pricing; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.imaging_pricing (
    id integer NOT NULL,
    organization_id integer NOT NULL,
    imaging_type text NOT NULL,
    imaging_code character varying(50),
    modality character varying(50),
    body_part character varying(100),
    category character varying(100),
    base_price numeric(10,2) NOT NULL,
    currency character varying(3) DEFAULT 'GBP'::character varying NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    effective_date timestamp without time zone DEFAULT now() NOT NULL,
    expiry_date timestamp without time zone,
    is_active boolean DEFAULT true NOT NULL,
    created_by integer NOT NULL,
    notes text,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.imaging_pricing OWNER TO neondb_owner;

--
-- Name: imaging_pricing_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.imaging_pricing_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.imaging_pricing_id_seq OWNER TO neondb_owner;

--
-- Name: imaging_pricing_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.imaging_pricing_id_seq OWNED BY public.imaging_pricing.id;


--
-- Name: insurance_payments; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.insurance_payments (
    id integer NOT NULL,
    organization_id integer NOT NULL,
    invoice_id integer NOT NULL,
    claim_number character varying(100),
    amount_paid numeric(10,2) NOT NULL,
    payment_date timestamp without time zone NOT NULL,
    insurance_provider text NOT NULL,
    payment_reference text,
    notes text,
    created_by integer,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.insurance_payments OWNER TO neondb_owner;

--
-- Name: insurance_payments_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.insurance_payments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.insurance_payments_id_seq OWNER TO neondb_owner;

--
-- Name: insurance_payments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.insurance_payments_id_seq OWNED BY public.insurance_payments.id;


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
-- Name: invoices; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.invoices (
    id integer NOT NULL,
    organization_id integer NOT NULL,
    invoice_number character varying(50) NOT NULL,
    patient_id text NOT NULL,
    patient_name text NOT NULL,
    nhs_number character varying(50),
    service_type character varying(50),
    service_id text,
    date_of_service timestamp without time zone NOT NULL,
    invoice_date timestamp without time zone NOT NULL,
    due_date timestamp without time zone NOT NULL,
    status character varying(20) DEFAULT 'draft'::character varying NOT NULL,
    invoice_type character varying(50) DEFAULT 'payment'::character varying NOT NULL,
    payment_method character varying(50),
    insurance_provider character varying(100),
    subtotal numeric(10,2) NOT NULL,
    tax numeric(10,2) DEFAULT '0'::numeric NOT NULL,
    discount numeric(10,2) DEFAULT '0'::numeric NOT NULL,
    total_amount numeric(10,2) NOT NULL,
    paid_amount numeric(10,2) DEFAULT '0'::numeric NOT NULL,
    items jsonb NOT NULL,
    insurance jsonb,
    payments jsonb DEFAULT '[]'::jsonb NOT NULL,
    notes text,
    created_by integer,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.invoices OWNER TO neondb_owner;

--
-- Name: invoices_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.invoices_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.invoices_id_seq OWNER TO neondb_owner;

--
-- Name: invoices_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.invoices_id_seq OWNED BY public.invoices.id;


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
    report_status character varying(50),
    results jsonb DEFAULT '[]'::jsonb,
    critical_values boolean DEFAULT false NOT NULL,
    notes text,
    "Lab_Request_Generated" boolean DEFAULT false NOT NULL,
    "Sample_Collected" boolean DEFAULT false NOT NULL,
    "Lab_Report_Generated" boolean DEFAULT false NOT NULL,
    "Reviewed" boolean DEFAULT false NOT NULL,
    signature_data text,
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
-- Name: lab_test_pricing; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.lab_test_pricing (
    id integer NOT NULL,
    organization_id integer NOT NULL,
    doctor_id integer,
    doctor_name text,
    doctor_role character varying(50),
    test_name text NOT NULL,
    test_code character varying(50),
    category character varying(100),
    base_price numeric(10,2) NOT NULL,
    currency character varying(3) DEFAULT 'GBP'::character varying NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    effective_date timestamp without time zone DEFAULT now() NOT NULL,
    expiry_date timestamp without time zone,
    is_active boolean DEFAULT true NOT NULL,
    created_by integer NOT NULL,
    notes text,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.lab_test_pricing OWNER TO neondb_owner;

--
-- Name: lab_test_pricing_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.lab_test_pricing_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.lab_test_pricing_id_seq OWNER TO neondb_owner;

--
-- Name: lab_test_pricing_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.lab_test_pricing_id_seq OWNED BY public.lab_test_pricing.id;


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
    image_id text NOT NULL,
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
    prescription_file_path text,
    metadata jsonb DEFAULT '{}'::jsonb,
    scheduled_at timestamp without time zone,
    performed_at timestamp without time zone,
    order_study_created boolean DEFAULT false NOT NULL,
    order_study_ready_to_generate boolean DEFAULT false NOT NULL,
    order_study_generated boolean DEFAULT false NOT NULL,
    order_study_shared boolean DEFAULT false NOT NULL,
    signature_data text,
    signature_date timestamp without time zone,
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
-- Name: message_campaigns; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.message_campaigns (
    id integer NOT NULL,
    organization_id integer NOT NULL,
    name text NOT NULL,
    type character varying(20) DEFAULT 'email'::character varying NOT NULL,
    status character varying(20) DEFAULT 'draft'::character varying NOT NULL,
    subject text NOT NULL,
    content text NOT NULL,
    template character varying(50) DEFAULT 'default'::character varying NOT NULL,
    recipient_count integer DEFAULT 0 NOT NULL,
    sent_count integer DEFAULT 0 NOT NULL,
    open_rate integer DEFAULT 0 NOT NULL,
    click_rate integer DEFAULT 0 NOT NULL,
    scheduled_at timestamp without time zone,
    sent_at timestamp without time zone,
    created_by integer NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.message_campaigns OWNER TO neondb_owner;

--
-- Name: message_campaigns_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.message_campaigns_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.message_campaigns_id_seq OWNER TO neondb_owner;

--
-- Name: message_campaigns_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.message_campaigns_id_seq OWNED BY public.message_campaigns.id;


--
-- Name: message_templates; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.message_templates (
    id integer NOT NULL,
    organization_id integer NOT NULL,
    name text NOT NULL,
    category character varying(50) DEFAULT 'general'::character varying NOT NULL,
    subject text NOT NULL,
    content text NOT NULL,
    usage_count integer DEFAULT 0 NOT NULL,
    created_by integer NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.message_templates OWNER TO neondb_owner;

--
-- Name: message_templates_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.message_templates_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.message_templates_id_seq OWNER TO neondb_owner;

--
-- Name: message_templates_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.message_templates_id_seq OWNED BY public.message_templates.id;


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
-- Name: password_reset_tokens; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.password_reset_tokens (
    id integer NOT NULL,
    user_id integer NOT NULL,
    token text NOT NULL,
    expires_at timestamp without time zone NOT NULL,
    is_used boolean DEFAULT false NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.password_reset_tokens OWNER TO neondb_owner;

--
-- Name: password_reset_tokens_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.password_reset_tokens_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.password_reset_tokens_id_seq OWNER TO neondb_owner;

--
-- Name: password_reset_tokens_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.password_reset_tokens_id_seq OWNED BY public.password_reset_tokens.id;


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
    user_id integer,
    patient_id text NOT NULL,
    first_name text NOT NULL,
    last_name text NOT NULL,
    date_of_birth date,
    gender_at_birth character varying(20),
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
    created_by integer,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
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
-- Name: payments; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.payments (
    id integer NOT NULL,
    organization_id integer NOT NULL,
    invoice_id integer NOT NULL,
    patient_id text NOT NULL,
    transaction_id text NOT NULL,
    amount numeric(10,2) NOT NULL,
    currency character varying(3) DEFAULT 'GBP'::character varying NOT NULL,
    payment_method character varying(20) NOT NULL,
    payment_provider character varying(50),
    payment_status character varying(20) DEFAULT 'completed'::character varying NOT NULL,
    payment_date timestamp without time zone DEFAULT now() NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.payments OWNER TO neondb_owner;

--
-- Name: payments_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.payments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.payments_id_seq OWNER TO neondb_owner;

--
-- Name: payments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.payments_id_seq OWNED BY public.payments.id;


--
-- Name: prescriptions; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.prescriptions (
    id integer NOT NULL,
    organization_id integer NOT NULL,
    patient_id integer NOT NULL,
    doctor_id integer NOT NULL,
    prescription_created_by integer,
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
-- Name: risk_assessments; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.risk_assessments (
    id integer NOT NULL,
    organization_id integer NOT NULL,
    patient_id integer NOT NULL,
    category text NOT NULL,
    risk_score numeric(5,2) NOT NULL,
    risk_level character varying(20) NOT NULL,
    risk_factors jsonb DEFAULT '[]'::jsonb,
    recommendations jsonb DEFAULT '[]'::jsonb,
    based_on_lab_results jsonb DEFAULT '[]'::jsonb,
    has_critical_values boolean DEFAULT false NOT NULL,
    assessment_date timestamp without time zone DEFAULT now() NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.risk_assessments OWNER TO neondb_owner;

--
-- Name: risk_assessments_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.risk_assessments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.risk_assessments_id_seq OWNER TO neondb_owner;

--
-- Name: risk_assessments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.risk_assessments_id_seq OWNED BY public.risk_assessments.id;


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
    created_by integer,
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
-- Name: symptom_checks; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.symptom_checks (
    id integer NOT NULL,
    organization_id integer NOT NULL,
    patient_id integer,
    user_id integer NOT NULL,
    symptoms text[] NOT NULL,
    symptom_description text NOT NULL,
    duration text,
    severity character varying(20),
    ai_analysis jsonb DEFAULT '{}'::jsonb,
    status character varying(20) DEFAULT 'pending'::character varying NOT NULL,
    appointment_created boolean DEFAULT false NOT NULL,
    appointment_id integer,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.symptom_checks OWNER TO neondb_owner;

--
-- Name: symptom_checks_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.symptom_checks_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.symptom_checks_id_seq OWNER TO neondb_owner;

--
-- Name: symptom_checks_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.symptom_checks_id_seq OWNED BY public.symptom_checks.id;


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
-- Name: clinic_footers id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.clinic_footers ALTER COLUMN id SET DEFAULT nextval('public.clinic_footers_id_seq'::regclass);


--
-- Name: clinic_headers id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.clinic_headers ALTER COLUMN id SET DEFAULT nextval('public.clinic_headers_id_seq'::regclass);


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
-- Name: doctor_default_shifts id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.doctor_default_shifts ALTER COLUMN id SET DEFAULT nextval('public.doctor_default_shifts_id_seq'::regclass);


--
-- Name: doctors_fee id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.doctors_fee ALTER COLUMN id SET DEFAULT nextval('public.doctors_fee_id_seq'::regclass);


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
-- Name: imaging_pricing id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.imaging_pricing ALTER COLUMN id SET DEFAULT nextval('public.imaging_pricing_id_seq'::regclass);


--
-- Name: insurance_payments id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.insurance_payments ALTER COLUMN id SET DEFAULT nextval('public.insurance_payments_id_seq'::regclass);


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
-- Name: invoices id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.invoices ALTER COLUMN id SET DEFAULT nextval('public.invoices_id_seq'::regclass);


--
-- Name: lab_results id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.lab_results ALTER COLUMN id SET DEFAULT nextval('public.lab_results_id_seq'::regclass);


--
-- Name: lab_test_pricing id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.lab_test_pricing ALTER COLUMN id SET DEFAULT nextval('public.lab_test_pricing_id_seq'::regclass);


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
-- Name: message_campaigns id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.message_campaigns ALTER COLUMN id SET DEFAULT nextval('public.message_campaigns_id_seq'::regclass);


--
-- Name: message_templates id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.message_templates ALTER COLUMN id SET DEFAULT nextval('public.message_templates_id_seq'::regclass);


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
-- Name: password_reset_tokens id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.password_reset_tokens ALTER COLUMN id SET DEFAULT nextval('public.password_reset_tokens_id_seq'::regclass);


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
-- Name: payments id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.payments ALTER COLUMN id SET DEFAULT nextval('public.payments_id_seq'::regclass);


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
-- Name: risk_assessments id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.risk_assessments ALTER COLUMN id SET DEFAULT nextval('public.risk_assessments_id_seq'::regclass);


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
-- Name: symptom_checks id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.symptom_checks ALTER COLUMN id SET DEFAULT nextval('public.symptom_checks_id_seq'::regclass);


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
1	1	1	risk_alert	Cardiovascular Risk Assessment	Based on recent blood pressure readings and family history, patient shows elevated cardiovascular risk factors. Consider lifestyle modifications and medication review.	medium	t	0.85	{"references": ["AHA Guidelines 2023", "ESC Guidelines"], "suggestedActions": ["Diet consultation", "Exercise program", "Medication review"], "relatedConditions": ["Hypertension", "Family History CVD"]}	active	pending	2025-11-17 08:46:48.288289
2	1	2	drug_interaction	Potential Drug Interaction Alert	Interaction detected between Metformin and newly prescribed medication. Monitor glucose levels closely and consider dosage adjustment.	high	t	0.92	{"references": ["Drug Interaction Database", "FDA Guidelines"], "suggestedActions": ["Monitor blood glucose", "Review medication timing", "Patient education"], "relatedConditions": ["Type 2 Diabetes", "Drug Interaction"]}	active	pending	2025-11-17 08:46:48.288289
3	1	1	treatment_suggestion	Hypertension Management Optimization	Current treatment plan shows good response. Consider adding lifestyle interventions to potentially reduce medication dependency.	low	f	0.78	{"references": ["JNC 8 Guidelines", "AHA Lifestyle Guidelines"], "suggestedActions": ["DASH diet counseling", "Regular exercise program", "Weight management"], "relatedConditions": ["Hypertension", "ACE Inhibitor Therapy"]}	active	pending	2025-11-17 08:46:48.288289
4	1	2	preventive_care	Diabetic Screening Recommendations	Patient due for annual diabetic complications screening. Schedule eye exam, foot examination, and kidney function tests.	medium	t	0.95	{"references": ["ADA Standards of Care", "Diabetic Complications Guidelines"], "suggestedActions": ["Ophthalmology referral", "Podiatry consultation", "Lab work: HbA1c, microalbumin"], "relatedConditions": ["Type 2 Diabetes", "Preventive Care"]}	active	pending	2025-11-17 08:46:48.288289
5	1	1	risk_alert	Medication Adherence Concern	AI analysis of prescription refill patterns suggests potential adherence issues. Patient may benefit from medication management support.	medium	t	0.73	{"references": ["Medication Adherence Guidelines", "Patient Education Resources"], "suggestedActions": ["Adherence counseling", "Pill organizer", "Follow-up call"], "relatedConditions": ["Medication Adherence", "Hypertension"]}	active	pending	2025-11-17 08:46:48.288289
6	1	1	risk_alert	Cardiovascular Risk Assessment	Based on recent blood pressure readings and family history, patient shows elevated cardiovascular risk factors. Consider lifestyle modifications and medication review.	medium	t	0.85	{"references": ["AHA Guidelines 2023", "ESC Guidelines"], "suggestedActions": ["Diet consultation", "Exercise program", "Medication review"], "relatedConditions": ["Hypertension", "Family History CVD"]}	active	pending	2025-11-17 08:48:45.861207
7	1	2	drug_interaction	Potential Drug Interaction Alert	Interaction detected between Metformin and newly prescribed medication. Monitor glucose levels closely and consider dosage adjustment.	high	t	0.92	{"references": ["Drug Interaction Database", "FDA Guidelines"], "suggestedActions": ["Monitor blood glucose", "Review medication timing", "Patient education"], "relatedConditions": ["Type 2 Diabetes", "Drug Interaction"]}	active	pending	2025-11-17 08:48:45.861207
8	1	1	treatment_suggestion	Hypertension Management Optimization	Current treatment plan shows good response. Consider adding lifestyle interventions to potentially reduce medication dependency.	low	f	0.78	{"references": ["JNC 8 Guidelines", "AHA Lifestyle Guidelines"], "suggestedActions": ["DASH diet counseling", "Regular exercise program", "Weight management"], "relatedConditions": ["Hypertension", "ACE Inhibitor Therapy"]}	active	pending	2025-11-17 08:48:45.861207
9	1	2	preventive_care	Diabetic Screening Recommendations	Patient due for annual diabetic complications screening. Schedule eye exam, foot examination, and kidney function tests.	medium	t	0.95	{"references": ["ADA Standards of Care", "Diabetic Complications Guidelines"], "suggestedActions": ["Ophthalmology referral", "Podiatry consultation", "Lab work: HbA1c, microalbumin"], "relatedConditions": ["Type 2 Diabetes", "Preventive Care"]}	active	pending	2025-11-17 08:48:45.861207
10	1	1	risk_alert	Medication Adherence Concern	AI analysis of prescription refill patterns suggests potential adherence issues. Patient may benefit from medication management support.	medium	t	0.73	{"references": ["Medication Adherence Guidelines", "Patient Education Resources"], "suggestedActions": ["Adherence counseling", "Pill organizer", "Follow-up call"], "relatedConditions": ["Medication Adherence", "Hypertension"]}	active	pending	2025-11-17 08:48:45.861207
11	1	1	risk_alert	Cardiovascular Risk Assessment	Based on recent blood pressure readings and family history, patient shows elevated cardiovascular risk factors. Consider lifestyle modifications and medication review.	medium	t	0.85	{"references": ["AHA Guidelines 2023", "ESC Guidelines"], "suggestedActions": ["Diet consultation", "Exercise program", "Medication review"], "relatedConditions": ["Hypertension", "Family History CVD"]}	active	pending	2025-11-17 08:49:43.851572
12	1	2	drug_interaction	Potential Drug Interaction Alert	Interaction detected between Metformin and newly prescribed medication. Monitor glucose levels closely and consider dosage adjustment.	high	t	0.92	{"references": ["Drug Interaction Database", "FDA Guidelines"], "suggestedActions": ["Monitor blood glucose", "Review medication timing", "Patient education"], "relatedConditions": ["Type 2 Diabetes", "Drug Interaction"]}	active	pending	2025-11-17 08:49:43.851572
13	1	1	treatment_suggestion	Hypertension Management Optimization	Current treatment plan shows good response. Consider adding lifestyle interventions to potentially reduce medication dependency.	low	f	0.78	{"references": ["JNC 8 Guidelines", "AHA Lifestyle Guidelines"], "suggestedActions": ["DASH diet counseling", "Regular exercise program", "Weight management"], "relatedConditions": ["Hypertension", "ACE Inhibitor Therapy"]}	active	pending	2025-11-17 08:49:43.851572
14	1	2	preventive_care	Diabetic Screening Recommendations	Patient due for annual diabetic complications screening. Schedule eye exam, foot examination, and kidney function tests.	medium	t	0.95	{"references": ["ADA Standards of Care", "Diabetic Complications Guidelines"], "suggestedActions": ["Ophthalmology referral", "Podiatry consultation", "Lab work: HbA1c, microalbumin"], "relatedConditions": ["Type 2 Diabetes", "Preventive Care"]}	active	pending	2025-11-17 08:49:43.851572
15	1	1	risk_alert	Medication Adherence Concern	AI analysis of prescription refill patterns suggests potential adherence issues. Patient may benefit from medication management support.	medium	t	0.73	{"references": ["Medication Adherence Guidelines", "Patient Education Resources"], "suggestedActions": ["Adherence counseling", "Pill organizer", "Follow-up call"], "relatedConditions": ["Medication Adherence", "Hypertension"]}	active	pending	2025-11-17 08:49:43.851572
16	1	1	risk_alert	Cardiovascular Risk Assessment	Based on recent blood pressure readings and family history, patient shows elevated cardiovascular risk factors. Consider lifestyle modifications and medication review.	medium	t	0.85	{"references": ["AHA Guidelines 2023", "ESC Guidelines"], "suggestedActions": ["Diet consultation", "Exercise program", "Medication review"], "relatedConditions": ["Hypertension", "Family History CVD"]}	active	pending	2025-11-17 10:04:16.499144
17	1	2	drug_interaction	Potential Drug Interaction Alert	Interaction detected between Metformin and newly prescribed medication. Monitor glucose levels closely and consider dosage adjustment.	high	t	0.92	{"references": ["Drug Interaction Database", "FDA Guidelines"], "suggestedActions": ["Monitor blood glucose", "Review medication timing", "Patient education"], "relatedConditions": ["Type 2 Diabetes", "Drug Interaction"]}	active	pending	2025-11-17 10:04:16.499144
18	1	1	treatment_suggestion	Hypertension Management Optimization	Current treatment plan shows good response. Consider adding lifestyle interventions to potentially reduce medication dependency.	low	f	0.78	{"references": ["JNC 8 Guidelines", "AHA Lifestyle Guidelines"], "suggestedActions": ["DASH diet counseling", "Regular exercise program", "Weight management"], "relatedConditions": ["Hypertension", "ACE Inhibitor Therapy"]}	active	pending	2025-11-17 10:04:16.499144
19	1	2	preventive_care	Diabetic Screening Recommendations	Patient due for annual diabetic complications screening. Schedule eye exam, foot examination, and kidney function tests.	medium	t	0.95	{"references": ["ADA Standards of Care", "Diabetic Complications Guidelines"], "suggestedActions": ["Ophthalmology referral", "Podiatry consultation", "Lab work: HbA1c, microalbumin"], "relatedConditions": ["Type 2 Diabetes", "Preventive Care"]}	active	pending	2025-11-17 10:04:16.499144
20	1	1	risk_alert	Medication Adherence Concern	AI analysis of prescription refill patterns suggests potential adherence issues. Patient may benefit from medication management support.	medium	t	0.73	{"references": ["Medication Adherence Guidelines", "Patient Education Resources"], "suggestedActions": ["Adherence counseling", "Pill organizer", "Follow-up call"], "relatedConditions": ["Medication Adherence", "Hypertension"]}	active	pending	2025-11-17 10:04:16.499144
21	1	1	risk_alert	Cardiovascular Risk Assessment	Based on recent blood pressure readings and family history, patient shows elevated cardiovascular risk factors. Consider lifestyle modifications and medication review.	medium	t	0.85	{"references": ["AHA Guidelines 2023", "ESC Guidelines"], "suggestedActions": ["Diet consultation", "Exercise program", "Medication review"], "relatedConditions": ["Hypertension", "Family History CVD"]}	active	pending	2025-11-17 11:11:32.985126
22	1	2	drug_interaction	Potential Drug Interaction Alert	Interaction detected between Metformin and newly prescribed medication. Monitor glucose levels closely and consider dosage adjustment.	high	t	0.92	{"references": ["Drug Interaction Database", "FDA Guidelines"], "suggestedActions": ["Monitor blood glucose", "Review medication timing", "Patient education"], "relatedConditions": ["Type 2 Diabetes", "Drug Interaction"]}	active	pending	2025-11-17 11:11:32.985126
23	1	1	treatment_suggestion	Hypertension Management Optimization	Current treatment plan shows good response. Consider adding lifestyle interventions to potentially reduce medication dependency.	low	f	0.78	{"references": ["JNC 8 Guidelines", "AHA Lifestyle Guidelines"], "suggestedActions": ["DASH diet counseling", "Regular exercise program", "Weight management"], "relatedConditions": ["Hypertension", "ACE Inhibitor Therapy"]}	active	pending	2025-11-17 11:11:32.985126
24	1	2	preventive_care	Diabetic Screening Recommendations	Patient due for annual diabetic complications screening. Schedule eye exam, foot examination, and kidney function tests.	medium	t	0.95	{"references": ["ADA Standards of Care", "Diabetic Complications Guidelines"], "suggestedActions": ["Ophthalmology referral", "Podiatry consultation", "Lab work: HbA1c, microalbumin"], "relatedConditions": ["Type 2 Diabetes", "Preventive Care"]}	active	pending	2025-11-17 11:11:32.985126
25	1	1	risk_alert	Medication Adherence Concern	AI analysis of prescription refill patterns suggests potential adherence issues. Patient may benefit from medication management support.	medium	t	0.73	{"references": ["Medication Adherence Guidelines", "Patient Education Resources"], "suggestedActions": ["Adherence counseling", "Pill organizer", "Follow-up call"], "relatedConditions": ["Medication Adherence", "Hypertension"]}	active	pending	2025-11-17 11:11:32.985126
26	1	1	risk_alert	Cardiovascular Risk Assessment	Based on recent blood pressure readings and family history, patient shows elevated cardiovascular risk factors. Consider lifestyle modifications and medication review.	medium	t	0.85	{"references": ["AHA Guidelines 2023", "ESC Guidelines"], "suggestedActions": ["Diet consultation", "Exercise program", "Medication review"], "relatedConditions": ["Hypertension", "Family History CVD"]}	active	pending	2025-11-17 11:12:55.377502
27	1	2	drug_interaction	Potential Drug Interaction Alert	Interaction detected between Metformin and newly prescribed medication. Monitor glucose levels closely and consider dosage adjustment.	high	t	0.92	{"references": ["Drug Interaction Database", "FDA Guidelines"], "suggestedActions": ["Monitor blood glucose", "Review medication timing", "Patient education"], "relatedConditions": ["Type 2 Diabetes", "Drug Interaction"]}	active	pending	2025-11-17 11:12:55.377502
28	1	1	treatment_suggestion	Hypertension Management Optimization	Current treatment plan shows good response. Consider adding lifestyle interventions to potentially reduce medication dependency.	low	f	0.78	{"references": ["JNC 8 Guidelines", "AHA Lifestyle Guidelines"], "suggestedActions": ["DASH diet counseling", "Regular exercise program", "Weight management"], "relatedConditions": ["Hypertension", "ACE Inhibitor Therapy"]}	active	pending	2025-11-17 11:12:55.377502
29	1	2	preventive_care	Diabetic Screening Recommendations	Patient due for annual diabetic complications screening. Schedule eye exam, foot examination, and kidney function tests.	medium	t	0.95	{"references": ["ADA Standards of Care", "Diabetic Complications Guidelines"], "suggestedActions": ["Ophthalmology referral", "Podiatry consultation", "Lab work: HbA1c, microalbumin"], "relatedConditions": ["Type 2 Diabetes", "Preventive Care"]}	active	pending	2025-11-17 11:12:55.377502
30	1	1	risk_alert	Medication Adherence Concern	AI analysis of prescription refill patterns suggests potential adherence issues. Patient may benefit from medication management support.	medium	t	0.73	{"references": ["Medication Adherence Guidelines", "Patient Education Resources"], "suggestedActions": ["Adherence counseling", "Pill organizer", "Follow-up call"], "relatedConditions": ["Medication Adherence", "Hypertension"]}	active	pending	2025-11-17 11:12:55.377502
31	1	1	risk_alert	Cardiovascular Risk Assessment	Based on recent blood pressure readings and family history, patient shows elevated cardiovascular risk factors. Consider lifestyle modifications and medication review.	medium	t	0.85	{"references": ["AHA Guidelines 2023", "ESC Guidelines"], "suggestedActions": ["Diet consultation", "Exercise program", "Medication review"], "relatedConditions": ["Hypertension", "Family History CVD"]}	active	pending	2025-11-17 11:16:12.457025
32	1	2	drug_interaction	Potential Drug Interaction Alert	Interaction detected between Metformin and newly prescribed medication. Monitor glucose levels closely and consider dosage adjustment.	high	t	0.92	{"references": ["Drug Interaction Database", "FDA Guidelines"], "suggestedActions": ["Monitor blood glucose", "Review medication timing", "Patient education"], "relatedConditions": ["Type 2 Diabetes", "Drug Interaction"]}	active	pending	2025-11-17 11:16:12.457025
33	1	1	treatment_suggestion	Hypertension Management Optimization	Current treatment plan shows good response. Consider adding lifestyle interventions to potentially reduce medication dependency.	low	f	0.78	{"references": ["JNC 8 Guidelines", "AHA Lifestyle Guidelines"], "suggestedActions": ["DASH diet counseling", "Regular exercise program", "Weight management"], "relatedConditions": ["Hypertension", "ACE Inhibitor Therapy"]}	active	pending	2025-11-17 11:16:12.457025
34	1	2	preventive_care	Diabetic Screening Recommendations	Patient due for annual diabetic complications screening. Schedule eye exam, foot examination, and kidney function tests.	medium	t	0.95	{"references": ["ADA Standards of Care", "Diabetic Complications Guidelines"], "suggestedActions": ["Ophthalmology referral", "Podiatry consultation", "Lab work: HbA1c, microalbumin"], "relatedConditions": ["Type 2 Diabetes", "Preventive Care"]}	active	pending	2025-11-17 11:16:12.457025
35	1	1	risk_alert	Medication Adherence Concern	AI analysis of prescription refill patterns suggests potential adherence issues. Patient may benefit from medication management support.	medium	t	0.73	{"references": ["Medication Adherence Guidelines", "Patient Education Resources"], "suggestedActions": ["Adherence counseling", "Pill organizer", "Follow-up call"], "relatedConditions": ["Medication Adherence", "Hypertension"]}	active	pending	2025-11-17 11:16:12.457025
36	1	1	risk_alert	Cardiovascular Risk Assessment	Based on recent blood pressure readings and family history, patient shows elevated cardiovascular risk factors. Consider lifestyle modifications and medication review.	medium	t	0.85	{"references": ["AHA Guidelines 2023", "ESC Guidelines"], "suggestedActions": ["Diet consultation", "Exercise program", "Medication review"], "relatedConditions": ["Hypertension", "Family History CVD"]}	active	pending	2025-11-17 11:17:26.009745
37	1	2	drug_interaction	Potential Drug Interaction Alert	Interaction detected between Metformin and newly prescribed medication. Monitor glucose levels closely and consider dosage adjustment.	high	t	0.92	{"references": ["Drug Interaction Database", "FDA Guidelines"], "suggestedActions": ["Monitor blood glucose", "Review medication timing", "Patient education"], "relatedConditions": ["Type 2 Diabetes", "Drug Interaction"]}	active	pending	2025-11-17 11:17:26.009745
38	1	1	treatment_suggestion	Hypertension Management Optimization	Current treatment plan shows good response. Consider adding lifestyle interventions to potentially reduce medication dependency.	low	f	0.78	{"references": ["JNC 8 Guidelines", "AHA Lifestyle Guidelines"], "suggestedActions": ["DASH diet counseling", "Regular exercise program", "Weight management"], "relatedConditions": ["Hypertension", "ACE Inhibitor Therapy"]}	active	pending	2025-11-17 11:17:26.009745
39	1	2	preventive_care	Diabetic Screening Recommendations	Patient due for annual diabetic complications screening. Schedule eye exam, foot examination, and kidney function tests.	medium	t	0.95	{"references": ["ADA Standards of Care", "Diabetic Complications Guidelines"], "suggestedActions": ["Ophthalmology referral", "Podiatry consultation", "Lab work: HbA1c, microalbumin"], "relatedConditions": ["Type 2 Diabetes", "Preventive Care"]}	active	pending	2025-11-17 11:17:26.009745
40	1	1	risk_alert	Medication Adherence Concern	AI analysis of prescription refill patterns suggests potential adherence issues. Patient may benefit from medication management support.	medium	t	0.73	{"references": ["Medication Adherence Guidelines", "Patient Education Resources"], "suggestedActions": ["Adherence counseling", "Pill organizer", "Follow-up call"], "relatedConditions": ["Medication Adherence", "Hypertension"]}	active	pending	2025-11-17 11:17:26.009745
41	1	1	risk_alert	Cardiovascular Risk Assessment	Based on recent blood pressure readings and family history, patient shows elevated cardiovascular risk factors. Consider lifestyle modifications and medication review.	medium	t	0.85	{"references": ["AHA Guidelines 2023", "ESC Guidelines"], "suggestedActions": ["Diet consultation", "Exercise program", "Medication review"], "relatedConditions": ["Hypertension", "Family History CVD"]}	active	pending	2025-11-17 11:39:02.625211
42	1	2	drug_interaction	Potential Drug Interaction Alert	Interaction detected between Metformin and newly prescribed medication. Monitor glucose levels closely and consider dosage adjustment.	high	t	0.92	{"references": ["Drug Interaction Database", "FDA Guidelines"], "suggestedActions": ["Monitor blood glucose", "Review medication timing", "Patient education"], "relatedConditions": ["Type 2 Diabetes", "Drug Interaction"]}	active	pending	2025-11-17 11:39:02.625211
43	1	1	treatment_suggestion	Hypertension Management Optimization	Current treatment plan shows good response. Consider adding lifestyle interventions to potentially reduce medication dependency.	low	f	0.78	{"references": ["JNC 8 Guidelines", "AHA Lifestyle Guidelines"], "suggestedActions": ["DASH diet counseling", "Regular exercise program", "Weight management"], "relatedConditions": ["Hypertension", "ACE Inhibitor Therapy"]}	active	pending	2025-11-17 11:39:02.625211
44	1	2	preventive_care	Diabetic Screening Recommendations	Patient due for annual diabetic complications screening. Schedule eye exam, foot examination, and kidney function tests.	medium	t	0.95	{"references": ["ADA Standards of Care", "Diabetic Complications Guidelines"], "suggestedActions": ["Ophthalmology referral", "Podiatry consultation", "Lab work: HbA1c, microalbumin"], "relatedConditions": ["Type 2 Diabetes", "Preventive Care"]}	active	pending	2025-11-17 11:39:02.625211
45	1	1	risk_alert	Medication Adherence Concern	AI analysis of prescription refill patterns suggests potential adherence issues. Patient may benefit from medication management support.	medium	t	0.73	{"references": ["Medication Adherence Guidelines", "Patient Education Resources"], "suggestedActions": ["Adherence counseling", "Pill organizer", "Follow-up call"], "relatedConditions": ["Medication Adherence", "Hypertension"]}	active	pending	2025-11-17 11:39:02.625211
46	1	1	risk_alert	Cardiovascular Risk Assessment	Based on recent blood pressure readings and family history, patient shows elevated cardiovascular risk factors. Consider lifestyle modifications and medication review.	medium	t	0.85	{"references": ["AHA Guidelines 2023", "ESC Guidelines"], "suggestedActions": ["Diet consultation", "Exercise program", "Medication review"], "relatedConditions": ["Hypertension", "Family History CVD"]}	active	pending	2025-11-17 12:04:42.204723
47	1	2	drug_interaction	Potential Drug Interaction Alert	Interaction detected between Metformin and newly prescribed medication. Monitor glucose levels closely and consider dosage adjustment.	high	t	0.92	{"references": ["Drug Interaction Database", "FDA Guidelines"], "suggestedActions": ["Monitor blood glucose", "Review medication timing", "Patient education"], "relatedConditions": ["Type 2 Diabetes", "Drug Interaction"]}	active	pending	2025-11-17 12:04:42.204723
48	1	1	treatment_suggestion	Hypertension Management Optimization	Current treatment plan shows good response. Consider adding lifestyle interventions to potentially reduce medication dependency.	low	f	0.78	{"references": ["JNC 8 Guidelines", "AHA Lifestyle Guidelines"], "suggestedActions": ["DASH diet counseling", "Regular exercise program", "Weight management"], "relatedConditions": ["Hypertension", "ACE Inhibitor Therapy"]}	active	pending	2025-11-17 12:04:42.204723
49	1	2	preventive_care	Diabetic Screening Recommendations	Patient due for annual diabetic complications screening. Schedule eye exam, foot examination, and kidney function tests.	medium	t	0.95	{"references": ["ADA Standards of Care", "Diabetic Complications Guidelines"], "suggestedActions": ["Ophthalmology referral", "Podiatry consultation", "Lab work: HbA1c, microalbumin"], "relatedConditions": ["Type 2 Diabetes", "Preventive Care"]}	active	pending	2025-11-17 12:04:42.204723
50	1	1	risk_alert	Medication Adherence Concern	AI analysis of prescription refill patterns suggests potential adherence issues. Patient may benefit from medication management support.	medium	t	0.73	{"references": ["Medication Adherence Guidelines", "Patient Education Resources"], "suggestedActions": ["Adherence counseling", "Pill organizer", "Follow-up call"], "relatedConditions": ["Medication Adherence", "Hypertension"]}	active	pending	2025-11-17 12:04:42.204723
51	1	1	risk_alert	Cardiovascular Risk Assessment	Based on recent blood pressure readings and family history, patient shows elevated cardiovascular risk factors. Consider lifestyle modifications and medication review.	medium	t	0.85	{"references": ["AHA Guidelines 2023", "ESC Guidelines"], "suggestedActions": ["Diet consultation", "Exercise program", "Medication review"], "relatedConditions": ["Hypertension", "Family History CVD"]}	active	pending	2025-11-17 12:05:23.654264
52	1	2	drug_interaction	Potential Drug Interaction Alert	Interaction detected between Metformin and newly prescribed medication. Monitor glucose levels closely and consider dosage adjustment.	high	t	0.92	{"references": ["Drug Interaction Database", "FDA Guidelines"], "suggestedActions": ["Monitor blood glucose", "Review medication timing", "Patient education"], "relatedConditions": ["Type 2 Diabetes", "Drug Interaction"]}	active	pending	2025-11-17 12:05:23.654264
53	1	1	treatment_suggestion	Hypertension Management Optimization	Current treatment plan shows good response. Consider adding lifestyle interventions to potentially reduce medication dependency.	low	f	0.78	{"references": ["JNC 8 Guidelines", "AHA Lifestyle Guidelines"], "suggestedActions": ["DASH diet counseling", "Regular exercise program", "Weight management"], "relatedConditions": ["Hypertension", "ACE Inhibitor Therapy"]}	active	pending	2025-11-17 12:05:23.654264
54	1	2	preventive_care	Diabetic Screening Recommendations	Patient due for annual diabetic complications screening. Schedule eye exam, foot examination, and kidney function tests.	medium	t	0.95	{"references": ["ADA Standards of Care", "Diabetic Complications Guidelines"], "suggestedActions": ["Ophthalmology referral", "Podiatry consultation", "Lab work: HbA1c, microalbumin"], "relatedConditions": ["Type 2 Diabetes", "Preventive Care"]}	active	pending	2025-11-17 12:05:23.654264
55	1	1	risk_alert	Medication Adherence Concern	AI analysis of prescription refill patterns suggests potential adherence issues. Patient may benefit from medication management support.	medium	t	0.73	{"references": ["Medication Adherence Guidelines", "Patient Education Resources"], "suggestedActions": ["Adherence counseling", "Pill organizer", "Follow-up call"], "relatedConditions": ["Medication Adherence", "Hypertension"]}	active	pending	2025-11-17 12:05:23.654264
56	1	1	risk_alert	Cardiovascular Risk Assessment	Based on recent blood pressure readings and family history, patient shows elevated cardiovascular risk factors. Consider lifestyle modifications and medication review.	medium	t	0.85	{"references": ["AHA Guidelines 2023", "ESC Guidelines"], "suggestedActions": ["Diet consultation", "Exercise program", "Medication review"], "relatedConditions": ["Hypertension", "Family History CVD"]}	active	pending	2025-11-17 16:37:25.419222
57	1	2	drug_interaction	Potential Drug Interaction Alert	Interaction detected between Metformin and newly prescribed medication. Monitor glucose levels closely and consider dosage adjustment.	high	t	0.92	{"references": ["Drug Interaction Database", "FDA Guidelines"], "suggestedActions": ["Monitor blood glucose", "Review medication timing", "Patient education"], "relatedConditions": ["Type 2 Diabetes", "Drug Interaction"]}	active	pending	2025-11-17 16:37:25.419222
58	1	1	treatment_suggestion	Hypertension Management Optimization	Current treatment plan shows good response. Consider adding lifestyle interventions to potentially reduce medication dependency.	low	f	0.78	{"references": ["JNC 8 Guidelines", "AHA Lifestyle Guidelines"], "suggestedActions": ["DASH diet counseling", "Regular exercise program", "Weight management"], "relatedConditions": ["Hypertension", "ACE Inhibitor Therapy"]}	active	pending	2025-11-17 16:37:25.419222
59	1	2	preventive_care	Diabetic Screening Recommendations	Patient due for annual diabetic complications screening. Schedule eye exam, foot examination, and kidney function tests.	medium	t	0.95	{"references": ["ADA Standards of Care", "Diabetic Complications Guidelines"], "suggestedActions": ["Ophthalmology referral", "Podiatry consultation", "Lab work: HbA1c, microalbumin"], "relatedConditions": ["Type 2 Diabetes", "Preventive Care"]}	active	pending	2025-11-17 16:37:25.419222
60	1	1	risk_alert	Medication Adherence Concern	AI analysis of prescription refill patterns suggests potential adherence issues. Patient may benefit from medication management support.	medium	t	0.73	{"references": ["Medication Adherence Guidelines", "Patient Education Resources"], "suggestedActions": ["Adherence counseling", "Pill organizer", "Follow-up call"], "relatedConditions": ["Medication Adherence", "Hypertension"]}	active	pending	2025-11-17 16:37:25.419222
61	1	1	risk_alert	Cardiovascular Risk Assessment	Based on recent blood pressure readings and family history, patient shows elevated cardiovascular risk factors. Consider lifestyle modifications and medication review.	medium	t	0.85	{"references": ["AHA Guidelines 2023", "ESC Guidelines"], "suggestedActions": ["Diet consultation", "Exercise program", "Medication review"], "relatedConditions": ["Hypertension", "Family History CVD"]}	active	pending	2025-11-17 16:46:50.171214
62	1	2	drug_interaction	Potential Drug Interaction Alert	Interaction detected between Metformin and newly prescribed medication. Monitor glucose levels closely and consider dosage adjustment.	high	t	0.92	{"references": ["Drug Interaction Database", "FDA Guidelines"], "suggestedActions": ["Monitor blood glucose", "Review medication timing", "Patient education"], "relatedConditions": ["Type 2 Diabetes", "Drug Interaction"]}	active	pending	2025-11-17 16:46:50.171214
63	1	1	treatment_suggestion	Hypertension Management Optimization	Current treatment plan shows good response. Consider adding lifestyle interventions to potentially reduce medication dependency.	low	f	0.78	{"references": ["JNC 8 Guidelines", "AHA Lifestyle Guidelines"], "suggestedActions": ["DASH diet counseling", "Regular exercise program", "Weight management"], "relatedConditions": ["Hypertension", "ACE Inhibitor Therapy"]}	active	pending	2025-11-17 16:46:50.171214
64	1	2	preventive_care	Diabetic Screening Recommendations	Patient due for annual diabetic complications screening. Schedule eye exam, foot examination, and kidney function tests.	medium	t	0.95	{"references": ["ADA Standards of Care", "Diabetic Complications Guidelines"], "suggestedActions": ["Ophthalmology referral", "Podiatry consultation", "Lab work: HbA1c, microalbumin"], "relatedConditions": ["Type 2 Diabetes", "Preventive Care"]}	active	pending	2025-11-17 16:46:50.171214
65	1	1	risk_alert	Medication Adherence Concern	AI analysis of prescription refill patterns suggests potential adherence issues. Patient may benefit from medication management support.	medium	t	0.73	{"references": ["Medication Adherence Guidelines", "Patient Education Resources"], "suggestedActions": ["Adherence counseling", "Pill organizer", "Follow-up call"], "relatedConditions": ["Medication Adherence", "Hypertension"]}	active	pending	2025-11-17 16:46:50.171214
66	1	1	risk_alert	Cardiovascular Risk Assessment	Based on recent blood pressure readings and family history, patient shows elevated cardiovascular risk factors. Consider lifestyle modifications and medication review.	medium	t	0.85	{"references": ["AHA Guidelines 2023", "ESC Guidelines"], "suggestedActions": ["Diet consultation", "Exercise program", "Medication review"], "relatedConditions": ["Hypertension", "Family History CVD"]}	active	pending	2025-11-17 16:48:07.7074
67	1	2	drug_interaction	Potential Drug Interaction Alert	Interaction detected between Metformin and newly prescribed medication. Monitor glucose levels closely and consider dosage adjustment.	high	t	0.92	{"references": ["Drug Interaction Database", "FDA Guidelines"], "suggestedActions": ["Monitor blood glucose", "Review medication timing", "Patient education"], "relatedConditions": ["Type 2 Diabetes", "Drug Interaction"]}	active	pending	2025-11-17 16:48:07.7074
68	1	1	treatment_suggestion	Hypertension Management Optimization	Current treatment plan shows good response. Consider adding lifestyle interventions to potentially reduce medication dependency.	low	f	0.78	{"references": ["JNC 8 Guidelines", "AHA Lifestyle Guidelines"], "suggestedActions": ["DASH diet counseling", "Regular exercise program", "Weight management"], "relatedConditions": ["Hypertension", "ACE Inhibitor Therapy"]}	active	pending	2025-11-17 16:48:07.7074
69	1	2	preventive_care	Diabetic Screening Recommendations	Patient due for annual diabetic complications screening. Schedule eye exam, foot examination, and kidney function tests.	medium	t	0.95	{"references": ["ADA Standards of Care", "Diabetic Complications Guidelines"], "suggestedActions": ["Ophthalmology referral", "Podiatry consultation", "Lab work: HbA1c, microalbumin"], "relatedConditions": ["Type 2 Diabetes", "Preventive Care"]}	active	pending	2025-11-17 16:48:07.7074
70	1	1	risk_alert	Medication Adherence Concern	AI analysis of prescription refill patterns suggests potential adherence issues. Patient may benefit from medication management support.	medium	t	0.73	{"references": ["Medication Adherence Guidelines", "Patient Education Resources"], "suggestedActions": ["Adherence counseling", "Pill organizer", "Follow-up call"], "relatedConditions": ["Medication Adherence", "Hypertension"]}	active	pending	2025-11-17 16:48:07.7074
71	1	1	risk_alert	Cardiovascular Risk Assessment	Based on recent blood pressure readings and family history, patient shows elevated cardiovascular risk factors. Consider lifestyle modifications and medication review.	medium	t	0.85	{"references": ["AHA Guidelines 2023", "ESC Guidelines"], "suggestedActions": ["Diet consultation", "Exercise program", "Medication review"], "relatedConditions": ["Hypertension", "Family History CVD"]}	active	pending	2025-11-17 16:50:58.077169
72	1	2	drug_interaction	Potential Drug Interaction Alert	Interaction detected between Metformin and newly prescribed medication. Monitor glucose levels closely and consider dosage adjustment.	high	t	0.92	{"references": ["Drug Interaction Database", "FDA Guidelines"], "suggestedActions": ["Monitor blood glucose", "Review medication timing", "Patient education"], "relatedConditions": ["Type 2 Diabetes", "Drug Interaction"]}	active	pending	2025-11-17 16:50:58.077169
73	1	1	treatment_suggestion	Hypertension Management Optimization	Current treatment plan shows good response. Consider adding lifestyle interventions to potentially reduce medication dependency.	low	f	0.78	{"references": ["JNC 8 Guidelines", "AHA Lifestyle Guidelines"], "suggestedActions": ["DASH diet counseling", "Regular exercise program", "Weight management"], "relatedConditions": ["Hypertension", "ACE Inhibitor Therapy"]}	active	pending	2025-11-17 16:50:58.077169
74	1	2	preventive_care	Diabetic Screening Recommendations	Patient due for annual diabetic complications screening. Schedule eye exam, foot examination, and kidney function tests.	medium	t	0.95	{"references": ["ADA Standards of Care", "Diabetic Complications Guidelines"], "suggestedActions": ["Ophthalmology referral", "Podiatry consultation", "Lab work: HbA1c, microalbumin"], "relatedConditions": ["Type 2 Diabetes", "Preventive Care"]}	active	pending	2025-11-17 16:50:58.077169
75	1	1	risk_alert	Medication Adherence Concern	AI analysis of prescription refill patterns suggests potential adherence issues. Patient may benefit from medication management support.	medium	t	0.73	{"references": ["Medication Adherence Guidelines", "Patient Education Resources"], "suggestedActions": ["Adherence counseling", "Pill organizer", "Follow-up call"], "relatedConditions": ["Medication Adherence", "Hypertension"]}	active	pending	2025-11-17 16:50:58.077169
76	1	1	risk_alert	Cardiovascular Risk Assessment	Based on recent blood pressure readings and family history, patient shows elevated cardiovascular risk factors. Consider lifestyle modifications and medication review.	medium	t	0.85	{"references": ["AHA Guidelines 2023", "ESC Guidelines"], "suggestedActions": ["Diet consultation", "Exercise program", "Medication review"], "relatedConditions": ["Hypertension", "Family History CVD"]}	active	pending	2025-11-17 16:54:54.68871
77	1	2	drug_interaction	Potential Drug Interaction Alert	Interaction detected between Metformin and newly prescribed medication. Monitor glucose levels closely and consider dosage adjustment.	high	t	0.92	{"references": ["Drug Interaction Database", "FDA Guidelines"], "suggestedActions": ["Monitor blood glucose", "Review medication timing", "Patient education"], "relatedConditions": ["Type 2 Diabetes", "Drug Interaction"]}	active	pending	2025-11-17 16:54:54.68871
78	1	1	treatment_suggestion	Hypertension Management Optimization	Current treatment plan shows good response. Consider adding lifestyle interventions to potentially reduce medication dependency.	low	f	0.78	{"references": ["JNC 8 Guidelines", "AHA Lifestyle Guidelines"], "suggestedActions": ["DASH diet counseling", "Regular exercise program", "Weight management"], "relatedConditions": ["Hypertension", "ACE Inhibitor Therapy"]}	active	pending	2025-11-17 16:54:54.68871
79	1	2	preventive_care	Diabetic Screening Recommendations	Patient due for annual diabetic complications screening. Schedule eye exam, foot examination, and kidney function tests.	medium	t	0.95	{"references": ["ADA Standards of Care", "Diabetic Complications Guidelines"], "suggestedActions": ["Ophthalmology referral", "Podiatry consultation", "Lab work: HbA1c, microalbumin"], "relatedConditions": ["Type 2 Diabetes", "Preventive Care"]}	active	pending	2025-11-17 16:54:54.68871
80	1	1	risk_alert	Medication Adherence Concern	AI analysis of prescription refill patterns suggests potential adherence issues. Patient may benefit from medication management support.	medium	t	0.73	{"references": ["Medication Adherence Guidelines", "Patient Education Resources"], "suggestedActions": ["Adherence counseling", "Pill organizer", "Follow-up call"], "relatedConditions": ["Medication Adherence", "Hypertension"]}	active	pending	2025-11-17 16:54:54.68871
81	1	1	risk_alert	Cardiovascular Risk Assessment	Based on recent blood pressure readings and family history, patient shows elevated cardiovascular risk factors. Consider lifestyle modifications and medication review.	medium	t	0.85	{"references": ["AHA Guidelines 2023", "ESC Guidelines"], "suggestedActions": ["Diet consultation", "Exercise program", "Medication review"], "relatedConditions": ["Hypertension", "Family History CVD"]}	active	pending	2025-11-17 17:04:31.273383
82	1	2	drug_interaction	Potential Drug Interaction Alert	Interaction detected between Metformin and newly prescribed medication. Monitor glucose levels closely and consider dosage adjustment.	high	t	0.92	{"references": ["Drug Interaction Database", "FDA Guidelines"], "suggestedActions": ["Monitor blood glucose", "Review medication timing", "Patient education"], "relatedConditions": ["Type 2 Diabetes", "Drug Interaction"]}	active	pending	2025-11-17 17:04:31.273383
83	1	1	treatment_suggestion	Hypertension Management Optimization	Current treatment plan shows good response. Consider adding lifestyle interventions to potentially reduce medication dependency.	low	f	0.78	{"references": ["JNC 8 Guidelines", "AHA Lifestyle Guidelines"], "suggestedActions": ["DASH diet counseling", "Regular exercise program", "Weight management"], "relatedConditions": ["Hypertension", "ACE Inhibitor Therapy"]}	active	pending	2025-11-17 17:04:31.273383
84	1	2	preventive_care	Diabetic Screening Recommendations	Patient due for annual diabetic complications screening. Schedule eye exam, foot examination, and kidney function tests.	medium	t	0.95	{"references": ["ADA Standards of Care", "Diabetic Complications Guidelines"], "suggestedActions": ["Ophthalmology referral", "Podiatry consultation", "Lab work: HbA1c, microalbumin"], "relatedConditions": ["Type 2 Diabetes", "Preventive Care"]}	active	pending	2025-11-17 17:04:31.273383
85	1	1	risk_alert	Medication Adherence Concern	AI analysis of prescription refill patterns suggests potential adherence issues. Patient may benefit from medication management support.	medium	t	0.73	{"references": ["Medication Adherence Guidelines", "Patient Education Resources"], "suggestedActions": ["Adherence counseling", "Pill organizer", "Follow-up call"], "relatedConditions": ["Medication Adherence", "Hypertension"]}	active	pending	2025-11-17 17:04:31.273383
86	1	1	risk_alert	Cardiovascular Risk Assessment	Based on recent blood pressure readings and family history, patient shows elevated cardiovascular risk factors. Consider lifestyle modifications and medication review.	medium	t	0.85	{"references": ["AHA Guidelines 2023", "ESC Guidelines"], "suggestedActions": ["Diet consultation", "Exercise program", "Medication review"], "relatedConditions": ["Hypertension", "Family History CVD"]}	active	pending	2025-11-17 17:06:04.299665
87	1	2	drug_interaction	Potential Drug Interaction Alert	Interaction detected between Metformin and newly prescribed medication. Monitor glucose levels closely and consider dosage adjustment.	high	t	0.92	{"references": ["Drug Interaction Database", "FDA Guidelines"], "suggestedActions": ["Monitor blood glucose", "Review medication timing", "Patient education"], "relatedConditions": ["Type 2 Diabetes", "Drug Interaction"]}	active	pending	2025-11-17 17:06:04.299665
88	1	1	treatment_suggestion	Hypertension Management Optimization	Current treatment plan shows good response. Consider adding lifestyle interventions to potentially reduce medication dependency.	low	f	0.78	{"references": ["JNC 8 Guidelines", "AHA Lifestyle Guidelines"], "suggestedActions": ["DASH diet counseling", "Regular exercise program", "Weight management"], "relatedConditions": ["Hypertension", "ACE Inhibitor Therapy"]}	active	pending	2025-11-17 17:06:04.299665
89	1	2	preventive_care	Diabetic Screening Recommendations	Patient due for annual diabetic complications screening. Schedule eye exam, foot examination, and kidney function tests.	medium	t	0.95	{"references": ["ADA Standards of Care", "Diabetic Complications Guidelines"], "suggestedActions": ["Ophthalmology referral", "Podiatry consultation", "Lab work: HbA1c, microalbumin"], "relatedConditions": ["Type 2 Diabetes", "Preventive Care"]}	active	pending	2025-11-17 17:06:04.299665
90	1	1	risk_alert	Medication Adherence Concern	AI analysis of prescription refill patterns suggests potential adherence issues. Patient may benefit from medication management support.	medium	t	0.73	{"references": ["Medication Adherence Guidelines", "Patient Education Resources"], "suggestedActions": ["Adherence counseling", "Pill organizer", "Follow-up call"], "relatedConditions": ["Medication Adherence", "Hypertension"]}	active	pending	2025-11-17 17:06:04.299665
91	1	1	risk_alert	Cardiovascular Risk Assessment	Based on recent blood pressure readings and family history, patient shows elevated cardiovascular risk factors. Consider lifestyle modifications and medication review.	medium	t	0.85	{"references": ["AHA Guidelines 2023", "ESC Guidelines"], "suggestedActions": ["Diet consultation", "Exercise program", "Medication review"], "relatedConditions": ["Hypertension", "Family History CVD"]}	active	pending	2025-11-17 17:09:04.395361
92	1	2	drug_interaction	Potential Drug Interaction Alert	Interaction detected between Metformin and newly prescribed medication. Monitor glucose levels closely and consider dosage adjustment.	high	t	0.92	{"references": ["Drug Interaction Database", "FDA Guidelines"], "suggestedActions": ["Monitor blood glucose", "Review medication timing", "Patient education"], "relatedConditions": ["Type 2 Diabetes", "Drug Interaction"]}	active	pending	2025-11-17 17:09:04.395361
93	1	1	treatment_suggestion	Hypertension Management Optimization	Current treatment plan shows good response. Consider adding lifestyle interventions to potentially reduce medication dependency.	low	f	0.78	{"references": ["JNC 8 Guidelines", "AHA Lifestyle Guidelines"], "suggestedActions": ["DASH diet counseling", "Regular exercise program", "Weight management"], "relatedConditions": ["Hypertension", "ACE Inhibitor Therapy"]}	active	pending	2025-11-17 17:09:04.395361
94	1	2	preventive_care	Diabetic Screening Recommendations	Patient due for annual diabetic complications screening. Schedule eye exam, foot examination, and kidney function tests.	medium	t	0.95	{"references": ["ADA Standards of Care", "Diabetic Complications Guidelines"], "suggestedActions": ["Ophthalmology referral", "Podiatry consultation", "Lab work: HbA1c, microalbumin"], "relatedConditions": ["Type 2 Diabetes", "Preventive Care"]}	active	pending	2025-11-17 17:09:04.395361
95	1	1	risk_alert	Medication Adherence Concern	AI analysis of prescription refill patterns suggests potential adherence issues. Patient may benefit from medication management support.	medium	t	0.73	{"references": ["Medication Adherence Guidelines", "Patient Education Resources"], "suggestedActions": ["Adherence counseling", "Pill organizer", "Follow-up call"], "relatedConditions": ["Medication Adherence", "Hypertension"]}	active	pending	2025-11-17 17:09:04.395361
96	1	1	risk_alert	Cardiovascular Risk Assessment	Based on recent blood pressure readings and family history, patient shows elevated cardiovascular risk factors. Consider lifestyle modifications and medication review.	medium	t	0.85	{"references": ["AHA Guidelines 2023", "ESC Guidelines"], "suggestedActions": ["Diet consultation", "Exercise program", "Medication review"], "relatedConditions": ["Hypertension", "Family History CVD"]}	active	pending	2025-11-17 17:12:52.389271
97	1	2	drug_interaction	Potential Drug Interaction Alert	Interaction detected between Metformin and newly prescribed medication. Monitor glucose levels closely and consider dosage adjustment.	high	t	0.92	{"references": ["Drug Interaction Database", "FDA Guidelines"], "suggestedActions": ["Monitor blood glucose", "Review medication timing", "Patient education"], "relatedConditions": ["Type 2 Diabetes", "Drug Interaction"]}	active	pending	2025-11-17 17:12:52.389271
98	1	1	treatment_suggestion	Hypertension Management Optimization	Current treatment plan shows good response. Consider adding lifestyle interventions to potentially reduce medication dependency.	low	f	0.78	{"references": ["JNC 8 Guidelines", "AHA Lifestyle Guidelines"], "suggestedActions": ["DASH diet counseling", "Regular exercise program", "Weight management"], "relatedConditions": ["Hypertension", "ACE Inhibitor Therapy"]}	active	pending	2025-11-17 17:12:52.389271
99	1	2	preventive_care	Diabetic Screening Recommendations	Patient due for annual diabetic complications screening. Schedule eye exam, foot examination, and kidney function tests.	medium	t	0.95	{"references": ["ADA Standards of Care", "Diabetic Complications Guidelines"], "suggestedActions": ["Ophthalmology referral", "Podiatry consultation", "Lab work: HbA1c, microalbumin"], "relatedConditions": ["Type 2 Diabetes", "Preventive Care"]}	active	pending	2025-11-17 17:12:52.389271
100	1	1	risk_alert	Medication Adherence Concern	AI analysis of prescription refill patterns suggests potential adherence issues. Patient may benefit from medication management support.	medium	t	0.73	{"references": ["Medication Adherence Guidelines", "Patient Education Resources"], "suggestedActions": ["Adherence counseling", "Pill organizer", "Follow-up call"], "relatedConditions": ["Medication Adherence", "Hypertension"]}	active	pending	2025-11-17 17:12:52.389271
101	1	1	risk_alert	Cardiovascular Risk Assessment	Based on recent blood pressure readings and family history, patient shows elevated cardiovascular risk factors. Consider lifestyle modifications and medication review.	medium	t	0.85	{"references": ["AHA Guidelines 2023", "ESC Guidelines"], "suggestedActions": ["Diet consultation", "Exercise program", "Medication review"], "relatedConditions": ["Hypertension", "Family History CVD"]}	active	pending	2025-11-17 17:13:34.944049
102	1	2	drug_interaction	Potential Drug Interaction Alert	Interaction detected between Metformin and newly prescribed medication. Monitor glucose levels closely and consider dosage adjustment.	high	t	0.92	{"references": ["Drug Interaction Database", "FDA Guidelines"], "suggestedActions": ["Monitor blood glucose", "Review medication timing", "Patient education"], "relatedConditions": ["Type 2 Diabetes", "Drug Interaction"]}	active	pending	2025-11-17 17:13:34.944049
103	1	1	treatment_suggestion	Hypertension Management Optimization	Current treatment plan shows good response. Consider adding lifestyle interventions to potentially reduce medication dependency.	low	f	0.78	{"references": ["JNC 8 Guidelines", "AHA Lifestyle Guidelines"], "suggestedActions": ["DASH diet counseling", "Regular exercise program", "Weight management"], "relatedConditions": ["Hypertension", "ACE Inhibitor Therapy"]}	active	pending	2025-11-17 17:13:34.944049
104	1	2	preventive_care	Diabetic Screening Recommendations	Patient due for annual diabetic complications screening. Schedule eye exam, foot examination, and kidney function tests.	medium	t	0.95	{"references": ["ADA Standards of Care", "Diabetic Complications Guidelines"], "suggestedActions": ["Ophthalmology referral", "Podiatry consultation", "Lab work: HbA1c, microalbumin"], "relatedConditions": ["Type 2 Diabetes", "Preventive Care"]}	active	pending	2025-11-17 17:13:34.944049
105	1	1	risk_alert	Medication Adherence Concern	AI analysis of prescription refill patterns suggests potential adherence issues. Patient may benefit from medication management support.	medium	t	0.73	{"references": ["Medication Adherence Guidelines", "Patient Education Resources"], "suggestedActions": ["Adherence counseling", "Pill organizer", "Follow-up call"], "relatedConditions": ["Medication Adherence", "Hypertension"]}	active	pending	2025-11-17 17:13:34.944049
106	1	1	risk_alert	Cardiovascular Risk Assessment	Based on recent blood pressure readings and family history, patient shows elevated cardiovascular risk factors. Consider lifestyle modifications and medication review.	medium	t	0.85	{"references": ["AHA Guidelines 2023", "ESC Guidelines"], "suggestedActions": ["Diet consultation", "Exercise program", "Medication review"], "relatedConditions": ["Hypertension", "Family History CVD"]}	active	pending	2025-11-17 17:35:24.034578
107	1	2	drug_interaction	Potential Drug Interaction Alert	Interaction detected between Metformin and newly prescribed medication. Monitor glucose levels closely and consider dosage adjustment.	high	t	0.92	{"references": ["Drug Interaction Database", "FDA Guidelines"], "suggestedActions": ["Monitor blood glucose", "Review medication timing", "Patient education"], "relatedConditions": ["Type 2 Diabetes", "Drug Interaction"]}	active	pending	2025-11-17 17:35:24.034578
108	1	1	treatment_suggestion	Hypertension Management Optimization	Current treatment plan shows good response. Consider adding lifestyle interventions to potentially reduce medication dependency.	low	f	0.78	{"references": ["JNC 8 Guidelines", "AHA Lifestyle Guidelines"], "suggestedActions": ["DASH diet counseling", "Regular exercise program", "Weight management"], "relatedConditions": ["Hypertension", "ACE Inhibitor Therapy"]}	active	pending	2025-11-17 17:35:24.034578
109	1	2	preventive_care	Diabetic Screening Recommendations	Patient due for annual diabetic complications screening. Schedule eye exam, foot examination, and kidney function tests.	medium	t	0.95	{"references": ["ADA Standards of Care", "Diabetic Complications Guidelines"], "suggestedActions": ["Ophthalmology referral", "Podiatry consultation", "Lab work: HbA1c, microalbumin"], "relatedConditions": ["Type 2 Diabetes", "Preventive Care"]}	active	pending	2025-11-17 17:35:24.034578
110	1	1	risk_alert	Medication Adherence Concern	AI analysis of prescription refill patterns suggests potential adherence issues. Patient may benefit from medication management support.	medium	t	0.73	{"references": ["Medication Adherence Guidelines", "Patient Education Resources"], "suggestedActions": ["Adherence counseling", "Pill organizer", "Follow-up call"], "relatedConditions": ["Medication Adherence", "Hypertension"]}	active	pending	2025-11-17 17:35:24.034578
111	1	1	risk_alert	Cardiovascular Risk Assessment	Based on recent blood pressure readings and family history, patient shows elevated cardiovascular risk factors. Consider lifestyle modifications and medication review.	medium	t	0.85	{"references": ["AHA Guidelines 2023", "ESC Guidelines"], "suggestedActions": ["Diet consultation", "Exercise program", "Medication review"], "relatedConditions": ["Hypertension", "Family History CVD"]}	active	pending	2025-11-17 17:57:37.084479
112	1	2	drug_interaction	Potential Drug Interaction Alert	Interaction detected between Metformin and newly prescribed medication. Monitor glucose levels closely and consider dosage adjustment.	high	t	0.92	{"references": ["Drug Interaction Database", "FDA Guidelines"], "suggestedActions": ["Monitor blood glucose", "Review medication timing", "Patient education"], "relatedConditions": ["Type 2 Diabetes", "Drug Interaction"]}	active	pending	2025-11-17 17:57:37.084479
113	1	1	treatment_suggestion	Hypertension Management Optimization	Current treatment plan shows good response. Consider adding lifestyle interventions to potentially reduce medication dependency.	low	f	0.78	{"references": ["JNC 8 Guidelines", "AHA Lifestyle Guidelines"], "suggestedActions": ["DASH diet counseling", "Regular exercise program", "Weight management"], "relatedConditions": ["Hypertension", "ACE Inhibitor Therapy"]}	active	pending	2025-11-17 17:57:37.084479
114	1	2	preventive_care	Diabetic Screening Recommendations	Patient due for annual diabetic complications screening. Schedule eye exam, foot examination, and kidney function tests.	medium	t	0.95	{"references": ["ADA Standards of Care", "Diabetic Complications Guidelines"], "suggestedActions": ["Ophthalmology referral", "Podiatry consultation", "Lab work: HbA1c, microalbumin"], "relatedConditions": ["Type 2 Diabetes", "Preventive Care"]}	active	pending	2025-11-17 17:57:37.084479
115	1	1	risk_alert	Medication Adherence Concern	AI analysis of prescription refill patterns suggests potential adherence issues. Patient may benefit from medication management support.	medium	t	0.73	{"references": ["Medication Adherence Guidelines", "Patient Education Resources"], "suggestedActions": ["Adherence counseling", "Pill organizer", "Follow-up call"], "relatedConditions": ["Medication Adherence", "Hypertension"]}	active	pending	2025-11-17 17:57:37.084479
116	1	1	risk_alert	Cardiovascular Risk Assessment	Based on recent blood pressure readings and family history, patient shows elevated cardiovascular risk factors. Consider lifestyle modifications and medication review.	medium	t	0.85	{"references": ["AHA Guidelines 2023", "ESC Guidelines"], "suggestedActions": ["Diet consultation", "Exercise program", "Medication review"], "relatedConditions": ["Hypertension", "Family History CVD"]}	active	pending	2025-11-17 18:12:14.392313
117	1	2	drug_interaction	Potential Drug Interaction Alert	Interaction detected between Metformin and newly prescribed medication. Monitor glucose levels closely and consider dosage adjustment.	high	t	0.92	{"references": ["Drug Interaction Database", "FDA Guidelines"], "suggestedActions": ["Monitor blood glucose", "Review medication timing", "Patient education"], "relatedConditions": ["Type 2 Diabetes", "Drug Interaction"]}	active	pending	2025-11-17 18:12:14.392313
118	1	1	treatment_suggestion	Hypertension Management Optimization	Current treatment plan shows good response. Consider adding lifestyle interventions to potentially reduce medication dependency.	low	f	0.78	{"references": ["JNC 8 Guidelines", "AHA Lifestyle Guidelines"], "suggestedActions": ["DASH diet counseling", "Regular exercise program", "Weight management"], "relatedConditions": ["Hypertension", "ACE Inhibitor Therapy"]}	active	pending	2025-11-17 18:12:14.392313
119	1	2	preventive_care	Diabetic Screening Recommendations	Patient due for annual diabetic complications screening. Schedule eye exam, foot examination, and kidney function tests.	medium	t	0.95	{"references": ["ADA Standards of Care", "Diabetic Complications Guidelines"], "suggestedActions": ["Ophthalmology referral", "Podiatry consultation", "Lab work: HbA1c, microalbumin"], "relatedConditions": ["Type 2 Diabetes", "Preventive Care"]}	active	pending	2025-11-17 18:12:14.392313
120	1	1	risk_alert	Medication Adherence Concern	AI analysis of prescription refill patterns suggests potential adherence issues. Patient may benefit from medication management support.	medium	t	0.73	{"references": ["Medication Adherence Guidelines", "Patient Education Resources"], "suggestedActions": ["Adherence counseling", "Pill organizer", "Follow-up call"], "relatedConditions": ["Medication Adherence", "Hypertension"]}	active	pending	2025-11-17 18:12:14.392313
121	1	1	risk_alert	Cardiovascular Risk Assessment	Based on recent blood pressure readings and family history, patient shows elevated cardiovascular risk factors. Consider lifestyle modifications and medication review.	medium	t	0.85	{"references": ["AHA Guidelines 2023", "ESC Guidelines"], "suggestedActions": ["Diet consultation", "Exercise program", "Medication review"], "relatedConditions": ["Hypertension", "Family History CVD"]}	active	pending	2025-11-17 18:25:39.415411
122	1	2	drug_interaction	Potential Drug Interaction Alert	Interaction detected between Metformin and newly prescribed medication. Monitor glucose levels closely and consider dosage adjustment.	high	t	0.92	{"references": ["Drug Interaction Database", "FDA Guidelines"], "suggestedActions": ["Monitor blood glucose", "Review medication timing", "Patient education"], "relatedConditions": ["Type 2 Diabetes", "Drug Interaction"]}	active	pending	2025-11-17 18:25:39.415411
123	1	1	treatment_suggestion	Hypertension Management Optimization	Current treatment plan shows good response. Consider adding lifestyle interventions to potentially reduce medication dependency.	low	f	0.78	{"references": ["JNC 8 Guidelines", "AHA Lifestyle Guidelines"], "suggestedActions": ["DASH diet counseling", "Regular exercise program", "Weight management"], "relatedConditions": ["Hypertension", "ACE Inhibitor Therapy"]}	active	pending	2025-11-17 18:25:39.415411
124	1	2	preventive_care	Diabetic Screening Recommendations	Patient due for annual diabetic complications screening. Schedule eye exam, foot examination, and kidney function tests.	medium	t	0.95	{"references": ["ADA Standards of Care", "Diabetic Complications Guidelines"], "suggestedActions": ["Ophthalmology referral", "Podiatry consultation", "Lab work: HbA1c, microalbumin"], "relatedConditions": ["Type 2 Diabetes", "Preventive Care"]}	active	pending	2025-11-17 18:25:39.415411
125	1	1	risk_alert	Medication Adherence Concern	AI analysis of prescription refill patterns suggests potential adherence issues. Patient may benefit from medication management support.	medium	t	0.73	{"references": ["Medication Adherence Guidelines", "Patient Education Resources"], "suggestedActions": ["Adherence counseling", "Pill organizer", "Follow-up call"], "relatedConditions": ["Medication Adherence", "Hypertension"]}	active	pending	2025-11-17 18:25:39.415411
126	1	1	risk_alert	Cardiovascular Risk Assessment	Based on recent blood pressure readings and family history, patient shows elevated cardiovascular risk factors. Consider lifestyle modifications and medication review.	medium	t	0.85	{"references": ["AHA Guidelines 2023", "ESC Guidelines"], "suggestedActions": ["Diet consultation", "Exercise program", "Medication review"], "relatedConditions": ["Hypertension", "Family History CVD"]}	active	pending	2025-11-17 18:26:55.271689
127	1	2	drug_interaction	Potential Drug Interaction Alert	Interaction detected between Metformin and newly prescribed medication. Monitor glucose levels closely and consider dosage adjustment.	high	t	0.92	{"references": ["Drug Interaction Database", "FDA Guidelines"], "suggestedActions": ["Monitor blood glucose", "Review medication timing", "Patient education"], "relatedConditions": ["Type 2 Diabetes", "Drug Interaction"]}	active	pending	2025-11-17 18:26:55.271689
128	1	1	treatment_suggestion	Hypertension Management Optimization	Current treatment plan shows good response. Consider adding lifestyle interventions to potentially reduce medication dependency.	low	f	0.78	{"references": ["JNC 8 Guidelines", "AHA Lifestyle Guidelines"], "suggestedActions": ["DASH diet counseling", "Regular exercise program", "Weight management"], "relatedConditions": ["Hypertension", "ACE Inhibitor Therapy"]}	active	pending	2025-11-17 18:26:55.271689
129	1	2	preventive_care	Diabetic Screening Recommendations	Patient due for annual diabetic complications screening. Schedule eye exam, foot examination, and kidney function tests.	medium	t	0.95	{"references": ["ADA Standards of Care", "Diabetic Complications Guidelines"], "suggestedActions": ["Ophthalmology referral", "Podiatry consultation", "Lab work: HbA1c, microalbumin"], "relatedConditions": ["Type 2 Diabetes", "Preventive Care"]}	active	pending	2025-11-17 18:26:55.271689
130	1	1	risk_alert	Medication Adherence Concern	AI analysis of prescription refill patterns suggests potential adherence issues. Patient may benefit from medication management support.	medium	t	0.73	{"references": ["Medication Adherence Guidelines", "Patient Education Resources"], "suggestedActions": ["Adherence counseling", "Pill organizer", "Follow-up call"], "relatedConditions": ["Medication Adherence", "Hypertension"]}	active	pending	2025-11-17 18:26:55.271689
131	1	1	risk_alert	Cardiovascular Risk Assessment	Based on recent blood pressure readings and family history, patient shows elevated cardiovascular risk factors. Consider lifestyle modifications and medication review.	medium	t	0.85	{"references": ["AHA Guidelines 2023", "ESC Guidelines"], "suggestedActions": ["Diet consultation", "Exercise program", "Medication review"], "relatedConditions": ["Hypertension", "Family History CVD"]}	active	pending	2025-11-17 18:40:41.249615
132	1	2	drug_interaction	Potential Drug Interaction Alert	Interaction detected between Metformin and newly prescribed medication. Monitor glucose levels closely and consider dosage adjustment.	high	t	0.92	{"references": ["Drug Interaction Database", "FDA Guidelines"], "suggestedActions": ["Monitor blood glucose", "Review medication timing", "Patient education"], "relatedConditions": ["Type 2 Diabetes", "Drug Interaction"]}	active	pending	2025-11-17 18:40:41.249615
133	1	1	treatment_suggestion	Hypertension Management Optimization	Current treatment plan shows good response. Consider adding lifestyle interventions to potentially reduce medication dependency.	low	f	0.78	{"references": ["JNC 8 Guidelines", "AHA Lifestyle Guidelines"], "suggestedActions": ["DASH diet counseling", "Regular exercise program", "Weight management"], "relatedConditions": ["Hypertension", "ACE Inhibitor Therapy"]}	active	pending	2025-11-17 18:40:41.249615
134	1	2	preventive_care	Diabetic Screening Recommendations	Patient due for annual diabetic complications screening. Schedule eye exam, foot examination, and kidney function tests.	medium	t	0.95	{"references": ["ADA Standards of Care", "Diabetic Complications Guidelines"], "suggestedActions": ["Ophthalmology referral", "Podiatry consultation", "Lab work: HbA1c, microalbumin"], "relatedConditions": ["Type 2 Diabetes", "Preventive Care"]}	active	pending	2025-11-17 18:40:41.249615
135	1	1	risk_alert	Medication Adherence Concern	AI analysis of prescription refill patterns suggests potential adherence issues. Patient may benefit from medication management support.	medium	t	0.73	{"references": ["Medication Adherence Guidelines", "Patient Education Resources"], "suggestedActions": ["Adherence counseling", "Pill organizer", "Follow-up call"], "relatedConditions": ["Medication Adherence", "Hypertension"]}	active	pending	2025-11-17 18:40:41.249615
136	1	1	risk_alert	Cardiovascular Risk Assessment	Based on recent blood pressure readings and family history, patient shows elevated cardiovascular risk factors. Consider lifestyle modifications and medication review.	medium	t	0.85	{"references": ["AHA Guidelines 2023", "ESC Guidelines"], "suggestedActions": ["Diet consultation", "Exercise program", "Medication review"], "relatedConditions": ["Hypertension", "Family History CVD"]}	active	pending	2025-11-17 18:41:20.199527
137	1	2	drug_interaction	Potential Drug Interaction Alert	Interaction detected between Metformin and newly prescribed medication. Monitor glucose levels closely and consider dosage adjustment.	high	t	0.92	{"references": ["Drug Interaction Database", "FDA Guidelines"], "suggestedActions": ["Monitor blood glucose", "Review medication timing", "Patient education"], "relatedConditions": ["Type 2 Diabetes", "Drug Interaction"]}	active	pending	2025-11-17 18:41:20.199527
138	1	1	treatment_suggestion	Hypertension Management Optimization	Current treatment plan shows good response. Consider adding lifestyle interventions to potentially reduce medication dependency.	low	f	0.78	{"references": ["JNC 8 Guidelines", "AHA Lifestyle Guidelines"], "suggestedActions": ["DASH diet counseling", "Regular exercise program", "Weight management"], "relatedConditions": ["Hypertension", "ACE Inhibitor Therapy"]}	active	pending	2025-11-17 18:41:20.199527
139	1	2	preventive_care	Diabetic Screening Recommendations	Patient due for annual diabetic complications screening. Schedule eye exam, foot examination, and kidney function tests.	medium	t	0.95	{"references": ["ADA Standards of Care", "Diabetic Complications Guidelines"], "suggestedActions": ["Ophthalmology referral", "Podiatry consultation", "Lab work: HbA1c, microalbumin"], "relatedConditions": ["Type 2 Diabetes", "Preventive Care"]}	active	pending	2025-11-17 18:41:20.199527
140	1	1	risk_alert	Medication Adherence Concern	AI analysis of prescription refill patterns suggests potential adherence issues. Patient may benefit from medication management support.	medium	t	0.73	{"references": ["Medication Adherence Guidelines", "Patient Education Resources"], "suggestedActions": ["Adherence counseling", "Pill organizer", "Follow-up call"], "relatedConditions": ["Medication Adherence", "Hypertension"]}	active	pending	2025-11-17 18:41:20.199527
141	1	1	risk_alert	Cardiovascular Risk Assessment	Based on recent blood pressure readings and family history, patient shows elevated cardiovascular risk factors. Consider lifestyle modifications and medication review.	medium	t	0.85	{"references": ["AHA Guidelines 2023", "ESC Guidelines"], "suggestedActions": ["Diet consultation", "Exercise program", "Medication review"], "relatedConditions": ["Hypertension", "Family History CVD"]}	active	pending	2025-11-17 18:50:38.360299
142	1	2	drug_interaction	Potential Drug Interaction Alert	Interaction detected between Metformin and newly prescribed medication. Monitor glucose levels closely and consider dosage adjustment.	high	t	0.92	{"references": ["Drug Interaction Database", "FDA Guidelines"], "suggestedActions": ["Monitor blood glucose", "Review medication timing", "Patient education"], "relatedConditions": ["Type 2 Diabetes", "Drug Interaction"]}	active	pending	2025-11-17 18:50:38.360299
143	1	1	treatment_suggestion	Hypertension Management Optimization	Current treatment plan shows good response. Consider adding lifestyle interventions to potentially reduce medication dependency.	low	f	0.78	{"references": ["JNC 8 Guidelines", "AHA Lifestyle Guidelines"], "suggestedActions": ["DASH diet counseling", "Regular exercise program", "Weight management"], "relatedConditions": ["Hypertension", "ACE Inhibitor Therapy"]}	active	pending	2025-11-17 18:50:38.360299
144	1	2	preventive_care	Diabetic Screening Recommendations	Patient due for annual diabetic complications screening. Schedule eye exam, foot examination, and kidney function tests.	medium	t	0.95	{"references": ["ADA Standards of Care", "Diabetic Complications Guidelines"], "suggestedActions": ["Ophthalmology referral", "Podiatry consultation", "Lab work: HbA1c, microalbumin"], "relatedConditions": ["Type 2 Diabetes", "Preventive Care"]}	active	pending	2025-11-17 18:50:38.360299
145	1	1	risk_alert	Medication Adherence Concern	AI analysis of prescription refill patterns suggests potential adherence issues. Patient may benefit from medication management support.	medium	t	0.73	{"references": ["Medication Adherence Guidelines", "Patient Education Resources"], "suggestedActions": ["Adherence counseling", "Pill organizer", "Follow-up call"], "relatedConditions": ["Medication Adherence", "Hypertension"]}	active	pending	2025-11-17 18:50:38.360299
146	1	1	risk_alert	Cardiovascular Risk Assessment	Based on recent blood pressure readings and family history, patient shows elevated cardiovascular risk factors. Consider lifestyle modifications and medication review.	medium	t	0.85	{"references": ["AHA Guidelines 2023", "ESC Guidelines"], "suggestedActions": ["Diet consultation", "Exercise program", "Medication review"], "relatedConditions": ["Hypertension", "Family History CVD"]}	active	pending	2025-11-17 19:00:00.934805
147	1	2	drug_interaction	Potential Drug Interaction Alert	Interaction detected between Metformin and newly prescribed medication. Monitor glucose levels closely and consider dosage adjustment.	high	t	0.92	{"references": ["Drug Interaction Database", "FDA Guidelines"], "suggestedActions": ["Monitor blood glucose", "Review medication timing", "Patient education"], "relatedConditions": ["Type 2 Diabetes", "Drug Interaction"]}	active	pending	2025-11-17 19:00:00.934805
148	1	1	treatment_suggestion	Hypertension Management Optimization	Current treatment plan shows good response. Consider adding lifestyle interventions to potentially reduce medication dependency.	low	f	0.78	{"references": ["JNC 8 Guidelines", "AHA Lifestyle Guidelines"], "suggestedActions": ["DASH diet counseling", "Regular exercise program", "Weight management"], "relatedConditions": ["Hypertension", "ACE Inhibitor Therapy"]}	active	pending	2025-11-17 19:00:00.934805
149	1	2	preventive_care	Diabetic Screening Recommendations	Patient due for annual diabetic complications screening. Schedule eye exam, foot examination, and kidney function tests.	medium	t	0.95	{"references": ["ADA Standards of Care", "Diabetic Complications Guidelines"], "suggestedActions": ["Ophthalmology referral", "Podiatry consultation", "Lab work: HbA1c, microalbumin"], "relatedConditions": ["Type 2 Diabetes", "Preventive Care"]}	active	pending	2025-11-17 19:00:00.934805
150	1	1	risk_alert	Medication Adherence Concern	AI analysis of prescription refill patterns suggests potential adherence issues. Patient may benefit from medication management support.	medium	t	0.73	{"references": ["Medication Adherence Guidelines", "Patient Education Resources"], "suggestedActions": ["Adherence counseling", "Pill organizer", "Follow-up call"], "relatedConditions": ["Medication Adherence", "Hypertension"]}	active	pending	2025-11-17 19:00:00.934805
151	1	1	risk_alert	Cardiovascular Risk Assessment	Based on recent blood pressure readings and family history, patient shows elevated cardiovascular risk factors. Consider lifestyle modifications and medication review.	medium	t	0.85	{"references": ["AHA Guidelines 2023", "ESC Guidelines"], "suggestedActions": ["Diet consultation", "Exercise program", "Medication review"], "relatedConditions": ["Hypertension", "Family History CVD"]}	active	pending	2025-11-17 19:02:41.608894
152	1	2	drug_interaction	Potential Drug Interaction Alert	Interaction detected between Metformin and newly prescribed medication. Monitor glucose levels closely and consider dosage adjustment.	high	t	0.92	{"references": ["Drug Interaction Database", "FDA Guidelines"], "suggestedActions": ["Monitor blood glucose", "Review medication timing", "Patient education"], "relatedConditions": ["Type 2 Diabetes", "Drug Interaction"]}	active	pending	2025-11-17 19:02:41.608894
153	1	1	treatment_suggestion	Hypertension Management Optimization	Current treatment plan shows good response. Consider adding lifestyle interventions to potentially reduce medication dependency.	low	f	0.78	{"references": ["JNC 8 Guidelines", "AHA Lifestyle Guidelines"], "suggestedActions": ["DASH diet counseling", "Regular exercise program", "Weight management"], "relatedConditions": ["Hypertension", "ACE Inhibitor Therapy"]}	active	pending	2025-11-17 19:02:41.608894
154	1	2	preventive_care	Diabetic Screening Recommendations	Patient due for annual diabetic complications screening. Schedule eye exam, foot examination, and kidney function tests.	medium	t	0.95	{"references": ["ADA Standards of Care", "Diabetic Complications Guidelines"], "suggestedActions": ["Ophthalmology referral", "Podiatry consultation", "Lab work: HbA1c, microalbumin"], "relatedConditions": ["Type 2 Diabetes", "Preventive Care"]}	active	pending	2025-11-17 19:02:41.608894
155	1	1	risk_alert	Medication Adherence Concern	AI analysis of prescription refill patterns suggests potential adherence issues. Patient may benefit from medication management support.	medium	t	0.73	{"references": ["Medication Adherence Guidelines", "Patient Education Resources"], "suggestedActions": ["Adherence counseling", "Pill organizer", "Follow-up call"], "relatedConditions": ["Medication Adherence", "Hypertension"]}	active	pending	2025-11-17 19:02:41.608894
156	1	1	risk_alert	Cardiovascular Risk Assessment	Based on recent blood pressure readings and family history, patient shows elevated cardiovascular risk factors. Consider lifestyle modifications and medication review.	medium	t	0.85	{"references": ["AHA Guidelines 2023", "ESC Guidelines"], "suggestedActions": ["Diet consultation", "Exercise program", "Medication review"], "relatedConditions": ["Hypertension", "Family History CVD"]}	active	pending	2025-11-17 19:12:01.705463
157	1	2	drug_interaction	Potential Drug Interaction Alert	Interaction detected between Metformin and newly prescribed medication. Monitor glucose levels closely and consider dosage adjustment.	high	t	0.92	{"references": ["Drug Interaction Database", "FDA Guidelines"], "suggestedActions": ["Monitor blood glucose", "Review medication timing", "Patient education"], "relatedConditions": ["Type 2 Diabetes", "Drug Interaction"]}	active	pending	2025-11-17 19:12:01.705463
158	1	1	treatment_suggestion	Hypertension Management Optimization	Current treatment plan shows good response. Consider adding lifestyle interventions to potentially reduce medication dependency.	low	f	0.78	{"references": ["JNC 8 Guidelines", "AHA Lifestyle Guidelines"], "suggestedActions": ["DASH diet counseling", "Regular exercise program", "Weight management"], "relatedConditions": ["Hypertension", "ACE Inhibitor Therapy"]}	active	pending	2025-11-17 19:12:01.705463
159	1	2	preventive_care	Diabetic Screening Recommendations	Patient due for annual diabetic complications screening. Schedule eye exam, foot examination, and kidney function tests.	medium	t	0.95	{"references": ["ADA Standards of Care", "Diabetic Complications Guidelines"], "suggestedActions": ["Ophthalmology referral", "Podiatry consultation", "Lab work: HbA1c, microalbumin"], "relatedConditions": ["Type 2 Diabetes", "Preventive Care"]}	active	pending	2025-11-17 19:12:01.705463
160	1	1	risk_alert	Medication Adherence Concern	AI analysis of prescription refill patterns suggests potential adherence issues. Patient may benefit from medication management support.	medium	t	0.73	{"references": ["Medication Adherence Guidelines", "Patient Education Resources"], "suggestedActions": ["Adherence counseling", "Pill organizer", "Follow-up call"], "relatedConditions": ["Medication Adherence", "Hypertension"]}	active	pending	2025-11-17 19:12:01.705463
161	1	1	risk_alert	Cardiovascular Risk Assessment	Based on recent blood pressure readings and family history, patient shows elevated cardiovascular risk factors. Consider lifestyle modifications and medication review.	medium	t	0.85	{"references": ["AHA Guidelines 2023", "ESC Guidelines"], "suggestedActions": ["Diet consultation", "Exercise program", "Medication review"], "relatedConditions": ["Hypertension", "Family History CVD"]}	active	pending	2025-11-17 19:12:37.455726
162	1	2	drug_interaction	Potential Drug Interaction Alert	Interaction detected between Metformin and newly prescribed medication. Monitor glucose levels closely and consider dosage adjustment.	high	t	0.92	{"references": ["Drug Interaction Database", "FDA Guidelines"], "suggestedActions": ["Monitor blood glucose", "Review medication timing", "Patient education"], "relatedConditions": ["Type 2 Diabetes", "Drug Interaction"]}	active	pending	2025-11-17 19:12:37.455726
163	1	1	treatment_suggestion	Hypertension Management Optimization	Current treatment plan shows good response. Consider adding lifestyle interventions to potentially reduce medication dependency.	low	f	0.78	{"references": ["JNC 8 Guidelines", "AHA Lifestyle Guidelines"], "suggestedActions": ["DASH diet counseling", "Regular exercise program", "Weight management"], "relatedConditions": ["Hypertension", "ACE Inhibitor Therapy"]}	active	pending	2025-11-17 19:12:37.455726
164	1	2	preventive_care	Diabetic Screening Recommendations	Patient due for annual diabetic complications screening. Schedule eye exam, foot examination, and kidney function tests.	medium	t	0.95	{"references": ["ADA Standards of Care", "Diabetic Complications Guidelines"], "suggestedActions": ["Ophthalmology referral", "Podiatry consultation", "Lab work: HbA1c, microalbumin"], "relatedConditions": ["Type 2 Diabetes", "Preventive Care"]}	active	pending	2025-11-17 19:12:37.455726
165	1	1	risk_alert	Medication Adherence Concern	AI analysis of prescription refill patterns suggests potential adherence issues. Patient may benefit from medication management support.	medium	t	0.73	{"references": ["Medication Adherence Guidelines", "Patient Education Resources"], "suggestedActions": ["Adherence counseling", "Pill organizer", "Follow-up call"], "relatedConditions": ["Medication Adherence", "Hypertension"]}	active	pending	2025-11-17 19:12:37.455726
166	1	1	risk_alert	Cardiovascular Risk Assessment	Based on recent blood pressure readings and family history, patient shows elevated cardiovascular risk factors. Consider lifestyle modifications and medication review.	medium	t	0.85	{"references": ["AHA Guidelines 2023", "ESC Guidelines"], "suggestedActions": ["Diet consultation", "Exercise program", "Medication review"], "relatedConditions": ["Hypertension", "Family History CVD"]}	active	pending	2025-11-17 19:19:30.549603
167	1	2	drug_interaction	Potential Drug Interaction Alert	Interaction detected between Metformin and newly prescribed medication. Monitor glucose levels closely and consider dosage adjustment.	high	t	0.92	{"references": ["Drug Interaction Database", "FDA Guidelines"], "suggestedActions": ["Monitor blood glucose", "Review medication timing", "Patient education"], "relatedConditions": ["Type 2 Diabetes", "Drug Interaction"]}	active	pending	2025-11-17 19:19:30.549603
168	1	1	treatment_suggestion	Hypertension Management Optimization	Current treatment plan shows good response. Consider adding lifestyle interventions to potentially reduce medication dependency.	low	f	0.78	{"references": ["JNC 8 Guidelines", "AHA Lifestyle Guidelines"], "suggestedActions": ["DASH diet counseling", "Regular exercise program", "Weight management"], "relatedConditions": ["Hypertension", "ACE Inhibitor Therapy"]}	active	pending	2025-11-17 19:19:30.549603
169	1	2	preventive_care	Diabetic Screening Recommendations	Patient due for annual diabetic complications screening. Schedule eye exam, foot examination, and kidney function tests.	medium	t	0.95	{"references": ["ADA Standards of Care", "Diabetic Complications Guidelines"], "suggestedActions": ["Ophthalmology referral", "Podiatry consultation", "Lab work: HbA1c, microalbumin"], "relatedConditions": ["Type 2 Diabetes", "Preventive Care"]}	active	pending	2025-11-17 19:19:30.549603
170	1	1	risk_alert	Medication Adherence Concern	AI analysis of prescription refill patterns suggests potential adherence issues. Patient may benefit from medication management support.	medium	t	0.73	{"references": ["Medication Adherence Guidelines", "Patient Education Resources"], "suggestedActions": ["Adherence counseling", "Pill organizer", "Follow-up call"], "relatedConditions": ["Medication Adherence", "Hypertension"]}	active	pending	2025-11-17 19:19:30.549603
171	1	1	risk_alert	Cardiovascular Risk Assessment	Based on recent blood pressure readings and family history, patient shows elevated cardiovascular risk factors. Consider lifestyle modifications and medication review.	medium	t	0.85	{"references": ["AHA Guidelines 2023", "ESC Guidelines"], "suggestedActions": ["Diet consultation", "Exercise program", "Medication review"], "relatedConditions": ["Hypertension", "Family History CVD"]}	active	pending	2025-11-17 19:24:48.629545
172	1	2	drug_interaction	Potential Drug Interaction Alert	Interaction detected between Metformin and newly prescribed medication. Monitor glucose levels closely and consider dosage adjustment.	high	t	0.92	{"references": ["Drug Interaction Database", "FDA Guidelines"], "suggestedActions": ["Monitor blood glucose", "Review medication timing", "Patient education"], "relatedConditions": ["Type 2 Diabetes", "Drug Interaction"]}	active	pending	2025-11-17 19:24:48.629545
173	1	1	treatment_suggestion	Hypertension Management Optimization	Current treatment plan shows good response. Consider adding lifestyle interventions to potentially reduce medication dependency.	low	f	0.78	{"references": ["JNC 8 Guidelines", "AHA Lifestyle Guidelines"], "suggestedActions": ["DASH diet counseling", "Regular exercise program", "Weight management"], "relatedConditions": ["Hypertension", "ACE Inhibitor Therapy"]}	active	pending	2025-11-17 19:24:48.629545
174	1	2	preventive_care	Diabetic Screening Recommendations	Patient due for annual diabetic complications screening. Schedule eye exam, foot examination, and kidney function tests.	medium	t	0.95	{"references": ["ADA Standards of Care", "Diabetic Complications Guidelines"], "suggestedActions": ["Ophthalmology referral", "Podiatry consultation", "Lab work: HbA1c, microalbumin"], "relatedConditions": ["Type 2 Diabetes", "Preventive Care"]}	active	pending	2025-11-17 19:24:48.629545
175	1	1	risk_alert	Medication Adherence Concern	AI analysis of prescription refill patterns suggests potential adherence issues. Patient may benefit from medication management support.	medium	t	0.73	{"references": ["Medication Adherence Guidelines", "Patient Education Resources"], "suggestedActions": ["Adherence counseling", "Pill organizer", "Follow-up call"], "relatedConditions": ["Medication Adherence", "Hypertension"]}	active	pending	2025-11-17 19:24:48.629545
176	1	1	risk_alert	Cardiovascular Risk Assessment	Based on recent blood pressure readings and family history, patient shows elevated cardiovascular risk factors. Consider lifestyle modifications and medication review.	medium	t	0.85	{"references": ["AHA Guidelines 2023", "ESC Guidelines"], "suggestedActions": ["Diet consultation", "Exercise program", "Medication review"], "relatedConditions": ["Hypertension", "Family History CVD"]}	active	pending	2025-11-17 19:33:57.942151
177	1	2	drug_interaction	Potential Drug Interaction Alert	Interaction detected between Metformin and newly prescribed medication. Monitor glucose levels closely and consider dosage adjustment.	high	t	0.92	{"references": ["Drug Interaction Database", "FDA Guidelines"], "suggestedActions": ["Monitor blood glucose", "Review medication timing", "Patient education"], "relatedConditions": ["Type 2 Diabetes", "Drug Interaction"]}	active	pending	2025-11-17 19:33:57.942151
178	1	1	treatment_suggestion	Hypertension Management Optimization	Current treatment plan shows good response. Consider adding lifestyle interventions to potentially reduce medication dependency.	low	f	0.78	{"references": ["JNC 8 Guidelines", "AHA Lifestyle Guidelines"], "suggestedActions": ["DASH diet counseling", "Regular exercise program", "Weight management"], "relatedConditions": ["Hypertension", "ACE Inhibitor Therapy"]}	active	pending	2025-11-17 19:33:57.942151
179	1	2	preventive_care	Diabetic Screening Recommendations	Patient due for annual diabetic complications screening. Schedule eye exam, foot examination, and kidney function tests.	medium	t	0.95	{"references": ["ADA Standards of Care", "Diabetic Complications Guidelines"], "suggestedActions": ["Ophthalmology referral", "Podiatry consultation", "Lab work: HbA1c, microalbumin"], "relatedConditions": ["Type 2 Diabetes", "Preventive Care"]}	active	pending	2025-11-17 19:33:57.942151
180	1	1	risk_alert	Medication Adherence Concern	AI analysis of prescription refill patterns suggests potential adherence issues. Patient may benefit from medication management support.	medium	t	0.73	{"references": ["Medication Adherence Guidelines", "Patient Education Resources"], "suggestedActions": ["Adherence counseling", "Pill organizer", "Follow-up call"], "relatedConditions": ["Medication Adherence", "Hypertension"]}	active	pending	2025-11-17 19:33:57.942151
181	1	1	risk_alert	Cardiovascular Risk Assessment	Based on recent blood pressure readings and family history, patient shows elevated cardiovascular risk factors. Consider lifestyle modifications and medication review.	medium	t	0.85	{"references": ["AHA Guidelines 2023", "ESC Guidelines"], "suggestedActions": ["Diet consultation", "Exercise program", "Medication review"], "relatedConditions": ["Hypertension", "Family History CVD"]}	active	pending	2025-11-17 19:34:43.580869
182	1	2	drug_interaction	Potential Drug Interaction Alert	Interaction detected between Metformin and newly prescribed medication. Monitor glucose levels closely and consider dosage adjustment.	high	t	0.92	{"references": ["Drug Interaction Database", "FDA Guidelines"], "suggestedActions": ["Monitor blood glucose", "Review medication timing", "Patient education"], "relatedConditions": ["Type 2 Diabetes", "Drug Interaction"]}	active	pending	2025-11-17 19:34:43.580869
183	1	1	treatment_suggestion	Hypertension Management Optimization	Current treatment plan shows good response. Consider adding lifestyle interventions to potentially reduce medication dependency.	low	f	0.78	{"references": ["JNC 8 Guidelines", "AHA Lifestyle Guidelines"], "suggestedActions": ["DASH diet counseling", "Regular exercise program", "Weight management"], "relatedConditions": ["Hypertension", "ACE Inhibitor Therapy"]}	active	pending	2025-11-17 19:34:43.580869
184	1	2	preventive_care	Diabetic Screening Recommendations	Patient due for annual diabetic complications screening. Schedule eye exam, foot examination, and kidney function tests.	medium	t	0.95	{"references": ["ADA Standards of Care", "Diabetic Complications Guidelines"], "suggestedActions": ["Ophthalmology referral", "Podiatry consultation", "Lab work: HbA1c, microalbumin"], "relatedConditions": ["Type 2 Diabetes", "Preventive Care"]}	active	pending	2025-11-17 19:34:43.580869
185	1	1	risk_alert	Medication Adherence Concern	AI analysis of prescription refill patterns suggests potential adherence issues. Patient may benefit from medication management support.	medium	t	0.73	{"references": ["Medication Adherence Guidelines", "Patient Education Resources"], "suggestedActions": ["Adherence counseling", "Pill organizer", "Follow-up call"], "relatedConditions": ["Medication Adherence", "Hypertension"]}	active	pending	2025-11-17 19:34:43.580869
186	1	1	risk_alert	Cardiovascular Risk Assessment	Based on recent blood pressure readings and family history, patient shows elevated cardiovascular risk factors. Consider lifestyle modifications and medication review.	medium	t	0.85	{"references": ["AHA Guidelines 2023", "ESC Guidelines"], "suggestedActions": ["Diet consultation", "Exercise program", "Medication review"], "relatedConditions": ["Hypertension", "Family History CVD"]}	active	pending	2025-11-17 19:35:30.376564
187	1	2	drug_interaction	Potential Drug Interaction Alert	Interaction detected between Metformin and newly prescribed medication. Monitor glucose levels closely and consider dosage adjustment.	high	t	0.92	{"references": ["Drug Interaction Database", "FDA Guidelines"], "suggestedActions": ["Monitor blood glucose", "Review medication timing", "Patient education"], "relatedConditions": ["Type 2 Diabetes", "Drug Interaction"]}	active	pending	2025-11-17 19:35:30.376564
188	1	1	treatment_suggestion	Hypertension Management Optimization	Current treatment plan shows good response. Consider adding lifestyle interventions to potentially reduce medication dependency.	low	f	0.78	{"references": ["JNC 8 Guidelines", "AHA Lifestyle Guidelines"], "suggestedActions": ["DASH diet counseling", "Regular exercise program", "Weight management"], "relatedConditions": ["Hypertension", "ACE Inhibitor Therapy"]}	active	pending	2025-11-17 19:35:30.376564
189	1	2	preventive_care	Diabetic Screening Recommendations	Patient due for annual diabetic complications screening. Schedule eye exam, foot examination, and kidney function tests.	medium	t	0.95	{"references": ["ADA Standards of Care", "Diabetic Complications Guidelines"], "suggestedActions": ["Ophthalmology referral", "Podiatry consultation", "Lab work: HbA1c, microalbumin"], "relatedConditions": ["Type 2 Diabetes", "Preventive Care"]}	active	pending	2025-11-17 19:35:30.376564
190	1	1	risk_alert	Medication Adherence Concern	AI analysis of prescription refill patterns suggests potential adherence issues. Patient may benefit from medication management support.	medium	t	0.73	{"references": ["Medication Adherence Guidelines", "Patient Education Resources"], "suggestedActions": ["Adherence counseling", "Pill organizer", "Follow-up call"], "relatedConditions": ["Medication Adherence", "Hypertension"]}	active	pending	2025-11-17 19:35:30.376564
191	1	1	risk_alert	Cardiovascular Risk Assessment	Based on recent blood pressure readings and family history, patient shows elevated cardiovascular risk factors. Consider lifestyle modifications and medication review.	medium	t	0.85	{"references": ["AHA Guidelines 2023", "ESC Guidelines"], "suggestedActions": ["Diet consultation", "Exercise program", "Medication review"], "relatedConditions": ["Hypertension", "Family History CVD"]}	active	pending	2025-11-17 19:39:08.292682
192	1	2	drug_interaction	Potential Drug Interaction Alert	Interaction detected between Metformin and newly prescribed medication. Monitor glucose levels closely and consider dosage adjustment.	high	t	0.92	{"references": ["Drug Interaction Database", "FDA Guidelines"], "suggestedActions": ["Monitor blood glucose", "Review medication timing", "Patient education"], "relatedConditions": ["Type 2 Diabetes", "Drug Interaction"]}	active	pending	2025-11-17 19:39:08.292682
193	1	1	treatment_suggestion	Hypertension Management Optimization	Current treatment plan shows good response. Consider adding lifestyle interventions to potentially reduce medication dependency.	low	f	0.78	{"references": ["JNC 8 Guidelines", "AHA Lifestyle Guidelines"], "suggestedActions": ["DASH diet counseling", "Regular exercise program", "Weight management"], "relatedConditions": ["Hypertension", "ACE Inhibitor Therapy"]}	active	pending	2025-11-17 19:39:08.292682
194	1	2	preventive_care	Diabetic Screening Recommendations	Patient due for annual diabetic complications screening. Schedule eye exam, foot examination, and kidney function tests.	medium	t	0.95	{"references": ["ADA Standards of Care", "Diabetic Complications Guidelines"], "suggestedActions": ["Ophthalmology referral", "Podiatry consultation", "Lab work: HbA1c, microalbumin"], "relatedConditions": ["Type 2 Diabetes", "Preventive Care"]}	active	pending	2025-11-17 19:39:08.292682
195	1	1	risk_alert	Medication Adherence Concern	AI analysis of prescription refill patterns suggests potential adherence issues. Patient may benefit from medication management support.	medium	t	0.73	{"references": ["Medication Adherence Guidelines", "Patient Education Resources"], "suggestedActions": ["Adherence counseling", "Pill organizer", "Follow-up call"], "relatedConditions": ["Medication Adherence", "Hypertension"]}	active	pending	2025-11-17 19:39:08.292682
196	1	1	risk_alert	Cardiovascular Risk Assessment	Based on recent blood pressure readings and family history, patient shows elevated cardiovascular risk factors. Consider lifestyle modifications and medication review.	medium	t	0.85	{"references": ["AHA Guidelines 2023", "ESC Guidelines"], "suggestedActions": ["Diet consultation", "Exercise program", "Medication review"], "relatedConditions": ["Hypertension", "Family History CVD"]}	active	pending	2025-11-17 19:41:40.128827
197	1	2	drug_interaction	Potential Drug Interaction Alert	Interaction detected between Metformin and newly prescribed medication. Monitor glucose levels closely and consider dosage adjustment.	high	t	0.92	{"references": ["Drug Interaction Database", "FDA Guidelines"], "suggestedActions": ["Monitor blood glucose", "Review medication timing", "Patient education"], "relatedConditions": ["Type 2 Diabetes", "Drug Interaction"]}	active	pending	2025-11-17 19:41:40.128827
198	1	1	treatment_suggestion	Hypertension Management Optimization	Current treatment plan shows good response. Consider adding lifestyle interventions to potentially reduce medication dependency.	low	f	0.78	{"references": ["JNC 8 Guidelines", "AHA Lifestyle Guidelines"], "suggestedActions": ["DASH diet counseling", "Regular exercise program", "Weight management"], "relatedConditions": ["Hypertension", "ACE Inhibitor Therapy"]}	active	pending	2025-11-17 19:41:40.128827
199	1	2	preventive_care	Diabetic Screening Recommendations	Patient due for annual diabetic complications screening. Schedule eye exam, foot examination, and kidney function tests.	medium	t	0.95	{"references": ["ADA Standards of Care", "Diabetic Complications Guidelines"], "suggestedActions": ["Ophthalmology referral", "Podiatry consultation", "Lab work: HbA1c, microalbumin"], "relatedConditions": ["Type 2 Diabetes", "Preventive Care"]}	active	pending	2025-11-17 19:41:40.128827
200	1	1	risk_alert	Medication Adherence Concern	AI analysis of prescription refill patterns suggests potential adherence issues. Patient may benefit from medication management support.	medium	t	0.73	{"references": ["Medication Adherence Guidelines", "Patient Education Resources"], "suggestedActions": ["Adherence counseling", "Pill organizer", "Follow-up call"], "relatedConditions": ["Medication Adherence", "Hypertension"]}	active	pending	2025-11-17 19:41:40.128827
201	1	1	risk_alert	Cardiovascular Risk Assessment	Based on recent blood pressure readings and family history, patient shows elevated cardiovascular risk factors. Consider lifestyle modifications and medication review.	medium	t	0.85	{"references": ["AHA Guidelines 2023", "ESC Guidelines"], "suggestedActions": ["Diet consultation", "Exercise program", "Medication review"], "relatedConditions": ["Hypertension", "Family History CVD"]}	active	pending	2025-11-17 19:50:00.843411
202	1	2	drug_interaction	Potential Drug Interaction Alert	Interaction detected between Metformin and newly prescribed medication. Monitor glucose levels closely and consider dosage adjustment.	high	t	0.92	{"references": ["Drug Interaction Database", "FDA Guidelines"], "suggestedActions": ["Monitor blood glucose", "Review medication timing", "Patient education"], "relatedConditions": ["Type 2 Diabetes", "Drug Interaction"]}	active	pending	2025-11-17 19:50:00.843411
203	1	1	treatment_suggestion	Hypertension Management Optimization	Current treatment plan shows good response. Consider adding lifestyle interventions to potentially reduce medication dependency.	low	f	0.78	{"references": ["JNC 8 Guidelines", "AHA Lifestyle Guidelines"], "suggestedActions": ["DASH diet counseling", "Regular exercise program", "Weight management"], "relatedConditions": ["Hypertension", "ACE Inhibitor Therapy"]}	active	pending	2025-11-17 19:50:00.843411
204	1	2	preventive_care	Diabetic Screening Recommendations	Patient due for annual diabetic complications screening. Schedule eye exam, foot examination, and kidney function tests.	medium	t	0.95	{"references": ["ADA Standards of Care", "Diabetic Complications Guidelines"], "suggestedActions": ["Ophthalmology referral", "Podiatry consultation", "Lab work: HbA1c, microalbumin"], "relatedConditions": ["Type 2 Diabetes", "Preventive Care"]}	active	pending	2025-11-17 19:50:00.843411
205	1	1	risk_alert	Medication Adherence Concern	AI analysis of prescription refill patterns suggests potential adherence issues. Patient may benefit from medication management support.	medium	t	0.73	{"references": ["Medication Adherence Guidelines", "Patient Education Resources"], "suggestedActions": ["Adherence counseling", "Pill organizer", "Follow-up call"], "relatedConditions": ["Medication Adherence", "Hypertension"]}	active	pending	2025-11-17 19:50:00.843411
206	1	1	risk_alert	Cardiovascular Risk Assessment	Based on recent blood pressure readings and family history, patient shows elevated cardiovascular risk factors. Consider lifestyle modifications and medication review.	medium	t	0.85	{"references": ["AHA Guidelines 2023", "ESC Guidelines"], "suggestedActions": ["Diet consultation", "Exercise program", "Medication review"], "relatedConditions": ["Hypertension", "Family History CVD"]}	active	pending	2025-11-17 19:53:42.574582
207	1	2	drug_interaction	Potential Drug Interaction Alert	Interaction detected between Metformin and newly prescribed medication. Monitor glucose levels closely and consider dosage adjustment.	high	t	0.92	{"references": ["Drug Interaction Database", "FDA Guidelines"], "suggestedActions": ["Monitor blood glucose", "Review medication timing", "Patient education"], "relatedConditions": ["Type 2 Diabetes", "Drug Interaction"]}	active	pending	2025-11-17 19:53:42.574582
208	1	1	treatment_suggestion	Hypertension Management Optimization	Current treatment plan shows good response. Consider adding lifestyle interventions to potentially reduce medication dependency.	low	f	0.78	{"references": ["JNC 8 Guidelines", "AHA Lifestyle Guidelines"], "suggestedActions": ["DASH diet counseling", "Regular exercise program", "Weight management"], "relatedConditions": ["Hypertension", "ACE Inhibitor Therapy"]}	active	pending	2025-11-17 19:53:42.574582
209	1	2	preventive_care	Diabetic Screening Recommendations	Patient due for annual diabetic complications screening. Schedule eye exam, foot examination, and kidney function tests.	medium	t	0.95	{"references": ["ADA Standards of Care", "Diabetic Complications Guidelines"], "suggestedActions": ["Ophthalmology referral", "Podiatry consultation", "Lab work: HbA1c, microalbumin"], "relatedConditions": ["Type 2 Diabetes", "Preventive Care"]}	active	pending	2025-11-17 19:53:42.574582
210	1	1	risk_alert	Medication Adherence Concern	AI analysis of prescription refill patterns suggests potential adherence issues. Patient may benefit from medication management support.	medium	t	0.73	{"references": ["Medication Adherence Guidelines", "Patient Education Resources"], "suggestedActions": ["Adherence counseling", "Pill organizer", "Follow-up call"], "relatedConditions": ["Medication Adherence", "Hypertension"]}	active	pending	2025-11-17 19:53:42.574582
211	1	1	risk_alert	Cardiovascular Risk Assessment	Based on recent blood pressure readings and family history, patient shows elevated cardiovascular risk factors. Consider lifestyle modifications and medication review.	medium	t	0.85	{"references": ["AHA Guidelines 2023", "ESC Guidelines"], "suggestedActions": ["Diet consultation", "Exercise program", "Medication review"], "relatedConditions": ["Hypertension", "Family History CVD"]}	active	pending	2025-11-17 19:56:32.512423
212	1	2	drug_interaction	Potential Drug Interaction Alert	Interaction detected between Metformin and newly prescribed medication. Monitor glucose levels closely and consider dosage adjustment.	high	t	0.92	{"references": ["Drug Interaction Database", "FDA Guidelines"], "suggestedActions": ["Monitor blood glucose", "Review medication timing", "Patient education"], "relatedConditions": ["Type 2 Diabetes", "Drug Interaction"]}	active	pending	2025-11-17 19:56:32.512423
213	1	1	treatment_suggestion	Hypertension Management Optimization	Current treatment plan shows good response. Consider adding lifestyle interventions to potentially reduce medication dependency.	low	f	0.78	{"references": ["JNC 8 Guidelines", "AHA Lifestyle Guidelines"], "suggestedActions": ["DASH diet counseling", "Regular exercise program", "Weight management"], "relatedConditions": ["Hypertension", "ACE Inhibitor Therapy"]}	active	pending	2025-11-17 19:56:32.512423
214	1	2	preventive_care	Diabetic Screening Recommendations	Patient due for annual diabetic complications screening. Schedule eye exam, foot examination, and kidney function tests.	medium	t	0.95	{"references": ["ADA Standards of Care", "Diabetic Complications Guidelines"], "suggestedActions": ["Ophthalmology referral", "Podiatry consultation", "Lab work: HbA1c, microalbumin"], "relatedConditions": ["Type 2 Diabetes", "Preventive Care"]}	active	pending	2025-11-17 19:56:32.512423
215	1	1	risk_alert	Medication Adherence Concern	AI analysis of prescription refill patterns suggests potential adherence issues. Patient may benefit from medication management support.	medium	t	0.73	{"references": ["Medication Adherence Guidelines", "Patient Education Resources"], "suggestedActions": ["Adherence counseling", "Pill organizer", "Follow-up call"], "relatedConditions": ["Medication Adherence", "Hypertension"]}	active	pending	2025-11-17 19:56:32.512423
216	1	1	risk_alert	Cardiovascular Risk Assessment	Based on recent blood pressure readings and family history, patient shows elevated cardiovascular risk factors. Consider lifestyle modifications and medication review.	medium	t	0.85	{"references": ["AHA Guidelines 2023", "ESC Guidelines"], "suggestedActions": ["Diet consultation", "Exercise program", "Medication review"], "relatedConditions": ["Hypertension", "Family History CVD"]}	active	pending	2025-11-17 20:02:07.658108
217	1	2	drug_interaction	Potential Drug Interaction Alert	Interaction detected between Metformin and newly prescribed medication. Monitor glucose levels closely and consider dosage adjustment.	high	t	0.92	{"references": ["Drug Interaction Database", "FDA Guidelines"], "suggestedActions": ["Monitor blood glucose", "Review medication timing", "Patient education"], "relatedConditions": ["Type 2 Diabetes", "Drug Interaction"]}	active	pending	2025-11-17 20:02:07.658108
218	1	1	treatment_suggestion	Hypertension Management Optimization	Current treatment plan shows good response. Consider adding lifestyle interventions to potentially reduce medication dependency.	low	f	0.78	{"references": ["JNC 8 Guidelines", "AHA Lifestyle Guidelines"], "suggestedActions": ["DASH diet counseling", "Regular exercise program", "Weight management"], "relatedConditions": ["Hypertension", "ACE Inhibitor Therapy"]}	active	pending	2025-11-17 20:02:07.658108
219	1	2	preventive_care	Diabetic Screening Recommendations	Patient due for annual diabetic complications screening. Schedule eye exam, foot examination, and kidney function tests.	medium	t	0.95	{"references": ["ADA Standards of Care", "Diabetic Complications Guidelines"], "suggestedActions": ["Ophthalmology referral", "Podiatry consultation", "Lab work: HbA1c, microalbumin"], "relatedConditions": ["Type 2 Diabetes", "Preventive Care"]}	active	pending	2025-11-17 20:02:07.658108
220	1	1	risk_alert	Medication Adherence Concern	AI analysis of prescription refill patterns suggests potential adherence issues. Patient may benefit from medication management support.	medium	t	0.73	{"references": ["Medication Adherence Guidelines", "Patient Education Resources"], "suggestedActions": ["Adherence counseling", "Pill organizer", "Follow-up call"], "relatedConditions": ["Medication Adherence", "Hypertension"]}	active	pending	2025-11-17 20:02:07.658108
221	1	1	risk_alert	Cardiovascular Risk Assessment	Based on recent blood pressure readings and family history, patient shows elevated cardiovascular risk factors. Consider lifestyle modifications and medication review.	medium	t	0.85	{"references": ["AHA Guidelines 2023", "ESC Guidelines"], "suggestedActions": ["Diet consultation", "Exercise program", "Medication review"], "relatedConditions": ["Hypertension", "Family History CVD"]}	active	pending	2025-11-17 20:02:47.190576
222	1	2	drug_interaction	Potential Drug Interaction Alert	Interaction detected between Metformin and newly prescribed medication. Monitor glucose levels closely and consider dosage adjustment.	high	t	0.92	{"references": ["Drug Interaction Database", "FDA Guidelines"], "suggestedActions": ["Monitor blood glucose", "Review medication timing", "Patient education"], "relatedConditions": ["Type 2 Diabetes", "Drug Interaction"]}	active	pending	2025-11-17 20:02:47.190576
223	1	1	treatment_suggestion	Hypertension Management Optimization	Current treatment plan shows good response. Consider adding lifestyle interventions to potentially reduce medication dependency.	low	f	0.78	{"references": ["JNC 8 Guidelines", "AHA Lifestyle Guidelines"], "suggestedActions": ["DASH diet counseling", "Regular exercise program", "Weight management"], "relatedConditions": ["Hypertension", "ACE Inhibitor Therapy"]}	active	pending	2025-11-17 20:02:47.190576
224	1	2	preventive_care	Diabetic Screening Recommendations	Patient due for annual diabetic complications screening. Schedule eye exam, foot examination, and kidney function tests.	medium	t	0.95	{"references": ["ADA Standards of Care", "Diabetic Complications Guidelines"], "suggestedActions": ["Ophthalmology referral", "Podiatry consultation", "Lab work: HbA1c, microalbumin"], "relatedConditions": ["Type 2 Diabetes", "Preventive Care"]}	active	pending	2025-11-17 20:02:47.190576
225	1	1	risk_alert	Medication Adherence Concern	AI analysis of prescription refill patterns suggests potential adherence issues. Patient may benefit from medication management support.	medium	t	0.73	{"references": ["Medication Adherence Guidelines", "Patient Education Resources"], "suggestedActions": ["Adherence counseling", "Pill organizer", "Follow-up call"], "relatedConditions": ["Medication Adherence", "Hypertension"]}	active	pending	2025-11-17 20:02:47.190576
226	1	1	risk_alert	Cardiovascular Risk Assessment	Based on recent blood pressure readings and family history, patient shows elevated cardiovascular risk factors. Consider lifestyle modifications and medication review.	medium	t	0.85	{"references": ["AHA Guidelines 2023", "ESC Guidelines"], "suggestedActions": ["Diet consultation", "Exercise program", "Medication review"], "relatedConditions": ["Hypertension", "Family History CVD"]}	active	pending	2025-11-17 20:06:06.927319
227	1	2	drug_interaction	Potential Drug Interaction Alert	Interaction detected between Metformin and newly prescribed medication. Monitor glucose levels closely and consider dosage adjustment.	high	t	0.92	{"references": ["Drug Interaction Database", "FDA Guidelines"], "suggestedActions": ["Monitor blood glucose", "Review medication timing", "Patient education"], "relatedConditions": ["Type 2 Diabetes", "Drug Interaction"]}	active	pending	2025-11-17 20:06:06.927319
228	1	1	treatment_suggestion	Hypertension Management Optimization	Current treatment plan shows good response. Consider adding lifestyle interventions to potentially reduce medication dependency.	low	f	0.78	{"references": ["JNC 8 Guidelines", "AHA Lifestyle Guidelines"], "suggestedActions": ["DASH diet counseling", "Regular exercise program", "Weight management"], "relatedConditions": ["Hypertension", "ACE Inhibitor Therapy"]}	active	pending	2025-11-17 20:06:06.927319
229	1	2	preventive_care	Diabetic Screening Recommendations	Patient due for annual diabetic complications screening. Schedule eye exam, foot examination, and kidney function tests.	medium	t	0.95	{"references": ["ADA Standards of Care", "Diabetic Complications Guidelines"], "suggestedActions": ["Ophthalmology referral", "Podiatry consultation", "Lab work: HbA1c, microalbumin"], "relatedConditions": ["Type 2 Diabetes", "Preventive Care"]}	active	pending	2025-11-17 20:06:06.927319
230	1	1	risk_alert	Medication Adherence Concern	AI analysis of prescription refill patterns suggests potential adherence issues. Patient may benefit from medication management support.	medium	t	0.73	{"references": ["Medication Adherence Guidelines", "Patient Education Resources"], "suggestedActions": ["Adherence counseling", "Pill organizer", "Follow-up call"], "relatedConditions": ["Medication Adherence", "Hypertension"]}	active	pending	2025-11-17 20:06:06.927319
231	1	1	risk_alert	Cardiovascular Risk Assessment	Based on recent blood pressure readings and family history, patient shows elevated cardiovascular risk factors. Consider lifestyle modifications and medication review.	medium	t	0.85	{"references": ["AHA Guidelines 2023", "ESC Guidelines"], "suggestedActions": ["Diet consultation", "Exercise program", "Medication review"], "relatedConditions": ["Hypertension", "Family History CVD"]}	active	pending	2025-11-17 20:15:57.389798
232	1	2	drug_interaction	Potential Drug Interaction Alert	Interaction detected between Metformin and newly prescribed medication. Monitor glucose levels closely and consider dosage adjustment.	high	t	0.92	{"references": ["Drug Interaction Database", "FDA Guidelines"], "suggestedActions": ["Monitor blood glucose", "Review medication timing", "Patient education"], "relatedConditions": ["Type 2 Diabetes", "Drug Interaction"]}	active	pending	2025-11-17 20:15:57.389798
233	1	1	treatment_suggestion	Hypertension Management Optimization	Current treatment plan shows good response. Consider adding lifestyle interventions to potentially reduce medication dependency.	low	f	0.78	{"references": ["JNC 8 Guidelines", "AHA Lifestyle Guidelines"], "suggestedActions": ["DASH diet counseling", "Regular exercise program", "Weight management"], "relatedConditions": ["Hypertension", "ACE Inhibitor Therapy"]}	active	pending	2025-11-17 20:15:57.389798
234	1	2	preventive_care	Diabetic Screening Recommendations	Patient due for annual diabetic complications screening. Schedule eye exam, foot examination, and kidney function tests.	medium	t	0.95	{"references": ["ADA Standards of Care", "Diabetic Complications Guidelines"], "suggestedActions": ["Ophthalmology referral", "Podiatry consultation", "Lab work: HbA1c, microalbumin"], "relatedConditions": ["Type 2 Diabetes", "Preventive Care"]}	active	pending	2025-11-17 20:15:57.389798
235	1	1	risk_alert	Medication Adherence Concern	AI analysis of prescription refill patterns suggests potential adherence issues. Patient may benefit from medication management support.	medium	t	0.73	{"references": ["Medication Adherence Guidelines", "Patient Education Resources"], "suggestedActions": ["Adherence counseling", "Pill organizer", "Follow-up call"], "relatedConditions": ["Medication Adherence", "Hypertension"]}	active	pending	2025-11-17 20:15:57.389798
236	1	1	risk_alert	Cardiovascular Risk Assessment	Based on recent blood pressure readings and family history, patient shows elevated cardiovascular risk factors. Consider lifestyle modifications and medication review.	medium	t	0.85	{"references": ["AHA Guidelines 2023", "ESC Guidelines"], "suggestedActions": ["Diet consultation", "Exercise program", "Medication review"], "relatedConditions": ["Hypertension", "Family History CVD"]}	active	pending	2025-11-17 20:16:31.172512
237	1	2	drug_interaction	Potential Drug Interaction Alert	Interaction detected between Metformin and newly prescribed medication. Monitor glucose levels closely and consider dosage adjustment.	high	t	0.92	{"references": ["Drug Interaction Database", "FDA Guidelines"], "suggestedActions": ["Monitor blood glucose", "Review medication timing", "Patient education"], "relatedConditions": ["Type 2 Diabetes", "Drug Interaction"]}	active	pending	2025-11-17 20:16:31.172512
238	1	1	treatment_suggestion	Hypertension Management Optimization	Current treatment plan shows good response. Consider adding lifestyle interventions to potentially reduce medication dependency.	low	f	0.78	{"references": ["JNC 8 Guidelines", "AHA Lifestyle Guidelines"], "suggestedActions": ["DASH diet counseling", "Regular exercise program", "Weight management"], "relatedConditions": ["Hypertension", "ACE Inhibitor Therapy"]}	active	pending	2025-11-17 20:16:31.172512
239	1	2	preventive_care	Diabetic Screening Recommendations	Patient due for annual diabetic complications screening. Schedule eye exam, foot examination, and kidney function tests.	medium	t	0.95	{"references": ["ADA Standards of Care", "Diabetic Complications Guidelines"], "suggestedActions": ["Ophthalmology referral", "Podiatry consultation", "Lab work: HbA1c, microalbumin"], "relatedConditions": ["Type 2 Diabetes", "Preventive Care"]}	active	pending	2025-11-17 20:16:31.172512
240	1	1	risk_alert	Medication Adherence Concern	AI analysis of prescription refill patterns suggests potential adherence issues. Patient may benefit from medication management support.	medium	t	0.73	{"references": ["Medication Adherence Guidelines", "Patient Education Resources"], "suggestedActions": ["Adherence counseling", "Pill organizer", "Follow-up call"], "relatedConditions": ["Medication Adherence", "Hypertension"]}	active	pending	2025-11-17 20:16:31.172512
241	1	1	risk_alert	Cardiovascular Risk Assessment	Based on recent blood pressure readings and family history, patient shows elevated cardiovascular risk factors. Consider lifestyle modifications and medication review.	medium	t	0.85	{"references": ["AHA Guidelines 2023", "ESC Guidelines"], "suggestedActions": ["Diet consultation", "Exercise program", "Medication review"], "relatedConditions": ["Hypertension", "Family History CVD"]}	active	pending	2025-11-17 20:22:20.28258
242	1	2	drug_interaction	Potential Drug Interaction Alert	Interaction detected between Metformin and newly prescribed medication. Monitor glucose levels closely and consider dosage adjustment.	high	t	0.92	{"references": ["Drug Interaction Database", "FDA Guidelines"], "suggestedActions": ["Monitor blood glucose", "Review medication timing", "Patient education"], "relatedConditions": ["Type 2 Diabetes", "Drug Interaction"]}	active	pending	2025-11-17 20:22:20.28258
243	1	1	treatment_suggestion	Hypertension Management Optimization	Current treatment plan shows good response. Consider adding lifestyle interventions to potentially reduce medication dependency.	low	f	0.78	{"references": ["JNC 8 Guidelines", "AHA Lifestyle Guidelines"], "suggestedActions": ["DASH diet counseling", "Regular exercise program", "Weight management"], "relatedConditions": ["Hypertension", "ACE Inhibitor Therapy"]}	active	pending	2025-11-17 20:22:20.28258
244	1	2	preventive_care	Diabetic Screening Recommendations	Patient due for annual diabetic complications screening. Schedule eye exam, foot examination, and kidney function tests.	medium	t	0.95	{"references": ["ADA Standards of Care", "Diabetic Complications Guidelines"], "suggestedActions": ["Ophthalmology referral", "Podiatry consultation", "Lab work: HbA1c, microalbumin"], "relatedConditions": ["Type 2 Diabetes", "Preventive Care"]}	active	pending	2025-11-17 20:22:20.28258
245	1	1	risk_alert	Medication Adherence Concern	AI analysis of prescription refill patterns suggests potential adherence issues. Patient may benefit from medication management support.	medium	t	0.73	{"references": ["Medication Adherence Guidelines", "Patient Education Resources"], "suggestedActions": ["Adherence counseling", "Pill organizer", "Follow-up call"], "relatedConditions": ["Medication Adherence", "Hypertension"]}	active	pending	2025-11-17 20:22:20.28258
246	1	1	risk_alert	Cardiovascular Risk Assessment	Based on recent blood pressure readings and family history, patient shows elevated cardiovascular risk factors. Consider lifestyle modifications and medication review.	medium	t	0.85	{"references": ["AHA Guidelines 2023", "ESC Guidelines"], "suggestedActions": ["Diet consultation", "Exercise program", "Medication review"], "relatedConditions": ["Hypertension", "Family History CVD"]}	active	pending	2025-11-17 20:23:29.954448
247	1	2	drug_interaction	Potential Drug Interaction Alert	Interaction detected between Metformin and newly prescribed medication. Monitor glucose levels closely and consider dosage adjustment.	high	t	0.92	{"references": ["Drug Interaction Database", "FDA Guidelines"], "suggestedActions": ["Monitor blood glucose", "Review medication timing", "Patient education"], "relatedConditions": ["Type 2 Diabetes", "Drug Interaction"]}	active	pending	2025-11-17 20:23:29.954448
248	1	1	treatment_suggestion	Hypertension Management Optimization	Current treatment plan shows good response. Consider adding lifestyle interventions to potentially reduce medication dependency.	low	f	0.78	{"references": ["JNC 8 Guidelines", "AHA Lifestyle Guidelines"], "suggestedActions": ["DASH diet counseling", "Regular exercise program", "Weight management"], "relatedConditions": ["Hypertension", "ACE Inhibitor Therapy"]}	active	pending	2025-11-17 20:23:29.954448
249	1	2	preventive_care	Diabetic Screening Recommendations	Patient due for annual diabetic complications screening. Schedule eye exam, foot examination, and kidney function tests.	medium	t	0.95	{"references": ["ADA Standards of Care", "Diabetic Complications Guidelines"], "suggestedActions": ["Ophthalmology referral", "Podiatry consultation", "Lab work: HbA1c, microalbumin"], "relatedConditions": ["Type 2 Diabetes", "Preventive Care"]}	active	pending	2025-11-17 20:23:29.954448
250	1	1	risk_alert	Medication Adherence Concern	AI analysis of prescription refill patterns suggests potential adherence issues. Patient may benefit from medication management support.	medium	t	0.73	{"references": ["Medication Adherence Guidelines", "Patient Education Resources"], "suggestedActions": ["Adherence counseling", "Pill organizer", "Follow-up call"], "relatedConditions": ["Medication Adherence", "Hypertension"]}	active	pending	2025-11-17 20:23:29.954448
251	1	1	risk_alert	Cardiovascular Risk Assessment	Based on recent blood pressure readings and family history, patient shows elevated cardiovascular risk factors. Consider lifestyle modifications and medication review.	medium	t	0.85	{"references": ["AHA Guidelines 2023", "ESC Guidelines"], "suggestedActions": ["Diet consultation", "Exercise program", "Medication review"], "relatedConditions": ["Hypertension", "Family History CVD"]}	active	pending	2025-11-17 20:34:30.103882
252	1	2	drug_interaction	Potential Drug Interaction Alert	Interaction detected between Metformin and newly prescribed medication. Monitor glucose levels closely and consider dosage adjustment.	high	t	0.92	{"references": ["Drug Interaction Database", "FDA Guidelines"], "suggestedActions": ["Monitor blood glucose", "Review medication timing", "Patient education"], "relatedConditions": ["Type 2 Diabetes", "Drug Interaction"]}	active	pending	2025-11-17 20:34:30.103882
253	1	1	treatment_suggestion	Hypertension Management Optimization	Current treatment plan shows good response. Consider adding lifestyle interventions to potentially reduce medication dependency.	low	f	0.78	{"references": ["JNC 8 Guidelines", "AHA Lifestyle Guidelines"], "suggestedActions": ["DASH diet counseling", "Regular exercise program", "Weight management"], "relatedConditions": ["Hypertension", "ACE Inhibitor Therapy"]}	active	pending	2025-11-17 20:34:30.103882
254	1	2	preventive_care	Diabetic Screening Recommendations	Patient due for annual diabetic complications screening. Schedule eye exam, foot examination, and kidney function tests.	medium	t	0.95	{"references": ["ADA Standards of Care", "Diabetic Complications Guidelines"], "suggestedActions": ["Ophthalmology referral", "Podiatry consultation", "Lab work: HbA1c, microalbumin"], "relatedConditions": ["Type 2 Diabetes", "Preventive Care"]}	active	pending	2025-11-17 20:34:30.103882
255	1	1	risk_alert	Medication Adherence Concern	AI analysis of prescription refill patterns suggests potential adherence issues. Patient may benefit from medication management support.	medium	t	0.73	{"references": ["Medication Adherence Guidelines", "Patient Education Resources"], "suggestedActions": ["Adherence counseling", "Pill organizer", "Follow-up call"], "relatedConditions": ["Medication Adherence", "Hypertension"]}	active	pending	2025-11-17 20:34:30.103882
256	1	1	risk_alert	Cardiovascular Risk Assessment	Based on recent blood pressure readings and family history, patient shows elevated cardiovascular risk factors. Consider lifestyle modifications and medication review.	medium	t	0.85	{"references": ["AHA Guidelines 2023", "ESC Guidelines"], "suggestedActions": ["Diet consultation", "Exercise program", "Medication review"], "relatedConditions": ["Hypertension", "Family History CVD"]}	active	pending	2025-11-17 20:35:46.61053
257	1	2	drug_interaction	Potential Drug Interaction Alert	Interaction detected between Metformin and newly prescribed medication. Monitor glucose levels closely and consider dosage adjustment.	high	t	0.92	{"references": ["Drug Interaction Database", "FDA Guidelines"], "suggestedActions": ["Monitor blood glucose", "Review medication timing", "Patient education"], "relatedConditions": ["Type 2 Diabetes", "Drug Interaction"]}	active	pending	2025-11-17 20:35:46.61053
258	1	1	treatment_suggestion	Hypertension Management Optimization	Current treatment plan shows good response. Consider adding lifestyle interventions to potentially reduce medication dependency.	low	f	0.78	{"references": ["JNC 8 Guidelines", "AHA Lifestyle Guidelines"], "suggestedActions": ["DASH diet counseling", "Regular exercise program", "Weight management"], "relatedConditions": ["Hypertension", "ACE Inhibitor Therapy"]}	active	pending	2025-11-17 20:35:46.61053
259	1	2	preventive_care	Diabetic Screening Recommendations	Patient due for annual diabetic complications screening. Schedule eye exam, foot examination, and kidney function tests.	medium	t	0.95	{"references": ["ADA Standards of Care", "Diabetic Complications Guidelines"], "suggestedActions": ["Ophthalmology referral", "Podiatry consultation", "Lab work: HbA1c, microalbumin"], "relatedConditions": ["Type 2 Diabetes", "Preventive Care"]}	active	pending	2025-11-17 20:35:46.61053
260	1	1	risk_alert	Medication Adherence Concern	AI analysis of prescription refill patterns suggests potential adherence issues. Patient may benefit from medication management support.	medium	t	0.73	{"references": ["Medication Adherence Guidelines", "Patient Education Resources"], "suggestedActions": ["Adherence counseling", "Pill organizer", "Follow-up call"], "relatedConditions": ["Medication Adherence", "Hypertension"]}	active	pending	2025-11-17 20:35:46.61053
261	1	1	risk_alert	Cardiovascular Risk Assessment	Based on recent blood pressure readings and family history, patient shows elevated cardiovascular risk factors. Consider lifestyle modifications and medication review.	medium	t	0.85	{"references": ["AHA Guidelines 2023", "ESC Guidelines"], "suggestedActions": ["Diet consultation", "Exercise program", "Medication review"], "relatedConditions": ["Hypertension", "Family History CVD"]}	active	pending	2025-11-18 03:18:41.666149
262	1	2	drug_interaction	Potential Drug Interaction Alert	Interaction detected between Metformin and newly prescribed medication. Monitor glucose levels closely and consider dosage adjustment.	high	t	0.92	{"references": ["Drug Interaction Database", "FDA Guidelines"], "suggestedActions": ["Monitor blood glucose", "Review medication timing", "Patient education"], "relatedConditions": ["Type 2 Diabetes", "Drug Interaction"]}	active	pending	2025-11-18 03:18:41.666149
263	1	1	treatment_suggestion	Hypertension Management Optimization	Current treatment plan shows good response. Consider adding lifestyle interventions to potentially reduce medication dependency.	low	f	0.78	{"references": ["JNC 8 Guidelines", "AHA Lifestyle Guidelines"], "suggestedActions": ["DASH diet counseling", "Regular exercise program", "Weight management"], "relatedConditions": ["Hypertension", "ACE Inhibitor Therapy"]}	active	pending	2025-11-18 03:18:41.666149
264	1	2	preventive_care	Diabetic Screening Recommendations	Patient due for annual diabetic complications screening. Schedule eye exam, foot examination, and kidney function tests.	medium	t	0.95	{"references": ["ADA Standards of Care", "Diabetic Complications Guidelines"], "suggestedActions": ["Ophthalmology referral", "Podiatry consultation", "Lab work: HbA1c, microalbumin"], "relatedConditions": ["Type 2 Diabetes", "Preventive Care"]}	active	pending	2025-11-18 03:18:41.666149
265	1	1	risk_alert	Medication Adherence Concern	AI analysis of prescription refill patterns suggests potential adherence issues. Patient may benefit from medication management support.	medium	t	0.73	{"references": ["Medication Adherence Guidelines", "Patient Education Resources"], "suggestedActions": ["Adherence counseling", "Pill organizer", "Follow-up call"], "relatedConditions": ["Medication Adherence", "Hypertension"]}	active	pending	2025-11-18 03:18:41.666149
266	1	1	risk_alert	Cardiovascular Risk Assessment	Based on recent blood pressure readings and family history, patient shows elevated cardiovascular risk factors. Consider lifestyle modifications and medication review.	medium	t	0.85	{"references": ["AHA Guidelines 2023", "ESC Guidelines"], "suggestedActions": ["Diet consultation", "Exercise program", "Medication review"], "relatedConditions": ["Hypertension", "Family History CVD"]}	active	pending	2025-11-18 03:43:34.803804
267	1	2	drug_interaction	Potential Drug Interaction Alert	Interaction detected between Metformin and newly prescribed medication. Monitor glucose levels closely and consider dosage adjustment.	high	t	0.92	{"references": ["Drug Interaction Database", "FDA Guidelines"], "suggestedActions": ["Monitor blood glucose", "Review medication timing", "Patient education"], "relatedConditions": ["Type 2 Diabetes", "Drug Interaction"]}	active	pending	2025-11-18 03:43:34.803804
268	1	1	treatment_suggestion	Hypertension Management Optimization	Current treatment plan shows good response. Consider adding lifestyle interventions to potentially reduce medication dependency.	low	f	0.78	{"references": ["JNC 8 Guidelines", "AHA Lifestyle Guidelines"], "suggestedActions": ["DASH diet counseling", "Regular exercise program", "Weight management"], "relatedConditions": ["Hypertension", "ACE Inhibitor Therapy"]}	active	pending	2025-11-18 03:43:34.803804
269	1	2	preventive_care	Diabetic Screening Recommendations	Patient due for annual diabetic complications screening. Schedule eye exam, foot examination, and kidney function tests.	medium	t	0.95	{"references": ["ADA Standards of Care", "Diabetic Complications Guidelines"], "suggestedActions": ["Ophthalmology referral", "Podiatry consultation", "Lab work: HbA1c, microalbumin"], "relatedConditions": ["Type 2 Diabetes", "Preventive Care"]}	active	pending	2025-11-18 03:43:34.803804
270	1	1	risk_alert	Medication Adherence Concern	AI analysis of prescription refill patterns suggests potential adherence issues. Patient may benefit from medication management support.	medium	t	0.73	{"references": ["Medication Adherence Guidelines", "Patient Education Resources"], "suggestedActions": ["Adherence counseling", "Pill organizer", "Follow-up call"], "relatedConditions": ["Medication Adherence", "Hypertension"]}	active	pending	2025-11-18 03:43:34.803804
271	1	1	risk_alert	Cardiovascular Risk Assessment	Based on recent blood pressure readings and family history, patient shows elevated cardiovascular risk factors. Consider lifestyle modifications and medication review.	medium	t	0.85	{"references": ["AHA Guidelines 2023", "ESC Guidelines"], "suggestedActions": ["Diet consultation", "Exercise program", "Medication review"], "relatedConditions": ["Hypertension", "Family History CVD"]}	active	pending	2025-11-18 03:50:51.569767
272	1	2	drug_interaction	Potential Drug Interaction Alert	Interaction detected between Metformin and newly prescribed medication. Monitor glucose levels closely and consider dosage adjustment.	high	t	0.92	{"references": ["Drug Interaction Database", "FDA Guidelines"], "suggestedActions": ["Monitor blood glucose", "Review medication timing", "Patient education"], "relatedConditions": ["Type 2 Diabetes", "Drug Interaction"]}	active	pending	2025-11-18 03:50:51.569767
273	1	1	treatment_suggestion	Hypertension Management Optimization	Current treatment plan shows good response. Consider adding lifestyle interventions to potentially reduce medication dependency.	low	f	0.78	{"references": ["JNC 8 Guidelines", "AHA Lifestyle Guidelines"], "suggestedActions": ["DASH diet counseling", "Regular exercise program", "Weight management"], "relatedConditions": ["Hypertension", "ACE Inhibitor Therapy"]}	active	pending	2025-11-18 03:50:51.569767
274	1	2	preventive_care	Diabetic Screening Recommendations	Patient due for annual diabetic complications screening. Schedule eye exam, foot examination, and kidney function tests.	medium	t	0.95	{"references": ["ADA Standards of Care", "Diabetic Complications Guidelines"], "suggestedActions": ["Ophthalmology referral", "Podiatry consultation", "Lab work: HbA1c, microalbumin"], "relatedConditions": ["Type 2 Diabetes", "Preventive Care"]}	active	pending	2025-11-18 03:50:51.569767
275	1	1	risk_alert	Medication Adherence Concern	AI analysis of prescription refill patterns suggests potential adherence issues. Patient may benefit from medication management support.	medium	t	0.73	{"references": ["Medication Adherence Guidelines", "Patient Education Resources"], "suggestedActions": ["Adherence counseling", "Pill organizer", "Follow-up call"], "relatedConditions": ["Medication Adherence", "Hypertension"]}	active	pending	2025-11-18 03:50:51.569767
276	1	1	risk_alert	Cardiovascular Risk Assessment	Based on recent blood pressure readings and family history, patient shows elevated cardiovascular risk factors. Consider lifestyle modifications and medication review.	medium	t	0.85	{"references": ["AHA Guidelines 2023", "ESC Guidelines"], "suggestedActions": ["Diet consultation", "Exercise program", "Medication review"], "relatedConditions": ["Hypertension", "Family History CVD"]}	active	pending	2025-11-18 03:58:53.551472
277	1	2	drug_interaction	Potential Drug Interaction Alert	Interaction detected between Metformin and newly prescribed medication. Monitor glucose levels closely and consider dosage adjustment.	high	t	0.92	{"references": ["Drug Interaction Database", "FDA Guidelines"], "suggestedActions": ["Monitor blood glucose", "Review medication timing", "Patient education"], "relatedConditions": ["Type 2 Diabetes", "Drug Interaction"]}	active	pending	2025-11-18 03:58:53.551472
278	1	1	treatment_suggestion	Hypertension Management Optimization	Current treatment plan shows good response. Consider adding lifestyle interventions to potentially reduce medication dependency.	low	f	0.78	{"references": ["JNC 8 Guidelines", "AHA Lifestyle Guidelines"], "suggestedActions": ["DASH diet counseling", "Regular exercise program", "Weight management"], "relatedConditions": ["Hypertension", "ACE Inhibitor Therapy"]}	active	pending	2025-11-18 03:58:53.551472
279	1	2	preventive_care	Diabetic Screening Recommendations	Patient due for annual diabetic complications screening. Schedule eye exam, foot examination, and kidney function tests.	medium	t	0.95	{"references": ["ADA Standards of Care", "Diabetic Complications Guidelines"], "suggestedActions": ["Ophthalmology referral", "Podiatry consultation", "Lab work: HbA1c, microalbumin"], "relatedConditions": ["Type 2 Diabetes", "Preventive Care"]}	active	pending	2025-11-18 03:58:53.551472
280	1	1	risk_alert	Medication Adherence Concern	AI analysis of prescription refill patterns suggests potential adherence issues. Patient may benefit from medication management support.	medium	t	0.73	{"references": ["Medication Adherence Guidelines", "Patient Education Resources"], "suggestedActions": ["Adherence counseling", "Pill organizer", "Follow-up call"], "relatedConditions": ["Medication Adherence", "Hypertension"]}	active	pending	2025-11-18 03:58:53.551472
281	1	1	risk_alert	Cardiovascular Risk Assessment	Based on recent blood pressure readings and family history, patient shows elevated cardiovascular risk factors. Consider lifestyle modifications and medication review.	medium	t	0.85	{"references": ["AHA Guidelines 2023", "ESC Guidelines"], "suggestedActions": ["Diet consultation", "Exercise program", "Medication review"], "relatedConditions": ["Hypertension", "Family History CVD"]}	active	pending	2025-11-18 04:21:25.000203
282	1	2	drug_interaction	Potential Drug Interaction Alert	Interaction detected between Metformin and newly prescribed medication. Monitor glucose levels closely and consider dosage adjustment.	high	t	0.92	{"references": ["Drug Interaction Database", "FDA Guidelines"], "suggestedActions": ["Monitor blood glucose", "Review medication timing", "Patient education"], "relatedConditions": ["Type 2 Diabetes", "Drug Interaction"]}	active	pending	2025-11-18 04:21:25.000203
283	1	1	treatment_suggestion	Hypertension Management Optimization	Current treatment plan shows good response. Consider adding lifestyle interventions to potentially reduce medication dependency.	low	f	0.78	{"references": ["JNC 8 Guidelines", "AHA Lifestyle Guidelines"], "suggestedActions": ["DASH diet counseling", "Regular exercise program", "Weight management"], "relatedConditions": ["Hypertension", "ACE Inhibitor Therapy"]}	active	pending	2025-11-18 04:21:25.000203
284	1	2	preventive_care	Diabetic Screening Recommendations	Patient due for annual diabetic complications screening. Schedule eye exam, foot examination, and kidney function tests.	medium	t	0.95	{"references": ["ADA Standards of Care", "Diabetic Complications Guidelines"], "suggestedActions": ["Ophthalmology referral", "Podiatry consultation", "Lab work: HbA1c, microalbumin"], "relatedConditions": ["Type 2 Diabetes", "Preventive Care"]}	active	pending	2025-11-18 04:21:25.000203
285	1	1	risk_alert	Medication Adherence Concern	AI analysis of prescription refill patterns suggests potential adherence issues. Patient may benefit from medication management support.	medium	t	0.73	{"references": ["Medication Adherence Guidelines", "Patient Education Resources"], "suggestedActions": ["Adherence counseling", "Pill organizer", "Follow-up call"], "relatedConditions": ["Medication Adherence", "Hypertension"]}	active	pending	2025-11-18 04:21:25.000203
286	1	1	risk_alert	Cardiovascular Risk Assessment	Based on recent blood pressure readings and family history, patient shows elevated cardiovascular risk factors. Consider lifestyle modifications and medication review.	medium	t	0.85	{"references": ["AHA Guidelines 2023", "ESC Guidelines"], "suggestedActions": ["Diet consultation", "Exercise program", "Medication review"], "relatedConditions": ["Hypertension", "Family History CVD"]}	active	pending	2025-11-18 04:33:56.741496
287	1	2	drug_interaction	Potential Drug Interaction Alert	Interaction detected between Metformin and newly prescribed medication. Monitor glucose levels closely and consider dosage adjustment.	high	t	0.92	{"references": ["Drug Interaction Database", "FDA Guidelines"], "suggestedActions": ["Monitor blood glucose", "Review medication timing", "Patient education"], "relatedConditions": ["Type 2 Diabetes", "Drug Interaction"]}	active	pending	2025-11-18 04:33:56.741496
288	1	1	treatment_suggestion	Hypertension Management Optimization	Current treatment plan shows good response. Consider adding lifestyle interventions to potentially reduce medication dependency.	low	f	0.78	{"references": ["JNC 8 Guidelines", "AHA Lifestyle Guidelines"], "suggestedActions": ["DASH diet counseling", "Regular exercise program", "Weight management"], "relatedConditions": ["Hypertension", "ACE Inhibitor Therapy"]}	active	pending	2025-11-18 04:33:56.741496
289	1	2	preventive_care	Diabetic Screening Recommendations	Patient due for annual diabetic complications screening. Schedule eye exam, foot examination, and kidney function tests.	medium	t	0.95	{"references": ["ADA Standards of Care", "Diabetic Complications Guidelines"], "suggestedActions": ["Ophthalmology referral", "Podiatry consultation", "Lab work: HbA1c, microalbumin"], "relatedConditions": ["Type 2 Diabetes", "Preventive Care"]}	active	pending	2025-11-18 04:33:56.741496
290	1	1	risk_alert	Medication Adherence Concern	AI analysis of prescription refill patterns suggests potential adherence issues. Patient may benefit from medication management support.	medium	t	0.73	{"references": ["Medication Adherence Guidelines", "Patient Education Resources"], "suggestedActions": ["Adherence counseling", "Pill organizer", "Follow-up call"], "relatedConditions": ["Medication Adherence", "Hypertension"]}	active	pending	2025-11-18 04:33:56.741496
291	1	1	risk_alert	Cardiovascular Risk Assessment	Based on recent blood pressure readings and family history, patient shows elevated cardiovascular risk factors. Consider lifestyle modifications and medication review.	medium	t	0.85	{"references": ["AHA Guidelines 2023", "ESC Guidelines"], "suggestedActions": ["Diet consultation", "Exercise program", "Medication review"], "relatedConditions": ["Hypertension", "Family History CVD"]}	active	pending	2025-11-18 04:49:54.385643
292	1	2	drug_interaction	Potential Drug Interaction Alert	Interaction detected between Metformin and newly prescribed medication. Monitor glucose levels closely and consider dosage adjustment.	high	t	0.92	{"references": ["Drug Interaction Database", "FDA Guidelines"], "suggestedActions": ["Monitor blood glucose", "Review medication timing", "Patient education"], "relatedConditions": ["Type 2 Diabetes", "Drug Interaction"]}	active	pending	2025-11-18 04:49:54.385643
293	1	1	treatment_suggestion	Hypertension Management Optimization	Current treatment plan shows good response. Consider adding lifestyle interventions to potentially reduce medication dependency.	low	f	0.78	{"references": ["JNC 8 Guidelines", "AHA Lifestyle Guidelines"], "suggestedActions": ["DASH diet counseling", "Regular exercise program", "Weight management"], "relatedConditions": ["Hypertension", "ACE Inhibitor Therapy"]}	active	pending	2025-11-18 04:49:54.385643
294	1	2	preventive_care	Diabetic Screening Recommendations	Patient due for annual diabetic complications screening. Schedule eye exam, foot examination, and kidney function tests.	medium	t	0.95	{"references": ["ADA Standards of Care", "Diabetic Complications Guidelines"], "suggestedActions": ["Ophthalmology referral", "Podiatry consultation", "Lab work: HbA1c, microalbumin"], "relatedConditions": ["Type 2 Diabetes", "Preventive Care"]}	active	pending	2025-11-18 04:49:54.385643
295	1	1	risk_alert	Medication Adherence Concern	AI analysis of prescription refill patterns suggests potential adherence issues. Patient may benefit from medication management support.	medium	t	0.73	{"references": ["Medication Adherence Guidelines", "Patient Education Resources"], "suggestedActions": ["Adherence counseling", "Pill organizer", "Follow-up call"], "relatedConditions": ["Medication Adherence", "Hypertension"]}	active	pending	2025-11-18 04:49:54.385643
296	1	1	risk_alert	Cardiovascular Risk Assessment	Based on recent blood pressure readings and family history, patient shows elevated cardiovascular risk factors. Consider lifestyle modifications and medication review.	medium	t	0.85	{"references": ["AHA Guidelines 2023", "ESC Guidelines"], "suggestedActions": ["Diet consultation", "Exercise program", "Medication review"], "relatedConditions": ["Hypertension", "Family History CVD"]}	active	pending	2025-11-18 04:55:21.411455
297	1	2	drug_interaction	Potential Drug Interaction Alert	Interaction detected between Metformin and newly prescribed medication. Monitor glucose levels closely and consider dosage adjustment.	high	t	0.92	{"references": ["Drug Interaction Database", "FDA Guidelines"], "suggestedActions": ["Monitor blood glucose", "Review medication timing", "Patient education"], "relatedConditions": ["Type 2 Diabetes", "Drug Interaction"]}	active	pending	2025-11-18 04:55:21.411455
298	1	1	treatment_suggestion	Hypertension Management Optimization	Current treatment plan shows good response. Consider adding lifestyle interventions to potentially reduce medication dependency.	low	f	0.78	{"references": ["JNC 8 Guidelines", "AHA Lifestyle Guidelines"], "suggestedActions": ["DASH diet counseling", "Regular exercise program", "Weight management"], "relatedConditions": ["Hypertension", "ACE Inhibitor Therapy"]}	active	pending	2025-11-18 04:55:21.411455
299	1	2	preventive_care	Diabetic Screening Recommendations	Patient due for annual diabetic complications screening. Schedule eye exam, foot examination, and kidney function tests.	medium	t	0.95	{"references": ["ADA Standards of Care", "Diabetic Complications Guidelines"], "suggestedActions": ["Ophthalmology referral", "Podiatry consultation", "Lab work: HbA1c, microalbumin"], "relatedConditions": ["Type 2 Diabetes", "Preventive Care"]}	active	pending	2025-11-18 04:55:21.411455
300	1	1	risk_alert	Medication Adherence Concern	AI analysis of prescription refill patterns suggests potential adherence issues. Patient may benefit from medication management support.	medium	t	0.73	{"references": ["Medication Adherence Guidelines", "Patient Education Resources"], "suggestedActions": ["Adherence counseling", "Pill organizer", "Follow-up call"], "relatedConditions": ["Medication Adherence", "Hypertension"]}	active	pending	2025-11-18 04:55:21.411455
301	1	1	risk_alert	Cardiovascular Risk Assessment	Based on recent blood pressure readings and family history, patient shows elevated cardiovascular risk factors. Consider lifestyle modifications and medication review.	medium	t	0.85	{"references": ["AHA Guidelines 2023", "ESC Guidelines"], "suggestedActions": ["Diet consultation", "Exercise program", "Medication review"], "relatedConditions": ["Hypertension", "Family History CVD"]}	active	pending	2025-11-18 05:04:24.384337
302	1	2	drug_interaction	Potential Drug Interaction Alert	Interaction detected between Metformin and newly prescribed medication. Monitor glucose levels closely and consider dosage adjustment.	high	t	0.92	{"references": ["Drug Interaction Database", "FDA Guidelines"], "suggestedActions": ["Monitor blood glucose", "Review medication timing", "Patient education"], "relatedConditions": ["Type 2 Diabetes", "Drug Interaction"]}	active	pending	2025-11-18 05:04:24.384337
303	1	1	treatment_suggestion	Hypertension Management Optimization	Current treatment plan shows good response. Consider adding lifestyle interventions to potentially reduce medication dependency.	low	f	0.78	{"references": ["JNC 8 Guidelines", "AHA Lifestyle Guidelines"], "suggestedActions": ["DASH diet counseling", "Regular exercise program", "Weight management"], "relatedConditions": ["Hypertension", "ACE Inhibitor Therapy"]}	active	pending	2025-11-18 05:04:24.384337
304	1	2	preventive_care	Diabetic Screening Recommendations	Patient due for annual diabetic complications screening. Schedule eye exam, foot examination, and kidney function tests.	medium	t	0.95	{"references": ["ADA Standards of Care", "Diabetic Complications Guidelines"], "suggestedActions": ["Ophthalmology referral", "Podiatry consultation", "Lab work: HbA1c, microalbumin"], "relatedConditions": ["Type 2 Diabetes", "Preventive Care"]}	active	pending	2025-11-18 05:04:24.384337
305	1	1	risk_alert	Medication Adherence Concern	AI analysis of prescription refill patterns suggests potential adherence issues. Patient may benefit from medication management support.	medium	t	0.73	{"references": ["Medication Adherence Guidelines", "Patient Education Resources"], "suggestedActions": ["Adherence counseling", "Pill organizer", "Follow-up call"], "relatedConditions": ["Medication Adherence", "Hypertension"]}	active	pending	2025-11-18 05:04:24.384337
306	1	1	risk_alert	Cardiovascular Risk Assessment	Based on recent blood pressure readings and family history, patient shows elevated cardiovascular risk factors. Consider lifestyle modifications and medication review.	medium	t	0.85	{"references": ["AHA Guidelines 2023", "ESC Guidelines"], "suggestedActions": ["Diet consultation", "Exercise program", "Medication review"], "relatedConditions": ["Hypertension", "Family History CVD"]}	active	pending	2025-11-18 05:14:34.641974
307	1	2	drug_interaction	Potential Drug Interaction Alert	Interaction detected between Metformin and newly prescribed medication. Monitor glucose levels closely and consider dosage adjustment.	high	t	0.92	{"references": ["Drug Interaction Database", "FDA Guidelines"], "suggestedActions": ["Monitor blood glucose", "Review medication timing", "Patient education"], "relatedConditions": ["Type 2 Diabetes", "Drug Interaction"]}	active	pending	2025-11-18 05:14:34.641974
308	1	1	treatment_suggestion	Hypertension Management Optimization	Current treatment plan shows good response. Consider adding lifestyle interventions to potentially reduce medication dependency.	low	f	0.78	{"references": ["JNC 8 Guidelines", "AHA Lifestyle Guidelines"], "suggestedActions": ["DASH diet counseling", "Regular exercise program", "Weight management"], "relatedConditions": ["Hypertension", "ACE Inhibitor Therapy"]}	active	pending	2025-11-18 05:14:34.641974
309	1	2	preventive_care	Diabetic Screening Recommendations	Patient due for annual diabetic complications screening. Schedule eye exam, foot examination, and kidney function tests.	medium	t	0.95	{"references": ["ADA Standards of Care", "Diabetic Complications Guidelines"], "suggestedActions": ["Ophthalmology referral", "Podiatry consultation", "Lab work: HbA1c, microalbumin"], "relatedConditions": ["Type 2 Diabetes", "Preventive Care"]}	active	pending	2025-11-18 05:14:34.641974
310	1	1	risk_alert	Medication Adherence Concern	AI analysis of prescription refill patterns suggests potential adherence issues. Patient may benefit from medication management support.	medium	t	0.73	{"references": ["Medication Adherence Guidelines", "Patient Education Resources"], "suggestedActions": ["Adherence counseling", "Pill organizer", "Follow-up call"], "relatedConditions": ["Medication Adherence", "Hypertension"]}	active	pending	2025-11-18 05:14:34.641974
311	1	1	risk_alert	Cardiovascular Risk Assessment	Based on recent blood pressure readings and family history, patient shows elevated cardiovascular risk factors. Consider lifestyle modifications and medication review.	medium	t	0.85	{"references": ["AHA Guidelines 2023", "ESC Guidelines"], "suggestedActions": ["Diet consultation", "Exercise program", "Medication review"], "relatedConditions": ["Hypertension", "Family History CVD"]}	active	pending	2025-11-18 05:16:15.628536
312	1	2	drug_interaction	Potential Drug Interaction Alert	Interaction detected between Metformin and newly prescribed medication. Monitor glucose levels closely and consider dosage adjustment.	high	t	0.92	{"references": ["Drug Interaction Database", "FDA Guidelines"], "suggestedActions": ["Monitor blood glucose", "Review medication timing", "Patient education"], "relatedConditions": ["Type 2 Diabetes", "Drug Interaction"]}	active	pending	2025-11-18 05:16:15.628536
313	1	1	treatment_suggestion	Hypertension Management Optimization	Current treatment plan shows good response. Consider adding lifestyle interventions to potentially reduce medication dependency.	low	f	0.78	{"references": ["JNC 8 Guidelines", "AHA Lifestyle Guidelines"], "suggestedActions": ["DASH diet counseling", "Regular exercise program", "Weight management"], "relatedConditions": ["Hypertension", "ACE Inhibitor Therapy"]}	active	pending	2025-11-18 05:16:15.628536
314	1	2	preventive_care	Diabetic Screening Recommendations	Patient due for annual diabetic complications screening. Schedule eye exam, foot examination, and kidney function tests.	medium	t	0.95	{"references": ["ADA Standards of Care", "Diabetic Complications Guidelines"], "suggestedActions": ["Ophthalmology referral", "Podiatry consultation", "Lab work: HbA1c, microalbumin"], "relatedConditions": ["Type 2 Diabetes", "Preventive Care"]}	active	pending	2025-11-18 05:16:15.628536
315	1	1	risk_alert	Medication Adherence Concern	AI analysis of prescription refill patterns suggests potential adherence issues. Patient may benefit from medication management support.	medium	t	0.73	{"references": ["Medication Adherence Guidelines", "Patient Education Resources"], "suggestedActions": ["Adherence counseling", "Pill organizer", "Follow-up call"], "relatedConditions": ["Medication Adherence", "Hypertension"]}	active	pending	2025-11-18 05:16:15.628536
316	1	1	risk_alert	Cardiovascular Risk Assessment	Based on recent blood pressure readings and family history, patient shows elevated cardiovascular risk factors. Consider lifestyle modifications and medication review.	medium	t	0.85	{"references": ["AHA Guidelines 2023", "ESC Guidelines"], "suggestedActions": ["Diet consultation", "Exercise program", "Medication review"], "relatedConditions": ["Hypertension", "Family History CVD"]}	active	pending	2025-11-18 05:28:37.41704
317	1	2	drug_interaction	Potential Drug Interaction Alert	Interaction detected between Metformin and newly prescribed medication. Monitor glucose levels closely and consider dosage adjustment.	high	t	0.92	{"references": ["Drug Interaction Database", "FDA Guidelines"], "suggestedActions": ["Monitor blood glucose", "Review medication timing", "Patient education"], "relatedConditions": ["Type 2 Diabetes", "Drug Interaction"]}	active	pending	2025-11-18 05:28:37.41704
318	1	1	treatment_suggestion	Hypertension Management Optimization	Current treatment plan shows good response. Consider adding lifestyle interventions to potentially reduce medication dependency.	low	f	0.78	{"references": ["JNC 8 Guidelines", "AHA Lifestyle Guidelines"], "suggestedActions": ["DASH diet counseling", "Regular exercise program", "Weight management"], "relatedConditions": ["Hypertension", "ACE Inhibitor Therapy"]}	active	pending	2025-11-18 05:28:37.41704
319	1	2	preventive_care	Diabetic Screening Recommendations	Patient due for annual diabetic complications screening. Schedule eye exam, foot examination, and kidney function tests.	medium	t	0.95	{"references": ["ADA Standards of Care", "Diabetic Complications Guidelines"], "suggestedActions": ["Ophthalmology referral", "Podiatry consultation", "Lab work: HbA1c, microalbumin"], "relatedConditions": ["Type 2 Diabetes", "Preventive Care"]}	active	pending	2025-11-18 05:28:37.41704
320	1	1	risk_alert	Medication Adherence Concern	AI analysis of prescription refill patterns suggests potential adherence issues. Patient may benefit from medication management support.	medium	t	0.73	{"references": ["Medication Adherence Guidelines", "Patient Education Resources"], "suggestedActions": ["Adherence counseling", "Pill organizer", "Follow-up call"], "relatedConditions": ["Medication Adherence", "Hypertension"]}	active	pending	2025-11-18 05:28:37.41704
321	1	1	risk_alert	Cardiovascular Risk Assessment	Based on recent blood pressure readings and family history, patient shows elevated cardiovascular risk factors. Consider lifestyle modifications and medication review.	medium	t	0.85	{"references": ["AHA Guidelines 2023", "ESC Guidelines"], "suggestedActions": ["Diet consultation", "Exercise program", "Medication review"], "relatedConditions": ["Hypertension", "Family History CVD"]}	active	pending	2025-11-18 05:33:20.822721
322	1	2	drug_interaction	Potential Drug Interaction Alert	Interaction detected between Metformin and newly prescribed medication. Monitor glucose levels closely and consider dosage adjustment.	high	t	0.92	{"references": ["Drug Interaction Database", "FDA Guidelines"], "suggestedActions": ["Monitor blood glucose", "Review medication timing", "Patient education"], "relatedConditions": ["Type 2 Diabetes", "Drug Interaction"]}	active	pending	2025-11-18 05:33:20.822721
323	1	1	treatment_suggestion	Hypertension Management Optimization	Current treatment plan shows good response. Consider adding lifestyle interventions to potentially reduce medication dependency.	low	f	0.78	{"references": ["JNC 8 Guidelines", "AHA Lifestyle Guidelines"], "suggestedActions": ["DASH diet counseling", "Regular exercise program", "Weight management"], "relatedConditions": ["Hypertension", "ACE Inhibitor Therapy"]}	active	pending	2025-11-18 05:33:20.822721
324	1	2	preventive_care	Diabetic Screening Recommendations	Patient due for annual diabetic complications screening. Schedule eye exam, foot examination, and kidney function tests.	medium	t	0.95	{"references": ["ADA Standards of Care", "Diabetic Complications Guidelines"], "suggestedActions": ["Ophthalmology referral", "Podiatry consultation", "Lab work: HbA1c, microalbumin"], "relatedConditions": ["Type 2 Diabetes", "Preventive Care"]}	active	pending	2025-11-18 05:33:20.822721
325	1	1	risk_alert	Medication Adherence Concern	AI analysis of prescription refill patterns suggests potential adherence issues. Patient may benefit from medication management support.	medium	t	0.73	{"references": ["Medication Adherence Guidelines", "Patient Education Resources"], "suggestedActions": ["Adherence counseling", "Pill organizer", "Follow-up call"], "relatedConditions": ["Medication Adherence", "Hypertension"]}	active	pending	2025-11-18 05:33:20.822721
326	1	1	risk_alert	Cardiovascular Risk Assessment	Based on recent blood pressure readings and family history, patient shows elevated cardiovascular risk factors. Consider lifestyle modifications and medication review.	medium	t	0.85	{"references": ["AHA Guidelines 2023", "ESC Guidelines"], "suggestedActions": ["Diet consultation", "Exercise program", "Medication review"], "relatedConditions": ["Hypertension", "Family History CVD"]}	active	pending	2025-11-18 05:48:07.812451
327	1	2	drug_interaction	Potential Drug Interaction Alert	Interaction detected between Metformin and newly prescribed medication. Monitor glucose levels closely and consider dosage adjustment.	high	t	0.92	{"references": ["Drug Interaction Database", "FDA Guidelines"], "suggestedActions": ["Monitor blood glucose", "Review medication timing", "Patient education"], "relatedConditions": ["Type 2 Diabetes", "Drug Interaction"]}	active	pending	2025-11-18 05:48:07.812451
328	1	1	treatment_suggestion	Hypertension Management Optimization	Current treatment plan shows good response. Consider adding lifestyle interventions to potentially reduce medication dependency.	low	f	0.78	{"references": ["JNC 8 Guidelines", "AHA Lifestyle Guidelines"], "suggestedActions": ["DASH diet counseling", "Regular exercise program", "Weight management"], "relatedConditions": ["Hypertension", "ACE Inhibitor Therapy"]}	active	pending	2025-11-18 05:48:07.812451
329	1	2	preventive_care	Diabetic Screening Recommendations	Patient due for annual diabetic complications screening. Schedule eye exam, foot examination, and kidney function tests.	medium	t	0.95	{"references": ["ADA Standards of Care", "Diabetic Complications Guidelines"], "suggestedActions": ["Ophthalmology referral", "Podiatry consultation", "Lab work: HbA1c, microalbumin"], "relatedConditions": ["Type 2 Diabetes", "Preventive Care"]}	active	pending	2025-11-18 05:48:07.812451
330	1	1	risk_alert	Medication Adherence Concern	AI analysis of prescription refill patterns suggests potential adherence issues. Patient may benefit from medication management support.	medium	t	0.73	{"references": ["Medication Adherence Guidelines", "Patient Education Resources"], "suggestedActions": ["Adherence counseling", "Pill organizer", "Follow-up call"], "relatedConditions": ["Medication Adherence", "Hypertension"]}	active	pending	2025-11-18 05:48:07.812451
331	1	1	risk_alert	Cardiovascular Risk Assessment	Based on recent blood pressure readings and family history, patient shows elevated cardiovascular risk factors. Consider lifestyle modifications and medication review.	medium	t	0.85	{"references": ["AHA Guidelines 2023", "ESC Guidelines"], "suggestedActions": ["Diet consultation", "Exercise program", "Medication review"], "relatedConditions": ["Hypertension", "Family History CVD"]}	active	pending	2025-11-18 05:54:25.214637
332	1	2	drug_interaction	Potential Drug Interaction Alert	Interaction detected between Metformin and newly prescribed medication. Monitor glucose levels closely and consider dosage adjustment.	high	t	0.92	{"references": ["Drug Interaction Database", "FDA Guidelines"], "suggestedActions": ["Monitor blood glucose", "Review medication timing", "Patient education"], "relatedConditions": ["Type 2 Diabetes", "Drug Interaction"]}	active	pending	2025-11-18 05:54:25.214637
333	1	1	treatment_suggestion	Hypertension Management Optimization	Current treatment plan shows good response. Consider adding lifestyle interventions to potentially reduce medication dependency.	low	f	0.78	{"references": ["JNC 8 Guidelines", "AHA Lifestyle Guidelines"], "suggestedActions": ["DASH diet counseling", "Regular exercise program", "Weight management"], "relatedConditions": ["Hypertension", "ACE Inhibitor Therapy"]}	active	pending	2025-11-18 05:54:25.214637
334	1	2	preventive_care	Diabetic Screening Recommendations	Patient due for annual diabetic complications screening. Schedule eye exam, foot examination, and kidney function tests.	medium	t	0.95	{"references": ["ADA Standards of Care", "Diabetic Complications Guidelines"], "suggestedActions": ["Ophthalmology referral", "Podiatry consultation", "Lab work: HbA1c, microalbumin"], "relatedConditions": ["Type 2 Diabetes", "Preventive Care"]}	active	pending	2025-11-18 05:54:25.214637
335	1	1	risk_alert	Medication Adherence Concern	AI analysis of prescription refill patterns suggests potential adherence issues. Patient may benefit from medication management support.	medium	t	0.73	{"references": ["Medication Adherence Guidelines", "Patient Education Resources"], "suggestedActions": ["Adherence counseling", "Pill organizer", "Follow-up call"], "relatedConditions": ["Medication Adherence", "Hypertension"]}	active	pending	2025-11-18 05:54:25.214637
336	1	1	risk_alert	Cardiovascular Risk Assessment	Based on recent blood pressure readings and family history, patient shows elevated cardiovascular risk factors. Consider lifestyle modifications and medication review.	medium	t	0.85	{"references": ["AHA Guidelines 2023", "ESC Guidelines"], "suggestedActions": ["Diet consultation", "Exercise program", "Medication review"], "relatedConditions": ["Hypertension", "Family History CVD"]}	active	pending	2025-11-18 06:05:19.186827
337	1	2	drug_interaction	Potential Drug Interaction Alert	Interaction detected between Metformin and newly prescribed medication. Monitor glucose levels closely and consider dosage adjustment.	high	t	0.92	{"references": ["Drug Interaction Database", "FDA Guidelines"], "suggestedActions": ["Monitor blood glucose", "Review medication timing", "Patient education"], "relatedConditions": ["Type 2 Diabetes", "Drug Interaction"]}	active	pending	2025-11-18 06:05:19.186827
338	1	1	treatment_suggestion	Hypertension Management Optimization	Current treatment plan shows good response. Consider adding lifestyle interventions to potentially reduce medication dependency.	low	f	0.78	{"references": ["JNC 8 Guidelines", "AHA Lifestyle Guidelines"], "suggestedActions": ["DASH diet counseling", "Regular exercise program", "Weight management"], "relatedConditions": ["Hypertension", "ACE Inhibitor Therapy"]}	active	pending	2025-11-18 06:05:19.186827
339	1	2	preventive_care	Diabetic Screening Recommendations	Patient due for annual diabetic complications screening. Schedule eye exam, foot examination, and kidney function tests.	medium	t	0.95	{"references": ["ADA Standards of Care", "Diabetic Complications Guidelines"], "suggestedActions": ["Ophthalmology referral", "Podiatry consultation", "Lab work: HbA1c, microalbumin"], "relatedConditions": ["Type 2 Diabetes", "Preventive Care"]}	active	pending	2025-11-18 06:05:19.186827
340	1	1	risk_alert	Medication Adherence Concern	AI analysis of prescription refill patterns suggests potential adherence issues. Patient may benefit from medication management support.	medium	t	0.73	{"references": ["Medication Adherence Guidelines", "Patient Education Resources"], "suggestedActions": ["Adherence counseling", "Pill organizer", "Follow-up call"], "relatedConditions": ["Medication Adherence", "Hypertension"]}	active	pending	2025-11-18 06:05:19.186827
341	1	1	risk_alert	Cardiovascular Risk Assessment	Based on recent blood pressure readings and family history, patient shows elevated cardiovascular risk factors. Consider lifestyle modifications and medication review.	medium	t	0.85	{"references": ["AHA Guidelines 2023", "ESC Guidelines"], "suggestedActions": ["Diet consultation", "Exercise program", "Medication review"], "relatedConditions": ["Hypertension", "Family History CVD"]}	active	pending	2025-11-18 06:07:27.692102
342	1	2	drug_interaction	Potential Drug Interaction Alert	Interaction detected between Metformin and newly prescribed medication. Monitor glucose levels closely and consider dosage adjustment.	high	t	0.92	{"references": ["Drug Interaction Database", "FDA Guidelines"], "suggestedActions": ["Monitor blood glucose", "Review medication timing", "Patient education"], "relatedConditions": ["Type 2 Diabetes", "Drug Interaction"]}	active	pending	2025-11-18 06:07:27.692102
343	1	1	treatment_suggestion	Hypertension Management Optimization	Current treatment plan shows good response. Consider adding lifestyle interventions to potentially reduce medication dependency.	low	f	0.78	{"references": ["JNC 8 Guidelines", "AHA Lifestyle Guidelines"], "suggestedActions": ["DASH diet counseling", "Regular exercise program", "Weight management"], "relatedConditions": ["Hypertension", "ACE Inhibitor Therapy"]}	active	pending	2025-11-18 06:07:27.692102
344	1	2	preventive_care	Diabetic Screening Recommendations	Patient due for annual diabetic complications screening. Schedule eye exam, foot examination, and kidney function tests.	medium	t	0.95	{"references": ["ADA Standards of Care", "Diabetic Complications Guidelines"], "suggestedActions": ["Ophthalmology referral", "Podiatry consultation", "Lab work: HbA1c, microalbumin"], "relatedConditions": ["Type 2 Diabetes", "Preventive Care"]}	active	pending	2025-11-18 06:07:27.692102
345	1	1	risk_alert	Medication Adherence Concern	AI analysis of prescription refill patterns suggests potential adherence issues. Patient may benefit from medication management support.	medium	t	0.73	{"references": ["Medication Adherence Guidelines", "Patient Education Resources"], "suggestedActions": ["Adherence counseling", "Pill organizer", "Follow-up call"], "relatedConditions": ["Medication Adherence", "Hypertension"]}	active	pending	2025-11-18 06:07:27.692102
346	1	1	risk_alert	Cardiovascular Risk Assessment	Based on recent blood pressure readings and family history, patient shows elevated cardiovascular risk factors. Consider lifestyle modifications and medication review.	medium	t	0.85	{"references": ["AHA Guidelines 2023", "ESC Guidelines"], "suggestedActions": ["Diet consultation", "Exercise program", "Medication review"], "relatedConditions": ["Hypertension", "Family History CVD"]}	active	pending	2025-11-18 06:10:22.602487
347	1	2	drug_interaction	Potential Drug Interaction Alert	Interaction detected between Metformin and newly prescribed medication. Monitor glucose levels closely and consider dosage adjustment.	high	t	0.92	{"references": ["Drug Interaction Database", "FDA Guidelines"], "suggestedActions": ["Monitor blood glucose", "Review medication timing", "Patient education"], "relatedConditions": ["Type 2 Diabetes", "Drug Interaction"]}	active	pending	2025-11-18 06:10:22.602487
348	1	1	treatment_suggestion	Hypertension Management Optimization	Current treatment plan shows good response. Consider adding lifestyle interventions to potentially reduce medication dependency.	low	f	0.78	{"references": ["JNC 8 Guidelines", "AHA Lifestyle Guidelines"], "suggestedActions": ["DASH diet counseling", "Regular exercise program", "Weight management"], "relatedConditions": ["Hypertension", "ACE Inhibitor Therapy"]}	active	pending	2025-11-18 06:10:22.602487
349	1	2	preventive_care	Diabetic Screening Recommendations	Patient due for annual diabetic complications screening. Schedule eye exam, foot examination, and kidney function tests.	medium	t	0.95	{"references": ["ADA Standards of Care", "Diabetic Complications Guidelines"], "suggestedActions": ["Ophthalmology referral", "Podiatry consultation", "Lab work: HbA1c, microalbumin"], "relatedConditions": ["Type 2 Diabetes", "Preventive Care"]}	active	pending	2025-11-18 06:10:22.602487
350	1	1	risk_alert	Medication Adherence Concern	AI analysis of prescription refill patterns suggests potential adherence issues. Patient may benefit from medication management support.	medium	t	0.73	{"references": ["Medication Adherence Guidelines", "Patient Education Resources"], "suggestedActions": ["Adherence counseling", "Pill organizer", "Follow-up call"], "relatedConditions": ["Medication Adherence", "Hypertension"]}	active	pending	2025-11-18 06:10:22.602487
351	1	1	risk_alert	Cardiovascular Risk Assessment	Based on recent blood pressure readings and family history, patient shows elevated cardiovascular risk factors. Consider lifestyle modifications and medication review.	medium	t	0.85	{"references": ["AHA Guidelines 2023", "ESC Guidelines"], "suggestedActions": ["Diet consultation", "Exercise program", "Medication review"], "relatedConditions": ["Hypertension", "Family History CVD"]}	active	pending	2025-11-18 06:14:18.080418
352	1	2	drug_interaction	Potential Drug Interaction Alert	Interaction detected between Metformin and newly prescribed medication. Monitor glucose levels closely and consider dosage adjustment.	high	t	0.92	{"references": ["Drug Interaction Database", "FDA Guidelines"], "suggestedActions": ["Monitor blood glucose", "Review medication timing", "Patient education"], "relatedConditions": ["Type 2 Diabetes", "Drug Interaction"]}	active	pending	2025-11-18 06:14:18.080418
353	1	1	treatment_suggestion	Hypertension Management Optimization	Current treatment plan shows good response. Consider adding lifestyle interventions to potentially reduce medication dependency.	low	f	0.78	{"references": ["JNC 8 Guidelines", "AHA Lifestyle Guidelines"], "suggestedActions": ["DASH diet counseling", "Regular exercise program", "Weight management"], "relatedConditions": ["Hypertension", "ACE Inhibitor Therapy"]}	active	pending	2025-11-18 06:14:18.080418
354	1	2	preventive_care	Diabetic Screening Recommendations	Patient due for annual diabetic complications screening. Schedule eye exam, foot examination, and kidney function tests.	medium	t	0.95	{"references": ["ADA Standards of Care", "Diabetic Complications Guidelines"], "suggestedActions": ["Ophthalmology referral", "Podiatry consultation", "Lab work: HbA1c, microalbumin"], "relatedConditions": ["Type 2 Diabetes", "Preventive Care"]}	active	pending	2025-11-18 06:14:18.080418
355	1	1	risk_alert	Medication Adherence Concern	AI analysis of prescription refill patterns suggests potential adherence issues. Patient may benefit from medication management support.	medium	t	0.73	{"references": ["Medication Adherence Guidelines", "Patient Education Resources"], "suggestedActions": ["Adherence counseling", "Pill organizer", "Follow-up call"], "relatedConditions": ["Medication Adherence", "Hypertension"]}	active	pending	2025-11-18 06:14:18.080418
356	1	1	risk_alert	Cardiovascular Risk Assessment	Based on recent blood pressure readings and family history, patient shows elevated cardiovascular risk factors. Consider lifestyle modifications and medication review.	medium	t	0.85	{"references": ["AHA Guidelines 2023", "ESC Guidelines"], "suggestedActions": ["Diet consultation", "Exercise program", "Medication review"], "relatedConditions": ["Hypertension", "Family History CVD"]}	active	pending	2025-11-18 06:16:53.123302
357	1	2	drug_interaction	Potential Drug Interaction Alert	Interaction detected between Metformin and newly prescribed medication. Monitor glucose levels closely and consider dosage adjustment.	high	t	0.92	{"references": ["Drug Interaction Database", "FDA Guidelines"], "suggestedActions": ["Monitor blood glucose", "Review medication timing", "Patient education"], "relatedConditions": ["Type 2 Diabetes", "Drug Interaction"]}	active	pending	2025-11-18 06:16:53.123302
358	1	1	treatment_suggestion	Hypertension Management Optimization	Current treatment plan shows good response. Consider adding lifestyle interventions to potentially reduce medication dependency.	low	f	0.78	{"references": ["JNC 8 Guidelines", "AHA Lifestyle Guidelines"], "suggestedActions": ["DASH diet counseling", "Regular exercise program", "Weight management"], "relatedConditions": ["Hypertension", "ACE Inhibitor Therapy"]}	active	pending	2025-11-18 06:16:53.123302
359	1	2	preventive_care	Diabetic Screening Recommendations	Patient due for annual diabetic complications screening. Schedule eye exam, foot examination, and kidney function tests.	medium	t	0.95	{"references": ["ADA Standards of Care", "Diabetic Complications Guidelines"], "suggestedActions": ["Ophthalmology referral", "Podiatry consultation", "Lab work: HbA1c, microalbumin"], "relatedConditions": ["Type 2 Diabetes", "Preventive Care"]}	active	pending	2025-11-18 06:16:53.123302
360	1	1	risk_alert	Medication Adherence Concern	AI analysis of prescription refill patterns suggests potential adherence issues. Patient may benefit from medication management support.	medium	t	0.73	{"references": ["Medication Adherence Guidelines", "Patient Education Resources"], "suggestedActions": ["Adherence counseling", "Pill organizer", "Follow-up call"], "relatedConditions": ["Medication Adherence", "Hypertension"]}	active	pending	2025-11-18 06:16:53.123302
361	1	1	risk_alert	Cardiovascular Risk Assessment	Based on recent blood pressure readings and family history, patient shows elevated cardiovascular risk factors. Consider lifestyle modifications and medication review.	medium	t	0.85	{"references": ["AHA Guidelines 2023", "ESC Guidelines"], "suggestedActions": ["Diet consultation", "Exercise program", "Medication review"], "relatedConditions": ["Hypertension", "Family History CVD"]}	active	pending	2025-11-18 06:20:02.841123
362	1	2	drug_interaction	Potential Drug Interaction Alert	Interaction detected between Metformin and newly prescribed medication. Monitor glucose levels closely and consider dosage adjustment.	high	t	0.92	{"references": ["Drug Interaction Database", "FDA Guidelines"], "suggestedActions": ["Monitor blood glucose", "Review medication timing", "Patient education"], "relatedConditions": ["Type 2 Diabetes", "Drug Interaction"]}	active	pending	2025-11-18 06:20:02.841123
363	1	1	treatment_suggestion	Hypertension Management Optimization	Current treatment plan shows good response. Consider adding lifestyle interventions to potentially reduce medication dependency.	low	f	0.78	{"references": ["JNC 8 Guidelines", "AHA Lifestyle Guidelines"], "suggestedActions": ["DASH diet counseling", "Regular exercise program", "Weight management"], "relatedConditions": ["Hypertension", "ACE Inhibitor Therapy"]}	active	pending	2025-11-18 06:20:02.841123
364	1	2	preventive_care	Diabetic Screening Recommendations	Patient due for annual diabetic complications screening. Schedule eye exam, foot examination, and kidney function tests.	medium	t	0.95	{"references": ["ADA Standards of Care", "Diabetic Complications Guidelines"], "suggestedActions": ["Ophthalmology referral", "Podiatry consultation", "Lab work: HbA1c, microalbumin"], "relatedConditions": ["Type 2 Diabetes", "Preventive Care"]}	active	pending	2025-11-18 06:20:02.841123
365	1	1	risk_alert	Medication Adherence Concern	AI analysis of prescription refill patterns suggests potential adherence issues. Patient may benefit from medication management support.	medium	t	0.73	{"references": ["Medication Adherence Guidelines", "Patient Education Resources"], "suggestedActions": ["Adherence counseling", "Pill organizer", "Follow-up call"], "relatedConditions": ["Medication Adherence", "Hypertension"]}	active	pending	2025-11-18 06:20:02.841123
366	1	1	risk_alert	Cardiovascular Risk Assessment	Based on recent blood pressure readings and family history, patient shows elevated cardiovascular risk factors. Consider lifestyle modifications and medication review.	medium	t	0.85	{"references": ["AHA Guidelines 2023", "ESC Guidelines"], "suggestedActions": ["Diet consultation", "Exercise program", "Medication review"], "relatedConditions": ["Hypertension", "Family History CVD"]}	active	pending	2025-11-18 06:23:11.281802
367	1	2	drug_interaction	Potential Drug Interaction Alert	Interaction detected between Metformin and newly prescribed medication. Monitor glucose levels closely and consider dosage adjustment.	high	t	0.92	{"references": ["Drug Interaction Database", "FDA Guidelines"], "suggestedActions": ["Monitor blood glucose", "Review medication timing", "Patient education"], "relatedConditions": ["Type 2 Diabetes", "Drug Interaction"]}	active	pending	2025-11-18 06:23:11.281802
368	1	1	treatment_suggestion	Hypertension Management Optimization	Current treatment plan shows good response. Consider adding lifestyle interventions to potentially reduce medication dependency.	low	f	0.78	{"references": ["JNC 8 Guidelines", "AHA Lifestyle Guidelines"], "suggestedActions": ["DASH diet counseling", "Regular exercise program", "Weight management"], "relatedConditions": ["Hypertension", "ACE Inhibitor Therapy"]}	active	pending	2025-11-18 06:23:11.281802
369	1	2	preventive_care	Diabetic Screening Recommendations	Patient due for annual diabetic complications screening. Schedule eye exam, foot examination, and kidney function tests.	medium	t	0.95	{"references": ["ADA Standards of Care", "Diabetic Complications Guidelines"], "suggestedActions": ["Ophthalmology referral", "Podiatry consultation", "Lab work: HbA1c, microalbumin"], "relatedConditions": ["Type 2 Diabetes", "Preventive Care"]}	active	pending	2025-11-18 06:23:11.281802
370	1	1	risk_alert	Medication Adherence Concern	AI analysis of prescription refill patterns suggests potential adherence issues. Patient may benefit from medication management support.	medium	t	0.73	{"references": ["Medication Adherence Guidelines", "Patient Education Resources"], "suggestedActions": ["Adherence counseling", "Pill organizer", "Follow-up call"], "relatedConditions": ["Medication Adherence", "Hypertension"]}	active	pending	2025-11-18 06:23:11.281802
371	1	1	risk_alert	Cardiovascular Risk Assessment	Based on recent blood pressure readings and family history, patient shows elevated cardiovascular risk factors. Consider lifestyle modifications and medication review.	medium	t	0.85	{"references": ["AHA Guidelines 2023", "ESC Guidelines"], "suggestedActions": ["Diet consultation", "Exercise program", "Medication review"], "relatedConditions": ["Hypertension", "Family History CVD"]}	active	pending	2025-11-18 06:28:10.530453
372	1	2	drug_interaction	Potential Drug Interaction Alert	Interaction detected between Metformin and newly prescribed medication. Monitor glucose levels closely and consider dosage adjustment.	high	t	0.92	{"references": ["Drug Interaction Database", "FDA Guidelines"], "suggestedActions": ["Monitor blood glucose", "Review medication timing", "Patient education"], "relatedConditions": ["Type 2 Diabetes", "Drug Interaction"]}	active	pending	2025-11-18 06:28:10.530453
373	1	1	treatment_suggestion	Hypertension Management Optimization	Current treatment plan shows good response. Consider adding lifestyle interventions to potentially reduce medication dependency.	low	f	0.78	{"references": ["JNC 8 Guidelines", "AHA Lifestyle Guidelines"], "suggestedActions": ["DASH diet counseling", "Regular exercise program", "Weight management"], "relatedConditions": ["Hypertension", "ACE Inhibitor Therapy"]}	active	pending	2025-11-18 06:28:10.530453
374	1	2	preventive_care	Diabetic Screening Recommendations	Patient due for annual diabetic complications screening. Schedule eye exam, foot examination, and kidney function tests.	medium	t	0.95	{"references": ["ADA Standards of Care", "Diabetic Complications Guidelines"], "suggestedActions": ["Ophthalmology referral", "Podiatry consultation", "Lab work: HbA1c, microalbumin"], "relatedConditions": ["Type 2 Diabetes", "Preventive Care"]}	active	pending	2025-11-18 06:28:10.530453
375	1	1	risk_alert	Medication Adherence Concern	AI analysis of prescription refill patterns suggests potential adherence issues. Patient may benefit from medication management support.	medium	t	0.73	{"references": ["Medication Adherence Guidelines", "Patient Education Resources"], "suggestedActions": ["Adherence counseling", "Pill organizer", "Follow-up call"], "relatedConditions": ["Medication Adherence", "Hypertension"]}	active	pending	2025-11-18 06:28:10.530453
376	1	1	risk_alert	Cardiovascular Risk Assessment	Based on recent blood pressure readings and family history, patient shows elevated cardiovascular risk factors. Consider lifestyle modifications and medication review.	medium	t	0.85	{"references": ["AHA Guidelines 2023", "ESC Guidelines"], "suggestedActions": ["Diet consultation", "Exercise program", "Medication review"], "relatedConditions": ["Hypertension", "Family History CVD"]}	active	pending	2025-11-18 06:31:21.0043
377	1	2	drug_interaction	Potential Drug Interaction Alert	Interaction detected between Metformin and newly prescribed medication. Monitor glucose levels closely and consider dosage adjustment.	high	t	0.92	{"references": ["Drug Interaction Database", "FDA Guidelines"], "suggestedActions": ["Monitor blood glucose", "Review medication timing", "Patient education"], "relatedConditions": ["Type 2 Diabetes", "Drug Interaction"]}	active	pending	2025-11-18 06:31:21.0043
378	1	1	treatment_suggestion	Hypertension Management Optimization	Current treatment plan shows good response. Consider adding lifestyle interventions to potentially reduce medication dependency.	low	f	0.78	{"references": ["JNC 8 Guidelines", "AHA Lifestyle Guidelines"], "suggestedActions": ["DASH diet counseling", "Regular exercise program", "Weight management"], "relatedConditions": ["Hypertension", "ACE Inhibitor Therapy"]}	active	pending	2025-11-18 06:31:21.0043
379	1	2	preventive_care	Diabetic Screening Recommendations	Patient due for annual diabetic complications screening. Schedule eye exam, foot examination, and kidney function tests.	medium	t	0.95	{"references": ["ADA Standards of Care", "Diabetic Complications Guidelines"], "suggestedActions": ["Ophthalmology referral", "Podiatry consultation", "Lab work: HbA1c, microalbumin"], "relatedConditions": ["Type 2 Diabetes", "Preventive Care"]}	active	pending	2025-11-18 06:31:21.0043
380	1	1	risk_alert	Medication Adherence Concern	AI analysis of prescription refill patterns suggests potential adherence issues. Patient may benefit from medication management support.	medium	t	0.73	{"references": ["Medication Adherence Guidelines", "Patient Education Resources"], "suggestedActions": ["Adherence counseling", "Pill organizer", "Follow-up call"], "relatedConditions": ["Medication Adherence", "Hypertension"]}	active	pending	2025-11-18 06:31:21.0043
381	1	1	risk_alert	Cardiovascular Risk Assessment	Based on recent blood pressure readings and family history, patient shows elevated cardiovascular risk factors. Consider lifestyle modifications and medication review.	medium	t	0.85	{"references": ["AHA Guidelines 2023", "ESC Guidelines"], "suggestedActions": ["Diet consultation", "Exercise program", "Medication review"], "relatedConditions": ["Hypertension", "Family History CVD"]}	active	pending	2025-11-18 06:36:16.748911
382	1	2	drug_interaction	Potential Drug Interaction Alert	Interaction detected between Metformin and newly prescribed medication. Monitor glucose levels closely and consider dosage adjustment.	high	t	0.92	{"references": ["Drug Interaction Database", "FDA Guidelines"], "suggestedActions": ["Monitor blood glucose", "Review medication timing", "Patient education"], "relatedConditions": ["Type 2 Diabetes", "Drug Interaction"]}	active	pending	2025-11-18 06:36:16.748911
383	1	1	treatment_suggestion	Hypertension Management Optimization	Current treatment plan shows good response. Consider adding lifestyle interventions to potentially reduce medication dependency.	low	f	0.78	{"references": ["JNC 8 Guidelines", "AHA Lifestyle Guidelines"], "suggestedActions": ["DASH diet counseling", "Regular exercise program", "Weight management"], "relatedConditions": ["Hypertension", "ACE Inhibitor Therapy"]}	active	pending	2025-11-18 06:36:16.748911
384	1	2	preventive_care	Diabetic Screening Recommendations	Patient due for annual diabetic complications screening. Schedule eye exam, foot examination, and kidney function tests.	medium	t	0.95	{"references": ["ADA Standards of Care", "Diabetic Complications Guidelines"], "suggestedActions": ["Ophthalmology referral", "Podiatry consultation", "Lab work: HbA1c, microalbumin"], "relatedConditions": ["Type 2 Diabetes", "Preventive Care"]}	active	pending	2025-11-18 06:36:16.748911
385	1	1	risk_alert	Medication Adherence Concern	AI analysis of prescription refill patterns suggests potential adherence issues. Patient may benefit from medication management support.	medium	t	0.73	{"references": ["Medication Adherence Guidelines", "Patient Education Resources"], "suggestedActions": ["Adherence counseling", "Pill organizer", "Follow-up call"], "relatedConditions": ["Medication Adherence", "Hypertension"]}	active	pending	2025-11-18 06:36:16.748911
386	1	1	risk_alert	Cardiovascular Risk Assessment	Based on recent blood pressure readings and family history, patient shows elevated cardiovascular risk factors. Consider lifestyle modifications and medication review.	medium	t	0.85	{"references": ["AHA Guidelines 2023", "ESC Guidelines"], "suggestedActions": ["Diet consultation", "Exercise program", "Medication review"], "relatedConditions": ["Hypertension", "Family History CVD"]}	active	pending	2025-11-18 06:41:47.415267
387	1	2	drug_interaction	Potential Drug Interaction Alert	Interaction detected between Metformin and newly prescribed medication. Monitor glucose levels closely and consider dosage adjustment.	high	t	0.92	{"references": ["Drug Interaction Database", "FDA Guidelines"], "suggestedActions": ["Monitor blood glucose", "Review medication timing", "Patient education"], "relatedConditions": ["Type 2 Diabetes", "Drug Interaction"]}	active	pending	2025-11-18 06:41:47.415267
388	1	1	treatment_suggestion	Hypertension Management Optimization	Current treatment plan shows good response. Consider adding lifestyle interventions to potentially reduce medication dependency.	low	f	0.78	{"references": ["JNC 8 Guidelines", "AHA Lifestyle Guidelines"], "suggestedActions": ["DASH diet counseling", "Regular exercise program", "Weight management"], "relatedConditions": ["Hypertension", "ACE Inhibitor Therapy"]}	active	pending	2025-11-18 06:41:47.415267
389	1	2	preventive_care	Diabetic Screening Recommendations	Patient due for annual diabetic complications screening. Schedule eye exam, foot examination, and kidney function tests.	medium	t	0.95	{"references": ["ADA Standards of Care", "Diabetic Complications Guidelines"], "suggestedActions": ["Ophthalmology referral", "Podiatry consultation", "Lab work: HbA1c, microalbumin"], "relatedConditions": ["Type 2 Diabetes", "Preventive Care"]}	active	pending	2025-11-18 06:41:47.415267
390	1	1	risk_alert	Medication Adherence Concern	AI analysis of prescription refill patterns suggests potential adherence issues. Patient may benefit from medication management support.	medium	t	0.73	{"references": ["Medication Adherence Guidelines", "Patient Education Resources"], "suggestedActions": ["Adherence counseling", "Pill organizer", "Follow-up call"], "relatedConditions": ["Medication Adherence", "Hypertension"]}	active	pending	2025-11-18 06:41:47.415267
391	1	1	risk_alert	Cardiovascular Risk Assessment	Based on recent blood pressure readings and family history, patient shows elevated cardiovascular risk factors. Consider lifestyle modifications and medication review.	medium	t	0.85	{"references": ["AHA Guidelines 2023", "ESC Guidelines"], "suggestedActions": ["Diet consultation", "Exercise program", "Medication review"], "relatedConditions": ["Hypertension", "Family History CVD"]}	active	pending	2025-11-18 06:43:44.847764
392	1	2	drug_interaction	Potential Drug Interaction Alert	Interaction detected between Metformin and newly prescribed medication. Monitor glucose levels closely and consider dosage adjustment.	high	t	0.92	{"references": ["Drug Interaction Database", "FDA Guidelines"], "suggestedActions": ["Monitor blood glucose", "Review medication timing", "Patient education"], "relatedConditions": ["Type 2 Diabetes", "Drug Interaction"]}	active	pending	2025-11-18 06:43:44.847764
393	1	1	treatment_suggestion	Hypertension Management Optimization	Current treatment plan shows good response. Consider adding lifestyle interventions to potentially reduce medication dependency.	low	f	0.78	{"references": ["JNC 8 Guidelines", "AHA Lifestyle Guidelines"], "suggestedActions": ["DASH diet counseling", "Regular exercise program", "Weight management"], "relatedConditions": ["Hypertension", "ACE Inhibitor Therapy"]}	active	pending	2025-11-18 06:43:44.847764
394	1	2	preventive_care	Diabetic Screening Recommendations	Patient due for annual diabetic complications screening. Schedule eye exam, foot examination, and kidney function tests.	medium	t	0.95	{"references": ["ADA Standards of Care", "Diabetic Complications Guidelines"], "suggestedActions": ["Ophthalmology referral", "Podiatry consultation", "Lab work: HbA1c, microalbumin"], "relatedConditions": ["Type 2 Diabetes", "Preventive Care"]}	active	pending	2025-11-18 06:43:44.847764
395	1	1	risk_alert	Medication Adherence Concern	AI analysis of prescription refill patterns suggests potential adherence issues. Patient may benefit from medication management support.	medium	t	0.73	{"references": ["Medication Adherence Guidelines", "Patient Education Resources"], "suggestedActions": ["Adherence counseling", "Pill organizer", "Follow-up call"], "relatedConditions": ["Medication Adherence", "Hypertension"]}	active	pending	2025-11-18 06:43:44.847764
396	1	1	risk_alert	Cardiovascular Risk Assessment	Based on recent blood pressure readings and family history, patient shows elevated cardiovascular risk factors. Consider lifestyle modifications and medication review.	medium	t	0.85	{"references": ["AHA Guidelines 2023", "ESC Guidelines"], "suggestedActions": ["Diet consultation", "Exercise program", "Medication review"], "relatedConditions": ["Hypertension", "Family History CVD"]}	active	pending	2025-11-18 06:49:47.348605
397	1	2	drug_interaction	Potential Drug Interaction Alert	Interaction detected between Metformin and newly prescribed medication. Monitor glucose levels closely and consider dosage adjustment.	high	t	0.92	{"references": ["Drug Interaction Database", "FDA Guidelines"], "suggestedActions": ["Monitor blood glucose", "Review medication timing", "Patient education"], "relatedConditions": ["Type 2 Diabetes", "Drug Interaction"]}	active	pending	2025-11-18 06:49:47.348605
398	1	1	treatment_suggestion	Hypertension Management Optimization	Current treatment plan shows good response. Consider adding lifestyle interventions to potentially reduce medication dependency.	low	f	0.78	{"references": ["JNC 8 Guidelines", "AHA Lifestyle Guidelines"], "suggestedActions": ["DASH diet counseling", "Regular exercise program", "Weight management"], "relatedConditions": ["Hypertension", "ACE Inhibitor Therapy"]}	active	pending	2025-11-18 06:49:47.348605
399	1	2	preventive_care	Diabetic Screening Recommendations	Patient due for annual diabetic complications screening. Schedule eye exam, foot examination, and kidney function tests.	medium	t	0.95	{"references": ["ADA Standards of Care", "Diabetic Complications Guidelines"], "suggestedActions": ["Ophthalmology referral", "Podiatry consultation", "Lab work: HbA1c, microalbumin"], "relatedConditions": ["Type 2 Diabetes", "Preventive Care"]}	active	pending	2025-11-18 06:49:47.348605
400	1	1	risk_alert	Medication Adherence Concern	AI analysis of prescription refill patterns suggests potential adherence issues. Patient may benefit from medication management support.	medium	t	0.73	{"references": ["Medication Adherence Guidelines", "Patient Education Resources"], "suggestedActions": ["Adherence counseling", "Pill organizer", "Follow-up call"], "relatedConditions": ["Medication Adherence", "Hypertension"]}	active	pending	2025-11-18 06:49:47.348605
401	1	1	risk_alert	Cardiovascular Risk Assessment	Based on recent blood pressure readings and family history, patient shows elevated cardiovascular risk factors. Consider lifestyle modifications and medication review.	medium	t	0.85	{"references": ["AHA Guidelines 2023", "ESC Guidelines"], "suggestedActions": ["Diet consultation", "Exercise program", "Medication review"], "relatedConditions": ["Hypertension", "Family History CVD"]}	active	pending	2025-11-18 07:10:05.996777
402	1	2	drug_interaction	Potential Drug Interaction Alert	Interaction detected between Metformin and newly prescribed medication. Monitor glucose levels closely and consider dosage adjustment.	high	t	0.92	{"references": ["Drug Interaction Database", "FDA Guidelines"], "suggestedActions": ["Monitor blood glucose", "Review medication timing", "Patient education"], "relatedConditions": ["Type 2 Diabetes", "Drug Interaction"]}	active	pending	2025-11-18 07:10:05.996777
403	1	1	treatment_suggestion	Hypertension Management Optimization	Current treatment plan shows good response. Consider adding lifestyle interventions to potentially reduce medication dependency.	low	f	0.78	{"references": ["JNC 8 Guidelines", "AHA Lifestyle Guidelines"], "suggestedActions": ["DASH diet counseling", "Regular exercise program", "Weight management"], "relatedConditions": ["Hypertension", "ACE Inhibitor Therapy"]}	active	pending	2025-11-18 07:10:05.996777
404	1	2	preventive_care	Diabetic Screening Recommendations	Patient due for annual diabetic complications screening. Schedule eye exam, foot examination, and kidney function tests.	medium	t	0.95	{"references": ["ADA Standards of Care", "Diabetic Complications Guidelines"], "suggestedActions": ["Ophthalmology referral", "Podiatry consultation", "Lab work: HbA1c, microalbumin"], "relatedConditions": ["Type 2 Diabetes", "Preventive Care"]}	active	pending	2025-11-18 07:10:05.996777
405	1	1	risk_alert	Medication Adherence Concern	AI analysis of prescription refill patterns suggests potential adherence issues. Patient may benefit from medication management support.	medium	t	0.73	{"references": ["Medication Adherence Guidelines", "Patient Education Resources"], "suggestedActions": ["Adherence counseling", "Pill organizer", "Follow-up call"], "relatedConditions": ["Medication Adherence", "Hypertension"]}	active	pending	2025-11-18 07:10:05.996777
406	1	1	risk_alert	Cardiovascular Risk Assessment	Based on recent blood pressure readings and family history, patient shows elevated cardiovascular risk factors. Consider lifestyle modifications and medication review.	medium	t	0.85	{"references": ["AHA Guidelines 2023", "ESC Guidelines"], "suggestedActions": ["Diet consultation", "Exercise program", "Medication review"], "relatedConditions": ["Hypertension", "Family History CVD"]}	active	pending	2025-11-18 07:12:47.66311
407	1	2	drug_interaction	Potential Drug Interaction Alert	Interaction detected between Metformin and newly prescribed medication. Monitor glucose levels closely and consider dosage adjustment.	high	t	0.92	{"references": ["Drug Interaction Database", "FDA Guidelines"], "suggestedActions": ["Monitor blood glucose", "Review medication timing", "Patient education"], "relatedConditions": ["Type 2 Diabetes", "Drug Interaction"]}	active	pending	2025-11-18 07:12:47.66311
408	1	1	treatment_suggestion	Hypertension Management Optimization	Current treatment plan shows good response. Consider adding lifestyle interventions to potentially reduce medication dependency.	low	f	0.78	{"references": ["JNC 8 Guidelines", "AHA Lifestyle Guidelines"], "suggestedActions": ["DASH diet counseling", "Regular exercise program", "Weight management"], "relatedConditions": ["Hypertension", "ACE Inhibitor Therapy"]}	active	pending	2025-11-18 07:12:47.66311
409	1	2	preventive_care	Diabetic Screening Recommendations	Patient due for annual diabetic complications screening. Schedule eye exam, foot examination, and kidney function tests.	medium	t	0.95	{"references": ["ADA Standards of Care", "Diabetic Complications Guidelines"], "suggestedActions": ["Ophthalmology referral", "Podiatry consultation", "Lab work: HbA1c, microalbumin"], "relatedConditions": ["Type 2 Diabetes", "Preventive Care"]}	active	pending	2025-11-18 07:12:47.66311
410	1	1	risk_alert	Medication Adherence Concern	AI analysis of prescription refill patterns suggests potential adherence issues. Patient may benefit from medication management support.	medium	t	0.73	{"references": ["Medication Adherence Guidelines", "Patient Education Resources"], "suggestedActions": ["Adherence counseling", "Pill organizer", "Follow-up call"], "relatedConditions": ["Medication Adherence", "Hypertension"]}	active	pending	2025-11-18 07:12:47.66311
411	1	1	risk_alert	Cardiovascular Risk Assessment	Based on recent blood pressure readings and family history, patient shows elevated cardiovascular risk factors. Consider lifestyle modifications and medication review.	medium	t	0.85	{"references": ["AHA Guidelines 2023", "ESC Guidelines"], "suggestedActions": ["Diet consultation", "Exercise program", "Medication review"], "relatedConditions": ["Hypertension", "Family History CVD"]}	active	pending	2025-11-18 07:14:10.67463
412	1	2	drug_interaction	Potential Drug Interaction Alert	Interaction detected between Metformin and newly prescribed medication. Monitor glucose levels closely and consider dosage adjustment.	high	t	0.92	{"references": ["Drug Interaction Database", "FDA Guidelines"], "suggestedActions": ["Monitor blood glucose", "Review medication timing", "Patient education"], "relatedConditions": ["Type 2 Diabetes", "Drug Interaction"]}	active	pending	2025-11-18 07:14:10.67463
413	1	1	treatment_suggestion	Hypertension Management Optimization	Current treatment plan shows good response. Consider adding lifestyle interventions to potentially reduce medication dependency.	low	f	0.78	{"references": ["JNC 8 Guidelines", "AHA Lifestyle Guidelines"], "suggestedActions": ["DASH diet counseling", "Regular exercise program", "Weight management"], "relatedConditions": ["Hypertension", "ACE Inhibitor Therapy"]}	active	pending	2025-11-18 07:14:10.67463
414	1	2	preventive_care	Diabetic Screening Recommendations	Patient due for annual diabetic complications screening. Schedule eye exam, foot examination, and kidney function tests.	medium	t	0.95	{"references": ["ADA Standards of Care", "Diabetic Complications Guidelines"], "suggestedActions": ["Ophthalmology referral", "Podiatry consultation", "Lab work: HbA1c, microalbumin"], "relatedConditions": ["Type 2 Diabetes", "Preventive Care"]}	active	pending	2025-11-18 07:14:10.67463
415	1	1	risk_alert	Medication Adherence Concern	AI analysis of prescription refill patterns suggests potential adherence issues. Patient may benefit from medication management support.	medium	t	0.73	{"references": ["Medication Adherence Guidelines", "Patient Education Resources"], "suggestedActions": ["Adherence counseling", "Pill organizer", "Follow-up call"], "relatedConditions": ["Medication Adherence", "Hypertension"]}	active	pending	2025-11-18 07:14:10.67463
416	1	1	risk_alert	Cardiovascular Risk Assessment	Based on recent blood pressure readings and family history, patient shows elevated cardiovascular risk factors. Consider lifestyle modifications and medication review.	medium	t	0.85	{"references": ["AHA Guidelines 2023", "ESC Guidelines"], "suggestedActions": ["Diet consultation", "Exercise program", "Medication review"], "relatedConditions": ["Hypertension", "Family History CVD"]}	active	pending	2025-11-18 07:16:29.762895
417	1	2	drug_interaction	Potential Drug Interaction Alert	Interaction detected between Metformin and newly prescribed medication. Monitor glucose levels closely and consider dosage adjustment.	high	t	0.92	{"references": ["Drug Interaction Database", "FDA Guidelines"], "suggestedActions": ["Monitor blood glucose", "Review medication timing", "Patient education"], "relatedConditions": ["Type 2 Diabetes", "Drug Interaction"]}	active	pending	2025-11-18 07:16:29.762895
418	1	1	treatment_suggestion	Hypertension Management Optimization	Current treatment plan shows good response. Consider adding lifestyle interventions to potentially reduce medication dependency.	low	f	0.78	{"references": ["JNC 8 Guidelines", "AHA Lifestyle Guidelines"], "suggestedActions": ["DASH diet counseling", "Regular exercise program", "Weight management"], "relatedConditions": ["Hypertension", "ACE Inhibitor Therapy"]}	active	pending	2025-11-18 07:16:29.762895
419	1	2	preventive_care	Diabetic Screening Recommendations	Patient due for annual diabetic complications screening. Schedule eye exam, foot examination, and kidney function tests.	medium	t	0.95	{"references": ["ADA Standards of Care", "Diabetic Complications Guidelines"], "suggestedActions": ["Ophthalmology referral", "Podiatry consultation", "Lab work: HbA1c, microalbumin"], "relatedConditions": ["Type 2 Diabetes", "Preventive Care"]}	active	pending	2025-11-18 07:16:29.762895
420	1	1	risk_alert	Medication Adherence Concern	AI analysis of prescription refill patterns suggests potential adherence issues. Patient may benefit from medication management support.	medium	t	0.73	{"references": ["Medication Adherence Guidelines", "Patient Education Resources"], "suggestedActions": ["Adherence counseling", "Pill organizer", "Follow-up call"], "relatedConditions": ["Medication Adherence", "Hypertension"]}	active	pending	2025-11-18 07:16:29.762895
421	1	1	risk_alert	Cardiovascular Risk Assessment	Based on recent blood pressure readings and family history, patient shows elevated cardiovascular risk factors. Consider lifestyle modifications and medication review.	medium	t	0.85	{"references": ["AHA Guidelines 2023", "ESC Guidelines"], "suggestedActions": ["Diet consultation", "Exercise program", "Medication review"], "relatedConditions": ["Hypertension", "Family History CVD"]}	active	pending	2025-11-18 07:18:23.775444
422	1	2	drug_interaction	Potential Drug Interaction Alert	Interaction detected between Metformin and newly prescribed medication. Monitor glucose levels closely and consider dosage adjustment.	high	t	0.92	{"references": ["Drug Interaction Database", "FDA Guidelines"], "suggestedActions": ["Monitor blood glucose", "Review medication timing", "Patient education"], "relatedConditions": ["Type 2 Diabetes", "Drug Interaction"]}	active	pending	2025-11-18 07:18:23.775444
423	1	1	treatment_suggestion	Hypertension Management Optimization	Current treatment plan shows good response. Consider adding lifestyle interventions to potentially reduce medication dependency.	low	f	0.78	{"references": ["JNC 8 Guidelines", "AHA Lifestyle Guidelines"], "suggestedActions": ["DASH diet counseling", "Regular exercise program", "Weight management"], "relatedConditions": ["Hypertension", "ACE Inhibitor Therapy"]}	active	pending	2025-11-18 07:18:23.775444
424	1	2	preventive_care	Diabetic Screening Recommendations	Patient due for annual diabetic complications screening. Schedule eye exam, foot examination, and kidney function tests.	medium	t	0.95	{"references": ["ADA Standards of Care", "Diabetic Complications Guidelines"], "suggestedActions": ["Ophthalmology referral", "Podiatry consultation", "Lab work: HbA1c, microalbumin"], "relatedConditions": ["Type 2 Diabetes", "Preventive Care"]}	active	pending	2025-11-18 07:18:23.775444
425	1	1	risk_alert	Medication Adherence Concern	AI analysis of prescription refill patterns suggests potential adherence issues. Patient may benefit from medication management support.	medium	t	0.73	{"references": ["Medication Adherence Guidelines", "Patient Education Resources"], "suggestedActions": ["Adherence counseling", "Pill organizer", "Follow-up call"], "relatedConditions": ["Medication Adherence", "Hypertension"]}	active	pending	2025-11-18 07:18:23.775444
426	1	1	risk_alert	Cardiovascular Risk Assessment	Based on recent blood pressure readings and family history, patient shows elevated cardiovascular risk factors. Consider lifestyle modifications and medication review.	medium	t	0.85	{"references": ["AHA Guidelines 2023", "ESC Guidelines"], "suggestedActions": ["Diet consultation", "Exercise program", "Medication review"], "relatedConditions": ["Hypertension", "Family History CVD"]}	active	pending	2025-11-18 07:20:38.409828
427	1	2	drug_interaction	Potential Drug Interaction Alert	Interaction detected between Metformin and newly prescribed medication. Monitor glucose levels closely and consider dosage adjustment.	high	t	0.92	{"references": ["Drug Interaction Database", "FDA Guidelines"], "suggestedActions": ["Monitor blood glucose", "Review medication timing", "Patient education"], "relatedConditions": ["Type 2 Diabetes", "Drug Interaction"]}	active	pending	2025-11-18 07:20:38.409828
428	1	1	treatment_suggestion	Hypertension Management Optimization	Current treatment plan shows good response. Consider adding lifestyle interventions to potentially reduce medication dependency.	low	f	0.78	{"references": ["JNC 8 Guidelines", "AHA Lifestyle Guidelines"], "suggestedActions": ["DASH diet counseling", "Regular exercise program", "Weight management"], "relatedConditions": ["Hypertension", "ACE Inhibitor Therapy"]}	active	pending	2025-11-18 07:20:38.409828
429	1	2	preventive_care	Diabetic Screening Recommendations	Patient due for annual diabetic complications screening. Schedule eye exam, foot examination, and kidney function tests.	medium	t	0.95	{"references": ["ADA Standards of Care", "Diabetic Complications Guidelines"], "suggestedActions": ["Ophthalmology referral", "Podiatry consultation", "Lab work: HbA1c, microalbumin"], "relatedConditions": ["Type 2 Diabetes", "Preventive Care"]}	active	pending	2025-11-18 07:20:38.409828
430	1	1	risk_alert	Medication Adherence Concern	AI analysis of prescription refill patterns suggests potential adherence issues. Patient may benefit from medication management support.	medium	t	0.73	{"references": ["Medication Adherence Guidelines", "Patient Education Resources"], "suggestedActions": ["Adherence counseling", "Pill organizer", "Follow-up call"], "relatedConditions": ["Medication Adherence", "Hypertension"]}	active	pending	2025-11-18 07:20:38.409828
431	1	1	risk_alert	Cardiovascular Risk Assessment	Based on recent blood pressure readings and family history, patient shows elevated cardiovascular risk factors. Consider lifestyle modifications and medication review.	medium	t	0.85	{"references": ["AHA Guidelines 2023", "ESC Guidelines"], "suggestedActions": ["Diet consultation", "Exercise program", "Medication review"], "relatedConditions": ["Hypertension", "Family History CVD"]}	active	pending	2025-11-18 07:22:06.719017
432	1	2	drug_interaction	Potential Drug Interaction Alert	Interaction detected between Metformin and newly prescribed medication. Monitor glucose levels closely and consider dosage adjustment.	high	t	0.92	{"references": ["Drug Interaction Database", "FDA Guidelines"], "suggestedActions": ["Monitor blood glucose", "Review medication timing", "Patient education"], "relatedConditions": ["Type 2 Diabetes", "Drug Interaction"]}	active	pending	2025-11-18 07:22:06.719017
433	1	1	treatment_suggestion	Hypertension Management Optimization	Current treatment plan shows good response. Consider adding lifestyle interventions to potentially reduce medication dependency.	low	f	0.78	{"references": ["JNC 8 Guidelines", "AHA Lifestyle Guidelines"], "suggestedActions": ["DASH diet counseling", "Regular exercise program", "Weight management"], "relatedConditions": ["Hypertension", "ACE Inhibitor Therapy"]}	active	pending	2025-11-18 07:22:06.719017
434	1	2	preventive_care	Diabetic Screening Recommendations	Patient due for annual diabetic complications screening. Schedule eye exam, foot examination, and kidney function tests.	medium	t	0.95	{"references": ["ADA Standards of Care", "Diabetic Complications Guidelines"], "suggestedActions": ["Ophthalmology referral", "Podiatry consultation", "Lab work: HbA1c, microalbumin"], "relatedConditions": ["Type 2 Diabetes", "Preventive Care"]}	active	pending	2025-11-18 07:22:06.719017
435	1	1	risk_alert	Medication Adherence Concern	AI analysis of prescription refill patterns suggests potential adherence issues. Patient may benefit from medication management support.	medium	t	0.73	{"references": ["Medication Adherence Guidelines", "Patient Education Resources"], "suggestedActions": ["Adherence counseling", "Pill organizer", "Follow-up call"], "relatedConditions": ["Medication Adherence", "Hypertension"]}	active	pending	2025-11-18 07:22:06.719017
436	1	1	risk_alert	Cardiovascular Risk Assessment	Based on recent blood pressure readings and family history, patient shows elevated cardiovascular risk factors. Consider lifestyle modifications and medication review.	medium	t	0.85	{"references": ["AHA Guidelines 2023", "ESC Guidelines"], "suggestedActions": ["Diet consultation", "Exercise program", "Medication review"], "relatedConditions": ["Hypertension", "Family History CVD"]}	active	pending	2025-11-18 07:45:02.320154
437	1	2	drug_interaction	Potential Drug Interaction Alert	Interaction detected between Metformin and newly prescribed medication. Monitor glucose levels closely and consider dosage adjustment.	high	t	0.92	{"references": ["Drug Interaction Database", "FDA Guidelines"], "suggestedActions": ["Monitor blood glucose", "Review medication timing", "Patient education"], "relatedConditions": ["Type 2 Diabetes", "Drug Interaction"]}	active	pending	2025-11-18 07:45:02.320154
438	1	1	treatment_suggestion	Hypertension Management Optimization	Current treatment plan shows good response. Consider adding lifestyle interventions to potentially reduce medication dependency.	low	f	0.78	{"references": ["JNC 8 Guidelines", "AHA Lifestyle Guidelines"], "suggestedActions": ["DASH diet counseling", "Regular exercise program", "Weight management"], "relatedConditions": ["Hypertension", "ACE Inhibitor Therapy"]}	active	pending	2025-11-18 07:45:02.320154
439	1	2	preventive_care	Diabetic Screening Recommendations	Patient due for annual diabetic complications screening. Schedule eye exam, foot examination, and kidney function tests.	medium	t	0.95	{"references": ["ADA Standards of Care", "Diabetic Complications Guidelines"], "suggestedActions": ["Ophthalmology referral", "Podiatry consultation", "Lab work: HbA1c, microalbumin"], "relatedConditions": ["Type 2 Diabetes", "Preventive Care"]}	active	pending	2025-11-18 07:45:02.320154
440	1	1	risk_alert	Medication Adherence Concern	AI analysis of prescription refill patterns suggests potential adherence issues. Patient may benefit from medication management support.	medium	t	0.73	{"references": ["Medication Adherence Guidelines", "Patient Education Resources"], "suggestedActions": ["Adherence counseling", "Pill organizer", "Follow-up call"], "relatedConditions": ["Medication Adherence", "Hypertension"]}	active	pending	2025-11-18 07:45:02.320154
441	1	1	risk_alert	Cardiovascular Risk Assessment	Based on recent blood pressure readings and family history, patient shows elevated cardiovascular risk factors. Consider lifestyle modifications and medication review.	medium	t	0.85	{"references": ["AHA Guidelines 2023", "ESC Guidelines"], "suggestedActions": ["Diet consultation", "Exercise program", "Medication review"], "relatedConditions": ["Hypertension", "Family History CVD"]}	active	pending	2025-11-18 07:46:30.255211
442	1	2	drug_interaction	Potential Drug Interaction Alert	Interaction detected between Metformin and newly prescribed medication. Monitor glucose levels closely and consider dosage adjustment.	high	t	0.92	{"references": ["Drug Interaction Database", "FDA Guidelines"], "suggestedActions": ["Monitor blood glucose", "Review medication timing", "Patient education"], "relatedConditions": ["Type 2 Diabetes", "Drug Interaction"]}	active	pending	2025-11-18 07:46:30.255211
443	1	1	treatment_suggestion	Hypertension Management Optimization	Current treatment plan shows good response. Consider adding lifestyle interventions to potentially reduce medication dependency.	low	f	0.78	{"references": ["JNC 8 Guidelines", "AHA Lifestyle Guidelines"], "suggestedActions": ["DASH diet counseling", "Regular exercise program", "Weight management"], "relatedConditions": ["Hypertension", "ACE Inhibitor Therapy"]}	active	pending	2025-11-18 07:46:30.255211
444	1	2	preventive_care	Diabetic Screening Recommendations	Patient due for annual diabetic complications screening. Schedule eye exam, foot examination, and kidney function tests.	medium	t	0.95	{"references": ["ADA Standards of Care", "Diabetic Complications Guidelines"], "suggestedActions": ["Ophthalmology referral", "Podiatry consultation", "Lab work: HbA1c, microalbumin"], "relatedConditions": ["Type 2 Diabetes", "Preventive Care"]}	active	pending	2025-11-18 07:46:30.255211
445	1	1	risk_alert	Medication Adherence Concern	AI analysis of prescription refill patterns suggests potential adherence issues. Patient may benefit from medication management support.	medium	t	0.73	{"references": ["Medication Adherence Guidelines", "Patient Education Resources"], "suggestedActions": ["Adherence counseling", "Pill organizer", "Follow-up call"], "relatedConditions": ["Medication Adherence", "Hypertension"]}	active	pending	2025-11-18 07:46:30.255211
446	1	1	risk_alert	Cardiovascular Risk Assessment	Based on recent blood pressure readings and family history, patient shows elevated cardiovascular risk factors. Consider lifestyle modifications and medication review.	medium	t	0.85	{"references": ["AHA Guidelines 2023", "ESC Guidelines"], "suggestedActions": ["Diet consultation", "Exercise program", "Medication review"], "relatedConditions": ["Hypertension", "Family History CVD"]}	active	pending	2025-11-18 07:52:28.776275
447	1	2	drug_interaction	Potential Drug Interaction Alert	Interaction detected between Metformin and newly prescribed medication. Monitor glucose levels closely and consider dosage adjustment.	high	t	0.92	{"references": ["Drug Interaction Database", "FDA Guidelines"], "suggestedActions": ["Monitor blood glucose", "Review medication timing", "Patient education"], "relatedConditions": ["Type 2 Diabetes", "Drug Interaction"]}	active	pending	2025-11-18 07:52:28.776275
448	1	1	treatment_suggestion	Hypertension Management Optimization	Current treatment plan shows good response. Consider adding lifestyle interventions to potentially reduce medication dependency.	low	f	0.78	{"references": ["JNC 8 Guidelines", "AHA Lifestyle Guidelines"], "suggestedActions": ["DASH diet counseling", "Regular exercise program", "Weight management"], "relatedConditions": ["Hypertension", "ACE Inhibitor Therapy"]}	active	pending	2025-11-18 07:52:28.776275
449	1	2	preventive_care	Diabetic Screening Recommendations	Patient due for annual diabetic complications screening. Schedule eye exam, foot examination, and kidney function tests.	medium	t	0.95	{"references": ["ADA Standards of Care", "Diabetic Complications Guidelines"], "suggestedActions": ["Ophthalmology referral", "Podiatry consultation", "Lab work: HbA1c, microalbumin"], "relatedConditions": ["Type 2 Diabetes", "Preventive Care"]}	active	pending	2025-11-18 07:52:28.776275
450	1	1	risk_alert	Medication Adherence Concern	AI analysis of prescription refill patterns suggests potential adherence issues. Patient may benefit from medication management support.	medium	t	0.73	{"references": ["Medication Adherence Guidelines", "Patient Education Resources"], "suggestedActions": ["Adherence counseling", "Pill organizer", "Follow-up call"], "relatedConditions": ["Medication Adherence", "Hypertension"]}	active	pending	2025-11-18 07:52:28.776275
451	1	1	risk_alert	Cardiovascular Risk Assessment	Based on recent blood pressure readings and family history, patient shows elevated cardiovascular risk factors. Consider lifestyle modifications and medication review.	medium	t	0.85	{"references": ["AHA Guidelines 2023", "ESC Guidelines"], "suggestedActions": ["Diet consultation", "Exercise program", "Medication review"], "relatedConditions": ["Hypertension", "Family History CVD"]}	active	pending	2025-11-18 07:54:04.625982
452	1	2	drug_interaction	Potential Drug Interaction Alert	Interaction detected between Metformin and newly prescribed medication. Monitor glucose levels closely and consider dosage adjustment.	high	t	0.92	{"references": ["Drug Interaction Database", "FDA Guidelines"], "suggestedActions": ["Monitor blood glucose", "Review medication timing", "Patient education"], "relatedConditions": ["Type 2 Diabetes", "Drug Interaction"]}	active	pending	2025-11-18 07:54:04.625982
453	1	1	treatment_suggestion	Hypertension Management Optimization	Current treatment plan shows good response. Consider adding lifestyle interventions to potentially reduce medication dependency.	low	f	0.78	{"references": ["JNC 8 Guidelines", "AHA Lifestyle Guidelines"], "suggestedActions": ["DASH diet counseling", "Regular exercise program", "Weight management"], "relatedConditions": ["Hypertension", "ACE Inhibitor Therapy"]}	active	pending	2025-11-18 07:54:04.625982
454	1	2	preventive_care	Diabetic Screening Recommendations	Patient due for annual diabetic complications screening. Schedule eye exam, foot examination, and kidney function tests.	medium	t	0.95	{"references": ["ADA Standards of Care", "Diabetic Complications Guidelines"], "suggestedActions": ["Ophthalmology referral", "Podiatry consultation", "Lab work: HbA1c, microalbumin"], "relatedConditions": ["Type 2 Diabetes", "Preventive Care"]}	active	pending	2025-11-18 07:54:04.625982
455	1	1	risk_alert	Medication Adherence Concern	AI analysis of prescription refill patterns suggests potential adherence issues. Patient may benefit from medication management support.	medium	t	0.73	{"references": ["Medication Adherence Guidelines", "Patient Education Resources"], "suggestedActions": ["Adherence counseling", "Pill organizer", "Follow-up call"], "relatedConditions": ["Medication Adherence", "Hypertension"]}	active	pending	2025-11-18 07:54:04.625982
456	1	1	risk_alert	Cardiovascular Risk Assessment	Based on recent blood pressure readings and family history, patient shows elevated cardiovascular risk factors. Consider lifestyle modifications and medication review.	medium	t	0.85	{"references": ["AHA Guidelines 2023", "ESC Guidelines"], "suggestedActions": ["Diet consultation", "Exercise program", "Medication review"], "relatedConditions": ["Hypertension", "Family History CVD"]}	active	pending	2025-11-18 07:56:13.851751
457	1	2	drug_interaction	Potential Drug Interaction Alert	Interaction detected between Metformin and newly prescribed medication. Monitor glucose levels closely and consider dosage adjustment.	high	t	0.92	{"references": ["Drug Interaction Database", "FDA Guidelines"], "suggestedActions": ["Monitor blood glucose", "Review medication timing", "Patient education"], "relatedConditions": ["Type 2 Diabetes", "Drug Interaction"]}	active	pending	2025-11-18 07:56:13.851751
458	1	1	treatment_suggestion	Hypertension Management Optimization	Current treatment plan shows good response. Consider adding lifestyle interventions to potentially reduce medication dependency.	low	f	0.78	{"references": ["JNC 8 Guidelines", "AHA Lifestyle Guidelines"], "suggestedActions": ["DASH diet counseling", "Regular exercise program", "Weight management"], "relatedConditions": ["Hypertension", "ACE Inhibitor Therapy"]}	active	pending	2025-11-18 07:56:13.851751
459	1	2	preventive_care	Diabetic Screening Recommendations	Patient due for annual diabetic complications screening. Schedule eye exam, foot examination, and kidney function tests.	medium	t	0.95	{"references": ["ADA Standards of Care", "Diabetic Complications Guidelines"], "suggestedActions": ["Ophthalmology referral", "Podiatry consultation", "Lab work: HbA1c, microalbumin"], "relatedConditions": ["Type 2 Diabetes", "Preventive Care"]}	active	pending	2025-11-18 07:56:13.851751
460	1	1	risk_alert	Medication Adherence Concern	AI analysis of prescription refill patterns suggests potential adherence issues. Patient may benefit from medication management support.	medium	t	0.73	{"references": ["Medication Adherence Guidelines", "Patient Education Resources"], "suggestedActions": ["Adherence counseling", "Pill organizer", "Follow-up call"], "relatedConditions": ["Medication Adherence", "Hypertension"]}	active	pending	2025-11-18 07:56:13.851751
461	1	1	risk_alert	Cardiovascular Risk Assessment	Based on recent blood pressure readings and family history, patient shows elevated cardiovascular risk factors. Consider lifestyle modifications and medication review.	medium	t	0.85	{"references": ["AHA Guidelines 2023", "ESC Guidelines"], "suggestedActions": ["Diet consultation", "Exercise program", "Medication review"], "relatedConditions": ["Hypertension", "Family History CVD"]}	active	pending	2025-11-18 08:01:50.521571
462	1	2	drug_interaction	Potential Drug Interaction Alert	Interaction detected between Metformin and newly prescribed medication. Monitor glucose levels closely and consider dosage adjustment.	high	t	0.92	{"references": ["Drug Interaction Database", "FDA Guidelines"], "suggestedActions": ["Monitor blood glucose", "Review medication timing", "Patient education"], "relatedConditions": ["Type 2 Diabetes", "Drug Interaction"]}	active	pending	2025-11-18 08:01:50.521571
463	1	1	treatment_suggestion	Hypertension Management Optimization	Current treatment plan shows good response. Consider adding lifestyle interventions to potentially reduce medication dependency.	low	f	0.78	{"references": ["JNC 8 Guidelines", "AHA Lifestyle Guidelines"], "suggestedActions": ["DASH diet counseling", "Regular exercise program", "Weight management"], "relatedConditions": ["Hypertension", "ACE Inhibitor Therapy"]}	active	pending	2025-11-18 08:01:50.521571
464	1	2	preventive_care	Diabetic Screening Recommendations	Patient due for annual diabetic complications screening. Schedule eye exam, foot examination, and kidney function tests.	medium	t	0.95	{"references": ["ADA Standards of Care", "Diabetic Complications Guidelines"], "suggestedActions": ["Ophthalmology referral", "Podiatry consultation", "Lab work: HbA1c, microalbumin"], "relatedConditions": ["Type 2 Diabetes", "Preventive Care"]}	active	pending	2025-11-18 08:01:50.521571
465	1	1	risk_alert	Medication Adherence Concern	AI analysis of prescription refill patterns suggests potential adherence issues. Patient may benefit from medication management support.	medium	t	0.73	{"references": ["Medication Adherence Guidelines", "Patient Education Resources"], "suggestedActions": ["Adherence counseling", "Pill organizer", "Follow-up call"], "relatedConditions": ["Medication Adherence", "Hypertension"]}	active	pending	2025-11-18 08:01:50.521571
466	1	1	risk_alert	Cardiovascular Risk Assessment	Based on recent blood pressure readings and family history, patient shows elevated cardiovascular risk factors. Consider lifestyle modifications and medication review.	medium	t	0.85	{"references": ["AHA Guidelines 2023", "ESC Guidelines"], "suggestedActions": ["Diet consultation", "Exercise program", "Medication review"], "relatedConditions": ["Hypertension", "Family History CVD"]}	active	pending	2025-11-18 08:02:58.677337
467	1	2	drug_interaction	Potential Drug Interaction Alert	Interaction detected between Metformin and newly prescribed medication. Monitor glucose levels closely and consider dosage adjustment.	high	t	0.92	{"references": ["Drug Interaction Database", "FDA Guidelines"], "suggestedActions": ["Monitor blood glucose", "Review medication timing", "Patient education"], "relatedConditions": ["Type 2 Diabetes", "Drug Interaction"]}	active	pending	2025-11-18 08:02:58.677337
468	1	1	treatment_suggestion	Hypertension Management Optimization	Current treatment plan shows good response. Consider adding lifestyle interventions to potentially reduce medication dependency.	low	f	0.78	{"references": ["JNC 8 Guidelines", "AHA Lifestyle Guidelines"], "suggestedActions": ["DASH diet counseling", "Regular exercise program", "Weight management"], "relatedConditions": ["Hypertension", "ACE Inhibitor Therapy"]}	active	pending	2025-11-18 08:02:58.677337
469	1	2	preventive_care	Diabetic Screening Recommendations	Patient due for annual diabetic complications screening. Schedule eye exam, foot examination, and kidney function tests.	medium	t	0.95	{"references": ["ADA Standards of Care", "Diabetic Complications Guidelines"], "suggestedActions": ["Ophthalmology referral", "Podiatry consultation", "Lab work: HbA1c, microalbumin"], "relatedConditions": ["Type 2 Diabetes", "Preventive Care"]}	active	pending	2025-11-18 08:02:58.677337
470	1	1	risk_alert	Medication Adherence Concern	AI analysis of prescription refill patterns suggests potential adherence issues. Patient may benefit from medication management support.	medium	t	0.73	{"references": ["Medication Adherence Guidelines", "Patient Education Resources"], "suggestedActions": ["Adherence counseling", "Pill organizer", "Follow-up call"], "relatedConditions": ["Medication Adherence", "Hypertension"]}	active	pending	2025-11-18 08:02:58.677337
471	1	1	risk_alert	Cardiovascular Risk Assessment	Based on recent blood pressure readings and family history, patient shows elevated cardiovascular risk factors. Consider lifestyle modifications and medication review.	medium	t	0.85	{"references": ["AHA Guidelines 2023", "ESC Guidelines"], "suggestedActions": ["Diet consultation", "Exercise program", "Medication review"], "relatedConditions": ["Hypertension", "Family History CVD"]}	active	pending	2025-11-18 08:04:37.653068
472	1	2	drug_interaction	Potential Drug Interaction Alert	Interaction detected between Metformin and newly prescribed medication. Monitor glucose levels closely and consider dosage adjustment.	high	t	0.92	{"references": ["Drug Interaction Database", "FDA Guidelines"], "suggestedActions": ["Monitor blood glucose", "Review medication timing", "Patient education"], "relatedConditions": ["Type 2 Diabetes", "Drug Interaction"]}	active	pending	2025-11-18 08:04:37.653068
473	1	1	treatment_suggestion	Hypertension Management Optimization	Current treatment plan shows good response. Consider adding lifestyle interventions to potentially reduce medication dependency.	low	f	0.78	{"references": ["JNC 8 Guidelines", "AHA Lifestyle Guidelines"], "suggestedActions": ["DASH diet counseling", "Regular exercise program", "Weight management"], "relatedConditions": ["Hypertension", "ACE Inhibitor Therapy"]}	active	pending	2025-11-18 08:04:37.653068
474	1	2	preventive_care	Diabetic Screening Recommendations	Patient due for annual diabetic complications screening. Schedule eye exam, foot examination, and kidney function tests.	medium	t	0.95	{"references": ["ADA Standards of Care", "Diabetic Complications Guidelines"], "suggestedActions": ["Ophthalmology referral", "Podiatry consultation", "Lab work: HbA1c, microalbumin"], "relatedConditions": ["Type 2 Diabetes", "Preventive Care"]}	active	pending	2025-11-18 08:04:37.653068
475	1	1	risk_alert	Medication Adherence Concern	AI analysis of prescription refill patterns suggests potential adherence issues. Patient may benefit from medication management support.	medium	t	0.73	{"references": ["Medication Adherence Guidelines", "Patient Education Resources"], "suggestedActions": ["Adherence counseling", "Pill organizer", "Follow-up call"], "relatedConditions": ["Medication Adherence", "Hypertension"]}	active	pending	2025-11-18 08:04:37.653068
476	1	1	risk_alert	Cardiovascular Risk Assessment	Based on recent blood pressure readings and family history, patient shows elevated cardiovascular risk factors. Consider lifestyle modifications and medication review.	medium	t	0.85	{"references": ["AHA Guidelines 2023", "ESC Guidelines"], "suggestedActions": ["Diet consultation", "Exercise program", "Medication review"], "relatedConditions": ["Hypertension", "Family History CVD"]}	active	pending	2025-11-18 08:09:43.944818
477	1	2	drug_interaction	Potential Drug Interaction Alert	Interaction detected between Metformin and newly prescribed medication. Monitor glucose levels closely and consider dosage adjustment.	high	t	0.92	{"references": ["Drug Interaction Database", "FDA Guidelines"], "suggestedActions": ["Monitor blood glucose", "Review medication timing", "Patient education"], "relatedConditions": ["Type 2 Diabetes", "Drug Interaction"]}	active	pending	2025-11-18 08:09:43.944818
478	1	1	treatment_suggestion	Hypertension Management Optimization	Current treatment plan shows good response. Consider adding lifestyle interventions to potentially reduce medication dependency.	low	f	0.78	{"references": ["JNC 8 Guidelines", "AHA Lifestyle Guidelines"], "suggestedActions": ["DASH diet counseling", "Regular exercise program", "Weight management"], "relatedConditions": ["Hypertension", "ACE Inhibitor Therapy"]}	active	pending	2025-11-18 08:09:43.944818
479	1	2	preventive_care	Diabetic Screening Recommendations	Patient due for annual diabetic complications screening. Schedule eye exam, foot examination, and kidney function tests.	medium	t	0.95	{"references": ["ADA Standards of Care", "Diabetic Complications Guidelines"], "suggestedActions": ["Ophthalmology referral", "Podiatry consultation", "Lab work: HbA1c, microalbumin"], "relatedConditions": ["Type 2 Diabetes", "Preventive Care"]}	active	pending	2025-11-18 08:09:43.944818
480	1	1	risk_alert	Medication Adherence Concern	AI analysis of prescription refill patterns suggests potential adherence issues. Patient may benefit from medication management support.	medium	t	0.73	{"references": ["Medication Adherence Guidelines", "Patient Education Resources"], "suggestedActions": ["Adherence counseling", "Pill organizer", "Follow-up call"], "relatedConditions": ["Medication Adherence", "Hypertension"]}	active	pending	2025-11-18 08:09:43.944818
481	1	1	risk_alert	Cardiovascular Risk Assessment	Based on recent blood pressure readings and family history, patient shows elevated cardiovascular risk factors. Consider lifestyle modifications and medication review.	medium	t	0.85	{"references": ["AHA Guidelines 2023", "ESC Guidelines"], "suggestedActions": ["Diet consultation", "Exercise program", "Medication review"], "relatedConditions": ["Hypertension", "Family History CVD"]}	active	pending	2025-11-18 08:14:29.012405
482	1	2	drug_interaction	Potential Drug Interaction Alert	Interaction detected between Metformin and newly prescribed medication. Monitor glucose levels closely and consider dosage adjustment.	high	t	0.92	{"references": ["Drug Interaction Database", "FDA Guidelines"], "suggestedActions": ["Monitor blood glucose", "Review medication timing", "Patient education"], "relatedConditions": ["Type 2 Diabetes", "Drug Interaction"]}	active	pending	2025-11-18 08:14:29.012405
483	1	1	treatment_suggestion	Hypertension Management Optimization	Current treatment plan shows good response. Consider adding lifestyle interventions to potentially reduce medication dependency.	low	f	0.78	{"references": ["JNC 8 Guidelines", "AHA Lifestyle Guidelines"], "suggestedActions": ["DASH diet counseling", "Regular exercise program", "Weight management"], "relatedConditions": ["Hypertension", "ACE Inhibitor Therapy"]}	active	pending	2025-11-18 08:14:29.012405
484	1	2	preventive_care	Diabetic Screening Recommendations	Patient due for annual diabetic complications screening. Schedule eye exam, foot examination, and kidney function tests.	medium	t	0.95	{"references": ["ADA Standards of Care", "Diabetic Complications Guidelines"], "suggestedActions": ["Ophthalmology referral", "Podiatry consultation", "Lab work: HbA1c, microalbumin"], "relatedConditions": ["Type 2 Diabetes", "Preventive Care"]}	active	pending	2025-11-18 08:14:29.012405
485	1	1	risk_alert	Medication Adherence Concern	AI analysis of prescription refill patterns suggests potential adherence issues. Patient may benefit from medication management support.	medium	t	0.73	{"references": ["Medication Adherence Guidelines", "Patient Education Resources"], "suggestedActions": ["Adherence counseling", "Pill organizer", "Follow-up call"], "relatedConditions": ["Medication Adherence", "Hypertension"]}	active	pending	2025-11-18 08:14:29.012405
486	1	1	risk_alert	Cardiovascular Risk Assessment	Based on recent blood pressure readings and family history, patient shows elevated cardiovascular risk factors. Consider lifestyle modifications and medication review.	medium	t	0.85	{"references": ["AHA Guidelines 2023", "ESC Guidelines"], "suggestedActions": ["Diet consultation", "Exercise program", "Medication review"], "relatedConditions": ["Hypertension", "Family History CVD"]}	active	pending	2025-11-18 08:17:53.516085
487	1	2	drug_interaction	Potential Drug Interaction Alert	Interaction detected between Metformin and newly prescribed medication. Monitor glucose levels closely and consider dosage adjustment.	high	t	0.92	{"references": ["Drug Interaction Database", "FDA Guidelines"], "suggestedActions": ["Monitor blood glucose", "Review medication timing", "Patient education"], "relatedConditions": ["Type 2 Diabetes", "Drug Interaction"]}	active	pending	2025-11-18 08:17:53.516085
488	1	1	treatment_suggestion	Hypertension Management Optimization	Current treatment plan shows good response. Consider adding lifestyle interventions to potentially reduce medication dependency.	low	f	0.78	{"references": ["JNC 8 Guidelines", "AHA Lifestyle Guidelines"], "suggestedActions": ["DASH diet counseling", "Regular exercise program", "Weight management"], "relatedConditions": ["Hypertension", "ACE Inhibitor Therapy"]}	active	pending	2025-11-18 08:17:53.516085
489	1	2	preventive_care	Diabetic Screening Recommendations	Patient due for annual diabetic complications screening. Schedule eye exam, foot examination, and kidney function tests.	medium	t	0.95	{"references": ["ADA Standards of Care", "Diabetic Complications Guidelines"], "suggestedActions": ["Ophthalmology referral", "Podiatry consultation", "Lab work: HbA1c, microalbumin"], "relatedConditions": ["Type 2 Diabetes", "Preventive Care"]}	active	pending	2025-11-18 08:17:53.516085
490	1	1	risk_alert	Medication Adherence Concern	AI analysis of prescription refill patterns suggests potential adherence issues. Patient may benefit from medication management support.	medium	t	0.73	{"references": ["Medication Adherence Guidelines", "Patient Education Resources"], "suggestedActions": ["Adherence counseling", "Pill organizer", "Follow-up call"], "relatedConditions": ["Medication Adherence", "Hypertension"]}	active	pending	2025-11-18 08:17:53.516085
491	1	1	risk_alert	Cardiovascular Risk Assessment	Based on recent blood pressure readings and family history, patient shows elevated cardiovascular risk factors. Consider lifestyle modifications and medication review.	medium	t	0.85	{"references": ["AHA Guidelines 2023", "ESC Guidelines"], "suggestedActions": ["Diet consultation", "Exercise program", "Medication review"], "relatedConditions": ["Hypertension", "Family History CVD"]}	active	pending	2025-11-18 08:23:12.631278
492	1	2	drug_interaction	Potential Drug Interaction Alert	Interaction detected between Metformin and newly prescribed medication. Monitor glucose levels closely and consider dosage adjustment.	high	t	0.92	{"references": ["Drug Interaction Database", "FDA Guidelines"], "suggestedActions": ["Monitor blood glucose", "Review medication timing", "Patient education"], "relatedConditions": ["Type 2 Diabetes", "Drug Interaction"]}	active	pending	2025-11-18 08:23:12.631278
493	1	1	treatment_suggestion	Hypertension Management Optimization	Current treatment plan shows good response. Consider adding lifestyle interventions to potentially reduce medication dependency.	low	f	0.78	{"references": ["JNC 8 Guidelines", "AHA Lifestyle Guidelines"], "suggestedActions": ["DASH diet counseling", "Regular exercise program", "Weight management"], "relatedConditions": ["Hypertension", "ACE Inhibitor Therapy"]}	active	pending	2025-11-18 08:23:12.631278
494	1	2	preventive_care	Diabetic Screening Recommendations	Patient due for annual diabetic complications screening. Schedule eye exam, foot examination, and kidney function tests.	medium	t	0.95	{"references": ["ADA Standards of Care", "Diabetic Complications Guidelines"], "suggestedActions": ["Ophthalmology referral", "Podiatry consultation", "Lab work: HbA1c, microalbumin"], "relatedConditions": ["Type 2 Diabetes", "Preventive Care"]}	active	pending	2025-11-18 08:23:12.631278
495	1	1	risk_alert	Medication Adherence Concern	AI analysis of prescription refill patterns suggests potential adherence issues. Patient may benefit from medication management support.	medium	t	0.73	{"references": ["Medication Adherence Guidelines", "Patient Education Resources"], "suggestedActions": ["Adherence counseling", "Pill organizer", "Follow-up call"], "relatedConditions": ["Medication Adherence", "Hypertension"]}	active	pending	2025-11-18 08:23:12.631278
496	1	1	risk_alert	Cardiovascular Risk Assessment	Based on recent blood pressure readings and family history, patient shows elevated cardiovascular risk factors. Consider lifestyle modifications and medication review.	medium	t	0.85	{"references": ["AHA Guidelines 2023", "ESC Guidelines"], "suggestedActions": ["Diet consultation", "Exercise program", "Medication review"], "relatedConditions": ["Hypertension", "Family History CVD"]}	active	pending	2025-11-18 08:24:02.380157
497	1	2	drug_interaction	Potential Drug Interaction Alert	Interaction detected between Metformin and newly prescribed medication. Monitor glucose levels closely and consider dosage adjustment.	high	t	0.92	{"references": ["Drug Interaction Database", "FDA Guidelines"], "suggestedActions": ["Monitor blood glucose", "Review medication timing", "Patient education"], "relatedConditions": ["Type 2 Diabetes", "Drug Interaction"]}	active	pending	2025-11-18 08:24:02.380157
498	1	1	treatment_suggestion	Hypertension Management Optimization	Current treatment plan shows good response. Consider adding lifestyle interventions to potentially reduce medication dependency.	low	f	0.78	{"references": ["JNC 8 Guidelines", "AHA Lifestyle Guidelines"], "suggestedActions": ["DASH diet counseling", "Regular exercise program", "Weight management"], "relatedConditions": ["Hypertension", "ACE Inhibitor Therapy"]}	active	pending	2025-11-18 08:24:02.380157
499	1	2	preventive_care	Diabetic Screening Recommendations	Patient due for annual diabetic complications screening. Schedule eye exam, foot examination, and kidney function tests.	medium	t	0.95	{"references": ["ADA Standards of Care", "Diabetic Complications Guidelines"], "suggestedActions": ["Ophthalmology referral", "Podiatry consultation", "Lab work: HbA1c, microalbumin"], "relatedConditions": ["Type 2 Diabetes", "Preventive Care"]}	active	pending	2025-11-18 08:24:02.380157
500	1	1	risk_alert	Medication Adherence Concern	AI analysis of prescription refill patterns suggests potential adherence issues. Patient may benefit from medication management support.	medium	t	0.73	{"references": ["Medication Adherence Guidelines", "Patient Education Resources"], "suggestedActions": ["Adherence counseling", "Pill organizer", "Follow-up call"], "relatedConditions": ["Medication Adherence", "Hypertension"]}	active	pending	2025-11-18 08:24:02.380157
\.


--
-- Data for Name: appointments; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.appointments (id, organization_id, appointment_id, patient_id, provider_id, assigned_role, title, description, scheduled_at, duration, status, type, location, is_virtual, created_by, created_at) FROM stdin;
1	1	APT1763401393371P3AUTO	3	2	doctor	John - Doctor Appointment		2025-11-17 22:45:00	30	scheduled	consultation		f	1	2025-11-17 17:43:13.742622
2	1	APT1763401877130P3AUTO	3	2	doctor	John - Doctor Appointment		2025-11-19 00:00:00	30	scheduled	consultation		f	1	2025-11-17 17:51:17.522331
3	1	APT1763452837530P3AUTO	3	2	doctor	John - Doctor Appointment		2025-11-27 01:00:00	30	scheduled	consultation		f	1	2025-11-18 08:00:37.880908
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
-- Data for Name: clinic_footers; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.clinic_footers (id, organization_id, footer_text, background_color, text_color, show_social, facebook, twitter, linkedin, is_active, created_at, updated_at) FROM stdin;
1	1	@EMRSoft Health Clinic, All rights reserved	#4A7DFF	#FFFFFF	f	\N	\N	\N	t	2025-11-17 11:41:06.428944	2025-11-17 11:41:06.428944
\.


--
-- Data for Name: clinic_headers; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.clinic_headers (id, organization_id, logo_base64, logo_position, clinic_name, address, phone, email, website, clinic_name_font_size, font_size, font_family, font_weight, font_style, text_decoration, is_active, created_at, updated_at) FROM stdin;
1	1	data:image/png;base64,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	center	EMRSoft Health Clinic	45 Blue Area, G-6/3, Islamabad, Pakistan	+92 51 2345 6789	abcd@gmail.com	www.emrSoft.com	24pt	12pt	verdana	normal	normal	none	t	2025-11-17 11:40:46.555478	2025-11-17 11:40:46.555478
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
-- Data for Name: doctor_default_shifts; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.doctor_default_shifts (id, organization_id, user_id, start_time, end_time, working_days, created_at, updated_at) FROM stdin;
1	1	1	00:00	23:59	{Monday,Tuesday,Wednesday,Thursday,Friday,Saturday,Sunday}	2025-11-17 17:42:36.471039	2025-11-17 17:42:36.471039
2	1	2	00:00	23:59	{Monday,Tuesday,Wednesday,Thursday,Friday,Saturday,Sunday}	2025-11-17 17:42:36.958079	2025-11-17 17:42:36.958079
3	1	3	00:00	23:59	{Monday,Tuesday,Wednesday,Thursday,Friday,Saturday,Sunday}	2025-11-17 17:42:37.438511	2025-11-17 17:42:37.438511
4	1	5	00:00	23:59	{Monday,Tuesday,Wednesday,Thursday,Friday,Saturday,Sunday}	2025-11-17 17:42:37.918951	2025-11-17 17:42:37.918951
5	1	6	00:00	23:59	{Monday,Tuesday,Wednesday,Thursday,Friday,Saturday,Sunday}	2025-11-17 17:42:38.399057	2025-11-17 17:42:38.399057
6	1	7	00:00	23:59	{Monday,Tuesday,Wednesday,Thursday,Friday,Saturday,Sunday}	2025-11-17 17:42:38.879226	2025-11-17 17:42:38.879226
7	1	8	00:00	23:59	{Monday,Tuesday,Wednesday,Thursday,Friday,Saturday,Sunday}	2025-11-17 17:42:39.359932	2025-11-17 17:42:39.359932
8	1	9	00:00	23:59	{Monday,Tuesday,Wednesday,Thursday,Friday,Saturday,Sunday}	2025-11-17 17:42:39.840495	2025-11-17 17:42:39.840495
9	1	10	00:00	23:59	{Monday,Tuesday,Wednesday,Thursday,Friday,Saturday,Sunday}	2025-11-17 17:42:40.320508	2025-11-17 17:42:40.320508
10	1	11	00:00	23:59	{Monday,Tuesday,Wednesday,Thursday,Friday,Saturday,Sunday}	2025-11-17 17:42:40.809647	2025-11-17 17:42:40.809647
\.


--
-- Data for Name: doctors_fee; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.doctors_fee (id, organization_id, doctor_id, doctor_name, doctor_role, service_name, service_code, category, base_price, currency, version, effective_date, expiry_date, is_active, created_by, notes, metadata, created_at, updated_at) FROM stdin;
1	1	2	Paul Smith	doctor	General Consultation	GC001	Standard visit for diagnosis or follow-up	50.00	GBP	1	2025-11-17 17:25:08.498905	\N	t	1	\N	{}	2025-11-17 17:25:08.498905	2025-11-17 17:25:08.498905
2	1	2	Paul Smith	doctor	Specialist Consultation	SC001	Visit with a specialist doctor (e.g., Cardiologist)	120.00	GBP	1	2025-11-17 17:25:09.586965	\N	t	1	\N	{}	2025-11-17 17:25:09.586965	2025-11-17 17:25:09.586965
3	1	2	Paul Smith	doctor	Follow-up Visit	FV001	Follow-up within a certain time period	30.00	GBP	1	2025-11-17 17:25:10.645404	\N	t	1	\N	{}	2025-11-17 17:25:10.645404	2025-11-17 17:25:10.645404
4	1	2	Paul Smith	doctor	Teleconsultation	TC001	Online or phone consultation	40.00	GBP	1	2025-11-17 17:25:11.705074	\N	t	1	\N	{}	2025-11-17 17:25:11.705074	2025-11-17 17:25:11.705074
5	1	2	Paul Smith	doctor	Emergency Visit	EV001	Immediate or off-hours consultation	150.00	GBP	1	2025-11-17 17:25:12.769293	\N	t	1	\N	{}	2025-11-17 17:25:12.769293	2025-11-17 17:25:12.769293
6	1	2	Paul Smith	doctor	Home Visit	HV001	Doctor visits patient's home	100.00	GBP	1	2025-11-17 17:25:13.826148	\N	t	1	\N	{}	2025-11-17 17:25:13.826148	2025-11-17 17:25:13.826148
7	1	2	Paul Smith	doctor	Procedure Consultation	PC001	Pre- or post-surgery consultation	11.00	GBP	1	2025-11-17 17:25:14.882764	\N	t	1	\N	{}	2025-11-17 17:25:14.882764	2025-11-17 17:25:14.882764
8	1	7	Michael Johnson	doctor	General Consultation	GC001	Standard visit for diagnosis or follow-up	50.00	GBP	1	2025-11-17 17:25:33.24683	\N	t	1	\N	{}	2025-11-17 17:25:33.24683	2025-11-17 17:25:33.24683
9	1	7	Michael Johnson	doctor	Specialist Consultation	SC001	Visit with a specialist doctor (e.g., Cardiologist)	120.00	GBP	1	2025-11-17 17:25:34.274665	\N	t	1	\N	{}	2025-11-17 17:25:34.274665	2025-11-17 17:25:34.274665
10	1	7	Michael Johnson	doctor	Follow-up Visit	FV001	Follow-up within a certain time period	30.00	GBP	1	2025-11-17 17:25:35.295006	\N	t	1	\N	{}	2025-11-17 17:25:35.295006	2025-11-17 17:25:35.295006
11	1	7	Michael Johnson	doctor	Teleconsultation	TC001	Online or phone consultation	40.00	GBP	1	2025-11-17 17:25:36.316784	\N	t	1	\N	{}	2025-11-17 17:25:36.316784	2025-11-17 17:25:36.316784
12	1	7	Michael Johnson	doctor	Emergency Visit	EV001	Immediate or off-hours consultation	150.00	GBP	1	2025-11-17 17:25:37.34419	\N	t	1	\N	{}	2025-11-17 17:25:37.34419	2025-11-17 17:25:37.34419
13	1	7	Michael Johnson	doctor	Home Visit	HV001	Doctor visits patient's home	100.00	GBP	1	2025-11-17 17:25:38.379905	\N	t	1	\N	{}	2025-11-17 17:25:38.379905	2025-11-17 17:25:38.379905
14	1	7	Michael Johnson	doctor	Procedure Consultation	PC001	Pre- or post-surgery consultation	99.00	GBP	1	2025-11-17 17:25:39.411445	\N	t	1	\N	{}	2025-11-17 17:25:39.411445	2025-11-17 17:25:39.411445
15	1	8	David Wilson	doctor	General Consultation	GC001	Standard visit for diagnosis or follow-up	50.00	GBP	1	2025-11-17 17:25:50.439996	\N	t	1	\N	{}	2025-11-17 17:25:50.439996	2025-11-17 17:25:50.439996
16	1	8	David Wilson	doctor	Specialist Consultation	SC001	Visit with a specialist doctor (e.g., Cardiologist)	120.00	GBP	1	2025-11-17 17:25:51.508674	\N	t	1	\N	{}	2025-11-17 17:25:51.508674	2025-11-17 17:25:51.508674
17	1	8	David Wilson	doctor	Follow-up Visit	FV001	Follow-up within a certain time period	30.00	GBP	1	2025-11-17 17:25:52.57219	\N	t	1	\N	{}	2025-11-17 17:25:52.57219	2025-11-17 17:25:52.57219
18	1	8	David Wilson	doctor	Teleconsultation	TC001	Online or phone consultation	40.00	GBP	1	2025-11-17 17:25:53.631093	\N	t	1	\N	{}	2025-11-17 17:25:53.631093	2025-11-17 17:25:53.631093
19	1	8	David Wilson	doctor	Emergency Visit	EV001	Immediate or off-hours consultation	150.00	GBP	1	2025-11-17 17:25:54.698384	\N	t	1	\N	{}	2025-11-17 17:25:54.698384	2025-11-17 17:25:54.698384
20	1	8	David Wilson	doctor	Home Visit	HV001	Doctor visits patient's home	100.00	GBP	1	2025-11-17 17:25:55.76696	\N	t	1	\N	{}	2025-11-17 17:25:55.76696	2025-11-17 17:25:55.76696
21	1	9	Lisa Anderson	doctor	General Consultation	GC001	Standard visit for diagnosis or follow-up	50.00	GBP	1	2025-11-17 17:26:10.013862	\N	t	1	\N	{}	2025-11-17 17:26:10.013862	2025-11-17 17:26:10.013862
22	1	9	Lisa Anderson	doctor	Specialist Consultation	SC001	Visit with a specialist doctor (e.g., Cardiologist)	120.00	GBP	1	2025-11-17 17:26:11.056824	\N	t	1	\N	{}	2025-11-17 17:26:11.056824	2025-11-17 17:26:11.056824
23	1	9	Lisa Anderson	doctor	Follow-up Visit	FV001	Follow-up within a certain time period	30.00	GBP	1	2025-11-17 17:26:12.096706	\N	t	1	\N	{}	2025-11-17 17:26:12.096706	2025-11-17 17:26:12.096706
24	1	9	Lisa Anderson	doctor	Teleconsultation	TC001	Online or phone consultation	40.00	GBP	1	2025-11-17 17:26:13.145094	\N	t	1	\N	{}	2025-11-17 17:26:13.145094	2025-11-17 17:26:13.145094
25	1	9	Lisa Anderson	doctor	Emergency Visit	EV001	Immediate or off-hours consultation	150.00	GBP	1	2025-11-17 17:26:14.191594	\N	t	1	\N	{}	2025-11-17 17:26:14.191594	2025-11-17 17:26:14.191594
26	1	9	Lisa Anderson	doctor	Home Visit	HV001	Doctor visits patient's home	100.00	GBP	1	2025-11-17 17:26:15.23933	\N	t	1	\N	{}	2025-11-17 17:26:15.23933	2025-11-17 17:26:15.23933
27	1	9	Lisa Anderson	doctor	Procedure Consultation	PC001	Pre- or post-surgery consultation	6.00	GBP	1	2025-11-17 17:26:16.287294	\N	t	1	\N	{}	2025-11-17 17:26:16.287294	2025-11-17 17:26:16.287294
28	1	10	Robert Brown	doctor	General Consultation	GC001	Standard visit for diagnosis or follow-up	50.00	GBP	1	2025-11-17 17:26:28.723676	\N	t	1	\N	{}	2025-11-17 17:26:28.723676	2025-11-17 17:26:28.723676
29	1	10	Robert Brown	doctor	Specialist Consultation	SC001	Visit with a specialist doctor (e.g., Cardiologist)	120.00	GBP	1	2025-11-17 17:26:29.826355	\N	t	1	\N	{}	2025-11-17 17:26:29.826355	2025-11-17 17:26:29.826355
30	1	10	Robert Brown	doctor	Follow-up Visit	FV001	Follow-up within a certain time period	30.00	GBP	1	2025-11-17 17:26:30.923477	\N	t	1	\N	{}	2025-11-17 17:26:30.923477	2025-11-17 17:26:30.923477
31	1	10	Robert Brown	doctor	Teleconsultation	TC001	Online or phone consultation	40.00	GBP	1	2025-11-17 17:26:32.014413	\N	t	1	\N	{}	2025-11-17 17:26:32.014413	2025-11-17 17:26:32.014413
32	1	10	Robert Brown	doctor	Emergency Visit	EV001	Immediate or off-hours consultation	150.00	GBP	1	2025-11-17 17:26:33.109891	\N	t	1	\N	{}	2025-11-17 17:26:33.109891	2025-11-17 17:26:33.109891
33	1	10	Robert Brown	doctor	Home Visit	HV001	Doctor visits patient's home	100.00	GBP	1	2025-11-17 17:26:34.204088	\N	t	1	\N	{}	2025-11-17 17:26:34.204088	2025-11-17 17:26:34.204088
34	1	10	Robert Brown	doctor	Procedure Consultation	PC001	Pre- or post-surgery consultation	8.00	GBP	1	2025-11-17 17:26:35.293079	\N	t	1	\N	{}	2025-11-17 17:26:35.293079	2025-11-17 17:26:35.293079
35	1	3	Emma Johnson	nurse	General Consultation	GC001	Standard visit for diagnosis or follow-up	50.00	CAD	1	2025-11-18 07:44:46.447168	\N	t	1	\N	{}	2025-11-18 07:44:46.447168	2025-11-18 07:44:46.447168
36	1	3	Emma Johnson	nurse	Specialist Consultation	SC001	Visit with a specialist doctor (e.g., Cardiologist)	120.00	CAD	1	2025-11-18 07:44:47.465338	\N	t	1	\N	{}	2025-11-18 07:44:47.465338	2025-11-18 07:44:47.465338
37	1	3	Emma Johnson	nurse	Follow-up Visit	FV001	Follow-up within a certain time period	30.00	CAD	1	2025-11-18 07:44:48.481337	\N	t	1	\N	{}	2025-11-18 07:44:48.481337	2025-11-18 07:44:48.481337
38	1	3	Emma Johnson	nurse	Teleconsultation	TC001	Online or phone consultation	40.00	CAD	1	2025-11-18 07:44:49.492631	\N	t	1	\N	{}	2025-11-18 07:44:49.492631	2025-11-18 07:44:49.492631
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
-- Data for Name: imaging_pricing; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.imaging_pricing (id, organization_id, imaging_type, imaging_code, modality, body_part, category, base_price, currency, version, effective_date, expiry_date, is_active, created_by, notes, metadata, created_at, updated_at) FROM stdin;
1	1	X-ray (Radiography)	XRAY7672			\N	50.00	GBP	1	2025-11-17 09:35:43.8422	\N	t	1	\N	{}	2025-11-17 09:35:43.8422	2025-11-17 09:35:43.8422
2	1	CT (Computed Tomography)	CT7672			\N	54.00	GBP	1	2025-11-17 09:35:44.930444	\N	t	1	\N	{}	2025-11-17 09:35:44.930444	2025-11-17 09:35:44.930444
3	1	MRI (Magnetic Resonance Imaging)	MRI7672			\N	43.00	GBP	1	2025-11-17 09:35:45.974851	\N	t	1	\N	{}	2025-11-17 09:35:45.974851	2025-11-17 09:35:45.974851
4	1	Ultrasound (Sonography)	US7672			\N	39.00	GBP	1	2025-11-17 09:35:47.022866	\N	t	1	\N	{}	2025-11-17 09:35:47.022866	2025-11-17 09:35:47.022866
5	1	Mammography	MAMMO7672			\N	34.00	GBP	1	2025-11-17 09:35:48.153994	\N	t	1	\N	{}	2025-11-17 09:35:48.153994	2025-11-17 09:35:48.153994
6	1	Fluoroscopy	FLUORO7672			\N	23.00	GBP	1	2025-11-17 09:35:49.23559	\N	t	1	\N	{}	2025-11-17 09:35:49.23559	2025-11-17 09:35:49.23559
7	1	PET (Positron Emission Tomography)	PET0792			\N	1.00	GBP	1	2025-11-17 09:35:51.589489	\N	t	1	\N	{}	2025-11-17 09:35:51.589489	2025-11-17 09:35:51.589489
8	1	SPECT (Single Photon Emission CT)	SPECT0792			\N	1.00	GBP	1	2025-11-17 09:35:53.101053	\N	t	1	\N	{}	2025-11-17 09:35:53.101053	2025-11-17 09:35:53.101053
9	1	Nuclear Medicine Scans	NM0792			\N	1.00	GBP	1	2025-11-17 09:35:54.17611	\N	t	1	\N	{}	2025-11-17 09:35:54.17611	2025-11-17 09:35:54.17611
10	1	DEXA (Bone Densitometry)	DEXA0792			\N	11.00	GBP	1	2025-11-17 09:35:55.247509	\N	t	1	\N	{}	2025-11-17 09:35:55.247509	2025-11-17 09:35:55.247509
11	1	Angiography	ANGIO0792			\N	1.00	GBP	1	2025-11-17 09:35:56.316377	\N	t	1	\N	{}	2025-11-17 09:35:56.316377	2025-11-17 09:35:56.316377
12	1	Interventional Radiology (IR)	IR0792			\N	1.00	GBP	1	2025-11-17 09:35:57.365843	\N	t	1	\N	{}	2025-11-17 09:35:57.365843	2025-11-17 09:35:57.365843
13	1	Fluoroscopy	FLUORO0792			\N	1.00	GBP	1	2025-11-17 09:35:58.445542	\N	t	1	\N	{}	2025-11-17 09:35:58.445542	2025-11-17 09:35:58.445542
14	1	Mammography	MAMMO0792			\N	1.00	GBP	1	2025-11-17 09:35:59.50232	\N	t	1	\N	{}	2025-11-17 09:35:59.50232	2025-11-17 09:35:59.50232
15	1	Ultrasound (Sonography)	US0792			\N	1.00	GBP	1	2025-11-17 09:36:00.574709	\N	t	1	\N	{}	2025-11-17 09:36:00.574709	2025-11-17 09:36:00.574709
16	1	MRI (Magnetic Resonance Imaging)	MRI0792			\N	1.00	GBP	1	2025-11-17 09:36:01.631565	\N	t	1	\N	{}	2025-11-17 09:36:01.631565	2025-11-17 09:36:01.631565
17	1	CT (Computed Tomography)	CT0792			\N	1.00	GBP	1	2025-11-17 09:36:02.703698	\N	t	1	\N	{}	2025-11-17 09:36:02.703698	2025-11-17 09:36:02.703698
18	1	X-ray (Radiography)	XRAY0792			\N	1.00	GBP	1	2025-11-17 09:36:03.767663	\N	t	1	\N	{}	2025-11-17 09:36:03.767663	2025-11-17 09:36:03.767663
\.


--
-- Data for Name: insurance_payments; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.insurance_payments (id, organization_id, invoice_id, claim_number, amount_paid, payment_date, insurance_provider, payment_reference, notes, created_by, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: insurance_verifications; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.insurance_verifications (id, organization_id, patient_id, patient_name, provider, policy_number, group_number, member_number, nhs_number, plan_type, coverage_type, status, eligibility_status, effective_date, expiration_date, last_verified, benefits, created_at, updated_at) FROM stdin;
1	1	3	John Patient							primary	active	pending	\N	\N	2025-11-17	{}	2025-11-17 17:30:26.155663	2025-11-17 17:30:26.155663
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
1	1	Tablets	Oral solid dosage forms including tablets and capsules	\N	t	2025-11-17 08:46:52.736041	2025-11-17 08:46:52.736041
2	1	Syrups	Liquid medications in syrup form	\N	t	2025-11-17 08:46:52.736041	2025-11-17 08:46:52.736041
3	1	Pharmaceuticals	General pharmaceutical products	\N	t	2025-11-17 08:46:52.736041	2025-11-17 08:46:52.736041
4	1	Beauty Products	Cosmetic and beauty care items	\N	t	2025-11-17 08:46:52.736041	2025-11-17 08:46:52.736041
5	1	Vitamins	Vitamin supplements and nutritional products	\N	t	2025-11-17 08:46:52.736041	2025-11-17 08:46:52.736041
6	1	Minerals	Mineral supplements and health products	\N	t	2025-11-17 08:46:52.736041	2025-11-17 08:46:52.736041
7	1	Medical Supplies	General medical supplies and equipment	\N	t	2025-11-17 08:46:52.736041	2025-11-17 08:46:52.736041
8	1	First Aid	First aid supplies and emergency medications	\N	t	2025-11-17 08:46:52.736041	2025-11-17 08:46:52.736041
9	1	Injections	Injectable medications and vaccines	\N	t	2025-11-17 08:46:52.736041	2025-11-17 08:46:52.736041
10	1	Topical	Creams, ointments, and topical applications	\N	t	2025-11-17 08:46:52.736041	2025-11-17 08:46:52.736041
\.


--
-- Data for Name: inventory_items; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.inventory_items (id, organization_id, category_id, name, description, sku, barcode, generic_name, brand_name, manufacturer, unit_of_measurement, pack_size, purchase_price, sale_price, mrp, tax_rate, current_stock, minimum_stock, maximum_stock, reorder_point, expiry_tracking, batch_tracking, prescription_required, storage_conditions, side_effects, contraindications, dosage_instructions, is_active, is_discontinued, created_at, updated_at) FROM stdin;
1	1	1	Paracetamol 500mg	Pain relief and fever reducer	TAB-PARA500-001	1234567890123	Paracetamol	Panadol	GSK	tablets	100	15.50	22.99	25.99	20.00	500	50	2000	100	f	f	f	Store in cool, dry place	\N	\N	1-2 tablets every 4-6 hours as needed	t	f	2025-11-17 08:46:53.434542	2025-11-17 08:46:53.434542
2	1	1	Ibuprofen 400mg	Anti-inflammatory pain relief	TAB-IBU400-002	2345678901234	Ibuprofen	Nurofen	Reckitt Benckiser	tablets	84	12.75	18.99	21.99	20.00	300	30	1500	75	f	f	f	Store below 25°C	\N	\N	1 tablet every 4-6 hours with food	t	f	2025-11-17 08:46:53.434542	2025-11-17 08:46:53.434542
3	1	2	Children's Paracetamol Suspension	Liquid paracetamol for children	SYR-CHPARA-003	3456789012345	Paracetamol	Calpol	Johnson & Johnson	bottles	1	8.25	12.49	14.99	20.00	150	20	500	40	f	f	f	Store below 25°C, do not freeze	\N	\N	As per age and weight guidelines	t	f	2025-11-17 08:46:53.434542	2025-11-17 08:46:53.434542
4	1	5	Vitamin D3 1000IU	Vitamin D supplement	VIT-D3-1000-004	4567890123456	Cholecalciferol	VitaD3	Holland & Barrett	tablets	60	9.99	15.99	18.99	20.00	200	25	800	50	f	f	f	Store in cool, dry place	\N	\N	1 tablet daily with food	t	f	2025-11-17 08:46:53.434542	2025-11-17 08:46:53.434542
5	1	7	Digital Thermometer	Digital oral/axillary thermometer	MED-THERM-005	5678901234567	\N	OmniTemp	Medical Devices Ltd	pieces	1	12.50	19.99	24.99	20.00	75	10	200	25	f	f	f	Store at room temperature	\N	\N	\N	t	f	2025-11-17 08:46:53.434542	2025-11-17 08:46:53.434542
6	1	7	Disposable Gloves (Nitrile)	Powder-free nitrile examination gloves	MED-GLOVE-006	6789012345678	\N	SafeGuard	MedProtect	boxes	100	18.75	28.99	32.99	20.00	50	10	300	20	f	f	f	Store in cool, dry place away from direct sunlight	\N	\N	\N	t	f	2025-11-17 08:46:53.434542	2025-11-17 08:46:53.434542
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
1	1	Halo Pharmacy	David Wilson	orders@halopharmacy.co.uk	+44 20 7946 0958	123 Health Street	London	UK	GB123456789	Net 30	t	2025-11-17 08:46:53.19881	2025-11-17 08:46:53.19881
2	1	MedSupply UK	Sarah Johnson	procurement@medsupplyuk.com	+44 161 234 5678	456 Medical Ave	Manchester	UK	GB987654321	Net 30	t	2025-11-17 08:46:53.19881	2025-11-17 08:46:53.19881
3	1	Healthcare Direct	Michael Brown	orders@healthcaredirect.co.uk	+44 121 345 6789	789 Pharma Road	Birmingham	UK	GB456789123	Net 15	t	2025-11-17 08:46:53.19881	2025-11-17 08:46:53.19881
\.


--
-- Data for Name: invoices; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.invoices (id, organization_id, invoice_number, patient_id, patient_name, nhs_number, service_type, service_id, date_of_service, invoice_date, due_date, status, invoice_type, payment_method, insurance_provider, subtotal, tax, discount, total_amount, paid_amount, items, insurance, payments, notes, created_by, created_at, updated_at) FROM stdin;
1	1	INV-1763371554651-NTSTC	P001	Alice Williams	\N	lab_result	LAB1763371546407HTB66	2025-11-17 00:00:00	2025-11-17 00:00:00	2025-11-17 00:00:00	paid	payment	\N	\N	50.00	0.00	0.00	50.00	50.00	[{"code": "LAB-001", "total": 50, "quantity": 1, "unitPrice": 50, "description": "Complete Blood Count (CBC)"}]	\N	[{"id": "PAY-1763371554651", "date": "2025-11-17T09:25:54.651Z", "amount": 50, "method": "cash", "reference": "INV-1763371554651-NTSTC"}]	\N	1	2025-11-17 09:25:54.770172	2025-11-17 09:25:54.770172
2	1	INV-489226	P001	Alice Williams	1234567890	medical_images	XRAY0792	2025-11-17 00:00:00	2025-11-17 00:00:00	2025-11-17 00:00:00	paid	payment	Cash	\N	1.20	0.00	0.00	1.20	0.00	[{"code": "XRAY0792", "total": 1, "quantity": 1, "unitPrice": 1, "description": "Medical Imaging - X-ray (Radiography)"}]	\N	[]	Imaging study: X-ray (Radiography), Modality: X-Ray, Body Part: Chest X-Ray (PA / Lateral)	1	2025-11-17 09:41:29.345836	2025-11-17 09:41:30.81
3	1	INV-892156	P001	Alice Williams	1234567890	medical_images	XRAY0792	2025-11-17 00:00:00	2025-11-17 00:00:00	2025-11-17 00:00:00	paid	payment	Cash	\N	1.20	0.00	0.00	1.20	0.00	[{"code": "XRAY0792", "total": 1, "quantity": 1, "unitPrice": 1, "description": "Medical Imaging - X-ray (Radiography)"}]	\N	[]	Imaging study: X-ray (Radiography), Modality: X-Ray, Body Part: Chest X-Ray (PA / Lateral)	1	2025-11-17 10:38:12.275889	2025-11-17 10:38:13.725
4	1	INV-1763377458725-POOEV	P001	Alice Williams	\N	lab_result	LAB17633774520126WXKP	2025-11-17 00:00:00	2025-11-17 00:00:00	2025-11-17 00:00:00	paid	payment	\N	\N	20.00	0.00	0.00	20.00	20.00	[{"code": "LAB-001", "total": 20, "quantity": 1, "unitPrice": "20.00", "description": "Hormonal tests (Cortisol, ACTH)"}]	\N	[{"id": "PAY-1763377458725", "date": "2025-11-17T11:04:18.725Z", "amount": 20, "method": "cash", "reference": "INV-1763377458725-POOEV"}]	\N	1	2025-11-17 11:04:18.846493	2025-11-17 11:04:18.846493
5	1	INV-1763379100044-U8MYBK	P001	Alice Williams	\N	lab_result	LAB1763379093276AZTAP	2025-11-17 00:00:00	2025-11-17 00:00:00	2025-11-17 00:00:00	paid	payment	\N	\N	22.00	0.00	0.00	22.00	22.00	[{"code": "LAB-001", "total": 2, "quantity": 1, "unitPrice": "2.00", "description": "Viral Panels / PCR Tests (e.g. COVID-19, Influenza)"}, {"code": "LAB-002", "total": 20, "quantity": 1, "unitPrice": "20.00", "description": "Hormonal tests (Cortisol, ACTH)"}]	\N	[{"id": "PAY-1763379100044", "date": "2025-11-17T11:31:40.044Z", "amount": 22, "method": "cash", "reference": "INV-1763379100044-U8MYBK"}]	\N	1	2025-11-17 11:31:40.161124	2025-11-17 11:31:40.161124
6	1	INV-692752	P001	Alice Williams	1234567890	medical_images	CT0792	2025-11-17 00:00:00	2025-11-17 00:00:00	2025-11-17 00:00:00	paid	payment	Cash	\N	1.20	0.00	0.00	1.20	0.00	[{"code": "CT0792", "total": 1, "quantity": 1, "unitPrice": 1, "description": "Medical Imaging - CT (Computed Tomography)"}]	\N	[]	Imaging study: CT (Computed Tomography), Modality: X-Ray, Body Part: Abdomen X-Ray	1	2025-11-17 11:41:32.87774	2025-11-17 11:41:34.467
7	1	INV-1763380115903-JKYQJC	P001	Alice Williams	\N	lab_result	LAB17633801066094XW4P	2025-11-17 00:00:00	2025-11-17 00:00:00	2025-11-17 00:00:00	paid	payment	\N	\N	22.00	0.00	0.00	22.00	22.00	[{"code": "LAB-001", "total": 2, "quantity": 1, "unitPrice": "2.00", "description": "Viral Panels / PCR Tests (e.g. COVID-19, Influenza)"}, {"code": "LAB-002", "total": 20, "quantity": 1, "unitPrice": "20.00", "description": "Hormonal tests (Cortisol, ACTH)"}]	\N	[{"id": "PAY-1763380115903", "date": "2025-11-17T11:48:35.903Z", "amount": 22, "method": "cash", "reference": "INV-1763380115903-JKYQJC"}]	\N	1	2025-11-17 11:48:36.025415	2025-11-17 11:48:36.025415
8	1	INV-527080	P001	Alice Williams	1234567890	medical_images	XRAY0792	2025-11-17 00:00:00	2025-11-17 00:00:00	2025-11-17 00:00:00	draft	payment	Debit Card	\N	1.20	0.00	0.00	1.20	0.00	[{"code": "XRAY0792", "total": 1, "quantity": 1, "unitPrice": 1, "description": "Medical Imaging - X-ray (Radiography)"}]	\N	[]	Imaging study: X-ray (Radiography), Modality: X-Ray, Body Part: Chest X-Ray (PA / Lateral)	1	2025-11-17 16:38:47.198294	2025-11-17 16:38:47.198294
9	1	INV-1763400718671-9SQCSMP	P000003	John Patient	\N	lab_result	LAB1763400653506DIBPU	2025-11-17 00:00:00	2025-11-17 00:00:00	2025-11-17 00:00:00	sent	payment	\N	\N	20.00	0.00	0.00	20.00	20.00	[{"code": "LAB-001", "total": 20, "quantity": 1, "unitPrice": "20.00", "description": "Hormonal tests (Cortisol, ACTH)"}]	\N	[{"id": "PAY-1763400718671", "date": "2025-11-17T17:31:58.671Z", "amount": 20, "method": "cash", "reference": "INV-1763400718671-9SQCSMP"}]	\N	1	2025-11-17 17:31:58.790025	2025-11-17 17:32:15.189
10	1	INV-1763401396167-IUFAYY0	P000003	John Patient	\N	\N	APT1763401393371P3AUTO	2025-11-17 00:00:00	2025-11-17 00:00:00	2025-11-17 00:00:00	sent	payment	Debit Card	None (Patient Self-Pay)	50.00	0.00	0.00	50.00	0.00	[{"code": "GC001", "total": 50, "quantity": 1, "unitPrice": 50, "description": "General Consultation"}]	\N	[]	\N	\N	2025-11-17 17:43:16.28768	2025-11-17 17:44:52.561
14	1	INV-1763403516049-EE5AH	P000003	John Patient	\N	lab_result	LAB1763403505944IFQ34	2025-11-17 00:00:00	2025-11-17 00:00:00	2025-11-17 00:00:00	paid	payment	\N	\N	20.00	0.00	0.00	20.00	20.00	[{"code": "LAB-001", "total": 20, "quantity": 1, "unitPrice": "20.00", "description": "Hormonal tests (Cortisol, ACTH)"}]	\N	[{"id": "PAY-1763403516049", "date": "2025-11-17T18:18:36.049Z", "amount": 20, "method": "cash", "reference": "INV-1763403516049-EE5AH"}]	\N	1	2025-11-17 18:18:36.178869	2025-11-17 18:18:36.178869
11	1	INV-1763401881615-GBGN62H	P000003	John Patient	\N	\N	APT1763401877130P3AUTO	2025-11-19 00:00:00	2025-11-19 00:00:00	2025-11-19 00:00:00	paid	payment	Credit Card	None (Patient Self-Pay)	50.00	0.00	0.00	50.00	50.00	[{"code": "GC001", "total": 50, "quantity": 1, "unitPrice": 50, "description": "General Consultation"}]	\N	[]	\N	\N	2025-11-17 17:51:21.747919	2025-11-17 18:01:06.183
13	1	INV-1763403295908-WTI3E5	P000003	John Patient	\N	lab_result	LAB1763403288059I2CFW	2025-11-17 00:00:00	2025-11-17 00:00:00	2025-11-17 00:00:00	paid	payment	\N	\N	20.00	0.00	0.00	20.00	20.00	[{"code": "LAB-001", "total": 20, "quantity": 1, "unitPrice": "20.00", "description": "Hormonal tests (Cortisol, ACTH)"}]	\N	[{"id": "PAY-1763403295908", "date": "2025-11-17T18:14:55.908Z", "amount": 20, "method": "cash", "reference": "INV-1763403295908-WTI3E5"}]	\N	1	2025-11-17 18:14:56.023841	2025-11-17 18:14:56.023841
12	1	INV-071921	P000003	John Patient	\N	medical_images	XRAY0792	2025-11-17 00:00:00	2025-11-17 00:00:00	2025-11-17 00:00:00	sent	payment	Credit Card	\N	1.20	0.00	0.00	1.20	0.00	[{"code": "XRAY0792", "total": 1, "quantity": 1, "unitPrice": 1, "description": "Medical Imaging - X-ray (Radiography)"}]	\N	[]	Imaging study: X-ray (Radiography), Modality: X-Ray, Body Part: Chest X-Ray (PA / Lateral)	1	2025-11-17 18:11:12.044098	2025-11-17 18:15:15.991
15	1	INV-1763403637447-PENLBP	P000003	John Patient	\N	lab_result	LAB1763403615372AMBU3	2025-11-17 00:00:00	2025-11-17 00:00:00	2025-11-17 00:00:00	paid	payment	\N	\N	20.00	0.00	0.00	20.00	20.00	[{"code": "LAB-001", "total": 20, "quantity": 1, "unitPrice": "20.00", "description": "Hormonal tests (Cortisol, ACTH)"}]	\N	[{"id": "PAY-1763403637447", "date": "2025-11-17T18:20:37.447Z", "amount": 20, "method": "cash", "reference": "INV-1763403637447-PENLBP"}]	\N	1	2025-11-17 18:20:37.571802	2025-11-17 18:20:37.571802
16	1	INV-1763404965743-1O4OGS	P000003	John Patient	\N	lab_result	LAB1763404953869MACCC	2025-11-17 00:00:00	2025-11-17 00:00:00	2025-11-17 00:00:00	sent	payment	debit_card	\N	20.00	0.00	0.00	20.00	20.00	[{"code": "LAB-001", "total": 20, "quantity": 1, "unitPrice": "20.00", "description": "Hormonal tests (Cortisol, ACTH)"}]	\N	[{"id": "PAY-1763404965743", "date": "2025-11-17T18:42:45.743Z", "amount": 20, "method": "debit_card", "reference": "INV-1763404965743-1O4OGS"}]	\N	1	2025-11-17 18:42:45.873333	2025-11-17 18:43:50.842
17	1	INV-137568	P000003	John Patient	\N	\N	\N	2025-11-17 00:00:00	2025-11-17 00:00:00	2025-12-17 00:00:00	sent	payment	\N	\N	3232.00	0.00	0.00	3232.00	0.00	[{"code": "32", "total": 333, "quantity": 3, "unitPrice": 333, "description": "232"}]	\N	[]	\N	1	2025-11-17 18:45:37.68419	2025-11-17 18:45:42.94
18	1	INV-092879	P000003	John Patient	2345643435	\N	\N	2025-11-17 00:00:00	2025-11-17 00:00:00	2025-12-17 00:00:00	draft	insurance_claim	\N	\N	212.00	0.00	0.00	212.00	0.00	[{"code": "1212", "total": 1, "quantity": 1, "unitPrice": 1, "description": "12"}]	{"status": "approved", "provider": "nhs", "paidAmount": 0, "claimNumber": "CLM092879"}	[]	\N	1	2025-11-17 19:01:32.996766	2025-11-17 19:01:32.996766
19	1	INV-092898	P000003	John Patient	2345643435	\N	\N	2025-11-17 00:00:00	2025-11-17 00:00:00	2025-12-17 00:00:00	sent	insurance_claim	\N	\N	212.00	0.00	0.00	212.00	0.00	[{"code": "1212", "total": 1, "quantity": 1, "unitPrice": 1, "description": "12"}]	{"status": "approved", "provider": "nhs", "paidAmount": 0, "claimNumber": "CLM092898"}	[]	\N	1	2025-11-17 19:01:33.012883	2025-11-17 19:01:42.585
20	1	INV-1763408541098-2GFHTB	P000003	John Patient	\N	lab_result	LAB1763408531278A0QK2	2025-11-17 00:00:00	2025-11-17 00:00:00	2025-11-17 00:00:00	sent	payment	credit_card	\N	20.00	0.00	0.00	20.00	20.00	[{"code": "LAB-001", "total": 20, "quantity": 1, "unitPrice": "20.00", "description": "Hormonal tests (Cortisol, ACTH)"}]	\N	[{"id": "PAY-1763408541098", "date": "2025-11-17T19:42:21.098Z", "amount": 20, "method": "credit_card", "reference": "INV-1763408541098-2GFHTB"}]	\N	1	2025-11-17 19:42:21.223316	2025-11-17 19:42:34.123
21	1	INV-1763452841169-RNBB8O4	P000003	John Patient	\N	\N	APT1763452837530P3AUTO	2025-11-27 00:00:00	2025-11-27 00:00:00	2025-11-27 00:00:00	draft	payment	\N	None (Patient Self-Pay)	50.00	0.00	0.00	50.00	0.00	[{"code": "GC001", "total": 50, "quantity": 1, "unitPrice": 50, "description": "General Consultation"}]	\N	[]	\N	\N	2025-11-18 08:00:41.293172	2025-11-18 08:00:41.293172
22	1	INV-1763454367799-OVRTO8	P000003	John Patient	\N	lab_result	LAB1763454350137WEKY5	2025-11-18 00:00:00	2025-11-18 00:00:00	2025-11-18 00:00:00	paid	payment	debit_card	\N	20.00	0.00	0.00	20.00	20.00	[{"code": "LAB-001", "total": 20, "quantity": 1, "unitPrice": "20.00", "description": "Hormonal tests (Cortisol, ACTH)"}]	\N	[{"id": "PAY-1763454367800", "date": "2025-11-18T08:26:07.800Z", "amount": 20, "method": "debit_card", "reference": "INV-1763454367799-OVRTO8"}]	\N	1	2025-11-18 08:26:07.923298	2025-11-18 08:26:07.923298
\.


--
-- Data for Name: lab_results; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.lab_results (id, organization_id, patient_id, test_id, test_type, ordered_by, doctor_name, main_specialty, sub_specialty, priority, ordered_at, collected_at, completed_at, status, report_status, results, critical_values, notes, "Lab_Request_Generated", "Sample_Collected", "Lab_Report_Generated", "Reviewed", signature_data, created_at) FROM stdin;
1	1	1	CBC001	Complete Blood Count (CBC)	2	\N	\N	\N	routine	2025-11-15 08:46:49.801	2025-11-15 10:46:49.801	2025-11-16 08:46:49.801	completed	\N	[{"name": "White Blood Cell Count", "unit": "×10³/µL", "value": "7.2", "status": "normal", "referenceRange": "4.0-11.0"}, {"name": "Red Blood Cell Count", "unit": "×10⁶/µL", "value": "4.5", "status": "normal", "referenceRange": "4.2-5.4"}, {"name": "Hemoglobin", "unit": "g/dL", "value": "14.2", "status": "normal", "referenceRange": "12.0-16.0"}]	f	All values within normal limits	f	f	f	f	\N	2025-11-17 08:46:49.917645
2	1	2	GLU002	Blood Glucose	2	\N	\N	\N	routine	2025-11-16 08:46:49.801	2025-11-16 09:46:49.801	2025-11-16 20:46:49.801	completed	\N	[{"flag": "HIGH", "name": "Glucose", "unit": "mg/dL", "value": "245", "status": "abnormal_high", "referenceRange": "70-99"}]	t	High glucose levels - follow up required, critical value	f	f	f	f	\N	2025-11-17 08:46:50.152796
4	1	1	A1C004	Hemoglobin A1C	2	\N	\N	\N	routine	2025-11-14 08:46:49.801	2025-11-14 09:16:49.801	2025-11-15 08:46:49.801	completed	\N	[{"flag": "HIGH", "name": "Hemoglobin A1C", "unit": "%", "value": "8.5", "status": "abnormal_high", "referenceRange": "< 7.0"}]	t	Elevated A1C indicates poor diabetes control	f	f	f	f	\N	2025-11-17 08:46:50.61991
5	1	1	LAB1763371546407HTB66	Complete Blood Count (CBC)	1	Paul Smith	\N	\N	routine	2025-11-17 09:25:46.407	\N	\N	completed	Lab Request Generated	[{"name": "Complete Blood Count (CBC) - Hemoglobin (Hb)", "unit": "g/dL", "value": "2", "status": "normal", "referenceRange": "13.0 - 17.0"}, {"name": "Complete Blood Count (CBC) - Total WBC Count", "unit": "x10³/L", "value": "2", "status": "normal", "referenceRange": "4.0 - 10.0"}, {"name": "Complete Blood Count (CBC) - RBC Count", "unit": "x10¹²/L", "value": "2", "status": "normal", "referenceRange": "4.5 - 5.9"}, {"name": "Complete Blood Count (CBC) - Hematocrit (HCT/PCV)", "unit": "%", "value": "2", "status": "normal", "referenceRange": "40 - 50"}, {"name": "Complete Blood Count (CBC) - MCV", "unit": "fL", "value": "2", "status": "normal", "referenceRange": "80 - 96"}, {"name": "Complete Blood Count (CBC) - MCH", "unit": "pg", "value": "2", "status": "normal", "referenceRange": "27 - 32"}, {"name": "Complete Blood Count (CBC) - MCHC", "unit": "g/dL", "value": "2", "status": "normal", "referenceRange": "32 - 36"}, {"name": "Complete Blood Count (CBC) - Platelet Count", "unit": "x10³/L", "value": "2", "status": "normal", "referenceRange": "150 - 450"}, {"name": "Complete Blood Count (CBC) - Neutrophils", "unit": "%", "value": "2", "status": "normal", "referenceRange": "40 - 75"}, {"name": "Complete Blood Count (CBC) - Lymphocytes", "unit": "%", "value": "2", "status": "normal", "referenceRange": "20 - 45"}, {"name": "Complete Blood Count (CBC) - Monocytes", "unit": "%", "value": "2", "status": "normal", "referenceRange": "2 - 10"}, {"name": "Complete Blood Count (CBC) - Eosinophils", "unit": "%", "value": "2", "status": "normal", "referenceRange": "1 - 6"}, {"name": "Complete Blood Count (CBC) - Basophils", "unit": "%", "value": "2", "status": "normal", "referenceRange": "<2"}]	f		t	t	t	f	\N	2025-11-17 09:25:46.525761
7	1	1	LAB1763379093276AZTAP	Viral Panels / PCR Tests (e.g. COVID-19, Influenza) | Hormonal tests (Cortisol, ACTH)	1	Paul Smith	\N	\N	routine	2025-11-17 11:31:33.276	\N	\N	completed	Lab Request Generated	[{"name": "Viral Panels / PCR Tests (e.g. COVID-19, Influenza) - COVID-19 PCR", "unit": "", "value": "2", "status": "normal", "referenceRange": "Negative"}, {"name": "Viral Panels / PCR Tests (e.g. COVID-19, Influenza) - Influenza A PCR", "unit": "", "value": "2", "status": "normal", "referenceRange": "Negative"}, {"name": "Viral Panels / PCR Tests (e.g. COVID-19, Influenza) - Influenza B PCR", "unit": "", "value": "2", "status": "normal", "referenceRange": "Negative"}, {"name": "Viral Panels / PCR Tests (e.g. COVID-19, Influenza) - RSV PCR", "unit": "", "value": "22", "status": "normal", "referenceRange": "Negative"}, {"name": "Hormonal tests (Cortisol, ACTH) - Cortisol (AM)", "unit": "μg/dL", "value": "2", "status": "normal", "referenceRange": "6 - 23"}, {"name": "Hormonal tests (Cortisol, ACTH) - Cortisol (PM)", "unit": "μg/dL", "value": "2", "status": "normal", "referenceRange": "3 - 16"}, {"name": "Hormonal tests (Cortisol, ACTH) - ACTH (Adrenocorticotropic Hormone)", "unit": "pg/mL", "value": "2", "status": "normal", "referenceRange": "10 - 60"}, {"name": "Hormonal tests (Cortisol, ACTH) - 24-hour Urinary Free Cortisol", "unit": "μg/24hr", "value": "2", "status": "normal", "referenceRange": "10 - 100"}]	f		t	t	t	f	data:image/png;base64,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	2025-11-17 11:31:33.396083
6	1	1	LAB17633774520126WXKP	Hormonal tests (Cortisol, ACTH)	1	Paul Smith	\N	\N	routine	2025-11-17 11:04:12.012	\N	\N	completed	Lab Request Generated	[{"name": "Hormonal tests (Cortisol, ACTH) - Cortisol (AM)", "unit": "μg/dL", "value": "1", "status": "normal", "referenceRange": "6 - 23"}, {"name": "Hormonal tests (Cortisol, ACTH) - Cortisol (PM)", "unit": "μg/dL", "value": "1", "status": "normal", "referenceRange": "3 - 16"}, {"name": "Hormonal tests (Cortisol, ACTH) - ACTH (Adrenocorticotropic Hormone)", "unit": "pg/mL", "value": "1", "status": "normal", "referenceRange": "10 - 60"}, {"name": "Hormonal tests (Cortisol, ACTH) - 24-hour Urinary Free Cortisol", "unit": "μg/24hr", "value": "1", "status": "normal", "referenceRange": "10 - 100"}]	f	edwdce	t	t	t	f	\N	2025-11-17 11:04:12.133132
8	1	1	LAB17633801066094XW4P	Viral Panels / PCR Tests (e.g. COVID-19, Influenza) | Hormonal tests (Cortisol, ACTH)	1	Michael Johnson	\N	\N	routine	2025-11-17 11:48:26.609	\N	\N	completed	Lab Request Generated	[{"name": "Viral Panels / PCR Tests (e.g. COVID-19, Influenza) - COVID-19 PCR", "unit": "", "value": "4", "status": "normal", "referenceRange": "Negative"}, {"name": "Viral Panels / PCR Tests (e.g. COVID-19, Influenza) - Influenza A PCR", "unit": "", "value": "4", "status": "normal", "referenceRange": "Negative"}, {"name": "Viral Panels / PCR Tests (e.g. COVID-19, Influenza) - Influenza B PCR", "unit": "", "value": "4", "status": "normal", "referenceRange": "Negative"}, {"name": "Viral Panels / PCR Tests (e.g. COVID-19, Influenza) - RSV PCR", "unit": "", "value": "4", "status": "normal", "referenceRange": "Negative"}, {"name": "Viral Panels / PCR Tests (e.g. COVID-19, Influenza) - Viral Load (Ct Value)", "unit": "Ct", "value": "4", "status": "normal", "referenceRange": ">35"}, {"name": "Hormonal tests (Cortisol, ACTH) - Cortisol (AM)", "unit": "μg/dL", "value": "4", "status": "normal", "referenceRange": "6 - 23"}, {"name": "Hormonal tests (Cortisol, ACTH) - Cortisol (PM)", "unit": "μg/dL", "value": "4", "status": "normal", "referenceRange": "3 - 16"}, {"name": "Hormonal tests (Cortisol, ACTH) - ACTH (Adrenocorticotropic Hormone)", "unit": "pg/mL", "value": "4", "status": "normal", "referenceRange": "10 - 60"}, {"name": "Hormonal tests (Cortisol, ACTH) - 24-hour Urinary Free Cortisol", "unit": "μg/24hr", "value": "44", "status": "normal", "referenceRange": "10 - 100"}]	f		t	t	t	f	\N	2025-11-17 11:48:26.725153
9	1	1	LAB1763400432463UJF7B	Hormonal tests (Cortisol, ACTH)	1	Paul Smith	\N	\N	routine	2025-11-17 17:27:12.463	\N	\N	pending	Lab Request Generated	[]	f	\N	f	f	f	f	\N	2025-11-17 17:27:12.580894
10	1	3	LAB1763400653506DIBPU	Hormonal tests (Cortisol, ACTH)	1	Paul Smith	\N	\N	routine	2025-11-17 17:30:53.506	\N	\N	pending	Lab Request Generated	[]	f	\N	t	f	f	f	\N	2025-11-17 17:30:53.627072
11	1	3	LAB17634009893609B3D6	Viral Panels / PCR Tests (e.g. COVID-19, Influenza)	1	Paul Smith	\N	\N	routine	2025-11-17 17:36:29.36	\N	\N	pending	Lab Request Generated	[]	f	\N	f	f	f	f	\N	2025-11-17 17:36:29.47881
12	1	3	LAB1763401284864PY1TZ	Viral Panels / PCR Tests (e.g. COVID-19, Influenza)	1	Paul Smith	\N	\N	routine	2025-11-17 17:41:24.864	\N	\N	pending	Lab Request Generated	[]	f	\N	f	f	f	f	\N	2025-11-17 17:41:24.983462
13	1	3	LAB17634025866160UCR5	Hormonal tests (Cortisol, ACTH)	1	Paul Smith	\N	\N	routine	2025-11-17 18:03:06.616	\N	\N	pending	Lab Request Generated	[]	f	\N	f	f	f	f	\N	2025-11-17 18:03:06.73478
14	1	3	LAB17634028706279WZJO	Hormonal tests (Cortisol, ACTH)	1	Paul Smith	\N	\N	routine	2025-11-17 18:07:50.627	\N	\N	pending	Lab Request Generated	[]	f	\N	f	f	f	f	\N	2025-11-17 18:07:50.744799
15	1	3	LAB17634029191284C594	Hormonal tests (Cortisol, ACTH)	1	Paul Smith	\N	\N	routine	2025-11-17 18:08:39.128	\N	\N	pending	Lab Request Generated	[]	f	\N	f	f	f	f	\N	2025-11-17 18:08:39.241826
16	1	3	LAB1763403288059I2CFW	Hormonal tests (Cortisol, ACTH)	1	Paul Smith	\N	\N	routine	2025-11-17 18:14:48.059	\N	\N	pending	Lab Request Generated	[]	f	\N	t	f	f	f	\N	2025-11-17 18:14:48.183546
17	1	3	LAB1763403505944IFQ34	Hormonal tests (Cortisol, ACTH)	1	Paul Smith	\N	\N	routine	2025-11-17 18:18:25.944	\N	\N	pending	Lab Request Generated	[]	f	\N	t	f	f	f	\N	2025-11-17 18:18:26.075127
18	1	3	LAB1763403615372AMBU3	Hormonal tests (Cortisol, ACTH)	1	Paul Smith	\N	\N	routine	2025-11-17 18:20:15.372	\N	\N	pending	Lab Request Generated	[]	f	\N	t	f	f	f	\N	2025-11-17 18:20:15.493638
19	1	3	LAB1763404953869MACCC	Hormonal tests (Cortisol, ACTH)	1	Paul Smith	\N	\N	routine	2025-11-17 18:42:33.869	\N	\N	pending	Lab Request Generated	[]	f	\N	t	f	f	f	\N	2025-11-17 18:42:33.999004
20	1	3	LAB1763405394015EBSNK	Hormonal tests (Cortisol, ACTH)	1	Paul Smith	\N	\N	routine	2025-11-17 18:49:54.015	\N	\N	pending	Lab Request Generated	[]	f	\N	f	f	f	f	\N	2025-11-17 18:49:54.132138
21	1	3	LAB1763408531278A0QK2	Hormonal tests (Cortisol, ACTH)	1	Paul Smith	\N	\N	routine	2025-11-17 19:42:11.278	\N	\N	pending	Lab Request Generated	[]	f	\N	t	f	f	f	\N	2025-11-17 19:42:11.39632
22	1	3	LAB1763454350137WEKY5	Hormonal tests (Cortisol, ACTH)	1	Paul Smith	\N	\N	routine	2025-11-18 08:25:50.137	\N	\N	pending	Lab Request Generated	[]	f	\N	t	f	f	f	\N	2025-11-18 08:25:50.261885
\.


--
-- Data for Name: lab_test_pricing; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.lab_test_pricing (id, organization_id, doctor_id, doctor_name, doctor_role, test_name, test_code, category, base_price, currency, version, effective_date, expiry_date, is_active, created_by, notes, metadata, created_at, updated_at) FROM stdin;
1	1	\N	\N	\N	Complete Blood Count (CBC)	CBC001	Hematology	55.00	GBP	1	2025-11-17 09:35:42.235309	\N	t	1	\N	{}	2025-11-17 09:35:42.235309	2025-11-17 09:35:42.235309
2	1	\N	\N	\N	Basic Metabolic Panel (BMP) / Chem-7	BMP001	Chemistry	5.00	GBP	1	2025-11-17 09:35:43.314169	\N	t	1	\N	{}	2025-11-17 09:35:43.314169	2025-11-17 09:35:43.314169
3	1	\N	\N	\N	Comprehensive Metabolic Panel (CMP)	CMP001	Chemistry	5.00	GBP	1	2025-11-17 09:35:44.395674	\N	t	1	\N	{}	2025-11-17 09:35:44.395674	2025-11-17 09:35:44.395674
4	1	\N	\N	\N	Lipid Profile (Cholesterol, LDL, HDL, Triglycerides)	LP001	Chemistry	5.00	GBP	1	2025-11-17 09:35:45.478085	\N	t	1	\N	{}	2025-11-17 09:35:45.478085	2025-11-17 09:35:45.478085
5	1	\N	\N	\N	Thyroid Function Tests (TSH, Free T4, Free T3)	TFT001	Endocrinology	5.00	GBP	1	2025-11-17 09:35:46.591537	\N	t	1	\N	{}	2025-11-17 09:35:46.591537	2025-11-17 09:35:46.591537
6	1	\N	\N	\N	Liver Function Tests (AST, ALT, ALP, Bilirubin)	LFT001	Chemistry	5.00	GBP	1	2025-11-17 09:35:47.656592	\N	t	1	\N	{}	2025-11-17 09:35:47.656592	2025-11-17 09:35:47.656592
7	1	\N	\N	\N	Kidney Function Tests (Creatinine, BUN, eGFR)	KFT001	Chemistry	342.00	GBP	1	2025-11-17 09:35:48.735484	\N	t	1	\N	{}	2025-11-17 09:35:48.735484	2025-11-17 09:35:48.735484
8	1	\N	\N	\N	Electrolytes (Sodium, Potassium, Chloride, Bicarbonate)	E001	Chemistry	223.00	GBP	1	2025-11-17 09:35:51.086313	\N	t	1	\N	{}	2025-11-17 09:35:51.086313	2025-11-17 09:35:51.086313
9	1	\N	\N	\N	Blood Glucose (Fasting / Random / Postprandial)	BG001	Chemistry	23234.00	GBP	1	2025-11-17 09:35:52.999778	\N	t	1	\N	{}	2025-11-17 09:35:52.999778	2025-11-17 09:35:52.999778
10	1	\N	\N	\N	Hemoglobin A1C (HbA1c)	HA001	Chemistry	44223.00	GBP	1	2025-11-17 09:35:54.058018	\N	t	1	\N	{}	2025-11-17 09:35:54.058018	2025-11-17 09:35:54.058018
11	1	\N	\N	\N	C-Reactive Protein (CRP)	CRP001	Immunology	4234.00	GBP	1	2025-11-17 09:35:55.154279	\N	t	1	\N	{}	2025-11-17 09:35:55.154279	2025-11-17 09:35:55.154279
12	1	\N	\N	\N	Erythrocyte Sedimentation Rate (ESR)	ESR001	Hematology	234.00	GBP	1	2025-11-17 09:35:56.218379	\N	t	1	\N	{}	2025-11-17 09:35:56.218379	2025-11-17 09:35:56.218379
13	1	\N	\N	\N	Coagulation Tests (PT, PTT, INR)	CT001	Hematology	44.00	GBP	1	2025-11-17 09:35:57.29106	\N	t	1	\N	{}	2025-11-17 09:35:57.29106	2025-11-17 09:35:57.29106
14	1	\N	\N	\N	Urinalysis (UA)	UA001	Urinalysis	3.00	GBP	1	2025-11-17 09:35:58.352067	\N	t	1	\N	{}	2025-11-17 09:35:58.352067	2025-11-17 09:35:58.352067
15	1	\N	\N	\N	Albumin / Total Protein	ATP001	Chemistry	4.00	GBP	1	2025-11-17 09:35:59.423381	\N	t	1	\N	{}	2025-11-17 09:35:59.423381	2025-11-17 09:35:59.423381
16	1	\N	\N	\N	Iron Studies (Serum Iron, TIBC, Ferritin)	IS001	Hematology	32.03	GBP	1	2025-11-17 09:36:00.501548	\N	t	1	\N	{}	2025-11-17 09:36:00.501548	2025-11-17 09:36:00.501548
17	1	\N	\N	\N	Vitamin D	VD001	Chemistry	3.00	GBP	1	2025-11-17 09:36:01.569534	\N	t	1	\N	{}	2025-11-17 09:36:01.569534	2025-11-17 09:36:01.569534
18	1	\N	\N	\N	Vitamin B12 / Folate	VBF001	Chemistry	3.00	GBP	1	2025-11-17 09:36:02.627899	\N	t	1	\N	{}	2025-11-17 09:36:02.627899	2025-11-17 09:36:02.627899
19	1	\N	\N	\N	Hormone Panels (e.g., LH, FSH, Testosterone, Estrogen)	HP001	Endocrinology	4.00	GBP	1	2025-11-17 09:36:03.694084	\N	t	1	\N	{}	2025-11-17 09:36:03.694084	2025-11-17 09:36:03.694084
20	1	\N	\N	\N	Prostate-Specific Antigen (PSA)	PSA001	Oncology	4.00	GBP	1	2025-11-17 09:36:04.747649	\N	t	1	\N	{}	2025-11-17 09:36:04.747649	2025-11-17 09:36:04.747649
21	1	\N	\N	\N	Thyroid Antibodies (e.g. Anti-TPO, Anti-TG)	TA001	Immunology	55.00	GBP	1	2025-11-17 09:36:05.83215	\N	t	1	\N	{}	2025-11-17 09:36:05.83215	2025-11-17 09:36:05.83215
22	1	\N	\N	\N	Creatine Kinase (CK)	CK001	Chemistry	155.00	GBP	1	2025-11-17 09:36:06.899923	\N	t	1	\N	{}	2025-11-17 09:36:06.899923	2025-11-17 09:36:06.899923
23	1	\N	\N	\N	Cardiac Biomarkers (Troponin, CK-MB, BNP)	CB001	Cardiology	1.00	GBP	1	2025-11-17 09:36:07.95652	\N	t	1	\N	{}	2025-11-17 09:36:07.95652	2025-11-17 09:36:07.95652
24	1	\N	\N	\N	Electrolyte Panel	EP001	Chemistry	55.00	GBP	1	2025-11-17 09:36:09.012435	\N	t	1	\N	{}	2025-11-17 09:36:09.012435	2025-11-17 09:36:09.012435
25	1	\N	\N	\N	Uric Acid	UA002	Chemistry	55.00	GBP	1	2025-11-17 09:36:10.078181	\N	t	1	\N	{}	2025-11-17 09:36:10.078181	2025-11-17 09:36:10.078181
26	1	\N	\N	\N	Lipase / Amylase (Pancreatic enzymes)	LA001	Chemistry	66.00	GBP	1	2025-11-17 09:36:11.154577	\N	t	1	\N	{}	2025-11-17 09:36:11.154577	2025-11-17 09:36:11.154577
27	1	\N	\N	\N	Hepatitis B / C Serologies	HBC001	Serology	77.00	GBP	1	2025-11-17 09:36:12.24105	\N	t	1	\N	{}	2025-11-17 09:36:12.24105	2025-11-17 09:36:12.24105
28	1	\N	\N	\N	HIV Antibody / Viral Load	HIV001	Serology	88.00	GBP	1	2025-11-17 09:36:13.302585	\N	t	1	\N	{}	2025-11-17 09:36:13.302585	2025-11-17 09:36:13.302585
29	1	\N	\N	\N	HCG (Pregnancy / Quantitative)	HCG001	Endocrinology	99.00	GBP	1	2025-11-17 09:36:14.361756	\N	t	1	\N	{}	2025-11-17 09:36:14.361756	2025-11-17 09:36:14.361756
30	1	\N	\N	\N	Autoimmune Panels (ANA, ENA, Rheumatoid Factor)	AP001	Immunology	54.50	GBP	1	2025-11-17 09:36:15.418645	\N	t	1	\N	{}	2025-11-17 09:36:15.418645	2025-11-17 09:36:15.418645
31	1	\N	\N	\N	Tumor Markers (e.g. CA-125, CEA, AFP)	TM001	Oncology	24.95	GBP	1	2025-11-17 09:36:16.475212	\N	t	1	\N	{}	2025-11-17 09:36:16.475212	2025-11-17 09:36:16.475212
32	1	\N	\N	\N	Blood Culture & Sensitivity	BCS001	Microbiology	2.00	GBP	1	2025-11-17 09:36:17.547836	\N	t	1	\N	{}	2025-11-17 09:36:17.547836	2025-11-17 09:36:17.547836
33	1	\N	\N	\N	Stool Culture / Ova & Parasites	SCOP001	Microbiology	2.00	GBP	1	2025-11-17 09:36:18.621088	\N	t	1	\N	{}	2025-11-17 09:36:18.621088	2025-11-17 09:36:18.621088
34	1	\N	\N	\N	Sputum Culture	SC001	Microbiology	2.00	GBP	1	2025-11-17 09:36:19.678218	\N	t	1	\N	{}	2025-11-17 09:36:19.678218	2025-11-17 09:36:19.678218
35	1	\N	\N	\N	Viral Panels / PCR Tests (e.g. COVID-19, Influenza)	VP001	Microbiology	2.00	GBP	1	2025-11-17 09:36:20.734747	\N	t	1	\N	{}	2025-11-17 09:36:20.734747	2025-11-17 09:36:20.734747
36	1	\N	\N	\N	Hormonal tests (Cortisol, ACTH)	HT001	Endocrinology	20.00	GBP	1	2025-11-17 09:36:21.789585	\N	t	1	\N	{}	2025-11-17 09:36:21.789585	2025-11-17 09:36:21.789585
\.


--
-- Data for Name: letter_drafts; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.letter_drafts (id, organization_id, user_id, subject, recipient, doctor_email, location, copied_recipients, header, document_content, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: medical_images; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.medical_images (id, organization_id, patient_id, uploaded_by, image_id, study_type, modality, body_part, indication, priority, file_name, file_size, mime_type, image_data, status, findings, impression, radiologist, report_file_name, report_file_path, prescription_file_path, metadata, scheduled_at, performed_at, order_study_created, order_study_ready_to_generate, order_study_generated, order_study_shared, signature_data, signature_date, created_at, updated_at) FROM stdin;
4	1	1	1	IMG1763397519468I1ORDER	X-ray (Radiography)	X-Ray	Chest X-Ray (PA / Lateral)		routine	ORDER-1763397519468.pending	29126	image/jpeg	data:image/jpeg;base64,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W9lJPOVXkuQF4GZD1x3qVPWwcrUeYwrGIySCQKAUUq+ccjt171oPbSFDIAAQvBJwD9avWenoiZYnc/ODgEKvbGKdL5MKybwqrGDJgj8OlPm10J5Xa7MiC0UfOzYLsScA7j/u1Jc3UGnRlVCrK44UkEqvYsazLvWzFvjtMGQ5DSnnaf8AZFc5dXUhLSSuWduSWOSTUTqKO52YfByqavQsX2pKC5QlpCSXmfkn2UVgySPKxZiST6nNI7tIcnp2FNwa8etXdV+R9HQw8KMbREooornOgKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigDsIb+8X7spIOR84Bx+da9rqc5UBkhY7gCcsDjjg4rlrW9gXaJU3DnPOK6CyvNEBZpYZgsYySGBJ9Bwa+hhNSW58riaEoPSNi7dajeKYwIlXBOG3NzjOKQ6nfkYXYAOc7eMEe5qOa90G4TG+WN40DJkZBBOCDg1FLe6OsQWOckggFeASBznJq/dOPkn2ZcTV54gZJHVgANoAwS1TR61pl1KGktpg5YFirLjdjGfWuSvb1ZfMkU7UXhEByo/wDr0lhdRqDKZACvuOSe1Z80XKx2fVZqlzvfsd3earZQCN4opWLAbPMO0Yz1zXMavqV3deczNsQryiEjIHqe9UbnVYWVB8zMmcBTlRn0zWPc3lxIrAfKrAj1P51E6kKa8zXD4SrUkpSVkEtyqAAfe9BVB2eVssTSqhPJqQJ7V5U5yqH0MYKBGENKU4qbbQR6VPJYq5VYYptSyCoqyehQUUUUgCiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigDefTiDhPl9mNNW21CIOEG5SMHaQwP4VqbmGMds8HHNU7i8VWIHO3jjH49K96VOEddj56liK1R8tkyipvvmj2nB4+6MjH0pRZStktkfzOfenxXpEuXACk8cDgj1rWhmjmTnacEdDjI61lTpwqbu50169Whqo6Een6I94JEGB+7cqGzt4HtWdJYtbF0OAVYjkZ6fSt2znmjmyrlRtcAr78cA02bTtQG5gjOrOxBPRgTwSTW7pRtojhp4yfO+d6M57ylP8RJJOABx+tQyrjAODnBGK2JrIwf6/arg5AjIOQeeo4rNuMbwBjYB8o9K5alOyPVo1lN3iV1UCnYpQDTwv0rKMNDeU9SOmmpSpHpTCDRKOg4y1K8uCKgqxJ0xVeuGW50IKKKKgYUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAdwbO4Cu3lMAFJ+6eg55IrCNpcySEhMgk89vXvzWnNq1zFDIokkTdgYYnBz6ZrOW+uVieXLAtJ5a7WI4A3GveqSg3ZnzuFp1oJtJaleW0uI2OYjx0IwetXtPEpkCkEHBAGOfpxSNe3Ztd5A/dsq5bGdjc/zqO01AeaM/eIIygA7e1Zx5ITVnudNT21SlJNLQ0pJZbbKrhWYYORg4Psaqm6uH+VpJCvPVjt/BafJH5qmUtkZGR6Z45pmEHr0AreV7nJSUFHVXYhmIRlOSG4IPIB7EVmSszP83bgfSr7cnpkDPSoZYlYDs3UfifSuepeR6FJRgVlqUDv39qZsdPvL3H0/Ondv8Kk1FYA8jHaoWGKm9qif/OKGtBrRldxVdhyauEVDInevPqRdzri7or0UpyKSsCwooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooA7LUrTTgI0R5jkFirEcdhzis9Le0VNgncDOQhK/e9elLeb/MIzkgA9e2PeqoUsxwB1H/AAE+9e7Nrm2PCoU5ezV5MlaKB08k3MgHXG0bcnjk1a0zSFknVVlVuH25wASFNZzISwzk9d2OBV6yZlkXB6LweoHHoeKmKi5JtF1+eNJ8sjYV47SC7SSFJHysY3rnYD3z09KxpZ+cYwwz+dayXa7x5+ZEz84CDLDGME/ypt7DopLmCaRmILHemCCf4CRXTNN7HmYeag7zVzAZ3Y5JxgHAOMZ6Z+tAZsjcDzx681c8mBSSeQOnBJ/Wo/MgLMEV/l45xz9a5nG27PWjVUvhQ3HGMcc5zzVeRdjcZwRkcZ/Kre5enA9eR371HM8agLuz6YOcfWk1oXGTvYrAknjP5UjK3zEA4oYkEHsfyo3Z78VBqREGmkZFSsDxUeDWE4m0JFd4z2qIgjrVsjIqFkrklG2x0JkNFKQRSVkMKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooA6q8jdZThCDxwQfQfhUKQTtkrGxwTyFOOPelvNW1F5mJlYnCjOF6Y+lOh1HUvI83zJSokEYBY7S2N3Fe85RcjwIxrQppaEbwzZY+XngdmH6VPaxMu8lD9zt0GeByael5qEkF44LfuSHZjt6Hg53Cm2t9LODCzJIMg5GfzB6VUeVSRnUdV05Ky03FbJBbJCrjpzz6VFk9sA98//WrSe1Y28lw0qJEpG7d3PTgiso4OdpzjoT/WqnoZ4e00MmL4byz83p1zj61TEVycljsGeS5x+QHNXQ+wEKu5zyWPbjtTNlw+DsIz1J/rmueUeY9GEuVW2IfKjwcEsdpOSec49KgYMuNwxkAj6VoJBKc4wMfp70x7bBBYk4GBnjH0FDg7XKjVjfluUtxIC9qbkgmry26ScHOccMP61Xkt5Iz1BHaocXa5pGcW7EOT60h9aOfxFHWsm7o1SsxuKaQKfSVg0bpkLIDURUirJA/Goz7/AIVjKJaZBRUhUUhQ1nYYyilIxSUgCiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigDqbu3tHfckbDpyGwOPbmp4Gt0tGtpLUSqsnnRSBmDozLtOexHSsyWRz9zIOPXqPaqpnmYgbm59yM+3Fe5KpFO9jw44ecoKLkbcrxS24tlgWJHYPJhjukZem4n+VadlYaTHYqWwsrsct5gz1wAQa5PdKzkFmwcnjJwOmK2IiRBEuSflDnnoT2q6clN3sc2JpSpwSUtGa0+mGVLZLeV5kd3LonG3AyD+I6VmPZyxO0bROjITkMCCQOamt9Qltp4ZYpDuMRSTpgbeBgHj6Ut1qd3eIqSSBVy7HGAWDHOCRzxWulzliqkVboVfKBC84J5xg5x9aGIj7qAD0ByaguLwW6rFHh3ySW7CqqzX0gLKQF9duAfzqJVIrRbnVDD1J+9LY0fPkIIjj4Hcg8j3xULCVjlgRnjpjHtVEy3qnBlII56jFTi/uYwAZVc/3WUN+oqPaJ/Eb/V5Q1ppEu1h17dD6flSsMDnkfqPfmhL6B8CaHbn+JM/yqwEilAMLq3qCcNzVpJ/CzKVScH+8VihJbxyDg4bPBxVF0eNirjBH6+4rWZCpI5GKjkSOddj/AHh9xh1BrGdO/qddOv8ANGVSinSI8blHGCPyI9RTRXIlZnfe6uGKaVBp1FEo3CMiEqR0o9KlIpCKwcGjZSISgNRlDU54pOKy5SivgikqdlFRlaloYyilwaSpAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigDcmVtx4PHpkkZHYmq+xy69cgjOO4Pf/GrVzf3ZOQ23A5ARAD78Ckhvrxo533DCJ8rBEGWJAxkCvYk4OVjyo+1UL2X3/8AAIvLdnwp43dQDnA/CtRY5AkaAN2boeaoJeakACHYBxjI2rweeuK2INTvlC7pBMuAAkgDLj2yK2pW6HJivaWWxH5IdGJXawBzx94/QVUYAYAz0xWncTs25ESOPIPmmIcnOMjJ7UyKOGMf6kSyNkFnJXYRjIAFbyjc4adbk1ZmC2Bfc4LMBwg6DPOWNSOj/dVctjjHyqtbKQxlHSIbWC5kZRvC4HbPc8VSZLhFJJwncvgYz7tU+zSLWKlJ3Mq4gKokj8vu5PXHGMc1WWSRCSoyCeQ3NX7i4s0ULJcIcMCVTLN+n+NUzf2C/dSRj6kAVy1HCL3sepRlOUdYtj/tTo21oxgY9qtw3kSEEojYAPv+dZzX1q2cxuencDj8KjN1aHqkgHbocVKrKO0i5Yf2itKJ2do2hakoilieGbHyyRuSD+BqneaI8DkQXCPk5UP8rn6ZrCt7uzRlZJGjYEHIOOR7GuxtANVtMxFZpo1Jwh/eLxydp5/KumMoz1ueVVhUwz9y9jmbmyuHTEsTK6fdfGQfYkVk4IJB4IOCPeusJubNiCSQCFZTnJ71T1G3srpBdxoEfhZgvAB7MccfpU1aN/eib4XG68k1oc/Rj6VNLayx8j5l68dai2nBPTHY9a5tVo0eqmmrpjaKcPcUpC/pSsPmIjg9qYcDr+FS4FNKg1zyps2jNEJJFJuU09lIznp/nrURxziud3RruKQD2phFKqyMcIrMfRQSf0rQt9F1a55EBRf70p2CiMJT+FXInVhTV5uxm0ldCugWkYButQTPdLYb2+mTxUwsNDT7kF1MB/FI+B+S10RwdR76HJLH0l8N38v87HMUV1Qi05eY7CIAf89iCacZoF5FlZY/2Y8/rWn1J9ZGf9oXdowf3o5OiunOoQjIXTrRyB2jYH+dQvfjjGk2hPX/AFbH88GoeFS+1+BrHE1H9j8Uc9RW495COZNHtRn/AGHX9c1A11prddKg9ys06fgMGspUYr7X5msa039h/ev8zKoq+z6U2T9juI/9y5DD/wAfT+tRmOyb7huAfRyhx+QFR7Ps0aqfdNFSip5LZ41D/wAJGRngkVBUSi4uzLTT2CiiipGFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFAHYSzaYxP/EvjQdDh5CMEYqC3trdnuIoo4TFOmQpZsqyfMCMn8KilVmDZ4bHWqitJHKhIPT5sHg9uMV70pJPVHgwotxfLI2Ta24GnxTRwhSfMuFUksVL5C5B9Ota/2qwMixx2FsEQgJlCDwO/Nc7bK8kpLDBOSDzgZ6HNaKLIWxgsxIJC/wAQPGAPSto2ep52ITi+Vs177SrmWKe7to4vKZonCxEblHIYAe1ZZMcJKTSbJAS0m0gsoxjoO5q1Pf3sVo9srMoA2deVGd2Fx+NYEzsCGbliTkn1680OTjuTSpKroi1eapIiGG3PkQDjCkedL/tO3X8q5+5uppDjJPU/MSTz6k1cEedzvyx/iPJ54FRNZjPDgZ6F+jH0zXFW55r3T3cPClR3M0q55JzTSpBq68E0RYNGwA7gZH5ioG7YBPPYEivOlBrc9KMlJXRBg0VJg5+6fy7UhBz91vyNRYdyOrunXt7ZyiS2meN1IZSpPWquwjqD+RqW3UFz7Dmrp3U1YmolKLUtjuIPEdjqBWPWLcLPs2rdwAK5yMZYHg/jVg6YzJJJaSrd2TjDmL/WKSP4kHI/zzXEy7QwAP3QorT0y9vbOSOa2lkjkU5GzPToQR0r14VHseDiMHG3PHQseQ1vI8cytuU8bvl+XscHvUNxaxyBmXAboGHf2eume4tNe2LdW5s9QwFS5CkWsvbEqn7p9xVeTw1rUUgWREjzyrbi6sp7qyjBrXS1mciqTUuZM410KEq4IYevT8KiJ967z/hFROoEzOWAyCAFUH69azrjRLSwYLcPEVP3WQbifr7/AI1g6V3ZM7446CV5JnJ56f0qRIbmT/VwyN/wEgfma6UDS4T+7ieY4+8BsWpFvGAUQxxxj1Vcn8SaFhu8iZ5jb4YfeYsOg6pcDLKI17k8kD8eKvR+HbC3CtdTBznlQ2f0WrbT3dy23e7npgZx+J6U9rKdgDczxxoOis3OPYLWiw9Na2ucc8dWno5WXkR+fYWo2WNsmf77r6d9tVZbq7uOHkcr/dHAFWm/sOAN5kkkh9iEX8+tVJtX0qPiKIexBJIxVuUY7uxNOMpO8YtsWO2dvmWFmP1UfzpXS4XI4XHG07f5CqEmuMeI0cDsMkCqMmoXshzwtYyxNKOzudcMHiJu8kl6mq4c9Wzng89PyqP5APmbH1x/Wscy3R5Mh9eOKY3nN952P41zvFK+iPQjhGlZyNprqyjGA28jsP8AGoG1AdI4UHPVnJP5VleUfWkMR/vVm8VN7KxpHB01u7ml9pu2BwqEdwoBH5E1AzxMSHhVcjkplWz7g8VU8txyCfwNPDzdGJYf7XJ/PrWbrOW5uqSjsPaEEBoiDx0PDfhTFJU4OQRwQetKHHuDSmTP3uT69/xqHy7otX2HXblhDjoyAn8OMVTqd2aTBPAUYUe3WmbazqPmlcqKsrEVFOK02sigooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooA6+eF1LtwQRjC59vSqDRTAqQDwemePXOTzW1d3dzEJIvN+5g4RRjkbuwqrbapM80UZCly643xKxI6HZkdfavopqLep8vQqVVDmSuh9lFPuU7SQI2J46celaVtbzbi/lkBQASykEY5A54qSz1OeGymmbCqJWgBEKDLABtowPrT4dXujCxLyfvDjGAc4/SrV7WRxVLuV5ESxIoclBIfmcg87R68VgXQHmOF5G7j2+tdTK4eJRFEu+SPzHJXC8/TjFUbbTbSQGS4mOdrShIwOVHqx9aUtUVQqKlK5zUkcrlVHyqOST3PoAKuRWgnUDdlhgE84yeO1S3aDziduAfujGBj2qzYRYlR3IWPOCSdoqI00m7nbUxTdNNaMrxqkBcMqlx8o3jdtx7Gh5oXzvtYWIPLbACaluxGJ5NhVhyck9fyNZ8t1ChYMwz6A5/lVyaitTGlGVV3V2yV1tHORaIDzjYWB/HJNRlLM4/dEDP97k+3NV/t0WAAG9jtpPtULDaYiSenHOfzrD2kXsd8aFRb3+//glpYdLbjZKDjnlWHpWzZWvhqKM+fEJWI3MSoBXHYEVixNZIpaSOVWI5IyVx7AGpVaxfO25CrkY3nk/UHFaJJ9jmqqfRyt95uC28LzPmFJYcAHDAOnToe/61OBa2zZt7SOdSDko2CcE9UbmsSOFkG5JVb+IlSGB7jpx+tTRGcEF4ZCD/ABpnA9zxWiVkcE2297mhPqexQotVjfkPuH+P+FWdN8VXUGLa7Tz7M/LtyfNiHTdG1NWJ5U/fKJI8/N5gBG3rw3XPvVVrDTQxInS3brtkYPGQfRhzSlFPRhCfLqtzpJoDcRLeWV0Z7VyM46xnH3JVHIas97FrgFGVWzw4fkk+3/66x4NZ/sSYyWztID8siR5eCVc/dYdK2v7c/ta3ebRoFhu4lLXFrId0oGPvw46isruLsa+z5o89mjKuNGltwXw3kKeS5AaI+49KzpZ9Ht+JZPOYdBGSP5U6e9vr1it3cybsbWXGxOOMFRWbc6aYl8yEZDZLhedo/vfStJOSWhVKnTlO05Nf13Fm124wUtYxHH0xgD88Vmy3l7Ly0zD2Xj/69WPIQjsTjtx09KY1rnkZHrXHNVJdT2aUKFPaKKJXdyxJPuc/zoCAdqmMEoJwpP0FIEk/uN+Rrm9n3R3e07EYUUuKeY5ByVOPfimkH2/OmoWFzXE4oqaG3kl5yFXuTn8hV6LTlkIXceR12jOPxNXCjKWtjGpiKdPdmXRxzXQ2+iK5PXAIG5mAHPHYVZl0rTI1J2bmXjox56e1arDSZySzKktrs5XFAXPQE/QZroHs7SNyGhQcg9CDyM4pjxBVLouFGAQzDP1GKf1W241mEZbIxRayvzsYD1bj+dO+w45JPHoDj860+DwRn8KawDHHHpyen4UvYQNPrMmZpiwMbOP1phTp8v6Vo7B2wecYGP8AGmtGHOcdMDj2odNGiqlERxt8r4BPQ/y5qOS1K44+U9GHIP4ir7wMVPPdcZ6/nVyOJETYV3KT24xx6Uvq6noxTxXs1c5to2UkdxTcYrVvo4xKuwdUGfwqk0YNcFSk4SaOynUU4qXcrUUpBU4NJWBqFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQB6jdf2M1wGMBYPhfnJHYD+HisW4sooLhbi3thJbrMsisjksmDnacVNMxZlAOGVh96nRvNEWZSAeMgHIIJzgg19K4nxMKko7GnDbxXsMMUenBIfNkmLO8gC7wFz79OKtz22mBERbQL5QyGWQ84461FZ3FzcJIZGbC7URQCMYGcHHGadcsxaMdhg4HQsfWp1uF9CS9j/AOJXd3ECMmYYkJAPQMMj0rCt5I/LYySKkYTMpPJwowAgHc1rT3txHYTQqz4cSJgNkYIBO4dK5S6l8lWEhJBCgDHLHr3oWidyox9o1GJHd3zSysYk2Jn5Ax3NtHHLH/Co/Mbq7vk9Mnnj2FVTO7nPCr/CoXPT3NL98gykLxwC3OPesOds9yNCMUklYU3EjE7WA5IH09etVAgzyCRk5PrVnzLZVXDKSD/dyaha7xkJGpO4/M/OPcCsJyjvJnTCLXwoVYpCcIp5HOAcfQGrsFmyKHYqGIOCxAwBxWYbi6fkyHHbZ8o/SlVmbIdmJP3cknn0pQqwvsFSlUa3sarC1UYkuhk/eC88Cq/2jTEJAjd8kD5s8j6CqPA5FKE3EtkArk46flmqlVfRIiNBfak/y/IunUo42Jtodh3ZDKSMD045qVfEWsrkCRdvuASR7mswL1z046e9I2Bn/P5Vm6lTduxX1ai9OW5ovqk8ysXlkSRsjKHAOfYVHuk2li3mLxyWJ2j1xWdgnLdfTPb605GZTnP9aSrtv3jT6tCK9xWNiCXpsYEY6Hn8CK0bKURXEVxC4gnjYOrqMDPbrWFFJC5XzCEfOBIvAH1AFWleRBiUx7O0iNkN6ZFdsJ6HmYihd6aM9Dn0qz1u0+3xQol+mDdrDlY7hevnRKOMnuKpQae6KCsbvsB3Abd6g8ZwcHHrTfBl9LHLdWzSI0ckayR/PkIwbGK6K9t7iOY31rhwP9ZEWCj6ilzOL5ThnTTV+q3/AMzhNS077LIs0MTLBKe5yI5OpXI9e1Udo4DE88gDn9a9Akig1GCaCaPypJEBAAyoYj5TnpkGuXfRNRTzBtibYxDfvYwwI6kr96toST3M5NrXcwpIU3HnJ6cHr71UljMfzY4J57j6mtuS0jjBWaaIFTj5N7t9BwB+tVSbfDLh2PQFtoHX0HNEoJnRSxUo+Zkkq2cjp2xT4IfMdVCZOc8AZ49qmlhUE4TB7nOKfZAx3MLfwsdrl84wflJ4rDl96zPRlVvTcokojC8Hg9MHipopY1GVxuByOpIpLkKksiEF1BIXPG4+vHalt54olkdoUYr90BQefQk549a6FozypXnG7NKG/vN0cccLN5mAdqPg47ADPJrbW18uEXGo7EYjdDCYyZJnxxuXGfT/ACawIdc1G2KiJYoNuOUjDMuR/Dnim/2xqcxMkzGdN+7FycfiGXBpO7MvZ2V7EV8ZjLI25PmYlhgrjPfB/wAaqOsgj5KkMMZySfrVh53uC7lSEf5GOSwAJzgM1UWyJHQg7Ubbnpux705aGtGLenYTIAIPGeOnUexzSfdBO3APpn+lSxwzzybFU56+uF9T6VeSwgj+aVzIeeCCiLj1zyahRbOmdaEN2ZfJPCnJBAA5wD3NPWKY42xSHP8AsmtoGCPiMLk9VQBVHXNIZ1jJGQcKP/1cVSpnO8Y9kjKaF1A3q6gKXTcCAWHuaaZkABIx/d9/bFW572WQeUhITOf/ANVUzHC+dw57MvBofkaQd9aiM6bfLI8jd+g9AOgqFkx61eli8rHO5W6N/Q+9V3GR9a5JR11PXpyXKnHYpyICKqkEEir5HWq0qdxXn1oWd0dsJXRBRRRXOaBRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQB6PPGXYcBs4I7YIPUVFbxymZdyjlWyeTwoLYrUuL6O2lKp5KqcfK8Wc5HOetLbXse2/kaCF2EaqrbCQfMITgV9Ld2PhklsLYxyrbq2Mbmc4WlkHzqTkDABJ6nHBPFW21K3jjhTyo8rkDG4HOO1H22CQL+5gJxjDsB747Gs7vexdla1yExKYs7flUEkccAjbnNcNqyOJ2iPG2Q49hXoVzLBBHtWMNOQcKGJXPbINcXqFpL5+WQuzsW+UZ+uMUmnKLOnDyjTqps55vMQjocdCRkVGRKSGbJz3PetuWwmUjzFEZZQfmI3Yzj7o5/Ok+xp5JwcsCMZwT9cVzyw7keusbTiY6xSE8jHvg/0qY2ExyVZTnHYjrV7y3A5wWB5Pt6cU/+HGSexA4x3oWHjbUcsVL7JQFhJtP7xQQemDg0z7KylSZo+DzgNxVtmdWQZLDOCPTNQSGVS/BxztHB68dql04LZGkalR7sHthuXE8WMDnkdee9M+yy4O14m6Z+bFRt5mOUPH1+uKapfIIzxz/+vNS+VvY0SkluSNb3KAfJuH+wQR+nNVyGBO4EHPIII/nUxlcFsHlsZP8AhUi3UmCHw2RgbgCB+dRKMW7XKUpJXsVSRRnpVn/RJOHiMbcYaHO38VPFMNsQSI5EfGRj7r/rx+tRKnLdalxqR2ehAQcZHAPpTknkjyOCp+8p5FNfKn5gQfQgimlCcAYLNgADvmsbuL0NLJrU6HRrh4RPNbHrtV48YYY+bK/SvQLC++328c6H95HgXChuQAD8xHvXlal7cxrG7Bk+YlT1c9eldHomqPHMrq4SYkCUNny7he6sP5V6kHzR5XueDi6UoydRao6a9td6NLbbkkDkFCSqvzzsGa5SW4uIbuZufv5ZWzznr713LmO4iS4hOU2sdmACjE8q30rndRsftc0zx/LcKi716hsD271rF30PP92Lu9mZbX4lVVuI1kwT8xyHAPOA4pQtg42qzqQN3zFT+oxVQowypHIzn1GO2KbsIz3+vuM960uyuSL2di2baJt48yIOSMGQsuO/Gcimf2fd7mCROzRsTIVG9Ux03FarkupX5eMgirVvczIzOzuyHggOVLN2ANLRj9+C0YstrcyFWdNhZdoypBOO5JoSzlCOpwqL87dtw9eea1hqM1y8O9lzHhgJFBPpjJ7/AE61egNremWKQxqy8Mqj95g8ZLZxTemrMeeTXKjn4rd3d40i3s+H2jnAI4JbpVp7O2gVDO5+UDMYKk46kk1Z1i7TTF+zQKhO0nKMWLHHUmuW8y4u5N8zuR12Z+Ue1S59jWnQlNOTdkjcfVNHtoykNmJ5CAcuCVH9KxW1SS7ncJZQRgseU+UoufTkU2QAYx2ot4RDuUj5y2XP16Csm5OSSZ2xpUYU3Jq7NSO7VU8qJdi9TnqzerEdac0hbG4ZI54AHGP51VRR6e4I5/Q0rHbt9DkD055rpPOcU3oStKBypwF5HPOB6DPWopJQ/A6Z46jr3qFjyeMjnjOf1pjMOeceuBzwc9fSpcjeFEUk4OM9O3p7Uzr1B9Dz/hQpZzlenPTvQTk45xx+OPrWV7nZGPLoSxrFIDFLwjH8j6+tRzaY6AmKYOvUEjH60OGGCOnf1zSqzjof1zTsno0QuePvQlv0MmSOSNirgg/z+hqJhkGtS7XdGemV+ZTWYa4q0LHrUKjkk2UmGCaSpJeGqOvMejO4KKKKQBRRRQAUUUUAFFFFABRRRQAUUUUAFFFFAHrcslnJL89tBIWK84yfSooRZRTzwyWu2CTY6yxO2RsYH/8AXVWMyGRs54APTJBAJBqxBdGN/u71bCsrA5y3Xj2r6Sx8MpD4Fs7ycMkNxhyXClgQFPpkYFaJtNLDoT5gaPBJ4IB64p/nxqPLiVUCkR/IBzgAnrzVKdzucDqD0GcHjrxWerNdIruS6h9mt7fbFveZpGkdpPu7M4wCPTisbUbicG2KbdjKqjbg7vUVo6lfWyWSLImZ1xGShyCdoPIauX1G+uXtoPLXaIXxnkkBvXtVR0V2NQ9pNRXUffSqZMlo1VAFywAyR1469aqLe25wgJznJIXH4ZrLeSJt5kmG7jGCxxg01Xh3Ah9xxySCM+2KydfXQ9WGBSjaVzQknDGQqBwM4BHOfrVY30YyI0LNjqxwPpxVRzuY7eAe2ajG3cOcfT3rCdaV9DthhoJWY6S7uWI5UAn+HtUXmS7eTzvI6UHKsPQngUhPDZODkkVxOUurO1RitkOS4uRvG4dOeMZHSpEuSmAUBb6dqgUjJPfn8RTjxk445x60RqSWtwcIvoTNOkhDsmB0+U4wKb5sZ+6SOvUVDyQ2f4fmFRfMaHWkL2cS+FZiAOp9DxSFSuc5GfrzVQPLGcqxDe3apluScCUfL/ej4P8A3z0rWNaL30ZDpy6EwkIGCFK+jDdxU0Foj/vgfKY/6sNyv19aSOOCUGQHgcLF/G2OrMPSrKl24IGAMgdOB3ArojG7vLU55ysrR0ITA8Z+dM9TuB+U/jSoMKGQ4GcAnjPc4q6JQVMZGVOMjqPoaJbZGRGiPIJJjIwOOnWt/Z9YnH9YtpUVjb8Oa4kTmzvH/dTEJvfJwQeM/wCNb11bOkvmfwMd6uvUg9CD6V5ozOGA5Dg/NnqOa7/w1qKalbjSbt/9IRSbORj94DrGT/KlGZz4nDL4olTUrJmRrqJV4/14QcFezjH61ilM5HB47Hp+FdiYpLWR4ZduM7CpPY8EEelc5qFn9junVR+6kHmQnn7rc8fSuiLuecrozt7ooXhkP8LjI/DuKntzCMgqNr8Mj8hcfxbutRYB64znp2NPCMNjKFG3GW6jJPGaqxpKSasX3hkUFym1mLbQ2Cdg/u4pILk28jSMSrc8EZ3A85I61CGITy9+SCwHJ6H9KgdnPuo7ZJxn1PWmYJXYX7S3kyzSnkrsQHA+Qcg46c1DHGyjn6cjn9KRsk5zx/L86m6Kvp69s1KSvc6XOSgo3IETfMMjIX5z9BTnyJG9c+3cVLbD5rhiDwmB7ZOail3GTgZJxtGefSlayL5uaduyFzkKAMnOB6/gKnSw1CbhIG5ywdhtHHU1eWK2sTGpAadUVp3I5WRgD5Uf07mpzenyyzMxGQVALbV/2cE9TT3MHUs/dM5tKmADPIoHLZUFgBjrkdqjXS1JxJOSFGQvltGG55+aTsO/FXXu3DIzYJA6sWYAHnGDxn04qvLcTXAAkkY8/wAWduPcnmjlXUca1ToyG6t40TMITHI3xtuGR69hVKNkHJXPpg8ccfWtKNEZmjchQ4GCOmccADpz0rKeF4Zm8wnbu+U8/kfpUz01OnDyUk4N6l5VjmRlROQhZjjn045NUi4HmDpt4OT1OKsWcpMiAHA5Yse4H6VWvGAkcITt3Yyecn1qZS925pRg1UdNkMjcY9VbPtgVQq3K3D5OSFI/E1VPT8a5J6nrU9CrP1BqGp5+1QV5ctzuWwUUUVIwooooAKKKKACiiigAooooAKKKKACiiigD1cQsN7KpAYEE/TntzSWq/wCkKWUEhiQCDxwSMk8VqLfp5UjPHG+QeFDAEAUy1vbJ5I/3AUYJbDHgjjGK+h5nrofEqMdNRGfEg4UEZ5OcAMegqjdttdkjyCeVGMhc8ck/4VqtLpxlJAZWbK5YhgGHbAqnPbQztiK5YsWJxIv8IHtSiypRvsc1drI4Y5OV+ZsnOduR1rGcSyrKjlsNlcA8D0OK6TUIo4F8pGVmLHeFJx+vNZ4toR1ByRuznmtJR5i6FZUr3Rx5DozRsPmUkH3qRCRwQe/ar2oQqsm5QoPPI61VRSQSfTvXkeycJ2R9RCqqkFIad3Vc4+ho2tgNsb0OAatIVcFepUArjOfcc1PG7JG/zHdngMCQDWypJ9SHVa2RnqkrukYV8bs/dJ61DKspdgEbg9MEVtW7rN83yq65Ukdgec4qo0gAlQE5Zyd3U4B+7zSlQXLuTGu3Jq2xnqrcfK3XBJBxTiwHB6A1oQFNhBYA7soT0OB6U13gO0EBivU4zntjmo9hZaM19traxRG5lY5AAHGePeo87eOM/lVt44n6I3PACH+lNWzVicuy+xG4/jispUpdC1UXUrHczHAySRnFSLEFwWwWPQdhVv7HJGvylG4z8vXj61CQ4OGUg+4xT9ly/FuCqKXwsaFIIbJB9R1q3FcnhZRuXqX6OKr5zwfWnMUZURB93Jc+5rWHufCZzXPpJGiMFd6NuXOQR978RSi4GcdG6N6CsoSyxNujJ5429gD1q7C0Mw+VQJz6nr9K6IVeZ2W5y1KFleWq/rcv+TDOoyMOOjY5z9aSH7RZzROjMkkbrJHIueqkEEGmRM6cHjsRnp9K0FEcy7WPynGCScg11KKkr9TyqlSVJ8r1iztZJY9Y0yDVYflmjHk3qIOVkAAJ/qKz761W804umTLZkyx9maI8OP61B4Tna21GXTZyTbajE0XoPMUZRh79R+Nalri2u57dwxAdoiG/uEkHioV4u3YxlaVpdzjAqBnJHy4yMVJGjMCFUYYqcc9jxU95aNa39zanJEcjBMjgofmU8e1SohVVKnlSC/HA7gH+ddF0csrrQqeVu3HpggHA6AnAPP6VC6sq4Jxg4wPUdzitMqihZy5VyzFOCQuB97nv6en4VSdQ2fkAG1cE5JYdcknuaATKgGT9RkZ5/GnEEooyfl6DB6epp2wktngAngZ4z709RkY+XBB6fTuaDVyI7ZhvkU5O9DgepFTxxtFcLMFy6gGIH7ocDO4n0FU2zE6uoOQc89/WrT3UEjgKflC/Nz1JxwR+FJW2ZUk/ij1Hytwi79wzlmbnLZ5amPMoDA/Ow7kYGSeTx+FMaTzCMLgc49ACfSmFMj355/xpmaj3EkkY4GTjjG0YGPao2PI5PqAaUrjjPpjPvTCf896lnRBLoW4JEOVwDx909OtW5oVuISyYKLuEiHDOpHJBI6jpWUpYAEY9MY/Q1N5si7WRykinHy4BIJ7076GcqbUroDbPAzNHGjkRjiF923PIyG54qhP875UbcLnaf7349autPu3+Yiljn5l+Vs+uRVZ13AYfPfDDkVlNXVkdtCTUuaZQkPy89zj8qgNSyhw7BjnHT0xURrkkevHUrT9vxqCpp+q/jUNeXPc7VsFFFFSMKKKKACiiigAooooAKKKKACiiigAooooA9zf7I5cNBGHA+XaCpz14xUdtbWDEOFljLOBt+8A27nGRTJJtjHKjC8jBOMEY71btJwqsMAsGZunGSoIH617julofIRs3qZ0tpazXUxR9oVmxvj7jninx2qRiVmuQ24BA2CCoc4NI0nzMc/M4/jyMAEninQmMtIp3MrKwYqPlHHBz/wDWq9bEaXMD+zx9puFluEDKWKkHeW5yCFp/2GFnJaZnwmcKu3P4mlu5I7e8VgysFDK5VlY56YBpY57ZVuJ3l+XZgIOXbHAUVtrYw6nP3kcSZ2wfxEgvycHoOax2j2s6spx1UntmtS5uppc+WNi5OB1P0yax7st8rvIx7EZJx7VzV5Janu4KM0uWQigKRgg/wndgDd61MrwoWLzIGPBAOencgZrNUls4Hvk/41KuChwvrmuKNbsj05Uu7Lsd3ax72G5iTyduAR0xg1WN3CXZjFnI4GMYPrkVEqgbhzyMinIpjOVxlTk55H5Gl7WbSD2UItsn+02vyKECkphtynGT6YOaWP7Gc5kDYAwoOOf+Bc1VzGTkjkkg4poiw7E/dHP4Ue1l5MPZx72NUWy+UpVxh23dQMqPTFKPlVkRAAMFW7k9MHFZbOx+4SFHuentUsd7LHxkEdfmHIrVV4XtsYuhO173L6NjHm7QOevBFNEkYYiQKy9Ru7D0wKh+0xynDqFBAzkHBPrkU8xwttZXCjPQ/dOPStlK/wAJm4W+JCNbwvkxkxknIVzlSPY9aquskeQV4P8AGpyp+hqdxIDgkKGGeecjtSxmNCAWY5HCjp+OazlFPbQ1jJpdyqOeCBnrxSgEEEE5Hern2aKQEx/I4z05U/hUDxyxffGB6pyD+NZ+ya3NPap6IuW9ysuI5SFfor9AfrV6J3jchskA855rE4wOBj24NXra4Em2JzhuiMT19ia66dTozzcRQum47HV6WUa7seTuE0bI3cEMCDXUatEseoicDDyMA3ocd65Lw+DLe2UZ6pMrt64U7s13+oweeRJjJiDOM9waqpK00eZTp3hJdmcprlqwmsbocmWIxTN/txnjP4H9KpPGNqbV2ggu3zcZHGfb2rd1ZSdPtzjPlzK2OMDchrERlxzkse2AfzzWlN3iYVVaRCy+YAXJMYGxSqkbyec49KryLjEWOS25mJAxgYHAq9hwxZySc5Axn8PSq0ibSWdQB1PAJJHQYPOK1TMiHCDaFGAfzA+pqGWMKOuOTk//AFqkkmSAbmyXblVB6+hYelZ8lzdOxYvj2AAAobsa06blqPn2Rru/jYbYwfXuxqgpZG3Dv94HuKmbcxyxJPSmleKwldu56dFRhHlety5CwcoQQVIH1qz5J2DjOcnPuOcVlJLJAwZcEcblPRgK6K18u5t1kiDYKk4J5UgcqcVrGdzir0nTd1sZbooVyB8xPHpjHvUBUAHjB4zV6WPZkAgkZJx7fL/9aqj8dj7ex61TM4SIecg9Tz+PvSc59808LlgPXnP60jAA8duOaix0qWpHIecDoo6/Xk0zr14AyfwFOJznv0H1zUNydkOB1c7R9OprGXc7qeiUepSkYuzN6nj6VGadTDXLN6HowWpWmPzD2FRVJL941HXmS3OwKKKKQBRRRQAUUUUAFFFFABRRRQAUUUUAFFFFAHsVxKEBBB+cgdck9uoqM3RVc4278tkjJ64wQDWvc/2W3lhmIzkKQMjPuBWfdW+ntDmO5RCMg/L1z64r34yT6HxkotbMpyN5oB3N87AKvOAOvSpodyxyIGxyE9c8Z6+tLZWkxilVJYpfl+Xa2Md+9Tx280SfvE2AE9cbTjqQfeqbWxCi9zmriNvOKYAKnPPcHnNQXE8ccZj2hnYncP8A69at9EXEsi9T0I4JUnkisWaFVyOpHvk8+1arVERtfUoSzKEb91GAADgFuvqaybyRip4ADFe3br1rXuIyYZNowSDjv781h3SSZjXkk845/lXDirqLPosDyy1QwDKjJJA6cdKfGGIf04pFhucBhHIPqpwaswQk7hISnDZbGBnHSuKnBt7HozmktyEqSVI45wfSnzBI40Cn52yWbrx7CnwW7uTyCFxjJHNXZrJ3k3KwaNVySPl9yMGuiNOUotpHNKvCElGTM62tJZtuEIBPDHgfUU+5jSMFPMz13hefzqW5upCohiXaq/LlRjAHUVn7pVwzBsdOlZy5Ka5V95pDnm+aWnkJkhRjv2HWkKsRk8eme1OZ+MgYJqPLN1JP+OK5HY6iQMApUMT1+g+lOSQqBgnGOc0yNSMMOo7UPuyCTjPUAcflVKTWorJ6F1J1lwJGwB0+XIxUhWJyRETknjI4I/nWfjbyCceh6VNHIwwc4/z3rqhWvpI55UusS4GkUgED5cBgBj8alWZMsGUYPBB5B+oqNJon2ryGPUjoP/rU54cfMT8vUhev1FdSel0csktpCS2qnLwZ9Smc/wDfJqoAT04IP0INX4pM4GMAD8/xqz/Z4vMyJhdmPMP94novuafs+bVGbrey0nt3NvwnIHnMsn+uA8pR03oSN7g+1emlVwoznKrnjkjFeQwNLbzxtGPLaBhsXpgL1B+vevWLWdL2xsr2LgSxBiD1Vx8rKfoaVaLVmcVGScpW9TE1seXCi9Vebeo7cAjArnoosEs4GDkfUius1uFJLdJT8y2/7zHrv+XmuQllw24tgHBAyQBjitqLvE4cQrTJncIGIwTjknnHpWZczjJx8zfoD6mlmuHcFU4Unk9Se1QbeDxkVukYFfDPlmPzHnJqPb+Y/WrO3g/UEfSo2Uc/5NFjVSICO/8AjTSOtTMvQVGRnNS0bxkRMP5cVteGn3S31o3IaEzxj/aTr+dY7CtTw0cavD7xSqf+BDFYvRnW/epNMluFCyyDjAbnoOfTBqi4HLdTkAZ6flWpfpsmlU5BMshz/CeeKzH4HTr1H07YNdHQ8qOjIMEg+xprcZ9/5U/HA5ycnP0pmD16ZB+vSpOqLG4JwB3OfeqF426coOkQ2/j1NaYwgZ26Rozn8BnFY2SxZj1Zix/HmsKuisd+F96Tl2GEUw09utMPSuSpsepT3Kkn3jTKc/3j9abXmvc6wooopAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAe63OmRSoxjdcqOG+7g9e1Yd1p1wYwBcx8uvBcDj0+aukkAJBXGCSG2nvjg1l3dtCoLkYIO8Dt1xjJr3YSfc+PqQW6RRtLG7gwDdQgMcELLz04qfUmnQwwxb5A6KQwbOTnHO3vVRiQQ+4LntnBCggjHFW7l3K2rrIgSMAzbyAwwCfkxWnW5imrNIz57XUD5KlDuOWzkABRwOKpm1nMjbwignHTLYHoBWy0r7g3LKYzt+XPXmqDH5iWKK2Sx+YZx71abIdugxLePa6CPJCn7wUDkdsVxOqI8F66H7o+4QMcE+td0r2YSSRpshQduFJB4yRzgVymqtaTDzgZWYueoXhfesa8eeG56GXzcKu10yhDd3KmNRIdv+0c8fjU1xM3Dbh1Hp83ftVdWscEnzQeOPlP8qcJLQNHthmkIPO91UZzxgAGueM9LXPYcFzcyiOikZmXYjDLBmxn6Z5q/diSOPLsQGDHjgkE9TVmC/hjVIzptv8hDbndyW7ndxiqmta59quYitpAkaxiMxxE7Tz9OtbOUacfeZyfvKtVWjoiiz2/90nJXLY9u1OCpjcHUYGdnXJ9xUEl3Cu6Pytu05OcMOnQkc0RtbsMgDeSNuMgDtk5rBTTdrndytK5YSKGRFDIuclmJAGBTRZQbv40znGCCPqQaBCGGVnDEg5HpjsTUq4jULjcQOCCCB7HNXyp7oy5pL4WVZLSRARCyv64GGqsY548mRXXj+IVoP5u4MrqvU4HTj0qMTvyH+fJ5ycgfhWMqUX5G0aklvqURj259af5ZxuJ+XpVhlhbOAFOcqcfJz61E6yx4EnAzkEcqT6gisXT5dzdT5tiNXxwM/wBfxq7BOR8rkkNx/k1U6nAwSeoqdYSrIG6nJyRlfwFXS5k9DOrytWZpJZtLmVQQgAJI6fgP51egk8rC4IOAF/2Se5AqlaXDxlA2dmR6HPvitZIfNBkgAJ6kjgfrXqU7Wuj57Fynzcs9uhMbEXKxyxA+YB7fva7TwvOv2WWwf7wzLGp4II+8MVy9tc29qhj487GWP45wAalgvnhu7S8tj9yYfacHO5CR/k0qkedNHNSqezkpHUPMJ2ubc/efzIiMcDIwM157N5u/D53I7IfTIODXfzqtvqDFD8k2yRcejjcK5LW4Fh1G/QDh5BMvH8MgD8VFG17Iutfd9HYo4ACsPp/kUOuATz3wO1CHj6j9aeRkYHXoa6TkK5XGM88Z47VG3WpX4b2HFRORnOee1BaIj1zg8DPpUbYx1qXqpPrgVEw45qWdELXI2IGc1oeHnC6kh/2SBzWW4br2q/oHy6nb577+v0rC95HoSglRdma+qAm4Zl6evPUVlSY556AZ/n1rY1XPmsoBy3PA6betY0hGeg6jOP5CuhbHkL4iMgDI7Y6D+lMA6cc/0p/HQnk9PX2yacg5GP73HHAA5oNr2RBfN5dpJ/elYJ+HWsft+taWqtj7NF6BnPvms0CuSq7yPXwcbUk+4w0xuhqRqjboa5Kmx6NMqN1ptKetJXnHUFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFAHu7nB++O3BA79xUeqRnyXZT/rTEOmcexBq1JZOTncmAy8bhk/rRcWs0kJRl4XnjqDjaDXsqSuj5RwbTVjlpEl2jcxHIJxwMDiqt2skrbwSQjHYM8D1OM1ttbTJtEitgEfeGf51E0KRq7MAADx755GK6lJHE4sxllnY+WrMq8DIOOvY96R/IjOWDO+MFV9QO5p90sgfauVDHL44JOM9RRCsDfLJw2cbuTz61ZBmX165jMYjjVWO3Azxn6Gs0x+YDnupHToK0L22aS42qeByCP6CkitCcKXA3AgblIz+NQ4uT12PQpVoUqatuc2UCs6nBwSOPanIdro3HBB9uOcVYubeRLqQKob5sgj7pzTHwMhoip+nA964FDlbPe9opxTXVEz3QZW45bnjt2rPLBpcnk9vrVn92yZ5HzdMcL9ajtDHBdl5gCgUnON3B7gGpqXk0mEEqcW4oqvlWO5GBPOGGD+tIrsOBgcc55zV7ULq3mZUiBYKT8xGMk+grP69SAPYVyVEoyai7nRSk5wUpKxL5pGc5PHODQty44BIAOQKj2qeN/5ig7Bg8Gp55LqXyplxZ96jdksTwc459sU8h1Gd2CP4e9UA+MYX6HmrKTcqXG70BJx+nNdMK19JGMqdtYkqs7sBjDcjOOD6cVaRBwsm1gMDaDkHPWlhmWUBBGo69McH145qVUcjKHgE5+XH6muyMfmcc520eg1bFSS0JVT2if3/ALppiqyMySg7wfulen0NW442VkG/nnjPfrmtBESVVSWMuo43htpjJ7hjWypq2mh58sW4Oz1RlJEOx56k47elXLbUfsPDY2nPykn/AL6pL6EWalkkWWP+EDh8epH/ANesOSR5GJY89gOQPoaicvZ6Lc1p01iVeWxvXErSMLhD97BIznaPc1q6S4ypODuwO/U+tc7pVwiSeTNzG+cZPc8da34la1mQD7hG6M46g1tB8yuediIeyfI+nU7nUF2R6bKP+eEWPcDgiud8Sx/6TaTf89rUBuecxkrXWXERn0qwI4dbdHH5AkVzWvpuh05/Tz4/w4auei9V8zTERsn8jlwxI6njOPwpVkIPHPf0NN24Zhnox49aUAHjoQM/ma7ThGOzNuY8n06UgTcM4x0//VTiOeM85/HmpEx93160DvbYiZQqhenfkVEwOB6VZkXk9OMr+Aqu/T0NBUWVnGMgfjVvR+dStfox+nFVm6/Wp9Gz/atvgnjdxWEtz0Iu9OXob2rY8yQ4wScD3B5Nc+5IYkYJHrzz610Or/8AHxKuM/McZ6AkA1z74JJ5wCfxHStI/CcEfiYwY+pJyfbFWYlJI7Fjt9etQLjIz3P554q5bjDFiOVXd0+6ADVIc2YWqPuu3HXYAtVAKkuX33Nw3q5/Tio+grgk7ybPoqUeWnFeQxqifofpUrVDL90/SsK2x009yqaSlPWkrzjqCiiigAooooAKKKKACiiigAooooAKKKKACiiigD2iS3vhIwXzSDtwct16cU9f7STav7zHAIZWOeevGDWs07zfIjkMDuG5iuagD3m9S7hRuxknO7ivb5m9z5L2aWzYkR1B0WMry+QSynvx0as2/SRZ1gblgRjaAAB74rYeeVigWQhRxnnn1OR+lQ3a7ZoyQT3BJzz1FKMrMc43ic0+GmdSrZRRwRjk9zmq0sscIYhU3AcHGT9ea6KeOOTe3lI+4gbivPHbI5rG1IWEUcm6OFZOi7SzkMeOVJxXTGVzklCxz4uZCzyH7xOQccYq4LtVt3yu1to2nkgepHNMzZ/8tGkI6DCYz9KgujDEqlNxUgHDLjHfHJrToO3NJJIzpLiOWZw3l9sk8HPrUgW1+YhgzcEY6c9jmsmY2ombEpVSeRtJIPXtVlHsSVH2gjp95GH6iuONW7adj3J4dKK5br5FuRImQF0UgnkYwRVOaySSNpgSgHycnjHXvVwKsuAs6EeoIIx71KFZ0eFfLMbYU57+4zWkoKe6MI1XSWj/AOGMBLCZz+7YH68fkabLbXEeAyH2I5H6Vqm11CNSBG42ybTjlRz0FEyyRuN+5CB3Hf0xXG8NG21j0Y4puVk0zD2MSevFPERbbjg45z7d60y1tgmSIsScfNhT9RimG2jYboXwWPCSdfpuFY/VrbO5v7ddVYolCSMA/Qd6eqEc8egzUrRXCH5om92UZUD6ikIydq/MOlCppPUrnvsCHBBHWtGC55TIB6cN/npVFVQ8YII/GpVV1JwgIzjJOcV1U7xOWrGM9GbCMjqAF6knIGTx6UrzC3B3t8ucEN0Y+lZv2kQqCoLEdT90A9qEk+1vulIJAOFGcrnuK6farZbnlvBu95fCTtP57fdwpJHJ+YD8e1VZrTbl4hgDll6jHqKtCIrycAevHOO1TqV4yAR0Pr+FLk5/iNHWVK3s9jKUDhgOc9e3FdXYytqVisf/AC9QOi7fUngH8RXPzwiM70UbWPPsT6VpeHJhbapbzMcW4IS4yeBuOEJ+h5qY3g7DxChXpc3Y9Zj4gs4iOFgROemQAK5fxEjILdCDjznK49CgrpplKeUByDECPxrB8TqzQafIvI3SK59MgYrKi/fRhiF7j8jjJcbnwR1BFIpCk9sgdf6U6QfP7NgflTNpOf8AewK9A8wUYY5xkjpinhfmP+zzwM4xSRgZxng9fb8KnUcOehOFyaBEDc7vXvVZw2BV2Qcccd2A9aqydD2oHF6lQ9c+g/WrGhrnVYz6A/zFQScDFXPD651HOOmAPzrGW6PRj/CkzZ1tv374OMBCT9Rz+Nc8xHOfw/Oug1vb9ofH8Ocj1z6g1zzD5uvU/lWkfhRxr4mPjBO3pkEY/MVd/wBXDcuf4VK+vXk1XiUbjn/Zx9fWpL5zFp1weByU/LjrTeiuJLnmonL53M7HuxP5mlPSmqOKcf5dq84+nIyahlPympj3qvN0H1rnrPQ6KaIKSiiuE3CiiigAooooAKKKKACiiigAooooAKKKKACiiigD3XzGSVMgbNygEkHHrjPNS3LMqNwATKByATtC5NV5G/eZUYwR1GQOPpU1wxOAQPvE56Z9MV7T3R8mnowSU/eG7jBxtz1GOlLLNvEeY9wB2kg/Mu3kY+tMTBjJycMQ3twcdadHGRuHTB3e/uKLId3axlvJIPNwWUZJ2gjk9hWJfpGxVOjH5mHrjrWy6O3mu+Fj8w5Pcr64rB1Jh9oCx5VVG4Hoze5rpgccrshYRRoASAR2fPBxnPFZt07TI/IwFIHPX3q2Iw4Ifd0yCeuPxqGSB4ELlVaLOM9N3tg1ctjSi1GSfU5yWDIEgZd2eVOcgdM1KttM20sOB3//AFUt0drsRE2CcA9sDmp9PmUkhvlGec9ea8uMIOfKz6WdScafMiQWyCLbtG4jLH1pjW88CLKjuik5GCQM59q02aFGSQgMqMPlzw+OucVHcXDXB2iNVhJyVHCJ7812unFHmwxFST206iW2r3BlQPJlQyttZQC5UdN1Go6xYXWxTEytwGZcHJ69apNp7sTJBKAAd+D1IHXb3qtcRuoj3bckd+TwfasZTqRi7m1Ohh5zUo/hoXI9knKK7JnHzgHGf1qbyYNqqGC9/ccdD9ayVleM/K5H+6TmrMd0PlDDn1yefc0QqxejNalGe8Waax3aq5EhZAoAUA8KagktYCGYjy3P90cn6qKRLqU7QknAJ4/wpkjuSwU4bPoTn2JHFbOUWjkhTqKWrt6EMkTxB8YYDGGHb8KiM2ASwJUHPXj6VcQPtBJBBJJAIP41XmhjkJ8n5SvOw/dcnuDWMk0rxOyE1e0inK5mbcVIH8Iz/OnxSNGQRx2IHcUuEQssiOGA555B9aUCA4wXHXk4IrmjF8176nU2mrW0NS1kiuF2MMP+hxzkVJtaNmHT1+nrWVG3lMjpJkgnHUYx61sREXUBddodOSOcn6V6FOXMrPc8bEU3Sd18LHEBlIAyrDjPXJ4wactq9qBbuuJCRJIe/PIU/SptMVBKsswBXd+6ViRulHRvoK0bm3MsQlAZpY2JfI5K9TnNa7u5585ON4J6HeW8z3OiaVdnmT7PGkhPXKfL/Ss7Vf8ASNOuAB80MYkx6EHdVrQnE2htCP8AlmgkUc9KpWr/AGhblSSVlR1A9sFa4oq0n5M66kuaMfNHFyAZyfqe9MjJ3eo57frUsybVIz9xiD+BxURG3ac9eMda9A8weuN7fX/OatAAY4BGM5PX8KqxdWOPXHuKtg5IwMg8cfTHegBpUEkgHAyRn8u9U5VB6cYP6etX5NqgAk8HHPv1qq+0A9Ow9aAMyU8kH6Vp+G133kjdg6D8uazLg/ePAPNbPhUZklJ7SDP4CsZbnoL+DfzRY1lgby5wMD7v4dhWIwwceuBWpqkm+6uCOm4jrn8f51kyE5HruJrRbHJHWTLtqu4g4z8pwMehzUGu/u7KGI/edgSPxq3YgFY+CcOwx77DWd4kkJlt4sjjJOPpioqO0Wa4WPNWiYSjrStQOhpGrjPoiM96rzdqsGqsp+auSuzpp7EVFFFcZsFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFAHvk95YhgHiwTgEhvXoBxTXu7BgPkJZQCv7xemOtOm06JskSJtxyQOeO9MFlaop/fIAeu1BzjmvZ90+VfPfWw+GSxeJsblwSOoYk9aRy2xgFwCvLegA6VPbQ2aAg7mOeuAPpik1AOY5PL4JP44bFTfWxfK+W7MG9YERRjuSWwc8dRXN3Z/0iQEcrgZ/wAK6aaJGEbZ+YKwbBA5NYc1q8k83lupAI+9kdB6iuyB589yqjbueB0UAj+QouGjkjEBzgHLEYwSOhPWp/syggSXVvGw5VTk8e9VpYYYXkIukdc5yCcEkZ54rQhd0YlxAmWBYDnAye/tUFrNBFMY2Td833mwcH6elX5QkoP72EMPugt29MYqtDZ+W/mzmJg+fLwykgqe9csovmTie7TqxdJqoX1ii2gtkb88rwAPTB4p4htmSQR3Cltw+RwckD36VVuFuBtGcKQCB32nn6VGjFGJw3v1wfyrZySdrHHGlKUebmLVtaXMkxaNGOwFvlIZfl7/AC1kXpJuP3i4XA+6Mda0bW5mikTauAzMSAaJnF0x+aPzQdqqy8ce9ZTipxsjopylSq3mtLGWY1w0ixO0agAHdg5qElwRmIAdR159ua0bqUYMagRPwGZRkN6ms4tcJjcdy+o5BrkqJRZ6dGTmrsA+TyNvbC8ce9X4LiDbsf0BxnGPYVQYrtzgYJ67uQfpTQcDIJ/l+dTGpyMudJVFbY0pcS/NDuKdCBkYJ9RSIyjAIPOM8eveqkUzIQCTsJGRntWgDuJ6FO5xk/X0rojJT1Ryyi6a5egFY5FKSDK44PRkPqDVKW3aHqcox+VxjH0Iq8Cg2k8nnjoBj196cdrAhguG4OTxVuKkZKpKD02MzbgHHPH8OPzq3p7vHKkkpYW4IEmDy4z91c96R7JkPmYPlZ+73H+97U/JbCEDGOACOB0xxURi4u7NZyjUg0tUzpbiIbo51CrHIoaIRfdUHsB+ta1sfNRCSCCAknopHJrG0Wb7TbzWLYMkS77fP8Sg9Pw/r7Vo2TBJpI2bgr0PADDnP1rqvdHz84OnPlZ0mgZi+12ZOMxOFHfaeQf1xVXTmVLsJnq5TA7ZJFT6Xk3kE+CA8bwt14IBYc1UjHl6ngcD7QenUjd0rDrI3v7sfJnN6ghjuL2LIws8o57fNkVWxkJkDp0PXFaWsKq6jqA/6eGIH1ANZbttBb/ZOO2M11x2OSS1aHxMCCCRnJxVlWyoYjn1+lZ8JyB3J6D61pR5VRkfKfx9qBNWY5lDbTwTx09O9UrhQoIBA5P0q62MZ5G3oO5rOuFJ3MT14H0oQluZszcEnoP510fhP/USy453M/19K5O9kCgRg/M3J9hXXeGAV052H8MTvXNe8mj1qseWhHzZQv5C1xc+plc/hWeSWI/zirF23zs397Ofqe9QJhm+n9a6PI4YKyubOmhdsXHAacnHXIQCud15998QP4VP866bTQBFKfR9o9cMDn+Vcjqb776c+hArGs9DpwCvVv5MrDgd/ekalHNNbnFcx7Yxu9U5DljVtqpseT9a4a71OunsNooormNAooooAKKKKACiiigAooooAKKKKACiiigAooooA+gfl3HD/wAPA6A/nSi2XIIfgqx5/wA9KjkThgDkDHzDv7etTrHiBV3EDa/OOMV6z0PmYq+6EQL/ACCj1waW8Tfbb4zhsbGGezHrUYOCnQjH5cUSjzYmjLYUgkY6jPIIo63HfRo566LwKrFc4J3BMHJ9Pr61zctzJLJJjcF3n5ATt698V0N5GcMhwMNu55Nc2QFLt0yx69c5P3a7obHmS3JUjV8FxtVT97u3tTL7y4xsxuBC7STg598VH5kuSNu1euWJJOO/NQSK75Zj07nNWOK97UhCsSAigdew6fWs/UBgBwPu8cj8a1Cw2kKnIGM81n3XmyjbxsXg8cfXNc9ZXg0j1cJJ+0uyrb3cr7RluBtIDHnPfirW+6jBcsroMYV8ZPtu4NZ0TiCYbUzgkE+pq3NK7xgFCWwD9fpiuSlUfLq9UelUprmSS0ZatLiOSQif90MEhl+ZfXB705PLDTNEyuu4tleTn+dUY3j8vZj5iCcP0yfcVCzSwyKwzG2MEKeCD6jpWjq8qVzL6upSfLoXpYpJPnXk9GUD5gD3FQLmMkFScDlenNH26UGPkgjg7eN3vU5MN0AqsFkAyCRg0c0ZP3XqO04L3loVjALjLINj56fwn61C0UsbEOuD27gj1Bq55M8f35AijJU5HzY7Coy5kAjf5g3TB5HuDWcqSevU2hVfR3RXwQASp9RxwRUscsoOAeAMkdOOlNkimhwN5MbdCOQfY1FgH2Pr3rO7i7GllJXNNC8oPloRtI8xTgceuatRxKhyxDdM7cHGemKyoZ2j46/oCPStSJ0ceZEccYYEdM9Qa7aTUvU8zEqUdFsW40BB3EYIIwRwV7A5qlNCsLnA/dMcA+55xnrV5HYqwBDZAbBGeO/NOlRXjAYA5AHqc/QV0SjzI8ulVdKWuxStLlrS5t504aOQdzlkPDA/hXR3uBeQSQ/6hysyMDw+7GTxXJyAq7xnlwcE4x8vbFdPZyC40iHdgyWhaLvu2k8VlB62OnGQvFTR2mkplWfjCKz8dOB1rN+b+0N3rIpHGa0PDTma0lkP/PLZ+P3azFJ+3L6rJjHuDWS+KRlL4IMx9e2/2lqOOodev+4tYLyAq4zzxzWtrsoOpaoev73aPqFANYYORgDJZwPw9K6VpFGUY3k35l23woi9TxWkm3ZFjJwCD9fpWfIgR4cHhow3HqauLlYyoOGbA68471ZzvuL94kAjOep7VSvJY4IpWYj5e/rV9gI0xj5yp3Hrhetclqd2bibyVP7uNstjoW9PwrKrUVONzpwuHdeoo9OpTeRpWeQ9WJP/ANau80ceXo0xHaDj0zxXA/1r0OxUR6I5IPKoCPXkCuahfW/kenmNlGKXmYFwcljxgkHjsaihOC/ryBTpm+8PVjTIx8w/M12Pc86P8NnQwL5dizHvvIPQ9AoP6muJvDuurg/7ddvMVXTlYf3UAx0IPzGuFmOZ5z/tmsK+y9Tqy1e9J+Qg6U096XJxTTiuc9dDH6GqZqzMcL+lVa8+q7s7I7BRRRWJQUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAfQz286htvGMckE9vSnJFc7eoPy4wFIA+marzT3SsQzyHIAU5PJpFuLn5fmfGMcsa9WzsfNc0UyQwzBhvQk7eqgjp16U8ou1iQQNuPekha7Jkw5Y45BJJ6+hqSVHRfnY7tu7njFK+pSStdGPcpBiR3GQvJHcY7Vx8oLu7nHLEKCOAM9hXVX8uYxtyynO4gE7SM5Fc2AzZZUb23g5z14xXdT2PMqvXQrlS4KgBiO57cU+K2I3+YwK4wBwee3HWplimZQI4zznkKB9SamSCbp5bHIGCuD+grS5kUkhsP9IaYN8q4XauMsTjpWfc2YK74zmNjjscf7wHNdBcWsxhkYQkKVAJIGcDkEGspEZGG4gLnvznHYiiykawqSpu6ZzVzZSpMMbTnJOOuMelHKKiyEq28YyDwOoOa2L6GTLnBAJAzg4Hfg1QbMqEJtJiZSwYgFlPHGa45UlFvlPdo4h1IJyKqRoZWO9SgBJA6n6CkliLbZFBx3B+8BnirSWqO2WwGBBBUYB9qtOqnComCAofPOTnBINJUrrUuWIUZKxiyrEwIAwVx35zUaEqep9QR2+pq5cWrxO6MrZPKE46VSEZGQc+npXHVjKMr2O6nOMo6M0o5BdqIpTgoo2sODxTmt5Y1UA4Vifm43EegqlBiNlJ7dBng/XNaMM8buVuCqjgDbyRxx1rsptTXvbnFVUqbvDbt/kIiKqkbcqwwwPzZqvLaCMeYCTF/6DnsTWtJbGNUdWjKuCUYMCWC9cjtUQlAOGQEHg7xkY+lbOmnozkjiJX5oGSVGBg9ORu4OPpUsM5hZMk8ckYxnNS3VsIi1xGDJAxOd3WNj/eHp6VTZ3fHT2IAHFc7vBndFxrR8jdEqbFaHIUkc+/QjIqcEDbtxuOASe3uaxLO7AfyCeJMDceit2IFa0QkBKkdDg89SO1ddOopq6PFxOH9k7MgvYcMHXkZ5I9DWroD7or+LPQbgD9MVVmjEkZyORwfbPtUvhzLXksPOZInBA9VokrSuOMvaYdx7Honh0CPTYieDKz49lBrIVT/asqccTMvXnBbNblvi3jtoVHCRAdO+SSaxrgCHUb6UjhQ03rjbFnNc8NZSfcKmkIrscbqczSXd8+Rh7mU8+zEVn2wkkuFGOFGeO57Zp9w/yuxHJ3En3NP0tCAZOocnP+6OK6N5JDjaFCUu+hfZcyJkZCqOv/1qvW65/eMOgPvyOMCqq+XkyMWwc4HHJqDUtUWwtuCpmkGI0Xt7mrnJRV3scNOEqklGK1ZW1vU1gU20JHnSZLkfw9s1zSA456k5JPemBpJpHmkO53OSTVhVP4d68vndaXN06H1NGhHDU+VbvcQD5kHqyj9a9GC7NF56kxAY9eTXnqLmaAesiD9a9GvBs0i1GeDJuJ9AFrqo7nmZg/hXkzlZ8c8UyMZaMf3iM06XLH86dbrukRevzDp6V19TgTtA2rwhdNtx0yufwOcVwrnMkp9Xb+ddvqx228a9MQoAOwwPeuGHJb3JP61yV38KPRy1aTfoOpDS+lIeprF7HpxK8x6VXqaU5JqGvNm7s7FsFFFFQMKKKKACiiigAooooAKKKKACiiigAooooAKKKKAPo11tiSSPu8/pimR/ZyeEztOOnrx0odgGxtzx/nrSRFAz7fvFSvI9D7V6Z89fUkEux2EagYOCQMc96ScPLDIXfgp29RUbffORyemenI9qnVEljkQkgkHb2AOOtLbUerujn5yI1ePcARk+5PU9OKwmmiRcsGI5woIPOc9DWtq5MW4qVztYHBJxweWrlvmYj5gT2xx14yBXoU1dXPJqv3rFqW/lfYsKKi9egJ9s02SW8IB8wAqA2QoUlc5xRD5ce4ylQrLty5+6fbAqteTkBUjcOuPvjPT0rTQzV2OkvdQ4IlOwrgDHT3rOkvbmGZTgNjPUcY+lbEEBeNDgFWRWGexIxWZfW5ifLdOhz69aUttDei481pq4supRXEXlzRbQQWyn94e1Zcf2eR5Nh3Enjkg8DOAKfcDNvIwB6Y985rJ+7g5O4fMMcEce1ctWo4tXR6+GoRcXyOxvCIbBlhuYEsB1XA9arAupZ03sBnIJ4H4VSt72RSnnZycgMTgkH+8KuROgMwHAkwQw7/SnGpGduUPYzp35tSQSrNgSRjYGGSM5X0YVUu4GEhYJuTjLDlj7kVMsjpKVI4I4JxgkVcllDbDs2bV/Q81TSnHUjmdGa5VozA2qWJycZ+XP6ZpxR+HwcEcEVoTW8cql0Cq/TJOAT71SO5FeJxtZcHnIzXJKny7nowre02LVtcspCvnIHyk9/Y5q3v4yykg5x22n61j+Y2OSCR0J5I/GrUF85HlFlA6YI4z2yeta06y2bOethm3zRRoq+wBvlKEbXQjKsvcEVm3cMKt51uCbc43Ic7oz6E+lTKCGJyTkjIJ6VMhOWygKdCG7r3BFaS99WZlCPsXzLUxwMnggV0dtPJcWkdwDmWIi3n9dwXKP+I/lWPc2/kZaJf3Mh4yMlT125NWtGkX7TJayNhLyIxKc8LKvzxt+fH41jRvSnZmmKSr0eePTX/M2EOUYHqw6D88Vb8MRAa8OwEUsnPcleBWfCWBCkfNuK/0wK3tEgEOs6YmPndJvNA9duQCfau6prG54lKTjLl7nVO+yaJDkYGDj6ZrK1xxD/azj70kUEf08wKtX5mP2pjx97C5znrWJ4rk2TrCCMuIpG9wkeBn8Sa56a95GtR+6/U4u+bEbAAcjArQtIgIo4uM7F3Eg+mazLzLyW8YP35FGK3IysEFxP3VNqj0JGK3j8TYqulKEV11Kt1dx24kJxtjB/EjiuQubiW7maWQkknAH90dgKtandNNIY88A7nx3JqlEuTmvLxVZ1Jci2R7mBwqoR53uyeNcACrYHr6cVAg5FWew46jr0rSlG0TapK7C3G68tFxz5qV6Hq4KaXZL6M2fToBXBaagfU7Jev70E/gM132uE/YrQdyXPrxgGuqlv8zxse/et5fqchISGfHr/Op7JQZl9dy49KqsfmY/WtLSl3XMC+654B5NdPU45K0C14gO1WGeEQKTx1Arh17V2XiNj5UxOMjd09CCBXGiuKt8SPUy/wDhyfmP9fpUZ4qTt9f6VE/CtWNR2R6UNWVXPX3NMpz02vNZ1hRRRSAKKKKACiiigAooooAKKKKACiiigAooooAKKKKAPouUZ6+mT+nTNRDC4yeoI4/LgDmrhiByN44PHB/rUXlDOC+CD6YwfrXpJnz7iyNhwOM9WyMfTrUsPYc5JJHUgDHc08xxZX94ctkD60qoFLfOOOODkenelcpRaZyusoS0wIbo5GO+fY1zmxIV3yfM+PlA5zxjjPpXYatsw7cjarDPY5HSuQZGnO/qF4GOw9CK9Ck7xPIrK02VXMjMN+3P8IH3Qppu0KSFAfPX0+tWzBnJPQ9+g4oSykbkDoPqDxnrW1zEt6bLGI3E3GMhSTwPYVSvkWffI3y/OQo4PHXipGguUjjKoSdzZCnP5g1YvAjW0DCPy3GFkPbpjoanqVdmKluDvjPU9Fzwc+/SufuradJZCUOFck49+MEV008hj8pRjbgrk56VkXc0w8xON5UDPrtrGvCMo6npYCrNTdupklDkggg4zg8GnRSukgQ8qccHsDxxSpcsXVXVCY/u5HNOmEDBZI1ZGyQQeR74rz0l8UWe82/hki4PnBQqDtOUfqOB61KkhaONWxuBPPrnsc1Sgkfyxs6ox+XOCw74qxJLEiw4w+/JbHOAe1dkZaXOGpT15bEh3owJAK8g4GcZ9aSaNZVkBCFwuUYdfYGkMjlARjGAVbnJHTDCmPJsk2n7h+Yn+hptolRe/UzSDyvQjqDwaZgqR8vOev8AStSeCO4CuhVHx8h7MPQ/0rPJYErg8HBB65+lcFSnyvU9CnV50XbeUMoz95Rj/eX0/Cp+jZ3HBwOeD6A1lrJ5Tbgv4jgj3rSjkWVV2DPTcuOQfaumnPm06nPVp8rv0J2CsjRt0YEE56HqDWWC8EyNjDwyK3HqpzkVpBhnHJGcDjp2qtdwFyHHG35ZD6Dsauqm1dboyoNRbjLZnTRiMzpdNgRSBZ1GMjewyQPpXRaBF5upQXOP9W0rc9QDGy8/pXM2ri40yyYA7LQGMggjPPUmu48NRjyrubGNsR7Y44Oa6KkvcueJTh++5ez/ACGyDddjk5MuBzkVzXiiXfq9yONsUcEQ9sICa6BpMXAfnO8qo7FjwK5TXGzql+c5+ZQfwRRU01qObumvMxAN97bjsm5/y4FX9ZnW10+JMYaZnc+p28VTtAWvJMdlRAPdjVfxXN/psNqp+W3t4ww/2n+c/wAxU1ans6bkdlKn7XEQg9kv+Cc6SWJJ6k5NWYhgVWHUVcToK8ikry1PoZOyJowM1OcYHXpUaYqRs4WvSWxxssaKP+JnanGcFjj9K7rXuLSzPf5wPpjvXF6CN2qw4/hH8zXY+IWAgsV7mJz+JxW1LoeNjfjfojkW6/57962NEXNyrdduDj0I6VkN1Uew/Wt3QUBlcnspb2yOa26M5p7Io+I3/cSH+83t7Vyijiul8SMdiKepYH6DNc4np7iuWr8fyPWwKtQv5gwIH4VBJ0qd+p+tVpT0rlrOyPSpbldutJSnqaSvPOkKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigD6Ly+xsHO3k88H8ahLSEjPGf72cg1cUR7iD1I55zx64FRvEq42Atycj1xz1r0k0fPuLaEjDHGBkqQc/3QRgnJqYptCnnJ6njrmnlgE4QgPhiM8/Q1EpkkDAsPl+bH/6qW5pZLQwdYRpA0a5y3QY5OeMkVkQWc0aumwk55K5PfvW/qh2HgZY4yfQn0BqjFLKwJUAMRknkY/I4rshJqJ5dWKc9Sh/Z07Hdt2xod0m9dv4DPWmuPLEYQBQWAUD7x7960XltsBJZNzZ5EXP5mq0s9iS2UfCFcZz+lWm2ZOKWwOochiWKAbewyfT5e9USFMjRspMbkbRJyN3qCOakkvbNCE+dDjknI6/pViA216AI2w0LFjgg5AHT1qttyd9jM1TToBEkkXBQ4O7lTu6Y9K529haNBM0R67Q38OcckEV2l9GVhCnOxsdMEADsaxHLKskbrugK7BkAgMehpr3o2NIVHSmmcJJ8srMuQVOVPsav2yJLHK7MMJgtuwSG9RSahbIkysgMYfcDn7vBqqpltiOAyPhiRyCCa8xJ0pvm2PplJVqacHqK2VYt2Bznpg+tSbsQA5JRmPIHKsPQ1JIA0bSL9x8LtA7VEnyI6EfIcEeqn1q+Vp6dR3uia3mxkbg3oW7+1WJYhJh1x82A4OcntWWQYyW52nrj+YqwZXVMoxwCD3z+NVCppaRE6fvKUS5CHT924yOdpP8Q9KS5swyh0ceao5TuwHYn1qNXkl2snOR3yQp9c1bAdioYBSpHJ4x6/jW6UZxszlm5U5cydu5jFQetPgk8lgQflb5Tn0NXby2375YlJdf9cuef94AfrWYUckYyee3QD3rinGVOWiO6nONaBtRu8jBFZS7YAwNv45q00UZgeNSSZAQxwOWHTmqOmkMrR5+dQTu77Rz19q0yFCdSB19CT14r0qXvRuzw8VLkqcsdLEmjFvsV1bsfuynd1zkjjivSNAXGkXLjO5rfBz1zivPtEjzd30bA4kijlHuQ2DXo2mBotFnzwziVV9gF7VlW0gkKFnXlLyv+Bzqyebfoo+5CWwRzlgOW/Piua1V91/ft/02cDp24re0z57iSVhjaMfn3rmb590l3J/ellbP1Y1utGccfet5kejL5t8OODOC3ttGea53V7n7Xqeo3A+69w+3/dU7R/Kui0l/s9rqF53jiuJFJ9cHFceSSST1JyfxrzcXL3IxPewUb1py7WQ5BlhVte1VYxyKtqK56K1PSqbE6e9P5wD6Z4piA/zpz/Kh9c13nIa3hdDJqTORnYu4/rxXT+I2G61B/gjOfxrA8ID/AEq4P+5+nNbHiKQG4CA5KxID68jNb0VseJjHepL5fkc6Qcj6/wAq6PQl/d3LH/nkefrzxXOZIJPqAK6XRgwguz/CEjAI9zmtXsznnfQ57xI2WhHuo+uAawkBz/8AWrZ8Rn/SYlGPlz+ZGayQCAvvXLU+Nns4NWoR+ZG/XpVWTqatSetVHzgmuKv2PSpEFFFFcRuFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQB9DrMgYFWBzxjP49aebghiQ3HQ9gR9ajH3j9D/IVMPvfnXrSikfNRmxplJBJYdBjPTHPWiK4CfN7dDgc9MGnn/Vn/cNJ/CfqKlpbFc7TuUdWNrLDcSeZ5bY3BgN21weCoPFc3vUA5mLKThSOFJxn5hXQan/AMe9x/wD/wBBNc63UfRv/Qq66UfdOCvK87iM8UKht45woII+f6DrTfOhkYIGwAMlmxzkU0/fi/3agX/WP/wKt+U5uYhmaPe4BzyAS3saW1aNLlWR1CqCCQ+3PvSN/wAtKZB/rB9DVW0J5h8t/OpmjLB41JcBvT2xQb+0niMYKo7qQ4AwCO3FV2++3/XMfyqhJ/rV+q/zqWrWN6cee6ZV1WLEJ+ZT5Uo5Xk4PFZ4b92FJAIwOem3r/wDrrTvv9Tcf8A/nWUvRfr/SuSqv3lz3cG70kmPVwpDIQNoAZCflJpPMQqdqqpJORnp70zu9Df8ALP8Az3rJ3SO7lE/d7yCcISckdMetTRyxKjx9QScccMD9agPQ/Q0J0/L+VZKdpWQ3G61Hw3EkDOvZjg+y1P553LlshhkYJJHpVM/eb6f1q3F9yP8Az3qqUm7xuZ1YxXvW3HRzTJOXLHaPvKeSVI9KbcmNT+5RfJl5Awcg9cGnP/rh9V/lSn/j3n/66x1u07NGOialbyIraQ280UuQEztcA9VbgitrcmGyRkN7H5exzWD/AMspP94VtxfdH/XFf5CtKGl0cmOgnaRraPJCl8HY7VFvIg9z14Nd3BdRLawwFkD/AGd5WGcAGRScYrgLD/j6j/65v/IV2Tf8fbf9ekP/AKA1XUgpHmU6jjsYmnzxRQXTllyFdic9cA9B/KuYuiDFJyORk+/Fbq/8el3/ANcD/M1iXP8AqpP90/yrVx3Iou84lV5Fh0G5XPzSCKMepywJrl66HUP+QXH/ANdIv5GuerxsY/fS8j6XAL3JPvJksfJFW1qtF2q0tTQOqrsTLjjmh9rceg5PsKYvT8qcfuyf7ort6HMb/hWaOGSZ3IXc/f0AHrVnVrlZ7y4IIxvCrzwMDHWsvR/9Wf8Afb+lWp/9bN/10P8AOuqlH3EzwsTriJIr5HGf72a6DTbmKHT7vLgM5Q8nptGMVhDqKup/x53H+83/ALLWtjGp0MfV5BLcoR33H19KqOMKORxxU17/AK+H/dP86ik6H61x1PibPbw6tSikVpSOKqy4x9atSdT+NVJu1efXep6VPYhooorkNQooooAKKKKACiiigAooooAKKKKACiiigAooooAKKK6e2/49rX/rhF/6AKAP/9k=	Completed	Medical image uploaded: ORDER-1763397519468.pending	File: ORDER-1763397519468.pending (0.00 MB)	James Administrator	IMG1763397519468I1ORDER.pdf	/home/runner/workspace/uploads/Imaging_Reports/1/patients/1/IMG1763397519468I1ORDER.pdf	/uploads/Image_Prescriptions/1/patients/1/prescription-IMG1763397519468I1ORDER.pdf	{}	2025-11-17 16:39:52.262	2025-11-17 16:39:52.262	t	t	t	t	data:image/png;base64,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	2025-11-17 16:38:57.107	2025-11-17 16:38:40.1	2025-11-17 16:41:09.315
5	1	3	1	IMG1763403063553I3ORDER	X-ray (Radiography)	X-Ray	Chest X-Ray (PA / Lateral)		routine	ORDER-1763403063553.pending	0	application/pending	\N	ordered	\N	\N	\N	\N	\N	\N	{}	\N	\N	t	f	f	f	\N	\N	2025-11-17 18:11:03.911	2025-11-17 18:11:03.911
1	1	1	1	IMG1763372479194I1ORDER	X-ray (Radiography)	X-Ray	Chest X-Ray (PA / Lateral)	NO	routine	ORDER-1763372479194.pending	29677	image/jpeg	data:image/jpeg;base64,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	Completed	Medical image uploaded: ORDER-1763372479194.pending	File: ORDER-1763372479194.pending (0.00 MB)	James Administrator	IMG1763372479194I1ORDER.pdf	/home/runner/workspace/uploads/Imaging_Reports/1/patients/1/IMG1763372479194I1ORDER.pdf	/uploads/Image_Prescriptions/1/patients/1/prescription-IMG1763372479194I1ORDER.pdf	{}	2025-11-17 10:38:28.818	2025-11-17 10:38:28.818	t	t	t	t	data:image/png;base64,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	2025-11-17 09:42:20.894	2025-11-17 09:41:19.834	2025-11-17 10:52:59.095
3	1	1	1	IMG1763379687215I1ORDER	CT (Computed Tomography)	X-Ray	Abdomen X-Ray		routine	ORDER-1763379687215.pending	29126	image/jpeg	data:image/jpeg;base64,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W9lJPOVXkuQF4GZD1x3qVPWwcrUeYwrGIySCQKAUUq+ccjt171oPbSFDIAAQvBJwD9avWenoiZYnc/ODgEKvbGKdL5MKybwqrGDJgj8OlPm10J5Xa7MiC0UfOzYLsScA7j/u1Jc3UGnRlVCrK44UkEqvYsazLvWzFvjtMGQ5DSnnaf8AZFc5dXUhLSSuWduSWOSTUTqKO52YfByqavQsX2pKC5QlpCSXmfkn2UVgySPKxZiST6nNI7tIcnp2FNwa8etXdV+R9HQw8KMbREooornOgKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigDsIb+8X7spIOR84Bx+da9rqc5UBkhY7gCcsDjjg4rlrW9gXaJU3DnPOK6CyvNEBZpYZgsYySGBJ9Bwa+hhNSW58riaEoPSNi7dajeKYwIlXBOG3NzjOKQ6nfkYXYAOc7eMEe5qOa90G4TG+WN40DJkZBBOCDg1FLe6OsQWOckggFeASBznJq/dOPkn2ZcTV54gZJHVgANoAwS1TR61pl1KGktpg5YFirLjdjGfWuSvb1ZfMkU7UXhEByo/wDr0lhdRqDKZACvuOSe1Z80XKx2fVZqlzvfsd3earZQCN4opWLAbPMO0Yz1zXMavqV3deczNsQryiEjIHqe9UbnVYWVB8zMmcBTlRn0zWPc3lxIrAfKrAj1P51E6kKa8zXD4SrUkpSVkEtyqAAfe9BVB2eVssTSqhPJqQJ7V5U5yqH0MYKBGENKU4qbbQR6VPJYq5VYYptSyCoqyehQUUUUgCiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigDefTiDhPl9mNNW21CIOEG5SMHaQwP4VqbmGMds8HHNU7i8VWIHO3jjH49K96VOEddj56liK1R8tkyipvvmj2nB4+6MjH0pRZStktkfzOfenxXpEuXACk8cDgj1rWhmjmTnacEdDjI61lTpwqbu50169Whqo6Een6I94JEGB+7cqGzt4HtWdJYtbF0OAVYjkZ6fSt2znmjmyrlRtcAr78cA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	Completed	Medical image uploaded: ORDER-1763379687215.pending	File: ORDER-1763379687215.pending (0.00 MB)	James Administrator	IMG1763379687215I1ORDER.pdf	/home/runner/workspace/uploads/Imaging_Reports/1/patients/1/IMG1763379687215I1ORDER.pdf	/uploads/Image_Prescriptions/1/patients/1/prescription-IMG1763379687215I1ORDER.pdf	{}	2025-11-17 11:46:41.596	2025-11-17 11:46:41.596	t	t	t	f	data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAcIAAADICAYAAAB79OGXAAAAAXNSR0IArs4c6QAADQVJREFUeF7t3Vuo9ekcB/DvGGbkgkLkMCQ5JJHDpEQOSS7EXEnCBZFRLoiaUJI0FyREGcqF0lw63DHEjUNyPjQMUozTKKcwkob96L+02u137/0+797v+q/f77Pqbd79rv+z1vP7/J7Z3/5r/Q9XxIMAAQIECDQWuKJx7UonQIAAAQIRhBYBAQIECLQWEISt2694AgQIEBCE1gABAgQItBYQhK3br3gCBAgQEITWAAECBAi0FhCErduveAIECBAQhNYAAQIECLQWEISt2694AgQIEBCE1gABAgQItBYQhK3br3gCBAgQEITWAAECBAi0FhCErduveAIECBAQhNYAAQIECLQWEISt2694AgQIEBCE1gABAgQItBYQhK3br3gCBAgQEITWAAECBAi0FhCErduveAIECBAQhNYAAQIECLQWEISt2694AgQIEBCE1gABAgQItBYQhK3br3gCBAgQEITWAAECBAi0FhCErduveAIECBAQhNYAAQIECLQWEISt2694AgQIEBCE1gABAgQItBYQhK3br3gCBAgQEITWAAECBAi0FhCErduveAIECBAQhNYAAQIECLQWEISt2694AgQIEBCE1gABAgQItBYQhK3br3gCBAgQEITWAAECBAi0FhCErduveAIECBAQhNYAAQIECLQWEISt2694AgQIEBCE1gABAgQItBYQhK3br3gCBAgQEITWAAECBAi0FhCErduveAIECBAQhNYAAQIECLQWEISt2694AgQIEBCE1gABAgQItBYQhK3br3gCBAgQEITWAAECBAi0FhCErduveAIECBAQhNYAAQIECLQWEISt2694AgQIEBCE1gABAgQItBYQhK3br3gCBAgQEITWAAECBAi0FhCErduveAIECBAQhNYAAQIECLQWEISt2694AgQIEBCE1gABAgQItBYQhK3br3gCBAgQEITWAAECBAi0FhCErduveAIECBAQhNYAAQIECLQWEISt2694AgQIEBCE1gABAgQItBYQhK3br3gCBAgQEITWAAECBAi0FhCErduveAIECBAQhNYAAQIECLQWEISt2694AgQIEBCE1gABAgQItBYQhK3br3gCBAgQEITWAAECBAi0FhCErduveAIECBAQ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	2025-11-17 11:41:43.691	2025-11-17 11:41:27.044	2025-11-17 11:47:02.744
2	1	1	1	IMG1763375883205I1ORDER	X-ray (Radiography)	X-Ray	Chest X-Ray (PA / Lateral)		routine	ORDER-1763375883205.pending	29126	image/jpeg	data:image/jpeg;base64,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W9lJPOVXkuQF4GZD1x3qVPWwcrUeYwrGIySCQKAUUq+ccjt171oPbSFDIAAQvBJwD9avWenoiZYnc/ODgEKvbGKdL5MKybwqrGDJgj8OlPm10J5Xa7MiC0UfOzYLsScA7j/u1Jc3UGnRlVCrK44UkEqvYsazLvWzFvjtMGQ5DSnnaf8AZFc5dXUhLSSuWduSWOSTUTqKO52YfByqavQsX2pKC5QlpCSXmfkn2UVgySPKxZiST6nNI7tIcnp2FNwa8etXdV+R9HQw8KMbREooornOgKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigDsIb+8X7spIOR84Bx+da9rqc5UBkhY7gCcsDjjg4rlrW9gXaJU3DnPOK6CyvNEBZpYZgsYySGBJ9Bwa+hhNSW58riaEoPSNi7dajeKYwIlXBOG3NzjOKQ6nfkYXYAOc7eMEe5qOa90G4TG+WN40DJkZBBOCDg1FLe6OsQWOckggFeASBznJq/dOPkn2ZcTV54gZJHVgANoAwS1TR61pl1KGktpg5YFirLjdjGfWuSvb1ZfMkU7UXhEByo/wDr0lhdRqDKZACvuOSe1Z80XKx2fVZqlzvfsd3earZQCN4opWLAbPMO0Yz1zXMavqV3deczNsQryiEjIHqe9UbnVYWVB8zMmcBTlRn0zWPc3lxIrAfKrAj1P51E6kKa8zXD4SrUkpSVkEtyqAAfe9BVB2eVssTSqhPJqQJ7V5U5yqH0MYKBGENKU4qbbQR6VPJYq5VYYptSyCoqyehQUUUUgCiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigDefTiDhPl9mNNW21CIOEG5SMHaQwP4VqbmGMds8HHNU7i8VWIHO3jjH49K96VOEddj56liK1R8tkyipvvmj2nB4+6MjH0pRZStktkfzOfenxXpEuXACk8cDgj1rWhmjmTnacEdDjI61lTpwqbu50169Whqo6Een6I94JEGB+7cqGzt4HtWdJYtbF0OAVYjkZ6fSt2znmjmyrlRtcAr78cA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	Completed	Medical image uploaded: ORDER-1763375883205.pending	File: ORDER-1763375883205.pending (0.00 MB)	James Administrator	IMG1763375883205I1ORDER.pdf	/home/runner/workspace/uploads/Imaging_Reports/1/patients/1/IMG1763375883205I1ORDER.pdf	/uploads/Image_Prescriptions/1/patients/1/prescription-IMG1763375883205I1ORDER.pdf	{}	2025-11-17 11:33:42.315	2025-11-17 11:33:42.315	t	t	t	t	data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAcIAAADICAYAAAB79OGXAAAAAXNSR0IArs4c6QAAFYRJREFUeF7tnQvUdmk5x/+djVNMiRBFZ6cZh2EQOUUla0mnUcapLFrMSHSwyEpEkphqtdAgHR06NyGUkiGlNFE6kAmpkFJp6GT/Wveux/R93/s877P3sw/X717rXd987/c8e9/X77pn//d939d13VeITQISkIAEJFCYwBUK267pEpCABCQggSiEDgIJSEACEihNQCEs7X6Nl4AEJCABhdAxIAEJSEACpQkohKXdr/ESkIAEJKAQOgYkIAEJSKA0AYWwtPs1XgISkIAEFELHgAQkIAEJlCagEJZ2v8ZLQAISkIBC6BiQgAQkIIHSBBTC0u7XeAlIQAISUAgdAxKQgAQkUJqAQlja/RovAQlIQAIKoWNAAhKQgARKE1AIS7tf4yUgAQlIQCF0DEhAAhKQQGkCCmFp92u8BCQgAQkohI4BCUhAAhIoTUAhLO1+jZeABCQgAYXQMSABCUhAAqUJKISl3a/xEpCABCSgEDoGJCABCUigNAGFsLT7NV4CEpCABBRCx4AEJCABCZQmoBCWdr/GS0ACEpCAQugYkIAEJCCB0gQUwtLu13gJSEACElAIHQMSkIAEJFCagEJY2v0aLwEJSEACCqFjQAISkIAEShNQCEu7X+MlIAEJSEAhdAxIQAISkEBpAgphafdrvAQkIAEJKISOAQlIQAISKE1AISztfo2XgAQkIAGF0DEgAQlIQAKlCSiEpd2v8RKQgAQkoBA6BiQgAQlIoDQBhbC0+zVeAhKQgAQUQseABCQgAQmUJqAQlna/xktAAhKQgELoGJCABCQggdIEFMLS7td4CUhAAhJQCB0DEpCABCRQmoBCWNr9Gi8BCUhAAgqhY2BMAldKcnGSFyY5b8wbeW0JSEACxyWgEB6XnN/bhsDZTQjfl+QaSd66zZf8jAQkIIFDElAID0m73r1ukOTVzewLk9y1HgItloAE5k5AIZy7h5bdv14I35+EsXZWkhct2yR7LwEJrI2AQrg2j87Lnl4I35Lk9CSXJDkjCcJok4AEJDALAgrhLNyw2k70QvjaJFdLcp0kd0/yyNVarGESkMDiCCiEi3PZojrcC+FrktwzydNbwMz1DJxZlB/trARWTUAhXLV7Jzfu+kkQwVcluXGSi5LcqpsZGjgzuWvsgAQk0BNQCB0LYxO4U5LXtzQKlkYRRpZJDZwZm7zXl4AEtiKgEG6FyQ8NSOD+Se5n4MyARL2UBCSwFwGFcC98fvkYBJgNMitkdvigJPc5xjX8igQkIIHBCCiEg6H0QjsQODfJozsRvKwTw9N2+J4flYAEJDA4AYVwcKRecAsCV07y7iTvTXIV8wq3IOZHJCCB0QgohKOh9cJHEPi3JNdMcu0kb5SWBCQggakIKIRTkfe+L0lyptGjDgQJSGBqAgrh1B6oe3+S62/TRY/eNslT6mLQcglIYGoCCuHUHqh7/0e0cmvnd3VIL6iLQcslIIGpCSiEU3ug7v3vm+SBSR6c5F51MWi5BCQwNQGFcGoP1L3/XZI8piu99sSuBNs5dTFouQQkMDUBhXBqD9S9/82TPDfJC5LcrC4GLZeABKYmoBBO7YG69+8Lcl+a5Lp1MWi5BCQwNQGFcGoP1L1/n1T/nm6v8Kom1dcdCFougakJKIRTe6D2/U2qr+1/rZfALAgohLNwQ9lOmFRf1vUaLoH5EFAI5+OLij0xqb6i17VZAjMjoBDOzCHFumNSfTGHa64E5khAIZyjV+r0yaT6Or7WUgnMloBCOFvXlOiYSfUl3KyREpg3AYVw3v5Ze+9Mql+7h7VPAgsgoBAuwEkr7qJJ9St2rqZJYCkEFMKleGqd/TSpfp1+1SoJLIqAQrgod62ysybVr9KtGiWB5RBQCJfjq7X21KT6tXpWuySwEAIK4UIcteJumlS/YudqmgSWQEAhXIKX1t1Hk+rX7V+tk8DsCSiEs3fR6jtoUv3qXayBEpg3AYVw3v6p0DuT6it4WRslMGMCCuGMnVOkaybVF3G0ZkpgrgQUwrl6pk6/TKqv42stlcAsCSiEs3RLqU6ZVF/K3RorgfkRUAjn55OKPTKpvqLXtVkCMyGgEM7EEcW7YVJ98QGg+RKYkoBCOCV9790TMKnesSABCUxGQCGcDP2oN35xkmsl+bMk54x6p2EublL9MBy9igQkcAwCCuExoM38K72o9N28KMmdk7xtxv02qX7GzrFrElg7AYVwXR6+a5JfbSY9P8mXJ7liktcl+ZYkL52puSbVz9QxdksCFQgohOvx8td0wvdHzZzzk1yQ5KwkT0vySUkuS3LehlDOyfI+qf61SW4wp47ZFwlIYP0EFMJ1+Pgzk/xpkmsn+cVuGfQeG2Z9QpLfSfKV7XePT8LM8V0zMv1L234mYn3ajPplVyQggQIEFMLlO5mlzxckOTvJU5N88wlM4jMPSMJeHD5/ZZJbtyXTORBgFvjqJJcmue4cOmQfJCCBOgQUwuX7+m+T3LQTwJe1PcF3nMKkWyZ5QpKrJ3l7EvbmSF2YuvVC+JokN5y6M95fAhKoRUAhXLa/mf09Ocn7utngGV1AzMu3MOfT2szxzPbZh3TLpPdO8t4tvjvWRxTCsch6XQlI4EgCCuGRiGb9gV5A/iXJp+7Q06smeViS72nfubhFlb5xh2sM+VGFcEiaXksCEtiJgEK4E67ZfXhfAfnWTkAf1QJUqPd5+yTPm8DKfe2YoMveUgISWAsBhXDZnhxCQD6n7RMSpPL+JBcmuduBsQxhx4G77O0kIIG1EFAIl+3JoQTkY1oQDZGk7BV+ZJL/PSCaoew4YJe9lQQksBYCCuGyPdkLyD8lIQhm38Ye4Scm+aYkz9j3Yjt8XyHcAZYflYAEhiWgEA7L89BX+8IuH/BFSd6dhACYfdtPdjPCH0/y2CTftu/Fdvi+QrgDLD8qAQkMS0AhHJbnFFd7Z1vK/LgBCmuzX3hJyzG85gGXRxXCKUaO95SABD5AQCFc/kD4gyS3SHKrJL83gDlUeEGYDrk8eqMkf5fkX5N88gA2eAkJnIwA44uiE/8lIgn0BBTC5Y+FB7bSaSxp/tQA5vTLoyy5fklL1h/gsv/vEldudVEpBn56kh/paqVSNJzCAP3pGZSMo0DAdyR5z9Ad8HolCdwzyc+3rQTG9ktKUtDoDyOgEC5/UHC80u+eos7orhZydBMFvGkc7IsQcSrEUW1T3Ai46X8QO/6b4t8UBefvLONu2/6hE8IfS/JbI4nytv3wc8smwLOOEn4UqKdRXvBxyzbJ3g9FQCEciuR01yH/j/MGh4ocxZJf6q733Uk+qqVTIIz9HiRjhhnav19O7HYRN2Z+JPD/R3swXa0Lzvn7JI9O8uaGkvqpLM/2Rbhf0eU5/kQT/eloe+clEmDM/kaSc9vLFGPpG7p8WSoy2STgHuFKxsBbWyHtIQJmeiTspXB8E0ckbdN6cXtTEtIw+JMHDWLX/53f8YPYkbzP+Yksif51ki86wRIoD7A7dXvZ9984p5AlW2aIz96mU35GAm18fV4bdxxHxn60TQIfJOCMcB2DYeiAmU0qD+/2IP8nyccm+c+2xEmk6l90tUrf0GaGm+K2LVH2BX+uRah+brcE+4+n+CLLrizR3q+rfHOd9jmOnuIa9MMmgZMRuF17oWMVg6hoRdCx8mEEFMJ1DIqhA2bGpnJW239E4G6b5Clb3pBcye/r0jp+NMm12neeleQ+W568seVt/NhKCPB8IxKZPeof6lZNHroSuzRjYAIK4cBAJ7rc0AEzY5pBOTf2aDgt45e7ZdPvPcbNKAH3g21GyHIwy6wEDCGQ2wT2HOOWfmWBBC7oluZ/oDtm7F1tRcPo4wU68RBdVggPQXn8e4wRMDNWrzk/kXMUOVCYyjiX7XEjRJDl0fM3Anse04JqXr/Hdf3q8gkQFcpYQPy+vTvw+fHLN0kLxiKgEI5F9vDXHSNgZmgr7t7tMT4iyX+3g4QJZx+iUQWHABpml0SgUjD8V5I8YCMKdYj7eI1lECDwitSfq7RSgZQMtEngpAQUwvUMjjEDZoag9FktgZl9vu9s4exDXHfzGp/SIkyZAbD/iOByAPHPdkupvCjY1k+AYKq/akFdD+7GwL3Wb7IW7ktAIdyX4Hy+P+eAGfb0SJGgdNsTk5wzMrbrt9ngHVsZwbcleUgLlqC8lm2dBD46yQuTkIPKiyFlB0nrsUnglAQUwvUMkD5MnDw7ojLn1J7Q8gFZCj2jzdQO0T8eiMwGb9NuRhGAn2nLs6SE2NZDgGcZqRE3TPLK9v+ALz3r8e+oliiEo+I96MV56BOAwsG6V++CSMj1m0NjmZKqHuzbfX7r46H7RVDOg5J8dbsxM0SCdi7qlmkvTUJgTV/R5tB9837DEGBP+G4tOIaVh1PlpQ5zR6+yGgIK4Wpc+QFDKCJ8ZpLz2t7Y1NbxQGJJlKXR728zsSn7hBCyb4QgX74RvUqZOoSRP3mQ/vOGUPJ7xNy2GwEKMXxFC2bi8GiqCVG+jzM0h2rsA/KiwyyflZFnDnVhr1ODgEK4Lj9/YztZnkLV7JORXzdV+4gkL+6qehAkQ8I8ifNzaZzSQfFlHtKfnoQHNPmNRzVmjcwe+cE+ZuAIK3VTbR8icI12JBgrEyxVXr69vb0U3XcAaLfv9gR/u80Ev74T3ecMcE0vUYyAQrguh+NPEso/48DnCZ6I4iNbOgOzKpZtefjNuZGTiCD2PyT8X2/j79ReveJJDKDMG7MQllqZAVdtp3V+5qgjBI5VgL5RDo/9WQJXKKfXv6QxU+TfjtuY4RMUc6VuX5DAKGrj2iSwMwGFcGdks/8CS5CkDPBmTEHrKRoJ8+zBkcz8ZV303l9O0YmB78nDFnEkPJ9ZJPuOH9/NfL64i4S98ca9OAnkqU0Un1fkLEVSVdifoxYsx2zReCHgFBOOz6Kyy2Z7egtgoig7xbApzL5rYwuAU1E4IWUOy+679t/Pz4iAQjgjZwzUFd7EOe2BpT5mYkTQHbJR5eaSdv97t8Lah7z/FPdi5oj4c2wU5zkimjRyF3+/25Pkwc9scY2norM0+dMbp4OQvkClH/48WSPRnehmRBA+pDnssozPsjbXZwmWtJgfnsLp3nM9BBTC9fhy0xJO4WaJ6tdaYMKhrGRmwAOOFIk/7qp7fN2OD7hD9XPM+zBLvHUTRc686/cemR0/v4kis2UCcpbcOM6IccbMmMYLF0uiT9vSKF6YXtb2aSl/ductv0cBbVYYWMJmKZQl0V1EdMvb+LFKBBTCdXqbJTyiHInMY2/rLQcyk8AR3s6ZkXLkDftClRszn69qokguIw/vvv1NE0VmizzYl/Iw/+wWIITI01je5MBkUmRI3dmlfVe31Hxhs529Q5icqrEMyn4sfWDpn+AYC2nvQtzPnpCAQrjegcFpDJxKwb4NNTfHbuxHEhrPA33fIIix+zrV9ZkpI4gsoX5Bq3pDXzjP8Rnt5w9PsKc2VX8378sMjnHEzI3nBsu+FCtgH3CfwukXdwEvZ7eyaNQIPdkLAasNBMYQIPPSbsXhZjPKlZ2Df+zDHgQUwj3gzfyr7FURTMBDlhnimG/OBEi8PAnFr3lYIr62UxNgiY/9NfbHeLhTLJyGqBBpS2oGM+upG88IKhUxYyNqllw9jjeiQg8HNe/bGDtUHKI8GkcmcRD05Rt9IPimP8CZ/piysi95v/9BAgrhugcDb87MQs5tR9IMbS0PRt7i2eMhZYM9MJYCre+4G2kCnG7RZvDMGMm/m2P79ZYY/4aBO0cBCGaWlESjCMPmCwDPqN/s0oI4VomXuRt145k8WZsEBiOgEA6GcpYX6s9k422acPMh2k1aWgZLocxkSEqnsT9EWgF7RrbjE+Dlglk1S4RzCai5edvPpGbsGI3nEEFWLBc/qVWH4T78nr1HXuQQSV4S/mSMDnjN2gQUwnX7n30VltlYhmPfjqXSXRtLVwQlIHr8ybX6xtLYc1tawKPaGXC7Xt/PSwACBMDwwkbqCYE4z94QQYKuWOp/lagkMAYBhXAMqvO6JgfWMsMgZJ/gmaMay3Isb35tm/ltJouTGI2YkhrBD0uvLoMeRdR/35bALyS5R3t5oxgBgTmK4Lb0/NyxCSiEx0a3mC+enoQ9HUL5WbpkhrjZCNLgbZulTn5YnuoTwlnuZMkK0SMilAg/C08vxvWL6yh7pcz6CO6iUduVfEWOV7JJYDQCCuFoaGd1YZYtqfhPxZc/bz1jpscyJ1VR+ohF/ukVTfTI0+Jn7jVCZwXazuxN4A6tLBs5sESJKoJ7I/UCRxFQCI8itI5/v2UXAv+sk5hCcAuCR6krZn2ey7cOny/Zioe24Bz2n20SGJ2AQjg64tncgJqM5F71uV8sgfKgGSsScDaG2xEJSEACpyKgEDo+JCABCUigNAGFsLT7NV4CEpCABBRCx4AEJCABCZQmoBCWdr/GS0ACEpCAQugYkIAEJCCB0gQUwtLu13gJSEACElAIHQMSkIAEJFCagEJY2v0aLwEJSEACCqFjQAISkIAEShNQCEu7X+MlIAEJSEAhdAxIQAISkEBpAgphafdrvAQkIAEJKISOAQlIQAISKE1AISztfo2XgAQkIAGF0DEgAQlIQAKlCSiEpd2v8RKQgAQkoBA6BiQgAQlIoDQBhbC0+zVeAhKQgAQUQseABCQgAQmUJqAQlna/xktAAhKQgELoGJCABCQggdIEFMLS7td4CUhAAhJQCB0DEpCABCRQmoBCWNr9Gi8BCUhAAgqhY0ACEpCABEoTUAhLu1/jJSABCUhAIXQMSEACEpBAaQIKYWn3a7wEJCABCSiEjgEJSEACEihNQCEs7X6Nl4AEJCABhdAxIAEJSEACpQkohKXdr/ESkIAEJKAQOgYkIAEJSKA0AYWwtPs1XgISkIAEFELHgAQkIAEJlCagEJZ2v8ZLQAISkIBC6BiQgAQkIIHSBBTC0u7XeAlIQAISUAgdAxKQgAQkUJqAQlja/RovAQlIQAIKoWNAAhKQgARKE1AIS7tf4yUgAQlIQCF0DEhAAhKQQGkCCmFp92u8BCQgAQkohI4BCUhAAhIoTUAhLO1+jZeABCQgAYXQMSABCUhAAqUJKISl3a/xEpCABCSgEDoGJCABCUigNAGFsLT7NV4CEpCABBRCx4AEJCABCZQmoBCWdr/GS0ACEpCAQugYkIAEJCCB0gQUwtLu13gJSEACElAIHQMSkIAEJFCagEJY2v0aLwEJSEACCqFjQAISkIAEShNQCEu7X+MlIAEJSEAhdAxIQAISkEBpAgphafdrvAQkIAEJKISOAQlIQAISKE1AISztfo2XgAQkIAGF0DEgAQlIQAKlCSiEpd2v8RKQgAQkoBA6BiQgAQlIoDSB/wMFgIHnGXsJRQAAAABJRU5ErkJggg==	2025-11-17 11:30:05.583	2025-11-17 10:38:03.831	2025-11-17 11:35:43.356
\.


--
-- Data for Name: medical_records; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.medical_records (id, organization_id, patient_id, provider_id, type, title, notes, diagnosis, treatment, prescription, attachments, ai_suggestions, created_at) FROM stdin;
1	1	1	2	consultation	Initial Cardiac Assessment	Patient presents with mild chest discomfort. ECG shows normal sinus rhythm. Blood pressure elevated at 150/95. Recommended lifestyle modifications and continued antihypertensive therapy.	Essential Hypertension (I10)	Continue current medication, dietary consultation recommended	{"medications": [{"name": "Lisinopril", "dosage": "10mg", "duration": "30 days", "frequency": "Once daily"}]}	[]	{"riskAssessment": "Moderate cardiovascular risk", "recommendations": ["Monitor BP weekly", "Reduce sodium intake", "Regular exercise"], "drugInteractions": []}	2025-11-17 08:46:45.382408
2	1	1	2	consultation	Initial Cardiac Assessment	Patient presents with mild chest discomfort. ECG shows normal sinus rhythm. Blood pressure elevated at 150/95. Recommended lifestyle modifications and continued antihypertensive therapy.	Essential Hypertension (I10)	Continue current medication, dietary consultation recommended	{"medications": [{"name": "Lisinopril", "dosage": "10mg", "duration": "30 days", "frequency": "Once daily"}]}	[]	{"riskAssessment": "Moderate cardiovascular risk", "recommendations": ["Monitor BP weekly", "Reduce sodium intake", "Regular exercise"], "drugInteractions": []}	2025-11-17 08:48:44.339882
3	1	1	2	consultation	Initial Cardiac Assessment	Patient presents with mild chest discomfort. ECG shows normal sinus rhythm. Blood pressure elevated at 150/95. Recommended lifestyle modifications and continued antihypertensive therapy.	Essential Hypertension (I10)	Continue current medication, dietary consultation recommended	{"medications": [{"name": "Lisinopril", "dosage": "10mg", "duration": "30 days", "frequency": "Once daily"}]}	[]	{"riskAssessment": "Moderate cardiovascular risk", "recommendations": ["Monitor BP weekly", "Reduce sodium intake", "Regular exercise"], "drugInteractions": []}	2025-11-17 08:49:41.472686
4	1	1	2	consultation	Initial Cardiac Assessment	Patient presents with mild chest discomfort. ECG shows normal sinus rhythm. Blood pressure elevated at 150/95. Recommended lifestyle modifications and continued antihypertensive therapy.	Essential Hypertension (I10)	Continue current medication, dietary consultation recommended	{"medications": [{"name": "Lisinopril", "dosage": "10mg", "duration": "30 days", "frequency": "Once daily"}]}	[]	{"riskAssessment": "Moderate cardiovascular risk", "recommendations": ["Monitor BP weekly", "Reduce sodium intake", "Regular exercise"], "drugInteractions": []}	2025-11-17 10:04:14.815022
5	1	1	2	consultation	Initial Cardiac Assessment	Patient presents with mild chest discomfort. ECG shows normal sinus rhythm. Blood pressure elevated at 150/95. Recommended lifestyle modifications and continued antihypertensive therapy.	Essential Hypertension (I10)	Continue current medication, dietary consultation recommended	{"medications": [{"name": "Lisinopril", "dosage": "10mg", "duration": "30 days", "frequency": "Once daily"}]}	[]	{"riskAssessment": "Moderate cardiovascular risk", "recommendations": ["Monitor BP weekly", "Reduce sodium intake", "Regular exercise"], "drugInteractions": []}	2025-11-17 11:11:31.738841
6	1	1	2	consultation	Initial Cardiac Assessment	Patient presents with mild chest discomfort. ECG shows normal sinus rhythm. Blood pressure elevated at 150/95. Recommended lifestyle modifications and continued antihypertensive therapy.	Essential Hypertension (I10)	Continue current medication, dietary consultation recommended	{"medications": [{"name": "Lisinopril", "dosage": "10mg", "duration": "30 days", "frequency": "Once daily"}]}	[]	{"riskAssessment": "Moderate cardiovascular risk", "recommendations": ["Monitor BP weekly", "Reduce sodium intake", "Regular exercise"], "drugInteractions": []}	2025-11-17 11:12:54.382553
7	1	1	2	consultation	Initial Cardiac Assessment	Patient presents with mild chest discomfort. ECG shows normal sinus rhythm. Blood pressure elevated at 150/95. Recommended lifestyle modifications and continued antihypertensive therapy.	Essential Hypertension (I10)	Continue current medication, dietary consultation recommended	{"medications": [{"name": "Lisinopril", "dosage": "10mg", "duration": "30 days", "frequency": "Once daily"}]}	[]	{"riskAssessment": "Moderate cardiovascular risk", "recommendations": ["Monitor BP weekly", "Reduce sodium intake", "Regular exercise"], "drugInteractions": []}	2025-11-17 11:16:10.785618
8	1	1	2	consultation	Initial Cardiac Assessment	Patient presents with mild chest discomfort. ECG shows normal sinus rhythm. Blood pressure elevated at 150/95. Recommended lifestyle modifications and continued antihypertensive therapy.	Essential Hypertension (I10)	Continue current medication, dietary consultation recommended	{"medications": [{"name": "Lisinopril", "dosage": "10mg", "duration": "30 days", "frequency": "Once daily"}]}	[]	{"riskAssessment": "Moderate cardiovascular risk", "recommendations": ["Monitor BP weekly", "Reduce sodium intake", "Regular exercise"], "drugInteractions": []}	2025-11-17 11:17:22.931317
9	1	1	2	consultation	Initial Cardiac Assessment	Patient presents with mild chest discomfort. ECG shows normal sinus rhythm. Blood pressure elevated at 150/95. Recommended lifestyle modifications and continued antihypertensive therapy.	Essential Hypertension (I10)	Continue current medication, dietary consultation recommended	{"medications": [{"name": "Lisinopril", "dosage": "10mg", "duration": "30 days", "frequency": "Once daily"}]}	[]	{"riskAssessment": "Moderate cardiovascular risk", "recommendations": ["Monitor BP weekly", "Reduce sodium intake", "Regular exercise"], "drugInteractions": []}	2025-11-17 11:39:01.005485
10	1	1	2	consultation	Initial Cardiac Assessment	Patient presents with mild chest discomfort. ECG shows normal sinus rhythm. Blood pressure elevated at 150/95. Recommended lifestyle modifications and continued antihypertensive therapy.	Essential Hypertension (I10)	Continue current medication, dietary consultation recommended	{"medications": [{"name": "Lisinopril", "dosage": "10mg", "duration": "30 days", "frequency": "Once daily"}]}	[]	{"riskAssessment": "Moderate cardiovascular risk", "recommendations": ["Monitor BP weekly", "Reduce sodium intake", "Regular exercise"], "drugInteractions": []}	2025-11-17 12:04:41.034939
11	1	1	2	consultation	Initial Cardiac Assessment	Patient presents with mild chest discomfort. ECG shows normal sinus rhythm. Blood pressure elevated at 150/95. Recommended lifestyle modifications and continued antihypertensive therapy.	Essential Hypertension (I10)	Continue current medication, dietary consultation recommended	{"medications": [{"name": "Lisinopril", "dosage": "10mg", "duration": "30 days", "frequency": "Once daily"}]}	[]	{"riskAssessment": "Moderate cardiovascular risk", "recommendations": ["Monitor BP weekly", "Reduce sodium intake", "Regular exercise"], "drugInteractions": []}	2025-11-17 12:05:22.635221
12	1	1	2	consultation	Initial Cardiac Assessment	Patient presents with mild chest discomfort. ECG shows normal sinus rhythm. Blood pressure elevated at 150/95. Recommended lifestyle modifications and continued antihypertensive therapy.	Essential Hypertension (I10)	Continue current medication, dietary consultation recommended	{"medications": [{"name": "Lisinopril", "dosage": "10mg", "duration": "30 days", "frequency": "Once daily"}]}	[]	{"riskAssessment": "Moderate cardiovascular risk", "recommendations": ["Monitor BP weekly", "Reduce sodium intake", "Regular exercise"], "drugInteractions": []}	2025-11-17 16:37:24.47242
13	1	1	2	consultation	Initial Cardiac Assessment	Patient presents with mild chest discomfort. ECG shows normal sinus rhythm. Blood pressure elevated at 150/95. Recommended lifestyle modifications and continued antihypertensive therapy.	Essential Hypertension (I10)	Continue current medication, dietary consultation recommended	{"medications": [{"name": "Lisinopril", "dosage": "10mg", "duration": "30 days", "frequency": "Once daily"}]}	[]	{"riskAssessment": "Moderate cardiovascular risk", "recommendations": ["Monitor BP weekly", "Reduce sodium intake", "Regular exercise"], "drugInteractions": []}	2025-11-17 16:46:37.407016
14	1	1	2	consultation	Initial Cardiac Assessment	Patient presents with mild chest discomfort. ECG shows normal sinus rhythm. Blood pressure elevated at 150/95. Recommended lifestyle modifications and continued antihypertensive therapy.	Essential Hypertension (I10)	Continue current medication, dietary consultation recommended	{"medications": [{"name": "Lisinopril", "dosage": "10mg", "duration": "30 days", "frequency": "Once daily"}]}	[]	{"riskAssessment": "Moderate cardiovascular risk", "recommendations": ["Monitor BP weekly", "Reduce sodium intake", "Regular exercise"], "drugInteractions": []}	2025-11-17 16:47:59.416674
15	1	1	2	consultation	Initial Cardiac Assessment	Patient presents with mild chest discomfort. ECG shows normal sinus rhythm. Blood pressure elevated at 150/95. Recommended lifestyle modifications and continued antihypertensive therapy.	Essential Hypertension (I10)	Continue current medication, dietary consultation recommended	{"medications": [{"name": "Lisinopril", "dosage": "10mg", "duration": "30 days", "frequency": "Once daily"}]}	[]	{"riskAssessment": "Moderate cardiovascular risk", "recommendations": ["Monitor BP weekly", "Reduce sodium intake", "Regular exercise"], "drugInteractions": []}	2025-11-17 16:50:56.878183
16	1	1	2	consultation	Initial Cardiac Assessment	Patient presents with mild chest discomfort. ECG shows normal sinus rhythm. Blood pressure elevated at 150/95. Recommended lifestyle modifications and continued antihypertensive therapy.	Essential Hypertension (I10)	Continue current medication, dietary consultation recommended	{"medications": [{"name": "Lisinopril", "dosage": "10mg", "duration": "30 days", "frequency": "Once daily"}]}	[]	{"riskAssessment": "Moderate cardiovascular risk", "recommendations": ["Monitor BP weekly", "Reduce sodium intake", "Regular exercise"], "drugInteractions": []}	2025-11-17 16:54:53.099898
17	1	1	2	consultation	Initial Cardiac Assessment	Patient presents with mild chest discomfort. ECG shows normal sinus rhythm. Blood pressure elevated at 150/95. Recommended lifestyle modifications and continued antihypertensive therapy.	Essential Hypertension (I10)	Continue current medication, dietary consultation recommended	{"medications": [{"name": "Lisinopril", "dosage": "10mg", "duration": "30 days", "frequency": "Once daily"}]}	[]	{"riskAssessment": "Moderate cardiovascular risk", "recommendations": ["Monitor BP weekly", "Reduce sodium intake", "Regular exercise"], "drugInteractions": []}	2025-11-17 17:04:18.555995
18	1	1	2	consultation	Initial Cardiac Assessment	Patient presents with mild chest discomfort. ECG shows normal sinus rhythm. Blood pressure elevated at 150/95. Recommended lifestyle modifications and continued antihypertensive therapy.	Essential Hypertension (I10)	Continue current medication, dietary consultation recommended	{"medications": [{"name": "Lisinopril", "dosage": "10mg", "duration": "30 days", "frequency": "Once daily"}]}	[]	{"riskAssessment": "Moderate cardiovascular risk", "recommendations": ["Monitor BP weekly", "Reduce sodium intake", "Regular exercise"], "drugInteractions": []}	2025-11-17 17:06:02.939074
19	1	1	2	consultation	Initial Cardiac Assessment	Patient presents with mild chest discomfort. ECG shows normal sinus rhythm. Blood pressure elevated at 150/95. Recommended lifestyle modifications and continued antihypertensive therapy.	Essential Hypertension (I10)	Continue current medication, dietary consultation recommended	{"medications": [{"name": "Lisinopril", "dosage": "10mg", "duration": "30 days", "frequency": "Once daily"}]}	[]	{"riskAssessment": "Moderate cardiovascular risk", "recommendations": ["Monitor BP weekly", "Reduce sodium intake", "Regular exercise"], "drugInteractions": []}	2025-11-17 17:08:44.997962
20	1	1	2	consultation	Initial Cardiac Assessment	Patient presents with mild chest discomfort. ECG shows normal sinus rhythm. Blood pressure elevated at 150/95. Recommended lifestyle modifications and continued antihypertensive therapy.	Essential Hypertension (I10)	Continue current medication, dietary consultation recommended	{"medications": [{"name": "Lisinopril", "dosage": "10mg", "duration": "30 days", "frequency": "Once daily"}]}	[]	{"riskAssessment": "Moderate cardiovascular risk", "recommendations": ["Monitor BP weekly", "Reduce sodium intake", "Regular exercise"], "drugInteractions": []}	2025-11-17 17:12:43.456802
21	1	1	2	consultation	Initial Cardiac Assessment	Patient presents with mild chest discomfort. ECG shows normal sinus rhythm. Blood pressure elevated at 150/95. Recommended lifestyle modifications and continued antihypertensive therapy.	Essential Hypertension (I10)	Continue current medication, dietary consultation recommended	{"medications": [{"name": "Lisinopril", "dosage": "10mg", "duration": "30 days", "frequency": "Once daily"}]}	[]	{"riskAssessment": "Moderate cardiovascular risk", "recommendations": ["Monitor BP weekly", "Reduce sodium intake", "Regular exercise"], "drugInteractions": []}	2025-11-17 17:13:33.207061
22	1	1	2	consultation	Initial Cardiac Assessment	Patient presents with mild chest discomfort. ECG shows normal sinus rhythm. Blood pressure elevated at 150/95. Recommended lifestyle modifications and continued antihypertensive therapy.	Essential Hypertension (I10)	Continue current medication, dietary consultation recommended	{"medications": [{"name": "Lisinopril", "dosage": "10mg", "duration": "30 days", "frequency": "Once daily"}]}	[]	{"riskAssessment": "Moderate cardiovascular risk", "recommendations": ["Monitor BP weekly", "Reduce sodium intake", "Regular exercise"], "drugInteractions": []}	2025-11-17 17:35:14.21745
23	1	1	2	consultation	Initial Cardiac Assessment	Patient presents with mild chest discomfort. ECG shows normal sinus rhythm. Blood pressure elevated at 150/95. Recommended lifestyle modifications and continued antihypertensive therapy.	Essential Hypertension (I10)	Continue current medication, dietary consultation recommended	{"medications": [{"name": "Lisinopril", "dosage": "10mg", "duration": "30 days", "frequency": "Once daily"}]}	[]	{"riskAssessment": "Moderate cardiovascular risk", "recommendations": ["Monitor BP weekly", "Reduce sodium intake", "Regular exercise"], "drugInteractions": []}	2025-11-17 17:57:25.785926
24	1	1	2	consultation	Initial Cardiac Assessment	Patient presents with mild chest discomfort. ECG shows normal sinus rhythm. Blood pressure elevated at 150/95. Recommended lifestyle modifications and continued antihypertensive therapy.	Essential Hypertension (I10)	Continue current medication, dietary consultation recommended	{"medications": [{"name": "Lisinopril", "dosage": "10mg", "duration": "30 days", "frequency": "Once daily"}]}	[]	{"riskAssessment": "Moderate cardiovascular risk", "recommendations": ["Monitor BP weekly", "Reduce sodium intake", "Regular exercise"], "drugInteractions": []}	2025-11-17 18:12:12.853735
25	1	1	2	consultation	Initial Cardiac Assessment	Patient presents with mild chest discomfort. ECG shows normal sinus rhythm. Blood pressure elevated at 150/95. Recommended lifestyle modifications and continued antihypertensive therapy.	Essential Hypertension (I10)	Continue current medication, dietary consultation recommended	{"medications": [{"name": "Lisinopril", "dosage": "10mg", "duration": "30 days", "frequency": "Once daily"}]}	[]	{"riskAssessment": "Moderate cardiovascular risk", "recommendations": ["Monitor BP weekly", "Reduce sodium intake", "Regular exercise"], "drugInteractions": []}	2025-11-17 18:25:38.267669
26	1	1	2	consultation	Initial Cardiac Assessment	Patient presents with mild chest discomfort. ECG shows normal sinus rhythm. Blood pressure elevated at 150/95. Recommended lifestyle modifications and continued antihypertensive therapy.	Essential Hypertension (I10)	Continue current medication, dietary consultation recommended	{"medications": [{"name": "Lisinopril", "dosage": "10mg", "duration": "30 days", "frequency": "Once daily"}]}	[]	{"riskAssessment": "Moderate cardiovascular risk", "recommendations": ["Monitor BP weekly", "Reduce sodium intake", "Regular exercise"], "drugInteractions": []}	2025-11-17 18:26:54.325813
27	1	1	2	consultation	Initial Cardiac Assessment	Patient presents with mild chest discomfort. ECG shows normal sinus rhythm. Blood pressure elevated at 150/95. Recommended lifestyle modifications and continued antihypertensive therapy.	Essential Hypertension (I10)	Continue current medication, dietary consultation recommended	{"medications": [{"name": "Lisinopril", "dosage": "10mg", "duration": "30 days", "frequency": "Once daily"}]}	[]	{"riskAssessment": "Moderate cardiovascular risk", "recommendations": ["Monitor BP weekly", "Reduce sodium intake", "Regular exercise"], "drugInteractions": []}	2025-11-17 18:40:39.895731
28	1	1	2	consultation	Initial Cardiac Assessment	Patient presents with mild chest discomfort. ECG shows normal sinus rhythm. Blood pressure elevated at 150/95. Recommended lifestyle modifications and continued antihypertensive therapy.	Essential Hypertension (I10)	Continue current medication, dietary consultation recommended	{"medications": [{"name": "Lisinopril", "dosage": "10mg", "duration": "30 days", "frequency": "Once daily"}]}	[]	{"riskAssessment": "Moderate cardiovascular risk", "recommendations": ["Monitor BP weekly", "Reduce sodium intake", "Regular exercise"], "drugInteractions": []}	2025-11-17 18:41:11.765342
29	1	1	2	consultation	Initial Cardiac Assessment	Patient presents with mild chest discomfort. ECG shows normal sinus rhythm. Blood pressure elevated at 150/95. Recommended lifestyle modifications and continued antihypertensive therapy.	Essential Hypertension (I10)	Continue current medication, dietary consultation recommended	{"medications": [{"name": "Lisinopril", "dosage": "10mg", "duration": "30 days", "frequency": "Once daily"}]}	[]	{"riskAssessment": "Moderate cardiovascular risk", "recommendations": ["Monitor BP weekly", "Reduce sodium intake", "Regular exercise"], "drugInteractions": []}	2025-11-17 18:50:25.060405
30	1	1	2	consultation	Initial Cardiac Assessment	Patient presents with mild chest discomfort. ECG shows normal sinus rhythm. Blood pressure elevated at 150/95. Recommended lifestyle modifications and continued antihypertensive therapy.	Essential Hypertension (I10)	Continue current medication, dietary consultation recommended	{"medications": [{"name": "Lisinopril", "dosage": "10mg", "duration": "30 days", "frequency": "Once daily"}]}	[]	{"riskAssessment": "Moderate cardiovascular risk", "recommendations": ["Monitor BP weekly", "Reduce sodium intake", "Regular exercise"], "drugInteractions": []}	2025-11-17 18:59:59.876845
31	1	1	2	consultation	Initial Cardiac Assessment	Patient presents with mild chest discomfort. ECG shows normal sinus rhythm. Blood pressure elevated at 150/95. Recommended lifestyle modifications and continued antihypertensive therapy.	Essential Hypertension (I10)	Continue current medication, dietary consultation recommended	{"medications": [{"name": "Lisinopril", "dosage": "10mg", "duration": "30 days", "frequency": "Once daily"}]}	[]	{"riskAssessment": "Moderate cardiovascular risk", "recommendations": ["Monitor BP weekly", "Reduce sodium intake", "Regular exercise"], "drugInteractions": []}	2025-11-17 19:02:40.303905
32	1	1	2	consultation	Initial Cardiac Assessment	Patient presents with mild chest discomfort. ECG shows normal sinus rhythm. Blood pressure elevated at 150/95. Recommended lifestyle modifications and continued antihypertensive therapy.	Essential Hypertension (I10)	Continue current medication, dietary consultation recommended	{"medications": [{"name": "Lisinopril", "dosage": "10mg", "duration": "30 days", "frequency": "Once daily"}]}	[]	{"riskAssessment": "Moderate cardiovascular risk", "recommendations": ["Monitor BP weekly", "Reduce sodium intake", "Regular exercise"], "drugInteractions": []}	2025-11-17 19:11:50.885818
33	1	1	2	consultation	Initial Cardiac Assessment	Patient presents with mild chest discomfort. ECG shows normal sinus rhythm. Blood pressure elevated at 150/95. Recommended lifestyle modifications and continued antihypertensive therapy.	Essential Hypertension (I10)	Continue current medication, dietary consultation recommended	{"medications": [{"name": "Lisinopril", "dosage": "10mg", "duration": "30 days", "frequency": "Once daily"}]}	[]	{"riskAssessment": "Moderate cardiovascular risk", "recommendations": ["Monitor BP weekly", "Reduce sodium intake", "Regular exercise"], "drugInteractions": []}	2025-11-17 19:12:28.793749
34	1	1	2	consultation	Initial Cardiac Assessment	Patient presents with mild chest discomfort. ECG shows normal sinus rhythm. Blood pressure elevated at 150/95. Recommended lifestyle modifications and continued antihypertensive therapy.	Essential Hypertension (I10)	Continue current medication, dietary consultation recommended	{"medications": [{"name": "Lisinopril", "dosage": "10mg", "duration": "30 days", "frequency": "Once daily"}]}	[]	{"riskAssessment": "Moderate cardiovascular risk", "recommendations": ["Monitor BP weekly", "Reduce sodium intake", "Regular exercise"], "drugInteractions": []}	2025-11-17 19:19:28.925937
35	1	1	2	consultation	Initial Cardiac Assessment	Patient presents with mild chest discomfort. ECG shows normal sinus rhythm. Blood pressure elevated at 150/95. Recommended lifestyle modifications and continued antihypertensive therapy.	Essential Hypertension (I10)	Continue current medication, dietary consultation recommended	{"medications": [{"name": "Lisinopril", "dosage": "10mg", "duration": "30 days", "frequency": "Once daily"}]}	[]	{"riskAssessment": "Moderate cardiovascular risk", "recommendations": ["Monitor BP weekly", "Reduce sodium intake", "Regular exercise"], "drugInteractions": []}	2025-11-17 19:24:47.330953
36	1	1	2	consultation	Initial Cardiac Assessment	Patient presents with mild chest discomfort. ECG shows normal sinus rhythm. Blood pressure elevated at 150/95. Recommended lifestyle modifications and continued antihypertensive therapy.	Essential Hypertension (I10)	Continue current medication, dietary consultation recommended	{"medications": [{"name": "Lisinopril", "dosage": "10mg", "duration": "30 days", "frequency": "Once daily"}]}	[]	{"riskAssessment": "Moderate cardiovascular risk", "recommendations": ["Monitor BP weekly", "Reduce sodium intake", "Regular exercise"], "drugInteractions": []}	2025-11-17 19:33:56.484649
37	1	1	2	consultation	Initial Cardiac Assessment	Patient presents with mild chest discomfort. ECG shows normal sinus rhythm. Blood pressure elevated at 150/95. Recommended lifestyle modifications and continued antihypertensive therapy.	Essential Hypertension (I10)	Continue current medication, dietary consultation recommended	{"medications": [{"name": "Lisinopril", "dosage": "10mg", "duration": "30 days", "frequency": "Once daily"}]}	[]	{"riskAssessment": "Moderate cardiovascular risk", "recommendations": ["Monitor BP weekly", "Reduce sodium intake", "Regular exercise"], "drugInteractions": []}	2025-11-17 19:34:33.675007
38	1	1	2	consultation	Initial Cardiac Assessment	Patient presents with mild chest discomfort. ECG shows normal sinus rhythm. Blood pressure elevated at 150/95. Recommended lifestyle modifications and continued antihypertensive therapy.	Essential Hypertension (I10)	Continue current medication, dietary consultation recommended	{"medications": [{"name": "Lisinopril", "dosage": "10mg", "duration": "30 days", "frequency": "Once daily"}]}	[]	{"riskAssessment": "Moderate cardiovascular risk", "recommendations": ["Monitor BP weekly", "Reduce sodium intake", "Regular exercise"], "drugInteractions": []}	2025-11-17 19:35:28.820463
39	1	1	2	consultation	Initial Cardiac Assessment	Patient presents with mild chest discomfort. ECG shows normal sinus rhythm. Blood pressure elevated at 150/95. Recommended lifestyle modifications and continued antihypertensive therapy.	Essential Hypertension (I10)	Continue current medication, dietary consultation recommended	{"medications": [{"name": "Lisinopril", "dosage": "10mg", "duration": "30 days", "frequency": "Once daily"}]}	[]	{"riskAssessment": "Moderate cardiovascular risk", "recommendations": ["Monitor BP weekly", "Reduce sodium intake", "Regular exercise"], "drugInteractions": []}	2025-11-17 19:39:06.535476
40	1	1	2	consultation	Initial Cardiac Assessment	Patient presents with mild chest discomfort. ECG shows normal sinus rhythm. Blood pressure elevated at 150/95. Recommended lifestyle modifications and continued antihypertensive therapy.	Essential Hypertension (I10)	Continue current medication, dietary consultation recommended	{"medications": [{"name": "Lisinopril", "dosage": "10mg", "duration": "30 days", "frequency": "Once daily"}]}	[]	{"riskAssessment": "Moderate cardiovascular risk", "recommendations": ["Monitor BP weekly", "Reduce sodium intake", "Regular exercise"], "drugInteractions": []}	2025-11-17 19:41:38.312768
41	1	1	2	consultation	Initial Cardiac Assessment	Patient presents with mild chest discomfort. ECG shows normal sinus rhythm. Blood pressure elevated at 150/95. Recommended lifestyle modifications and continued antihypertensive therapy.	Essential Hypertension (I10)	Continue current medication, dietary consultation recommended	{"medications": [{"name": "Lisinopril", "dosage": "10mg", "duration": "30 days", "frequency": "Once daily"}]}	[]	{"riskAssessment": "Moderate cardiovascular risk", "recommendations": ["Monitor BP weekly", "Reduce sodium intake", "Regular exercise"], "drugInteractions": []}	2025-11-17 19:49:50.772064
42	1	1	2	consultation	Initial Cardiac Assessment	Patient presents with mild chest discomfort. ECG shows normal sinus rhythm. Blood pressure elevated at 150/95. Recommended lifestyle modifications and continued antihypertensive therapy.	Essential Hypertension (I10)	Continue current medication, dietary consultation recommended	{"medications": [{"name": "Lisinopril", "dosage": "10mg", "duration": "30 days", "frequency": "Once daily"}]}	[]	{"riskAssessment": "Moderate cardiovascular risk", "recommendations": ["Monitor BP weekly", "Reduce sodium intake", "Regular exercise"], "drugInteractions": []}	2025-11-17 19:53:41.740411
43	1	1	2	consultation	Initial Cardiac Assessment	Patient presents with mild chest discomfort. ECG shows normal sinus rhythm. Blood pressure elevated at 150/95. Recommended lifestyle modifications and continued antihypertensive therapy.	Essential Hypertension (I10)	Continue current medication, dietary consultation recommended	{"medications": [{"name": "Lisinopril", "dosage": "10mg", "duration": "30 days", "frequency": "Once daily"}]}	[]	{"riskAssessment": "Moderate cardiovascular risk", "recommendations": ["Monitor BP weekly", "Reduce sodium intake", "Regular exercise"], "drugInteractions": []}	2025-11-17 19:56:31.407306
44	1	1	2	consultation	Initial Cardiac Assessment	Patient presents with mild chest discomfort. ECG shows normal sinus rhythm. Blood pressure elevated at 150/95. Recommended lifestyle modifications and continued antihypertensive therapy.	Essential Hypertension (I10)	Continue current medication, dietary consultation recommended	{"medications": [{"name": "Lisinopril", "dosage": "10mg", "duration": "30 days", "frequency": "Once daily"}]}	[]	{"riskAssessment": "Moderate cardiovascular risk", "recommendations": ["Monitor BP weekly", "Reduce sodium intake", "Regular exercise"], "drugInteractions": []}	2025-11-17 20:02:06.30995
45	1	1	2	consultation	Initial Cardiac Assessment	Patient presents with mild chest discomfort. ECG shows normal sinus rhythm. Blood pressure elevated at 150/95. Recommended lifestyle modifications and continued antihypertensive therapy.	Essential Hypertension (I10)	Continue current medication, dietary consultation recommended	{"medications": [{"name": "Lisinopril", "dosage": "10mg", "duration": "30 days", "frequency": "Once daily"}]}	[]	{"riskAssessment": "Moderate cardiovascular risk", "recommendations": ["Monitor BP weekly", "Reduce sodium intake", "Regular exercise"], "drugInteractions": []}	2025-11-17 20:02:46.001851
46	1	1	2	consultation	Initial Cardiac Assessment	Patient presents with mild chest discomfort. ECG shows normal sinus rhythm. Blood pressure elevated at 150/95. Recommended lifestyle modifications and continued antihypertensive therapy.	Essential Hypertension (I10)	Continue current medication, dietary consultation recommended	{"medications": [{"name": "Lisinopril", "dosage": "10mg", "duration": "30 days", "frequency": "Once daily"}]}	[]	{"riskAssessment": "Moderate cardiovascular risk", "recommendations": ["Monitor BP weekly", "Reduce sodium intake", "Regular exercise"], "drugInteractions": []}	2025-11-17 20:05:58.457735
47	1	1	2	consultation	Initial Cardiac Assessment	Patient presents with mild chest discomfort. ECG shows normal sinus rhythm. Blood pressure elevated at 150/95. Recommended lifestyle modifications and continued antihypertensive therapy.	Essential Hypertension (I10)	Continue current medication, dietary consultation recommended	{"medications": [{"name": "Lisinopril", "dosage": "10mg", "duration": "30 days", "frequency": "Once daily"}]}	[]	{"riskAssessment": "Moderate cardiovascular risk", "recommendations": ["Monitor BP weekly", "Reduce sodium intake", "Regular exercise"], "drugInteractions": []}	2025-11-17 20:15:56.561778
48	1	1	2	consultation	Initial Cardiac Assessment	Patient presents with mild chest discomfort. ECG shows normal sinus rhythm. Blood pressure elevated at 150/95. Recommended lifestyle modifications and continued antihypertensive therapy.	Essential Hypertension (I10)	Continue current medication, dietary consultation recommended	{"medications": [{"name": "Lisinopril", "dosage": "10mg", "duration": "30 days", "frequency": "Once daily"}]}	[]	{"riskAssessment": "Moderate cardiovascular risk", "recommendations": ["Monitor BP weekly", "Reduce sodium intake", "Regular exercise"], "drugInteractions": []}	2025-11-17 20:16:29.961584
49	1	1	2	consultation	Initial Cardiac Assessment	Patient presents with mild chest discomfort. ECG shows normal sinus rhythm. Blood pressure elevated at 150/95. Recommended lifestyle modifications and continued antihypertensive therapy.	Essential Hypertension (I10)	Continue current medication, dietary consultation recommended	{"medications": [{"name": "Lisinopril", "dosage": "10mg", "duration": "30 days", "frequency": "Once daily"}]}	[]	{"riskAssessment": "Moderate cardiovascular risk", "recommendations": ["Monitor BP weekly", "Reduce sodium intake", "Regular exercise"], "drugInteractions": []}	2025-11-17 20:22:18.947992
50	1	1	2	consultation	Initial Cardiac Assessment	Patient presents with mild chest discomfort. ECG shows normal sinus rhythm. Blood pressure elevated at 150/95. Recommended lifestyle modifications and continued antihypertensive therapy.	Essential Hypertension (I10)	Continue current medication, dietary consultation recommended	{"medications": [{"name": "Lisinopril", "dosage": "10mg", "duration": "30 days", "frequency": "Once daily"}]}	[]	{"riskAssessment": "Moderate cardiovascular risk", "recommendations": ["Monitor BP weekly", "Reduce sodium intake", "Regular exercise"], "drugInteractions": []}	2025-11-17 20:23:20.478999
51	1	1	2	consultation	Initial Cardiac Assessment	Patient presents with mild chest discomfort. ECG shows normal sinus rhythm. Blood pressure elevated at 150/95. Recommended lifestyle modifications and continued antihypertensive therapy.	Essential Hypertension (I10)	Continue current medication, dietary consultation recommended	{"medications": [{"name": "Lisinopril", "dosage": "10mg", "duration": "30 days", "frequency": "Once daily"}]}	[]	{"riskAssessment": "Moderate cardiovascular risk", "recommendations": ["Monitor BP weekly", "Reduce sodium intake", "Regular exercise"], "drugInteractions": []}	2025-11-17 20:34:26.682982
52	1	1	2	consultation	Initial Cardiac Assessment	Patient presents with mild chest discomfort. ECG shows normal sinus rhythm. Blood pressure elevated at 150/95. Recommended lifestyle modifications and continued antihypertensive therapy.	Essential Hypertension (I10)	Continue current medication, dietary consultation recommended	{"medications": [{"name": "Lisinopril", "dosage": "10mg", "duration": "30 days", "frequency": "Once daily"}]}	[]	{"riskAssessment": "Moderate cardiovascular risk", "recommendations": ["Monitor BP weekly", "Reduce sodium intake", "Regular exercise"], "drugInteractions": []}	2025-11-17 20:35:37.000308
53	1	1	2	consultation	Initial Cardiac Assessment	Patient presents with mild chest discomfort. ECG shows normal sinus rhythm. Blood pressure elevated at 150/95. Recommended lifestyle modifications and continued antihypertensive therapy.	Essential Hypertension (I10)	Continue current medication, dietary consultation recommended	{"medications": [{"name": "Lisinopril", "dosage": "10mg", "duration": "30 days", "frequency": "Once daily"}]}	[]	{"riskAssessment": "Moderate cardiovascular risk", "recommendations": ["Monitor BP weekly", "Reduce sodium intake", "Regular exercise"], "drugInteractions": []}	2025-11-18 03:18:39.264484
54	1	1	2	consultation	Initial Cardiac Assessment	Patient presents with mild chest discomfort. ECG shows normal sinus rhythm. Blood pressure elevated at 150/95. Recommended lifestyle modifications and continued antihypertensive therapy.	Essential Hypertension (I10)	Continue current medication, dietary consultation recommended	{"medications": [{"name": "Lisinopril", "dosage": "10mg", "duration": "30 days", "frequency": "Once daily"}]}	[]	{"riskAssessment": "Moderate cardiovascular risk", "recommendations": ["Monitor BP weekly", "Reduce sodium intake", "Regular exercise"], "drugInteractions": []}	2025-11-18 03:42:29.798589
55	1	1	2	consultation	Initial Cardiac Assessment	Patient presents with mild chest discomfort. ECG shows normal sinus rhythm. Blood pressure elevated at 150/95. Recommended lifestyle modifications and continued antihypertensive therapy.	Essential Hypertension (I10)	Continue current medication, dietary consultation recommended	{"medications": [{"name": "Lisinopril", "dosage": "10mg", "duration": "30 days", "frequency": "Once daily"}]}	[]	{"riskAssessment": "Moderate cardiovascular risk", "recommendations": ["Monitor BP weekly", "Reduce sodium intake", "Regular exercise"], "drugInteractions": []}	2025-11-18 03:49:48.554448
56	1	1	2	consultation	Initial Cardiac Assessment	Patient presents with mild chest discomfort. ECG shows normal sinus rhythm. Blood pressure elevated at 150/95. Recommended lifestyle modifications and continued antihypertensive therapy.	Essential Hypertension (I10)	Continue current medication, dietary consultation recommended	{"medications": [{"name": "Lisinopril", "dosage": "10mg", "duration": "30 days", "frequency": "Once daily"}]}	[]	{"riskAssessment": "Moderate cardiovascular risk", "recommendations": ["Monitor BP weekly", "Reduce sodium intake", "Regular exercise"], "drugInteractions": []}	2025-11-18 03:58:48.016806
57	1	3	1	vitals	Vital Signs - Nov 18, 2025 09:11	Blood Pressure: 120/80\nHeart Rate: 80 bpm\nTemperature: 42°C\nRespiratory Rate: 16/min\nOxygen Saturation: 100%\nWeight: 70 kg\nHeight: 170 cm\nBMI: 16	\N	\N	{}	[]	{}	2025-11-18 04:11:53.458931
58	1	1	2	consultation	Initial Cardiac Assessment	Patient presents with mild chest discomfort. ECG shows normal sinus rhythm. Blood pressure elevated at 150/95. Recommended lifestyle modifications and continued antihypertensive therapy.	Essential Hypertension (I10)	Continue current medication, dietary consultation recommended	{"medications": [{"name": "Lisinopril", "dosage": "10mg", "duration": "30 days", "frequency": "Once daily"}]}	[]	{"riskAssessment": "Moderate cardiovascular risk", "recommendations": ["Monitor BP weekly", "Reduce sodium intake", "Regular exercise"], "drugInteractions": []}	2025-11-18 04:20:30.025923
59	1	1	2	consultation	Initial Cardiac Assessment	Patient presents with mild chest discomfort. ECG shows normal sinus rhythm. Blood pressure elevated at 150/95. Recommended lifestyle modifications and continued antihypertensive therapy.	Essential Hypertension (I10)	Continue current medication, dietary consultation recommended	{"medications": [{"name": "Lisinopril", "dosage": "10mg", "duration": "30 days", "frequency": "Once daily"}]}	[]	{"riskAssessment": "Moderate cardiovascular risk", "recommendations": ["Monitor BP weekly", "Reduce sodium intake", "Regular exercise"], "drugInteractions": []}	2025-11-18 04:33:20.67034
60	1	1	2	consultation	Initial Cardiac Assessment	Patient presents with mild chest discomfort. ECG shows normal sinus rhythm. Blood pressure elevated at 150/95. Recommended lifestyle modifications and continued antihypertensive therapy.	Essential Hypertension (I10)	Continue current medication, dietary consultation recommended	{"medications": [{"name": "Lisinopril", "dosage": "10mg", "duration": "30 days", "frequency": "Once daily"}]}	[]	{"riskAssessment": "Moderate cardiovascular risk", "recommendations": ["Monitor BP weekly", "Reduce sodium intake", "Regular exercise"], "drugInteractions": []}	2025-11-18 04:46:47.765814
61	1	1	2	consultation	Initial Cardiac Assessment	Patient presents with mild chest discomfort. ECG shows normal sinus rhythm. Blood pressure elevated at 150/95. Recommended lifestyle modifications and continued antihypertensive therapy.	Essential Hypertension (I10)	Continue current medication, dietary consultation recommended	{"medications": [{"name": "Lisinopril", "dosage": "10mg", "duration": "30 days", "frequency": "Once daily"}]}	[]	{"riskAssessment": "Moderate cardiovascular risk", "recommendations": ["Monitor BP weekly", "Reduce sodium intake", "Regular exercise"], "drugInteractions": []}	2025-11-18 04:49:51.047521
62	1	1	2	consultation	Initial Cardiac Assessment	Patient presents with mild chest discomfort. ECG shows normal sinus rhythm. Blood pressure elevated at 150/95. Recommended lifestyle modifications and continued antihypertensive therapy.	Essential Hypertension (I10)	Continue current medication, dietary consultation recommended	{"medications": [{"name": "Lisinopril", "dosage": "10mg", "duration": "30 days", "frequency": "Once daily"}]}	[]	{"riskAssessment": "Moderate cardiovascular risk", "recommendations": ["Monitor BP weekly", "Reduce sodium intake", "Regular exercise"], "drugInteractions": []}	2025-11-18 04:54:28.49528
63	1	1	2	consultation	Initial Cardiac Assessment	Patient presents with mild chest discomfort. ECG shows normal sinus rhythm. Blood pressure elevated at 150/95. Recommended lifestyle modifications and continued antihypertensive therapy.	Essential Hypertension (I10)	Continue current medication, dietary consultation recommended	{"medications": [{"name": "Lisinopril", "dosage": "10mg", "duration": "30 days", "frequency": "Once daily"}]}	[]	{"riskAssessment": "Moderate cardiovascular risk", "recommendations": ["Monitor BP weekly", "Reduce sodium intake", "Regular exercise"], "drugInteractions": []}	2025-11-18 05:01:41.844792
64	1	1	2	consultation	Initial Cardiac Assessment	Patient presents with mild chest discomfort. ECG shows normal sinus rhythm. Blood pressure elevated at 150/95. Recommended lifestyle modifications and continued antihypertensive therapy.	Essential Hypertension (I10)	Continue current medication, dietary consultation recommended	{"medications": [{"name": "Lisinopril", "dosage": "10mg", "duration": "30 days", "frequency": "Once daily"}]}	[]	{"riskAssessment": "Moderate cardiovascular risk", "recommendations": ["Monitor BP weekly", "Reduce sodium intake", "Regular exercise"], "drugInteractions": []}	2025-11-18 05:04:21.057306
65	1	1	2	consultation	Initial Cardiac Assessment	Patient presents with mild chest discomfort. ECG shows normal sinus rhythm. Blood pressure elevated at 150/95. Recommended lifestyle modifications and continued antihypertensive therapy.	Essential Hypertension (I10)	Continue current medication, dietary consultation recommended	{"medications": [{"name": "Lisinopril", "dosage": "10mg", "duration": "30 days", "frequency": "Once daily"}]}	[]	{"riskAssessment": "Moderate cardiovascular risk", "recommendations": ["Monitor BP weekly", "Reduce sodium intake", "Regular exercise"], "drugInteractions": []}	2025-11-18 05:14:29.583292
66	1	1	2	consultation	Initial Cardiac Assessment	Patient presents with mild chest discomfort. ECG shows normal sinus rhythm. Blood pressure elevated at 150/95. Recommended lifestyle modifications and continued antihypertensive therapy.	Essential Hypertension (I10)	Continue current medication, dietary consultation recommended	{"medications": [{"name": "Lisinopril", "dosage": "10mg", "duration": "30 days", "frequency": "Once daily"}]}	[]	{"riskAssessment": "Moderate cardiovascular risk", "recommendations": ["Monitor BP weekly", "Reduce sodium intake", "Regular exercise"], "drugInteractions": []}	2025-11-18 05:16:11.018212
67	1	1	2	consultation	Initial Cardiac Assessment	Patient presents with mild chest discomfort. ECG shows normal sinus rhythm. Blood pressure elevated at 150/95. Recommended lifestyle modifications and continued antihypertensive therapy.	Essential Hypertension (I10)	Continue current medication, dietary consultation recommended	{"medications": [{"name": "Lisinopril", "dosage": "10mg", "duration": "30 days", "frequency": "Once daily"}]}	[]	{"riskAssessment": "Moderate cardiovascular risk", "recommendations": ["Monitor BP weekly", "Reduce sodium intake", "Regular exercise"], "drugInteractions": []}	2025-11-18 05:26:04.008367
68	1	1	2	consultation	Initial Cardiac Assessment	Patient presents with mild chest discomfort. ECG shows normal sinus rhythm. Blood pressure elevated at 150/95. Recommended lifestyle modifications and continued antihypertensive therapy.	Essential Hypertension (I10)	Continue current medication, dietary consultation recommended	{"medications": [{"name": "Lisinopril", "dosage": "10mg", "duration": "30 days", "frequency": "Once daily"}]}	[]	{"riskAssessment": "Moderate cardiovascular risk", "recommendations": ["Monitor BP weekly", "Reduce sodium intake", "Regular exercise"], "drugInteractions": []}	2025-11-18 05:32:56.513913
69	1	1	2	consultation	Initial Cardiac Assessment	Patient presents with mild chest discomfort. ECG shows normal sinus rhythm. Blood pressure elevated at 150/95. Recommended lifestyle modifications and continued antihypertensive therapy.	Essential Hypertension (I10)	Continue current medication, dietary consultation recommended	{"medications": [{"name": "Lisinopril", "dosage": "10mg", "duration": "30 days", "frequency": "Once daily"}]}	[]	{"riskAssessment": "Moderate cardiovascular risk", "recommendations": ["Monitor BP weekly", "Reduce sodium intake", "Regular exercise"], "drugInteractions": []}	2025-11-18 05:43:55.52124
70	1	1	2	consultation	Initial Cardiac Assessment	Patient presents with mild chest discomfort. ECG shows normal sinus rhythm. Blood pressure elevated at 150/95. Recommended lifestyle modifications and continued antihypertensive therapy.	Essential Hypertension (I10)	Continue current medication, dietary consultation recommended	{"medications": [{"name": "Lisinopril", "dosage": "10mg", "duration": "30 days", "frequency": "Once daily"}]}	[]	{"riskAssessment": "Moderate cardiovascular risk", "recommendations": ["Monitor BP weekly", "Reduce sodium intake", "Regular exercise"], "drugInteractions": []}	2025-11-18 05:47:56.150212
71	1	1	2	consultation	Initial Cardiac Assessment	Patient presents with mild chest discomfort. ECG shows normal sinus rhythm. Blood pressure elevated at 150/95. Recommended lifestyle modifications and continued antihypertensive therapy.	Essential Hypertension (I10)	Continue current medication, dietary consultation recommended	{"medications": [{"name": "Lisinopril", "dosage": "10mg", "duration": "30 days", "frequency": "Once daily"}]}	[]	{"riskAssessment": "Moderate cardiovascular risk", "recommendations": ["Monitor BP weekly", "Reduce sodium intake", "Regular exercise"], "drugInteractions": []}	2025-11-18 05:52:31.95919
72	1	1	2	consultation	Initial Cardiac Assessment	Patient presents with mild chest discomfort. ECG shows normal sinus rhythm. Blood pressure elevated at 150/95. Recommended lifestyle modifications and continued antihypertensive therapy.	Essential Hypertension (I10)	Continue current medication, dietary consultation recommended	{"medications": [{"name": "Lisinopril", "dosage": "10mg", "duration": "30 days", "frequency": "Once daily"}]}	[]	{"riskAssessment": "Moderate cardiovascular risk", "recommendations": ["Monitor BP weekly", "Reduce sodium intake", "Regular exercise"], "drugInteractions": []}	2025-11-18 06:04:15.652392
73	1	1	2	consultation	Initial Cardiac Assessment	Patient presents with mild chest discomfort. ECG shows normal sinus rhythm. Blood pressure elevated at 150/95. Recommended lifestyle modifications and continued antihypertensive therapy.	Essential Hypertension (I10)	Continue current medication, dietary consultation recommended	{"medications": [{"name": "Lisinopril", "dosage": "10mg", "duration": "30 days", "frequency": "Once daily"}]}	[]	{"riskAssessment": "Moderate cardiovascular risk", "recommendations": ["Monitor BP weekly", "Reduce sodium intake", "Regular exercise"], "drugInteractions": []}	2025-11-18 06:07:18.886692
74	1	1	2	consultation	Initial Cardiac Assessment	Patient presents with mild chest discomfort. ECG shows normal sinus rhythm. Blood pressure elevated at 150/95. Recommended lifestyle modifications and continued antihypertensive therapy.	Essential Hypertension (I10)	Continue current medication, dietary consultation recommended	{"medications": [{"name": "Lisinopril", "dosage": "10mg", "duration": "30 days", "frequency": "Once daily"}]}	[]	{"riskAssessment": "Moderate cardiovascular risk", "recommendations": ["Monitor BP weekly", "Reduce sodium intake", "Regular exercise"], "drugInteractions": []}	2025-11-18 06:08:47.519328
75	1	1	2	consultation	Initial Cardiac Assessment	Patient presents with mild chest discomfort. ECG shows normal sinus rhythm. Blood pressure elevated at 150/95. Recommended lifestyle modifications and continued antihypertensive therapy.	Essential Hypertension (I10)	Continue current medication, dietary consultation recommended	{"medications": [{"name": "Lisinopril", "dosage": "10mg", "duration": "30 days", "frequency": "Once daily"}]}	[]	{"riskAssessment": "Moderate cardiovascular risk", "recommendations": ["Monitor BP weekly", "Reduce sodium intake", "Regular exercise"], "drugInteractions": []}	2025-11-18 06:14:11.606744
76	1	1	2	consultation	Initial Cardiac Assessment	Patient presents with mild chest discomfort. ECG shows normal sinus rhythm. Blood pressure elevated at 150/95. Recommended lifestyle modifications and continued antihypertensive therapy.	Essential Hypertension (I10)	Continue current medication, dietary consultation recommended	{"medications": [{"name": "Lisinopril", "dosage": "10mg", "duration": "30 days", "frequency": "Once daily"}]}	[]	{"riskAssessment": "Moderate cardiovascular risk", "recommendations": ["Monitor BP weekly", "Reduce sodium intake", "Regular exercise"], "drugInteractions": []}	2025-11-18 06:14:59.248985
77	1	1	2	consultation	Initial Cardiac Assessment	Patient presents with mild chest discomfort. ECG shows normal sinus rhythm. Blood pressure elevated at 150/95. Recommended lifestyle modifications and continued antihypertensive therapy.	Essential Hypertension (I10)	Continue current medication, dietary consultation recommended	{"medications": [{"name": "Lisinopril", "dosage": "10mg", "duration": "30 days", "frequency": "Once daily"}]}	[]	{"riskAssessment": "Moderate cardiovascular risk", "recommendations": ["Monitor BP weekly", "Reduce sodium intake", "Regular exercise"], "drugInteractions": []}	2025-11-18 06:19:59.272767
78	1	1	2	consultation	Initial Cardiac Assessment	Patient presents with mild chest discomfort. ECG shows normal sinus rhythm. Blood pressure elevated at 150/95. Recommended lifestyle modifications and continued antihypertensive therapy.	Essential Hypertension (I10)	Continue current medication, dietary consultation recommended	{"medications": [{"name": "Lisinopril", "dosage": "10mg", "duration": "30 days", "frequency": "Once daily"}]}	[]	{"riskAssessment": "Moderate cardiovascular risk", "recommendations": ["Monitor BP weekly", "Reduce sodium intake", "Regular exercise"], "drugInteractions": []}	2025-11-18 06:22:27.152329
79	1	1	2	consultation	Initial Cardiac Assessment	Patient presents with mild chest discomfort. ECG shows normal sinus rhythm. Blood pressure elevated at 150/95. Recommended lifestyle modifications and continued antihypertensive therapy.	Essential Hypertension (I10)	Continue current medication, dietary consultation recommended	{"medications": [{"name": "Lisinopril", "dosage": "10mg", "duration": "30 days", "frequency": "Once daily"}]}	[]	{"riskAssessment": "Moderate cardiovascular risk", "recommendations": ["Monitor BP weekly", "Reduce sodium intake", "Regular exercise"], "drugInteractions": []}	2025-11-18 06:28:07.408719
80	1	1	2	consultation	Initial Cardiac Assessment	Patient presents with mild chest discomfort. ECG shows normal sinus rhythm. Blood pressure elevated at 150/95. Recommended lifestyle modifications and continued antihypertensive therapy.	Essential Hypertension (I10)	Continue current medication, dietary consultation recommended	{"medications": [{"name": "Lisinopril", "dosage": "10mg", "duration": "30 days", "frequency": "Once daily"}]}	[]	{"riskAssessment": "Moderate cardiovascular risk", "recommendations": ["Monitor BP weekly", "Reduce sodium intake", "Regular exercise"], "drugInteractions": []}	2025-11-18 06:30:20.273535
81	1	1	2	consultation	Initial Cardiac Assessment	Patient presents with mild chest discomfort. ECG shows normal sinus rhythm. Blood pressure elevated at 150/95. Recommended lifestyle modifications and continued antihypertensive therapy.	Essential Hypertension (I10)	Continue current medication, dietary consultation recommended	{"medications": [{"name": "Lisinopril", "dosage": "10mg", "duration": "30 days", "frequency": "Once daily"}]}	[]	{"riskAssessment": "Moderate cardiovascular risk", "recommendations": ["Monitor BP weekly", "Reduce sodium intake", "Regular exercise"], "drugInteractions": []}	2025-11-18 06:35:51.781223
82	1	1	2	consultation	Initial Cardiac Assessment	Patient presents with mild chest discomfort. ECG shows normal sinus rhythm. Blood pressure elevated at 150/95. Recommended lifestyle modifications and continued antihypertensive therapy.	Essential Hypertension (I10)	Continue current medication, dietary consultation recommended	{"medications": [{"name": "Lisinopril", "dosage": "10mg", "duration": "30 days", "frequency": "Once daily"}]}	[]	{"riskAssessment": "Moderate cardiovascular risk", "recommendations": ["Monitor BP weekly", "Reduce sodium intake", "Regular exercise"], "drugInteractions": []}	2025-11-18 06:41:43.448507
83	1	1	2	consultation	Initial Cardiac Assessment	Patient presents with mild chest discomfort. ECG shows normal sinus rhythm. Blood pressure elevated at 150/95. Recommended lifestyle modifications and continued antihypertensive therapy.	Essential Hypertension (I10)	Continue current medication, dietary consultation recommended	{"medications": [{"name": "Lisinopril", "dosage": "10mg", "duration": "30 days", "frequency": "Once daily"}]}	[]	{"riskAssessment": "Moderate cardiovascular risk", "recommendations": ["Monitor BP weekly", "Reduce sodium intake", "Regular exercise"], "drugInteractions": []}	2025-11-18 06:43:40.734813
84	1	1	2	consultation	Initial Cardiac Assessment	Patient presents with mild chest discomfort. ECG shows normal sinus rhythm. Blood pressure elevated at 150/95. Recommended lifestyle modifications and continued antihypertensive therapy.	Essential Hypertension (I10)	Continue current medication, dietary consultation recommended	{"medications": [{"name": "Lisinopril", "dosage": "10mg", "duration": "30 days", "frequency": "Once daily"}]}	[]	{"riskAssessment": "Moderate cardiovascular risk", "recommendations": ["Monitor BP weekly", "Reduce sodium intake", "Regular exercise"], "drugInteractions": []}	2025-11-18 06:47:49.667007
85	1	1	2	consultation	Initial Cardiac Assessment	Patient presents with mild chest discomfort. ECG shows normal sinus rhythm. Blood pressure elevated at 150/95. Recommended lifestyle modifications and continued antihypertensive therapy.	Essential Hypertension (I10)	Continue current medication, dietary consultation recommended	{"medications": [{"name": "Lisinopril", "dosage": "10mg", "duration": "30 days", "frequency": "Once daily"}]}	[]	{"riskAssessment": "Moderate cardiovascular risk", "recommendations": ["Monitor BP weekly", "Reduce sodium intake", "Regular exercise"], "drugInteractions": []}	2025-11-18 07:09:30.12533
86	1	1	2	consultation	Initial Cardiac Assessment	Patient presents with mild chest discomfort. ECG shows normal sinus rhythm. Blood pressure elevated at 150/95. Recommended lifestyle modifications and continued antihypertensive therapy.	Essential Hypertension (I10)	Continue current medication, dietary consultation recommended	{"medications": [{"name": "Lisinopril", "dosage": "10mg", "duration": "30 days", "frequency": "Once daily"}]}	[]	{"riskAssessment": "Moderate cardiovascular risk", "recommendations": ["Monitor BP weekly", "Reduce sodium intake", "Regular exercise"], "drugInteractions": []}	2025-11-18 07:12:42.940923
87	1	1	2	consultation	Initial Cardiac Assessment	Patient presents with mild chest discomfort. ECG shows normal sinus rhythm. Blood pressure elevated at 150/95. Recommended lifestyle modifications and continued antihypertensive therapy.	Essential Hypertension (I10)	Continue current medication, dietary consultation recommended	{"medications": [{"name": "Lisinopril", "dosage": "10mg", "duration": "30 days", "frequency": "Once daily"}]}	[]	{"riskAssessment": "Moderate cardiovascular risk", "recommendations": ["Monitor BP weekly", "Reduce sodium intake", "Regular exercise"], "drugInteractions": []}	2025-11-18 07:14:08.988897
88	1	1	2	consultation	Initial Cardiac Assessment	Patient presents with mild chest discomfort. ECG shows normal sinus rhythm. Blood pressure elevated at 150/95. Recommended lifestyle modifications and continued antihypertensive therapy.	Essential Hypertension (I10)	Continue current medication, dietary consultation recommended	{"medications": [{"name": "Lisinopril", "dosage": "10mg", "duration": "30 days", "frequency": "Once daily"}]}	[]	{"riskAssessment": "Moderate cardiovascular risk", "recommendations": ["Monitor BP weekly", "Reduce sodium intake", "Regular exercise"], "drugInteractions": []}	2025-11-18 07:15:52.501155
89	1	1	2	consultation	Initial Cardiac Assessment	Patient presents with mild chest discomfort. ECG shows normal sinus rhythm. Blood pressure elevated at 150/95. Recommended lifestyle modifications and continued antihypertensive therapy.	Essential Hypertension (I10)	Continue current medication, dietary consultation recommended	{"medications": [{"name": "Lisinopril", "dosage": "10mg", "duration": "30 days", "frequency": "Once daily"}]}	[]	{"riskAssessment": "Moderate cardiovascular risk", "recommendations": ["Monitor BP weekly", "Reduce sodium intake", "Regular exercise"], "drugInteractions": []}	2025-11-18 07:17:56.388784
90	1	1	2	consultation	Initial Cardiac Assessment	Patient presents with mild chest discomfort. ECG shows normal sinus rhythm. Blood pressure elevated at 150/95. Recommended lifestyle modifications and continued antihypertensive therapy.	Essential Hypertension (I10)	Continue current medication, dietary consultation recommended	{"medications": [{"name": "Lisinopril", "dosage": "10mg", "duration": "30 days", "frequency": "Once daily"}]}	[]	{"riskAssessment": "Moderate cardiovascular risk", "recommendations": ["Monitor BP weekly", "Reduce sodium intake", "Regular exercise"], "drugInteractions": []}	2025-11-18 07:20:37.221191
91	1	1	2	consultation	Initial Cardiac Assessment	Patient presents with mild chest discomfort. ECG shows normal sinus rhythm. Blood pressure elevated at 150/95. Recommended lifestyle modifications and continued antihypertensive therapy.	Essential Hypertension (I10)	Continue current medication, dietary consultation recommended	{"medications": [{"name": "Lisinopril", "dosage": "10mg", "duration": "30 days", "frequency": "Once daily"}]}	[]	{"riskAssessment": "Moderate cardiovascular risk", "recommendations": ["Monitor BP weekly", "Reduce sodium intake", "Regular exercise"], "drugInteractions": []}	2025-11-18 07:21:51.925244
92	1	1	2	consultation	Initial Cardiac Assessment	Patient presents with mild chest discomfort. ECG shows normal sinus rhythm. Blood pressure elevated at 150/95. Recommended lifestyle modifications and continued antihypertensive therapy.	Essential Hypertension (I10)	Continue current medication, dietary consultation recommended	{"medications": [{"name": "Lisinopril", "dosage": "10mg", "duration": "30 days", "frequency": "Once daily"}]}	[]	{"riskAssessment": "Moderate cardiovascular risk", "recommendations": ["Monitor BP weekly", "Reduce sodium intake", "Regular exercise"], "drugInteractions": []}	2025-11-18 07:44:58.193381
93	1	1	2	consultation	Initial Cardiac Assessment	Patient presents with mild chest discomfort. ECG shows normal sinus rhythm. Blood pressure elevated at 150/95. Recommended lifestyle modifications and continued antihypertensive therapy.	Essential Hypertension (I10)	Continue current medication, dietary consultation recommended	{"medications": [{"name": "Lisinopril", "dosage": "10mg", "duration": "30 days", "frequency": "Once daily"}]}	[]	{"riskAssessment": "Moderate cardiovascular risk", "recommendations": ["Monitor BP weekly", "Reduce sodium intake", "Regular exercise"], "drugInteractions": []}	2025-11-18 07:46:25.708341
94	1	1	2	consultation	Initial Cardiac Assessment	Patient presents with mild chest discomfort. ECG shows normal sinus rhythm. Blood pressure elevated at 150/95. Recommended lifestyle modifications and continued antihypertensive therapy.	Essential Hypertension (I10)	Continue current medication, dietary consultation recommended	{"medications": [{"name": "Lisinopril", "dosage": "10mg", "duration": "30 days", "frequency": "Once daily"}]}	[]	{"riskAssessment": "Moderate cardiovascular risk", "recommendations": ["Monitor BP weekly", "Reduce sodium intake", "Regular exercise"], "drugInteractions": []}	2025-11-18 07:52:00.202823
95	1	1	2	consultation	Initial Cardiac Assessment	Patient presents with mild chest discomfort. ECG shows normal sinus rhythm. Blood pressure elevated at 150/95. Recommended lifestyle modifications and continued antihypertensive therapy.	Essential Hypertension (I10)	Continue current medication, dietary consultation recommended	{"medications": [{"name": "Lisinopril", "dosage": "10mg", "duration": "30 days", "frequency": "Once daily"}]}	[]	{"riskAssessment": "Moderate cardiovascular risk", "recommendations": ["Monitor BP weekly", "Reduce sodium intake", "Regular exercise"], "drugInteractions": []}	2025-11-18 07:54:01.271973
96	1	1	2	consultation	Initial Cardiac Assessment	Patient presents with mild chest discomfort. ECG shows normal sinus rhythm. Blood pressure elevated at 150/95. Recommended lifestyle modifications and continued antihypertensive therapy.	Essential Hypertension (I10)	Continue current medication, dietary consultation recommended	{"medications": [{"name": "Lisinopril", "dosage": "10mg", "duration": "30 days", "frequency": "Once daily"}]}	[]	{"riskAssessment": "Moderate cardiovascular risk", "recommendations": ["Monitor BP weekly", "Reduce sodium intake", "Regular exercise"], "drugInteractions": []}	2025-11-18 07:55:45.831467
97	1	1	2	consultation	Initial Cardiac Assessment	Patient presents with mild chest discomfort. ECG shows normal sinus rhythm. Blood pressure elevated at 150/95. Recommended lifestyle modifications and continued antihypertensive therapy.	Essential Hypertension (I10)	Continue current medication, dietary consultation recommended	{"medications": [{"name": "Lisinopril", "dosage": "10mg", "duration": "30 days", "frequency": "Once daily"}]}	[]	{"riskAssessment": "Moderate cardiovascular risk", "recommendations": ["Monitor BP weekly", "Reduce sodium intake", "Regular exercise"], "drugInteractions": []}	2025-11-18 08:01:47.912487
98	1	1	2	consultation	Initial Cardiac Assessment	Patient presents with mild chest discomfort. ECG shows normal sinus rhythm. Blood pressure elevated at 150/95. Recommended lifestyle modifications and continued antihypertensive therapy.	Essential Hypertension (I10)	Continue current medication, dietary consultation recommended	{"medications": [{"name": "Lisinopril", "dosage": "10mg", "duration": "30 days", "frequency": "Once daily"}]}	[]	{"riskAssessment": "Moderate cardiovascular risk", "recommendations": ["Monitor BP weekly", "Reduce sodium intake", "Regular exercise"], "drugInteractions": []}	2025-11-18 08:02:56.111039
99	1	1	2	consultation	Initial Cardiac Assessment	Patient presents with mild chest discomfort. ECG shows normal sinus rhythm. Blood pressure elevated at 150/95. Recommended lifestyle modifications and continued antihypertensive therapy.	Essential Hypertension (I10)	Continue current medication, dietary consultation recommended	{"medications": [{"name": "Lisinopril", "dosage": "10mg", "duration": "30 days", "frequency": "Once daily"}]}	[]	{"riskAssessment": "Moderate cardiovascular risk", "recommendations": ["Monitor BP weekly", "Reduce sodium intake", "Regular exercise"], "drugInteractions": []}	2025-11-18 08:04:35.233852
100	1	1	2	consultation	Initial Cardiac Assessment	Patient presents with mild chest discomfort. ECG shows normal sinus rhythm. Blood pressure elevated at 150/95. Recommended lifestyle modifications and continued antihypertensive therapy.	Essential Hypertension (I10)	Continue current medication, dietary consultation recommended	{"medications": [{"name": "Lisinopril", "dosage": "10mg", "duration": "30 days", "frequency": "Once daily"}]}	[]	{"riskAssessment": "Moderate cardiovascular risk", "recommendations": ["Monitor BP weekly", "Reduce sodium intake", "Regular exercise"], "drugInteractions": []}	2025-11-18 08:09:39.584428
101	1	1	2	consultation	Initial Cardiac Assessment	Patient presents with mild chest discomfort. ECG shows normal sinus rhythm. Blood pressure elevated at 150/95. Recommended lifestyle modifications and continued antihypertensive therapy.	Essential Hypertension (I10)	Continue current medication, dietary consultation recommended	{"medications": [{"name": "Lisinopril", "dosage": "10mg", "duration": "30 days", "frequency": "Once daily"}]}	[]	{"riskAssessment": "Moderate cardiovascular risk", "recommendations": ["Monitor BP weekly", "Reduce sodium intake", "Regular exercise"], "drugInteractions": []}	2025-11-18 08:14:02.807292
102	1	1	2	consultation	Initial Cardiac Assessment	Patient presents with mild chest discomfort. ECG shows normal sinus rhythm. Blood pressure elevated at 150/95. Recommended lifestyle modifications and continued antihypertensive therapy.	Essential Hypertension (I10)	Continue current medication, dietary consultation recommended	{"medications": [{"name": "Lisinopril", "dosage": "10mg", "duration": "30 days", "frequency": "Once daily"}]}	[]	{"riskAssessment": "Moderate cardiovascular risk", "recommendations": ["Monitor BP weekly", "Reduce sodium intake", "Regular exercise"], "drugInteractions": []}	2025-11-18 08:17:32.157467
103	1	1	2	consultation	Initial Cardiac Assessment	Patient presents with mild chest discomfort. ECG shows normal sinus rhythm. Blood pressure elevated at 150/95. Recommended lifestyle modifications and continued antihypertensive therapy.	Essential Hypertension (I10)	Continue current medication, dietary consultation recommended	{"medications": [{"name": "Lisinopril", "dosage": "10mg", "duration": "30 days", "frequency": "Once daily"}]}	[]	{"riskAssessment": "Moderate cardiovascular risk", "recommendations": ["Monitor BP weekly", "Reduce sodium intake", "Regular exercise"], "drugInteractions": []}	2025-11-18 08:23:10.335568
104	1	1	2	consultation	Initial Cardiac Assessment	Patient presents with mild chest discomfort. ECG shows normal sinus rhythm. Blood pressure elevated at 150/95. Recommended lifestyle modifications and continued antihypertensive therapy.	Essential Hypertension (I10)	Continue current medication, dietary consultation recommended	{"medications": [{"name": "Lisinopril", "dosage": "10mg", "duration": "30 days", "frequency": "Once daily"}]}	[]	{"riskAssessment": "Moderate cardiovascular risk", "recommendations": ["Monitor BP weekly", "Reduce sodium intake", "Regular exercise"], "drugInteractions": []}	2025-11-18 08:23:49.467074
\.


--
-- Data for Name: medications_database; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.medications_database (id, organization_id, name, category, dosage, interactions, warnings, severity, is_active, created_at) FROM stdin;
\.


--
-- Data for Name: message_campaigns; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.message_campaigns (id, organization_id, name, type, status, subject, content, template, recipient_count, sent_count, open_rate, click_rate, scheduled_at, sent_at, created_by, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: message_templates; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.message_templates (id, organization_id, name, category, subject, content, usage_count, created_by, created_at, updated_at) FROM stdin;
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
1	1	2	Lab Results Available	Blood work results for Sarah Johnson are now available for review.	lab_result	normal	unread	patient	1	/patients/1/lab-results	t	\N	\N	{"icon": "Activity", "color": "blue", "urgency": "medium", "patientId": 1, "department": "Laboratory", "patientName": "Sarah Johnson"}	\N	\N	2025-11-17 08:46:46.048402	2025-11-17 08:46:46.048402
2	1	2	Appointment Reminder	Upcoming appointment with Sarah Johnson tomorrow at 10:00 AM.	appointment_reminder	high	unread	appointment	912	/calendar	t	\N	\N	{"icon": "Calendar", "color": "orange", "urgency": "high", "patientId": 1, "department": "Cardiology", "patientName": "Sarah Johnson", "appointmentId": 912}	\N	\N	2025-11-17 08:46:46.048402	2025-11-17 08:46:46.048402
3	1	1	Critical Drug Interaction Alert	Potential interaction detected between Warfarin and Aspirin for patient Robert Davis.	prescription_alert	critical	unread	patient	2	/patients/2/prescriptions	t	\N	\N	{"icon": "AlertTriangle", "color": "red", "urgency": "critical", "patientId": 2, "department": "Pharmacy", "patientName": "Robert Davis", "requiresResponse": true}	\N	\N	2025-11-17 08:46:46.048402	2025-11-17 08:46:46.048402
4	1	3	Patient Message	Sarah Johnson has sent a message regarding her medication side effects.	message	normal	read	patient	1	/messaging/conversations/1	t	\N	\N	{"icon": "MessageSquare", "color": "green", "urgency": "medium", "patientId": 1, "department": "General", "patientName": "Sarah Johnson"}	2025-11-17 06:46:45.926	\N	2025-11-17 08:46:46.048402	2025-11-17 08:46:46.048402
5	1	2	System Maintenance Alert	Scheduled system maintenance will occur tonight from 2:00 AM - 4:00 AM.	system_alert	low	unread	\N	\N	\N	f	\N	\N	{"icon": "Settings", "color": "gray", "urgency": "low", "department": "IT", "autoMarkAsRead": true}	\N	\N	2025-11-17 08:46:46.048402	2025-11-17 08:46:46.048402
6	1	1	Lab Results Completed	Complete Blood Count (CBC) results for Alice Williams are ready.	lab_result	normal	unread	\N	\N	/lab-results	t	\N	\N	{"patientId": 1, "department": "Laboratory", "patientName": "Alice Williams"}	\N	\N	2025-11-17 10:50:20.127823	2025-11-17 10:50:20.127823
7	1	1	Lab Results Completed	Hormonal tests (Cortisol, ACTH) results for Alice Williams are ready.	lab_result	normal	unread	\N	\N	/lab-results	t	\N	\N	{"patientId": 1, "department": "Laboratory", "patientName": "Alice Williams"}	\N	\N	2025-11-17 11:13:51.84621	2025-11-17 11:13:51.84621
8	1	1	Lab Results Completed	Viral Panels / PCR Tests (e.g. COVID-19, Influenza) | Hormonal tests (Cortisol, ACTH) results for Alice Williams are ready.	lab_result	normal	unread	\N	\N	/lab-results	t	\N	\N	{"patientId": 1, "department": "Laboratory", "patientName": "Alice Williams"}	\N	\N	2025-11-17 11:33:09.800335	2025-11-17 11:33:09.800335
9	1	1	Lab Results Completed	Viral Panels / PCR Tests (e.g. COVID-19, Influenza) | Hormonal tests (Cortisol, ACTH) results for Alice Williams are ready.	lab_result	normal	unread	\N	\N	/lab-results	t	\N	\N	{"patientId": 1, "department": "Laboratory", "patientName": "Alice Williams"}	\N	\N	2025-11-17 11:49:34.105861	2025-11-17 11:49:34.105861
10	1	2	New Appointment Scheduled	New appointment with John Patient scheduled for 17 Nov 2025 at 22:45.	appointment_reminder	normal	unread	\N	\N	/calendar	t	\N	\N	{"patientId": 3, "department": "General", "patientName": "John Patient", "appointmentId": 1}	\N	\N	2025-11-17 17:43:15.194604	2025-11-17 17:43:15.194604
11	1	2	New Appointment Scheduled	New appointment with John Patient scheduled for 19 Nov 2025 at 00:00.	appointment_reminder	normal	unread	\N	\N	/calendar	t	\N	\N	{"patientId": 3, "department": "General", "patientName": "John Patient", "appointmentId": 2}	\N	\N	2025-11-17 17:51:19.518577	2025-11-17 17:51:19.518577
12	1	2	Appointment Reminder	Upcoming appointment with John Patient tomorrow (Wednesday, 19 Nov 2025) at 00:00.	appointment_reminder	normal	unread	\N	\N	/calendar	t	\N	\N	{"patientId": 3, "department": "Appointments", "patientName": "John Patient", "appointmentId": 2}	\N	\N	2025-11-17 17:57:25.709026	2025-11-17 17:57:25.709026
13	1	2	New Appointment Scheduled	New appointment with John Patient scheduled for 27 Nov 2025 at 01:00.	appointment_reminder	normal	unread	\N	\N	/calendar	t	\N	\N	{"patientId": 3, "department": "General", "patientName": "John Patient", "appointmentId": 3}	\N	\N	2025-11-18 08:00:39.309566	2025-11-18 08:00:39.309566
\.


--
-- Data for Name: organizations; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.organizations (id, name, subdomain, email, region, brand_name, settings, features, access_level, subscription_status, created_at, updated_at) FROM stdin;
1	EMRSoft Healthcare	cura	admin@emrsoft.ai	UK	EMRSoft	{"billing": {"currency": "EUR"}}	"{\\"billingEnabled\\":true,\\"aiEnabled\\":true,\\"telemedicineEnabled\\":false,\\"analyticsEnabled\\":true,\\"maxPatients\\":11,\\"maxUsers\\":11}"	full	active	2025-11-17 08:46:29.901234	2025-11-18 08:28:50.993
\.


--
-- Data for Name: password_reset_tokens; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.password_reset_tokens (id, user_id, token, expires_at, is_used, created_at) FROM stdin;
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

COPY public.patients (id, organization_id, user_id, patient_id, first_name, last_name, date_of_birth, gender_at_birth, email, phone, nhs_number, address, insurance_info, emergency_contact, medical_history, risk_level, flags, communication_preferences, is_active, is_insured, created_by, created_at, updated_at) FROM stdin;
1	1	\N	P001	Alice	Williams	1985-03-15	\N	alice.williams@email.com	+44 7700 900123	123 456 7890	{"city": "London", "state": "Greater London", "street": "123 Main Street", "country": "UK", "postcode": "SW1A 1AA"}	{}	{"name": "Bob Williams", "phone": "+44 7700 900124", "relationship": "Spouse"}	{"allergies": ["Penicillin", "Nuts"], "medications": ["Lisinopril 10mg"], "chronicConditions": ["Hypertension"]}	medium	{}	{}	t	f	\N	2025-11-17 08:46:45.086152	2025-11-17 08:46:45.086152
2	1	\N	P002	Robert	Davis	1970-07-22	\N	robert.davis@email.com	+44 7700 900125	234 567 8901	{"city": "Manchester", "state": "Greater Manchester", "street": "456 Oak Avenue", "country": "UK", "postcode": "M1 1AA"}	{}	{"name": "Susan Davis", "phone": "+44 7700 900126", "relationship": "Spouse"}	{"allergies": ["Shellfish"], "medications": ["Metformin 500mg", "Simvastatin 20mg"], "chronicConditions": ["Diabetes Type 2", "High Cholesterol"]}	high	{}	{}	t	f	\N	2025-11-17 08:46:45.086152	2025-11-17 08:46:45.086152
3	1	\N	P000003	John	Patient	2013-05-04	Female	john@emrsoft.ai	+44 4567897654		{"city": "", "state": "", "street": "", "country": "United Kingdom", "postcode": ""}	{"planType": "", "provider": "", "memberNumber": "", "policyNumber": "", "effectiveDate": ""}	{"name": "", "email": "", "phone": "", "relationship": ""}	{"allergies": ["Milk", "Fish"], "medications": [], "familyHistory": {"father": [], "mother": [], "siblings": [], "grandparents": []}, "immunizations": [], "socialHistory": {"drugs": {"status": "never"}, "alcohol": {"status": "never"}, "smoking": {"status": "never"}, "exercise": {"frequency": "none"}, "education": "", "occupation": "", "maritalStatus": "single"}, "chronicConditions": ["Atrial fibrillation", "Asthma"]}	low	{}	{}	t	f	\N	2025-11-17 17:30:25.424068	2025-11-18 04:12:45.699
\.


--
-- Data for Name: payments; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.payments (id, organization_id, invoice_id, patient_id, transaction_id, amount, currency, payment_method, payment_provider, payment_status, payment_date, metadata, created_at, updated_at) FROM stdin;
1	1	1	P001	CASH-1763371554902-5GFQX8	50.00	GBP	cash	manual	completed	2025-11-17 09:25:54.902	{"patientName": "Alice Williams"}	2025-11-17 09:25:55.019426	2025-11-17 09:25:55.019426
2	1	2	P001	TXN-1763372490369-3cj5nv2ve	1.20	GBP	Cash	cash	completed	2025-11-17 09:41:30.369	{}	2025-11-17 09:41:30.136572	2025-11-17 09:41:30.136572
3	1	3	P001	TXN-1763375893334-jlohj8p10	1.20	GBP	Cash	cash	completed	2025-11-17 10:38:13.334	{}	2025-11-17 10:38:13.067488	2025-11-17 10:38:13.067488
4	1	4	P001	CASH-1763377458969-SD21GH	20.00	GBP	cash	manual	completed	2025-11-17 11:04:18.969	{"patientName": "Alice Williams"}	2025-11-17 11:04:19.089726	2025-11-17 11:04:19.089726
5	1	5	P001	CASH-1763379100284-YEJSAE	22.00	GBP	cash	manual	completed	2025-11-17 11:31:40.284	{"patientName": "Alice Williams"}	2025-11-17 11:31:40.401386	2025-11-17 11:31:40.401386
6	1	6	P001	TXN-1763379694013-lebc9twbk	1.20	GBP	Cash	cash	completed	2025-11-17 11:41:34.013	{}	2025-11-17 11:41:33.727663	2025-11-17 11:41:33.727663
7	1	7	P001	CASH-1763380116151-5QA52	22.00	GBP	cash	manual	completed	2025-11-17 11:48:36.151	{"patientName": "Alice Williams"}	2025-11-17 11:48:36.273116	2025-11-17 11:48:36.273116
8	1	9	P000003	CASH-1763400718917-UCJDOM	20.00	GBP	cash	manual	completed	2025-11-17 17:31:58.917	{"patientName": "John Patient"}	2025-11-17 17:31:59.035582	2025-11-17 17:31:59.035582
9	1	11	P000003	pi_3SUWgZCOiYI0VhxF1Js8bGR9	50.00	GBP	online	stripe	completed	2025-11-17 18:01:05.883	{"stripePaymentIntentId": "pi_3SUWgZCOiYI0VhxF1Js8bGR9"}	2025-11-17 18:01:06.001993	2025-11-17 18:01:06.001993
10	1	13	P000003	CASH-1763403296155-ZU8IS9	20.00	GBP	cash	manual	completed	2025-11-17 18:14:56.155	{"patientName": "John Patient"}	2025-11-17 18:14:56.269828	2025-11-17 18:14:56.269828
11	1	14	P000003	CASH-1763403516303-46H9NC	20.00	GBP	cash	manual	completed	2025-11-17 18:18:36.303	{"patientName": "John Patient"}	2025-11-17 18:18:36.432368	2025-11-17 18:18:36.432368
12	1	15	P000003	CASH-1763403637693-YKEKW	20.00	GBP	cash	manual	completed	2025-11-17 18:20:37.693	{"patientName": "John Patient"}	2025-11-17 18:20:37.81583	2025-11-17 18:20:37.81583
13	1	16	P000003	CASH-1763404966005-332D7P	20.00	GBP	debit_card	manual	completed	2025-11-17 18:42:46.005	{"patientName": "John Patient"}	2025-11-17 18:42:46.134685	2025-11-17 18:42:46.134685
14	1	20	P000003	CASH-1763408541359-FXY2P	20.00	GBP	credit_card	manual	completed	2025-11-17 19:42:21.359	{"patientName": "John Patient"}	2025-11-17 19:42:21.483777	2025-11-17 19:42:21.483777
15	1	22	P000003	CASH-1763454368048-CS0DTF	20.00	GBP	debit_card	manual	completed	2025-11-18 08:26:08.048	{"patientName": "John Patient"}	2025-11-18 08:26:08.175764	2025-11-18 08:26:08.175764
\.


--
-- Data for Name: prescriptions; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.prescriptions (id, organization_id, patient_id, doctor_id, prescription_created_by, consultation_id, prescription_number, status, diagnosis, medication_name, dosage, frequency, duration, instructions, issued_date, medications, pharmacy, prescribed_at, valid_until, notes, is_electronic, interactions, signature, created_at, updated_at) FROM stdin;
1	1	1	2	\N	\N	RX-1763369207395-001	active	Hypertension	Lisinopril	10mg	Once daily	30 days	Take with or without food. Monitor blood pressure.	2025-11-17 08:46:47.511518	[{"name": "Lisinopril", "dosage": "10mg", "refills": 5, "duration": "30 days", "quantity": 30, "frequency": "Once daily", "instructions": "Take with or without food. Monitor blood pressure.", "genericAllowed": true}]	{"name": "City Pharmacy", "phone": "+44 20 7946 0958", "address": "123 Main St, London"}	2025-11-17 08:46:47.511518	\N	Patient tolerates ACE inhibitors well	t	[]	{}	2025-11-17 08:46:47.511518	2025-11-17 08:46:47.511518
2	1	2	2	\N	\N	RX-1763369207395-002	active	Type 2 Diabetes	Metformin	500mg	Twice daily with meals	90 days	Take with breakfast and dinner	2025-11-17 08:46:47.511518	[{"name": "Metformin", "dosage": "500mg", "refills": 3, "duration": "90 days", "quantity": 180, "frequency": "Twice daily with meals", "instructions": "Take with breakfast and dinner", "genericAllowed": true}]	{"name": "EMRSoft Health", "email": "quratulain009911@outlook.com", "phone": "+92 51 2345 6789", "address": "45 Blue Area, G-6/3, Islamabad, Pakistan, Pakistan"}	2025-11-17 08:46:47.511518	\N	Monitor blood glucose levels	t	[]	{}	2025-11-17 08:46:47.511518	2025-11-17 08:46:47.511518
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
-- Data for Name: risk_assessments; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.risk_assessments (id, organization_id, patient_id, category, risk_score, risk_level, risk_factors, recommendations, based_on_lab_results, has_critical_values, assessment_date, created_at) FROM stdin;
1	1	1	Cardiovascular Disease	7.00	moderate	["Critical lab values detected"]	["Blood pressure control", "Regular cardiovascular screening"]	[{"flag": "HIGH", "unit": "%", "value": "8.5", "status": "abnormal_high", "testId": "A1C004", "testName": "Hemoglobin A1C", "referenceRange": "< 7.0"}, {"unit": "×10³/µL", "value": "7.2", "status": "normal", "testId": "CBC001", "testName": "White Blood Cell Count", "referenceRange": "4.0-11.0"}, {"unit": "×10⁶/µL", "value": "4.5", "status": "normal", "testId": "CBC001", "testName": "Red Blood Cell Count", "referenceRange": "4.2-5.4"}, {"unit": "g/dL", "value": "14.2", "status": "normal", "testId": "CBC001", "testName": "Hemoglobin", "referenceRange": "12.0-16.0"}]	t	2025-11-17 08:50:52.985	2025-11-17 08:50:53.109014
2	1	1	Diabetes	8.00	high	["Elevated HbA1c"]	["Diabetes management", "Annual glucose screening", "Weight management", "Diet counseling"]	[{"flag": "HIGH", "unit": "%", "value": "8.5", "status": "abnormal_high", "testId": "A1C004", "testName": "Hemoglobin A1C", "referenceRange": "< 7.0"}, {"unit": "×10³/µL", "value": "7.2", "status": "normal", "testId": "CBC001", "testName": "White Blood Cell Count", "referenceRange": "4.0-11.0"}, {"unit": "×10⁶/µL", "value": "4.5", "status": "normal", "testId": "CBC001", "testName": "Red Blood Cell Count", "referenceRange": "4.2-5.4"}, {"unit": "g/dL", "value": "14.2", "status": "normal", "testId": "CBC001", "testName": "Hemoglobin", "referenceRange": "12.0-16.0"}]	t	2025-11-17 08:50:53.233	2025-11-17 08:50:53.356944
3	1	2	Cardiovascular Disease	10.00	high	["Elevated glucose", "Critical lab values detected"]	["Blood pressure control", "Regular cardiovascular screening"]	[{"flag": "HIGH", "unit": "mg/dL", "value": "245", "status": "abnormal_high", "testId": "GLU002", "testName": "Glucose", "referenceRange": "70-99"}]	t	2025-11-17 08:50:53.476	2025-11-17 08:50:53.605684
4	1	2	Diabetes	8.00	high	["High fasting glucose"]	["Immediate diabetes workup", "Annual glucose screening", "Weight management", "Diet counseling"]	[{"flag": "HIGH", "unit": "mg/dL", "value": "245", "status": "abnormal_high", "testId": "GLU002", "testName": "Glucose", "referenceRange": "70-99"}]	t	2025-11-17 08:50:53.725	2025-11-17 08:50:54.302719
5	1	1	Cardiovascular Disease	7.00	moderate	["Critical lab values detected"]	["Blood pressure control", "Regular cardiovascular screening"]	[{"flag": "HIGH", "unit": "%", "value": "8.5", "status": "abnormal_high", "testId": "A1C004", "testName": "Hemoglobin A1C", "referenceRange": "< 7.0"}, {"unit": "×10³/µL", "value": "7.2", "status": "normal", "testId": "CBC001", "testName": "White Blood Cell Count", "referenceRange": "4.0-11.0"}, {"unit": "×10⁶/µL", "value": "4.5", "status": "normal", "testId": "CBC001", "testName": "Red Blood Cell Count", "referenceRange": "4.2-5.4"}, {"unit": "g/dL", "value": "14.2", "status": "normal", "testId": "CBC001", "testName": "Hemoglobin", "referenceRange": "12.0-16.0"}]	t	2025-11-17 10:44:42.722	2025-11-17 10:44:42.84398
6	1	1	Diabetes	8.00	high	["Elevated HbA1c"]	["Diabetes management", "Annual glucose screening", "Weight management", "Diet counseling"]	[{"flag": "HIGH", "unit": "%", "value": "8.5", "status": "abnormal_high", "testId": "A1C004", "testName": "Hemoglobin A1C", "referenceRange": "< 7.0"}, {"unit": "×10³/µL", "value": "7.2", "status": "normal", "testId": "CBC001", "testName": "White Blood Cell Count", "referenceRange": "4.0-11.0"}, {"unit": "×10⁶/µL", "value": "4.5", "status": "normal", "testId": "CBC001", "testName": "Red Blood Cell Count", "referenceRange": "4.2-5.4"}, {"unit": "g/dL", "value": "14.2", "status": "normal", "testId": "CBC001", "testName": "Hemoglobin", "referenceRange": "12.0-16.0"}]	t	2025-11-17 10:44:42.994	2025-11-17 10:44:43.117339
7	1	2	Cardiovascular Disease	10.00	high	["Elevated glucose", "Critical lab values detected"]	["Blood pressure control", "Regular cardiovascular screening"]	[{"flag": "HIGH", "unit": "mg/dL", "value": "245", "status": "abnormal_high", "testId": "GLU002", "testName": "Glucose", "referenceRange": "70-99"}]	t	2025-11-17 10:44:43.245	2025-11-17 10:44:43.365867
8	1	2	Diabetes	8.00	high	["High fasting glucose"]	["Immediate diabetes workup", "Annual glucose screening", "Weight management", "Diet counseling"]	[{"flag": "HIGH", "unit": "mg/dL", "value": "245", "status": "abnormal_high", "testId": "GLU002", "testName": "Glucose", "referenceRange": "70-99"}]	t	2025-11-17 10:44:43.489	2025-11-17 10:44:43.609961
9	1	1	Cardiovascular Disease	7.00	moderate	["Critical lab values detected"]	["Blood pressure control", "Regular cardiovascular screening"]	[{"unit": "g/dL", "value": "2", "status": "normal", "testId": "LAB1763371546407HTB66", "testName": "Complete Blood Count (CBC) - Hemoglobin (Hb)", "referenceRange": "13.0 - 17.0"}, {"unit": "x10³/L", "value": "2", "status": "normal", "testId": "LAB1763371546407HTB66", "testName": "Complete Blood Count (CBC) - Total WBC Count", "referenceRange": "4.0 - 10.0"}, {"unit": "x10¹²/L", "value": "2", "status": "normal", "testId": "LAB1763371546407HTB66", "testName": "Complete Blood Count (CBC) - RBC Count", "referenceRange": "4.5 - 5.9"}, {"unit": "%", "value": "2", "status": "normal", "testId": "LAB1763371546407HTB66", "testName": "Complete Blood Count (CBC) - Hematocrit (HCT/PCV)", "referenceRange": "40 - 50"}, {"unit": "fL", "value": "2", "status": "normal", "testId": "LAB1763371546407HTB66", "testName": "Complete Blood Count (CBC) - MCV", "referenceRange": "80 - 96"}]	t	2025-11-17 10:57:32.358	2025-11-17 10:57:32.479162
10	1	1	Diabetes	8.00	high	["Elevated HbA1c"]	["Diabetes management", "Annual glucose screening", "Weight management", "Diet counseling"]	[{"unit": "g/dL", "value": "2", "status": "normal", "testId": "LAB1763371546407HTB66", "testName": "Complete Blood Count (CBC) - Hemoglobin (Hb)", "referenceRange": "13.0 - 17.0"}, {"unit": "x10³/L", "value": "2", "status": "normal", "testId": "LAB1763371546407HTB66", "testName": "Complete Blood Count (CBC) - Total WBC Count", "referenceRange": "4.0 - 10.0"}, {"unit": "x10¹²/L", "value": "2", "status": "normal", "testId": "LAB1763371546407HTB66", "testName": "Complete Blood Count (CBC) - RBC Count", "referenceRange": "4.5 - 5.9"}, {"unit": "%", "value": "2", "status": "normal", "testId": "LAB1763371546407HTB66", "testName": "Complete Blood Count (CBC) - Hematocrit (HCT/PCV)", "referenceRange": "40 - 50"}, {"unit": "fL", "value": "2", "status": "normal", "testId": "LAB1763371546407HTB66", "testName": "Complete Blood Count (CBC) - MCV", "referenceRange": "80 - 96"}]	t	2025-11-17 10:57:32.598	2025-11-17 10:57:32.72032
11	1	2	Cardiovascular Disease	10.00	high	["Elevated glucose", "Critical lab values detected"]	["Blood pressure control", "Regular cardiovascular screening"]	[{"flag": "HIGH", "unit": "mg/dL", "value": "245", "status": "abnormal_high", "testId": "GLU002", "testName": "Glucose", "referenceRange": "70-99"}]	t	2025-11-17 10:57:32.834	2025-11-17 10:57:32.955197
12	1	2	Diabetes	8.00	high	["High fasting glucose"]	["Immediate diabetes workup", "Annual glucose screening", "Weight management", "Diet counseling"]	[{"flag": "HIGH", "unit": "mg/dL", "value": "245", "status": "abnormal_high", "testId": "GLU002", "testName": "Glucose", "referenceRange": "70-99"}]	t	2025-11-17 10:57:33.068	2025-11-17 10:57:33.188742
13	1	1	Cardiovascular Disease	7.00	moderate	["Critical lab values detected"]	["Blood pressure control", "Regular cardiovascular screening"]	[{"unit": "", "value": "4", "status": "normal", "testId": "LAB17633801066094XW4P", "testName": "Viral Panels / PCR Tests (e.g. COVID-19, Influenza) - COVID-19 PCR", "referenceRange": "Negative"}, {"unit": "", "value": "4", "status": "normal", "testId": "LAB17633801066094XW4P", "testName": "Viral Panels / PCR Tests (e.g. COVID-19, Influenza) - Influenza A PCR", "referenceRange": "Negative"}, {"unit": "", "value": "4", "status": "normal", "testId": "LAB17633801066094XW4P", "testName": "Viral Panels / PCR Tests (e.g. COVID-19, Influenza) - Influenza B PCR", "referenceRange": "Negative"}, {"unit": "", "value": "4", "status": "normal", "testId": "LAB17633801066094XW4P", "testName": "Viral Panels / PCR Tests (e.g. COVID-19, Influenza) - RSV PCR", "referenceRange": "Negative"}, {"unit": "Ct", "value": "4", "status": "normal", "testId": "LAB17633801066094XW4P", "testName": "Viral Panels / PCR Tests (e.g. COVID-19, Influenza) - Viral Load (Ct Value)", "referenceRange": ">35"}]	t	2025-11-17 20:26:29.539	2025-11-17 20:26:29.660184
14	1	1	Diabetes	8.00	high	["Elevated HbA1c"]	["Diabetes management", "Annual glucose screening", "Weight management", "Diet counseling"]	[{"unit": "", "value": "4", "status": "normal", "testId": "LAB17633801066094XW4P", "testName": "Viral Panels / PCR Tests (e.g. COVID-19, Influenza) - COVID-19 PCR", "referenceRange": "Negative"}, {"unit": "", "value": "4", "status": "normal", "testId": "LAB17633801066094XW4P", "testName": "Viral Panels / PCR Tests (e.g. COVID-19, Influenza) - Influenza A PCR", "referenceRange": "Negative"}, {"unit": "", "value": "4", "status": "normal", "testId": "LAB17633801066094XW4P", "testName": "Viral Panels / PCR Tests (e.g. COVID-19, Influenza) - Influenza B PCR", "referenceRange": "Negative"}, {"unit": "", "value": "4", "status": "normal", "testId": "LAB17633801066094XW4P", "testName": "Viral Panels / PCR Tests (e.g. COVID-19, Influenza) - RSV PCR", "referenceRange": "Negative"}, {"unit": "Ct", "value": "4", "status": "normal", "testId": "LAB17633801066094XW4P", "testName": "Viral Panels / PCR Tests (e.g. COVID-19, Influenza) - Viral Load (Ct Value)", "referenceRange": ">35"}]	t	2025-11-17 20:26:29.782	2025-11-17 20:26:29.902714
15	1	2	Cardiovascular Disease	10.00	high	["Elevated glucose", "Critical lab values detected"]	["Blood pressure control", "Regular cardiovascular screening"]	[{"flag": "HIGH", "unit": "mg/dL", "value": "245", "status": "abnormal_high", "testId": "GLU002", "testName": "Glucose", "referenceRange": "70-99"}]	t	2025-11-17 20:26:30.016	2025-11-17 20:26:30.137341
16	1	2	Diabetes	8.00	high	["High fasting glucose"]	["Immediate diabetes workup", "Annual glucose screening", "Weight management", "Diet counseling"]	[{"flag": "HIGH", "unit": "mg/dL", "value": "245", "status": "abnormal_high", "testId": "GLU002", "testName": "Glucose", "referenceRange": "70-99"}]	t	2025-11-17 20:26:30.251	2025-11-17 20:26:30.371988
17	1	1	Cardiovascular Disease	7.00	moderate	["Critical lab values detected"]	["Blood pressure control", "Regular cardiovascular screening"]	[{"unit": "", "value": "4", "status": "normal", "testId": "LAB17633801066094XW4P", "testName": "Viral Panels / PCR Tests (e.g. COVID-19, Influenza) - COVID-19 PCR", "referenceRange": "Negative"}, {"unit": "", "value": "4", "status": "normal", "testId": "LAB17633801066094XW4P", "testName": "Viral Panels / PCR Tests (e.g. COVID-19, Influenza) - Influenza A PCR", "referenceRange": "Negative"}, {"unit": "", "value": "4", "status": "normal", "testId": "LAB17633801066094XW4P", "testName": "Viral Panels / PCR Tests (e.g. COVID-19, Influenza) - Influenza B PCR", "referenceRange": "Negative"}, {"unit": "", "value": "4", "status": "normal", "testId": "LAB17633801066094XW4P", "testName": "Viral Panels / PCR Tests (e.g. COVID-19, Influenza) - RSV PCR", "referenceRange": "Negative"}, {"unit": "Ct", "value": "4", "status": "normal", "testId": "LAB17633801066094XW4P", "testName": "Viral Panels / PCR Tests (e.g. COVID-19, Influenza) - Viral Load (Ct Value)", "referenceRange": ">35"}]	t	2025-11-18 07:58:58.376	2025-11-18 07:58:58.494065
18	1	1	Diabetes	8.00	high	["Elevated HbA1c"]	["Diabetes management", "Annual glucose screening", "Weight management", "Diet counseling"]	[{"unit": "", "value": "4", "status": "normal", "testId": "LAB17633801066094XW4P", "testName": "Viral Panels / PCR Tests (e.g. COVID-19, Influenza) - COVID-19 PCR", "referenceRange": "Negative"}, {"unit": "", "value": "4", "status": "normal", "testId": "LAB17633801066094XW4P", "testName": "Viral Panels / PCR Tests (e.g. COVID-19, Influenza) - Influenza A PCR", "referenceRange": "Negative"}, {"unit": "", "value": "4", "status": "normal", "testId": "LAB17633801066094XW4P", "testName": "Viral Panels / PCR Tests (e.g. COVID-19, Influenza) - Influenza B PCR", "referenceRange": "Negative"}, {"unit": "", "value": "4", "status": "normal", "testId": "LAB17633801066094XW4P", "testName": "Viral Panels / PCR Tests (e.g. COVID-19, Influenza) - RSV PCR", "referenceRange": "Negative"}, {"unit": "Ct", "value": "4", "status": "normal", "testId": "LAB17633801066094XW4P", "testName": "Viral Panels / PCR Tests (e.g. COVID-19, Influenza) - Viral Load (Ct Value)", "referenceRange": ">35"}]	t	2025-11-18 07:58:58.617	2025-11-18 07:58:58.734987
19	1	2	Cardiovascular Disease	10.00	high	["Elevated glucose", "Critical lab values detected"]	["Blood pressure control", "Regular cardiovascular screening"]	[{"flag": "HIGH", "unit": "mg/dL", "value": "245", "status": "abnormal_high", "testId": "GLU002", "testName": "Glucose", "referenceRange": "70-99"}]	t	2025-11-18 07:58:58.849	2025-11-18 07:58:58.966325
20	1	2	Diabetes	8.00	high	["High fasting glucose"]	["Immediate diabetes workup", "Annual glucose screening", "Weight management", "Diet counseling"]	[{"flag": "HIGH", "unit": "mg/dL", "value": "245", "status": "abnormal_high", "testId": "GLU002", "testName": "Glucose", "referenceRange": "70-99"}]	t	2025-11-18 07:58:59.08	2025-11-18 07:58:59.200464
21	1	1	Cardiovascular Disease	7.00	moderate	["Critical lab values detected"]	["Blood pressure control", "Regular cardiovascular screening"]	[{"unit": "", "value": "4", "status": "normal", "testId": "LAB17633801066094XW4P", "testName": "Viral Panels / PCR Tests (e.g. COVID-19, Influenza) - COVID-19 PCR", "referenceRange": "Negative"}, {"unit": "", "value": "4", "status": "normal", "testId": "LAB17633801066094XW4P", "testName": "Viral Panels / PCR Tests (e.g. COVID-19, Influenza) - Influenza A PCR", "referenceRange": "Negative"}, {"unit": "", "value": "4", "status": "normal", "testId": "LAB17633801066094XW4P", "testName": "Viral Panels / PCR Tests (e.g. COVID-19, Influenza) - Influenza B PCR", "referenceRange": "Negative"}, {"unit": "", "value": "4", "status": "normal", "testId": "LAB17633801066094XW4P", "testName": "Viral Panels / PCR Tests (e.g. COVID-19, Influenza) - RSV PCR", "referenceRange": "Negative"}, {"unit": "Ct", "value": "4", "status": "normal", "testId": "LAB17633801066094XW4P", "testName": "Viral Panels / PCR Tests (e.g. COVID-19, Influenza) - Viral Load (Ct Value)", "referenceRange": ">35"}]	t	2025-11-18 08:00:59.571	2025-11-18 08:00:59.703554
22	1	1	Diabetes	8.00	high	["Elevated HbA1c"]	["Diabetes management", "Annual glucose screening", "Weight management", "Diet counseling"]	[{"unit": "", "value": "4", "status": "normal", "testId": "LAB17633801066094XW4P", "testName": "Viral Panels / PCR Tests (e.g. COVID-19, Influenza) - COVID-19 PCR", "referenceRange": "Negative"}, {"unit": "", "value": "4", "status": "normal", "testId": "LAB17633801066094XW4P", "testName": "Viral Panels / PCR Tests (e.g. COVID-19, Influenza) - Influenza A PCR", "referenceRange": "Negative"}, {"unit": "", "value": "4", "status": "normal", "testId": "LAB17633801066094XW4P", "testName": "Viral Panels / PCR Tests (e.g. COVID-19, Influenza) - Influenza B PCR", "referenceRange": "Negative"}, {"unit": "", "value": "4", "status": "normal", "testId": "LAB17633801066094XW4P", "testName": "Viral Panels / PCR Tests (e.g. COVID-19, Influenza) - RSV PCR", "referenceRange": "Negative"}, {"unit": "Ct", "value": "4", "status": "normal", "testId": "LAB17633801066094XW4P", "testName": "Viral Panels / PCR Tests (e.g. COVID-19, Influenza) - Viral Load (Ct Value)", "referenceRange": ">35"}]	t	2025-11-18 08:00:59.826	2025-11-18 08:00:59.944754
23	1	2	Cardiovascular Disease	10.00	high	["Elevated glucose", "Critical lab values detected"]	["Blood pressure control", "Regular cardiovascular screening"]	[{"flag": "HIGH", "unit": "mg/dL", "value": "245", "status": "abnormal_high", "testId": "GLU002", "testName": "Glucose", "referenceRange": "70-99"}]	t	2025-11-18 08:01:00.073	2025-11-18 08:01:00.19151
24	1	2	Diabetes	8.00	high	["High fasting glucose"]	["Immediate diabetes workup", "Annual glucose screening", "Weight management", "Diet counseling"]	[{"flag": "HIGH", "unit": "mg/dL", "value": "245", "status": "abnormal_high", "testId": "GLU002", "testName": "Glucose", "referenceRange": "70-99"}]	t	2025-11-18 08:01:00.319	2025-11-18 08:01:00.468832
\.


--
-- Data for Name: roles; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.roles (id, organization_id, name, display_name, description, permissions, is_system, created_at, updated_at) FROM stdin;
1	1	admin	Administrator	Full system access with all permissions	{"fields": {"financialData": {"edit": true, "view": true}, "medicalHistory": {"edit": true, "view": true}, "patientSensitiveInfo": {"edit": true, "view": true}}, "modules": {"billing": {"edit": true, "view": true, "create": true, "delete": true}, "patients": {"edit": true, "view": true, "create": true, "delete": true}, "settings": {"edit": true, "view": true, "create": true, "delete": true}, "analytics": {"edit": true, "view": true, "create": true, "delete": true}, "appointments": {"edit": true, "view": true, "create": true, "delete": true}, "prescriptions": {"edit": true, "view": true, "create": true, "delete": true}, "medicalRecords": {"edit": true, "view": true, "create": true, "delete": true}, "userManagement": {"edit": true, "view": true, "create": true, "delete": true}}}	t	2025-11-17 08:46:51.321093	2025-11-17 08:46:51.321093
2	1	doctor	Doctor	Medical doctor with full clinical access	{"fields": {"financialData": {"edit": false, "view": true}, "medicalHistory": {"edit": true, "view": true}, "patientSensitiveInfo": {"edit": true, "view": true}}, "modules": {"forms": {"edit": true, "view": true, "create": true, "delete": false}, "billing": {"edit": false, "view": true, "create": false, "delete": false}, "patients": {"edit": true, "view": true, "create": true, "delete": false}, "settings": {"edit": false, "view": false, "create": false, "delete": false}, "analytics": {"edit": false, "view": true, "create": false, "delete": false}, "dashboard": {"edit": false, "view": true, "create": false, "delete": false}, "messaging": {"edit": true, "view": true, "create": true, "delete": false}, "labResults": {"edit": true, "view": true, "create": true, "delete": false}, "appointments": {"edit": true, "view": true, "create": true, "delete": false}, "prescriptions": {"edit": true, "view": true, "create": true, "delete": false}, "medicalImaging": {"edit": true, "view": true, "create": true, "delete": false}, "medicalRecords": {"edit": true, "view": true, "create": true, "delete": false}, "symptomChecker": {"edit": false, "view": true, "create": false, "delete": false}, "userManagement": {"edit": false, "view": false, "create": false, "delete": false}, "shiftManagement": {"edit": true, "view": true, "create": true, "delete": false}, "voiceDocumentation": {"edit": true, "view": true, "create": true, "delete": false}}}	t	2025-11-17 08:46:51.321093	2025-11-17 08:46:51.321093
3	1	nurse	Nurse	Nursing staff with patient care access	{"fields": {"financialData": {"edit": false, "view": false}, "medicalHistory": {"edit": false, "view": true}, "patientSensitiveInfo": {"edit": false, "view": true}}, "modules": {"billing": {"edit": false, "view": false, "create": false, "delete": false}, "patients": {"edit": true, "view": true, "create": false, "delete": false}, "settings": {"edit": false, "view": false, "create": false, "delete": false}, "analytics": {"edit": false, "view": false, "create": false, "delete": false}, "appointments": {"edit": true, "view": true, "create": true, "delete": false}, "prescriptions": {"edit": false, "view": true, "create": false, "delete": false}, "medicalRecords": {"edit": false, "view": true, "create": true, "delete": false}, "userManagement": {"edit": false, "view": false, "create": false, "delete": false}}}	t	2025-11-17 08:46:51.321093	2025-11-17 08:46:51.321093
4	1	patient	Patient	Patient with access to own records	{"fields": {"labResults": {"edit": false, "view": false}, "financialData": {"edit": false, "view": true}, "imagingResults": {"edit": false, "view": false}, "medicalHistory": {"edit": false, "view": true}, "insuranceDetails": {"edit": false, "view": false}, "billingInformation": {"edit": false, "view": false}, "prescriptionDetails": {"edit": false, "view": false}, "patientSensitiveInfo": {"edit": false, "view": true}}, "modules": {"forms": {"edit": false, "view": true, "create": false, "delete": false}, "billing": {"edit": false, "view": true, "create": false, "delete": false}, "patients": {"edit": false, "view": true, "create": false, "delete": false}, "settings": {"edit": false, "view": false, "create": false, "delete": false}, "analytics": {"edit": false, "view": false, "create": false, "delete": false}, "messaging": {"edit": false, "view": true, "create": false, "delete": false}, "aiInsights": {"edit": false, "view": false, "create": false, "delete": false}, "labResults": {"edit": false, "view": true, "create": false, "delete": false}, "appointments": {"edit": true, "view": true, "create": true, "delete": false}, "telemedicine": {"edit": false, "view": true, "create": false, "delete": false}, "prescriptions": {"edit": false, "view": true, "create": false, "delete": false}, "medicalImaging": {"edit": false, "view": true, "create": false, "delete": false}, "medicalRecords": {"edit": false, "view": true, "create": false, "delete": false}, "userManagement": {"edit": false, "view": false, "create": false, "delete": false}}}	t	2025-11-17 08:46:51.321093	2025-11-17 08:46:51.321093
5	1	receptionist	Receptionist	Front desk staff with appointment management	{"fields": {"financialData": {"edit": false, "view": false}, "medicalHistory": {"edit": false, "view": false}, "patientSensitiveInfo": {"edit": false, "view": false}}, "modules": {"billing": {"edit": false, "view": true, "create": false, "delete": false}, "patients": {"edit": true, "view": true, "create": true, "delete": false}, "settings": {"edit": false, "view": false, "create": false, "delete": false}, "analytics": {"edit": false, "view": false, "create": false, "delete": false}, "appointments": {"edit": true, "view": true, "create": true, "delete": false}, "prescriptions": {"edit": false, "view": false, "create": false, "delete": false}, "medicalRecords": {"edit": false, "view": false, "create": false, "delete": false}, "userManagement": {"edit": false, "view": false, "create": false, "delete": false}}}	t	2025-11-17 08:46:51.321093	2025-11-17 08:46:51.321093
6	1	lab_technician	Lab Technician	Laboratory technician with lab results access	{"fields": {}, "modules": {"dashboard": {"edit": false, "view": true, "create": false, "delete": false}}}	t	2025-11-17 08:46:51.321093	2025-11-17 08:46:51.321093
7	1	pharmacist	Pharmacist	Pharmacist with prescription access	{"fields": {"financialData": {"edit": false, "view": false}, "medicalHistory": {"edit": false, "view": true}, "patientSensitiveInfo": {"edit": false, "view": false}}, "modules": {"billing": {"edit": false, "view": false, "create": false, "delete": false}, "patients": {"edit": false, "view": true, "create": false, "delete": false}, "settings": {"edit": false, "view": false, "create": false, "delete": false}, "analytics": {"edit": false, "view": false, "create": false, "delete": false}, "appointments": {"edit": false, "view": true, "create": false, "delete": false}, "prescriptions": {"edit": true, "view": true, "create": false, "delete": false}, "medicalRecords": {"edit": false, "view": true, "create": false, "delete": false}, "userManagement": {"edit": false, "view": false, "create": false, "delete": false}}}	t	2025-11-17 08:46:51.321093	2025-11-17 08:46:51.321093
8	1	dentist	Dentist	Dental professional with clinical access	{"fields": {"financialData": {"edit": false, "view": true}, "medicalHistory": {"edit": true, "view": true}, "patientSensitiveInfo": {"edit": true, "view": true}}, "modules": {"billing": {"edit": false, "view": true, "create": false, "delete": false}, "patients": {"edit": true, "view": true, "create": true, "delete": false}, "settings": {"edit": false, "view": false, "create": false, "delete": false}, "analytics": {"edit": false, "view": true, "create": false, "delete": false}, "appointments": {"edit": true, "view": true, "create": true, "delete": false}, "prescriptions": {"edit": true, "view": true, "create": true, "delete": false}, "medicalRecords": {"edit": true, "view": true, "create": true, "delete": false}, "userManagement": {"edit": false, "view": false, "create": false, "delete": false}}}	t	2025-11-17 08:46:51.321093	2025-11-17 08:46:51.321093
9	1	dental_nurse	Dental Nurse	Dental nursing staff with patient care access	{"fields": {"financialData": {"edit": false, "view": false}, "medicalHistory": {"edit": false, "view": true}, "patientSensitiveInfo": {"edit": false, "view": true}}, "modules": {"billing": {"edit": false, "view": false, "create": false, "delete": false}, "patients": {"edit": true, "view": true, "create": false, "delete": false}, "settings": {"edit": false, "view": false, "create": false, "delete": false}, "analytics": {"edit": false, "view": false, "create": false, "delete": false}, "appointments": {"edit": true, "view": true, "create": true, "delete": false}, "prescriptions": {"edit": false, "view": true, "create": false, "delete": false}, "medicalRecords": {"edit": false, "view": true, "create": true, "delete": false}, "userManagement": {"edit": false, "view": false, "create": false, "delete": false}}}	t	2025-11-17 08:46:51.321093	2025-11-17 08:46:51.321093
10	1	phlebotomist	Phlebotomist	Blood collection specialist	{"fields": {"financialData": {"edit": false, "view": false}, "medicalHistory": {"edit": false, "view": true}, "patientSensitiveInfo": {"edit": false, "view": false}}, "modules": {"billing": {"edit": false, "view": false, "create": false, "delete": false}, "patients": {"edit": false, "view": true, "create": false, "delete": false}, "settings": {"edit": false, "view": false, "create": false, "delete": false}, "analytics": {"edit": false, "view": false, "create": false, "delete": false}, "appointments": {"edit": false, "view": true, "create": false, "delete": false}, "prescriptions": {"edit": false, "view": false, "create": false, "delete": false}, "medicalRecords": {"edit": false, "view": true, "create": false, "delete": false}, "userManagement": {"edit": false, "view": false, "create": false, "delete": false}}}	t	2025-11-17 08:46:51.321093	2025-11-17 08:46:51.321093
11	1	aesthetician	Aesthetician	Aesthetic treatment specialist	{"fields": {"financialData": {"edit": false, "view": false}, "medicalHistory": {"edit": false, "view": true}, "patientSensitiveInfo": {"edit": false, "view": false}}, "modules": {"billing": {"edit": false, "view": true, "create": false, "delete": false}, "patients": {"edit": true, "view": true, "create": false, "delete": false}, "settings": {"edit": false, "view": false, "create": false, "delete": false}, "analytics": {"edit": false, "view": false, "create": false, "delete": false}, "appointments": {"edit": true, "view": true, "create": true, "delete": false}, "prescriptions": {"edit": false, "view": false, "create": false, "delete": false}, "medicalRecords": {"edit": false, "view": true, "create": true, "delete": false}, "userManagement": {"edit": false, "view": false, "create": false, "delete": false}}}	t	2025-11-17 08:46:51.321093	2025-11-17 08:46:51.321093
12	1	optician	Optician	Eye care and vision specialist	{"fields": {"financialData": {"edit": false, "view": true}, "medicalHistory": {"edit": true, "view": true}, "patientSensitiveInfo": {"edit": false, "view": true}}, "modules": {"billing": {"edit": false, "view": true, "create": false, "delete": false}, "patients": {"edit": false, "view": true, "create": false, "delete": false}, "settings": {"edit": false, "view": false, "create": false, "delete": false}, "analytics": {"edit": false, "view": false, "create": false, "delete": false}, "appointments": {"edit": false, "view": true, "create": false, "delete": false}, "prescriptions": {"edit": false, "view": true, "create": false, "delete": false}, "medicalRecords": {"edit": false, "view": true, "create": false, "delete": false}, "userManagement": {"edit": false, "view": false, "create": false, "delete": false}}}	t	2025-11-17 08:46:51.321093	2025-11-17 08:46:51.321093
13	1	paramedic	Paramedic	Emergency medical services professional	{"fields": {"financialData": {"edit": false, "view": false}, "medicalHistory": {"edit": true, "view": true}, "patientSensitiveInfo": {"edit": false, "view": true}}, "modules": {"billing": {"edit": false, "view": false, "create": false, "delete": false}, "patients": {"edit": true, "view": true, "create": true, "delete": false}, "settings": {"edit": false, "view": false, "create": false, "delete": false}, "analytics": {"edit": false, "view": false, "create": false, "delete": false}, "appointments": {"edit": true, "view": true, "create": true, "delete": false}, "prescriptions": {"edit": false, "view": false, "create": false, "delete": false}, "medicalRecords": {"edit": true, "view": false, "create": true, "delete": false}, "userManagement": {"edit": false, "view": false, "create": false, "delete": false}}}	t	2025-11-17 08:46:51.321093	2025-11-17 08:46:51.321093
14	1	physiotherapist	Physiotherapist	Physical therapy specialist	{"fields": {"financialData": {"edit": false, "view": false}, "medicalHistory": {"edit": true, "view": true}, "patientSensitiveInfo": {"edit": false, "view": true}}, "modules": {"billing": {"edit": false, "view": true, "create": false, "delete": false}, "patients": {"edit": true, "view": true, "create": false, "delete": false}, "settings": {"edit": false, "view": false, "create": false, "delete": false}, "analytics": {"edit": false, "view": false, "create": false, "delete": false}, "appointments": {"edit": true, "view": true, "create": true, "delete": false}, "prescriptions": {"edit": false, "view": true, "create": false, "delete": false}, "medicalRecords": {"edit": true, "view": true, "create": true, "delete": false}, "userManagement": {"edit": false, "view": false, "create": false, "delete": false}}}	t	2025-11-17 08:46:51.321093	2025-11-17 08:46:51.321093
15	1	sample_taker	Sample Taker	Medical sample collection specialist	{"fields": {}, "modules": {"dashboard": {"edit": false, "view": true, "create": false, "delete": false}}}	t	2025-11-17 08:46:51.321093	2025-11-17 08:46:51.321093
16	1	other	Other	Generic role for other healthcare professionals	{"fields": {"financialData": {"edit": false, "view": false}, "medicalHistory": {"edit": false, "view": true}, "patientSensitiveInfo": {"edit": false, "view": false}}, "modules": {"billing": {"edit": false, "view": false, "create": false, "delete": false}, "patients": {"edit": false, "view": true, "create": false, "delete": false}, "settings": {"edit": false, "view": false, "create": false, "delete": false}, "analytics": {"edit": false, "view": false, "create": false, "delete": false}, "appointments": {"edit": true, "view": true, "create": true, "delete": false}, "prescriptions": {"edit": false, "view": true, "create": false, "delete": false}, "medicalRecords": {"edit": false, "view": true, "create": false, "delete": false}, "userManagement": {"edit": false, "view": false, "create": false, "delete": false}}}	t	2025-11-17 08:46:51.321093	2025-11-17 08:46:51.321093
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
1	Gold Package	33	99.00	monthly	{"maxUsers": 10, "aiEnabled": false, "storageGB": 1, "maxPatients": 100, "billingEnabled": false, "customBranding": false, "prioritySupport": false, "analyticsEnabled": false, "apiCallsPerMonth": 1000, "telemedicineEnabled": false}	t	f	2025-11-18 04:15:00.635842	2025-11-18 04:15:00.635842
\.


--
-- Data for Name: saas_payments; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.saas_payments (id, organization_id, subscription_id, invoice_number, amount, currency, payment_method, payment_status, payment_date, due_date, period_start, period_end, payment_provider, provider_transaction_id, description, metadata, created_at, updated_at) FROM stdin;
1	1	\N	INV-1763439269645	200.00	GBP	stripe	paid	2025-11-18 04:51:01.977	2025-11-19 00:00:00	2025-11-18 04:14:29.645	2025-12-18 04:14:29.645	stripe	stripe_1763441461565_i73rnmgkzq	Payment for Cura EMR Services	{}	2025-11-18 04:14:29.767142	2025-11-18 04:51:01.977
2	1	\N	INV-1763442010064	100.00	GBP	stripe	paid	2025-11-18 05:11:28.286	2025-11-22 00:00:00	2025-11-18 05:00:10.064	2025-12-18 05:00:10.064	stripe	stripe_1763442687229_u1lebqkd55	Payment for Cura EMR Services	{}	2025-11-18 05:00:10.178265	2025-11-18 05:11:28.286
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

COPY public.staff_shifts (id, organization_id, staff_id, date, shift_type, start_time, end_time, status, notes, is_available, created_by, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: subscriptions; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.subscriptions (id, organization_id, plan_name, plan, status, user_limit, current_users, monthly_price, trial_ends_at, next_billing_at, features, created_at, updated_at) FROM stdin;
1	1	Gold Package	gold package	active	25	3	99.00	\N	2025-12-17 08:46:48.866	{"maxUsers": 11, "aiEnabled": true, "maxPatients": 11, "billingEnabled": true, "analyticsEnabled": true, "telemedicineEnabled": false}	2025-11-17 08:46:48.983315	2025-11-17 08:46:48.983315
\.


--
-- Data for Name: symptom_checks; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.symptom_checks (id, organization_id, patient_id, user_id, symptoms, symptom_description, duration, severity, ai_analysis, status, appointment_created, appointment_id, created_at, updated_at) FROM stdin;
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
1	1	james@emrsoft.ai	james	$2b$12$Ivwj7yNhsLxWqXKQhegBl.SNTJe65HCFI9yMrMD9KSK6fekGzp7PG	James	Administrator	admin	Administration	\N	\N	["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]	{"end": "17:00", "start": "09:00"}	{}	t	f	\N	2025-11-17 08:46:44.330295
2	1	paul@emrsoft.ai	paul	$2b$12$qBFvYWulhA74pUPy.kNFlO6rT99/Oir5tOWZd9hI8AYukvf6AaFHa	Paul	Smith	doctor	Cardiology	\N	\N	["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]	{"end": "17:00", "start": "08:00"}	{}	t	f	\N	2025-11-17 08:46:44.330295
3	1	emma@emrsoft.ai	emma	$2b$12$H.OAEbAhN17FK9GUq83/9erDZ8/h1exp21pRnJv1GBJDx7usJcHoW	Emma	Johnson	nurse	General Medicine	\N	\N	["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]	{"end": "19:00", "start": "07:00"}	{}	t	f	\N	2025-11-17 08:46:44.330295
5	1	amelia@emrsoft.ai	amelia	$2b$12$CzCqOzyBYV.6GYSbvxk93eAZ8ryL2CDNiUd536owTTTG8WCrHtRyu	Amelia	Rodriguez	lab_technician	Laboratory	\N	\N	["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]	{"end": "14:00", "start": "06:00"}	{}	t	f	\N	2025-11-17 08:46:44.330295
6	1	sampletaker@emrsoft.ai	sampletaker	$2b$12$5BbOAdwEYoJZ1G/o91JqseOy2RCihN5obMsvbDKXjsU.RjC/OjT4u	James	Wilson	sample_taker	Laboratory	\N	\N	["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]	{"end": "14:00", "start": "06:00"}	{}	t	f	\N	2025-11-17 08:46:44.330295
7	1	doctor2@cura.com	doctor2	$2b$12$qBFvYWulhA74pUPy.kNFlO6rT99/Oir5tOWZd9hI8AYukvf6AaFHa	Michael	Johnson	doctor	Neurology	\N	\N	["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]	{"end": "18:00", "start": "09:00"}	{}	t	f	\N	2025-11-17 08:46:44.330295
8	1	doctor3@cura.com	doctor3	$2b$12$qBFvYWulhA74pUPy.kNFlO6rT99/Oir5tOWZd9hI8AYukvf6AaFHa	David	Wilson	doctor	Orthopedics	\N	\N	["Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]	{"end": "16:30", "start": "08:30"}	{}	t	f	\N	2025-11-17 08:46:44.330295
9	1	doctor4@cura.com	doctor4	$2b$12$qBFvYWulhA74pUPy.kNFlO6rT99/Oir5tOWZd9hI8AYukvf6AaFHa	Lisa	Anderson	doctor	Pediatrics	\N	\N	["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]	{"end": "16:00", "start": "08:00"}	{}	t	f	\N	2025-11-17 08:46:44.330295
10	1	doctor5@cura.com	doctor5	$2b$12$qBFvYWulhA74pUPy.kNFlO6rT99/Oir5tOWZd9hI8AYukvf6AaFHa	Robert	Brown	doctor	Dermatology	\N	\N	["Monday", "Wednesday", "Friday"]	{"end": "18:00", "start": "10:00"}	{}	t	f	\N	2025-11-17 08:46:44.330295
11	1	receptionist@cura.com	receptionist	$2b$12$Ivwj7yNhsLxWqXKQhegBl.SNTJe65HCFI9yMrMD9KSK6fekGzp7PG	Jane	Thompson	receptionist	Front Desk	\N	\N	["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]	{"end": "17:00", "start": "08:00"}	{}	t	f	\N	2025-11-17 08:46:44.330295
12	0	saas_admin@curaemr.ai	saas_admin	$2b$12$l09SY1H2YczrmcMdbjEL6.oQPIyhGsHYQqju4f6v4xzdmvMIDSIyi	SaaS	Administrator	admin	\N	\N	\N	[]	{}	{}	t	t	\N	2025-11-17 08:46:52.027573
4	1	john@emrsoft.ai	john	$2b$12$SNZdzsNABtKUGLoR65jHkeuT3xxtPG0xfPQ4jIzUMk7kRPOsW.KUK	John	Patient	patient		\N	\N	[]	{}	{}	t	f	\N	2025-11-17 08:46:44.330295
\.


--
-- Data for Name: voice_notes; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.voice_notes (id, organization_id, patient_id, patient_name, provider_id, provider_name, type, status, recording_duration, transcript, confidence, medical_terms, structured_data, created_at, updated_at) FROM stdin;
note_sample_1763376289116	1	158	Imran Mubashir	1	Dr. Provider	consultation	completed	120	Patient presents with chest pain. Vital signs stable. Recommended further cardiac evaluation.	0.94	[{"term": "chest pain", "category": "symptom", "confidence": 0.95}, {"term": "cardiac evaluation", "category": "procedure", "confidence": 0.93}]	{"plan": ["EKG, troponin levels, cardiology consult"], "assessment": ["Possible cardiac involvement"], "chiefComplaint": ["Chest pain"]}	2025-11-17 10:44:49.233541	2025-11-17 10:44:49.233541
\.


--
-- Name: ai_insights_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.ai_insights_id_seq', 500, true);


--
-- Name: appointments_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.appointments_id_seq', 3, true);


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
-- Name: clinic_footers_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.clinic_footers_id_seq', 1, true);


--
-- Name: clinic_headers_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.clinic_headers_id_seq', 1, true);


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
-- Name: doctor_default_shifts_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.doctor_default_shifts_id_seq', 10, true);


--
-- Name: doctors_fee_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.doctors_fee_id_seq', 38, true);


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
-- Name: imaging_pricing_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.imaging_pricing_id_seq', 18, true);


--
-- Name: insurance_payments_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.insurance_payments_id_seq', 1, false);


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
-- Name: invoices_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.invoices_id_seq', 22, true);


--
-- Name: lab_results_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.lab_results_id_seq', 22, true);


--
-- Name: lab_test_pricing_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.lab_test_pricing_id_seq', 36, true);


--
-- Name: letter_drafts_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.letter_drafts_id_seq', 1, false);


--
-- Name: medical_images_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.medical_images_id_seq', 5, true);


--
-- Name: medical_records_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.medical_records_id_seq', 104, true);


--
-- Name: medications_database_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.medications_database_id_seq', 1, false);


--
-- Name: message_campaigns_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.message_campaigns_id_seq', 1, false);


--
-- Name: message_templates_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.message_templates_id_seq', 1, false);


--
-- Name: muscles_position_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.muscles_position_id_seq', 1, false);


--
-- Name: notifications_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.notifications_id_seq', 13, true);


--
-- Name: organizations_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.organizations_id_seq', 1, true);


--
-- Name: password_reset_tokens_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.password_reset_tokens_id_seq', 1, false);


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

SELECT pg_catalog.setval('public.patients_id_seq', 3, true);


--
-- Name: payments_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.payments_id_seq', 15, true);


--
-- Name: prescriptions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.prescriptions_id_seq', 2, true);


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
-- Name: risk_assessments_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.risk_assessments_id_seq', 24, true);


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

SELECT pg_catalog.setval('public.saas_packages_id_seq', 1, true);


--
-- Name: saas_payments_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.saas_payments_id_seq', 2, true);


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

SELECT pg_catalog.setval('public.staff_shifts_id_seq', 1, false);


--
-- Name: subscriptions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.subscriptions_id_seq', 1, true);


--
-- Name: symptom_checks_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.symptom_checks_id_seq', 1, false);


--
-- Name: user_document_preferences_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.user_document_preferences_id_seq', 1, false);


--
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.users_id_seq', 12, true);


--
-- Name: ai_insights ai_insights_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.ai_insights
    ADD CONSTRAINT ai_insights_pkey PRIMARY KEY (id);


--
-- Name: appointments appointments_appointment_id_unique; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.appointments
    ADD CONSTRAINT appointments_appointment_id_unique UNIQUE (appointment_id);


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
-- Name: clinic_footers clinic_footers_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.clinic_footers
    ADD CONSTRAINT clinic_footers_pkey PRIMARY KEY (id);


--
-- Name: clinic_headers clinic_headers_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.clinic_headers
    ADD CONSTRAINT clinic_headers_pkey PRIMARY KEY (id);


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
-- Name: doctor_default_shifts doctor_default_shifts_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.doctor_default_shifts
    ADD CONSTRAINT doctor_default_shifts_pkey PRIMARY KEY (id);


--
-- Name: doctors_fee doctors_fee_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.doctors_fee
    ADD CONSTRAINT doctors_fee_pkey PRIMARY KEY (id);


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
-- Name: imaging_pricing imaging_pricing_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.imaging_pricing
    ADD CONSTRAINT imaging_pricing_pkey PRIMARY KEY (id);


--
-- Name: insurance_payments insurance_payments_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.insurance_payments
    ADD CONSTRAINT insurance_payments_pkey PRIMARY KEY (id);


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
-- Name: invoices invoices_invoice_number_unique; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_invoice_number_unique UNIQUE (invoice_number);


--
-- Name: invoices invoices_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_pkey PRIMARY KEY (id);


--
-- Name: lab_results lab_results_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.lab_results
    ADD CONSTRAINT lab_results_pkey PRIMARY KEY (id);


--
-- Name: lab_test_pricing lab_test_pricing_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.lab_test_pricing
    ADD CONSTRAINT lab_test_pricing_pkey PRIMARY KEY (id);


--
-- Name: letter_drafts letter_drafts_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.letter_drafts
    ADD CONSTRAINT letter_drafts_pkey PRIMARY KEY (id);


--
-- Name: medical_images medical_images_image_id_unique; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.medical_images
    ADD CONSTRAINT medical_images_image_id_unique UNIQUE (image_id);


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
-- Name: message_campaigns message_campaigns_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.message_campaigns
    ADD CONSTRAINT message_campaigns_pkey PRIMARY KEY (id);


--
-- Name: message_templates message_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.message_templates
    ADD CONSTRAINT message_templates_pkey PRIMARY KEY (id);


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
-- Name: password_reset_tokens password_reset_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.password_reset_tokens
    ADD CONSTRAINT password_reset_tokens_pkey PRIMARY KEY (id);


--
-- Name: password_reset_tokens password_reset_tokens_token_unique; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.password_reset_tokens
    ADD CONSTRAINT password_reset_tokens_token_unique UNIQUE (token);


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
-- Name: payments payments_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_pkey PRIMARY KEY (id);


--
-- Name: payments payments_transaction_id_unique; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_transaction_id_unique UNIQUE (transaction_id);


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
-- Name: risk_assessments risk_assessments_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.risk_assessments
    ADD CONSTRAINT risk_assessments_pkey PRIMARY KEY (id);


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
-- Name: symptom_checks symptom_checks_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.symptom_checks
    ADD CONSTRAINT symptom_checks_pkey PRIMARY KEY (id);


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
-- Name: doctors_fee doctors_fee_created_by_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.doctors_fee
    ADD CONSTRAINT doctors_fee_created_by_users_id_fk FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: doctors_fee doctors_fee_doctor_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.doctors_fee
    ADD CONSTRAINT doctors_fee_doctor_id_users_id_fk FOREIGN KEY (doctor_id) REFERENCES public.users(id);


--
-- Name: doctors_fee doctors_fee_organization_id_organizations_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.doctors_fee
    ADD CONSTRAINT doctors_fee_organization_id_organizations_id_fk FOREIGN KEY (organization_id) REFERENCES public.organizations(id);


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
-- Name: imaging_pricing imaging_pricing_created_by_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.imaging_pricing
    ADD CONSTRAINT imaging_pricing_created_by_users_id_fk FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: imaging_pricing imaging_pricing_organization_id_organizations_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.imaging_pricing
    ADD CONSTRAINT imaging_pricing_organization_id_organizations_id_fk FOREIGN KEY (organization_id) REFERENCES public.organizations(id);


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
-- Name: lab_test_pricing lab_test_pricing_created_by_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.lab_test_pricing
    ADD CONSTRAINT lab_test_pricing_created_by_users_id_fk FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: lab_test_pricing lab_test_pricing_doctor_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.lab_test_pricing
    ADD CONSTRAINT lab_test_pricing_doctor_id_users_id_fk FOREIGN KEY (doctor_id) REFERENCES public.users(id);


--
-- Name: lab_test_pricing lab_test_pricing_organization_id_organizations_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.lab_test_pricing
    ADD CONSTRAINT lab_test_pricing_organization_id_organizations_id_fk FOREIGN KEY (organization_id) REFERENCES public.organizations(id);


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
-- Name: password_reset_tokens password_reset_tokens_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.password_reset_tokens
    ADD CONSTRAINT password_reset_tokens_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id);


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
-- Name: patients patients_created_by_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.patients
    ADD CONSTRAINT patients_created_by_users_id_fk FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: patients patients_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.patients
    ADD CONSTRAINT patients_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id);


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
-- Name: prescriptions prescriptions_prescription_created_by_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.prescriptions
    ADD CONSTRAINT prescriptions_prescription_created_by_users_id_fk FOREIGN KEY (prescription_created_by) REFERENCES public.users(id);


--
-- Name: revenue_records revenue_records_organization_id_organizations_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.revenue_records
    ADD CONSTRAINT revenue_records_organization_id_organizations_id_fk FOREIGN KEY (organization_id) REFERENCES public.organizations(id);


--
-- Name: risk_assessments risk_assessments_organization_id_organizations_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.risk_assessments
    ADD CONSTRAINT risk_assessments_organization_id_organizations_id_fk FOREIGN KEY (organization_id) REFERENCES public.organizations(id);


--
-- Name: risk_assessments risk_assessments_patient_id_patients_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.risk_assessments
    ADD CONSTRAINT risk_assessments_patient_id_patients_id_fk FOREIGN KEY (patient_id) REFERENCES public.patients(id);


--
-- Name: staff_shifts staff_shifts_created_by_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.staff_shifts
    ADD CONSTRAINT staff_shifts_created_by_users_id_fk FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: symptom_checks symptom_checks_appointment_id_appointments_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.symptom_checks
    ADD CONSTRAINT symptom_checks_appointment_id_appointments_id_fk FOREIGN KEY (appointment_id) REFERENCES public.appointments(id);


--
-- Name: symptom_checks symptom_checks_patient_id_patients_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.symptom_checks
    ADD CONSTRAINT symptom_checks_patient_id_patients_id_fk FOREIGN KEY (patient_id) REFERENCES public.patients(id);


--
-- Name: symptom_checks symptom_checks_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.symptom_checks
    ADD CONSTRAINT symptom_checks_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id);


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

