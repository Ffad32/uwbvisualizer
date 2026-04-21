import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import type { TagState, AnchorPosition } from '../types';

interface ThreeSceneProps {
  tagState: TagState;
  anchors: AnchorPosition[];
}

const TRAIL_LENGTH = 50;
const LERP_FACTOR = 0.15;

export default function ThreeScene({ tagState, anchors }: ThreeSceneProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const anchorMeshesRef = useRef<THREE.Mesh[]>([]);
  const tagMeshRef = useRef<THREE.Mesh | null>(null);
  const tagLineRef = useRef<THREE.Line | null>(null);
  const trailLineRef = useRef<THREE.Line | null>(null);
  const distanceRingsRef = useRef<THREE.Mesh[]>([]);
  const trailPositionsRef = useRef<THREE.Vector3[]>([]);
  const currentTagPositionRef = useRef(new THREE.Vector3(0, 0, 0));
  const targetTagPositionRef = useRef(new THREE.Vector3(0, 0, 0));
  const animationFrameIdRef = useRef<number | null>(null);

  // Initialize Three.js scene
  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;

    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0d0d1a);
    sceneRef.current = scene;

    // Camera
    const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 8, 8);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    rendererRef.current = renderer;

    // Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controlsRef.current = controls;

    // Lighting
    const ambientLight = new THREE.AmbientLight(0x404040, 0.8);
    scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.6);
    directionalLight.position.set(5, 10, 5);
    scene.add(directionalLight);

    // Floor grid
    const gridHelper = new THREE.GridHelper(10, 10, 0x444444, 0x222222);
    gridHelper.position.y = -0.01;
    scene.add(gridHelper);

    // Create anchor markers
    const coneGeometry = new THREE.ConeGeometry(0.15, 0.4, 8);
    const redMaterial = new THREE.MeshPhongMaterial({ color: 0xff4444 });
    for (let i = 0; i < 3; i++) {
      const cone = new THREE.Mesh(coneGeometry, redMaterial);
      cone.position.set(anchors[i].x, 0.2, anchors[i].y);
      cone.rotation.x = Math.PI;
      scene.add(cone);
      anchorMeshesRef.current.push(cone);
    }
    console.log('ThreeScene: anchor meshes created', anchorMeshesRef.current.length);

    // Create tag sphere
    const sphereGeometry = new THREE.SphereGeometry(0.15, 16, 16);
    const blueMaterial = new THREE.MeshPhongMaterial({ color: 0x4fc3f7 });
    const tagMesh = new THREE.Mesh(sphereGeometry, blueMaterial);
    tagMesh.position.set(0, 0.15, 0);
    scene.add(tagMesh);
    tagMeshRef.current = tagMesh;

    // Vertical line from tag to floor
    const lineGeometry = new THREE.BufferGeometry();
    const lineMaterial = new THREE.LineBasicMaterial({ color: 0x4fc3f7, transparent: true, opacity: 0.7 });
    const tagLine = new THREE.Line(lineGeometry, lineMaterial);
    scene.add(tagLine);
    tagLineRef.current = tagLine;

    // Create distance rings
    const ringGeometry = new THREE.RingGeometry(0.5, 0.52, 32);
    const ringMaterial = new THREE.MeshBasicMaterial({
      color: 0x4fc3f7,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.3,
    });
    for (let i = 0; i < 3; i++) {
      const ring = new THREE.Mesh(ringGeometry, ringMaterial);
      ring.rotation.x = Math.PI / 2;
      ring.position.set(anchors[i].x, 0.01, anchors[i].y);
      ring.visible = false;
      scene.add(ring);
      distanceRingsRef.current.push(ring);
    }

    // Create trail line
    const trailGeometry = new THREE.BufferGeometry();
    const trailMaterial = new THREE.LineBasicMaterial({
      color: 0x4fc3f7,
      transparent: true,
      opacity: 0.8,
      linewidth: 2,
    });
    const trailLine = new THREE.Line(trailGeometry, trailMaterial);
    scene.add(trailLine);
    trailLineRef.current = trailLine;

    // Window resize handler
    const onWindowResize = () => {
      if (!cameraRef.current || !rendererRef.current) return;
      cameraRef.current.aspect = window.innerWidth / window.innerHeight;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', onWindowResize);

    // Animation loop
    const animate = () => {
      animationFrameIdRef.current = requestAnimationFrame(animate);

      // Smoothly interpolate tag position
      currentTagPositionRef.current.lerp(targetTagPositionRef.current, LERP_FACTOR);
      if (tagMeshRef.current) {
        tagMeshRef.current.position.copy(currentTagPositionRef.current);
      }

      // Update tag line
      if (tagLineRef.current) {
        const points = [
          new THREE.Vector3(currentTagPositionRef.current.x, currentTagPositionRef.current.y, currentTagPositionRef.current.z),
          new THREE.Vector3(currentTagPositionRef.current.x, -0.01, currentTagPositionRef.current.z),
        ];
        tagLineRef.current.geometry.setFromPoints(points);
      }

      // Update trail
      if (trailLineRef.current) {
        if (trailPositionsRef.current.length < 2) {
          trailLineRef.current.geometry.setFromPoints([]);
        } else {
          const points = trailPositionsRef.current.map(p => new THREE.Vector3(p.x, p.y + 0.05, p.z));
          trailLineRef.current.geometry.setFromPoints(points);
        }
      }

      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    // Cleanup
    return () => {
      window.removeEventListener('resize', onWindowResize);
      if (animationFrameIdRef.current) {
        cancelAnimationFrame(animationFrameIdRef.current);
      }
      if (rendererRef.current) {
        rendererRef.current.dispose();
      }
      // Dispose geometries and materials? For simplicity we skip.
    };
  }, []); // run once on mount

  // Update anchors when anchors prop changes
  useEffect(() => {
    console.log('ThreeScene: anchors prop changed', anchors);
    const scene = sceneRef.current;
    if (!scene) {
      console.warn('Scene not ready yet');
      return;
    }

    // Ensure we have exactly 3 anchor meshes and distance rings
    for (let i = 0; i < 3; i++) {
      // Create anchor mesh if missing
      if (!anchorMeshesRef.current[i]) {
        console.log(`Creating missing anchor mesh ${i}`);
        const coneGeometry = new THREE.ConeGeometry(0.15, 0.4, 8);
        const redMaterial = new THREE.MeshPhongMaterial({ color: 0xff4444 });
        const cone = new THREE.Mesh(coneGeometry, redMaterial);
        cone.rotation.x = Math.PI;
        scene.add(cone);
        anchorMeshesRef.current[i] = cone;
      }
      // Create distance ring if missing
      if (!distanceRingsRef.current[i]) {
        console.log(`Creating missing distance ring ${i}`);
        const ringGeometry = new THREE.RingGeometry(0.5, 0.52, 32);
        const ringMaterial = new THREE.MeshBasicMaterial({
          color: 0x4fc3f7,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.3,
        });
        const ring = new THREE.Mesh(ringGeometry, ringMaterial);
        ring.rotation.x = Math.PI / 2;
        ring.visible = false;
        scene.add(ring);
        distanceRingsRef.current[i] = ring;
      }
    }

    // Update positions
    console.log('Updating anchor meshes and distance rings');
    for (let i = 0; i < 3; i++) {
      console.log(`Anchor ${i}: (${anchors[i].x}, ${anchors[i].y})`);
      const mesh = anchorMeshesRef.current[i];
      const ring = distanceRingsRef.current[i];
      console.log(`Before - mesh position: (${mesh.position.x}, ${mesh.position.y}, ${mesh.position.z})`);
      mesh.position.set(anchors[i].x, 0.2, anchors[i].y);
      ring.position.set(anchors[i].x, 0.01, anchors[i].y);
      console.log(`After - mesh position: (${mesh.position.x}, ${mesh.position.y}, ${mesh.position.z})`);
    }
  }, [anchors]);

  // Update tag position and distance rings when tagState changes
  useEffect(() => {
    if (tagState.x !== null && tagState.y !== null) {
      targetTagPositionRef.current.set(tagState.x, 0.15, tagState.y);
      // Add to trail
      trailPositionsRef.current.push(targetTagPositionRef.current.clone());
      if (trailPositionsRef.current.length > TRAIL_LENGTH) {
        trailPositionsRef.current.shift();
      }
    }

    // Update distance rings
    if (distanceRingsRef.current.length === 3) {
      for (let i = 0; i < 3; i++) {
        const d = tagState.distances[i];
        if (typeof d === 'number' && d > 0) {
          distanceRingsRef.current[i].visible = true;
          distanceRingsRef.current[i].scale.set(d, d, d);
        } else {
          distanceRingsRef.current[i].visible = false;
        }
      }
    }
  }, [tagState]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute top-0 left-0 w-full h-full"
      style={{ display: 'block' }}
    />
  );
}