import mongoose from 'mongoose';
import { baseSchemaOptions } from '../utils/schemaOptions.js';

const { Schema } = mongoose;

const ROLES = ['admin', 'organizer', 'attendee', 'vendor'];

const participantSchema = new Schema({
    planId: { type: Schema.Types.ObjectId, ref: 'Plan', required: true },
    firstName: { type: String, required: true },
    lastName: { type: String, default: '' },
    email: { type: String, required: true },
    role: { type: String, enum: ROLES, required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
}, baseSchemaOptions);

export default mongoose.model('Participant', participantSchema);
