import { useEffect } from "react";
import useInitMap from "./hooks/useInitMap";
import useAreaSelection from "./hooks/useAreaSelection";

function App() {
  const { map } = useInitMap();
  useAreaSelection({ map });
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
