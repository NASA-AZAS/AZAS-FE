import { useLayoutEffect, useState, type ReactNode } from 'react';

const BACKGROUND = '#191c22';
const measure = () => {
  if (window.self !== window.top) {
    const frame = window.frameElement;
    return { width: frame?.clientWidth || window.innerWidth, height: frame?.clientHeight || window.innerHeight, left: 0, top: 0 };
  }
  const visual = window.visualViewport;
  return { width: visual?.width || window.innerWidth, height: visual?.height || window.innerHeight, left: visual?.offsetLeft ?? 0, top: visual?.offsetTop ?? 0 };
};

export function AppFrame({ children }: { children: ReactNode }) {
  const embedded = typeof window !== 'undefined' && window.self !== window.top;
  const [viewport, setViewport] = useState(() => typeof window === 'undefined' ? { width: 844, height: 390, left: 0, top: 0 } : measure());
  useLayoutEffect(() => {
    const meta = document.querySelector('meta[name="viewport"]');
    meta?.setAttribute('content', 'width=device-width, initial-scale=1, minimum-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover');
    const update = () => setViewport(measure());
    const preventDefault = (event: Event) => event.preventDefault();
    const preventZoomWheel = (event: WheelEvent) => {
      if (event.ctrlKey || event.metaKey) { event.preventDefault(); event.stopPropagation(); }
    };
    const preventZoomKey = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && ['+', '-', '=', '0'].includes(event.key)) {
        event.preventDefault(); event.stopPropagation();
      }
    };
    document.addEventListener('wheel', preventZoomWheel, { capture: true, passive: false });
    document.addEventListener('keydown', preventZoomKey, true);
    for (const type of ['gesturestart', 'gesturechange', 'gestureend']) document.addEventListener(type, preventDefault, { passive: false });
    document.addEventListener('dragstart', preventDefault);
    for (const type of ['copy', 'cut', 'contextmenu', 'selectstart']) document.addEventListener(type, preventDefault, true);
    if (!embedded) {
      window.scrollTo(0, 0);
      document.addEventListener('touchmove', preventDefault, { passive: false });
      document.addEventListener('wheel', preventDefault, { passive: false });
    }
    update(); window.addEventListener('resize', update); window.visualViewport?.addEventListener('resize', update); window.visualViewport?.addEventListener('scroll', update);
    const initialFrame = requestAnimationFrame(update);
    return () => {
      cancelAnimationFrame(initialFrame);
      document.removeEventListener('wheel', preventZoomWheel, true);
      document.removeEventListener('keydown', preventZoomKey, true);
      for (const type of ['gesturestart', 'gesturechange', 'gestureend']) document.removeEventListener(type, preventDefault);
      document.removeEventListener('dragstart', preventDefault);
      for (const type of ['copy', 'cut', 'contextmenu', 'selectstart']) document.removeEventListener(type, preventDefault, true);
      document.removeEventListener('touchmove', preventDefault);
      document.removeEventListener('wheel', preventDefault);
      window.removeEventListener('resize', update); window.visualViewport?.removeEventListener('resize', update); window.visualViewport?.removeEventListener('scroll', update);
    };
  }, [embedded]);
  // Explicit logical dimensions prevent WebKit from shrinking percentage sizes a second time under iframe zoom.
  const globalStyle = <style>{`html,body,#root{margin:0;width:${embedded ? `${viewport.width}px` : '100%'};height:${embedded ? `${viewport.height}px` : '100%'};background:${BACKGROUND};}html{-webkit-text-size-adjust:100%;text-size-adjust:100%;}html,body{overflow:hidden;overscroll-behavior:none;user-select:none;-webkit-user-select:none;-webkit-touch-callout:none;}${embedded ? '' : 'html,body{position:fixed;inset:0;touch-action:none;}'}`}</style>;
  if (embedded) return <>{globalStyle}{children}</>;
  const landscape = viewport.width >= viewport.height;
  const width = Math.max(viewport.width, landscape ? 844 : 390);
  const height = Math.max(viewport.height, landscape ? 390 : 844);
  const scale = Math.min(1, viewport.width / width, viewport.height / height);
  const shiftRight = Math.min(24, Math.max(0, (viewport.width - width * scale) / 2));
  const left = Math.round((viewport.width - width * scale) / 2 + shiftRight);
  const top = Math.round((viewport.height - height * scale) / 2);
  // Layout zoom avoids a transformed iframe's separate paint and touch coordinate spaces on mobile WebKit.
  return <>{globalStyle}<div data-testid="web-app-background" style={{ position: 'fixed', left: viewport.left, top: viewport.top, width: viewport.width, height: viewport.height, overflow: 'hidden', background: BACKGROUND }}>
    <div style={{ position: 'absolute', left, top, width: width * scale, height: height * scale, overflow: 'hidden' }}>
      <iframe data-testid="web-app-frame" title="LAMP exploration" src={window.location.href} allow="autoplay; fullscreen" scrolling="no" style={{ position: 'absolute', left: 0, top: 0, width, height, border: 0, display: 'block', zoom: scale, background: BACKGROUND }} />
    </div>
  </div></>;
}
