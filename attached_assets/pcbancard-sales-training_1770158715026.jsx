import React, { useState, useEffect } from 'react';

const PCBancardSalesTraining = () => {
  const [activePhase, setActivePhase] = useState(0);
  const [activeSection, setActiveSection] = useState('overview');
  const [expandedCard, setExpandedCard] = useState(null);
  const [quizMode, setQuizMode] = useState(false);
  const [quizAnswers, setQuizAnswers] = useState({});
  const [showResults, setShowResults] = useState(false);

  const phases = [
    { id: 0, name: 'Prospecting', icon: '🎯', color: '#7C3AED' },
    { id: 1, name: 'Discovery', icon: '🔍', color: '#2563EB' },
    { id: 2, name: 'Proposal & Close', icon: '🤝', color: '#059669' },
    { id: 3, name: 'Onboarding', icon: '🚀', color: '#DC2626' }
  ];

  const contacts = {
    sales: { name: 'Jason', email: 'avar@pcbancard.com', phone: '(317) 750-9108', role: 'Sales Manager' },
    support: { name: 'Emma', email: 'emma@pcbancard.com', phone: '(973) 768-2231', role: 'New Agent Support' },
    it: { name: 'Kenny & Erik', email: 'itdept@pcbancard.com', role: 'IT and Equipment' },
    office: { name: 'Kristen & Cori', email: 'office@pcbancard.com', role: 'Office Manager/Applications' },
    proposals: { email: 'proposals@pcbancard.com', role: 'Custom Proposals' }
  };

  const targetIndustries = [
    { category: 'Automotive', items: ['Auto repair/service/quick lube', 'Brakes/tires/transmissions', 'Used Auto Dealers/Dealerships', 'Large equipment sales/rentals'] },
    { category: 'Service-Based', items: ['HVAC', 'Plumbers', 'Lawncare/Landscaping', 'Painters', 'Audio/Video installation', 'Dry Cleaners/Laundry', 'Dog Groomer'] },
    { category: 'Food & Hospitality', items: ['Pizza places and delivery', 'Food trucks', 'Liquor Stores', 'Smoke/cigar shops'] },
    { category: 'Healthcare', items: ['Chiropractors', 'Dentists/Oral Surgery', 'Dermatologists', 'Veterinarians/pet boarding', 'Animal hospitals/emergency clinics', 'Counseling offices', 'Lasik Centers/Optometrists'] },
    { category: 'Personal Services', items: ['Nail salons/hair salons', 'Personal trainer/fitness', 'Massage/day spa', 'Cosmetic: botox, augmentation'] },
    { category: 'Retail & Specialty', items: ['Gun Dealers', 'Pawn Shops', 'Garden Centers', 'Floor coverings/carpet/tile stores'] },
    { category: 'B2B & Professional', items: ['Attorneys', 'Daycares/private schools', 'B2B service providers', 'Funeral Homes', 'City/Government/Treasurers'] }
  ];

  const scripts = {
    dropIn: {
      title: "Jason's Drop-In-The-Door Pitch",
      script: `"Hi my name is ___. I'm sorry I don't have time to stay long. I'm working with local business owners, helping them eliminate one of their biggest expenses. I just wanted to drop in and see if I could schedule about 15 minutes of your time either ___ at ___ o'clock or ___ at ____ o'clock, which one would work better for you?"`,
      tips: ['Use alternative choice close for appointment', 'Create urgency by mentioning other appointments', 'Keep it brief - 30 seconds max']
    },
    videoBrochure: {
      title: "Video Brochure Script",
      script: `"Hello, my name is ___. I have just been helping some [industry] business owners in the [area] area. I apologize, but I can't stay long. I have [business A] and [business B] waiting for me to help them. I also understand that you are probably pretty busy. So I can respect your time and see if I can put hundreds, if not thousands back into your bottom line, I would like to leave this Video Brochure with you.

All I ask is that you take a quick look inside when you have 5 free minutes. Does that sound fair to you?

I'm going to be back in the area either (day) at (time) or (day) at (time). Which one is usually best for you so I can answer any questions you may have? I recommend watching the first short video, and if you want to learn more, there are 6 other videos with information. Here are the buttons.

Thank you. I will see you on ___ at ___."`,
      tips: ['Leave video brochure with prospect', 'Set specific callback time', 'Create social proof by mentioning other businesses']
    },
    statementRequest: {
      title: "Request Processing Statement",
      script: `"What I would like to do is create a custom proposal for your business showing exactly how much money I can put back into your business each month. I'll do a side-by-side comparison of Traditional Processing, Surcharging and Dual Pricing, and I'll include any equipment costs as well. In order to do that I will need one-month processing statement."`,
      tips: ['Position as a custom solution', 'Emphasize the value of comparison', 'Only need ONE month statement']
    },
    close: {
      title: "Closing Script",
      script: `"To get you up and running today, I will need a copy of your driver's license, business license, voided check, and processing statements."`,
      tips: ['Be direct and assumptive', 'Have documents ready to collect', 'Text your mentor before closing call']
    }
  };

  const discoveryQuestions = {
    merchantSurvey: [
      "How long have you been with your current processor?",
      "What do you like about your current processor?",
      "What do you wish you could change about your current processor?",
      "What are 2 things you do not like about credit card processing in general?",
      "Do you still pay processing fees?",
      "How long does it take for your transactions to hit your bank account?",
      "Does your current processor give you the ability to make money off paying your vendors?",
      "Does your current processor offer you access to capital if and when you may need it?",
      "How often do you see or hear from your current processor?",
      "What would it take for you to make a change in your processing?"
    ],
    presentationQuestionnaire: [
      "How long have you been in business?",
      "How are you accepting payments right now (terminal, POS, gateway, etc.)?",
      "What do you like and/or dislike about your equipment?",
      "Are you interested in updated equipment?",
      "Who are you processing with as of now?",
      "What do you like and/or dislike about them?",
      "How long does it take for you to receive your funds (next day, 2 day, 4 days, etc.)?",
      "If you could change something you were doing with accepting cards, what would it be?",
      "Roughly, how much do you pay in fees per month to accept cards?",
      "If you need access to cash, do you have that ability through your processor?",
      "Are you interested in lowering your monthly fees or ELIMINATING them completely?",
      "What are 2 things you would like to do to grow your business?",
      "Why haven't you been able to do this yet?",
      "If I could show you a way to do these things, do you think it would make sense for us to do business together?",
      "Do you have any local charities that you would like to help through our Give Back Program, if it didn't come out of your pocket?",
      "Anything else I really need to know about your business or how you are processing cards?"
    ],
    posQuestionnaire: [
      "Restaurant or Retail?",
      "How many menu items do you have?",
      "How many stations are you looking for?",
      "Are you interested in 'Order at the table'?",
      "Are you interested in 'Pay at the table'?",
      "Are you interested in 'Table QR Code ordering'?",
      "Are you interested in 'Tablet' solutions?",
      "Will the POS System be hard-wired or WIFI?",
      "How many kitchen printers are needed?",
      "Any special instructions or requests?"
    ]
  };

  const dualPricingBenefits = [
    { benefit: 'Eliminate ALL processing fees', detail: 'Merchants pay $0 to process credit cards' },
    { benefit: 'Month-to-month contracts', detail: 'NO cancellation fees' },
    { benefit: 'Free terminal equipment', detail: 'P1 or P3 terminal at no charge' },
    { benefit: 'iPOSpays Portal included', detail: 'Only $10/month for gateway' },
    { benefit: 'Customer transparency', detail: 'Both prices clearly displayed' },
    { benefit: 'Reduce chargebacks', detail: 'Cash payments = no disputes' },
    { benefit: 'Give Back Program', detail: 'Support local charities through processing' },
    { benefit: 'PCI Compliance done for you', detail: 'Sign once, we keep you compliant' }
  ];

  const savingsChart = [
    { volume: '$25,000', monthly: '$800', annual: '$9,600' },
    { volume: '$50,000', monthly: '$1,600', annual: '$19,200' },
    { volume: '$75,000', monthly: '$2,400', annual: '$28,800' },
    { volume: '$100,000', monthly: '$3,200', annual: '$38,400' },
    { volume: '$150,000', monthly: '$4,800', annual: '$57,600' }
  ];

  const onboardingSteps = [
    {
      step: 1,
      title: 'Welcome Email & Equipment Deployed',
      details: [
        'Merchant receives welcome email from team@pcbancard.com',
        'Rep gets helpdesk ticket when account is verified',
        'Kristen or Cori confirms official approval',
        'Terminal ships via 2-day FedEx',
        'Merchant enrolled in email system for iPOSpays portal setup',
        'Billing: Terminal purchases billed 30 days after deployment; Gateway/HotSauce billed immediately'
      ]
    },
    {
      step: 2,
      title: 'IT Call & First Transaction',
      details: [
        'Rep receives helpdesk ticket when terminal delivered',
        'Office calls rep to coordinate IT call timing',
        'Erik calls merchant to run test transaction',
        'IT completes setup and logs helpdesk ticket',
        'Rep notified via email when complete'
      ]
    },
    {
      step: 3,
      title: 'PCI Compliance',
      details: [
        'Within 30 days of approval, merchant boarded for PCI compliance',
        'If merchant signs PCI form, we complete it for them',
        'No non-compliance fees with signed form',
        'Annual $99 PCI fee only',
        'Monthly $64.95 Dual Pricing fee extracted first week of each month'
      ]
    }
  ];

  const emailSeries = [
    { name: 'General Merchant Series', link: 'https://pcbancard.activehosted.com/f/98', emails: ['Dual Pricing/Charity Video', 'Marketing Services & Cash Advance', 'Payroll & PCI Services'] },
    { name: 'Auto Shop Series', link: 'https://pcbancard.activehosted.com/f/95', emails: ['Auto Shop DP Video + Charity/Benefits', 'Marketing Services & Cash Advance', 'Payroll & PCI Service'] },
    { name: 'Payroll Series', link: 'https://pcbancard.activehosted.com/f/88', emails: ['Payroll Email #1', 'Payroll Email #2', 'Payroll Email #3'] }
  ];

  const resources = {
    documents: [
      { name: 'Dual Pricing Flyer', url: 'https://pcbancard.com/wp-content/uploads/2025/08/Fillable-2025-Updated-Flyers-editable.pdf' },
      { name: 'Pitch Book', url: 'https://pcbancard.com/wp-content/uploads/2025/02/CANVA_proof_II-AZUWPOGGhlwe.pdf' },
      { name: 'Merchant Survey', url: 'https://pcbancard.com/wp-content/uploads/2023/11/Merchant-Survey.pdf' },
      { name: 'POS Questionnaire', url: 'https://pcbancard.com/wp-content/uploads/2023/12/POS-questionnaire.pdf' },
      { name: 'Presentation Questionnaire', url: 'https://pcbancard.com/wp-content/uploads/2024/04/Presentation-Questionnaire.pdf' },
      { name: 'Quick Comparison Example', url: 'https://pcbancard.com/wp-content/uploads/2023/05/Montelongo-CD-Dan-Santoli.pdf' },
      { name: 'Agent Equipment Book', url: 'https://pcbancard.com/wp-content/uploads/2023/05/Agent-Equipment-Book-Updated-5-1-2023-1.pdf' }
    ],
    videos: [
      { name: 'Sales Guide Overview (Jason)', url: 'https://vimeo.com/1006339886' },
      { name: '5-9-4-2-25 Formula (Steve Mynhier)', url: 'https://vimeo.com/1018798318' },
      { name: 'P3 Promotional Video', url: 'https://vimeo.com/866928427' },
      { name: 'Custom Proposal Video Example', url: 'https://vimeo.com/1157121019' }
    ],
    portals: [
      { name: 'Partner Training Portal', url: 'https://pcbancard.com/pcb-partner-training/' },
      { name: '2026 Dual Pricing E-Signature', url: 'https://forms.pcbancard.com/fill/U4r3mI8EQQ' },
      { name: 'Live Price Sheet', url: 'https://docs.google.com/spreadsheets/d/1qCWXeUdTbpUrHYn4fMZ8yZCXbQuqDa5x/edit' },
      { name: 'Weekly Prospecting Sheet', url: 'https://docs.google.com/spreadsheets/d/14ffsPrMJQZDYGXiplSdx0sSI398OjB7Q/edit' }
    ]
  };

  const quizQuestions = [
    {
      question: "What's the monthly Dual Pricing program fee?",
      options: ['$49.95', '$64.95', '$74.95', '$99.95'],
      correct: 1
    },
    {
      question: "How many days after terminal deployment is a merchant billed for purchased equipment?",
      options: ['Immediately', '15 days', '30 days', '60 days'],
      correct: 2
    },
    {
      question: "What documents do you need to close a deal?",
      options: ['Just the processing statement', 'Driver\'s license, business license, voided check, and processing statements', 'Only a voided check', 'Social security number and tax returns'],
      correct: 1
    },
    {
      question: "When does a rep get paid their bonus?",
      options: ['When the application is approved', 'When the merchant is up and processes $300', 'After 30 days of processing', 'Immediately upon signing'],
      correct: 1
    },
    {
      question: "What is the iPOSpays Portal monthly fee?",
      options: ['Free', '$10/month', '$25/month', '$64.95/month'],
      correct: 1
    }
  ];

  const handleQuizAnswer = (questionIndex, answerIndex) => {
    setQuizAnswers(prev => ({ ...prev, [questionIndex]: answerIndex }));
  };

  const calculateQuizScore = () => {
    let correct = 0;
    quizQuestions.forEach((q, i) => {
      if (quizAnswers[i] === q.correct) correct++;
    });
    return correct;
  };

  const renderPhaseContent = () => {
    switch (activePhase) {
      case 0: // Prospecting
        return (
          <div className="space-y-6">
            <div className="bg-gradient-to-r from-purple-900/40 to-purple-800/20 rounded-2xl p-6 border border-purple-500/30">
              <h3 className="text-2xl font-bold text-white mb-4 flex items-center gap-3">
                <span className="text-3xl">🎯</span> Phase I: Prospect for the Appointment
              </h3>
              <p className="text-purple-200 mb-4">Your goal is simple: Get the appointment. Drop in with the Dual Pricing Flyer or Video Brochure and schedule 15 minutes of their time.</p>
            </div>

            {/* Scripts Section */}
            <div className="grid md:grid-cols-2 gap-4">
              {Object.entries(scripts).slice(0, 2).map(([key, script]) => (
                <div key={key} className="bg-slate-800/60 rounded-xl p-5 border border-slate-700 hover:border-purple-500/50 transition-all">
                  <h4 className="text-lg font-semibold text-purple-300 mb-3">{script.title}</h4>
                  <div className="bg-slate-900/60 rounded-lg p-4 mb-4">
                    <p className="text-slate-300 text-sm italic leading-relaxed">{script.script}</p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-purple-400 uppercase tracking-wide">Pro Tips:</p>
                    {script.tips.map((tip, i) => (
                      <div key={i} className="flex items-start gap-2 text-sm text-slate-400">
                        <span className="text-purple-400 mt-1">•</span>
                        <span>{tip}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Email Series */}
            <div className="bg-slate-800/60 rounded-xl p-5 border border-slate-700">
              <h4 className="text-lg font-semibold text-purple-300 mb-4">📧 Automated Email Series (Between Drop-in & Discovery)</h4>
              <div className="grid md:grid-cols-3 gap-4">
                {emailSeries.map((series, i) => (
                  <div key={i} className="bg-slate-900/60 rounded-lg p-4">
                    <h5 className="font-medium text-white mb-2">{series.name}</h5>
                    <ul className="space-y-1 mb-3">
                      {series.emails.map((email, j) => (
                        <li key={j} className="text-sm text-slate-400 flex items-center gap-2">
                          <span className="text-purple-400">#{j + 1}</span> {email}
                        </li>
                      ))}
                    </ul>
                    <a href={series.link} target="_blank" rel="noopener noreferrer" 
                       className="text-xs text-purple-400 hover:text-purple-300 transition-colors">
                      Enroll Prospect →
                    </a>
                  </div>
                ))}
              </div>
            </div>

            {/* Target Industries */}
            <div className="bg-slate-800/60 rounded-xl p-5 border border-slate-700">
              <h4 className="text-lg font-semibold text-purple-300 mb-4">🏪 Target Industries for P Series Terminal</h4>
              <div className="grid md:grid-cols-3 lg:grid-cols-4 gap-4">
                {targetIndustries.map((category, i) => (
                  <div key={i} className="bg-slate-900/60 rounded-lg p-4">
                    <h5 className="font-medium text-white mb-2 text-sm">{category.category}</h5>
                    <ul className="space-y-1">
                      {category.items.map((item, j) => (
                        <li key={j} className="text-xs text-slate-400">• {item}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );

      case 1: // Discovery
        return (
          <div className="space-y-6">
            <div className="bg-gradient-to-r from-blue-900/40 to-blue-800/20 rounded-2xl p-6 border border-blue-500/30">
              <h3 className="text-2xl font-bold text-white mb-4 flex items-center gap-3">
                <span className="text-3xl">🔍</span> Phase II: The Appointment & Discovery
              </h3>
              <p className="text-blue-200">Ask questions about their equipment, pain points, and goals. Take detailed notes. Leave with a processing statement to create their custom proposal.</p>
            </div>

            {/* Questionnaires */}
            <div className="grid lg:grid-cols-2 gap-6">
              <div className="bg-slate-800/60 rounded-xl p-5 border border-slate-700">
                <h4 className="text-lg font-semibold text-blue-300 mb-4">📋 Presentation Questionnaire</h4>
                <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                  {discoveryQuestions.presentationQuestionnaire.map((q, i) => (
                    <div key={i} className="flex items-start gap-3 bg-slate-900/60 rounded-lg p-3">
                      <span className="bg-blue-600 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0">{i + 1}</span>
                      <p className="text-sm text-slate-300">{q}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-6">
                <div className="bg-slate-800/60 rounded-xl p-5 border border-slate-700">
                  <h4 className="text-lg font-semibold text-blue-300 mb-4">📊 Merchant Survey Questions</h4>
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
                    {discoveryQuestions.merchantSurvey.map((q, i) => (
                      <div key={i} className="flex items-start gap-2 text-sm text-slate-400">
                        <span className="text-blue-400 font-medium">{i + 1}.</span>
                        <span>{q}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-slate-800/60 rounded-xl p-5 border border-slate-700">
                  <h4 className="text-lg font-semibold text-blue-300 mb-4">🖥️ POS-Specific Questions</h4>
                  <div className="space-y-2">
                    {discoveryQuestions.posQuestionnaire.map((q, i) => (
                      <div key={i} className="flex items-start gap-2 text-sm text-slate-400">
                        <span className="text-blue-400">•</span>
                        <span>{q}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Statement Request Script */}
            <div className="bg-gradient-to-r from-blue-800/30 to-slate-800/30 rounded-xl p-5 border border-blue-500/30">
              <h4 className="text-lg font-semibold text-blue-300 mb-3">💬 Getting the Statement</h4>
              <div className="bg-slate-900/60 rounded-lg p-4 mb-4">
                <p className="text-slate-300 italic">{scripts.statementRequest.script}</p>
              </div>
              <div className="bg-amber-900/30 border border-amber-500/30 rounded-lg p-4">
                <p className="text-amber-200 text-sm">
                  <span className="font-bold">⚠️ Important:</span> Set an appointment to return with the proposal before leaving. If merchant wants to close during presentation, call Jason or your mentor immediately.
                </p>
              </div>
            </div>

            {/* Pitch Book Walkthrough */}
            <div className="bg-slate-800/60 rounded-xl p-5 border border-slate-700">
              <h4 className="text-lg font-semibold text-blue-300 mb-4">📖 Pitch Book Key Points</h4>
              <div className="grid md:grid-cols-2 gap-4">
                {dualPricingBenefits.map((item, i) => (
                  <div key={i} className="flex items-start gap-3 bg-slate-900/60 rounded-lg p-3">
                    <span className="text-green-400 text-lg">✓</span>
                    <div>
                      <p className="font-medium text-white text-sm">{item.benefit}</p>
                      <p className="text-xs text-slate-400">{item.detail}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );

      case 2: // Proposal & Close
        return (
          <div className="space-y-6">
            <div className="bg-gradient-to-r from-green-900/40 to-green-800/20 rounded-2xl p-6 border border-green-500/30">
              <h3 className="text-2xl font-bold text-white mb-4 flex items-center gap-3">
                <span className="text-3xl">🤝</span> Phase III: The Proposal & The Close
              </h3>
              <p className="text-green-200">Return with your custom proposal. Walk through the savings. Close the deal and collect the required documents.</p>
              <div className="mt-4 bg-green-800/30 rounded-lg p-3 border border-green-500/30">
                <p className="text-green-100 text-sm"><span className="font-bold">📱 Pro Tip:</span> Text your mentor before the close so they can assist if needed!</p>
              </div>
            </div>

            {/* Savings Chart */}
            <div className="bg-slate-800/60 rounded-xl p-5 border border-slate-700">
              <h4 className="text-lg font-semibold text-green-300 mb-4">💰 Dual Pricing Savings Calculator</h4>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-700">
                      <th className="text-left py-3 px-4 text-slate-400 font-medium">Processing Volume</th>
                      <th className="text-right py-3 px-4 text-slate-400 font-medium">Monthly Savings</th>
                      <th className="text-right py-3 px-4 text-slate-400 font-medium">Annual Savings</th>
                    </tr>
                  </thead>
                  <tbody>
                    {savingsChart.map((row, i) => (
                      <tr key={i} className="border-b border-slate-800 hover:bg-slate-700/30 transition-colors">
                        <td className="py-3 px-4 text-white font-medium">{row.volume}</td>
                        <td className="py-3 px-4 text-right text-green-400 font-semibold">{row.monthly}</td>
                        <td className="py-3 px-4 text-right text-green-300 font-bold">{row.annual}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-slate-500 mt-3">* Based on approximately 3.2% average processing fees eliminated through Dual Pricing</p>
            </div>

            {/* Closing Script */}
            <div className="bg-gradient-to-r from-green-800/30 to-slate-800/30 rounded-xl p-5 border border-green-500/30">
              <h4 className="text-lg font-semibold text-green-300 mb-3">📝 The Close</h4>
              <div className="bg-slate-900/60 rounded-lg p-4 mb-4">
                <p className="text-slate-300 italic text-lg">{scripts.close.script}</p>
              </div>
              <div className="grid md:grid-cols-4 gap-3 mt-4">
                <div className="bg-slate-900/60 rounded-lg p-3 text-center">
                  <span className="text-2xl">🪪</span>
                  <p className="text-sm text-slate-300 mt-1">Driver's License</p>
                </div>
                <div className="bg-slate-900/60 rounded-lg p-3 text-center">
                  <span className="text-2xl">📄</span>
                  <p className="text-sm text-slate-300 mt-1">Business License</p>
                </div>
                <div className="bg-slate-900/60 rounded-lg p-3 text-center">
                  <span className="text-2xl">🏦</span>
                  <p className="text-sm text-slate-300 mt-1">Voided Check</p>
                </div>
                <div className="bg-slate-900/60 rounded-lg p-3 text-center">
                  <span className="text-2xl">📊</span>
                  <p className="text-sm text-slate-300 mt-1">Processing Statements</p>
                </div>
              </div>
            </div>

            {/* Application Process */}
            <div className="bg-slate-800/60 rounded-xl p-5 border border-slate-700">
              <h4 className="text-lg font-semibold text-green-300 mb-4">✍️ Application Process</h4>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="bg-slate-900/60 rounded-lg p-4">
                  <h5 className="font-medium text-white mb-2">Electronic Application</h5>
                  <p className="text-sm text-slate-400 mb-3">Use the 2026 Dual Pricing e-signature form for fastest processing</p>
                  <a href="https://forms.pcbancard.com/fill/U4r3mI8EQQ" target="_blank" rel="noopener noreferrer"
                     className="inline-block bg-green-600 hover:bg-green-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
                    Open E-Signature Form →
                  </a>
                </div>
                <div className="bg-slate-900/60 rounded-lg p-4">
                  <h5 className="font-medium text-white mb-2">Proposal Request</h5>
                  <p className="text-sm text-slate-400 mb-2">Email statement to:</p>
                  <p className="text-green-400 font-medium">proposals@pcbancard.com</p>
                  <p className="text-xs text-slate-500 mt-2">CC: emma@pcbancard.com and your mentor</p>
                  <p className="text-xs text-slate-500">24-hour turnaround for custom proposals</p>
                </div>
              </div>
            </div>

            {/* Payment Info */}
            <div className="bg-amber-900/30 border border-amber-500/30 rounded-xl p-5">
              <h4 className="text-lg font-semibold text-amber-300 mb-3">💵 Your Commission</h4>
              <p className="text-amber-100">You will be paid your bonus once your merchant is up and running and processes $300.00</p>
            </div>
          </div>
        );

      case 3: // Onboarding
        return (
          <div className="space-y-6">
            <div className="bg-gradient-to-r from-red-900/40 to-red-800/20 rounded-2xl p-6 border border-red-500/30">
              <h3 className="text-2xl font-bold text-white mb-4 flex items-center gap-3">
                <span className="text-3xl">🚀</span> Phase IV: After the Sale - Merchant Onboarding
              </h3>
              <p className="text-red-200">Once approved, the three-step onboarding process ensures your merchant is set up for success.</p>
            </div>

            {/* Onboarding Steps */}
            <div className="space-y-4">
              {onboardingSteps.map((step, i) => (
                <div key={i} className="bg-slate-800/60 rounded-xl border border-slate-700 overflow-hidden">
                  <div className="bg-gradient-to-r from-red-900/40 to-slate-800/40 p-4 flex items-center gap-4">
                    <div className="bg-red-600 text-white text-xl font-bold rounded-full w-10 h-10 flex items-center justify-center">
                      {step.step}
                    </div>
                    <h4 className="text-lg font-semibold text-white">{step.title}</h4>
                  </div>
                  <div className="p-5">
                    <ul className="space-y-2">
                      {step.details.map((detail, j) => (
                        <li key={j} className="flex items-start gap-3 text-slate-300">
                          <span className="text-red-400 mt-1">→</span>
                          <span>{detail}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ))}
            </div>

            {/* Welcome Email Preview */}
            <div className="bg-slate-800/60 rounded-xl p-5 border border-slate-700">
              <h4 className="text-lg font-semibold text-red-300 mb-4">📧 Welcome Email Key Points (Sent to Merchant)</h4>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="bg-slate-900/60 rounded-lg p-4">
                  <h5 className="font-medium text-white mb-2">MX Merchant Portal Setup</h5>
                  <ol className="text-sm text-slate-400 space-y-1">
                    <li>1. Go to mxmerchant.com</li>
                    <li>2. Click "Create New User"</li>
                    <li>3. Enter owner email and verify</li>
                    <li>4. Set password via verification email</li>
                    <li>5. Access reports and statements</li>
                  </ol>
                </div>
                <div className="bg-slate-900/60 rounded-lg p-4">
                  <h5 className="font-medium text-white mb-2">Signage Resources</h5>
                  <ul className="text-sm text-slate-400 space-y-1">
                    <li>• Discover: discoversignage.com</li>
                    <li>• Visa: merchantsignage.visa.com</li>
                    <li>• Mastercard: mastercard.com/brandcenter</li>
                    <li>• Amex: americanexpress.com/supplies</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Support Contacts */}
            <div className="bg-slate-800/60 rounded-xl p-5 border border-slate-700">
              <h4 className="text-lg font-semibold text-red-300 mb-4">☎️ Support Contacts</h4>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Object.entries(contacts).map(([key, contact]) => (
                  <div key={key} className="bg-slate-900/60 rounded-lg p-4">
                    <p className="font-medium text-white">{contact.name || contact.email}</p>
                    <p className="text-sm text-red-400">{contact.role}</p>
                    {contact.email && <p className="text-xs text-slate-400 mt-1">{contact.email}</p>}
                    {contact.phone && <p className="text-xs text-slate-400">{contact.phone}</p>}
                  </div>
                ))}
              </div>
              <div className="mt-4 text-center">
                <p className="text-slate-400">PCBancard Office: <span className="text-white font-medium">(973) 324-2251</span></p>
                <p className="text-slate-500 text-sm">Open 8:30 AM - 5:00 PM EST</p>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  const renderQuiz = () => (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-amber-900/40 to-amber-800/20 rounded-2xl p-6 border border-amber-500/30">
        <h3 className="text-2xl font-bold text-white mb-2">🧠 Knowledge Check</h3>
        <p className="text-amber-200">Test your understanding of the PCBancard sales process</p>
      </div>

      {!showResults ? (
        <div className="space-y-4">
          {quizQuestions.map((q, qIndex) => (
            <div key={qIndex} className="bg-slate-800/60 rounded-xl p-5 border border-slate-700">
              <p className="font-medium text-white mb-4">{qIndex + 1}. {q.question}</p>
              <div className="grid md:grid-cols-2 gap-3">
                {q.options.map((option, oIndex) => (
                  <button
                    key={oIndex}
                    onClick={() => handleQuizAnswer(qIndex, oIndex)}
                    className={`text-left p-3 rounded-lg border transition-all ${
                      quizAnswers[qIndex] === oIndex
                        ? 'bg-amber-600/40 border-amber-500 text-white'
                        : 'bg-slate-900/60 border-slate-700 text-slate-300 hover:border-slate-600'
                    }`}
                  >
                    <span className="font-medium mr-2">{String.fromCharCode(65 + oIndex)}.</span>
                    {option}
                  </button>
                ))}
              </div>
            </div>
          ))}
          <button
            onClick={() => setShowResults(true)}
            disabled={Object.keys(quizAnswers).length < quizQuestions.length}
            className="w-full bg-amber-600 hover:bg-amber-500 disabled:bg-slate-700 disabled:text-slate-500 text-white font-bold py-4 rounded-xl transition-colors"
          >
            Submit Answers
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="bg-slate-800/60 rounded-xl p-6 border border-slate-700 text-center">
            <p className="text-5xl font-bold text-amber-400 mb-2">{calculateQuizScore()}/{quizQuestions.length}</p>
            <p className="text-slate-300">
              {calculateQuizScore() === quizQuestions.length ? '🎉 Perfect Score!' : 
               calculateQuizScore() >= 3 ? '👍 Good job! Review the missed questions.' : 
               '📚 Keep studying the material!'}
            </p>
          </div>
          {quizQuestions.map((q, qIndex) => (
            <div key={qIndex} className={`rounded-xl p-5 border ${
              quizAnswers[qIndex] === q.correct 
                ? 'bg-green-900/30 border-green-500/30' 
                : 'bg-red-900/30 border-red-500/30'
            }`}>
              <p className="font-medium text-white mb-2">{qIndex + 1}. {q.question}</p>
              <p className="text-sm">
                <span className={quizAnswers[qIndex] === q.correct ? 'text-green-400' : 'text-red-400'}>
                  Your answer: {q.options[quizAnswers[qIndex]]}
                </span>
                {quizAnswers[qIndex] !== q.correct && (
                  <span className="text-green-400 ml-4">Correct: {q.options[q.correct]}</span>
                )}
              </p>
            </div>
          ))}
          <button
            onClick={() => { setShowResults(false); setQuizAnswers({}); }}
            className="w-full bg-slate-700 hover:bg-slate-600 text-white font-medium py-3 rounded-xl transition-colors"
          >
            Retake Quiz
          </button>
        </div>
      )}
    </div>
  );

  const renderResources = () => (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-cyan-900/40 to-cyan-800/20 rounded-2xl p-6 border border-cyan-500/30">
        <h3 className="text-2xl font-bold text-white mb-2">📚 Resources & Downloads</h3>
        <p className="text-cyan-200">Quick access to all PCBancard sales materials</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="bg-slate-800/60 rounded-xl p-5 border border-slate-700">
          <h4 className="text-lg font-semibold text-cyan-300 mb-4 flex items-center gap-2">
            📄 Documents & Flyers
          </h4>
          <div className="space-y-2">
            {resources.documents.map((doc, i) => (
              <a key={i} href={doc.url} target="_blank" rel="noopener noreferrer"
                 className="block p-3 bg-slate-900/60 rounded-lg hover:bg-slate-700/60 transition-colors">
                <p className="text-white text-sm font-medium">{doc.name}</p>
                <p className="text-xs text-cyan-400">Open PDF →</p>
              </a>
            ))}
          </div>
        </div>

        <div className="bg-slate-800/60 rounded-xl p-5 border border-slate-700">
          <h4 className="text-lg font-semibold text-cyan-300 mb-4 flex items-center gap-2">
            🎬 Training Videos
          </h4>
          <div className="space-y-2">
            {resources.videos.map((video, i) => (
              <a key={i} href={video.url} target="_blank" rel="noopener noreferrer"
                 className="block p-3 bg-slate-900/60 rounded-lg hover:bg-slate-700/60 transition-colors">
                <p className="text-white text-sm font-medium">{video.name}</p>
                <p className="text-xs text-cyan-400">Watch on Vimeo →</p>
              </a>
            ))}
          </div>
        </div>

        <div className="bg-slate-800/60 rounded-xl p-5 border border-slate-700">
          <h4 className="text-lg font-semibold text-cyan-300 mb-4 flex items-center gap-2">
            🌐 Portals & Forms
          </h4>
          <div className="space-y-2">
            {resources.portals.map((portal, i) => (
              <a key={i} href={portal.url} target="_blank" rel="noopener noreferrer"
                 className="block p-3 bg-slate-900/60 rounded-lg hover:bg-slate-700/60 transition-colors">
                <p className="text-white text-sm font-medium">{portal.name}</p>
                <p className="text-xs text-cyan-400">Open →</p>
              </a>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Reference Card */}
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-6 border border-slate-700">
        <h4 className="text-lg font-semibold text-white mb-4">⚡ Quick Reference: The 5-9-4-2-25 Formula</h4>
        <div className="grid grid-cols-5 gap-4 text-center">
          <div className="bg-purple-900/40 rounded-lg p-4 border border-purple-500/30">
            <p className="text-3xl font-bold text-purple-400">5</p>
            <p className="text-xs text-slate-400 mt-1">Drop-ins per day</p>
          </div>
          <div className="bg-blue-900/40 rounded-lg p-4 border border-blue-500/30">
            <p className="text-3xl font-bold text-blue-400">9</p>
            <p className="text-xs text-slate-400 mt-1">Contacts per week</p>
          </div>
          <div className="bg-green-900/40 rounded-lg p-4 border border-green-500/30">
            <p className="text-3xl font-bold text-green-400">4</p>
            <p className="text-xs text-slate-400 mt-1">Appointments set</p>
          </div>
          <div className="bg-amber-900/40 rounded-lg p-4 border border-amber-500/30">
            <p className="text-3xl font-bold text-amber-400">2</p>
            <p className="text-xs text-slate-400 mt-1">Deals closed</p>
          </div>
          <div className="bg-red-900/40 rounded-lg p-4 border border-red-500/30">
            <p className="text-3xl font-bold text-red-400">25</p>
            <p className="text-xs text-slate-400 mt-1">Weekly touches</p>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
      {/* Header */}
      <header className="bg-slate-900/80 backdrop-blur-xl border-b border-slate-800 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="bg-gradient-to-br from-purple-600 to-blue-600 p-2 rounded-xl">
                <span className="text-2xl">💳</span>
              </div>
              <div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
                  PCBancard Sales Training
                </h1>
                <p className="text-xs text-slate-500">2026 Sales Process from Prospecting to Close</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => { setActiveSection('overview'); setQuizMode(false); }}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeSection === 'overview' && !quizMode ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                Training
              </button>
              <button
                onClick={() => { setQuizMode(true); setActiveSection('quiz'); }}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  quizMode ? 'bg-amber-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                Quiz
              </button>
              <button
                onClick={() => { setActiveSection('resources'); setQuizMode(false); }}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeSection === 'resources' ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                Resources
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Phase Navigation */}
      {activeSection === 'overview' && !quizMode && (
        <div className="bg-slate-900/50 border-b border-slate-800">
          <div className="max-w-7xl mx-auto px-6 py-4">
            <div className="flex gap-2 overflow-x-auto pb-2">
              {phases.map((phase) => (
                <button
                  key={phase.id}
                  onClick={() => setActivePhase(phase.id)}
                  className={`flex items-center gap-2 px-5 py-3 rounded-xl font-medium whitespace-nowrap transition-all ${
                    activePhase === phase.id
                      ? 'text-white shadow-lg'
                      : 'bg-slate-800/50 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                  }`}
                  style={activePhase === phase.id ? { backgroundColor: phase.color } : {}}
                >
                  <span className="text-xl">{phase.icon}</span>
                  <span>{phase.name}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {quizMode ? renderQuiz() : 
         activeSection === 'resources' ? renderResources() : 
         renderPhaseContent()}
      </main>

      {/* Footer */}
      <footer className="bg-slate-900/80 border-t border-slate-800 mt-12">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="text-sm text-slate-500">
              PCBancard Office: (973) 324-2251 • Open 8:30 AM - 5:00 PM EST
            </div>
            <div className="flex gap-4 text-sm">
              <a href="https://pcbancard.com/pcb-partner-training/" target="_blank" rel="noopener noreferrer" className="text-purple-400 hover:text-purple-300">Partner Portal</a>
              <a href="https://calendly.com/pcbancard/30min-1on1" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300">Book with Jason</a>
              <a href="https://www.facebook.com/groups/782031156418892" target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:text-cyan-300">Facebook Group</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default PCBancardSalesTraining;
