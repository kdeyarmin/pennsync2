import { base44 } from '@/api/base44Client';

export const generateTrainingVideo = (payload = {}) => base44.functions.invoke('generateTrainingVideo', payload);
