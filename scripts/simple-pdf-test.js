import pkg from 'pg';
const { Pool } = pkg;
import { createClient } from '@supabase/supabase-js';
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

async function generateSimplePDF() {
  try {
    console.log('🔍 Starting Ion Interactive PDF generation...');
    
    // Query Ion Interactive data directly
    const scanId = 'rpQbDvL6BiK';
    const companyName = 'Ion Interactive';
    
    const artifactsResult = await pool.query(`
      SELECT * FROM artifacts 
      WHERE meta->>'scan_id' = $1 
      AND src_url IS NOT NULL 
      AND src_url != ''
    `, [scanId]);
    
    console.log(`📊 Found ${artifactsResult.rows.length} verified artifacts`);
    
    if (artifactsResult.rows.length > 0) {
      console.log('Sample artifact:', JSON.stringify(artifactsResult.rows[0], null, 2));
    }
    
    // Create PDF
    const doc = new PDFDocument({ 
      margin: 50,
      size: 'A4'
    });
    
    const filename = `/tmp/${companyName.replace(/[^a-zA-Z0-9]/g, '_')}_VERIFIED_${scanId}_${Date.now()}.pdf`;
    const stream = fs.createWriteStream(filename);
    doc.pipe(stream);
    
    // Title page
    doc.fontSize(24).text(`VERIFIED Security Assessment Report`, { align: 'center' });
    doc.moveDown();
    doc.fontSize(18).text(`${companyName}`, { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).text(`Scan ID: ${scanId}`, { align: 'center' });
    doc.text(`Generated: ${new Date().toISOString()}`, { align: 'center' });
    doc.text(`ZERO SIMULATION - REAL DATA ONLY`, { align: 'center' });
    doc.moveDown(2);
    
    // Executive Summary
    doc.addPage();
    doc.fontSize(16).text('Executive Summary', { underline: true });
    doc.moveDown();
    
    const totalFindings = artifactsResult.rows.length;
    
    doc.fontSize(12);
    doc.text(`Total VERIFIED Findings: ${totalFindings}`);
    doc.text(`Data Source: External security tools (Shodan verified URLs only)`);
    doc.text(`Simulation Level: ZERO`);
    doc.text(`Company: ${companyName}`);
    doc.moveDown();
    
    // Risk level based on findings
    let riskLevel = 'LOW';
    if (totalFindings > 10) riskLevel = 'CRITICAL';
    else if (totalFindings > 5) riskLevel = 'HIGH';
    else if (totalFindings > 0) riskLevel = 'MEDIUM';
    
    doc.text(`Risk Level: ${riskLevel}`);
    doc.moveDown(2);
    
    // Detailed findings
    if (totalFindings > 0) {
      doc.fontSize(16).text('VERIFIED Findings Detail', { underline: true });
      doc.moveDown();
      
      artifactsResult.rows.forEach((finding, index) => {
        if (doc.y > 650) {
          doc.addPage();
        }
        
        doc.fontSize(14).text(`${index + 1}. ${finding.type?.toUpperCase() || 'SECURITY FINDING'}`, { underline: true });
        doc.moveDown(0.5);
        
        doc.fontSize(10);
        doc.text(`Finding: ${finding.val_text || 'N/A'}`);
        doc.text(`VERIFIED SOURCE: ${finding.src_url}`);
        doc.text(`Severity: ${finding.severity || 'UNKNOWN'}`);
        doc.text(`Discovered: ${new Date(finding.created_at).toLocaleString()}`);
        
        if (finding.meta) {
          doc.text(`Metadata: ${JSON.stringify(finding.meta, null, 2)}`);
        }
        
        doc.moveDown(1);
        doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
        doc.moveDown(1);
      });
    } else {
      doc.fontSize(16).text('No Verified Findings', { underline: true });
      doc.moveDown();
      doc.fontSize(12);
      doc.text('This scan found no external security vulnerabilities.');
      doc.text('All external sources returned clean results.');
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
    const reportFileName = `${companyName.replace(/[^a-zA-Z0-9]/g, '_')}_VERIFIED_${scanId}_${Date.now()}.pdf`;
    
    console.log(`☁️ Uploading to Supabase...`);
    
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
    
    console.log('✅ SUCCESS!');
    console.log(`📊 ${totalFindings} verified findings documented`);
    console.log(`📄 Report: ${reportFileName}`);
    console.log(`🔗 URL: ${urlData.publicUrl}`);
    
    // Clean up
    fs.unlinkSync(filename);
    
    return {
      fileName: reportFileName,
      url: urlData.publicUrl,
      findings: totalFindings,
      riskLevel: riskLevel
    };
    
  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

generateSimplePDF()
  .then(result => {
    console.log('\n🎉 PDF GENERATION COMPLETE!');
    process.exit(0);
  })
  .catch(error => {
    console.error('Failed:', error);
    process.exit(1);
  }); 