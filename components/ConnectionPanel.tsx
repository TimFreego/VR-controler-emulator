import React, { useState } from 'react';

interface ConnectionPanelProps {
  onConnect: (ip: string) => void;
  onDisconnect: () => void;
  onReset: () => void;
  isConnected: boolean;
  statusLog: string[];
}

export const ConnectionPanel: React.FC<ConnectionPanelProps> = ({ 
  onConnect, 
  onDisconnect, 
  onReset, 
  isConnected,
  statusLog 
}) => {
  const [ipAddress, setIpAddress] = useState('192.168.0.');

  return (
    <div className="absolute top-4 left-4 w-80 bg-slate-800/90 backdrop-blur-md p-6 rounded-xl border border-slate-600 shadow-xl z-10 text-slate-200">
      <h2 className="text-xl font-bold mb-4 text-cyan-400">VR Controller Link</h2>
      
      <div className="flex flex-col gap-4">
        {!isConnected ? (
          <>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-slate-400 uppercase tracking-wider">Phone IP Address</label>
              <input 
                type="text" 
                value={ipAddress}
                onChange={(e) => setIpAddress(e.target.value)}
                placeholder="192.168.x.x"
                className="bg-slate-900 border border-slate-600 rounded p-2 text-white focus:border-cyan-500 focus:outline-none font-mono"
              />
            </div>
            <button 
              onClick={() => onConnect(ipAddress)}
              className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-2 px-4 rounded transition-colors"
            >
              Connect
            </button>
          </>
        ) : (
          <>
            <div className="flex gap-2">
              <button 
                onClick={onReset}
                className="flex-1 bg-yellow-600 hover:bg-yellow-500 text-white font-bold py-2 px-4 rounded transition-colors"
              >
                Reset Position
              </button>
              <button 
                onClick={onDisconnect}
                className="flex-1 bg-red-600 hover:bg-red-500 text-white font-bold py-2 px-4 rounded transition-colors"
              >
                Disconnect
              </button>
            </div>
            <div className="text-center text-green-400 font-mono text-sm py-2 animate-pulse">
              ● Connected to Signal
            </div>
          </>
        )}

        <div className="mt-4 pt-4 border-t border-slate-600">
          <h3 className="text-xs font-semibold mb-2 text-slate-400">STATUS LOG</h3>
          <div className="h-32 overflow-y-auto bg-slate-950 p-2 rounded text-xs font-mono text-slate-300">
            {statusLog.map((log, i) => (
              <div key={i} className="mb-1 border-b border-slate-800 pb-1 last:border-0">{log}</div>
            ))}
            {statusLog.length === 0 && <span className="text-slate-600 italic">Waiting for connection...</span>}
          </div>
        </div>
      </div>
    </div>
  );
};