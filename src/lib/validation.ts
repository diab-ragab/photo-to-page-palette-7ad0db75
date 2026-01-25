import { z } from "zod";

// Login validation schema
export const loginSchema = z.object({
  login: z
    .string()
    .min(1, "Username is required")
    .max(50, "Username is too long")
    .regex(/^[a-zA-Z0-9_-]+$/, "Username can only contain letters, numbers, underscores, and hyphens"),
  passwd: z
    .string()
    .min(1, "Password is required")
    .max(128, "Password is too long"),
});

// Registration validation schema
export const registerSchema = z.object({
  login: z
    .string()
    .min(4, "Username must be at least 4 characters")
    .max(10, "Username must be at most 10 characters")
    .regex(/^[a-zA-Z0-9_-]+$/, "Username can only contain letters, numbers, underscores, and hyphens"),
  passwd: z
    .string()
    .min(3, "Password must be at least 3 characters")
    .max(16, "Password must be at most 16 characters"),
  repasswd: z.string(),
  email: z
    .string()
    .email("Invalid email address")
    .max(255, "Email is too long"),
}).refine((data) => data.passwd === data.repasswd, {
  message: "Passwords do not match",
  path: ["repasswd"],
});

// Change password validation schema
export const changePasswordSchema = z.object({
  oldPasswd: z
    .string()
    .min(1, "Current password is required")
    .max(128, "Password is too long"),
  newPasswd: z
    .string()
    .min(3, "New password must be at least 3 characters")
    .max(16, "New password must be at most 16 characters"),
  confirmPasswd: z.string(),
}).refine((data) => data.newPasswd === data.confirmPasswd, {
  message: "Passwords do not match",
  path: ["confirmPasswd"],
});

// Forgot password validation schema
export const forgotPasswordSchema = z.object({
  login: z
    .string()
    .min(1, "Username is required")
    .max(50, "Username is too long")
    .regex(/^[a-zA-Z0-9_-]+$/, "Invalid username format"),
  email: z
    .string()
    .email("Invalid email address")
    .max(255, "Email is too long"),
  newPasswd: z
    .string()
    .min(3, "Password must be at least 3 characters")
    .max(16, "Password must be at most 16 characters"),
  confirmPasswd: z.string(),
}).refine((data) => data.newPasswd === data.confirmPasswd, {
  message: "Passwords do not match",
  path: ["confirmPasswd"],
});

// Notification validation schema
export const notificationSchema = z.object({
  title: z
    .string()
    .min(1, "Title is required")
    .max(200, "Title is too long")
    .transform((val) => sanitizeInput(val)),
  message: z
    .string()
    .min(1, "Message is required")
    .max(2000, "Message is too long")
    .transform((val) => sanitizeInput(val)),
  type: z.enum(["news", "update", "maintenance", "event"]),
});

// Sanitize user input to prevent XSS
export function sanitizeInput(input: string): string {
  return input
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;")
    .replace(/\//g, "&#x2F;")
    .trim();
}

// Rate limiting helper (client-side)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

export function checkRateLimit(action: string, maxAttempts: number = 5, windowMs: number = 60000): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(action);
  
  if (!entry || now > entry.resetTime) {
    rateLimitMap.set(action, { count: 1, resetTime: now + windowMs });
    return true;
  }
  
  if (entry.count >= maxAttempts) {
    return false;
  }
  
  entry.count++;
  return true;
}

export function getRateLimitRemainingTime(action: string): number {
  const entry = rateLimitMap.get(action);
  if (!entry) return 0;
  
  const remaining = entry.resetTime - Date.now();
  return remaining > 0 ? Math.ceil(remaining / 1000) : 0;
}
