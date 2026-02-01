# App Directory

Next.js 14+ App Router structure.

## Route Groups

- `(admin)/` - Admin dashboard routes (protected)
- `(auth)/` - Authentication routes (login, register, password reset)
- `(main)/` - Main application routes (courses, files, learning, settings)

## API Routes

- `/api/auth/` - Authentication endpoints
- `/api/courses/` - Course CRUD endpoints
- `/api/files/` - File management endpoints
- `/api/learn/` - AI tutor endpoints
- `/api/quota/` - Quota management endpoints
- `/api/preferences/` - User preferences endpoints
- `/api/admin/` - Admin endpoints

## Layouts

- Root layout (`layout.tsx`) wraps all pages
- Route group layouts apply to specific sections
