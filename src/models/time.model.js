import mongoose from 'mongoose';
import { baseSchemaOptions } from '../utils/schemaOptions.js';

const { Schema } = mongoose;

const timeSchema = new Schema({
    datetime: { type: Date, required: true },
}, baseSchemaOptions);

export default mongoose.model('Time', timeSchema);
