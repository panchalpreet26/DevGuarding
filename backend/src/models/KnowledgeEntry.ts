import { Schema, model, type InferSchemaType, type HydratedDocument } from 'mongoose';

/**
 * Engineering Memory — tribal knowledge captured when the AI cannot answer.
 * Fields: question, answer, repository, createdBy, timestamps.
 */
const knowledgeEntrySchema = new Schema(
  {
    question: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2000,
    },
    answer: {
      type: String,
      required: true,
      trim: true,
      maxlength: 20_000,
    },
    repoFullName: {
      type: String,
      required: true,
      trim: true,
      index: true,
      maxlength: 200,
    },
    createdBy: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
      default: 'developer',
    },
  },
  {
    timestamps: true,
    collection: 'knowledge_entries',
  },
);

knowledgeEntrySchema.index({ repoFullName: 1, createdAt: -1 });
knowledgeEntrySchema.index({
  repoFullName: 1,
  question: 'text',
  answer: 'text',
});

export type KnowledgeEntryDocument = HydratedDocument<InferSchemaType<typeof knowledgeEntrySchema>>;

export const KnowledgeEntryModel = model('KnowledgeEntry', knowledgeEntrySchema);
