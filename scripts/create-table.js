import fetch from 'node-fetch';

const supabaseUrl = 'https://cssqcaieeixukjxqpynp.supabase.co';
// Replace with your Supabase service role key or load from environment/secret manager
const serviceRoleKey = '<YOUR_SUPABASE_SERVICE_ROLE_KEY>';

async function createTable() {
  try {
    console.log('🏗️  Creating security_reports table in Supabase...');
    
    const sql = `
      CREATE TABLE IF NOT EXISTS security_reports (
        id SERIAL PRIMARY KEY,
        scan_id VARCHAR(255) UNIQUE NOT NULL,
        company_name VARCHAR(255) NOT NULL,
        report_content TEXT NOT NULL,
        executive_summary TEXT,
        generated_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
      
      CREATE INDEX IF NOT EXISTS idx_security_reports_scan_id ON security_reports(scan_id);
      CREATE INDEX IF NOT EXISTS idx_security_reports_company ON security_reports(company_name);
      CREATE INDEX IF NOT EXISTS idx_security_reports_created_at ON security_reports(created_at);
      
      ALTER TABLE security_reports ENABLE ROW LEVEL SECURITY;
      
      DROP POLICY IF EXISTS "Allow all operations on security_reports" ON security_reports;
      CREATE POLICY "Allow all operations on security_reports" ON security_reports
      FOR ALL USING (true) WITH CHECK (true);
    `;

    // Use Supabase REST API to execute SQL
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${serviceRoleKey}`,
        'apikey': serviceRoleKey
      },
      body: JSON.stringify({
        sql: sql
      })
    });

    if (!response.ok) {
      // Try alternative approach using the database URL directly
      console.log('🔄 Trying alternative approach...');
      
      const altResponse = await fetch(`${supabaseUrl}/rest/v1/rpc/exec`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${serviceRoleKey}`,
          'apikey': serviceRoleKey
        },
        body: JSON.stringify({
          query: sql
        })
      });

      if (!altResponse.ok) {
        // Manual table creation via direct insert approach
        console.log('🛠️  Creating table via schema inspection...');
        
        // Test if table exists by trying to select from it
        const testResponse = await fetch(`${supabaseUrl}/rest/v1/security_reports?limit=1`, {
          headers: {
            'Authorization': `Bearer ${serviceRoleKey}`,
            'apikey': serviceRoleKey
          }
        });

        if (testResponse.ok) {
          console.log('✅ Table already exists!');
          return true;
        } else {
          console.log('❌ Table does not exist and SQL execution failed');
          console.log('Response status:', response.status);
          console.log('Response text:', await response.text());
          return false;
        }
      } else {
        console.log('✅ Table created via alternative method!');
        return true;
      }
    } else {
      console.log('✅ Table created successfully!');
      return true;
    }

  } catch (error) {
    console.error('❌ Error creating table:', error.message);
    return false;
  }
}

async function main() {
  const success = await createTable();
  
  if (success) {
    console.log('\n🎉 Ready to save reports!');
    console.log('📋 Table: security_reports');
    console.log('🌐 Dashboard: https://cssqcaieeixukjxqpynp.supabase.co/project/default/editor');
    console.log('\n▶️  Now run: node scripts/simple-save.js');
  } else {
    console.log('\n❌ Table creation failed. You may need to create it manually in the Supabase dashboard.');
  }
}

main(); 