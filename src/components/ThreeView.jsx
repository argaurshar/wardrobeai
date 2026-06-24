import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { getFinishColors } from '../editor/finishes.js';
import { getStyleSrc } from '../editor/doors.js';
import { RULES } from '../engine/rules.js';

// Real 3D view of the wardrobe (three.js). Carcass + interior items are built
// from the same layout the SVG views use; doors are an optional overlay so the
// client can see both the finished face and the configured interior. Orbit to
// rotate, scroll to zoom, right-drag to pan. The <canvas> keeps its drawing
// buffer so the editor's PNG export can rasterize it.

const P = RULES.panelThickness; // 18 mm
const BACK = RULES.backPanelThickness; // 6 mm
const S = 0.001; // mm → m so three.js works in sane units

export default function ThreeView({ layout }) {
  const mountRef = useRef(null);
  const [showDoors, setShowDoors] = useState(false);
  // Keep the latest layout/showDoors for the rebuild effect without
  // re-creating the renderer each time.
  const stateRef = useRef({ layout, showDoors });
  stateRef.current = { layout, showDoors };
  const apiRef = useRef(null);

  // --- create renderer / scene / controls once ------------------------------
  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#e9e3d6');

    const camera = new THREE.PerspectiveCamera(40, 1, 0.01, 100);
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      preserveDrawingBuffer: true, // so PNG export can read the canvas
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    mount.appendChild(renderer.domElement);
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    renderer.domElement.style.display = 'block';

    // lighting — soft studio setup
    scene.add(new THREE.HemisphereLight('#ffffff', '#b9b2a4', 1.05));
    const key = new THREE.DirectionalLight('#fff6e8', 1.5);
    key.position.set(2.4, 3.2, 2.6);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    key.shadow.camera.near = 0.5;
    key.shadow.camera.far = 14;
    const sc = key.shadow.camera;
    sc.left = -3; sc.right = 3; sc.top = 4; sc.bottom = -1;
    scene.add(key);
    const fill = new THREE.DirectionalLight('#dfe6ef', 0.5);
    fill.position.set(-2.5, 1.5, 1.8);
    scene.add(fill);

    // ground plane to catch shadows
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(40, 40),
      new THREE.ShadowMaterial({ opacity: 0.18 }),
    );
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.minDistance = 0.8;
    controls.maxDistance = 12;
    controls.maxPolarAngle = Math.PI / 2 + 0.05; // don't go under the floor

    const content = new THREE.Group(); // holds the rebuildable wardrobe
    scene.add(content);

    let raf;
    const renderLoop = () => {
      controls.update();
      renderer.render(scene, camera);
      raf = requestAnimationFrame(renderLoop);
    };
    renderLoop();

    const resize = () => {
      const w = mount.clientWidth;
      const h = mount.clientHeight;
      if (!w || !h) return;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(mount);

    apiRef.current = { scene, camera, controls, content, renderer };
    rebuild(); // initial geometry

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      controls.dispose();
      disposeGroup(content);
      renderer.dispose();
      if (renderer.domElement.parentNode === mount)
        mount.removeChild(renderer.domElement);
      apiRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- rebuild geometry when the layout or door toggle changes --------------
  useEffect(() => {
    rebuild();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layout, showDoors]);

  function rebuild() {
    const api = apiRef.current;
    if (!api) return;
    const { content, camera, controls } = api;
    disposeGroup(content);
    while (content.children.length) content.remove(content.children[0]);

    const { layout: L, showDoors: doorsOn } = stateRef.current;
    buildWardrobe(content, L, doorsOn);

    // Centre horizontally + in depth, base on the floor.
    const W = L.dims.width * S;
    const D = L.dims.depth * S;
    const H = (L.dims.height + (L.loft?.enabled ? L.loft.height : 0)) * S;
    content.position.set(-W / 2, 0, -D / 2);

    // Frame the camera the first time only (don't fight the user's orbit).
    if (!api._framed) {
      controls.target.set(0, H / 2, 0);
      camera.position.set(W * 0.9, H * 0.62, D / 2 + Math.max(W, H) * 1.15);
      controls.update();
      api._framed = true;
    }
  }

  return (
    <div className="relative w-full h-full">
      <div ref={mountRef} className="w-full h-full" />
      <button
        type="button"
        onClick={() => setShowDoors((v) => !v)}
        className="absolute bottom-3 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-full bg-stone-900/85 text-stone-100 text-xs font-medium hover:bg-stone-800 transition-colors"
      >
        {showDoors ? 'Open doors — show interior' : 'Close doors — show finish'}
      </button>
    </div>
  );
}

// ---- geometry builders -------------------------------------------------------

function buildWardrobe(group, layout, showDoors) {
  const { dims, columns } = layout;
  const W = dims.width;
  const H = dims.height;
  const D = dims.depth;
  const c = getFinishColors(layout.finish);

  const carcassMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(c.oakDeep),
    roughness: 0.72,
    metalness: 0.02,
  });
  const frontMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(c.oak),
    roughness: 0.5,
    metalness: 0.04,
  });
  const railMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(c.rail),
    roughness: 0.3,
    metalness: 0.85,
  });

  const add = (w, h, d, x, y, z, mat) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w * S, h * S, d * S), mat);
    m.position.set((x + w / 2) * S, (y + h / 2) * S, (z + d / 2) * S);
    m.castShadow = true;
    m.receiveShadow = true;
    group.add(m);
  };

  // --- carcass ---------------------------------------------------------------
  add(W, P, D, 0, 0, 0, carcassMat); // bottom
  add(W, P, D, 0, H - P, 0, carcassMat); // top
  add(P, H, D, 0, 0, 0, carcassMat); // left side
  add(P, H, D, W - P, 0, 0, carcassMat); // right side
  add(W, H, BACK, 0, 0, 0, carcassMat); // back

  // --- columns + items -------------------------------------------------------
  let x = P;
  columns.forEach((col, ci) => {
    const cw = col.width;
    for (const item of col.items) {
      buildItem(group, item, x, cw, D, { carcassMat, frontMat, railMat, add });
    }
    if (ci < columns.length - 1) {
      // divider centred on the column boundary
      add(P, H - 2 * P, D, x + cw - P / 2, P, 0, carcassMat);
    }
    x += cw;
  });

  // --- loft ------------------------------------------------------------------
  if (layout.loft?.enabled) {
    const lh = layout.loft.height;
    const bays = layout.loft.bays ?? columns.length;
    add(W, P, D, 0, H, 0, carcassMat); // loft floor (= wardrobe top already, add roof)
    add(W, P, D, 0, H + lh - P, 0, carcassMat); // loft top
    add(P, lh, D, 0, H, 0, carcassMat); // loft left
    add(P, lh, D, W - P, H, 0, carcassMat); // loft right
    add(W, lh, BACK, 0, H, 0, carcassMat); // loft back
    const inner = W - 2 * P;
    for (let b = 1; b < bays; b += 1) {
      add(P, lh - P, D, P + (inner * b) / bays - P / 2, H, 0, carcassMat);
    }
    if (layout.loft.shelf) add(inner, P, D - BACK, P, H + lh / 2, 0, carcassMat);
  }

  // --- doors (optional overlay) ----------------------------------------------
  if (showDoors && layout.doors) {
    buildDoors(group, layout, frontMat, c);
  }
}

function buildItem(group, item, x, cw, D, mats) {
  const { carcassMat, frontMat, railMat, add } = mats;
  const innerW = cw - 2; // tiny inset so faces read separately
  const y = item.y ?? P;

  switch (item.type) {
    case 'shelf':
      add(innerW, P, D - BACK, x + 1, y, 0, carcassMat);
      break;
    case 'drawer': {
      const front = item.height;
      add(innerW, front - 6, D - BACK - 20, x + 1, y + 3, 0, carcassMat); // box
      add(innerW, front - 4, P, x + 1, y + 2, D - P, frontMat); // front face
      add(innerW * 0.34, 14, 12, x + cw / 2 - innerW * 0.17, y + front / 2 - 7, D, railMat); // handle
      break;
    }
    case 'hanging': {
      const railY = y + item.height - RULES.railDropFromTop;
      const rod = new THREE.Mesh(
        new THREE.CylinderGeometry(13 * S, 13 * S, (cw - 40) * S, 16),
        railMat,
      );
      rod.rotation.z = Math.PI / 2;
      rod.position.set((x + cw / 2) * S, railY * S, (D * 0.42) * S);
      rod.castShadow = true;
      group.add(rod);
      break;
    }
    case 'shoeRack': {
      const racks = Math.max(1, Math.round(item.height / RULES.shoeRackGap));
      for (let r = 0; r < racks; r += 1) {
        const sy = y + (r + 0.5) * (item.height / racks);
        const board = new THREE.Mesh(
          new THREE.BoxGeometry(innerW * S, P * S, (D - BACK) * S),
          carcassMat,
        );
        board.position.set((x + cw / 2) * S, sy * S, (D / 2) * S);
        board.rotation.x = -0.32; // tilt
        board.castShadow = true;
        board.receiveShadow = true;
        group.add(board);
      }
      break;
    }
    default: {
      // trouser/valet/tie racks, wire basket — show a representative rod
      const rod = new THREE.Mesh(
        new THREE.CylinderGeometry(10 * S, 10 * S, (cw - 50) * S, 12),
        railMat,
      );
      rod.rotation.z = Math.PI / 2;
      rod.position.set((x + cw / 2) * S, (y + item.height / 2) * S, (D * 0.5) * S);
      group.add(rod);
    }
  }
}

function buildDoors(group, layout, frontMat, colors) {
  const { dims, doors } = layout;
  const W = dims.width;
  const H = dims.height;
  const D = dims.depth;
  const n = doors.panels.length;
  const sliding = doors.type === 'sliding';
  const panelW = sliding ? (W + (n - 1) * RULES.slidingOverlap) / n : W / n;
  const T = RULES.doorThickness;

  doors.panels.forEach((p, i) => {
    const mat = doorMaterial(p.style, frontMat, colors);
    const px = sliding ? i * (panelW - RULES.slidingOverlap) : i * panelW;
    const z = sliding ? D + (i % 2) * (T + 4) : D; // sliding panels on two tracks
    const m = new THREE.Mesh(
      new THREE.BoxGeometry((panelW - 6) * S, (H - 6) * S, T * S),
      mat,
    );
    m.position.set((px + panelW / 2) * S, H / 2 * S, (z + T / 2) * S);
    m.castShadow = true;
    group.add(m);
  });
}

function doorMaterial(style, frontMat, colors) {
  if (style === 'glass')
    return new THREE.MeshStandardMaterial({
      color: new THREE.Color('#dde7ee'),
      transparent: true,
      opacity: 0.32,
      roughness: 0.1,
      metalness: 0,
    });
  if (style === 'mirror')
    return new THREE.MeshStandardMaterial({
      color: new THREE.Color('#cdd2d8'),
      roughness: 0.05,
      metalness: 0.95,
    });
  const src = getStyleSrc(style);
  if (src) {
    const tex = new THREE.TextureLoader().load(src);
    tex.colorSpace = THREE.SRGBColorSpace;
    return new THREE.MeshStandardMaterial({ map: tex, roughness: 0.55 });
  }
  return frontMat.clone();
}

// ---- cleanup ----------------------------------------------------------------

function disposeGroup(group) {
  group.traverse((obj) => {
    if (obj.geometry) obj.geometry.dispose();
    if (obj.material) {
      const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
      for (const m of mats) {
        if (m.map) m.map.dispose();
        m.dispose();
      }
    }
  });
}
