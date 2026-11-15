import { useEffect, useState, type ReactNode } from 'react';

const BACKGROUND = '#191c22';
const measure = () => ({ width: window.visualViewport?.width || window.innerWidth, height: window.visualViewport?.height || window.innerHeight });

export function AppFrame({ children }: { children: ReactNode }) {
  const embedded = typeof window !== 'undefined' && window.self !== window.top;
  const [viewport, setViewport] = useState(() => typeof window === 'undefined' ? { width: 844, height: 390 } : measure());
  useEffect(() => {
    const meta = document.querySelector('meta[name="viewport"]');
    meta?.setAttribute('content', 'width=device-width, initial-scale=1, viewport-fit=cover');
    const update = () => setViewport(measure());
    update(); window.addEventListener('resize', update); window.visualViewport?.addEventListener('resize', update);
    return () => { window.removeEventListener('resize', update); window.visualViewport?.removeEventListener('resize', update); };
  }, []);
  const globalStyle = <style>{`html,body,#root{margin:0;width:100%;height:100%;background:${BACKGROUND};}html{-webkit-text-size-adjust:100%;text-size-adjust:100%;}body{overflow:hidden;}`}</style>;
  if (embedded) return <>{globalStyle}{children}</>;
  const landscape = viewport.width >= viewport.height;
  const width = Math.max(viewport.width, landscape ? 844 : 390);
  const height = Math.max(viewport.height, landscape ? 390 : 844);
  const scale = Math.min(1, viewport.width / width, viewport.height / height);
  // An isolated viewport keeps native layout sizes and 3D/pinch coordinates consistent under scaling.
  return <>{globalStyle}<div data-testid="web-app-background" style={{ position: 'fixed', left: 0, top: 0, width: viewport.width, height: viewport.height, display: 'flex', alignItems: 'center', justifyContent: 'center', background: BACKGROUND }}>
    <div style={{ position: 'relative', width: width * scale, height: height * scale, flexShrink: 0 }}>
      <iframe data-testid="web-app-frame" title="AZAS exploration" src={window.location.href} allow="autoplay; fullscreen" style={{ position: 'absolute', left: 0, top: 0, width, height, border: 0, display: 'block', transform: `scale(${scale})`, transformOrigin: 'top left', background: BACKGROUND }} />
    </div>
  </div></>;
}
