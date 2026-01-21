/**
 * Check Rate Limit Status
 *
 * This script attempts to check the current rate limit status
 * for email changes by making a test call to Supabase auth.
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials in .env.local');
  console.error('   Need: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkRateLimit() {
  console.log('\n🔍 Checking Email Change Rate Limit Status...\n');

  // Get current user (you need to be logged in)
  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError || !user) {
    console.error('❌ Not logged in or unable to get user');
    console.error('   Please log in to the application first');
    process.exit(1);
  }

  console.log(`✅ Logged in as: ${user.email}`);
  console.log(`   User ID: ${user.id}\n`);

  // Check if there's a pending email change
  const { data: authUser } = await supabase.auth.admin.getUserById(user.id);

  if (authUser?.user) {
    console.log('📧 Email Status:');
    console.log(`   Current Email: ${authUser.user.email}`);
    console.log(`   Email Confirmed: ${authUser.user.email_confirmed_at ? '✅ Yes' : '❌ No'}`);

    if (authUser.user.new_email) {
      console.log(`   Pending New Email: ${authUser.user.new_email}`);
    }

    if (authUser.user.email_change_sent_at) {
      const sentAt = new Date(authUser.user.email_change_sent_at);
      const now = new Date();
      const hoursSince = Math.floor((now - sentAt) / (1000 * 60 * 60));
      const minutesSince = Math.floor((now - sentAt) / (1000 * 60));

      console.log(`\n⏰ Last Email Change Request:`);
      console.log(`   Sent At: ${sentAt.toLocaleString()}`);
      console.log(`   Time Since: ${hoursSince}h ${minutesSince % 60}m ago`);

      if (hoursSince < 1) {
        console.log(`\n⚠️  You're likely still in the rate limit window`);
        console.log(`   Recommendation: Wait ${60 - minutesSince} more minutes`);
      } else if (hoursSince < 24) {
        console.log(`\n⚠️  Rate limit may still be active (up to 24h)`);
        console.log(`   Recommendation: Try again or wait longer`);
      } else {
        console.log(`\n✅ Rate limit should be cleared by now`);
        console.log(`   You can try changing email again`);
      }
    } else {
      console.log(`\n✅ No recent email change attempts detected`);
      console.log(`   You should be able to change email now`);
    }
  }

  console.log('\n');
}

checkRateLimit().catch(console.error);
