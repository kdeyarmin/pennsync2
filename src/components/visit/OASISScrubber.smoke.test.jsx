import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "@/test/testUtils";

// invokeLLM is the scrub call; keep a handle so we can assert it is NOT fired on
// mount (the scrub is button-triggered, so an initial render must be static).
const { invokeLLM } = vi.hoisted(() => ({ invokeLLM: vi.fn() }));

vi.mock("@/lib/invokeLLM", () => ({ invokeLLM }));
vi.mock("@/api/base44Client", async () => {
  const { makeBase44Stub } = await vi.importActual("@/test/testUtils");
  return { base44: makeBase44Stub() };
});
vi.mock("../utils/security", () => ({ logSecurityEvent: vi.fn() }));
// Dialog-only children — not rendered on the static initial mount, but stubbed
// so importing the component never pulls in their heavier dependency graphs.
vi.mock("../oasis/OASISFeedbackPanel", () => ({ default: () => <div /> }));
vi.mock("../oasis/CMSComplianceReference", () => ({ default: () => <div /> }));
vi.mock("../oasis/OASISPDFUploader", () => ({ default: () => <div /> }));

import OASISScrubber from "./OASISScrubber";

const baseProps = {
  patient: { id: "p1", care_type: "home_health", primary_diagnosis: "CHF" },
  visit: { id: "v1", visit_type: "admission", visit_date: "2026-06-27" },
  narrativeText: "Patient presents with shortness of breath.",
  vitalSigns: {},
};

describe("OASISScrubber (render smoke)", () => {
  beforeEach(() => invokeLLM.mockReset());

  it("renders the header without running a scrub on mount", () => {
    renderWithProviders(<OASISScrubber {...baseProps} />);
    expect(screen.getByText("OASIS Compliance Scrubber")).toBeInTheDocument();
    expect(screen.getByText(/Run OASIS Check/)).toBeInTheDocument();
    expect(invokeLLM).not.toHaveBeenCalled();
  });

  it("renders nothing for a non-home-health (hospice) patient", () => {
    const { container } = renderWithProviders(
      <OASISScrubber {...baseProps} patient={{ id: "p2", care_type: "hospice" }} />,
    );
    expect(container.firstChild).toBeNull();
  });
});
