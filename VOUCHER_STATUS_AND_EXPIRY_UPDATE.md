# Voucher Status and Expiry Update

## Overview

The voucher system has been updated to use a `status` column instead of `used_at`, and added an optional `expires_on` column for expiration dates.

## Changes Made

### 1. Database Schema Changes

**Migration File**: `database/migrations/add_voucher_status_and_expiry.sql`

- ✅ Created `voucher_status` enum type with values: `ACTIVE`, `USED`, `EXPIRED`
- ✅ Added `expires_on` column (optional DATE)
- ✅ Added `status` column (required, defaults to `ACTIVE`)
- ✅ Migrated existing data from `used_at` to `status`
- ✅ Removed `used_at` column
- ✅ Created indexes for performance
- ✅ Created function `update_expired_vouchers()` to automatically mark expired vouchers

### 2. Status Values

| Status | Description |
|--------|-------------|
| `ACTIVE` | Voucher is valid and can be used |
| `USED` | Voucher has been applied to a booking |
| `EXPIRED` | Voucher has passed its expiration date |

### 3. Code Updates

#### `lib/actions/voucherActions.ts`
- ✅ Updated `checkVoucher()` to check `status` instead of `used_at`
- ✅ Added automatic expiration checking
- ✅ Updated `createVoucherAction()` to accept `expires_on` parameter
- ✅ Added `updateExpiredVouchers()` helper function

#### `lib/actions/bookingActions.ts`
- ✅ Updated voucher validation to check `status = 'ACTIVE'`
- ✅ Updated voucher marking to set `status = 'USED'` instead of `used_at`
- ✅ Added expiration date checking before applying voucher

#### `components/manage/VoucherFormModal.tsx`
- ✅ Added `expiresOn` field to form schema
- ✅ Added date picker for expiration date selection
- ✅ Updated form to include expiration date input
- ✅ Updated default values and reset logic

#### `components/manage/ManageVouchers.tsx`
- ✅ Updated type definitions to use `status` instead of `used_at`
- ✅ Updated UI to show status badges (Active/Used/Expired)
- ✅ Added expiration date display
- ✅ Updated delete button logic to only show for ACTIVE vouchers

## Migration Steps

1. **Run the migration**:
   ```sql
   -- Run database/migrations/add_voucher_status_and_expiry.sql
   ```

2. **Verify migration**:
   ```sql
   -- Check that status column exists
   SELECT column_name, data_type 
   FROM information_schema.columns 
   WHERE table_name = 'voucher' 
   AND column_name IN ('status', 'expires_on', 'used_at');
   
   -- Should show: status (voucher_status), expires_on (date)
   -- Should NOT show: used_at
   ```

3. **Test voucher creation**:
   - Create a voucher with expiration date
   - Create a voucher without expiration date
   - Verify status is set to ACTIVE

4. **Test voucher usage**:
   - Apply voucher to a booking
   - Verify status changes to USED

5. **Test expiration**:
   - Create voucher with past expiration date
   - Verify it's marked as EXPIRED
   - Try to use expired voucher (should fail)

## Automatic Expiration Handling

The system automatically checks for expired vouchers:

1. **On voucher check** (`checkVoucher()`)
   - Updates expired vouchers before validation

2. **On booking creation** (`createBookingAction()`)
   - Updates expired vouchers before applying voucher

3. **Manual update function**
   - `update_expired_vouchers()` can be called via RPC
   - Can be scheduled via cron job for automatic updates

## UI Changes

### Voucher Form
- Added "Expiration Date (Optional)" field with date picker
- Shows calendar icon and formatted date
- Can clear expiration date with X button

### Voucher List
- Shows status badge: Active (green), Used (red), Expired (red)
- Displays expiration date if set
- Shows status text
- Delete button only visible for ACTIVE vouchers

## Benefits

1. **Better Status Tracking**: Clear status instead of nullable timestamp
2. **Expiration Support**: Optional expiration dates for time-limited vouchers
3. **Automatic Expiration**: System automatically marks expired vouchers
4. **Better UX**: Clear visual indicators for voucher status
5. **Data Integrity**: Enum type ensures valid status values

## Notes

- Existing vouchers with `used_at` set will be migrated to `status = 'USED'`
- Existing vouchers without `used_at` will be set to `status = 'ACTIVE'`
- Expiration checking happens automatically, but you can also run `update_expired_vouchers()` manually
- Consider setting up a cron job to run expiration updates daily

