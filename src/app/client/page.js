import ClientPage from "../../components/ClientPage";
import { Suspense } from "react";

export default function ClientPageRoute() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ClientPage />
    </Suspense>
  );
}
