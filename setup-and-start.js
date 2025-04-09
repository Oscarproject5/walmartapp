require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const { exec } = require('child_process');

// Check if .env.local exists
if (!fs.existsSync('.env.local')) {
  console.error('\x1b[31mError: .env.local file not found!\x1b[0m');
  console.error('Please create .env.local with your Supabase and OpenRouter credentials');
  console.error('See README.md for instructions');
  process.exit(1);
}

// Create Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('\x1b[31mError: Missing Supabase credentials in .env.local\x1b[0m');
  console.error('Make sure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  try {
    console.log('\x1b[34m1. Checking Supabase schema...\x1b[0m');
    
    // Try to check if the database has been set up by querying a key table
    const { data: productsTable, error: checkError } = await supabase
      .from('products')
      .select('id')
      .limit(1);
    
    if (checkError && checkError.code === '42P01') { // Table doesn't exist error
      console.log('\x1b[33mDatabase schema needs to be set up.\x1b[0m');
      
      // Try to execute the schema automatically
      console.log('\x1b[34mAttempting to set up schema automatically...\x1b[0m');
      
      // Read the schema file
      const schemaFile = fs.readFileSync('./supabase-schema.sql', 'utf8');
      
      // Try to execute the SQL
      const { error } = await supabase.rpc('exec_sql', { sql: schemaFile });
      
      if (error) {
        console.error('\x1b[31mAutomatic schema setup failed:\x1b[0m', error.message);
        console.log('\x1b[33m\nPlease set up your database schema manually:\x1b[0m');
        console.log('1. Log in to your Supabase dashboard');
        console.log('2. Go to SQL Editor');
        console.log('3. Click "New Query"');
        console.log('4. Copy and paste the contents of supabase-schema.sql');
        console.log('5. Click "Run" to execute the SQL commands');
        
        // Ask if they've completed the manual setup
        const readline = require('readline').createInterface({
          input: process.stdin,
          output: process.stdout
        });
        
        await new Promise((resolve) => {
          readline.question('\x1b[33mHave you completed the manual setup? (yes/no): \x1b[0m', (answer) => {
            if (answer.toLowerCase() !== 'yes') {
              console.log('\x1b[31mSetup canceled. Please run this script again after completing the manual schema setup.\x1b[0m');
              process.exit(1);
            }
            readline.close();
            resolve();
          });
        });
      } else {
        console.log('\x1b[32mSchema setup completed successfully!\x1b[0m');
      }
    } else if (checkError) {
      console.error('\x1b[31mError checking database schema:\x1b[0m', checkError.message);
      console.log('\x1b[33mContinuing anyway, but the app may not work correctly.\x1b[0m');
    } else {
      console.log('\x1b[32mDatabase schema appears to be already set up.\x1b[0m');
    }
    
    // Start the app
    console.log('\x1b[34m2. Starting the app...\x1b[0m');
    
    // Open browser
    const openBrowser = process.platform === 'win32' ? 
      'start http://localhost:3000' : 
      (process.platform === 'darwin' ? 
        'open http://localhost:3000' : 
        'xdg-open http://localhost:3000');
    
    exec(openBrowser);
    
    // Start Next.js
    const nextProcess = exec('npm run dev', (error, stdout, stderr) => {
      if (error) {
        console.error('\x1b[31mError starting app:\x1b[0m', error);
        return;
      }
    });
    
    // Pipe output to console
    nextProcess.stdout.pipe(process.stdout);
    nextProcess.stderr.pipe(process.stderr);
    
    console.log('\x1b[32mApp started successfully! Opening browser...\x1b[0m');
    
  } catch (err) {
    console.error('\x1b[31mAn unexpected error occurred:\x1b[0m', err);
    process.exit(1);
  }
}

main();