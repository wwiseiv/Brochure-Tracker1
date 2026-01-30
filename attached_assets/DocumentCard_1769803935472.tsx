// ============================================
// Document Card Component
// ============================================
// Displays a single document with thumbnail and selection capability

import React from 'react';
import { DocumentTemplate } from '../types';

interface DocumentCardProps {
  document: DocumentTemplate;
  isSelected: boolean;
  onSelect: (documentId: string, selected: boolean) => void;
  onClick?: (document: DocumentTemplate) => void;
}

const DocumentCard: React.FC<DocumentCardProps> = ({
  document,
  isSelected,
  onSelect,
  onClick
}) => {
  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
    onSelect(document.id, e.target.checked);
  };

  const handleCardClick = () => {
    if (onClick) {
      onClick(document);
    }
  };

  const getCategoryColor = (category: string): string => {
    const colors: Record<string, string> = {
      application: '#4F46E5', // Indigo
      agreement: '#059669', // Green
      equipment: '#D97706', // Amber
      compliance: '#DC2626', // Red
      internal: '#6B7280', // Gray
      addendum: '#8B5CF6' // Purple
    };
    return colors[category] || '#6B7280';
  };

  const getCategoryLabel = (category: string): string => {
    const labels: Record<string, string> = {
      application: 'Application',
      agreement: 'Agreement',
      equipment: 'Equipment',
      compliance: 'Compliance',
      internal: 'Internal',
      addendum: 'Addendum'
    };
    return labels[category] || category;
  };

  return (
    <div
      className={`document-card ${isSelected ? 'selected' : ''}`}
      onClick={handleCardClick}
      style={{
        border: isSelected ? '2px solid #4F46E5' : '1px solid #E5E7EB',
        borderRadius: '12px',
        padding: '16px',
        backgroundColor: isSelected ? '#EEF2FF' : '#FFFFFF',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        boxShadow: isSelected 
          ? '0 4px 6px -1px rgba(79, 70, 229, 0.1), 0 2px 4px -1px rgba(79, 70, 229, 0.06)'
          : '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)'
      }}
    >
      {/* Selection Checkbox */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
        <label 
          className="checkbox-container"
          onClick={(e) => e.stopPropagation()}
          style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}
        >
          <input
            type="checkbox"
            checked={isSelected}
            onChange={handleCheckboxChange}
            style={{ 
              width: '18px', 
              height: '18px', 
              marginRight: '8px',
              cursor: 'pointer',
              accentColor: '#4F46E5'
            }}
          />
          <span style={{ fontSize: '14px', color: '#6B7280' }}>
            {isSelected ? 'Selected' : 'Select'}
          </span>
        </label>

        {/* Category Badge */}
        <span
          style={{
            backgroundColor: getCategoryColor(document.category),
            color: '#FFFFFF',
            fontSize: '11px',
            fontWeight: '600',
            padding: '4px 8px',
            borderRadius: '4px',
            textTransform: 'uppercase',
            letterSpacing: '0.5px'
          }}
        >
          {getCategoryLabel(document.category)}
        </span>
      </div>

      {/* Thumbnail */}
      <div
        style={{
          width: '100%',
          height: '200px',
          backgroundColor: '#F3F4F6',
          borderRadius: '8px',
          overflow: 'hidden',
          marginBottom: '12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        <img
          src={document.thumbnailPath}
          alt={document.name}
          style={{
            maxWidth: '100%',
            maxHeight: '100%',
            objectFit: 'contain'
          }}
          onError={(e) => {
            // Fallback if image fails to load
            (e.target as HTMLImageElement).style.display = 'none';
            const parent = (e.target as HTMLImageElement).parentElement;
            if (parent) {
              parent.innerHTML = `
                <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; color: #9CA3AF;">
                  <svg width="48" height="48" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clip-rule="evenodd"/>
                  </svg>
                  <span style="margin-top: 8px; font-size: 12px;">Document Preview</span>
                </div>
              `;
            }
          }}
        />
      </div>

      {/* Document Name */}
      <h3 style={{ 
        margin: '0 0 8px 0', 
        fontSize: '16px', 
        fontWeight: '600',
        color: '#111827',
        lineHeight: '1.4'
      }}>
        {document.name}
      </h3>

      {/* Description */}
      <p style={{ 
        margin: '0', 
        fontSize: '13px', 
        color: '#6B7280',
        lineHeight: '1.5',
        display: '-webkit-box',
        WebkitLineClamp: 3,
        WebkitBoxOrient: 'vertical',
        overflow: 'hidden'
      }}>
        {document.description}
      </p>

      {/* Required Badge */}
      {document.isRequired && (
        <div style={{ 
          marginTop: '12px',
          display: 'flex',
          alignItems: 'center',
          gap: '4px'
        }}>
          <svg 
            width="16" 
            height="16" 
            fill="#DC2626" 
            viewBox="0 0 20 20"
          >
            <path 
              fillRule="evenodd" 
              d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" 
              clipRule="evenodd"
            />
          </svg>
          <span style={{ fontSize: '12px', color: '#DC2626', fontWeight: '500' }}>
            Required
          </span>
        </div>
      )}

      {/* Field Count */}
      <div style={{ 
        marginTop: '8px',
        fontSize: '12px',
        color: '#9CA3AF'
      }}>
        {document.formFields.length} form field{document.formFields.length !== 1 ? 's' : ''}
      </div>
    </div>
  );
};

export default DocumentCard;
