import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { Store } from '../../types';
import { Eye, Layers, RotateCw, Sparkles, ChevronDown, ChevronUp, CheckCircle, Wifi, Store as StoreIcon } from 'lucide-react';

interface Store3DHubProps {
  stores: Store[];
  activeStoreId: string;
  totalSalesTodayMZN: number;
}

export const Store3DHub: React.FC<Store3DHubProps> = ({ stores, activeStoreId, totalSalesTodayMZN }) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [explodedVal, setExplodedVal] = useState(0);
  const [autoRotate, setAutoRotate] = useState(true);
  const [activePreset, setActivePreset] = useState<'front' | 'isometric' | 'top' | 'scanner'>('isometric');

  // Internal mutable refs to communicate with Three.js render loop without re-triggering canvas mount
  const stateRef = useRef({
    exploded: 0,
    autoRotate: true,
    targetCamPos: new THREE.Vector3(5.5, 4.2, 5.5),
    targetLookAt: new THREE.Vector3(0, 1.2, 0),
  });

  // Sync stateRef
  useEffect(() => {
    stateRef.current.exploded = explodedVal;
  }, [explodedVal]);

  useEffect(() => {
    stateRef.current.autoRotate = autoRotate;
  }, [autoRotate]);

  const handlePreset = (preset: 'front' | 'isometric' | 'top' | 'scanner') => {
    setActivePreset(preset);
    if (preset === 'front') {
      stateRef.current.targetCamPos.set(0, 2.2, 5.8);
      stateRef.current.targetLookAt.set(0, 1.5, 0);
    } else if (preset === 'isometric') {
      stateRef.current.targetCamPos.set(5.5, 4.2, 5.5);
      stateRef.current.targetLookAt.set(0, 1.2, 0);
    } else if (preset === 'top') {
      stateRef.current.targetCamPos.set(0.1, 7.5, 0.5);
      stateRef.current.targetLookAt.set(0, 0.8, 0);
    } else if (preset === 'scanner') {
      stateRef.current.targetCamPos.set(2.4, 1.8, 2.4);
      stateRef.current.targetLookAt.set(0.5, 1.1, 0.5);
    }
  };

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // 1. Detect software WebGL
    const isSoftwareGl = (() => {
      try {
        const gl = document.createElement('canvas').getContext('webgl2');
        if (!gl) return true;
        const ext = gl.getExtension('WEBGL_debug_renderer_info');
        const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
        const gpu = String(gl.getParameter(param));
        gl.getExtension('WEBGL_lose_context')?.loseContext();
        return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
      } catch {
        return false;
      }
    })();

    // 2. Setup Scene, Camera, Renderer
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x06140f); // Deep emerald night
    scene.fog = new THREE.FogExp2(0x06140f, 0.05);

    const width = container.clientWidth || 800;
    const height = container.clientHeight || 480;

    const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 100);
    camera.position.set(5.5, 4.2, 5.5);

    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance',
      alpha: false,
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    container.appendChild(renderer.domElement);

    // 3. Studio Environment Reflection via RoomEnvironment
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    pmremGenerator.dispose();

    // 4. Lighting Rig (Warm key, cool fill, rim)
    const keyLight = new THREE.DirectionalLight(0xfff5ea, 2.5);
    keyLight.position.set(5, 8, 4);
    keyLight.castShadow = !isSoftwareGl;
    keyLight.shadow.mapSize.width = 1024;
    keyLight.shadow.mapSize.height = 1024;
    keyLight.shadow.bias = -0.0005;
    keyLight.shadow.normalBias = 0.02;
    scene.add(keyLight);

    const hemiLight = new THREE.HemisphereLight(0x34d399, 0x064e3b, 1.2);
    scene.add(hemiLight);

    const rimLight = new THREE.DirectionalLight(0x6ee7b7, 1.8);
    rimLight.position.set(-4, 3, -4);
    scene.add(rimLight);

    // 5. Procedural Textures (Screen display & Contact shadow)
    // Procedural Screen Texture
    const screenCanvas = document.createElement('canvas');
    screenCanvas.width = 512;
    screenCanvas.height = 320;
    const sctx = screenCanvas.getContext('2d')!;
    sctx.fillStyle = '#062d1f';
    sctx.fillRect(0, 0, 512, 320);

    // Header bar
    sctx.fillStyle = '#059669';
    sctx.fillRect(0, 0, 512, 45);
    sctx.fillStyle = '#ffffff';
    sctx.font = 'bold 20px sans-serif';
    sctx.fillText('SL VENDAS — CENTRAL NACIONAL', 18, 30);

    // Live Metrics
    sctx.fillStyle = '#10b981';
    sctx.font = 'bold 36px monospace';
    sctx.fillText(`${totalSalesTodayMZN.toLocaleString('pt-MZ', { minimumFractionDigits: 2 })} MZN`, 24, 110);
    sctx.fillStyle = '#94a3b8';
    sctx.font = '16px sans-serif';
    sctx.fillText('Faturamento Geral de Hoje', 24, 135);

    // Stores indicators
    sctx.fillStyle = '#34d399';
    sctx.font = 'bold 15px monospace';
    sctx.fillText('● MAPUTO  ● MATOLA  ● BEIRA  ● NAMPULA', 24, 190);

    // Security badge
    sctx.fillStyle = '#047857';
    sctx.roundRect(24, 230, 464, 55, 8);
    sctx.fill();
    sctx.fillStyle = '#ecfdf5';
    sctx.font = '14px sans-serif';
    sctx.fillText('✓ SISTEMA INTELIGENTE SINCRONIZADO VIA NUVEM', 38, 263);

    const screenTexture = new THREE.CanvasTexture(screenCanvas);
    screenTexture.colorSpace = THREE.SRGBColorSpace;
    screenTexture.anisotropy = renderer.capabilities.getMaxAnisotropy();

    // Soft Radial Contact Shadow Texture
    const shadowCanvas = document.createElement('canvas');
    shadowCanvas.width = 256;
    shadowCanvas.height = 256;
    const shCtx = shadowCanvas.getContext('2d')!;
    const grad = shCtx.createRadialGradient(128, 128, 0, 128, 128, 120);
    grad.addColorStop(0, 'rgba(0,0,0,0.75)');
    grad.addColorStop(0.5, 'rgba(0,0,0,0.3)');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    shCtx.fillStyle = grad;
    shCtx.fillRect(0, 0, 256, 256);

    const shadowTexture = new THREE.CanvasTexture(shadowCanvas);
    const shadowGeo = new THREE.PlaneGeometry(6, 6);
    const shadowMat = new THREE.MeshBasicMaterial({
      map: shadowTexture,
      transparent: true,
      depthWrite: false,
      opacity: 0.6,
    });
    const shadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
    shadowMesh.rotation.x = -Math.PI / 2;
    shadowMesh.position.y = 0.01;
    scene.add(shadowMesh);

    // Floor subtle circular grid
    const gridHelper = new THREE.PolarGridHelper(4.5, 12, 6, 48, 0x10b981, 0x064e3b);
    gridHelper.position.y = 0.02;
    scene.add(gridHelper);

    // 6. BUILD PROCEDURAL 3-12 PART SMART TERMINAL & STORE ECOSYSTEM
    const hubGroup = new THREE.Group();
    hubGroup.position.set(0, 0, 0);
    scene.add(hubGroup);

    // Explodable sub-groups
    const baseGroup = new THREE.Group();
    const pedestalGroup = new THREE.Group();
    const screenConsoleGroup = new THREE.Group();
    const scannerGroup = new THREE.Group();
    const satelliteNodesGroup = new THREE.Group();

    hubGroup.add(baseGroup);
    hubGroup.add(pedestalGroup);
    hubGroup.add(screenConsoleGroup);
    hubGroup.add(scannerGroup);
    hubGroup.add(satelliteNodesGroup);

    // Material Library
    const brushedMetalMat = new THREE.MeshStandardMaterial({
      color: 0x1f2937,
      metalness: 0.85,
      roughness: 0.25,
    });

    const emeraldAccentMat = new THREE.MeshStandardMaterial({
      color: 0x10b981,
      metalness: 0.7,
      roughness: 0.2,
      emissive: 0x064e3b,
      emissiveIntensity: 0.3,
    });

    const darkTrimMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      metalness: 0.9,
      roughness: 0.35,
    });

    const glassMat = new THREE.MeshPhysicalMaterial({
      color: 0x6ee7b7,
      metalness: 0.1,
      roughness: 0.05,
      transmission: isSoftwareGl ? 0 : 0.8,
      transparent: true,
      opacity: 0.7,
      ior: 1.5,
    });

    // 1. Part: Heavy Circular Base Platform
    const baseGeo = new THREE.CylinderGeometry(1.6, 1.8, 0.18, 36);
    const baseMesh = new THREE.Mesh(baseGeo, brushedMetalMat);
    baseMesh.position.y = 0.09;
    baseMesh.receiveShadow = !isSoftwareGl;
    baseMesh.castShadow = !isSoftwareGl;
    baseGroup.add(baseMesh);

    // Base Accent Glowing Ring
    const ringGeo = new THREE.TorusGeometry(1.5, 0.035, 16, 48);
    const ringMesh = new THREE.Mesh(ringGeo, emeraldAccentMat);
    ringMesh.rotation.x = Math.PI / 2;
    ringMesh.position.y = 0.19;
    baseGroup.add(ringMesh);

    // 2. Part: Column Support Pylon
    const pylonGeo = new THREE.CylinderGeometry(0.28, 0.38, 1.3, 24);
    const pylonMesh = new THREE.Mesh(pylonGeo, darkTrimMat);
    pylonMesh.position.y = 0.84;
    pylonMesh.castShadow = !isSoftwareGl;
    pedestalGroup.add(pylonMesh);

    // Pylon Accent Ribs
    const ribGeo = new THREE.CylinderGeometry(0.32, 0.32, 0.06, 24);
    const ribMesh1 = new THREE.Mesh(ribGeo, emeraldAccentMat);
    ribMesh1.position.y = 0.6;
    pedestalGroup.add(ribMesh1);

    const ribMesh2 = new THREE.Mesh(ribGeo, emeraldAccentMat);
    ribMesh2.position.y = 1.1;
    pedestalGroup.add(ribMesh2);

    // 3. Part: Main POS Screen Head Unit
    const headFrameGeo = new THREE.BoxGeometry(1.9, 1.25, 0.16);
    const headFrame = new THREE.Mesh(headFrameGeo, brushedMetalMat);
    headFrame.position.set(0, 1.9, 0.1);
    headFrame.rotation.x = -0.22;
    headFrame.castShadow = !isSoftwareGl;
    screenConsoleGroup.add(headFrame);

    // Screen Display Plane
    const screenGeo = new THREE.PlaneGeometry(1.75, 1.1);
    const screenMat = new THREE.MeshBasicMaterial({ map: screenTexture });
    const screenMesh = new THREE.Mesh(screenGeo, screenMat);
    screenMesh.position.set(0, 1.91, 0.19);
    screenMesh.rotation.x = -0.22;
    screenConsoleGroup.add(screenMesh);

    // Screen Glass Protector Bevel
    const screenGlassGeo = new THREE.PlaneGeometry(1.82, 1.18);
    const screenGlassMesh = new THREE.Mesh(screenGlassGeo, glassMat);
    screenGlassMesh.position.set(0, 1.92, 0.205);
    screenGlassMesh.rotation.x = -0.22;
    screenConsoleGroup.add(screenGlassMesh);

    // 4. Part: Integrated Barcode Laser Scanner & Card Reader Pad
    const scannerBaseGeo = new THREE.BoxGeometry(0.85, 0.15, 0.6);
    const scannerBase = new THREE.Mesh(scannerBaseGeo, darkTrimMat);
    scannerBase.position.set(0.65, 0.72, 0.6);
    scannerBase.rotation.y = -0.3;
    scannerGroup.add(scannerBase);

    // Glowing Laser Window
    const laserWindowGeo = new THREE.BoxGeometry(0.7, 0.04, 0.45);
    const laserWindowMat = new THREE.MeshBasicMaterial({ color: 0x10b981 });
    const laserWindow = new THREE.Mesh(laserWindowGeo, laserWindowMat);
    laserWindow.position.set(0.65, 0.81, 0.6);
    laserWindow.rotation.y = -0.3;
    scannerGroup.add(laserWindow);

    // 5. Part: Thermal Receipt Paper Spool Slot & Extruded Receipt
    const slotGeo = new THREE.BoxGeometry(0.5, 0.04, 0.08);
    const slotMesh = new THREE.Mesh(slotGeo, darkTrimMat);
    slotMesh.position.set(-0.6, 1.35, 0.15);
    screenConsoleGroup.add(slotMesh);

    // Curled Paper Receipt
    const paperGeo = new THREE.PlaneGeometry(0.35, 0.4);
    const paperMat = new THREE.MeshStandardMaterial({
      color: 0xf8fafc,
      roughness: 0.9,
      side: THREE.DoubleSide,
    });
    const paperMesh = new THREE.Mesh(paperGeo, paperMat);
    paperMesh.position.set(-0.6, 1.15, 0.2);
    paperMesh.rotation.x = -0.4;
    screenConsoleGroup.add(paperMesh);

    // 6. Part: Satellite Store Orbiting Hubs (Maputo, Matola, Beira, Nampula)
    const storeNodeMeshes: THREE.Mesh[] = [];
    stores.forEach((st, idx) => {
      const angle = (idx / stores.length) * Math.PI * 2;
      const radius = 2.4;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;

      const nodeGroup = new THREE.Group();
      nodeGroup.position.set(x, 1.2 + (idx % 2 === 0 ? 0.3 : -0.2), z);

      // Node core
      const nodeGeo = new THREE.CylinderGeometry(0.24, 0.28, 0.16, 16);
      const nodeMat = new THREE.MeshStandardMaterial({
        color: st.status === 'active' ? 0x10b981 : 0xef4444,
        metalness: 0.6,
        roughness: 0.25,
      });
      const nodeMesh = new THREE.Mesh(nodeGeo, nodeMat);
      nodeGroup.add(nodeMesh);

      // Node ring
      const nodeRingGeo = new THREE.TorusGeometry(0.38, 0.02, 8, 24);
      const nodeRingMesh = new THREE.Mesh(nodeRingGeo, emeraldAccentMat);
      nodeRingMesh.rotation.x = Math.PI / 2;
      nodeGroup.add(nodeRingMesh);

      satelliteNodesGroup.add(nodeGroup);
      storeNodeMeshes.push(nodeMesh);
    });

    // 7. Render Loop with smooth damped camera and kinematics
    let frameId = 0;
    const currentCamPos = camera.position.clone();
    const currentLookAt = new THREE.Vector3(0, 1.2, 0);
    const clock = new THREE.Clock();

    const tick = () => {
      const delta = clock.getDelta();

      // Kinematic auto-rotation
      if (stateRef.current.autoRotate) {
        hubGroup.rotation.y += delta * 0.45;
        satelliteNodesGroup.rotation.y -= delta * 0.2;
      }

      // Exploded View kinematics
      const targetExp = stateRef.current.exploded;
      screenConsoleGroup.position.y = THREE.MathUtils.damp(screenConsoleGroup.position.y, targetExp * 1.2, 5, delta);
      scannerGroup.position.x = THREE.MathUtils.damp(scannerGroup.position.x, targetExp * 0.9, 5, delta);
      pedestalGroup.position.y = THREE.MathUtils.damp(pedestalGroup.position.y, targetExp * 0.4, 5, delta);
      satelliteNodesGroup.scale.setScalar(THREE.MathUtils.damp(satelliteNodesGroup.scale.x, 1 + targetExp * 0.5, 5, delta));

      // Damped Camera Transition
      currentCamPos.lerp(stateRef.current.targetCamPos, delta * 3.5);
      currentLookAt.lerp(stateRef.current.targetLookAt, delta * 3.5);

      camera.position.copy(currentCamPos);
      camera.lookAt(currentLookAt);

      renderer.render(scene, camera);
      frameId = requestAnimationFrame(tick);
    };

    tick();

    // Resize Handler
    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [stores, totalSalesTodayMZN]);

  return (
    <div className="relative w-full h-[460px] md:h-[540px] rounded-2xl overflow-hidden bg-slate-950 border border-emerald-900/40 shadow-2xl">
      {/* Top Spec Badges */}
      <div className="absolute top-4 left-4 z-10 flex flex-wrap items-center gap-2 pointer-events-none">
        <div className="flex items-center gap-2 bg-emerald-950/80 border border-emerald-500/30 px-3 py-1.5 rounded-lg backdrop-blur-none text-xs text-emerald-300 font-mono">
          <StoreIcon className="w-3.5 h-3.5 text-emerald-400" />
          <span>TERMINAL CENTRAL 3D</span>
        </div>
        <div className="flex items-center gap-1.5 bg-slate-900/90 border border-slate-700 px-3 py-1.5 rounded-lg text-xs text-slate-300 font-mono">
          <Wifi className="w-3.5 h-3.5 text-emerald-400" />
          <span>{stores.filter((s) => s.status === 'active').length} Lojas Conectadas</span>
        </div>
      </div>

      <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
        <button
          onClick={() => setAutoRotate(!autoRotate)}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors border ${
            autoRotate
              ? 'bg-emerald-600/30 text-emerald-300 border-emerald-500/50'
              : 'bg-slate-800 text-slate-400 border-slate-700'
          }`}
          title="Alternar rotação contínua"
        >
          <RotateCw className={`w-3.5 h-3.5 ${autoRotate ? 'animate-spin' : ''}`} />
          <span>{autoRotate ? 'Girando' : 'Pausado'}</span>
        </button>
      </div>

      {/* WebGL Canvas mount container */}
      <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

      {/* Unified Bottom Control Dock (Zero Viewport Occlusion, Collapsible) */}
      <div
        className={`absolute bottom-3 left-1/2 -translate-x-1/2 z-20 w-[94%] max-w-2xl transition-all duration-300 ${
          isCollapsed ? 'translate-y-[calc(100%-38px)]' : 'translate-y-0'
        }`}
      >
        {/* Toggle Tab */}
        <div className="flex justify-center mb-1">
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="flex items-center gap-1.5 px-4 py-1 rounded-t-lg bg-slate-900/95 border-t border-x border-emerald-500/40 text-xs text-emerald-400 hover:text-emerald-300 font-medium transition-colors shadow-lg"
          >
            {isCollapsed ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            <span>{isCollapsed ? 'Expandir Controles 3D' : 'Ocultar Controles'}</span>
          </button>
        </div>

        {/* Dock Controls Card */}
        <div className="bg-slate-900/95 border border-emerald-500/40 rounded-xl p-3 shadow-2xl text-slate-200">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            {/* Camera Presets */}
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400 font-mono mr-1">Vistas:</span>
              <button
                onClick={() => handlePreset('isometric')}
                className={`px-2.5 py-1 rounded font-medium border transition-colors ${
                  activePreset === 'isometric'
                    ? 'bg-emerald-600 text-white border-emerald-500'
                    : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                }`}
              >
                Isométrica
              </button>
              <button
                onClick={() => handlePreset('front')}
                className={`px-2.5 py-1 rounded font-medium border transition-colors ${
                  activePreset === 'front'
                    ? 'bg-emerald-600 text-white border-emerald-500'
                    : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                }`}
              >
                Tela Frontal
              </button>
              <button
                onClick={() => handlePreset('scanner')}
                className={`px-2.5 py-1 rounded font-medium border transition-colors ${
                  activePreset === 'scanner'
                    ? 'bg-emerald-600 text-white border-emerald-500'
                    : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                }`}
              >
                Scanner/Leitor
              </button>
              <button
                onClick={() => handlePreset('top')}
                className={`px-2.5 py-1 rounded font-medium border transition-colors ${
                  activePreset === 'top'
                    ? 'bg-emerald-600 text-white border-emerald-500'
                    : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                }`}
              >
                Planta Superior
              </button>
            </div>

            {/* Exploded View Slider */}
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <span className="text-slate-400 font-mono whitespace-nowrap flex items-center gap-1">
                <Layers className="w-3.5 h-3.5 text-emerald-400" /> Vista Explodida:
              </span>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={explodedVal}
                onChange={(e) => setExplodedVal(parseFloat(e.target.value))}
                className="w-24 sm:w-32 accent-emerald-500 cursor-pointer"
              />
              <span className="font-mono text-emerald-400 w-8 text-right">{Math.round(explodedVal * 100)}%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
