import mongoose from 'mongoose';
import { baseSchemaOptions } from '../utils/schemaOptions.js';

const { Schema } = mongoose;

const timeSchema = new Schema({
    planId: { type: Schema.Types.ObjectId, ref: 'Plan', required: true },
    label: { type: String, default: '' },
    datetime: { type: Date, required: true },
}, baseSchemaOptions);

export default mongoose.model('Time', timeSchema);
