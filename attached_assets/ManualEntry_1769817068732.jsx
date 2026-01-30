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

export default function ManualEntry({ onSubmit, onBack, prefillData }) {
  const [formData, setFormData] = useState({
    totalVolume: prefillData?.totalVolume || '',
    totalTransactions: prefillData?.totalTransactions || '',
    totalFees: prefillData?.totalFees || '',
    merchantType: prefillData?.merchantType || 'retail',
    processor: prefillData?.processor || 'Unknown',
    monthlyFee: prefillData?.monthlyFee || '',
    pciFee: prefillData?.pciFee || '',
    ...prefillData
  });

  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    const data = {
      totalVolume: parseFloat(formData.totalVolume?.toString().replace(/[,$]/g, '') || 0),
      totalTransactions: parseInt(formData.totalTransactions?.toString().replace(/,/g, '') || 0),
      totalFees: parseFloat(formData.totalFees?.toString().replace(/[,$]/g, '') || 0),
      merchantType: formData.merchantType,
      processor: formData.processor,
      monthlyFee: parseFloat(formData.monthlyFee?.toString().replace(/[,$]/g, '') || 0),
      pciFee: parseFloat(formData.pciFee?.toString().replace(/[,$]/g, '') || 0)
    };

    if (!data.totalVolume || !data.totalTransactions || !data.totalFees) {
      alert('Please enter Volume, Transactions, and Total Fees');
      return;
    }

    onSubmit(data);
  };

  const fillExample = (type) => {
    const examples = {
      small: { totalVolume: '15000', totalTransactions: '300', totalFees: '450', merchantType: 'retail' },
      medium: { totalVolume: '50000', totalTransactions: '800', totalFees: '1350', merchantType: 'retail' },
      large: { totalVolume: '150000', totalTransactions: '2500', totalFees: '3800', merchantType: 'retail' },
      restaurant: { totalVolume: '75000', totalTransactions: '1500', totalFees: '1950', merchantType: 'restaurant' }
    };
    setFormData(prev => ({ ...prev, ...examples[type] }));
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 via-indigo-700 to-purple-700 px-6 py-6">
          <h2 className="text-2xl font-bold text-white">Enter Statement Data</h2>
          <p className="text-indigo-200 mt-1">
            Enter the merchant's processing information manually
          </p>
        </div>

        {/* Quick fill buttons */}
        <div className="px-6 py-3 bg-gray-50 border-b flex items-center gap-2 flex-wrap">
          <span className="text-sm text-gray-500">Quick fill:</span>
          <button onClick={() => fillExample('small')} className="px-3 py-1 bg-white rounded-lg border hover:bg-gray-100 text-sm transition">
            Small ($15k)
          </button>
          <button onClick={() => fillExample('medium')} className="px-3 py-1 bg-white rounded-lg border hover:bg-gray-100 text-sm transition">
            Medium ($50k)
          </button>
          <button onClick={() => fillExample('large')} className="px-3 py-1 bg-white rounded-lg border hover:bg-gray-100 text-sm transition">
            Large ($150k)
          </button>
          <button onClick={() => fillExample('restaurant')} className="px-3 py-1 bg-white rounded-lg border hover:bg-gray-100 text-sm transition">
            Restaurant
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Required Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Monthly Volume <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-gray-500">$</span>
                <input
                  type="text"
                  name="totalVolume"
                  value={formData.totalVolume}
                  onChange={handleChange}
                  placeholder="50,000"
                  className="w-full pl-7 pr-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Monthly Transactions <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="totalTransactions"
                value={formData.totalTransactions}
                onChange={handleChange}
                placeholder="800"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Total Monthly Fees <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-gray-500">$</span>
                <input
                  type="text"
                  name="totalFees"
                  value={formData.totalFees}
                  onChange={handleChange}
                  placeholder="1,250"
                  className="w-full pl-7 pr-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Merchant Type
              </label>
              <select
                name="merchantType"
                value={formData.merchantType}
                onChange={handleChange}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
              >
                {merchantTypes.map(type => (
                  <option key={type.value} value={type.value}>{type.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Processor */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Current Processor
            </label>
            <select
              name="processor"
              value={formData.processor}
              onChange={handleChange}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
            >
              {processors.map(p => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>

          {/* Advanced toggle */}
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center gap-2 text-indigo-600 font-medium text-sm hover:text-indigo-700 transition"
          >
            <span className={`transform transition ${showAdvanced ? 'rotate-90' : ''}`}>▶</span>
            Advanced: Fee Breakdown (optional)
          </button>

          {/* Advanced fields */}
          {showAdvanced && (
            <div className="bg-gray-50 rounded-xl p-4 space-y-4">
              <p className="text-sm text-gray-600">
                If available on the statement, enter specific fees for more accurate analysis:
              </p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Monthly Fee</label>
                  <input
                    type="text"
                    name="monthlyFee"
                    value={formData.monthlyFee}
                    onChange={handleChange}
                    placeholder="$0"
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-1 focus:ring-indigo-500"
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
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Statement Fee</label>
                  <input
                    type="text"
                    name="statementFee"
                    value={formData.statementFee || ''}
                    onChange={handleChange}
                    placeholder="$0"
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button
              type="submit"
              className="flex-1 bg-indigo-600 text-white py-3 px-4 rounded-xl font-semibold hover:bg-indigo-700 transition flex items-center justify-center gap-2"
            >
              🔍 Analyze Statement
            </button>
            
            {onBack && (
              <button
                type="button"
                onClick={onBack}
                className="flex-1 py-3 px-4 rounded-xl font-semibold border-2 border-gray-300 text-gray-700 hover:bg-gray-50 transition"
              >
                ← Back to Upload
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Help text */}
      <div className="mt-6 text-center text-sm text-gray-500">
        <p>Enter totals from the merchant's monthly processing statement.</p>
        <p className="mt-1">The analyzer calculates true interchange costs and identifies savings.</p>
      </div>
    </div>
  );
}
