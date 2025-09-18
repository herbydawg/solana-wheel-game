import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useGame } from '../contexts/GameContext';

const EligibilityChecker = () => {
  const { checkHolderEligibility } = useGame();
  const [address, setAddress] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const checkEligibility = async () => {
    if (!address.trim()) return;

    setLoading(true);
    try {
      // Use the API to check eligibility in real-time
      const eligibilityData = await checkHolderEligibility(address.trim());

      if (eligibilityData) {
        const { isEligible, holder } = eligibilityData;

        setResult({
          isEligible: isEligible,
          balance: holder?.balance || 0,
          percentage: holder?.percentage || 0,
          address: address.trim()
        });
      } else {
        setResult({
          isEligible: false,
          balance: 0,
          percentage: 0,
          address: address.trim()
        });
      }
    } catch (error) {
      console.error('Eligibility check error:', error);
      setResult({
        isEligible: false,
        error: 'Failed to check eligibility. Please try again.',
        address: address.trim()
      });
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      checkEligibility();
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full max-w-lg mx-auto mb-2"
    >
      <div className="glass-strong p-3 rounded-xl">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h3 className="text-white font-bold text-xs">🎫 Eligibility Checker</h3>
            <p className="text-gray-400 text-xs">Check wallet eligibility</p>
          </div>
          <div className="flex gap-1">
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Solana address..."
              className="px-2 py-1 bg-black/30 border border-white/20 rounded text-white text-xs placeholder-gray-500 focus:outline-none focus:border-blue-400 w-32"
            />
            <button
              onClick={checkEligibility}
              disabled={loading || !address.trim()}
              className="px-3 py-1 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-500 disabled:opacity-50 disabled:cursor-not-allowed rounded text-white text-xs font-medium transition-colors"
            >
              {loading ? '...' : 'Check'}
            </button>
          </div>
        </div>

        {result && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className={`p-2 rounded text-center text-xs ${
              result.isEligible
                ? 'bg-green-500/20 border border-green-500/30'
                : 'bg-red-500/20 border border-red-500/30'
            }`}
          >
            {result.error ? (
              <div className="text-red-400">{result.error}</div>
            ) : (
              <div className="flex items-center justify-between">
                <div className={`font-bold ${result.isEligible ? 'text-green-400' : 'text-red-400'}`}>
                  {result.isEligible ? '✅ Eligible' : '❌ Not Eligible'}
                </div>
                {result.isEligible && (
                  <div className="text-gray-300 text-xs">
                    {(result.balance / 1000000).toFixed(1)}M • {result.percentage?.toFixed(2) || '0.00'}%
                  </div>
                )}
                <a
                  href={`https://solscan.io/account/${result.address}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:text-blue-300 text-xs underline"
                >
                  ↗
                </a>
              </div>
            )}
          </motion.div>
        )}
      </div>
    </motion.div>
  );
};

export default EligibilityChecker;