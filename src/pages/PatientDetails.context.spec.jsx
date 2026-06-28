import { describe, it, expect, vi, beforeEach } from 'vitest';
import { waitFor } from '@testing-library/react';
import { QueryClient } from '@tanstack/react-query';
import { renderWithProviders } from '@/test/testUtils';

const PATIENT = { id: 'p1', first_name: 'Jane', last_name: 'Doe', status: 'active', assigned_nurses: ['nurse@x.com'] };
const CTX = {
  patient: PATIENT,
  visits: [{ id: 'v1', patient_id: 'p1', status: 'completed', visit_date: '2026-06-01' }],
  carePlans: [{ id: 'cp1', patient_id: 'p1', status: 'active' }],
  incidents: [],
  tasks: [],
  activeAlerts: [],
};

const { invoke } = vi.hoisted(() => ({ invoke: vi.fn() }));

vi.mock('@/api/base44Client', () => {
  // Self-contained broad stub (factory is hoisted, so no outer imports): every
  // entity call resolves to []/{} so the page's many child components mount
  // harmlessly; functions.invoke is the hoisted spy serving getPatientContext.
  const arr = async () => [];
  const obj = async () => ({});
  const entityStub = new Proxy({}, {
    get: (_t, p) => {
      if (p === 'then') return undefined;
      if (p === 'get' || p === 'create' || p === 'update') return obj;
      return arr;
    },
  });
  const entities = new Proxy({}, { get: () => entityStub });
  const integrations = new Proxy({}, { get: () => new Proxy({}, { get: () => async () => ({}) }) });
  const functions = { invoke };
  return {
    base44: {
      entities,
      functions,
      integrations,
      auth: { me: async () => ({ email: 'nurse@x.com', role: 'nurse' }), logout: () => {}, redirectToLogin: () => {} },
      asServiceRole: { entities, functions, integrations },
    },
  };
});

beforeEach(() => {
  invoke.mockReset();
  invoke.mockImplementation(async (name) => (name === 'getPatientContext' ? { data: CTX } : { data: {} }));
  window.history.pushState({}, '', '/PatientDetails?id=p1');
});

describe('PatientDetails — getPatientContext seeding', () => {
  it('fetches getPatientContext once and seeds the per-entity child caches', async () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
    // Import lazily so the vi.mock factory is in place first.
    const { default: PatientDetails } = await import('@/pages/PatientDetails');
    renderWithProviders(<PatientDetails />, { queryClient: qc });

    // The single consolidated fetch ran with the URL's patient id.
    await waitFor(() => expect(invoke).toHaveBeenCalledWith('getPatientContext', { patientId: 'p1' }));

    // Seeding: a child reading ['patientVisits','p1'] (or ['patient','p1']) finds
    // the payload already in cache — no second request.
    await waitFor(() => expect(qc.getQueryData(['patientVisits', 'p1'])).toEqual(CTX.visits));
    expect(qc.getQueryData(['patient', 'p1'])).toEqual([PATIENT]);
    expect(qc.getQueryData(['patientCarePlans', 'p1'])).toEqual(CTX.carePlans);
    expect(qc.getQueryData(['patientActiveAlerts', 'p1'])).toEqual(CTX.activeAlerts);

    // getPatientContext was the only patient-data round-trip the page issued.
    const contextCalls = invoke.mock.calls.filter((c) => c[0] === 'getPatientContext');
    expect(contextCalls).toHaveLength(1);
  });
});
