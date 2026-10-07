/**
 * Create (or reuse) a local test user for UI checks.
 *
 * Signs up the test account against the running Next.js dev server. If the
 * account already exists, logs in instead to confirm the credentials work.
 *
 * Usage:
 *   node scripts/create-test-user.mjs
 *
 * Override defaults with TEST_USER_NAME / TEST_USER_EMAIL / TEST_USER_PASSWORD
 * and BASE_URL.
 *
 * Prerequisites:
 * - Next.js dev server running (npm run dev)
 * - Users DynamoDB table provisioned
 */

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

const TEST_USER = {
  name: process.env.TEST_USER_NAME || 'Alex Vance',
  email: process.env.TEST_USER_EMAIL || 'test.dashboard@zetca.test',
  password: process.env.TEST_USER_PASSWORD || 'ZetcaTest!2026',
  bio: process.env.TEST_USER_BIO || 'Head of Growth',
};

async function request(method, path, body, token) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}

async function main() {
  console.log(`Creating test user ${TEST_USER.email} at ${BASE_URL}...`);

  const { name, email, password } = TEST_USER;
  const signup = await request('POST', '/api/auth/signup', { name, email, password });
  if (signup.status === 200 || signup.status === 201) {
    console.log('✅ Test user created.');
  } else if (signup.status === 409) {
    console.log('ℹ️  Test user already exists, verifying login...');
  } else {
    console.error(`❌ Signup failed (${signup.status}):`, signup.data);
    process.exit(1);
  }

  const login = await request('POST', '/api/auth/login', { email, password });
  if (login.status !== 200) {
    console.error(`❌ Login failed (${login.status}):`, login.data);
    process.exit(1);
  }

  console.log('✅ Login works.');

  // The dashboard header shows the bio as the user's role line
  const profile = await request('PUT', '/api/profile', { bio: TEST_USER.bio }, login.data.token);
  if (profile.status !== 200) {
    console.error(`❌ Profile update failed (${profile.status}):`, profile.data);
    process.exit(1);
  }
  console.log(`✅ Bio set to "${TEST_USER.bio}". Sign in at`, `${BASE_URL}/login`);
}

main().catch((err) => {
  console.error('❌ Could not reach the dev server:', err.message);
  process.exit(1);
});
