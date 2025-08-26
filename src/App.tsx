import { useEffect } from "react";
import useInitMap from "./hooks/useInitMap";

function App() {
  const { map } = useInitMap();

  useEffect(() => {
    if (!map) return;
    map.setTarget("map-container");

    return () => {
      map.setTarget(undefined);
    };
  }, [map]);

  return <div id="map-container" className="w-full h-dvh" />;
}

export default App;
