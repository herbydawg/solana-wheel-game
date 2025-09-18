import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import axios from 'axios';
import toast from 'react-hot-toast';

const GameConfigPanel = ({ adminPassword }) => {
  const [config, setConfig] = useState({
    tokenMintAddress: '',
    feeCollectionWallet: '',
    creatorWallet: '',
    minimumHoldPercentage: 0.01,
    spinIntervalMinutes: 5,
    winnerPayoutPercentage: 100,
    creatorPayoutPercentage: 0,
    blacklistedAddresses: []
  });
  
  const [newBlacklistAddress, setNewBlacklistAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

  // Load current configuration
  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE}/admin/config`, {
        headers: { 'x-admin-password': adminPassword }
      });
      
      if (response.data.success) {
        setConfig(response.data.data);
      }
    } catch (error) {
      console.error('Failed to load config:', error);
      toast.error('Failed to load configuration');
    } finally {
      setLoading(false);
    }
  };

  const saveConfig = async () => {
    try {
      setSaving(true);
      const response = await axios.post(`${API_BASE}/admin/config`, config, {
        headers: { 'x-admin-password': adminPassword }
      });
      
      if (response.data.success) {
        toast.success('Configuration saved successfully');
      }
    } catch (error) {
      console.error('Failed to save config:', error);
      toast.error('Failed to save configuration');
    } finally {
      setSaving(false);
    }
  };

  const addBlacklistAddress = () => {
    if (!newBlacklistAddress.trim()) {
      toast.error('Please enter a valid address');
      return;
    }

    if (config.blacklistedAddresses.includes(newBlacklistAddress.trim())) {
      toast.error('Address already blacklisted');
      return;
    }

    setConfig(prev => ({
      ...prev,
      blacklistedAddresses: [...prev.blacklistedAddresses, newBlacklistAddress.trim()]
    }));
    setNewBlacklistAddress('');
    toast.success('Address added to blacklist');
  };

  const removeBlacklistAddress = (address) => {
    setConfig(prev => ({
      ...prev,
      blacklistedAddresses: prev.blacklistedAddresses.filter(addr => addr !== address)
    }));
    toast.success('Address removed from blacklist');
  };

  const handleInputChange = (field, value) => {
    setConfig(prev => ({
      ...prev,
      [field]: value
    }));
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="loading-spinner mx-auto mb-4"></div>
        <div className="text-gray-400">Loading configuration...</div>
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Token Configuration */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <label className="block text-white font-bold mb-2">
            🪙 Token Mint Address
          </label>
          <input
            type="text"
            value={config.tokenMintAddress}
            onChange={(e) => handleInputChange('tokenMintAddress', e.target.value)}
            placeholder="Enter Solana token mint address"
            className="w-full p-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-400"
          />
          <div className="text-gray-400 text-xs mt-1">
            The SPL token address for the game
          </div>
        </div>

        <div>
          <label className="block text-white font-bold mb-2">
            💰 Fee Collection Wallet
          </label>
          <input
            type="text"
            value={config.feeCollectionWallet}
            onChange={(e) => handleInputChange('feeCollectionWallet', e.target.value)}
            placeholder="Enter fee collection wallet address"
            className="w-full p-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-400"
          />
          <div className="text-gray-400 text-xs mt-1">
            Where fees are collected
          </div>
        </div>
      </div>

      {/* Game Settings */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div>
          <label className="block text-white font-bold mb-2">
            📊 Minimum Hold %
          </label>
          <input
            type="number"
            step="0.01"
            min="0"
            max="100"
            value={config.minimumHoldPercentage}
            onChange={(e) => handleInputChange('minimumHoldPercentage', parseFloat(e.target.value))}
            className="w-full p-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-400"
          />
          <div className="text-gray-400 text-xs mt-1">
            Minimum % of supply to be eligible
          </div>
        </div>

        <div>
          <label className="block text-white font-bold mb-2">
            ⏰ Spin Interval (minutes)
          </label>
          <input
            type="number"
            min="1"
            max="60"
            value={config.spinIntervalMinutes}
            onChange={(e) => handleInputChange('spinIntervalMinutes', parseInt(e.target.value))}
            className="w-full p-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-400"
          />
          <div className="text-gray-400 text-xs mt-1">
            Time between automatic spins
          </div>
        </div>

        <div>
          <label className="block text-white font-bold mb-2">
            🏆 Winner Payout %
          </label>
          <input
            type="number"
            min="0"
            max="100"
            value={config.winnerPayoutPercentage}
            onChange={(e) => handleInputChange('winnerPayoutPercentage', parseInt(e.target.value))}
            className="w-full p-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-400"
          />
          <div className="text-gray-400 text-xs mt-1">
            Percentage of pot paid to winner
          </div>
        </div>
      </div>

      {/* Blacklist Management */}
      <div>
        <label className="block text-white font-bold mb-2">
          🚫 Blacklisted Addresses
        </label>
        
        <div className="flex gap-2 mb-4">
          <input
            type="text"
            value={newBlacklistAddress}
            onChange={(e) => setNewBlacklistAddress(e.target.value)}
            placeholder="Enter address to blacklist"
            className="flex-1 p-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-400"
          />
          <button
            onClick={addBlacklistAddress}
            className="btn-neon px-6"
          >
            Add
          </button>
        </div>

        <div className="space-y-2 max-h-40 overflow-y-auto">
          {config.blacklistedAddresses.length === 0 ? (
            <div className="text-gray-400 text-center py-4">
              No blacklisted addresses
            </div>
          ) : (
            config.blacklistedAddresses.map((address, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 bg-white/5 rounded-lg"
              >
                <span className="text-white font-mono text-sm">
                  {address.slice(0, 8)}...{address.slice(-8)}
                </span>
                <button
                  onClick={() => removeBlacklistAddress(address)}
                  className="text-red-400 hover:text-red-300 transition-colors"
                >
                  ❌
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          onClick={saveConfig}
          disabled={saving}
          className="btn-neon px-8 py-3"
        >
          {saving ? 'Saving...' : '💾 Save Configuration'}
        </button>
      </div>
    </motion.div>
  );
};

export default GameConfigPanel;