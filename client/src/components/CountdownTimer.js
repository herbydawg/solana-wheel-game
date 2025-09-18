import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

const CountdownTimer = ({ timeRemaining, gameState }) => {
  const [displayTime, setDisplayTime] = useState('00:00');
  const [localTimeRemaining, setLocalTimeRemaining] = useState(0);
  const totalTime = 5 * 60 * 1000; // 5 minutes in ms

  // Update local time when server time changes - ensure proper reset
  useEffect(() => {
    if (timeRemaining && timeRemaining > 0) {
      // Accept any reasonable countdown value (up to 10 minutes to be safe)
      if (timeRemaining <= 10 * 60 * 1000) {
        setLocalTimeRemaining(timeRemaining);
      }
    } else if (timeRemaining === 0 || timeRemaining === null || timeRemaining === undefined) {
      setLocalTimeRemaining(0);
    }
  }, [timeRemaining]);

  // Smooth countdown using client-side timer
  useEffect(() => {
    if (gameState === 'waiting' && localTimeRemaining > 0) {
      const interval = setInterval(() => {
        setLocalTimeRemaining(prev => {
          if (prev <= 1000) {
            clearInterval(interval);
            return 0;
          }
          return prev - 1000;
        });
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [gameState, localTimeRemaining]);

  useEffect(() => {
    if (localTimeRemaining && localTimeRemaining > 0) {
      // Calculate display time
      const totalSeconds = Math.floor(localTimeRemaining / 1000);
      const minutes = Math.floor(totalSeconds / 60);
      const seconds = totalSeconds % 60;

      setDisplayTime(`${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
    } else {
      setDisplayTime('00:00');
    }
  }, [localTimeRemaining, gameState, totalTime]);


  const getStatusText = () => {
    switch (gameState) {
      case 'spinning': return 'SPINNING...';
      case 'processing': return 'PROCESSING...';
      case 'completed': return 'COMPLETED';
      case 'paused': return 'PAUSED';
      default: return 'NEXT SPIN IN';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center mb-4"
    >
      {/* Status Text */}
      <div className="text-center mb-2">
        <div className="text-gray-400 text-sm font-medium mb-2">
          {getStatusText()}
        </div>
        {gameState === 'waiting' && (
          <div className="text-white text-4xl lg:text-5xl font-bold font-cyber mb-2">
            {displayTime}
          </div>
        )}
      </div>

      {/* Large Timer Display for other states */}
      {(gameState === 'spinning' || gameState === 'processing') && (
        <div className="text-center mb-2">
          <motion.div
            animate={gameState === 'spinning' ? { rotate: 360 } : { scale: [1, 1.2, 1] }}
            transition={gameState === 'spinning' ?
              { duration: 1, repeat: Infinity, ease: 'linear' } :
              { duration: 1, repeat: Infinity }
            }
            className="text-4xl lg:text-5xl mb-2"
          >
            {gameState === 'spinning' ? '🎰' : '⚡'}
          </motion.div>
        </div>
      )}

      {/* Additional Info */}
      <div className="text-center">
        <div className="glass px-4 py-2 rounded-full">
          <span className="text-gray-400 text-sm">
            {gameState === 'waiting' ? 'Auto-spin 5min' :
             gameState === 'spinning' ? 'Selecting Winner...' :
             gameState === 'processing' ? 'Processing Payout...' :
             'Updated'}
          </span>
        </div>
      </div>
    </motion.div>
  );
};

export default CountdownTimer;