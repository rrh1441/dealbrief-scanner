# DealBrief Scanner

A comprehensive cybersecurity scanning backend that performs automated security assessments for companie   s and domains.

## Features

- **File Hunting**: Google dork searches with Serper API to find exposed files
- **CRM Exposure**: HubSpot and Salesforce CDN scanning for leaked documents
- **Passive Reconnaissance**: SpiderFoot integration for subdomain and IP discovery
- **Domain Security**: DNS twist for typo-squatting detection, DMARC/SPF checks
- **TLS/SSL Analysis**: Certificate and cipher suite security assessment
- **Vulnerability Scanning**: Nuclei templates for common web vulnerabilities
- **Secret Detection**: TruffleHog integration for exposed credentials
- **Database Security**: Port scanning and default credential checks
- **Rate Limiting Tests**: OWASP ZAP integration for rate limit bypass testing

## Architecture

- **API Gateway**: Fastify-based REST API for job management
- **Worker System**: Background job processing with Redis queue
- **Storage**: PostgreSQL for artifacts, S3-compatible storage for files
- **Deployment**: Docker containerized, Fly.io ready

## Setup

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Environment Variables**:
   ```bash
   # Redis (Upstash)
   REDIS_URL=redis://...

   # Database (Fly Postgres)
   DB_URL=postgresql://...

   # Supabase
   SUPABASE_URL=https://...
   SUPABASE_SERVICE_ROLE_KEY=...

   # S3 Storage
   S3_ENDPOINT=https://...
   S3_ACCESS_KEY=...
   S3_SECRET_KEY=...

   # API Keys
   SERPER_KEY=...

   # CORS
   CORS_ORIGIN=https://your-vercel-domain.vercel.app
   ```

Set `CORS_ORIGIN` to your Vercel domain when the admin app is hosted separately.

3. **Build**:
   ```bash
   npm run build
   ```

4. **Run**:
   ```bash
   # API Server
   npm start

   # Worker (separate process)
   npm run worker
   ```

## API Endpoints

- `POST /scan` - Start a new security scan
- `GET /scan/:id/status` - Check scan status
- `POST /scan/:id/callback` - Webhook for scan completion

## Cyber Modules

### Core Modules
- **fileHunt.ts**: Serper Google dork search + binary download
- **crmExposure.ts**: HubSpot & Salesforce CDN exposure scanning with sensitivity analysis
- **spiderFoot.ts**: Passive reconnaissance and subdomain discovery
- **dnsTwist.ts**: Typo-squatting domain detection
- **spfDmarc.ts**: Email security posture assessment
- **tlsScan.ts**: SSL/TLS configuration analysis
- **trufflehog.ts**: Secret and credential detection
- **nuclei.ts**: Vulnerability scanning with custom templates
- **dbPortScan.ts**: Database port scanning and credential testing

### Rate Limiting Modules
- **zapRateIp.ts**: IP-based rate limit testing
- **zapRateToken.ts**: Token-based rate limit testing

## CRM Exposure Module

The `crmExposure.ts` module specifically targets HubSpot and Salesforce CDNs where companies often unknowingly expose sensitive documents:

### Supported Platforms
- **HubSpot**: `*.hubspotusercontent-*.net`, `*.hs-sites.com`
- **Salesforce**: `*.content.force.com`, `*.my.salesforce.com`, `*.visualforce.com`

### Sensitivity Analysis
Automatically scores discovered documents based on:
- **High-risk indicators**: API keys, JWT tokens, database URLs
- **PII detection**: SSN, passport, driver's license, bank accounts
- **Confidential markings**: Internal use only, proprietary, NDA
- **Financial data**: Revenue, budgets, quarterly reports
- **Company relevance**: Target company mentions

### Smart Filtering
- Reduces false positives from marketing collateral
- Handles Salesforce token refresh for 403 errors
- 15MB file size limit to avoid resource exhaustion
- Deduplication across search results

## Templates

- **dorks.txt**: 90+ Google dork patterns including CRM-specific searches
- **nuclei-custom.yaml**: Custom vulnerability templates for:
  - Supabase unauthenticated access
  - Neon database exposure
  - S3/GCS bucket misconfigurations
  - Subdomain takeover detection
  - Admin panel exposure
  - Rate limit bypass headers
  - Environment file exposure
  - GraphQL introspection
  - CORS misconfigurations

## Deployment

### Fly.io
```bash
fly deploy
```

### Docker
```bash
docker build -t dealbrief-scanner .
docker run -p 8080:8080 dealbrief-scanner
```

## Development

```bash
# Development mode with hot reload
npm run dev

# Worker development
npm run worker

# Build TypeScript
npm run build
```

## Security Tools Required

The worker modules expect these tools to be available in the runtime environment:

- `sf` (SpiderFoot CLI)
- `dnstwist`
- `dig`
- `testssl.sh`
- `trufflehog`
- `nuclei`
- `nmap`
- `openssl`

## Database Schema

```sql
-- Artifacts table
CREATE TABLE artifacts (
  id SERIAL PRIMARY KEY,
  type VARCHAR(50) NOT NULL,
  val_text TEXT NOT NULL,
  severity VARCHAR(20) DEFAULT 'INFO',
  src_url TEXT,
  sha256 VARCHAR(64),
  mime VARCHAR(100),
  meta JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW()
);

-- Findings table
CREATE TABLE findings (
  id SERIAL PRIMARY KEY,
  artifact_id INTEGER REFERENCES artifacts(id),
  class VARCHAR(100) NOT NULL,
  mitigation TEXT,
  summary TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Reports table (Supabase)
CREATE TABLE reports (
  id VARCHAR(12) PRIMARY KEY,
  user_id UUID NOT NULL,
  json_url TEXT,
  pdf_url TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

## Artifact Types

The scanner produces various artifact types:

- `file`: General exposed files from dork searches
- `crm_exposure`: HubSpot/Salesforce CDN exposed documents
- `subdomain`: Discovered subdomains
- `ip`: IP addresses
- `breach`: Data breach evidence
- `typo_domain`: Typo-squatting domains
- `dmarc_missing`/`dmarc_weak`: Email security issues
- `tls_weak`/`tls_expires_soon`: SSL/TLS problems
- `secret`: Exposed credentials
- `vuln`: Security vulnerabilities
- `db_banner`: Database service discovery

## Vercel Deployment

Push commits to the `main` branch to trigger a new deployment of the admin
frontend on Vercel. Ensure all required environment variables are configured in
the Vercel dashboard so the build can complete successfully.

## License

Private - DealBrief Scanner
