import { Suspense } from "react";
import { StealthHome } from "@/components/stealth/StealthHomeClient";

export const metadata = { title: "Errands" };

export default function Home() {
  return (
    <Suspense>
      <StealthHome />
    </Suspense>
  );
}
