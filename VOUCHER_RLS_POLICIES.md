# Voucher Table Row Level Security (RLS) Policies

## Overview

Row Level Security (RLS) policies have been implemented for the `voucher` table to control access based on user roles. These policies ensure that only authorized users can create, update, or delete vouchers, while allowing voucher validation for booking purposes.

## Policies Implemented

### 1. **Anyone Can View Vouchers** (SELECT)
```sql
CREATE POLICY "Anyone can view vouchers"
  ON voucher
  FOR SELECT
  USING (true);
```

**Purpose**: Allows anyone (including unauthenticated users) to read voucher information.

**Why**: 
- Customers need to validate voucher codes during booking
- Voucher codes are meant to be shared and checked
- No sensitive information is exposed (only code, value, and usage status)

**Access**: Public (no authentication required)

---

### 2. **Only Owners Can Create Vouchers** (INSERT)
```sql
CREATE POLICY "Owners can create vouchers"
  ON voucher
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.employee e
      WHERE e.user_id = auth.uid()
      AND e.role = 'OWNER'::employee_role
    )
  );
```

**Purpose**: Restricts voucher creation to users with OWNER role.

**Why**:
- Vouchers represent business value/discounts
- Only business owners should be able to create vouchers
- Prevents unauthorized voucher generation

**Access**: Only employees with `role = 'OWNER'`

---

### 3. **Only Owners Can Update Vouchers** (UPDATE)
```sql
CREATE POLICY "Owners can update vouchers"
  ON voucher
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.employee e
      WHERE e.user_id = auth.uid()
      AND e.role = 'OWNER'::employee_role
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.employee e
      WHERE e.user_id = auth.uid()
      AND e.role = 'OWNER'::employee_role
    )
  );
```

**Purpose**: Restricts voucher updates to owners only.

**Why**:
- Prevents unauthorized modification of voucher values or codes
- Ensures data integrity
- Only owners should modify business-critical data

**Access**: Only employees with `role = 'OWNER'`

**Note**: Uses both `USING` (for existing rows) and `WITH CHECK` (for updated rows) to ensure full protection.

---

### 4. **Only Owners Can Delete Vouchers** (DELETE)
```sql
CREATE POLICY "Owners can delete vouchers"
  ON voucher
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.employee e
      WHERE e.user_id = auth.uid()
      AND e.role = 'OWNER'::employee_role
    )
  );
```

**Purpose**: Restricts voucher deletion to owners only.

**Why**:
- Prevents accidental or malicious deletion
- Maintains audit trail
- Only owners should remove vouchers

**Access**: Only employees with `role = 'OWNER'`

---

### 5. **Service Role Can Manage All Vouchers** (ALL)
```sql
CREATE POLICY "Service role can manage all vouchers"
  ON voucher
  FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');
```

**Purpose**: Allows service role (backend/admin) full access to vouchers.

**Why**:
- Edge functions and backend services need full access
- Admin operations require bypassing RLS
- System-level operations need unrestricted access

**Access**: Service role only (not accessible via client SDK)

---

## Access Matrix

| Operation | Public | Authenticated | Owner | Service Role |
|-----------|--------|---------------|-------|--------------|
| **SELECT** (View) | ✅ | ✅ | ✅ | ✅ |
| **INSERT** (Create) | ❌ | ❌ | ✅ | ✅ |
| **UPDATE** (Modify) | ❌ | ❌ | ✅ | ✅ |
| **DELETE** (Remove) | ❌ | ❌ | ✅ | ✅ |

## Security Considerations

### ✅ What's Protected
- Voucher creation is restricted to owners
- Voucher modification is restricted to owners
- Voucher deletion is restricted to owners
- Service role has full access for backend operations

### ⚠️ What's Public
- Voucher codes can be read by anyone
- Voucher values can be read by anyone
- Usage status can be read by anyone

### 🔒 Why Public Read is Safe
1. **Voucher codes are meant to be shared** - They're given to customers
2. **No sensitive data** - Only code, value, and usage status are exposed
3. **Necessary for booking flow** - Customers need to validate codes
4. **Business logic protection** - Only unused vouchers can be applied (checked in application logic)

## Testing the Policies

### Test 1: Public Read Access
```sql
-- Should work (public access)
SELECT * FROM voucher WHERE code = 'BF1234';
```

### Test 2: Owner Create Access
```sql
-- Should work if logged in as owner
INSERT INTO voucher (code, value) VALUES ('BF9999', 100);
```

### Test 3: Non-Owner Create Access
```sql
-- Should fail (not owner)
INSERT INTO voucher (code, value) VALUES ('BF8888', 50);
-- Error: new row violates row-level security policy
```

### Test 4: Owner Update Access
```sql
-- Should work if logged in as owner
UPDATE voucher SET value = 200 WHERE code = 'BF1234';
```

### Test 5: Owner Delete Access
```sql
-- Should work if logged in as owner
DELETE FROM voucher WHERE code = 'BF1234';
```

## Migration

The RLS policies are included in `database/migrations/add_voucher_constraints.sql`. Run this migration to:

1. Add constraints and indexes
2. Enable RLS on the voucher table
3. Create all security policies

## Notes

- RLS is enabled at the database level, providing security even if application logic is bypassed
- Policies are evaluated for every query, ensuring consistent security
- Service role bypasses all RLS policies (by design, for backend operations)
- The `employee` table must exist and have the correct structure for owner checks to work

