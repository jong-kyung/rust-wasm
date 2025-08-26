import { useEffect, useState } from "react";
import Map from "ol/Map";
import View from "ol/View";
import TileLayer from "ol/layer/Tile";
import { xyzSource } from "../config/mapConfig";

const useInitMap = () => {
  const [map, setMap] = useState<Map | null>(null);

  // 최초 지도 초기화
  useEffect(() => {
    const mainMap = new Map({
      pixelRatio: 1,
      layers: [
        new TileLayer({
          preload: 1,
          source: xyzSource,
          useInterimTilesOnError: true,
        }),
      ],
      view: new View({
        maxZoom: 20,
        center: [0, 0],
        zoom: 2,
      }),
      controls: [],
    });

    setMap(mainMap);
    return () => {
      mainMap.dispose();
      setMap(null);
    };
  }, []);

  return { map };
};

export default useInitMap;
