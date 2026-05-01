import mongoose from 'mongoose';
import { baseSchemaOptions } from '../utils/schemaOptions.js';

const { Schema } = mongoose;

const stepSchema = new Schema({
    itineraryId: { type: Schema.Types.ObjectId, ref: 'Itinerary', required: true },
    startTimeId: { type: Schema.Types.ObjectId, ref: 'Time', required: true },
    endTimeId: { type: Schema.Types.ObjectId, ref: 'Time', required: true },
    locationId: { type: Schema.Types.ObjectId, ref: 'Location', default: null },
    routeId: { type: Schema.Types.ObjectId, ref: 'Route', default: null },
}, baseSchemaOptions);

export default mongoose.model('Step', stepSchema);
