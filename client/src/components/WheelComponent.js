import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGame } from '../contexts/GameContext';
import { useSocket } from '../contexts/SocketContext';

const WheelComponent = () => {
  const { wheelData: contextWheelData, isSpinning, currentWinner } = useGame();
  const { subscribeToEvent } = useSocket();
  const wheelRef = useRef(null);
  const [rotation, setRotation] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [winnerSegment, setWinnerSegment] = useState(null);
  const [localWheelData, setLocalWheelData] = useState(null);

  // Use local wheel data if available, otherwise fall back to context data
  const wheelData = localWheelData || contextWheelData;

  // Debug wheel data (can be removed in production)
  // console.log('WheelComponent wheelData:', wheelData);
  // console.log('WheelComponent segments:', wheelData?.distribution ? wheelData.distribution.length : 0);

  // Generate colors for wheel segments
  const generateSegmentColors = (count) => {
    const colors = [
      '#00d4ff', '#8b5cf6', '#f472b6', '#10b981', '#f59e0b',
      '#ef4444', '#06b6d4', '#84cc16', '#f97316', '#ec4899',
      '#3b82f6', '#8b5cf6', '#14b8a6', '#f59e0b', '#ef4444'
    ];
    
    return Array.from({ length: count }, (_, i) => colors[i % colors.length]);
  };

  // Calculate segment angles
  const calculateSegments = (holders) => {
    if (!holders || holders.length === 0) return [];
    
    const totalBalance = holders.reduce((sum, holder) => sum + holder.balance, 0);
    let currentAngle = 0;
    
    return holders.map((holder, index) => {
      const percentage = (holder.balance / totalBalance) * 100;
      const angle = (percentage / 100) * 360;
      const segment = {
        ...holder,
        startAngle: currentAngle,
        endAngle: currentAngle + angle,
        angle: angle,
        color: generateSegmentColors(holders.length)[index],
        index
      };
      currentAngle += angle;
      return segment;
    });
  };

  const segments = wheelData?.distribution ? calculateSegments(wheelData.distribution) : [];

  // Handle spin animation
  useEffect(() => {
    if (!subscribeToEvent) return;

    const unsubscribeSpinStart = subscribeToEvent('spinStart', (data) => {
      console.log('Spin start received:', data);
      console.log('Holder distribution:', data.holderDistribution);

      setIsAnimating(true);

      // Update wheel data with holder distribution for rendering segments
      if (data.holderDistribution && data.holderDistribution.length > 0) {
        // Update the local wheel data for rendering segments
        setLocalWheelData({ distribution: data.holderDistribution });
      }

      // Calculate random spin rotation (multiple full rotations + random angle)
      const spins = 5 + Math.random() * 3; // 5-8 full rotations
      const finalAngle = Math.random() * 360;
      const totalRotation = rotation + (spins * 360) + finalAngle;

      setRotation(totalRotation);
    });

    const unsubscribeWinnerSelected = subscribeToEvent('winnerSelected', (data) => {
      // Find the winner segment
      const winner = segments.find(segment => 
        segment.address === data.winner.address
      );
      setWinnerSegment(winner);
      
      // Stop animation after a delay
      setTimeout(() => {
        setIsAnimating(false);
      }, 4000);
    });

    return () => {
      if (unsubscribeSpinStart) unsubscribeSpinStart();
      if (unsubscribeWinnerSelected) unsubscribeWinnerSelected();
    };
  }, [subscribeToEvent, segments, rotation]);

  // Render wheel segments
  const renderSegments = () => {
    if (segments.length === 0) {
      return (
        <circle
          cx="300"
          cy="300"
          r="270"
          fill="rgba(255, 255, 255, 0.1)"
          stroke="rgba(255, 255, 255, 0.2)"
          strokeWidth="3"
        />
      );
    }

    return segments.map((segment, index) => {
      const { startAngle, endAngle, color, address, percentage } = segment;
      
      // Convert angles to radians
      const startRad = (startAngle * Math.PI) / 180;
      const endRad = (endAngle * Math.PI) / 180;
      
      // Calculate path coordinates
      const largeArcFlag = endAngle - startAngle > 180 ? 1 : 0;
      const x1 = 300 + 270 * Math.cos(startRad);
      const y1 = 300 + 270 * Math.sin(startRad);
      const x2 = 300 + 270 * Math.cos(endRad);
      const y2 = 300 + 270 * Math.sin(endRad);
      
      const pathData = [
        `M 300 300`,
        `L ${x1} ${y1}`,
        `A 270 270 0 ${largeArcFlag} 1 ${x2} ${y2}`,
        `Z`
      ].join(' ');

      // Calculate text position
      const midAngle = (startAngle + endAngle) / 2;
      const textRadius = 180;
      const textX = 300 + textRadius * Math.cos((midAngle * Math.PI) / 180);
      const textY = 300 + textRadius * Math.sin((midAngle * Math.PI) / 180);

      const isWinner = winnerSegment && winnerSegment.index === index;

      return (
        <g key={index}>
          <path
            d={pathData}
            fill={color}
            stroke="rgba(255, 255, 255, 0.2)"
            strokeWidth="1"
            opacity={isWinner ? 1 : 0.8}
            style={{
              filter: isWinner ? `drop-shadow(0 0 20px ${color})` : 'none',
              transition: 'all 0.3s ease'
            }}
          />
          
          {/* Text label for larger segments */}
          {percentage > 5 && (
            <text
              x={textX}
              y={textY}
              fill="white"
              fontSize="10"
              textAnchor="middle"
              dominantBaseline="middle"
              style={{
                textShadow: '0 0 4px rgba(0,0,0,0.8)',
                pointerEvents: 'none'
              }}
            >
              {address.slice(0, 4)}...
            </text>
          )}
        </g>
      );
    });
  };

  return (
    <div className="relative flex items-center justify-center w-full">
      {/* Wheel Container */}
      <div className="relative flex items-center justify-center">
        {/* Wheel SVG */}
        <motion.div
          ref={wheelRef}
          animate={{ rotate: rotation }}
          transition={{
            duration: isAnimating ? 4 : 0,
            ease: isAnimating ? [0.17, 0.67, 0.83, 0.67] : 'linear',
          }}
          className="relative flex items-center justify-center"
        >
          <svg width="480" height="480" viewBox="0 0 600 600" className="drop-shadow-2xl">
            {/* Outer shadow ring */}
            <circle
              cx="300"
              cy="300"
              r="292.5"
              fill="none"
              stroke="rgba(0, 0, 0, 0.3)"
              strokeWidth="12"
              opacity="0.5"
            />

            {/* Main wheel body */}
            <circle
              cx="300"
              cy="300"
              r="277.5"
              fill="url(#wheelBodyGradient)"
              stroke="url(#wheelRimGradient)"
              strokeWidth="9"
            />

            {/* Inner shadow for depth */}
            <circle
              cx="300"
              cy="300"
              r="262.5"
              fill="none"
              stroke="rgba(0, 0, 0, 0.1)"
              strokeWidth="3"
            />

            {/* Wheel spokes for structure */}
            <g opacity="0.3">
              {Array.from({ length: 8 }, (_, i) => {
                const angle = (i * 45) * Math.PI / 180;
                const x1 = 300 + 45 * Math.cos(angle);
                const y1 = 300 + 45 * Math.sin(angle);
                const x2 = 300 + 255 * Math.cos(angle);
                const y2 = 300 + 255 * Math.sin(angle);
                return (
                  <line
                    key={i}
                    x1={x1}
                    y1={y1}
                    x2={x2}
                    y2={y2}
                    stroke="rgba(255, 255, 255, 0.2)"
                    strokeWidth="1.5"
                  />
                );
              })}
            </g>

            {/* Segments */}
            {renderSegments()}

            {/* Center hub */}
            <circle
              cx="300"
              cy="300"
              r="52.5"
              fill="url(#hubGradient)"
              stroke="url(#hubRimGradient)"
              strokeWidth="4.5"
            />

            {/* Center hub inner circle */}
            <circle
              cx="300"
              cy="300"
              r="37.5"
              fill="url(#hubInnerGradient)"
              stroke="rgba(255, 255, 255, 0.4)"
              strokeWidth="1.5"
            />

            {/* Center logo/text */}
            <text
              x="300"
              y="307.5"
              fill="white"
              fontSize="21"
              fontWeight="bold"
              textAnchor="middle"
              className="font-cyber"
              style={{ textShadow: '0 0 12px rgba(0,0,0,0.8)' }}
            >
              SPIN
            </text>

            {/* Enhanced gradients */}
            <defs>
              <radialGradient id="wheelBodyGradient" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="rgba(30, 30, 50, 0.9)" />
                <stop offset="70%" stopColor="rgba(20, 20, 40, 0.95)" />
                <stop offset="100%" stopColor="rgba(10, 10, 30, 1)" />
              </radialGradient>

              <linearGradient id="wheelRimGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#00d4ff" />
                <stop offset="25%" stopColor="#8b5cf6" />
                <stop offset="50%" stopColor="#f472b6" />
                <stop offset="75%" stopColor="#10b981" />
                <stop offset="100%" stopColor="#00d4ff" />
              </linearGradient>

              <radialGradient id="hubGradient" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="rgba(255, 255, 255, 0.3)" />
                <stop offset="50%" stopColor="rgba(200, 200, 220, 0.2)" />
                <stop offset="100%" stopColor="rgba(100, 100, 120, 0.1)" />
              </radialGradient>

              <linearGradient id="hubRimGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="rgba(255, 255, 255, 0.6)" />
                <stop offset="50%" stopColor="rgba(200, 200, 220, 0.4)" />
                <stop offset="100%" stopColor="rgba(150, 150, 170, 0.2)" />
              </linearGradient>

              <radialGradient id="hubInnerGradient" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="rgba(255, 255, 255, 0.4)" />
                <stop offset="100%" stopColor="rgba(200, 200, 220, 0.1)" />
              </radialGradient>
            </defs>
          </svg>
        </motion.div>

        {/* Enhanced Pointer */}
        <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-4.5 z-10">
          <div className="relative">
            {/* Main pointer */}
            <div className="w-0 h-0 border-l-9 border-r-9 border-b-18 border-l-transparent border-r-transparent border-b-yellow-400 filter drop-shadow-2xl">
            </div>
            {/* Pointer glow effect */}
            <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-12 border-r-12 border-b-24 border-l-transparent border-r-transparent border-b-yellow-300 opacity-50 animate-pulse">
            </div>
            {/* Pointer base */}
            <div className="absolute -top-1.5 left-1/2 transform -translate-x-1/2 w-6 h-4.5 bg-gradient-to-b from-yellow-400 to-yellow-600 rounded-b-md shadow-lg">
            </div>
          </div>
        </div>

        {/* Spinning indicator */}
        <AnimatePresence>
          {isSpinning && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="absolute inset-0 flex items-center justify-center pointer-events-none"
            >
              <div className="glass-strong px-6 py-3 rounded-full">
                <span className="text-white font-bold text-lg neon-text">
                  SPINNING...
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Winner announcement - Removed */}
      </div>
    </div>
  );
};

export default WheelComponent;