import React from 'react';

export default function AnalysisResults({ analysis }) {
  const { input, current, trueCosts, markup, pcbancard, redFlags, summary } = analysis;
  
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatCurrencyExact = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(amount);
  };

  const formatPercent = (value) => `${value.toFixed(2)}%`;

  return (
    <div className="space-y-6">
      {/* Savings Hero */}
      <div className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl shadow-lg p-6 text-white">
        <div className="text-center">
          <p className="text-green-100 text-sm font-medium uppercase tracking-wide">Maximum Savings Opportunity</p>
          <p className="text-5xl font-bold mt-2">{formatCurrency(summary.maxAnnualSavings)}</p>
          <p className="text-green-100 mt-1">per year ({formatCurrency(summary.maxMonthlySavings)}/month)</p>
        </div>
        
        <div className="mt-6 grid grid-cols-3 gap-4 text-center">
          <div className="bg-white/10 rounded-lg p-3">
            <p className="text-2xl font-bold">{formatPercent(current.effectiveRate)}</p>
            <p className="text-xs text-green-100">Current Rate</p>
          </div>
          <div className="bg-white/10 rounded-lg p-3">
            <p className="text-2xl font-bold">{formatPercent(trueCosts.wholesaleRate)}</p>
            <p className="text-xs text-green-100">True Interchange</p>
          </div>
          <div className="bg-white/10 rounded-lg p-3">
            <p className="text-2xl font-bold">{formatPercent(pcbancard.dualPricing.effectiveRate)}</p>
            <p className="text-xs text-green-100">With Dual Pricing</p>
          </div>
        </div>
      </div>

      {/* Red Flags */}
      {redFlags.length > 0 && (
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2 mb-4">
            🚨 Issues Found ({redFlags.length})
          </h3>
          <div className="space-y-3">
            {redFlags.map((flag, idx) => (
              <div 
                key={idx} 
                className={`p-4 rounded-lg border-l-4 ${
                  flag.severity === 'CRITICAL' ? 'bg-red-50 border-red-500' :
                  flag.severity === 'HIGH' ? 'bg-orange-50 border-orange-500' :
                  'bg-yellow-50 border-yellow-500'
                }`}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-semibold text-gray-900">{flag.title}</p>
                    <p className="text-sm text-gray-600 mt-1">{flag.detail}</p>
                    {flag.suggestion && (
                      <p className="text-sm text-gray-500 mt-1 italic">💡 {flag.suggestion}</p>
                    )}
                  </div>
                  <span className={`px-2 py-1 rounded text-xs font-bold ${
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

      {/* Cost Comparison */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Current vs True Cost */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">💰 Cost Breakdown</h3>
          
          <div className="space-y-4">
            <div className="flex justify-between items-center py-2 border-b">
              <span className="text-gray-600">Monthly Volume</span>
              <span className="font-semibold">{formatCurrency(input.volume)}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b">
              <span className="text-gray-600">Transactions</span>
              <span className="font-semibold">{input.transactions.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b">
              <span className="text-gray-600">Average Ticket</span>
              <span className="font-semibold">{formatCurrencyExact(input.averageTicket)}</span>
            </div>
            
            <div className="pt-2">
              <div className="flex justify-between items-center py-2">
                <span className="text-gray-600">True Interchange</span>
                <span className="font-semibold">{formatCurrencyExact(trueCosts.interchange)}</span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-gray-600">Assessments</span>
                <span className="font-semibold">{formatCurrencyExact(trueCosts.assessments)}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-t font-bold">
                <span className="text-gray-900">True Wholesale Cost</span>
                <span className="text-green-600">{formatCurrencyExact(trueCosts.wholesale)}</span>
              </div>
            </div>

            <div className="bg-red-50 rounded-lg p-4 mt-4">
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
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">✨ PCBancard Options</h3>
          
          {/* Dual Pricing */}
          <div className={`rounded-lg p-4 mb-4 ${
            pcbancard.recommended === 'dualPricing' 
              ? 'bg-indigo-50 border-2 border-indigo-500' 
              : 'bg-gray-50 border border-gray-200'
          }`}>
            {pcbancard.recommended === 'dualPricing' && (
              <span className="inline-block bg-indigo-500 text-white text-xs font-bold px-2 py-1 rounded mb-2">
                RECOMMENDED
              </span>
            )}
            <h4 className="font-bold text-gray-900">Dual Pricing Program</h4>
            <p className="text-sm text-gray-600 mt-1">Customer pays 3.99% service fee for card transactions</p>
            
            <div className="mt-3 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Monthly Cost</span>
                <span className="font-semibold">{formatCurrencyExact(pcbancard.dualPricing.totalCost)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Effective Rate</span>
                <span className="font-semibold">{formatPercent(pcbancard.dualPricing.effectiveRate)}</span>
              </div>
              <div className="flex justify-between text-sm font-bold text-green-600 pt-2 border-t">
                <span>Monthly Savings</span>
                <span>{formatCurrency(pcbancard.dualPricing.monthlySavings)}</span>
              </div>
              <div className="flex justify-between text-sm font-bold text-green-600">
                <span>Annual Savings</span>
                <span>{formatCurrency(pcbancard.dualPricing.annualSavings)}</span>
              </div>
            </div>
          </div>

          {/* Interchange Plus */}
          <div className={`rounded-lg p-4 ${
            pcbancard.recommended === 'interchangePlus' 
              ? 'bg-indigo-50 border-2 border-indigo-500' 
              : 'bg-gray-50 border border-gray-200'
          }`}>
            {pcbancard.recommended === 'interchangePlus' && (
              <span className="inline-block bg-indigo-500 text-white text-xs font-bold px-2 py-1 rounded mb-2">
                RECOMMENDED
              </span>
            )}
            <h4 className="font-bold text-gray-900">Interchange Plus</h4>
            <p className="text-sm text-gray-600 mt-1">True interchange + 0.20% + $0.10/txn</p>
            
            <div className="mt-3 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Wholesale Cost</span>
                <span className="font-semibold">{formatCurrencyExact(pcbancard.interchangePlus.wholesaleCost)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">PCB Markup</span>
                <span className="font-semibold">{formatCurrencyExact(pcbancard.interchangePlus.markup + pcbancard.interchangePlus.transactionFees)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Monthly Fees</span>
                <span className="font-semibold">{formatCurrencyExact(pcbancard.interchangePlus.monthlyFees)}</span>
              </div>
              <div className="flex justify-between text-sm pt-2 border-t">
                <span className="text-gray-600">Total Monthly Cost</span>
                <span className="font-semibold">{formatCurrencyExact(pcbancard.interchangePlus.totalCost)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Effective Rate</span>
                <span className="font-semibold">{formatPercent(pcbancard.interchangePlus.effectiveRate)}</span>
              </div>
              <div className="flex justify-between text-sm font-bold text-green-600 pt-2 border-t">
                <span>Monthly Savings</span>
                <span>{formatCurrency(pcbancard.interchangePlus.monthlySavings)}</span>
              </div>
              <div className="flex justify-between text-sm font-bold text-green-600">
                <span>Annual Savings</span>
                <span>{formatCurrency(pcbancard.interchangePlus.annualSavings)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Visual Comparison */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4">📊 Rate Comparison</h3>
        
        <div className="space-y-4">
          {/* Current Rate Bar */}
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-600">Current Processor</span>
              <span className="font-semibold text-red-600">{formatPercent(current.effectiveRate)}</span>
            </div>
            <div className="h-6 bg-gray-200 rounded-full overflow-hidden">
              <div 
                className="h-full bg-red-500 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(current.effectiveRate / 4 * 100, 100)}%` }}
              />
            </div>
          </div>

          {/* True Interchange Bar */}
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-600">True Interchange Cost</span>
              <span className="font-semibold text-blue-600">{formatPercent(trueCosts.wholesaleRate)}</span>
            </div>
            <div className="h-6 bg-gray-200 rounded-full overflow-hidden">
              <div 
                className="h-full bg-blue-500 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(trueCosts.wholesaleRate / 4 * 100, 100)}%` }}
              />
            </div>
          </div>

          {/* PCB IC+ Bar */}
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-600">PCBancard Interchange Plus</span>
              <span className="font-semibold text-green-600">{formatPercent(pcbancard.interchangePlus.effectiveRate)}</span>
            </div>
            <div className="h-6 bg-gray-200 rounded-full overflow-hidden">
              <div 
                className="h-full bg-green-500 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(pcbancard.interchangePlus.effectiveRate / 4 * 100, 100)}%` }}
              />
            </div>
          </div>

          {/* PCB Dual Pricing Bar */}
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-600">PCBancard Dual Pricing</span>
              <span className="font-semibold text-emerald-600">{formatPercent(pcbancard.dualPricing.effectiveRate)}</span>
            </div>
            <div className="h-6 bg-gray-200 rounded-full overflow-hidden">
              <div 
                className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                style={{ width: `${Math.max(pcbancard.dualPricing.effectiveRate / 4 * 100, 2)}%` }}
              />
            </div>
          </div>
        </div>

        <div className="mt-4 text-center text-sm text-gray-500">
          Lower is better • Dual Pricing shifts cost to cardholder
        </div>
      </div>
    </div>
  );
}
