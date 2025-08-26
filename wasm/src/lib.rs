use wasm_bindgen::prelude::*;
use serde_wasm_bindgen::{from_value, to_value};

// 점 하나를 (x, y) 튜플로 정의
type Point = (f64, f64);
type Polygon = Vec<Point>;

/// 폴리곤 내부를 직선 기준으로 최단 경로(커버리지 패스)를 계산.
#[wasm_bindgen]
pub fn compute_shortest_path(polygon_js: JsValue) -> Result<JsValue, JsValue> {
    let mut coords: Polygon = from_value(polygon_js)
        .map_err(|e| JsValue::from_str(&format!("폴리곤 데이터 오류: {}", e)))?;
    if coords.len() < 3 {
        return Err(JsValue::from_str("폴리곤은 최소 3개 점이 필요합니다"));
    }
    // 폴리곤 폐합: 마지막 점이 첫 점과 같지 않으면 추가
    if coords.first() != coords.last() {
        coords.push(*coords.first().unwrap());
    }

    // 필드 바운딩 박스 계산 → 스와스 방향 결정
    let (min_x, max_x) = coords.iter().map(|p| p.0)
        .fold((f64::MAX, f64::MIN), |(min, max), x| (min.min(x), max.max(x)));
    let (min_y, max_y) = coords.iter().map(|p| p.1)
        .fold((f64::MAX, f64::MIN), |(min, max), y| (min.min(y), max.max(y)));

    let swath_width: f64 = 10.0;  // 스와스 간격 (예: 기계 간 폭)
    let use_horizontal = (max_x - min_x) >= (max_y - min_y);

    // 스와스 라인 좌표 저장
    let mut swath_lines: Vec<f64> = Vec::new();
    if use_horizontal {
        // y축 방향(수평 패스)
        let mut y = min_y + swath_width / 2.0;
        while y <= max_y - swath_width / 2.0 {
            swath_lines.push(y);
            y += swath_width;
        }
        // 최상단 스와스 보정
        if swath_lines.last().map_or(true, |&last| last < max_y - swath_width / 2.0) {
            swath_lines.push(max_y - swath_width / 2.0);
        }
    } else {
        // x축 방향(수직 패스)
        let mut x = min_x + swath_width / 2.0;
        while x <= max_x - swath_width / 2.0 {
            swath_lines.push(x);
            x += swath_width;
        }
        // 최우측 스와스 보정
        if swath_lines.last().map_or(true, |&last| last < max_x - swath_width / 2.0) {
            swath_lines.push(max_x - swath_width / 2.0);
        }
    }

    // 각 스와스 라인과 폴리곤의 교차 구간(segment) 계산
    #[derive(Clone)]
    struct Segment { start: Point, end: Point }
    let mut segments: Vec<Segment> = Vec::new();
    for &line_val in &swath_lines {
        let mut intersections: Vec<f64> = Vec::new();
        for window in coords.windows(2) {
            let (x1, y1) = window[0];
            let (x2, y2) = window[1];
            if use_horizontal {
                // 수평 에지 무시
                if (y1 - y2).abs() < f64::EPSILON { continue; }
                // y = line_val 교차 검사
                if (y1 <= line_val && line_val < y2) || (y2 <= line_val && line_val < y1) {
                    let t = (line_val - y1) / (y2 - y1);
                    let x_int = x1 + t * (x2 - x1);
                    intersections.push(x_int);
                }
            } else {
                // 수직 에지 무시
                if (x1 - x2).abs() < f64::EPSILON { continue; }
                if (x1 <= line_val && line_val < x2) || (x2 <= line_val && line_val < x1) {
                    let t = (line_val - x1) / (x2 - x1);
                    let y_int = y1 + t * (y2 - y1);
                    intersections.push(y_int);
                }
            }
        }
        intersections.sort_by(|a, b| a.partial_cmp(b).unwrap());
        // 교차점 짝지어 세그먼트 생성
        for pts in intersections.chunks(2) {
            if pts.len() < 2 { continue; }
            if use_horizontal {
                segments.push(Segment {
                    start: (pts[0], line_val),
                    end:   (pts[1], line_val),
                });
            } else {
                segments.push(Segment {
                    start: (line_val, pts[0]),
                    end:   (line_val, pts[1]),
                });
            }
        }
    }

    // 세그먼트 순서 정렬 후 부스트로페돈(boustrophedon) 패턴으로 경로 생성
    segments.sort_by(|a, b| {
        if use_horizontal {
            a.start.1.partial_cmp(&b.start.1).unwrap()
        } else {
            a.start.0.partial_cmp(&b.start.0).unwrap()
        }
    });
    let mut path: Vec<Point> = Vec::new();
    for (i, seg) in segments.iter().enumerate() {
        if i == 0 {
            path.push(seg.start);
            path.push(seg.end);
        } else {
            let (start_pt, end_pt) = if i % 2 == 1 {
                (seg.end, seg.start)  // 역방향
            } else {
                (seg.start, seg.end)  // 정방향
            };
            path.push(start_pt);
            path.push(end_pt);
        }
    }

    to_value(&path).map_err(|e| JsValue::from_str(&format!("결과 직렬화 실패: {}", e)))
}
