import { createContext, useContext, useEffect, useState, useMemo } from 'react'

const CartContext = createContext(null)
const STORAGE_KEY = 'ubuntustore.cart'

// Each item stores the fields checkout needs, so a stale price or a listing the
// vendor has since pulled never reaches the order screen unnoticed.
const readStored = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function CartProvider({ children }) {
  const [items, setItems] = useState(readStored)

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
    } catch {
      // Private browsing or a full quota. The cart still works for this
      // session, it just will not survive a reload.
    }
  }, [items])

  const value = useMemo(() => {
    const totalUnits = items.reduce((sum, item) => sum + item.quantity, 0)
    const totalPrice = items.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    )

    // A listing can only be bought from one seller, so a mixed basket has to
    // split at checkout rather than silently merging.
    const sellers = new Set(items.map((item) => item.sellerId))
    const singleSeller = sellers.size <= 1 ? [...sellers][0] : null

    return {
      items,
      count: items.length,
      totalUnits,
      totalPrice,
      singleSellerId: singleSeller,
      isMixed: sellers.size > 1,

      add(item, quantity = 1) {
        setItems((current) => {
          const existing = current.find((entry) => entry.id === item.id)
          if (existing) {
            return current.map((entry) =>
              entry.id === item.id
                ? {
                    ...entry,
                    quantity: Math.min(entry.quantity + quantity, item.stock),
                    // Refresh the snapshot in case the vendor changed something.
                    price: item.price,
                    title: item.title
                  }
                : entry
            )
          }
          return [
            ...current,
            { ...item, quantity: Math.min(quantity, item.stock || 1) }
          ]
        })
      },

      setQuantity(id, quantity) {
        setItems((current) =>
          current
            .map((entry) =>
              entry.id === id
                ? { ...entry, quantity: Math.max(1, Math.min(quantity, entry.stock)) }
                : entry
            )
            .filter((entry) => entry.quantity > 0)
        )
      },

      remove(id) {
        setItems((current) => current.filter((entry) => entry.id !== id))
      },

      clear() {
        setItems([])
      }
    }
  }, [items])

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export function useCart() {
  const context = useContext(CartContext)
  if (!context) throw new Error('useCart must be used inside CartProvider')
  return context
}
