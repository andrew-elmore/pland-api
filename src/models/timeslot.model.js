import mongoose from 'mongoose';
import { baseSchemaOptions } from '../utils/schemaOptions.js';

const { Schema } = mongoose;

const timeslotSchema = new Schema({
    windowId: { type: Schema.Types.ObjectId, ref: 'Window', required: true },
    startTimeId: { type: Schema.Types.ObjectId, ref: 'Time', required: true },
    endTimeId: { type: Schema.Types.ObjectId, ref: 'Time', required: true },
    assignedUserId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
}, baseSchemaOptions);

export default mongoose.model('Timeslot', timeslotSchema);
