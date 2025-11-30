import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Capitalize each word in a string
 * Example: "john doe" -> "John Doe", "mary jane smith" -> "Mary Jane Smith"
 */
export function capitalizeWords(str: string): string {
  if (!str || str.trim().length === 0) {
    return str;
  }
  
  return str
    .trim()
    .split(/\s+/)
    .map((word) => {
      if (word.length === 0) return word;
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(" ");
}