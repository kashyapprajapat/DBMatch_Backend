import vine from '@vinejs/vine';

const schema = vine.object({
  productCategory: vine.string(),
  dataSize: vine.string(),
  initialUsers: vine.string(),
  readWritePattern: vine.string(),
  schemaChangeFrequency: vine.string(),
  dataAccuracyImportance: vine.number().min(1).max(10),
  scalabilityImportance: vine.number().min(1).max(10),
  budget: vine.string(),
  userGeography: vine.string(),
  latencyImportance: vine.number().min(1).max(10)
});

export default schema;
