import * as THREE from './vendor/three/build/three.module.js';
import { GLTFLoader } from './vendor/three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from './vendor/three/examples/jsm/controls/OrbitControls.js';

const stage = document.getElementById('stage');
const statusEl = document.getElementById('status');
const viewerTitle = document.getElementById('viewer-title');
const viewerSubtitle = document.getElementById('viewer-subtitle');
const modelInput = document.getElementById('model-url');
const loadButton = document.getElementById('load-model');
const openSourceLink = document.getElementById('open-source');

const params = new URLSearchParams(window.location.search);
const initialModelUrl = params.get('model') || '';
const initialTitle = params.get('title') || 'Viewer 3D';

viewerTitle.textContent = initialTitle;
viewerSubtitle.textContent = initialModelUrl
  ? 'Modelo pronto para carregar.'
  : 'Abre esta pagina com ?model=... para ver um modelo.';
document.title = `${initialTitle} | GESTISAC`;
modelInput.value = initialModelUrl;
openSourceLink.href = initialModelUrl || '#';
openSourceLink.style.pointerEvents = initialModelUrl ? 'auto' : 'none';
openSourceLink.style.opacity = initialModelUrl ? '1' : '0.45';

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: false });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
stage.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x09101d);
scene.fog = new THREE.Fog(0x09101d, 18, 72);

const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 500);
camera.position.set(4.5, 2.8, 5.6);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.minDistance = 1.2;
controls.maxDistance = 48;
controls.maxPolarAngle = Math.PI * 0.49;
controls.target.set(0, 1, 0);

const lights = new THREE.Group();
lights.add(new THREE.HemisphereLight(0xffffff, 0x22314d, 2.2));
const keyLight = new THREE.DirectionalLight(0xffffff, 2.4);
keyLight.position.set(5, 8, 4);
lights.add(keyLight);
const fillLight = new THREE.DirectionalLight(0x9dd6ff, 1.1);
fillLight.position.set(-4, 3, -3);
lights.add(fillLight);
scene.add(lights);

const loader = new GLTFLoader();
const resizeObserver = new ResizeObserver(syncSize);
resizeObserver.observe(stage);

let frameId = 0;
let currentRoot = null;
let disposed = false;
let activeLoadId = 0;

function setStatus(message) {
  statusEl.textContent = message;
}

function syncSize() {
  if (!stage.isConnected) return;
  const width = Math.max(320, stage.clientWidth);
  const height = Math.max(240, stage.clientHeight);
  renderer.setSize(width, height, false);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
}

function disposeObject(object) {
  object.traverse((node) => {
    if (node.isMesh) {
      node.geometry?.dispose?.();
      const materials = Array.isArray(node.material) ? node.material : [node.material];
      for (const material of materials) {
        material?.map?.dispose?.();
        material?.emissiveMap?.dispose?.();
        material?.normalMap?.dispose?.();
        material?.roughnessMap?.dispose?.();
        material?.metalnessMap?.dispose?.();
        material?.aoMap?.dispose?.();
        material?.alphaMap?.dispose?.();
        material?.lightMap?.dispose?.();
        material?.dispose?.();
      }
    }
  });
}

function clearModel() {
  if (currentRoot) {
    scene.remove(currentRoot);
    disposeObject(currentRoot);
    currentRoot = null;
  }
}

function frameObject(object) {
  const box = new THREE.Box3().setFromObject(object);
  if (box.isEmpty()) {
    controls.target.set(0, 1, 0);
    camera.position.set(4.5, 2.8, 5.6);
    controls.update();
    return;
  }

  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  const maxSize = Math.max(size.x, size.y, size.z);
  const fitHeightDistance = maxSize / (2 * Math.tan((camera.fov * Math.PI) / 360));
  const fitWidthDistance = fitHeightDistance / camera.aspect;
  const distance = Math.max(fitHeightDistance, fitWidthDistance) * 1.35;

  controls.target.copy(center);
  camera.near = Math.max(distance / 100, 0.05);
  camera.far = distance * 100;
  camera.updateProjectionMatrix();
  camera.position.copy(center).add(new THREE.Vector3(distance, distance * 0.32, distance));
  controls.update();
}

function addFallbackModel() {
  clearModel();
  const group = new THREE.Group();
  const geometry = new THREE.BoxGeometry(1, 1, 1);
  const material = new THREE.MeshStandardMaterial({
    color: 0x2f6f73,
    metalness: 0.18,
    roughness: 0.55,
  });
  const cube = new THREE.Mesh(geometry, material);
  cube.castShadow = true;
  cube.receiveShadow = true;
  group.add(cube);
  currentRoot = group;
  scene.add(group);
  frameObject(group);
  setStatus('Falha ao carregar o GLB/GLTF. A mostrar fallback local.');
}

function loadModel(url) {
  if (!url) {
    setStatus('Indica uma URL de modelo para carregar o viewer.');
    return;
  }

  const loadId = ++activeLoadId;
  clearModel();
  openSourceLink.href = url;
  openSourceLink.style.pointerEvents = 'auto';
  openSourceLink.style.opacity = '1';
  setStatus(`A carregar ${url}`);

  loader.load(
    url,
    (gltf) => {
      if (disposed || loadId !== activeLoadId) return;
      currentRoot = gltf.scene;
      scene.add(gltf.scene);
      frameObject(gltf.scene);
      setStatus(`Modelo carregado: ${url}`);
    },
    undefined,
    () => {
      if (disposed || loadId !== activeLoadId) return;
      addFallbackModel();
    },
  );
}

function animate() {
  if (disposed) return;
  controls.update();
  renderer.render(scene, camera);
  frameId = window.requestAnimationFrame(animate);
}

function cleanup() {
  disposed = true;
  if (frameId) {
    window.cancelAnimationFrame(frameId);
  }
  resizeObserver.disconnect();
  controls.dispose();
  clearModel();
  renderer.dispose();
}

loadButton.addEventListener('click', () => {
  loadModel(modelInput.value.trim());
});

modelInput.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') {
    event.preventDefault();
    loadModel(modelInput.value.trim());
  }
});

window.addEventListener('beforeunload', cleanup, { once: true });
syncSize();
animate();

if (initialModelUrl) {
  loadModel(initialModelUrl);
}
