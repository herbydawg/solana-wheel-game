import React, { useState } from 'react';
import { motion } from 'framer-motion';
import axios from 'axios';
import toast from 'react-hot-toast';
import GameConfigPanel from './GameConfigPanel';
import PumpFunPanel from './PumpFunPanel';

const AdminDashboard = () => {
  const [adminPassword, setAdminPassword] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [systemStatus, setSystemStatus] = useState(null);
  const [loading, setLoading] = useState(false);

  const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

  const authenticate = async () => {
    if (!adminPassword) {
      toast.error('Please enter admin password');
      return;
    }

    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE}/admin/status`, {
        headers: {
          'x-admin-password': adminPassword
        }
      });

      if (response.data.success) {
        setIsAuthenticated(true);
        setSystemStatus(response.data.data);
        toast.success('Admin access granted');
      }
    } catch (error) {
      toast.error('Invalid admin password');
    } finally {
      setLoading(false);
    }
  };

  const forceSpinNow = async () => {
    try {
      await axios.post(`${API_BASE}/admin/force-spin`, {}, {
        headers: { 'x-admin-password': adminPassword }
      });
      toast.success('Spin initiated successfully');
    } catch (error) {
      toast.error('Failed to force spin');
    }
  };

  const pauseGame = async () => {
    try {
      await axios.post(`${API_BASE}/admin/game/pause`, {}, {
        headers: { 'x-admin-password': adminPassword }
      });
      toast.success('Game paused');
    } catch (error) {
      toast.error('Failed to pause game');
    }
  };

  const resumeGame = async () => {
    try {
      await axios.post(`${API_BASE}/admin/game/resume`, {}, {
        headers: { 'x-admin-password': adminPassword }
      });
      toast.success('Game resumed');
    } catch (error) {
      toast.error('Failed to resume game');
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass-strong p-8 rounded-2xl max-w-md w-full"
        >
          <h2 className="text-2xl font-bold text-white mb-6 text-center">
            🔐 Admin Access
          </h2>
          
          <div className="space-y-4">
            <input
              type="password"
              placeholder="Enter admin password"
              value={adminPassword}
              onChange={(e) => setAdminPassword(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && authenticate()}
              className="w-full p-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-400"
            />
            
            <button
              onClick={authenticate}
              disabled={loading}
              className="w-full btn-neon py-3"
            >
              {loading ? 'Authenticating...' : 'Access Admin Panel'}
            </button>
          </div>
          
          <div className="mt-6 text-center">
            <a 
              href="/"
              className="text-gray-400 hover:text-white transition-colors text-sm"
            >
              ← Back to Game
            </a>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 lg:p-8">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-6xl mx-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-white">
            🛠️ Admin Dashboard
          </h1>
          <a 
            href="/"
            className="btn-neon"
          >
            View Game
          </a>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <button
            onClick={forceSpinNow}
            className="glass-strong p-4 rounded-xl hover:bg-white/10 transition-colors text-left"
          >
            <div className="text-2xl mb-2">🎰</div>
            <div className="text-white font-bold">Force Spin Now</div>
            <div className="text-gray-400 text-sm">Trigger immediate wheel spin</div>
          </button>

          <button
            onClick={pauseGame}
            className="glass-strong p-4 rounded-xl hover:bg-white/10 transition-colors text-left"
          >
            <div className="text-2xl mb-2">⏸️</div>
            <div className="text-white font-bold">Pause Game</div>
            <div className="text-gray-400 text-sm">Stop all game operations</div>
          </button>

          <button
            onClick={resumeGame}
            className="glass-strong p-4 rounded-xl hover:bg-white/10 transition-colors text-left"
          >
            <div className="text-2xl mb-2">▶️</div>
            <div className="text-white font-bold">Resume Game</div>
            <div className="text-gray-400 text-sm">Restart game operations</div>
          </button>
        </div>

        {/* Game Configuration */}
        <div className="glass-strong p-6 rounded-2xl mb-8">
          <h3 className="text-xl font-bold text-white mb-4">🎮 Game Configuration</h3>
          <GameConfigPanel adminPassword={adminPassword} />
        </div>

        {/* Pump.fun Fee Management */}
        <div className="glass-strong p-6 rounded-2xl mb-8">
          <h3 className="text-xl font-bold text-white mb-4">🚀 Pump.fun Fee Management</h3>
          <PumpFunPanel adminPassword={adminPassword} />
        </div>

        {/* System Status */}
        {systemStatus && (
          <div className="glass-strong p-6 rounded-2xl">
            <h3 className="text-xl font-bold text-white mb-4">System Status</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl mb-2">
                  {systemStatus.services?.solana ? '✅' : '❌'}
                </div>
                <div className="text-white font-bold">Solana</div>
                <div className="text-gray-400 text-sm">
                  {systemStatus.services?.solana ? 'Connected' : 'Disconnected'}
                </div>
              </div>

              <div className="text-center">
                <div className="text-2xl mb-2">
                  {systemStatus.services?.holderTracker ? '✅' : '❌'}
                </div>
                <div className="text-white font-bold">Holder Tracker</div>
                <div className="text-gray-400 text-sm">
                  {systemStatus.services?.holderTracker ? 'Active' : 'Inactive'}
                </div>
              </div>

              <div className="text-center">
                <div className="text-2xl mb-2">
                  {systemStatus.services?.gameEngine ? '✅' : '❌'}
                </div>
                <div className="text-white font-bold">Game Engine</div>
                <div className="text-gray-400 text-sm">
                  {systemStatus.services?.gameEngine ? 'Running' : 'Stopped'}
                </div>
              </div>

              <div className="text-center">
                <div className="text-2xl mb-2">
                  {systemStatus.services?.payouts ? '✅' : '❌'}
                </div>
                <div className="text-white font-bold">Payouts</div>
                <div className="text-gray-400 text-sm">
                  {systemStatus.services?.payouts ? 'Ready' : 'Issues'}
                </div>
              </div>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default AdminDashboard;