# Database schema — revision 0007

Generated from SQLAlchemy metadata using PostgreSQL types. Alembic is the only schema migration mechanism. Migrations additionally install append-only triggers; metadata is not their complete description. Development document objects are not a production storage adapter.

## `ai_prediction_requests`

| Column | Type | Nullable | References |
|---|---|---|---|
| patient_id | UUID | False | patients.id |
| requesting_user | UUID | False | users.id |
| request_id | VARCHAR(64) | False |  |
| encrypted_input | JSONB | False |  |
| model_version_id | UUID | True | model_versions.id |
| status | VARCHAR(30) | False |  |
| id | UUID | False |  |
| created_at | TIMESTAMP WITH TIME ZONE | False |  |

## `appointment_status_history`

| Column | Type | Nullable | References |
|---|---|---|---|
| appointment_id | UUID | False | appointments.id |
| status | VARCHAR(30) | False |  |
| version | INTEGER | False |  |
| actor_id | UUID | False | users.id |
| id | UUID | False |  |
| created_at | TIMESTAMP WITH TIME ZONE | False |  |

## `appointments`

| Column | Type | Nullable | References |
|---|---|---|---|
| patient_id | UUID | False | patients.id |
| facility_id | UUID | False | facilities.id, patients.facility_id |
| doctor_id | UUID | False | doctors.id |
| starts_at | TIMESTAMP WITH TIME ZONE | False |  |
| ends_at | TIMESTAMP WITH TIME ZONE | False |  |
| appointment_type | VARCHAR(30) | False |  |
| status | VARCHAR(30) | False |  |
| version | INTEGER | False |  |
| created_by | UUID | False | users.id |
| id | UUID | False |  |
| created_at | TIMESTAMP WITH TIME ZONE | False |  |

## `audit_logs`

| Column | Type | Nullable | References |
|---|---|---|---|
| actor_id | UUID | True | users.id |
| facility_id | UUID | True | facilities.id |
| actor_roles | JSONB | False |  |
| action | VARCHAR(100) | False |  |
| resource_type | VARCHAR(60) | False |  |
| resource_id | UUID | True |  |
| patient_id | UUID | True |  |
| request_id | VARCHAR(64) | False |  |
| result | VARCHAR(30) | False |  |
| reason | VARCHAR(200) | False |  |
| ip | VARCHAR(64) | False |  |
| user_agent | VARCHAR(180) | False |  |
| id | UUID | False |  |
| created_at | TIMESTAMP WITH TIME ZONE | False |  |

## `billing_disputes`

| Column | Type | Nullable | References |
|---|---|---|---|
| invoice_id | UUID | False | invoices.id |
| encrypted_reason | JSONB | False |  |
| created_by | UUID | False | users.id |
| status | VARCHAR(20) | False |  |
| id | UUID | False |  |
| created_at | TIMESTAMP WITH TIME ZONE | False |  |

## `care_assignments`

| Column | Type | Nullable | References |
|---|---|---|---|
| patient_id | UUID | False | patients.id |
| clinician_id | UUID | False | users.id |
| active | BOOLEAN | False |  |
| id | UUID | False |  |
| created_at | TIMESTAMP WITH TIME ZONE | False |  |

## `clinical_documents`

| Column | Type | Nullable | References |
|---|---|---|---|
| patient_id | UUID | False | patients.id |
| created_by | UUID | False | users.id |
| encrypted_metadata | JSONB | False |  |
| sha256 | VARCHAR(64) | False |  |
| size_bytes | INTEGER | False |  |
| media_type | VARCHAR(40) | False |  |
| state | VARCHAR(30) | False |  |
| scan_status | VARCHAR(40) | False |  |
| id | UUID | False |  |
| created_at | TIMESTAMP WITH TIME ZONE | False |  |

## `departments`

| Column | Type | Nullable | References |
|---|---|---|---|
| facility_id | UUID | False | facilities.id |
| name | VARCHAR(120) | False |  |
| active | BOOLEAN | False |  |
| version | INTEGER | False |  |
| id | UUID | False |  |
| created_at | TIMESTAMP WITH TIME ZONE | False |  |

## `development_document_objects`

| Column | Type | Nullable | References |
|---|---|---|---|
| document_id | UUID | False | clinical_documents.id |
| encrypted_content | JSONB | False |  |
| id | UUID | False |  |
| created_at | TIMESTAMP WITH TIME ZONE | False |  |

## `doctor_availability`

| Column | Type | Nullable | References |
|---|---|---|---|
| doctor_id | UUID | False | doctors.id |
| facility_id | UUID | False | facilities.id |
| starts_at | TIMESTAMP WITH TIME ZONE | False |  |
| ends_at | TIMESTAMP WITH TIME ZONE | False |  |
| id | UUID | False |  |
| created_at | TIMESTAMP WITH TIME ZONE | False |  |

## `doctors`

| Column | Type | Nullable | References |
|---|---|---|---|
| user_id | UUID | False | users.id |
| specialty_label | VARCHAR(100) | False |  |
| id | UUID | False |  |
| created_at | TIMESTAMP WITH TIME ZONE | False |  |

## `exchange_jobs`

| Column | Type | Nullable | References |
|---|---|---|---|
| facility_id | UUID | False | facilities.id |
| actor_id | UUID | False | users.id |
| session_id | UUID | False | sessions.id |
| kind | VARCHAR(20) | False |  |
| status | VARCHAR(30) | False |  |
| version | INTEGER | False |  |
| encrypted_payload | JSONB | False |  |
| expires_at | TIMESTAMP WITH TIME ZONE | False |  |
| error_code | VARCHAR(60) | True |  |
| id | UUID | False |  |
| created_at | TIMESTAMP WITH TIME ZONE | False |  |

## `facilities`

| Column | Type | Nullable | References |
|---|---|---|---|
| organization_id | UUID | False | organizations.id |
| name | VARCHAR(160) | False |  |
| timezone | VARCHAR(64) | False |  |
| id | UUID | False |  |
| created_at | TIMESTAMP WITH TIME ZONE | False |  |

## `facility_configuration`

| Column | Type | Nullable | References |
|---|---|---|---|
| facility_id | UUID | False | facilities.id |
| values | JSONB | False |  |
| version | INTEGER | False |  |
| updated_by | UUID | False | users.id |
| id | UUID | False |  |
| created_at | TIMESTAMP WITH TIME ZONE | False |  |

## `idempotency_requests`

| Column | Type | Nullable | References |
|---|---|---|---|
| actor_id | UUID | False | users.id |
| facility_id | UUID | False | facilities.id |
| operation | VARCHAR(150) | False |  |
| key | VARCHAR(128) | False |  |
| request_hash | VARCHAR(64) | False |  |
| response | JSONB | False |  |
| resource_id | UUID | False |  |
| id | UUID | False |  |
| created_at | TIMESTAMP WITH TIME ZONE | False |  |

## `identity_challenges`

| Column | Type | Nullable | References |
|---|---|---|---|
| user_id | UUID | False | users.id |
| purpose | VARCHAR(20) | False |  |
| token_hash | VARCHAR(64) | False |  |
| expires_at | TIMESTAMP WITH TIME ZONE | False |  |
| consumed_at | TIMESTAMP WITH TIME ZONE | True |  |
| encrypted_delivery | JSONB | False |  |
| delivery_status | VARCHAR(30) | False |  |
| id | UUID | False |  |
| created_at | TIMESTAMP WITH TIME ZONE | False |  |

## `invoice_items`

| Column | Type | Nullable | References |
|---|---|---|---|
| invoice_id | UUID | False | invoices.id |
| service_reference | VARCHAR(100) | False |  |
| quantity | INTEGER | False |  |
| unit_price | NUMERIC(16, 4) | False |  |
| id | UUID | False |  |
| created_at | TIMESTAMP WITH TIME ZONE | False |  |

## `invoices`

| Column | Type | Nullable | References |
|---|---|---|---|
| patient_id | UUID | False | patients.id |
| facility_id | UUID | False | facilities.id, patients.facility_id |
| source_reference | VARCHAR(100) | False |  |
| currency | VARCHAR(3) | False |  |
| total | NUMERIC(20, 4) | False |  |
| status | VARCHAR(20) | False |  |
| created_by | UUID | False | users.id |
| id | UUID | False |  |
| created_at | TIMESTAMP WITH TIME ZONE | False |  |

## `legal_hold_events`

| Column | Type | Nullable | References |
|---|---|---|---|
| hold_id | UUID | False | legal_holds.id |
| version | INTEGER | False |  |
| active | BOOLEAN | False |  |
| encrypted_reason | JSONB | False |  |
| actor_id | UUID | False | users.id |
| id | UUID | False |  |
| created_at | TIMESTAMP WITH TIME ZONE | False |  |

## `legal_holds`

| Column | Type | Nullable | References |
|---|---|---|---|
| patient_id | UUID | False | patients.id |
| active | BOOLEAN | False |  |
| version | INTEGER | False |  |
| created_by | UUID | False | users.id |
| id | UUID | False |  |
| created_at | TIMESTAMP WITH TIME ZONE | False |  |

## `login_attempts`

| Column | Type | Nullable | References |
|---|---|---|---|
| identity_hash | VARCHAR(64) | False |  |
| successful | BOOLEAN | False |  |
| id | UUID | False |  |
| created_at | TIMESTAMP WITH TIME ZONE | False |  |

## `medical_record_versions`

| Column | Type | Nullable | References |
|---|---|---|---|
| record_id | UUID | False | medical_records.id |
| version | INTEGER | False |  |
| encrypted_payload | JSONB | False |  |
| created_by | UUID | False | users.id |
| id | UUID | False |  |
| created_at | TIMESTAMP WITH TIME ZONE | False |  |

## `medical_records`

| Column | Type | Nullable | References |
|---|---|---|---|
| patient_id | UUID | False | patients.id |
| record_type | VARCHAR(30) | False |  |
| version | INTEGER | False |  |
| created_by | UUID | False | users.id |
| id | UUID | False |  |
| created_at | TIMESTAMP WITH TIME ZONE | False |  |

## `model_versions`

| Column | Type | Nullable | References |
|---|---|---|---|
| model_id | VARCHAR(100) | False |  |
| version | VARCHAR(100) | False |  |
| dataset_identifier | VARCHAR(200) | False |  |
| training_date | DATE | False |  |
| feature_schema | JSONB | False |  |
| evaluation_metrics | JSONB | False |  |
| artifact_sha256 | VARCHAR(64) | False |  |
| limitations | TEXT | False |  |
| intended_use | TEXT | False |  |
| contraindicated_use | TEXT | False |  |
| approval_status | VARCHAR(30) | False |  |
| deployment_status | VARCHAR(30) | False |  |
| created_by | UUID | False | users.id |
| facility_id | UUID | False | facilities.id |
| id | UUID | False |  |
| created_at | TIMESTAMP WITH TIME ZONE | False |  |

## `multi_factors`

| Column | Type | Nullable | References |
|---|---|---|---|
| user_id | UUID | False | users.id |
| encrypted_secret | JSONB | False |  |
| enabled | BOOLEAN | False |  |
| expires_at | TIMESTAMP WITH TIME ZONE | False |  |
| last_counter | INTEGER | False |  |
| recovery_hashes | JSONB | False |  |
| id | UUID | False |  |
| created_at | TIMESTAMP WITH TIME ZONE | False |  |

## `notification_delivery_attempts`

| Column | Type | Nullable | References |
|---|---|---|---|
| outbox_id | UUID | False | outbox_events.id |
| channel | VARCHAR(20) | False |  |
| status | VARCHAR(30) | False |  |
| id | UUID | False |  |
| created_at | TIMESTAMP WITH TIME ZONE | False |  |

## `notification_preferences`

| Column | Type | Nullable | References |
|---|---|---|---|
| user_id | UUID | False | users.id |
| facility_id | UUID | False | facilities.id |
| email_enabled | BOOLEAN | False |  |
| sms_enabled | BOOLEAN | False |  |
| version | INTEGER | False |  |
| id | UUID | False |  |
| created_at | TIMESTAMP WITH TIME ZONE | False |  |

## `notifications`

| Column | Type | Nullable | References |
|---|---|---|---|
| outbox_id | UUID | False | outbox_events.id |
| recipient_id | UUID | False | users.id |
| facility_id | UUID | False | facilities.id |
| kind | VARCHAR(60) | False |  |
| resource_id | UUID | False |  |
| read_at | TIMESTAMP WITH TIME ZONE | True |  |
| id | UUID | False |  |
| created_at | TIMESTAMP WITH TIME ZONE | False |  |

## `organizations`

| Column | Type | Nullable | References |
|---|---|---|---|
| name | VARCHAR(160) | False |  |
| id | UUID | False |  |
| created_at | TIMESTAMP WITH TIME ZONE | False |  |

## `outbox_events`

| Column | Type | Nullable | References |
|---|---|---|---|
| facility_id | UUID | False | facilities.id |
| recipient_id | UUID | False | users.id |
| event_key | VARCHAR(200) | False |  |
| kind | VARCHAR(60) | False |  |
| resource_id | UUID | False |  |
| processed_at | TIMESTAMP WITH TIME ZONE | True |  |
| id | UUID | False |  |
| created_at | TIMESTAMP WITH TIME ZONE | False |  |

## `patient_consents`

| Column | Type | Nullable | References |
|---|---|---|---|
| patient_id | UUID | False | patients.id |
| consent_type | VARCHAR(100) | False |  |
| status | VARCHAR(20) | False |  |
| purpose | VARCHAR(300) | False |  |
| version | VARCHAR(40) | False |  |
| granted_at | TIMESTAMP WITH TIME ZONE | True |  |
| revoked_at | TIMESTAMP WITH TIME ZONE | True |  |
| created_by | UUID | False | users.id |
| id | UUID | False |  |
| created_at | TIMESTAMP WITH TIME ZONE | False |  |

## `patient_profile_versions`

| Column | Type | Nullable | References |
|---|---|---|---|
| patient_id | UUID | False | patients.id |
| version | INTEGER | False |  |
| encrypted_profile | JSONB | False |  |
| created_by | UUID | False | users.id |
| id | UUID | False |  |
| created_at | TIMESTAMP WITH TIME ZONE | False |  |

## `patients`

| Column | Type | Nullable | References |
|---|---|---|---|
| organization_id | UUID | False | facilities.organization_id, organizations.id |
| facility_id | UUID | False | facilities.id |
| user_id | UUID | True | users.id |
| profile | JSONB | False |  |
| duplicate_fingerprint | VARCHAR(64) | False |  |
| insurance_status | VARCHAR(20) | False |  |
| version | INTEGER | False |  |
| deleted_at | TIMESTAMP WITH TIME ZONE | True |  |
| created_by | UUID | False | users.id |
| updated_by | UUID | False | users.id |
| id | UUID | False |  |
| created_at | TIMESTAMP WITH TIME ZONE | False |  |

## `refresh_tokens`

| Column | Type | Nullable | References |
|---|---|---|---|
| session_id | UUID | False | sessions.id |
| token_hash | VARCHAR(64) | False |  |
| used_at | TIMESTAMP WITH TIME ZONE | True |  |
| id | UUID | False |  |
| created_at | TIMESTAMP WITH TIME ZONE | False |  |

## `roles`

| Column | Type | Nullable | References |
|---|---|---|---|
| name | VARCHAR(40) | False |  |
| id | UUID | False |  |
| created_at | TIMESTAMP WITH TIME ZONE | False |  |

## `sessions`

| Column | Type | Nullable | References |
|---|---|---|---|
| user_id | UUID | False | users.id |
| expires_at | TIMESTAMP WITH TIME ZONE | False |  |
| revoked_at | TIMESTAMP WITH TIME ZONE | True |  |
| device | VARCHAR(180) | False |  |
| id | UUID | False |  |
| created_at | TIMESTAMP WITH TIME ZONE | False |  |

## `staff_departments`

| Column | Type | Nullable | References |
|---|---|---|---|
| user_id | UUID | False | users.id |
| department_id | UUID | False | departments.id |
| id | UUID | False |  |
| created_at | TIMESTAMP WITH TIME ZONE | False |  |

## `user_roles`

| Column | Type | Nullable | References |
|---|---|---|---|
| user_id | UUID | False | users.id |
| facility_id | UUID | False | facilities.id |
| role | VARCHAR(40) | False | roles.name |
| id | UUID | False |  |
| created_at | TIMESTAMP WITH TIME ZONE | False |  |

## `users`

| Column | Type | Nullable | References |
|---|---|---|---|
| email | VARCHAR(254) | False |  |
| display_name | VARCHAR(120) | False |  |
| password_hash | TEXT | False |  |
| active | BOOLEAN | False |  |
| verified | BOOLEAN | False |  |
| id | UUID | False |  |
| created_at | TIMESTAMP WITH TIME ZONE | False |  |

