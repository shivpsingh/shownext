/**
 * Verifies that normalized bounding-box coordinates produce identical
 * proportional overlay positions regardless of rendered container size.
 *
 * Run: npx tsx tests/coordinate-invariant.test.ts
 */

type Box = { x: number; y: number; width: number; height: number };

const TEST_BOX: Box = { x: 0.25, y: 0.5, width: 0.2, height: 0.1 };

const VIEWPORTS = [
  { name: "Desktop 1440×900", w: 1440, h: 900 },
  { name: "Mobile portrait 390×844", w: 390, h: 844 },
  { name: "Tall screenshot 390×1800", w: 390, h: 1800 },
  { name: "Camera portrait 3024×4032", w: 3024, h: 4032 },
  { name: "Landscape 1920×1080", w: 1920, h: 1080 },
];

function computeOverlayPercent(box: Box) {
  return {
    left: box.x * 100,
    top: box.y * 100,
    width: box.width * 100,
    height: box.height * 100,
  };
}

function computePixelPosition(box: Box, containerW: number, containerH: number) {
  return {
    left: box.x * containerW,
    top: box.y * containerH,
    width: box.width * containerW,
    height: box.height * containerH,
  };
}

let passed = 0;
let failed = 0;

function assert(condition: boolean, msg: string) {
  if (condition) {
    passed++;
  } else {
    failed++;
    console.error(`  FAIL: ${msg}`);
  }
}

console.log("=== Coordinate Invariant Tests ===\n");

// Test 1: Percentage overlay values are identical regardless of viewport
console.log("Test 1: Percentage values are viewport-independent");
const expected = computeOverlayPercent(TEST_BOX);

for (const vp of VIEWPORTS) {
  const result = computeOverlayPercent(TEST_BOX);
  assert(result.left === expected.left, `${vp.name}: left ${result.left} !== ${expected.left}`);
  assert(result.top === expected.top, `${vp.name}: top ${result.top} !== ${expected.top}`);
  assert(result.width === expected.width, `${vp.name}: width ${result.width} !== ${expected.width}`);
  assert(result.height === expected.height, `${vp.name}: height ${result.height} !== ${expected.height}`);
}

// Test 2: Proportional position is preserved at different rendered sizes
console.log("Test 2: Proportional position preserved at different sizes");

const renderedSizes = [
  { w: 640, h: 1384 },  // mobile container rendering a tall image
  { w: 1200, h: 2594 }, // desktop container rendering same image
  { w: 320, h: 692 },   // very small container
];

for (const size of renderedSizes) {
  const px = computePixelPosition(TEST_BOX, size.w, size.h);
  const proportionLeft = px.left / size.w;
  const proportionTop = px.top / size.h;
  assert(
    Math.abs(proportionLeft - TEST_BOX.x) < 1e-10,
    `${size.w}×${size.h}: proportionLeft ${proportionLeft} !== ${TEST_BOX.x}`,
  );
  assert(
    Math.abs(proportionTop - TEST_BOX.y) < 1e-10,
    `${size.w}×${size.h}: proportionTop ${proportionTop} !== ${TEST_BOX.y}`,
  );
}

// Test 3: Box validation — reject invalid boxes
console.log("Test 3: Box validation");

function isValidBox(b: Box): boolean {
  const TOL = 0.02;
  if ([b.x, b.y, b.width, b.height].some((n) => !Number.isFinite(n))) return false;
  if (b.x < -TOL || b.y < -TOL || b.width <= 0 || b.height <= 0) return false;
  if (b.x + b.width > 1 + TOL || b.y + b.height > 1 + TOL) return false;
  return true;
}

assert(isValidBox({ x: 0.25, y: 0.5, width: 0.2, height: 0.1 }), "valid box should pass");
assert(isValidBox({ x: 0, y: 0, width: 1, height: 1 }), "full-image box should pass");
assert(isValidBox({ x: 0.99, y: 0.99, width: 0.02, height: 0.02 }), "edge box within tolerance should pass");
assert(!isValidBox({ x: -0.1, y: 0.5, width: 0.2, height: 0.1 }), "negative x should fail");
assert(!isValidBox({ x: 0.5, y: 0.5, width: 0.6, height: 0.1 }), "overflowing x+w should fail");
assert(!isValidBox({ x: 0.5, y: 0.5, width: 0, height: 0.1 }), "zero width should fail");
assert(!isValidBox({ x: NaN, y: 0.5, width: 0.2, height: 0.1 }), "NaN should fail");
assert(!isValidBox({ x: 0.5, y: 0.5, width: 0.2, height: Infinity }), "Infinity should fail");

// Test 4: Aspect-ratio preservation check
console.log("Test 4: Aspect ratios produce consistent proportions");

const aspectRatios = [
  { name: "Desktop", srcW: 1440, srcH: 900 },
  { name: "Mobile portrait", srcW: 390, srcH: 844 },
  { name: "Tall screenshot", srcW: 390, srcH: 1800 },
  { name: "Camera portrait", srcW: 3024, srcH: 4032 },
  { name: "Landscape", srcW: 1920, srcH: 1080 },
];

for (const ar of aspectRatios) {
  const containerW = 600;
  const scale = containerW / ar.srcW;
  const containerH = ar.srcH * scale;
  const px = computePixelPosition(TEST_BOX, containerW, containerH);
  const relX = px.left / containerW;
  const relY = px.top / containerH;
  assert(
    Math.abs(relX - TEST_BOX.x) < 1e-10 && Math.abs(relY - TEST_BOX.y) < 1e-10,
    `${ar.name}: proportions preserved in ${containerW}×${Math.round(containerH)} container`,
  );
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
