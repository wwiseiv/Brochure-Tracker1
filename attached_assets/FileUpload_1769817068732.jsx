import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';

const ACCEPTED_FILES = {
  'application/pdf': ['.pdf'],
  'image/*': ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.tiff'],
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
  'application/vnd.ms-excel': ['.xls'],
  'text/csv': ['.csv'],
  'text/plain': ['.txt']
};

export default function FileUpload({ onFilesSelected, onSkip }) {
  const [files, setFiles] = useState([]);
  const [error, setError] = useState(null);

  const onDrop = useCallback((acceptedFiles, rejectedFiles) => {
    setError(null);
    
    if (rejectedFiles.length > 0) {
      setError(`Some files were rejected. Accepted formats: PDF, Images, Excel, CSV`);
    }
    
    // Add new files to existing ones
    setFiles(prev => {
      const newFiles = [...prev];
      acceptedFiles.forEach(file => {
        // Avoid duplicates
        if (!newFiles.find(f => f.name === file.name && f.size === file.size)) {
          newFiles.push(file);
        }
      });
      return newFiles;
    });
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPTED_FILES,
    maxSize: 20 * 1024 * 1024 // 20MB
  });

  const removeFile = (index) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleContinue = () => {
    if (files.length > 0) {
      onFilesSelected(files);
    }
  };

  const getFileIcon = (file) => {
    if (file.type === 'application/pdf') return '📄';
    if (file.type.startsWith('image/')) return '🖼️';
    if (file.type.includes('spreadsheet') || file.type.includes('excel') || file.name.endsWith('.csv')) return '📊';
    return '📝';
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 via-indigo-700 to-purple-700 px-6 py-6">
          <h2 className="text-2xl font-bold text-white">Upload Statement</h2>
          <p className="text-indigo-200 mt-1">
            Upload the merchant's processing statement for AI analysis
          </p>
        </div>

        <div className="p-6">
          {/* Dropzone */}
          <div
            {...getRootProps()}
            className={`
              border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all
              ${isDragActive 
                ? 'border-indigo-500 bg-indigo-50' 
                : 'border-gray-300 hover:border-indigo-400 hover:bg-gray-50'
              }
            `}
          >
            <input {...getInputProps()} />
            
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
              </div>
            </div>

            {isDragActive ? (
              <p className="text-lg text-indigo-600 font-medium">Drop files here...</p>
            ) : (
              <>
                <p className="text-lg text-gray-700 font-medium">
                  Drag & drop statement files here
                </p>
                <p className="text-gray-500 mt-1">or click to browse</p>
              </>
            )}

            <div className="mt-4 flex flex-wrap justify-center gap-2">
              <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm font-medium">PDF</span>
              <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">Images</span>
              <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">Excel</span>
              <span className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-sm font-medium">CSV</span>
            </div>
          </div>

          {/* Error message */}
          {error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          {/* File list */}
          {files.length > 0 && (
            <div className="mt-6">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">
                Selected Files ({files.length})
              </h3>
              <div className="space-y-2">
                {files.map((file, index) => (
                  <div 
                    key={index}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{getFileIcon(file)}</span>
                      <div>
                        <p className="font-medium text-gray-900 text-sm truncate max-w-xs">
                          {file.name}
                        </p>
                        <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => removeFile(index)}
                      className="p-1 hover:bg-gray-200 rounded transition"
                    >
                      <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div className="mt-6 flex flex-col sm:flex-row gap-3">
            <button
              onClick={handleContinue}
              disabled={files.length === 0}
              className={`
                flex-1 py-3 px-4 rounded-xl font-semibold transition flex items-center justify-center gap-2
                ${files.length > 0
                  ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                  : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                }
              `}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
              Analyze {files.length > 0 ? `${files.length} File${files.length > 1 ? 's' : ''}` : 'Statement'}
            </button>
            
            <button
              onClick={onSkip}
              className="flex-1 py-3 px-4 rounded-xl font-semibold border-2 border-gray-300 text-gray-700 hover:bg-gray-50 transition"
            >
              Enter Data Manually
            </button>
          </div>

          {/* Help text */}
          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <h4 className="font-semibold text-blue-900 text-sm mb-2">💡 Tips for best results:</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Upload clear, readable images or PDFs</li>
              <li>• Include all pages of multi-page statements</li>
              <li>• Excel/CSV files should have labeled columns</li>
              <li>• Multiple files will be combined for analysis</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
