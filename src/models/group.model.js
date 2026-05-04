import mongoose from 'mongoose';
import { baseSchemaOptions } from '../utils/schemaOptions.js';

const { Schema } = mongoose;

const groupSchema = new Schema({
    planId: { type: Schema.Types.ObjectId, ref: 'Plan', required: true },
    name: { type: String, required: true },
    participantIds: [{ type: Schema.Types.ObjectId, ref: 'Participant' }],
}, baseSchemaOptions);

export default mongoose.model('Group', groupSchema);
