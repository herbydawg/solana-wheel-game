import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import axios from 'axios';
import toast from 'react-hot-toast';

const PumpFunPanel = ({ adminPassword }) => {
  const [feeStats, setFeeStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [winnerAddress, setWinnerAddress] = useState('');
  const [autoClaimEnabled, setAutoClaimEnabled] = useState(false);

  const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

  // Load fee stats
  useEffect(() => {
    loadFeeStats();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(loadFeeStats, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadFeeStats = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE}/admin/pumpfun/fees`, {
        headers: { 'x-admin-password': adminPassword }
      });
      
      if (response.data.success) {
        setFeeStats(response.data.data);
      }
    } catch (error) {
      console.error('Failed to load fee stats:', error);
      toast.error('Failed to load Pump.fun fee stats');
    } finally {
      setLoading(false);
    }
  };

  const claimFees = async () => {
    try {
      setClaiming(true);
      const response = await axios.post(`${API_BASE}/admin/pumpfun/claim-fees`, {}, {
        headers: { 'x-admin-password': adminPassword }
      });
      
      if (response.data.success) {
        toast.success('Creator fees claimed successfully!');
        await loadFeeStats(); // Refresh stats
      }
    } catch (error) {
      console.error('Failed to claim fees:', error);
      toast.error('Failed to claim creator fees');
    } finally {
      setClaiming(false);
    }
  };

  const claimAndSendToWinner = async () => {
    if (!winnerAddress.trim()) {
      toast.error('Please enter a winner address');
      return;
    }

    try {
      setClaiming(true);
      const response = await axios.post(`${API_BASE}/admin/pumpfun/claim-and-send`, {
        winnerAddress: winnerAddress.trim()
      }, {
        headers: { 'x-admin-password': adminPassword }
      });
      
      if (response.data.success) {
        toast.success(`Fees claimed and sent to winner!`);
        setWinnerAddress('');
        await loadFeeStats(); // Refresh stats
      }
    } catch (error) {
      console.error('Failed to claim and send fees:', error);
      toast.error('Failed to claim and send fees to winner');
    } finally {
      setClaiming(false);
    }
  };

  const formatSOL = (lamports) => {
    return (lamports / 1000000000).toFixed(4);
  };

  if (loading && !feeStats) {
    return (
      <div className="text-center py-8">
        <div className="loading-spinner mx-auto mb-4"></div>
        <div className="text-gray-400">Loading Pump.fun fee data...</div>
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Fee Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="glass-strong p-4 rounded-xl text-center">
          <div className="text-2xl mb-2">💰</div>
          <div className="text-white font-bold">Total Fees</div>
          <div className="text-blue-400 text-lg">
            {feeStats ? `${formatSOL(feeStats.totalFees)} SOL` : '---'}
          </div>
        </div>

        <div className="glass-strong p-4 rounded-xl text-center">
          <div className="text-2xl mb-2">🎯</div>
          <div className="text-white font-bold">Claimable</div>
          <div className="text-green-400 text-lg">
            {feeStats ? `${formatSOL(feeStats.claimableFees)} SOL` : '---'}
          </div>
        </div>

        <div className="glass-strong p-4 rounded-xl text-center">
          <div className="text-2xl mb-2">📅</div>
          <div className="text-white font-bold">Last Claimed</div>
          <div className="text-gray-400 text-sm">
            {feeStats?.lastClaimed ? 
              new Date(feeStats.lastClaimed).toLocaleDateString() : 
              'Never'
            }
          </div>
        </div>
      </div>

      {/* Configuration Status */}
      <div className="glass-strong p-4 rounded-xl">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-white font-bold">Configuration Status</div>
            <div className="text-gray-400 text-sm">
              {feeStats?.isConfigured ? 
                'Creator wallet and hot wallet configured' : 
                'Missing wallet configuration'
              }
            </div>
          </div>
          <div className="text-2xl">
            {feeStats?.isConfigured ? '✅' : '❌'}
          </div>
        </div>
      </div>

      {/* Manual Fee Claiming */}
      <div className="glass-strong p-6 rounded-xl">
        <h4 className="text-lg font-bold text-white mb-4">💰 Manual Fee Claiming</h4>
        
        <div className="space-y-4">
          <button
            onClick={claimFees}
            disabled={claiming || !feeStats?.isConfigured || feeStats?.claimableFees <= 0}
            className="w-full btn-neon py-3"
          >
            {claiming ? 'Claiming...' : `Claim ${feeStats ? formatSOL(feeStats.claimableFees) : '0'} SOL`}
          </button>
          
          <div className="text-gray-400 text-xs text-center">
            Claims creator fees from Pump.fun to your creator wallet
          </div>
        </div>
      </div>

      {/* Claim and Send to Winner */}
      <div className="glass-strong p-6 rounded-xl">
        <h4 className="text-lg font-bold text-white mb-4">🎁 Claim & Send to Winner</h4>
        
        <div className="space-y-4">
          <input
            type="text"
            value={winnerAddress}
            onChange={(e) => setWinnerAddress(e.target.value)}
            placeholder="Enter winner wallet address"
            className="w-full p-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-400"
          />
          
          <button
            onClick={claimAndSendToWinner}
            disabled={claiming || !winnerAddress.trim() || !feeStats?.isConfigured || feeStats?.claimableFees <= 0}
            className="w-full btn-neon py-3"
          >
            {claiming ? 'Processing...' : `Claim & Send ${feeStats ? formatSOL(feeStats.claimableFees) : '0'} SOL`}
          </button>
          
          <div className="text-gray-400 text-xs text-center">
            Claims fees and automatically sends them to the specified winner
          </div>
        </div>
      </div>

      {/* Auto-Claim Settings */}
      <div className="glass-strong p-6 rounded-xl">
        <h4 className="text-lg font-bold text-white mb-4">⚡ Auto-Claim Settings</h4>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-white font-bold">Auto-Claim on Win</div>
              <div className="text-gray-400 text-sm">
                Claim fees to creator wallet, then send % to winner
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={autoClaimEnabled}
                onChange={(e) => setAutoClaimEnabled(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
            </label>
          </div>
          
          <div className="text-yellow-400 text-xs">
            ⚠️ Process: Claim fees → Creator wallet → Send % to winner (pot stays same)
          </div>
        </div>
      </div>

      {/* Test Fee Claiming */}
      <div className="glass-strong p-6 rounded-xl">
        <h4 className="text-lg font-bold text-white mb-4">🧪 Test Fee System</h4>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button
            onClick={async () => {
              try {
                const response = await axios.get(`${API_BASE}/admin/pumpfun/fees`, {
                  headers: { 'x-admin-password': adminPassword }
                });
                console.log('Fee API Test:', response.data);
                toast.success('Fee API working correctly!');
              } catch (error) {
                console.error('Fee API Test Failed:', error);
                toast.error('Fee API test failed');
              }
            }}
            className="btn-neon py-2"
          >
            🔍 Test Fee API
          </button>
          
          <button
            onClick={async () => {
              try {
                const testAddress = 'So11111111111111111111111111111111111111112'; // Test with WSOL address
                const response = await axios.post(`${API_BASE}/admin/pumpfun/claim-and-send`, {
                  winnerAddress: testAddress
                }, {
                  headers: { 'x-admin-password': adminPassword }
                });
                console.log('Claim Test:', response.data);
                toast.success('Claim test completed!');
              } catch (error) {
                console.error('Claim Test Failed:', error);
                toast.error('Claim test failed - check console');
              }
            }}
            className="btn-neon py-2"
          >
            🧪 Test Claim Flow
          </button>
        </div>
        
        <div className="text-gray-400 text-xs mt-2 text-center">
          Use these buttons to test the fee claiming system
        </div>
      </div>

      {/* Refresh Button */}
      <div className="flex justify-center">
        <button
          onClick={loadFeeStats}
          disabled={loading}
          className="btn-neon px-6 py-2"
        >
          {loading ? 'Refreshing...' : '🔄 Refresh Fee Data'}
        </button>
      </div>
    </motion.div>
  );
};

export default PumpFunPanel;