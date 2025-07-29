import React from 'react';

interface Simple3DTestProps {
  agents: any[];
}

export const Simple3DTest: React.FC<Simple3DTestProps> = ({ agents }) => {
  return (
    <div className="w-full h-full bg-gradient-to-br from-slate-900 to-slate-700 rounded-lg flex items-center justify-center text-white">
      <div className="text-center space-y-4">
        <div className="text-2xl font-bold">3D Visualization Test</div>
        <div className="text-lg">
          Found {agents.length} agents
        </div>
        <div className="grid grid-cols-2 gap-4 max-w-md">
          {agents.slice(0, 4).map((agent, index) => (
            <div 
              key={agent.id || index}
              className="bg-white/10 backdrop-blur-sm rounded-lg p-3 text-sm"
            >
              <div className="font-medium">{agent.name || `Agent ${index + 1}`}</div>
              <div className="text-xs opacity-75">{agent.status || 'unknown'}</div>
            </div>
          ))}
        </div>
        <div className="text-sm text-yellow-300">
          ⚠️ This is a test component. The actual 3D visualization needs debugging.
        </div>
      </div>
    </div>
  );
};

export default Simple3DTest;