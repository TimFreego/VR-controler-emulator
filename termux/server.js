// server.js - Run this on your Android phone in Termux
const WebSocket = require('ws');
const { spawn } = require('child_process');
const os = require('os');

// 1. Find Local IP
const interfaces = os.networkInterfaces();
let localIP = 'Not Found';
Object.keys(interfaces).forEach((ifname) => {
  interfaces[ifname].forEach((iface) => {
    if (iface.family === 'IPv4' && !iface.internal) {
      if (iface.address.startsWith('192')) {
        localIP = iface.address;
      }
    }
  });
});

console.log('================================================');
console.log(' VR CONTROLLER EMULATOR - MOBILE SERVER ');
console.log('================================================');
console.log(`YOUR IP ADDRESS: \x1b[32m${localIP}\x1b[0m`);
console.log('Enter this IP in the PC application.');
console.log('================================================');

// 2. Start WebSocket Server
const wss = new WebSocket.Server({ port: 8080 });

wss.on('connection', ws => {
  console.log('Client connected!');
  ws.send(JSON.stringify({ type: 'info', msg: 'Connected to Phone' }));

  ws.on('close', () => {
    console.log('Client disconnected');
  });
});

console.log('WebSocket Server started on port 8080');

// 3. Start Sensors
// Using specific sensors requested: Motion Accel and Pseudo Gyro
const sensorCmd = 'termux-sensor';
const args = ['-s', 'Motion Accel,Pseudo Gyro']; 

console.log(`Spawning sensor process: ${sensorCmd} ${args.join(' ')}`);

const sensorProcess = spawn(sensorCmd, args);

let buffer = '';

sensorProcess.stdout.on('data', (data) => {
  buffer += data.toString();

  // Robust JSON parsing: Split by newlines or closing braces followed by opening braces
  // termux-sensor output format is typically a stream of JSON objects.
  // Sometimes they arrive chunked together like "{...}\n{...}"
  
  let boundaryIndex;
  while ((boundaryIndex = buffer.indexOf('}\n{')) !== -1 || (boundaryIndex = buffer.indexOf('}{')) !== -1) {
    // If we find '}{', strict JSON implies they should be separated.
    // termux-sensor usually adds newlines.
    
    // Calculate split point. If '}\n{', split at index+1. If '}{', split at index+1.
    const splitPoint = buffer.indexOf('}\n{') !== -1 ? buffer.indexOf('}\n{') + 1 : buffer.indexOf('}{') + 1;
    
    const jsonStr = buffer.slice(0, splitPoint).trim();
    buffer = buffer.slice(splitPoint).trim(); // Keep the rest (including the leading '{')

    tryParseAndSend(jsonStr);
  }

  // Handle single lingering complete JSON if buffer is clean
  // (Less likely in stream, but good for safety)
  // Simple heuristic: If buffer ends with '}' and has '{', try to parse.
  if (buffer.trim().endsWith('}')) {
      // Try to parse the whole buffer if it looks complete
      try {
          JSON.parse(buffer);
          tryParseAndSend(buffer);
          buffer = '';
      } catch (e) {
          // Not complete yet, wait for more data
      }
  }
});

function tryParseAndSend(jsonStr) {
    try {
        // Clean up any potential garbage whitespace
        const cleanStr = jsonStr.trim();
        if (!cleanStr) return;
        
        const data = JSON.parse(cleanStr);
        
        // Log once to prove it works (Requested feature)
        if (!global.hasLoggedOnce) {
            console.log('Sample Data Received:', JSON.stringify(data, null, 2));
            global.hasLoggedOnce = true;
        }

        // Broadcast to all connected clients
        const msg = JSON.stringify(data);
        wss.clients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(msg);
            }
        });
    } catch (e) {
        // Partial JSON errors are expected in streams, ignore them until full packet arrives
    }
}

sensorProcess.stderr.on('data', (data) => {
  console.error(`Sensor Error: ${data}`);
});

sensorProcess.on('close', (code) => {
  console.log(`Sensor process exited with code ${code}`);
});

// Cleanup on exit
process.on('SIGINT', () => {
    console.log("Cleaning up...");
    sensorProcess.kill();
    process.exit();
});
