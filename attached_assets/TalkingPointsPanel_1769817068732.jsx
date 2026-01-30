import React, { useState } from 'react';
import { formatCurrency, formatPercent } from '../services/analysisEngine.js';

export default function TalkingPointsPanel({ talkingPoints, analysis, aiInsights }) {
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
      className="text-indigo-600 hover:text-indigo-700 text-sm font-medium flex items-center gap-1 transition"
    >
      {copiedSection === section ? (
        <><span className="text-green-600">✓</span> Copied!</>
      ) : (
        <>📋 Copy</>
      )}
    </button>
  );

  if (!talkingPoints) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Quick Stats Banner */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-4 text-white">
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

      {/* AI Insights */}
      {aiInsights && (
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2 mb-4">
            🤖 AI-Powered Insights
          </h3>
          <div className="bg-purple-50 rounded-xl p-4">
            <pre className="whitespace-pre-wrap text-sm text-gray-800 leading-relaxed font-sans">
              {aiInsights}
            </pre>
          </div>
        </div>
      )}

      {/* Opening Statement */}
      <div className="bg-white rounded-2xl shadow-lg p-6">
        <div className="flex justify-between items-start mb-4">
          <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            🎯 Opening Statement
          </h3>
          <CopyButton text={talkingPoints.opening} section="opening" />
        </div>
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
          <pre className="whitespace-pre-wrap text-sm text-gray-800 leading-relaxed font-sans">
            {talkingPoints.opening}
          </pre>
        </div>
      </div>

      {/* Key Facts */}
      <div className="bg-white rounded-2xl shadow-lg p-6">
        <div className="flex justify-between items-start mb-4">
          <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            📊 Key Facts to Share
          </h3>
          <CopyButton text={talkingPoints.keyFacts.join('\n')} section="keyFacts" />
        </div>
        <ul className="space-y-2">
          {talkingPoints.keyFacts.map((fact, idx) => (
            <li key={idx} className="flex items-start gap-3 p-2">
              <span className="w-6 h-6 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">
                {idx + 1}
              </span>
              <span className="text-gray-700">{fact}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Discovery Questions */}
      <div className="bg-white rounded-2xl shadow-lg p-6">
        <div className="flex justify-between items-start mb-4">
          <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            ❓ Discovery Questions
          </h3>
          <CopyButton text={talkingPoints.questions.join('\n\n')} section="questions" />
        </div>
        <div className="space-y-2">
          {talkingPoints.questions.map((question, idx) => (
            <div key={idx} className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl">
              <span className="w-8 h-8 bg-indigo-100 text-indigo-700 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">
                Q{idx + 1}
              </span>
              <span className="text-gray-700 pt-1">{question}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Objection Handlers */}
      <div className="bg-white rounded-2xl shadow-lg p-6">
        <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2 mb-4">
          🛡️ Objection Handlers
        </h3>
        <div className="space-y-3">
          {Object.entries(talkingPoints.objections).map(([key, data]) => (
            <details 
              key={key} 
              className="group border border-gray-200 rounded-xl overflow-hidden"
              open={expandedObjection === key}
            >
              <summary 
                onClick={(e) => {
                  e.preventDefault();
                  setExpandedObjection(expandedObjection === key ? null : key);
                }}
                className="p-4 bg-gray-50 hover:bg-gray-100 cursor-pointer font-medium text-gray-900 flex justify-between items-center transition"
              >
                <span>"{data.objection}"</span>
                <span className="text-gray-400 group-open:rotate-180 transition-transform">▼</span>
              </summary>
              <div className="p-4 border-t bg-white">
                <div className="flex justify-end mb-3">
                  <CopyButton text={data.response} section={`objection-${key}`} />
                </div>
                <pre className="whitespace-pre-wrap text-sm text-gray-700 leading-relaxed font-sans">
                  {data.response}
                </pre>
              </div>
            </details>
          ))}
        </div>
      </div>

      {/* Value Props */}
      <div className="bg-white rounded-2xl shadow-lg p-6">
        <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2 mb-4">
          ✨ PCBancard Value Propositions
        </h3>
        <div className="grid md:grid-cols-2 gap-3">
          {talkingPoints.valueProps.map((prop, idx) => (
            <div key={idx} className="flex items-start gap-3 p-3 bg-indigo-50 rounded-xl">
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
      <div className="bg-white rounded-2xl shadow-lg p-6">
        <div className="flex justify-between items-start mb-4">
          <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            💳 Dual Pricing Pitch
          </h3>
          <CopyButton text={talkingPoints.dualPricingPitch} section="dualPricing" />
        </div>
        <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4">
          <pre className="whitespace-pre-wrap text-sm text-gray-800 leading-relaxed font-sans">
            {talkingPoints.dualPricingPitch}
          </pre>
        </div>
      </div>

      {/* IC+ Pitch */}
      <div className="bg-white rounded-2xl shadow-lg p-6">
        <div className="flex justify-between items-start mb-4">
          <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            📈 Interchange Plus Pitch
          </h3>
          <CopyButton text={talkingPoints.icPlusPitch} section="icPlus" />
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <pre className="whitespace-pre-wrap text-sm text-gray-800 leading-relaxed font-sans">
            {talkingPoints.icPlusPitch}
          </pre>
        </div>
      </div>

      {/* Closing */}
      <div className="bg-white rounded-2xl shadow-lg p-6">
        <div className="flex justify-between items-start mb-4">
          <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            🎬 Closing Statement
          </h3>
          <CopyButton text={talkingPoints.closing} section="closing" />
        </div>
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
          <pre className="whitespace-pre-wrap text-sm text-gray-800 leading-relaxed font-sans">
            {talkingPoints.closing}
          </pre>
        </div>
      </div>

      {/* Print Button */}
      <div className="bg-gray-100 rounded-2xl p-6 text-center">
        <p className="text-gray-600 mb-3">Need a printable version?</p>
        <button 
          onClick={() => window.print()}
          className="bg-gray-800 text-white px-8 py-3 rounded-xl font-semibold hover:bg-gray-700 transition"
        >
          🖨️ Print Talking Points
        </button>
      </div>
    </div>
  );
}
