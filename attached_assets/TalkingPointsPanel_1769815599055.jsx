import React, { useState } from 'react';

export default function TalkingPointsPanel({ talkingPoints, analysis }) {
  const [copiedSection, setCopiedSection] = useState(null);
  const [expandedObjection, setExpandedObjection] = useState(null);

  const copyToClipboard = (text, section) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(section);
    setTimeout(() => setCopiedSection(null), 2000);
  };

  const CopyButton = ({ text, section }) => (
    <button
      onClick={() => copyToClipboard(text, section)}
      className="text-indigo-600 hover:text-indigo-700 text-sm font-medium flex items-center gap-1"
    >
      {copiedSection === section ? (
        <>✓ Copied!</>
      ) : (
        <>📋 Copy</>
      )}
    </button>
  );

  return (
    <div className="space-y-6">
      {/* Quick Stats Banner */}
      <div className="bg-indigo-600 rounded-xl p-4 text-white">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div>
            <p className="text-indigo-200 text-xs uppercase">Current Rate</p>
            <p className="text-xl font-bold">{talkingPoints.stats.currentRate}</p>
          </div>
          <div>
            <p className="text-indigo-200 text-xs uppercase">True Wholesale</p>
            <p className="text-xl font-bold">{talkingPoints.stats.trueWholesale}</p>
          </div>
          <div>
            <p className="text-indigo-200 text-xs uppercase">Monthly Savings</p>
            <p className="text-xl font-bold">{talkingPoints.stats.monthlySavings}</p>
          </div>
          <div>
            <p className="text-indigo-200 text-xs uppercase">Annual Savings</p>
            <p className="text-xl font-bold">{talkingPoints.stats.annualSavings}</p>
          </div>
        </div>
      </div>

      {/* Opening Statement */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex justify-between items-start mb-4">
          <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            🎯 Opening Statement
          </h3>
          <CopyButton text={talkingPoints.opening} section="opening" />
        </div>
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-gray-800 whitespace-pre-wrap text-sm leading-relaxed">
            {talkingPoints.opening}
          </p>
        </div>
      </div>

      {/* Key Facts */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex justify-between items-start mb-4">
          <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            📊 Key Facts to Share
          </h3>
          <CopyButton text={talkingPoints.keyFacts.join('\n')} section="keyFacts" />
        </div>
        <ul className="space-y-2">
          {talkingPoints.keyFacts.map((fact, idx) => (
            <li key={idx} className="flex items-start gap-2">
              <span className="text-indigo-500 font-bold">•</span>
              <span className="text-gray-700">{fact}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Red Flag Scripts */}
      {talkingPoints.redFlagScripts.length > 0 && (
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2 mb-4">
            🚨 Issue-Specific Scripts
          </h3>
          <div className="space-y-4">
            {talkingPoints.redFlagScripts.map((flag, idx) => (
              <div key={idx} className="border border-red-200 rounded-lg p-4 bg-red-50">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                      flag.severity === 'CRITICAL' ? 'bg-red-600 text-white' :
                      flag.severity === 'HIGH' ? 'bg-orange-500 text-white' :
                      'bg-yellow-500 text-white'
                    }`}>
                      {flag.severity}
                    </span>
                    <span className="font-semibold text-gray-900">{flag.issue}</span>
                  </div>
                  <span className="text-red-600 font-bold">{flag.impact}</span>
                </div>
                <p className="text-gray-700 text-sm italic">{flag.script}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Discovery Questions */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex justify-between items-start mb-4">
          <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            ❓ Discovery Questions
          </h3>
          <CopyButton text={talkingPoints.questions.join('\n\n')} section="questions" />
        </div>
        <ul className="space-y-3">
          {talkingPoints.questions.map((question, idx) => (
            <li key={idx} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
              <span className="bg-indigo-100 text-indigo-700 font-bold w-6 h-6 rounded-full flex items-center justify-center text-sm flex-shrink-0">
                {idx + 1}
              </span>
              <span className="text-gray-700">{question}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Objection Handlers */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2 mb-4">
          🛡️ Objection Handlers
        </h3>
        <div className="space-y-3">
          {Object.entries(talkingPoints.objections).map(([key, data]) => (
            <div key={key} className="border rounded-lg overflow-hidden">
              <button
                onClick={() => setExpandedObjection(expandedObjection === key ? null : key)}
                className="w-full flex justify-between items-center p-4 bg-gray-50 hover:bg-gray-100 transition"
              >
                <span className="font-medium text-gray-900">"{data.objection}"</span>
                <span className="text-gray-500">
                  {expandedObjection === key ? '▼' : '▶'}
                </span>
              </button>
              {expandedObjection === key && (
                <div className="p-4 border-t bg-white">
                  <div className="flex justify-end mb-2">
                    <CopyButton text={data.response} section={`objection-${key}`} />
                  </div>
                  <p className="text-gray-700 whitespace-pre-wrap text-sm leading-relaxed">
                    {data.response}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Value Props */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2 mb-4">
          ✨ PCBancard Value Propositions
        </h3>
        <div className="grid md:grid-cols-2 gap-4">
          {talkingPoints.valueProps.map((prop, idx) => (
            <div key={idx} className="flex items-start gap-3 p-3 bg-indigo-50 rounded-lg">
              <span className="text-indigo-600 text-xl">✓</span>
              <div>
                <p className="font-semibold text-gray-900">{prop.title}</p>
                <p className="text-sm text-gray-600">{prop.detail}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Dual Pricing Pitch */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex justify-between items-start mb-4">
          <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            💳 Dual Pricing Pitch
          </h3>
          <CopyButton text={talkingPoints.dualPricingPitch} section="dualPricing" />
        </div>
        <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
          <p className="text-gray-800 whitespace-pre-wrap text-sm leading-relaxed">
            {talkingPoints.dualPricingPitch}
          </p>
        </div>
      </div>

      {/* Interchange Plus Pitch */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex justify-between items-start mb-4">
          <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            📈 Interchange Plus Pitch
          </h3>
          <CopyButton text={talkingPoints.interchangePlusPitch} section="icPlus" />
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-gray-800 whitespace-pre-wrap text-sm leading-relaxed">
            {talkingPoints.interchangePlusPitch}
          </p>
        </div>
      </div>

      {/* Closing Statement */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex justify-between items-start mb-4">
          <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            🎬 Closing Statement
          </h3>
          <CopyButton text={talkingPoints.closing} section="closing" />
        </div>
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-gray-800 whitespace-pre-wrap text-sm leading-relaxed">
            {talkingPoints.closing}
          </p>
        </div>
      </div>

      {/* Print/Export Section */}
      <div className="bg-gray-100 rounded-xl p-6 text-center">
        <p className="text-gray-600 mb-3">Need a printable version?</p>
        <button 
          onClick={() => window.print()}
          className="bg-gray-800 text-white px-6 py-2 rounded-lg font-medium hover:bg-gray-700 transition"
        >
          🖨️ Print Talking Points
        </button>
      </div>
    </div>
  );
}
