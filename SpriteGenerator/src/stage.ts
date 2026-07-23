import * as THREE from 'three';
import { sceneParams, type SceneParams } from './sceneParams';

/**
 * The FIXED game-view camera and the baked lighting. Preview and baker both call
 * these so what you tune on screen is exactly what gets exported.
 *
 * Camera azimuth convention: 0° = camera due SOUTH of the model looking NORTH
 * across the board (so the +Z / South face of the mummy points at the lens).
 * Elevation is degrees above the horizon; 90° = pure top-down bird's-eye.
 *
 * Key-light azimuth convention: 0° = from NORTH (screen top), positive rotates
 * toward EAST (screen right); the default −42° puts it top-LEFT to match the
 * game's baked top-left lighting.
 */
const DEG = Math.PI / 180;

export function makeCamera(): THREE.OrthographicCamera {
  const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.01, 200);
  updateCamera(cam, sceneParams);
  return cam;
}

export function updateCamera(cam: THREE.OrthographicCamera, p: SceneParams): void {
  const c = p.camera;
  const el = c.elevationDeg * DEG;
  const az = c.azimuthDeg * DEG;
  const target = new THREE.Vector3(0, c.targetY, 0);

  const dir = new THREE.Vector3(
    Math.cos(el) * Math.sin(az),
    Math.sin(el),
    Math.cos(el) * Math.cos(az),
  );
  cam.position.copy(target).addScaledVector(dir, c.distance);
  cam.up.set(0, 1, 0);
  cam.lookAt(target);

  // square frustum (render target is square, downscaled to a square frame)
  const h = c.frustumHalf;
  cam.left = -h;
  cam.right = h;
  cam.top = h;
  cam.bottom = -h;
  cam.near = 0.01;
  cam.far = c.distance * 2 + 50;
  cam.updateProjectionMatrix();
}

export function makeLights(): THREE.Group {
  const g = new THREE.Group();
  const l = sceneParams.light;

  const kel = l.keyElevationDeg * DEG;
  const kaz = l.keyAzimuthDeg * DEG;
  const key = new THREE.DirectionalLight(0xfff2d8, l.keyIntensity);
  // azimuth from NORTH(−Z) toward EAST(+X); elevation above horizon.
  key.position.set(
    Math.cos(kel) * Math.sin(kaz),
    Math.sin(kel),
    -Math.cos(kel) * Math.cos(kaz),
  ).multiplyScalar(10);
  key.name = 'key';
  g.add(key);

  // soft fill from the opposite-lower side so shadows aren't crushed black
  const fill = new THREE.DirectionalLight(0x9fb0d0, l.fillIntensity);
  fill.position.set(-key.position.x, key.position.y * 0.4, -key.position.z).multiplyScalar(1);
  fill.name = 'fill';
  g.add(fill);

  const amb = new THREE.AmbientLight(0xffffff, l.ambientIntensity);
  amb.name = 'ambient';
  g.add(amb);

  return g;
}

/** Push live slider values back onto an existing light rig. */
export function updateLights(g: THREE.Group, p: SceneParams): void {
  const l = p.light;
  const kel = l.keyElevationDeg * DEG;
  const kaz = l.keyAzimuthDeg * DEG;
  const key = g.getObjectByName('key') as THREE.DirectionalLight | null;
  const fill = g.getObjectByName('fill') as THREE.DirectionalLight | null;
  const amb = g.getObjectByName('ambient') as THREE.AmbientLight | null;
  if (key) {
    key.intensity = l.keyIntensity;
    key.position.set(
      Math.cos(kel) * Math.sin(kaz),
      Math.sin(kel),
      -Math.cos(kel) * Math.cos(kaz),
    ).multiplyScalar(10);
  }
  if (fill && key) {
    fill.intensity = l.fillIntensity;
    fill.position.set(-key.position.x, key.position.y * 0.4, -key.position.z);
  }
  if (amb) amb.intensity = l.ambientIntensity;
}
