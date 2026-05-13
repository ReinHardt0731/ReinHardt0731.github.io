import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.165.0/build/three.module.js";
import { GLTFLoader } from "https://cdn.jsdelivr.net/npm/three@0.165.0/examples/jsm/loaders/GLTFLoader.js";

const sceneRoot = document.getElementById("scene-root");
const loadingPanel = document.getElementById("loading-panel");
const loadingCopy = document.getElementById("loading-copy");
const frameReadout = document.getElementById("frame-readout");
const progressReadout = document.getElementById("progress-readout");
const cueCards = Array.from(document.querySelectorAll(".cue-card"));
const timelineItems = Array.from(document.querySelectorAll(".timeline-item"));
const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

const cueFrames = cueCards
  .map((card) => Number(card.dataset.frame || "0"))
  .sort((a, b) => a - b);

const endFrame = cueFrames[cueFrames.length - 1] || 1;

const renderer = new THREE.WebGLRenderer({
  antialias: true,
  alpha: true,
});

renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1;
sceneRoot.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.add(new THREE.HemisphereLight(0xd8f5ff, 0x17253d, 1.6));

let activeCamera = new THREE.PerspectiveCamera(40, window.innerWidth / window.innerHeight, 0.1, 2000);
activeCamera.position.set(0, 0, 8);

let mixer = null;
let action = null;
let clipDuration = 0;
let currentProgress = 0;
let targetProgress = 0;
let activeCueIndex = 0;
let sceneReady = false;
let renderPending = false;

const loader = new GLTFLoader();

loader.load(
  "./aircraft.glb",
  (gltf) => {
    scene.add(gltf.scene);

    const embeddedCamera =
      gltf.scene.getObjectByProperty("isCamera", true) ||
      gltf.cameras[0] ||
      null;

    if (embeddedCamera) {
      activeCamera = embeddedCamera;
      activeCamera.aspect = window.innerWidth / window.innerHeight;
      activeCamera.updateProjectionMatrix();
    }

    if (gltf.animations.length > 0) {
      const longestClip = gltf.animations.reduce((longest, candidate) => {
        return candidate.duration > longest.duration ? candidate : longest;
      });

      mixer = new THREE.AnimationMixer(gltf.scene);
      action = mixer.clipAction(longestClip);
      action.play();
      action.paused = true;
      action.enabled = true;
      clipDuration = longestClip.duration;
    } else {
      loadingCopy.textContent = "The GLB loaded, but no animation clip was found.";
    }

    sceneReady = true;
    syncFromScroll(true);
    renderFrame();
    hideLoading();
  },
  (event) => {
    if (!event.total) {
      return;
    }

    const loadedPercent = Math.round((event.loaded / event.total) * 100);
    loadingCopy.textContent = `Loading aircraft.glb: ${loadedPercent}%`;
  },
  (error) => {
    console.error(error);
    loadingCopy.textContent = "The GLB could not be loaded. Check the file path and browser console.";
  }
);

function getScrollProgress() {
  const maxScroll = Math.max(document.documentElement.scrollHeight - window.innerHeight, 1);
  return THREE.MathUtils.clamp(window.scrollY / maxScroll, 0, 1);
}

function getCueIndex(frame) {
  let index = 0;

  cueFrames.forEach((cueFrame, cueIndex) => {
    if (frame >= cueFrame) {
      index = cueIndex;
    }
  });

  return index;
}

function updateCueState(frame) {
  activeCueIndex = getCueIndex(frame);

  cueCards.forEach((card, index) => {
    card.classList.toggle("is-active", index === activeCueIndex);
  });

  timelineItems.forEach((item) => {
    const markerFrame = Number(item.dataset.frameMarker || "0");
    item.classList.toggle("is-hit", frame >= markerFrame);
  });
}

function updateReadouts(progress) {
  const frame = Math.round(progress * endFrame);
  frameReadout.textContent = `Frame ${frame}`;
  progressReadout.textContent = `${Math.round(progress * 100)}%`;
  document.documentElement.style.setProperty("--frame-progress", progress.toFixed(4));
  updateCueState(frame);
}

function renderFrame() {
  if (!sceneReady) {
    return;
  }

  renderer.render(scene, activeCamera);
}

function syncAnimation(progress) {
  updateReadouts(progress);

  if (mixer && action && clipDuration > 0) {
    mixer.setTime(progress * clipDuration);
  }

  renderFrame();
}

function tick() {
  renderPending = true;
  const ease = prefersReducedMotion.matches ? 1 : 0.1;
  currentProgress += (targetProgress - currentProgress) * ease;

  if (Math.abs(targetProgress - currentProgress) < 0.0008) {
    currentProgress = targetProgress;
  }

  syncAnimation(currentProgress);

  if (Math.abs(targetProgress - currentProgress) > 0.0008) {
    window.requestAnimationFrame(tick);
  } else {
    renderPending = false;
  }
}

function syncFromScroll(force = false) {
  targetProgress = getScrollProgress();

  if (force) {
    currentProgress = targetProgress;
    syncAnimation(currentProgress);
    return;
  }

  if (!renderPending) {
    window.requestAnimationFrame(tick);
  }
}

function hideLoading() {
  if (!loadingPanel) {
    return;
  }

  window.setTimeout(() => {
    loadingPanel.classList.add("is-hidden");
  }, 250);
}

window.addEventListener("scroll", () => {
  syncFromScroll();
}, { passive: true });

window.addEventListener("resize", () => {
  renderer.setSize(window.innerWidth, window.innerHeight);
  activeCamera.aspect = window.innerWidth / window.innerHeight;
  activeCamera.updateProjectionMatrix();
  syncFromScroll(true);
});

updateReadouts(0);
