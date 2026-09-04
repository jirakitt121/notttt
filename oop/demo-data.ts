import manifest from '../public/static/demo/manifest.json';

// The packaged, actually trained model is independent of user-uploaded YOLO weights.
export const demoModel = {
  ...manifest.model,
  model: manifest.model.name,
  message: 'โมเดลเดโมพร้อมใช้ · ภาพสังเคราะห์เท่านั้น',
  iou: 0.45,
};
export const demoSamples = manifest.samples;
export const demoVersion = manifest.version;
export const demoExists = (alias: string, kind: 'part'|'inspection') =>
  `EXISTS(SELECT 1 FROM demo_items d WHERE d.entity_id=${alias}.id AND d.kind='${kind}')`;
