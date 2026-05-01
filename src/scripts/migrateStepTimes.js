import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Time from '../models/time.model.js';
import Itinerary from '../models/itinerary.model.js';

dotenv.config();

const { Schema } = mongoose;

const legacyStepSchema = new Schema({}, { strict: false });
const LegacyStep = mongoose.model('LegacyStep', legacyStepSchema, 'steps');

const run = async () => {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log(':~: Connected to MongoDB');

    const steps = await LegacyStep.find({
        startTime: { $exists: true },
        startTimeId: { $exists: false },
    });

    console.log(`:~: Found ${steps.length} steps to migrate`);

    for (const step of steps) {
        const itinerary = await Itinerary.findById(step.itineraryId).select('planId');
        if (!itinerary) {
            console.log(`:~: Skipping step ${step._id} — itinerary not found`);
            continue;
        }

        const startTimeDoc = await new Time({
            planId: itinerary.planId,
            label: '',
            datetime: step.startTime,
        }).save();

        const endTimeDoc = await new Time({
            planId: itinerary.planId,
            label: '',
            datetime: step.endTime,
        }).save();

        await LegacyStep.updateOne(
            { _id: step._id },
            {
                $set: {
                    startTimeId: startTimeDoc._id,
                    endTimeId: endTimeDoc._id,
                },
                $unset: {
                    startTime: '',
                    endTime: '',
                },
            },
        );

        console.log(`:~: Migrated step ${step._id} (${step.name})`);
    }

    console.log(':~: Migration complete');
    await mongoose.disconnect();
};

run().catch((err) => {
    console.error(err);
    process.exit(1);
});
