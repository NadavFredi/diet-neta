/**
 * Response Helpers
 * Shared utilities for creating standardized responses
 */

import { corsHeaders } from './cors.ts';

export interface SuccessResponse<T = any> {
  success: true;
  data?: T;
  message?: string;
  [key: string]: any;
}

export interface ErrorResponse {
  success: false;
  error: string;
  [key: string]: any;
}

/**
 * Create a success response
 */
export function successResponse<T>(
  data?: T,
  message?: string,
  status: number = 200,
  additionalHeaders: Record<string, string> = {}
): Response {
  const body: SuccessResponse<T> = {
    success: true,
  };

  if (data !== undefined) {
    body.data = data;
  }

  if (message) {
    body.message = message;
  }

  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
      ...additionalHeaders,
    },
  });
}

/**
 * Create an error response
 */
export function errorResponse(
  error: string,
  status: number = 400,
  additionalData: Record<string, any> = {}
): Response {
  const body: ErrorResponse = {
    success: false,
    error,
    ...additionalData,
  };

  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  });
}

