// ============================================
// Main Application Component
// ============================================
// Demonstrates the PCBancard E-Sign Document Library System

import React, { useState } from 'react';
import { MerchantRecord } from './types';
import ESignButton, { ESignStatusBadge } from './components/ESignButton';
import ESignModal from './components/ESignModal';

// Sample merchant data for demonstration
const sampleMerchants: Partial<MerchantRecord>[] = [
  {
    id: 'merchant_001',
    businessName: "Bob's Marine",
    dbaName: "Bob's Marine & Boat Sales",
    businessPhone: '(317) 555-1234',
    businessEmail: 'bob@bobsmarine.com',
    businessAddress: {
      street: '123 Lake Shore Drive',
      city: 'Indianapolis',
      state: 'IN',
      zip: '46220'
    },
    owner: {
      firstName: 'Bob',
      lastName: 'Johnson',
      fullName: 'Bob Johnson',
      email: 'bob@bobsmarine.com',
      phone: '(317) 555-1234'
    },
    status: 'lead'
  },
  {
    id: 'merchant_002',
    businessName: 'Quick Stop Convenience',
    businessPhone: '(317) 555-5678',
    businessEmail: 'owner@quickstop.com',
    businessAddress: {
      street: '456 Main Street',
      city: 'Carmel',
      state: 'IN',
      zip: '46032'
    },
    owner: {
      firstName: 'Sarah',
      lastName: 'Williams',
      fullName: 'Sarah Williams',
      email: 'sarah@quickstop.com',
      phone: '(317) 555-5678'
    },
    status: 'prospect'
  },
  {
    id: 'merchant_003',
    businessName: 'The Coffee House',
    businessPhone: '(317) 555-9012',
    businessEmail: 'hello@thecoffeehouse.com',
    owner: {
      firstName: 'Mike',
      lastName: 'Chen',
      email: 'mike@thecoffeehouse.com',
      phone: '(317) 555-9012'
    },
    status: 'lead'
  }
];

const App: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedMerchant, setSelectedMerchant] = useState<Partial<MerchantRecord> | undefined>();

  // Handle e-sign button click from merchant record
  const handleESignClick = (merchantId: string) => {
    const merchant = sampleMerchants.find(m => m.id === merchantId);
    setSelectedMerchant(merchant);
    setIsModalOpen(true);
  };

  // Handle new merchant e-sign (no existing data)
  const handleNewMerchantESign = () => {
    setSelectedMerchant(undefined);
    setIsModalOpen(true);
  };

  // Handle modal close
  const handleModalClose = () => {
    setIsModalOpen(false);
    setSelectedMerchant(undefined);
  };

  const getStatusBadge = (status: string) => {
    const colors: Record<string, { bg: string; text: string }> = {
      lead: { bg: '#FEF3C7', text: '#D97706' },
      prospect: { bg: '#DBEAFE', text: '#2563EB' },
      pending: { bg: '#E0E7FF', text: '#4F46E5' },
      active: { bg: '#D1FAE5', text: '#059669' },
      inactive: { bg: '#F3F4F6', text: '#6B7280' }
    };
    const color = colors[status] || colors.lead;
    return (
      <span style={{
        backgroundColor: color.bg,
        color: color.text,
        fontSize: '12px',
        fontWeight: '500',
        padding: '4px 10px',
        borderRadius: '9999px',
        textTransform: 'capitalize'
      }}>
        {status}
      </span>
    );
  };

  return (
    <div style={{ 
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
      backgroundColor: '#F3F4F6',
      minHeight: '100vh'
    }}>
      {/* Header */}
      <header style={{
        backgroundColor: '#FFFFFF',
        borderBottom: '1px solid #E5E7EB',
        padding: '16px 24px'
      }}>
        <div style={{ 
          maxWidth: '1400px', 
          margin: '0 auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              backgroundColor: '#4F46E5',
              borderRadius: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <span style={{ color: '#FFFFFF', fontSize: '20px', fontWeight: '700' }}>P</span>
            </div>
            <div>
              <h1 style={{ margin: 0, fontSize: '20px', fontWeight: '700', color: '#111827' }}>
                PCBancard CRM
              </h1>
              <p style={{ margin: 0, fontSize: '12px', color: '#6B7280' }}>
                Merchant Services Platform
              </p>
            </div>
          </div>
          
          <button
            onClick={handleNewMerchantESign}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 20px',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: '#4F46E5',
              color: '#FFFFFF',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            <svg width="20" height="20" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
            </svg>
            New E-Sign Package
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main style={{ maxWidth: '1400px', margin: '0 auto', padding: '24px' }}>
        {/* Introduction Card */}
        <div style={{
          backgroundColor: '#EEF2FF',
          border: '1px solid #C7D2FE',
          borderRadius: '12px',
          padding: '20px',
          marginBottom: '24px'
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
            <div style={{
              width: '48px',
              height: '48px',
              backgroundColor: '#4F46E5',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}>
              <svg width="28" height="28" fill="#FFFFFF" viewBox="0 0 24 24">
                <path d="M17.75 3A3.25 3.25 0 0121 6.25v11.5A3.25 3.25 0 0117.75 21H6.25A3.25 3.25 0 013 17.75V6.25A3.25 3.25 0 016.25 3h11.5zM7 14.5l1.5 1.5 3.5-3.5 2.5 2.5 3-3V16H7v-1.5zm10.5-6a1.5 1.5 0 10-3 0 1.5 1.5 0 003 0z"/>
              </svg>
            </div>
            <div>
              <h2 style={{ margin: '0 0 8px 0', fontSize: '18px', fontWeight: '700', color: '#312E81' }}>
                E-Sign Document Library
              </h2>
              <p style={{ margin: 0, fontSize: '14px', color: '#4338CA', lineHeight: '1.5' }}>
                Click the <strong>E-Sign</strong> button on any merchant or lead record to open the document library. 
                Select the documents you need, enter merchant information, and send for electronic signature. 
                The system pre-fills forms automatically from existing merchant data.
              </p>
            </div>
          </div>
        </div>

        {/* Merchant/Lead List Section */}
        <div style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '12px',
          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
          overflow: 'hidden'
        }}>
          <div style={{
            padding: '20px 24px',
            borderBottom: '1px solid #E5E7EB',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <div>
              <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '600', color: '#111827' }}>
                Merchants & Leads
              </h2>
              <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#6B7280' }}>
                Click E-Sign to send documents for electronic signature
              </p>
            </div>
          </div>

          {/* Merchant List */}
          <div>
            {sampleMerchants.map((merchant, index) => (
              <div
                key={merchant.id}
                style={{
                  padding: '20px 24px',
                  borderBottom: index < sampleMerchants.length - 1 ? '1px solid #E5E7EB' : 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '16px'
                }}
              >
                {/* Business Icon */}
                <div style={{
                  width: '48px',
                  height: '48px',
                  backgroundColor: '#F3F4F6',
                  borderRadius: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <svg width="24" height="24" fill="#6B7280" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a1 1 0 110 2h-3a1 1 0 01-1-1v-2a1 1 0 00-1-1H9a1 1 0 00-1 1v2a1 1 0 01-1 1H4a1 1 0 110-2V4zm3 1h2v2H7V5zm2 4H7v2h2V9zm2-4h2v2h-2V5zm2 4h-2v2h2V9z" clipRule="evenodd" />
                  </svg>
                </div>

                {/* Merchant Info */}
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '4px' }}>
                    <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '600', color: '#111827' }}>
                      {merchant.businessName}
                    </h3>
                    {getStatusBadge(merchant.status || 'lead')}
                  </div>
                  <div style={{ display: 'flex', gap: '16px', fontSize: '13px', color: '#6B7280' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <svg width="14" height="14" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" />
                      </svg>
                      {merchant.owner?.fullName || `${merchant.owner?.firstName} ${merchant.owner?.lastName}`}
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <svg width="14" height="14" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                        <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                      </svg>
                      {merchant.owner?.email || merchant.businessEmail}
                    </span>
                    {merchant.businessPhone && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <svg width="14" height="14" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
                        </svg>
                        {merchant.businessPhone}
                      </span>
                    )}
                  </div>
                </div>

                {/* Action Buttons */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <ESignButton
                    merchantId={merchant.id!}
                    merchantName={merchant.businessName}
                    onClick={handleESignClick}
                    variant="primary"
                    size="md"
                  />
                  <button
                    style={{
                      padding: '10px',
                      borderRadius: '8px',
                      border: '1px solid #D1D5DB',
                      backgroundColor: '#FFFFFF',
                      color: '#6B7280',
                      cursor: 'pointer'
                    }}
                    title="View Details"
                  >
                    <svg width="20" height="20" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M6 10a2 2 0 11-4 0 2 2 0 014 0zM12 10a2 2 0 11-4 0 2 2 0 014 0zM16 12a2 2 0 100-4 2 2 0 000 4z" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* E-Signature Provider Recommendations */}
        <div style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '12px',
          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
          marginTop: '24px',
          padding: '24px'
        }}>
          <h2 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: '600', color: '#111827' }}>
            E-Signature Provider Recommendations
          </h2>
          <p style={{ margin: '0 0 20px 0', fontSize: '14px', color: '#6B7280' }}>
            To enable document signing, configure one of these recommended e-signature providers:
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
            {/* SignNow */}
            <div style={{
              border: '2px solid #4F46E5',
              borderRadius: '12px',
              padding: '20px',
              backgroundColor: '#F5F3FF'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                <span style={{
                  backgroundColor: '#4F46E5',
                  color: '#FFFFFF',
                  fontSize: '10px',
                  fontWeight: '600',
                  padding: '2px 8px',
                  borderRadius: '4px'
                }}>
                  RECOMMENDED
                </span>
              </div>
              <h3 style={{ margin: '0 0 8px 0', fontSize: '16px', fontWeight: '600', color: '#111827' }}>
                SignNow
              </h3>
              <p style={{ margin: '0 0 12px 0', fontSize: '13px', color: '#6B7280' }}>
                Best value for high-volume operations. Competitive pricing with robust API.
              </p>
              <p style={{ margin: 0, fontSize: '12px', color: '#059669', fontWeight: '500' }}>
                Starting at $8/user/month
              </p>
            </div>

            {/* DocuSign */}
            <div style={{
              border: '1px solid #E5E7EB',
              borderRadius: '12px',
              padding: '20px'
            }}>
              <h3 style={{ margin: '0 0 8px 0', fontSize: '16px', fontWeight: '600', color: '#111827' }}>
                DocuSign
              </h3>
              <p style={{ margin: '0 0 12px 0', fontSize: '13px', color: '#6B7280' }}>
                Industry leader with comprehensive features. Best for enterprise needs.
              </p>
              <p style={{ margin: 0, fontSize: '12px', color: '#059669', fontWeight: '500' }}>
                Starting at $10/user/month
              </p>
            </div>

            {/* HelloSign */}
            <div style={{
              border: '1px solid #E5E7EB',
              borderRadius: '12px',
              padding: '20px'
            }}>
              <h3 style={{ margin: '0 0 8px 0', fontSize: '16px', fontWeight: '600', color: '#111827' }}>
                HelloSign (Dropbox Sign)
              </h3>
              <p style={{ margin: '0 0 12px 0', fontSize: '13px', color: '#6B7280' }}>
                User-friendly with clean API. Good for small to medium operations.
              </p>
              <p style={{ margin: 0, fontSize: '12px', color: '#059669', fontWeight: '500' }}>
                Starting at $15/month
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* E-Sign Modal */}
      <ESignModal
        isOpen={isModalOpen}
        onClose={handleModalClose}
        merchant={selectedMerchant}
      />
    </div>
  );
};

export default App;
