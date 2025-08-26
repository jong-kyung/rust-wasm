import VectorLayer from "ol/layer/Vector";
import VectorSource from "ol/source/Vector";
import XYZ from "ol/source/XYZ";
import Fill from "ol/style/Fill";
import Stroke from "ol/style/Stroke";
import Style from "ol/style/Style";

export const xyzSource = new XYZ({
  url: "https://mt0.google.com/vt/lyrs=m&hl=ko&x={x}&y={y}&z={z}",
  crossOrigin: "anonymous",
  cacheSize: 500, // 메모리에 캐시할 타일 수
});

const zoneSource = new VectorSource();
export const zoneLayer = new VectorLayer({
  source: zoneSource,
  style: new Style({
    fill: new Fill({
      color: "rgba(151, 191, 146, 0.3)",
    }),
    stroke: new Stroke({
      color: "#97bf92",
      width: 2,
    }),
  }),
  zIndex: 1,
});

const pathSource = new VectorSource();
export const pathLayer = new VectorLayer({ source: pathSource, zIndex: 20 });
