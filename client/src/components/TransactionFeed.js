import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSocket } from '../contexts/SocketContext';
import { useGame } from '../contexts/GameContext';

const TransactionFeed = () => {
  const { recentTransactions } = useSocket();
  const { fetchPayoutHistory, formatAddress, formatSOL } = useGame();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTransactionHistory();
  }, []);

  useEffect(() => {
    if (recentTransactions && recentTransactions.length > 0) {
      setTransactions(prev => {
        // Add new transactions to the beginning and keep only last 5 winners
        const newTransactions = [...recentTransactions, ...prev];
        // Filter to keep only winner payout transactions and limit to 5
        const winnerTransactions = newTransactions
          .filter(tx => tx.type === 'payout')
          .slice(0, 5);
        return winnerTransactions;
      });
    }
  }, [recentTransactions]);

  const loadTransactionHistory = async () => {
    try {
      setLoading(true);
      const history = await fetchPayoutHistory(10);
      if (history) {
        const formattedHistory = history.map(payout => ({
          id: payout.id,
          type: 'payout',
          winner: payout.winnerAddress,
          amount: payout.winnerAmount,
          signature: payout.transactionSignature,
          timestamp: new Date(payout.createdAt),
          status: payout.status
        }));
        setTransactions(formattedHistory);
      }
    } catch (error) {
      console.error('Failed to load transaction history:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTransactionIcon = (type, status) => {
    if (status === 'failed') return '❌';
    switch (type) {
      case 'payout': return '💰';
      case 'spin': return '🎰';
      case 'fee': return '💎';
      default: return '📝';
    }
  };

  const getTransactionColor = (type, status) => {
    if (status === 'failed') return 'text-red-400';
    switch (type) {
      case 'payout': return 'text-green-400';
      case 'spin': return 'text-yellow-400';
      case 'fee': return 'text-blue-400';
      default: return 'text-gray-400';
    }
  };

  const formatTimeAgo = (timestamp) => {
    const now = new Date();
    const diff = now - new Date(timestamp);
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return 'Just now';
  };

  const openTransaction = (signature) => {
    if (signature) {
      window.open(`https://solscan.io/tx/${signature}`, '_blank');
    }
  };

  if (loading) {
    return (
      <div className="glass-strong p-6 rounded-2xl">
        <h3 className="text-lg font-bold text-white mb-4 flex items-center">
          <span className="text-xl mr-2">📊</span>
          Transaction Feed
        </h3>
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="h-16 bg-gray-600 rounded-lg"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-strong p-6 rounded-2xl h-fit max-h-[600px] overflow-hidden"
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-white flex items-center">
          <span className="text-xl mr-2">📊</span>
          Live Feed
        </h3>
        <button
          onClick={loadTransactionHistory}
          className="text-xs text-gray-400 hover:text-white transition-colors"
        >
          Refresh
        </button>
      </div>

      <div className="space-y-3 overflow-y-auto max-h-[500px] pr-2 custom-scrollbar">
        <AnimatePresence>
          {transactions.length === 0 ? (
            <div className="text-center text-gray-400 py-8">
              <div className="text-4xl mb-2">🔄</div>
              <div>No transactions yet</div>
              <div className="text-xs mt-1">Waiting for game activity...</div>
            </div>
          ) : (
            transactions.map((tx, index) => (
              <motion.div
                key={tx.id || index}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ delay: index * 0.05 }}
                className="transaction-item cursor-pointer hover:bg-white/10 transition-colors"
                onClick={() => openTransaction(tx.signature)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3">
                    <div className="text-lg">
                      {getTransactionIcon(tx.type, tx.status)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-1">
                        <span className={`text-sm font-medium ${getTransactionColor(tx.type, tx.status)}`}>
                          {tx.type === 'payout' ? 'Winner Payout' : 
                           tx.type === 'spin' ? 'Wheel Spin' : 
                           'Transaction'}
                        </span>
                        {tx.status === 'failed' && (
                          <span className="text-xs bg-red-500/20 text-red-400 px-2 py-1 rounded">
                            Failed
                          </span>
                        )}
                      </div>
                      
                      {tx.winner && (
                        <div className="text-xs text-gray-300 mb-1">
                          Winner: {formatAddress(tx.winner)}
                        </div>
                      )}
                      
                      {tx.amount && (
                        <div className="text-xs text-white font-mono">
                          {formatSOL(tx.amount)} SOL
                        </div>
                      )}
                      
                      <div className="text-xs text-gray-500 mt-1">
                        {formatTimeAgo(tx.timestamp)}
                      </div>
                    </div>
                  </div>
                  
                  {tx.signature && (
                    <div className="text-xs text-gray-400 hover:text-white transition-colors">
                      🔗
                    </div>
                  )}
                </div>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>

      {/* Footer */}
      <div className="mt-4 pt-4 border-t border-white/10">
        <div className="text-xs text-gray-500 text-center">
          Click transactions to view on Solscan
        </div>
      </div>
    </motion.div>
  );
};

export default TransactionFeed;