# NextCMS 

![MIT License](https://img.shields.io/badge/license-MIT-blue) ![Next.js](https://img.shields.io/badge/Next.js-16-black) ![React](https://img.shields.io/badge/React-19-blue) ![Biome](https://img.shields.io/badge/code%20style-biome-60a5fa) ![Docker](https://img.shields.io/badge/Docker-ready-2496ED)

<img alt="NextCMS" src="public/shared/nextcms_alt.webp" width="80%">

A **production-ready** full-stack CMS and e-commerce platform built with **Next.js 16** and **React 19**. Features include a complete admin backend, shopping cart, payment processing, multilingual support, loyalty club, AI integration, Web3, and a flexible content management system.

![Next.js CMS & E-commerce](public/images/screenshot.png)

## 🎯 Platform Overview

This platform serves as:

- **Full-Stack CMS**: Complete content management with admin backend and modular navigation
- **E-commerce Solution**: Shopping cart, payment processing, order management, and inventory control
- **Headless CMS**: API-first architecture with public/private endpoints
- **Hybrid Deployment**: Frontend + Backend + API in a single deployment

### 🏗️ Core Architecture

- **Multi-Database Support**: Auto-detects PostgreSQL (primary) or Firebase (optional)
- **Dynamic Authentication**: NextAuth v5 with JWT sessions and automatic token refresh
- **Role-Based Access Control**: Dynamic roles and permissions from database
- **Unified API System**: Public/private endpoints with CSRF protection and rate limiting
- **Advanced Caching**: In-process LRU cache with TTL, named instances, and auto-invalidation on mutations
- **Multilingual**: next-intl with locale detection and fallback support (en, es, fr, pt)

## ✨ Key Features

### E-commerce
- Shopping cart with persistent state (react-use-cart)
- Payment processing: **Stripe**, **EuPago** (MB Way, Multibanco, PayShop)
- Complete order lifecycle management
- VAT calculations and tax handling
- Coupon and discount system
- Customer profiles and order history
- Product catalog with categories, collections, and attributes
- Product reviews and testimonials

### Content Management
- Dynamic content blocks system (page builder)
- Rich text editor with full TipTap v3 (tables, task lists, images, colors, alignment)
- Media library with S3/R2 cloud storage
- SEO optimization tools + JSON-LD structured data
- Multi-language content support
- Auto-generated sitemaps (`next-sitemap`)

### Admin Backend
- **Dashboard**: Revenue, orders, customers, and product analytics with animated counters
- **Analytics**: Visitor tracking, browser/OS/device stats, campaign event recording
- **Access Control**: Users, roles, and permissions management
- **Store Management**: Orders, catalog, inventory, customers, coupons, reviews, testimonials, attributes
- **Marketing**: Email campaigns, newsletter subscribers, email templates
- **Media Library**: S3-backed file upload and gallery management
- **Workspace**: Task board, agenda, and appointment scheduling
- **Club**: Loyalty/rewards program with points, levels, and voucher exchange
- **Tickets**: Support ticket management
- **Developer Tools**: Database management, API endpoint explorer, AI agent (Replicate), cron jobs, content blocks, interface settings
- **Web3**: Blockchain wallet and ERC-20 token transaction management
- **System**: Site settings, maintenance mode, cache management

### Developer Features
- Database abstraction layer (`rest.db.js`) — single interface for PostgreSQL and Firebase
- Server-side functions organized by domain (`store.js`, `orders.js`, `users.js`, etc.)
- Automatic cache clearing on data mutations with LRU eviction
- 10+ professional React Email templates (Nodemailer)
- SMS / phone OTP verification via Twilio
- AI content generation via Replicate API
- Web3 / ERC-20 wallet management with Infura RPC
- Cron job orchestration system (`/api/cron`)
- FingerprintJS-based anonymous visitor identification
- Cloudflare Turnstile CAPTCHA on public forms
- PDF export (`jspdf`), QR code generation (`qrcode`)
- Google Maps / Places autocomplete integration
- GDPR cookie consent (vanilla-cookieconsent)

## 🚀 Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Frontend**: React 19
- **Language**: JavaScript/TypeScript 5
- **Styling**: Tailwind CSS 4
- **UI Components**: Shadcn/ui, Radix UI
- **Code Quality**: Biome (linting & formatting)
- **State Management**: Redux Toolkit 9, React Context
- **Forms**: React Hook Form + Zod validation
- **Authentication**: NextAuth 5 (JWT, CredentialsProvider)
- **Internationalization**: next-intl 4.3.4 (en, es, fr, pt)
- **Rich Text**: TipTap v3 + CodeMirror (HTML editor)
- **Email**: React Email 5.2.9 + Nodemailer 7.0.5
- **SMS**: Twilio
- **Payments**: Stripe, EuPago (MB Way, Multibanco, PayShop)
- **AI**: Replicate API
- **Database**: PostgreSQL (primary), Firebase (optional)
- **Cache**: In-process LRU cache (Redis-ready)
- **Storage**: AWS S3 / Cloudflare R2
- **Charts**: Recharts
- **Icons**: Lucide React, React Icons
- **Blockchain**: Web3.js, Infura RPC (ERC-20)
- **Maps**: Google Maps / Places API
- **Container**: Docker + Docker Compose

## 🛠️ Core Dependencies

### Framework & UI
- **next** (16.0.7) - React framework with App Router
- **react** (19.1.2) & **react-dom** (19.1.2)
- **tailwindcss** (4.1.12) - Utility-first CSS
- **shadcn/ui** - Component library built on Radix UI
- **@radix-ui/** - Headless UI primitives
- **lucide-react** (0.542.0) - Icon library
- **framer-motion** (12.23.12) - Animation library
- **recharts** (2.15.4) - Analytics charts
- **next-themes** (0.4.6) - Dark/light theme switching
- **@number-flow/react** (0.5.11) - Animated number counters

### Authentication & Security
- **next-auth** (5.0.0-beta.29) - Authentication (JWT sessions)
- **bcryptjs** (3.0.2) - Password hashing
- **crypto-js** (4.2.0) - Encryption
- **react-turnstile** (1.1.4) - Cloudflare CAPTCHA
- **otplib** (13.3.0) - OTP/TOTP generation

### E-commerce & Payments
- **react-use-cart** (1.14.0) - Shopping cart state
- **stripe** (18.4.0) & **@stripe/stripe-js** (7.8.0) - Stripe payments
- **EuPago** (HTTP) - MB Way, Multibanco, PayShop

### Database & Storage
- **pg** (8.19.0) - PostgreSQL client
- **@aws-sdk/client-s3** (3.1000.0) - S3 / R2 storage
- **redis** (5.8.2) - Redis client (reserved for distributed cache)

### Editor & Content
- **@tiptap/react** (3.x) + extensions - Rich text editor
- **@uiw/react-codemirror** (4.25.4) - Code/HTML editor

### Forms & Validation
- **react-hook-form** (7.62.0) - Form management
- **zod** (4.1.8) - Schema validation
- **@hookform/resolvers** (5.2.2) - Zod adapter

### Additional Features
- **replicate** (1.3.1) - AI content generation
- **web3** (4.16.0) - Blockchain / ERC-20 integration
- **twilio** (5.10.6) - SMS / phone verification
- **nodemailer** (7.0.5) - Transactional email
- **@googlemaps/js-api-loader** (1.16.10) - Google Maps
- **@fingerprintjs/fingerprintjs** (4.6.2) - Visitor identification
- **vanilla-cookieconsent** (3.1.0) - GDPR compliance
- **sonner** (2.0.7) - Toast notifications
- **jspdf** (3.0.1) - PDF generation
- **qrcode** (1.5.4) - QR code generation
- **date-fns** (4.1.0) - Date utilities

### Development Tools
- **@biomejs/biome** (2.2.6) - Fast linter & formatter (replaces ESLint + Prettier)
- **typescript** (5.9.2)
- **@next/bundle-analyzer** (15.5.7) - Bundle analysis

## 🏁 Getting Started

### Prerequisites

- **Node.js**: Version 20 or higher
- **Database**: PostgreSQL (primary). Firebase Real-Time DB supported (optional)

### Installation

1. **Clone the Repository**:
    ```bash
    git clone <repository-url>
    cd next-cms
    ```

2. **Install Dependencies**:
    ```bash
    npm install
    ```

3. **Configure Environment Variables**:
   
   Copy `.env-sample` to `.env.local` and fill in the required values:
   
   ```bash
   cp .env-sample .env.local
   ```

   ```env
   # Authentication
   NEXTAUTH_URL=http://localhost:3000
   NEXTAUTH_SECRET=your-secret-key
   
   # Database
   POSTGRES_URL=postgresql://user:password@localhost:5432/mydb

   # Optional: cron security
   CRON_SECRET=your-cron-secret
   ```

4. **Run Development Server**:
    ```bash
    npm run dev
    ```
   
   Open [http://localhost:3000](http://localhost:3000) in your browser.

5. **Build for Production**:
    ```bash
    npm run build
    npm start
    ```

## 📝 Available Scripts

```bash
npm run dev          # Start development server (Webpack)
npm run dev:turbo    # Start development server (Turbopack)
npm run build        # Production build (auto-generates sitemap via postbuild)
npm start            # Start production server
npm run biome        # Check code quality
npm run biome:fix    # Auto-fix code issues
npm run format       # Format code
npm run check        # Run all checks
npm run email-dev    # Preview email templates
```


## 🗂️ Project Structure

```
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── (backend)/          # Admin panel (role: admin)
│   │   ├── (frontend)/         # Public storefront pages
│   │   ├── (actions)/          # Public system pages
│   │   ├── auth/               # Authentication routes
│   │   └── api/
│   │       ├── query/[slug]/         # Private API (authenticated)
│   │       ├── query/public/[slug]/  # Public API (CSRF + rate limiting)
│   │       └── cron/                 # Cron job endpoints
│   ├── components/             # React components
│   │   ├── ui/                 # Shadcn/ui + custom components
│   │   └── common/             # Shared components (Blocks, SEO, etc.)
│   ├── context/                # React Context providers
│   ├── data/                   # Database abstraction layer
│   │   ├── rest.db.js          # Unified DB service (auto-detect)
│   │   └── db/
│   │       ├── postgres.db.js  # PostgreSQL provider
│   │       └── firebase.db.js  # Firebase provider (optional)
│   ├── emails/                 # React Email templates (10+)
│   ├── hooks/                  # Custom React hooks
│   ├── lib/
│   │   ├── server/             # Server-only functions ('use server')
│   │   │   ├── store.js        # Catalog, categories, collections
│   │   │   ├── orders.js       # Order management
│   │   │   ├── users.js        # User management
│   │   │   ├── admin.js        # Dashboard stats, file uploads
│   │   │   ├── gateways.js     # Payment processing (Stripe, EuPago)
│   │   │   ├── email.js        # Email service
│   │   │   ├── ai.js           # AI content generation (Replicate)
│   │   │   ├── web3.js         # Blockchain / ERC-20 integration
│   │   │   ├── sms.js          # SMS / OTP (Twilio)
│   │   │   ├── club.js         # Loyalty/rewards program
│   │   │   ├── tickets.js      # Support tickets
│   │   │   ├── workspace.js    # Appointments, tasks, scheduling
│   │   │   ├── newsletter.js   # Email campaigns
│   │   │   ├── web-stats.js    # Visitor tracking & analytics
│   │   │   ├── cronjobs.js     # Cron job management
│   │   │   ├── media.js        # S3 gallery management
│   │   │   ├── settings.js     # Site & store settings
│   │   │   └── auth.js         # Session helpers, withAuth wrappers
│   │   ├── client/             # Client-safe utilities
│   │   └── shared/
│   │       ├── cache.js        # Centralized LRU cache system
│   │       └── helpers.js      # Shared helper functions
│   ├── locale/                 # next-intl translations (en, es, fr, pt)
│   └── utils/                  # Utility functions
├── docs/                       # Detailed documentation
├── public/                     # Static assets
├── Dockerfile                  # Multi-stage Docker build
├── docker-compose.yaml         # Docker Compose configuration
└── .github/                    # Copilot instructions & GitHub config
```

## 📚 Documentation

Detailed documentation is available in the `/docs` directory covering architecture, caching, API endpoints, payment integrations, deployment, and more.

## 🚢 Deployment

### 🐳 Docker Compose — Recommended

The easiest and most portable way to deploy NextCMS. Includes automatic `NEXTAUTH_SECRET` generation if not provided.

1. **Clone and configure**:
    ```bash
    git clone <repository-url>
    cd next-cms
    cp .env-sample .env.local
    # Edit .env.local with your production values
    ```

2. **Build and start**:
    ```bash
    docker compose up -d --build
    ```

3. **With a local PostgreSQL container** (uncomment the `db` service in `docker-compose.yaml`):
    ```yaml
    # docker-compose.yaml — uncomment these sections:
    services:
      app:
        depends_on:
          - db
        environment:
          POSTGRES_URL: postgresql://myuser:strongpassword@db:5432/myappdb
      db:
        image: postgres:16
        environment:
          POSTGRES_USER: myuser
          POSTGRES_PASSWORD: strongpassword
          POSTGRES_DB: myappdb
        volumes:
          - pgdata:/var/lib/postgresql/data
    volumes:
      pgdata:
    ```

4. **Update running container** (zero-downtime redeploy):
    ```bash
    docker compose up -d --build --no-deps app
    ```

5. **View logs**:
    ```bash
    docker compose logs -f app
    ```

> The app container enforces a **1 CPU / 1 GB RAM** resource limit by default. Adjust `cpus` and `mem_limit` in `docker-compose.yaml` as needed.

### 🐳 Docker (Standalone)

```bash
# Build image
docker build -t next-cms .

# Run container
docker run -d \
  -p 3000:3000 \
  -e NEXTAUTH_URL=https://your-domain.com \
  -e NEXTAUTH_SECRET=your-secret \
  -e POSTGRES_URL=postgresql://... \
  -e NODE_ENV=production \
  -e AUTH_TRUST_HOST=true \
  next-cms
```

### ☁️ Coolify

Coolify is fully supported via the included `docker-compose.yaml`. Coolify handles routing, SSL certificates, and environment variables automatically.

1. Create a new project in Coolify and point it to your repository
2. Set the required environment variables in the Coolify dashboard
3. Deploy — Coolify will build and run the Docker container automatically

### ▲ Vercel

1. Push your code to GitHub
2. Import the project in [Vercel](https://vercel.com)
3. Configure environment variables in the Vercel dashboard
4. Deploy automatically on every push

> Note: Some features (long-running cron jobs) work best on platforms that support persistent Node.js processes.

### Other Platforms

- **Railway**: One-click deployment with managed PostgreSQL
- **DigitalOcean App Platform**: Managed containers with database add-ons
- **Self-hosted**: Any Node.js 20+ environment — use PM2 for process management

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

---

<p align="center">Built with ❤️ using Next.js 16</p>
