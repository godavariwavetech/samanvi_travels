import React from 'react'
import { Label } from './Label'

interface FormFieldProps {
  label: string
  children: React.ReactNode
  className?: string
  error?: string
}

export const FormField = ({ label, children, className = '', error }: FormFieldProps) => (
  <div className={className}>
    <Label>{label}</Label>
    {children}
    {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
  </div>
)
