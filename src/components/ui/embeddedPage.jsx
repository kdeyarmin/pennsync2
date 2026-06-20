import { createContext, useContext } from "react";

/**
 * Embedded-page context.
 *
 * Several "hub" pages (e.g. My Learning, Compliance Center, OASIS Center) render
 * their own PageHeader and then embed other full page components inside tabs.
 * Those embedded pages also render a PageHeader/hero of their own, which stacks a
 * second header under the hub's header. Wrapping the embedded region in
 * <EmbeddedPage> flips this context to `true` so PageHeader (and any custom hero)
 * can suppress the duplicate header while still rendering its actions/content.
 */
const EmbeddedPageContext = createContext(false);

export function useIsEmbedded() {
  return useContext(EmbeddedPageContext);
}

export default function EmbeddedPage({ children }) {
  return (
    <EmbeddedPageContext.Provider value={true}>
      {children}
    </EmbeddedPageContext.Provider>
  );
}
