import React from 'react';
import { TextInputProps } from './TextInput.types';
import './TextInput.scss';

// Simple Search Icon Component
const SearchIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8"></circle>
    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
  </svg>
);

// Simple Clear Icon (X) Component
const CloseIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18"></line>
    <line x1="6" y1="6" x2="18" y2="18"></line>
  </svg>
);

export const TextInput: React.FC<TextInputProps> = ({
  helperText,
  error,
  leftIcon = <SearchIcon />,
  rightActionText,
  onRightActionClick,
  onClearClick,
  fullWidth = false,
  className = '',
  placeholder = 'Label',
  ...props
}) => {
  return (
    <div className={`text-input-container ${fullWidth ? 'text-input-container--full-width' : ''}`}>
      <div className={`text-input-wrapper ${error ? 'text-input-wrapper--error' : ''}`}>
        {leftIcon && <span className="text-input-icon">{leftIcon}</span>}
        
        <input
          className={`text-input ${className}`}
          placeholder={placeholder}
          {...props}
        />

        <div className="text-input-actions">
          {rightActionText && (
            <button type="button" className="text-input-action-btn" onClick={onRightActionClick}>
              {rightActionText}
            </button>
          )}
          {onClearClick && (
            <button type="button" className="text-input-clear-btn" onClick={onClearClick} aria-label="Clear">
              <CloseIcon />
            </button>
          )}
        </div>
      </div>

      {(error || helperText) && (
        <span className={`text-input-helper-text ${error ? 'text-input-helper-text--error' : ''}`}>
          {error || helperText}
        </span>
      )}
    </div>
  );
};