import { NextResponse } from 'next/server';
import dbConnect from '../../../lib/mongodb';
import Product from '../../../models/Product';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { id, name, price } = body;

        if (!id || !name || !price) {
            return NextResponse.json(
                { error: 'Please provide all fields: id, name, price' },
                { status: 400 }
            );
        }

        await dbConnect();

        // Check if product already exists
        const existingProduct = await Product.findOne({ id });
        if (existingProduct) {
            return NextResponse.json(
                { error: 'Product with this scan code already exists' },
                { status: 400 }
            );
        }

        const product = await Product.create({ id, name, price });
        return NextResponse.json({ success: true, data: product }, { status: 201 });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: 'Failed to add product' }, { status: 500 });
    }
}
