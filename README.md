# E-Guro App mobile architecture

The mobile app uses Expo Router with a feature-first `src` directory.

## Why the `app` files are small

Expo Router builds navigation from files inside `app/`. Those files should only map a route to a screen. For example:

```tsx
// app/(tabs)/classes.tsx
export { default } from '@/features/classes/screens/ClassesScreen';
```

Business logic, GraphQL, reusable components, hooks, and utilities belong under `src`. Keeping route files thin prevents navigation concerns from becoming mixed with feature code.

## Structure

```text
apps/mobile/
├── app/                         # Expo Router entries only
│   ├── (tabs)/
│   │   ├── index.tsx            # → DashboardScreen
│   │   ├── classes.tsx          # → ClassesScreen
│   │   ├── students.tsx         # → StudentsScreen
│   │   └── reports.tsx          # → ReportsScreen
│   ├── class/[id].tsx           # → ClassDetailScreen
│   ├── grades/[id].tsx          # → GradesScreen
│   ├── student/[id].tsx         # → StudentProfileScreen
│   ├── login.tsx                # → LoginScreen
│   └── _layout.tsx
└── src/
    ├── core/
    │   ├── apollo/              # Apollo Client and auth link
    │   ├── auth/                # Session provider and secure token storage
    │   ├── theme/               # Colors and shared visual tokens
    │   └── types/               # Shared domain types
    ├── shared/
    │   └── components/          # Cross-feature UI components
    └── features/
        ├── auth/
        ├── dashboard/
        ├── classes/
        ├── attendance/
        ├── grades/
        ├── students/
        └── reports/
```

Every feature follows the same convention:

```text
feature-name/
├── components/                  # UI used only by this feature
├── graphql/
│   ├── fragments/               # Reusable GraphQL selections
│   ├── mutations/               # Write operations
│   └── queries/                 # Read operations
├── hooks/                       # Feature state and Apollo hooks
├── screens/                     # Route-level screen components
└── utils/                       # Pure formatting and calculation helpers
```

Folders with an `index.ts` placeholder are ready for future extraction. A component should remain in a screen until it is either reusable or makes the screen difficult to understand; it can then move into that feature's `components` folder. Cross-feature primitives belong in `src/shared`, not in an arbitrary feature.

## Features

### `auth`

- Teacher email/password sign-in
- Direct independent-teacher registration
- Automatic personal workspace
- Secure JWT storage using Expo Secure Store
- First-login password replacement
- Login and password GraphQL mutations

### `dashboard`

- Teacher greeting and summary statistics
- Daily class schedule
- Quick actions
- Students requiring attention

### `classes`

- Class list
- Personal class creation
- Class details and roster
- Student creation and enrollment
- Searchable students
- Manual attendance status controls
- Shared classroom GraphQL fragment

### `attendance`

- Manual Present/Absent controls
- Daily class attendance records
- Attendance mutations

### `grades`

- Quarterly grade entry
- Quiz/activity/exam weighting
- Calculated grade preview
- Batch grade save mutation

### `students`

- Searchable student directory
- Student profile
- Attendance history
- Class performance
- Shared student GraphQL fragment

### `reports`

- School metrics available to the teacher
- Attendance and grade summaries
- Students below the grade threshold

## Import convention

The `@/` alias points to `apps/mobile/src`:

```tsx
import { colors } from '@/core/theme';
import { Card } from '@/shared/components/ui';
import { CLASS_FIELDS } from '@/features/classes/graphql/fragments/classFields';
```

Prefer relative imports inside the same feature and `@/` imports for core, shared, or cross-feature dependencies.
