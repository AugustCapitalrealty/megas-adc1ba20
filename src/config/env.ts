function getRequiredEnv(name: string): string {
  const value = import.meta.env[name];
  if (!value) {
    throw new Error(
      `Variável de ambiente ausente: ${name}. Configure-a no arquivo .env para inicializar a aplicação.`
    );
  }
  return value;
}

export const env = {
  VITE_SUPABASE_URL: getRequiredEnv('VITE_SUPABASE_URL'),
  VITE_SUPABASE_PUBLISHABLE_KEY: getRequiredEnv('VITE_SUPABASE_PUBLISHABLE_KEY'),
};

export { getRequiredEnv };
