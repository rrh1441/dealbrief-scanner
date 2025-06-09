import { config } from 'dotenv';
import pkg from 'pg';
const { Pool } = pkg;
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';
import { jsPDF } from 'jspdf';
import fs from 'fs';

config();

// Database connection
const pool = new Pool({
  connectionString: process.env.DB_URL || process.env.DATABASE_URL
});

// AI clients
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const anthropic = new Anthropic({
  apiKey: process.env.CLAUDE_API_KEY,
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
    name: 'gpt-4o', 
    provider: 'openai', 
    displayName: 'o4-mini-2025-04-16'
  },
  { 
    name: 'claude-3-5-sonnet-20241022', 
    provider: 'claude', 
    displayName: 'claude-sonnet-4-20250514'
  }
];

async function callOpenAI(model, prompt) {
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
    max_tokens: 8000
  });
  
  return response.choices[0].message.content || 'Report generation failed';
}

async function callClaude(model, prompt) {
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
  
  try {
    // Create new PDF document
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });
    
    // Add title
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('DealBrief Security Assessment', 20, 30);
    
    // Add metadata
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text(`Company: ${companyName}`, 20, 45);
    doc.text(`Model: ${modelName}`, 20, 55);
    doc.text(`Generated: ${new Date().toISOString()}`, 20, 65);
    
    // Convert HTML content to plain text (basic conversion)
    const textContent = htmlContent
      .replace(/<h1[^>]*>/g, '\n\n=== ')
      .replace(/<\/h1>/g, ' ===\n')
      .replace(/<h2[^>]*>/g, '\n\n--- ')
      .replace(/<\/h2>/g, ' ---\n')
      .replace(/<h3[^>]*>/g, '\n\n* ')
      .replace(/<\/h3>/g, '\n')
      .replace(/<p[^>]*>/g, '\n')
      .replace(/<\/p>/g, '\n')
      .replace(/<li[^>]*>/g, '\n• ')
      .replace(/<\/li>/g, '')
      .replace(/<[^>]*>/g, '') // Remove all remaining HTML tags
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .trim();
    
    // Add content with text wrapping
    doc.setFontSize(10);
    const splitText = doc.splitTextToSize(textContent, 170); // 170mm width for A4
    let yPosition = 80;
    
    for (let i = 0; i < splitText.length; i++) {
      if (yPosition > 270) { // Near bottom of page
        doc.addPage();
        yPosition = 20;
      }
      doc.text(splitText[i], 20, yPosition);
      yPosition += 5;
    }
    
    // Add footer
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.text('Generated by DealBrief Scanner • Confidential Analysis', 20, 285);
      doc.text(`Page ${i} of ${pageCount}`, 170, 285);
    }
    
    // Save PDF
    const pdfBuffer = Buffer.from(doc.output('arraybuffer'));
    fs.writeFileSync(filename, pdfBuffer);
    
    return filename;
    
  } catch (error) {
    console.log('PDF generation error:', error.message);
    throw error;
  }
}

async function testPDFGeneration() {
  try {
    console.log('🔍 Looking for existing scan data...');
    
    // Use scan bTKJVjSPVyl which had 31 artifacts
    const scanId = 'bTKJVjSPVyl';
    const companyName = 'Lexigate';
    const domain = 'lexigate.com';
    
    // Get scan findings data
    const artifactsResult = await pool.query(`
      SELECT * FROM artifacts 
      WHERE meta->>'scan_id' = $1
      ORDER BY severity DESC, created_at DESC
    `, [scanId]);
    
    console.log(`📊 Found ${artifactsResult.rows.length} artifacts for scan ${scanId}`);
    
    if (artifactsResult.rows.length === 0) {
      throw new Error(`No scan data found for scan ${scanId}`);
    }
    
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
        scan_module: meta.tool || 'Unknown',
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

    // Call both AI models CONCURRENTLY 
    console.log(`🤖 Calling both AI models concurrently...`);
    const [openaiResponse, claudeResponse] = await Promise.all([
      callOpenAI(MODELS[0].name, userPrompt),
      callClaude(MODELS[1].name, userPrompt)
    ]);
    
    console.log(`✅ OpenAI completed - ${openaiResponse.length} characters`);
    console.log(`✅ Claude completed - ${claudeResponse.length} characters`);
    
    // Generate PDFs concurrently
    console.log(`📄 Generating PDFs concurrently...`);
    const [openaiPdfPath, claudePdfPath] = await Promise.all([
      generatePDF(openaiResponse, MODELS[0].displayName, companyName, scanId),
      generatePDF(claudeResponse, MODELS[1].displayName, companyName, scanId)
    ]);
    
    console.log(`📄 PDFs generated: ${openaiPdfPath}, ${claudePdfPath}`);
    
    // Upload to Supabase concurrently
    console.log(`☁️ Uploading to Supabase concurrently...`);
    const timestamp = Date.now();
    
    const [openaiUpload, claudeUpload] = await Promise.all([
      (async () => {
        const pdfBuffer = fs.readFileSync(openaiPdfPath);
        const fileName = `${companyName.replace(/[^a-zA-Z0-9]/g, '_')}_${MODELS[0].displayName.replace(/[^a-zA-Z0-9]/g, '_')}_${scanId}_${timestamp}.pdf`;
        
        const { data, error } = await supabase.storage
          .from('reports')
          .upload(fileName, pdfBuffer, {
            contentType: 'application/pdf',
            upsert: false
          });
        
        if (error) throw new Error(`OpenAI upload error: ${error.message}`);
        
        const { data: urlData } = supabase.storage
          .from('reports') 
          .getPublicUrl(fileName);
        
        fs.unlinkSync(openaiPdfPath); // Cleanup
        return { model: MODELS[0].displayName, url: urlData.publicUrl };
      })(),
      
      (async () => {
        const pdfBuffer = fs.readFileSync(claudePdfPath);
        const fileName = `${companyName.replace(/[^a-zA-Z0-9]/g, '_')}_${MODELS[1].displayName.replace(/[^a-zA-Z0-9]/g, '_')}_${scanId}_${timestamp}.pdf`;
        
        const { data, error } = await supabase.storage
          .from('reports')
          .upload(fileName, pdfBuffer, {
            contentType: 'application/pdf',
            upsert: false
          });
        
        if (error) throw new Error(`Claude upload error: ${error.message}`);
        
        const { data: urlData } = supabase.storage
          .from('reports')
          .getPublicUrl(fileName);
        
        fs.unlinkSync(claudePdfPath); // Cleanup
        return { model: MODELS[1].displayName, url: urlData.publicUrl };
      })()
    ]);
    
    console.log(`\n🎉 SUCCESS! Both reports generated and uploaded:`);
    console.log(`🔗 OpenAI Report: ${openaiUpload.url}`);
    console.log(`🔗 Claude Report: ${claudeUpload.url}`);
    
    return {
      openaiUrl: openaiUpload.url,
      claudeUrl: claudeUpload.url
    };
    
  } catch (error) {
    console.error(`❌ Test failed:`, error.message);
    throw error;
  } finally {
    await pool.end();
  }
}

testPDFGeneration()
  .then(results => {
    console.log('\n✅ PDF generation test completed successfully!');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }); 