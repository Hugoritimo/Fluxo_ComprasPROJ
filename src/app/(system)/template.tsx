import type {
  ReactNode,
} from "react";

import SystemRouteTransition from "@/components/ui/system-route-transition";

import SystemTopbar from "@/components/system/system-topbar";

export default function SystemTemplate({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <>
      <SystemTopbar />

      <div className="min-h-screen pt-[72px]">
        <SystemRouteTransition>
          {children}
        </SystemRouteTransition>
      </div>
    </>
  );
}