export interface Pais {
  iso: string;
  nome: string;
  moeda: string;
  bandeira: string;
}

export const PAISES: Pais[] = [
  { iso: 'US', nome: 'Estados Unidos', moeda: 'USD', bandeira: '🇺🇸' },
  { iso: 'GB', nome: 'Reino Unido', moeda: 'GBP', bandeira: '🇬🇧' },
  { iso: 'DE', nome: 'Alemanha', moeda: 'EUR', bandeira: '🇩🇪' },
  { iso: 'FR', nome: 'França', moeda: 'EUR', bandeira: '🇫🇷' },
  { iso: 'IT', nome: 'Itália', moeda: 'EUR', bandeira: '🇮🇹' },
  { iso: 'ES', nome: 'Espanha', moeda: 'EUR', bandeira: '🇪🇸' },
  { iso: 'PT', nome: 'Portugal', moeda: 'EUR', bandeira: '🇵🇹' },
  { iso: 'NL', nome: 'Holanda', moeda: 'EUR', bandeira: '🇳🇱' },
  { iso: 'IE', nome: 'Irlanda', moeda: 'EUR', bandeira: '🇮🇪' },
  { iso: 'CH', nome: 'Suíça', moeda: 'CHF', bandeira: '🇨🇭' },
  { iso: 'CA', nome: 'Canadá', moeda: 'CAD', bandeira: '🇨🇦' },
  { iso: 'MX', nome: 'México', moeda: 'MXN', bandeira: '🇲🇽' },
  { iso: 'AR', nome: 'Argentina', moeda: 'ARS', bandeira: '🇦🇷' },
  { iso: 'CL', nome: 'Chile', moeda: 'CLP', bandeira: '🇨🇱' },
  { iso: 'UY', nome: 'Uruguai', moeda: 'UYU', bandeira: '🇺🇾' },
  { iso: 'CN', nome: 'China', moeda: 'CNY', bandeira: '🇨🇳' },
  { iso: 'JP', nome: 'Japão', moeda: 'JPY', bandeira: '🇯🇵' },
  { iso: 'KR', nome: 'Coreia do Sul', moeda: 'KRW', bandeira: '🇰🇷' },
  { iso: 'IN', nome: 'Índia', moeda: 'INR', bandeira: '🇮🇳' },
  { iso: 'AU', nome: 'Austrália', moeda: 'AUD', bandeira: '🇦🇺' },
  { iso: 'OTHER', nome: 'Outro', moeda: 'USD', bandeira: '🌐' },
];

export function getPais(iso: string | null | undefined): Pais | undefined {
  if (!iso) return undefined;
  return PAISES.find((p) => p.iso === iso);
}

export const MOEDAS = ['USD', 'EUR', 'GBP', 'CHF', 'CAD', 'JPY', 'CNY', 'MXN', 'ARS', 'CLP', 'UYU', 'AUD', 'INR', 'KRW', 'BRL'];