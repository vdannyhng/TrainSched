import i18n from '@/i18n';

// Tests laufen mit deutscher UI, unabhängig von der Rechner-Sprache.
void i18n.changeLanguage('de');

// Unit-Tests sprechen nie mit Supabase; der echte Client braucht native Module (expo-sqlite).
jest.mock('@/lib/supabase', () => ({ supabase: {} }));
