import type {
  ReactNode,
} from "react";

import SystemRouteTransition from "@/components/ui/system-route-transition";

export default function SystemTemplate({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <SystemRouteTransition>
      {children}
    </SystemRouteTransition>
  );
}