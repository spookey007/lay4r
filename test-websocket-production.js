// Test WebSocket connection in production
// Run this in your browser console on demo.lay4r.io

console.log('🔍 Production WebSocket Debug Test');

// Test 1: Check environment variables
console.log('📋 Environment Variables:');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('NEXT_PUBLIC_SOCKET_URL:', process.env.NEXT_PUBLIC_SOCKET_URL);

// Test 2: Check if config is loaded correctly
try {
  // This will only work if the config is available
  console.log('📦 Config check:');
  console.log('window.location.origin:', window.location.origin);
  console.log('window.location.hostname:', window.location.hostname);
  console.log('window.location.protocol:', window.location.protocol);
} catch (e) {
  console.log('⚠️ Config not available in console context');
}

// Test 3: Manual WebSocket test
const testWebSocket = () => {
  const token = '555a1474a00c77977379d497ba3cdbdaf932d2f2a6ce8b3ae168372ead15cb9b';
  
  // Try different WebSocket URLs
  const urls = [
    `wss://demo.lay4r.io/?token=${encodeURIComponent(token)}`,
    `ws://demo.lay4r.io/?token=${encodeURIComponent(token)}`,
    `wss://${window.location.hostname}/?token=${encodeURIComponent(token)}`,
    `ws://${window.location.hostname}/?token=${encodeURIComponent(token)}`
  ];
  
  urls.forEach((url, index) => {
    console.log(`\n🧪 Test ${index + 1}: ${url}`);
    
    const ws = new WebSocket(url);
    
    ws.onopen = () => {
      console.log(`✅ Test ${index + 1} - Connection opened!`);
      ws.close();
    };
    
    ws.onerror = (error) => {
      console.log(`❌ Test ${index + 1} - Error:`, error);
    };
    
    ws.onclose = (event) => {
      console.log(`🔌 Test ${index + 1} - Closed:`, {
        code: event.code,
        reason: event.reason,
        wasClean: event.wasClean
      });
    };
    
    // Timeout after 5 seconds
    setTimeout(() => {
      if (ws.readyState === WebSocket.CONNECTING) {
        console.log(`⏰ Test ${index + 1} - Timeout`);
        ws.close();
      }
    }, 5000);
  });
};

// Test 4: Check if the app is trying to connect
console.log('\n🔍 Checking for WebSocket connection attempts...');
const originalConsoleLog = console.log;
let websocketLogs = [];

console.log = (...args) => {
  if (args.some(arg => typeof arg === 'string' && arg.includes('WEBSOCKET'))) {
    websocketLogs.push(args);
  }
  originalConsoleLog.apply(console, args);
};

// Wait a bit and then check logs
setTimeout(() => {
  console.log = originalConsoleLog;
  console.log('\n📊 WebSocket logs found:', websocketLogs.length);
  websocketLogs.forEach((log, index) => {
    console.log(`Log ${index + 1}:`, ...log);
  });
  
  if (websocketLogs.length === 0) {
    console.log('⚠️ No WebSocket connection attempts detected. The app might not be trying to connect.');
  }
}, 3000);

// Run the tests
testWebSocket();
