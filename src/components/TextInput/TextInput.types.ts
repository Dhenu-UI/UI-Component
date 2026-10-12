import { InputHTMLAttributes, ReactNode } from 'react';

export interface TextInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  helperText?: string;
  error?: string;
  leftIcon?: ReactNode;
  rightActionText?: string;
  onRightActionClick?: () => void;
  onClearClick?: () => void;
  fullWidth?: boolean;
}