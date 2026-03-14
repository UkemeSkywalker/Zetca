/**
 * Verification Script: Authentication and User Isolation
 * 
 * This script tests:
 * 1. User A can generate and see their own strategies
 * 2. User B cannot see User A's strategies
 * 3. User B can generate and see only their own strategies
 * 4. Cross-user access returns 403
 */

const PYTHON_API_URL = 'http://localhost:8000';
const NEXTJS_API_URL = 'http://localhost:3000';

interface StrategyInput {
  brandName: string;
  industry: string;
  targetAudience: string;
  goals: string;
}

interface User {
  email: string;
  password: string;
  name: string;
  company: string;
}

// Test users
const userA: User = {
  email: `test-user-a-${Date.now()}@example.com`,
  password: 'TestPassword123!',
  name: 'Test User A',
  company: 'Company A'
};

const userB: User = {
  email: `test-user-b-${Date.now()}@example.com`,
  password: 'TestPassword123!',
  name: 'Test User B',
  company: 'Company B'
};

// Strategy inputs
const strategyA: StrategyInput = {
  brandName: 'TechCorp A',
  industry: 'SaaS',
  targetAudience: 'B2B decision makers',
  goals: 'Increase brand awareness'
};

const strategyB: StrategyInput = {
  brandName: 'RetailCo B',
  industry: 'E-commerce',
  targetAudience: 'Young professionals',
  goals: 'Drive online sales'
};

async function signupUser(user: User): Promise<string> {
  console.log(`\n📝 Signing up ${user.name}...`);
  
  const response = await fetch(`${NEXTJS_API_URL}/api/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(user)
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Signup failed: ${error}`);
  }

  const data = await response.json();
  console.log(`✅ ${user.name} signed up successfully`);
  return data.token;
}

async function loginUser(email: string, password: string): Promise<string> {
  console.log(`\n🔐 Logging in ${email}...`);
  
  const response = await fetch(`${NEXTJS_API_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Login failed: ${error}`);
  }

  const data = await response.json();
  console.log(`✅ Logged in successfully`);
  return data.token;
}

async function generateStrategy(input: StrategyInput, token: string): Promise<any> {
  console.log(`\n🤖 Generating strategy for ${input.brandName}...`);
  
  const response = await fetch(`${PYTHON_API_URL}/api/strategy/generate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      brand_name: input.brandName,
      industry: input.industry,
      target_audience: input.targetAudience,
      goals: input.goals
    })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Strategy generation failed: ${error}`);
  }

  const data = await response.json();
  console.log(`✅ Strategy generated (ID: ${data.id})`);
  return data;
}

async function listStrategies(token: string): Promise<any[]> {
  console.log(`\n📋 Fetching strategy list...`);
  
  const response = await fetch(`${PYTHON_API_URL}/api/strategy/list`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`List strategies failed: ${error}`);
  }

  const data = await response.json();
  console.log(`✅ Found ${data.length} strategies`);
  return data;
}

async function getStrategy(strategyId: string, token: string): Promise<any> {
  console.log(`\n🔍 Fetching strategy ${strategyId}...`);
  
  const response = await fetch(`${PYTHON_API_URL}/api/strategy/${strategyId}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  return { status: response.status, data: response.ok ? await response.json() : null };
}

async function runVerification() {
  console.log('🚀 Starting Authentication & User Isolation Verification\n');
  console.log('=' .repeat(60));

  try {
    // Step 1: Sign up User A
    console.log('\n📍 STEP 1: Sign up User A');
    const tokenA = await signupUser(userA);

    // Step 2: User A generates a strategy
    console.log('\n📍 STEP 2: User A generates a strategy');
    const strategyARecord = await generateStrategy(strategyA, tokenA);

    // Step 3: Verify User A sees their strategy
    console.log('\n📍 STEP 3: Verify User A sees their strategy');
    const userAStrategies = await listStrategies(tokenA);
    
    if (userAStrategies.length !== 1) {
      throw new Error(`Expected 1 strategy for User A, got ${userAStrategies.length}`);
    }
    
    if (userAStrategies[0].id !== strategyARecord.id) {
      throw new Error('User A strategy ID mismatch');
    }
    
    console.log('✅ User A can see their own strategy');

    // Step 4: Sign up User B
    console.log('\n📍 STEP 4: Sign up User B');
    const tokenB = await signupUser(userB);

    // Step 5: Verify User B sees empty list
    console.log('\n📍 STEP 5: Verify User B sees empty list (not User A\'s strategies)');
    const userBStrategiesInitial = await listStrategies(tokenB);
    
    if (userBStrategiesInitial.length !== 0) {
      throw new Error(`Expected 0 strategies for User B, got ${userBStrategiesInitial.length}`);
    }
    
    console.log('✅ User B cannot see User A\'s strategies');

    // Step 6: Verify User B cannot access User A's strategy by ID (403)
    console.log('\n📍 STEP 6: Verify User B cannot access User A\'s strategy by ID');
    const crossUserAccess = await getStrategy(strategyARecord.id, tokenB);
    
    if (crossUserAccess.status !== 403 && crossUserAccess.status !== 404) {
      throw new Error(`Expected 403 or 404 for cross-user access, got ${crossUserAccess.status}`);
    }
    
    console.log('✅ Cross-user access properly blocked (403/404)');

    // Step 7: User B generates their own strategy
    console.log('\n📍 STEP 7: User B generates their own strategy');
    const strategyBRecord = await generateStrategy(strategyB, tokenB);

    // Step 8: Verify User B sees only their own strategy
    console.log('\n📍 STEP 8: Verify User B sees only their own strategy');
    const userBStrategiesFinal = await listStrategies(tokenB);
    
    if (userBStrategiesFinal.length !== 1) {
      throw new Error(`Expected 1 strategy for User B, got ${userBStrategiesFinal.length}`);
    }
    
    if (userBStrategiesFinal[0].id !== strategyBRecord.id) {
      throw new Error('User B strategy ID mismatch');
    }
    
    console.log('✅ User B can see only their own strategy');

    // Step 9: Verify User A still sees only their strategy
    console.log('\n📍 STEP 9: Verify User A still sees only their strategy');
    const userAStrategiesFinal = await listStrategies(tokenA);
    
    if (userAStrategiesFinal.length !== 1) {
      throw new Error(`Expected 1 strategy for User A, got ${userAStrategiesFinal.length}`);
    }
    
    if (userAStrategiesFinal[0].id !== strategyARecord.id) {
      throw new Error('User A strategy changed unexpectedly');
    }
    
    console.log('✅ User A still sees only their own strategy');

    // Success!
    console.log('\n' + '='.repeat(60));
    console.log('🎉 ALL VERIFICATION CHECKS PASSED!');
    console.log('='.repeat(60));
    console.log('\n✅ User isolation works correctly');
    console.log('✅ Authentication is properly enforced');
    console.log('✅ Cross-user access is blocked');
    console.log('✅ Each user sees only their own strategies');

  } catch (error) {
    console.error('\n' + '='.repeat(60));
    console.error('❌ VERIFICATION FAILED');
    console.error('='.repeat(60));
    console.error('\nError:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

// Run verification
runVerification();
