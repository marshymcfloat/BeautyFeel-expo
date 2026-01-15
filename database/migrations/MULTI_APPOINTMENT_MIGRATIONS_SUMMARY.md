# Multi-Appointment Service Flow - Migration Summary

This document lists all SQL migrations that need to be executed in Supabase SQL Editor for the multi-appointment feature.

## Migration Order

Execute these migrations in the following order:

1. **021_add_multi_appointment_to_service.sql**
   - Adds `requires_appointments` and `total_appointments` fields to the `service` table

2. **022_create_service_appointment_steps.sql**
   - Creates `service_appointment_steps` table for defining appointment steps

3. **023_create_customer_appointment_sessions.sql**
   - Creates `customer_appointment_sessions` table for tracking customer progress
   - Creates `appointment_session_status` enum

4. **024_create_appointment_session_bookings.sql**
   - Creates `appointment_session_bookings` table to link bookings to sessions

5. **025_update_email_reminders_for_appointments.sql**
   - Extends `email_reminders` table with appointment session support
   - Creates `reminder_type` enum

6. **026_create_appointment_session_functions.sql**
   - Creates RPC functions:
     - `get_upcoming_appointment_sessions(customer_id)`
     - `mark_appointment_attended(session_id, booking_id)`
     - `get_next_recommended_appointment_date(session_id)`
     - `check_and_send_appointment_reminders()`

## How to Execute

1. Open Supabase Dashboard
2. Go to SQL Editor
3. Copy and paste each migration file's contents
4. Execute them in order (1-6)
5. After all migrations are complete, regenerate TypeScript types:
   ```bash
   npm run generate:types
   ```

## Notes

- All migrations are idempotent (safe to run multiple times)
- The migrations add new functionality without breaking existing features
- Existing bookings and services will continue to work normally
- Multi-appointment features are opt-in per service

