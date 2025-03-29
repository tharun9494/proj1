import { collection, addDoc, serverTimestamp, query, where, getDocs } from 'firebase/firestore';
import { db } from '../config/firebase';

interface MenuItem {
  name: string;
  price: number;
  category: string;
  description: string;
  image: string;
  isVeg: boolean;
}

const menuItems: MenuItem[] = [
  // Biryani Section
  {
    name: "Chicken Dum Biryani",
    price: 170,
    category: "Biryani",
    description: "Aromatic basmati rice cooked with tender chicken pieces and authentic spices",
    image: "https://images.unsplash.com/photo-1633945274405-b6c8069047b0?auto=format&fit=crop&w=800",
    isVeg: false
  },
  {
    name: "Chicken Fry Piece Biryani",
    price: 200,
    category: "Biryani",
    description: "Flavorful biryani with crispy fried chicken pieces",
    image: "https://images.unsplash.com/photo-1589302168068-964664d93dc0?auto=format&fit=crop&w=800",
    isVeg: false
  },
  {
    name: "Chicken Boneless Biryani",
    price: 210,
    category: "Biryani",
    description: "Rich biryani with tender boneless chicken pieces",
    image: "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&w=800",
    isVeg: false
  },
  {
    name: "Chicken Lollipop Biryani",
    price: 230,
    category: "Biryani",
    description: "Special biryani served with marinated chicken lollipops",
    image: "https://images.unsplash.com/photo-1642821373181-696a54913e93?auto=format&fit=crop&w=800",
    isVeg: false
  },
  {
    name: "Chicken Mughlai Biryani",
    price: 230,
    category: "Biryani",
    description: "Rich and creamy Mughlai-style biryani with tender chicken",
    image: "https://images.unsplash.com/photo-1599043513900-ed6fe01d3833?auto=format&fit=crop&w=800",
    isVeg: false
  },
  {
    name: "Chicken Gongura Biryani",
    price: 230,
    category: "Biryani",
    description: "Spicy biryani with tender chicken and tangy gongura leaves",
    image: "https://images.unsplash.com/photo-1630851840633-f96999247032?auto=format&fit=crop&w=800",
    isVeg: false
  },
  {
    name: "Mutton Dum Biryani",
    price: 270,
    category: "Biryani",
    description: "Traditional dum-cooked biryani with tender mutton pieces",
    image: "https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?auto=format&fit=crop&w=800",
    isVeg: false
  },
  {
    name: "Fish Biryani",
    price: 250,
    category: "Biryani",
    description: "Aromatic biryani with fresh fish and special spices",
    image: "https://images.unsplash.com/photo-1639461946436-e308107d518c?auto=format&fit=crop&w=800",
    isVeg: false
  },
  {
    name: "Prawns Biryani",
    price: 270,
    category: "Biryani",
    description: "Delicious biryani with fresh prawns and authentic spices",
    image: "https://images.unsplash.com/photo-1610057099443-fde8c4d50f91?auto=format&fit=crop&w=800",
    isVeg: false
  },

  // Family Pack Section
  {
    name: "Chicken Dum Biryani (F)",
    price: 470,
    category: "Family Pack",
    description: "Family-size portion of our signature chicken dum biryani",
    image: "https://images.unsplash.com/photo-1633945274405-b6c8069047b0?auto=format&fit=crop&w=800",
    isVeg: false
  },
  {
    name: "Mutton Dum Biryani (F)",
    price: 750,
    category: "Family Pack",
    description: "Family-size portion of our special mutton dum biryani",
    image: "https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?auto=format&fit=crop&w=800",
    isVeg: false
  },

  // Veg Biryani Section
  {
    name: "Veg Biryani",
    price: 140,
    category: "Veg Biryani",
    description: "Aromatic biryani with fresh mixed vegetables",
    image: "https://images.unsplash.com/photo-1596797038530-2c107229654b?auto=format&fit=crop&w=800",
    isVeg: true
  },
  {
    name: "Paneer Biryani",
    price: 170,
    category: "Veg Biryani",
    description: "Rich biryani with fresh cottage cheese and vegetables",
    image: "https://images.unsplash.com/photo-1645177628189-3a4f875e6b66?auto=format&fit=crop&w=800",
    isVeg: true
  },
  {
    name: "Mushroom Biryani",
    price: 170,
    category: "Veg Biryani",
    description: "Flavorful biryani with fresh mushrooms and spices",
    image: "https://images.unsplash.com/photo-1596797038534-2c107e0e5385?auto=format&fit=crop&w=800",
    isVeg: true
  },

  // Tandoori Items
  {
    name: "Chicken Tikka",
    price: 220,
    category: "Tandoori",
    description: "Marinated chicken pieces grilled to perfection",
    image: "https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?auto=format&fit=crop&w=800",
    isVeg: false
  },
  {
    name: "Tangadi Kabab",
    price: 270,
    category: "Tandoori",
    description: "Tender leg pieces marinated and grilled in tandoor",
    image: "https://images.unsplash.com/photo-1606471191009-63994c53433b?auto=format&fit=crop&w=800",
    isVeg: false
  },
  {
    name: "Malai Tikka",
    price: 230,
    category: "Tandoori",
    description: "Creamy marinated chicken pieces grilled in tandoor",
    image: "https://images.unsplash.com/photo-1628294895950-9805252327bc?auto=format&fit=crop&w=800",
    isVeg: false
  },
  {
    name: "Angara Kabab",
    price: 230,
    category: "Tandoori",
    description: "Spicy chargrilled kababs with a smoky flavor",
    image: "https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=800",
    isVeg: false
  },
  {
    name: "Angara Kabab",
    price: 230,
    category: "Tandoori",
    description: "Spicy chargrilled kababs with a smoky flavor",
    image: "https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=800",
    isVeg: true
  },
  {
    name: "Angara Kabab",
    price: 230,
    category: "Tandoori",
    description: "Spicy chargrilled kababs with a smoky flavor",
    image: "https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=800",
    isVeg: true
  }

];

export const populateMenu = async () => {
  try {
    const menuCollection = collection(db, 'menuItems');
    
    // Keep track of added items to prevent duplicates
    const existingItems = new Set<string>();
    
    // Get all existing menu items
    const existingSnapshot = await getDocs(menuCollection);
    existingSnapshot.forEach(doc => {
      const data = doc.data();
      existingItems.add(data.name.toLowerCase());
    });
    
    let addedCount = 0;
    let skippedCount = 0;
    
    for (const item of menuItems) {
      // Check if item already exists (case insensitive)
      if (!existingItems.has(item.name.toLowerCase())) {
        await addDoc(menuCollection, {
          ...item,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
        existingItems.add(item.name.toLowerCase());
        addedCount++;
        console.log(`Added ${item.name} to menu`);
      } else {
        skippedCount++;
        console.log(`Skipped duplicate item: ${item.name}`);
      }
    }
    
    console.log(`Menu population completed successfully:
      - Added: ${addedCount} items
      - Skipped: ${skippedCount} duplicates`);
  } catch (error) {
    console.error('Error populating menu:', error);
    throw error;
  }
};