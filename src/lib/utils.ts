import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Merges conditional Tailwind CSS class names without style conflicts.
 *
 * @param {...ClassValue[]} inputs - Conditional class values or arrays
 * @returns {string} Deduplicated class string
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
