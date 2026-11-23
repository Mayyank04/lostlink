# Project Folder Structure

LostLink 2.0 follows a clean, modular architectural layout separating presentation, business logic, persistence, and infrastructure.

```
lostlink/
├── docs/                       # Architectural, API, and deployment documentation
│   ├── architecture/           # System design, data flow, security model
│   ├── api/                    # REST API specifications, conventions, errors
│   ├── database/               # Prisma schema documentation, migrations
│   ├── development/            # Setup instructions, coding standards, tests
│   └── deployment/             # K3s, Docker, Vultr Kubernetes guides
│
├── k8s/                        # Kubernetes deployment manifests
│   ├── base/                   # Base K8s deployments, services, ingress
│   └── overlays/
│       ├── local/              # Local development K3s configuration
│       └── vultr/              # Production Vultr Managed Postgres overlay
│
├── prisma/                     # Database schema and seed scripts
│   ├── migrations/             # Timestamped SQL migrations
│   ├── schema.prisma           # Authoritative PostgreSQL schema
│   └── seed.ts                 # Idempotent development & testing seed
│
├── public/                     # Static web assets, logos, icons
│
├── src/
│   ├── app/                    # Next.js 14 App Router pages & API routes
│   │   ├── (public)/           # Landing page, about, faq, contact, discover
│   │   ├── api/                # REST API route handlers
│   │   ├── auth/               # Login, registration, reset password, OTP
│   │   ├── claims/             # Student claim management & details
│   │   ├── college-admin/      # Campus administrator operations portal
│   │   ├── colleges/           # Public searchable college directory
│   │   ├── dashboard/          # Student user dashboard & activity
│   │   ├── items/              # Item detail & public view
│   │   ├── matches/            # Match review & claim initiation
│   │   ├── messages/           # Real-time secure messaging threads
│   │   ├── notifications/      # User notification center
│   │   ├── platform-admin/     # Super-admin governance & infrastructure
│   │   └── report/             # Lost & found multi-step report flow
│   │
│   ├── components/             # Reusable UI component library
│   │   ├── analytics/          # Metric cards and reporting charts
│   │   ├── claims/             # Claim forms, handover modal, timeline
│   │   ├── colleges/           # College search cards and filters
│   │   ├── common/             # Navigation, footer, badges, dialogs
│   │   ├── items/              # Item cards and detail view
│   │   ├── matching/           # Match breakdown and score display
│   │   ├── platform-admin/     # Super-admin governance panels
│   │   ├── reports/            # Multi-step lost/found reporting forms
│   │   └── ui/                 # Accessible primitives (Button, Input, Card)
│   │
│   ├── context/                # Client state contexts (Auth, Theme, Toast)
│   ├── data/                   # Default datasets and offline demo data
│   │
│   ├── lib/                    # Shared libraries and utilities
│   │   ├── api/                # Standardized response formatters
│   │   ├── auth/               # Session, Argon2 password, rate limiting
│   │   ├── config/             # Zod-validated application & env config
│   │   ├── crypto/             # AES-256 evidence encryption
│   │   ├── errors/             # Typed application error hierarchy
│   │   ├── handover/           # Handover OTP generation & SHA-256 hashing
│   │   ├── hybrid/             # Distributed worker lease queue & API keys
│   │   ├── matching/           # Deterministic multi-attribute matching
│   │   ├── services/           # Modular client API services
│   │   ├── storage/            # S3/Vultr object storage & local storage
│   │   ├── utils/              # Slug generation and formatting helpers
│   │   └── validation/         # Shared Zod validation schemas
│   │
│   ├── server/                 # Server-only business & persistence layer
│   │   ├── repositories/       # Data access objects (Prisma queries)
│   │   └── services/           # Pure server business logic & transactions
│   │
│   ├── tests/                  # Automated integration, e2e & security tests
│   └── types/                  # Shared TypeScript interfaces & types
│
├── ARCHITECTURE_AUDIT.md       # Full architectural audit report
├── DEAD_CODE_AUDIT.md          # Dead code & redundancy audit report
├── DESIGN.md                   # Authoritative design system specifications
├── package.json                # Project dependencies and test scripts
└── tsconfig.json               # Strict TypeScript configuration
```
