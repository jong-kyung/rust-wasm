import XYZ from "ol/source/XYZ";

export const xyzSource = new XYZ({
  url: "https://mt0.google.com/vt/lyrs=m&hl=ko&x={x}&y={y}&z={z}",
  crossOrigin: "anonymous",
  cacheSize: 500, // 메모리에 캐시할 타일 수
});
