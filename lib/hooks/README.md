# Auth Hook - Role-Based Access

The `useAuth` hook now includes employee role information from the `employee` table.

## Usage

```tsx
import { useAuth } from "@/lib/hooks/useAuth";

function MyComponent() {
  const { user, employee, roles, hasRole, loading } = useAuth();

  if (loading) {
    return <Loading />;
  }

  if (!user) {
    return <LoginPrompt />;
  }

  // Access user info
  console.log("User ID:", user.id);
  console.log("User Email:", user.email);

  // Access employee info
  if (employee) {
    console.log("Employee Roles:", employee.role); // Array of roles
    console.log("Salary:", employee.salary);
    console.log("Commission Rate:", employee.commission_rate);
  }

  // Quick access to roles array
  console.log("Roles:", roles); // ["owner", "cashier"] or []

  // Check if user has a specific role
  if (hasRole("owner") || hasRole("cashier")) {
    return <AdminPanel />;
  }

  // Or check directly in the array
  if (roles.includes("owner")) {
    return <OwnerPanel />;
  }

  return <RegularView />;
}
```

## Return Values

- `user`: Supabase auth user object (null if not logged in)
- `employee`: Full employee record from database (null if not found)
- `roles`: Array of employee roles (empty array if no employee record)
- `hasRole(role)`: Helper function to check if user has a specific role
- `loading`: Boolean indicating if auth check is in progress

## Role Values

- `"owner"` - Owner/Administrator
- `"cashier"` - Cashier
- `"worker"` - General worker
- `"masseuse"` - Masseuse

## Notes

- The employee data is automatically fetched when a user logs in
- The roles array is cached and updated automatically when auth state changes
- If a user doesn't have an employee record, `employee` will be `null` and `roles` will be an empty array `[]`
- Users can have multiple roles (e.g., `["owner", "cashier"]`)
- Use `hasRole("roleName")` to check for a specific role, or check directly with `roles.includes("roleName")`

