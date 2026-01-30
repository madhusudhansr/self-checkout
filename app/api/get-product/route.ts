import { NextResponse } from 'next/server';

type Product = {
  id: string;
  name: string;
  price: number;
};

const products: Product[] = [
  { id: '123', name: 'Organic Bananas', price: 1.99 },
  { id: '456', name: 'Sourdough Bread', price: 4.50 },
  { id: '789', name: 'Almond Milk', price: 3.29 },
  { id: '101', name: 'Dark Chocolate', price: 2.99 },
  { id: '202', name: 'Avocado', price: 1.50 },
  { id: 'cartons-milk', name: 'Milk Carton', price: 1.20 },
  { id: 'cereal-box', name: 'Honey Nut Cheerios', price: 5.49 },
  { id: 'water-bottle', name: 'Spring Water', price: 0.99 },
];

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'Product ID is required' }, { status: 400 });
  }

  const product = products.find((p) => p.id === id);

  if (!product) {
    return NextResponse.json({ error: 'Product not found' }, { status: 404 });
  }

  // Simulate a small delay for realism
  await new Promise((resolve) => setTimeout(resolve, 200));

  return NextResponse.json(product);
}
