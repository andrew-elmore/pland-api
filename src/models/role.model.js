import mongoose from 'mongoose';
import { baseSchemaOptions } from '../utils/schemaOptions.js';

const { Schema } = mongoose;

const TYPES = ['admin', 'organizer', 'attendee', 'vendor'];

const roleSchema = new Schema({
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    planId: { type: Schema.Types.ObjectId, ref: 'Plan', required: true },
    type: { type: String, enum: TYPES, required: true },
}, baseSchemaOptions);

export default mongoose.model('Role', roleSchema);
