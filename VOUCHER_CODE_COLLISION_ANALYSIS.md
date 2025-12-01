# Voucher Code Collision Analysis

## Probability Calculation

### Code Space

- Format: `BF` + 4 alphanumeric characters
- Each character can be: A-Z (26 letters) + 0-9 (10 digits) = **36 possibilities**
- Total possible codes: **36^4 = 1,679,616 unique codes**

### Collision Probability (Birthday Paradox)

Using the birthday paradox approximation, the probability of at least one collision when generating `n` vouchers is approximately:

**P(collision) ≈ n² / (2 × 1,679,616)**

| Number of Vouchers | Collision Probability |
| ------------------ | --------------------- |
| 100 vouchers       | ~0.003% (1 in 33,592) |
| 500 vouchers       | ~0.07% (1 in 1,344)   |
| 1,000 vouchers     | ~0.3% (1 in 336)      |
| 5,000 vouchers     | ~7.4% (1 in 14)       |
| 10,000 vouchers    | ~30% (1 in 3.3)       |

### Conclusion

- **Low risk** for small to medium businesses (< 1,000 vouchers)
- **Moderate risk** for larger businesses (1,000-5,000 vouchers)
- **High risk** for very large businesses (> 10,000 vouchers)

## Solution Implemented

### 1. Pre-Creation Duplicate Check

- Before creating a voucher, we check if the code already exists
- Returns an error if duplicate is found

### 2. Automatic Unique Code Generation

- `generateUniqueVoucherCode()` function automatically checks for duplicates
- Retries up to 10 times if a duplicate is found
- Falls back to manual generation if all attempts fail

### 3. Database-Level Protection

- Unique constraint on voucher code column (via migration)
- Database will reject duplicate codes even if client-side check fails

### 4. User Experience

- When generating a code, it automatically ensures uniqueness
- If user manually enters a duplicate code, they get a clear error message
- "Generate" button always creates a unique code

## Implementation Details

### Functions Added

1. **`voucherCodeExists(code: string)`** - Checks if a code exists in database
2. **`generateUniqueVoucherCode(checkExists, maxAttempts)`** - Generates unique code with retry logic
3. **Enhanced `createVoucherAction()`** - Checks for duplicates before insertion

### Flow

```
User clicks "Create Voucher"
  ↓
Modal opens → Auto-generates unique code (checks DB)
  ↓
User clicks "Generate" → Generates new unique code (checks DB)
  ↓
User submits form → createVoucherAction() checks again
  ↓
If duplicate → Error message
If unique → Voucher created
```

## Recommendations

1. **For small businesses** (< 1,000 vouchers): Current solution is sufficient
2. **For medium businesses** (1,000-5,000 vouchers): Consider monitoring collision rates
3. **For large businesses** (> 10,000 vouchers): Consider:
   - Increasing code length (e.g., BF + 6 chars = 8 total)
   - Using sequential codes with prefix
   - Implementing a code reservation system

## Testing

To test duplicate detection:

1. Create a voucher with code "BF1234"
2. Try to create another voucher with the same code
3. Should receive error: "Voucher code BF1234 already exists"
