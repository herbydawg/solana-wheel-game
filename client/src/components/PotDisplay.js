import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import CountUp from 'react-countup';
import { useGame } from '../contexts/GameContext';
import { useSocket } from '../contexts/SocketContext';

const PotDisplay = ({ amount }) => {
  const { solPrice } = useGame();
  const { socket } = useSocket();
  const [previousAmount, setPreviousAmount] = useState(0);
  const [showIncrease, setShowIncrease] = useState(false);
  const [growthRate, setGrowthRate] = useState(0);
  const [lastGrowth, setLastGrowth] = useState(0);
  const [walletBalance, setWalletBalance] = useState(0);
  const [potPercentage, setPotPercentage] = useState(0.7);

  useEffect(() => {
    if (amount > previousAmount && previousAmount > 0) {
      setShowIncrease(true);
      setTimeout(() => setShowIncrease(false), 2000);

      // Calculate growth rate
      const growth = amount - previousAmount;
      const rate = previousAmount > 0 ? (growth / previousAmount) * 100 : 0;
      setGrowthRate(rate);
      setLastGrowth(growth);
    }
    setPreviousAmount(amount);
  }, [amount, previousAmount]);

  // Listen for pot updates from server
  useEffect(() => {
    if (!socket) return;

    const handlePotUpdate = (data) => {
      if (data.walletBalance) {
        setWalletBalance(data.walletBalance);
      }
      if (data.potPercentage) {
        setPotPercentage(data.potPercentage);
      }
    };

    socket.on('potUpdate', handlePotUpdate);

    return () => {
      socket.off('potUpdate', handlePotUpdate);
    };
  }, [socket]);

  const formatSOL = (lamports) => {
    return (lamports / 1000000000).toFixed(4);
  };

  const solAmount = formatSOL(amount || 0);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative"
    >
      <div className="glass-strong p-6 rounded-2xl text-center relative overflow-hidden">
        {/* Background Animation */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full animate-pulse"></div>
        
        {/* Header */}
        <div className="relative z-10">
          <div className="flex items-center justify-center mb-2">
            <span className="text-2xl mr-2">💰</span>
            <h3 className="text-lg font-bold text-white">Current Pot</h3>
          </div>
          
          {/* Amount Display */}
          <div className="mb-4">
            <div className="text-3xl lg:text-4xl font-bold font-cyber text-gradient mb-1">
              <CountUp
                start={0}
                end={parseFloat(solAmount)}
                duration={1.5}
                decimals={4}
                decimal="."
                suffix=" SOL"
              />
            </div>
            
            {/* USD Equivalent */}
            <div className="text-gray-400 text-sm">
              ≈ ${(parseFloat(solAmount) * solPrice).toFixed(2)} USD
            </div>
          </div>


          {/* Pot Information */}
          <div className="mt-4 text-xs text-gray-500 space-y-1">
            <div>Updated in real-time</div>
            {walletBalance > 0 && (
              <div className="text-gray-400">
                Wallet: {(walletBalance / 1000000000).toFixed(4)} SOL • Display: {(potPercentage * 100).toFixed(0)}%
              </div>
            )}
          </div>
        </div>

        {/* Increase Animation */}
        <AnimatePresence>
          {showIncrease && (
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.8 }}
              animate={{ opacity: 1, y: -10, scale: 1 }}
              exit={{ opacity: 0, y: -30, scale: 0.8 }}
              className="absolute top-4 right-4 bg-green-500 text-white px-2 py-1 rounded-full text-xs font-bold"
            >
              +{formatSOL(amount - previousAmount)} SOL
            </motion.div>
          )}
        </AnimatePresence>

        {/* Glow Effect */}
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-blue-500/20 via-purple-500/20 to-pink-500/20 opacity-50 blur-xl"></div>
      </div>

      {/* Pot Growth Chart */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="mt-4 glass p-4 rounded-xl"
      >
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-gray-400">Pot Growth</span>
          <span className={`text-xs ${growthRate >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            📈 {growthRate >= 0 ? '+' : ''}{growthRate.toFixed(1)}%
          </span>
        </div>

        {/* Dynamic growth visualization bars */}
        <div className="flex items-end justify-between h-8 gap-1">
          {[0.2, 0.4, 0.3, 0.6, 0.5, 0.7, Math.max(0.1, growthRate / 100)].map((height, index) => (
            <motion.div
              key={index}
              initial={{ height: 0 }}
              animate={{ height: `${Math.max(5, height * 100)}%` }}
              transition={{ delay: index * 0.1, duration: 0.5 }}
              className={`rounded-sm flex-1 min-h-[4px] ${
                index === 6
                  ? 'bg-gradient-to-t from-green-500 to-emerald-400'
                  : 'bg-gradient-to-t from-blue-500 to-purple-500'
              }`}
            />
          ))}
        </div>

        <div className="flex justify-between mt-1">
          <span className="text-xs text-gray-500">Last cycle</span>
          <span className="text-xs text-gray-500">
            +{formatSOL(lastGrowth)} SOL
          </span>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default PotDisplay;