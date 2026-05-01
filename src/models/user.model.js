import mongoose from 'mongoose';
import { baseSchemaOptions } from '../utils/schemaOptions.js';

const { Schema } = mongoose;

const userSchema = new Schema({
    email: { type: String, required: true, unique: true },
    passwordHash: { type: String, required: true },
    profileId: { type: Schema.Types.ObjectId, ref: 'Profile', default: null },
}, baseSchemaOptions);

export default mongoose.model('User', userSchema);
