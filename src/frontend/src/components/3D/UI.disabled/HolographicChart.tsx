import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import { Group, BufferGeometry, Float32BufferAttribute, Color } from 'three';

interface ChartData {
  label: string;
  value: number;
  color?: string;
}

interface HolographicChartProps {
  data: ChartData[];
  position: [number, number, number];
  type: 'bar' | 'line' | 'ring';
  theme?: 'studio' | 'cyber' | 'space' | 'minimal';
  animated?: boolean;
  scale?: number;
}

// Bar Chart Component
function BarChart({ 
  data, 
  theme = 'studio', 
  animated = true, 
  scale = 1 
}: { 
  data: ChartData[];
  theme: string;
  animated: boolean;
  scale: number;
}) {
  const groupRef = useRef<Group>(null);
  const maxValue = Math.max(...data.map(d => d.value));
  
  useFrame((state) => {
    if (animated && groupRef.current) {
      groupRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.5) * 0.1;
    }
  });
  
  const getThemeColor = (index: number) => {
    switch (theme) {
      case 'cyber':
        return ['#00d4ff', '#ff006e', '#8338ec', '#ffbe0b'][index % 4];
      case 'space':
        return ['#4a90e2', '#f5a623', '#e24a4a', '#27ae60'][index % 4];
      case 'minimal':
        return ['#007bff', '#28a745', '#ffc107', '#dc3545'][index % 4];
      case 'studio':
      default:
        return ['#0066cc', '#009900', '#ff9900', '#cc0000'][index % 4];
    }
  };
  
  return (
    <group ref={groupRef}>
      {data.map((item, index) => {
        const height = (item.value / maxValue) * 2 * scale;
        const x = (index - data.length / 2) * 0.5 * scale;
        const color = item.color || getThemeColor(index);
        
        return (
          <group key={item.label} position={[x, 0, 0]}>
            {/* Bar */}
            <mesh position={[0, height / 2, 0]}>
              <boxGeometry args={[0.3 * scale, height, 0.3 * scale]} />
              <meshStandardMaterial
                color={color}
                transparent
                opacity={0.8}
                emissive={theme === 'cyber' ? color : '#000000'}
                emissiveIntensity={theme === 'cyber' ? 0.2 : 0}
              />
            </mesh>
            
            {/* Holographic wireframe for cyber theme */}
            {theme === 'cyber' && (
              <mesh position={[0, height / 2, 0]}>
                <boxGeometry args={[0.32 * scale, height + 0.02, 0.32 * scale]} />
                <meshBasicMaterial
                  color={color}
                  wireframe
                  transparent
                  opacity={0.4}
                />
              </mesh>
            )}
            
            {/* Value label */}
            <Text
              position={[0, height + 0.3 * scale, 0]}
              fontSize={0.15 * scale}
              color={color}
              anchorX="center"
              anchorY="middle"
            >
              {item.value}
            </Text>
            
            {/* Label */}
            <Text
              position={[0, -0.3 * scale, 0]}
              fontSize={0.12 * scale}
              color={theme === 'minimal' ? '#000000' : '#ffffff'}
              anchorX="center"
              anchorY="middle"
            >
              {item.label}
            </Text>
          </group>
        );
      })}
    </group>
  );
}

// Line Chart Component
function LineChart({ 
  data, 
  theme = 'studio', 
  animated = true, 
  scale = 1 
}: { 
  data: ChartData[];
  theme: string;
  animated: boolean;
  scale: number;
}) {
  const lineRef = useRef<Group>(null);
  const maxValue = Math.max(...data.map(d => d.value));
  
  const lineGeometry = useMemo(() => {
    const geometry = new BufferGeometry();
    const positions = new Float32BufferAttribute(data.length * 3, 3);
    
    data.forEach((item, index) => {
      const x = (index - data.length / 2) * 0.5 * scale;
      const y = (item.value / maxValue) * 2 * scale;
      const z = 0;
      
      positions.setXYZ(index, x, y, z);
    });
    
    geometry.setAttribute('position', positions);
    return geometry;
  }, [data, maxValue, scale]);
  
  useFrame((state) => {
    if (animated && lineRef.current) {
      lineRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.3) * 0.05;
    }
  });
  
  const getLineColor = () => {
    switch (theme) {
      case 'cyber': return '#00d4ff';
      case 'space': return '#4a90e2';
      case 'minimal': return '#007bff';
      case 'studio':
      default: return '#0066cc';
    }
  };
  
  return (
    <group ref={lineRef}>
      {/* Line */}
      <line geometry={lineGeometry}>
        <lineBasicMaterial color={getLineColor()} linewidth={3} />
      </line>
      
      {/* Data points */}
      {data.map((item, index) => {
        const x = (index - data.length / 2) * 0.5 * scale;
        const y = (item.value / maxValue) * 2 * scale;
        
        return (
          <group key={item.label} position={[x, y, 0]}>
            {/* Point sphere */}
            <mesh>
              <sphereGeometry args={[0.05 * scale, 16, 16]} />
              <meshStandardMaterial
                color={getLineColor()}
                emissive={theme === 'cyber' ? getLineColor() : '#000000'}
                emissiveIntensity={theme === 'cyber' ? 0.3 : 0}
              />
            </mesh>
            
            {/* Value label */}
            <Text
              position={[0, 0.2 * scale, 0]}
              fontSize={0.1 * scale}
              color={getLineColor()}
              anchorX="center"
              anchorY="middle"
            >
              {item.value}
            </Text>
          </group>
        );
      })}
      
      {/* X-axis labels */}
      {data.map((item, index) => {
        const x = (index - data.length / 2) * 0.5 * scale;
        
        return (
          <Text
            key={`label-${index}`}
            position={[x, -0.3 * scale, 0]}
            fontSize={0.08 * scale}
            color={theme === 'minimal' ? '#000000' : '#ffffff'}
            anchorX="center"
            anchorY="middle"
          >
            {item.label}
          </Text>
        );
      })}
    </group>
  );
}

// Ring Chart Component (Donut/Pie chart)
function RingChart({ 
  data, 
  theme = 'studio', 
  animated = true, 
  scale = 1 
}: { 
  data: ChartData[];
  theme: string;
  animated: boolean;
  scale: number;
}) {
  const groupRef = useRef<Group>(null);
  const total = data.reduce((sum, item) => sum + item.value, 0);
  
  useFrame((state) => {
    if (animated && groupRef.current) {
      groupRef.current.rotation.z += 0.005;
    }
  });
  
  const getThemeColor = (index: number) => {
    switch (theme) {
      case 'cyber':
        return ['#00d4ff', '#ff006e', '#8338ec', '#ffbe0b', '#06ffa5'][index % 5];
      case 'space':
        return ['#4a90e2', '#f5a623', '#e24a4a', '#27ae60', '#9b59b6'][index % 5];
      case 'minimal':
        return ['#007bff', '#28a745', '#ffc107', '#dc3545', '#6c757d'][index % 5];
      case 'studio':
      default:
        return ['#0066cc', '#009900', '#ff9900', '#cc0000', '#666666'][index % 5];
    }
  };
  
  let currentAngle = 0;
  
  return (
    <group ref={groupRef}>
      {data.map((item, index) => {
        const percentage = item.value / total;
        const angle = percentage * Math.PI * 2;
        const startAngle = currentAngle;
        const endAngle = currentAngle + angle;
        const midAngle = (startAngle + endAngle) / 2;
        
        currentAngle += angle;
        
        const color = item.color || getThemeColor(index);
        const innerRadius = 0.5 * scale;
        const outerRadius = 1.2 * scale;
        
        return (
          <group key={item.label}>
            {/* Ring segment */}
            <mesh rotation={[0, 0, startAngle]}>
              <ringGeometry 
                args={[innerRadius, outerRadius, 2, Math.ceil(angle * 10)]} 
              />
              <meshStandardMaterial
                color={color}
                transparent
                opacity={0.8}
                emissive={theme === 'cyber' ? color : '#000000'}
                emissiveIntensity={theme === 'cyber' ? 0.1 : 0}
              />
            </mesh>
            
            {/* Label */}
            <Text
              position={[
                Math.cos(midAngle) * (outerRadius + 0.3 * scale),
                Math.sin(midAngle) * (outerRadius + 0.3 * scale),
                0
              ]}
              fontSize={0.1 * scale}
              color={color}
              anchorX="center"
              anchorY="middle"
            >
              {item.label}
            </Text>
            
            {/* Percentage */}
            <Text
              position={[
                Math.cos(midAngle) * (outerRadius + 0.6 * scale),
                Math.sin(midAngle) * (outerRadius + 0.6 * scale),
                0
              ]}
              fontSize={0.08 * scale}
              color={theme === 'minimal' ? '#000000' : '#ffffff'}
              anchorX="center"
              anchorY="middle"
            >
              {Math.round(percentage * 100)}%
            </Text>
          </group>
        );
      })}
    </group>
  );
}

// Main Holographic Chart Component
export function HolographicChart({
  data,
  position,
  type,
  theme = 'studio',
  animated = true,
  scale = 1
}: HolographicChartProps) {
  const groupRef = useRef<Group>(null);
  
  useFrame((state) => {
    if (groupRef.current && animated) {
      // Subtle floating animation
      groupRef.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * 1.5) * 0.02;
    }
  });
  
  return (
    <group ref={groupRef} position={position}>
      {type === 'bar' && (
        <BarChart 
          data={data} 
          theme={theme} 
          animated={animated} 
          scale={scale} 
        />
      )}
      {type === 'line' && (
        <LineChart 
          data={data} 
          theme={theme} 
          animated={animated} 
          scale={scale} 
        />
      )}
      {type === 'ring' && (
        <RingChart 
          data={data} 
          theme={theme} 
          animated={animated} 
          scale={scale} 
        />
      )}
    </group>
  );
}

export default HolographicChart;