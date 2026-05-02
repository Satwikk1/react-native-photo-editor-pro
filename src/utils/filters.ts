// src/utils/filters.ts

export type FilterType = 'normal' | 'grayscale' | 'sepia' | 'high-contrast';

// A default identity matrix
export const IDENTITY_MATRIX = [
  1, 0, 0, 0, 0,
  0, 1, 0, 0, 0,
  0, 0, 1, 0, 0,
  0, 0, 0, 1, 0,
];

export const GRAYSCALE_MATRIX = [
  0.21, 0.72, 0.07, 0, 0,
  0.21, 0.72, 0.07, 0, 0,
  0.21, 0.72, 0.07, 0, 0,
  0,    0,    0,    1, 0,
];

export const SEPIA_MATRIX = [
  0.393, 0.769, 0.189, 0, 0,
  0.349, 0.686, 0.168, 0, 0,
  0.272, 0.534, 0.131, 0, 0,
  0,     0,     0,     1, 0,
];

export const HIGH_CONTRAST_MATRIX = [
  2, 0, 0, 0, -255/2,
  0, 2, 0, 0, -255/2,
  0, 0, 2, 0, -255/2,
  0, 0, 0, 1, 0,
];

export const getFilterMatrix = (filter: FilterType): number[] => {
  switch (filter) {
    case 'grayscale': return GRAYSCALE_MATRIX;
    case 'sepia': return SEPIA_MATRIX;
    case 'high-contrast': return HIGH_CONTRAST_MATRIX;
    default: return IDENTITY_MATRIX;
  }
};
