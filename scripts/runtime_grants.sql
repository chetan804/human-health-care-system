-- Run with migration/owner credentials after separately creating a NON-OWNER hcs_runtime role.
-- No passwords are created or embedded here. Operator must provision authentication externally.
BEGIN;
GRANT CONNECT ON DATABASE hcs TO hcs_runtime;
GRANT USAGE ON SCHEMA public TO hcs_runtime;
GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA public TO hcs_runtime;
REVOKE UPDATE ON audit_logs, medical_record_versions, appointment_status_history,
  patient_consents, model_versions, patient_profile_versions, legal_hold_events,
  development_document_objects FROM hcs_runtime;
GRANT DELETE ON user_roles, staff_departments, multi_factors, doctor_availability TO hcs_runtime;
REVOKE ALL ON alembic_version FROM hcs_runtime;
REVOKE CREATE ON SCHEMA public FROM hcs_runtime;
COMMIT;
-- Future migrations must review grants; do not grant blanket default privileges automatically.
-- Revalidate ownership, role inheritance, schema privileges and extension privileges in staging.
