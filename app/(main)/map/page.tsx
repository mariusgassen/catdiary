import dynamic from "next/dynamic";

const MapView = dynamic(() => import("@/components/MapView"), { ssr: false });

export default function MapPage() {
  return (
    <main
      className="w-full"
      style={{ height: "calc(100dvh - 3.5rem - env(safe-area-inset-bottom, 0px))" }}
    >
      <MapView />
    </main>
  );
}
