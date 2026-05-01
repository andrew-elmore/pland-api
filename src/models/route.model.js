import mongoose from 'mongoose';
import { baseSchemaOptions } from '../utils/schemaOptions.js';

const { Schema } = mongoose;

const TRAVEL_MODES = ['drive', 'walk', 'bicycle', 'transit'];

const routeSchema = new Schema({
    originLocationId: { type: Schema.Types.ObjectId, ref: 'Location', required: true },
    destinationLocationId: { type: Schema.Types.ObjectId, ref: 'Location', required: true },
    travelMode: { type: String, enum: TRAVEL_MODES, required: true },
    durationSeconds: { type: Number, required: true },
    distanceMeters: { type: Number, required: true },
    departureTime: { type: Date, required: true },
}, baseSchemaOptions);

export default mongoose.model('Route', routeSchema);
