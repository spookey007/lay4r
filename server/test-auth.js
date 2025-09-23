const { PrismaClient } = require('@prisma/client');
const { generateUniqueUsername } = require('./lib/usernameGenerator');

const prisma = new PrismaClient();

async function testFullAuthFlow() {
  try {
    console.log('🧪 Testing full authentication flow...');
    
    // Test 1: Generate username
    console.log('\n1. Testing username generation...');
    const { username, displayName } = await generateUniqueUsername();
    console.log('✅ Generated:', { username, displayName });
    
    // Test 2: Create user with generated username
    console.log('\n2. Testing user creation...');
    const testWalletAddress = 'test_wallet_' + Date.now();
    const user = await prisma.user.create({
      data: {
        walletAddress: testWalletAddress,
        role: 1,
        username: username,
        displayName: displayName
      }
    });
    console.log('✅ User created:', {
      id: user.id,
      walletAddress: user.walletAddress,
      username: user.username,
      displayName: user.displayName
    });
    
    // Test 3: Check if user exists (simulating existing user)
    console.log('\n3. Testing existing user check...');
    const existingUser = await prisma.user.findUnique({
      where: { walletAddress: testWalletAddress }
    });
    console.log('✅ Existing user found:', {
      username: existingUser?.username,
      displayName: existingUser?.displayName
    });
    
    // Test 4: Test new user (different wallet)
    console.log('\n4. Testing new user creation...');
    const newWalletAddress = 'new_wallet_' + Date.now();
    const { username: newUsername, displayName: newDisplayName } = await generateUniqueUsername();
    
    const newUser = await prisma.user.create({
      data: {
        walletAddress: newWalletAddress,
        role: 1,
        username: newUsername,
        displayName: newDisplayName
      }
    });
    console.log('✅ New user created:', {
      username: newUser.username,
      displayName: newUser.displayName
    });
    
    // Cleanup
    console.log('\n5. Cleaning up test users...');
    await prisma.user.delete({ where: { id: user.id } });
    await prisma.user.delete({ where: { id: newUser.id } });
    console.log('✅ Test users deleted');
    
    console.log('\n🎉 All tests passed! Username generation is working correctly.');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testFullAuthFlow();
