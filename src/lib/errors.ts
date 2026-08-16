// Erros do supabase-js (PostgrestError, AuthError, etc.) são objetos simples com `.message`,
// não instâncias de Error — `e instanceof Error` sempre falha pra eles. Use esta função no lugar
// de `e instanceof Error ? e.message : fallback` em qualquer catch que possa receber um erro do
// Supabase.
export function mensagemErro(e: unknown, fallback: string): string {
  if (e instanceof Error) return e.message
  if (e && typeof e === 'object' && 'message' in e && typeof e.message === 'string') return e.message
  return fallback
}
