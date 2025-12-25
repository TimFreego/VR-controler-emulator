import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Visualizer } from './components/Visualizer';
import { ConnectionPanel } from './components/ConnectionPanel';
import { PhysicsEngine } from './utils/physics';
import { ControllerState, SensorPacket } from './types';

const App: React.FC = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [statusLog, setStatusLog] = useState<string[]>([]);
  const wsRef = useRef<WebSocket | null>(null);
  
  // Physics engine instance (persists across renders)
  const physicsEngine = useRef(new PhysicsEngine());
  
  // Mutable ref for the visualizer to read without re-rendering React components constantly
  const physicsState = useRef<ControllerState>(physicsEngine.current.getState());

  const addLog = (msg: string) => {
    setStatusLog(prev => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev.slice(0, 19)]);
  };

  const handleConnect = useCallback((ip: string) => {
    if (!ip) {
      addLog("Error: Please enter an IP address.");
      return;
    }

    try {
      addLog(`Attempting to connect to ws://${ip}:8080...`);
      const ws = new WebSocket(`ws://${ip}:8080`);

      ws.onopen = () => {
        setIsConnected(true);
        addLog("WebSocket Connected!");
        physicsEngine.current.reset();
      };

      ws.onmessage = (event) => {
        try {
          const data: SensorPacket = JSON.parse(event.data);
          
          // Debug first packet logic handled on server, but we can log non-sensor messages
          if ((data as any).type === 'info') {
            addLog(`Phone: ${(data as any).msg}`);
            return;
          }

          // Extract Data
          const accelData = data["Motion Accel"]?.values;
          const gyroData = data["Pseudo Gyro"]?.values;

          if (accelData && gyroData) {
            // Update Physics
            physicsEngine.current.update(accelData, gyroData, performance.now());
            // Update Ref for visualizer
            physicsState.current = physicsEngine.current.getState();
          }
        } catch (e) {
          console.error("Parse Error", e);
        }
      };

      ws.onerror = (e) => {
        addLog("WebSocket Error. Check IP or Network.");
        console.error(e);
      };

      ws.onclose = () => {
        setIsConnected(false);
        addLog("Disconnected.");
        wsRef.current = null;
      };

      wsRef.current = ws;
    } catch (e) {
      addLog(`Connection failed: ${e}`);
    }
  }, []);

  const handleDisconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
    }
  }, []);

  const handleReset = useCallback(() => {
    physicsEngine.current.reset();
    addLog("Position/Rotation Reset.");
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (wsRef.current) wsRef.current.close();
    };
  }, []);

  return (
    <div className="relative w-screen h-screen bg-black">
      <ConnectionPanel 
        onConnect={handleConnect} 
        onDisconnect={handleDisconnect}
        onReset={handleReset}
        isConnected={isConnected}
        statusLog={statusLog}
      />
      
      {/* 3D Scene */}
      <Visualizer physicsState={physicsState} />
      
      {/* Helper text overlay */}
      <div className="absolute bottom-4 right-4 text-slate-500 text-xs text-right font-mono pointer-events-none">
        VR Sensor Emulator v1.0<br/>
        React + Three.js + Termux
      </div>
    </div>
  );
};

export default App;