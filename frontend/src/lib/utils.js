import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

// Merge Tailwind classes cleanly
export function cn(...inputs) { return twMerge(clsx(inputs)) }

export const peso = (n) => `₱${Number(n || 0).toLocaleString('en-PH')}`
export const pesoFixed = (n) => `₱${Number(n || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`