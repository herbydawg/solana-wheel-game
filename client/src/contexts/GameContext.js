import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { useSocket } from './SocketContext';
import axios from 'axios';

const GameContext = createContext();

export const useGame = () => {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error('useGame must be used within a GameProvider');
  }
  return context;
};

// Game state reducer
const gameReducer = (state, action) => {
  switch (action.type) {
    case 'SET_GAME_STATE':
      return {
        ...state,
        gameState: action.payload.gameState,
        currentPot: action.payload.currentPot,
        nextSpinTime: action.payload.nextSpinTime,
        currentGame: action.payload.currentGame,
        recentGames: action.payload.recentGames,
        isRunning: action.payload.isRunning,
        spinInterval: action.payload.spinInterval,
      };
    
    case 'SET_HOLDER_STATS':
      return {
        ...state,
        holderStats: action.payload,
      };
    
    case 'SET_WHEEL_DATA':
      return {
        ...state,
        wheelData: action.payload,
      };
    
    case 'SET_COUNTDOWN':
      return {
        ...state,
        countdown: action.payload,
      };
    
    case 'SET_SPINNING':
      return {
        ...state,
        isSpinning: action.payload,
      };
    
    case 'SET_WINNER':
      return {
        ...state,
        currentWinner: action.payload,
        isSpinning: false,
      };
    
    case 'SET_LOADING':
      return {
        ...state,
        loading: action.payload,
      };
    
    case 'SET_ERROR':
      return {
        ...state,
        error: action.payload,
        loading: false,
      };
    
    case 'CLEAR_ERROR':
      return {
        ...state,
        error: null,
      };

    case 'SET_SOL_PRICE':
      return {
        ...state,
        solPrice: action.payload,
      };

    default:
      return state;
  }
};

const initialState = {
  gameState: 'waiting',
  currentPot: 0,
  nextSpinTime: null,
  currentGame: null,
  recentGames: [],
  isRunning: false,
  spinInterval: 5,
  holderStats: null,
  wheelData: null,
  countdown: null,
  isSpinning: false,
  currentWinner: null,
  loading: true,
  error: null,
  solPrice: 180, // Default fallback price
};

export const GameProvider = ({ children }) => {
  const [state, dispatch] = useReducer(gameReducer, initialState);
  const { socket, isConnected, gameState, holderStats } = useSocket();

  // API base URL
  const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

  // Update state from socket context
  useEffect(() => {
    if (gameState) {
      dispatch({ type: 'SET_GAME_STATE', payload: gameState });
    }
  }, [gameState]);

  useEffect(() => {
    if (holderStats) {
      dispatch({ type: 'SET_HOLDER_STATS', payload: holderStats });
    }
  }, [holderStats]);

  // Countdown is now handled directly in socket event listeners

  // Socket event handlers
  useEffect(() => {
    if (!socket) return;

    const handleSpinStart = (data) => {
      dispatch({ type: 'SET_SPINNING', payload: true });
    };

    const handleWinnerSelected = (data) => {
      dispatch({ type: 'SET_WINNER', payload: data.winner });
    };

    const handlePayoutCompleted = (data) => {
      console.log('Payout completed, transitioning to waiting state');
      // Smooth transition back to waiting state after payout
      dispatch({ type: 'SET_SPINNING', payload: false });
      dispatch({ type: 'SET_WINNER', payload: null });
      // Game state will be updated via the next countdown socket event
    };

    const handleCountdown = (data) => {
      // Ensure smooth transition to waiting state
      if (data.gameState === 'waiting') {
        dispatch({ type: 'SET_SPINNING', payload: false });
        dispatch({ type: 'SET_WINNER', payload: null });
      }
      dispatch({ type: 'SET_COUNTDOWN', payload: data });
    };

    socket.on('spinStart', handleSpinStart);
    socket.on('winnerSelected', handleWinnerSelected);
    socket.on('payoutCompleted', handlePayoutCompleted);
    socket.on('countdown', handleCountdown);

    return () => {
      socket.off('spinStart', handleSpinStart);
      socket.off('winnerSelected', handleWinnerSelected);
      socket.off('payoutCompleted', handlePayoutCompleted);
      socket.off('countdown', handleCountdown);
    };
  }, [socket]);

  // API functions
  const fetchGameState = async () => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      const response = await axios.get(`${API_BASE}/game/state`);
      if (response.data.success) {
        dispatch({ type: 'SET_GAME_STATE', payload: response.data.data });
      }
    } catch (error) {
      console.warn('Backend not available, using demo data');
      // Provide demo data when backend is not available
      const demoData = {
        gameState: 'waiting',
        currentPot: 0.5,
        nextSpinTime: new Date(Date.now() + 5 * 60 * 1000),
        currentGame: null,
        recentGames: [],
        isRunning: false,
        spinInterval: 5
      };
      dispatch({ type: 'SET_GAME_STATE', payload: demoData });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const fetchWheelData = async () => {
    try {
      const response = await axios.get(`${API_BASE}/game/wheel-data`);
      if (response.data.success) {
        dispatch({ type: 'SET_WHEEL_DATA', payload: response.data.data });
      }
    } catch (error) {
      console.warn('Backend not available, using demo wheel data');
      // Provide demo wheel data
      const demoWheelData = {
        distribution: [
          { address: 'Demo1...abcd', balance: 1000000, percentage: 25 },
          { address: 'Demo2...efgh', balance: 800000, percentage: 20 },
          { address: 'Demo3...ijkl', balance: 600000, percentage: 15 },
          { address: 'Demo4...mnop', balance: 400000, percentage: 10 },
          { address: 'Demo5...qrst', balance: 200000, percentage: 5 },
          { address: 'Demo6...uvwx', balance: 200000, percentage: 5 },
          { address: 'Demo7...yzab', balance: 200000, percentage: 5 },
          { address: 'Demo8...cdef', balance: 200000, percentage: 5 },
          { address: 'Demo9...ghij', balance: 200000, percentage: 5 },
          { address: 'Demo10...klmn', balance: 200000, percentage: 5 }
        ],
        totalEligible: 10,
        minimumHold: 100000
      };
      dispatch({ type: 'SET_WHEEL_DATA', payload: demoWheelData });
    }
  };

  const fetchHolderStats = async () => {
    try {
      const response = await axios.get(`${API_BASE}/holders/stats`);
      if (response.data.success) {
        dispatch({ type: 'SET_HOLDER_STATS', payload: response.data.data });
      }
    } catch (error) {
      console.warn('Backend not available, using demo holder stats');
      // Provide demo holder stats
      const demoHolderStats = {
        totalHolders: 150,
        eligibleHolders: 45,
        totalSupply: 4000000,
        minimumHoldAmount: 100000,
        minimumHoldPercentage: 0.1,
        lastUpdate: new Date(),
        isTracking: false,
        topHolders: [
          { address: 'Demo1...abcd', balance: 1000000, percentage: 25, isEligible: true },
          { address: 'Demo2...efgh', balance: 800000, percentage: 20, isEligible: true },
          { address: 'Demo3...ijkl', balance: 600000, percentage: 15, isEligible: true }
        ]
      };
      dispatch({ type: 'SET_HOLDER_STATS', payload: demoHolderStats });
    }
  };

  const fetchGameHistory = async (limit = 10) => {
    try {
      const response = await axios.get(`${API_BASE}/game/history?limit=${limit}`);
      if (response.data.success) {
        return response.data.data;
      }
    } catch (error) {
      console.error('Failed to fetch game history:', error);
      return [];
    }
  };

  const fetchPayoutHistory = async (limit = 20) => {
    try {
      const response = await axios.get(`${API_BASE}/transactions/payouts?limit=${limit}`);
      if (response.data.success) {
        return response.data.data;
      }
    } catch (error) {
      console.error('Failed to fetch payout history:', error);
      return [];
    }
  };

  const checkHolderEligibility = async (address) => {
    try {
      const response = await axios.get(`${API_BASE}/holders/check/${address}`);
      if (response.data.success) {
        return response.data.data;
      }
    } catch (error) {
      console.error('Failed to check holder eligibility:', error);
      return null;
    }
  };

  const fetchSolPrice = async () => {
    try {
      // Using CoinGecko API for SOL price
      const response = await axios.get('https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd');
      if (response.data && response.data.solana && response.data.solana.usd) {
        const price = response.data.solana.usd;
        dispatch({ type: 'SET_SOL_PRICE', payload: price });
        return price;
      }
    } catch (error) {
      console.warn('Failed to fetch SOL price from CoinGecko, using fallback:', error.message);
      // Don't fail the entire app if CoinGecko is down
      dispatch({ type: 'SET_SOL_PRICE', payload: state.solPrice || 180 });
    }
    return state.solPrice || 180; // Return fallback price
  };

  // Initialize data on mount
  useEffect(() => {
    console.log('API_BASE URL:', API_BASE); // Debug log

    // Always try to fetch data, even if not connected initially
    fetchGameState();
    fetchWheelData();
    fetchHolderStats();
    fetchSolPrice(); // Fetch initial SOL price

    // Start periodic SOL price updates (every 60 seconds)
    const priceInterval = setInterval(() => {
      fetchSolPrice();
    }, 60000);

    // Force loading to complete after 10 seconds as fallback
    const loadingTimeout = setTimeout(() => {
      console.log('Forcing loading to complete after timeout');
      dispatch({ type: 'SET_LOADING', payload: false });
    }, 10000);

    return () => {
      clearInterval(priceInterval);
      clearTimeout(loadingTimeout);
    };
  }, []);

  // Utility functions
  const formatAddress = (address) => {
    if (!address) return '';
    return `${address.slice(0, 4)}...${address.slice(-4)}`;
  };

  const formatSOL = (lamports) => {
    return (lamports / 1000000000).toFixed(4);
  };

  const formatTimeRemaining = (milliseconds) => {
    if (!milliseconds || milliseconds <= 0) return '00:00';
    
    const totalSeconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

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

  const value = {
    ...state,
    isConnected,
    fetchGameState,
    fetchWheelData,
    fetchHolderStats,
    fetchGameHistory,
    fetchPayoutHistory,
    checkHolderEligibility,
    fetchSolPrice,
    formatAddress,
    formatSOL,
    formatTimeRemaining,
    getGameStatusColor,
    clearError: () => dispatch({ type: 'CLEAR_ERROR' }),
  };

  return (
    <GameContext.Provider value={value}>
      {children}
    </GameContext.Provider>
  );
};