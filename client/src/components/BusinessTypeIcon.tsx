import { 
  UtensilsCrossed, 
  ShoppingBag, 
  Wrench, 
  Store, 
  Car, 
  Stethoscope, 
  Scissors, 
  Building2 
} from "lucide-react";
import type { BusinessType } from "@shared/schema";

const iconMap: Record<BusinessType, typeof UtensilsCrossed> = {
  restaurant: UtensilsCrossed,
  retail: ShoppingBag,
  service: Wrench,
  convenience: Store,
  auto: Car,
  medical: Stethoscope,
  salon: Scissors,
  other: Building2,
};

interface BusinessTypeIconProps {
  type: BusinessType;
  className?: string;
}

export function BusinessTypeIcon({ type, className = "w-5 h-5" }: BusinessTypeIconProps) {
  const Icon = iconMap[type] || Building2;
  return <Icon className={className} />;
}

export const businessTypeLabels: Record<BusinessType, string> = {
  restaurant: "Restaurant/Food",
  retail: "Retail",
  service: "Professional Service",
  convenience: "Convenience Store",
  auto: "Auto/Repair",
  medical: "Medical/Healthcare",
  salon: "Salon/Beauty",
  other: "Other",
};
