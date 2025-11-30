import type { Database } from "@/database.types";

export type Booking = Database["public"]["Tables"]["booking"]["Row"];
export type ServiceBooking = Database["public"]["Tables"]["service_bookings"]["Row"];
export type Service = Database["public"]["Tables"]["service"]["Row"];
export type Customer = Database["public"]["Tables"]["customer"]["Row"];

export interface BookingWithServices extends Booking {
  customer: Customer | null;
  service_bookings: Array<
    ServiceBooking & {
      service: Service | null;
    }
  >;
  final_total?: number | null;
}

export interface BookingCardProps {
  booking: BookingWithServices;
  currentUserId: string | null;
  onClaimService: (instanceId: number) => Promise<void>;
  onServeService: (instanceId: number) => Promise<void>;
  onViewDetails: (booking: BookingWithServices) => void;
}

