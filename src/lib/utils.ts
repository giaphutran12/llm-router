import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Cleans up model responses by removing training artifacts and formatting issues
 */
export function cleanModelResponse(response: string): string {
  if (!response) return response;

  let cleaned = response;

  // Remove common training artifacts
  const artifacts = [
    /analysis/gi,
    /assistantfinal/gi,
    /user\s+wrote:/gi,
    /they\s+are\s+asking/gi,
    /so\s+count:/gi,
    /so\s+answer:/gi,
    /probably\s+the\s+assistant\s+should/gi,
    /but\s+maybe\s+the\s+user\s+expects/gi,
    /just\s+answer:/gi,
    /short\./gi,
  ];

  artifacts.forEach(pattern => {
    cleaned = cleaned.replace(pattern, "");
  });

  // Remove multiple spaces and normalize
  cleaned = cleaned.replace(/\s+/g, " ").trim();

  // Remove leading/trailing punctuation
  cleaned = cleaned.replace(/^[.,\s]+|[.,\s]+$/g, "");

  // If the response is too short after cleaning, return original
  if (cleaned.length < 10) {
    return response;
  }

  return cleaned;
}
