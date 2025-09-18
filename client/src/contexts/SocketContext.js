import React, { createContext, useContext, useEffect, useState } from 'react';
import io from 'socket.io-client';
import toast from 'react-hot-toast';

const SocketContext = createContext();

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [gameState, setGameState] = useState(null);
  const [holderStats, setHolderStats] = useState(null);
  const [countdown, setCountdown] = useState(null);
  const [recentTransactions, setRecentTransactions] = useState([]);

  useEffect(() => {
    // Initialize socket connection
    const newSocket = io(process.env.REACT_APP_SERVER_URL || 'http://localhost:5000', {
      transports: ['websocket'],
      upgrade: true,
    });

    setSocket(newSocket);

    // Connection event handlers
    newSocket.on('connect', () => {
      console.log('Connected to server');
      setIsConnected(true);
      toast.success('Connected to game server');
    });

    newSocket.on('disconnect', () => {
      console.log('Disconnected from server');
      setIsConnected(false);
      toast.error('Disconnected from server');
    });

    newSocket.on('connect_error', (error) => {
      console.error('Connection error:', error);
      setIsConnected(false);
      toast.error('Failed to connect to server');
    });

    // Game event handlers
    newSocket.on('gameState', (data) => {
      console.log('Game state updated:', data);
      setGameState(data);
    });

    newSocket.on('holderUpdate', (data) => {
      console.log('Holder stats updated:', data);
      setHolderStats(data);
    });

    newSocket.on('countdown', (data) => {
      console.log('Countdown received from server:', data);
      setCountdown(data);
    });

    newSocket.on('spinStart', (data) => {
      console.log('Spin started:', data);
      toast('🎰 Wheel is spinning!', {
        icon: '🎰',
        style: {
          background: 'linear-gradient(45deg, #8b5cf6, #06b6d4)',
        },
      });
    });

    newSocket.on('winnerSelected', (data) => {
      console.log('Winner selected:', data);
      const winnerAddress = `${data.winner.address.slice(0, 4)}...${data.winner.address.slice(-4)}`;
      toast.success(`🎉 Winner: ${winnerAddress}`, {
        duration: 6000,
        style: {
          background: 'linear-gradient(45deg, #10b981, #06b6d4)',
        },
      });
    });

    newSocket.on('payoutCompleted', (data) => {
      console.log('Payout completed:', data);
      toast.success('💰 Payout completed successfully!', {
        duration: 5000,
      });
      
      // Add to recent transactions
      setRecentTransactions(prev => [{
        id: data.gameId,
        type: 'payout',
        winner: data.winner,
        amount: data.winnerPayout,
        signature: data.transactionSignature,
        timestamp: new Date(),
      }, ...prev.slice(0, 9)]);
    });

    newSocket.on('payoutFailed', (data) => {
      console.error('Payout failed:', data);
      toast.error(`❌ Payout failed: ${data.error}`, {
        duration: 8000,
      });
    });

    newSocket.on('potUpdate', (data) => {
      console.log('Pot updated:', data);
      // Update the game state with new pot amount
      setGameState(prevState => ({
        ...prevState,
        currentPot: data.amount
      }));

      // Subtle notification for pot updates
      if (data.amount > 0) {
        toast('💎 Pot updated', {
          icon: '💎',
          duration: 2000,
        });
      }
    });

    newSocket.on('eligibilityChange', (data) => {
      console.log('Eligibility changed:', data);
      if (data.change > 0) {
        toast(`📈 ${data.change} new eligible holder${data.change > 1 ? 's' : ''}`, {
          icon: '📈',
          duration: 3000,
        });
      } else if (data.change < 0) {
        toast(`📉 ${Math.abs(data.change)} holder${Math.abs(data.change) > 1 ? 's' : ''} no longer eligible`, {
          icon: '📉',
          duration: 3000,
        });
      }
    });

    // Cleanup on unmount
    return () => {
      newSocket.close();
    };
  }, []);

  // Socket utility functions
  const emitEvent = (event, data) => {
    if (socket && isConnected) {
      socket.emit(event, data);
    }
  };

  const subscribeToEvent = (event, callback) => {
    if (socket) {
      socket.on(event, callback);
      return () => socket.off(event, callback);
    }
  };

  const value = {
    socket,
    isConnected,
    gameState,
    holderStats,
    countdown,
    recentTransactions,
    emitEvent,
    subscribeToEvent,
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};