# Banking Transaction Database System

CSC 421 Group 3 banking application.

Architecture direction: MySQL-first. The database owns financial correctness through stored procedures, constraints, row locks, views, and audit tables. The Next.js app is the interface on top.

## Package Manager

This project uses pnpm.

```bash
pnpm install
pnpm dev
```

Open http://localhost:3000 after the dev server starts.

## Phase 2 Status

The Next.js scaffold is in place and configured for pnpm. Runtime packages for the application layer are installed:

- `mysql2` for raw MySQL queries and stored procedure calls
- `bcryptjs` for password hashing
- `jsonwebtoken` for JWT auth

No ORM is used. Financial routes should call the stored procedures from the SQL phase instead of updating balances directly.
