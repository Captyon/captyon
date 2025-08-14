export const CROPPING = {
  allowedAspects: ["1:1", "4:3", "3:2", "16:9"],
  minSize: { w: 512, h: 512 },
  snapSizes: [512, 640, 768, 1024]
} as const;

export const DETECTION = {
  engine: "mediapipe" as "mediapipe" | "yolo_onnx" | "owlvit",
  webgpuPreferred: true,
  maxModelBytes: 100 * 1024 * 1024
} as const;
