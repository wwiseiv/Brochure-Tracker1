// ============================================
// PCBancard Document Library Configuration
// ============================================
// This file defines all available documents for e-signature
// with their form field mappings to merchant records

import { DocumentTemplate, DocumentPackage } from '../types';

// Document Templates - Each represents a signable document
export const documentTemplates: DocumentTemplate[] = [
  // 1. Merchant Application Quick Setup
  {
    id: 'merchant-application',
    name: 'Merchant Application Quick Setup',
    description: 'Primary merchant application form for new account setup. Collects business information, owner details, and processing volume estimates.',
    category: 'application',
    thumbnailPath: '/assets/images/IMG_2475.jpeg',
    pageIndex: 2, // Page 2 in the master PDF
    isRequired: true,
    sortOrder: 1,
    createdAt: new Date('2023-12-01'),
    updatedAt: new Date('2023-12-01'),
    formFields: [
      // Business Information Section
      {
        id: 'dba_name',
        fieldName: 'dbaName',
        label: 'DBA/Trade Name',
        type: 'text',
        required: true,
        placeholder: 'Enter DBA or Trade name on your signage',
        mappedFrom: 'businessName'
      },
      {
        id: 'corporate_legal_name',
        fieldName: 'corporateLegalName',
        label: 'Corporate Legal Business Name',
        type: 'text',
        required: false,
        mappedFrom: 'corporateLegalName'
      },
      {
        id: 'business_address_street',
        fieldName: 'businessAddressStreet',
        label: 'Business Location Address',
        type: 'text',
        required: true,
        mappedFrom: 'businessAddress.street'
      },
      {
        id: 'business_address_city',
        fieldName: 'businessAddressCity',
        label: 'City',
        type: 'text',
        required: true,
        mappedFrom: 'businessAddress.city'
      },
      {
        id: 'business_address_state',
        fieldName: 'businessAddressState',
        label: 'State',
        type: 'text',
        required: true,
        mappedFrom: 'businessAddress.state'
      },
      {
        id: 'business_address_zip',
        fieldName: 'businessAddressZip',
        label: 'Zip',
        type: 'text',
        required: true,
        mappedFrom: 'businessAddress.zip'
      },
      {
        id: 'years_in_business',
        fieldName: 'yearsInBusiness',
        label: 'Years in Business',
        type: 'number',
        required: false,
        mappedFrom: 'yearsInBusiness'
      },
      {
        id: 'business_type',
        fieldName: 'businessType',
        label: 'Business Type',
        type: 'select',
        required: true,
        options: [
          { value: 'retail', label: 'Retail' },
          { value: 'restaurant', label: 'Restaurant' },
          { value: 'service', label: 'Service' },
          { value: 'government', label: 'Government' },
          { value: 'lodging', label: 'Lodging' },
          { value: 'supermarket', label: 'Supermarket' },
          { value: 'petroleum', label: 'Petroleum' },
          { value: 'healthcare', label: 'Healthcare' },
          { value: 'education', label: 'Education' },
          { value: 'other', label: 'Other' }
        ],
        mappedFrom: 'businessType'
      },
      {
        id: 'ownership_type',
        fieldName: 'ownershipType',
        label: 'Ownership Type',
        type: 'select',
        required: true,
        options: [
          { value: 'sole_prop', label: 'Individual/Sole Proprietor' },
          { value: 's_corp', label: 'S-Corporation' },
          { value: 'c_corp', label: 'C-Corporation' },
          { value: 'llc', label: 'LLC' },
          { value: 'llp', label: 'LLP' },
          { value: 'partnership', label: 'Partnership' },
          { value: 'non_profit', label: 'Non-Profit' },
          { value: 'government', label: 'Government' },
          { value: 'other', label: 'Other' }
        ],
        mappedFrom: 'ownershipType'
      },
      {
        id: 'business_phone',
        fieldName: 'businessPhone',
        label: 'Business Phone',
        type: 'phone',
        required: true,
        mappedFrom: 'businessPhone'
      },
      {
        id: 'business_email',
        fieldName: 'businessEmail',
        label: 'Business Email',
        type: 'email',
        required: true,
        mappedFrom: 'businessEmail'
      },
      {
        id: 'business_website',
        fieldName: 'businessWebsite',
        label: 'Business Website',
        type: 'text',
        required: false,
        placeholder: 'Leave blank if none',
        mappedFrom: 'businessWebsite'
      },
      {
        id: 'federal_tax_id',
        fieldName: 'federalTaxId',
        label: 'Federal Tax ID',
        type: 'ein',
        required: true,
        placeholder: 'If Sole Prop you may use your SS #',
        mappedFrom: 'federalTaxId'
      },
      {
        id: 'mailing_address',
        fieldName: 'mailingAddress',
        label: 'Business Mailing Address',
        type: 'text',
        required: false,
        placeholder: 'If different from location address - otherwise leave blank'
      },
      // Average Ticket & Volume
      {
        id: 'average_ticket',
        fieldName: 'averageTicket',
        label: 'Estimated Average Credit/Debit Card Ticket',
        type: 'currency',
        required: false,
        mappedFrom: 'averageTicket'
      },
      {
        id: 'annual_volume',
        fieldName: 'annualVolume',
        label: 'Estimated Annual VS/MC/AMEX/DISC Volume',
        type: 'currency',
        required: false,
        mappedFrom: 'annualVolume'
      },
      // Owner Information Section
      {
        id: 'owner_name',
        fieldName: 'ownerName',
        label: 'Owner/Officer/Partner Name',
        type: 'text',
        required: true,
        mappedFrom: 'owner.fullName'
      },
      {
        id: 'owner_phone',
        fieldName: 'ownerPhone',
        label: 'Personal Phone',
        type: 'phone',
        required: true,
        mappedFrom: 'owner.phone'
      },
      {
        id: 'owner_email',
        fieldName: 'ownerEmail',
        label: 'Personal Email',
        type: 'email',
        required: true,
        mappedFrom: 'owner.email'
      },
      {
        id: 'owner_dob',
        fieldName: 'ownerDob',
        label: 'Date of Birth',
        type: 'date',
        required: true,
        mappedFrom: 'owner.dateOfBirth'
      },
      {
        id: 'owner_ssn',
        fieldName: 'ownerSsn',
        label: 'Social Security Number',
        type: 'ssn',
        required: true,
        mappedFrom: 'owner.ssn'
      },
      {
        id: 'owner_home_address',
        fieldName: 'ownerHomeAddress',
        label: 'Owner/Officer/Partner Home Address',
        type: 'text',
        required: true
      },
      {
        id: 'notes',
        fieldName: 'notes',
        label: 'Notes',
        type: 'textarea',
        required: false
      }
    ]
  },

  // 2. Free Equipment Program Agreement
  {
    id: 'free-equipment-program',
    name: 'Free Equipment Program Agreement',
    description: 'Agreement for merchants receiving free terminal equipment (Dejavoo P1 or P3). Includes warranty terms and return conditions.',
    category: 'equipment',
    thumbnailPath: '/assets/images/IMG_2476.jpeg',
    pageIndex: 3, // Page 3 in the master PDF
    isRequired: false,
    sortOrder: 2,
    createdAt: new Date('2023-12-01'),
    updatedAt: new Date('2023-12-01'),
    formFields: [
      {
        id: 'dba_merchant_name',
        fieldName: 'dbaMerchantName',
        label: 'DBA Name of Merchant',
        type: 'text',
        required: true,
        mappedFrom: 'businessName'
      },
      {
        id: 'terminal_type_p1',
        fieldName: 'terminalTypeP1',
        label: 'P1 Terminal ($14.95/mo warranty + $10/mo portal)',
        type: 'checkbox',
        required: false
      },
      {
        id: 'terminal_type_p3',
        fieldName: 'terminalTypeP3',
        label: 'P3 Terminal ($19.95/mo warranty + $10/mo portal)',
        type: 'checkbox',
        required: false
      },
      {
        id: 'personal_guarantor_signature',
        fieldName: 'personalGuarantorSignature',
        label: 'Personal Guarantor Signature',
        type: 'signature',
        required: true
      },
      {
        id: 'personal_guarantor_date',
        fieldName: 'personalGuarantorDate',
        label: 'Date',
        type: 'date',
        required: true
      },
      {
        id: 'print_name',
        fieldName: 'printName',
        label: 'Print Name',
        type: 'text',
        required: true,
        mappedFrom: 'owner.fullName'
      },
      {
        id: 'owner_officer_signature',
        fieldName: 'ownerOfficerSignature',
        label: 'Owner/Officer Signature',
        type: 'signature',
        required: true
      },
      {
        id: 'owner_officer_date',
        fieldName: 'ownerOfficerDate',
        label: 'Date',
        type: 'date',
        required: true
      }
    ]
  },

  // 3. Equipment Purchase Agreement
  {
    id: 'equipment-purchase',
    name: 'Equipment Purchase Agreement',
    description: 'Agreement for merchants purchasing terminal equipment outright. Includes SIM card data plans for wireless terminals.',
    category: 'equipment',
    thumbnailPath: '/assets/images/IMG_2477.jpeg',
    pageIndex: 4, // Page 4 in the master PDF
    isRequired: false,
    sortOrder: 3,
    createdAt: new Date('2023-12-01'),
    updatedAt: new Date('2023-12-01'),
    formFields: [
      {
        id: 'merchant_dba',
        fieldName: 'merchantDba',
        label: 'Merchant DBA',
        type: 'text',
        required: true,
        mappedFrom: 'businessName'
      },
      {
        id: 'purchase_address',
        fieldName: 'purchaseAddress',
        label: 'Address',
        type: 'text',
        required: true,
        mappedFrom: 'businessAddress.street'
      },
      {
        id: 'purchase_phone',
        fieldName: 'purchasePhone',
        label: 'Phone',
        type: 'phone',
        required: true,
        mappedFrom: 'businessPhone'
      },
      {
        id: 'terminal_type',
        fieldName: 'terminalType',
        label: 'Terminal Type',
        type: 'text',
        required: true
      },
      {
        id: 'quantity',
        fieldName: 'quantity',
        label: 'Quantity',
        type: 'number',
        required: true
      },
      {
        id: 'price_each',
        fieldName: 'priceEach',
        label: 'Price (each)',
        type: 'currency',
        required: true
      },
      {
        id: 'total',
        fieldName: 'total',
        label: 'Total (excluding sales tax)',
        type: 'currency',
        required: true
      },
      {
        id: 'monthly_fee',
        fieldName: 'monthlyFee',
        label: 'Monthly Fee per Terminal',
        type: 'currency',
        required: false
      },
      // Equipment ACH Authorization
      {
        id: 'equipment_signature',
        fieldName: 'equipmentSignature',
        label: 'Signature of Authorized Signor',
        type: 'signature',
        required: true
      },
      {
        id: 'equipment_date',
        fieldName: 'equipmentDate',
        label: 'Date',
        type: 'date',
        required: true
      },
      {
        id: 'equipment_printed_name',
        fieldName: 'equipmentPrintedName',
        label: 'Printed Name of Authorized Signor',
        type: 'text',
        required: true,
        mappedFrom: 'owner.fullName'
      },
      // SIM Card Section
      {
        id: 'sim_plan_1mb',
        fieldName: 'simPlan1mb',
        label: '1 MB Plan - $7.50/month',
        type: 'checkbox',
        required: false
      },
      {
        id: 'sim_plan_10mb',
        fieldName: 'simPlan10mb',
        label: '10 MB Plan - $16.50/month',
        type: 'checkbox',
        required: false
      },
      {
        id: 'sim_plan_100mb',
        fieldName: 'simPlan100mb',
        label: '100 MB Plan - $29.95/month',
        type: 'checkbox',
        required: false
      },
      {
        id: 'sim_plan_1gb',
        fieldName: 'simPlan1gb',
        label: '1 GB Plan - $44.95/month',
        type: 'checkbox',
        required: false
      },
      // SIM ACH Authorization
      {
        id: 'sim_signature',
        fieldName: 'simSignature',
        label: 'Signature of Authorized Signor (SIM)',
        type: 'signature',
        required: false
      },
      {
        id: 'sim_date',
        fieldName: 'simDate',
        label: 'Date (SIM)',
        type: 'date',
        required: false
      },
      {
        id: 'sim_printed_name',
        fieldName: 'simPrintedName',
        label: 'Printed Name of Authorized Signor (SIM)',
        type: 'text',
        required: false,
        mappedFrom: 'owner.fullName'
      }
    ]
  },

  // 4. PCB Download Sheet (Internal Use Only)
  {
    id: 'pcb-download-sheet',
    name: 'PCB Download Sheet',
    description: 'Internal use form for terminal download configuration. Specifies terminal type, POS system, and connectivity settings.',
    category: 'internal',
    thumbnailPath: '/assets/images/IMG_2478.jpeg',
    pageIndex: 5, // Page 5 in the master PDF
    isRequired: false,
    sortOrder: 4,
    createdAt: new Date('2023-12-01'),
    updatedAt: new Date('2023-12-01'),
    formFields: [
      {
        id: 'download_dba_name',
        fieldName: 'downloadDbaName',
        label: 'DBA Name',
        type: 'text',
        required: true,
        mappedFrom: 'businessName'
      },
      {
        id: 'download_address',
        fieldName: 'downloadAddress',
        label: 'Address',
        type: 'text',
        required: true,
        mappedFrom: 'businessAddress.street'
      },
      {
        id: 'download_city',
        fieldName: 'downloadCity',
        label: 'City',
        type: 'text',
        required: true,
        mappedFrom: 'businessAddress.city'
      },
      {
        id: 'download_state',
        fieldName: 'downloadState',
        label: 'State',
        type: 'text',
        required: true,
        mappedFrom: 'businessAddress.state'
      },
      {
        id: 'download_zip',
        fieldName: 'downloadZip',
        label: 'Zip',
        type: 'text',
        required: true,
        mappedFrom: 'businessAddress.zip'
      },
      {
        id: 'download_phone',
        fieldName: 'downloadPhone',
        label: 'Phone',
        type: 'phone',
        required: true,
        mappedFrom: 'businessPhone'
      },
      {
        id: 'agent_name',
        fieldName: 'agentName',
        label: 'Agent Name',
        type: 'text',
        required: true
      },
      // Terminal Type Section
      {
        id: 'terminal_p1',
        fieldName: 'terminalP1',
        label: 'P1',
        type: 'checkbox',
        required: false
      },
      {
        id: 'terminal_p1_qty',
        fieldName: 'terminalP1Qty',
        label: 'P1 Quantity',
        type: 'number',
        required: false
      },
      {
        id: 'terminal_p3',
        fieldName: 'terminalP3',
        label: 'P3',
        type: 'checkbox',
        required: false
      },
      {
        id: 'terminal_p3_qty',
        fieldName: 'terminalP3Qty',
        label: 'P3 Quantity',
        type: 'number',
        required: false
      },
      {
        id: 'terminal_p5',
        fieldName: 'terminalP5',
        label: 'P5',
        type: 'checkbox',
        required: false
      },
      {
        id: 'terminal_p5_qty',
        fieldName: 'terminalP5Qty',
        label: 'P5 Quantity',
        type: 'number',
        required: false
      },
      // POS Type Section
      {
        id: 'pos_hotsauce',
        fieldName: 'posHotsauce',
        label: 'HotSauce POS',
        type: 'checkbox',
        required: false
      },
      {
        id: 'pos_dejapaypro',
        fieldName: 'posDejapaypro',
        label: 'Dejapaypro POS',
        type: 'checkbox',
        required: false
      },
      {
        id: 'pos_ovvi',
        fieldName: 'posOvvi',
        label: 'OVVI POS',
        type: 'checkbox',
        required: false
      },
      {
        id: 'pos_union',
        fieldName: 'posUnion',
        label: 'Union POS',
        type: 'checkbox',
        required: false
      },
      {
        id: 'pos_tabit',
        fieldName: 'posTabit',
        label: 'Tabit POS',
        type: 'checkbox',
        required: false
      },
      // SVC Fee for Dual Pricing
      {
        id: 'svc_fee_percent',
        fieldName: 'svcFeePercent',
        label: 'SVC Fee % (For Dual Pricing)',
        type: 'percentage',
        required: false
      },
      // File Build Type
      {
        id: 'file_build_retail',
        fieldName: 'fileBuildRetail',
        label: 'Retail',
        type: 'checkbox',
        required: false
      },
      {
        id: 'file_build_retail_tip',
        fieldName: 'fileBuildRetailTip',
        label: 'Retail w/Tip',
        type: 'checkbox',
        required: false
      },
      {
        id: 'file_build_restaurant',
        fieldName: 'fileBuildRestaurant',
        label: 'Restaurant',
        type: 'checkbox',
        required: false
      },
      // Connectivity
      {
        id: 'connectivity_ip',
        fieldName: 'connectivityIp',
        label: 'IP',
        type: 'checkbox',
        required: false
      },
      {
        id: 'connectivity_wifi',
        fieldName: 'connectivityWifi',
        label: 'WiFi',
        type: 'checkbox',
        required: false
      },
      {
        id: 'connectivity_mobile',
        fieldName: 'connectivityMobile',
        label: 'Mobile Data (Sim Card)',
        type: 'checkbox',
        required: false
      },
      // Ship To
      {
        id: 'ship_to_merchant',
        fieldName: 'shipToMerchant',
        label: 'Ship to Merchant',
        type: 'checkbox',
        required: false
      },
      {
        id: 'ship_to_agent',
        fieldName: 'shipToAgent',
        label: 'Ship to Agent',
        type: 'checkbox',
        required: false
      },
      {
        id: 'additional_notes',
        fieldName: 'additionalNotes',
        label: 'Additional Notes',
        type: 'textarea',
        required: false
      }
    ]
  },

  // 5. PCI Compliance Merchant Agreement
  {
    id: 'pci-compliance-agreement',
    name: 'PCI Compliance Merchant Agreement',
    description: 'Agreement for PCBancard to assist with PCI compliance questionnaire. Includes hold harmless and indemnification clauses.',
    category: 'compliance',
    thumbnailPath: '/assets/images/IMG_2480.jpeg',
    pageIndex: 6, // Page 6 in the master PDF
    isRequired: false,
    sortOrder: 5,
    createdAt: new Date('2023-12-01'),
    updatedAt: new Date('2023-12-01'),
    formFields: [
      {
        id: 'pci_business_name',
        fieldName: 'pciBusinessName',
        label: 'Business Name',
        type: 'text',
        required: true,
        mappedFrom: 'businessName'
      },
      {
        id: 'pci_owner_signature',
        fieldName: 'pciOwnerSignature',
        label: 'Owner Signature',
        type: 'signature',
        required: true
      },
      {
        id: 'pci_date',
        fieldName: 'pciDate',
        label: 'Date',
        type: 'date',
        required: true
      },
      {
        id: 'pci_owner_name_printed',
        fieldName: 'pciOwnerNamePrinted',
        label: 'Owner Name (Printed)',
        type: 'text',
        required: true,
        mappedFrom: 'owner.fullName'
      }
    ]
  },

  // 6. Dual Pricing Charity Program
  {
    id: 'dual-pricing-charity',
    name: 'Dual Pricing Charity Program',
    description: 'Optional charity donation form allowing merchants to designate a portion of processing fees to a charity of their choice.',
    category: 'addendum',
    thumbnailPath: '/assets/images/IMG_2481.jpeg',
    pageIndex: 7, // Page 7 in the master PDF
    isRequired: false,
    sortOrder: 6,
    createdAt: new Date('2023-12-01'),
    updatedAt: new Date('2023-12-01'),
    formFields: [
      {
        id: 'charity_business_name',
        fieldName: 'charityBusinessName',
        label: 'Business Name',
        type: 'text',
        required: true,
        mappedFrom: 'businessName'
      },
      {
        id: 'charity_owner_name',
        fieldName: 'charityOwnerName',
        label: 'Business Owner Name',
        type: 'text',
        required: true,
        mappedFrom: 'owner.fullName'
      },
      {
        id: 'charity_owner_signature',
        fieldName: 'charityOwnerSignature',
        label: 'Business Owner Signature',
        type: 'signature',
        required: true
      },
      {
        id: 'charity_name',
        fieldName: 'charityName',
        label: 'Charity Name',
        type: 'text',
        required: true
      },
      {
        id: 'charity_address',
        fieldName: 'charityAddress',
        label: 'Charity Address',
        type: 'text',
        required: false
      },
      {
        id: 'charity_city_state_zip',
        fieldName: 'charityCityStateZip',
        label: 'City/State/Zip',
        type: 'text',
        required: false
      },
      {
        id: 'charity_phone',
        fieldName: 'charityPhone',
        label: 'Phone Number',
        type: 'phone',
        required: false
      },
      {
        id: 'charity_email',
        fieldName: 'charityEmail',
        label: 'Email Address',
        type: 'email',
        required: false
      },
      {
        id: 'charity_website',
        fieldName: 'charityWebsite',
        label: 'Website',
        type: 'text',
        required: false
      },
      {
        id: 'signage_yes',
        fieldName: 'signageYes',
        label: 'Yes - I want signage',
        type: 'checkbox',
        required: false
      },
      {
        id: 'signage_no',
        fieldName: 'signageNo',
        label: 'No - I don\'t want signage',
        type: 'checkbox',
        required: false
      }
    ]
  }
];

// Pre-defined Document Packages
export const documentPackages: DocumentPackage[] = [
  {
    id: 'standard-dual-pricing',
    name: 'Standard Dual Pricing Package',
    description: 'Complete document set for new merchants with dual pricing program',
    documentTemplateIds: [
      'merchant-application',
      'free-equipment-program',
      'pci-compliance-agreement',
      'dual-pricing-charity'
    ],
    isDefault: true,
    createdAt: new Date('2023-12-01')
  },
  {
    id: 'equipment-purchase-package',
    name: 'Equipment Purchase Package',
    description: 'Document set for merchants purchasing equipment outright',
    documentTemplateIds: [
      'merchant-application',
      'equipment-purchase',
      'pci-compliance-agreement'
    ],
    isDefault: false,
    createdAt: new Date('2023-12-01')
  },
  {
    id: 'full-application-package',
    name: 'Full Application Package',
    description: 'Complete document set with all available forms',
    documentTemplateIds: [
      'merchant-application',
      'free-equipment-program',
      'equipment-purchase',
      'pcb-download-sheet',
      'pci-compliance-agreement',
      'dual-pricing-charity'
    ],
    isDefault: false,
    createdAt: new Date('2023-12-01')
  }
];

// Helper function to get document by ID
export const getDocumentById = (id: string): DocumentTemplate | undefined => {
  return documentTemplates.find(doc => doc.id === id);
};

// Helper function to get documents by category
export const getDocumentsByCategory = (category: string): DocumentTemplate[] => {
  return documentTemplates.filter(doc => doc.category === category);
};

// Helper function to get package by ID
export const getPackageById = (id: string): DocumentPackage | undefined => {
  return documentPackages.find(pkg => pkg.id === id);
};

// Helper function to get documents for a package
export const getPackageDocuments = (packageId: string): DocumentTemplate[] => {
  const pkg = getPackageById(packageId);
  if (!pkg) return [];
  return pkg.documentTemplateIds
    .map(id => getDocumentById(id))
    .filter((doc): doc is DocumentTemplate => doc !== undefined);
};
