import { base44 } from '@/api/base44Client';

export const startTelnyxCall = (payload = {}) => base44.functions.invoke('startTelnyxCall', payload);
