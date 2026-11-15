import { Canvas as FiberCanvas, events, type CanvasProps } from '@react-three/fiber';

export { useLoader } from '@react-three/fiber';

const pointerEvents: typeof events = store => ({
  ...events(store),
  compute(event, state) {
    const rect = state.gl.domElement.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;
    // Client coordinates and the visible canvas rect share a space, unlike offsetX under CSS zoom.
    state.pointer.set((event.clientX - rect.left) / rect.width * 2 - 1, 1 - (event.clientY - rect.top) / rect.height * 2);
    state.raycaster.setFromCamera(state.pointer, state.camera);
  },
});

export function Canvas(props: CanvasProps) {
  return <FiberCanvas {...props} events={props.events ?? pointerEvents} />;
}
