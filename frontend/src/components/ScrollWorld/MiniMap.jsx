import { useEffect, useRef, useState } from "react";
import { HUMUS_SCROLL_WORLD } from "./humus-config";

// Minimal SVG property map: outline + flight path, with a drone dot that
// travels along the path as the user scrolls, and static dots for each
// hotspot at its progress-% position along the same path.
export default function MiniMap({ progressPct, label }) {
  const pathRef = useRef(null);
  const [dronePoint, setDronePoint] = useState({ x: 20, y: 74 });
  const [hotspotPoints, setHotspotPoints] = useState([]);

  useEffect(() => {
    const el = pathRef.current;
    if (!el) return;
    const len = el.getTotalLength();
    setHotspotPoints(
      HUMUS_SCROLL_WORLD.hotspots.map((h) => {
        const p = el.getPointAtLength((h.at / 100) * len);
        return { id: h.id, x: p.x, y: p.y };
      })
    );
  }, []);

  useEffect(() => {
    const el = pathRef.current;
    if (!el) return;
    const len = el.getTotalLength();
    const p = el.getPointAtLength((progressPct / 100) * len);
    setDronePoint({ x: p.x, y: p.y });
  }, [progressPct]);

  return (
    <div className="sw-minimap" role="img" aria-label={label}>
      <svg viewBox={HUMUS_SCROLL_WORLD.minimap.viewBox} className="sw-minimap-svg">
        <path d={HUMUS_SCROLL_WORLD.minimap.propertyOutline} className="sw-minimap-outline" />
        <path
          ref={pathRef}
          d={HUMUS_SCROLL_WORLD.minimap.flightPath}
          className="sw-minimap-flightpath"
        />
        {hotspotPoints.map((p) => (
          <circle key={p.id} cx={p.x} cy={p.y} r="1.4" className="sw-minimap-hotspot" />
        ))}
        <circle cx={dronePoint.x} cy={dronePoint.y} r="2.4" className="sw-minimap-drone" />
      </svg>
    </div>
  );
}
