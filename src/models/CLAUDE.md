# Model Standards

Every file in `src/models/` defines a single Mongoose schema and exports the compiled model as the default export.

## File naming

`{entity}.model.js` — lowercase entity name, singular.

## Template

```javascript
import mongoose from 'mongoose';
import { baseSchemaOptions } from '../utils/schemaOptions.js';

const { Schema } = mongoose;

const entitySchema = new Schema({
    name: { type: String, required: true },
    status: { type: String, enum: STATUSES, required: true },
    parentId: { type: Schema.Types.ObjectId, ref: 'Parent', required: true },
    optionalRef: { type: Schema.Types.ObjectId, ref: 'Other', default: null },
    childIds: [{ type: Schema.Types.ObjectId, ref: 'Child' }],
    count: { type: Number, required: true },
    flag: { type: Boolean, default: false },
    label: { type: String, default: '' },
    timestamp: { type: Date, required: true },
}, baseSchemaOptions);

export default mongoose.model('Entity', entitySchema);
```

## Rules

### Always use `baseSchemaOptions`

Every schema passes `baseSchemaOptions` from `../utils/schemaOptions.js` as the second argument. This adds `timestamps: true` and configures `toJSON` to output `id` instead of `_id` and strip `__v`.

### Field type patterns

| Data type | Mongoose definition |
|---|---|
| Required string | `{ type: String, required: true }` |
| Optional string | `{ type: String, default: '' }` |
| Nullable string | `{ type: String, default: null }` |
| Required ref | `{ type: Schema.Types.ObjectId, ref: 'ModelName', required: true }` |
| Nullable ref | `{ type: Schema.Types.ObjectId, ref: 'ModelName', default: null }` |
| Ref array | `[{ type: Schema.Types.ObjectId, ref: 'ModelName' }]` |
| Required number | `{ type: Number, required: true }` |
| Boolean | `{ type: Boolean, default: false }` |
| Required date | `{ type: Date, required: true }` |
| Enum | `{ type: String, enum: VALID_VALUES, required: true }` |

### Enums

Define enum arrays as constants above the schema:

```javascript
const TYPES = ['admin', 'organizer', 'attendee', 'vendor'];

const roleSchema = new Schema({
    type: { type: String, enum: TYPES, required: true },
}, baseSchemaOptions);
```

### No `id` in schema

Mongoose provides `_id` automatically. The `baseSchemaOptions` transform exposes it as `id` in JSON output.

### One model per file

Each file defines exactly one schema and exports exactly one model. The model name is PascalCase singular: `mongoose.model('Plan', planSchema)`.

### No methods or statics on models

Business logic goes in the service layer, not on Mongoose models.
