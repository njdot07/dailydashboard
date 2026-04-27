import { supabase } from './supabase';

/**
 * Error thrown when an Edge Function responds with a non-2xx status.
 * Preserves the structured `{ error, detail }` body that our functions
 * return, so callers can branch on `code` (e.g. "refresh-failed") rather
 * than string-matching a generic wrapper message.
 */
export class EdgeFunctionError extends Error {
  code: string;
  detail: string | null;
  status: number;

  constructor(
    code: string,
    detail: string | null,
    status: number,
    fallbackMessage: string,
  ) {
    super(detail ?? code ?? fallbackMessage);
    this.name = 'EdgeFunctionError';
    this.code = code;
    this.detail = detail;
    this.status = status;
  }
}

interface SupabaseFunctionsHttpContext {
  status?: number;
  json?: () => Promise<unknown>;
  text?: () => Promise<string>;
}

async function unwrapFunctionError(
  name: string,
  error: { message?: string; context?: unknown },
): Promise<EdgeFunctionError> {
  const fallback = error.message ?? `Edge function ${name} failed`;
  const ctx = error.context as SupabaseFunctionsHttpContext | undefined;
  const status = ctx?.status ?? 0;
  // Supabase's FunctionsHttpError exposes the underlying Response via
  // error.context. Read the body so we recover the {error, detail} shape
  // our Deno handlers emit.
  try {
    if (ctx?.json) {
      const body = (await ctx.json()) as
        | { error?: string; detail?: string }
        | null;
      if (body && typeof body === 'object') {
        return new EdgeFunctionError(
          body.error ?? 'unknown',
          body.detail ?? null,
          status,
          fallback,
        );
      }
    } else if (ctx?.text) {
      const text = await ctx.text();
      return new EdgeFunctionError('unknown', text || null, status, fallback);
    }
  } catch {
    // Body already consumed or not JSON — fall through to fallback.
  }
  return new EdgeFunctionError('unknown', null, status, fallback);
}

/**
 * Thin wrapper around supabase.functions.invoke that normalises error
 * handling and forwards the current session's access token automatically.
 * Every integration Edge Function should be called through this helper so
 * auth + error shape stay consistent across widgets.
 */
export async function callEdgeFunction<TResponse = unknown>(
  name: string,
  body?: Record<string, unknown>,
): Promise<TResponse> {
  if (!supabase) {
    throw new Error('Supabase client is not configured.');
  }
  const { data, error } = await supabase.functions.invoke(name, { body });
  if (error) {
    throw await unwrapFunctionError(name, error);
  }
  return data as TResponse;
}

export interface HelloResponse {
  message: string;
  userId: string;
  runtime: string;
  now: string;
}

export function pingHello(): Promise<HelloResponse> {
  return callEdgeFunction<HelloResponse>('hello');
}
