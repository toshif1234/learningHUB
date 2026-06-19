import { useCallback, useState } from 'react';
import { Upload, X, FileText, CheckCircle } from 'lucide-react';

export default function FileUploadZone({ onFileSelect, accept, maxSize = 50, uploading = false, progress = 0, currentFile = null, onClear, className = '' }) {
  const [dragActive, setDragActive] = useState(false);

  const handleDrag = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      onFileSelect(e.dataTransfer.files[0]);
    }
  }, [onFileSelect]);

  const handleChange = useCallback((e) => {
    if (e.target.files && e.target.files[0]) {
      onFileSelect(e.target.files[0]);
    }
  }, [onFileSelect]);

  const formatSize = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  if (currentFile && !uploading) {
    return (
      <div id="file-upload-selected" className={`glass-card p-4 ${className}`}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary-500/20 flex items-center justify-center">
            <FileText className="w-5 h-5 text-primary-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-dark-100 truncate">{currentFile.name}</p>
            <p className="text-xs text-dark-400">{formatSize(currentFile.size)}</p>
          </div>
          <button
            id="file-upload-clear-btn"
            onClick={onClear}
            className="p-1.5 rounded-lg text-dark-400 hover:text-rose-400 hover:bg-dark-700/50 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      id="file-upload-zone"
      className={`relative ${className}`}
      onDragEnter={handleDrag}
      onDragLeave={handleDrag}
      onDragOver={handleDrag}
      onDrop={handleDrop}
    >
      <label
        className={`flex flex-col items-center justify-center w-full p-8 border-2 border-dashed rounded-2xl cursor-pointer transition-all duration-300
          ${dragActive
            ? 'border-primary-500 bg-primary-500/10'
            : 'border-dark-600 hover:border-dark-500 hover:bg-dark-800/30'
          }
          ${uploading ? 'pointer-events-none' : ''}
        `}
      >
        {uploading ? (
          <div className="w-full">
            <div className="flex items-center justify-center mb-3">
              <div className="w-8 h-8 rounded-full border-2 border-dark-600 border-t-primary-500 animate-spin" />
            </div>
            <div className="w-full bg-dark-700/50 rounded-full h-2 mb-2">
              <div
                className="h-2 bg-gradient-to-r from-primary-600 to-primary-400 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-xs text-dark-400 text-center">{progress}% uploaded</p>
          </div>
        ) : (
          <>
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-3 transition-colors ${dragActive ? 'bg-primary-500/20' : 'bg-dark-700/50'}`}>
              <Upload className={`w-6 h-6 ${dragActive ? 'text-primary-400' : 'text-dark-400'}`} />
            </div>
            <p className="text-sm text-dark-200 mb-1">
              <span className="text-primary-400 font-medium">Click to upload</span> or drag and drop
            </p>
            <p className="text-xs text-dark-500">
              {accept ? `Accepted: ${accept}` : 'Any file type'} • Max {maxSize}MB
            </p>
          </>
        )}
        {!uploading && (
          <input
            id="file-upload-input"
            type="file"
            className="hidden"
            accept={accept}
            onChange={handleChange}
          />
        )}
      </label>
    </div>
  );
}
