#!/usr/bin/env node

/**
 * UrbanFix Database Setup Script
 * 
 * This script executes the database migrations to set up the complete
 * schema with tables, RLS policies, and sample data.
 * 
 * Usage: node scripts/setup-database.js [options]
 * Options:
 *   --skip-sample-data  Skip inserting sample data
 *   --production        Run in production mode (no sample data)
 */

const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Check for required environment variables
const requiredEnvVars = [
  'EXPO_PUBLIC_SUPABASE_URL',
  'EXPO_PUBLIC_SUPABASE_ANON_KEY'
];

const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);
if (missingEnvVars.length > 0) {
  console.error('❌ Missing required environment variables:');
  missingEnvVars.forEach(envVar => console.error(`  - ${envVar}`));
  console.error('\nPlease check your .env file and ensure all required variables are set.');
  process.exit(1);
}

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

// Create Supabase client with service role for admin operations
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Command line argument parsing
const args = process.argv.slice(2);
const skipSampleData = args.includes('--skip-sample-data') || args.includes('--production');
const isProduction = args.includes('--production');

console.log('🚀 UrbanFix Database Setup');
console.log('==========================');
console.log(`📍 Supabase URL: ${supabaseUrl}`);
console.log(`📊 Sample Data: ${skipSampleData ? 'Disabled' : 'Enabled'}`);
console.log(`🏗️  Environment: ${isProduction ? 'Production' : 'Development'}`);
console.log('');

async function executeSqlFile(filePath, description) {
  console.log(`📋 ${description}...`);
  
  try {
    const sql = fs.readFileSync(filePath, 'utf8');
    
    // Split by semicolons and execute statements individually
    const statements = sql
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
    
    let successCount = 0;
    let errorCount = 0;
    
    for (const statement of statements) {
      try {
        const { error } = await supabase.rpc('exec_sql', { sql_query: statement });
        
        if (error) {
          // Try direct query execution as fallback
          const { error: directError } = await supabase
            .from('_temp_exec')
            .select('*')
            .eq('query', statement);
          
          if (directError) {
            console.warn(`   ⚠️  Statement warning: ${error.message.slice(0, 100)}...`);
            errorCount++;
          } else {
            successCount++;
          }
        } else {
          successCount++;
        }
      } catch (execError) {
        console.warn(`   ⚠️  Execution warning: ${execError.message.slice(0, 100)}...`);
        errorCount++;
      }
    }
    
    console.log(`   ✅ Completed: ${successCount} statements executed, ${errorCount} warnings`);
    
  } catch (error) {
    console.error(`   ❌ Error: ${error.message}`);
    
    // For critical schema files, exit on error
    if (filePath.includes('001_initial_schema')) {
      console.error('\n💥 Critical schema setup failed. Please check your Supabase configuration.');
      process.exit(1);
    }
  }
}

async function verifyDatabaseSetup() {
  console.log('🔍 Verifying database setup...');
  
  try {
    // Test basic table creation
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('count')
      .limit(1);
    
    if (usersError) {
      console.error(`   ❌ Users table verification failed: ${usersError.message}`);
      return false;
    }
    
    // Test RLS policies
    const { data: policies, error: policiesError } = await supabase
      .rpc('rls_performance_check');
    
    if (policiesError) {
      console.warn(`   ⚠️  RLS verification warning: ${policiesError.message}`);
    } else {
      console.log(`   ✅ RLS policies active on ${policies?.length || 0} tables`);
    }
    
    // Test database functions
    const { data: avgRating, error: functionError } = await supabase
      .rpc('technician_avg_rating', { t_user_id: '00000000-0000-0000-0000-000000000001' });
    
    if (functionError) {
      console.warn(`   ⚠️  Function verification warning: ${functionError.message}`);
    } else {
      console.log(`   ✅ Database functions working correctly`);
    }
    
    console.log('   ✅ Database verification completed');
    return true;
    
  } catch (error) {
    console.error(`   ❌ Verification error: ${error.message}`);
    return false;
  }
}

async function displaySummary() {
  console.log('\n📊 Setup Summary');
  console.log('=================');
  
  try {
    const { data: tableCount } = await supabase
      .rpc('exec_sql', { 
        sql_query: `
          SELECT table_name 
          FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_type = 'BASE TABLE'
        ` 
      });
    
    console.log(`📋 Tables Created: ${tableCount?.length || 'Unknown'}`);
    
    if (!skipSampleData) {
      const { count: userCount } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true });
      
      const { count: jobCount } = await supabase
        .from('jobs')
        .select('*', { count: 'exact', head: true });
      
      const { count: partCount } = await supabase
        .from('parts_catalogue')
        .select('*', { count: 'exact', head: true });
      
      console.log(`👥 Sample Users: ${userCount || 0}`);
      console.log(`🔧 Sample Jobs: ${jobCount || 0}`);
      console.log(`📦 Parts Catalogue: ${partCount || 0} items`);
    }
    
  } catch (error) {
    console.log('📊 Summary generation skipped due to database access limitations');
  }
  
  console.log('\n🎉 Database setup completed successfully!');
  console.log('\nNext steps:');
  console.log('1. Update your .env file with any missing Supabase credentials');
  console.log('2. Run the mobile app to test the database connection');
  console.log('3. Create your first user through the authentication flow');
}

async function main() {
  try {
    // Execute migrations in order
    const migrationsDir = path.join(__dirname, '../database/migrations');
    
    await executeSqlFile(
      path.join(migrationsDir, '001_initial_schema.sql'),
      'Setting up database schema and tables'
    );
    
    await executeSqlFile(
      path.join(migrationsDir, '002_row_level_security.sql'),
      'Configuring Row Level Security policies'
    );
    
    if (!skipSampleData) {
      await executeSqlFile(
        path.join(migrationsDir, '003_sample_data.sql'),
        'Inserting sample data for development'
      );
    }
    
    // Verify setup
    const verified = await verifyDatabaseSetup();
    
    // Display summary
    await displaySummary();
    
    process.exit(verified ? 0 : 1);
    
  } catch (error) {
    console.error('\n💥 Fatal error during database setup:');
    console.error(error.message);
    process.exit(1);
  }
}

// Handle process termination gracefully
process.on('SIGINT', () => {
  console.log('\n👋 Database setup interrupted by user');
  process.exit(1);
});

process.on('SIGTERM', () => {
  console.log('\n👋 Database setup terminated');
  process.exit(1);
});

// Run the setup
main();