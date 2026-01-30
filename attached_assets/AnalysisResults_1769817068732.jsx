import React from 'react';
import { formatCurrency, formatCurrencyExact, formatPercent } from '../services/analysisEngine.js';

export default function AnalysisResults({ analysis, extractedData }) {
  if (!analysis || !analysis.success) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
        <p className="text-red-700">Analysis failed. Please try again with different data.</p>
      </div>
    );
  }

  const { input, current, trueCosts, markup, pcbancard, redFlags, summary } = analysis;

  return (
    <div className="space-y-6">
      {/* Savings Hero */}
      <div className="bg-gradient-to-r from-emerald-500 via-green-500 to-teal-500 rounded-2xl shadow-xl p-6 text-white">
        <div className="text-center">
          <p className="text-green-100 text-sm font-medium uppercase tracking-wide">
            Maximum Savings Opportunity
          </p>
          <p className="text-5xl md:text-6xl font-bold mt-2">
            {formatCurrency(summary.maxAnnualSavings)}
          </p>
          <p className="text-green-100 mt-1 text-lg">
            per year ({formatCurrency(summary.maxMonthlySavings)}/month)
          </p>
        </div>
        
        <div className="mt-6 grid grid-cols-3 gap-4 text-center">
          <div className="bg-white/15 backdrop-blur rounded-xl p-4">
            <p className="text-3xl font-bold">{formatPercent(current.effectiveRate)}</p>
            <p className="text-xs text-green-100 mt-1">Current Rate</p>
          </div>
          <div className="bg-white/15 backdrop-blur rounded-xl p-4">
            <p className="text-3xl font-bold">{formatPercent(trueCosts.wholesaleRate)}</p>
            <p className="text-xs text-green-100 mt-1">True Interchange</p>
          </div>
          <div className="bg-white/15 backdrop-blur rounded-xl p-4">
            <p className="text-3xl font-bold">{formatPercent(pcbancard.dualPricing.rate)}</p>
            <p className="text-xs text-green-100 mt-1">With Dual Pricing</p>
          </div>
        </div>
      </div>

      {/* Extracted Data Info (if from file) */}
      {extractedData && extractedData.source === 'ai' && (
        <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xl">🤖</span>
            <span className="font-semibold text-purple-900">AI-Extracted Data</span>
          </div>
          <p className="text-sm text-purple-700">
            Data was automatically extracted from your uploaded statement using AI analysis.
            {extractedData.raw?.processor && ` Detected processor: ${extractedData.raw.processor}`}
          </p>
        </div>
      )}

      {/* Red Flags */}
      {redFlags.length > 0 && (
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2 mb-4">
            🚨 Issues Found ({redFlags.length})
          </h3>
          <div className="space-y-3">
            {redFlags.map((flag, idx) => (
              <div 
                key={idx} 
                className={`p-4 rounded-xl border-l-4 ${
                  flag.severity === 'CRITICAL' ? 'bg-red-50 border-red-500' :
                  flag.severity === 'HIGH' ? 'bg-orange-50 border-orange-500' :
                  'bg-yellow-50 border-yellow-500'
                }`}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-semibold text-gray-900">{flag.title}</p>
                    <p className="text-sm text-gray-600 mt-1">{flag.detail}</p>
                  </div>
                  <span className={`px-3 py-1 rounded-lg text-sm font-bold ${
                    flag.severity === 'CRITICAL' ? 'bg-red-100 text-red-800' :
                    flag.severity === 'HIGH' ? 'bg-orange-100 text-orange-800' :
                    'bg-yellow-100 text-yellow-800'
                  }`}>
                    {formatCurrency(flag.impact)}/mo
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Cost Comparison Grid */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Current Costs */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            💰 Cost Breakdown
          </h3>
          
          <div className="space-y-3">
            <div className="flex justify-between items-center py-2 border-b border-gray-100">
              <span className="text-gray-600">Monthly Volume</span>
              <span className="font-semibold text-gray-900">{formatCurrency(input.volume)}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-gray-100">
              <span className="text-gray-600">Transactions</span>
              <span className="font-semibold text-gray-900">{input.transactions.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-gray-100">
              <span className="text-gray-600">Average Ticket</span>
              <span className="font-semibold text-gray-900">{formatCurrencyExact(input.averageTicket)}</span>
            </div>
            
            <div className="pt-3">
              <div className="flex justify-between items-center py-2">
                <span className="text-gray-600">True Interchange</span>
                <span className="font-semibold text-gray-900">{formatCurrencyExact(trueCosts.interchange)}</span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-gray-600">Assessments</span>
                <span className="font-semibold text-gray-900">{formatCurrencyExact(trueCosts.assessments)}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-t border-gray-200 font-bold">
                <span className="text-gray-900">True Wholesale Cost</span>
                <span className="text-emerald-600">{formatCurrencyExact(trueCosts.wholesale)}</span>
              </div>
            </div>

            <div className="bg-red-50 rounded-xl p-4 mt-4">
              <div className="flex justify-between items-center">
                <span className="text-red-700 font-medium">Current Total Fees</span>
                <span className="font-bold text-red-700">{formatCurrencyExact(current.totalFees)}</span>
              </div>
              <div className="flex justify-between items-center mt-2">
                <span className="text-red-600 text-sm">Processor Markup</span>
                <span className="font-semibold text-red-600">
                  {formatCurrencyExact(markup.amount)} ({formatPercent(markup.rate)})
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* PCBancard Options */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            ✨ PCBancard Options
          </h3>
          
          {/* Dual Pricing */}
          <div className={`rounded-xl p-4 mb-4 transition-all ${
            pcbancard.recommended === 'dualPricing' 
              ? 'bg-indigo-50 ring-2 ring-indigo-500' 
              : 'bg-gray-50'
          }`}>
            {pcbancard.recommended === 'dualPricing' && (
              <span className="inline-block bg-indigo-600 text-white text-xs font-bold px-3 py-1 rounded-full mb-2">
                ⭐ RECOMMENDED
              </span>
            )}
            <h4 className="font-bold text-gray-900">Dual Pricing Program</h4>
            <p className="text-sm text-gray-600 mt-1">
              Customer pays {pcbancard.dualPricing.serviceFee}% service fee for card transactions
            </p>
            
            <div className="mt-3 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Monthly Cost</span>
                <span className="font-semibold">{formatCurrencyExact(pcbancard.dualPricing.total)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Effective Rate</span>
                <span className="font-semibold">{formatPercent(pcbancard.dualPricing.rate)}</span>
              </div>
              <div className="flex justify-between text-sm font-bold text-emerald-600 pt-2 border-t border-gray-200">
                <span>Monthly Savings</span>
                <span>{formatCurrency(pcbancard.dualPricing.savings)}</span>
              </div>
              <div className="flex justify-between text-sm font-bold text-emerald-600">
                <span>Annual Savings</span>
                <span>{formatCurrency(pcbancard.dualPricing.annualSavings)}</span>
              </div>
            </div>
          </div>

          {/* Interchange Plus */}
          <div className={`rounded-xl p-4 ${
            pcbancard.recommended === 'interchangePlus' 
              ? 'bg-indigo-50 ring-2 ring-indigo-500' 
              : 'bg-gray-50'
          }`}>
            {pcbancard.recommended === 'interchangePlus' && (
              <span className="inline-block bg-indigo-600 text-white text-xs font-bold px-3 py-1 rounded-full mb-2">
                ⭐ RECOMMENDED
              </span>
            )}
            <h4 className="font-bold text-gray-900">Interchange Plus</h4>
            <p className="text-sm text-gray-600 mt-1">True interchange + 0.20% + $0.10/txn</p>
            
            <div className="mt-3 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Total Monthly Cost</span>
                <span className="font-semibold">{formatCurrencyExact(pcbancard.interchangePlus.total)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Effective Rate</span>
                <span className="font-semibold">{formatPercent(pcbancard.interchangePlus.rate)}</span>
              </div>
              <div className="flex justify-between text-sm font-bold text-emerald-600 pt-2 border-t border-gray-200">
                <span>Monthly Savings</span>
                <span>{formatCurrency(pcbancard.interchangePlus.savings)}</span>
              </div>
              <div className="flex justify-between text-sm font-bold text-emerald-600">
                <span>Annual Savings</span>
                <span>{formatCurrency(pcbancard.interchangePlus.annualSavings)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Visual Rate Comparison */}
      <div className="bg-white rounded-2xl shadow-lg p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4">📊 Rate Comparison</h3>
        
        <div className="space-y-4">
          {/* Current Rate */}
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-600">Current Processor</span>
              <span className="font-semibold text-red-600">{formatPercent(current.effectiveRate)}</span>
            </div>
            <div className="h-6 bg-gray-100 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-red-400 to-red-500 rounded-full transition-all duration-700"
                style={{ width: `${Math.min(current.effectiveRate / 4 * 100, 100)}%` }}
              />
            </div>
          </div>

          {/* True Interchange */}
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-600">True Interchange Cost</span>
              <span className="font-semibold text-blue-600">{formatPercent(trueCosts.wholesaleRate)}</span>
            </div>
            <div className="h-6 bg-gray-100 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-blue-400 to-blue-500 rounded-full transition-all duration-700"
                style={{ width: `${Math.min(trueCosts.wholesaleRate / 4 * 100, 100)}%` }}
              />
            </div>
          </div>

          {/* PCB IC+ */}
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-600">PCBancard Interchange Plus</span>
              <span className="font-semibold text-green-600">{formatPercent(pcbancard.interchangePlus.rate)}</span>
            </div>
            <div className="h-6 bg-gray-100 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-green-400 to-green-500 rounded-full transition-all duration-700"
                style={{ width: `${Math.min(pcbancard.interchangePlus.rate / 4 * 100, 100)}%` }}
              />
            </div>
          </div>

          {/* Dual Pricing */}
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-600">PCBancard Dual Pricing</span>
              <span className="font-semibold text-emerald-600">{formatPercent(pcbancard.dualPricing.rate)}</span>
            </div>
            <div className="h-6 bg-gray-100 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-emerald-400 to-emerald-500 rounded-full transition-all duration-700"
                style={{ width: `${Math.max(pcbancard.dualPricing.rate / 4 * 100, 3)}%` }}
              />
            </div>
          </div>
        </div>

        <p className="mt-4 text-center text-sm text-gray-500">
          Lower is better • Dual Pricing shifts cost to cardholder
        </p>
      </div>
    </div>
  );
}
