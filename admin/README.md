# DealBrief Admin Dashboard

A comprehensive admin dashboard for managing DealBrief security scans, viewing detailed results, and generating reports.

## Features

- 🔐 **Simple Password Authentication** - Secure access with a password
- 📊 **Dashboard Overview** - At-a-glance view of all scans and findings
- 🔍 **Detailed Scan Views** - Module-by-module breakdown of security findings
- 📄 **Report Generation** - Generate and download PDF reports with custom tags
- 🏷️ **Tag Management** - Organize scans with custom tags for better categorization
- 🔄 **Real-time Updates** - Live scan progress monitoring
- 🎯 **Module Status Tracking** - See which security modules ran successfully
- 📁 **Artifact Browser** - Browse raw security findings and artifacts

## Setup

1. **Install dependencies** (requires pnpm):
   ```bash
   pnpm install
   ```

2. **Configure environment variables:**
   Copy `.env.example` to `.env.local` and fill in your values:
   ```bash
   cp .env.example .env.local
   ```

   Required environment variables:
   - `AUTH_PASSWORD` - Your admin password
   - `DATABASE_URL` - PostgreSQL connection string from Fly.io
   - `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anonymous key
   - `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key

3. **Run development server:**
   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000)

## Deployment to Vercel

1. **Push to GitHub**

2. **Import to Vercel:**
   - Go to [vercel.com](https://vercel.com)
   - Import your repository
   - Set root directory to `admin`
   - Add all environment variables

3. **Deploy**

## Architecture

- **Frontend:** Next.js 15 with App Router, TypeScript, Tailwind CSS, shadcn/ui
- **Authentication:** Simple password-based auth with HTTP-only cookies
- **Data Source:** 
  - Reads from Fly.io PostgreSQL database (read-only)
  - Stores reports in Supabase
- **API Integration:** Connects to DealBrief Scanner API on Fly.io

## Pages

- `/` - Dashboard with overview statistics
- `/scans` - List of all security scans
- `/scans/[id]` - Detailed scan view with module status
- `/reports` - Generated reports with download links
- `/alerts` - Security alerts (coming soon)

## Security Modules Tracked

1. **SpiderFoot** - OSINT reconnaissance
2. **DNS Twist** - Domain permutation detection
3. **CRM Exposure** - CRM file exposure scanning
4. **File Hunt** - Exposed file discovery
5. **Shodan** - Infrastructure exposure
6. **Database Port Scan** - Open database detection
7. **Endpoint Discovery** - API endpoint mapping
8. **TLS Scan** - SSL/TLS configuration audit
9. **Nuclei** - Vulnerability scanning
10. **ZAP Rate Testing** - Rate limiting tests
11. **SPF/DMARC** - Email security configuration
12. **TruffleHog** - Secret detection

## Report Generation

Reports can be generated with custom tags for categorization:
- Tags are stored with reports in Supabase
- Reports include executive summaries
- PDF generation for easy sharing
- Integration with v0 report generator design

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

Private - Internal use only
