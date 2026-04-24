import { supabase } from './supabase';

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
    throw new Error(error.message ?? `Edge function ${name} failed`);
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
