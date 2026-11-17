import { useEffect, useMemo, useReducer } from 'react';
import { GeofenceController } from '../location/geofence';
import { NotificationPresentation } from '../location/presentation';

export function usePoiTriggers(pois, sample, active) {
  const controller = useMemo(() => new GeofenceController(pois), [pois]);
  const presentation = useMemo(() => new NotificationPresentation(), []);
  const [, render] = useReducer(n => n + 1, 0);
  useEffect(() => {
    if (active && sample) controller.update(sample);
    else controller.suspend();
    if (active) presentation.capture(controller.current());
    render();
  }, [controller, presentation, sample, active]);
  useEffect(() => {
    if (!active) return;
    const timer = setInterval(() => {
      controller.prune();
      presentation.capture(controller.current());
      render();
    }, 1000);
    return () => clearInterval(timer);
  }, [controller, presentation, active]);
  const event = active ? presentation.current() : null;
  const dismiss = () => { presentation.dismiss(controller); render(); };
  return { event, dismiss };
}
