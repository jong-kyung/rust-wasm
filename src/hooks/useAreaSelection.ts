import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Feature, Map, MapBrowserEvent } from "ol";
import { DragPan } from "ol/interaction";
import { type Coordinate } from "ol/coordinate";
import { LineString, Polygon } from "ol/geom";
import PointerInteraction from "ol/interaction/Pointer";

import { pathLayer, zoneLayer } from "../config/mapConfig";
import Style from "ol/style/Style";
import Stroke from "ol/style/Stroke";
import { compute_shortest_path } from "../lib/wasm";

type Interaction = PointerEvent | KeyboardEvent | WheelEvent;

interface UseAreaSelectionProps {
  map: Map | null;
}

const useAreaSelection = ({ map }: UseAreaSelectionProps) => {
  const [area, setArea] = useState<Coordinate[]>([]);

  const mapDragPanRef = useRef<DragPan | null>(null);
  const startCoordinateRef = useRef<Coordinate | null>(null);
  const dragBoxRef = useRef<Feature | null>(null);
  const isDrawingRef = useRef<boolean>(false);

  const source = useMemo(() => {
    return zoneLayer.getSource();
  }, []);

  const handlePointerDown = useCallback(
    (e: MapBrowserEvent<Interaction>) => {
      if (!map) return false;
      e.preventDefault();
      e.stopPropagation();
      // 좌표 정보
      startCoordinateRef.current = map.getCoordinateFromPixel(e.pixel);

      // 기존 임시 피처 제거
      if (dragBoxRef.current && source) {
        source.removeFeature(dragBoxRef.current);
      }

      map.getViewport().style.cursor = "crosshair";
      isDrawingRef.current = true;
      return true;
    },
    [map, source]
  );

  const handlePointerMove = useCallback(
    (e: MapBrowserEvent<Interaction>) => {
      if (
        !map ||
        !startCoordinateRef.current ||
        !source ||
        !isDrawingRef.current
      )
        return;
      e.preventDefault();
      e.stopPropagation();

      const currentCoordinate = map.getCoordinateFromPixel(e.pixel);

      // 직사각형 좌표 계산
      const minX = Math.min(
        startCoordinateRef.current[0],
        currentCoordinate[0]
      );
      const maxX = Math.max(
        startCoordinateRef.current[0],
        currentCoordinate[0]
      );
      const minY = Math.min(
        startCoordinateRef.current[1],
        currentCoordinate[1]
      );
      const maxY = Math.max(
        startCoordinateRef.current[1],
        currentCoordinate[1]
      );

      const rectangleCoords = [
        [minX, minY], // 좌하
        [maxX, minY], // 우하
        [maxX, maxY], // 우상
        [minX, maxY], // 좌상
      ];

      if (source) {
        if (dragBoxRef.current) {
          source.removeFeature(dragBoxRef.current);
        }

        dragBoxRef.current = new Feature({
          geometry: new Polygon([rectangleCoords]),
        });
        source.addFeature(dragBoxRef.current);
      }
    },
    [map, source]
  );

  const handlePointerUp = useCallback(
    (e: MapBrowserEvent<Interaction>) => {
      if (
        !map ||
        !startCoordinateRef.current ||
        !dragBoxRef.current ||
        !source ||
        !isDrawingRef.current
      )
        return false;
      e.preventDefault();
      e.stopPropagation();
      const currentCoordinate = map.getCoordinateFromPixel(e.pixel);
      const geometry = dragBoxRef.current.getGeometry();

      const minSize = 0.0001; // 약 10미터
      if (
        Math.abs(currentCoordinate[0] - startCoordinateRef.current[0]) <
          minSize ||
        Math.abs(currentCoordinate[1] - startCoordinateRef.current[1]) < minSize
      ) {
        source.removeFeature(dragBoxRef.current);
        isDrawingRef.current = false;
        map.getViewport().style.cursor = "default";
        return false;
      }

      if (!(geometry instanceof Polygon)) return false;

      const coords = geometry.getCoordinates()[0];

      zoneLayer.getSource()?.clear();
      zoneLayer.getSource()?.addFeature(dragBoxRef.current);
      setArea(coords);

      map.getViewport().style.cursor = "default";
      isDrawingRef.current = false;
      return false;
    },
    [map, source]
  );

  useEffect(() => {
    // 지도 레이어 추가 및 드래그 패닝 상호작용 저장
    if (!map) return;
    const mapDragPanInteraction = map
      .getInteractions()
      .getArray()
      .find((interaction) => interaction instanceof DragPan);

    mapDragPanRef.current = mapDragPanInteraction ?? null;

    map.addLayer(zoneLayer);

    return () => {
      map.removeLayer(zoneLayer);
    };
  }, [map]);

  useEffect(() => {
    if (!map) return;

    const pointerInteraction = new PointerInteraction({
      handleDownEvent: handlePointerDown,
      handleUpEvent: handlePointerUp,
    });

    // 이벤트 리스너 등록
    map.addInteraction(pointerInteraction);
    map.on("pointermove", handlePointerMove);

    // 드래그 패닝 비활성화
    if (mapDragPanRef.current) {
      mapDragPanRef.current.setActive(false);
    }

    return () => {
      // 이벤트 리스너 제거
      map.removeInteraction(pointerInteraction);
      map.un("pointermove", handlePointerMove);

      // 드래그 패닝 복원
      if (mapDragPanRef.current) {
        mapDragPanRef.current.setActive(true);
      }
    };
  }, [handlePointerDown, handlePointerMove, handlePointerUp, map]);

  useEffect(() => {
    if (!map || area.length === 0) return;
    const routeCoords = compute_shortest_path(area);
    const swathWidth = 1.5;
    const lineFeature = new Feature({
      geometry: new LineString([...routeCoords]),
    });
    lineFeature.setStyle(
      new Style({
        stroke: new Stroke({
          color: "#3c22ff",
          width: swathWidth,
        }),
      })
    );
    pathLayer.getSource()?.clear();
    pathLayer.getSource()?.addFeature(lineFeature);
    map.addLayer(pathLayer);
    console.log(routeCoords);
    return () => {
      pathLayer.getSource()?.clear();
      map.removeLayer(pathLayer);
    };
  }, [area, map]);
};

export default useAreaSelection;
