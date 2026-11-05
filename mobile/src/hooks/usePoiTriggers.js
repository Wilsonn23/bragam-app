import { useEffect, useMemo, useReducer } from 'react';
import { GeofenceController } from '../location/geofence';

export function usePoiTriggers(pois, sample, active) {
  // Source changes intentionally start an isolated demo session.
  const controller = useMemo(() => new GeofenceController(pois), [pois]);
  const [, render] = useReducer(n => n + 1, 0);
  useEffect(() => {
    if (active && sample) controller.update(sample);
    else controller.suspend();
    render();
  }, [controller, sample, active]);
  useEffect(() => {
    if (!active) return;
    const timer = setInterval(() => { controller.prune(); render(); }, 1000);
    return () => clearInterval(timer);
  }, [controller, active]);
  const event = active ? controller.current() : null;
  const dismiss = () => {
    // Never dismiss a different head if the rendered item expired meanwhile.
    if (controller.current() === event) controller.dismiss();
    render();
  };
  return { event, dismiss };
}
