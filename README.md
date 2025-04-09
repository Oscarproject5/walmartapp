This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Quick Start with Database Setup

For convenience, you can use the included setup script that will automatically:
1. Check and set up the Supabase database schema
2. Launch the application

Simply run:
```bash
# On Windows
start-with-setup.bat

# On Mac/Linux
node setup-and-start.js
```

If you don't have admin access to your Supabase database, the script will guide you through manual setup.

## Database Schema Updates

The Supabase schema is defined in the following files:
- `supabase-schema.sql` - Main schema file with all tables and functions
- `migrations/*.sql` - Individual migration files for incremental updates

When updates are made to the schema:

1. **Automatic Method** - Run the setup script which will detect and apply changes:
   ```bash
   npm run setup
   ```

2. **Manual Method** - Apply the schema manually through the Supabase dashboard:
   - Log in to your Supabase dashboard
   - Go to SQL Editor
   - Click "New Query"
   - Copy and paste the contents of `supabase-schema.sql`
   - Click "Run" to execute the SQL commands

The schema is up-to-date as of the most recent commit and includes all necessary tables, functions, and RLS policies.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Environment Setup

Before using the desktop shortcut, make sure your environment variables are properly configured:

1. **Create Environment File**
   - Create a file named `.env.local` in the project root directory
   - Add the following variables:
     ```
     NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
     NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
     OPENROUTER_API_KEY=your_openrouter_api_key
     ```
   - Replace `your_supabase_url`, `your_supabase_anon_key`, and `your_openrouter_api_key` with your actual credentials
   - These values can be found in:
     - Supabase: Project Settings > API
     - OpenRouter: Dashboard > API Keys

2. **Verify Environment**
   - Make sure the `.env.local` file is in the same directory as `start-walmart-app.bat`
   - The app will not work correctly without these environment variables

## Desktop Shortcut Setup

To create a desktop shortcut for quick access to the Walmart App:

1. **Locate the Batch File**
   - Find `start-walmart-app.bat` in your project folder
   - This file is located at: `C:\Users\oscar\OneDrive\Desktop\walmartapp\start-walmart-app.bat`

2. **Create the Shortcut**
   - Right-click on your desktop
   - Select "New" > "Shortcut"
   - In the location field, paste the full path:
     ```
     C:\Users\oscar\OneDrive\Desktop\walmartapp\start-walmart-app.bat
     ```
   - Click "Next"
   - Name it "Walmart App"
   - Click "Finish"

3. **Customize the Icon (Optional)**
   - Right-click the new shortcut
   - Select "Properties"
   - Click "Change Icon"
   - Choose an icon from Windows' built-in icons or use a custom .ico file

4. **First-Time Use**
   - Double-click the shortcut
   - If Windows shows a security warning:
     - Click "More info"
     - Click "Run anyway"
   - The app will open in your default browser at http://localhost:3000

5. **Important Notes**
   - Make sure Node.js and npm are installed on your computer
   - The shortcut must remain in the same location relative to the project folder
   - Close any existing instances of the app before starting a new one
   - To stop the app, close the command prompt window that opens

6. **Troubleshooting**
   - If the browser opens but shows "This site can't be reached":
     - Wait a few seconds for the server to start
     - Refresh the page
   - If the command prompt shows errors:
     - Make sure all dependencies are installed by running `npm install`
     - Check that no other process is using port 3000
