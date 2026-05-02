import mongoose from 'mongoose';
import { baseSchemaOptions } from '../utils/schemaOptions.js';

const { Schema } = mongoose;

const locationSchema = new Schema({
    planId: { type: Schema.Types.ObjectId, ref: 'Plan', required: true },
    name: { type: String, required: true },
    address: { type: String, default: '' },
    googlePlaceId: { type: String, default: null },
    latitude: { type: Number, default: null },
    longitude: { type: Number, default: null },
}, baseSchemaOptions);

export default mongoose.model('Location', locationSchema);
