const http = require('http');

function request(options, data) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.setEncoding('utf8');
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          resolve({ status: res.statusCode, body: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, body: body });
        }
      });
    });
    req.on('error', (err) => reject(err));
    if (data) req.write(data);
    req.end();
  });
}

(async () => {
  try {
    const registerData = JSON.stringify({
      email: 'test+agent@example.com',
      phone: '0000000000',
      password: 'TestPass123!'
    });

    console.log('Registering test user...');
    const reg = await request({
      hostname: 'localhost',
      port: 5001,
      path: '/api/v1/auth/register',
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(registerData) }
    }, registerData);

    console.log('Register response:', reg.status, reg.body);

    // Try login
    const loginData = JSON.stringify({ email: 'test+agent@example.com', password: 'TestPass123!' });
    console.log('Logging in...');
    const login = await request({
      hostname: 'localhost',
      port: 5001,
      path: '/api/v1/auth/login',
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(loginData) }
    }, loginData);

    console.log('Login response:', login.status, login.body);

    const token = login.body && (login.body.token || login.body.token);
    if (!token && login.status === 200 && login.body && login.body.token) {
      console.log('Token found in login response');
    }

    const authToken = login.body && (login.body.token || (login.body.token === undefined ? null : login.body.token));

    // If token not found, try to extract token property
    let finalToken = null;
    if (login.body && login.body.token) finalToken = login.body.token;
    if (!finalToken && reg.body && reg.body.token) finalToken = reg.body.token;

    if (!finalToken) {
      console.error('No token received; aborting AI test');
      process.exit(1);
    }

    console.log('Using token:', finalToken.substring(0, 20) + '...');

    const messageData = JSON.stringify({ message: 'Hello AI, are you working?' });
    console.log('Sending AI message...');
    const ai = await request({
      hostname: 'localhost',
      port: 5001,
      path: '/api/ai-chat/message',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(messageData),
        'Authorization': 'Bearer ' + finalToken
      }
    }, messageData);

    console.log('AI response:', ai.status, ai.body);

  } catch (err) {
    console.error('Error during test:', err);
    process.exit(1);
  }
})();
