import { base44 } from '@/api/base44Client';

export const sendTelnyxSms = (payload = {}) => base44.functions.invoke('sendTelnyxSms', payload);
