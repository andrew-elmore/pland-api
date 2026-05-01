import mongoose from 'mongoose';
import { baseSchemaOptions } from '../utils/schemaOptions.js';

const { Schema } = mongoose;

const locationSchema = new Schema({
    name: { type: String, required: true },
    address: { type: String, required: true },
    googlePlaceId: { type: String, default: null },
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true },
}, baseSchemaOptions);

export default mongoose.model('Location', locationSchema);
