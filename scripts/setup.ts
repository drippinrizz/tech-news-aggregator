#!/usr/bin/env npx tsx
/**
 * Tech News Aggregator - Setup Wizard
 *
 * A unified setup wizard that configures everything:
 * 1. Xano backend (workspace, tables, endpoints, agents)
 * 2. AI provider (Anthropic, OpenAI, or Google)
 * 3. Email configuration (Gmail SMTP)
 *
 * Usage:
 *   npm run setup
 */

import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';
import * as crypto from 'crypto';
import * as nodemailer from 'nodemailer';
import { execSync } from 'child_process';

const XANO_DIR = path.join(__dirname, '..', 'xano');

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface XanoConfig {
  baseUrl: string;
  apiKey: string;
  workspaceId: number;
}

interface AIProviderConfig {
  type: 'anthropic' | 'openai' | 'google';
  name: string;
  envVar: string;
  model: string;
  xanoType: string;
  apiKey: string;
}

interface EmailConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  to: string;
}

interface SetupConfig {
  xano: XanoConfig;
  ai: AIProviderConfig;
  email: EmailConfig;
  apiUrl: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// AI Provider Definitions
// ─────────────────────────────────────────────────────────────────────────────

const AI_PROVIDERS = [
  {
    type: 'anthropic' as const,
    name: 'Anthropic (Claude)',
    envVar: 'ANTHROPIC_API_KEY',
    model: 'claude-sonnet-4-20250514',
    xanoType: 'anthropic',
  },
  {
    type: 'openai' as const,
    name: 'OpenAI (GPT-4)',
    envVar: 'OPENAI_API_KEY',
    model: 'gpt-4o',
    xanoType: 'openai',
  },
  {
    type: 'google' as const,
    name: 'Google (Gemini)',
    envVar: 'GOOGLE_AI_API_KEY',
    model: 'gemini-2.0-flash',
    xanoType: 'google',
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Utilities
// ─────────────────────────────────────────────────────────────────────────────

async function prompt(question: string, defaultValue?: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    const display = defaultValue ? `${question} [${defaultValue}]: ` : `${question}: `;
    rl.question(display, (answer) => {
      rl.close();
      resolve(answer.trim() || defaultValue || '');
    });
  });
}

async function promptPassword(question: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(`${question}: `, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

function printBanner() {
  console.log('');
  console.log('╔════════════════════════════════════════════════════════════════╗');
  console.log('║                                                                ║');
  console.log('║            Tech News Aggregator - Setup Wizard                 ║');
  console.log('║                                                                ║');
  console.log('╚════════════════════════════════════════════════════════════════╝');
  console.log('');
  console.log('This wizard will help you configure:');
  console.log('  1. Xano backend (database, API, AI agent)');
  console.log('  2. AI provider (Claude, GPT-4, or Gemini)');
  console.log('  3. Email notifications (Gmail)');
  console.log('');
}

function printStep(step: number, total: number, title: string) {
  console.log('');
  console.log(`─── Step ${step}/${total}: ${title} ───`);
  console.log('');
}

function readXsFiles(dir: string): { name: string; content: string }[] {
  const files: { name: string; content: string }[] = [];
  if (!fs.existsSync(dir)) return files;

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      // Recurse into subdirectories (e.g., functions/auth/)
      const subFiles = readXsFiles(path.join(dir, entry.name));
      files.push(...subFiles);
    } else if (entry.name.endsWith('.xs')) {
      files.push({
        name: entry.name.replace('.xs', ''),
        content: fs.readFileSync(path.join(dir, entry.name), 'utf-8'),
      });
    }
  }
  return files;
}

// ─────────────────────────────────────────────────────────────────────────────
// Xano API Functions
// ─────────────────────────────────────────────────────────────────────────────

// Rate limit: Xano free tier allows 10 requests per 20 seconds (1 req every 2s)
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
const RATE_LIMIT_DELAY_MS = 2000;

async function xanoRequest(config: XanoConfig, endpoint: string, method = 'GET', body?: any) {
  await sleep(RATE_LIMIT_DELAY_MS);
  const url = `${config.baseUrl}/api:meta/workspace/${config.workspaceId}${endpoint}`;
  const response = await fetch(url, {
    method,
    headers: {
      'Authorization': `Bearer ${config.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Xano API error (${response.status}): ${error}`);
  }
  return response.json();
}

async function xanoXsRequest(config: XanoConfig, endpoint: string, xanoscript: string) {
  await sleep(RATE_LIMIT_DELAY_MS);
  const url = `${config.baseUrl}/api:meta/workspace/${config.workspaceId}${endpoint}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${config.apiKey}`,
      'Content-Type': 'text/x-xanoscript',
    },
    body: xanoscript,
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Xano API error (${response.status}): ${error}`);
  }
  return response.json();
}

async function xanoInstanceRequest(baseUrl: string, apiKey: string, endpoint: string) {
  await sleep(RATE_LIMIT_DELAY_MS);
  const url = `${baseUrl}/api:meta${endpoint}`;
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Xano API error (${response.status}): ${error}`);
  }
  return response.json();
}

// ─────────────────────────────────────────────────────────────────────────────
// Step 1: Xano Configuration
// ─────────────────────────────────────────────────────────────────────────────

async function configureXano(): Promise<XanoConfig & { apiUrl: string }> {
  printStep(1, 3, 'Xano Backend Configuration');

  console.log('To find your Xano credentials:');
  console.log('  1. Go to your Xano workspace');
  console.log('  2. Base URL: Look at the URL (e.g., https://x1234567.xano.io)');
  console.log('  3. API Key: Settings > API Keys > Metadata API');
  console.log('');

  const baseUrl = (await prompt('Xano Base URL')).replace(/\/$/, '');
  const apiKey = await prompt('Xano Metadata API Key');

  if (!baseUrl || !apiKey) {
    throw new Error('Xano Base URL and API Key are required');
  }

  // Fetch workspaces
  console.log('\nFetching workspaces...');
  let workspaceId: number;
  let workspaceName: string;

  try {
    const workspaces = await xanoInstanceRequest(baseUrl, apiKey, '/workspace');

    if (Array.isArray(workspaces) && workspaces.length > 0) {
      console.log('\nAvailable workspaces:');
      workspaces.forEach((ws: any, i: number) => {
        console.log(`  ${i + 1}. ${ws.name || 'Unnamed'}`);
      });
      console.log('');

      const selection = parseInt(await prompt('Select workspace (enter number)'), 10);
      if (isNaN(selection) || selection < 1 || selection > workspaces.length) {
        throw new Error('Invalid workspace selection');
      }

      workspaceId = workspaces[selection - 1].id;
      workspaceName = workspaces[selection - 1].name || 'Unnamed';
    } else {
      throw new Error('No workspaces found');
    }
  } catch (error: any) {
    console.log('\nCould not fetch workspaces. Enter ID manually.');
    console.log('Find it in your Xano URL: /workspace/[WORKSPACE_ID]/...');
    workspaceId = parseInt(await prompt('Workspace ID'), 10);
    workspaceName = 'Unknown';
    if (isNaN(workspaceId)) {
      throw new Error('Invalid Workspace ID');
    }
  }

  // Verify connection
  const config: XanoConfig = { baseUrl, apiKey, workspaceId };
  try {
    await xanoRequest(config, '');
    console.log(`\n✓ Connected to workspace: ${workspaceName}`);
  } catch (error: any) {
    throw new Error(`Failed to connect to Xano: ${error.message}`);
  }

  return { ...config, apiUrl: '' }; // apiUrl will be set after API group creation
}

// ─────────────────────────────────────────────────────────────────────────────
// Step 2: AI Provider Configuration
// ─────────────────────────────────────────────────────────────────────────────

async function configureAI(): Promise<AIProviderConfig> {
  printStep(2, 3, 'AI Provider Configuration');

  console.log('Which AI provider would you like to use?\n');
  AI_PROVIDERS.forEach((p, i) => {
    console.log(`  ${i + 1}. ${p.name}`);
  });
  console.log('');

  const selection = parseInt(await prompt('Select provider (enter number)', '1'), 10);
  const provider = AI_PROVIDERS[selection - 1] || AI_PROVIDERS[0];

  console.log(`\n✓ Selected: ${provider.name}`);
  console.log(`\nEnter your ${provider.name} API key:`);

  const apiKey = await prompt(provider.envVar);

  if (!apiKey) {
    console.log('⚠ No API key provided - you can add it later in .env');
  }

  return { ...provider, apiKey };
}

// ─────────────────────────────────────────────────────────────────────────────
// Step 3: Email Configuration
// ─────────────────────────────────────────────────────────────────────────────

async function configureEmail(): Promise<EmailConfig> {
  printStep(3, 3, 'Email Configuration (Gmail)');

  console.log('For Gmail, you need an App Password:');
  console.log('  1. Enable 2-factor authentication on your Google account');
  console.log('  2. Go to: https://myaccount.google.com/apppasswords');
  console.log('  3. Create an app password for "Mail"');
  console.log('');

  const skipEmail = (await prompt('Configure email now? (Y/n)', 'y')).toLowerCase();

  if (skipEmail === 'n') {
    console.log('⚠ Skipping email configuration - add it later in .env');
    return {
      host: 'smtp.gmail.com',
      port: 587,
      user: '',
      password: '',
      to: '',
    };
  }

  const user = await prompt('Gmail address');
  const password = await promptPassword('Gmail app password');

  const config: EmailConfig = {
    host: 'smtp.gmail.com',
    port: 587,
    user,
    password,
    to: user,
  };

  // Test email if credentials provided
  if (user && password) {
    const testEmail = (await prompt('\nSend test email? (Y/n)', 'y')).toLowerCase();

    if (testEmail !== 'n') {
      console.log('\nTesting email configuration...');

      try {
        const transporter = nodemailer.createTransport({
          host: config.host,
          port: config.port,
          secure: false,
          auth: { user: config.user, pass: config.password },
        });

        await transporter.verify();
        console.log('✓ SMTP connection successful');

        await transporter.sendMail({
          from: config.user,
          to: config.to,
          subject: 'Tech News Aggregator - Setup Test',
          html: `
            <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; padding: 20px;">
              <h2 style="color: #667eea;">Setup Successful!</h2>
              <p>Your email configuration is working correctly.</p>
              <p>You will receive digest emails at this address.</p>
            </div>
          `,
        });

        console.log(`✓ Test email sent to ${config.to}`);
      } catch (error: any) {
        console.log(`⚠ Email test failed: ${error.message}`);
        console.log('  You can fix this later in .env');
      }
    }
  }

  return config;
}

// ─────────────────────────────────────────────────────────────────────────────
// Xano Resource Creation
// ─────────────────────────────────────────────────────────────────────────────

async function createXanoResources(config: XanoConfig, ai: AIProviderConfig): Promise<string> {
  console.log('');
  console.log('─── Creating Xano Resources ───');
  console.log('');

  // Tables
  console.log('Creating tables...');
  const tables = readXsFiles(path.join(XANO_DIR, 'tables'));
  const tableOrder = ['sources', 'major_topic', 'minor_topic', 'articles', 'digest_log', 'blog_posts', 'user'];
  tables.sort((a, b) => {
    const ai = tableOrder.indexOf(a.name);
    const bi = tableOrder.indexOf(b.name);
    return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
  });

  for (const table of tables) {
    try {
      await xanoXsRequest(config, '/table', table.content);
      console.log(`  ✓ ${table.name}`);
    } catch (e: any) {
      if (e.message.includes('already exists')) {
        console.log(`  ⚠ ${table.name} (exists)`);
      } else {
        console.log(`  ✗ ${table.name}: ${e.message}`);
      }
    }
  }

  // API Group
  console.log('\nCreating API group...');
  let apiGroupId: number;
  let apiUrl: string;

  try {
    const response = await xanoRequest(config, '/apigroup');
    const groups = Array.isArray(response) ? response : (response.items || []);
    const existing = groups.find((g: any) => g.name === 'Tech News API');

    if (existing) {
      apiGroupId = existing.id;
      console.log(`  ⚠ Tech News API (exists)`);
    } else {
      const result = await xanoXsRequest(config, '/apigroup', `api_group "Tech News API" { swagger = {active: true} }`);
      apiGroupId = result.id;
      console.log(`  ✓ Tech News API`);
    }

    // Fetch the API group details to get the canonical hash Xano assigned
    const groupDetails = await xanoRequest(config, `/apigroup/${apiGroupId}`);

    if (!groupDetails.canonical) {
      throw new Error(`Could not determine API group canonical. Response: ${JSON.stringify(groupDetails)}`);
    }

    // Xano API URLs follow the format: {baseUrl}/api:{canonical}
    apiUrl = `${config.baseUrl}/api:${groupDetails.canonical}`;
    console.log(`  ✓ API URL: ${apiUrl}`);
  } catch (e: any) {
    throw new Error(`Failed to create API group: ${e.message}`);
  }

  // Functions (must be created before endpoints that reference them)
  console.log('\nCreating functions...');
  const functions = readXsFiles(path.join(XANO_DIR, 'functions'));
  for (const fn of functions) {
    try {
      await xanoXsRequest(config, '/function', fn.content);
      console.log(`  ✓ ${fn.name}`);
    } catch (e: any) {
      if (e.message.includes('already exists')) {
        console.log(`  ⚠ ${fn.name} (exists)`);
      } else {
        console.log(`  ✗ ${fn.name}: ${e.message}`);
      }
    }
  }

  // Endpoints
  console.log('\nCreating endpoints...');
  const endpoints = readXsFiles(path.join(XANO_DIR, 'endpoints'));
  for (const ep of endpoints) {
    try {
      await xanoXsRequest(config, `/apigroup/${apiGroupId}/api`, ep.content);
      console.log(`  ✓ ${ep.name}`);
    } catch (e: any) {
      if (e.message.includes('already exists')) {
        console.log(`  ⚠ ${ep.name} (exists)`);
      } else {
        console.log(`  ✗ ${ep.name}: ${e.message}`);
      }
    }
  }

  // Tools
  console.log('\nCreating AI tools...');
  const tools = readXsFiles(path.join(XANO_DIR, 'tools'));
  for (const tool of tools) {
    try {
      await xanoXsRequest(config, '/tool', tool.content);
      console.log(`  ✓ ${tool.name}`);
    } catch (e: any) {
      if (e.message.includes('already exists')) {
        console.log(`  ⚠ ${tool.name} (exists)`);
      } else {
        console.log(`  ✗ ${tool.name}: ${e.message}`);
      }
    }
  }

  // Agent (with dynamic AI config)
  console.log('\nCreating AI agent...');
  const agentXs = `agent "Blog Post Generator" {
  canonical = "blog_post_generator"
  llm = {
    type         : "${ai.xanoType}"
    system_prompt: "You are a tech blog writer. Use your tools to research topics and save blog posts."
    max_steps    : 15
    prompt       : ""
    api_key      : "{{ $env.AI_PROVIDER_API_KEY }}"
    model        : "${ai.model}"
    temperature  : 0.7
    reasoning    : true
    baseURL      : ""
    headers      : ""
  }
  tools = [
    {name: "get_articles_by_topic"}
    {name: "get_trending_topics"}
    {name: "get_recent_posts"}
    {name: "get_voices"}
    {name: "save_blog_post"}
  ]
}`;

  try {
    await xanoXsRequest(config, '/agent', agentXs);
    console.log(`  ✓ Blog Post Generator (${ai.name})`);
  } catch (e: any) {
    if (e.message.includes('already exists')) {
      console.log(`  ⚠ Blog Post Generator (exists)`);
    } else {
      console.log(`  ✗ Blog Post Generator: ${e.message}`);
    }
  }

  // Tasks
  console.log('\nCreating scheduled tasks...');
  const tasks = readXsFiles(path.join(XANO_DIR, 'tasks'));
  for (const task of tasks) {
    try {
      await xanoXsRequest(config, '/task', task.content);
      console.log(`  ✓ ${task.name}`);
    } catch (e: any) {
      if (e.message.includes('already exists')) {
        console.log(`  ⚠ ${task.name} (exists)`);
      } else {
        console.log(`  ✗ ${task.name}: ${e.message}`);
      }
    }
  }

  return apiUrl;
}

// ─────────────────────────────────────────────────────────────────────────────
// Create .env File
// ─────────────────────────────────────────────────────────────────────────────

function createEnvFile(config: SetupConfig): string {
  const envPath = path.join(__dirname, '..', '.env');

  const xanoApiKey = crypto.randomBytes(32).toString('base64url');

  const content = `# Tech News Aggregator Configuration
# Generated by setup wizard

# Xano Backend
XANO_API_URL=${config.apiUrl}
XANO_API_KEY=${xanoApiKey}
XANO_AUTH_TOKEN=${config.xano.apiKey}

# AI Provider: ${config.ai.name}
AI_PROVIDER=${config.ai.type}
${config.ai.envVar}=${config.ai.apiKey}

# Email Configuration
EMAIL_HOST=${config.email.host}
EMAIL_PORT=${config.email.port}
EMAIL_USER=${config.email.user}
EMAIL_PASSWORD=${config.email.password}
EMAIL_TO=${config.email.to}

# Scoring & Filtering
MIN_RELEVANCE_SCORE=7
DIGEST_LOOKBACK_DAYS=7

# Schedules (cron format)
SCRAPE_SCHEDULE=0 */2 * * *
DIGEST_MORNING_SCHEDULE=0 9 * * *
DIGEST_EVENING_SCHEDULE=0 18 * * *
XANO_SYNC_SCHEDULE=0 */6 * * *
`;

  // Check for existing .env
  if (fs.existsSync(envPath)) {
    const backup = `${envPath}.backup`;
    fs.copyFileSync(envPath, backup);
    console.log(`\n⚠ Existing .env backed up to .env.backup`);
  }

  fs.writeFileSync(envPath, content, 'utf-8');
  console.log('✓ Created .env file');
  return xanoApiKey;
}

// ─────────────────────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────────────────────

async function main() {
  printBanner();

  const proceed = (await prompt('Ready to begin? (Y/n)', 'y')).toLowerCase();
  if (proceed === 'n') {
    console.log('\nSetup cancelled.');
    process.exit(0);
  }

  // Step 1: Xano
  const xano = await configureXano();

  // Step 2: AI Provider
  const ai = await configureAI();

  // Step 3: Email
  const email = await configureEmail();

  // Create Xano resources
  const apiUrl = await createXanoResources(xano, ai);

  // Create .env file
  console.log('');
  console.log('─── Finalizing ───');
  console.log('');

  const setupConfig: SetupConfig = {
    xano,
    ai,
    email,
    apiUrl,
  };

  const xanoApiKey = createEnvFile(setupConfig);

  // Build and start with PM2
  console.log('');
  console.log('─── Building & Starting ───');
  console.log('');

  // Check if PM2 is installed
  try {
    execSync('pm2 --version', { stdio: 'ignore' });
    console.log('✓ PM2 found');
  } catch {
    console.log('Installing PM2...');
    try {
      execSync('npm install -g pm2', { stdio: 'inherit' });
      console.log('✓ PM2 installed');
    } catch (e: any) {
      console.log('⚠ Could not install PM2 globally. Trying npx instead...');
    }
  }

  // Build TypeScript
  console.log('\nBuilding project...');
  try {
    execSync('npm run build', { cwd: path.join(__dirname, '..'), stdio: 'inherit' });
    console.log('✓ Build complete');
  } catch (e: any) {
    console.log('⚠ Build failed:', e.message);
    console.log('  You can retry manually with: npm run build');
  }

  // Start with PM2
  console.log('\nStarting aggregator...');
  try {
    // Stop existing instance if running
    try { execSync('pm2 delete tech-news-aggregator', { stdio: 'ignore' }); } catch { }

    execSync('pm2 start dist/index.js --name tech-news-aggregator', {
      cwd: path.join(__dirname, '..'),
      stdio: 'inherit',
    });
    execSync('pm2 save', { stdio: 'ignore' });
    console.log('✓ Aggregator running in background');
  } catch (e: any) {
    console.log('⚠ Could not start with PM2:', e.message);
    console.log('  You can start manually with: pm2 start dist/index.js --name tech-news-aggregator');
  }

  // Platform scheduling (wake from sleep)
  console.log('');
  console.log('─── Platform Scheduling ───');
  console.log('');

  const platform = process.platform;

  if (platform === 'win32') {
    console.log('Detected: Windows');
    try {
      execSync('powershell -ExecutionPolicy Bypass -File "./setup-task.ps1"', {
        cwd: path.join(__dirname, '..'), stdio: 'inherit',
      });
      execSync('powershell -ExecutionPolicy Bypass -File "./setup-9am-digest-task.ps1"', {
        cwd: path.join(__dirname, '..'), stdio: 'inherit',
      });
      console.log('✓ Windows wake-from-sleep tasks created');
    } catch (e: any) {
      console.log(`⚠ Windows task setup failed: ${e.message}`);
      console.log('  Run manually: powershell -File setup-9am-digest-task.ps1');
    }
  } else if (platform === 'darwin') {
    console.log('Detected: macOS');
    try {
      execSync('bash "./setup-mac-tasks.sh"', {
        cwd: path.join(__dirname, '..'), stdio: 'inherit',
      });
      console.log('✓ macOS wake-from-sleep configured');
    } catch (e: any) {
      console.log(`⚠ macOS setup failed: ${e.message}`);
      console.log('  Run manually: bash setup-mac-tasks.sh');
    }
  } else {
    console.log(`Detected: ${platform}`);
    console.log('⚠ Wake-from-sleep is only supported on Windows and macOS.');
    console.log('  On Linux, use: pm2 startup');
  }

  // Done!
  console.log('');
  console.log('╔════════════════════════════════════════════════════════════════╗');
  console.log('║                                                                ║');
  console.log('║                    Setup Complete!                             ║');
  console.log('║                                                                ║');
  console.log('╚════════════════════════════════════════════════════════════════╝');
  console.log('');
  console.log('Your Tech News Aggregator is running!');
  console.log('');
  console.log('IMPORTANT - Two manual steps required in Xano:');
  console.log('  Go to Xano > Your Workspace > Settings > Environment Variables');
  console.log('');
  console.log('  1. Add endpoint auth key:');
  console.log('     Name  = API_KEY');
  console.log(`     Value = ${xanoApiKey}`);
  console.log('');
  console.log(`  2. Add AI provider key for the agent:`);
  console.log('     Name  = AI_PROVIDER_API_KEY');
  console.log(`     Value = ${setupConfig.ai.apiKey}`);
  console.log('');
  console.log('Useful commands:');
  console.log('  pm2 logs tech-news-aggregator   # View live output');
  console.log('  pm2 status                      # Check status');
  console.log('  pm2 restart tech-news-aggregator');
  console.log('');
}

main().catch((error) => {
  console.error('\n✗ Setup failed:', error.message);
  process.exit(1);
});
