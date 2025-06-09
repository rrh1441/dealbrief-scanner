import { createClient } from '@supabase/supabase-js';
import { pool } from '../dealbrief-scanner/dist/workers/core/artifactStore.js';
import { validateScanData, getVerifiedArtifacts, getVerifiedFindings } from '../dealbrief-scanner/dist/api/services/reportValidator.js';
import PDFDocument from 'pdfkit';
import fs from 'fs';
import 'dotenv/config';

const supabaseUrl = 'https://cssqcaieeixukjxqpynp.supabase.co';
// Replace with your Supabase key or load from environment/secret manager
const supabaseKey = '<YOUR_SUPABASE_KEY>';

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function generatePDFReport(scanId, companyName) {
  try {
    console.log(`📋 Generating PDF report for ${companyName} (${scanId})`);
    
    // STRICT VALIDATION - NO FAKE DATA ALLOWED
    const validation = await validateScanData(scanId);
    
    if (!validation.isValid) {
      throw new Error(`SCAN VALIDATION FAILED: ${validation.errorMessage}`);
    }
    
    console.log(`✅ Validation passed: ${validation.realFindings} verified findings`);
    
    // Fetch ONLY verified artifacts and findings
    const artifacts = await getVerifiedArtifacts(scanId);
    const findings = await getVerifiedFindings(scanId);
    
    console.log(`📊 Found ${artifacts.length} verified artifacts, ${findings.length} findings`);
    
    // Group by severity
    const bySeverity = {};
    artifacts.forEach(row => {
      if (!bySeverity[row.severity]) {
        bySeverity[row.severity] = [];
      }
      bySeverity[row.severity].push(row);
    });
    
    // Create PDF
    const doc = new PDFDocument({ 
      margin: 50,
      size: 'A4'
    });
    
    const filename = `/tmp/${companyName.replace(/[^a-zA-Z0-9]/g, '_')}_security_report_${scanId}.pdf`;
    const stream = fs.createWriteStream(filename);
    doc.pipe(stream);
    
    // Title page
    doc.fontSize(24).text(`VERIFIED Security Assessment Report`, { align: 'center' });
    doc.moveDown();
    doc.fontSize(18).text(`${companyName}`, { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).text(`Scan ID: ${scanId}`, { align: 'center' });
    doc.text(`Generated: ${new Date().toISOString()}`, { align: 'center' });
    doc.text(`Data Integrity: REAL SCAN RESULTS ONLY`, { align: 'center' });
    doc.moveDown(2);
    
    // Executive Summary
    doc.addPage();
    doc.fontSize(16).text('Executive Summary', { underline: true });
    doc.moveDown();
    
    const totalFindings = artifacts.length;
    const criticalCount = bySeverity.CRITICAL?.length || 0;
    const highCount = bySeverity.HIGH?.length || 0;
    const mediumCount = bySeverity.MEDIUM?.length || 0;
    const lowCount = bySeverity.LOW?.length || 0;
    const infoCount = bySeverity.INFO?.length || 0;
    
    doc.fontSize(12);
    doc.text(`Total VERIFIED Findings: ${totalFindings}`);
    doc.text(`Critical: ${criticalCount}`);
    doc.text(`High: ${highCount}`);
    doc.text(`Medium: ${mediumCount}`);
    doc.text(`Low: ${lowCount}`);
    doc.text(`Info: ${infoCount}`);
    doc.moveDown();
    
    // Data integrity verification
    doc.text(`