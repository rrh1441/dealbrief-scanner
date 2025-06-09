# API Keys Setup Guide

> **Note:** Real API keys should be kept in environment variables or a secret manager. The values below are placeholders.

## ✅ Configured API Keys

### 1. Shodan - $49 one-time Membership ✅
- **API Key**: `<YOUR_SHODAN_KEY>`
- **Environment Variable**: `SHODAN_API_KEY`
- **Usage**: SpiderFoot module for IP/service discovery
- **Credits**: 100 query credits/month, 100 scan credits/month
- **Status**: ✅ Configured in Fly.io

### 2. Censys - Purchased Credits ✅
- **API Key**: `<YOUR_CENSYS_KEY>`
- **Environment Variable**: `CENSYS_API_KEY`
- **Usage**: SpiderFoot module for certificate/host discovery
- **Note**: Free tier gives 100 credits/month but not via API, so purchased credits
- **Status**: ✅ Configured in Fly.io

### 3. HaveIBeenPwned - $4.50/month ✅
- **API Key**: `<YOUR_HIBP_KEY>`
- **Environment Variable**: `HIBP_API_KEY`
- **Usage**: SpiderFoot module for breach detection
- **Rate Limit**: 1 request per 1.5 seconds
- **Status**: ✅ Configured in Fly.io

### 4. Serper (Google Search) - Already configured ✅
- **Environment Variable**: `SERPER_KEY`
- **Usage**: File hunting and CRM exposure modules
- **Status**: ✅ Already in use

## Optional API Keys (Free Tiers Available)

### 5. VirusTotal - Free tier: 1,000 requests/day
- **URL**: https://www.virustotal.com/gui/join-us
- **Environment Variable**: `VIRUSTOTAL_API_KEY`
- **Usage**: File analysis and domain reputation

### 6. SecurityTrails - Free tier: 50 requests/month
- **URL**: https://securitytrails.com/corp/api
- **Environment Variable**: `SECURITYTRAILS_API_KEY`
- **Usage**: DNS history and subdomain discovery

### 7. Chaos - Free tier: 100 requests/month
- **URL**: https://chaos.projectdiscovery.io/
- **Environment Variable**: `CHAOS_API_KEY`
- **Usage**: Subdomain discovery

## Current Environment Variables

Your current configuration in Fly.io:

```bash
# Existing
REDIS_URL=redis://...
DB_URL=postgresql://...
SUPABASE_URL=https://...
SUPABASE_SERVICE_ROLE_KEY=...
S3_ENDPOINT=https://...
S3_ACCESS_KEY=...
S3_SECRET_KEY=...
SERPER_KEY=...

# ✅ Configured API Keys
SHODAN_API_KEY=<YOUR_SHODAN_KEY>
CENSYS_API_KEY=<YOUR_CENSYS_KEY>
HIBP_API_KEY=<YOUR_HIBP_KEY>

# Optional (not yet configured)
VIRUSTOTAL_API_KEY=your_vt_key_here
SECURITYTRAILS_API_KEY=your_st_key_here
CHAOS_API_KEY=your_chaos_key_here
```

## ✅ Self-Hosted Tools (No API Keys Required)

- **TruffleHog**: ✅ Installed as binary in Docker
- **Nuclei**: ✅ Installed as binary in Docker
- **OWASP ZAP**: ✅ Installed in Docker for rate limit testing
- **SpiderFoot**: ✅ You mentioned self-hosting + API integration
- **dnstwist**: ✅ Installed as Python package
- **testssl.sh**: ✅ Installed as script
- **nmap**: ✅ Installed as system package

## ✅ Total Monthly Cost

- **Shodan Membership**: $49 one-time ✅ PAID
- **HaveIBeenPwned**: $4.50/month ✅ PAID
- **Censys**: Purchased credits ✅ PAID
- **Others**: Free tiers or self-hosted

**Total**: Very affordable for comprehensive security scanning

## ✅ SpiderFoot Integration

SpiderFoot now automatically configured with your API keys:
- Shodan searches for IP addresses and services
- Censys searches for certificates and hosts  
- HaveIBeenPwned checks for data breaches
- Feeds discovered URLs to TruffleHog for secret scanning

## Testing Your Scanner

Test with a real domain:

```bash
curl -X POST https://dealbrief-scanner.fly.dev/scan \
  -H "Content-Type: application/json" \
  -d '{"companyName": "Test Company", "domain": "example.com"}'
```

The scanner will now leverage all your paid API services for comprehensive security assessment!

## Module Coverage

Your scanner now has **full coverage**:

1. **🔍 Reconnaissance**: SpiderFoot + Shodan + Censys
2. **📄 File Discovery**: Serper Google dorking + CRM exposure
3. **🔐 Secret Detection**: TruffleHog on websites, repos, files
4. **🛡️ Vulnerability Scanning**: Nuclei templates
5. **⚡ Rate Limit Testing**: Custom ZAP implementations
6. **💾 Data Breach Detection**: HaveIBeenPwned integration
7. **🌐 Infrastructure Analysis**: DNS, TLS, database scanning

All tools are working with proper API keys - you're ready for production scanning! 