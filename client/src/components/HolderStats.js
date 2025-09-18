import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import CountUp from 'react-countup';

const HolderStats = ({ stats }) => {
  const [expandedSection, setExpandedSection] = useState('holders');
  const [previousStats, setPreviousStats] = useState({});

  useEffect(() => {
    if (stats) {
      setPreviousStats(stats);
    }
  }, [stats]);

  if (!stats || stats.waitingForData) {
    return (
      <div className="glass-strong p-4 rounded-xl">
        <div className="text-center">
          <div className="text-gray-400 mb-2">
            <div className="text-lg mb-1">⏳</div>
            <div className="text-xs font-medium">Waiting for Data</div>
          </div>
          <div className="text-xs text-gray-500 mb-2">Connecting...</div>
          <div className="flex justify-center">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-400"></div>
          </div>
        </div>
      </div>
    );
  }

  const formatNumber = (num) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num?.toString() || '0';
  };

  const formatTokenAmount = (amount) => {
    if (!amount) return '0';
    return formatNumber(amount);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-3"
    >
      {/* Main Stats Card - Compact */}
      <div className="glass-strong p-4 rounded-xl">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-white flex items-center">
            <span className="text-base mr-1">🏆</span>
            Holders
          </h3>
        </div>

        {/* Key Metrics - Compact */}
        <div className="grid grid-cols-1 gap-3 mb-3">
          <div className="text-center">
            <div className="text-xl font-bold text-white">
              <CountUp
                start={previousStats.totalHolders || 0}
                end={stats.totalHolders || 0}
                duration={1}
              />
            </div>
            <div className="text-xs text-gray-400">Total Holders</div>
          </div>
        </div>


        {/* Last Update - Compact */}
        <div className="text-xs text-gray-500 text-center">
          Updated: {stats.lastUpdate ? new Date(stats.lastUpdate).toLocaleTimeString() : 'Never'}
        </div>
      </div>

      {/* Top Winners - Compact */}
      <div className="glass-strong p-4 rounded-xl">
        <div
          className="flex items-center justify-between cursor-pointer"
          onClick={() => setExpandedSection(expandedSection === 'holders' ? null : 'holders')}
        >
          <h4 className="text-sm font-bold text-white flex items-center">
            <span className="text-sm mr-1">🏆</span>
            Top Holders
          </h4>
          <motion.div
            animate={{ rotate: expandedSection === 'holders' ? 180 : 0 }}
            className="text-gray-400 text-xs"
          >
            ▼
          </motion.div>
        </div>

        <AnimatePresence>
          {expandedSection === 'holders' && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-3 space-y-2"
            >
              {stats.holders?.slice(0, 3).map((holder, index) => (
                <motion.div
                  key={holder.address}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-center justify-between p-2 glass rounded"
                >
                  <div className="flex items-center">
                    <div className="w-5 h-5 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center text-xs font-bold mr-2">
                      {index + 1}
                    </div>
                    <div>
                      <a
                        href={`https://solscan.io/account/${holder.address}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs font-mono text-white hover:text-blue-400 transition-colors underline decoration-transparent hover:decoration-blue-400"
                      >
                        {holder.address.slice(0, 4)}...{holder.address.slice(-4)}
                      </a>
                      <div className="text-xs text-gray-400">
                        {holder.percentage?.toFixed(1)}%
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-bold text-white">
                      {formatTokenAmount(holder.balance)}
                    </div>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Total Supply - Compact */}
      <div className="grid grid-cols-1 gap-3">
        <div className="glass-strong p-3 rounded-xl text-center">
          <div className="text-xs text-gray-400 mb-1">Total Supply</div>
          <div className="text-sm font-bold text-white">
            {formatTokenAmount(stats.totalSupply)}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default HolderStats;