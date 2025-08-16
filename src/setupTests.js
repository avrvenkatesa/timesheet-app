// src/setupTests.js
import '@testing-library/jest-dom';

// Mock canvas for jsPDF in test environment
Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
  value: () => ({
    fillRect: () => {},
    clearRect: () => {},
    getImageData: () => ({
      data: new Array(4)
    }),
    putImageData: () => {},
    createImageData: () => [],
    setTransform: () => {},
    drawImage: () => {},
    save: () => {},
    fillText: () => {},
    restore: () => {},
    beginPath: () => {},
    moveTo: () => {},
    lineTo: () => {},
    closePath: () => {},
    stroke: () => {},
    translate: () => {},
    scale: () => {},
    rotate: () => {},
    arc: () => {},
    fill: () => {},
    measureText: () => ({
      width: 0
    }),
    transform: () => {},
    rect: () => {},
    clip: () => {},
  })
});

// Mock jsPDF for tests
jest.mock('jspdf', () => ({
  jsPDF: jest.fn().mockImplementation(() => ({
    text: jest.fn(),
    addPage: jest.fn(),
    setFontSize: jest.fn(),
    save: jest.fn(),
    internal: {
      pageSize: {
        width: 210,
        height: 297
      }
    }
  }))
}));