# API inventory — implemented surface

Generated from FastAPI. Endpoint existence does not mean a provider is configured. See usage.md and ../security/controls.md.

| Method | Path | Operation |
|---|---|---|
| GET | `/health/live` | Live |
| GET | `/health/ready` | Ready |
| GET | `/health` | Ready |
| POST | `/api/v1/auth/register` | Register |
| POST | `/api/v1/auth/login` | Login |
| POST | `/api/v1/auth/refresh` | Refresh |
| POST | `/api/v1/auth/logout` | Logout |
| POST | `/api/v1/auth/forgot-password` | Forgot |
| POST | `/api/v1/auth/verification/request` | Verify Email |
| GET | `/api/v1/auth/me` | Me |
| GET | `/api/v1/auth/sessions` | Sessions |
| DELETE | `/api/v1/auth/sessions/{identifier}` | Revoke |
| GET | `/api/v1/patients` | Patients |
| POST | `/api/v1/patients` | Create Patient |
| GET | `/api/v1/patients/{identifier}` | Patient |
| PUT | `/api/v1/patients/{identifier}` | Update Patient |
| PATCH | `/api/v1/patients/{identifier}` | Patch Patient |
| DELETE | `/api/v1/patients/{identifier}` | Delete Patient |
| PUT | `/api/v1/patients/{identifier}/assignment` | Assign |
| GET | `/api/v1/patients/{identifier}/consents` | Consents |
| POST | `/api/v1/patients/{identifier}/consents` | Consent |
| GET | `/api/v1/doctors` | Doctors |
| GET | `/api/v1/doctors/{identifier}/availability` | Availability |
| POST | `/api/v1/doctors/{identifier}/availability` | Add Availability |
| GET | `/api/v1/appointments/available-slots` | Slots |
| GET | `/api/v1/appointments` | Appointments |
| POST | `/api/v1/appointments` | Book |
| GET | `/api/v1/appointments/{identifier}` | Appointment |
| PUT | `/api/v1/appointments/{identifier}` | Reschedule |
| DELETE | `/api/v1/appointments/{identifier}` | Cancel |
| POST | `/api/v1/appointments/{identifier}/cancel` | Cancel |
| GET | `/api/v1/invoices` | Invoices |
| POST | `/api/v1/invoices` | Invoice |
| GET | `/api/v1/invoices/{identifier}` | Get Invoice |
| POST | `/api/v1/invoices/{identifier}/disputes` | Dispute |
| POST | `/api/v1/invoices/{identifier}/claims` | Claim |
| POST | `/api/v1/invoices/{identifier}/payments` | Payment |
| GET | `/api/v1/patients/{identifier}/medical-records` | Records |
| POST | `/api/v1/medical-records` | Clinical Write |
| POST | `/api/v1/clinical-ai/predict` | Predict |
| GET | `/api/v1/notifications` | Notifications |
| POST | `/api/v1/notifications/{identifier}/read` | Notification Read |
| GET | `/api/v1/audit` | Audit |
| GET | `/api/v1/admin/summary` | Summary |
| GET | `/api/v1/integrations` | Integrations |
| GET | `/api/v1/clinical-ai/models` | Models |
| POST | `/api/v1/clinical-ai/models` | Register Model |
| POST | `/api/v1/auth/verification/complete` | Verify |
| POST | `/api/v1/auth/reset-password` | Reset |
| POST | `/api/v1/auth/change-password` | Password |
| GET | `/api/v1/auth/mfa` | Mfa Status |
| POST | `/api/v1/auth/mfa/setup` | Mfa Setup |
| POST | `/api/v1/auth/mfa/enable` | Mfa Enable |
| POST | `/api/v1/auth/mfa/disable` | Mfa Disable |
| GET | `/api/v1/admin/facilities` | Facilities |
| POST | `/api/v1/admin/facilities` | Facility Create |
| GET | `/api/v1/admin/staff` | Staff |
| POST | `/api/v1/admin/memberships` | Membership |
| PUT | `/api/v1/admin/accounts/{identifier}` | Account |
| GET | `/api/v1/admin/departments` | Departments |
| POST | `/api/v1/admin/departments` | Department Create |
| PUT | `/api/v1/admin/departments/{identifier}` | Department Update |
| PUT | `/api/v1/admin/department-assignments` | Department Assignment |
| GET | `/api/v1/admin/configuration` | Configuration |
| PUT | `/api/v1/admin/configuration` | Configuration Update |
| DELETE | `/api/v1/doctors/{doctor_id}/availability/{identifier}` | Remove Window |
| GET | `/api/v1/patients/{identifier}/profile-history` | History |
| GET | `/api/v1/patients/{identifier}/holds` | Holds |
| POST | `/api/v1/patients/{identifier}/holds` | Hold Create |
| POST | `/api/v1/patients/{patient_id}/holds/{identifier}/release` | Hold Release |
| GET | `/api/v1/notification-preferences` | Preferences |
| PUT | `/api/v1/notification-preferences` | Preference Update |
| POST | `/api/v1/exchange/imports` | Import Create |
| POST | `/api/v1/exchange/exports` | Export Create |
| GET | `/api/v1/exchange/jobs` | Jobs |
| GET | `/api/v1/exchange/jobs/{identifier}` | Job |
| POST | `/api/v1/exchange/jobs/{identifier}/approve` | Approve Job |
| POST | `/api/v1/exchange/jobs/{identifier}/cancel` | Cancel Job |
| POST | `/api/v1/exchange/jobs/{identifier}/download` | Download |
| POST | `/api/v1/exchange/jobs/{identifier}/preview` | Preview Job |
| POST | `/api/v1/patients/{identifier}/documents` | Upload |
| GET | `/api/v1/patients/{identifier}/documents` | Listing |
| POST | `/api/v1/documents/{identifier}/download` | Download |
| POST | `/api/v1/documents/{identifier}/retry-scan` | Retry Scan |
