"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { CartItem, Product } from "@/types";
import { useToast } from "@/context/ToastContext";

interface CartContextType {
    cart: CartItem[];
    addToCart: (product: Product, quantity?: number) => void;
    removeFromCart: (productId: string) => void;
    updateQuantity: (productId: string, quantity: number) => void;
    clearCart: () => void;
    itemsCount: number;
    subtotal: number;
    isCartOpen: boolean;
    openCart: () => void;
    closeCart: () => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

/** NOTE: CartProvider must be nested INSIDE <ToastProvider> (see layout.tsx). */
export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [cart, setCart] = useState<CartItem[]>([]);
    const [isCartOpen, setIsCartOpen] = useState(false);
    const { toast } = useToast();

    // Load cart from localStorage on mount
    useEffect(() => {
        const savedCart = localStorage.getItem("kafunda_cart");
        if (savedCart) {
            try {
                const parsedCart = JSON.parse(savedCart);
                // Defer the state update to avoid the strict synchronous cascade error
                setTimeout(() => {
                    setCart(parsedCart);
                }, 0);
            } catch (e) {
                console.error("Failed to parse cart from localStorage", e);
            }
        }
    }, []);

    // Save cart to localStorage on changes
    useEffect(() => {
        localStorage.setItem("kafunda_cart", JSON.stringify(cart));
    }, [cart]);

    const openCart = () => setIsCartOpen(true);
    const closeCart = () => setIsCartOpen(false);

    const addToCart = (product: Product, quantity: number = 1) => {
        setCart((prevCart) => {
            const existingItem = prevCart.find((item) => item.id === product.id);
            if (existingItem) {
                return prevCart.map((item) =>
                    item.id === product.id ? { ...item, quantity: item.quantity + quantity } : item
                );
            }
            return [...prevCart, { ...product, quantity }];
        });
        toast(`${product.name} added to cart`);
        // Decision (June 2026): toast is the add-to-cart feedback; the drawer no
        // longer auto-opens, so browsing flow isn't interrupted on every add
        // (especially on mobile). To revert, add `openCart();` back here.
    };

    const removeFromCart = (productId: string) => {
        const removed = cart.find((item) => item.id === productId);
        setCart((prevCart) => prevCart.filter((item) => item.id !== productId));
        if (removed) toast(`${removed.name} removed from cart`, "info");
    };

    const updateQuantity = (productId: string, quantity: number) => {
        if (quantity <= 0) {
            removeFromCart(productId);
            return;
        }
        setCart((prevCart) =>
            prevCart.map((item) => (item.id === productId ? { ...item, quantity } : item))
        );
    };

    const clearCart = () => setCart([]);

    const itemsCount = cart.reduce((total, item) => total + item.quantity, 0);
    const subtotal = cart.reduce((total, item) => total + item.price_ugx * item.quantity, 0);

    return (
        <CartContext.Provider
            value={{
                cart,
                addToCart,
                removeFromCart,
                updateQuantity,
                clearCart,
                itemsCount,
                subtotal,
                isCartOpen,
                openCart,
                closeCart
            }}
        >
            {children}
        </CartContext.Provider>
    );
};

export const useCart = () => {
    const context = useContext(CartContext);
    if (context === undefined) {
        throw new Error("useCart must be used within a CartProvider");
    }
    return context;
};