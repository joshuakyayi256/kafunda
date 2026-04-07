export interface Product {
    id: string;
    name: string;
    brand: string;
    category: string;
    price_ugx: number;
    original_price_ugx: number | null;
    image_url: string;
    gallery_urls: string[];
    in_stock: boolean;
    is_sale: boolean;
    description: string;
    abv: string;
    volume: string;
    is_today_offer?: boolean;
    // New fields for high-conversion UI
    stock_count?: number;
    rating?: number;
    reviews?: number;
}

export interface CartItem extends Product {
    quantity: number;
}