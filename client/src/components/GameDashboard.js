import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import WheelComponent from './WheelComponent';
import CountdownTimer from './CountdownTimer';
import PotDisplay from './PotDisplay';
import HolderStats from './HolderStats';
import TransactionFeed from './TransactionFeed';
import ConnectionStatus from './ConnectionStatus';
import EligibilityChecker from './EligibilityChecker';
import { useGame } from '../contexts/GameContext';

const GameDashboard = () => {
  const {
    gameState,
    currentPot,
    holderStats,
    countdown,
    loading,
    error
  } = useGame();

  const [showStats, setShowStats] = useState(true);

  // Auto-hide stats on mobile during spin
  useEffect(() => {
    if (gameState === 'spinning' && window.innerWidth < 768) {
      setShowStats(false);
    } else {
      setShowStats(true);
    }
  }, [gameState]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="glass-strong p-8 rounded-2xl text-center">
          <div className="loading-spinner mx-auto mb-4"></div>
          <div className="text-white text-lg">Loading Game...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="glass-strong p-8 rounded-2xl text-center max-w-md">
          <div className="text-red-400 text-xl mb-4">⚠️ Error</div>
          <div className="text-white mb-4">{error}</div>
          <button 
            onClick={() => window.location.reload()}
            className="btn-neon"
          >
            Reload
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-2 lg:p-4">
      {/* Compact Header with Eligibility Checker */}
      <div className="max-w-7xl mx-auto space-y-3">
        {/* Eligibility Checker - Compact */}
        <EligibilityChecker />

        {/* Compact Header */}
        <motion.header
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <motion.h1
            className="text-3xl lg:text-4xl font-cyber font-bold text-gradient mb-1"
            animate={{
              y: [0, -3, 0],
              scale: [1, 1.02, 1]
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          >
            LUCKY PUMP WHEEL
          </motion.h1>
          <div className="flex items-center justify-center gap-4 text-sm">
            <p className="text-gray-300">
              Automated Meme Coin Lottery
            </p>
            <ConnectionStatus />
          </div>
        </motion.header>

        {/* Main Game Area - Compact Layout */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
          {/* Left Sidebar - Compact Stats */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: showStats ? 1 : 0, x: showStats ? 0 : -20 }}
            className="xl:col-span-3 space-y-3"
          >
            <PotDisplay amount={currentPot} />
            <HolderStats stats={holderStats} />
          </motion.div>

          {/* Center - Compact Wheel Area */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="xl:col-span-6 flex flex-col items-center justify-center min-h-[350px] py-2"
          >
            {/* Compact Countdown Timer */}
            <div className="mb-2">
              <CountdownTimer
                timeRemaining={countdown?.timeRemaining}
                gameState={gameState}
              />
            </div>

            {/* Compact Wheel */}
            <div className="flex items-center justify-center scale-90 lg:scale-100">
              <WheelComponent />
            </div>

            {/* Compact Game Status */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="mt-2 text-center"
            >
              <div className="glass px-4 py-2 rounded-full inline-block text-sm">
                <span className="text-gray-400 mr-2">Status:</span>
                <span className={`font-bold capitalize ${getGameStatusColor(gameState)}`}>
                  {gameState?.replace('_', ' ') || 'Loading...'}
                </span>
              </div>
            </motion.div>
          </motion.div>

          {/* Right Sidebar - Compact Transactions */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: showStats ? 1 : 0, x: showStats ? 0 : 20 }}
            className="xl:col-span-3"
          >
            <TransactionFeed />
          </motion.div>
        </div>

        {/* Mobile Stats Toggle */}
        <div className="xl:hidden fixed bottom-2 right-2 z-50">
          <button
            onClick={() => setShowStats(!showStats)}
            className="glass-strong p-2 rounded-full text-white hover:bg-white/10 transition-colors text-sm"
          >
            {showStats ? '📊' : '📈'}
          </button>
        </div>

        {/* Compact Bottom Info Bar */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="mt-4 text-center"
        >
          <div className="glass p-3 rounded-lg inline-block">
            <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-gray-300">
              <div className="flex items-center gap-1">
                {holderStats?.waitingForData ? (
                  <>
                    <div className="w-1.5 h-1.5 bg-yellow-400 rounded-full animate-pulse"></div>
                    <span>Connecting</span>
                  </>
                ) : (
                  <>
                    <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"></div>
                    <span>Live Data</span>
                  </>
                )}
              </div>
              <div className="flex items-center gap-1">
                <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-pulse"></div>
                <span>Auto Payouts</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-pulse"></div>
                <span>Fair Random</span>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

// Helper function for game status colors
const getGameStatusColor = (status) => {
  switch (status) {
    case 'waiting': return 'text-blue-400';
    case 'spinning': return 'text-yellow-400';
    case 'processing': return 'text-purple-400';
    case 'completed': return 'text-green-400';
    case 'paused': return 'text-red-400';
    default: return 'text-gray-400';
  }
};

export default GameDashboard;