import React, { useState } from 'react';

const merchantTypes = [
  { value: 'retail', label: 'Retail Store' },
  { value: 'restaurant', label: 'Restaurant' },
  { value: 'ecommerce', label: 'E-Commerce / Online' },
  { value: 'service', label: 'Service Business' }
];

const processors = [
  'Unknown',
  'Square',
  'Stripe',
  'PayPal',
  'Clover',
  'Toast',
  'First Data / Fiserv',
  'TSYS / Global Payments',
  'Worldpay / Vantiv',
  'Heartland',
  'Elavon',
  'Chase Paymentech',
  'Bank of America',
  'Wells Fargo',
  'PNC',
  'Other'
];

export default function StatementInput({ onAnalyze, loading }) {
  const [formData, setFormData] = useState({
    volume: '',
    transactions: '',
    totalFees: '',
    merchantType: 'retail',
    currentProcessor: 'Unknown',
    // Optional detailed fees
    interchange: '',
    assessments: '',
    monthlyFee: '',
    pciFee: '',
    statementFee: '',
    batchFee: '',
    otherFees: ''
  });

  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Validate required fields
    if (!formData.volume || !formData.transactions || !formData.totalFees) {
      alert('Please enter Volume, Transactions, and Total Fees');
      return;
    }

    const data = {
      volume: parseFloat(formData.volume.replace(/[,$]/g, '')),
      transactions: parseInt(formData.transactions.replace(/,/g, '')),
      totalFees: parseFloat(formData.totalFees.replace(/[,$]/g, '')),
      merchantType: formData.merchantType,
      currentProcessor: formData.currentProcessor,
      fees: {
        interchange: formData.interchange ? parseFloat(formData.interchange.replace(/[,$]/g, '')) : 0,
        assessments: formData.assessments ? parseFloat(formData.assessments.replace(/[,$]/g, '')) : 0,
        monthly: formData.monthlyFee ? parseFloat(formData.monthlyFee.replace(/[,$]/g, '')) : 0,
        pci: formData.pciFee ? parseFloat(formData.pciFee.replace(/[,$]/g, '')) : 0,
        statement: formData.statementFee ? parseFloat(formData.statementFee.replace(/[,$]/g, '')) : 0,
        batch: formData.batchFee ? parseFloat(formData.batchFee.replace(/[,$]/g, '')) : 0,
        other: formData.otherFees ? parseFloat(formData.otherFees.replace(/[,$]/g, '')) : 0
      }
    };

    onAnalyze(data);
  };

  // Quick fill examples
  const fillExample = (type) => {
    const examples = {
      small: { volume: '15000', transactions: '300', totalFees: '450', merchantType: 'retail' },
      medium: { volume: '50000', transactions: '800', totalFees: '1350', merchantType: 'retail' },
      large: { volume: '150000', transactions: '2500', totalFees: '3800', merchantType: 'retail' },
      restaurant: { volume: '75000', transactions: '1500', totalFees: '1950', merchantType: 'restaurant' }
    };
    setFormData(prev => ({ ...prev, ...examples[type] }));
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 px-6 py-4">
          <h2 className="text-xl font-bold text-white">Enter Statement Data</h2>
          <p className="text-indigo-200 text-sm mt-1">
            Enter the merchant's processing statement information
          </p>
        </div>

        {/* Quick Examples */}
        <div className="px-6 py-3 bg-gray-50 border-b flex items-center gap-2 text-sm">
          <span className="text-gray-500">Quick fill:</span>
          <button onClick={() => fillExample('small')} className="px-2 py-1 bg-white rounded border hover:bg-gray-100">
            Small ($15k)
          </button>
          <button onClick={() => fillExample('medium')} className="px-2 py-1 bg-white rounded border hover:bg-gray-100">
            Medium ($50k)
          </button>
          <button onClick={() => fillExample('large')} className="px-2 py-1 bg-white rounded border hover:bg-gray-100">
            Large ($150k)
          </button>
          <button onClick={() => fillExample('restaurant')} className="px-2 py-1 bg-white rounded border hover:bg-gray-100">
            Restaurant
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Required Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Monthly Volume *
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-gray-500">$</span>
                <input
                  type="text"
                  name="volume"
                  value={formData.volume}
                  onChange={handleChange}
                  placeholder="50,000"
                  className="w-full pl-7 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Monthly Transactions *
              </label>
              <input
                type="text"
                name="transactions"
                value={formData.transactions}
                onChange={handleChange}
                placeholder="800"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Total Monthly Fees *
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-gray-500">$</span>
                <input
                  type="text"
                  name="totalFees"
                  value={formData.totalFees}
                  onChange={handleChange}
                  placeholder="1,250"
                  className="w-full pl-7 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Merchant Type
              </label>
              <select
                name="merchantType"
                value={formData.merchantType}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                {merchantTypes.map(type => (
                  <option key={type.value} value={type.value}>{type.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Current Processor */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Current Processor
            </label>
            <select
              name="currentProcessor"
              value={formData.currentProcessor}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            >
              {processors.map(p => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>

          {/* Advanced Options Toggle */}
          <div>
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="text-indigo-600 text-sm font-medium hover:text-indigo-700 flex items-center gap-1"
            >
              {showAdvanced ? '▼' : '▶'} Advanced: Fee Breakdown (optional)
            </button>
          </div>

          {/* Advanced Fee Breakdown */}
          {showAdvanced && (
            <div className="bg-gray-50 rounded-lg p-4 space-y-4">
              <p className="text-sm text-gray-600">
                If available on the statement, enter the fee breakdown for more accurate analysis:
              </p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Interchange</label>
                  <input
                    type="text"
                    name="interchange"
                    value={formData.interchange}
                    onChange={handleChange}
                    placeholder="$0"
                    className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Assessments</label>
                  <input
                    type="text"
                    name="assessments"
                    value={formData.assessments}
                    onChange={handleChange}
                    placeholder="$0"
                    className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Monthly Fee</label>
                  <input
                    type="text"
                    name="monthlyFee"
                    value={formData.monthlyFee}
                    onChange={handleChange}
                    placeholder="$0"
                    className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">PCI Fee</label>
                  <input
                    type="text"
                    name="pciFee"
                    value={formData.pciFee}
                    onChange={handleChange}
                    placeholder="$0"
                    className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Statement Fee</label>
                  <input
                    type="text"
                    name="statementFee"
                    value={formData.statementFee}
                    onChange={handleChange}
                    placeholder="$0"
                    className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Other Fees</label>
                  <input
                    type="text"
                    name="otherFees"
                    value={formData.otherFees}
                    onChange={handleChange}
                    placeholder="$0"
                    className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Analyzing...
              </>
            ) : (
              <>
                🔍 Analyze Statement
              </>
            )}
          </button>
        </form>
      </div>

      {/* Help Text */}
      <div className="mt-6 text-center text-sm text-gray-500">
        <p>Enter the totals from the merchant's monthly processing statement.</p>
        <p className="mt-1">The analyzer will calculate true interchange costs and identify savings opportunities.</p>
      </div>
    </div>
  );
}
