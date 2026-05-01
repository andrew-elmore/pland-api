import mongoose from 'mongoose';
import { baseSchemaOptions } from '../utils/schemaOptions.js';

const { Schema } = mongoose;

const itinerarySchema = new Schema({
    planId: { type: Schema.Types.ObjectId, ref: 'Plan', required: true },
    name: { type: String, required: true },
    stepIds: [{ type: Schema.Types.ObjectId, ref: 'Step' }],
    windowIds: [{ type: Schema.Types.ObjectId, ref: 'Window' }],
}, baseSchemaOptions);

export default mongoose.model('Itinerary', itinerarySchema);
