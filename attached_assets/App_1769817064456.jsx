import React, { useState, useEffect } from 'react';
import FileUpload from './components/FileUpload';
import ProcessingStatus from './components/ProcessingStatus';
import ManualEntry from './components/ManualEntry';
import AnalysisResults from './components/AnalysisResults';
import TalkingPointsPanel from './components/TalkingPointsPanel';
import { parseMultipleFiles } from './services/fileParser';
import { extractStatementData, getAIAnalysis } from './services/claudeService';
import { analyzeStatement } from './services/analysisEngine';
import { generateTalkingPoints } from './services/talkingPoints';

// Get API key from environment
const ANTHROPIC_API_KEY = import.meta.env.VITE_ANTHROPIC_API_KEY || '';

function App() {
  const [view, setView] = useState('upload'); // upload, processing, manual, results
  const [activeTab, setActiveTab] = useState('results'); // results, talking
  
  // Processing state
  const [progress, setProgress] = useState(0);
  const [currentFile, setCurrentFile] = useState('');
  const [processingStage, setProcessingStage] = useState('parsing');
  const [filesCount, setFilesCount] = useState(0);
  
  // Data state
  const [parsedText, setParsedText] = useState('');
  const [extractedData, setExtractedData] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [talkingPoints, setTalkingPoints] = useState(null);
  const [aiInsights, setAiInsights] = useState(null);

  // Handle file upload
  const handleFilesSelected = async (files) => {
    setView('processing');
    setFilesCount(files.length);
    setProgress(0);
    setProcessingStage('parsing');
    
    try {
      // Stage 1: Parse files
      const parseResult = await parseMultipleFiles(files, (prog, fileName) => {
        setProgress(prog * 0.4); // 0-40%
        setCurrentFile(fileName);
      });
      
      setParsedText(parseResult.combinedText);
      
      if (!parseResult.combinedText) {
        // No text extracted, go to manual entry
        setView('manual');
        return;
      }
      
      // Stage 2: Extract data
      setProcessingStage('extracting');
      setProgress(50);
      
      const extracted = await extractStatementData(parseResult.combinedText, ANTHROPIC_API_KEY);
      setExtractedData(extracted);
      
      if (!extracted.success || !extracted.data.totalVolume) {
        // Couldn't extract key data, go to manual with what we have
        setView('manual');
        return;
      }
      
      // Stage 3: Analyze
      setProcessingStage('analyzing');
      setProgress(70);
      
      const analysisResult = analyzeStatement(extracted.data);
      setAnalysis(analysisResult);
      
      // Stage 4: Generate talking points
      setProcessingStage('generating');
      setProgress(85);
      
      const points = generateTalkingPoints(analysisResult);
      setTalkingPoints(points);
      
      // Get AI insights (non-blocking)
      if (ANTHROPIC_API_KEY) {
        getAIAnalysis(extracted.data, analysisResult, ANTHROPIC_API_KEY)
          .then(insights => {
            if (insights) setAiInsights(insights);
          });
      }
      
      setProgress(100);
      setTimeout(() => setView('results'), 500);
      
    } catch (error) {
      console.error('Processing error:', error);
      setView('manual');
    }
  };

  // Handle manual entry
  const handleManualSubmit = (data) => {
    const analysisResult = analyzeStatement(data);
    setAnalysis(analysisResult);
    setExtractedData({ data, source: 'manual' });
    
    const points = generateTalkingPoints(analysisResult);
    setTalkingPoints(points);
    
    // Get AI insights
    if (ANTHROPIC_API_KEY) {
      getAIAnalysis(data, analysisResult, ANTHROPIC_API_KEY)
        .then(insights => {
          if (insights) setAiInsights(insights);
        });
    }
    
    setView('results');
  };

  // Reset everything
  const handleReset = () => {
    setView('upload');
    setActiveTab('results');
    setProgress(0);
    setCurrentFile('');
    setProcessingStage('parsing');
    setParsedText('');
    setExtractedData(null);
    setAnalysis(null);
    setTalkingPoints(null);
    setAiInsights(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <header className="bg-gradient-to-r from-indigo-700 via-indigo-800 to-purple-800 text-white shadow-lg">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">PCBancard Statement Analyzer</h1>
              <p className="text-indigo-200 text-sm mt-0.5">
                AI-Powered • Upload Statement or Enter Data • Generate Talking Points
              </p>
            </div>
            {view === 'results' && (
              <button
                onClick={handleReset}
                className="bg-white/10 hover:bg-white/20 backdrop-blur px-4 py-2 rounded-lg text-sm font-medium transition"
              >
                ← New Analysis
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Tab Navigation (only show on results) */}
      {view === 'results' && (
        <div className="bg-white border-b shadow-sm sticky top-0 z-10">
          <div className="max-w-6xl mx-auto px-4">
            <nav className="flex space-x-1">
              {[
                { id: 'results', label: '📊 Analysis Results', icon: '📊' },
                { id: 'talking', label: '🗣️ Talking Points', icon: '🗣️' }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-4 px-6 font-medium text-sm transition border-b-2 ${
                    activeTab === tab.id
                      ? 'border-indigo-500 text-indigo-600 bg-indigo-50/50'
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
      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Upload View */}
        {view === 'upload' && (
          <FileUpload 
            onFilesSelected={handleFilesSelected}
            onSkip={() => setView('manual')}
          />
        )}

        {/* Processing View */}
        {view === 'processing' && (
          <ProcessingStatus
            progress={progress}
            currentFile={currentFile}
            stage={processingStage}
            filesCount={filesCount}
          />
        )}

        {/* Manual Entry View */}
        {view === 'manual' && (
          <ManualEntry
            onSubmit={handleManualSubmit}
            onBack={() => setView('upload')}
            prefillData={extractedData?.data}
          />
        )}

        {/* Results View */}
        {view === 'results' && (
          <>
            {activeTab === 'results' && (
              <AnalysisResults 
                analysis={analysis} 
                extractedData={extractedData}
              />
            )}
            {activeTab === 'talking' && (
              <TalkingPointsPanel 
                talkingPoints={talkingPoints}
                analysis={analysis}
                aiInsights={aiInsights}
              />
            )}
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-gray-800 text-gray-400 mt-auto">
        <div className="max-w-6xl mx-auto px-4 py-6 text-center text-sm">
          <p>PCBancard Statement Analyzer v2.0 • Built for Sales Agents</p>
          <p className="mt-1">
            {ANTHROPIC_API_KEY 
              ? '🟢 AI Features Enabled' 
              : '🟡 Add VITE_ANTHROPIC_API_KEY to enable AI features'}
          </p>
          <p className="mt-1 text-gray-500">
            Interchange rates are estimates. Actual rates vary based on card mix and qualification.
          </p>
        </div>
      </footer>
    </div>
  );
}

export default App;
