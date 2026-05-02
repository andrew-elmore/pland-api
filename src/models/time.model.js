import mongoose from 'mongoose';
import { baseSchemaOptions } from '../utils/schemaOptions.js';

const { Schema } = mongoose;

const timeSchema = new Schema({
    planId: { type: Schema.Types.ObjectId, ref: 'Plan', required: true },
    label: { type: String, default: '' },
    datetime: { type: Date, required: true },
    parentTimeId: { type: Schema.Types.ObjectId, ref: 'Time', default: null },
    offsetSeconds: { type: Number, default: 0 },
    routeId: { type: Schema.Types.ObjectId, ref: 'Route', default: null },
}, baseSchemaOptions);

export default mongoose.model('Time', timeSchema);
