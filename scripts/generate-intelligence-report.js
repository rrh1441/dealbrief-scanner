import pkg from 'pg';
const { Pool } = pkg;
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import PDFDocument from 'pdfkit';
import fs from 'fs';

const pool = new Pool({
  connectionString: process.env.DB_URL || process.env.DATABASE_URL
});

const supabaseUrl = 'https://cssqcaieeixukjxqpynp.supabase.co';
// Replace with your Supabase key or load from environment/secret manager
const supabaseKey = '<YOUR_SUPABASE_KEY>';

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const SECURITY_ANALYST_PROMPT = `ROLE  
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
Assume readers are smart business professionals with limited technical depth and <5 minutes to skim the briefing. Clarity and credibility outrank exhaustiveness.`;

async function generateIntelligentReport(scanId, companyName) {
  try {
    console.log(`🧠 Generating intelligence report for ${companyName} (${scanId})`);
    
    // Get all verified findings
    const artifactsResult = await pool.query(`
      SELECT * FROM artifacts 
      WHERE meta->>'scan_id' = $1 
      AND src_url IS NOT NULL 
      AND src_url != ''
      ORDER BY severity DESC, created_at DESC
    `, [scanId]);
    
    console.log(`📊 Found ${artifactsResult.rows.length} verified findings`);
    
    if (artifactsResult.rows.length === 0) {
      console.log('⚠️  No verified findings - generating clean security report');
    }
    
    // Prepare detailed findings for OpenAI with more technical context
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
    
    console.log('🤖 Generating AI analysis...');
    
    // Generate intelligence report using OpenAI
    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: SECURITY_ANALYST_PROMPT
        },
        {
          role: "user",
          content: `Generate a due diligence briefing for ${companyName} based on cybersecurity reconnaissance data.

COMPANY: ${companyName}
SCAN DATE: ${new Date().toISOString().split('T')[0]}
DATA SOURCES: Network scanning via Shodan and other OSINT tools

FINDINGS DATA:
${JSON.stringify(findingsSummary, null, 2)}

Follow the DealBrief format exactly. Focus on material business risks, not theoretical concerns. Use plain English and cite sources properly.`
        }
      ],
      max_tokens: 4000,
      temperature: 0.3
    });
    
    const intelligenceReport = completion.choices[0].message.content;
    console.log('✅ AI analysis complete');
    
    // Generate PDF with intelligence report
    const doc = new PDFDocument({ 
      margin: 50,
      size: 'A4'
    });
    
    const filename = `/tmp/${companyName.replace(/[^a-zA-Z0-9]/g, '_')}_Security_Due_Diligence_${scanId}_${Date.now()}.pdf`;
    const stream = fs.createWriteStream(filename);
    doc.pipe(stream);
    
    // Title page
    doc.fontSize(24).text('Cybersecurity Due Diligence Report', { align: 'center' });
    doc.moveDown();
    doc.fontSize(18).text(`${companyName}`, { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).text(`Assessment Date: ${new Date().toLocaleDateString()}`, { align: 'center' });
    doc.text(`Scan Reference: ${scanId}`, { align: 'center' });
    doc.moveDown(3);
    
    // Disclaimer
    doc.fontSize(10);
    doc.text('CONFIDENTIAL - For authorized recipients only', { align: 'center' });
    doc.text('This report contains proprietary security assessment data', { align: 'center' });
    doc.moveDown(2);
    
    // Intelligence report content
    doc.addPage();
    doc.fontSize(12);
    
    // Split the intelligence report into paragraphs for better formatting
    const paragraphs = intelligenceReport.split('\n\n');
    
    paragraphs.forEach(paragraph => {
      if (paragraph.trim()) {
        // Check if it's a header (all caps or starts with number)
        if (paragraph.match(/^[A-Z\s\d\.]+$/) || paragraph.match(/^\d+\./)) {
          doc.fontSize(14).text(paragraph.trim(), { underline: true });
          doc.fontSize(12);
          doc.moveDown(0.5);
        } else {
          doc.text(paragraph.trim());
          doc.moveDown(0.8);
        }
        
        // Add new page if needed
        if (doc.y > 700) {
          doc.addPage();
        }
      }
    });
    
    // Technical appendix with raw findings
    if (artifactsResult.rows.length > 0) {
      doc.addPage();
      doc.fontSize(16).text('Technical Appendix - Verified Findings', { underline: true });
      doc.moveDown();
      
      artifactsResult.rows.forEach((finding, index) => {
        if (doc.y > 650) {
          doc.addPage();
        }
        
        doc.fontSize(12).text(`${index + 1}. ${finding.type?.toUpperCase() || 'SECURITY FINDING'}`, { underline: true });
        doc.fontSize(10);
        doc.text(`Finding: ${finding.val_text || 'N/A'}`);
        doc.text(`Severity: ${finding.severity || 'UNKNOWN'}`);
        doc.text(`Source: ${finding.src_url}`);
        doc.text(`Discovered: ${new Date(finding.created_at).toLocaleString()}`);
        doc.moveDown(1);
      });
    }
    
    // Finalize PDF
    doc.end();
    
    await new Promise((resolve, reject) => {
      stream.on('finish', resolve);
      stream.on('error', reject);
      doc.on('error', reject);
    });
    
    // Check file size
    const stats = fs.statSync(filename);
    console.log(`📄 PDF generated: ${filename}`);
    console.log(`📏 File size: ${stats.size} bytes`);
    
    if (stats.size === 0) {
      throw new Error('PDF is empty!');
    }
    
    // Upload to Supabase
    const pdfBuffer = fs.readFileSync(filename);
    const reportFileName = `${companyName.replace(/[^a-zA-Z0-9]/g, '_')}_Security_Due_Diligence_${scanId}_${Date.now()}.pdf`;
    
    console.log(`☁️ Uploading intelligence report to Supabase...`);
    
    const { data, error } = await supabase.storage
      .from('reports')
      .upload(reportFileName, pdfBuffer, {
        contentType: 'application/pdf',
        upsert: false
      });
    
    if (error) {
      console.error('❌ Upload error:', error);
      throw error;
    }
    
    const { data: urlData } = supabase.storage
      .from('reports')
      .getPublicUrl(reportFileName);
    
    console.log('✅ INTELLIGENCE REPORT COMPLETE!');
    console.log(`📊 ${artifactsResult.rows.length} findings analyzed`);
    console.log(`📄 Report: ${reportFileName}`);
    console.log(`🔗 URL: ${urlData.publicUrl}`);
    
    // Clean up
    fs.unlinkSync(filename);
    
    return {
      fileName: reportFileName,
      url: urlData.publicUrl,
      findings: artifactsResult.rows.length,
      intelligenceReport: intelligenceReport
    };
    
  } catch (error) {
    console.error('❌ Intelligence report generation failed:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run the script
const scanId = process.argv[2] || 'rpQbDvL6BiK';
const companyName = process.argv[3] || 'Ion Interactive';

generateIntelligentReport(scanId, companyName)
  .then(result => {
    console.log('\n🎉 CYBERSECURITY DUE DILIGENCE COMPLETE!');
    console.log(`📋 Investment-grade security assessment generated`);
    process.exit(0);
  })
  .catch(error => {
    console.error('Report generation failed:', error);
    process.exit(1);
  }); 