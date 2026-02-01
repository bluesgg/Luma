import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * Merges Tailwind CSS classes with clsx
 * Handles conflicts by giving precedence to later classes
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
