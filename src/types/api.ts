export type Category = 'tops' | 'bottoms' | 'outerwear' | 'sleepwear' | 'dresses' | 'others';

export type Product = {
  id: string;
  name: string;
  brand: string;
  category: Category;
  price: number;
  isEstimatedPrice?: boolean;
  imageUrl: string;
  description: string;
  colors: string[];
  sizes: string[];
  style: string;
  categoryPath?: {
    major?: { code: string; label: string } | null;
    middle?: { code: string; label: string } | null;
    minor?: { code: string; label: string } | null;
  };
};

export type CartItem = {
  productId: string;
  color: string;
  size: string;
  quantity: number;
  product?: Product;
};
export type Preferences = { styles: string[]; colors: string[]; creativeStyle: string | null };
export type DemoOrder = { id: string; items: CartItem[]; total: number; createdAt: string };
export type BodyProfile = {
  height_cm: number | null;
  weight_kg: number | null;
  body_shape: string | null;
  body_shape_label_ko?: string;
  updated_at?: string;
};
export type UserConsent = {
  purpose: string;
  granted: boolean;
  policy_version?: string;
  created_at?: string;
};
export type AuthUser = {
  id: string;
  email: string;
  displayName: string;
  gender?: 'women' | 'men';
  accountStatus?: string;
  createdAt?: string;
  bodyProfile?: BodyProfile;
  consents?: UserConsent[];
};
