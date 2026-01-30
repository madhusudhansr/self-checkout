import mongoose from 'mongoose';

export interface Product extends mongoose.Document {
    id: string; // The scan code/barcode
    name: string;
    price: number;
}

const ProductSchema = new mongoose.Schema<Product>({
    id: {
        type: String,
        required: [true, 'Please provide a product ID'],
        unique: true,
    },
    name: {
        type: String,
        required: [true, 'Please provide a name for this product'],
        maxlength: [60, 'Name cannot be more than 60 characters'],
    },
    price: {
        type: Number,
        required: [true, 'Please provide a price for this product'],
    },
});

export default mongoose.models.Product || mongoose.model<Product>('Product', ProductSchema);
