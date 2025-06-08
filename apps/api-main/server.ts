import { config } from 'dotenv';
import Fastify from 'fastify';
import fastifyStatic from '@fastify/static';
import cors from '@fastify/cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { UpstashQueue } from '../workers/core/queue.js';
import { nanoid } from 'nanoid';
import { generateSecurityReport, generateExecutiveSummary } from './services/reportGenerator.js';
import { pool } from '../workers/core/artifactStore.js';

config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const fastify = Fastify({ logger: true });
fastify.register(cors, { origin: process.env.CORS_ORIGIN || "*" });
const queue = new UpstashQueue(process.env.REDIS_URL!);

function log(...args: any[]) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}]`, ...args);
}

// Register static file serving for the public directory
fastify.register(fastifyStatic, {
  root: path.join(__dirname, '..', 'public'),
  prefix: '/', // serve files from root
});

// Health check endpoint
fastify.get('/health', async (request, reply) => {
  return { status: 'ok', timestamp: new Date().toISOString() };
});

// Create a new scan
fastify.post('/scan', async (request, reply) => {
  const { companyName, domain } = request.body as { companyName: string; domain: string };
  
  if (!companyName || !domain) {
    reply.status(400);
    return { error: 'Company name and domain are required' };
  }

  const scanId = nanoid(11);
  const job = {
    id: scanId,
    companyName,
    domain,
    createdAt: new Date().toISOString()
  };

  await queue.addJob(scanId, job);
  log('[api] Created scan job', scanId, 'for', companyName);

  return {
    scanId,
    status: 'queued',
    companyName,
    domain,
    message: 'Scan started successfully'
  };
});

// Get scan status
fastify.get('/scan/:scanId/status', async (request, reply) => {
  const { scanId } = request.params as { scanId: string };
  
  const status = await queue.getStatus(scanId);
  
  if (!status) {
    reply.status(404);
    return { error: 'Scan not found' };
  }

  return {
    scanId,
    ...status
  };
});

// Generate AI-powered security report
fastify.get('/scan/:scanId/report', async (request, reply) => {
  const { scanId } = request.params as { scanId: string };
  
  try {
    // Get scan status first
    const status = await queue.getStatus(scanId);
    if (!status) {
      reply.status(404);
      return { error: 'Scan not found' };
    }

    if (status.state !== 'done') {
      reply.status(400);
      return { error: 'Scan not completed yet', status: status.state };
    }

    // Get company info from the original scan job or artifacts
    const artifactQuery = await pool.query(
      `SELECT meta->>'company' as company_name, meta->>'domain' as domain 
       FROM artifacts 
       WHERE meta->>'scan_id' = $1 
       AND meta->>'company' IS NOT NULL
       LIMIT 1`,
      [scanId]
    );
    
    const companyName = artifactQuery.rows[0]?.company_name || 'Unknown Company';
    const domain = artifactQuery.rows[0]?.domain || 'unknown.com';

    log('[api] Generating security report for scan', scanId);
    const report = await generateSecurityReport(scanId, companyName, domain);

    return {
      scanId,
      report,
      generatedAt: new Date().toISOString()
    };

  } catch (error) {
    log('[api] Report generation error:', (error as Error).message);
    reply.status(500);
    return { error: 'Failed to generate report', details: (error as Error).message };
  }
});

// Generate executive summary
fastify.get('/scan/:scanId/summary', async (request, reply) => {
  const { scanId } = request.params as { scanId: string };
  
  try {
    const status = await queue.getStatus(scanId);
    if (!status) {
      reply.status(404);
      return { error: 'Scan not found' };
    }

    if (status.state !== 'done') {
      reply.status(400);
      return { error: 'Scan not completed yet', status: status.state };
    }

    // Get company info from artifacts
    const artifactQuery = await pool.query(
      `SELECT meta->>'company' as company_name 
       FROM artifacts 
       WHERE meta->>'scan_id' = $1 
       AND meta->>'company' IS NOT NULL
       LIMIT 1`,
      [scanId]
    );
    
    const companyName = artifactQuery.rows[0]?.company_name || 'Unknown Company';
    
    log('[api] Generating executive summary for scan', scanId);
    const summary = await generateExecutiveSummary(scanId, companyName);

    return {
      scanId,
      summary,
      generatedAt: new Date().toISOString()
    };

  } catch (error) {
    log('[api] Summary generation error:', (error as Error).message);
    reply.status(500);
    return { error: 'Failed to generate summary', details: (error as Error).message };
  }
});

// Get raw artifacts from scan
fastify.get('/scan/:scanId/artifacts', async (request, reply) => {
  const { scanId } = request.params as { scanId: string };
  
  try {
    // This would query the database for artifacts
    // For now, return a placeholder
    return {
      scanId,
      artifacts: [],
      message: 'Artifact retrieval endpoint ready - database query to be implemented'
    };
  } catch (error) {
    reply.status(500);
    return { error: 'Failed to retrieve artifacts' };
  }
});

// Webhook callback endpoint (for future use)
fastify.post('/scan/:id/callback', async (request, reply) => {
  try {
    const { id } = request.params as { id: string };
    log('[api] Received callback for scan', id);
    return { received: true };
  } catch (error) {
    log('[api] Error handling callback:', (error as Error).message);
    return reply.status(500).send({ error: 'Callback failed' });
  }
});

const start = async () => {
  try {
    await fastify.listen({ port: 3000, host: '0.0.0.0' });
    log('[api] Server listening on port 3000');
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
