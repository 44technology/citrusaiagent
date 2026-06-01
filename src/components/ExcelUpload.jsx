import React, { useRef, useState } from 'react';
import { UploadCloud, FileSpreadsheet, Loader2 } from 'lucide-react';
import { uploadApi } from '../services/api';

const ExcelUpload = ({ onDataParsed }) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (file) {
      await uploadFile(file);
    }
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    setIsHovered(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      await uploadFile(file);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsHovered(true);
  };

  const handleDragLeave = () => {
    setIsHovered(false);
  };

  const uploadFile = async (file) => {
    try {
      setIsUploading(true);
      const result = await uploadApi.excel(file);
      onDataParsed(result.contacts);
    } catch (err) {
      console.error('Upload failed:', err);
      alert('Failed to upload file. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="upload-section">
      <div 
        className={`upload-dropzone ${isHovered ? 'hovered' : ''}`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => !isUploading && fileInputRef.current?.click()}
        style={{ opacity: isUploading ? 0.6 : 1, pointerEvents: isUploading ? 'none' : 'auto' }}
      >
        <div className="upload-icon-pulse">
          {isUploading ? (
            <Loader2 size={40} className="text-orange animate-spin" />
          ) : (
            <UploadCloud size={40} className="text-orange" />
          )}
        </div>
        <h4>{isUploading ? 'Uploading...' : 'Upload Customer List'}</h4>
        <p className="text-sec">
          {isUploading 
            ? 'Importing contacts to database...' 
            : 'Drag and drop your .xlsx file here, or click to browse.'}
        </p>
        
        <div className="file-format-badge">
          <FileSpreadsheet size={16} />
          <span>Supports Excel format</span>
        </div>
      </div>
      <input 
        type="file" 
        accept=".xlsx, .xls"
        style={{ display: 'none' }}
        ref={fileInputRef}
        onChange={handleFileUpload}
      />
    </div>
  );
};

export default ExcelUpload;
