import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { renderWithProviders } from "@/test/testUtils";
import StickyActionBar from "./StickyActionBar";

describe("StickyActionBar — the always-reachable primary action", () => {
  it("renders its action and its status text", () => {
    renderWithProviders(
      <StickyActionBar status="12 more characters needed">
        <button type="button">Review &amp; Complete</button>
      </StickyActionBar>,
    );
    expect(screen.getByRole("button", { name: /review & complete/i })).toBeInTheDocument();
    expect(screen.getByText("12 more characters needed")).toBeInTheDocument();
  });

  it("announces status changes without the region itself coming and going", () => {
    // Plain render: rerender must update the SAME instance, not remount it —
    // a remounted live region would not announce.
    const { container, rerender } = render(
      <StickyActionBar status={null}><button type="button">Go</button></StickyActionBar>,
    );
    const live = container.querySelector("[aria-live='polite']");
    expect(live).toBeInTheDocument();

    rerender(<StickyActionBar status="Ready to review"><button type="button">Go</button></StickyActionBar>);
    expect(container.querySelector("[aria-live='polite']")).toHaveTextContent("Ready to review");
  });

  it("pins itself clear of the mobile bottom nav, and returns to flow on desktop", () => {
    const { container } = renderWithProviders(
      <StickyActionBar><button type="button">Go</button></StickyActionBar>,
    );
    // position: sticky is inert inside the app shell (see the component comment),
    // so the bar must be fixed below md — with a spacer so it covers nothing.
    const spacer = container.firstChild;
    expect(spacer.className).toContain("md:hidden");
    expect(spacer).toHaveAttribute("aria-hidden", "true");

    const bar = spacer.nextSibling;
    expect(bar.className).toContain("fixed");
    expect(bar.className).toContain("bottom-[calc(4rem+env(safe-area-inset-bottom))]");
    expect(bar.className).toContain("md:static");
  });
});
