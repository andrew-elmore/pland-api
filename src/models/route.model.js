import mongoose from 'mongoose';
import { baseSchemaOptions } from '../utils/schemaOptions.js';

const { Schema } = mongoose;

const TRAVEL_MODES = ['drive', 'walk', 'transit'];
const TIME_MODES = ['depart_at', 'arrive_by'];
const TRANSIT_MODES = ['bus', 'subway', 'train', 'tram', 'ferry'];

const directionStepSchema = new Schema({
    htmlInstructions: { type: String, required: true },
    maneuver: { type: String, default: null },
    distanceMeters: { type: Number, required: true },
    durationSeconds: { type: Number, required: true },
    startLat: { type: Number, required: true },
    startLng: { type: Number, required: true },
    endLat: { type: Number, required: true },
    endLng: { type: Number, required: true },
    polyline: { type: String, required: true },
    travelMode: { type: String, required: true },
}, { _id: false });

const routeSchema = new Schema({
    originLocationId: { type: Schema.Types.ObjectId, ref: 'Location', required: true },
    destinationLocationId: { type: Schema.Types.ObjectId, ref: 'Location', required: true },
    travelMode: { type: String, enum: TRAVEL_MODES, required: true },
    timeMode: { type: String, enum: TIME_MODES, required: true },
    durationSeconds: { type: Number, required: true },
    distanceMeters: { type: Number, required: true },
    transitModes: [{ type: String, enum: TRANSIT_MODES }],
    overviewPolyline: { type: String, default: '' },
    steps: [directionStepSchema],
}, baseSchemaOptions);

export default mongoose.model('Route', routeSchema);
