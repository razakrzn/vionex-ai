# How to Access Zustand Auth Store Data

## Overview
The auth store is located at `src/stores/authStore.ts` and uses Zustand for global state management with localStorage persistence.

## Basic Usage

### 1. Import the Hook
```typescript
import { useAuthStore } from "@/stores/authStore";
```

### 2. Access Data in Components

#### Example: Get User Data
```typescript
import { useAuthStore } from "@/stores/authStore";

const MyComponent = () => {
  // Get all auth data
  const { user, tokens, isAuthenticated, logout } = useAuthStore();
  
  // Access user properties
  console.log("User ID:", user?.id);
  console.log("Email:", user?.email);
  console.log("Full Name:", user?.full_name);
  console.log("Profile Picture:", user?.profile_picture);
  console.log("Mobile:", user?.mobile_number);
  console.log("Role:", user?.role);
  
  return (
    <div>
      {isAuthenticated ? (
        <p>Welcome, {user?.full_name || user?.email}!</p>
      ) : (
        <p>Please log in</p>
      )}
    </div>
  );
};
```

#### Example: Get Specific User Fields
```typescript
const { user } = useAuthStore();

// Access specific fields
const email = user?.email;
const fullName = user?.full_name;
const profilePic = user?.profile_picture;
const mobileNumber = user?.mobile_number;
```

#### Example: Check Authentication Status
```typescript
const { isAuthenticated, user } = useAuthStore();

if (isAuthenticated && user) {
  // User is logged in
  console.log("Logged in as:", user.email);
} else {
  // User is not logged in
  console.log("Not logged in");
}
```

#### Example: Access Tokens
```typescript
const { tokens } = useAuthStore();

// Access tokens
const accessToken = tokens?.access;
const refreshToken = tokens?.refresh;

// Use in API calls
if (accessToken) {
  // Make authenticated API request
  fetch('/api/data', {
    headers: {
      'Authorization': `Bearer ${accessToken}`
    }
  });
}
```

### 3. Update User Data
```typescript
const { updateUser } = useAuthStore();

// Update specific user fields
updateUser({ 
  full_name: "New Name",
  profile_picture: "https://example.com/image.jpg"
});
```

### 4. Logout
```typescript
const { logout } = useAuthStore();

const handleLogout = () => {
  logout(); // Clears user, tokens, and sets isAuthenticated to false
};
```

### 5. Get Full Store State (Outside React Component)
```typescript
import { useAuthStore } from "@/stores/authStore";

// Get current state without hook (useful in utilities, services, etc.)
const currentState = useAuthStore.getState();
console.log("Current auth state:", currentState);

// Or get specific values
const user = useAuthStore.getState().user;
const isAuth = useAuthStore.getState().isAuthenticated;
```

## Available Store Methods

### State Properties
- `user: User | null` - Current user object
- `tokens: Tokens | null` - Access and refresh tokens
- `isAuthenticated: boolean` - Authentication status

### Methods
- `login(user: User, tokens: Tokens)` - Set user and tokens, set authenticated to true
- `logout()` - Clear user and tokens, set authenticated to false
- `setUser(user: User | null)` - Update user
- `setTokens(tokens: Tokens | null)` - Update tokens
- `updateUser(updates: Partial<User>)` - Partially update user object

## User Object Structure
```typescript
interface User {
  id: number | string;
  email: string;
  full_name: string | null;
  profile_picture: string | null;
  mobile_number: string;
  role?: string;
  role_display?: string;
  seller_type?: string;
  seller_type_display?: string;
  company_name?: string | null;
  license_number?: string | null;
  about_me?: string | null;
  is_mobile_verified?: boolean;
  [key: string]: any; // Additional fields may be present
}
```

## Complete Example Component
```typescript
import { useEffect } from "react";
import { useAuthStore } from "@/stores/authStore";

const ProfileComponent = () => {
  const { user, isAuthenticated, tokens, logout, updateUser } = useAuthStore();

  // Log data on mount or when it changes
  useEffect(() => {
    console.log("=== Auth Store Data ===");
    console.log("Authenticated:", isAuthenticated);
    console.log("User:", user);
    console.log("Tokens:", tokens);
    console.log("======================");
  }, [isAuthenticated, user, tokens]);

  if (!isAuthenticated || !user) {
    return <div>Please log in</div>;
  }

  return (
    <div>
      <h1>Profile</h1>
      <p>ID: {user.id}</p>
      <p>Email: {user.email}</p>
      <p>Name: {user.full_name || "Not set"}</p>
      <p>Mobile: {user.mobile_number}</p>
      <p>Role: {user.role_display || user.role}</p>
      
      {user.profile_picture && (
        <img src={user.profile_picture} alt={user.full_name || "Profile"} />
      )}
      
      <button onClick={logout}>Logout</button>
    </div>
  );
};

export default ProfileComponent;
```

## Persistence
The store automatically persists to localStorage with the key `"auth-storage"`. Data persists across page refreshes and browser sessions.

## Notes
- The store is reactive - components using the hook will automatically re-render when the state changes
- Use optional chaining (`?.`) when accessing user properties as it may be `null`
- The store is typed with TypeScript for better development experience

