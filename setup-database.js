#!/usr/bin/env node

/**
 * Database Setup Script for Solana Wheel Game
 *
 * This script helps you set up persistent storage for your application.
 * It supports multiple database options and provides easy setup instructions.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Solana Wheel Game - Database Setup');
console.log('=====================================\n');

// Check if .env file exists
const envPath = path.join(__dirname, '.env');
const envExamplePath = path.join(__dirname, '.env.example');

if (!fs.existsSync(envPath)) {
  console.log('📝 Creating .env file from template...');
  if (fs.existsSync(envExamplePath)) {
    fs.copyFileSync(envExamplePath, envPath);
    console.log('✅ .env file created\n');
  } else {
    console.log('❌ .env.example not found. Please create .env manually.\n');
    process.exit(1);
  }
}

console.log('Choose your database option:');
console.log('1. PostgreSQL (Recommended for production)');
console.log('2. SQLite (Simple file-based, good for development)');
console.log('3. Skip database setup (use in-memory storage)');
console.log('');

const readline = require('readline');
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

rl.question('Enter your choice (1-3): ', (choice) => {
  switch (choice) {
    case '1':
      setupPostgreSQL();
      break;
    case '2':
      setupSQLite();
      break;
    case '3':
      console.log('ℹ️  Skipping database setup. Using in-memory storage.');
      console.log('   Note: All data will be lost when the server restarts.\n');
      break;
    default:
      console.log('❌ Invalid choice. Please run the script again.\n');
      process.exit(1);
  }

  rl.close();
});

function setupPostgreSQL() {
  console.log('\n🐘 Setting up PostgreSQL...');
  console.log('This requires PostgreSQL to be installed and running.');
  console.log('');

  console.log('📋 PostgreSQL Setup Instructions:');
  console.log('================================');
  console.log('');
  console.log('1. Install PostgreSQL:');
  console.log('   - Ubuntu/Debian: sudo apt install postgresql postgresql-contrib');
  console.log('   - macOS: brew install postgresql');
  console.log('   - Windows: Download from https://www.postgresql.org/download/');
  console.log('');
  console.log('2. Start PostgreSQL service:');
  console.log('   - Ubuntu/Debian: sudo systemctl start postgresql');
  console.log('   - macOS: brew services start postgresql');
  console.log('   - Windows: Use Services panel');
  console.log('');
  console.log('3. Create database and user:');
  console.log('   sudo -u postgres psql');
  console.log('   CREATE DATABASE solana_wheel_game;');
  console.log('   CREATE USER wheel_user WITH PASSWORD \'your_password_here\';');
  console.log('   GRANT ALL PRIVILEGES ON DATABASE solana_wheel_game TO wheel_user;');
  console.log('   \\q');
  console.log('');
  console.log('4. Update your .env file with database credentials:');
  console.log('   POSTGRES_URL=postgresql://wheel_user:your_password_here@localhost:5432/solana_wheel_game');
  console.log('');
  console.log('5. Run database migration:');
  console.log('   npm run db:migrate');
  console.log('');
  console.log('6. (Optional) Seed with sample data:');
  console.log('   npm run db:seed');
  console.log('');

  // Update .env with PostgreSQL template
  updateEnvForPostgreSQL();
}

function setupSQLite() {
  console.log('\n📁 Setting up SQLite...');
  console.log('SQLite is a simple file-based database, perfect for development.');
  console.log('');

  console.log('📋 SQLite Setup Instructions:');
  console.log('=============================');
  console.log('');
  console.log('1. SQLite is already included in Node.js, no installation needed!');
  console.log('');
  console.log('2. Update your .env file:');
  console.log('   DATABASE_URL=sqlite:./database.sqlite');
  console.log('');
  console.log('3. Install SQLite dependency:');
  console.log('   npm install sqlite3');
  console.log('');
  console.log('4. Run database migration:');
  console.log('   npm run db:migrate');
  console.log('');
  console.log('5. (Optional) Seed with sample data:');
  console.log('   npm run db:seed');
  console.log('');

  // Update .env for SQLite
  updateEnvForSQLite();
}

function updateEnvForPostgreSQL() {
  try {
    let envContent = fs.readFileSync(envPath, 'utf8');

    // Add PostgreSQL configuration
    if (!envContent.includes('POSTGRES_URL=')) {
      envContent += '\n# Database Configuration\n';
      envContent += 'POSTGRES_URL=postgresql://wheel_user:your_password_here@localhost:5432/solana_wheel_game\n';
    }

    fs.writeFileSync(envPath, envContent);
    console.log('✅ Updated .env file with PostgreSQL configuration');
  } catch (error) {
    console.log('❌ Failed to update .env file:', error.message);
  }
}

function updateEnvForSQLite() {
  try {
    let envContent = fs.readFileSync(envPath, 'utf8');

    // Add SQLite configuration
    if (!envContent.includes('DATABASE_URL=')) {
      envContent += '\n# Database Configuration\n';
      envContent += 'DATABASE_URL=sqlite:./database.sqlite\n';
    }

    fs.writeFileSync(envPath, envContent);
    console.log('✅ Updated .env file with SQLite configuration');
  } catch (error) {
    console.log('❌ Failed to update .env file:', error.message);
  }
}

// Alternative setup methods for different environments
console.log('\n🌐 Alternative Setup Options:');
console.log('=============================');
console.log('');
console.log('🐳 Docker PostgreSQL:');
console.log('  docker run --name postgres-wheel -e POSTGRES_PASSWORD=mypassword -e POSTGRES_DB=solana_wheel_game -p 5432:5432 -d postgres:13');
console.log('  POSTGRES_URL=postgresql://postgres:mypassword@localhost:5432/solana_wheel_game');
console.log('');
console.log('☁️  Cloud Databases:');
console.log('  - Railway PostgreSQL: https://railway.app');
console.log('  - PlanetScale MySQL: https://planetscale.com');
console.log('  - Supabase PostgreSQL: https://supabase.com');
console.log('  - ElephantSQL PostgreSQL: https://elephantsql.com');
console.log('');
console.log('📚 For detailed setup guides, visit:');
console.log('  https://github.com/your-repo/database-setup');
console.log('');

// Export functions for use in other scripts
module.exports = {
  setupPostgreSQL,
  setupSQLite
};