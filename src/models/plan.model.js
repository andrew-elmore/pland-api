import mongoose from 'mongoose';
import { baseSchemaOptions } from '../utils/schemaOptions.js';

const { Schema } = mongoose;

const planSchema = new Schema({
    name: { type: String, required: true },
    description: { type: String, default: '' },
    ownerId: { type: String, required: true },
    locationIds: [{ type: Schema.Types.ObjectId, ref: 'Location' }],
    itineraryIds: [{ type: Schema.Types.ObjectId, ref: 'Itinerary' }],
}, baseSchemaOptions);

export default mongoose.model('Plan', planSchema);
