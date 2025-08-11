import mongoose, { Schema, Document, Model } from 'mongoose';

export type Item = {
  id: string;
  filename?: string;
  base?: string;
  caption?: string;
  originalCaption?: string;
  img?: string;
  imgId?: string;
  tags?: string[];
  selected?: boolean;
  width?: number;
  height?: number;
};

export interface IProject extends Document {
  id: string;
  name?: string;
  createdAt: number;
  updatedAt: number;
  items: Item[];
  cursor?: number;
}

const ItemSchema = new Schema<Item>(
  {
    id: { type: String, required: true },
    filename: String,
    base: String,
    caption: String,
    originalCaption: String,
    img: String,
    imgId: String,
    tags: [String],
    selected: Boolean,
    width: Number,
    height: Number
  },
  { _id: false }
);

const ProjectSchema = new Schema<IProject>(
  {
    id: { type: String, required: true, unique: true, index: true },
    name: String,
    createdAt: Number,
    updatedAt: Number,
    items: [ItemSchema],
    cursor: Number
  },
  { timestamps: false }
);

const Project: Model<IProject> = (mongoose.models.Project as Model<IProject>) || mongoose.model<IProject>('Project', ProjectSchema);

export default Project;
