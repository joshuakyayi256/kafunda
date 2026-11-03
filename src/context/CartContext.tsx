"use client";

import React, { createContext, useContext, useState, useEffect, useRef } from "react";
import { CartItem, Product } from "@/types";
import { useToast } from "@/context/ToastContext";
import { maybePromptPush, syncCartTags, trackAddToCart } from "@/lib/track";

interface CartContextType {
    cart: CartItem[];
    addToCart: (product: Product, quantity?: number) => void;
    removeFromCart: (productId: string) => void;
    updateQuantity: (productId: string, quantity: number) => void;
    clearCart: () => void;
    restoreCart: (items: { product: Product; quantity: number }[]) => void;
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

    // Save cart to localStorage on changes (and keep the OneSignal
    // abandoned-cart tags in step). Skip the very first run: the cart is
    // still [] before the saved one loads, and that would wipe the tags.
    const loadedRef = useRef(false);
    useEffect(() => {
        localStorage.setItem("kafunda_cart", JSON.stringify(cart));
        if (loadedRef.current) syncCartTags(cart);
        else if (cart.length > 0) loadedRef.current = true;
    }, [cart]);
    useEffect(() => {
        // Nothing saved → the cart really is empty; tags may sync from now on.
        const t = setTimeout(() => { loadedRef.current = true; }, 500);
        return () => clearTimeout(t);
    }, []);

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
        trackAddToCart(product, quantity);
        maybePromptPush(); // high-intent moment to ask for offer/order-update pushes
        // Sept 2026: open the cart drawer on every add — the customer sees what's
        // in the cart and a one-tap Checkout button (client request: fewer
        // steps to buy). The drawer itself is the confirmation, so no toast.
        openCart();
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

    /** Abandoned-cart link: put the saved lines back (merging with anything already here). */
    const restoreCart = (items: { product: Product; quantity: number }[]) => {
        setCart((prev) => {
            const next = [...prev];
            for (const { product, quantity } of items) {
                const at = next.findIndex((i) => i.id === product.id);
                if (at >= 0) next[at] = { ...next[at], quantity: Math.max(next[at].quantity, quantity) };
                else next.push({ ...product, quantity });
            }
            return next;
        });
    };

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
                restoreCart,
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