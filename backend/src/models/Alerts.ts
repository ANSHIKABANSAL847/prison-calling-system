import mongoose, { Schema, Document } from "mongoose";

export interface IAlert extends Document {
  callId: string;
  prisonerId: string;
  type: string;
  segments: any[];
  timestamp: Date;
}

const AlertSchema: Schema = new Schema({
  callId: {
    type: String,
    required: true,
  },
  prisonerId: {
    type: String,
    required: true,
  },
  type: {
    type: String,
    required: true,
  },
  segments: {
    type: Array,
    default: [],
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
});

export default mongoose.model<IAlert>("Alert", AlertSchema);