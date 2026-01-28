import React from 'react';
import { useSessionStore } from '../../store/gameStore';
import { calculateDataSufficiency, calculateRegionalAnalysis } from '../../utils/heatmap';
import { BOARD_REGIONS } from '../../utils/constants';
import { Button } from '../ui/Button';

export const Insights = ({ onBack }) => {
  const sessions = useSessionStore(state => state.sessions);
  
  const dataSufficiency = calculateDataSufficiency(sessions);
  const regionalAnalysis = calculateRegionalAnalysis(sessions);
  
  const sortedRegions = Object.entries(regionalAnalysis).sort((a, b) => a[1].score - b[1].score);
  const weakest = sortedRegions[0];
  const strongest = sortedRegions[sortedRegions.length - 1];
  
  const meanScore = sortedRegions.reduce((sum, r) => sum + r[1].score, 0) / sortedRegions.length;

  const getRegionDescription = (name) => {
    switch (name) {
      case 'Top': return 'the top of the board';
      case 'Right': return 'the right side of the board';
      case 'Bottom': return 'the bottom of the board';
      case 'Left': return 'the left side of the board';
      default: return name;
    }
  };

  return (
    <>
      {!dataSufficiency.hasMinimum ? (
        // PROGRESS METER - Not enough data yet
        <div className="bg-gray-900 rounded-lg p-6 mb-6 border border-gray-800">
          <h3 className="text-base font-bold mb-4 text-pink-400">
            ⚠ NOT ENOUGH DATA FOR RECOMMENDATIONS
          </h3>
          
          <p className="text-sm text-gray-300 mb-6">
            Good news: You need to throw more darts!<br/><br/>
            I need more data to provide real advice. Once these thresholds are met, 
            I can tell you what the data says you should work on.
          </p>
          
          <div className="mb-6">
            <div className="flex justify-between mb-2">
              <span className="text-sm text-gray-300">Total Darts</span>
              <span className="text-sm font-bold text-white">
                {dataSufficiency.totalAttempts} / 360
              </span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-4">
              <div 
                className={`h-4 rounded-full transition-all ${
                  dataSufficiency.totalAttempts >= 360 ? 'bg-purple-600' : 'bg-yellow-500'
                }`}
                style={{ width: `${Math.min(100, (dataSufficiency.totalAttempts / 360) * 100)}%` }}
              />
            </div>
          </div>

          <div className="space-y-2">
            {Object.entries(dataSufficiency.regionData).map(([key, darts]) => (
              <div key={key} className="text-sm">
                <span className="text-gray-300 capitalize">{BOARD_REGIONS[key].name}: </span>
                <span className={`font-bold ${darts >= 90 ? 'text-green-400' : 'text-purple-400'}`}>
                  {darts >= 90 ? 'Sufficient data' : 'Not sufficient data'}
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        // RECOMMENDATION - Enough data
        <div 
          className="rounded-lg p-6 border-2"
          style={{
            background: 'linear-gradient(145deg, #374151, #1f2937)',
            borderColor: '#fbbf24'
          }}
        >
          <h3 className="text-2xl font-bold mb-4 text-pink-400">💡 YOUR PRACTICE FOCUS</h3>
          <p className="text-lg text-white mb-6">
            The data says you need to work on {getRegionDescription(weakest[1].name)}. 
            Your efficiency there is {((meanScore - weakest[1].score) / meanScore * 100).toFixed(0)}% 
            lower than everyplace else on the board.
            <br/><br/>
            Your strongest area is {getRegionDescription(strongest[1].name)}, 
            where your efficiency is {((strongest[1].score - meanScore) / meanScore * 100).toFixed(0)}% 
            greater than the other areas.
          </p>
          <button 
            className="w-full py-3 px-4 rounded-lg font-bold text-base transition-all border-2"
            style={{
              backgroundColor: '#1f2937',
              borderColor: '#fbbf24',
              color: '#9ca3af',
              cursor: 'not-allowed'
            }}
            disabled
          >
            🎯 TARGETED PRACTICE MODE (COMING SOON)
          </button>
        </div>
      )}
      
      {/* Back button */}
      <Button 
        onClick={onBack}
        className="w-full mt-8"
        size="lg"
        style={{ background: 'linear-gradient(145deg, #7c3aed, #5b21b6)' }}
      >
        ← BACK TO TRAINING
      </Button>
    </>
  );
};
