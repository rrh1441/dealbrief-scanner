import pkg from 'pg';
const { Pool } = pkg;
import fs from 'fs';
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';
import puppeteer from 'puppeteer';

// Database connection
const pool = new Pool({
  connectionString: process.env.DB_URL || process.env.DATABASE_URL
});

// AI clients
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const anthropic = new Anthropic({
  apiKey: process.env.CLAUDE_API_KEY
});

// Supabase client
const supabaseUrl = 'https://cssqcaieeixukjxqpynp.supabase.co';
// Replace with your Supabase key or load from environment/secret manager
const supabaseKey = '<YOUR_SUPABASE_KEY>';

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

const MODELS = [
  { 
    name: 'o4-mini-2025-04-16', 
    provider: 'openai', 
    displayName: 'o4-mini-2025-04-16'
  },
  { 
    name: 'claude-sonnet-4-20250514', 
    provider: 'claude', 
    displayName: 'claude-sonnet-4-20250514'
  }
];

async function callOpenAI(model, prompt, data) {
  console.log(`🤖 Calling ${model}...`);
  
  const response = await openai.chat.completions.create({
    model: model,
    messages: [
      { role: 'system', content: `ROLE  
You are an elite due-diligence analyst hired by DealBrief.  
Your mandate is to surface *non-financial* risks for private and public companies, producing an audit-ready briefing that busy investors, M&A teams, and brokers can trust at first glance.

SCOPE OF ANALYSIS  
Investigate only through OSINT and other lawful public sources. Ignore purely financial metrics unless they materially affect the risks below.

1. Cybersecurity Exposure  
   • Breached data, leaked credentials, ransomware events  
   • Exposed infrastructure (open ports, misconfigured cloud buckets, outdated software)  

DELIVERABLE FORMAT  

0. **Executive Snapshot** – ≤150 words summarising the overall risk posture plus a 3-color (Green / Yellow / Red) *overall* rating.  
2. **Key Red Flags** – bullet list (≤8) of the most material issues that warrant immediate follow-up.  
3. **Detailed Findings** – subsections matching the focus areas above; for each finding, provide: What was found (technical), how threat actors use it (plain english), the business impact (plain english), and how to fix it (plain english)
4. **Appendix A – Source Index** – numbered list of every URL, title, and access date, in order of first citation.  
5. **Appendix B – Method & Coverage Gaps** – outline search terms used, APIs queried, and any areas where reliable data was unavailable.

WRITING & CITATION RULES  
- Plain English; no jargon, no speculation.  
- Every discrete claim **must** carry a superscript numeric citation that maps to Appendix A.  
- If sources conflict, note the conflict and default to the most recent or authoritative evidence.  
- Do not include AI-generated text as a citation.  

QUALITY CONTROLS  
- Cross-verify critical facts with ≥2 independent sources where possible.  
- Highlight any missing or ambiguous data as a "Coverage Gap" rather than guessing.  
- Strictly limit the briefing to facts discovered; do **not** extrapolate future performance.  

AUDIENCE  
Assume readers are smart business professionals with limited technical depth and <5 minutes to skim the briefing. Clarity and credibility outrank exhaustiveness.` },
      { role: 'user', content: prompt }
    ],
    max_completion_tokens: 8000
  });
  
  return response.choices[0].message.content;
}

async function callClaude(model, prompt, data) {
  console.log(`🤖 Calling ${model}...`);
  
  const response = await anthropic.messages.create({
    model: model,
    max_tokens: 8000,
    temperature: 0.7,
    messages: [
      { 
        role: 'user', 
        content: `ROLE  
You are an elite due-diligence analyst hired by DealBrief.  
Your mandate is to surface *non-financial* risks for private and public companies, producing an audit-ready briefing that busy investors, M&A teams, and brokers can trust at first glance.

SCOPE OF ANALYSIS  
Investigate only through OSINT and other lawful public sources. Ignore purely financial metrics unless they materially affect the risks below.

1. Cybersecurity Exposure  
   • Breached data, leaked credentials, ransomware events  
   • Exposed infrastructure (open ports, misconfigured cloud buckets, outdated software)  

DELIVERABLE FORMAT  

0. **Executive Snapshot** – ≤150 words summarising the overall risk posture plus a 3-color (Green / Yellow / Red) *overall* rating.  
2. **Key Red Flags** – bullet list (≤8) of the most material issues that warrant immediate follow-up.  
3. **Detailed Findings** – subsections matching the focus areas above; for each finding, provide: What was found (technical), how threat actors use it (plain english), the business impact (plain english), and how to fix it (plain english)
4. **Appendix A – Source Index** – numbered list of every URL, title, and access date, in order of first citation.  
5. **Appendix B – Method & Coverage Gaps** – outline search terms used, APIs queried, and any areas where reliable data was unavailable.

WRITING & CITATION RULES  
- Plain English; no jargon, no speculation.  
- Every discrete claim **must** carry a superscript numeric citation that maps to Appendix A.  
- If sources conflict, note the conflict and default to the most recent or authoritative evidence.  
- Do not include AI-generated text as a citation.  

QUALITY CONTROLS  
- Cross-verify critical facts with ≥2 independent sources where possible.  
- Highlight any missing or ambiguous data as a "Coverage Gap" rather than guessing.  
- Strictly limit the briefing to facts discovered; do **not** extrapolate future performance.  

AUDIENCE  
Assume readers are smart business professionals with limited technical depth and <5 minutes to skim the briefing. Clarity and credibility outrank exhaustiveness.

${prompt}` 
      }
    ]
  });
  
  return response.content[0].text;
}

async function generatePDF(htmlContent, modelName, companyName, scanId) {
  const timestamp = Date.now();
  const filename = `/tmp/${companyName}_${modelName}_${scanId}_${timestamp}.pdf`;
  
  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    });
    
    const page = await browser.newPage();
    
    // Clean HTML content
    const cleanHtml = htmlContent
      .replace(/```html/g, '')
      .replace(/```/g, '')
      .trim();
    
    const fullHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Cohesive AI Cybersecurity Due Diligence Briefing</title>
  <style>
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
      line-height: 1.6; 
      color: #333; 
      max-width: 800px; 
      margin: 0 auto; 
      padding: 20px; 
    }
    .header {
      text-align: center;
      border-bottom: 2px solid #007bff;
      padding-bottom: 20px;
      margin-bottom: 30px;
    }
    .meta {
      background: #f8f9fa;
      padding: 15px;
      border-radius: 8px;
      margin: 20px 0;
      font-size: 14px;
    }
    .risk-badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 20px;
      font-weight: bold;
      font-size: 12px;
      text-transform: uppercase;
    }
    .risk-green { background: #d4edda; color: #155724; }
    .risk-yellow { background: #fff3cd; color: #856404; }
    .risk-red { background: #f8d7da; color: #721c24; }
    h1, h2, h3 { color: #2c3e50; margin-top: 30px; }
    h2 { border-bottom: 1px solid #bdc3c7; padding-bottom: 5px; }
    h3 { color: #34495e; }
    ul { padding-left: 20px; }
    li { margin-bottom: 8px; }
    .citation { font-size: 11px; vertical-align: super; color: #3498db; }
    .footer { margin-top: 50px; padding-top: 20px; border-top: 1px solid #e0e0e0; color: #7f8c8d; font-size: 12px; }
  </style>
</head>
<body>
  <div class="header">
    <h1>DealBrief Security Assessment</h1>
    <div class="meta">
      Company: ${companyName}<br>
      Model: ${modelName}<br>
      Generated: ${new Date().toISOString()}
    </div>
  </div>
  
  ${cleanHtml}
  
  <div class="footer">
    Generated by DealBrief Scanner • Confidential Analysis
  </div>
</body>
</html>`;

    await page.setContent(fullHtml, { waitUntil: 'networkidle0' });
    
    await page.pdf({
      path: filename,
      format: 'A4',
      margin: { top: '20mm', right: '15mm', bottom: '20mm', left: '15mm' },
      printBackground: true
    });
    
    await page.close();
    return filename;
    
  } catch (error) {
    console.error('PDF generation error:', error.message);
    throw error;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

async function testMultipleModels() {
  try {
    const companyName = 'Lexigate';
    const domain = 'lexigate.com';
    
    // Get ALL findings data since scan_id field doesn't exist in current schema
    const artifactsResult = await pool.query(`
      SELECT * FROM artifacts 
      WHERE src_url IS NOT NULL 
      AND src_url != ''
      AND (src_url ILIKE '%lexigate%' OR val_text ILIKE '%lexigate%')
      ORDER BY severity DESC, created_at DESC
    `);
    
    console.log(`📊 Found ${artifactsResult.rows.length} recent findings`);
    
    const findingsSummary = artifactsResult.rows.map(finding => {
      const meta = finding.meta || {};
      return {
        type: finding.type,
        severity: finding.severity,
        description: finding.val_text,
        source: finding.src_url,
        technical_details: {
          ip_address: meta.service_info?.ip || 'Unknown',
          port: meta.service_info?.port || 'Unknown',
          protocol: meta.service_info?.protocol || 'Unknown',
          product: meta.service_info?.product || 'Unknown',
          version: meta.service_info?.version || 'Unknown',
          banner: meta.service_info?.banner || 'No banner',
          organization: meta.service_info?.organization || 'Unknown',
          isp: meta.service_info?.isp || 'Unknown',
          location: meta.service_info?.location || 'Unknown'
        },
        scan_module: meta.scan_module || 'Unknown',
        discovered: finding.created_at
      };
    });
    
    const userPrompt = `Generate a due diligence briefing for ${companyName} (${domain}) based on cybersecurity reconnaissance data.

COMPANY: ${companyName}
DOMAIN: ${domain}
SCAN DATE: ${new Date().toISOString().split('T')[0]}
DATA SOURCES: Network scanning via Shodan and other OSINT tools

FINDINGS DATA:
${JSON.stringify(findingsSummary, null, 2)}

Follow the DealBrief format exactly. Focus on material business risks, not theoretical concerns. Use plain English and cite sources properly.`;

    const results = [];
    
    // Test each model
    for (const model of MODELS) {
      try {
        console.log(`\n=== Testing ${model.displayName} ===`);
        
        let response;
        if (model.provider === 'openai') {
          response = await callOpenAI(model.name, userPrompt, findingsSummary);
        } else if (model.provider === 'claude') {
          response = await callClaude(model.name, userPrompt, findingsSummary);
        }
        
        console.log(`✅ ${model.displayName} completed`);
        console.log(`📝 Response length: ${response.length} characters`);
        console.log(`📄 First 200 chars: ${response.substring(0, 200)}...`);
        
        // Generate PDF
        const pdfPath = await generatePDF(response, model.displayName, companyName, 'ZsaYyzvOPLm');
        console.log(`📄 PDF generated: ${pdfPath}`);
        
        // Upload to Supabase
        const pdfBuffer = fs.readFileSync(pdfPath);
        const reportFileName = `${companyName.replace(/[^a-zA-Z0-9]/g, '_')}_${model.displayName.replace(/[^a-zA-Z0-9]/g, '_')}_ZsaYyzvOPLm_${Date.now()}.pdf`;
        
        const { data, error } = await supabase.storage
          .from('reports')
          .upload(reportFileName, pdfBuffer, {
            contentType: 'application/pdf',
            upsert: false
          });
        
        if (error) {
          console.error(`❌ Upload error for ${model.displayName}:`, error);
        } else {
          const { data: urlData } = supabase.storage
            .from('reports')
            .getPublicUrl(reportFileName);
          
          console.log(`🔗 ${model.displayName} URL: ${urlData.publicUrl}`);
          
          results.push({
            model: model.displayName,
            url: urlData.publicUrl,
            responseLength: response.length,
            fileName: reportFileName
          });
        }
        
        // Clean up local file
        fs.unlinkSync(pdfPath);
        
      } catch (error) {
        console.error(`❌ Error with ${model.displayName}:`, error.message);
        results.push({
          model: model.displayName,
          error: error.message
        });
      }
    }
    
    console.log('\n🎉 MULTI-MODEL TEST COMPLETE!');
    console.log('\nResults Summary:');
    results.forEach(result => {
      if (result.error) {
        console.log(`❌ ${result.model}: ERROR - ${result.error}`);
      } else {
        console.log(`✅ ${result.model}: ${result.responseLength} chars - ${result.url}`);
      }
    });
    
    return results;
    
  } catch (error) {
    console.error('❌ Multi-model test failed:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

testMultipleModels()
  .then(results => {
    console.log('\n🔬 ANALYSIS COMPLETE - Check the different outputs!');
    process.exit(0);
  })
  .catch(error => {
    console.error('Test failed:', error);
    process.exit(1);
  }); 