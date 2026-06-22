import * as React from "react";
import { TabsTrigger } from "@/components/ui/tabs";

/**
 * Professional, theme-consistent button-style tab trigger.
 *
 * Renders each tab as a real button (bordered, shadowed, solid fill) instead of
 * bare text + icon. Uses inline styles for the active/inactive backgrounds so
 * the solid navy active state always renders reliably (some global CSS strips
 * Tailwind tab backgrounds). Tracks the active state via the data-state
 * attribute that Radix sets on the trigger element.
 */
export default function TabButton({ value, label, Icon, className = "" }) {
  const ref = React.useRef(null);
  const [active, setActive] = React.useState(false);

  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const sync = () => setActive(el.getAttribute("data-state") === "active");
    sync();
    const observer = new MutationObserver(sync);
    observer.observe(el, { attributes: true, attributeFilter: ["data-state"] });
    return () => observer.disconnect();
  }, []);

  return (
    <TabsTrigger
      ref={ref}
      value={value}
      style={{
        backgroundColor: active ? "#213a76" : "#ffffff",
        color: active ? "#ffffff" : "#334155",
        borderColor: active ? "#213a76" : "#cbd5e1",
      }}
      className={`flex-1 min-w-[110px] flex items-center justify-center gap-2 py-2.5 px-4 text-sm font-semibold rounded-lg border shadow-sm transition-all hover:shadow-md ${className}`}
    >
      {Icon && <Icon className="w-4 h-4" />}
      <span>{label}</span>
    </TabsTrigger>
  );
}