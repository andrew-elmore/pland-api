import mongoose from 'mongoose';
import { baseSchemaOptions } from '../utils/schemaOptions.js';

const { Schema } = mongoose;

const windowSchema = new Schema({
    itineraryId: { type: Schema.Types.ObjectId, ref: 'Itinerary', required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    timeslotIds: [{ type: Schema.Types.ObjectId, ref: 'Timeslot' }],
}, baseSchemaOptions);

export default mongoose.model('Window', windowSchema);
