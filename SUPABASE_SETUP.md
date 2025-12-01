# Supabase Setup Guide for Voucher Email Function

## 1. Database Migration

Run the SQL migration to add constraints and indexes:

```sql
-- File: database/migrations/add_voucher_constraints.sql
-- Run this in your Supabase SQL Editor
```

This migration will:
- Add `customer_id` column to the voucher table
- Add constraint to ensure voucher codes are exactly 6 characters
- Add constraint to ensure voucher codes start with 'BF' and are uppercase
- Create indexes for better performance

## 2. Edge Function Setup

### Deploy the Edge Function

1. **Install Supabase CLI** (if not already installed):
   ```bash
   npm install -g supabase
   ```

2. **Login to Supabase**:
   ```bash
   supabase login
   ```

3. **Link your project**:
   ```bash
   supabase link --project-ref your-project-ref
   ```

4. **Deploy the function**:
   ```bash
   supabase functions deploy send-voucher-email
   ```

### Set Environment Variables

Set the `RESEND_API_KEY` environment variable in your Supabase project:

1. Go to your Supabase Dashboard
2. Navigate to **Project Settings** > **Edge Functions**
3. Add the environment variable:
   - Key: `RESEND_API_KEY`
   - Value: Your Resend API key

### Get Resend API Key

1. Sign up at [resend.com](https://resend.com) (if you don't have an account)
2. Go to **API Keys** section
3. Create a new API key
4. Copy the key and add it to Supabase environment variables

## 3. Update Email Domain (Optional)

If you want to use a custom domain for sending emails:

1. In Resend dashboard, go to **Domains**
2. Add your domain (e.g., `beautyfeel.net`)
3. Verify the domain by adding DNS records
4. Update the `from` field in the edge function to use your verified domain

## 4. Testing

Test the edge function using curl or Postman:

```bash
curl -X POST https://your-project-ref.supabase.co/functions/v1/send-voucher-email \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "customer@example.com",
    "customerName": "John Doe",
    "voucherCode": "BF1234",
    "voucherValue": 500
  }'
```

## 5. Function Permissions

Make sure the edge function is accessible. In Supabase Dashboard:
- Go to **Edge Functions** > **send-voucher-email**
- Check that it's deployed and active
- Verify the function URL matches what's in your code

## Notes

- The function uses Resend for email delivery
- Make sure `RESEND_API_KEY` is set in Supabase environment variables
- The function expects POST requests with JSON body containing: `email`, `customerName`, `voucherCode`, `voucherValue`
- Voucher codes are now limited to exactly 6 characters (BF + 4 alphanumeric)

