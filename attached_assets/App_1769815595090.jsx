import React, { useState } from 'react';
import StatementInput from './components/StatementInput';
import AnalysisResults from './components/AnalysisResults';
import TalkingPointsPanel from './components/TalkingPointsPanel';
import { analyzeStatement } from './services/analysisEngine';
import { generateTalkingPoints } from './services/talkingPoints';
import { getAIAnalysis } from './services/claudeService';

function App() {
  const [analysis, setAnalysis] = useState(null);
  const [talkingPoints, setTalkingPoints] = useState(null);
  const [aiInsights, setAiInsights] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('input');

  const handleAnalyze = async (statementData) => {
    setLoading(true);
    setAiInsights(null);
    
    try {
      // Run the analysis
      const results = analyzeStatement(statementData);
      
      // Calculate savings properly
      const icPlusSavings = results.current.totalFees - results.pcbancard.interchangePlus.totalCost;
      const dualPricingSavings = results.current.totalFees - results.pcbancard.dualPricing.totalCost;
      
      results.pcbancard.interchangePlus.monthlySavings = icPlusSavings;
      results.pcbancard.interchangePlus.annualSavings = icPlusSavings * 12;
      results.pcbancard.dualPricing.monthlySavings = dualPricingSavings;
      results.pcbancard.dualPricing.annualSavings = dualPricingSavings * 12;
      
      setAnalysis(results);
      
      // Generate talking points
      const points = generateTalkingPoints(results);
      setTalkingPoints(points);
      
      // Switch to results tab
      setActiveTab('results');
      
      // Get AI insights (async, non-blocking)
      getAIAnalysis(statementData, results).then(insights => {
        if (insights) {
          setAiInsights(insights);
        }
      });
      
    } catch (error) {
      console.error('Analysis failed:', error);
      alert('Analysis failed. Please check your inputs and try again.');
    }
    
    setLoading(false);
  };

  const handleReset = () => {
    setAnalysis(null);
    setTalkingPoints(null);
    setAiInsights(null);
    setActiveTab('input');
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-indigo-700 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">PCBancard Statement Analyzer</h1>
              <p className="text-indigo-200 text-sm">Powered by AI • Find Savings • Win Deals</p>
            </div>
            {analysis && (
              <button
                onClick={handleReset}
                className="bg-indigo-600 hover:bg-indigo-500 px-4 py-2 rounded-lg text-sm font-medium transition"
              >
                New Analysis
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Tab Navigation */}
      {analysis && (
        <div className="bg-white border-b">
          <div className="max-w-7xl mx-auto px-4">
            <nav className="flex space-x-8">
              {[
                { id: 'results', label: '📊 Analysis Results' },
                { id: 'talking', label: '🗣️ Talking Points' },
                { id: 'ai', label: '🤖 AI Insights' }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm transition ${
                    activeTab === tab.id
                      ? 'border-indigo-500 text-indigo-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Input Form */}
        {activeTab === 'input' && !analysis && (
          <StatementInput onAnalyze={handleAnalyze} loading={loading} />
        )}

        {/* Analysis Results */}
        {activeTab === 'results' && analysis && (
          <AnalysisResults analysis={analysis} />
        )}

        {/* Talking Points */}
        {activeTab === 'talking' && talkingPoints && (
          <TalkingPointsPanel talkingPoints={talkingPoints} analysis={analysis} />
        )}

        {/* AI Insights */}
        {activeTab === 'ai' && (
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              🤖 AI-Powered Insights
            </h2>
            
            {aiInsights ? (
              <div className="prose max-w-none">
                <pre className="whitespace-pre-wrap text-sm bg-gray-50 p-4 rounded-lg overflow-auto">
                  {aiInsights}
                </pre>
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="animate-pulse flex flex-col items-center">
                  <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center mb-4">
                    <svg className="w-6 h-6 text-indigo-600 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  </div>
                  <p className="text-gray-600">Claude is analyzing the statement...</p>
                  <p className="text-sm text-gray-400 mt-1">This may take a few seconds</p>
                </div>
              </div>
            )}
            
            {!aiInsights && !loading && (
              <div className="mt-4 p-4 bg-yellow-50 rounded-lg">
                <p className="text-sm text-yellow-800">
                  💡 AI insights require an Anthropic API key. Add VITE_ANTHROPIC_API_KEY to your environment.
                </p>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-gray-800 text-gray-400 mt-auto">
        <div className="max-w-7xl mx-auto px-4 py-6 text-center text-sm">
          <p>PCBancard Statement Analyzer • Built for Sales Agents</p>
          <p className="mt-1">Interchange rates are estimates. Actual rates vary based on card mix and qualification.</p>
        </div>
      </footer>
    </div>
  );
}

export default App;
