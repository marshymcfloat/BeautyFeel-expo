# Cron Job Setup Instructions for Appointment Reminders

This guide explains how to set up automated email reminders for multi-appointment services.

## Prerequisites

1. **Enable Extensions in Supabase**

   - Go to Supabase Dashboard > Database > Extensions
   - Enable `pg_cron` extension
   - Enable `pg_net` extension (for calling Edge Functions via HTTP)

2. **Deploy Edge Function**

   - Deploy the `send-appointment-reminders` Edge Function:
     ```bash
     supabase functions deploy send-appointment-reminders
     ```
   - Or use Supabase Dashboard > Edge Functions > Deploy

3. **Set Environment Variables**
   - In Supabase Dashboard > Edge Functions > send-appointment-reminders > Settings
   - Add these secrets:
     - `RESEND_API_KEY` - Your Resend API key for sending emails
     - `SUPABASE_URL` - Your Supabase project URL
     - `SUPABASE_SERVICE_ROLE_KEY` - Your Supabase service role key

## Setup Steps

### Step 1: Update Migration 027

Before running migration `027_setup_appointment_reminder_cron.sql`, you need to replace placeholders:

1. Open `database/migrations/027_setup_appointment_reminder_cron.sql`
2. Replace `YOUR_PROJECT_REF` with your Supabase project reference
   - Find this in: Supabase Dashboard > Settings > API > Project URL
   - Example: If URL is `https://abcdefghijklmnop.supabase.co`, then `abcdefghijklmnop` is your project ref
3. Replace `YOUR_ANON_KEY` with your Supabase anonymous key
   - Find this in: Supabase Dashboard > Settings > API > anon/public key

### Step 2: Run Migration 027

Execute the migration in Supabase SQL Editor:

```sql
-- Run the migration file: 027_setup_appointment_reminder_cron.sql
```

### Step 3: Verify Cron Job

Check if the cron job was created:

```sql
SELECT * FROM cron.job WHERE jobname = 'appointment-reminder-check';
```

### Step 4: Test Manually

Test the Edge Function manually:

```bash
curl -X POST \
  'https://YOUR_PROJECT_REF.supabase.co/functions/v1/send-appointment-reminders' \
  -H 'Authorization: Bearer YOUR_ANON_KEY' \
  -H 'Content-Type: application/json'
```

Or test via Supabase Dashboard:

- Go to Edge Functions > send-appointment-reminders > Invoke

## Cron Schedule

The default schedule is **9:00 AM UTC daily**. To change it:

```sql
-- Update schedule to 10:00 AM UTC daily
SELECT cron.unschedule('appointment-reminder-check');
SELECT cron.schedule(
  'appointment-reminder-check',
  '0 10 * * *', -- 10:00 AM UTC
  $$
  SELECT net.http_post(
    url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/send-appointment-reminders',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer YOUR_ANON_KEY'
    ),
    body := '{}'::jsonb
  ) AS request_id;
  $$
);
```

## Cron Schedule Format

The cron format is: `minute hour day month weekday`

Examples:

- `0 9 * * *` - Every day at 9:00 AM UTC
- `0 */6 * * *` - Every 6 hours
- `0 9 * * 1` - Every Monday at 9:00 AM UTC
- `0 9,15 * * *` - At 9:00 AM and 3:00 PM UTC daily

## Monitoring

### View Cron Job Status

```sql
-- View all scheduled jobs
SELECT * FROM cron.job;

-- View recent job runs
SELECT * FROM cron.job_run_details
ORDER BY start_time DESC
LIMIT 10;

-- View specific job details
SELECT * FROM cron.job_run_details
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'appointment-reminder-check')
ORDER BY start_time DESC;
```

### View Sent Reminders

```sql
-- View all appointment reminders sent
SELECT
  er.*,
  cas.customer_id,
  c.name AS customer_name,
  c.email AS customer_email
FROM email_reminders er
JOIN customer_appointment_sessions cas ON er.session_id = cas.id
JOIN customer c ON cas.customer_id = c.id
WHERE er.reminder_type = 'APPOINTMENT_STEP'
ORDER BY er.sent_at DESC;
```

## Troubleshooting

### Cron Job Not Running

1. Check if pg_cron extension is enabled:

   ```sql
   SELECT * FROM pg_extension WHERE extname = 'pg_cron';
   ```

2. Check cron job status:

   ```sql
   SELECT * FROM cron.job WHERE jobname = 'appointment-reminder-check';
   ```

3. Check for errors in job runs:
   ```sql
   SELECT * FROM cron.job_run_details
   WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'appointment-reminder-check')
   AND status = 'failed'
   ORDER BY start_time DESC;
   ```

### Edge Function Not Working

1. Check Edge Function logs in Supabase Dashboard
2. Verify environment variables are set correctly
3. Test the function manually using curl or Dashboard
4. Check that RESEND_API_KEY is valid

### Emails Not Sending

1. Verify Resend API key is correct
2. Check Edge Function logs for errors
3. Verify customer emails are valid
4. Check Resend dashboard for email delivery status

## Alternative: External Cron Service

If pg_cron is not available, you can use an external cron service (e.g., cron-job.org, EasyCron) to call the Edge Function:

1. Set up a scheduled HTTP request to:

   ```
   POST https://YOUR_PROJECT_REF.supabase.co/functions/v1/send-appointment-reminders
   Headers:
     Authorization: Bearer YOUR_ANON_KEY
     Content-Type: application/json
   ```

2. Schedule it to run daily at your desired time

## Security Notes

- The cron job uses the anon key, which is safe for public Edge Functions
- The Edge Function uses the service role key internally for database access
- Never expose your service role key in client-side code
- Consider adding authentication to the Edge Function if needed
