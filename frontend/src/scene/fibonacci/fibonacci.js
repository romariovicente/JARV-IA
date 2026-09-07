export const fibonacci = [
  1,
  1,
  2,
  3,
  5,
  8,
  13,
  21,
  34,
  55,
  89
];

export function fibonacciPoint(index, scale = 1) {

  const goldenAngle =
    Math.PI * (3 - Math.sqrt(5));

  const radius =
    Math.sqrt(index) * scale;

  const angle =
    index * goldenAngle;

  return {
    x: Math.cos(angle) * radius,
    y: Math.sin(angle) * radius
  };
}
