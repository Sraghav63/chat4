const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔧 Setting up database...');

try {
  // First, let's check if the database is accessible
  const postgres = require('postgres');
  const dotenv = require('dotenv');
  
  // Load environment variables
  dotenv.config({ path: '.env' });
  dotenv.config({ path: '.env.local' });
  
  if (!process.env.POSTGRES_URL) {
    console.error('❌ POSTGRES_URL not found in environment variables');
    console.log('Please set POSTGRES_URL in your .env file');
    process.exit(1);
  }
  
  console.log('✅ POSTGRES_URL found');
  
  // Test database connection
  const testConnection = async () => {
    const sql = postgres(process.env.POSTGRES_URL, { max: 1 });
    try {
      await sql`SELECT 1`;
      console.log('✅ Database connection successful');
      await sql.end();
      return true;
    } catch (error) {
      console.error('❌ Database connection failed:', error.message);
      await sql.end();
      return false;
    }
  };
  
  testConnection().then((success) => {
    if (success) {
      console.log('🎉 Database setup complete!');
      console.log('You can now run: npm run dev');
    } else {
      console.log('❌ Database setup failed. Please check your POSTGRES_URL');
    }
    process.exit(success ? 0 : 1);
  });
  
} catch (error) {
  console.error('❌ Setup failed:', error.message);
  process.exit(1);
}