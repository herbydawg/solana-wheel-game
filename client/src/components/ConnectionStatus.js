import React from 'react';
import { motion } from 'framer-motion';
import { useSocket } from '../contexts/SocketContext';

const ConnectionStatus = () => {
  const { isConnected } = useSocket();

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex items-center justify-center mt-4"
    >
      <div className={`glass px-4 py-2 rounded-full flex items-center space-x-2 ${
        isConnected ? 'border-green-500/30' : 'border-red-500/30'
      }`}>
        <motion.div
          animate={{ 
            scale: isConnected ? [1, 1.2, 1] : 1,
            opacity: isConnected ? [1, 0.7, 1] : 0.5
          }}
          transition={{ 
            duration: 2, 
            repeat: isConnected ? Infinity : 0,
            ease: 'easeInOut'
          }}
          className={`w-2 h-2 rounded-full ${
            isConnected ? 'bg-green-400' : 'bg-red-400'
          }`}
        />
        <span className={`text-sm font-medium ${
          isConnected ? 'text-green-400' : 'text-red-400'
        }`}>
          {isConnected ? 'Connected' : 'Disconnected'}
        </span>
        {isConnected && (
          <span className="text-xs text-gray-400">
            • Real-time updates active
          </span>
        )}
      </div>
    </motion.div>
  );
};

export default ConnectionStatus;