// Debug authentication helper
export const debugAuth = async () => {
  console.log('🔍 Debug Authentication Status');
  
  // Check cookies
  console.log('🍪 All cookies:', document.cookie);
  
  // Check session token from cookies
  const cookies = document.cookie.split(';');
  const sessionToken = cookies.find(cookie => cookie.trim().startsWith('l4_session='));
  console.log('🔑 Session token:', sessionToken ? 'Found' : 'Not found');
  
  // Check session API
  try {
    console.log('🌐 Testing Express backend /auth/me endpoint...');
    const { apiFetch } = await import('./api');
    const response = await apiFetch('/auth/me');
    
    const data = await response.json();
    console.log('✅ Auth API success:', data);
    return data;
  } catch (error) {
    console.error('🚨 Auth API error:', error);
    return null;
  }
};

// Create a test session for debugging
export const createTestSession = async () => {
  console.log('🧪 Creating test session...');
  
  try {
    // Create a test login via Express backend
    const testWallet = 'TEST_WALLET_' + Date.now();
    const { apiFetch } = await import('./api');
    const response = await apiFetch('/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        walletAddress: testWallet,
        signature: 'test_signature',
        nonce: 'test_nonce_' + Math.random().toString(36).substr(2, 9)
      })
    });
    
    const data = await response.json();
    console.log('✅ Test session created:', data);
    return data;
  } catch (error) {
    console.error('🚨 Test session error:', error);
    return null;
  }
};

// Test WebSocket connection manually
export const debugWebSocket = (token: string) => {
  console.log('🔧 Manual WebSocket test');
  
  const wsUrl = `ws://localhost:3001?token=${encodeURIComponent(token)}`;
  console.log('🌐 Testing URL:', wsUrl);
  
  const ws = new WebSocket(wsUrl);
  
  ws.onopen = () => {
    console.log('✅ Manual WebSocket connected!');
    ws.close();
  };
  
  ws.onclose = (event) => {
    console.log('❌ Manual WebSocket closed:', {
      code: event.code,
      reason: event.reason,
      wasClean: event.wasClean
    });
  };
  
  ws.onerror = (error) => {
    console.error('🚨 Manual WebSocket error:', error);
  };
  
  return ws;
};

// Quick wallet connection helper
export const quickWalletConnect = async () => {
  console.log('🔗 Attempting quick wallet connection...');
  
  try {
    // Check if wallet is available
    if (typeof window === 'undefined' || !window.solana) {
      console.log('❌ Solana wallet not found. Please install Phantom or another Solana wallet.');
      return false;
    }
    
    // Connect to wallet
    const response = await window.solana.connect();
    console.log('👛 Wallet connected:', response.publicKey.toString());
    
    // Trigger login flow
    const walletAddress = response.publicKey.toString();
    const { apiFetch } = await import('./api');
    
    // Get nonce
    const nonceRes = await apiFetch('/auth/nonce', {
      method: 'POST',
      body: JSON.stringify({ walletAddress })
    });
    const { nonce } = await nonceRes.json();
    
    // Sign message
    const message = `Layer4 login\n${nonce}`;
    const encoded = new TextEncoder().encode(message);
    const signature = await window.solana.signMessage(encoded, 'utf8');
    const bs58 = await import('bs58');
    const signatureBase58 = bs58.default.encode(signature.signature);
    
    // Login
    const loginRes = await apiFetch('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ walletAddress, signature: signatureBase58, nonce })
    });
    
    const loginData = await loginRes.json();
    console.log('✅ Login successful:', loginData);
    
    return loginData;
  } catch (error) {
    console.error('❌ Wallet connection failed:', error);
    return false;
  }
};
