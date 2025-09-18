import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSocket } from '../contexts/SocketContext';
import { useGame } from '../contexts/GameContext';

const TransactionFeed = () => {
  const { recentTransactions, socket } = useSocket();
  const { fetchPayoutHistory, formatAddress, formatSOL } = useGame();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [winners, setWinners] = useState([]);

  useEffect(() => {
    loadTransactionHistory();
  }, []);

  // Listen for winner events to maintain persistent winner list
  useEffect(() => {
    if (!socket) return;

    const handleWinnerSelected = (data) => {
      const newWinner = {
        id: data.gameId,
        winner: data.winner.address,
        amount: data.winnerPayout,
        timestamp: new Date(),
        signature: null // Will be updated when payout completes
      };
      
      setWinners(prev => {
        const updated = [newWinner, ...prev.filter(w => w.id !== data.gameId)];
        return updated.slice(0, 5); // Keep last 5 winners
      });
    };

    const handlePayoutCompleted = (data) => {
      setWinners(prev =>
        prev.map(winner =>
          winner.id === data.gameId
            ? { ...winner, signature: data.transactionSignature }
            : winner
        )
      );
    };

    socket.on('winnerSelected', handleWinnerSelected);
    socket.on('payoutCompleted', handlePayoutCompleted);

    return () => {
      socket.off('winnerSelected', handleWinnerSelected);
      socket.off('payoutCompleted', handlePayoutCompleted);
    };
  }, [socket]);

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
          {winners.length === 0 ? (
            <div className="text-center text-gray-400 py-8">
              <div className="text-4xl mb-2">🎰</div>
              <div>No winners yet</div>
              <div className="text-xs mt-1">Waiting for first spin...</div>
            </div>
          ) : (
            winners.map((winner, index) => (
              <motion.div
                key={winner.id || index}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ delay: index * 0.05 }}
                className="transaction-item cursor-pointer hover:bg-white/10 transition-colors p-3 glass rounded-lg"
                onClick={() => winner.signature && openTransaction(winner.signature)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="text-lg">
                      🏆
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-1">
                        <span className="text-sm font-medium text-green-400">
                          Winner #{index + 1}
                        </span>
                        {!winner.signature && (
                          <span className="text-xs bg-yellow-500/20 text-yellow-400 px-2 py-1 rounded">
                            Processing
                          </span>
                        )}
                      </div>
                      
                      <div className="text-xs text-gray-300 mb-1">
                        <a
                          href={`https://solscan.io/account/${winner.winner}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:text-blue-400 transition-colors underline decoration-transparent hover:decoration-blue-400"
                        >
                          {formatAddress(winner.winner)}
                        </a>
                      </div>
                      
                      <div className="text-xs text-white font-mono font-bold">
                        {formatSOL(winner.amount)} SOL
                      </div>
                      
                      <div className="text-xs text-gray-500 mt-1">
                        {formatTimeAgo(winner.timestamp)}
                      </div>
                    </div>
                  </div>
                  
                  {winner.signature && (
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