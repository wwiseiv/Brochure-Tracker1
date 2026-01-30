import React from 'react';

export default function ProcessingStatus({ 
  progress, 
  currentFile, 
  stage,
  filesCount 
}) {
  const stages = [
    { id: 'parsing', label: 'Parsing Files', icon: '📄' },
    { id: 'extracting', label: 'Extracting Data', icon: '🔍' },
    { id: 'analyzing', label: 'Analyzing Statement', icon: '📊' },
    { id: 'generating', label: 'Generating Insights', icon: '🤖' }
  ];

  const currentStageIndex = stages.findIndex(s => s.id === stage);

  return (
    <div className="max-w-xl mx-auto">
      <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-700 px-6 py-6 text-center">
          <div className="w-20 h-20 mx-auto bg-white/20 rounded-full flex items-center justify-center mb-4">
            <svg className="w-10 h-10 text-white animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-white">Processing Statement</h2>
          <p className="text-indigo-200 mt-1">
            {currentFile ? `Processing: ${currentFile}` : 'Please wait...'}
          </p>
        </div>

        <div className="p-6">
          {/* Progress bar */}
          <div className="mb-6">
            <div className="flex justify-between text-sm text-gray-600 mb-2">
              <span>Progress</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {/* Stage indicators */}
          <div className="space-y-3">
            {stages.map((stageItem, index) => {
              const isComplete = index < currentStageIndex;
              const isCurrent = index === currentStageIndex;
              const isPending = index > currentStageIndex;

              return (
                <div 
                  key={stageItem.id}
                  className={`
                    flex items-center gap-3 p-3 rounded-lg transition-all
                    ${isComplete ? 'bg-green-50' : ''}
                    ${isCurrent ? 'bg-indigo-50 ring-2 ring-indigo-200' : ''}
                    ${isPending ? 'bg-gray-50 opacity-50' : ''}
                  `}
                >
                  <div className={`
                    w-10 h-10 rounded-full flex items-center justify-center text-xl
                    ${isComplete ? 'bg-green-100' : ''}
                    ${isCurrent ? 'bg-indigo-100 animate-pulse' : ''}
                    ${isPending ? 'bg-gray-100' : ''}
                  `}>
                    {isComplete ? '✓' : stageItem.icon}
                  </div>
                  <div className="flex-1">
                    <p className={`font-medium ${isComplete ? 'text-green-700' : isCurrent ? 'text-indigo-700' : 'text-gray-500'}`}>
                      {stageItem.label}
                    </p>
                    {isCurrent && (
                      <p className="text-sm text-indigo-600">
                        {stage === 'parsing' && `Processing ${filesCount} file${filesCount > 1 ? 's' : ''}...`}
                        {stage === 'extracting' && 'Identifying key data points...'}
                        {stage === 'analyzing' && 'Calculating interchange and savings...'}
                        {stage === 'generating' && 'Creating talking points...'}
                      </p>
                    )}
                  </div>
                  {isComplete && (
                    <svg className="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
              );
            })}
          </div>

          {/* Info message */}
          <div className="mt-6 p-4 bg-yellow-50 rounded-lg">
            <div className="flex gap-3">
              <span className="text-xl">💡</span>
              <div className="text-sm text-yellow-800">
                <p className="font-medium">Pro tip:</p>
                <p>Image files may take longer due to OCR processing. PDF and Excel files are faster.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
