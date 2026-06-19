import { base44 } from '@/api/base44Client';

export const sendTelnyxFax = (payload = {}) => base44.functions.invoke('sendTelnyxFax', payload);
