import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

interface PulseWave3DProps {
  className?: string;
  intensity?: number;
  interactive?: boolean;
}

const _dummy = new THREE.Object3D();
const _color = new THREE.Color();

function createBrushedMetalBumpTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#808080';
    ctx.fillRect(0, 0, 256, 256);
    for (let y = 0; y < 256; y += 2) {
      const shade = 112 + Math.floor(Math.sin(y * 0.45) * 18 + (y % 5) * 5);
      ctx.fillStyle = `rgb(${shade},${shade},${shade})`;
      ctx.fillRect(0, y, 256, 1);
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(3, 3);
  return tex;
}

function createContactShadowTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const grad = ctx.createRadialGradient(64, 64, 6, 64, 64, 60);
    grad.addColorStop(0, 'rgba(0,0,0,0.65)');
    grad.addColorStop(0.55, 'rgba(0,0,0,0.22)');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 128, 128);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function PulseWave3D({
  className = '',
  intensity = 1,
  interactive = true,
}: PulseWave3DProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const intensityRef = useRef(intensity);
  intensityRef.current = intensity;
  const [contextLost, setContextLost] = useState(false);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const isSoftwareGl = (() => {
      try {
        const probe = document.createElement('canvas').getContext('webgl2');
        if (!probe) return true;
        const ext = probe.getExtension('WEBGL_debug_renderer_info');
        const param = ext ? ext.UNMASKED_RENDERER_WEBGL : probe.RENDERER;
        const gpu = String(probe.getParameter(param));
        probe.getExtension('WEBGL_lose_context')?.loseContext();
        return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
      } catch {
        return true;
      }
    })();

    const width = Math.max(container.clientWidth, 320);
    const height = Math.max(container.clientHeight, 320);

    const scene = new THREE.Scene();
    const horizonHex = 0x090910;
    scene.background = new THREE.Color(horizonHex);
    scene.fog = new THREE.FogExp2(horizonHex, 0.065);

    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 80);
    camera.position.set(0, 1.55, 6.85);
    camera.lookAt(0, 0.68, 0);

    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.12;
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);

    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    const envRT = pmremGenerator.fromScene(new RoomEnvironment(), 0.04);
    scene.environment = envRT.texture;
    pmremGenerator.dispose();

    // Warm key + cool Hemisphere fill + violet/amber rim accents
    const hemiLight = new THREE.HemisphereLight(0x93c5fd, 0x1e1b2e, 0.7);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xffe4c4, 2.2);
    keyLight.position.set(4.5, 6.5, 4.2);
    keyLight.castShadow = !isSoftwareGl;
    keyLight.shadow.mapSize.set(1024, 1024);
    keyLight.shadow.camera.left = -4;
    keyLight.shadow.camera.right = 4;
    keyLight.shadow.camera.top = 4;
    keyLight.shadow.camera.bottom = -4;
    keyLight.shadow.bias = -0.0005;
    keyLight.shadow.normalBias = 0.02;
    scene.add(keyLight);

    const rimViolet = new THREE.PointLight(0x8b5cf6, 5.5, 16, 1.8);
    rimViolet.position.set(-3.4, 2.2, -2.2);
    scene.add(rimViolet);

    const rimAmber = new THREE.PointLight(0xf59e0b, 4.2, 16, 1.8);
    rimAmber.position.set(3.2, 1.6, -1.8);
    scene.add(rimAmber);

    // Procedural brushed-metal bump texture
    const brushedBump = createBrushedMetalBumpTexture();
    brushedBump.anisotropy = renderer.capabilities.getMaxAnisotropy();

    // Ground plane + soft radial contact shadow
    const groundGeo = new THREE.CircleGeometry(14, 48);
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x0d0d16,
      roughness: 0.85,
      metalness: 0.12,
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.02;
    ground.receiveShadow = true;
    scene.add(ground);

    const shadowTex = createContactShadowTexture();
    const shadowDiscGeo = new THREE.CircleGeometry(2.3, 32);
    const shadowDiscMat = new THREE.MeshBasicMaterial({
      map: shadowTex,
      transparent: true,
      depthWrite: false,
      opacity: 0.55,
    });
    const shadowDisc = new THREE.Mesh(shadowDiscGeo, shadowDiscMat);
    shadowDisc.rotation.x = -Math.PI / 2;
    shadowDisc.position.y = 0.005;
    scene.add(shadowDisc);

    // Composite 8-part Acoustic Pulse Beacon Sculpture (bottom-center grounded)
    const sculpture = new THREE.Group();
    scene.add(sculpture);

    // Part 1: Lathed stepped plinth base (matte dark obsidian)
    const basePoints = [
      new THREE.Vector2(0, 0),
      new THREE.Vector2(1.45, 0),
      new THREE.Vector2(1.42, 0.12),
      new THREE.Vector2(1.18, 0.22),
      new THREE.Vector2(1.12, 0.26),
      new THREE.Vector2(0, 0.26),
    ];
    const baseGeo = new THREE.LatheGeometry(basePoints, 36);
    const baseMat = new THREE.MeshStandardMaterial({
      color: 0x161622,
      roughness: 0.78,
      metalness: 0.25,
    });
    const baseMesh = new THREE.Mesh(baseGeo, baseMat);
    baseMesh.castShadow = true;
    baseMesh.receiveShadow = true;
    sculpture.add(baseMesh);

    // Part 2: Anodized titanium collar ring (low roughness, high metalness)
    const collarGeo = new THREE.TorusGeometry(1.14, 0.05, 16, 48);
    const collarMat = new THREE.MeshStandardMaterial({
      color: 0xcbd5e1,
      roughness: 0.22,
      metalness: 0.92,
      bumpMap: brushedBump,
      bumpScale: 0.015,
    });
    const collarMesh = new THREE.Mesh(collarGeo, collarMat);
    collarMesh.rotation.x = Math.PI / 2;
    collarMesh.position.y = 0.27;
    sculpture.add(collarMesh);

    // Part 3: Outer Violet-Titanium Gimbal Ring
    const gimbalOuterGeo = new THREE.TorusGeometry(1.05, 0.055, 18, 64);
    const gimbalOuterMat = new THREE.MeshStandardMaterial({
      color: 0x8b5cf6,
      roughness: 0.28,
      metalness: 0.85,
      bumpMap: brushedBump,
      bumpScale: 0.012,
    });
    const gimbalOuter = new THREE.Mesh(gimbalOuterGeo, gimbalOuterMat);
    gimbalOuter.position.y = 1.48;
    gimbalOuter.castShadow = true;
    sculpture.add(gimbalOuter);

    // Part 4: Inner Magenta Resonator Ring
    const gimbalInnerGeo = new THREE.TorusGeometry(0.82, 0.04, 16, 56);
    const gimbalInnerMat = new THREE.MeshStandardMaterial({
      color: 0xec4899,
      roughness: 0.18,
      metalness: 0.75,
      emissive: 0x701a45,
      emissiveIntensity: 0.45,
    });
    const gimbalInner = new THREE.Mesh(gimbalInnerGeo, gimbalInnerMat);
    gimbalInner.position.y = 1.48;
    gimbalInner.rotation.y = Math.PI / 4;
    sculpture.add(gimbalInner);

    // Part 5: Central faceted glass/crystal pulse core
    const coreGeo = new THREE.IcosahedronGeometry(0.46, 1);
    const coreMat = new THREE.MeshPhysicalMaterial({
      color: 0xf59e0b,
      roughness: 0.12,
      metalness: 0.15,
      clearcoat: 1.0,
      clearcoatRoughness: 0.08,
      emissive: 0xd97706,
      emissiveIntensity: 0.35,
    });
    const coreMesh = new THREE.Mesh(coreGeo, coreMat);
    coreMesh.position.y = 1.48;
    coreMesh.castShadow = true;
    sculpture.add(coreMesh);

    // Part 6: Support stanchion twin curved arms (TubeGeometry)
    const armMat = new THREE.MeshStandardMaterial({
      color: 0x334155,
      roughness: 0.42,
      metalness: 0.82,
    });
    const leftCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-1.05, 0.25, 0),
      new THREE.Vector3(-1.22, 0.85, 0),
      new THREE.Vector3(-1.05, 1.48, 0),
    ]);
    const rightCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(1.05, 0.25, 0),
      new THREE.Vector3(1.22, 0.85, 0),
      new THREE.Vector3(1.05, 1.48, 0),
    ]);
    const leftArm = new THREE.Mesh(new THREE.TubeGeometry(leftCurve, 20, 0.045, 12, false), armMat);
    const rightArm = new THREE.Mesh(new THREE.TubeGeometry(rightCurve, 20, 0.045, 12, false), armMat);
    const capGeo = new THREE.CylinderGeometry(0.085, 0.085, 0.11, 18);
    capGeo.rotateZ(Math.PI / 2);
    const leftCap = new THREE.Mesh(capGeo, collarMat);
    leftCap.position.set(-1.05, 1.48, 0);
    const rightCap = new THREE.Mesh(capGeo, collarMat);
    rightCap.position.set(1.05, 1.48, 0);
    sculpture.add(leftArm, rightArm, leftCap, rightCap);

    // Part 7: Pulse waveform arc inside the sculpture (TubeGeometry)
    const pulseCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.72, 1.48, 0),
      new THREE.Vector3(-0.36, 1.48, 0.04),
      new THREE.Vector3(-0.18, 1.82, 0.06),
      new THREE.Vector3(0.05, 1.12, 0.06),
      new THREE.Vector3(0.24, 1.66, 0.04),
      new THREE.Vector3(0.42, 1.48, 0.02),
      new THREE.Vector3(0.72, 1.48, 0),
    ]);
    const pulseTubeGeo = new THREE.TubeGeometry(pulseCurve, 40, 0.028, 10, false);
    const pulseTubeMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0xf472b6,
      emissiveIntensity: 0.9,
      roughness: 0.2,
      metalness: 0.1,
    });
    const pulseTube = new THREE.Mesh(pulseTubeGeo, pulseTubeMat);
    sculpture.add(pulseTube);

    // Part 8: InstancedMesh harmonic equalizer ring (36 bars)
    const BAR_COUNT = 36;
    const barGeo = new THREE.BoxGeometry(0.08, 1, 0.08);
    const barMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.3,
      metalness: 0.65,
    });
    const harmonicRing = new THREE.InstancedMesh(barGeo, barMat, BAR_COUNT);
    harmonicRing.frustumCulled = false;

    for (let i = 0; i < BAR_COUNT; i += 1) {
      const t = i / BAR_COUNT;
      if (t < 0.33) _color.setHex(0x8b5cf6);
      else if (t < 0.66) _color.setHex(0xec4899);
      else _color.setHex(0xf59e0b);
      harmonicRing.setColorAt(i, _color);
    }
    if (harmonicRing.instanceColor) harmonicRing.instanceColor.needsUpdate = true;
    scene.add(harmonicRing);

    const updateHarmonicBars = (elapsed: number, amp: number) => {
      const radius = 2.05;
      for (let i = 0; i < BAR_COUNT; i += 1) {
        const angle = (i / BAR_COUNT) * Math.PI * 2;
        const wave = 0.22 + (0.28 + 0.26 * Math.sin(elapsed * 2.6 + i * 0.55)) * amp;
        _dummy.position.set(Math.cos(angle) * radius, wave * 0.5, Math.sin(angle) * radius);
        _dummy.rotation.set(0, -angle, 0);
        _dummy.scale.set(1, wave, 1);
        _dummy.updateMatrix();
        harmonicRing.setMatrixAt(i, _dummy.matrix);
      }
      harmonicRing.instanceMatrix.needsUpdate = true;
    };
    updateHarmonicBars(0, 1);
    harmonicRing.computeBoundingSphere();

    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    // Pointer parallax with exponential damping
    let targetPtrX = 0;
    let targetPtrY = 0;
    let smoothPtrX = 0;
    let smoothPtrY = 0;

    const onPointerMove = (e: PointerEvent) => {
      if (!interactive) return;
      const rect = container.getBoundingClientRect();
      targetPtrX = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
      targetPtrY = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
    };
    window.addEventListener('pointermove', onPointerMove, { passive: true });

    const onResize = () => {
      const w = Math.max(container.clientWidth, 320);
      const h = Math.max(container.clientHeight, 320);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', onResize);

    const canvasEl = renderer.domElement;
    const onLost = (e: Event) => {
      e.preventDefault();
      setContextLost(true);
    };
    const onRestored = () => setContextLost(false);
    canvasEl.addEventListener('webglcontextlost', onLost);
    canvasEl.addEventListener('webglcontextrestored', onRestored);

    let frameId = 0;
    let disposed = false;
    const startMs = performance.now();
    let lastMs = startMs;

    function afterDraw(cb: () => void) {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        if (disposed) return;
        const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (state === gl.UNSIGNALED) {
          frameId = window.setTimeout(poll, 5);
        } else {
          if (sync) gl.deleteSync(sync);
          frameId = window.setTimeout(cb, 80);
        }
      };
      frameId = window.setTimeout(poll, 5);
    }

    const tick = () => {
      if (disposed) return;
      const nowMs = performance.now();
      const dt = Math.min((nowMs - lastMs) / 1000, 0.1);
      lastMs = nowMs;
      const elapsed = (nowMs - startMs) / 1000;
      const amp = intensityRef.current;

      const dampAlpha = 1 - Math.exp(-5.5 * dt);
      smoothPtrX += (targetPtrX - smoothPtrX) * dampAlpha;
      smoothPtrY += (targetPtrY - smoothPtrY) * dampAlpha;

      if (!prefersReducedMotion) {
        gimbalOuter.rotation.x = Math.sin(elapsed * 0.75) * 0.42 + smoothPtrY * 0.28;
        gimbalInner.rotation.z = -elapsed * 0.55;
        gimbalInner.rotation.y = elapsed * 0.4 + smoothPtrX * 0.35;
        coreMesh.rotation.y = -elapsed * 0.7;
        coreMesh.rotation.x = elapsed * 0.4;
        const pulseScale = 1 + Math.sin(elapsed * 3.1) * 0.05 * amp;
        coreMesh.scale.setScalar(pulseScale);
        pulseTube.rotation.y = Math.sin(elapsed * 0.5) * 0.22;
        updateHarmonicBars(elapsed, amp);

        camera.position.x = smoothPtrX * 0.65;
        camera.position.y = 1.55 - smoothPtrY * 0.32;
        camera.lookAt(0, 0.68, 0);
      } else {
        camera.lookAt(0, 0.68, 0);
      }

      renderer.render(scene, camera);

      if (prefersReducedMotion) {
        return;
      }
      if (isSoftwareGl) {
        afterDraw(tick);
      } else {
        frameId = requestAnimationFrame(tick);
      }
    };

    tick();

    return () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('resize', onResize);
      canvasEl.removeEventListener('webglcontextlost', onLost);
      canvasEl.removeEventListener('webglcontextrestored', onRestored);

      baseGeo.dispose();
      baseMat.dispose();
      collarGeo.dispose();
      collarMat.dispose();
      gimbalOuterGeo.dispose();
      gimbalOuterMat.dispose();
      gimbalInnerGeo.dispose();
      gimbalInnerMat.dispose();
      coreGeo.dispose();
      coreMat.dispose();
      armMat.dispose();
      capGeo.dispose();
      pulseTubeGeo.dispose();
      pulseTubeMat.dispose();
      barGeo.dispose();
      barMat.dispose();
      groundGeo.dispose();
      groundMat.dispose();
      shadowDiscGeo.dispose();
      shadowDiscMat.dispose();
      brushedBump.dispose();
      shadowTex.dispose();
      envRT.dispose();
      renderer.dispose();
      if (canvasEl.parentNode === container) {
        container.removeChild(canvasEl);
      }
    };
  }, [interactive]);

  if (contextLost) {
    return (
      <div
        className={`w-full h-full bg-gradient-to-br from-violet-950 via-[#09090F] to-amber-950/50 ${className}`}
      />
    );
  }

  return (
    <div
      ref={mountRef}
      data-testid="pulsr-3d-canvas"
      aria-hidden="true"
      className={`w-full h-full ${className}`}
    />
  );
}
