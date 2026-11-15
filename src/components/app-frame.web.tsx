import { useEffect, useState, type ReactNode } from 'react';

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
  useEffect(() => {
    const meta = document.querySelector('meta[name="viewport"]');
    meta?.setAttribute('content', 'width=device-width, initial-scale=1, viewport-fit=cover');
    const update = () => setViewport(measure());
    update(); window.addEventListener('resize', update); window.visualViewport?.addEventListener('resize', update); window.visualViewport?.addEventListener('scroll', update);
    return () => { window.removeEventListener('resize', update); window.visualViewport?.removeEventListener('resize', update); window.visualViewport?.removeEventListener('scroll', update); };
  }, []);
  // Explicit logical dimensions prevent WebKit from shrinking percentage sizes a second time under iframe zoom.
  const globalStyle = <style>{`html,body,#root{margin:0;width:${embedded ? `${viewport.width}px` : '100%'};height:${embedded ? `${viewport.height}px` : '100%'};background:${BACKGROUND};}html{-webkit-text-size-adjust:100%;text-size-adjust:100%;}body{overflow:hidden;}`}</style>;
  if (embedded) return <>{globalStyle}{children}</>;
  const landscape = viewport.width >= viewport.height;
  const width = Math.max(viewport.width, landscape ? 844 : 390);
  const height = Math.max(viewport.height, landscape ? 390 : 844);
  const scale = Math.min(1, viewport.width / width, viewport.height / height);
  const shiftRight = Math.min(24, Math.max(0, (viewport.width - width * scale) / 2));
  // Layout zoom avoids a transformed iframe's separate paint and touch coordinate spaces on mobile WebKit.
  return <>{globalStyle}<div data-testid="web-app-background" style={{ position: 'fixed', left: viewport.left, top: viewport.top, width: viewport.width, height: viewport.height, display: 'flex', alignItems: 'center', justifyContent: 'center', background: BACKGROUND }}>
    <div style={{ position: 'relative', left: shiftRight, width: width * scale, height: height * scale, flexShrink: 0 }}>
      <iframe data-testid="web-app-frame" title="AZAS exploration" src={window.location.href} allow="autoplay; fullscreen" style={{ position: 'absolute', left: 0, top: 0, width, height, border: 0, display: 'block', zoom: scale, background: BACKGROUND }} />
    </div>
  </div></>;
}
