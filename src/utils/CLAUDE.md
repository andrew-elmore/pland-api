# Utils Standards

Shared utilities live in `src/utils/`.

## `schemaOptions.js`

Base Mongoose schema options used by every model:

```javascript
export const baseSchemaOptions = {
    timestamps: true,
    toJSON: {
        virtuals: true,
        transform: (_, ret) => {
            delete ret._id;
            delete ret.__v;
            return ret;
        },
    },
};
```

This ensures all models:
- Get `createdAt` and `updatedAt` timestamps automatically
- Serialize with `id` (string) instead of `_id` (ObjectId)
- Strip the `__v` version key from JSON output

## Rules

- Utilities are named exports from individual files
- Each utility file serves a single purpose
- Utilities never import from models, services, controllers, or routes
