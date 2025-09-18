import React from 'react';
import { motion } from 'framer-motion';

const LoadingScreen = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-dark-500 via-dark-400 to-dark-300 flex items-center justify-center relative overflow-hidden">
      {/* Background Grid */}
      <div className="cyber-grid fixed inset-0 opacity-20" />
      
      {/* Loading Content */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center z-10"
      >
        {/* Logo/Title */}
        <motion.h1 
          initial={{ y: -20 }}
          animate={{ y: 0 }}
          className="text-6xl font-cyber font-bold text-gradient mb-8"
        >
          SOLANA WHEEL
        </motion.h1>
        
        {/* Spinning Wheel Icon */}
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
          className="text-8xl mb-8"
        >
          🎰
        </motion.div>
        
        {/* Loading Text */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="space-y-4"
        >
          <div className="text-white text-xl font-medium">
            Initializing Game Engine...
          </div>
          
          {/* Loading Steps */}
          <div className="space-y-2 text-sm text-gray-400">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.7 }}
              className="flex items-center justify-center space-x-2"
            >
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <span>Connecting to Solana Network</span>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.9 }}
              className="flex items-center justify-center space-x-2"
            >
              <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
              <span>Loading Token Holders</span>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 1.1 }}
              className="flex items-center justify-center space-x-2"
            >
              <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse"></div>
              <span>Preparing Game Interface</span>
            </motion.div>
          </div>
        </motion.div>
        
        {/* Loading Bar */}
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: '100%' }}
          transition={{ duration: 2, ease: 'easeInOut' }}
          className="mt-8 mx-auto"
        >
          <div className="w-64 h-1 bg-gray-700 rounded-full overflow-hidden">
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: '100%' }}
              transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
              className="h-full w-1/3 bg-gradient-to-r from-transparent via-blue-400 to-transparent"
            />
          </div>
        </motion.div>
        
        {/* Subtitle */}
        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.3 }}
          className="text-gray-300 mt-6 max-w-md mx-auto"
        >
          Automated meme coin lottery with real-time blockchain integration
        </motion.p>
      </motion.div>
      
      {/* Floating Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(6)].map((_, i) => (
          <motion.div
            key={i}
            initial={{ 
              x: Math.random() * window.innerWidth,
              y: Math.random() * window.innerHeight,
              opacity: 0
            }}
            animate={{ 
              y: [null, -20, 0],
              opacity: [0, 0.6, 0]
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              delay: i * 0.5,
              ease: 'easeInOut'
            }}
            className="absolute text-2xl"
          >
            {['💎', '🚀', '⚡', '🎯', '💰', '🔥'][i]}
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default LoadingScreen;