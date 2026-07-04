#!/usr/bin/env node

/**
 * Simple database connection test for UrbanFix
 * Tests basic connectivity and schema validation
 */

const { createClient } = require('@supabase/supabase-js');

// Load environment variables manually
const fs = require('fs');
const path = require('path');

function loadEnvFile() {
  const envPath = path.join(__dirname, '../.env');
  if (!fs.existsSync(envPath)) {
    console.error('❌ .env file not found');
    process.exit(1);
  }
  
  const envContent = fs.readFileSync(envPath, 'utf8');
  const envVars = {};
  
  envContent.split('\n').forEach(line => {
    if (line.trim() && !line.startsWith('#')) {
      const [key, ...valueParts] = line.split('=');
      if (key && valueParts.length > 0) {
        envVars[key.trim()] = valueParts.join('=').trim();
      }
    }
  });
  
  return envVars;
}

async function testDatabaseConnection() {
  console.log('🔍 Testing UrbanFix Database Connection');
  console.log('======================================');
  
  try {
    const env = loadEnvFile();
    
    const supabaseUrl = env.EXPO_PUBLIC_SUPABASE_URL;
    const supabaseKey = env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      console.error('❌ Missing Supabase credentials in .env file');
      process.exit(1);
    }
    
    console.log(`📍 Connecting to: ${supabaseUrl}`);
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Test basic connection
    const { data, error } = await supabase
      .from('users')
      .select('count')
      .limit(1);
    
    if (error) {
      if (error.message.includes('relation "users" does not exist')) {
        console.log('⚠️  Database schema not yet created');
        console.log('📋 This indicates that migrations need to be run');
        return { connected: true, schemaExists: false };
      } else {
        console.error(`❌ Database connection failed: ${error.message}`);
        return { connected: false, schemaExists: false };
      }
    }
    
    console.log('✅ Database connection successful');
    console.log('✅ Schema tables are accessible');
    
    return { connected: true, schemaExists: true };
    
  } catch (error) {
    console.error(`❌ Connection test failed: ${error.message}`);
    return { connected: false, schemaExists: false };
  }
}

async function main() {
  const result = await testDatabaseConnection();
  
  console.log('\n📊 Connection Test Results');
  console.log('==========================');
  console.log(`🔌 Connected: ${result.connected ? 'Yes' : 'No'}`);
  console.log(`📋 Schema Exists: ${result.schemaExists ? 'Yes' : 'No'}`);
  
  if (result.connected && result.schemaExists) {
    console.log('\n🎉 Database is ready for use!');
  } else if (result.connected && !result.schemaExists) {
    console.log('\n⚠️  Database connected but schema missing');
    console.log('   Run migrations through Supabase dashboard or SQL editor');
  } else {
    console.log('\n❌ Database setup incomplete');
    console.log('   Check your Supabase configuration and credentials');
  }
}

main().catch(console.error);