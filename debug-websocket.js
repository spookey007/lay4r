// WebSocket Connection Debug Script
// Run this in your browser console on demo.lay4r.io

const testWebSocketConnection = () => {
  console.log('🔍 Testing WebSocket connection...');
  
  // Test 1: Check environment variables
  console.log('📋 Environment Check:');
  console.log('NEXT_PUBLIC_SOCKET_URL:', process.env.NEXT_PUBLIC_SOCKET_URL || 'NOT SET');
  console.log('NODE_ENV:', process.env.NODE_ENV || 'NOT SET');
  
  // Test 2: Test WebSocket connection
  const token = '555a1474a00c77977379d497ba3cdbdaf932d2f2a6ce8b3ae168372ead15cb9b';
  const wsUrl = `wss://demo.lay4r.io/?token=${encodeURIComponent(token)}`;
  
  console.log('🌐 Testing WebSocket URL:', wsUrl);
  
  const ws = new WebSocket(wsUrl);
  
  ws.onopen = () => {
    console.log('✅ WebSocket connection opened successfully!');
    console.log('📊 Connection details:', {
      readyState: ws.readyState,
      url: ws.url,
      protocol: ws.protocol
    });
    
    // Send a ping to test the connection
    const pingMessage = new TextEncoder().encode(JSON.stringify(['PING', {}, Date.now()]));
    ws.send(pingMessage);
    console.log('📤 Sent PING message');
  };
  
  ws.onmessage = (event) => {
    console.log('📥 Received message:', event.data);
    try {
      const data = JSON.parse(event.data);
      console.log('📦 Parsed message:', data);
    } catch (e) {
      console.log('⚠️ Message is not JSON, raw data:', event.data);
    }
  };
  
  ws.onerror = (error) => {
    console.error('❌ WebSocket error:', error);
    console.error('🔍 Error details:', {
      type: error.type,
      target: error.target,
      currentTarget: error.currentTarget
    });
  };
  
  ws.onclose = (event) => {
    console.log('🔌 WebSocket closed:', {
      code: event.code,
      reason: event.reason,
      wasClean: event.wasClean
    });
    
    // Common close codes and their meanings
    const closeCodeMeanings = {
      1000: 'Normal closure',
      1001: 'Going away',
      1002: 'Protocol error',
      1003: 'Unsupported data',
      1006: 'Abnormal closure',
      1008: 'Policy violation',
      1011: 'Server error',
      1015: 'TLS handshake failure'
    };
    
    console.log('📖 Close code meaning:', closeCodeMeanings[event.code] || 'Unknown');
  };
  
  // Test timeout
  setTimeout(() => {
    if (ws.readyState === WebSocket.CONNECTING) {
      console.log('⏰ Connection timeout - still connecting after 10 seconds');
      ws.close();
    }
  }, 10000);
};

// Test 3: Check server health
const testServerHealth = async () => {
  console.log('🏥 Testing server health...');
  try {
    const response = await fetch('https://demo.lay4r.io/api/health');
    const data = await response.json();
    console.log('✅ Server health check:', data);
  } catch (error) {
    console.error('❌ Server health check failed:', error);
  }
};

// Test 4: Check CORS and network
const testNetwork = async () => {
  console.log('🌐 Testing network connectivity...');
  try {
    const response = await fetch('https://demo.lay4r.io/api/health', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include'
    });
    console.log('✅ Network test successful:', response.status);
  } catch (error) {
    console.error('❌ Network test failed:', error);
  }
};

// Run all tests
console.log('🚀 Starting WebSocket debugging...');
testServerHealth();
testNetwork();
testWebSocketConnection();
