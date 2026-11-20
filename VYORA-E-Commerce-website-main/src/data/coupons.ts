import { Coupon } from '../types';

export const INITIAL_COUPONS: Coupon[] = [
  {
    code: 'FIRST500',
    description: 'Flat ₹500 OFF on your first purchase above ₹1,999',
    discountType: 'fixed',
    discountValue: 500,
    minOrderValue: 1999
  },
  {
    code: 'FESTIVE25',
    description: '25% OFF on Royal Weaves, Couture & Fine Jewellery (up to ₹2,500)',
    discountType: 'percentage',
    discountValue: 25,
    minOrderValue: 3999,
    maxDiscount: 2500
  },
  {
    code: 'VYORA10',
    description: '10% instant discount on all categories above ₹999',
    discountType: 'percentage',
    discountValue: 10,
    minOrderValue: 999,
    maxDiscount: 1000
  },
  {
    code: 'ROYAL1000',
    description: 'Flat ₹1,000 instant festival rebate on luxury items above ₹7,500',
    discountType: 'fixed',
    discountValue: 1000,
    minOrderValue: 7500
  }
];
